/*
 * Laboratorio "Il filamento" (capitolo 4).
 * Un alimentatore regolabile, un fusibile di vetro e una lampadina da 12 V e 20 W.
 * La temperatura del filamento si stima dalla potenza (quasi tutta esce come
 * radiazione, che cresce come T⁴) e ne decide il colore; il filo del fusibile si
 * scalda per effetto Joule e fonde se la corrente supera il suo valore.
 * Sotto, un calcolatore dei consumi in kWh e in euro.
 * Semplificazione: la resistenza del filamento resta 7,2 Ω a ogni temperatura.
 */
(function () {
  'use strict';

  const V_NOM = 12;
  const P_NOM = 20;
  const R = V_NOM * V_NOM / P_NOM;
  const I_MAX = V_NOM / R;
  const T_AMB = 295;
  const T_NOM = 2700;
  const T_LUCE = 900; // kelvin: da qui il rosso del filamento si vede bene
  const FUSIBILI = [1, 1.6, 2, 4];
  const TAU_FUS = 0.5; // inerzia termica del filo del fusibile, in secondi (accelerata)
  const NBSP = ' ';

  const APPARECCHI = [
    { id: 'led', nome: 'Lampadina LED', p: 8 },
    { id: 'filamento', nome: 'Lampadina a filamento', p: 60 },
    { id: 'tv', nome: 'Televisore', p: 100 },
    { id: 'phon', nome: 'Asciugacapelli', p: 2000 },
    { id: 'forno', nome: 'Forno elettrico', p: 2500 },
  ];
  const MINUTI = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720, 960, 1440];

  // Il filo che va dal polo − alla lampadina e quello che torna al polo + passando per il fusibile.
  const FILO_MENO = 'M124 196 H148 Q160 196 160 208 V264 Q160 276 172 276 H338 Q350 276 350 264 V247';
  const FILO_DESTRA = 'M370 215 H476 Q488 215 488 203 V40 Q488 28 476 28 H276';
  const FILO_SINISTRA = 'M196 28 H172 Q160 28 160 40 V124 Q160 136 148 136 H124';
  // Percorso chiuso degli elettroni: i tratti dentro la lampadina e l'alimentatore restano nascosti.
  const PERCORSO = FILO_MENO + ' L370 215' + FILO_DESTRA.slice(8) + ' L196 28' + FILO_SINISTRA.slice(7) + ' L104 136 L104 196 Z';
  const BULBO = 'M330 200 C330 186 284 166 284 118 A66 66 0 0 1 416 118 C416 166 370 186 370 200 Z';

  // Colori del filamento e della sua luce in funzione della temperatura (kelvin).
  const NUCLEO = [[500, [74, 62, 54]], [760, [96, 38, 26]], [900, [146, 32, 14]], [1100, [198, 46, 16]], [1350, [238, 78, 22]], [1600, [255, 124, 34]], [1900, [255, 164, 58]], [2200, [255, 204, 100]], [2450, [255, 232, 172]], [2700, [255, 249, 236]]];
  const LUCE = [[800, [255, 66, 20]], [1350, [255, 104, 32]], [1900, [255, 156, 64]], [2450, [255, 194, 112]], [2700, [255, 212, 142]]];
  const FILO_FUS = [[0.72, [196, 204, 200]], [0.86, [222, 84, 44]], [0.94, [255, 132, 48]], [1, [255, 238, 198]]];

  function rampa(tab, x) {
    let k = 1;
    while (k < tab.length - 1 && x > tab[k][0]) k++;
    const a = tab[k - 1];
    const b = tab[k];
    const u = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
    return 'rgb(' + a[1].map((c, j) => Math.round(c + (b[1][j] - c) * u)).join(',') + ')';
  }
  function liscio(a, b, x) {
    const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return u * u * (3 - 2 * u);
  }

  // Il filamento perde la sua potenza quasi solo irraggiando: P cresce come T⁴ − T_AMB⁴.
  const T4 = (t) => t * t * t * t;
  function temperatura(p) {
    return Math.pow(T4(T_AMB) + (T4(T_NOM) - T4(T_AMB)) * p / P_NOM, 0.25);
  }
  function frazione(t) {
    return Math.max(0, (T4(t) - T4(T_AMB)) / (T4(T_NOM) - T4(T_AMB)));
  }
  function nomeColore(t) {
    if (t < 800) return null;
    if (t < 1150) return 'rosso cupo';
    if (t < 1500) return 'rosso arancio';
    if (t < 1950) return 'arancione';
    if (t < 2450) return 'giallo';
    return 'bianco';
  }

  // Numeri all'italiana: virgola decimale, spazio per le migliaia solo da 10 000 in su.
  function cifre(v, dec) {
    const parti = Math.abs(v).toFixed(dec).split('.');
    let intera = parti[0];
    if (intera.length > 4) intera = intera.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return (v < 0 ? '−' : '') + intera + (parti[1] ? ',' + parti[1] : '');
  }
  // Tre cifre significative, senza zeri inutili.
  function sig(v) {
    if (!v) return '0';
    const n = Number(v.toPrecision(3));
    let testo = cifre(n, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(n)))));
    if (testo.includes(',')) testo = testo.replace(/0+$/, '').replace(/,$/, '');
    return testo;
  }
  const gradi = (t) => cifre(Math.round((t - 273.15) / 10) * 10, 0) + NBSP + '°C';
  const euro = (v) => cifre(v, v < 100 ? 2 : 0) + NBSP + '€';
  const perGiorno = (m) => (m < 60 ? m + NBSP + 'min' : Math.floor(m / 60) + NBSP + 'h' + (m % 60 ? ' ' + (m % 60) + NBSP + 'min' : ''));
  const durata = (ore) => (ore < 1 ? cifre(ore * 60, 0) + NBSP + 'min' : sig(ore) + NBSP + 'h');
  const fattore = (k) => (k >= 1 ? '×' + sig(k) : '÷' + sig(1 / k));

  // Spirale del filamento vista di tre quarti: anelli che si sovrappongono, con una lieve freccia.
  function spirale(x0, x1, y, giri) {
    const a = (x1 - x0) / (2 * Math.PI * giri);
    const n = giri * 16;
    let d = '';
    for (let k = 0; k <= n; k++) {
      const t = k / n * 2 * Math.PI * giri;
      const x = x0 + a * t + 2.6 * (Math.cos(t) - 1);
      const yy = y + 3.4 * Math.sin(t) + 2.4 * Math.sin(Math.PI * k / n);
      d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + yy.toFixed(1);
    }
    return d;
  }

  EB.laboratorio('potenza', {
    monta(ctx) {
      const { h, s, fmt, ui } = ctx;
      const F = ctx.F;
      const rid = ctx.ridotto;
      const uid = EB.uid('pot');
      const url = (id) => 'url(#' + uid + id + ')';

      const stato = { v: 6, fus: 2, ricambio: 2, intatto: true };
      const calc = { app: APPARECCHI[2], min: 180, prezzo: 0.35 };
      const corrente = () => (stato.intatto ? F.corrente(stato.v, R) : 0);
      const potenza = () => F.potenzaDaCorrente(corrente(), R);

      /* --- scena --- */
      const stop = (offset, colore, alfa) => s('stop', { offset: offset, 'stop-color': colore, 'stop-opacity': alfa });
      const defs = s('defs', null,
        s('radialGradient', { id: uid + '-alone' }, stop(0, 'currentColor', 0.62), stop(0.32, 'currentColor', 0.22), stop(1, 'currentColor', 0)),
        s('radialGradient', { id: uid + '-tinta', cy: 0.42, r: 0.62 }, stop(0, 'currentColor', 0.55), stop(0.55, 'currentColor', 0.16), stop(1, 'currentColor', 0)),
        s('radialGradient', { id: uid + '-pozza' }, stop(0, 'currentColor', 0.42), stop(1, 'currentColor', 0)),
        s('radialGradient', { id: uid + '-cuore' }, stop(0, '#fffdf6', 0.95), stop(0.45, '#fff2d2', 0.4), stop(1, '#ffe2ae', 0)),
        s('radialGradient', { id: uid + '-lampo' }, stop(0, '#fff8e4', 1), stop(0.3, '#ffbe5c', 0.55), stop(1, '#ff7a1f', 0)),
        s('radialGradient', { id: uid + '-fuliggine' }, stop(0, '#6a5646', 0.95), stop(0.6, '#4d3f33', 0.55), stop(1, '#3a3028', 0)),
        s('linearGradient', { id: uid + '-metallo' }, stop(0, '#76817d', 1), stop(0.38, '#dde3e0', 1), stop(1, '#66716d', 1)),
        s('linearGradient', { id: uid + '-capo', x2: 0, y2: 1 }, stop(0, '#e3e8e6', 1), stop(0.5, '#a9b3af', 1), stop(1, '#6f7a76', 1)),
        s('clipPath', { id: uid + '-tubo' }, s('rect', { x: 204, y: 24, width: 64, height: 20, rx: 6 })));

      const alone = s('circle', { cx: 350, cy: 114, r: 175, fill: url('-alone'), opacity: 0 });
      const pozza = s('ellipse', { cx: 350, cy: 284, rx: 150, ry: 13, fill: url('-pozza'), opacity: 0 });
      const percorso = s('path', { d: PERCORSO, class: 'pot-percorso' });
      const cavi = s('g', { 'aria-hidden': 'true' },
        [FILO_MENO, FILO_DESTRA, FILO_SINISTRA].map((d) => [s('path', { d: d, class: 'pot-filo' }), s('path', { d: d, class: 'pot-filo-rame' })]));

      const elettroni = s('g', { 'aria-hidden': 'true' });
      const punti = [];
      for (let k = 0; k < 26; k++) {
        const g = s('g', { class: 'pot-elettrone' }, s('circle', { r: 4.6 }), s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '−'));
        elettroni.append(g);
        punti.push({ g: g, u: k / 26 });
      }
      const frecce = s('g', { 'aria-hidden': 'true', opacity: 0 });
      if (rid) {
        [[255, 276, 0], [488, 122, -90], [404, 28, 180], [160, 236, 90]].forEach(([x, y, a]) => {
          frecce.append(s('path', { d: 'M-7 -6 L7 0 L-7 6 z', class: 'pot-freccia', transform: 'translate(' + x + ' ' + y + ') rotate(' + a + ')' }));
        });
      }

      const dispV = s('text', { x: 70, y: 127, 'text-anchor': 'middle', class: 'pot-display-v' });
      const dispI = s('text', { x: 70, y: 143, 'text-anchor': 'middle', class: 'pot-display-i' });
      const indice = s('line', { x1: 56, y1: 184, x2: 56, y2: 172, class: 'pot-manopola-segno' });
      const tacche = [];
      for (let k = 0; k <= 6; k++) {
        const a = (-135 + 45 * k) * Math.PI / 180;
        tacche.push(s('line', { x1: 56 + Math.sin(a) * 19.5, y1: 184 - Math.cos(a) * 19.5, x2: 56 + Math.sin(a) * 23, y2: 184 - Math.cos(a) * 23, class: 'pot-tacca' }));
      }
      const alimentatore = s('g', { 'aria-hidden': 'true' },
        s('rect', { x: 16, y: 88, width: 108, height: 128, rx: 12, class: 'pot-alim' }),
        s('rect', { x: 27, y: 100, width: 86, height: 50, rx: 7, class: 'pot-display' }),
        dispV, dispI, tacche,
        s('circle', { cx: 56, cy: 184, r: 15, class: 'pot-manopola' }), indice,
        s('circle', { cx: 124, cy: 136, r: 6.5, class: 'pot-morsetto pos' }),
        s('circle', { cx: 124, cy: 196, r: 6.5, class: 'pot-morsetto neg' }),
        s('text', { x: 138, y: 127, 'text-anchor': 'middle', class: 'pot-segno pos' }, '+'),
        s('text', { x: 138, y: 216, 'text-anchor': 'middle', class: 'pot-segno neg' }, '−'));

      // Fusibile di vetro: due cappucci, il tubo e il filo sottile che fonde.
      const FILO_INTEGRO = 'M208 34 Q236 37.5 264 34';
      const fusFilo = s('path', { d: FILO_INTEGRO, class: 'pot-fus-filo' });
      const fusBagliore = s('path', { d: FILO_INTEGRO, class: 'pot-fus-bagliore', opacity: 0 });
      const pezzi = [s('path', { class: 'pot-fus-filo pot-fus-pezzo' }), s('path', { class: 'pot-fus-filo pot-fus-pezzo' })];
      const gocce = [s('circle', { class: 'pot-fus-goccia' }), s('circle', { class: 'pot-fus-goccia' })];
      const rotto = s('g', { opacity: 0 }, pezzi, gocce);
      const fuliggine = s('ellipse', { cx: 236, cy: 34.5, rx: 22, ry: 8.5, fill: url('-fuliggine'), opacity: 0 });
      const faville = [];
      const scintille = s('g', { 'clip-path': url('-tubo') });
      if (!rid) {
        for (let k = 0; k < 7; k++) {
          const c = s('circle', { r: 1.3, class: 'pot-favilla', opacity: 0 });
          scintille.append(c);
          faville.push({ el: c, x: 0, y: 0, vx: 0, vy: 0, vita: 0, durata: 1 });
        }
      }
      const fusSposta = s('g', null,
        s('rect', { x: 204, y: 24, width: 64, height: 20, rx: 6, class: 'pot-fus-vetro' }),
        fuliggine, fusBagliore, fusFilo, rotto, scintille,
        s('path', { d: 'M211 28.5 H261', class: 'pot-fus-riflesso' }),
        s('rect', { x: 190, y: 22, width: 18, height: 24, rx: 3, fill: url('-capo') }),
        s('rect', { x: 264, y: 22, width: 18, height: 24, rx: 3, fill: url('-capo') }));
      const lampo = s('circle', { cx: 236, cy: 35, r: 36, fill: url('-lampo'), opacity: 0 });
      const fusStato = s('tspan', { class: 'pot-fuso' });
      const fusValore = s('text', { x: 236, y: 80, 'text-anchor': 'middle', class: 'pot-dato i' });
      // Disegnato attorno a y = 34, ingrandito e portato sull'asse del filo in alto (y = 28).
      const fusibile = s('g', { 'aria-hidden': 'true' },
        s('g', { transform: 'translate(236 28) scale(1.25) translate(-236 -34)' }, fusSposta, lampo),
        s('text', { x: 236, y: 64, 'text-anchor': 'middle', class: 'pot-etichetta' }, 'fusibile', fusStato), fusValore);

      // Lampadina: vetro, stelo, reofori, filamento a spirale, attacco a vite.
      const tinta = s('path', { d: BULBO, fill: url('-tinta'), opacity: 0 });
      const curva = spirale(326, 374, 114, 9);
      const filAlone = s('path', { d: curva, class: 'pot-fil-alone', opacity: 0 });
      const filamento = s('path', { d: curva, class: 'pot-fil' });
      const cuore = s('ellipse', { cx: 350, cy: 116, rx: 36, ry: 15, fill: url('-cuore'), opacity: 0 });
      const lampadina = s('g', { 'aria-hidden': 'true' },
        tinta,
        s('path', { d: 'M340 198 L343 156 Q350 149 357 156 L360 198 Z', class: 'pot-stelo' }),
        s('path', { d: 'M343 198 L340 160 L326 114 M357 198 L360 160 L374 114', class: 'pot-reoforo' }),
        filAlone, filamento, cuore,
        s('path', { d: BULBO, class: 'pot-vetro' }),
        s('path', { d: 'M300 97 A54 54 0 0 1 329 68', class: 'pot-riflesso' }),
        s('rect', { x: 330, y: 197, width: 40, height: 35, rx: 3, fill: url('-metallo') }),
        [0, 1, 2, 3].map((k) => s('path', { d: 'M330 ' + (203 + 7.5 * k) + ' L370 ' + (207 + 7.5 * k), class: 'pot-filetto' })),
        s('rect', { x: 336, y: 231, width: 28, height: 8, rx: 2, class: 'pot-isolante' }),
        s('circle', { cx: 350, cy: 242, r: 5, class: 'pot-puntale' }));

      const didascalia = s('text', { x: 160, y: 295, class: 'pot-etichetta piccola' }, 'elettroni: velocità non in scala');
      const etichette = s('g', null,
        s('text', { x: 70, y: 240, 'text-anchor': 'middle', class: 'pot-etichetta' }, 'alimentatore'),
        s('text', { x: 430, y: 236, 'text-anchor': 'middle', class: 'pot-etichetta' }, 'lampadina'),
        s('text', { x: 430, y: 254, 'text-anchor': 'middle', class: 'pot-dato' }, '12 V · 20 W'),
        s('text', { x: 430, y: 272, 'text-anchor': 'middle', class: 'pot-dato r' }, 'R = ' + fmt(R, 'Ω')),
        didascalia);

      const svg = s('svg', { viewBox: '0 0 520 300', role: 'img' },
        defs, alone, pozza, percorso, cavi, elettroni, frecce, alimentatore, fusibile, lampadina, etichette);
      ctx.scena.append(h('div', { class: 'pot-scena' }, svg));

      /* --- letture, formula e comandi --- */
      const lV = ui.lettura({ etichetta: 'Tensione', grandezza: 'v' });
      const lI = ui.lettura({ etichetta: 'Corrente', grandezza: 'i' });
      const lP = ui.lettura({ etichetta: 'Potenza', grandezza: 'p' });
      const lT = ui.lettura({ etichetta: 'Filamento', nota: 'temperatura stimata' });
      const formula = ui.formulaViva();
      formula.el.classList.add('pot-formula');
      ctx.pannello.append(lV.el, lI.el, lP.el, lT.el, formula.el);

      const curV = ui.cursore({ etichetta: 'Tensione dell\'alimentatore', min: 0, max: V_NOM, passo: 0.5, valore: stato.v, unita: 'V', grandezza: 'v', cambia: cambiaV });
      const sceltaFus = ui.scelta({ etichetta: 'Fusibile', opzioni: FUSIBILI.map((a) => ({ valore: a, etichetta: fmt(a, 'A') })), valore: stato.fus, cambia: scegliFusibile });
      const btnMonta = ui.bottone({ etichetta: 'Monta il fusibile', click: montaFusibile });
      ctx.comandi.append(h('div', { class: 'pot-fila' }, curV.el, h('div', { class: 'pot-fusibile' }, sceltaFus.el, btnMonta)));

      const sceltaApp = ui.scelta({
        etichetta: 'Apparecchio',
        opzioni: APPARECCHI.map((a) => ({ valore: a.id, etichetta: [a.nome, ' ', h('small', { class: 'pot-app-w' }, a.p + NBSP + 'W')] })),
        valore: calc.app.id,
        cambia: (id) => { calc.app = APPARECCHI.find((a) => a.id === id); aggiornaCalc('app'); },
      });
      sceltaApp.el.classList.add('pot-apparecchi');
      const curMin = ui.cursore({ etichetta: 'Uso al giorno', valori: MINUTI, valore: calc.min, formato: perGiorno, grandezza: 't', cambia: (m) => { calc.min = m; aggiornaCalc('min'); } });
      const curPrezzo = ui.cursore({ etichetta: 'Prezzo indicativo dell\'energia', min: 0.1, max: 0.6, passo: 0.01, valore: calc.prezzo, formato: (v) => cifre(v, 2) + NBSP + '€/kWh', cambia: (v) => { calc.prezzo = v; aggiornaCalc('prezzo'); } });
      curPrezzo.el.classList.add('pot-prezzo');
      const lOre = ui.lettura({ etichetta: 'Uso in 30 giorni', grandezza: 't' });
      const lKwh = ui.lettura({ etichetta: 'Energia al mese', grandezza: 'p' });
      const lEuro = ui.lettura({ etichetta: 'Spesa al mese', nota: 'circa' });
      const formulaE = ui.formulaViva();
      ctx.comandi.append(h('section', { class: 'pot-calc', 'aria-labelledby': uid + '-calc' },
        h('div', { class: 'pot-calc-testa' },
          h('p', { class: 'pot-calc-kicker' }, 'Calcolatore'),
          h('h3', { id: uid + '-calc' }, 'Quanto consuma in un mese?')),
        h('div', { class: 'pot-calc-corpo' },
          sceltaApp.el,
          h('div', { class: 'pot-calc-comandi' }, curMin.el, curPrezzo.el),
          h('div', { class: 'pot-calc-esito' }, h('div', { class: 'pot-calc-letture' }, lOre.el, lKwh.el, lEuro.el), formulaE.el))));

      /* --- stato mostrato, che insegue quello vero --- */
      const mostrato = { t: temperatura(potenza()), manopola: stato.v, fusT: Math.pow(corrente() / stato.fus, 2), cade: 0, vCade: 0, rottura: 0, fuliggine: 0, lampo: 0 };
      let posizione = 0;
      let lunghezza = 0;
      const storiaV = [stato.v];
      let fusoPrima = false;
      let notato = { v: stato.v, intatto: true };
      let timerNota = 0;
      let timerV = 0;
      let timerFus = 0;
      let calore = { val: 0, t: 0, meta: 0 }; // senza animazioni il calore del fusibile si calcola a parte
      let altraNota = false; // il fusibile ha già detto la sua mentre il cursore si muoveva
      let ultimaNota = '';

      function disponiElettroni() {
        if (!lunghezza) lunghezza = percorso.getTotalLength();
        if (!lunghezza) return;
        punti.forEach((p) => {
          const d = ((p.u * lunghezza + posizione) % lunghezza + lunghezza) % lunghezza;
          const pt = percorso.getPointAtLength(d);
          p.g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
          // dentro l'attacco della lampadina gli elettroni non si vedono
          const dentro = pt.x > 330 && pt.x < 374 && pt.y > 196 && pt.y < 252;
          if (dentro !== p.dentro) { p.dentro = dentro; p.g.setAttribute('opacity', dentro ? 0 : 1); }
        });
      }

      function disegnaFusibile() {
        const tf = mostrato.fusT;
        fusFilo.setAttribute('stroke', rampa(FILO_FUS, tf));
        fusBagliore.setAttribute('stroke', rampa(FILO_FUS, Math.max(tf, 0.86)));
        fusBagliore.setAttribute('opacity', (stato.intatto ? 0.9 * liscio(0.78, 1, tf) : 0).toFixed(3));
        fusFilo.setAttribute('opacity', stato.intatto ? 1 : 0);
        rotto.setAttribute('opacity', stato.intatto ? 0 : 1);
        if (!stato.intatto) {
          const e = mostrato.rottura;
          [-1, 1].forEach((lato, k) => {
            const x = 236 + lato * 12 * e;
            const x0 = 236 + lato * 28;
            pezzi[k].setAttribute('d', 'M' + x0 + ' 34 Q' + ((x0 + x) / 2).toFixed(1) + ' 35.6 ' + x.toFixed(1) + ' 36.4');
            gocce[k].setAttribute('cx', x.toFixed(1));
            gocce[k].setAttribute('cy', 36.4);
            gocce[k].setAttribute('r', (1 + 1.3 * e).toFixed(2));
          });
        }
        fuliggine.setAttribute('opacity', (stato.intatto ? 0 : 0.9 * mostrato.fuliggine).toFixed(3));
        const l = mostrato.lampo / 0.4;
        lampo.setAttribute('opacity', (l * l).toFixed(3));
        lampo.setAttribute('transform', 'translate(236 35) scale(' + (1.25 - 0.5 * l).toFixed(3) + ') translate(-236 -35)');
        faville.forEach((f) => {
          f.el.setAttribute('opacity', f.vita > 0 ? (f.vita / f.durata).toFixed(2) : 0);
          if (f.vita > 0) { f.el.setAttribute('cx', f.x.toFixed(1)); f.el.setAttribute('cy', f.y.toFixed(1)); }
        });
        fusSposta.setAttribute('transform', 'translate(0 ' + (-mostrato.cade).toFixed(2) + ')');
        fusSposta.setAttribute('opacity', Math.min(1, Math.max(0, 1 - mostrato.cade / 16)).toFixed(3));
      }

      function disegna() {
        const t = mostrato.t;
        const f = frazione(t);
        const luce = rampa(LUCE, t);
        defs.style.color = luce;
        filamento.setAttribute('stroke', rampa(NUCLEO, t));
        filAlone.setAttribute('stroke', luce);
        filAlone.setAttribute('opacity', (liscio(780, 1250, t) * (0.5 + 0.45 * Math.min(1, f * 3))).toFixed(3));
        alone.setAttribute('opacity', (0.95 * Math.pow(f, 0.7)).toFixed(3));
        tinta.setAttribute('opacity', (0.9 * Math.pow(f, 0.55)).toFixed(3));
        pozza.setAttribute('opacity', (0.8 * Math.pow(f, 0.8)).toFixed(3));
        cuore.setAttribute('opacity', Math.pow(f, 1.5).toFixed(3));
        indice.setAttribute('transform', 'rotate(' + (-135 + 270 * mostrato.manopola / V_NOM).toFixed(1) + ' 56 184)');
        disegnaFusibile();
        disponiElettroni();
      }

      // Il ciclo gira finché qualcosa si muove: elettroni, filamento che cambia colore, fusibile.
      const ciclo = rid ? null : ctx.ciclo((dt) => {
        const i = corrente();
        const tb = temperatura(F.potenzaDaCorrente(i, R));
        mostrato.t += (tb - mostrato.t) * (1 - Math.exp(-dt * (tb > mostrato.t ? 9 : 6)));
        mostrato.manopola += (stato.v - mostrato.manopola) * (1 - Math.exp(-dt * 10));
        if (stato.intatto) {
          const r = i / stato.fus;
          mostrato.fusT += (r * r - mostrato.fusT) * (1 - Math.exp(-dt / TAU_FUS));
          if (mostrato.fusT >= 1) fondi();
        } else {
          mostrato.fusT *= Math.exp(-dt * 3);
          mostrato.rottura += (1 - mostrato.rottura) * (1 - Math.exp(-dt * 14));
          mostrato.fuliggine += (1 - mostrato.fuliggine) * (1 - Math.exp(-dt * 4));
        }
        mostrato.vCade += (-260 * mostrato.cade - 20 * mostrato.vCade) * dt;
        mostrato.cade += mostrato.vCade * dt;
        mostrato.lampo = Math.max(0, mostrato.lampo - dt);
        faville.forEach((x) => {
          if (x.vita <= 0) return;
          x.vita -= dt;
          x.vy += 220 * dt;
          x.x += x.vx * dt;
          x.y += x.vy * dt;
        });
        posizione += 190 * Math.pow(corrente() / I_MAX, 0.6) * dt;
        disegna();
        const fermo = corrente() === 0 && Math.abs(mostrato.t - tb) < 0.5 && Math.abs(mostrato.manopola - stato.v) < 0.002 &&
          Math.abs(mostrato.cade) < 0.05 && Math.abs(mostrato.vCade) < 0.05 && mostrato.lampo === 0 && mostrato.fusT < 0.001 &&
          faville.every((x) => x.vita <= 0) && (stato.intatto || (mostrato.rottura > 0.999 && mostrato.fuliggine > 0.995));
        if (fermo) ciclo.ferma();
      });

      /* --- note --- */
      function dichiara(testo) {
        clearTimeout(timerNota);
        if (!testo || testo === ultimaNota) return;
        ultimaNota = testo;
        ctx.nota(testo);
      }
      function programma(fn, ms) {
        clearTimeout(timerNota);
        timerNota = setTimeout(() => dichiara(fn()), ms);
      }
      ctx.pulizia(() => { clearTimeout(timerNota); clearTimeout(timerV); clearTimeout(timerFus); });

      function fraseColore(t) {
        const c = nomeColore(t);
        if (!c) return 'Il filamento si scalda (circa ' + gradi(t) + '), ma non abbastanza da fare luce: il rosso compare verso i 525 °C.';
        return 'Il filamento è **' + c + '**, a circa ' + gradi(t) + '.';
      }

      function descrizione() {
        const i = corrente();
        const p = potenza();
        const c = nomeColore(temperatura(p));
        return 'Circuito: alimentatore a ' + fmt(stato.v, 'V') + ', fusibile da ' + fmt(stato.fus, 'A') + (stato.intatto ? '' : ' fuso, quindi circuito aperto') +
          ' e lampadina da 12 V e 20 W ' + (c ? 'accesa, con il filamento ' + c + ': passano ' + fmt(i, 'A') + ' e la lampadina assorbe ' + fmt(p, 'W') : 'spenta') + '.';
      }

      // Scritta quando il cursore si ferma: lì si controlla anche il raddoppio della tensione,
      // rispetto alle tensioni a cui la stessa lampadina era già rimasta accesa.
      function notaTensione() {
        const v = stato.v;
        const i = corrente();
        const p = potenza();
        const prima = notato;
        notato = { v: v, intatto: stato.intatto };
        if (!stato.intatto) return 'Il fusibile è fuso: anche con **' + fmt(v, 'V') + '** il circuito resta aperto e non passa corrente. Scegli un fusibile e premi «Monta il fusibile».';
        if (v === 0) return '**0 V**: nessuna spinta, nessuna corrente. Il filamento si raffredda e torna scuro.';
        const regge = i <= stato.fus;
        const v0 = regge ? storiaV.find((x) => Math.abs(v - 2 * x) < 1e-6) : undefined;
        if (regge && !storiaV.includes(v)) storiaV.push(v);
        let testo;
        if (v0) {
          ctx.completa('quadrupla');
          const i0 = F.corrente(v0, R);
          testo = 'Tensione **raddoppiata**, da ' + fmt(v0, 'V') + ' a **' + fmt(v, 'V') + '**: raddoppia anche la corrente (da ' + fmt(i0, 'A') + ' a ' + fmt(i, 'A') +
            ') e la potenza **quadruplica**, da ' + fmt(F.potenza(v0, i0), 'W') + ' a **' + fmt(p, 'W') + '**, perché in `P = V · I` crescono tutti e due i fattori. ' +
            fraseColore(temperatura(p)) + ' (In un filamento vero la resistenza cresce col calore e l\'aumento è un po\' minore.)';
        } else if (prima.v > 0 && prima.intatto && v !== prima.v) {
          const pp = F.potenzaDaTensione(prima.v, R);
          testo = 'Da ' + fmt(prima.v, 'V') + ' a **' + fmt(v, 'V') + '** (' + fattore(v / prima.v) + '): la corrente diventa **' + fmt(i, 'A') + '** e la potenza passa da ' +
            fmt(pp, 'W') + ' a **' + fmt(p, 'W') + '** (' + fattore(p / pp) + '): con `P = V² / R` cresce col quadrato della tensione. ' + fraseColore(temperatura(p));
        } else {
          testo = 'Con **' + fmt(v, 'V') + '** passano **' + fmt(i, 'A') + '** e il filamento trasforma **' + fmt(p, 'W') + '** in calore e luce. ' + fraseColore(temperatura(p));
        }
        if (i > stato.fus) testo += ' **Attenzione**: la corrente supera il valore del fusibile (' + fmt(stato.fus, 'A') + '), che si sta scaldando.';
        return testo;
      }

      function notaFusibileScelto(a) {
        const i = corrente();
        if (i > a) return 'Fusibile da **' + fmt(a, 'A') + '**, ma la lampadina chiede **' + fmt(i, 'A') + '**: troppi. Il suo filo sottile si sta scaldando…';
        if (a > 2) return 'Fusibile da **' + fmt(a, 'A') + '**: regge sempre, ma è abbondante. Protegge bene i fili un fusibile appena sopra la corrente normale: qui 2 A, perché a 12 V passano 1,67 A.';
        if (a === 2) return 'Fusibile da **2 A**: è il valore adatto, appena sopra la corrente della lampadina a piena tensione (1,67 A a 12 V).';
        return 'Fusibile da **' + fmt(a, 'A') + '**: regge la corrente di adesso (' + fmt(i, 'A') + '), ma fonde se la corrente supera ' + fmt(a, 'A') + ', cioè sopra **' + fmt(a * R, 'V') + '**.';
      }

      /* --- aggiornamento --- */
      function aggiorna(origine) {
        const i = corrente();
        const p = potenza();
        const t = temperatura(p);
        lV.imposta(fmt(stato.v, 'V'));
        lI.imposta(fmt(i, 'A'));
        lP.imposta(fmt(p, 'W'));
        lT.imposta('≈' + NBSP + gradi(t));
        formula.imposta([['P', 'p'], ' = ', ['V', 'v'], ' · ', ['I', 'i'], ' = ', [fmt(stato.v, 'V'), 'v'], ' · ', [fmt(i, 'A'), 'i'], ' = ', [fmt(p, 'W'), 'p']]);
        dispV.textContent = cifre(stato.v, 1) + NBSP + 'V';
        dispI.textContent = cifre(i, 2) + NBSP + 'A';
        fusValore.textContent = fmt(stato.fus, 'A');
        fusStato.textContent = stato.intatto ? '' : ' fuso';
        btnMonta.disabled = stato.intatto;
        btnMonta.classList.toggle('primario', !stato.intatto);
        btnMonta.textContent = 'Monta il fusibile da ' + fmt(stato.ricambio, 'A');
        frecce.setAttribute('opacity', i > 0 ? 1 : 0);
        if (rid) didascalia.textContent = i > 0 ? 'frecce: verso degli elettroni' : stato.intatto ? 'tensione zero: nessuna corrente' : 'circuito aperto: nessuna corrente';
        svg.setAttribute('aria-label', descrizione());

        if (fusoPrima && stato.intatto && i <= stato.fus && t >= T_LUCE) ctx.completa('fusibile');

        if (rid) {
          // Stessa legge del ciclo, risolta per tratti: il filo fonde quando il suo calore arriva a 1.
          const ora = performance.now() / 1000;
          const r2 = stato.intatto ? Math.pow(i / stato.fus, 2) : 0;
          const adesso = calore.meta + (calore.val - calore.meta) * Math.exp(-(ora - calore.t) / TAU_FUS);
          calore = { val: adesso, t: ora, meta: r2 };
          clearTimeout(timerFus);
          if (r2 > 1) timerFus = setTimeout(fondi, 1000 * TAU_FUS * Math.log((r2 - adesso) / (r2 - 1)));
          mostrato.t = t;
          mostrato.manopola = stato.v;
          mostrato.fusT = r2;
          disegna();
        } else {
          ciclo.avvia();
        }
      }

      // La tensione «conta» quando il cursore si ferma: allora si cerca il raddoppio e si scrive la nota.
      function cambiaV(v) {
        stato.v = v;
        altraNota = false;
        aggiorna('v');
        clearTimeout(timerV);
        timerV = setTimeout(() => {
          const testo = notaTensione();
          if (!altraNota) dichiara(testo);
        }, 350);
      }

      function scegliFusibile(a) {
        stato.ricambio = a;
        altraNota = true;
        if (!stato.intatto) {
          const i = F.corrente(stato.v, R);
          aggiorna('ricambio');
          dichiara('Ricambio scelto: **' + fmt(a, 'A') + '**. Con ' + fmt(stato.v, 'V') + ' passeranno ' + fmt(i, 'A') + (i > a ? ': troppi, fonderebbe di nuovo.' : ': regge.') + ' Premi «Monta il fusibile» per inserirlo.');
          return;
        }
        stato.fus = a;
        nuovoFusibile();
        aggiorna('fusibile');
        if (stato.intatto) dichiara(notaFusibileScelto(a));
      }

      function montaFusibile() {
        if (stato.intatto) return;
        altraNota = true;
        stato.fus = stato.ricambio;
        stato.intatto = true;
        nuovoFusibile();
        aggiorna('monta');
        if (!stato.intatto) return;
        const i = corrente();
        const c = nomeColore(temperatura(potenza()));
        let testo = 'Fusibile nuovo da **' + fmt(stato.fus, 'A') + '**: ';
        if (stato.v === 0) testo += 'il circuito è di nuovo chiuso. Alza la tensione per riaccendere la lampadina.';
        else if (i > stato.fus) testo += 'ma la lampadina chiede **' + fmt(i, 'A') + '**, fonderà anche questo. Scegli un valore più alto della corrente, o abbassa la tensione.';
        else if (!c) testo += 'il circuito è chiuso, ma con ' + fmt(stato.v, 'V') + ' il filamento resta troppo freddo per fare luce. Alza la tensione.';
        else testo += 'regge senza fatica la corrente della lampadina (**' + fmt(i, 'A') + '**), che si riaccende ' + c + '.' + (stato.fus > 2 ? ' È però abbondante: per proteggere i fili basterebbe 2 A.' : '');
        notato = { v: stato.v, intatto: true };
        dichiara(testo);
      }

      function nuovoFusibile() {
        mostrato.fusT = 0;
        mostrato.rottura = 0;
        mostrato.fuliggine = 0;
        mostrato.lampo = 0;
        faville.forEach((x) => { x.vita = 0; });
        calore = { val: 0, t: performance.now() / 1000, meta: 0 };
        if (!rid) { mostrato.cade = 16; mostrato.vCade = 0; }
      }

      function fondi() {
        const i = F.corrente(stato.v, R);
        const rapporto = i / stato.fus;
        stato.intatto = false;
        stato.ricambio = stato.fus;
        fusoPrima = true;
        altraNota = true;
        if (rid) {
          mostrato.rottura = 1;
          mostrato.fuliggine = 1;
        } else {
          mostrato.lampo = 0.4;
          faville.forEach((x) => {
            const a = -Math.PI * (0.1 + 0.8 * Math.random());
            const vel = 25 + 45 * Math.random();
            x.x = 236;
            x.y = 35.5;
            x.vx = Math.cos(a) * vel;
            x.vy = Math.sin(a) * vel;
            x.durata = x.vita = 0.3 + 0.3 * Math.random();
          });
        }
        aggiorna('fuso');
        notato = { v: stato.v, intatto: false };
        dichiara('**Il fusibile è fuso.** Passavano **' + fmt(i, 'A') + '**, più del suo valore di ' + fmt(stato.fus, 'A') +
          ': il filo sottile si è scaldato per [[effetto Joule]] fino a fondere e ha aperto il circuito, così la lampadina si è spenta.' +
          (rapporto < 1.15 ? ' Lo superavano di poco, per questo ha resistito qualche istante.' : '') +
          ' Scegli un fusibile adatto e premi «Monta il fusibile».');
      }

      /* --- calcolatore dei consumi --- */
      function notaCalc() {
        const a = calc.app;
        const ore = calc.min * 30 / 60;
        const e = F.energiaKWh(a.p, ore);
        let testo = '**' + a.nome + '** da ' + fmt(a.p, 'W') + ' per **' + perGiorno(calc.min) + '** al giorno: in 30 giorni fanno ' + durata(ore) +
          ', cioè **' + sig(e) + NBSP + 'kWh** (' + fmt(a.p, 'W') + ' × ' + durata(ore) + '), circa **' + euro(e * calc.prezzo) + '** a ' + cifre(calc.prezzo, 2) + NBSP + '€/kWh.';
        if (a.id === 'phon' && calc.min === 10) testo += ' Pochi minuti, ma tanta potenza. Un kWh è l\'energia di 1000 W per un\'ora: 3,6 milioni di joule.';
        else if (a.id === 'led') testo += ' Fa più o meno la luce di una lampadina a filamento da 60 W, con circa un settimo dell\'energia.';
        else if (a.id === 'filamento') testo += ' Fa più o meno la luce di una lampadina LED da 8 W: quasi tutta l\'energia in più diventa calore, come nel filamento qui sopra.';
        else if (a.id === 'forno') testo += ' Da solo usa quasi tutti i 3 kW di un tipico contratto di casa.';
        return testo;
      }

      function aggiornaCalc(origine) {
        const ore = calc.min * 30 / 60;
        const e = F.energiaKWh(calc.app.p, ore);
        lOre.imposta(durata(ore));
        lKwh.imposta(sig(e) + NBSP + 'kWh');
        lEuro.imposta(euro(e * calc.prezzo));
        formulaE.imposta([['E', 'p'], ' = ', ['P', 'p'], ' · ', ['t', 't'], ' = ', [fmt(calc.app.p, 'W'), 'p'], ' · ', [durata(ore), 't'], ' = ', [sig(e) + NBSP + 'kWh', 'p']]);
        if (!origine) return;
        if (calc.app.id === 'phon' && calc.min === 10) ctx.completa('kilowattora');
        if (origine === 'app') dichiara(notaCalc());
        else programma(notaCalc, 350);
      }

      aggiorna();
      aggiornaCalc();
      disegna();
      ctx.nota('Con **' + fmt(stato.v, 'V') + '** passano **' + fmt(corrente(), 'A') + '** e il filamento trasforma **' + fmt(potenza(), 'W') +
        '** in calore e luce: è **' + nomeColore(mostrato.t) + '**, a circa ' + gradi(mostrato.t) + '. Alza la tensione e guarda come cambia il colore.');
    },
  });
})();
