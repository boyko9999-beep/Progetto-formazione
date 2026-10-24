/*
 * Storia della sezione: le epoche e le tappe che non appartengono a un solo capitolo
 * (soprattutto le valvole, antenate del transistor). Le tappe dei capitoli stanno nei file
 * chapters/*.js (history.events): la pagina #storia le unisce in un'unica linea del tempo.
 *
 * Qui c'è anche il "banco storico" della pagina (EI.historyDemo): una valvola termoionica
 * da accendere, prima come diodo di Fleming e poi come triodo di De Forest.
 * A livello del file non si tocca il DOM: Node carica questo file dopo core.js per i test
 * (tests/storia.test.js).
 */
(function (root) {
  'use strict';

  const EI = root.EI;

  /* ---------- testi della pagina ---------- */

  EI.historyLead = 'Dai cristalli e dalle valvole di vetro fino all\'amplificatore integrato: un secolo e mezzo di idee, in cui ogni invenzione nasce per superare i limiti di quella precedente. Qui sotto puoi accendere la valvola che ha aperto l\'era dell\'elettronica; le tappe con l\'etichetta di un capitolo ti portano al laboratorio dove le provi.';

  EI.eras = [
    {
      from: 1800, to: 1939, title: 'Cristalli e valvole',
      text: 'Nell\'Ottocento si scopre che certi cristalli conducono in un verso solo e che un filamento caldo, nel vuoto, lascia uscire elettricità. Da queste due stranezze nascono il rivelatore a cristallo, il diodo a vuoto di Fleming e il triodo di De Forest, il primo componente elettronico capace di amplificare un segnale. Con le valvole arrivano la radio, il telefono da costa a costa e i primi amplificatori; ma restano calde, fragili e assetate di energia.',
    },
    {
      from: 1940, to: 1959, title: 'Nasce il transistor',
      text: 'Il radar della guerra insegna a preparare germanio e silicio purissimi. Ai Bell Labs un gruppo nato per sostituire valvole e relè studia la giunzione P-N e, tra il 1947 e il 1948, inventa il transistor: freddo, piccolo e robusto. In poco più di dieci anni arrivano il transistor al silicio, la radio tascabile e l\'idea di costruire un intero circuito su un solo pezzo di semiconduttore.',
    },
    {
      from: 1960, to: 1979, title: 'L\'analogico diventa integrato',
      text: 'Con il processo planare i transistor si fabbricano a decine, poi a migliaia, sulla stessa fetta di silicio. Arrivano il MOSFET, i LED visibili, l\'amplificatore operazionale µA741, il timer 555 e i regolatori di tensione a tre piedini: un amplificatore che prima chiedeva valvole, trasformatori e un telaio intero ora sta in un contenitore con otto piedini.',
    },
    {
      from: 1980, to: 9999, label: '1980–oggi', title: 'Ovunque e invisibile',
      text: 'I componenti di questa sezione sono in ogni oggetto elettronico: caricabatterie e alimentatori, sensori, lampadine a LED bianchi nati dal LED blu. Le valvole sopravvivono in poche nicchie, come gli amplificatori per chitarra e il magnetron dei forni a microonde; il resto del loro lavoro lo fanno, a freddo, miliardi di transistor.',
    },
  ];

  // Tappe di contesto: non appartengono a nessun capitolo (le valvole e i laboratori che le hanno superate).
  // Date, nomi e primati verificati con fonti affidabili; le fonti sono elencate nel resoconto del lavoro.
  EI.timeline = [
    {
      year: 1883, title: 'L\'effetto Edison', who: 'Thomas Alva Edison',
      text: 'Per capire perché le sue lampadine si anneriscono, Edison chiude nel bulbo una piastrina di metallo: se la collega al lato positivo del filamento, un galvanometro segna una corrente che attraversa il vuoto; dal lato negativo, niente. La brevetta come indicatore di tensione, senza saperla spiegare.',
    },
    {
      year: 1904, title: 'La valvola di Fleming', who: 'John Ambrose Fleming',
      text: 'Consulente della compagnia di Marconi, Fleming cerca un rivelatore migliore per la radio e riprende l\'effetto Edison: nel novembre 1904 brevetta la «valvola oscillatoria», un diodo a vuoto che lascia passare la corrente in un verso solo. Le oscillazioni radio, troppo rapide per un galvanometro, diventano una corrente in un solo verso che l\'ago riesce a seguire.',
    },
    {
      year: 1906, title: 'L\'Audion e la griglia', who: 'Lee De Forest',
      text: 'De Forest presenta l\'Audion, una valvola per ricevere la radio, e a fine anno aggiunge tra filamento e placca un filo piegato a zig-zag che chiama grid, «griglia»: è il triodo, che brevetta nel gennaio 1907. Non sa bene perché funzioni e lo crede merito del gas rimasto nel bulbo: le prime Audion sono a vuoto «morbido», capricciose, e se la tensione di placca sale troppo si accendono di luce azzurra.',
    },
    {
      year: 1913, title: 'Il vuoto spinto', who: 'Harold D. Arnold (Western Electric) e Irving Langmuir (General Electric)',
      text: 'Due laboratori capiscono, quasi insieme, che il gas non serve: anzi, disturba. Pompando via quasi tutta l\'aria, il triodo diventa un amplificatore stabile e prevedibile. La lite sul brevetto di Langmuir arriverà fino alla Corte suprema degli Stati Uniti, che nel 1931 lo dichiarerà non valido: alla Western Electric il vuoto spinto lo usavano già.',
    },
    {
      year: 1915, title: 'Il telefono da costa a costa', who: 'AT&T, con Alexander Graham Bell e Thomas Watson',
      text: 'Il 25 gennaio Bell, a New York, parla con il suo vecchio assistente Watson, a San Francisco: si inaugura la prima linea telefonica che attraversa gli Stati Uniti. Lungo migliaia di chilometri di filo la voce si spegnerebbe: la tengono viva i ripetitori, amplificatori a triodi ad alto vuoto sistemati lungo la linea.',
    },
    {
      year: 1925, title: 'Nascono i Bell Labs', who: 'AT&T e Western Electric',
      text: 'Il 1° gennaio i ricercatori di AT&T e della Western Electric diventano un unico laboratorio, i Bell Telephone Laboratories. Da qui usciranno l\'amplificatore a [[retroazione-negativa|retroazione]], il transistor e buona parte dei componenti di questa sezione.',
    },
    {
      year: 1945, title: 'Un gruppo per sostituire la valvola', who: 'Mervin Kelly, William Shockley e Stanley Morgan (Bell Labs)',
      text: 'Mervin Kelly, che anni prima aveva diretto lo sviluppo delle valvole, crea ai Bell Labs un gruppo di fisica dello stato solido guidato da Shockley e dal chimico Stanley Morgan, con un obiettivo dichiarato: sostituire valvole e relè delle centrali telefoniche con dispositivi a semiconduttore. Due anni dopo nasce il transistor.',
    },
    {
      year: 1958, title: 'Verso il circuito integrato', who: 'Jack Kilby (Texas Instruments) e Robert Noyce (Fairchild)',
      text: 'Kilby nel 1958 e Noyce nel 1959 costruiscono più componenti su un solo pezzo di semiconduttore: la storia continua nella sezione <a href="../porte-logiche/index.html#integrato">Porte logiche e chip</a>.',
    },
  ];

  /* ---------- modello fisico della valvola (puro, testato in tests/storia.test.js) ---------- */

  /*
   * Triodo ideale tarato sul 6J5, un triodo per piccoli segnali degli anni Trenta (dati di catalogo:
   * μ = 20, 9 mA con 250 V di placca e −8 V di griglia, filamento 6,3 V · 0,3 A).
   * Con la legge dei 3/2 la pendenza in quel punto viene 3,0 mA/V (il catalogo dice 2,6 mA/V):
   * è un modello idealizzato, non la copia di una valvola vera.
   */
  const MU = 20;
  const K = 9e-3 / Math.pow(4.5, 1.5); // A/V^1,5 (perveanza del triodo)
  const KD = K / Math.pow(MU, 1.5); // diodo: stessa valvola, griglia unita al catodo
  const KG = 3e-4; // griglia positiva: Ig = KG · Vg^1,5
  const IS = 0.03; // emissione massima del catodo ben caldo, in ampere
  const T_COLD = 300; // K
  const T_HOT = 1100; // K, catodo a ossidi
  const WK = 12000; // lavoro di estrazione / k, in kelvin (circa 1 eV)

  const model = {
    MU: MU, K: K, KD: KD, KG: KG, IS: IS, T_COLD: T_COLD, T_HOT: T_HOT,
    RL_DIODE: 10000, RL_TRIODE: 22000,
    HEATER: { v: 6.3, i: 0.3 },

    // Legge di Child-Langmuir: corrente limitata dalla carica spaziale, I = k·V^1,5 (zero se V ≤ 0).
    childLangmuir: (v, k) => (v > 0 ? (k == null ? KD : k) * Math.pow(v, 1.5) : 0),

    // Corrente che lascia il catodo del triodo: conta la tensione "efficace" Vg + Vp/μ.
    cathode: (vg, vp, mu, k) => {
      const u = vg + vp / (mu || MU);
      return u > 0 ? (k == null ? K : k) * Math.pow(u, 1.5) : 0;
    },

    // Corrente di griglia (modello semplice): solo con la griglia positiva.
    gridCurrent: (vg) => (vg > 0 ? KG * Math.pow(vg, 1.5) : 0),

    // Temperatura del catodo durante il riscaldamento (0 = freddo, 1 = a regime), in kelvin.
    temperature: (warm) => T_COLD + (T_HOT - T_COLD) * Math.min(1, Math.max(0, warm)),

    // Emissione del catodo in funzione del riscaldamento (0 = freddo, 1 = a regime):
    // legge di Richardson, I ∝ T²·e^(−W/kT), normalizzata a IS quando il catodo è caldo.
    emission: (warm) => {
      const w = Math.min(1, Math.max(0, warm));
      if (w <= 0) return 0;
      const T = T_COLD + (T_HOT - T_COLD) * w;
      return IS * (T / T_HOT) * (T / T_HOT) * Math.exp(-WK * (1 / T - 1 / T_HOT));
    },

    // Minimo "morbido" fra la corrente della carica spaziale e l'emissione disponibile (saturazione).
    limit: (i, imax) => {
      if (!(i > 0) || !(imax > 0)) return 0;
      return i / Math.pow(1 + Math.pow(i / imax, 4), 0.25);
    },

    // Diodo: corrente di placca con il catodo riscaldato al livello warm.
    diode: (vp, warm) => model.limit(model.childLangmuir(vp, KD), model.emission(warm == null ? 1 : warm)),

    // Triodo: correnti di catodo, placca e griglia (ik = ip + ig). La placca raccoglie solo se è positiva;
    // con la placca a zero o negativa gli elettroni li può prendere solo una griglia positiva.
    triode: (vg, vp, warm) => {
      const em = model.emission(warm == null ? 1 : warm);
      const gsc = model.gridCurrent(vg);
      if (!(vp > 0)) {
        const ig = model.limit(gsc, em);
        return { ik: ig, ip: 0, ig: ig, sc: gsc };
      }
      const tot = model.cathode(vg, vp);
      if (!(tot > 0)) return { ik: 0, ip: 0, ig: 0, sc: 0 };
      const ik = model.limit(tot, em);
      const s = ik / tot;
      const ig = Math.min(ik, gsc * s);
      return { ik: ik, ip: ik - ig, ig: ig, sc: tot };
    },

    // Punto di lavoro con la resistenza di carico: Vp = B − RL·I(Vp), risolto per bisezione.
    // iOf(vp) deve crescere con vp. Con B ≤ 0 la placca non è positiva e la corrente è zero.
    operating: (B, RL, iOf) => {
      if (!(B > 0)) return { vp: B, ip: 0 };
      let lo = 0;
      let hi = B;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (mid + RL * iOf(mid) > B) hi = mid; else lo = mid;
      }
      const vp = (lo + hi) / 2;
      return { vp: vp, ip: Math.max(0, (B - vp) / RL) };
    },

    diodeOP: (vs, warm, RL) => model.operating(vs, RL || model.RL_DIODE, (v) => model.diode(v, warm)),

    triodeOP: (B, vg, warm, RL) => {
      const op = model.operating(B, RL || model.RL_TRIODE, (v) => model.triode(vg, v, warm).ip);
      const t = model.triode(vg, op.vp, warm);
      return { vp: op.vp, ip: op.ip, ig: t.ig, ik: op.ip + t.ig };
    },

    // Escursione con un segnale di ampiezza amp sulla griglia (punto di riposo, estremi e guadagno misurato).
    // Senza segnale il guadagno è quello per piccoli segnali, calcolato con ±10 mV.
    swing: (B, vg, amp, warm, RL) => {
      const a = amp > 0 ? amp : 0.01;
      const q = model.triodeOP(B, vg, warm, RL);
      const hi = model.triodeOP(B, vg - a, warm, RL); // griglia più negativa: meno corrente, placca più alta
      const lo = model.triodeOP(B, vg + a, warm, RL);
      return { q: q, hi: amp > 0 ? hi : q, lo: amp > 0 ? lo : q, gain: (hi.vp - lo.vp) / (2 * a) };
    },

    // La griglia spegne la corrente quando Vg + Vp/μ scende a zero.
    cutoff: (vp) => -vp / MU,

    // Piccoli segnali: pendenza gm = dIk/dVg, resistenza interna rp = μ/gm, guadagno Av = −μ·RL/(RL + rp).
    gm: (vg, vp) => {
      const u = vg + vp / MU;
      return u > 0 ? 1.5 * K * Math.sqrt(u) : 0;
    },
    rp: (vg, vp) => {
      const g = model.gm(vg, vp);
      return g > 0 ? MU / g : Infinity;
    },
    gain: (vg, vp, RL) => {
      const r = model.rp(vg, vp);
      return isFinite(r) ? -MU * RL / (RL + r) : 0;
    },

    heaterPower: (v, i) => v * i,
  };

  /* ---------- il banco storico: testi fissi (anche questi controllati dai test) ---------- */

  const CHALLENGES = [
    { id: 'edison', text: 'Rifai l\'esperimento di Edison: con la placca a +100 V o più e la corrente che passa, spegni il filamento e guarda la corrente fermarsi.' },
    { id: 'inversa', text: 'Nel diodo, con il filamento caldo, metti la placca a una tensione negativa (almeno −10 V): passa qualcosa?' },
    { id: 'interdizione', text: 'Nel triodo, con B+ = 200 V e senza segnale, trova la tensione di griglia meno negativa che basta a spegnere la corrente.' },
    { id: 'guadagno', text: 'Accendi il segnale sulla griglia e ottieni un guadagno di almeno 10 volte.' },
    { id: 'griglia', text: 'Rendi positiva la griglia (con la batteria C o con i picchi del segnale) e guarda gli elettroni finire anche sulla griglia.' },
  ];

  const FIGURES = [
    {
      title: 'Fleming e De Forest: un filo in più',
      caption: 'A sinistra la «valvola oscillatoria» di Fleming: un filamento caldo e un cilindro di metallo, la placca, nel vuoto di una lampadina. A destra l\'Audion di De Forest con la griglia, un filo piegato a zig-zag tra filamento e placca. Disegni semplificati: gli esemplari dell\'epoca cambiavano molto l\'uno dall\'altro.',
      alt: 'La valvola di Fleming, con filamento a ferro di cavallo e placca a cilindro, accanto all\'Audion di De Forest con filamento, griglia a zig-zag e placca',
    },
    {
      title: 'Dal vetro al simbolo: triodo e transistor',
      caption: 'Triodo e transistor bipolare si disegnano quasi allo stesso modo: l\'elettrodo che comanda sta a sinistra (la griglia, o la [[base-transistor|base]]) e la corrente scende dall\'alto (dalla placca, o dal [[collettore]]) verso il basso (il catodo, o l\'[[emettitore]]). Le differenze: la griglia comanda con una tensione, quasi senza corrente, mentre la base vuole una piccola corrente; e il transistor non ha un filamento da tenere acceso.',
      alt: 'Simbolo del triodo con placca, griglia e catodo accanto al simbolo del transistor NPN con collettore, base ed emettitore',
    },
  ];

  EI.storia = { model: model, challenges: CHALLENGES, figures: FIGURES };

  /* ---------- il banco storico: disegno e animazione (solo nel browser) ---------- */

  const OMEGA = Math.PI; // segnali al rallentatore: un periodo ogni 2 secondi
  const T_WIN = 6; // secondi visibili sull'oscilloscopio
  const IREF = 0.012; // corrente di riferimento per animazioni e strumenti (A)
  const VG_FAMILY = [0, -2, -4, -6, -8, -10, -12];
  const HEATER_W = model.heaterPower(model.HEATER.v, model.HEATER.i);

  // Valvola in coordinate locali: l'origine è il centro del catodo.
  const TUBE = {
    hw: 82, yDome: -78, yApex: -144, yGlassBot: 112,
    cw: 5, ce: 68, gx: 30, px: 60, pt: 8, pe: 70, act: 62,
    micaT: -82, micaB: 77, capTop: -158, gridY: -90,
    pins: [-39, -13, 13, 39], pinTop: 136, pinBot: 148,
  };
  TUBE.gridExitX = -TUBE.hw * Math.sqrt(1 - Math.pow((TUBE.yDome - TUBE.gridY) / (TUBE.yDome - TUBE.yApex), 2));
  const TY = 178; // centro del catodo nel disegno
  const Y_TOP = 10; // filo che porta alla placca
  const Y_LOOP = [338, 374]; // circuito del filamento
  const Y_RAIL = 392; // massa

  // Due impaginazioni: larga (computer) e stretta (telefono), stesse altezze.
  const GEOM = {
    wide: {
      key: 'wide', W: 640, H: 414, tx: 318, xL: 116, xR: 540, loopX: 168, sw: [192, 256], gndX: 440, out: true,
      leg: [420, 124], tagVp: [440, 30], tagVg: [178, 108], gLabel: [178, 80],
      names: { sig: 'segnale ~', bias: 'batteria C', B: 'batteria B', Vs: 'Vs', A: 'batteria A', leg: ['elettroni nel vuoto', 'corrente nei fili'] },
    },
    narrow: {
      key: 'narrow', W: 400, H: 414, tx: 200, xL: 38, xR: 362, loopX: 70, sw: [84, 140], gndX: 300, out: false,
      leg: [289, 118], tagVp: [282, 31], tagVg: [80, 108], gLabel: [80, 80],
      names: { sig: 'segnale', bias: 'C', B: 'B+', Vs: 'Vs', A: 'A', leg: ['elettroni', 'corrente'] },
    },
  };

  const CSS = [
    '.storia-lab .ei-stage { background: radial-gradient(ellipse 60% 70% at 50% 45%, rgba(255, 140, 60, .05), transparent 70%); }',
    '.storia-glass { stroke: rgba(205, 232, 245, .45); stroke-width: 1.6; }',
    '.storia-shine { fill: none; stroke: rgba(255, 255, 255, .2); stroke-width: 5; stroke-linecap: round; }',
    '.storia-shine.thin { stroke: rgba(255, 255, 255, .1); stroke-width: 2.5; }',
    '.storia-mica { fill: rgba(222, 232, 236, .16); stroke: rgba(222, 232, 236, .5); stroke-width: 1; }',
    '.storia-rod { fill: none; stroke: #7f8b91; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }',
    '.storia-lead { fill: none; stroke: #a4b0b5; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }',
    '.storia-stem { fill: rgba(200, 228, 240, .1); stroke: rgba(205, 232, 245, .35); stroke-width: 1; }',
    '.storia-back { stroke: #2b373c; stroke-width: 1; }',
    '.storia-plate { stroke: rgba(0, 0, 0, .35); stroke-width: .8; }',
    '.storia-cath { stroke: rgba(0, 0, 0, .4); stroke-width: .8; }',
    '.storia-heater { fill: none; stroke-width: 1.2; stroke-linecap: round; }',
    '.storia-hit { stroke: var(--trace-3); stroke-width: 2.6; stroke-linecap: round; filter: url(#ei-glow); opacity: 0; }',
    '.storia-cloud { fill: var(--trace-3); opacity: 0; }',
    '.storia-zig { fill: none; stroke-width: 1.5; stroke-linejoin: round; }',
    '.storia-elec { filter: url(#ei-glow); }',
    '.storia-elec .ei-e { filter: none; }',
    '.storia-flash { fill: none; stroke-width: 1.6; }',
    '.storia-pin { fill: #aeb8bd; }',
    '.storia-fade { transition: opacity var(--t-normal) ease; }',
    '.storia-hide { opacity: 0; pointer-events: none; }',
    '.storia-off { opacity: .32; }',
    '.storia-lbl { fill: var(--scope-text); font: 600 12px var(--font); }',
    '.storia-lbl .name, .storia-name { fill: #fff; font-weight: 800; }',
    '.storia-val { fill: var(--trace-2); font: 700 11.5px var(--mono); }',
    '.storia-tag { font: 700 11.5px var(--mono); }',
    '.storia-leg { fill: var(--scope-text); font: 600 11px var(--font); }',
    '.storia-legdot { fill: var(--flow); filter: url(#ei-glow); }',
    '.storia-narrow .storia-lbl { font-size: 15px; }',
    '.storia-narrow .storia-val, .storia-narrow .storia-tag { font-size: 14px; }',
    '.storia-narrow .storia-leg { font-size: 13.5px; }',
    '.storia-narrow .storia-zig { stroke-width: 1.8; }',
    '.storia-figs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 18px; align-items: start; }',
    '.storia-figs .ei-figure svg { max-height: 320px; }',
    '@media (max-width: 900px) { .storia-figs { grid-template-columns: 1fr; } }',
    '@media (max-width: 640px) { .storia-lab .ei-stage-svg { max-height: none; } }',
    '@media (prefers-reduced-motion: reduce) { .storia-fade { transition: none; } }',
  ].join('\n');

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Generatore pseudo-casuale con seme: con il movimento ridotto gli elettroni restano sempre negli stessi posti.
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Arrotonda in su a un valore "comodo" per le scale dei grafici.
  function niceUp(x) {
    const m = Math.pow(10, Math.floor(Math.log10(x)));
    for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * m >= x * 0.999) return k * m;
    return 10 * m;
  }
  // Colore del catodo in funzione della temperatura (K): da spento a rosso scuro, arancione, giallo-arancio.
  const GLOW = [[600, [46, 18, 12]], [740, [118, 22, 8]], [860, [190, 50, 12]], [980, [242, 112, 30]], [1100, [255, 170, 72]]];
  const METAL = [92, 102, 108];
  function glowRGB(T) {
    if (T <= GLOW[0][0]) return GLOW[0][1];
    for (let i = 1; i < GLOW.length; i++) {
      if (T <= GLOW[i][0]) {
        const f = (T - GLOW[i - 1][0]) / (GLOW[i][0] - GLOW[i - 1][0]);
        return GLOW[i - 1][1].map((v, k) => Math.round(v + (GLOW[i][1][k] - v) * f));
      }
    }
    return GLOW[GLOW.length - 1][1];
  }
  const mixRGB = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
  const rgb = (c) => 'rgb(' + c.join(',') + ')';

  // Spazio indivisibile tra un numero e la sua unità nei testi della spiegazione.
  const UNIT_GAP = /(\d) (?=(?:°C|mV|mA|µA|kΩ|Ω|V|A|W|s)(?![\wµ]))/g;
  const nb = (str) => String(str).replace(UNIT_GAP, '$1 ');

  function injectCss() {
    if (typeof document === 'undefined' || document.getElementById('storia-css')) return;
    const el = document.createElement('style');
    el.id = 'storia-css';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* --- illustrazioni sotto il banco (classi f-* di style.css, si adattano al tema) --- */

  function figFleming() {
    const bulb = (cx) => 'M' + (cx - 22) + ' 206C' + (cx - 22) + ' 192 ' + (cx - 60) + ' 170 ' + (cx - 60) + ' 122A60 60 0 1 1 ' + (cx + 60) + ' 122C' + (cx + 60) + ' 170 ' + (cx + 22) + ' 192 ' + (cx + 22) + ' 206Z';
    const base = (cx) => '<rect class="f-soft" x="' + (cx - 20) + '" y="204" width="40" height="34" rx="4"/>' +
      '<path class="f-thin" d="M' + (cx - 20) + ' 213h40M' + (cx - 20) + ' 221h40M' + (cx - 20) + ' 229h40"/>' +
      '<rect class="f-fill" x="' + (cx - 7) + '" y="238" width="14" height="6" rx="2"/>';
    let zig = 'M342 100';
    for (let y = 106, k = 0; y <= 178; y += 6, k++) zig += 'L' + (k % 2 ? 342 : 349) + ' ' + y;
    return '<svg viewBox="0 0 460 296">' +
      // Fleming
      '<path class="f-soft" d="' + bulb(118) + '"/>' + base(118) +
      '<path class="f-soft" d="M92 124V170A26 7 0 0 0 144 170V124A26 7 0 0 1 92 124Z" opacity=".75"/>' +
      '<path class="f-line" d="M92 124V170A26 7 0 0 0 144 170V124"/><ellipse class="f-line" cx="118" cy="124" rx="26" ry="7"/>' +
      '<path class="f-accent f-glow" stroke-width="2.6" d="M108 206V152Q108 134 118 134Q128 134 128 152V206"/>' +
      '<path class="f-line" d="M136 118V92Q136 74 118 66V42"/><circle class="f-paper" cx="118" cy="38" r="4"/>' +
      '<path class="f-thin" d="M92 146L58 112M108 184L58 196"/>' +
      '<text class="f-small" x="54" y="108" text-anchor="end">placca</text>' +
      '<text class="f-small" x="54" y="121" text-anchor="end">(cilindro)</text>' +
      '<text class="f-small" x="54" y="200" text-anchor="end">filamento</text>' +
      '<text class="f-title" x="118" y="266" text-anchor="middle">Fleming, 1904</text>' +
      '<text class="f-small" x="118" y="284" text-anchor="middle">diodo: filamento e placca</text>' +
      // De Forest
      '<path class="f-soft" d="' + bulb(342) + '"/>' + base(342) +
      '<path class="f-soft" d="M336 62L342 54L348 62Z"/>' +
      '<path class="f-accent f-glow" stroke-width="2.6" d="M313 206V112Q317 104 321 112V206"/>' +
      '<path class="f-line" stroke-width="1.6" d="' + zig + '"/>' +
      '<rect class="f-fill" x="362" y="96" width="7" height="86" rx="1.5"/>' +
      '<path class="f-line" stroke-width="1.6" d="M345 100V72L338 58V40M365 96V74L346 58V40"/>' +
      '<circle class="f-paper" cx="338" cy="36" r="4"/><circle class="f-paper" cx="346" cy="36" r="4" transform="translate(10 0)"/>' +
      '<path class="f-thin" d="M339 116L286 92M313 184L282 196M369 120L404 110"/>' +
      '<text class="f-small" x="282" y="90" text-anchor="end">griglia</text>' +
      '<text class="f-small" x="282" y="103" text-anchor="end">a zig-zag</text>' +
      '<text class="f-small" x="278" y="200" text-anchor="end">filamento</text>' +
      '<text class="f-small" x="408" y="113">placca</text>' +
      '<text class="f-title" x="342" y="266" text-anchor="middle">De Forest, 1906</text>' +
      '<text class="f-small" x="342" y="284" text-anchor="middle">triodo: in mezzo, la griglia</text>' +
      '</svg>';
  }

  function figSymbols() {
    return '<svg viewBox="0 0 460 262">' +
      // triodo
      '<circle class="f-line" cx="120" cy="120" r="62"/>' +
      '<path class="f-line" stroke-width="4" d="M96 88H144"/><path class="f-line" d="M120 88V24"/>' +
      '<path class="f-line" stroke-dasharray="6 5" d="M84 120H156"/><path class="f-accent" stroke-width="2.6" d="M84 120H22"/>' +
      '<path class="f-line" d="M100 152H142M100 152V230"/>' +
      '<path class="f-accent" stroke-width="1.6" stroke-dasharray="2 3" opacity=".8" d="M108 172L120 162L132 172"/>' +
      '<text class="f-text" x="128" y="38">placca</text>' +
      '<text class="f-accent-text" x="22" y="110">griglia</text>' +
      '<text class="f-text" x="108" y="226">catodo</text>' +
      '<text class="f-small" x="136" y="190">filamento</text>' +
      // transistor NPN
      '<circle class="f-thin" cx="362" cy="120" r="48"/>' +
      '<path class="f-line" stroke-width="4" d="M346 96V144"/><path class="f-accent" stroke-width="2.6" d="M346 120H282"/>' +
      '<path class="f-line" d="M346 108L378 88V24M346 132L378 152V230"/>' +
      '<path class="f-fill" d="M378 152L364.5 150.5L370.5 141Z"/>' +
      '<text class="f-text" x="386" y="38">collettore</text>' +
      '<text class="f-accent-text" x="282" y="110">base</text>' +
      '<text class="f-text" x="386" y="226">emettitore</text>' +
      // corrispondenze
      '<text class="f-small" x="230" y="252" text-anchor="middle">griglia ↔ base · placca ↔ collettore · catodo ↔ emettitore</text>' +
      '</svg>';
  }

  function figureEl(f, svg) {
    const h = EI.h;
    const art = h('div', { class: 'ei-figure-art', html: svg });
    const el = art.querySelector('svg');
    if (el) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', f.alt); }
    return h('figure', { class: 'ei-figure reveal in' },
      h('p', { class: 'ei-figure-title' }, f.title), art,
      h('figcaption', { html: EI.rich(f.caption) }));
  }

  /* --- il laboratorio --- */

  EI.historyDemo = function (container) {
    const { s, wire, sym, si, num } = EI;
    injectCss();
    const lab = EI.lab(container, {
      title: 'La valvola: da Fleming a De Forest', chapter: 'storia', layout: 'side', viewBox: [640, 414],
      svgLabel: 'Una valvola termoionica in vetro con catodo, griglia e placca, collegata alle batterie del filamento, della placca e della griglia',
    });
    lab.root.classList.add('storia-lab');
    const reduced = lab.reduced;
    const mq = root.matchMedia ? root.matchMedia('(max-width: 640px)') : null;
    let uid = 0;

    const st = {
      mode: 'diodo', heater: true, warm: reduced ? 1 : 0, phase: 0,
      ac: false, vs: 100, vac: 100,
      B: 250, RL: 22000, vg: -4, sig: false, amp: 1,
      // valori calcolati a ogni fotogramma
      T: 300, em: 0, ip: 0, ig: 0, vp: 0, vsi: 0, vgi: 0, sw: null, gainMeas: 0,
      edisonArmed: false, edison: false,
    };
    const buf = [];
    let parts = null;
    let geomKey = '';

    const fmtI = (v) => (v < 1e-9 ? '0 mA' : si(v, 'A'));
    const fmtV = (v) => (Math.abs(v) < 0.05 ? '0 V' : (v < 0 ? '−' : '') + num(Math.abs(v), Math.abs(v) < 10 ? 1 : 0) + ' V');
    const sv1 = (v) => (Math.abs(v) < 0.05 ? '0,0 V' : (v > 0 ? '+' : '−') + num(Math.abs(v), 1) + ' V');
    const degC = (T) => num(T - 273.15, 0) + ' °C';

    /* --- disegno del banco --- */

    function nameValue(parent, x, y, anchor, dy) {
      const t1 = s('text', { x: x, y: y, class: 'storia-lbl', 'text-anchor': anchor }, parent);
      const name = s('tspan', { class: 'name', text: '' }, t1);
      const value = s('text', { x: x, y: y + dy, class: 'storia-val', 'text-anchor': anchor }, parent);
      return { name: name, value: value };
    }

    function draw(G) {
      const svg = lab.svg;
      svg.innerHTML = '';
      lab.view(G.W, G.H);
      svg.classList.toggle('storia-narrow', G.key === 'narrow');
      uid += 1;
      const id = (n) => 'storia-' + n + '-' + uid;
      const T = TUBE;
      const tx = G.tx;
      const ty = TY;
      const p = { G: G, last: {} };
      const pin = (k) => [tx + T.pins[k], ty + T.pinBot];
      const cap = [tx, ty + T.capTop];
      const gExit = [tx + T.gridExitX, ty + T.gridY];
      const xL = G.xL;
      const xR = G.xR;
      const narrow = G.key === 'narrow';
      const dyLbl = narrow ? 18 : 16;

      const defs = s('defs', null, svg);
      defs.innerHTML =
        '<linearGradient id="' + id('glass') + '" x1="0" x2="1" y1="0" y2="0">' +
        '<stop offset="0" stop-color="#cfe9f5" stop-opacity=".22"/><stop offset=".16" stop-color="#cfe9f5" stop-opacity=".06"/>' +
        '<stop offset=".5" stop-color="#cfe9f5" stop-opacity=".025"/><stop offset=".84" stop-color="#cfe9f5" stop-opacity=".06"/>' +
        '<stop offset="1" stop-color="#cfe9f5" stop-opacity=".2"/></linearGradient>' +
        '<linearGradient id="' + id('metal') + '" x1="0" x2="1" y1="0" y2="0">' +
        '<stop offset="0" stop-color="#56636a"/><stop offset=".45" stop-color="#aeb9be"/><stop offset="1" stop-color="#4b565c"/></linearGradient>' +
        '<linearGradient id="' + id('back') + '" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0" stop-color="#1c262a"/><stop offset=".5" stop-color="#10171a"/><stop offset="1" stop-color="#1c262a"/></linearGradient>' +
        '<linearGradient id="' + id('bake') + '" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0" stop-color="#4d3626"/><stop offset="1" stop-color="#1f150e"/></linearGradient>' +
        '<linearGradient id="' + id('getter') + '" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0" stop-color="#c3ccd2" stop-opacity=".75"/><stop offset="1" stop-color="#7d868c" stop-opacity="0"/></linearGradient>' +
        '<filter id="' + id('bs') + '" x="-80%" y="-30%" width="260%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>' +
        '<filter id="' + id('bm') + '" x="-120%" y="-40%" width="340%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>' +
        '<filter id="' + id('bl') + '" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>';

      /* circuito esterno (sotto la valvola) */
      const gc = s('g', { class: 'storia-circ' }, svg);
      // placca → RL → batteria B (o generatore Vs nel diodo) → massa
      p.wPlate = wire(gc, [cap, [tx, Y_TOP], [xR, Y_TOP], [xR, 36]]);
      sym.resistor(gc, { x: xR, y: 36, rot: 90, len: 64 });
      p.wB = wire(gc, [[xR, 100], [xR, 150]]);
      p.srcPos = s('g', null, gc);
      sym.source(p.srcPos, { x: xR, y: 150, rot: 90, len: 60, kind: 'dc' });
      p.srcNeg = s('g', null, gc);
      sym.source(p.srcNeg, { x: xR, y: 210, rot: 270, len: 60, kind: 'dc' });
      p.srcAC = s('g', null, gc);
      sym.source(p.srcAC, { x: xR, y: 150, rot: 90, len: 60, kind: 'ac' });
      p.wBret = wire(gc, [[xR, 210], [xR, Y_RAIL]]);
      p.wRailR = wire(gc, [[pin(2)[0], Y_RAIL], [xR, Y_RAIL]]);
      p.wK = wire(gc, [pin(2), [pin(2)[0], Y_RAIL]]);
      sym.ground(gc, { x: G.gndX, y: Y_RAIL });
      // griglia: segnale e batteria C in serie (solo nel triodo)
      p.gGridC = s('g', { class: 'storia-fade' }, gc);
      p.wG = wire(p.gGridC, [gExit, [xL, gExit[1]], [xL, 112]]);
      p.sigSym = s('g', { class: 'storia-fade' }, p.gGridC);
      sym.source(p.sigSym, { x: xL, y: 112, rot: 90, len: 60, kind: 'ac' });
      p.wGmid = wire(p.gGridC, [[xL, 172], [xL, 204]]);
      p.biasNeg = s('g', null, p.gGridC);
      sym.source(p.biasNeg, { x: xL, y: 264, rot: 270, len: 60, kind: 'dc' });
      p.biasPos = s('g', null, p.gGridC);
      sym.source(p.biasPos, { x: xL, y: 204, rot: 90, len: 60, kind: 'dc' });
      p.wGret = wire(p.gGridC, [[xL, 264], [xL, Y_RAIL], [pin(2)[0], Y_RAIL]]);
      EI.dot(p.gGridC, pin(2)[0], Y_RAIL);
      // filamento: batteria A e interruttore
      const lx = G.loopX;
      p.wH1 = wire(gc, [pin(0), [pin(0)[0], Y_LOOP[0]], [G.sw[1], Y_LOOP[0]]]);
      p.sw = sym.switch(gc, { x: G.sw[0], y: Y_LOOP[0], len: G.sw[1] - G.sw[0], closed: true });
      p.wHA = wire(gc, [[G.sw[0], Y_LOOP[0]], [lx, Y_LOOP[0]]]);
      sym.source(gc, { x: lx, y: Y_LOOP[0], rot: 90, len: Y_LOOP[1] - Y_LOOP[0], kind: 'dc' });
      p.wH2 = wire(gc, [[lx, Y_LOOP[1]], [pin(1)[0], Y_LOOP[1]], pin(1)]);

      /* etichette */
      const gl = s('g', { class: 'storia-labels' }, svg);
      const rx = G.out ? xR + 22 : xR - 22;
      const ra = G.out ? 'start' : 'end';
      const lxl = G.out ? xL - 22 : xL + 22;
      const la = G.out ? 'end' : 'start';
      p.lRL = nameValue(gl, rx, 63, ra, dyLbl);
      p.lRL.name.textContent = 'RL';
      p.lSrc = nameValue(gl, rx, 177, ra, dyLbl);
      p.gGridL = s('g', { class: 'storia-fade' }, gl);
      p.lSig = nameValue(p.gGridL, lxl, 139, la, dyLbl);
      p.lSig.name.textContent = G.names.sig;
      p.lBias = nameValue(p.gGridL, lxl, 231, la, dyLbl);
      p.lBias.name.textContent = G.names.bias;
      const aMid = (lx + 12 + pin(0)[0]) / 2;
      const tA = s('text', { x: aMid, y: (Y_LOOP[0] + Y_LOOP[1]) / 2 + 5, class: 'storia-lbl', 'text-anchor': 'middle' }, gl);
      s('tspan', { class: 'name', text: G.names.A + ' ' }, tA);
      s('tspan', { class: 'storia-val', text: num(model.HEATER.v, 1) + ' V' }, tA);
      s('text', { x: tx + 16, y: ty + T.capTop + 13, class: 'storia-lbl', text: 'placca' }, gl);
      s('text', { x: G.gLabel[0], y: G.gLabel[1], class: 'storia-lbl storia-fade', 'text-anchor': 'middle', text: 'griglia' }, p.gGridL);
      s('text', { x: pin(2)[0] + 9, y: 360, class: 'storia-lbl', text: 'catodo' }, gl);
      p.tagVp = s('text', { x: G.tagVp[0], y: G.tagVp[1], class: 'storia-tag', 'text-anchor': 'middle' }, gl);
      p.tagVg = s('text', { x: G.tagVg[0], y: G.tagVg[1], class: 'storia-tag', 'text-anchor': 'middle' }, p.gGridL);
      // legenda: elettroni (nel vuoto) e cariche della corrente nei fili
      const lg = s('g', { class: 'storia-legend' }, svg);
      s('circle', { cx: G.leg[0], cy: G.leg[1] - 4, r: 3.4, class: 'ei-e' }, lg);
      s('text', { x: G.leg[0] + 10, y: G.leg[1], class: 'storia-leg', text: G.names.leg[0] }, lg);
      s('circle', { cx: G.leg[0], cy: G.leg[1] + (narrow ? 18 : 16), r: 3, class: 'storia-legdot' }, lg);
      s('text', { x: G.leg[0] + 10, y: G.leg[1] + (narrow ? 22 : 20), class: 'storia-leg', text: G.names.leg[1] }, lg);

      /* la valvola (coordinate locali) */
      const gt = s('g', { class: 'storia-tube', transform: 'translate(' + tx + ' ' + ty + ')' }, svg);
      p.ambient = s('ellipse', { cx: 0, cy: -10, rx: 74, ry: 120, filter: 'url(#' + id('bl') + ')', opacity: 0 }, gt);
      const dome = 'M' + -T.hw + ' ' + T.yGlassBot + 'V' + T.yDome + 'A' + T.hw + ' ' + (T.yDome - T.yApex) + ' 0 0 1 ' + T.hw + ' ' + T.yDome + 'V' + T.yGlassBot;
      s('path', { d: dome + 'Z', class: 'storia-glass', fill: 'url(#' + id('glass') + ')' }, gt);
      s('path', { d: 'M-46 -131A82 66 0 0 1 46 -131Q0 -116 -46 -131Z', fill: 'url(#' + id('getter') + ')' }, gt);
      s('path', { d: 'M-16 94H16L30 112H-30Z', class: 'storia-stem' }, gt);
      s('path', { d: 'M-64 82L-22 106M64 82L22 106M-30 82L-12 104M30 82L12 104M-64 -82V-90M64 -82V-90', class: 'storia-rod' }, gt);
      s('rect', { x: -77, y: T.micaT, width: 154, height: 5, rx: 1.5, class: 'storia-mica' }, gt);
      s('rect', { x: -77, y: T.micaB, width: 154, height: 5, rx: 1.5, class: 'storia-mica' }, gt);
      s('rect', { x: -T.px, y: -T.pe, width: 2 * T.px, height: 2 * T.pe, class: 'storia-back', fill: 'url(#' + id('back') + ')' }, gt);
      p.cloud = s('ellipse', { cx: 0, cy: 0, rx: 22, ry: 70, class: 'storia-cloud', filter: 'url(#' + id('bs') + ')' }, gt);
      p.gfield = [-1, 1].map((sd) => s('rect', { x: sd * T.gx - 5, y: -66, width: 10, height: 132, rx: 5, filter: 'url(#' + id('bs') + ')', opacity: 0 }, gt));
      p.halo = s('ellipse', { cx: 0, cy: 0, rx: 16, ry: 80, filter: 'url(#' + id('bm') + ')', opacity: 0 }, gt);
      p.cath = s('rect', { x: -T.cw, y: -T.ce, width: 2 * T.cw, height: 2 * T.ce, rx: 3, class: 'storia-cath', fill: rgb(METAL) }, gt);
      p.heat = s('path', { d: 'M-2 62V-60Q0 -64 2 -60V62', class: 'storia-heater', stroke: 'none' }, gt);
      s('path', { d: 'M0 -68l-3 -2.4l6 -2.4l-6 -2.4l6 -2.4l-3 -2.4', class: 'storia-rod' }, gt);
      s('path', { d: 'M-2 68L-8 96M2 68L8 96M0 68V96', class: 'storia-lead' }, gt);
      // griglia a zig-zag (solo nel triodo)
      p.gGridT = s('g', { class: 'storia-fade' }, gt);
      s('path', { d: 'M-30 -80V80M30 -80V80', class: 'storia-rod', opacity: 0.55 }, p.gGridT);
      p.zig = [-1, 1].map((sd) => {
        let d = '';
        for (let y = -66, k = 0; y <= 66; y += 5, k++) d += (k ? 'L' : 'M') + (sd * T.gx + (k % 2 ? 3.6 : -3.6)) + ' ' + y;
        return s('path', { d: d, class: 'storia-zig', stroke: '#c9d2d6' }, p.gGridT);
      });
      s('path', { d: 'M-30 -80V' + T.gridY + 'H' + T.gridExitX.toFixed(1), class: 'storia-lead' }, p.gGridT);
      // elettroni e lampi
      p.ge = s('g', { class: 'storia-elec' }, gt);
      p.gf = s('g', { class: 'storia-flashes' }, gt);
      // placca: pareti laterali, faccia colpita dagli elettroni, conduttore verso il cappuccio
      [-1, 1].forEach((sd) => {
        s('rect', { x: sd > 0 ? T.px : -T.px - T.pt, y: -T.pe, width: T.pt, height: 2 * T.pe, rx: 1.5, class: 'storia-plate', fill: 'url(#' + id('metal') + ')' }, gt);
        s('rect', { x: sd * 64 - 2, y: -86, width: 4, height: 16, class: 'storia-plate', fill: 'url(#' + id('metal') + ')' }, gt);
        s('rect', { x: sd * 64 - 2, y: 70, width: 4, height: 14, class: 'storia-plate', fill: 'url(#' + id('metal') + ')' }, gt);
      });
      p.hit = [-1, 1].map((sd) => s('path', { d: 'M' + sd * (T.px - 0.8) + ' -66V66', class: 'storia-hit' }, gt));
      s('path', { d: 'M64 -86V-96Q64 -128 10 -136L0 -144', class: 'storia-lead' }, gt);
      s('rect', { x: -5, y: -146, width: 10, height: 5, rx: 1, fill: 'url(#' + id('metal') + ')' }, gt);
      s('rect', { x: -10, y: T.capTop, width: 20, height: 14, rx: 3, class: 'storia-plate', fill: 'url(#' + id('metal') + ')' }, gt);
      // riflessi sul vetro
      s('path', { d: 'M-70 96V-62Q-66 -104 -38 -126', class: 'storia-shine' }, gt);
      s('path', { d: 'M71 70V-30', class: 'storia-shine thin' }, gt);
      // zoccolo e piedini
      s('rect', { x: -71, y: 106, width: 142, height: 9, rx: 3, fill: 'url(#' + id('bake') + ')' }, gt);
      s('path', { d: 'M-66 114H66L62 ' + T.pinTop + 'H-62Z', fill: 'url(#' + id('bake') + ')' }, gt);
      T.pins.forEach((x) => s('rect', { x: x - 2.5, y: T.pinTop - 1, width: 5, height: T.pinBot - T.pinTop + 1, rx: 1.5, class: 'storia-pin' }, gt));

      /* cariche che scorrono nei fili (verso convenzionale) */
      const ghost = (d) => s('path', { d: d, class: 'ei-wire', style: 'opacity:0' }, gc);
      p.flows = {
        plate: new EI.Flow(gc, ghost('M' + xR + ' 150V' + Y_TOP + 'H' + tx + 'V' + cap[1])),
        ret: new EI.Flow(gc, ghost('M' + pin(2)[0] + ' ' + Y_RAIL + 'H' + xR + 'V210')),
        k: new EI.Flow(gc, ghost('M' + pin(2)[0] + ' ' + pin(2)[1] + 'V' + Y_RAIL)),
        grid: new EI.Flow(p.gGridC, ghost('M' + pin(2)[0] + ' ' + Y_RAIL + 'H' + xL + 'V' + gExit[1] + 'H' + gExit[0])),
        h1: new EI.Flow(gc, ghost('M' + lx + ' ' + Y_LOOP[0] + 'H' + pin(0)[0] + 'V' + pin(0)[1])),
        h2: new EI.Flow(gc, ghost('M' + pin(1)[0] + ' ' + pin(1)[1] + 'V' + Y_LOOP[1] + 'H' + lx)),
      };
      Object.values(p.flows).forEach((f) => f.set(0));

      /* elettroni: una riserva di pallini riutilizzati */
      p.pool = [];
      for (let i = 0; i < 140; i++) {
        const el = s('circle', { r: narrow ? 2.7 : 2.4, class: 'ei-e', cx: 0, cy: 0, style: 'display:none' }, p.ge);
        p.pool.push({ el: el, on: false });
      }
      p.flashes = [];
      for (let i = 0; i < 16; i++) {
        const el = s('circle', { r: 2, class: 'storia-flash', style: 'display:none' }, p.gf);
        p.flashes.push({ el: el, on: false, t: 0 });
      }
      p.acc = { cloud: 0, fly: 0, grid: 0, back: 0 };
      return p;
    }

    /* --- elettroni nella valvola --- */

    function spawn(p) {
      for (const e of p.pool) {
        if (!e.on) {
          e.on = true;
          e.el.style.display = '';
          return e;
        }
      }
      return null;
    }
    function kill(e) {
      e.on = false;
      e.el.style.display = 'none';
    }
    function flash(p, x, y, color) {
      const f = p.flashes.find((q) => !q.on);
      if (!f) return;
      f.on = true;
      f.t = 0;
      f.el.style.display = '';
      f.el.setAttribute('cx', x.toFixed(1));
      f.el.setAttribute('cy', y.toFixed(1));
      f.el.style.stroke = color;
    }
    function place(e) {
      e.el.setAttribute('cx', (e.side * (TUBE.cw + 0.5 + e.d)).toFixed(1));
      e.el.setAttribute('cy', e.y.toFixed(1));
    }

    // Parametri dello sciame a partire dallo stato elettrico.
    function swarmParams() {
      const T = TUBE;
      const emN = clamp01(st.em / IS);
      const ik = st.ip + st.ig;
      const sat = st.em > 0 ? clamp01(ik / st.em) : 0;
      const gap = T.gx - T.cw - 4; // spazio tra catodo e griglia
      let rc = 4 + 18 * Math.sqrt(emN);
      let rBack = 0;
      let dBack = 0;
      const supply = st.mode === 'diodo' ? st.vsi : st.B;
      if (st.mode === 'diodo' && st.vsi < -0.5) {
        rc = 3 + 7 * Math.sqrt(emN) * (1 - 0.6 * clamp01(-st.vsi / 60));
        rBack = 14 * emN;
        dBack = rc + 6;
      }
      if (st.mode === 'triodo') {
        if (st.vgi < 0) rc = Math.min(rc, gap * (1 - 0.45 * clamp01(-st.vgi / 12)));
        else rc = Math.min(rc, gap);
        if (st.vgi < 0 && supply > 0) {
          const open = st.ip / (st.ip + 4e-4);
          rBack = 16 * emN * (1 - 0.8 * open);
          dBack = gap;
        }
      }
      const vpPos = Math.max(0, st.vp);
      return {
        emN: emN, rc: rc,
        nCloud: Math.round(46 * Math.pow(emN, 0.6) * (1 - 0.75 * sat)),
        rFly: st.ip > 2e-7 ? 75 * Math.pow(st.ip / IREF, 0.6) : 0,
        rGrid: st.ig > 2e-7 ? 75 * Math.pow(st.ig / IREF, 0.6) : 0,
        rBack: rBack, dBack: dBack,
        vMax: 50 + 190 * Math.sqrt(Math.min(vpPos, 300) / 250),
        reach: T.px - T.cw - 1.5,
      };
    }

    function stepSwarm(p, dt, F) {
      const T = TUBE;
      const A = p.acc;
      let nCloud = 0;
      const clouds = [];
      for (const e of p.pool) if (e.on && e.mode === 'cloud') { nCloud++; clouds.push(e); }
      // nuvola: gli elettroni escono, restano sospesi un poco e ricadono
      A.cloud += dt * F.nCloud / 1.1;
      while (A.cloud >= 1) {
        A.cloud -= 1;
        if (nCloud >= F.nCloud) continue;
        const e = spawn(p);
        if (!e) break;
        Object.assign(e, { mode: 'cloud', side: Math.random() < 0.5 ? -1 : 1, d: 0, y: rnd(-T.act, T.act), age: 0, life: rnd(0.7, 1.6), h: rnd(0.35, 1) * F.rc, vy: rnd(-8, 8) });
        nCloud++;
      }
      const launch = (mode) => {
        let e = null;
        if (clouds.length && Math.random() < 0.75) {
          e = clouds.splice(Math.floor(Math.random() * clouds.length), 1)[0];
        } else {
          e = spawn(p);
          if (!e) return;
          e.side = Math.random() < 0.5 ? -1 : 1;
          e.d = 0;
          e.y = rnd(-T.act, T.act);
        }
        e.mode = mode;
        e.age = 0;
        e.vy = rnd(-6, 6);
        if (mode === 'grid') {
          const k = Math.round((e.y + 66) / 5);
          e.gy = -66 + 5 * EI.clamp(k, 0, 26);
        }
        if (mode === 'back') {
          e.life = rnd(0.45, 0.8);
          e.h = F.dBack * rnd(0.7, 1);
          e.d0 = e.d;
        }
      };
      A.fly += dt * F.rFly;
      while (A.fly >= 1) { A.fly -= 1; launch('fly'); }
      A.grid += dt * F.rGrid;
      while (A.grid >= 1) { A.grid -= 1; launch('grid'); }
      A.back += dt * F.rBack;
      while (A.back >= 1) { A.back -= 1; launch('back'); }

      const gridD = T.gx - T.cw - 0.5;
      for (const e of p.pool) {
        if (!e.on) continue;
        e.age += dt;
        if (e.mode === 'cloud') {
          if (e.h > F.rc) e.h = EI.approach(e.h, F.rc, dt, 5);
          const ph = clamp01(e.age / e.life);
          e.d = e.h * Math.pow(Math.sin(Math.PI * ph), 0.6);
          e.vy += rnd(-60, 60) * dt;
          e.vy *= Math.exp(-2 * dt);
          e.y = EI.clamp(e.y + e.vy * dt, -T.act, T.act);
          if (e.age >= e.life) { kill(e); continue; }
        } else if (e.mode === 'fly' || e.mode === 'grid') {
          const f = clamp01(e.d / F.reach);
          const v = 22 + (F.vMax - 22) * Math.pow(f, 0.67);
          e.d += v * dt;
          if (e.mode === 'grid') {
            e.y += (e.gy - e.y) * Math.min(1, dt * 9);
            if (e.d >= gridD - 1) {
              flash(p, e.side * T.gx, e.gy, EI.palette().t1);
              kill(e);
              continue;
            }
          } else {
            e.vy *= Math.exp(-3 * dt);
            e.y = EI.clamp(e.y + e.vy * dt, -T.act, T.act);
            if (e.d >= F.reach) {
              if (Math.random() < 0.3) flash(p, e.side * (T.px - 1.5), e.y, EI.palette().t3);
              kill(e);
              continue;
            }
          }
        } else if (e.mode === 'back') {
          const ph = clamp01(e.age / e.life);
          e.d = e.d0 + (e.h - e.d0) * Math.sin(Math.PI * ph);
          e.y = EI.clamp(e.y + e.vy * dt, -T.act, T.act);
          if (e.age >= e.life) { kill(e); continue; }
        }
        place(e);
      }
      for (const f of p.flashes) {
        if (!f.on) continue;
        f.t += dt;
        const k = f.t / 0.32;
        if (k >= 1) { f.on = false; f.el.style.display = 'none'; continue; }
        f.el.setAttribute('r', (1.5 + 6 * k).toFixed(2));
        f.el.style.opacity = (0.9 * (1 - k)).toFixed(2);
      }
    }

    // Movimento ridotto: niente animazione, gli elettroni sono disegnati fermi, in quantità proporzionale.
    function staticSwarm(p, F) {
      const T = TUBE;
      const r = seeded(20240517);
      p.pool.forEach(kill);
      p.flashes.forEach((f) => { f.on = false; f.el.style.display = 'none'; });
      const put = (side, d, y) => {
        const e = spawn(p);
        if (!e) return;
        Object.assign(e, { mode: 'static', side: side, d: d, y: y });
        place(e);
      };
      for (let i = 0; i < F.nCloud; i++) put(i % 2 ? 1 : -1, F.rc * Math.sqrt(r()), (r() * 2 - 1) * T.act);
      const nf = Math.round(F.rFly * 0.42);
      for (let i = 0; i < nf; i++) {
        const f = (Math.floor(i / 2) + 0.5) / Math.ceil(nf / 2);
        put(i % 2 ? 1 : -1, F.rc + (F.reach - F.rc) * f, (r() * 2 - 1) * T.act);
      }
      const ng = Math.round(F.rGrid * 0.3);
      for (let i = 0; i < ng; i++) {
        const y = -66 + 5 * Math.floor(r() * 27);
        put(i % 2 ? 1 : -1, T.gx - T.cw - 4 - 3 * r(), y);
      }
      const nb2 = Math.round(F.rBack * 0.5);
      for (let i = 0; i < nb2; i++) put(i % 2 ? 1 : -1, F.dBack * (0.75 + 0.2 * r()), (r() * 2 - 1) * T.act);
    }

    /* --- strumenti, grafici e comandi --- */

    const rIp = lab.readout({ label: 'Corrente Ip', color: 'var(--trace-3)', max: IREF, fmt: fmtI });
    const rVp = lab.readout({ label: 'Placca Vp', color: 'var(--trace-1)', fmt: fmtV });
    const rX = lab.readout({ label: 'Griglia Vg', color: 'var(--trace-4)' });
    const rY = lab.readout({ label: 'Guadagno', color: 'var(--trace-2)' });
    const rH = lab.readout({ label: 'Filamento', color: '#ff9f5a', max: 2, fmt: (v) => num(v, 2) + ' W' });
    const rK = lab.readout({ label: 'Catodo', color: '#ffb066' });
    const setLabel = (r, txt) => {
      const l = r.el.querySelector('.ei-readout-label');
      if (l.textContent !== txt) l.textContent = txt;
    };

    const P0 = EI.palette();
    const scope = lab.plot({
      title: 'Oscilloscopio', height: 200,
      x: { min: -T_WIN, max: 0, unit: 's', fmt: (v) => (Math.abs(v) < 1e-9 ? 'ora' : '−' + num(Math.abs(v), 0) + ' s') },
      y: { min: -160, max: 160, unit: 'V', count: 4 },
      legend: [],
      aria: 'Oscilloscopio: le tensioni della valvola negli ultimi secondi',
    });
    const charac = lab.plot({
      title: 'Caratteristica', height: 200,
      x: { min: -160, max: 160, unit: 'V' },
      y: { min: 0, max: 0.01, unit: 'A', count: 4 },
      legend: [],
      aria: 'Caratteristica corrente-tensione della valvola con il punto di lavoro',
    });
    lab.plotsEl.classList.add('cols-2');
    const setTitle = (pl, txt) => {
      const t = pl.figure.querySelector('.ei-plot-title');
      if (t && t.textContent !== txt) t.textContent = txt;
    };

    const g0 = lab.group();
    lab.choice({
      into: g0, label: 'Valvola', value: 'diodo',
      options: [{ value: 'diodo', label: 'Diodo di Fleming (1904)' }, { value: 'triodo', label: 'Triodo di De Forest (1906)' }],
      onChange: (v) => { st.mode = v; buf.length = 0; layout(); },
    });
    lab.toggle({
      into: g0, label: 'Filamento', on: 'Filamento acceso', off: 'Filamento spento', value: true,
      onChange: (v) => { st.heater = v; if (reduced) st.warm = v ? 1 : 0; },
    });
    const gD = lab.group('Placca del diodo');
    lab.choice({
      into: gD, label: 'Tensione di placca', value: 'dc',
      options: [{ value: 'dc', label: 'Continua' }, { value: 'ac', label: 'Alternata ~' }],
      onChange: (v) => { st.ac = v === 'ac'; buf.length = 0; layout(); },
    });
    const sVs = lab.slider({ into: gD, label: 'Batteria di placca Vs', min: -50, max: 150, step: 5, value: 100, fmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), 0) + ' V', onInput: (v) => { st.vs = v; } });
    const sVac = lab.slider({ into: gD, label: 'Ampiezza alternata', min: 20, max: 150, step: 5, value: 100, fmt: (v) => '±' + num(v, 0) + ' V', onInput: (v) => { st.vac = v; } });
    const gT = lab.group('Triodo');
    lab.slider({ into: gT, label: 'Batteria B (B+)', min: 0, max: 300, step: 10, value: 250, fmt: (v) => num(v, 0) + ' V', onInput: (v) => { st.B = v; } });
    lab.slider({ into: gT, label: 'Carico RL', min: 10000, max: 100000, series: 'E12', value: 22000, unit: 'Ω', onInput: (v) => { st.RL = v; } });
    lab.slider({ into: gT, label: 'Griglia Vg (batteria C)', min: -12, max: 2, step: 0.1, value: -4, fmt: sv1, onInput: (v) => { st.vg = v; } });
    lab.toggle({ into: gT, label: 'Segnale sulla griglia', on: 'Acceso', off: 'Spento', value: false, onChange: (v) => { st.sig = v; } });
    lab.slider({ into: gT, label: 'Ampiezza del segnale', min: 0, max: 2, step: 0.05, value: 1, fmt: (v) => '±' + num(v, 2) + ' V', onInput: (v) => { st.amp = v; } });

    const checks = {
      edison: (q) => q.edison,
      inversa: (q) => q.mode === 'diodo' && !q.ac && q.vs <= -10 && q.warm >= 0.95 && q.ip === 0,
      interdizione: (q) => q.mode === 'triodo' && Math.abs(q.B - 200) < 1 && q.warm >= 0.95 && (!q.sig || q.amp === 0) && q.ip < 5e-6 && q.vg >= -10.55,
      guadagno: (q) => q.mode === 'triodo' && q.sig && q.amp >= 0.2 && q.warm >= 0.95 && q.gainMeas >= 10,
      griglia: (q) => q.mode === 'triodo' && q.warm >= 0.95 && q.ig >= 5e-5,
    };
    lab.challenges(CHALLENGES.map((c) => ({ id: c.id, text: c.text, check: checks[c.id] })));

    // figure storiche sotto il banco
    const figs = EI.h('div', { class: 'storia-figs' }, figureEl(FIGURES[0], figFleming()), figureEl(FIGURES[1], figSymbols()));
    container.append(figs);

    function layout() {
      const tri = st.mode === 'triodo';
      gD.hidden = tri;
      gT.hidden = !tri;
      sVs.el.hidden = st.ac;
      sVac.el.hidden = !st.ac;
      if (parts) {
        parts.gGridT.classList.toggle('storia-hide', !tri);
        parts.gGridC.classList.toggle('storia-hide', !tri);
        parts.gGridL.classList.toggle('storia-hide', !tri);
        parts.last = {};
      }
      setLabel(rX, tri ? 'Griglia Vg' : 'Tensione su RL');
      rX.el.style.setProperty('--rc', tri ? 'var(--trace-4)' : 'var(--trace-1)');
      setLabel(rY, tri ? 'Guadagno' : 'La valvola');
      setTitle(scope, tri ? 'Oscilloscopio · ingresso e uscita' : 'Oscilloscopio · al rallentatore');
      setTitle(charac, tri ? 'Caratteristiche di placca' : 'Caratteristica del diodo');
      scope.setLegend(tri
        ? [{ label: 'segnale sulla griglia', color: 'var(--trace-4)' }, { label: 'uscita sulla placca', color: 'var(--trace-1)' }]
        : [{ label: 'Vs applicata', color: 'var(--trace-2)' }, { label: 'tensione su RL', color: 'var(--trace-1)' }]);
      charac.setLegend(tri
        ? [{ label: 'Vg scelta', color: 'var(--trace-4)' }, { label: 'altre Vg', color: '#5f746d' }, { label: 'retta di carico', color: 'var(--trace-2)' }]
        : [{ label: 'legge dei 3/2', color: 'var(--trace-3)' }, { label: 'retta di carico', color: 'var(--trace-2)' }]);
      scope.opts.y.label = tri ? 'variazioni attorno al riposo' : '';
      if (tri) charac.setRange('x', 0, 320);
      else charac.setRange('x', -160, 160);
      lab.plots.forEach((pl) => pl.resize());
      lab.invalidate();
    }

    function ensureGeometry() {
      const key = mq && mq.matches ? 'narrow' : 'wide';
      if (key === geomKey && parts) return;
      geomKey = key;
      parts = draw(GEOM[key]);
      layout();
    }
    const onMq = () => { ensureGeometry(); lab.invalidate(); };
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
      lab.onDestroy(() => {
        if (mq.removeEventListener) mq.removeEventListener('change', onMq);
        else if (mq.removeListener) mq.removeListener(onMq);
      });
    }
    lab.onDestroy(() => figs.remove());

    lab.onReset(() => {
      st.warm = reduced ? 1 : 0;
      st.phase = 0;
      st.edisonArmed = false;
      st.edison = false;
      buf.length = 0;
      if (parts) {
        parts.pool.forEach(kill);
        parts.acc = { cloud: 0, fly: 0, grid: 0, back: 0 };
      }
      layout();
    });

    /* --- calcolo dello stato --- */

    function compute(phase) {
      st.T = model.temperature(st.warm);
      st.em = model.emission(st.warm);
      if (st.mode === 'diodo') {
        st.vsi = st.ac ? st.vac * Math.sin(phase) : st.vs;
        const op = model.diodeOP(st.vsi, st.warm, model.RL_DIODE);
        st.vp = op.vp;
        st.ip = op.ip;
        st.ig = 0;
        st.vgi = 0;
        st.sw = null;
      } else {
        st.vgi = st.vg + (st.sig ? st.amp * Math.sin(phase) : 0);
        const op = model.triodeOP(st.B, st.vgi, st.warm, st.RL);
        st.vp = op.vp;
        st.ip = op.ip;
        st.ig = op.ig;
        st.sw = model.swing(st.B, st.vg, st.sig ? st.amp : 0, st.warm, st.RL);
        st.gainMeas = st.sw.gain;
      }
      // l'esperimento di Edison: corrente vista con il filamento acceso e la placca ad almeno +95 V, poi filamento spento
      const plateDC = st.mode === 'diodo' ? (st.ac ? -1 : st.vs) : st.B;
      if (plateDC < 95) st.edisonArmed = false;
      else if (st.heater && st.ip > 5e-4) st.edisonArmed = true;
      if (st.edisonArmed && !st.heater && st.ip < 1e-6) st.edison = true;
    }

    /* --- disegno a ogni fotogramma --- */

    function paint(dt) {
      const p = parts;
      const P = EI.palette();
      const L = p.last;
      const tri = st.mode === 'triodo';
      const T = TUBE;

      // catodo che si scalda: dal grigio al rosso scuro, poi arancione
      const k = clamp01((st.T - 620) / (model.T_HOT - 620));
      const kKey = Math.round(st.T);
      if (L.T !== kKey) {
        L.T = kKey;
        const gc = glowRGB(st.T);
        p.cath.setAttribute('fill', rgb(mixRGB(METAL, gc, clamp01((st.T - 600) / 260))));
        p.heat.setAttribute('stroke', k > 0.02 ? rgb(mixRGB(gc, [255, 236, 190], 0.55)) : 'none');
        p.heat.style.opacity = Math.min(1, k * 1.4).toFixed(2);
        p.halo.setAttribute('fill', rgb(gc));
        p.halo.setAttribute('opacity', (0.95 * Math.pow(k, 1.2)).toFixed(3));
        p.ambient.setAttribute('fill', rgb(gc));
        p.ambient.setAttribute('opacity', (0.2 * k * k).toFixed(3));
      }

      // fili colorati con la tensione del nodo
      const vmax = tri ? 300 : 150;
      const supply = tri ? st.B : st.vsi;
      const col = (w, v, m) => { w.style.stroke = EI.vcolor(v, m); };
      col(p.wPlate, st.vp, vmax);
      col(p.wB, supply, vmax);
      [p.wBret, p.wRailR, p.wK, p.wGret, p.wH2].forEach((w) => col(w, 0, 1));
      col(p.wG, st.vgi, 12);
      col(p.wGmid, st.vg, 12);
      col(p.wHA, model.HEATER.v, model.HEATER.v);
      col(p.wH1, st.heater ? model.HEATER.v : 0, model.HEATER.v);
      p.sw.set(st.heater);

      // simboli e valori dei generatori
      const srcMode = tri ? 'pos' : st.ac ? 'ac' : st.vs < 0 ? 'neg' : 'pos';
      if (L.src !== srcMode) {
        L.src = srcMode;
        p.srcPos.style.display = srcMode === 'pos' ? '' : 'none';
        p.srcNeg.style.display = srcMode === 'neg' ? '' : 'none';
        p.srcAC.style.display = srcMode === 'ac' ? '' : 'none';
      }
      const biasNeg = st.vg <= 0;
      p.biasNeg.style.display = biasNeg ? '' : 'none';
      p.biasPos.style.display = biasNeg ? 'none' : '';
      p.sigSym.classList.toggle('storia-off', !st.sig || st.amp === 0);
      p.lRL.value.textContent = si(tri ? st.RL : model.RL_DIODE, 'Ω', { trim: true });
      p.lSrc.name.textContent = tri ? p.G.names.B : st.ac ? 'Vs ~' : p.G.names.Vs;
      p.lSrc.value.textContent = tri ? num(st.B, 0) + ' V' : st.ac ? '±' + num(st.vac, 0) + ' V' : (st.vs > 0 ? '+' : st.vs < 0 ? '−' : '') + num(Math.abs(st.vs), 0) + ' V';
      p.lSig.value.textContent = st.sig && st.amp > 0 ? '±' + num(st.amp, 2) + ' V' : 'spento';
      p.lBias.value.textContent = sv1(st.vg);
      p.tagVp.textContent = 'Vp = ' + fmtV(st.vp);
      p.tagVp.style.fill = P.t1;
      p.tagVg.textContent = 'Vg = ' + sv1(st.vgi);
      p.tagVg.style.fill = P.t4;

      // cariche nei fili (verso convenzionale): placca, catodo, griglia, filamento
      const sp = EI.speedFor(st.ip, IREF);
      p.flows.plate.set(sp);
      p.flows.ret.set(sp);
      p.flows.k.set(EI.speedFor(st.ip + st.ig, IREF));
      p.flows.grid.set(tri ? EI.speedFor(st.ig, 0.002) : 0);
      const sh = st.heater ? EI.speedFor(model.HEATER.i, 0.6) : 0;
      p.flows.h1.set(sh);
      p.flows.h2.set(sh);
      Object.values(p.flows).forEach((f) => f.step(dt));

      // griglia: colore e "campo" (rosa se respinge, verde se attira)
      if (tri) {
        const a = clamp01(Math.abs(st.vgi) / (st.vgi < 0 ? 12 : 3));
        const gcol = st.vgi < 0 ? P.t4 : P.t1;
        p.gfield.forEach((r) => {
          r.setAttribute('fill', gcol);
          r.setAttribute('opacity', (0.5 * Math.pow(a, 0.7)).toFixed(3));
        });
        const zc = EI.mix('#c9d2d6', st.vgi < 0 ? P.t4 : P.t1, Math.min(0.75, a));
        p.zig.forEach((z) => z.setAttribute('stroke', zc));
      }

      // elettroni
      const F = swarmParams();
      if (reduced || !dt) {
        if (reduced) staticSwarm(p, F);
      } else stepSwarm(p, dt, F);
      let live = 0;
      for (const e of p.pool) if (e.on && (e.mode === 'cloud' || e.mode === 'static')) live++;
      p.cloud.setAttribute('rx', (T.cw + 4 + F.rc).toFixed(1));
      p.cloud.style.opacity = (0.32 * clamp01(live / 40) * (F.emN > 0.01 ? 1 : 0)).toFixed(3);
      const hit = Math.pow(clamp01(st.ip / 0.008), 0.5) * 0.9;
      p.hit.forEach((h) => { h.style.opacity = hit.toFixed(3); });
    }

    function paintReadouts() {
      const tri = st.mode === 'triodo';
      rIp.set(st.ip);
      rVp.set(st.vp);
      if (tri) {
        rX.text(sv1(st.vgi));
        rX.state(st.vgi > 0 ? 'warn' : '');
        const cold = st.warm < 0.9 || !(st.sw && st.sw.q.ip > 1e-6);
        rY.text(cold ? '—' : num(st.gainMeas, 1) + '×');
        rY.state(!cold && st.gainMeas >= 10 ? 'ok' : '');
      } else {
        rX.text(fmtV(st.ip * model.RL_DIODE));
        rX.state('');
        let w = 'spenta';
        if (st.em > 1e-6) w = st.ac ? 'raddrizza' : st.vs > 0 ? 'conduce' : st.vs < 0 ? 'blocca' : 'a riposo';
        rY.text(w);
        rY.state(w === 'raddrizza' ? 'ok' : '');
      }
      rH.set(st.heater ? HEATER_W : 0);
      rK.text(degC(st.T));
      const kState = st.warm >= 0.97 ? 'caldo' : st.warm < 0.03 ? 'freddo' : st.heater ? 'si scalda' : 'si raffredda';
      setLabel(rK, 'Catodo · ' + kState);
      rK.state(kState === 'caldo' ? 'ok' : kState === 'freddo' ? '' : 'warn');
    }

    function pushSample() {
      const tri = st.mode === 'triodo';
      buf.push([lab.t, tri ? st.vgi - st.vg : st.vsi, tri ? st.vp - st.sw.q.vp : st.ip * model.RL_DIODE]);
      while (buf.length && buf[0][0] < lab.t - T_WIN - 0.3) buf.shift();
      if (buf.length > 1400) for (let i = buf.length - 2; i > 0; i -= 2) buf.splice(i, 1);
    }

    function paintScope() {
      const P = EI.palette();
      const tri = st.mode === 'triodo';
      let R = 160;
      if (tri) {
        const q = st.sw.q.vp;
        R = niceUp(1.15 * Math.max(Math.abs(st.sw.hi.vp - q), Math.abs(st.sw.lo.vp - q), st.sig ? st.amp : 0, 2));
      }
      scope.setRange('y', -R, R);
      scope.clear();
      let a;
      let b;
      if (reduced) {
        // fermo immagine: la forma d'onda completa degli ultimi secondi, calcolata con i valori attuali
        const ph = (t) => Math.PI / 2 + OMEGA * t;
        if (tri) {
          const on = st.sig && st.amp > 0;
          a = (t) => (on ? st.amp * Math.sin(ph(t)) : 0);
          b = (t) => (on ? model.triodeOP(st.B, st.vg + st.amp * Math.sin(ph(t)), st.warm, st.RL).vp - st.sw.q.vp : 0);
        } else {
          a = (t) => (st.ac ? st.vac * Math.sin(ph(t)) : st.vs);
          b = (t) => model.diodeOP(st.ac ? st.vac * Math.sin(ph(t)) : st.vs, st.warm).ip * model.RL_DIODE;
        }
      } else {
        a = buf.map((q) => [q[0] - lab.t, q[1]]);
        b = buf.map((q) => [q[0] - lab.t, q[2]]);
      }
      if (tri) {
        scope.line(b, { color: P.t1, width: 2.4, fill: P.t1, fillAlpha: 0.08, samples: 240 });
        scope.line(a, { color: P.t4, width: 2.4, samples: 240 });
        if (!st.sig || st.amp === 0) scope.tag(scope.px0 + 8, (scope.py0 + scope.py1) / 2 - 22, 'segnale spento', P.text, 'right');
      } else {
        scope.line(a, { color: P.t2, width: 2, samples: 240 });
        scope.line(b, { color: P.t1, width: 2.6, fill: P.t1, fillAlpha: 0.1, samples: 240 });
      }
    }

    function paintCharac() {
      const P = EI.palette();
      const c = charac;
      const ctx = c.ctx;
      if (st.mode === 'triodo') {
        const ymax = Math.min(0.03, Math.max(0.005, niceUp(1.15 * st.B / st.RL)));
        c.setRange('y', 0, ymax);
        c.clear();
        const label = (vgk, color) => {
          let x = 320;
          let y = model.triode(vgk, 320, st.warm).ip;
          if (y > ymax * 0.94) {
            let lo = 0;
            let hi = 320;
            for (let i = 0; i < 40; i++) {
              const mid = (lo + hi) / 2;
              if (model.triode(vgk, mid, st.warm).ip > ymax * 0.94) hi = mid; else lo = mid;
            }
            x = lo;
            y = ymax * 0.94;
          }
          if (y < ymax * 0.03) return;
          ctx.save();
          ctx.font = '700 10px ui-monospace, Menlo, Consolas, monospace';
          ctx.fillStyle = color;
          ctx.textAlign = x >= 319 ? 'right' : 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText((vgk === 0 ? '0' : '−' + num(Math.abs(vgk), Number.isInteger(vgk) ? 0 : 1)) + (x >= 319 ? ' V' : ''), c.X(x) - (x >= 319 ? 4 : 0), c.Y(y) - 3);
          ctx.restore();
        };
        for (const vgk of VG_FAMILY) {
          c.line((v) => model.triode(vgk, v, st.warm).ip, { color: '#5f746d', width: 1.3, glow: false, alpha: 0.9 });
          if (Math.abs(vgk - st.vg) > 0.6) label(vgk, '#7f958d');
        }
        if (st.sig && st.amp > 0) {
          [st.vg - st.amp, st.vg + st.amp].forEach((v) => c.line((x) => model.triode(v, x, st.warm).ip, { color: P.t4, width: 1, glow: false, alpha: 0.45, dash: [3, 4] }));
        }
        c.line((v) => model.triode(st.vg, v, st.warm).ip, { color: P.t4, width: 2.4 });
        label(st.vg, P.t4);
        c.line([[0, st.B / st.RL], [st.B, 0]], { color: P.t2, width: 1.6, glow: false, dash: [6, 5] });
        const sw = st.sw;
        if (st.sig && st.amp > 0) c.line([[sw.hi.vp, sw.hi.ip], [sw.lo.vp, sw.lo.ip]], { color: P.t2, width: 6, alpha: 0.4, glow: false });
        c.point(sw.q.vp, sw.q.ip, { color: P.t2, r: 3.5, ring: false, label: 'Q', labelPos: 'up' });
        c.point(st.vp, st.ip, { color: P.t3, r: 5 });
      } else {
        c.setRange('y', 0, 0.01);
        c.clear();
        c.vline(0, { color: P.text, alpha: 0.35, dash: [2, 4] });
        const em = model.emission(st.warm);
        if (em > 1e-4 && em < 0.0095) c.hline(em, { color: P.t3, alpha: 0.6, label: 'saturazione', at: 'left' });
        c.line((v) => model.diode(v, st.warm), { color: P.t3, width: 2.4, fill: P.t3, fillAlpha: 0.08 });
        const vs = st.vsi;
        if (vs > 0) c.line([[0, vs / model.RL_DIODE], [vs, 0]], { color: P.t2, width: 1.6, glow: false, dash: [6, 5] });
        c.point(st.vp, st.ip, { color: P.t2, r: 5, label: fmtI(st.ip), labelPos: st.vp > 60 ? 'left' : 'right' });
      }
    }

    /* --- la spiegazione: cambia con lo stato e racconta la storia --- */

    function explainText() {
      const tri = st.mode === 'triodo';
      const Tk = degC(model.T_HOT);
      if (st.warm < 0.03 && !st.heater) {
        return 'Il filamento è spento e il catodo è freddo: i suoi elettroni restano chiusi nel metallo, nessuno ha l\'energia per saltare nel vuoto. Qualunque tensione metti ' + (tri ? 'su placca e griglia' : 'sulla placca') + ', la corrente è zero: è quello che vide Edison nel 1883, la corrente attraverso il vuoto c\'è solo con il filamento caldo. Tenerlo acceso costa ' + num(model.HEATER.v, 1) + ' V × ' + num(model.HEATER.i, 1) + ' A ≈ ' + num(HEATER_W, 1) + ' W per ogni valvola: energia che un transistor non chiede.';
      }
      if (!st.heater) {
        return 'Filamento spento: il catodo si raffredda e l\'emissione crolla molto prima che il rosso sparisca, perché dipende dalla temperatura in modo esponenziale (legge di Richardson). Gli ultimi elettroni ricadono e la corrente si ferma.';
      }
      if (st.warm < 0.95) {
        if (st.em < 1e-4) return 'Il filamento si scalda: prima rosso scuro, poi arancione, verso i ' + Tk + ' di un catodo a ossidi. Finché è soltanto tiepido non esce quasi niente: per saltare fuori dal metallo un elettrone deve vincere il lavoro di estrazione, e solo i più agitati ci riescono.';
        return 'Il catodo è quasi a regime: gli elettroni più agitati saltano fuori dal metallo, è l\'emissione termoionica. Per ora ne escono pochi e la placca se li prende quasi tutti: la corrente è limitata dalla temperatura del catodo, non dalla tensione (saturazione).';
      }
      if (!tri) {
        if (st.ac) {
          const pk = model.diodeOP(st.vac, st.warm).ip;
          return 'Tensione alternata, al rallentatore (il segnale radio vero oscillava centinaia di migliaia di volte al secondo). Nella semionda positiva la placca attira gli elettroni e la corrente passa, fino a <b>' + fmtI(pk) + '</b>; in quella negativa li respinge e la corrente si ferma. Su RL restano solo le semionde positive: la valvola raddrizza. Fleming la usò così nel 1904, perché l\'ago di un galvanometro potesse seguire le oscillazioni della radio.';
        }
        if (st.vs < 0) return 'La placca è a <b>' + sv1(st.vs).replace(',0', '') + '</b>: negativa, respinge gli elettroni, che ricadono sul catodo. Restano schiacciati in una nuvola sottile attorno al filamento e la corrente è <b>zero</b>. È il senso unico che Fleming cercava: per questo la chiamò valvola, come quella che lascia passare l\'acqua in un verso solo.';
        if (st.vs === 0) return 'Placca a 0 V: gli elettroni escono dal catodo caldo ma, senza un richiamo, ricadono. Attorno al catodo resta una nuvola di elettroni, la <b>carica spaziale</b>: con la sua carica negativa respinge quelli che escono dopo. Dai tensione alla placca e guarda la nuvola svuotarsi verso di lei.';
        return 'La placca, positiva, attira gli elettroni della nuvola: attraversano il vuoto e la colpiscono, e nel circuito passano <b>' + fmtI(st.ip) + '</b>. Non partono tutti quelli emessi: la carica spaziale frena gli altri, e la corrente cresce con la potenza 3/2 della tensione sulla valvola (legge di Child-Langmuir): con il doppio dei volt, 2,8 volte la corrente. Sulla valvola restano <b>' + fmtV(st.vp) + '</b>, il resto cade su RL.';
      }
      const sw = st.sw;
      const q = sw.q;
      const cut = model.cutoff(st.B);
      if (st.B <= 0) {
        return 'Batteria B a zero: la placca non attira niente. Gli elettroni formano la nuvola di carica spaziale attorno al catodo e ricadono' + (st.vg > 0 ? '; solo la griglia positiva ne cattura qualcuno.' : '.') + ' Dai tensione alla placca con la batteria B.';
      }
      const vgTop = st.vg + (st.sig ? st.amp : 0);
      if (vgTop > 0) {
        const igPk = model.triodeOP(st.B, vgTop, st.warm, st.RL).ig;
        return 'Griglia positiva' + (st.vg > 0 ? '' : ' nei picchi del segnale') + ': ora attira gli elettroni come una piccola placca e alcuni ci finiscono sopra (i lampi verdi), è la <b>corrente di griglia</b>, fino a ' + fmtI(igPk) + '. Il segnale non comanda più «gratis», senza assorbire corrente, e l\'onda in uscita si deforma: è distorsione. Per questo la griglia si tiene negativa, con la batteria C.';
      }
      if (q.ip < 1e-6) {
        return '<b>Interdizione</b>: la griglia a ' + sv1(st.vg) + ' respinge tutti gli elettroni. La placca li chiama, ma è molto più lontana dal catodo: conta μ = ' + MU + ' volte meno della griglia. La corrente si spegne quando Vg scende sotto −Vp/μ, cioè sotto <b>' + sv1(cut) + '</b> con la placca a ' + num(st.B, 0) + ' V.';
      }
      if (q.ip > 0.9 * st.em) return 'Il catodo non ce la fa: la placca chiede più elettroni di quanti il filamento ne emetta, e la corrente si ferma a ' + fmtI(q.ip) + '. È la <b>saturazione</b>: per avere di più servirebbe un catodo più caldo o più grande.';
      if (st.sig && st.amp > 0) {
        if (sw.hi.ip < 2e-6) return 'Il segnale porta la griglia oltre l\'interdizione (' + sv1(cut) + '): nei picchi negativi la corrente si spegne e l\'onda in uscita resta tagliata. Riduci il segnale o rendi la griglia meno negativa.';
        const rp = model.rp(st.vg, q.vp);
        return 'La griglia oscilla di ±' + num(st.amp, 2) + ' V e la corrente di placca la segue: ogni volt in più sulla griglia vale ' + num(model.gm(st.vg, q.vp) * 1000, 1) + ' mA. Passando in RL, la variazione diventa una tensione <b>' + num(st.gainMeas, 1) + ' volte</b> più grande e capovolta: quando la griglia sale, la corrente cresce e la placca scende. Il conto: μ·RL/(RL + rp) = ' + MU + ' · ' + si(st.RL, 'Ω', { trim: true }) + '/(' + si(st.RL, 'Ω', { trim: true }) + ' + ' + si(rp, 'Ω', { sig: 2 }) + ').';
      }
      return 'La griglia, a ' + sv1(st.vg) + ', sta molto più vicina al catodo della placca: per gli elettroni un volt sulla griglia conta quanto μ = ' + MU + ' volt sulla placca. Dosando quanti ne passano, fissa la corrente: <b>' + fmtI(q.ip) + '</b>, con la placca a <b>' + fmtV(q.vp) + '</b> (il punto Q sulla [[retta-di-carico]]). Accendi il segnale per vedere il triodo amplificare.';
    }

    /* --- ciclo --- */

    ensureGeometry();
    lab.loop((dt) => {
      if (!parts) return;
      if (reduced) st.warm = st.heater ? 1 : 0;
      else if (dt > 0) {
        st.warm = EI.approach(st.warm, st.heater ? 1 : 0, dt, st.heater ? 2 : 1.3);
        if (!st.heater && st.warm < 1e-3) st.warm = 0;
        st.phase = (st.phase + OMEGA * dt) % (2 * Math.PI);
      }
      compute(reduced ? Math.PI / 2 : st.phase);
      if (dt > 0 && !reduced) pushSample();
      paint(dt);
      paintReadouts();
      paintScope();
      paintCharac();
      lab.explain(nb(explainText()));
      lab.check(st);
    });
    lab.invalidate();
    return lab;
  };
})(typeof window !== 'undefined' ? window : globalThis);
