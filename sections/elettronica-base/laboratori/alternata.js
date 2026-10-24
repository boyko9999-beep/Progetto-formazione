/*
 * Laboratorio "Oscilloscopio e trasformatore" (capitolo 9).
 * Tre viste dello stesso banco: l'oscilloscopio con una sorgente continua o alternata
 * e una lampada; il trasformatore con le spire regolabili e la seconda traccia;
 * la linea elettrica che deve portare 100 MW a una tensione da scegliere.
 * Il rallentatore fa scorrere il tempo tante volte più piano quanti sono gli hertz:
 * un ciclo al secondo, così i lampi della lampada restano lenti e morbidi.
 */
(function () {
  'use strict';

  const MS_DIV = 5;                        // base dei tempi: 5 ms per quadretto
  const FINESTRA = 10 * MS_DIV / 1000;     // 10 quadretti, 50 ms
  const T0 = MS_DIV / 1000;                // in continua la cattura parte dopo un quadretto
  const TAU = 0.003;                       // impulso del secondario all'accensione (non in scala)
  const SCALE = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const P_LINEA = 100e6;
  const R_LINEA = 10;
  const N = 200;
  const CH2 = '#ffe7b3';
  const ONDA = 'M-11 0 C-8 -9 -3 -9 0 0 C3 9 8 9 11 0';
  const CONTINUA = 'M-11 -3 H11 M-11 4 H-6 M-2 4 H2 M6 4 H11';
  const CAVO = 'M100 150 L135 90 Q187 122 240 90 Q292 122 345 90 L380 150';
  const GRADINI = [[0, [58, 34, 26]], [0.12, [170, 52, 28]], [0.35, [255, 122, 46]], [0.7, [255, 210, 122]], [1.2, [255, 247, 230]]];

  // Spire: numeri tondi, più fitti dove le spire sono poche.
  const SPIRE = [];
  [10, 100, 1000].forEach((d) => [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.3, 3.6, 4, 4.4, 4.8, 5, 5.2, 5.6, 6, 6.5, 7, 7.5, 8, 9]
    .forEach((k) => { if (k * d <= 2000) SPIRE.push(Math.round(k * d)); }));

  const scalaPer = (picco, quadretti) => SCALE.find((x) => picco / x <= quadretti) || SCALE[SCALE.length - 1];
  const giri = (n) => EB.clamp(Math.round(3 + 2.2 * Math.log2(n / 10)), 3, 18);

  function coloreFilamento(b) {
    let k = 1;
    while (k < GRADINI.length - 1 && b > GRADINI[k][0]) k++;
    const [a0, c0] = GRADINI[k - 1];
    const [a1, c1] = GRADINI[k];
    const t = EB.clamp((b - a0) / (a1 - a0), 0, 1);
    return 'rgb(' + c0.map((x, i) => Math.round(x + (c1[i] - x) * t)).join(' ') + ')';
  }

  EB.laboratorio('alternata', {
    monta(ctx) {
      const { h, s, fmt, num, F } = ctx;
      const stato = { vista: 'osc', tipo: 'dc', v: 120, f: 60, lento: false, np: 1000, ns: 200, vl: 132e3 };
      const stile = getComputedStyle(ctx.box);
      const AMBRA = stile.getPropertyValue('--lab-v').trim() || '#ffc04d';
      const ARANCIO = stile.getPropertyValue('--lab-p').trim() || '#ff9f43';
      const CHIARO = stile.getPropertyValue('--lab-t').trim() || '#e8f2ee';
      const MONO = stile.getPropertyValue('--mono').trim() || 'monospace';
      const icona = (d) => s('svg', { viewBox: '-13 -10 26 20', class: 'alt-ico', 'aria-hidden': 'true' }, s('path', { d: d }));
      const gradiente = (id) => s('radialGradient', { id: id },
        s('stop', { offset: '0', class: 'alt-stop', 'stop-opacity': '.9' }),
        s('stop', { offset: '.4', class: 'alt-stop', 'stop-opacity': '.28' }),
        s('stop', { offset: '1', class: 'alt-stop', 'stop-opacity': '0' }));

      /* --- viste --- */
      const viste = ctx.ui.scelta({
        etichetta: 'Vista', valore: stato.vista,
        opzioni: [{ valore: 'osc', etichetta: 'Oscilloscopio' }, { valore: 'tra', etichetta: 'Trasformatore' }, { valore: 'lin', etichetta: ['Linea', h('span', { class: 'alt-lungo' }, ' elettrica')] }],
        cambia: (v) => { stato.vista = v; if (v === 'tra') accensione(); aggiorna('vista'); },
      });
      viste.el.classList.add('alt-viste');

      /* --- oscilloscopio --- */
      const schermo = h('div', { class: 'alt-schermo' });
      const tela = EB.tela(schermo, { rapporto: 1.25, min: 220, max: 420, etichetta: 'Schermo dell\'oscilloscopio' });
      ctx.pulizia(() => tela.distruggi());
      const info = h('p', { class: 'alt-info' });
      const strumento = h('div', { class: 'alt-strumento' }, schermo, info);

      /* --- lampada collegata alla sorgente --- */
      const idL = EB.uid('alt-luce');
      const alone = s('circle', { cx: 110, cy: 86, r: 98, fill: 'url(#' + idL + ')' });
      const bagliore = s('circle', { cx: 110, cy: 88, r: 40, class: 'alt-bagliore' });
      const filamento = s('path', { d: 'M100 100 l3.3 -9 l3.3 9 l3.4 -9 l3.3 9 l3.4 -9 l3.3 9', class: 'alt-filamento' });
      const simbolo1 = s('path', { class: 'alt-simbolo', transform: 'translate(54 214)' });
      const sorgTesto = s('text', { x: 74, y: 219, class: 'alt-sorg-t' });
      const lampada = s('svg', { viewBox: '0 0 220 240', class: 'alt-lampada', role: 'img' },
        s('defs', null, gradiente(idL)), alone,
        s('path', { d: 'M102 166 V196 M118 166 V196', class: 'alt-filo' }),
        s('path', { d: 'M93 140 V132 C93 121 66 112 66 88 A44 44 0 1 1 154 88 C154 112 127 121 127 132 V140 Z', class: 'alt-vetro' }),
        bagliore,
        s('path', { d: 'M100 140 V100 M120 140 V100', class: 'alt-supporto' }), filamento,
        s('rect', { x: 93, y: 140, width: 34, height: 20, rx: 3, class: 'alt-attacco' }),
        s('path', { d: 'M93 147 H127 M93 153 H127', class: 'alt-filetto' }),
        s('rect', { x: 103, y: 160, width: 14, height: 6, rx: 2, class: 'alt-attacco' }),
        s('rect', { x: 26, y: 196, width: 168, height: 36, rx: 10, class: 'alt-sorgente' }), simbolo1, sorgTesto);
      const didLampada = h('p', { class: 'alt-didascalia' });
      const figLampada = h('div', { class: 'alt-fig' }, lampada, didLampada);

      /* --- trasformatore --- */
      const idL2 = EB.uid('alt-luce');
      const flusso = s('path', { d: 'M122 62 H238 Q248 62 248 72 V208 Q248 218 238 218 H122 Q112 218 112 208 V72 Q112 62 122 62 Z', class: 'alt-flusso' });
      const frecce = [[180, 62, 0], [248, 140, 90], [180, 218, 180], [112, 140, 270]].map(([x, y, a]) => ({ x: x, y: y, a: a, el: s('path', { class: 'alt-freccia' }) }));
      const bobinaP = s('g', { class: 'alt-bobina' });
      const bobinaS = s('g', { class: 'alt-bobina' });
      const simbolo2 = s('path', { class: 'alt-simbolo', transform: 'translate(38 140)' });
      const aloneS = s('circle', { cx: 318, cy: 140, r: 40, fill: 'url(#' + idL2 + ')' });
      const lampS = s('circle', { cx: 318, cy: 140, r: 12, class: 'alt-lamp2' });
      const vpTesto = s('text', { x: 62, y: 70, 'text-anchor': 'middle', class: 'alt-val' });
      const vsTesto = s('text', { x: 296, y: 70, 'text-anchor': 'middle', class: 'alt-val' });
      const npTesto = s('text', { x: 112, y: 272, 'text-anchor': 'middle', class: 'alt-n' });
      const nsTesto = s('text', { x: 248, y: 272, 'text-anchor': 'middle', class: 'alt-n' });
      const lampTesto = s('text', { x: 316, y: 226, 'text-anchor': 'middle', class: 'alt-et' });
      const nucleo = 'M95 45 H265 V235 H95 Z M129 79 V201 H231 V79 Z';
      const trasf = s('svg', { viewBox: '0 0 360 290', class: 'alt-trasf', role: 'img' },
        s('defs', null, gradiente(idL2)), aloneS,
        s('path', { d: 'M38 120 V78 H86 V86 M38 160 V202 H86 V194 M318 128 V78 H274 V86 M318 152 V202 H274 V194', class: 'alt-filo' }),
        s('path', { d: nucleo, class: 'alt-nucleo', 'fill-rule': 'evenodd' }),
        s('path', { d: 'M106 56 H254 V224 H106 Z M118 68 H242 V212 H118 Z', class: 'alt-lamierini' }),
        flusso, frecce.map((x) => x.el), bobinaP, bobinaS,
        s('circle', { cx: 38, cy: 140, r: 20, class: 'alt-gen' }), simbolo2, lampS,
        s('text', { x: 180, y: 34, 'text-anchor': 'middle', class: 'alt-phi' }, 'flusso Φ'),
        vpTesto, vsTesto, npTesto, nsTesto, lampTesto,
        s('text', { x: 112, y: 254, 'text-anchor': 'middle', class: 'alt-et' }, 'primario'),
        s('text', { x: 248, y: 254, 'text-anchor': 'middle', class: 'alt-et' }, 'secondario'));
      const didTrasf = h('p', { class: 'alt-didascalia' });
      const figTrasf = h('div', { class: 'alt-fig' }, trasf, didTrasf);

      /* --- linea elettrica --- */
      const cavo = s('path', { d: CAVO, class: 'alt-cavo' });
      const cavoCaldo = s('path', { d: CAVO, class: 'alt-cavo-caldo' });
      const energia = [];
      for (let k = 0; k < 9; k++) energia.push(s('path', { d: 'M-5 -4 L5 0 L-5 4 Z', class: 'alt-energia' }));
      const vapori = [187, 240, 292].map((x, k) => s('path', { d: 'M' + x + ' ' + (k === 1 ? 74 : 98) + ' q5 -7 0 -14 q-5 -7 0 -14', class: 'alt-vapore', style: { 'animation-delay': (k * 0.45) + 's' } }));
      const finestre = [];
      [[412, 176], [426, 176], [440, 168], [454, 168], [446, 184], [462, 184]].forEach(([x, y]) => finestre.push(s('rect', { x: x, y: y, width: 6, height: 7, rx: 1, class: 'alt-finestra' })));
      const tagV = s('text', { x: 187, y: 66, 'text-anchor': 'middle', class: 'alt-val' });
      const tagI = s('text', { x: 292, y: 66, 'text-anchor': 'middle', class: 'alt-cor' });
      const tagP = s('text', { x: 240, y: 236, 'text-anchor': 'middle', class: 'alt-per' });
      const avviso = s('g', { class: 'alt-avviso' }, s('rect', { x: 170, y: 12, width: 140, height: 28, rx: 14 }), s('text', { x: 240, y: 31, 'text-anchor': 'middle' }, 'impossibile'));
      const tralicci = [135, 240, 345].map((x) => 'M' + (x - 13) + ' 200 L' + (x - 4) + ' 84 H' + (x + 4) + ' L' + (x + 13) + ' 200 M' + (x - 17) + ' 90 H' + (x + 17) + ' M' + (x - 10) + ' 165 L' + (x + 7) + ' 125 M' + (x + 10) + ' 165 L' + (x - 7) + ' 125').join(' ');
      const lineaSvg = s('svg', { viewBox: '0 0 480 244', class: 'alt-linea', role: 'img' },
        s('path', { d: 'M0 200 H480', class: 'alt-suolo' }),
        s('path', { d: 'M14 200 V132 H70 V200 Z M50 132 V104 H60 V132', class: 'alt-edificio' }),
        s('circle', { cx: 32, cy: 164, r: 11, class: 'alt-gen' }),
        s('path', { d: ONDA, transform: 'translate(32 164) scale(.7)', class: 'alt-simbolo' }),
        s('path', { d: tralicci, class: 'alt-traliccio' }),
        s('path', { d: 'M70 160 H82 M412 160 H400', class: 'alt-filo' }),
        [[88, 160], [98, 160], [382, 160], [392, 160]].map(([x, y]) => s('circle', { cx: x, cy: y, r: 9, class: 'alt-trafo' })),
        s('path', { d: 'M406 200 V172 L419 160 L432 172 V200 Z M434 200 V164 L447 152 L460 164 V200 Z M440 200 V180 H470 V200 Z', class: 'alt-edificio' }),
        finestre, cavo, cavoCaldo, vapori, energia, tagV, tagI, tagP, avviso,
        s('text', { x: 42, y: 92, 'text-anchor': 'middle', class: 'alt-per' }, fmt(P_LINEA, 'W')),
        s('text', { x: 42, y: 222, 'text-anchor': 'middle', class: 'alt-et' }, 'centrale'),
        s('text', { x: 438, y: 222, 'text-anchor': 'middle', class: 'alt-et' }, 'città'),
        s('text', { x: 187, y: 148, 'text-anchor': 'middle', class: 'alt-res' }, 'R = ' + fmt(R_LINEA, 'Ω')));
      const didLinea = h('p', { class: 'alt-didascalia' });
      const figLinea = h('div', { class: 'alt-fig alt-fig-linea' }, lineaSvg, didLinea);

      const banco = h('div', { class: 'alt-banco' }, strumento, figLampada, figTrasf);
      ctx.scena.append(h('div', { class: 'alt-scena' }, viste.el, banco, figLinea));

      /* --- letture --- */
      const lett = (etichetta, grandezza) => ctx.ui.lettura({ etichetta: etichetta, grandezza: grandezza });
      const pann = {
        osc: [lett('Tensione', 'v'), lett('Picco', 'v'), lett('Frequenza', 't')],
        tra: [lett('Primario', 'v'), lett('Secondario', 'v'), lett('Rapporto spire', 'b')],
        lin: [lett('Tensione della linea', 'v'), lett('Corrente', 'i'), lett('Perdite', 'p')],
      };
      const formula = ctx.ui.formulaViva();
      Object.keys(pann).forEach((k) => pann[k].forEach((x) => { x.el.classList.add('alt-lettura'); ctx.pannello.append(x.el); }));
      ctx.pannello.append(formula.el);

      /* --- comandi --- */
      const sorgente = ctx.ui.scelta({
        etichetta: 'Sorgente', valore: stato.tipo,
        opzioni: [{ valore: 'dc', etichetta: [icona(CONTINUA), 'Continua'] }, { valore: 'ac', etichetta: [icona(ONDA), 'Alternata'] }],
        cambia: (t) => { stato.tipo = t; accensione(); aggiorna('tipo'); },
      });
      const lento = ctx.ui.interruttore({ etichetta: 'Rallentatore', acceso: false, cambia: (a) => { stato.lento = a; aggiorna('lento'); } });
      const curV = ctx.ui.cursore({ etichetta: 'Tensione', min: 0, max: 250, passo: 5, valore: stato.v, unita: 'V', grandezza: 'v', cambia: (v) => { stato.v = v; accensione(); aggiorna('v'); } });
      const curF = ctx.ui.cursore({ etichetta: 'Frequenza', min: 10, max: 100, passo: 1, valore: stato.f, unita: 'Hz', grandezza: 't', cambia: (f) => { stato.f = f; aggiorna('f'); } });
      const preset = h('div', { class: 'alt-preset' }, [[50, 'Europa', 'in Europa'], [60, 'Stati Uniti', 'negli Stati Uniti']].map(([f, dove, come]) => ctx.ui.bottone({
        etichetta: [f + ' Hz', h('small', null, dove)], aria: 'Alternata a ' + f + ' hertz, come ' + come,
        click: () => {
          const cambia = stato.tipo !== 'ac';
          stato.f = f; stato.tipo = 'ac';
          curF.imposta(f, true); sorgente.imposta('ac', true);
          aggiorna(cambia ? 'tipo' : 'f');
        },
      })));
      const spire = (etichetta, chiave, valori) => ctx.ui.cursore({ etichetta: etichetta, valori: valori, valore: stato[chiave], formato: (n) => num(n, 0), grandezza: 'b', cambia: (n) => { stato[chiave] = n; aggiorna(chiave); } });
      const curNp = spire('Spire del primario', 'np', SPIRE.filter((n) => n >= 100));
      const curNs = spire('Spire del secondario', 'ns', SPIRE);
      const scLinea = ctx.ui.scelta({
        etichetta: 'Tensione di trasmissione', valore: stato.vl,
        opzioni: [1e3, 20e3, 132e3, 220e3, 380e3].map((v) => ({ valore: v, etichetta: fmt(v, 'V') })),
        cambia: (v) => { stato.vl = v; aggiorna('vl'); },
      });
      const celle = {
        sorg: h('div', { class: 'alt-cella' }, sorgente.el, lento.el),
        v: h('div', { class: 'alt-cella' }, curV.el),
        f: h('div', { class: 'alt-cella' }, curF.el, preset),
        np: h('div', { class: 'alt-cella alt-larga' }, curNp.el),
        ns: h('div', { class: 'alt-cella alt-larga' }, curNs.el),
        lin: h('div', { class: 'alt-cella alt-larga' }, scLinea.el),
        dati: h('p', { class: 'alt-cella alt-larga alt-dati' }, 'Linea semplificata: deve portare ', h('b', { class: 'alt-p' }, fmt(P_LINEA, 'W')), ' alla città con cavi da ', h('b', { class: 'alt-r' }, fmt(R_LINEA, 'Ω')), '. Le perdite in calore valgono ', EB.formula('P = R · I²', { inline: true }), '.'),
      };
      const VISIBILI = { osc: ['sorg', 'v', 'f'], tra: ['sorg', 'v', 'f', 'np', 'ns'], lin: ['lin', 'dati'] };
      ctx.comandi.append(h('div', { class: 'alt-comandi' }, Object.keys(celle).map((k) => celle[k])));

      /* --- stato mostrato: si avvicina a quello vero con un po' di inerzia --- */
      const m = { dc: 0, ac: 0, ac2: 0, imp: 0, lf: Math.log(stato.f), s1: Math.log(50), s2: Math.log(10), luce: 0, luce2: 0, calore: 0 };
      const bers = Object.assign({}, m);
      const PX = new Float32Array(N + 1);
      const Y1 = new Float32Array(N + 1);
      const Y2 = new Float32Array(N + 1);
      const YP = new Float32Array(N + 1);
      let tSim = 0;
      let inizio = 0;
      let scorre = 0;
      let fase = 0;
      let lampo = 0;
      let lunghezza = 0;
      let timerNota = 0;
      let ultimaNota = '';
      let notato = Object.assign({}, stato);

      function valori() {
        const ac = stato.tipo === 'ac';
        const vs = F.trasformatore(stato.v, stato.np, stato.ns);
        const perdita = F.perditaLinea(P_LINEA, stato.vl, R_LINEA);
        return {
          ac: ac, vs: vs, perdita: perdita, quota: perdita / P_LINEA, corrente: P_LINEA / stato.vl,
          picco: ac ? F.piccoDaEfficace(stato.v) : stato.v,
          picco2: ac ? F.piccoDaEfficace(vs) : vs,
        };
      }

      // In continua il trasformatore dà solo un impulso quando la tensione cambia.
      function accensione() {
        if (stato.vista === 'tra' && stato.tipo === 'dc' && !ctx.ridotto) lampo = Math.min(1, Math.pow(valori().vs / 12, 2));
      }

      const continuo = () => !ctx.ridotto && (stato.vista === 'lin' || (stato.lento && (stato.vista === 'osc' || stato.tipo === 'ac')));

      /* --- disegno dello schermo --- */
      function traccia(c, py, colore, spazzola, xr, spessore) {
        const tratto = (a, b) => { c.beginPath(); c.moveTo(PX[a], py[a]); for (let i = a + 1; i <= b; i++) c.lineTo(PX[i], py[i]); c.stroke(); };
        c.strokeStyle = colore;
        if (!spazzola) {
          c.globalAlpha = 0.16; c.lineWidth = 7; tratto(0, N);
          c.globalAlpha = 1; c.lineWidth = spessore; tratto(0, N);
        } else {
          c.globalAlpha = 0.2; c.lineWidth = spessore; tratto(0, N);
          const fine = Math.round(xr * N);
          for (let i = 0; i < fine; i += 5) {
            const a = Math.exp(-(xr - i / N) / 0.28);
            const j = Math.min(fine, i + 5);
            c.globalAlpha = 0.14 * a; c.lineWidth = 7; tratto(i, j);
            c.globalAlpha = 0.2 + 0.8 * a; c.lineWidth = spessore; tratto(i, j);
          }
        }
        c.globalAlpha = 1;
      }

      function punto(c, x, y, colore) {
        c.fillStyle = colore;
        c.globalAlpha = 0.28; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
        c.globalAlpha = 1; c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill();
      }

      function marca(c, x, y, testo, colore) {
        c.fillStyle = colore;
        c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 13, y - 8); c.lineTo(x + 19, y); c.lineTo(x + 13, y + 8); c.lineTo(x, y + 8); c.fill();
        c.fillStyle = '#160f00'; c.font = '800 11px ' + MONO; c.textAlign = 'center'; c.fillText(testo, x + 7, y + 4);
      }

      // Etichetta sullo schermo, su un fondo scuro perché resti leggibile sopra la traccia.
      function scrivi(c, testo, x, y, colore, allinea) {
        c.font = '600 12px ' + MONO;
        const w = c.measureText(testo).width;
        const x0 = allinea === 'left' ? x : allinea === 'center' ? x - w / 2 : x - w;
        c.fillStyle = 'rgba(4, 11, 9, .78)';
        c.beginPath();
        if (c.roundRect) c.roundRect(x0 - 4, y - 12, w + 8, 16, 4); else c.rect(x0 - 4, y - 12, w + 8, 16);
        c.fill();
        c.textAlign = allinea || 'right'; c.fillStyle = colore; c.fillText(testo, x, y);
      }

      function disegnaSchermo() {
        if (stato.vista === 'lin') return;
        const c = tela.ctx;
        const W = tela.w;
        const H = tela.h;
        const mx = 8;
        const my = 8;
        const dx = (W - 2 * mx) / 10;
        const dy = (H - 2 * my) / 8;
        const t = valori();
        const tra = stato.vista === 'tra';
        const w = 2 * Math.PI * Math.exp(m.lf);
        const s1 = Math.exp(m.s1);
        const s2 = Math.exp(m.s2);
        const z1 = my + (tra ? 2 : 4) * dy;
        const z2 = my + 6 * dy;
        const potenza = !tra && stato.lento && t.ac;
        const frazione = t.picco > 0 ? m.ac / t.picco : 0;
        c.clearRect(0, 0, W, H);
        c.lineWidth = 1;
        c.strokeStyle = 'rgba(150, 220, 190, .09)';
        c.beginPath();
        for (let i = 0; i <= 10; i++) { const x = Math.round(mx + i * dx) + 0.5; c.moveTo(x, my); c.lineTo(x, H - my); }
        for (let j = 0; j <= 8; j++) { const y = Math.round(my + j * dy) + 0.5; c.moveTo(mx, y); c.lineTo(W - mx, y); }
        c.stroke();
        c.strokeStyle = 'rgba(150, 220, 190, .24)';
        c.beginPath();
        const xc = Math.round(mx + 5 * dx) + 0.5;
        const yc = Math.round(my + 4 * dy) + 0.5;
        for (let i = 1; i < 50; i++) { const x = mx + i * dx / 5; c.moveTo(x, yc - 3); c.lineTo(x, yc + 3); }
        for (let j = 1; j < 40; j++) { const y = my + j * dy / 5; c.moveTo(xc - 3, y); c.lineTo(xc + 3, y); }
        c.stroke();

        for (let i = 0; i <= N; i++) {
          const tt = FINESTRA * i / N;
          const sn = Math.sin(w * tt);
          const gradino = !tra || tt >= T0 ? 1 : 0;
          PX[i] = mx + 10 * dx * i / N;
          Y1[i] = z1 - (gradino * m.dc + m.ac * sn) / s1 * dy;
          if (tra) Y2[i] = z2 - ((tt >= T0 ? m.imp * Math.exp(-(tt - T0) / TAU) : 0) + m.ac2 * sn) / s2 * dy;
          if (potenza) YP[i] = z1 - frazione * frazione * sn * sn * 3 * dy;
        }

        c.save();
        c.beginPath(); c.rect(mx, my, 10 * dx, 8 * dy); c.clip();
        c.lineJoin = 'round'; c.lineCap = 'round';
        if (!tra) {
          // righe del picco e del valore efficace
          c.setLineDash([4, 5]); c.lineWidth = 1; c.strokeStyle = AMBRA; c.globalAlpha = 0.5;
          const righe = t.ac ? [m.ac, -m.ac, m.ac / Math.SQRT2] : [];
          c.beginPath();
          righe.forEach((v) => { const y = Math.round(z1 - v / s1 * dy) + 0.5; c.moveTo(mx, y); c.lineTo(W - mx, y); });
          c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
          if (t.ac && t.picco > 0) {
            scrivi(c, 'picco +' + fmt(t.picco, 'V'), W - mx - 6, z1 - m.ac / s1 * dy - 6, AMBRA);
            scrivi(c, 'efficace ' + fmt(stato.v, 'V'), W - mx - 6, z1 - m.ac / Math.SQRT2 / s1 * dy + 15, AMBRA);
            scrivi(c, 'picco −' + fmt(t.picco, 'V'), W - mx - 6, z1 + m.ac / s1 * dy + 15, AMBRA);
          } else if (!t.ac) {
            scrivi(c, fmt(stato.v, 'V') + ' costanti', W - mx - 6, z1 - m.dc / s1 * dy - 8, AMBRA);
          }
          if (t.ac && stato.f >= 20) {
            // il periodo, da un passaggio per lo zero al successivo
            const xT = mx + 10 * dx * (1 / stato.f) / FINESTRA;
            const y = H - my - 12;
            c.strokeStyle = CHIARO; c.globalAlpha = 0.7; c.lineWidth = 1.5;
            c.beginPath(); c.moveTo(mx + 2, y); c.lineTo(xT - 2, y); c.moveTo(mx + 2, y - 5); c.lineTo(mx + 2, y + 5); c.moveTo(xT - 2, y - 5); c.lineTo(xT - 2, y + 5); c.stroke();
            c.globalAlpha = 1;
            scrivi(c, 'T = ' + fmt(1 / stato.f, 's'), (mx + xT) / 2, y - 6, CHIARO, 'center');
          }
        } else {
          scrivi(c, 'primario', mx + 26, my + 18, AMBRA, 'left');
          scrivi(c, 'secondario', mx + 26, my + 4 * dy + 18, CH2, 'left');
          if (!t.ac) {
            const x = Math.round(mx + 10 * dx * T0 / FINESTRA) + 0.5;
            c.setLineDash([3, 4]); c.strokeStyle = CHIARO; c.globalAlpha = 0.45;
            c.beginPath(); c.moveTo(x, my); c.lineTo(x, H - my); c.stroke();
            c.setLineDash([]); c.globalAlpha = 1;
            scrivi(c, 'accensione', x + 6, H - my - 8, CHIARO, 'left');
          }
        }
        const spazzola = continuo() && !(tra && !t.ac);
        const r = (tSim - inizio) / FINESTRA;
        const testa = spazzola && r >= 0 && r <= 1;
        const xr = testa ? r : 1;
        if (potenza) {
          c.beginPath(); c.moveTo(PX[0], z1);
          for (let i = 0; i <= N; i++) c.lineTo(PX[i], YP[i]);
          c.lineTo(PX[N], z1); c.fillStyle = ARANCIO; c.globalAlpha = 0.13; c.fill(); c.globalAlpha = 1;
          traccia(c, YP, ARANCIO, spazzola, xr, 1.6);
        }
        traccia(c, Y1, AMBRA, spazzola, xr, 2.2);
        if (tra) traccia(c, Y2, CH2, spazzola, xr, 2.2);
        if (testa) {
          const i = Math.round(xr * N);
          punto(c, PX[i], Y1[i], AMBRA);
          if (tra) punto(c, PX[i], Y2[i], CH2);
          if (potenza) punto(c, PX[i], YP[i], ARANCIO);
        }
        if (potenza) scrivi(c, 'potenza nella lampada', mx + 26, my + 18, ARANCIO, 'left');
        c.restore();
        marca(c, mx, z1, '1', AMBRA);
        if (tra) marca(c, mx, z2, '2', CH2);
      }

      /* --- lampada, trasformatore, linea --- */
      function disegnaLampada() {
        let b = m.luce;
        if (stato.tipo === 'ac' && continuo()) b = 2 * m.luce * Math.pow(Math.sin(2 * Math.PI * stato.f * tSim), 2);
        const x = EB.clamp(b, 0, 1.6);
        alone.setAttribute('opacity', Math.min(1, Math.sqrt(x) * 0.95).toFixed(3));
        bagliore.setAttribute('opacity', Math.min(0.55, x * 0.45).toFixed(3));
        filamento.style.stroke = coloreFilamento(x);
      }

      function disegnaTrasf(dt) {
        const ac = stato.tipo === 'ac';
        let phi = 1;
        let doppia = false;
        let b2 = 0;
        if (ac && continuo()) {
          const a = 2 * Math.PI * stato.f * tSim;
          phi = -Math.cos(a);
          scorre -= phi * 70 * dt;
          b2 = 2 * m.luce2 * Math.pow(Math.sin(a), 2);
        } else if (ac) {
          doppia = true;
          b2 = m.luce2;
        } else {
          b2 = lampo;
        }
        const presente = ac ? (stato.v > 0 ? 1 : 0) : EB.clamp(m.dc / Math.max(1, stato.v), 0, 1);
        flusso.style.strokeDashoffset = scorre.toFixed(1);
        flusso.setAttribute('opacity', (presente * (doppia ? 0.75 : 0.3 + 0.7 * Math.abs(phi))).toFixed(3));
        frecce.forEach((f) => {
          f.el.setAttribute('d', doppia ? 'M-10 0 L-3 -5 V5 Z M10 0 L3 -5 V5 Z' : 'M-6 -6 L6 0 L-6 6 Z');
          f.el.setAttribute('transform', 'translate(' + f.x + ' ' + f.y + ') rotate(' + (f.a + (phi < 0 ? 180 : 0)) + ')');
          f.el.setAttribute('opacity', (presente * (doppia ? 0.9 : 0.25 + 0.75 * Math.abs(phi))).toFixed(3));
        });
        const x = EB.clamp(b2, 0, 1.6);
        aloneS.setAttribute('opacity', Math.min(1, Math.sqrt(x)).toFixed(3));
        lampS.style.fill = coloreFilamento(x);
      }

      function disegnaLinea(dt) {
        if (!lunghezza) lunghezza = cavo.getTotalLength();
        if (!lunghezza) return;
        const t = valori();
        if (!ctx.ridotto) fase = (fase + dt * 0.14) % 1;
        energia.forEach((e, k) => {
          const u = ((k + 0.5) / energia.length + fase) % 1;
          const p = cavo.getPointAtLength(u * lunghezza);
          const q = cavo.getPointAtLength(Math.min(lunghezza, u * lunghezza + 2));
          const a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
          e.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + a.toFixed(1) + ')');
          e.setAttribute('opacity', (t.quota >= 1 ? Math.max(0, 1 - u * 1.8) : 1 - t.quota * u * 0.9).toFixed(3));
        });
      }

      function disegna(dt) {
        if (stato.vista === 'lin') { disegnaLinea(dt); return; }
        disegnaSchermo();
        if (stato.vista === 'osc') disegnaLampada(); else disegnaTrasf(dt);
      }
      tela.alRidimensiona = () => disegnaSchermo();

      const ciclo = ctx.ciclo((dt) => {
        const k = 1 - Math.exp(-dt * 7);
        let fermo = true;
        Object.keys(bers).forEach((c) => {
          const d = bers[c] - m[c];
          if (Math.abs(d) > 1e-3 * Math.max(1, Math.abs(bers[c]))) { m[c] += d * k; fermo = false; } else m[c] = bers[c];
        });
        lampo *= Math.exp(-dt * 4.5);
        if (lampo > 0.01) fermo = false; else lampo = 0;
        if (continuo()) {
          fermo = false;
          tSim += dt / (stato.tipo === 'ac' ? stato.f : 50);
          if (tSim - inizio > FINESTRA) inizio = stato.tipo === 'ac' ? Math.ceil(tSim * stato.f) / stato.f : tSim;
        }
        disegna(dt);
        if (fermo) ciclo.ferma();
      });

      /* --- aggiornamento --- */
      function rapporto() {
        return stato.np >= stato.ns ? num(stato.np / stato.ns, 1) + ' : 1' : '1 : ' + num(stato.ns / stato.np, 1);
      }

      function bobina(g, xa, xb, n) {
        const k = giri(n);
        const passo = 100 / (k - 1);
        const sw = EB.clamp(26 / k, 1.8, 5).toFixed(1);
        const parti = [];
        for (let i = 0; i < k; i++) {
          const y = 90 + i * passo;
          parti.push(s('path', { d: 'M' + xa + ' ' + (y - 3).toFixed(1) + ' Q' + (xa + xb) / 2 + ' ' + (y + 6).toFixed(1) + ' ' + xb + ' ' + (y - 3).toFixed(1), 'stroke-width': sw }));
        }
        g.replaceChildren(...parti);
      }

      function aggiorna(origine) {
        const t = valori();
        const vis = stato.vista;
        const prima = { lampada: figLampada.hidden, trasf: figTrasf.hidden, linea: figLinea.hidden };
        banco.hidden = vis === 'lin';
        banco.classList.toggle('alt-due', vis === 'tra');
        figLampada.hidden = vis !== 'osc';
        figTrasf.hidden = vis !== 'tra';
        figLinea.hidden = vis !== 'lin';
        if (origine === 'vista' && !ctx.ridotto) {
          [[figLampada, prima.lampada], [figTrasf, prima.trasf], [figLinea, prima.linea]].forEach(([el, eraNascosto]) => {
            if (eraNascosto && !el.hidden) { el.classList.remove('alt-entra'); void el.offsetWidth; el.classList.add('alt-entra'); }
          });
        }
        Object.keys(celle).forEach((k) => { celle[k].hidden = !VISIBILI[vis].includes(k); });
        Object.keys(pann).forEach((k) => pann[k].forEach((x) => { x.el.hidden = k !== vis; }));
        curF.input.disabled = !t.ac;
        curF.el.classList.toggle('alt-spento', !t.ac);
        curV.el.querySelector('label span').textContent = t.ac ? 'Tensione efficace' : 'Tensione continua';
        const V = fmt(stato.v, 'V');

        // oscilloscopio e lampada
        const [lV, lPicco, lF] = pann.osc;
        lV.el.firstChild.textContent = t.ac ? 'Tensione efficace' : 'Tensione continua';
        lV.imposta(V);
        lPicco.imposta(fmt(t.picco, 'V'));
        lPicco.nota(t.ac ? 'efficace × √2' : 'sempre uguale');
        lF.imposta(t.ac ? fmt(stato.f, 'Hz') : '0 Hz');
        lF.nota(t.ac ? 'un ciclo ogni ' + fmt(1 / stato.f, 's') : 'nessun ciclo');
        simbolo1.setAttribute('d', t.ac ? ONDA : CONTINUA);
        simbolo2.setAttribute('d', t.ac ? ONDA : CONTINUA);
        sorgTesto.textContent = t.ac ? V + ' · ' + fmt(stato.f, 'Hz') : V + ' continui';
        const lampi = num(2 * stato.f, 0);
        didLampada.textContent = !t.ac ? 'Luce fissa: la tensione non cambia mai.'
          : !stato.lento ? lampi + ' picchi di luce al secondo: troppo rapidi per l\'occhio, la luce sembra fissa.'
            : ctx.ridotto ? 'Due massimi di luce per ciclo: guarda la curva arancione sullo schermo.'
              : 'Al rallentatore: due lampi per ciclo, uno a ogni picco, positivo o negativo.';
        lampada.setAttribute('aria-label', 'Una lampada collegata a una sorgente ' + (t.ac ? 'alternata di ' + V + ' efficaci a ' + fmt(stato.f, 'Hz') : 'continua di ' + V) + '.');

        // trasformatore
        const [lP, lS, lN] = pann.tra;
        lP.imposta(V);
        lP.nota(t.ac ? 'efficaci, alternata' : 'continua');
        lS.imposta(fmt(t.ac ? t.vs : 0, 'V'));
        lS.nota(t.ac ? 'efficaci' : 'dopo l\'impulso iniziale');
        lN.imposta(rapporto());
        lN.nota(stato.ns < stato.np ? 'abbassa la tensione' : stato.ns > stato.np ? 'alza la tensione' : 'tensione uguale');
        if (!origine || origine === 'np') bobina(bobinaP, 89, 135, stato.np);
        if (!origine || origine === 'ns') bobina(bobinaS, 225, 271, stato.ns);
        vpTesto.textContent = V;
        vsTesto.textContent = fmt(t.ac ? t.vs : 0, 'V');
        npTesto.textContent = 'Np = ' + num(stato.np, 0);
        nsTesto.textContent = 'Ns = ' + num(stato.ns, 0);
        lampTesto.textContent = t.ac && t.vs > 18 ? 'si brucerebbe' : 'lampada 12 V';
        didTrasf.textContent = (!t.ac ? 'Continua: il flusso nel ferro resta fermo e il secondario tace.'
          : stato.lento && !ctx.ridotto ? 'Al rallentatore: il flusso Φ cresce, cala e cambia verso nel ferro.'
            : 'Il flusso Φ cambia verso ' + lampi + ' volte al secondo.') + ' Spire disegnate non in scala.';
        trasf.setAttribute('aria-label', 'Trasformatore: primario di ' + num(stato.np, 0) + ' spire collegato a ' + V + (t.ac ? ' alternati' : ' continui') + ', secondario di ' + num(stato.ns, 0) + ' spire che dà ' + fmt(t.ac ? t.vs : 0, 'V') + '.');

        // linea
        const assurdo = t.quota >= 1;
        const [lL, lI, lPer] = pann.lin;
        lL.imposta(fmt(stato.vl, 'V'));
        lI.imposta(fmt(t.corrente, 'A'));
        lI.nota('per portare ' + fmt(P_LINEA, 'W'));
        lPer.imposta(assurdo ? 'impossibile' : fmt(t.perdita, 'W'));
        lPer.nota(assurdo ? 'il calcolo dà ' + fmt(t.perdita, 'W') : num(t.quota * 100, 2) + '% della potenza');
        tagV.textContent = fmt(stato.vl, 'V');
        tagI.textContent = fmt(t.corrente, 'A');
        tagP.textContent = assurdo ? 'perdite oltre il 100%' : 'perdite ' + num(t.quota * 100, 2) + '%';
        avviso.style.display = assurdo ? '' : 'none';
        const calore = EB.clamp(Math.sqrt(t.quota / 0.3), 0, 1);
        lineaSvg.style.setProperty('--alt-calore', calore.toFixed(3));
        lineaSvg.classList.toggle('alt-caldo', calore > 0.35);
        finestre.forEach((f) => f.setAttribute('opacity', assurdo ? '.1' : '1'));
        didLinea.textContent = assurdo ? 'Con questa tensione la corrente sarebbe così alta che i cavi non potrebbero portarla.' : 'Le frecce arancioni sono l\'energia che viaggia verso la città.';
        lineaSvg.setAttribute('aria-label', 'Linea elettrica a ' + fmt(stato.vl, 'V') + ' tra la centrale e la città: corrente ' + fmt(t.corrente, 'A') + ', perdite ' + (assurdo ? 'impossibili, oltre la potenza trasportata' : fmt(t.perdita, 'W')) + '.');

        // formula
        if (vis === 'osc') {
          formula.imposta(t.ac ? [['Vpicco', 'v'], ' = ', ['Veff', 'v'], ' · √2', '\n', '= ', [V, 'v'], ' · √2 = ', [fmt(t.picco, 'V'), 'v']]
            : [['V', 'v'], ' = ', [V, 'v'], '\n', 'in ogni istante']);
        } else if (vis === 'tra') {
          formula.imposta(t.ac ? [['Vs', 'v'], ' = ', ['Vp', 'v'], ' · ', ['Ns', 'b'], ' / ', ['Np', 'b'], '\n', '= ', [V, 'v'], ' · ', [num(stato.ns, 0), 'b'], ' / ', [num(stato.np, 0), 'b'], ' = ', [fmt(t.vs, 'V'), 'v']]
            : [['Vs', 'v'], ' = ', ['0 V', 'v'], '\n', 'il flusso ', ['Φ', 'b'], ' non cambia']);
        } else {
          formula.imposta([['I', 'i'], ' = ', ['P', 'p'], ' / ', ['V', 'v'], ' = ', [fmt(t.corrente, 'A'), 'i'], '\n', ['P', 'p'], ' perse = ', ['R', 'r'], ' · ', ['I', 'i'], '²', '\n', '= ', [fmt(R_LINEA, 'Ω'), 'r'], ' · (', [fmt(t.corrente, 'A'), 'i'], ')² = ', [fmt(t.perdita, 'W'), 'p']]);
        }

        // schermo
        const quadretti = vis === 'tra' ? 1.7 : 3.6;
        bers.dc = t.ac ? 0 : stato.v;
        bers.ac = t.ac ? t.picco : 0;
        bers.ac2 = t.ac ? t.picco2 : 0;
        bers.imp = t.ac ? 0 : t.vs;
        bers.lf = Math.log(stato.f);
        bers.s1 = Math.log(scalaPer(Math.max(t.picco, 0.01), quadretti));
        bers.s2 = Math.log(scalaPer(Math.max(t.picco2, 0.01), 1.7));
        bers.luce = Math.min(1.3, Math.pow(stato.v / 230, 2));
        bers.luce2 = t.ac ? Math.min(1.3, Math.pow(t.vs / 12, 2)) : 0;
        bers.calore = calore;
        const parti = [h('span', null, h('b', null, 'CH1'), ' ' + fmt(Math.exp(bers.s1), 'V') + '/div')];
        if (vis === 'tra') parti.push(h('span', { class: 'alt-ch2' }, h('b', null, 'CH2'), ' ' + fmt(Math.exp(bers.s2), 'V') + '/div'));
        parti.push(h('span', null, MS_DIV + ' ms/div'));
        if (vis === 'tra' && !t.ac) parti.push(h('span', null, 'cattura dell\'accensione, impulso non in scala'));
        else if (stato.lento && !ctx.ridotto) parti.push(h('span', { class: 'alt-lento' }, 'rallentato ' + num(t.ac ? stato.f : 50, 0) + ' volte'));
        info.replaceChildren(...parti);
        tela.canvas.setAttribute('aria-label', 'Oscilloscopio, ' + MS_DIV + ' ms per quadretto. ' + (vis === 'tra'
          ? 'Traccia 1, primario: ' + (t.ac ? 'sinusoide di ' + V + ' efficaci' : 'gradino a ' + V + ' all\'accensione') + '. Traccia 2, secondario: ' + (t.ac ? 'sinusoide di ' + fmt(t.vs, 'V') + ' efficaci.' : 'un breve impulso, poi zero.')
          : t.ac ? 'Sinusoide di ' + V + ' efficaci, picco ' + fmt(t.picco, 'V') + ', ' + fmt(stato.f, 'Hz') + '.' : 'Riga piatta a ' + V + '.'));

        if (origine) {
          sfide(t);
          clearTimeout(timerNota);
          timerNota = setTimeout(nota, ['v', 'f', 'np', 'ns'].includes(origine) ? 350 : 0, origine);
        }
        if (ctx.ridotto) {
          Object.assign(m, bers);
          disegna(0);
        } else {
          ciclo.avvia();
        }
      }

      /* --- sfide e note --- */
      const rete = (t) => t.ac && Math.abs(stato.v - 230) <= 2.3 && stato.f === 50;

      function sfide(t) {
        if (rete(t)) ctx.completa('rete');
        if (stato.vista === 'tra' && !t.ac && stato.v > 0) ctx.completa('continua');
        if (stato.vista === 'tra' && t.ac && Math.abs(stato.v - 230) <= 2.3 && Math.abs(t.vs - 12) <= 0.36) ctx.completa('dodici-volt');
        if (stato.vista === 'lin' && t.quota < 0.01) ctx.completa('linea');
      }

      function notaOscilloscopio(t, origine, p) {
        const V = '**' + fmt(stato.v, 'V') + '**';
        if (!t.ac) {
          if (stato.v === 0) return 'Tensione zero: la traccia è sulla riga centrale e la lampada è spenta.';
          if (origine === 'tipo') return 'Di nuovo continua a ' + V + ': la riga torna piatta e la lampada fa la **stessa luce** che con ' + fmt(stato.v, 'V') + ' efficaci in alternata. Il valore efficace è proprio questo: la tensione continua che scalda allo stesso modo.';
          if (origine === 'lento') return stato.lento ? 'Rallentatore acceso: in continua non c\'è niente da rallentare, la riga e la luce restano ferme.' : 'Velocità reale: in continua non cambia nulla.';
          return 'Continua a ' + V + ': sullo schermo la tensione è una riga piatta, sempre alla stessa altezza, e la lampada fa una luce fissa. Passa ad **Alternata** e confronta.';
        }
        const picco = '**' + fmt(t.picco, 'V') + '**';
        const giro = fmt(1 / stato.f, 's');
        if (origine === 'lento') {
          if (!stato.lento) return 'Velocità reale: la lampada riceve **' + num(2 * stato.f, 0) + ' picchi di potenza al secondo**, troppi per l\'occhio, e la luce sembra fissa.';
          if (ctx.ridotto) return 'Sullo schermo compare la potenza nella lampada (curva arancione): ha **2 massimi per ciclo**, uno a ogni picco, positivo o negativo. A ' + fmt(stato.f, 'Hz') + ' sono **' + num(2 * stato.f, 0) + ' al secondo**, troppo rapidi perché l\'occhio li veda.';
          return 'Rallentatore acceso: il tempo scorre **' + num(stato.f, 0) + ' volte** più piano, un ciclo al secondo. La lampada si accende di più a ogni picco, positivo o negativo: **2 lampi per ciclo**. A velocità reale sarebbero **' + num(2 * stato.f, 0) + ' al secondo**, troppo rapidi perché l\'occhio li veda.';
        }
        if (rete(t)) return 'Ecco la presa di casa: **230 V efficaci a 50 Hz**. Il picco vale 230 V × √2, circa **325 V**; ogni ciclo dura **20 ms** e sullo schermo, a 5 ms per quadretto, ne entrano due e mezzo.';
        if (origine === 'tipo') return 'Alternata a ' + V + ' efficaci: la tensione sale fino a +' + picco + ', scende a −' + picco + ' e cambia verso **' + num(2 * stato.f, 0) + ' volte al secondo**. La lampada fa la stessa luce di prima: ' + fmt(stato.v, 'V') + ' efficaci scaldano come ' + fmt(stato.v, 'V') + ' continui.';
        if (origine === 'v' && p.v !== stato.v && p.tipo === 'ac') return 'Tensione efficace da **' + fmt(p.v, 'V') + '** a ' + V + ': il picco passa da **' + fmt(F.piccoDaEfficace(p.v), 'V') + '** a ' + picco + '. Il picco è sempre √2 volte, circa 1,41 volte, il valore efficace.';
        if (origine === 'f' && p.f !== stato.f) return 'Frequenza da **' + fmt(p.f, 'Hz') + '** a **' + fmt(stato.f, 'Hz') + '**: ogni ciclo dura **' + giro + '** invece di ' + fmt(1 / p.f, 's') + ', e sullo schermo ne entrano **' + num(stato.f * FINESTRA, 1) + '** invece di ' + num(p.f * FINESTRA, 1) + '.';
        return 'Alternata a ' + V + ' efficaci e ' + fmt(stato.f, 'Hz') + ': picco ' + picco + ', un ciclo ogni ' + giro + '.';
      }

      function notaTrasformatore(t, origine, p) {
        if (!t.ac) {
          if (stato.v === 0) return 'Con zero volt non succede niente: alza la tensione.';
          return 'Trasformatore in **continua**: all\'accensione il flusso nel ferro cresce e il secondario dà un breve impulso (traccia 2); poi il flusso resta fermo e il secondario dà **0 V**. Senza un flusso che cambia non c\'è tensione indotta. In un trasformatore vero la continua è frenata solo dalla resistenza del filo: il primario si scalda e può bruciarsi.';
        }
        const perSpira = stato.v / stato.np;
        const vs = '**' + fmt(t.vs, 'V') + '**';
        const base = 'ogni spira raccoglie **' + fmt(perSpira, 'V', { prefissi: false }) + '** e le ' + num(stato.ns, 0) + ' spire del secondario danno ' + vs + '.';
        let testo;
        if (stato.v === 0) testo = 'Con zero volt nel primario il flusso non cambia e il secondario resta a zero.';
        else if (Math.abs(stato.v - 230) <= 2.3 && Math.abs(t.vs - 12) <= 0.36) testo = '**12 V** dai 230 V della rete: il secondario ha circa **' + num(stato.np / stato.ns, 0) + ' volte** meno spire del primario. È il lavoro dei trasformatori per le lampade alogene da 12 V.';
        else if (origine === 'ns' && p.ns !== stato.ns) testo = 'Spire del secondario da ' + num(p.ns, 0) + ' a **' + num(stato.ns, 0) + '**: ' + base;
        else if (origine === 'np' && p.np !== stato.np) testo = 'Spire del primario da ' + num(p.np, 0) + ' a **' + num(stato.np, 0) + '**: il flusso per spira cambia, ora ' + base;
        else testo = 'Il primario, **' + num(stato.np, 0) + ' spire** a **' + fmt(stato.v, 'V') + '**, crea nel ferro un flusso che cambia di continuo: ' + base;
        if (stato.ns > stato.np && stato.v > 0) testo += ' Con più spire nel secondario il trasformatore **alza** la tensione.';
        return testo;
      }

      function notaLinea(t, p) {
        const V = '**' + fmt(stato.vl, 'V') + '**';
        const I = '**' + num(t.corrente, 0) + ' A**';
        if (t.quota >= 1) return 'A ' + V + ' servirebbero ' + I + ' e il calcolo darebbe **' + fmt(t.perdita, 'W') + '** di perdite, più dei 100 MW da trasportare. Non è un risultato possibile: vuol dire che con questa tensione la linea non può funzionare. I cavi si surriscalderebbero e la tensione crollerebbe prima della città.';
        let testo = 'A ' + V + ', per portare 100 MW servono ' + I + ': i cavi da 10 Ω ne trasformano in calore **' + fmt(t.perdita, 'W') + '**, ' + (t.quota < 0.01 ? 'lo' : 'il') + ' **' + num(t.quota * 100, 2) + '%**.';
        const qPrima = F.perditaLinea(P_LINEA, p.vl, R_LINEA) / P_LINEA;
        if (p.vl !== stato.vl && qPrima < 1) {
          const r = stato.vl / p.vl;
          testo += r > 1 ? ' Rispetto a ' + fmt(p.vl, 'V') + ': tensione ×' + num(r, 1) + ', corrente ÷' + num(r, 1) + ', perdite ÷' + num(r * r, 1) + '.'
            : ' Rispetto a ' + fmt(p.vl, 'V') + ': tensione ÷' + num(1 / r, 1) + ', corrente ×' + num(1 / r, 1) + ', perdite ×' + num(1 / (r * r), 1) + '.';
        }
        if (t.quota < 0.01) testo += ' Sotto l\'1%: per questo le grandi linee lavorano a centinaia di migliaia di volt.';
        return testo;
      }

      function nota(origine) {
        const t = valori();
        const testo = stato.vista === 'lin' ? notaLinea(t, notato) : stato.vista === 'tra' ? notaTrasformatore(t, origine, notato) : notaOscilloscopio(t, origine, notato);
        notato = Object.assign({}, stato);
        if (testo === ultimaNota) return;
        ultimaNota = testo;
        ctx.nota(testo);
      }
      ctx.pulizia(() => clearTimeout(timerNota));

      aggiorna();
      ctx.nota(ultimaNota = notaOscilloscopio(valori(), null, notato));
      return { distruggi() { clearTimeout(timerNota); } };
    },
  });
})();
