/*
 * Storia del PC · capitolo 9: La corsa alle prestazioni: MHz, transistor e core.
 * Testi, due illustrazioni (la «lavanderia» della pipeline, il chip di un processore
 * a otto core) e il laboratorio «Moore, megahertz e core» con quattro viste.
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le figure
 * e dentro lab.crea(), così i test in Node possono caricarlo.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {}).prestazioni;

  /* =====================================================================
   * Illustrazioni (SVG originali, stile tecnico piatto della sezione).
   * Tutte le classi stanno sotto .prs-fig (css/capitoli/09-prestazioni.css).
   * ===================================================================== */

  // La lavanderia della pipeline: tre macchine, quattro cesti, 12 turni contro 6.
  function figuraLavanderia() {
    const C = 44;          // larghezza di un turno
    const X0 = 64;         // inizio dei turni
    const FASI = ['f-lava', 'f-asciuga', 'f-piega'];
    const CESTI = ['A', 'B', 'C', 'D'];
    let k = 0;
    function cella(x, y, f, cesto) {
      k += 1;
      return '<g class="prs-cella" style="--i:' + k + '">' +
        '<rect class="' + FASI[f] + ' l" x="' + (x + 2) + '" y="' + y + '" width="' + (C - 4) + '" height="30" rx="6"/>' +
        '<text class="lettera ' + FASI[f] + '-t" x="' + (x + C / 2) + '" y="' + (y + 23) + '">' + cesto + '</text></g>';
    }
    let griglia = '';
    for (let t = 0; t <= 12; t++) griglia += '<path d="M' + (X0 + t * C) + ' 212V438"/>';
    let senza = '';
    for (let c = 0; c < 4; c++) for (let f = 0; f < 3; f++) senza += cella(X0 + (c * 3 + f) * C, 216, f, CESTI[c]);
    let con = '';
    for (let c = 0; c < 4; c++) for (let f = 0; f < 3; f++) con += cella(X0 + (c + f) * C, 300 + c * 34, f, CESTI[c]);

    return '<svg class="prs-fig prs-fig-lavanderia" viewBox="0 0 640 440" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><marker id="prs-punta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
        '<path d="M0 0L10 5L0 10z" class="punta"/></marker></defs>' +
      // ombre a terra
      '<g class="ombra"><ellipse cx="110" cy="134" rx="62" ry="5"/><ellipse cx="320" cy="134" rx="62" ry="5"/><ellipse cx="530" cy="134" rx="66" ry="5"/></g>' +
      // 1 · lavatrice a carica frontale
      '<g class="macchina">' +
        '<rect class="bianco l" x="55" y="10" width="110" height="120" rx="9"/>' +
        '<path class="be2 l" d="M55 34V19a9 9 0 0 1 9-9h92a9 9 0 0 1 9 9v15z"/>' +
        '<rect class="schermo" x="66" y="16" width="30" height="12" rx="2"/>' +
        '<path class="cifre" d="M70 22h6M79 22h6M88 22h4"/>' +
        '<circle class="gr l" cx="147" cy="22" r="6.5"/>' +
        '<circle class="gr l" cx="110" cy="82" r="37"/>' +
        '<circle class="vetro-acqua l" cx="110" cy="82" r="27"/>' +
        '<path class="onda" d="M84 86q6.5-6 13 0t13 0t13 0t13 0"/>' +
        '<path class="panno-rosso l" d="M96 90c4-8 14-10 20-4c3 3 2 9-3 10c-6 2-14 2-17-6z"/>' +
        '<path class="panno-giallo l" d="M112 98c5-5 12-4 14 1c1 4-4 6-9 5c-3 0-5-3-5-6z"/>' +
        '<path class="riflesso" d="M94 66a22 22 0 0 1 24-7"/>' +
        '<rect class="gr2" x="66" y="130" width="12" height="4" rx="1"/><rect class="gr2" x="142" y="130" width="12" height="4" rx="1"/>' +
      '</g>' +
      // 2 · asciugatrice
      '<g class="macchina">' +
        '<rect class="bianco l" x="265" y="10" width="110" height="120" rx="9"/>' +
        '<path class="be2 l" d="M265 34V19a9 9 0 0 1 9-9h92a9 9 0 0 1 9 9v15z"/>' +
        '<path class="fessure" d="M276 18h22M276 23h22M276 28h22"/>' +
        '<circle class="gr l" cx="357" cy="22" r="6.5"/>' +
        '<circle class="gr l" cx="320" cy="82" r="37"/>' +
        '<circle class="vetro-scuro l" cx="320" cy="82" r="27"/>' +
        '<path class="panno-blu l" d="M302 80c2-9 14-12 20-6c4 4 0 11-6 12c-7 1-15 1-14-6z"/>' +
        '<path class="panno-rosso l" d="M318 96c4-7 15-8 18-2c2 4-2 8-8 8c-5 0-9-2-10-6z"/>' +
        '<path class="aria" d="M306 64q4-4 8 0t8 0M320 104q4-4 8 0t8 0"/>' +
        '<path class="riflesso" d="M304 66a22 22 0 0 1 24-7"/>' +
        '<rect class="gr2" x="276" y="130" width="12" height="4" rx="1"/><rect class="gr2" x="352" y="130" width="12" height="4" rx="1"/>' +
      '</g>' +
      // 3 · tavolo per piegare, con la pila di panni piegati
      '<g class="macchina">' +
        '<rect class="legno2 l" x="481" y="94" width="9" height="38" rx="1"/>' +
        '<rect class="legno2 l" x="570" y="94" width="9" height="38" rx="1"/>' +
        '<rect class="legno l" x="468" y="84" width="124" height="12" rx="3"/>' +
        '<rect class="panno-blu l" x="484" y="66" width="62" height="18" rx="4"/>' +
        '<rect class="panno-rosso l" x="488" y="50" width="56" height="16" rx="4"/>' +
        '<rect class="panno-giallo l" x="492" y="36" width="50" height="14" rx="4"/>' +
        '<path class="piega" d="M515 66v18M516 50v16M517 36v14"/>' +
        '<path class="panno-chiaro l" d="M556 84c-2-10 2-18 10-20l12 2c6 2 8 10 6 18z"/>' +
      '</g>' +
      // frecce tra le macchine
      '<path class="freccia" d="M176 78H252" marker-end="url(#prs-punta)"/>' +
      '<path class="freccia" d="M386 78H460" marker-end="url(#prs-punta)"/>' +
      // nomi delle fasi
      '<g class="pillole">' +
        '<rect class="f-lava l" x="60" y="144" width="100" height="32" rx="16"/><text class="t f-lava-t" x="110" y="167">lava</text>' +
        '<rect class="f-asciuga l" x="262" y="144" width="116" height="32" rx="16"/><text class="t f-asciuga-t" x="320" y="167">asciuga</text>' +
        '<rect class="f-piega l" x="480" y="144" width="100" height="32" rx="16"/><text class="t f-piega-t" x="530" y="167">piega</text>' +
      '</g>' +
      // i turni
      '<g class="griglia">' + griglia + '</g>' +
      '<text class="titolo" x="' + X0 + '" y="206">senza pipeline · 12 turni</text>' +
      senza +
      '<text class="titolo" x="' + X0 + '" y="290">con la pipeline · 6 turni</text>' +
      con +
      '<path class="traguardo" d="M' + (X0 + 6 * C) + ' 296V436"/>' +
      '<text class="nota" x="' + (X0 + 6 * C + 24) + '" y="370">stessi 4 cesti,</text>' +
      '<text class="nota forte" x="' + (X0 + 6 * C + 24) + '" y="400">metà dei turni</text>' +
      '</svg>';
  }

  // Il chip (die) di un processore desktop a otto core, visto dall'alto.
  function figuraDie() {
    let piazzole = '';
    for (let x = 44; x <= 590; x += 22) piazzole += '<rect x="' + x + '" y="17" width="9" height="7" rx="1"/><rect x="' + x + '" y="376" width="9" height="7" rx="1"/>';
    for (let y = 46; y <= 350; y += 22) piazzole += '<rect x="17" y="' + y + '" width="7" height="9" rx="1"/><rect x="616" y="' + y + '" width="7" height="9" rx="1"/>';
    let core = '';
    for (let i = 0; i < 8; i++) {
      const alto = i < 4;
      const x = 156 + (i % 4) * 72;
      const y = alto ? 50 : 260;
      const l2 = alto ? y + 62 : y + 6;
      const logica = alto ? y + 8 : y + 36;
      core += '<g class="core">' +
        '<rect class="sc2 l2" x="' + x + '" y="' + y + '" width="64" height="90" rx="4"/>' +
        '<rect class="gr2" x="' + (x + 6) + '" y="' + l2 + '" width="52" height="22" rx="2"/>' +
        '<path class="sram" d="M' + (x + 12) + ' ' + (l2 + 4) + 'v14M' + (x + 20) + ' ' + (l2 + 4) + 'v14M' + (x + 28) + ' ' + (l2 + 4) + 'v14M' + (x + 36) + ' ' + (l2 + 4) + 'v14M' + (x + 44) + ' ' + (l2 + 4) + 'v14M' + (x + 52) + ' ' + (l2 + 4) + 'v14"/>' +
        '<rect class="sc" x="' + (x + 6) + '" y="' + logica + '" width="24" height="18" rx="2"/>' +
        '<rect class="sc" x="' + (x + 34) + '" y="' + logica + '" width="24" height="18" rx="2"/>' +
        '<text class="tw num" x="' + (x + 32) + '" y="' + (alto ? y + 52 : y + 78) + '">' + (i + 1) + '</text>' +
        '<rect class="ambra" x="' + (x + 28) + '" y="' + (alto ? y + 90 : y - 4) + '" width="8" height="4"/>' +
        '</g>';
    }
    let eu = '';
    for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) eu += '<rect x="' + (464 + c * 37) + '" y="' + (98 + r * 35) + '" width="31" height="28" rx="3"/>';
    let righe = '';
    for (let x = 166; x < 436; x += 9) righe += 'M' + x + ' 158V242';

    return '<svg class="prs-fig prs-fig-die" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">' +
      // involucro e piazzole di contatto
      '<rect class="pcb l" x="8" y="8" width="624" height="384" rx="20"/>' +
      '<g class="oro">' + piazzole + '</g>' +
      '<path class="oro" d="M14 14h16L14 30z"/>' +
      // il die
      '<rect class="chip l" x="44" y="36" width="552" height="328" rx="6"/>' +
      '<rect class="bordo-die" x="50" y="42" width="540" height="316" rx="4"/>' +
      // controller della memoria e PCI Express
      '<rect class="blu" x="58" y="50" width="84" height="190" rx="4"/>' +
      '<text class="tw vert" transform="translate(108 145) rotate(-90)">memoria</text>' +
      '<rect class="legno" x="58" y="248" width="84" height="102" rx="4"/>' +
      '<text class="tw vert" transform="translate(108 299) rotate(-90)">PCIe</text>' +
      // cache L3 condivisa
      '<rect class="rame" x="156" y="150" width="280" height="100" rx="4"/>' +
      '<path class="sram" d="' + righe + '"/>' +
      '<text class="tw grande" x="296" y="209">cache L3</text>' +
      // l\'anello che collega tutto
      '<rect class="anello" x="149" y="143" width="294" height="114" rx="10"/>' +
      '<rect class="anello-flusso" x="149" y="143" width="294" height="114" rx="10"/>' +
      '<rect class="ambra" x="142" y="168" width="8" height="5"/><rect class="ambra" x="142" y="296" width="8" height="5"/>' +
      '<rect class="ambra" x="442" y="198" width="10" height="5"/>' +
      // otto core
      core +
      // grafica integrata
      '<rect class="sc" x="452" y="50" width="130" height="300" rx="4"/>' +
      '<g class="pcb2">' + eu + '</g>' +
      '<text class="tw" x="517" y="80">grafica</text>' +
      '</svg>';
  }

  /* =====================================================================
   * Laboratorio «Moore, megahertz e core»
   * ===================================================================== */

  const MARCA = { Intel: 'intel', AMD: 'amd', Apple: 'apple' };
  const SERIE = { pubblico: 'PC di tutti i giorni', hedt: 'fascia alta (HEDT)' };

  function creaLaboratorio(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    if (!M) {
      el.append(h('p', { class: 'lab-errore' }, 'Dati del laboratorio non disponibili.'));
      return {};
    }
    const fmt = (n, d) => ctx.formato(n, d || 0);
    const ridotto = () => ctx.ridotto();
    const POP = ctx.motion.dur.normal;

    /* ---------- numeri calcolati dal modello ---------- */
    const tendT = M.tendenzaTransistor();
    const tendF = M.tendenzaFrequenza(2004);
    const annoTettoF = 2004 + (Math.log2(1e4) - Math.log2(tendF.valore(2004))) / tendF.raddoppiPerAnno;
    const ghz2010 = Math.round(tendF.valore(2010) / 1000);
    const ghz2025 = Math.round(tendF.valore(2025) / 1e5) * 100;
    const moore2025 = M.formatoTransistor(Math.round(M.moore(2025) / 1e9) * 1e9);
    const raddoppiM3 = Math.round(Math.log2(M.trova('m3ultra').transistor / M.trova('i4004').transistor));

    /* ---------- punti delle tre viste storiche ---------- */
    const PUNTI = {
      transistor: M.datiTransistor().map((c) => ({ x: M.annoDecimale(c), y: c.transistor, c: c, classe: 'm-' + MARCA[c.marca] })),
      frequenza: M.datiFrequenza().map((c) => ({ x: M.annoDecimale(c), y: c.mhz, y0: c.mhzBase || null, c: c, classe: 'm-' + MARCA[c.marca] })),
      core: [].concat(
        M.CORE_DESKTOP.pubblico.map((v) => ({ x: v.anno + 0.3, y: v.core, c: v, serie: 'pubblico', classe: 's-pubblico' })),
        M.CORE_DESKTOP.hedt.map((v) => ({ x: v.anno + 0.7, y: v.core, c: v, serie: 'hedt', classe: 's-hedt' }))
      ).sort((a, b) => a.x - b.x),
    };

    const VISTE = {
      transistor: {
        etichetta: 'Transistor',
        asse: 'Transistor in un chip · scala logaritmica: ogni riga vale dieci volte quella sotto',
        x: [1969, 2027], y: [1e3, 1e12], base: 10, passoX: 10,
        tacche: M.tacchetteLog(1e3, 1e12), etY: M.etichettaPotenza,
        interruttore: 'Retta del raddoppio ogni 2 anni',
        msAnno: 165,
        intro: 'Ogni punto è un processore. L\'asse verticale è <strong>logaritmico</strong>: ogni riga vale dieci volte quella sotto, così 2.300 e 184 miliardi stanno nello stesso grafico. Premi «Riproduci la storia», tocca un punto o usa le frecce della tastiera.',
        tappe: [
          [1971.9, '<strong>1971</strong>: il 4004 ha 2.300 transistor, abbastanza pochi da contarli uno per uno al microscopio.'],
          [1982.2, '<strong>1982</strong>: il 286 ne ha 134.000, quasi sessanta volte tanto, in poco più di dieci anni.'],
          [1989.3, '<strong>1989</strong>: con il 486 si supera il milione di transistor.'],
          [2000.9, '<strong>2000</strong>: il Pentium 4 arriva a 42 milioni.'],
          [2010.3, '<strong>2010</strong>: anche nei processori per PC si supera il miliardo di transistor: il Core i7-980X, a sei core, ne ha 1,17 miliardi.'],
          [2022.2, '<strong>2022</strong>: l\'Apple M1 Ultra, due chip uniti, supera i cento miliardi.'],
        ],
        finale: () => 'Dai 2.300 transistor del 4004 ai 184 miliardi dell\'Apple M3 Ultra: circa ' + raddoppiM3 + ' raddoppi in poco più di 53 anni, <strong>uno ogni ' + fmt(M.raddoppioDal4004('m3ultra'), 1) + ' anni</strong>. Accendi la «retta del raddoppio» per confrontare.',
        sintesi: () => 'La retta che passa più vicina a tutti i ' + PUNTI.transistor.length + ' punti raddoppia ogni <strong>' + fmt(tendT.periodo, 1) + ' anni</strong>.',
      },
      frequenza: {
        etichetta: 'Frequenza',
        asse: 'Frequenza massima del clock · scala logaritmica',
        x: [1969, 2027], y: [0.1, 1e4], base: 10, passoX: 10,
        tacche: M.tacchetteLog(0.1, 1e4), etY: M.etichettaFrequenza,
        interruttore: 'Tendenza fino al 2004',
        msAnno: 165,
        intro: 'La frequenza più alta di ogni processore, anche qui in scala logaritmica. Se c\'è il turbo, la barretta va dalla frequenza base a quella massima. Guarda che cosa succede dopo il 2004.',
        tappe: [
          [1971.9, '<strong>1971</strong>: il clock del 4004 batte 740.000 colpi al secondo (740 kHz).'],
          [1982.2, '<strong>1982</strong>: il 286 parte da 6 MHz.'],
          [1993.2, '<strong>1993</strong>: il Pentium arriva a 66 MHz.'],
          [2000.2, '<strong>2000</strong>: la guerra dei gigahertz. L\'Athlon tocca per primo 1 GHz.'],
          [2004.9, '<strong>2004</strong>: il Pentium 4 si ferma a 3,8 GHz. È il <strong>muro della potenza</strong>.'],
          [2013.5, '<strong>2013</strong>: 5 GHz, ma solo in turbo e con 220 watt (AMD FX-9590).'],
        ],
        finale: () => 'Nel 2024 si arriva a 6,2 GHz, raggiunti in turbo da uno o due core: appena 1,6 volte il 2004. Con il ritmo di prima saremmo a <strong>circa ' + fmt(ghz2025) + ' GHz</strong>.',
        sintesi: () => 'Fino al 2004 la frequenza raddoppia ogni <strong>' + fmt(tendF.periodo, 1) + ' anni</strong>; dal 2004 al 2024 sale solo da 3,8 a 6,2 GHz.',
      },
      core: {
        etichetta: 'Core',
        asse: 'Core nei processori per PC desktop · scala logaritmica: ogni riga raddoppia',
        x: [2000, 2026], y: [1, 128], base: 2, passoX: 5,
        tacche: M.tacchetteLog(1, 128, 2), etY: (v) => String(v),
        interruttore: 'Fascia alta (HEDT)',
        msAnno: 300,
        intro: 'Quanti core hanno i processori per PC desktop: in verde il record dei PC di tutti i giorni, in azzurro quello della fascia più alta (HEDT, High-End DeskTop, per professionisti e appassionati). Ogni riga del grafico raddoppia.',
        tappe: [
          [2000.3, '<strong>2000</strong>: un core solo. Per andare più veloci si alza la frequenza.'],
          [2005.3, '<strong>2005</strong>: arrivano i primi doppio core, Pentium D e Athlon 64 X2.'],
          [2006.3, '<strong>2006</strong>: quattro core nel Core 2 Extreme QX6700.'],
          [2008.7, '<strong>2008</strong>: nasce una piattaforma separata per la fascia alta.'],
          [2017.7, '<strong>2017</strong>: la gara dei core. AMD Threadripper a 16, Intel Core i9 a 18.'],
          [2020.7, '<strong>2020</strong>: 64 core nel Threadripper 3990X.'],
        ],
        finale: () => 'Nel 2025 i PC di tutti i giorni arrivano a 24 core, la fascia alta a 64. Ma i programmi li sanno usare tutti? Prova la vista <strong>Amdahl</strong>.',
        sintesi: () => 'Nella fascia alta i core passano da 4 (2008) a 64 (2020): un raddoppio ogni <strong>3 anni</strong>.',
      },
      amdahl: {
        etichetta: 'Amdahl',
        intro: 'Sposta i cursori: quanta parte del programma si può dividere fra i core, e quanti core usare. Poi avvia la gara fra un core solo e N core.',
      },
    };

    const stato = {
      vista: 'transistor',
      ph: 0,
      sel: { transistor: PUNTI.transistor.length - 1, frequenza: PUNTI.frequenza.findIndex((d) => d.c.id === 'prescott'), core: PUNTI.core.length - 1 },
      storia: 'ferma',
      tappa: 0,
      entrata: false,
      moore: false,
      tendenza: true,
      hedt: true,
      tabella: false,
      avviato: false,
      p: 0.9,
      n: 8,
      gara: null,
    };

    /* ---------- struttura ---------- */
    const idTab = ctx.uid('prs-tab');
    const elNota = h('p', { class: 'lab-note prs-nota', 'aria-live': 'polite' });
    const bottoniVista = ['transistor', 'frequenza', 'core', 'amdahl'].map((id) => h('button', {
      type: 'button', 'data-vista': id, 'aria-pressed': 'false', onclick: () => mostraVista(id),
    }, VISTE[id].etichetta));
    const btnTab = h('button', {
      type: 'button', class: 'lab-btn prs-btn-tab', 'aria-expanded': 'false', 'aria-controls': idTab,
      onclick: () => { stato.tabella = !stato.tabella; aggiornaTabella(); },
    }, 'Tabella dei dati');

    // grafici storici
    const elAsse = h('p', { class: 'prs-asse' });
    const elLegenda = h('ul', { class: 'prs-legenda', 'aria-hidden': 'true' });
    const svg = s('svg', { class: 'lab-svg prs-svg', role: 'group' });
    const boxGrafico = h('div', { class: 'prs-grafico' }, svg);
    const icoStoria = h('span', { class: 'prs-ico', 'aria-hidden': 'true' }, '▶');
    const txtStoria = h('span', null, 'Riproduci la storia');
    const btnStoria = h('button', { type: 'button', class: 'lab-btn primary prs-btn-storia', onclick: storia }, icoStoria, txtStoria);
    const btnPrec = h('button', { type: 'button', class: 'lab-btn prs-btn-passo', 'aria-label': 'Punto precedente', onclick: () => passo(-1) }, h('span', { 'aria-hidden': 'true' }, '◀'));
    const btnSucc = h('button', { type: 'button', class: 'lab-btn prs-btn-passo', 'aria-label': 'Punto successivo', onclick: () => passo(1) }, h('span', { 'aria-hidden': 'true' }, '▶'));
    const btnInt = h('button', { type: 'button', class: 'lab-btn prs-btn-int', 'aria-pressed': 'false', onclick: interruttore });
    const detMeta = h('p', { class: 'prs-det-meta' });
    const detNome = h('h4', { class: 'prs-det-nome' });
    const detKv = h('dl', { class: 'lab-kv prs-det-kv' });
    const detTesto = h('p', { class: 'prs-det-testo' });
    const detSintesi = h('p', { class: 'prs-det-sintesi' });
    const boxStoria = h('div', { class: 'prs-storia' },
      h('div', { class: 'prs-area' },
        h('div', { class: 'prs-testa-grafico' }, elAsse, elLegenda),
        boxGrafico,
        h('div', { class: 'lab-controls prs-comandi' }, btnStoria, h('span', { class: 'prs-passi' }, btnPrec, btnSucc), btnInt)),
      h('aside', { class: 'lab-panel prs-dettaglio', 'aria-label': 'Il punto scelto' }, detMeta, detNome, detKv, detTesto, detSintesi));

    // Amdahl
    const idP = ctx.uid('prs-p');
    const idN = ctx.uid('prs-n');
    const inP = h('input', { type: 'range', id: idP, min: 0, max: 100, step: 1, value: Math.round(stato.p * 100), oninput: cambiaAmdahl });
    const inN = h('input', { type: 'range', id: idN, min: 1, max: 64, step: 1, value: stato.n, oninput: cambiaAmdahl });
    const outP = h('output', { class: 'lab-readout', for: idP });
    const outN = h('output', { class: 'lab-readout', for: idN });
    const icoGara = h('span', { class: 'prs-ico', 'aria-hidden': 'true' }, '▶');
    const txtGara = h('span', null, 'Avvia la gara');
    const btnGara = h('button', { type: 'button', class: 'lab-btn primary prs-btn-gara', onclick: gara }, icoGara, txtGara);
    const svgG = s('svg', { class: 'lab-svg prs-svg prs-gantt', role: 'img' });
    const svgC = s('svg', { class: 'lab-svg prs-svg prs-curva', role: 'img' });
    const kv = { acc: h('dd'), tempo: h('dd'), eff: h('dd'), lim: h('dd') };
    const voce = (dt, dd) => h('div', null, h('dt', null, dt), dd);
    const boxGantt = h('div', { class: 'prs-grafico' }, svgG);
    const boxCurva = h('div', { class: 'prs-grafico' }, svgC);
    const boxAmdahl = h('div', { class: 'prs-amdahl', hidden: true },
      h('div', { class: 'prs-cursori' },
        h('div', { class: 'prs-cursore' }, h('label', { for: idP }, 'Parte parallelizzabile'), inP, outP),
        h('div', { class: 'prs-cursore' }, h('label', { for: idN }, 'Numero di core'), inN, outN),
        btnGara),
      h('div', { class: 'prs-amdahl-grafici' },
        h('div', { class: 'prs-amdahl-box' }, h('p', { class: 'prs-asse' }, 'La gara: lo stesso lavoro con 1 core e con N core (tempo: 1 = un core da solo)'), boxGantt),
        h('div', { class: 'prs-amdahl-box' }, h('p', { class: 'prs-asse' }, 'Accelerazione al crescere dei core · scale logaritmiche'), boxCurva)),
      h('dl', { class: 'lab-kv prs-amdahl-kv' },
        voce('Accelerazione', kv.acc), voce('Tempo rispetto a 1 core', kv.tempo), voce('Lavoro utile per core', kv.eff), voce('Limite con infiniti core', kv.lim)));

    const boxTab = h('div', { class: 'prs-tabella', id: idTab, hidden: true, tabindex: '0', role: 'region', 'aria-label': 'Tabella dei dati del grafico' });
    const radice = h('div', { class: 'prs-lab' },
      h('div', { class: 'prs-testa' }, h('div', { class: 'lab-seg prs-viste', role: 'group', 'aria-label': 'Scegli il grafico' }, bottoniVista), btnTab),
      boxStoria, boxAmdahl, elNota, boxTab);
    el.append(radice);

    /* ---------- spiegazioni ---------- */
    let timerNota = 0;
    function nota(html) {
      clearTimeout(timerNota);
      if (elNota.innerHTML === html) elNota.textContent = '';
      elNota.innerHTML = html;
    }
    function notaRitardata(html) {
      clearTimeout(timerNota);
      timerNota = setTimeout(() => nota(html), 450);
    }

    /* =================================================================
     * Grafici storici: transistor, frequenza, core
     * ================================================================= */
    let geo = null;          // misure e scale del grafico corrente
    let punti = [];          // punti disegnati (con elementi e coordinate)
    let el$ = {};            // elementi del grafico da aggiornare
    let selPos = null;       // posizione attuale del mirino (per animarlo)
    let tweenSel = null;
    let tweenLinea = null;

    function nomePunto(d) { return d.c.nome || d.c.chip; }
    function valorePunto(d) {
      if (stato.vista === 'transistor') return M.formatoTransistor(d.y) + ' transistor';
      if (stato.vista === 'frequenza') return M.formatoFrequenza(d.y) + (d.y0 ? ' in turbo' : '');
      return d.y + ' core';
    }
    function etichettaPunto(d) {
      if (stato.vista === 'core') return d.c.chip + ', ' + d.c.anno + ': ' + d.y + ' core, ' + SERIE[d.serie];
      let t = nomePunto(d) + ', ' + d.c.anno + ': ' + valorePunto(d);
      if (d.y0) t += ', frequenza base ' + M.formatoFrequenza(d.y0);
      return t;
    }
    function righeFumetto(d) {
      if (stato.vista === 'core') {
        const chip = d.c.chip.length > 26 ? d.c.chip.slice(0, 24) + '…' : d.c.chip;
        return [d.y + ' core · ' + d.c.anno, chip];
      }
      return [nomePunto(d), valorePunto(d)];
    }

    function disegna() {
      const v = VISTE[stato.vista];
      const W = Math.max(260, Math.floor(boxGrafico.clientWidth || 600));
      const stretto = W < 520;
      const H = Math.round(ctx.clamp(W * (stretto ? 0.95 : 0.6), 300, 440));
      // sui telefoni un'etichetta sì e una no quando le righe sono tante; il margine si adatta alla più lunga
      const etichette = v.tacche.map((t, i) => ({ t: t, testo: v.etY(t), mostra: !stretto || v.tacche.length <= 8 || i % 2 === 0 }));
      const lunghezza = Math.max.apply(null, etichette.filter((e) => e.mostra).map((e) => e.testo.length));
      const m = { l: Math.round(lunghezza * (stretto ? 6.7 : 7.3)) + 14, r: stretto ? 10 : 16, t: 12, b: 28 };
      const X = M.scalaLineare(v.x[0], v.x[1], m.l, W - m.r);
      const Y = M.scalaLog(v.y[0], v.y[1], H - m.b, m.t, v.base);
      geo = { W: W, H: H, m: m, X: X, Y: Y, stretto: stretto };
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('aria-label', 'Grafico: ' + v.asse + '. Usa le frecce per passare da un punto all\'altro.');
      svg.replaceChildren();
      if (tweenSel) { tweenSel.cancel(); tweenSel = null; }
      selPos = null;

      const idClip = ctx.uid('prs-clip');
      const idClipM = ctx.uid('prs-clipm');
      const idPunta = ctx.uid('prs-freccia');
      const clipRect = s('rect', { x: m.l - 10, y: 0, width: 0, height: H });
      const clipMoore = s('rect', { x: m.l - 10, y: 0, width: stato.moore ? W : 0, height: H });
      svg.append(s('defs', null,
        s('clipPath', { id: idClip }, clipRect),
        s('clipPath', { id: idClipM }, clipMoore),
        s('marker', { id: idPunta, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
          s('path', { d: 'M0 0L10 5L0 10z', class: 'prs-punta' }))));

      // griglia e assi
      const gAssi = s('g', { class: 'prs-assi', 'aria-hidden': 'true' });
      etichette.forEach((e) => {
        const y = Y(e.t);
        gAssi.append(s('line', { class: 'prs-griglia', x1: m.l, x2: W - m.r, y1: y, y2: y }));
        if (e.mostra) gAssi.append(s('text', { class: 'prs-et-y', x: m.l - 7, y: y, dy: '0.34em' }, e.testo));
      });
      for (let a = Math.ceil(v.x[0] / v.passoX) * v.passoX; a <= v.x[1]; a += v.passoX) {
        const x = X(a);
        gAssi.append(s('line', { class: 'prs-griglia v', x1: x, x2: x, y1: m.t, y2: H - m.b }));
        if (!(stretto && v.passoX === 5 && a % 10 !== 0)) gAssi.append(s('text', { class: 'prs-et-x', x: x, y: H - m.b + 18 }, String(a)));
      }
      gAssi.append(s('line', { class: 'prs-asse-base', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
      svg.append(gAssi);

      // anno grande sullo sfondo (durante la storia) e testina
      const annoGrande = s('text', { class: 'prs-anno-grande', x: W - m.r - 8, y: H - m.b - 12, 'aria-hidden': 'true' }, '');
      const testina = s('line', { class: 'prs-testina', x1: 0, x2: 0, y1: m.t, y2: H - m.b, 'aria-hidden': 'true' });
      svg.append(annoGrande);

      // decorazioni della vista
      const gLinee = s('g', { 'clip-path': 'url(#' + idClip + ')', 'aria-hidden': 'true' });
      let lineaMoore = null, gTendenza = null, gHedt = null;
      if (stato.vista === 'frequenza') {
        const x0 = X(2004), x1 = X(2006);
        svg.append(s('g', { class: 'prs-muro', 'aria-hidden': 'true' },
          s('rect', { x: x0, y: m.t, width: x1 - x0, height: H - m.b - m.t }),
          s('line', { x1: x0, x2: x0, y1: m.t, y2: H - m.b }),
          s('text', { x: x0 - 6, y: m.t + 14 }, 'il muro della potenza')));
        gTendenza = s('g', { class: 'prs-tendenza', opacity: stato.tendenza ? 1 : 0 },
          s('path', { d: 'M' + X(1971) + ' ' + Y(tendF.valore(1971)) + 'L' + X(annoTettoF) + ' ' + m.t, 'marker-end': 'url(#' + idPunta + ')' }));
        gLinee.append(gTendenza);
      }
      if (stato.vista === 'core') {
        const scalini = (serie) => {
          const pts = PUNTI.core.filter((p) => p.serie === serie);
          let d = '';
          pts.forEach((p, k) => { d += (k === 0 ? 'M' + X(p.x) + ' ' + Y(p.y) : 'H' + X(p.x) + 'V' + Y(p.y)); });
          return s('path', { class: 'prs-scalino s-' + serie, d: d + 'H' + X(v.x[1] - 0.2) });
        };
        gHedt = s('g', { opacity: stato.hedt ? 1 : 0 }, scalini('hedt'));
        gLinee.append(scalini('pubblico'), gHedt);
        const x5 = X(2005);
        svg.append(s('g', { class: 'prs-annota', 'aria-hidden': 'true' },
          s('line', { x1: x5, x2: x5, y1: m.t, y2: H - m.b }),
          s('text', { x: x5 + 6, y: m.t + 14 }, '2005: i primi doppio core')));
      }
      svg.append(gLinee);
      if (stato.vista === 'transistor') {
        lineaMoore = s('path', { class: 'prs-moore', 'clip-path': 'url(#' + idClipM + ')', 'aria-hidden': 'true',
          d: 'M' + X(1971) + ' ' + Y(M.moore(1971)) + 'L' + X(v.x[1]) + ' ' + Y(M.moore(v.x[1])) });
        svg.append(lineaMoore);
      }
      svg.append(testina);

      // punti
      const gPunti = s('g', { class: 'prs-punti' });
      punti = PUNTI[stato.vista].map((d, i) => {
        const px = X(d.x), py = Y(d.y);
        const inner = s('g', { class: 'prs-punto-in' });
        if (d.y0) {
          const yb = Y(d.y0) - py;
          inner.append(s('line', { class: 'prs-turbo', x1: 0, x2: 0, y1: 0, y2: yb }), s('line', { class: 'prs-turbo', x1: -3.5, x2: 3.5, y1: yb, y2: yb }));
        }
        inner.append(s('circle', { class: 'prs-pallino', r: stretto ? 4.2 : 4.8 }));
        const g = s('g', { class: 'prs-punto ' + d.classe, transform: 'translate(' + px + ' ' + py + ')', tabindex: '-1', role: 'button', 'aria-label': etichettaPunto(d), visibility: 'hidden' }, inner);
        g.__i = i;
        gPunti.append(g);
        return { d: d, x: d.x, px: px, py: py, g: g, inner: inner, visibile: false, attivo: d.serie !== 'hedt' || stato.hedt, nato: null };
      });
      svg.append(gPunti);

      // selezione: mirino, anello, fumetto
      const mirX = s('line', { class: 'prs-mirino' });
      const mirY = s('line', { class: 'prs-mirino' });
      const anello = s('g', { class: 'prs-anello' }, s('circle', { class: 'prs-alone', r: 13 }), s('circle', { r: 9 }));
      const fTesto1 = s('text', { class: 'prs-f1', x: 8, y: 16 });
      const fTesto2 = s('text', { class: 'prs-f2', x: 8, y: 31 });
      const fRett = s('rect', { class: 'prs-f-fondo', x: 0, y: 0, width: 10, height: 40, rx: 7 });
      const fumetto = s('g', { class: 'prs-fumetto' }, fRett, fTesto1, fTesto2);
      const gSel = s('g', { class: 'prs-sel', 'aria-hidden': 'true', visibility: 'hidden' }, mirX, mirY, anello, fumetto);
      svg.append(gSel);

      el$ = { clipRect: clipRect, clipMoore: clipMoore, annoGrande: annoGrande, testina: testina, lineaMoore: lineaMoore, gTendenza: gTendenza, gHedt: gHedt,
        gSel: gSel, mirX: mirX, mirY: mirY, anello: anello, fumetto: fumetto, fRett: fRett, fTesto1: fTesto1, fTesto2: fTesto2 };
      impostaPh(stato.ph, null);
      const i = stato.sel[stato.vista];
      if (punti[i] && punti[i].visibile) seleziona(i, { subito: true });
      aggiornaStoriaUI();
    }

    // Sposta la testina all'anno ph: compaiono i punti fino a quell'anno. Restituisce l'ultimo punto apparso.
    function impostaPh(ph, adesso) {
      stato.ph = ph;
      if (!geo) return -1;
      const xph = geo.X(Math.min(ph, VISTE[stato.vista].x[1]));
      el$.clipRect.setAttribute('width', Math.max(0, xph - geo.m.l + 10));
      el$.testina.setAttribute('transform', 'translate(' + xph + ' 0)');
      if (stato.storia !== 'ferma') {
        const anno = String(Math.floor(Math.min(ph, VISTE[stato.vista].x[1] - 1)));
        if (el$.annoGrande.textContent !== anno) el$.annoGrande.textContent = anno;
      }
      let nuovo = -1;
      punti.forEach((p, i) => {
        const vis = p.attivo && p.x <= ph + 1e-9;
        if (vis === p.visibile) return;
        p.visibile = vis;
        p.g.setAttribute('visibility', vis ? 'visible' : 'hidden');
        if (vis) {
          nuovo = i;
          if (adesso != null && !ridotto()) { p.nato = adesso; p.inner.setAttribute('transform', 'scale(0)'); }
        } else if (p.g.getAttribute('tabindex') === '0') {
          p.g.setAttribute('tabindex', '-1');
        }
      });
      return nuovo;
    }

    // Ciclo di animazione: testina (entrata e storia) e «pop» dei punti che compaiono.
    const anim = { corsa: false, da: 0, a: 0, t0: 0, durata: 0, ease: ctx.curve.linear, fine: null };
    const ciclo = ctx.loop(() => {
      const adesso = performance.now();
      let ancora = false;
      if (anim.corsa) {
        const k = ctx.clamp((adesso - anim.t0) / anim.durata, 0, 1);
        const nuovo = impostaPh(ctx.lerp(anim.da, anim.a, anim.ease(k)), adesso);
        if (stato.storia === 'in corso') {
          if (nuovo >= 0) seleziona(nuovo, {});
          const tappe = VISTE[stato.vista].tappe;
          while (stato.tappa < tappe.length && tappe[stato.tappa][0] <= stato.ph) { nota(tappe[stato.tappa][1]); stato.tappa += 1; }
        }
        if (k >= 1) { anim.corsa = false; if (anim.fine) anim.fine(); } else ancora = true;
      }
      punti.forEach((p) => {
        if (p.nato == null) return;
        const k = (adesso - p.nato) / POP;
        if (k >= 1) { p.inner.removeAttribute('transform'); p.nato = null; } else { p.inner.setAttribute('transform', 'scale(' + Math.max(0, ctx.curve.bounce(k)).toFixed(3) + ')'); ancora = true; }
      });
      return ancora;
    });

    function corri(da, a, durata, ease, fine) {
      Object.assign(anim, { corsa: true, da: da, a: a, t0: performance.now(), durata: Math.max(1, durata), ease: ease, fine: fine });
      ciclo.start();
    }

    function finePop() {
      punti.forEach((p) => { if (p.nato != null) { p.nato = null; p.inner.removeAttribute('transform'); } });
    }

    // Entrata della vista: i punti compaiono da sinistra a destra in poco più di un secondo.
    function entrata() {
      const v = VISTE[stato.vista];
      const fineV = v.x[1];
      if (stato.storia !== 'ferma') return;
      stato.entrata = true;
      if (ridotto()) { impostaPh(fineV, null); stato.entrata = false; selezionaIniziale(); return; }
      impostaPh(v.x[0], null);
      el$.gSel.setAttribute('visibility', 'hidden');
      corri(v.x[0], fineV, ctx.motion.dur.crawl * 1.2, ctx.curve.smooth, () => { stato.entrata = false; selezionaIniziale(); });
    }

    function selezionaIniziale() {
      let i = stato.sel[stato.vista];
      if (!punti[i] || !punti[i].visibile) i = ultimoVisibile();
      if (i >= 0) seleziona(i, {});
    }

    function ultimoVisibile() {
      for (let i = punti.length - 1; i >= 0; i--) if (punti[i].visibile) return i;
      return -1;
    }

    /* ---------- selezione di un punto ---------- */

    function seleziona(i, opz) {
      const o = opz || {};
      const p = punti[i];
      if (!p || !p.visibile) return;
      stato.sel[stato.vista] = i;
      punti.forEach((q, k) => {
        q.g.setAttribute('tabindex', k === i ? '0' : '-1');
        q.g.classList.toggle('sel', k === i);
      });
      posizionaSelezione(p, !o.subito);
      dettaglio(p.d);
      if (o.annuncia) nota('<strong>' + nomePunto(p.d) + '</strong> (' + p.d.c.anno + '): ' + valorePunto(p.d) + '. ' + p.d.c.testo);
      if (o.fuoco) p.g.focus();
      aggiornaPassi();
    }

    function posizionaSelezione(p, animato) {
      const g = geo;
      const righe = righeFumetto(p.d);
      el$.fTesto1.textContent = righe[0];
      el$.fTesto2.textContent = righe[1];
      el$.gSel.setAttribute('visibility', 'visible');
      let w = 120;
      try { w = Math.max(el$.fTesto1.getComputedTextLength(), el$.fTesto2.getComputedTextLength()) + 16; } catch (e) { /* misura non disponibile */ }
      const hF = 40;
      el$.fRett.setAttribute('width', w);
      // fumetto sopra a destra del punto; se non c'è spazio, a sinistra o sotto
      let fx = p.px + 12;
      if (fx + w > g.W - g.m.r) fx = p.px - 12 - w;
      fx = ctx.clamp(fx, g.m.l + 2, g.W - g.m.r - w);
      let fy = p.py - hF - 12;
      if (fy < g.m.t) fy = p.py + 14;
      if (fy + hF > g.H - g.m.b) fy = g.H - g.m.b - hF - 2;
      const meta = { x: p.px, y: p.py, fx: fx, fy: fy };
      const applica = (q) => {
        el$.anello.setAttribute('transform', 'translate(' + q.x + ' ' + q.y + ')');
        el$.fumetto.setAttribute('transform', 'translate(' + q.fx + ' ' + q.fy + ')');
        el$.mirX.setAttribute('x1', q.x); el$.mirX.setAttribute('x2', q.x); el$.mirX.setAttribute('y1', q.y); el$.mirX.setAttribute('y2', g.H - g.m.b);
        el$.mirY.setAttribute('x1', g.m.l); el$.mirY.setAttribute('x2', q.x); el$.mirY.setAttribute('y1', q.y); el$.mirY.setAttribute('y2', q.y);
      };
      if (tweenSel) { tweenSel.cancel(); tweenSel = null; }
      if (!animato || !selPos || ridotto()) { selPos = meta; applica(meta); return; }
      const da = selPos;
      tweenSel = ctx.tween({
        dur: ctx.motion.dur.fast + 60, ease: 'smooth',
        update: (k) => {
          selPos = { x: ctx.lerp(da.x, meta.x, k), y: ctx.lerp(da.y, meta.y, k), fx: ctx.lerp(da.fx, meta.fx, k), fy: ctx.lerp(da.fy, meta.fy, k) };
          applica(selPos);
        },
      });
    }

    function dettaglio(d) {
      const v = stato.vista;
      const righe = [];
      if (v === 'core') {
        detMeta.textContent = d.c.anno + ' · ' + SERIE[d.serie];
        detNome.textContent = d.c.chip;
        righe.push(['Core', d.y + (d.c.p ? ' (' + d.c.p + '\u00a0P\u00a0+\u00a0' + d.c.e + '\u00a0E)' : '')], ['Dal', String(d.c.anno)]);
      } else {
        const c = d.c;
        detMeta.textContent = c.marca + ' · ' + c.anno;
        detNome.textContent = c.nome;
        if (v === 'transistor') {
          righe.push(['Transistor', M.formatoTransistor(c.transistor)]);
          righe.push(['Raddoppio dal 4004', c.id === 'i4004' ? '—' : fmt(M.raddoppioDal4004(c.id), 1) + ' anni']);
          righe.push(['Core', String(c.core)]);
          righe.push(['Fonte', c.fonte || '—']);
        } else {
          righe.push([c.mhzBase ? 'Turbo massimo' : 'Frequenza', M.formatoFrequenza(c.mhz)]);
          if (c.mhzBase) righe.push(['Frequenza base', M.formatoFrequenza(c.mhzBase)]);
          if (c.mhzMax) righe.push(['Arriverà a', M.formatoFrequenza(c.mhzMax)]);
          righe.push(['Core', c.core + (c.thread ? ' · ' + c.thread + ' thread' : '')]);
        }
      }
      detKv.replaceChildren(...righe.map((r) => voce(r[0], h('dd', null, r[1]))));
      detTesto.textContent = d.c.testo;
    }

    function aggiornaPassi() {
      const i = stato.sel[stato.vista];
      let prec = false, succ = false;
      punti.forEach((p, k) => {
        if (k < i && p.visibile) prec = true;
        if (k > i && p.attivo) succ = true;
      });
      btnPrec.disabled = !prec;
      btnSucc.disabled = !succ;
    }

    function passo(dir) {
      stato.avviato = true;
      if (stato.storia === 'in corso') pausaStoria();
      if (anim.corsa && stato.entrata) { anim.corsa = false; stato.entrata = false; impostaPh(VISTE[stato.vista].x[1], null); finePop(); }
      let j = stato.sel[stato.vista] + dir;
      while (j >= 0 && j < punti.length && !punti[j].attivo) j += dir;
      if (j < 0 || j >= punti.length) return;
      const p = punti[j];
      if (!p.visibile) {
        impostaPh(p.x, performance.now());
        ciclo.start();
        if (stato.storia === 'ferma' && stato.ph < VISTE[stato.vista].x[1]) { stato.storia = 'in pausa'; aggiornaStoriaUI(); }
      }
      seleziona(j, { annuncia: true });
    }

    /* ---------- storia: riproduzione, pausa, ripresa ---------- */

    function aggiornaStoriaUI() {
      const st = stato.storia;
      txtStoria.textContent = st === 'in corso' ? 'Pausa' : (st === 'in pausa' ? 'Riprendi' : 'Riproduci la storia');
      icoStoria.textContent = st === 'in corso' ? '❚❚' : '▶';
      btnStoria.setAttribute('aria-pressed', String(st === 'in corso'));
      radice.classList.toggle('prs-in-storia', st !== 'ferma');
      if (st === 'ferma' && el$.annoGrande) el$.annoGrande.textContent = '';
    }

    function storia() {
      const v = VISTE[stato.vista];
      stato.avviato = true;
      if (stato.storia === 'in corso') { pausaStoria(); return; }
      if (stato.entrata) { anim.corsa = false; stato.entrata = false; }
      if (ridotto()) {
        // movimento ridotto: si riparte dal primo punto e si procede passo passo
        stato.storia = 'in pausa';
        stato.tappa = 0;
        impostaPh(punti[0].x, null);
        aggiornaStoriaUI();
        seleziona(0, {});
        nota('Movimento ridotto: premi <strong>▶</strong> (punto successivo) per far comparire i processori uno alla volta.');
        return;
      }
      let da = stato.ph;
      if (stato.storia === 'ferma' || da >= v.x[1] - 1e-6) {
        da = v.x[0];
        stato.tappa = 0;
        impostaPh(da, null);
        el$.gSel.setAttribute('visibility', 'hidden');
      }
      stato.storia = 'in corso';
      aggiornaStoriaUI();
      corri(da, v.x[1], (v.x[1] - da) * v.msAnno, ctx.curve.linear, fineStoria);
    }

    function pausaStoria() {
      anim.corsa = false;
      stato.storia = 'in pausa';
      aggiornaStoriaUI();
    }

    function fineStoria() {
      stato.storia = 'ferma';
      aggiornaStoriaUI();
      selezionaIniziale();
      nota(VISTE[stato.vista].finale());
    }

    function fermaStoria() {
      anim.corsa = false;
      stato.entrata = false;
      finePop();
      stato.storia = 'ferma';
      aggiornaStoriaUI();
    }

    /* ---------- interruttore della vista ---------- */

    function aggiornaInterruttore() {
      const v = stato.vista;
      const acceso = v === 'transistor' ? stato.moore : (v === 'frequenza' ? stato.tendenza : stato.hedt);
      btnInt.textContent = VISTE[v].interruttore || '';
      btnInt.setAttribute('aria-pressed', String(!!acceso));
      aggiornaLegenda();
    }

    function sfuma(g, acceso) {
      if (!g) return;
      ctx.tween({ from: acceso ? 0 : 1, to: acceso ? 1 : 0, dur: ctx.motion.dur.normal, ease: 'smooth', update: (o) => g.setAttribute('opacity', o.toFixed(3)) });
    }

    function interruttore() {
      const v = stato.vista;
      if (v === 'transistor') {
        stato.moore = !stato.moore;
        if (tweenLinea) tweenLinea.cancel();
        const W = geo.W;
        if (stato.moore) {
          el$.lineaMoore.setAttribute('opacity', 1);
          tweenLinea = ctx.tween({ from: 0, to: W, dur: ctx.motion.dur.crawl, ease: 'smooth', update: (w) => el$.clipMoore.setAttribute('width', w) });
          nota('La retta tratteggiata parte dai 2.300 transistor del 4004 (1971) e <strong>raddoppia ogni due anni</strong>: per il 2025 prevede circa ' + moore2025 + ' di transistor. Per mezzo secolo i processori le restano attorno.');
        } else {
          tweenLinea = ctx.tween({ from: 1, to: 0, dur: ctx.motion.dur.fast, ease: 'sharp', update: (o) => el$.lineaMoore.setAttribute('opacity', o), done: () => el$.clipMoore.setAttribute('width', 0) });
          nota('Retta del raddoppio nascosta.');
        }
      } else if (v === 'frequenza') {
        stato.tendenza = !stato.tendenza;
        sfuma(el$.gTendenza, stato.tendenza);
        nota(stato.tendenza
          ? 'La linea tratteggiata prolunga la crescita delle frequenze fino al 2004, un raddoppio ogni ' + fmt(tendF.periodo, 1) + ' anni. Di questo passo nel 2010 si sarebbe arrivati a circa ' + ghz2010 + ' GHz e nel 2025 a circa ' + fmt(ghz2025) + ' GHz.'
          : 'Tendenza nascosta: restano solo i processori veri.');
      } else if (v === 'core') {
        stato.hedt = !stato.hedt;
        punti.forEach((p) => { if (p.d.serie === 'hedt') p.attivo = stato.hedt; });
        sfuma(el$.gHedt, stato.hedt);
        impostaPh(stato.ph, stato.hedt ? performance.now() : null);
        if (stato.hedt) ciclo.start();
        const i = stato.sel.core;
        if (!punti[i] || !punti[i].visibile) { const j = ultimoVisibile(); if (j >= 0) seleziona(j, {}); } else aggiornaPassi();
        nota(stato.hedt ? 'In azzurro la fascia più alta (HEDT): processori per professionisti e appassionati, con più core e prezzi più alti.' : 'Ora vedi solo il record dei processori per i PC di tutti i giorni.');
      }
      aggiornaInterruttore();
    }

    function aggiornaLegenda() {
      const v = stato.vista;
      const voci = [];
      const pallino = (cls, testo) => h('li', null, h('span', { class: 'prs-sw pallino ' + cls }), testo);
      const linea = (cls, testo) => h('li', null, h('span', { class: 'prs-sw linea ' + cls }), testo);
      if (v === 'transistor' || v === 'frequenza') voci.push(pallino('m-intel', 'Intel'), pallino('m-amd', 'AMD'));
      if (v === 'transistor') { voci.push(pallino('m-apple', 'Apple')); if (stato.moore) voci.push(linea('moore', 'raddoppio ogni 2 anni')); }
      if (v === 'frequenza') {
        voci.push(h('li', null, h('span', { class: 'prs-sw turbo' }), 'base → turbo'));
        if (stato.tendenza) voci.push(linea('tendenza', 'tendenza 1971–2004'));
      }
      if (v === 'core') { voci.push(linea('s-pubblico', SERIE.pubblico)); if (stato.hedt) voci.push(linea('s-hedt', SERIE.hedt)); }
      elLegenda.replaceChildren(...voci);
    }

    /* ---------- tastiera e puntatore ---------- */

    svg.addEventListener('keydown', (e) => {
      const g = e.target.closest && e.target.closest('.prs-punto');
      if (!g) return;
      const i = g.__i;
      const visibili = punti.map((p, k) => (p.visibile ? k : -1)).filter((k) => k >= 0);
      const pos = visibili.indexOf(i);
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = visibili[Math.min(visibili.length - 1, pos + 1)];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = visibili[Math.max(0, pos - 1)];
      else if (e.key === 'Home') j = visibili[0];
      else if (e.key === 'End') j = visibili[visibili.length - 1];
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleziona(i, { annuncia: true }); return; }
      if (j == null) return;
      e.preventDefault();
      seleziona(j, { fuoco: true });
    });

    svg.addEventListener('focusin', (e) => {
      const g = e.target.closest && e.target.closest('.prs-punto');
      if (g && g.__i !== stato.sel[stato.vista]) seleziona(g.__i, {});
    });

    function vicino(e, raggio) {
      const r = svg.getBoundingClientRect();
      if (!r.width || !geo) return -1;
      const k = geo.W / r.width;
      const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
      let migliore = -1, dMin = raggio * raggio;
      punti.forEach((p, i) => {
        if (!p.visibile) return;
        const dx = p.px - x, dy = p.py - y, d = dx * dx + dy * dy;
        if (d < dMin) { dMin = d; migliore = i; }
      });
      return migliore;
    }

    svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || stato.storia === 'in corso' || stato.entrata) return;
      const i = vicino(e, 26);
      if (i >= 0 && i !== stato.sel[stato.vista]) seleziona(i, {});
    });
    svg.addEventListener('pointerdown', (e) => {
      if (stato.entrata) return;
      const i = vicino(e, e.pointerType === 'mouse' ? 26 : 34);
      if (i < 0) return;
      if (stato.storia === 'in corso') pausaStoria();
      seleziona(i, { annuncia: true });
    });

    /* =================================================================
     * Legge di Amdahl: la gara e la curva
     * ================================================================= */
    let gG = null;           // elementi della gara da aggiornare
    let tweenAcc = null;
    let accMostrata = M.amdahl(stato.p, stato.n);

    function datiAmdahl() {
      const p = stato.p, n = stato.n;
      const t = M.tempoAmdahl(p, n);
      return { p: p, n: n, ser: t.seriale, par: t.parallelo, fine: t.totale, S: M.amdahl(p, n), lim: M.limiteAmdahl(p) };
    }

    function testoLimite(lim) {
      if (!isFinite(lim)) return 'nessuno';
      if (Math.abs(lim - Math.round(lim)) < 0.005) return fmt(Math.round(lim)) + '×';
      return fmt(lim, lim < 10 ? 2 : 1) + '×';
    }

    function disegnaGara() {
      const a = datiAmdahl();
      const W = Math.max(260, Math.floor(boxGantt.clientWidth || 420));
      const stretto = W < 440;
      const m = { l: stretto ? 54 : 66, r: 16 };
      const H = 248;
      const T = M.scalaLineare(0, 1, m.l, W - m.r);
      const yRef = 16, hRef = 24;
      const yB = 70, hB = 140;
      const hL = Math.min(24, hB / a.n);
      const gap = a.n <= 24 ? Math.min(4, hL * 0.22) : 0;
      const y0 = yB + (hB - hL * a.n) / 2;
      svgG.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svgG.setAttribute('aria-label', 'Gara fra un core e ' + a.n + ' core. Con un core il lavoro dura 1; con ' + a.n + ' core dura ' + fmt(a.fine, 2) + ', cioè ' + fmt(a.S, 2) + ' volte meno.');
      svgG.replaceChildren();
      const idClip = ctx.uid('prs-clipg');
      const idTrat = ctx.uid('prs-tratteggio');
      const clipRect = s('rect', { x: m.l - 2, y: 0, width: W, height: H });
      svgG.append(s('defs', null,
        s('clipPath', { id: idClip }, clipRect),
        s('pattern', { id: idTrat, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          s('rect', { width: 6, height: 6, class: 'prs-g-attesa-fondo' }), s('line', { x1: 0, x2: 0, y1: 0, y2: 6, class: 'prs-g-attesa-riga' }))));
      // asse del tempo
      const gAsse = s('g', { class: 'prs-assi', 'aria-hidden': 'true' });
      [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
        gAsse.append(s('line', { class: 'prs-griglia v', x1: T(t), x2: T(t), y1: 8, y2: yB + hB + 6 }));
        gAsse.append(s('text', { class: 'prs-et-x', x: T(t), y: H - 12 }, fmt(t, 2)));
      });
      gAsse.append(s('text', { class: 'prs-et-y forte', x: m.l - 8, y: yRef + hRef / 2, dy: '0.34em' }, '1 core'));
      gAsse.append(s('text', { class: 'prs-et-y forte', x: m.l - 8, y: yB + hB / 2, dy: '0.34em' }, a.n + (a.n === 1 ? ' core' : ' core')));
      svgG.append(gAsse);
      // barre
      const barre = s('g', { 'clip-path': 'url(#' + idClip + ')' });
      const rett = (cls, t0, t1, y, hh) => { if (t1 - t0 > 1e-6) barre.append(s('rect', { class: cls, x: T(t0), y: y, width: Math.max(0.5, T(t1) - T(t0)), height: hh, rx: Math.min(4, hh / 3) })); };
      rett('prs-g-ser', 0, a.ser, yRef, hRef);
      rett('prs-g-par', a.ser, 1, yRef, hRef);
      for (let i = 0; i < a.n; i++) {
        const y = y0 + i * hL;
        const hh = Math.max(0.8, hL - gap);
        if (i === 0) rett('prs-g-ser', 0, a.ser, y, hh);
        else if (a.ser > 1e-6) barre.append(s('rect', { x: T(0), y: y, width: T(a.ser) - T(0), height: hh, fill: 'url(#' + idTrat + ')', class: 'prs-g-attesa' }));
        rett('prs-g-par', a.ser, a.fine, y, hh);
      }
      svgG.append(barre);
      // traguardi
      const tagRef = s('g', { class: 'prs-g-traguardo', transform: 'translate(' + T(1) + ' 0)' },
        s('line', { x1: 0, x2: 0, y1: yRef - 6, y2: yRef + hRef + 6 }));
      const xFine = T(a.fine);
      const destra = xFine < W - m.r - 70;
      const tagN = s('g', { class: 'prs-g-traguardo forte', transform: 'translate(' + xFine + ' 0)' },
        s('line', { x1: 0, x2: 0, y1: yB - 8, y2: yB + hB + 8 }),
        s('path', { class: 'prs-g-bandiera', d: 'M0 ' + (yB - 8) + 'h14l-4 5l4 5h-14z' }),
        s('text', { x: destra ? 8 : -8, y: yB + hB + 4, 'text-anchor': destra ? 'start' : 'end' }, 'fine: ' + fmt(a.fine, 2)));
      const cursore = s('line', { class: 'prs-g-cursore', x1: 0, x2: 0, y1: 6, y2: yB + hB + 10, visibility: 'hidden' });
      svgG.append(tagRef, tagN, cursore);
      gG = { T: T, m: m, W: W, clipRect: clipRect, cursore: cursore, tagN: tagN, tagRef: tagRef, a: a };
      if (stato.gara) mostraGara(stato.gara.t);
    }

    function mostraGara(t) {
      if (!gG) return;
      const x = gG.T(t);
      gG.clipRect.setAttribute('width', Math.max(0, x - gG.m.l + 2));
      gG.cursore.setAttribute('transform', 'translate(' + x + ' 0)');
      gG.cursore.setAttribute('visibility', t < 1 ? 'visible' : 'hidden');
      gG.tagN.setAttribute('visibility', t >= gG.a.fine - 1e-9 ? 'visible' : 'hidden');
      gG.tagRef.setAttribute('visibility', t >= 1 ? 'visible' : 'hidden');
    }

    const cicloGara = ctx.loop(() => {
      const g = stato.gara;
      if (!g) return false;
      const t = ctx.clamp((performance.now() - g.t0) / g.durata, 0, 1);
      const prima = g.t;
      g.t = t;
      mostraGara(t);
      const a = gG.a;
      if (prima < a.fine && t >= a.fine && a.n > 1) nota('<strong>' + a.n + ' core: traguardo!</strong> Hanno finito a ' + fmt(a.fine, 2) + ' del tempo. Il core da solo è ancora al lavoro…');
      if (t >= 1) { fineGara(); return false; }
      return true;
    });

    function gara() {
      if (stato.gara) { fineGara(); return; }
      const a = datiAmdahl();
      if (ridotto()) { disegnaGara(); nota(testoFineGara(a)); return; }
      stato.gara = { t0: performance.now(), durata: 3400, t: 0 };
      txtGara.textContent = 'Ferma la gara';
      icoGara.textContent = '■';
      mostraGara(0);
      nota('Via! In alto un core fa tutto da solo; sotto, ' + a.n + ' core si dividono la parte parallela. La parte seriale (in ambra) gira comunque su un core solo.');
      cicloGara.start();
    }

    function fineGara() {
      const finita = stato.gara && stato.gara.t >= 1;
      stato.gara = null;
      cicloGara.stop();
      txtGara.textContent = 'Avvia la gara';
      icoGara.textContent = '▶';
      mostraGara(1);
      if (finita) nota(testoFineGara(datiAmdahl()));
    }

    function testoFineGara(a) {
      if (a.n === 1) return 'Con un solo core non c\'è gara: il tempo resta 1. Aumenta i core.';
      return 'Gara finita: con ' + a.n + ' core il lavoro dura ' + fmt(a.fine, 2) + ' invece di 1, cioè <strong>' + fmt(a.S, 2) + ' volte più in fretta</strong>, non ' + a.n + '.';
    }

    function disegnaCurva() {
      const a = datiAmdahl();
      const W = Math.max(260, Math.floor(boxCurva.clientWidth || 420));
      const stretto = W < 440;
      const H = Math.round(ctx.clamp(W * 0.6, 232, 300));
      const m = { l: 44, r: 14, t: 12, b: 28 };
      const X = M.scalaLog(1, 1024, m.l, W - m.r, 2);
      const Y = M.scalaLog(1, 1024, H - m.b, m.t, 2);
      svgC.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svgC.setAttribute('aria-label', 'Curva dell\'accelerazione con il ' + Math.round(a.p * 100) + '% di lavoro parallelo: con ' + a.n + ' core ' + fmt(a.S, 2) + ' volte; limite con infiniti core: ' + testoLimite(a.lim) + '.');
      svgC.replaceChildren();
      const gAssi = s('g', { class: 'prs-assi', 'aria-hidden': 'true' });
      for (let e = 0; e <= 10; e++) {
        const v = Math.pow(2, e);
        const forte = e % 2 === 0;
        gAssi.append(s('line', { class: 'prs-griglia' + (forte ? '' : ' fine'), x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
        gAssi.append(s('line', { class: 'prs-griglia v' + (forte ? '' : ' fine'), x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }));
        if (forte) {
          gAssi.append(s('text', { class: 'prs-et-y', x: m.l - 7, y: Y(v), dy: '0.34em' }, fmt(v)));
          gAssi.append(s('text', { class: 'prs-et-x', x: X(v), y: H - m.b + 18 }, fmt(v)));
        }
      }
      gAssi.append(s('line', { class: 'prs-asse-base', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
      // oltre i 64 core del cursore
      gAssi.append(s('rect', { class: 'prs-c-oltre', x: X(64), y: m.t, width: W - m.r - X(64), height: H - m.b - m.t }));
      svgC.append(gAssi);
      const percorso = (q) => M.curvaAmdahl(q, 1, 1024, stretto ? 6 : 10).map((pt, i) => (i ? 'L' : 'M') + X(pt.n).toFixed(1) + ' ' + Y(pt.s).toFixed(1)).join('');
      // ideale: N core = N volte
      svgC.append(s('path', { class: 'prs-c-ideale', d: 'M' + X(1) + ' ' + Y(1) + 'L' + X(1024) + ' ' + Y(1024) }));
      svgC.append(s('text', { class: 'prs-c-et ideale', x: X(stretto ? 12 : 20), y: Y(stretto ? 12 : 20) - 8, transform: 'rotate(' + (Math.atan2(Y(1024) - Y(1), X(1024) - X(1)) * 180 / Math.PI).toFixed(1) + ' ' + X(stretto ? 12 : 20) + ' ' + (Y(stretto ? 12 : 20) - 8) + ')' }, 'ideale: N core, N volte'));
      // curve di riferimento
      [0.5, 0.9, 0.99].forEach((q) => {
        if (Math.abs(q - a.p) < 0.005) return;
        svgC.append(s('path', { class: 'prs-c-rif', d: percorso(q) }));
        svgC.append(s('text', { class: 'prs-c-et rif', x: W - m.r - 3, y: Y(M.amdahl(q, 1024)) - 5 }, Math.round(q * 100) + '%'));
      });
      // limite
      if (isFinite(a.lim) && a.lim <= 1024 && a.lim > 1.0001) {
        const yl = Y(a.lim);
        svgC.append(s('line', { class: 'prs-c-limite', x1: m.l, x2: W - m.r, y1: yl, y2: yl }));
        svgC.append(s('text', { class: 'prs-c-et limite', x: m.l + 6, y: yl - 6 }, 'limite ' + testoLimite(a.lim)));
      }
      // curva attuale
      svgC.append(s('path', { class: 'prs-c-curva', d: percorso(a.p) }));
      // punto con i core scelti
      const xn = X(a.n), yn = Y(a.S);
      svgC.append(s('line', { class: 'prs-mirino', x1: xn, x2: xn, y1: yn, y2: H - m.b }));
      svgC.append(s('g', { class: 'prs-c-punto', transform: 'translate(' + xn + ' ' + yn + ')' }, s('circle', { r: 10, class: 'prs-alone' }), s('circle', { r: 5.5 })));
      const testo = a.n + ' core → ' + fmt(a.S, 2) + '×';
      const aDestra = xn < W - m.r - 120;
      svgC.append(s('text', { class: 'prs-c-et punto', x: aDestra ? xn + 12 : xn - 12, y: yn + 18, 'text-anchor': aDestra ? 'start' : 'end' }, testo));
    }

    function aggiornaKv(animato) {
      const a = datiAmdahl();
      outP.textContent = Math.round(a.p * 100) + '%';
      outN.textContent = String(a.n);
      inP.setAttribute('aria-valuetext', Math.round(a.p * 100) + ' per cento del programma si può dividere');
      inN.setAttribute('aria-valuetext', a.n + (a.n === 1 ? ' core' : ' core'));
      kv.tempo.textContent = fmt(a.fine * 100) + '%';
      kv.eff.textContent = fmt(a.S / a.n * 100) + '%';
      kv.lim.textContent = isFinite(a.lim) ? testoLimite(a.lim) : '∞';
      if (tweenAcc) tweenAcc.cancel();
      const da = accMostrata;
      if (!animato) { accMostrata = a.S; kv.acc.textContent = fmt(a.S, 2) + '×'; return; }
      tweenAcc = ctx.tween({ from: da, to: a.S, dur: ctx.motion.dur.normal, ease: 'smooth', update: (v) => { accMostrata = v; kv.acc.textContent = fmt(v, 2) + '×'; } });
    }

    function testoAmdahl() {
      const a = datiAmdahl();
      const pc = Math.round(a.p * 100);
      if (a.n === 1) return 'Con un solo core non c\'è niente da dividere: il tempo resta quello di partenza. Aumenta i core.';
      if (pc === 0) return 'Il programma è tutto in fila: ' + a.n + ' core vanno veloci come uno solo, e gli altri restano fermi ad aspettare.';
      if (pc === 100) return 'Programma parallelo al 100%, un caso ideale e rarissimo: con ' + a.n + ' core va proprio ' + a.n + ' volte più veloce.';
      const altri = a.n === 2 ? 'l\'altro core aspetta' : 'gli altri ' + (a.n - 1) + ' core aspettano';
      return 'Con il ' + pc + '% di lavoro parallelo e ' + a.n + ' core il programma va <strong>' + fmt(a.S, 2) + ' volte più veloce</strong>, non ' + a.n + ': mentre il ' + (100 - pc) + '% in fila gira su un core solo, ' + altri + '. Anche con infiniti core non si supererebbe ' + testoLimite(a.lim) + '.';
    }

    function cambiaAmdahl() {
      stato.p = Number(inP.value) / 100;
      stato.n = Number(inN.value);
      if (stato.gara) { stato.gara = null; cicloGara.stop(); txtGara.textContent = 'Avvia la gara'; icoGara.textContent = '▶'; }
      disegnaGara();
      disegnaCurva();
      aggiornaKv(true);
      if (stato.tabella) aggiornaTabella();
      notaRitardata(testoAmdahl());
    }

    /* =================================================================
     * Tabella dei dati (equivalente accessibile dei grafici)
     * ================================================================= */
    function aggiornaTabella() {
      btnTab.setAttribute('aria-expanded', String(stato.tabella));
      boxTab.hidden = !stato.tabella;
      if (!stato.tabella) return;
      const v = stato.vista;
      let titolo, colonne, righe;
      if (v === 'transistor') {
        titolo = 'Transistor per processore';
        colonne = ['Processore', 'Anno', 'Transistor', 'Fonte'];
        righe = PUNTI.transistor.map((d) => [d.c.nome, d.c.anno, M.formatoTransistor(d.y), d.c.fonte]);
      } else if (v === 'frequenza') {
        titolo = 'Frequenza massima per processore';
        colonne = ['Processore', 'Anno', 'Frequenza massima', 'Base'];
        righe = PUNTI.frequenza.map((d) => [d.c.nome, d.c.anno, M.formatoFrequenza(d.y), d.y0 ? M.formatoFrequenza(d.y0) : '—']);
      } else if (v === 'core') {
        titolo = 'Record di core nei processori desktop';
        colonne = ['Anno', 'Core', 'Processore', 'Fascia'];
        righe = PUNTI.core.map((d) => [d.c.anno, d.y, d.c.chip, SERIE[d.serie]]);
      } else {
        titolo = 'Accelerazione con il ' + Math.round(stato.p * 100) + '% di lavoro parallelo';
        colonne = ['Core', 'Accelerazione', 'Lavoro utile per core'];
        righe = [1, 2, 4, 8, 16, 32, 64, 128, 1024].map((n) => [fmt(n), fmt(M.amdahl(stato.p, n), 2) + '×', fmt(M.efficienza(stato.p, n) * 100) + '%']);
      }
      boxTab.replaceChildren(h('table', null,
        h('caption', null, titolo),
        h('thead', null, h('tr', null, colonne.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', null, righe.map((r) => h('tr', null, r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, String(c)) : h('td', null, String(c)))))))));
    }

    /* =================================================================
     * Viste
     * ================================================================= */
    function entra(box) {
      if (ridotto()) return;
      box.classList.remove('prs-entra');
      void box.offsetWidth;
      box.classList.add('prs-entra');
    }

    function mostraVista(id) {
      if (id === stato.vista) return;
      fermaStoria();
      if (stato.gara) fineGara();
      stato.avviato = true;
      stato.vista = id;
      bottoniVista.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === id)));
      const storica = id !== 'amdahl';
      boxStoria.hidden = !storica;
      boxAmdahl.hidden = storica;
      if (storica) {
        elAsse.textContent = VISTE[id].asse;
        detSintesi.innerHTML = VISTE[id].sintesi();
        aggiornaInterruttore();
        entra(boxStoria);
        stato.ph = VISTE[id].x[0];
        disegna();
        entrata();
      } else {
        entra(boxAmdahl);
        disegnaGara();
        disegnaCurva();
        aggiornaKv(false);
      }
      nota(VISTE[id].intro);
      if (stato.tabella) aggiornaTabella();
    }

    // stato iniziale: con movimento ridotto tutto subito; altrimenti il grafico si riempie quando diventa visibile
    elAsse.textContent = VISTE.transistor.asse;
    detSintesi.innerHTML = VISTE.transistor.sintesi();
    bottoniVista[0].setAttribute('aria-pressed', 'true');
    aggiornaInterruttore();
    stato.ph = ridotto() ? VISTE.transistor.x[1] : VISTE.transistor.x[0];
    disegna();
    if (ridotto()) selezionaIniziale();
    aggiornaKv(false);
    nota(VISTE.transistor.intro);

    // ridisegno quando cambia la larghezza
    let larghezza = el.clientWidth;
    let rafResize = 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - larghezza) < 2) return;
      larghezza = el.clientWidth;
      cancelAnimationFrame(rafResize);
      rafResize = requestAnimationFrame(() => {
        if (stato.vista === 'amdahl') { disegnaGara(); disegnaCurva(); } else disegna();
      });
    }) : null;
    if (ro) ro.observe(el);

    return {
      attiva() {
        if (!ridotto()) radice.classList.add('prs-vivo');
        if (!stato.avviato) {
          // prima volta in vista: il grafico si riempie da sinistra a destra (se l'utente non ha già agito)
          stato.avviato = true;
          if (stato.vista !== 'amdahl') entrata();
        } else if (stato.storia === 'in pausa' && stato.riprendi) {
          stato.riprendi = false;
          storia();
        }
      },
      sospendi() {
        radice.classList.remove('prs-vivo');
        if (stato.storia === 'in corso') { pausaStoria(); stato.riprendi = true; }
        if (stato.entrata) { anim.corsa = false; stato.entrata = false; impostaPh(VISTE[stato.vista].x[1] || stato.ph, null); finePop(); selezionaIniziale(); }
        if (stato.gara) fineGara();
        ciclo.stop();
      },
      distruggi() {
        ciclo.stop();
        cicloGara.stop();
        clearTimeout(timerNota);
        cancelAnimationFrame(rafResize);
        if (ro) ro.disconnect();
        if (tweenSel) tweenSel.cancel();
        if (tweenLinea) tweenLinea.cancel();
        if (tweenAcc) tweenAcc.cancel();
      },
    };
  }

  /* =====================================================================
   * Il capitolo
   * ===================================================================== */

  P.registra({
    numero: 9,
    id: 'prestazioni',
    titolo: 'La corsa alle prestazioni: MHz, transistor e core',
    breve: 'Prestazioni',
    periodo: '1982–oggi',
    colore: 'var(--era-9)',
    sommario: 'Dal 286 ai processori con decine di core: frequenza, pipeline e cache, la legge di Moore, il muro della potenza e la legge di Amdahl.',
    intro: 'Il processore dell\'IBM PC AT, nel 1984, aveva 134.000 transistor e lavorava a 6&nbsp;MHz. Un chip di oggi ne contiene decine di miliardi e i più veloci, per brevi momenti, superano i 6&nbsp;GHz. In mezzo ci sono quarant\'anni di corsa: prima ai megahertz, poi, quando il calore ha detto basta, ai core. Questo capitolo racconta come si misura la velocità di un computer, quali idee l\'hanno moltiplicata e perché moltiplicare i core, da solo, non basta per andare più forte.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Che cosa vuol dire «più veloce»',
        paragrafi: [
          'Un processore lavora al ritmo di un orologio interno, il <strong>clock</strong>: un segnale che oscilla milioni o miliardi di volte al secondo e scandisce ogni passo, come il metronomo per un musicista. La frequenza del clock si misura in hertz (Hz), cioè cicli al secondo. L\'8088 dell\'IBM PC del 1981 andava a 4,77&nbsp;MHz (milioni di cicli al secondo), un processore di oggi a 4 o 5&nbsp;GHz (miliardi). Per vent\'anni la frequenza è stata il numero stampato sulle scatole e nelle pubblicità.',
          'La frequenza però dice solo quanto spesso batte il tempo, non quanto lavoro si fa a ogni battito. Il secondo ingrediente è l\'<strong>IPC</strong> (Instructions Per Cycle, istruzioni per ciclo): quante istruzioni il processore completa, in media, a ogni colpo di clock. L\'8086 aveva bisogno di parecchi cicli per una sola istruzione; un core moderno ne completa diverse in un ciclo solo.',
          'Il tempo che serve per un programma si ottiene così: <strong>tempo = istruzioni ÷ (IPC × frequenza)</strong>. Si va più veloci in tre modi: alzando la frequenza, facendo più lavoro a ogni ciclo oppure dividendo il lavoro fra più processori. Per questo, nel 2006, un Core 2 Duo a 2,66&nbsp;GHz batteva in quasi tutte le prove i Pentium più veloci dell\'epoca, che arrivavano a 3,8&nbsp;GHz: batteva meno colpi, ma a ogni colpo faceva molto di più.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Da 16 a 32 bit: 286, 386 e 486',
        paragrafi: [
          'La famiglia x86 nasce nel 1978 con l\'8086, la cui storia interna è raccontata nella <a href="../chip-programmabili/index.html#sedici-bit">sezione 5</a>. Il passo successivo è l\'<strong>80286</strong>, presentato da Intel nel febbraio 1982: 134.000 transistor e una novità destinata a durare, la <em>modalità protetta</em>. In questa modalità il processore indirizza fino a 16&nbsp;MB di memoria (l\'8086 si fermava a 1&nbsp;MB) e impedisce a un programma di scrivere nella memoria di un altro: la base per far girare più programmi insieme. Nei PC si diffonde dal 1984, con l\'IBM PC AT.',
          'L\'<strong>80386</strong> (ottobre 1985) porta la famiglia a 32 bit: registri più larghi, 4&nbsp;GB di memoria indirizzabile e la <em>paginazione</em>. La memoria viene divisa in pagine da 4&nbsp;KB, ogni programma vede uno spazio tutto suo e le pagine che non servono possono finire sul disco: è la memoria virtuale. Il primo PC con il 386 messo in vendita non è un IBM ma il Compaq Deskpro 386, del settembre 1986; e sarà un PC con il 386 a ospitare, nel 1991, la prima versione di Linux.',
          'Il <strong>486</strong> (aprile 1989) supera il milione di transistor e mette nello stesso chip tre cose che prima stavano fuori o non c\'erano: il coprocessore matematico (FPU, Floating Point Unit, l\'unità per i numeri con la virgola), una memoria cache da 8&nbsp;KB e una pipeline a cinque stadi. Molte istruzioni semplici si completano così in un solo ciclo di clock: a parità di frequenza, un 486 va circa il doppio di un 386.',
          'La <strong>cache</strong> è una piccola memoria velocissima accanto al processore, che tiene una copia dei dati usati più spesso. Serve perché la memoria principale (RAM, Random Access Memory) è molto più lenta del processore: senza cache, il processore passerebbe gran parte del tempo ad aspettare. Oggi i livelli di cache dentro il chip sono tre (L1, L2 e L3); se ne parla nel capitolo sulla <a href="#memoria">memoria</a>.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Più lavoro a ogni colpo di clock',
        paragrafi: [
          'L\'idea più importante è la <strong>pipeline</strong>, una specie di catena di montaggio. Pensate a una lavanderia con tre postazioni: lavatrice, asciugatrice e tavolo per piegare. Se si aspetta che il primo cesto sia piegato prima di mettere in lavatrice il secondo, quattro cesti richiedono dodici turni. Ma appena il primo cesto passa nell\'asciugatrice la lavatrice è libera: con le tre postazioni sempre occupate, gli stessi quattro cesti sono pronti in sei turni. Ogni cesto impiega lo stesso tempo, ma ne esce uno a ogni turno.',
          'Il processore fa lo stesso con le istruzioni: mentre ne esegue una, decodifica la successiva e va a prendere in memoria quella dopo ancora (sono le fasi del <a href="../chip-programmabili/index.html#ciclo">ciclo dell\'istruzione</a>). Il guaio sono i salti: quando il programma arriva a un «se», la pipeline non sa quale strada prendere finché il confronto non è finito. I processori allora tirano a indovinare con la <em>previsione dei salti</em> (branch prediction): ricordano come sono andati quei salti le volte precedenti e scommettono. Se indovinano non perdono tempo; se sbagliano devono buttare il lavoro cominciato e ripartire.',
          'Il <strong>Pentium</strong> (marzo 1993) è il primo x86 <em>superscalare</em>: ha due pipeline affiancate e, quando due istruzioni vicine non dipendono l\'una dall\'altra, le esegue insieme. Nel 1994 un professore di matematica americano, Thomas Nicely, scopre che in rarissimi casi il Pentium sbaglia le divisioni con la virgola: è il <em>bug FDIV</em>, dal nome dell\'istruzione. Intel prima minimizza, poi accetta di sostituire il processore a chiunque lo chieda, e nel gennaio 1995 mette a bilancio una perdita di 475 milioni di dollari.',
          'Con il <strong>Pentium Pro</strong> (1995) arriva nei processori Intel l\'<em>esecuzione fuori ordine</em> (out-of-order): il processore traduce le istruzioni x86 in operazioni più semplici, le micro-operazioni, e le esegue non nell\'ordine scritto nel programma ma appena i loro dati sono pronti, rimettendo in fila i risultati alla fine. È come un cuoco che, mentre l\'acqua bolle, taglia già le verdure del piatto successivo. Quasi tutti i processori veloci di oggi lavorano così.',
          'L\'ultima idea è il <strong>SIMD</strong> (Single Instruction, Multiple Data: un\'istruzione, molti dati). Con le istruzioni multimediali <strong>MMX</strong> del 1997 una sola istruzione somma otto numeri da 8 bit alla volta: comodo per immagini, suoni e video, dove la stessa operazione si ripete su milioni di valori. Seguono le estensioni SSE (Streaming SIMD Extensions, 1999), che fanno lo stesso con quattro numeri con la virgola, e AVX (Advanced Vector Extensions, 2011), che lavorano su 256 bit alla volta.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraLavanderia,
        alt: 'Una lavatrice, un\'asciugatrice e un tavolo per piegare; sotto, lo schema dei turni: senza pipeline quattro cesti richiedono 12 turni, con la pipeline 6, perché le tre postazioni lavorano insieme su cesti diversi.',
        didascalia: '<strong>La lavanderia della pipeline.</strong> Senza pipeline ogni cesto aspetta che il precedente sia piegato: 4 cesti × 3 fasi = 12 turni. Con la pipeline le tre postazioni lavorano insieme su cesti diversi: dopo due turni per «riempire» la catena esce un cesto a ogni turno e i quattro cesti sono pronti in 6 turni. Un processore fa lo stesso con prelievo, decodifica ed esecuzione delle istruzioni.',
      },
      {
        tipo: 'testo',
        titolo: 'La guerra dei gigahertz',
        paragrafi: [
          'Alla fine degli anni Novanta la frequenza diventa un argomento di vendita e la gara si fa a due. L\'<strong>Athlon</strong> di AMD, uscito nel giugno 1999, batte i Pentium sul loro stesso terreno. Il 6 marzo 2000 AMD annuncia l\'Athlon a 1&nbsp;GHz, il primo processore per PC a mille megahertz; il Pentium III a 1&nbsp;GHz arriva due giorni dopo.',
          'La risposta di Intel è il <strong>Pentium 4</strong> (novembre 2000), con un\'architettura chiamata NetBurst e pensata per salire di frequenza: una pipeline lunghissima, di 20 stadi, poi 31 nella versione «Prescott» del 2004. Più stadi vogliono dire meno lavoro per ciascuno, e quindi un clock che può battere più in fretta; ma ogni previsione di salto sbagliata costa più cara, perché c\'è più lavoro da buttare. Al lancio Intel parlava di un\'architettura capace, in prospettiva, di arrivare a 10&nbsp;GHz.',
          'I 10&nbsp;GHz non arriveranno mai. Nel maggio 2004 Intel rinuncia al successore del Prescott, che avrebbe consumato ancora di più; il 14 ottobre cancella anche il Pentium 4 a 4&nbsp;GHz e annuncia che punterà sui processori a due core. A novembre esce il modello a 3,8&nbsp;GHz, il più veloce della serie: produce fino a 115 watt di calore, più di una vecchia lampadina a incandescenza da 100 watt, tutti concentrati in un quadratino di silicio di poco più di un centimetro di lato.',
          'Nel frattempo AMD fa un\'altra mossa decisiva: estende l\'architettura x86 a 64 bit. L\'estensione, chiamata <strong>AMD64</strong> (o x86-64), debutta nell\'aprile 2003 con l\'Opteron, un processore per server, e a settembre arriva nei PC con l\'Athlon 64, che ha anche il controller della memoria dentro il processore. Programmi a 32 e a 64 bit girano sullo stesso chip; Intel, che puntava su un\'architettura diversa (Itanium), nel 2004 adotta la stessa estensione. I PC di oggi con processore Intel o AMD usano ancora x86-64.',
        ],
      },
      {
        tipo: 'numeri',
        items: [
          { prefisso: '×', valore: 80, unita: 'milioni', etichetta: 'quante volte sono cresciuti i transistor in un chip: dai 2.300 del 4004 (1971) ai 184 miliardi dell\'Apple M3 Ultra (2025)' },
          { valore: 3.8, decimali: 1, unita: 'GHz', etichetta: 'il massimo del Pentium 4 (2004). Vent\'anni dopo, nel 2024, si arriva a 6,2&nbsp;GHz, e solo in turbo' },
          { valore: 31, unita: 'stadi', etichetta: 'la pipeline del Pentium 4 «Prescott» (2004), una delle più lunghe mai costruite' },
          { valore: 475, unita: 'milioni di $', etichetta: 'il costo del bug FDIV del Pentium per Intel (gennaio 1995)' },
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Il muro della potenza e l\'arrivo dei core',
        paragrafi: [
          'Perché la corsa si è fermata? Per trent\'anni ogni nuova generazione di transistor è stata più piccola e più veloce e, a parità di superficie, ha consumato la stessa potenza. Lo aveva descritto nel 1974 Robert Dennard, l\'ingegnere dell\'IBM che aveva inventato la DRAM (la memoria dinamica dei banchi di RAM), e la regola porta il suo nome: <em>scala di Dennard</em>. Rimpicciolire i transistor permetteva di metterne di più e di farli andare più veloci senza scaldare di più.',
          'Intorno al 2005 la scala di Dennard si rompe. Sotto una certa misura i transistor non si spengono più del tutto e lasciano passare un po\' di corrente anche a riposo (la corrente di dispersione), mentre la tensione di alimentazione non si può più abbassare come prima. La <a href="../elettronica-base/index.html#potenza">potenza</a> di un chip cresce con la frequenza e con il quadrato della tensione: spingere ancora il clock voleva dire produrre più calore di quanto un dissipatore ad aria riesca a smaltire. È il <strong>muro della potenza</strong> (power wall).',
          'La via d\'uscita è usare i transistor in più in un altro modo: invece di un processore sempre più veloce, due o più processori completi, i <strong>core</strong> (letteralmente «nuclei»), sullo stesso chip. Nella primavera del 2005 arrivano i primi doppio core per PC, il Pentium D di Intel e l\'Athlon 64 X2 di AMD. Nel 2006 il <strong>Core 2 Duo</strong>, nato da un progetto del centro Intel di Haifa, in Israele, supera il Pentium 4 con frequenze più basse e circa metà dei consumi: l\'IPC torna a contare più dei megahertz. Nel 2008 il <strong>Core i7</strong> riunisce in un solo chip quattro core e il controller della memoria, e introduce il Turbo Boost, che alza la frequenza di un core quando gli altri riposano.',
          'Oggi le strade sono tre, spesso percorse insieme. I <em>core ibridi</em>: nel 2021, con Alder Lake, Intel porta nei PC desktop core grandi e veloci (P-core) affiancati a core piccoli ed efficienti (E-core), un\'idea nata nei telefoni con processori ARM (big.LITTLE, 2011). I <em>chiplet</em>: dal 2019 AMD costruisce i Ryzen con più chip piccoli nello stesso involucro, uno per memoria e collegamenti e uno o due da otto core ciascuno, più facili da produrre di un chip grande. E i <em>sistemi su chip</em> come l\'Apple M1 (2020) e i suoi successori, con processore, grafica e memoria nello stesso pacchetto.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraDie,
        alt: 'Schema del chip di un processore a otto core: quattro core in alto e quattro in basso, la cache L3 condivisa al centro dentro un anello di collegamento, il controller della memoria e PCI Express a sinistra, la grafica integrata a destra.',
        didascalia: '<strong>Dentro un processore a otto core</strong>, in uno schema ispirato ai processori desktop del 2018–2020. Ogni core ha la sua cache privata (la striscia grigia, L2); tutti condividono una grande cache L3. Un anello di collegamento (ring bus) unisce core e cache al controller della memoria, ai collegamenti PCI Express (il bus delle schede video e dei dischi più veloci) e alla grafica integrata, fatta di tante piccole unità di calcolo uguali. Le proporzioni sono indicative.',
      },
      {
        tipo: 'testo',
        titolo: 'Due leggi da conoscere: Moore e Amdahl',
        paragrafi: [
          'Nel 1965 Gordon Moore, allora alla Fairchild e tre anni dopo tra i fondatori di Intel, notò che il numero di componenti che conveniva mettere in un circuito integrato raddoppiava ogni anno, e previde che sarebbe andata avanti così per almeno dieci anni. Nel 1975 corresse la stima: un raddoppio circa ogni due anni. È la <strong>legge di Moore</strong>, raccontata nella <a href="../porte-logiche/index.html#moore">sezione 4</a>.',
          'Non è una legge della fisica, come la gravità: è un\'osservazione economica diventata un obiettivo. Per decenni l\'industria dei semiconduttori ha pianificato le sue tappe per rispettarla, e la previsione si è avverata anche perché tutti lavoravano per farla avverare. Il laboratorio qui sotto mostra quanto è stata precisa: dai 2.300 transistor del 4004 ai 184 miliardi di un chip del 2025, un raddoppio ogni due anni circa. Negli ultimi anni il ritmo è rallentato e ogni passo costa sempre di più, ma i transistor continuano ad aumentare.',
          'La seconda legge spiega perché i core non sono una bacchetta magica. Nel 1967 Gene Amdahl, uno dei progettisti dell\'IBM System/360 (<a href="#giganti">capitolo 1</a>), fece notare che ogni programma ha una parte che si può dividere fra più processori e una parte che va eseguita per forza in fila, un passo dopo l\'altro. Se la parte divisibile è <em>p</em> e i processori sono <em>N</em>, l\'accelerazione è <strong>1 ÷ ((1 − p) + p ÷ N)</strong>: è la <strong>legge di Amdahl</strong>. Amdahl, in realtà, non scrisse nessuna formula: questa è la forma che altri diedero al suo ragionamento negli anni successivi.',
          'Un esempio: un programma parallelo al 90% su 10 core non va 10 volte più veloce, ma 5,26 volte, perché il 10% che resta in fila non accelera; e anche con infiniti core non supererebbe le 10 volte. Per questo un processore a 8 core non è 8 volte più veloce di uno a un core: lo è quasi solo nei lavori che si dividono bene, come il montaggio video, la grafica 3D o le simulazioni scientifiche. Nel 1988 John Gustafson mostrò l\'altra faccia della medaglia: con più core, di solito, non si fa più in fretta lo stesso lavoro, ma si affrontano problemi più grandi.',
        ],
      },
      {
        tipo: 'citazione',
        testo: 'Lo sforzo speso per ottenere alte velocità di elaborazione in parallelo è sprecato, se non è accompagnato da progressi di grandezza molto simile nella velocità di elaborazione sequenziale.',
        autore: 'Gene Amdahl',
        fonte: '«Validity of the single processor approach to achieving large scale computing capabilities», 1967 (traduzione)',
      },
      {
        tipo: 'nota',
        testo: 'Gordon Moore non ha mai parlato di «18 mesi». Il raddoppio ogni diciotto mesi che si legge spesso viene da una stima di David House, un dirigente di Intel, che sommava due effetti: più transistor e transistor più veloci. House parlava quindi di prestazioni, non di numero di transistor, e Moore stesso ha raccontato più volte di non averlo mai detto.',
      },
      { tipo: 'lab' },
      {
        tipo: 'italia',
        titolo: 'APE, i calcolatori paralleli dei fisici italiani',
        paragrafi: [
          'Quando i PC avevano ancora un solo processore, un gruppo dell\'INFN (Istituto Nazionale di Fisica Nucleare) guidato da Nicola Cabibbo, con Giorgio Parisi fra gli ideatori dell\'architettura, costruiva calcolatori fatti di molti processori che lavoravano insieme. Si chiamavano <strong>APE</strong> (Array Processor Experiment) e servivano a simulare le forze che tengono insieme i quark dentro protoni e neutroni, un calcolo enorme ma quasi tutto divisibile in parti.',
          'Il primo APE, da circa un miliardo di operazioni con la virgola al secondo (1&nbsp;GFLOPS), comincia a lavorare per la fisica nel 1987. APE100, con 2.048 nodi, arriva a circa 100&nbsp;GFLOPS nella prima metà degli anni Novanta e viene anche messo in commercio con il nome Quadrics. È il caso ideale per la legge di Amdahl: ogni nodo calcola la sua porzione di spazio e parla solo con i vicini. La famiglia continua con APEmille e apeNEXT; nel 2021 Parisi riceve il premio Nobel per la fisica.',
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Le tappe della corsa',
        items: [
          { anno: 1982, nome: 'Intel 80286', luogo: 'Santa Clara (California), Intel', testo: 'Modalità protetta, 16&nbsp;MB di memoria indirizzabile e 134.000 transistor. Dal 1984 è il processore dell\'IBM PC AT.' },
          { anno: 1985, nome: 'Intel 80386', luogo: 'Santa Clara (California), Intel', testo: 'Il primo x86 a 32 bit, con la paginazione per la memoria virtuale e 275.000 transistor. Il primo PC in vendita che lo monta è il Compaq Deskpro 386 (1986).' },
          { anno: 1987, nome: 'APE', luogo: 'Roma, INFN', italia: true, testo: 'Comincia a lavorare il primo calcolatore parallelo APE, progettato dal gruppo di Nicola Cabibbo e Giorgio Parisi: circa un miliardo di operazioni con la virgola al secondo.' },
          { anno: 1989, nome: 'Intel 486', luogo: 'Santa Clara (California), Intel', testo: 'Oltre un milione di transistor, coprocessore matematico e cache nello stesso chip, pipeline a cinque stadi: circa il doppio di un 386 alla stessa frequenza.' },
          { anno: 1993, nome: 'Pentium', luogo: 'Santa Clara (California), Intel', testo: 'Il primo x86 superscalare, con due pipeline affiancate. Nel 1994 il bug FDIV delle divisioni costerà a Intel 475 milioni di dollari.' },
          { anno: 1995, nome: 'Pentium Pro', luogo: 'Hillsboro (Oregon), Intel', testo: 'Porta nei processori Intel l\'esecuzione fuori ordine: le istruzioni diventano micro-operazioni, eseguite appena i loro dati sono pronti.' },
          { anno: 2000, nome: 'Athlon a 1 GHz', luogo: 'Sunnyvale (California), AMD', testo: 'Il 6 marzo AMD annuncia il primo processore per PC a un gigahertz, due giorni prima del Pentium III a 1&nbsp;GHz.' },
          { anno: 2003, nome: 'AMD64: Opteron e Athlon 64', luogo: 'Sunnyvale (California), AMD', testo: 'AMD estende x86 a 64 bit e porta il controller della memoria nel processore. Intel adotta la stessa estensione nel 2004.' },
          { anno: 2005, nome: 'Pentium D e Athlon 64 X2', luogo: 'Intel e AMD', testo: 'I primi doppio core per PC: il Pentium 4 si è fermato a 3,8&nbsp;GHz e la corsa passa dai megahertz ai core, due processori completi nello stesso chip.' },
          { anno: 2006, nome: 'Core 2 Duo', luogo: 'Haifa (Israele), Intel', testo: 'Frequenze più basse del Pentium 4, molto più lavoro per ciclo e circa metà dei consumi: l\'IPC torna a contare più dei megahertz.' },
          { anno: 2020, nome: 'Apple M1', luogo: 'Cupertino (California), Apple', testo: 'Un sistema su chip ARM con 16 miliardi di transistor: quattro core veloci, quattro efficienti, grafica e memoria nello stesso pacchetto.' },
          { anno: 2021, nome: 'Alder Lake', luogo: 'Santa Clara (California), Intel', testo: 'Core ibridi nei PC desktop: core grandi e veloci (P-core) insieme a core piccoli ed efficienti (E-core), fino a 16 nello stesso chip.' },
        ],
      },
    ],
    lab: {
      titolo: 'Moore, megahertz e core',
      sottotitolo: 'Quattro grafici per mezzo secolo di processori: tocca un punto, riproduci la storia, poi metti alla prova la legge di Amdahl.',
      crea: creaLaboratorio,
    },
    punti: [
      'La velocità dipende da quanti cicli al secondo fa il processore (frequenza) e da quanto lavoro fa a ogni ciclo (IPC): tempo = istruzioni ÷ (IPC × frequenza).',
      'Pipeline, esecuzione superscalare e fuori ordine, previsione dei salti, cache e istruzioni SIMD servono a fare più lavoro a ogni colpo di clock.',
      'Dal 286 (1982, 6&nbsp;MHz) al Pentium 4 la frequenza cresce di centinaia di volte; nel 2004 il calore ferma la corsa a 3,8&nbsp;GHz.',
      'Finita la scala di Dennard, intorno al 2005, i transistor in più diventano core: doppio core nel 2005, poi core ibridi, chiplet e sistemi su chip.',
      'La legge di Moore (1965, rivista nel 1975) è un\'osservazione, non una legge fisica: i transistor sono raddoppiati circa ogni due anni.',
      'La legge di Amdahl (1967): la parte di programma che non si divide limita l\'accelerazione; con il 90% parallelo non si superano mai le 10 volte.',
    ],
    collegamenti: [
      { testo: 'Bus ISA: il bus a 16 bit nato con il PC AT', href: '../../index.html#/bus/isa', tipo: 'buslab' },
      { testo: 'PCI: il bus dell\'epoca del Pentium', href: '../../index.html#/bus/pci', tipo: 'buslab' },
      { testo: 'PCI Express: le corsie dei processori di oggi', href: '../../index.html#/bus/pcie', tipo: 'buslab' },
      { testo: 'AXI: il bus dentro i sistemi su chip', href: '../../index.html#/bus/axi', tipo: 'buslab' },
      { testo: 'Sezione 2 · Il MOSFET', href: '../elettronica-intermedia/index.html#mosfet', tipo: 'sezione' },
      { testo: 'Sezione 3 · Il clock', href: '../elettronica-avanzata/index.html#clock', tipo: 'sezione' },
      { testo: 'Sezione 4 · La legge di Moore', href: '../porte-logiche/index.html#moore', tipo: 'sezione' },
      { testo: 'Sezione 5 · Il ciclo dell\'istruzione', href: '../chip-programmabili/index.html#ciclo', tipo: 'sezione' },
      { testo: 'Sezione 5 · I 16 bit: 8086 e 68000', href: '../chip-programmabili/index.html#sedici-bit', tipo: 'sezione' },
      { testo: 'Capitolo 6 · La memoria e le cache', href: '#memoria', tipo: 'sezione' },
      { testo: 'Capitolo 10 · Il PC di oggi', href: '#oggi', tipo: 'sezione' },
      { testo: 'Quiz sul capitolo', href: '../quiz/index.html#storia-pc/prestazioni', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
