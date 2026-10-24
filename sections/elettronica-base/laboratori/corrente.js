/*
 * Laboratorio "Dentro il filo" (capitolo 2).
 * In alto il circuito: pile da 1,5 V in serie, un interruttore e una lampadina da 3 Ω.
 * Sotto, ingrandito, il tratto di filo evidenziato: ioni di rame che vibrano nel reticolo
 * ed elettroni liberi in agitazione disordinata, con una lenta deriva quando passa corrente.
 * Sullo schermo l'agitazione è rallentata e la deriva esagerata (lo dice la legenda);
 * le letture usano i valori veri: I = V / R e v = I / (n · e · S).
 */
(function () {
  'use strict';

  const V_PILA = 1.5;
  const R_LAMPADA = 3;
  const SEZIONI = [0.5, 1, 2.5]; // mm²
  const V_RIF = EBFisica.velocitaDeriva(1, 1e-6); // 1 A in 1 mm²: circa 0,0735 mm/s
  const H = 182; // altezza del disegno del circuito, in unità del viewBox
  const Y_SU = 70;
  const Y_GIU = 134;
  const CELLA = 30;
  const APERTO = -32; // gradi della lama aperta
  const AGITAZIONE = 3.2; // passi del reticolo al secondo (rallentata)
  const LIBERO = 0.32; // tempo medio fra due urti, in secondi (rallentato)
  const IMPULSO = 0.6; // secondi per mezzo giro della spinta (rallentata)
  const NB = '\u00a0';

  function durata(sec) {
    let ore = Math.floor(sec / 3600);
    let min = Math.round((sec - ore * 3600) / 60);
    if (min === 60) { ore += 1; min = 0; }
    if (!ore) return min + NB + 'min';
    return ore + NB + 'h' + (min ? ' ' + min + NB + 'min' : '');
  }

  function fattore(k) {
    const f = (x) => EBFisica.numero(x, Math.abs(x - Math.round(x)) > 0.01 ? 1 : 0);
    return k >= 1 ? '×' + f(k) : '÷' + f(1 / k);
  }

  function rgba(hex, a) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    const n = m ? parseInt(m[1], 16) : 0x5cc8ff;
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // Numeri pseudo-casuali ripetibili: la versione statica disegna sempre lo stesso cammino.
  function semeCasuale(seme) {
    let x = seme >>> 0;
    return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  }

  function coloreFilamento(b) {
    const mix = (a, c, t) => a.map((x, k) => Math.round(x + (c[k] - x) * t));
    const c = b < 0.5 ? mix([96, 84, 72], [255, 140, 60], b / 0.5) : mix([255, 140, 60], [255, 241, 205], (b - 0.5) / 0.5);
    return 'rgb(' + c.join(',') + ')';
  }

  EB.laboratorio('corrente', {
    monta(ctx) {
      const { h, s, fmt, num, F } = ctx;
      const stato = { chiuso: false, pile: 2, sezione: 1, verso: false };
      const corrente = () => (stato.chiuso ? stato.pile * V_PILA / R_LAMPADA : 0);
      const deriva = () => F.velocitaDeriva(corrente(), stato.sezione * 1e-6);
      const mmS = (v) => F.formatta(v * 1000, 'mm/s', { prefissi: false });
      const sezT = (a) => num(a, a % 1 ? 1 : 0) + NB + 'mm²';
      const stile = getComputedStyle(ctx.box);
      const tok = (n, d) => stile.getPropertyValue(n).trim() || d;
      const NEG = tok('--lab-neg', '#5cc8ff');
      const COL_I = tok('--lab-i', '#5cc8ff');
      const POS = tok('--lab-pos', '#ff6b5b');
      const RAME = tok('--rame', '#c87533');
      const FORTE = tok('--lab-strong', '#eef6f2');
      const TESTO = tok('--lab-text', '#a9c3b9');
      const FONDO = tok('--lab-bg', '#0b1210');
      const FONT = tok('--font', 'system-ui, sans-serif');
      const SERIF = tok('--serif', 'Georgia, serif');
      const attr = (el, nome, v) => { if (el['_' + nome] !== v) { el['_' + nome] = v; el.setAttribute(nome, v); } };

      // Stato mostrato: insegue quello vero con un po' di inerzia.
      const mostrato = { pile: stato.pile, sez: stato.sezione, ang: APERTO, luce: 0, deriva: 0, verso: 0, impulso: -1 };
      let raggiuntaLampada = false;
      let raggiuntoTratto = false;

      /* --- il circuito --- */
      const gid = EB.uid('cor');
      const svg = s('svg', { class: 'cor-circuito', role: 'img' });
      const cono = s('path', { class: 'cor-cono', fill: 'url(#' + gid + '-cono)' });
      const conoBordi = s('path', { class: 'cor-cono-bordo' });
      const filo = s('path', { class: 'cor-filo' });
      const filoRame = s('path', { class: 'cor-filo-rame' });
      const impulsi = [s('path', { class: 'cor-impulso' }), s('path', { class: 'cor-impulso' })];
      const tratto = s('g', null,
        s('rect', { x: -32, y: -9, width: 64, height: 18, rx: 9, class: 'cor-tratto' }),
        s('text', { y: -16, 'text-anchor': 'middle', class: 'cor-etichetta cor-rame' }, 'tratto ingrandito'));
      const frecceI = [0, 1, 2, 3].map(() => s('path', { d: 'M-6 -5.5 L7 0 L-6 5.5 Z', class: 'cor-freccia' }));
      const frecciaT = s('text', { class: 'cor-freccia-t' }, 'I');
      const frecce = s('g', { opacity: 0 }, frecceI, frecciaT);

      const celle = [0, 1, 2, 3].map((k) => s('g', { transform: 'translate(' + (-k * (CELLA + 2)) + ' 0)' },
        s('rect', { x: -CELLA, y: -8, width: CELLA - 3, height: 16, rx: 3.5, class: 'cor-cella' }),
        s('rect', { x: -CELLA + 4, y: -2.5, width: CELLA - 13, height: 5, rx: 2.5, class: 'cor-cella-carica' }),
        s('rect', { x: -3.5, y: -4.5, width: 3.5, height: 9, rx: 1, class: 'cor-cella-polo' })));
      const meno = s('text', { y: -14, 'text-anchor': 'middle', class: 'cor-segno neg' }, '−');
      const pilaTesto = s('text', { y: 26, 'text-anchor': 'middle', class: 'cor-pila-testo' });
      const pila = s('g', null, celle, s('text', { x: -7, y: -14, 'text-anchor': 'middle', class: 'cor-segno pos' }, '+'), meno, pilaTesto);

      const lama = s('g', { transform: 'rotate(' + APERTO + ')' },
        s('line', { x1: 0, y1: 0, x2: 40, y2: 0, class: 'cor-lama' }),
        s('circle', { cx: 33, cy: 0, r: 3.6, class: 'cor-pomello' }));
      const interr = s('g', { class: 'cor-interruttore', onclick: () => impostaChiuso(!stato.chiuso, true) },
        s('rect', { x: -16, y: -44, width: 72, height: 60, class: 'cor-presa' }),
        s('circle', { cx: 40, cy: 0, r: 4.5, class: 'cor-morsetto' }),
        lama,
        s('circle', { cx: 0, cy: 0, r: 4.5, class: 'cor-morsetto' }),
        s('text', { x: 20, y: 26, 'text-anchor': 'middle', class: 'cor-etichetta' }, 'interruttore'));

      const alone = s('circle', { cy: -36, r: 31, fill: 'url(#' + gid + '-alone)', opacity: 0 });
      const filamento = s('path', { d: 'M-5 -31 L-3.3 -37 L-1.7 -31 L0 -37 L1.7 -31 L3.3 -37 L5 -31', class: 'cor-filamento' });
      const lampada = s('g', null, alone,
        s('rect', { x: -17, y: -5, width: 34, height: 10, rx: 3, class: 'cor-portalampada' }),
        s('rect', { x: -7.5, y: -18, width: 15, height: 13, rx: 2, class: 'cor-attacco' }),
        s('path', { d: 'M-7.5 -14.5 H7.5 M-7.5 -10.5 H7.5', class: 'cor-filetto' }),
        s('path', { d: 'M-6.5 -18 C-6.5 -23 -15 -27 -15 -36 A15 15 0 1 1 15 -36 C15 -27 6.5 -23 6.5 -18 Z', class: 'cor-vetro' }),
        s('path', { d: 'M-4 -18 L-5 -31 M4 -18 L5 -31', class: 'cor-supporto' }),
        filamento,
        s('text', { y: 26, 'text-anchor': 'middle', class: 'cor-etichetta' }, 'lampadina ', s('tspan', { class: 'cor-ohm' }, '3' + NB + 'Ω')));

      svg.append(
        s('defs', null,
          s('radialGradient', { id: gid + '-alone' },
            s('stop', { offset: 0, class: 'cor-alone-1' }), s('stop', { offset: 0.4, class: 'cor-alone-2' }), s('stop', { offset: 1, class: 'cor-alone-3' })),
          s('linearGradient', { id: gid + '-cono', x1: 0, y1: 0, x2: 0, y2: 1 },
            s('stop', { offset: 0, class: 'cor-cono-1' }), s('stop', { offset: 1, class: 'cor-cono-2' }))),
        cono, conoBordi, filo, filoRame, impulsi, tratto, frecce, pila, interr, lampada);

      // Il disegno si allarga con lo schermo senza ingrandire i testi.
      const geo = { w: 420, xL: 24, xR: 396, xT: 210, xPiu: 172, x1: 235, x2: 275, xLamp: 338, lungo: 1, sLamp: 1, sTratto: 1 };
      let pileDisegnate = -1;
      // Dal contatto dell'interruttore, attorno all'anello, fino all'angolo in alto a sinistra.
      function percorsoFisso() {
        const xR = geo.xR.toFixed(1);
        const xL = geo.xL;
        return `M${geo.x2.toFixed(1)} ${Y_SU} H${(geo.xR - 12).toFixed(1)} Q${xR} ${Y_SU} ${xR} ${Y_SU + 12} V${Y_GIU - 12} ` +
          `Q${xR} ${Y_GIU} ${(geo.xR - 12).toFixed(1)} ${Y_GIU} H${xL + 12} Q${xL} ${Y_GIU} ${xL} ${Y_GIU - 12} V${Y_SU + 12} Q${xL} ${Y_SU} ${xL + 12} ${Y_SU}`;
      }
      function disegnaFili() {
        if (Math.abs(mostrato.pile - pileDisegnate) < 0.002) return;
        pileDisegnate = mostrato.pile;
        const xMeno = geo.xPiu - mostrato.pile * (CELLA + 2) + 2;
        const d = percorsoFisso() + ' H' + xMeno.toFixed(1) + ' M' + geo.xPiu.toFixed(1) + ' ' + Y_SU + ' H' + geo.x1.toFixed(1);
        filo.setAttribute('d', d);
        filoRame.setAttribute('d', d);
        meno.setAttribute('x', (xMeno - geo.xPiu + 7).toFixed(1));
        pilaTesto.setAttribute('x', ((xMeno - geo.xPiu) / 2).toFixed(1));
        celle.forEach((c, k) => attr(c, 'opacity', EB.clamp(mostrato.pile - k, 0, 1).toFixed(2)));
      }
      function disponi(px) {
        const sc = EB.clamp(px / 640, 0.8, 1.15);
        const w = px / sc;
        const extra = Math.max(0, w - 420);
        Object.assign(geo, { w: w, xL: 24, xR: w - 24, xT: w / 2, xPiu: 172 + extra * 0.25, xLamp: w - 82 - extra * 0.12 });
        geo.x1 = (geo.xPiu + geo.xLamp) / 2 - 20;
        geo.x2 = geo.x1 + 40;
        svg.setAttribute('viewBox', '0 0 ' + w.toFixed(1) + ' ' + H);
        svg.style.height = (H * sc).toFixed(1) + 'px';
        const sposta = (el, x, y) => el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y + ')');
        sposta(pila, geo.xPiu, Y_SU);
        sposta(interr, geo.x1, Y_SU);
        sposta(lampada, geo.xLamp, Y_SU);
        sposta(tratto, geo.xT, Y_GIU);
        const r = 12 / sc;
        const a = geo.xT - 32;
        const b = geo.xT + 32;
        const y = Y_GIU + 9;
        cono.setAttribute('d', 'M' + a + ' ' + y + ' H' + b + ' L' + (w - r) + ' ' + H + ' H' + r + ' Z');
        conoBordi.setAttribute('d', 'M' + a + ' ' + y + ' L' + r + ' ' + H + ' M' + b + ' ' + y + ' L' + (w - r) + ' ' + H);
        const ym = (Y_SU + Y_GIU) / 2;
        [[(geo.xPiu + geo.x1) / 2, Y_SU, 0], [geo.xR, ym, 90], [(geo.xL + a) / 2, Y_GIU, 180], [geo.xL, ym, -90]].forEach(([x, yy, ang], k) => {
          frecceI[k].setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + yy + ') rotate(' + ang + ')');
        });
        frecciaT.setAttribute('x', (geo.xR + 10).toFixed(1));
        frecciaT.setAttribute('y', ym + 5);
        impulsi.forEach((p) => p.setAttribute('d', percorsoFisso() + ' H' + geo.x1.toFixed(1)));
        geo.lungo = impulsi[0].getTotalLength() || 1;
        impulsi.forEach((p) => p.setAttribute('stroke-dasharray', '46 ' + Math.ceil(geo.lungo)));
        geo.sLamp = geo.xLamp - geo.x2;
        const salita = Y_GIU - Y_SU;
        geo.sTratto = Math.min(geo.xR - geo.x2 + salita + geo.xR - geo.xT, geo.x1 - geo.xL + salita + geo.xT - geo.xL);
        pileDisegnate = -1;
        disegnaFili();
      }

      const avanzamento = () => { const u = Math.min(1, mostrato.impulso / IMPULSO); return 1 - (1 - u) * (1 - u); };
      function scriviSvg() {
        disegnaFili();
        attr(lama, 'transform', 'rotate(' + mostrato.ang.toFixed(1) + ')');
        const nucleo = 1.6 * Math.sqrt(mostrato.sez / 0.5);
        attr(filoRame, 'stroke-width', nucleo.toFixed(2));
        attr(filo, 'stroke-width', (nucleo + 4.5).toFixed(2));
        attr(alone, 'opacity', (0.95 * mostrato.luce).toFixed(3));
        attr(filamento, 'stroke', coloreFilamento(mostrato.luce));
        attr(lampada, 'class', mostrato.luce > 0.05 ? 'cor-accesa' : 'cor-spenta');
        attr(frecce, 'opacity', mostrato.verso.toFixed(3));
        if (mostrato.impulso >= 0) {
          const p = avanzamento();
          const q = p * geo.lungo / 2;
          attr(impulsi[0], 'stroke-dashoffset', (23 - q).toFixed(1));
          attr(impulsi[1], 'stroke-dashoffset', (23 - geo.lungo + q).toFixed(1));
          const op = (p < 0.7 ? 1 : Math.max(0, (1 - p) / 0.3)).toFixed(2);
          impulsi.forEach((x) => attr(x, 'opacity', op));
        } else {
          impulsi.forEach((x) => attr(x, 'opacity', '0'));
        }
      }

      /* --- il filo ingrandito --- */
      const lente = h('div', { class: 'cor-lente' });
      const voce = (cls, testo) => h('span', null, h('span', { class: 'cor-sw ' + cls, 'aria-hidden': 'true' }), testo);
      const legenda = h('p', { class: 'cor-legenda' },
        voce('cor-sw-ione', ctx.ridotto ? 'ione di rame (+)' : 'ione di rame (+): vibra attorno al suo posto'),
        voce('cor-sw-el', ctx.ridotto ? 'elettrone libero (−), con la direzione della sua agitazione' : 'elettrone libero (−)'),
        voce('cor-sw-seguito', ctx.ridotto ? 'zigzag: il cammino di un elettrone fra un urto e l\'altro; la freccia tratteggiata indica di quanto avanza in media' : 'un elettrone seguito, con la sua scia'),
        h('span', null, 'Due ioni vicini distano circa 0,26' + NB + 'nm. Velocità non in scala: l\'agitazione è rallentata, la deriva esagerata.'));
      const scena = h('div', { class: 'cor-scena' }, svg, lente, legenda);
      ctx.scena.append(scena);
      const tela = EB.tela(lente, { rapporto: 2.35, min: 210, max: 340, etichetta: 'Il filo di rame ingrandito' });
      ctx.pulizia(() => tela.distruggi());
      const g = tela.ctx;

      let passo = 30; // distanza fra due ioni vicini, in pixel
      let rI = 8;
      let rE = 4;
      let ioni = [];
      let elettroni = [];
      let spriteIone = null;
      let spriteEl = null;
      let statico = null; // cammino a zigzag della versione statica
      let fase = 0; // quanto è avanzata la deriva sullo schermo
      let sciaT = 0;
      const scia = [];
      const rnd = Math.random;

      // Ioni ed elettroni si disegnano da piccole tele già pronte.
      function sprite(raggio, disegnaSprite) {
        const c = document.createElement('canvas');
        c.width = c.height = Math.ceil(raggio * 2 * (tela.dpr || 1));
        const x = c.getContext('2d');
        x.scale(c.width / (raggio * 2), c.width / (raggio * 2));
        disegnaSprite(x, raggio);
        c.lato = raggio * 2;
        return c;
      }
      function preparaSprite() {
        rI = passo * 0.2;
        rE = Math.max(3.8, passo * 0.13);
        spriteIone = sprite(rI + 1, (x, R) => {
          const gr = x.createRadialGradient(R - rI * 0.35, R - rI * 0.4, rI * 0.1, R, R, rI);
          gr.addColorStop(0, '#d99a6c');
          gr.addColorStop(0.6, '#9a5428');
          gr.addColorStop(1, '#4a230c');
          x.globalAlpha = 0.62;
          x.fillStyle = gr;
          x.beginPath(); x.arc(R, R, rI, 0, 2 * Math.PI); x.fill();
          x.globalAlpha = 1;
          x.strokeStyle = rgba(POS, 0.4); x.lineWidth = 1; x.stroke();
          const l = rI * 0.45;
          x.strokeStyle = 'rgba(255, 228, 210, .72)'; x.lineWidth = Math.max(1.2, rI * 0.16); x.lineCap = 'round';
          x.beginPath(); x.moveTo(R - l, R); x.lineTo(R + l, R); x.moveTo(R, R - l); x.lineTo(R, R + l); x.stroke();
        });
        spriteEl = sprite(rE + 3, (x, R) => {
          const al = x.createRadialGradient(R, R, rE * 0.5, R, R, R);
          al.addColorStop(0, rgba(NEG, 0.6)); al.addColorStop(1, rgba(NEG, 0));
          x.fillStyle = al; x.fillRect(0, 0, 2 * R, 2 * R);
          const gr = x.createRadialGradient(R - rE * 0.3, R - rE * 0.35, 0, R, R, rE);
          gr.addColorStop(0, '#eaf8ff'); gr.addColorStop(0.5, NEG); gr.addColorStop(1, '#2a86b5');
          x.fillStyle = gr;
          x.beginPath(); x.arc(R, R, rE, 0, 2 * Math.PI); x.fill();
          x.strokeStyle = '#03121a'; x.lineWidth = Math.max(1.1, rE * 0.3); x.lineCap = 'round';
          x.beginPath(); x.moveTo(R - rE * 0.5, R); x.lineTo(R + rE * 0.5, R); x.stroke();
        });
      }

      // Modello di Drude in miniatura: tratti dritti, poi un urto e una direzione nuova.
      function urto(e) {
        const a = rnd() * 2 * Math.PI;
        const v = AGITAZIONE * passo * (0.75 + rnd() * 0.5);
        e.vx = Math.cos(a) * v;
        e.vy = Math.sin(a) * v;
        e.t = 0.06 - Math.log(1 - rnd()) * LIBERO;
      }
      function popola(w, hh) {
        passo = EB.clamp(w / 19, 30, 42);
        preparaSprite();
        const dy = passo * Math.sqrt(3) / 2;
        const col = Math.ceil(w / passo) + 1;
        const righe = Math.ceil(hh / dy) + 1;
        const x0 = (w - (col - 1) * passo) / 2 - passo / 4;
        const y0 = (hh - (righe - 1) * dy) / 2;
        ioni = [];
        for (let r = 0; r < righe; r++) {
          for (let c = 0; c < col; c++) ioni.push({ x: x0 + (c + (r % 2) / 2) * passo, y: y0 + r * dy, f1: 5 + rnd() * 4, f2: 5 + rnd() * 4, p1: rnd() * 7, p2: rnd() * 7 });
        }
        elettroni = ioni.map(() => { const e = { x: rnd() * w, y: rnd() * hh }; urto(e); return e; });
        elettroni[0].x = w * 0.3;
        elettroni[0].y = hh * 0.55;
        scia.length = 0;
      }

      // Deriva sullo schermo, in passi del reticolo al secondo: proporzionale a quella vera.
      const derivaVis = () => (stato.chiuso && (ctx.ridotto || raggiuntoTratto) ? deriva() / V_RIF : 0);

      function muovi(dt) {
        const w = tela.w;
        const hh = tela.h;
        const vd = mostrato.deriva * passo;
        fase += vd * dt;
        for (let k = 0; k < elettroni.length; k++) {
          const e = elettroni[k];
          e.t -= dt;
          if (e.t <= 0) urto(e);
          e.x += (e.vx + vd) * dt;
          e.y += e.vy * dt;
          let salto = true;
          if (e.x < -6) e.x += w + 12;
          else if (e.x > w + 6) e.x -= w + 12;
          else if (e.y < -6) e.y += hh + 12;
          else if (e.y > hh + 6) e.y -= hh + 12;
          else salto = false;
          if (k === 0 && salto) scia.push(null);
        }
        sciaT += dt;
        if (sciaT >= 1 / 30) {
          sciaT = 0;
          scia.push({ x: elettroni[0].x, y: elettroni[0].y });
          if (scia.length > 80) scia.shift();
        }
      }

      // Versione statica: un cammino a zigzag che, senza deriva, in media non avanza.
      function percorsoStatico() {
        const w = tela.w;
        const casuale = semeCasuale(11);
        const T = 0.75 * w / (4 * passo); // con la deriva più forte (4 passi al secondo) il cammino resta nella tela
        const passi = [];
        let tot = 0;
        for (let k = 0; k < 22; k++) { const p = { a: casuale() * 2 * Math.PI, t: 0.4 + casuale() }; tot += p.t; passi.push(p); }
        let sx = 0;
        let sy = 0;
        passi.forEach((p) => {
          p.t *= T / tot;
          p.dx = Math.cos(p.a) * AGITAZIONE * passo * p.t;
          p.dy = Math.sin(p.a) * AGITAZIONE * passo * p.t;
          sx += p.dx;
          sy += p.dy;
        });
        const vd = derivaVis() * passo;
        const punti = [{ x: w / 2 - 2 * passo * T, y: tela.h * 0.5 }];
        passi.forEach((p) => {
          const q = punti[punti.length - 1];
          punti.push({ x: q.x + p.dx - sx * p.t / T + vd * p.t, y: q.y + p.dy - sy * p.t / T });
        });
        return punti;
      }

      function pillola(x, y, larg, alt) {
        g.beginPath();
        g.roundRect(x, y, larg, alt, alt / 2);
        g.fillStyle = 'rgba(7, 12, 11, .84)';
        g.fill();
        g.strokeStyle = 'rgba(255, 255, 255, .1)';
        g.lineWidth = 1;
        g.stroke();
      }

      function freccia(x, y, L) {
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x + 15, y - 9); g.lineTo(x + 15, y - 3.5); g.lineTo(x + L, y - 3.5);
        g.lineTo(x + L, y + 3.5); g.lineTo(x + 15, y + 3.5); g.lineTo(x + 15, y + 9); g.closePath();
        g.lineJoin = 'round'; g.strokeStyle = FONDO; g.lineWidth = 3; g.stroke();
        g.fillStyle = COL_I; g.fill();
      }

      function disegnaScia(e0) {
        g.lineWidth = 1.8;
        g.lineCap = 'round';
        const n = scia.length;
        for (let k = 1; k <= n; k++) {
          const a = scia[k - 1];
          const b = k < n ? scia[k] : e0;
          if (!a || !b) continue;
          g.strokeStyle = 'rgba(225, 245, 255,' + (0.7 * k / n).toFixed(3) + ')';
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
      }

      // Etichetta su fondo scuro, leggibile sopra le particelle.
      function etichetta(x, y, testo, o) {
        const op = o || {};
        g.font = (op.font || '600 12px ') + FONT;
        const tw = g.measureText(testo).width;
        const larg = tw + 24 + (op.extra || 0) + (op.rientro || 0);
        const x0 = op.destra ? x - larg : x;
        pillola(x0, y - 13, larg, 26);
        g.fillStyle = op.colore || FORTE;
        g.textBaseline = 'middle';
        g.fillText(testo, x0 + 12 + (op.rientro || 0), y + 0.5);
        return { x: x0, larg: larg, tw: tw };
      }

      function disegnaStatico(e0) {
        g.strokeStyle = rgba(NEG, 0.35);
        g.lineWidth = 1.2;
        g.beginPath();
        elettroni.forEach((e, k) => {
          const v = Math.hypot(e.vx, e.vy) || 1;
          if (k) { g.moveTo(e.x, e.y); g.lineTo(e.x + e.vx / v * passo * 0.36, e.y + e.vy / v * passo * 0.36); }
        });
        g.stroke();
        const p = statico;
        const a = p[0];
        const b = p[p.length - 1];
        e0.x = b.x;
        e0.y = b.y;
        g.lineJoin = 'round';
        [[FONDO, 4.5], ['rgba(235, 248, 255, .95)', 2]].forEach(([c, lw]) => {
          g.strokeStyle = c;
          g.lineWidth = lw;
          g.beginPath(); p.forEach((q, k) => (k ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
        });
        g.setLineDash([3, 3]);
        g.beginPath(); g.arc(a.x, a.y, rE + 3, 0, 2 * Math.PI); g.stroke();
        if (b.x - a.x > 8) {
          const yb = Math.min(tela.h - 48, Math.max(...p.map((q) => q.y)) + 18);
          g.beginPath(); g.moveTo(a.x, yb); g.lineTo(b.x - 8, yb); g.stroke();
          g.fillStyle = '#fff';
          g.beginPath(); g.moveTo(b.x, yb); g.lineTo(b.x - 9, yb - 5); g.lineTo(b.x - 9, yb + 5); g.closePath(); g.fill();
        }
        g.setLineDash([]);
      }

      function disegnaDeriva(w) {
        const chiuso = stato.chiuso;
        const e = etichetta(12, 25, chiuso ? 'Deriva degli elettroni' : 'Circuito aperto: nessuna deriva', { extra: chiuso ? 56 : 0 });
        if (chiuso) {
          const x0 = e.x + e.tw + 22;
          const forte = mostrato.deriva > 0.02 ? 1 : 0.35;
          g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
          for (let k = 0; k < 5; k++) {
            const x = x0 + ((k * 13 + fase) % 65 + 65) % 65 - 6;
            const al = EB.clamp(Math.min(x - x0 + 4, x0 + 48 - x) / 10, 0, 1) * forte;
            if (al <= 0) continue;
            g.strokeStyle = 'rgba(255, 255, 255,' + al.toFixed(3) + ')';
            g.beginPath(); g.moveTo(x - 3, 20.5); g.lineTo(x + 2, 25.5); g.lineTo(x - 3, 30.5); g.stroke();
          }
        }
        if (w >= 560) etichetta(w - 12, 25, 'velocità non in scala', { destra: true, font: '600 11px ', colore: TESTO });
      }

      function disegnaVerso(w, hh) {
        const a = mostrato.verso;
        if (a < 0.01) return;
        const y = hh - 25;
        g.globalAlpha = a;
        const larg = etichetta(12, y, 'verso convenzionale', { rientro: 16 }).larg;
        g.fillStyle = COL_I;
        g.font = 'italic 700 15px ' + SERIF;
        g.fillText('I', 24, y + 0.5);
        const x0 = 12 + larg + 14;
        const x1 = w - 14;
        const L = 62;
        const sp = 118;
        const n = Math.ceil((x1 - x0) / sp) + 1;
        const giro = n * sp;
        for (let k = 0; k < n; k++) {
          const x = x0 + ((k * sp - fase) % giro + giro) % giro;
          const al = EB.clamp(Math.min(x - x0, x1 - x - L) / 24, 0, 1);
          if (al <= 0) continue;
          g.globalAlpha = a * al;
          freccia(x, y, L);
        }
        g.globalAlpha = 1;
      }

      function disegna(t) {
        const w = tela.w;
        const hh = tela.h;
        g.clearRect(0, 0, w, hh);
        const amp = ctx.ridotto ? 0 : passo * 0.045;
        const li = spriteIone.lato;
        for (const io of ioni) {
          g.drawImage(spriteIone, io.x + amp * Math.sin(t * io.f1 + io.p1) - li / 2, io.y + amp * Math.sin(t * io.f2 + io.p2) - li / 2, li, li);
        }
        const e0 = elettroni[0];
        if (ctx.ridotto) disegnaStatico(e0);
        else disegnaScia(e0);
        const le = spriteEl.lato;
        for (let k = 1; k < elettroni.length; k++) g.drawImage(spriteEl, elettroni[k].x - le / 2, elettroni[k].y - le / 2, le, le);
        g.drawImage(spriteEl, e0.x - le * 0.7, e0.y - le * 0.7, le * 1.4, le * 1.4);
        g.strokeStyle = 'rgba(255, 255, 255, .9)';
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(e0.x, e0.y, rE * 1.4 + 3, 0, 2 * Math.PI); g.stroke();
        disegnaVerso(w, hh);
        disegnaDeriva(w);
      }

      function istantaneo() {
        Object.assign(mostrato, {
          pile: stato.pile, sez: stato.sezione, ang: stato.chiuso ? 0 : APERTO, luce: stato.chiuso ? stato.pile / 4 : 0,
          deriva: derivaVis(), verso: stato.verso && stato.chiuso ? 1 : 0, impulso: -1,
        });
        scriviSvg();
        statico = percorsoStatico();
        disegna(0);
      }

      /* --- letture e comandi --- */
      const lI = ctx.ui.lettura({ etichetta: 'Corrente', grandezza: 'i' });
      const lN = ctx.ui.lettura({ etichetta: 'Elettroni al secondo', grandezza: 'q', nota: 'attraverso ogni sezione del filo' });
      const lV = ctx.ui.lettura({ etichetta: 'Velocità di deriva', grandezza: 't', nota: 'agitazione: oltre 1000' + NB + 'km/s' });
      const lT = ctx.ui.lettura({ etichetta: 'Per fare 1 metro', grandezza: 't', nota: 'alla velocità di deriva' });
      const fI = ctx.ui.formulaViva();
      const fV = ctx.ui.formulaViva();
      ctx.pannello.append(lI.el, lN.el, lV.el, lT.el, fI.el, fV.el);

      const swC = ctx.ui.interruttore({ etichetta: 'Circuito chiuso', acceso: false, cambia: (v) => impostaChiuso(v) });
      const scPile = ctx.ui.scelta({
        etichetta: 'Pile da 1,5' + NB + 'V in serie', valore: stato.pile,
        opzioni: [1, 2, 3, 4].map((n) => ({ valore: n, etichetta: String(n) })),
        cambia: (n) => { stato.pile = n; aggiorna('pile'); },
      });
      const scSez = ctx.ui.scelta({
        etichetta: 'Sezione del filo (mm²)', valore: stato.sezione,
        opzioni: SEZIONI.map((a) => ({ valore: a, etichetta: num(a, a % 1 ? 1 : 0) })),
        cambia: (a) => { const prima = stato.sezione; stato.sezione = a; aggiorna('sezione', prima); },
      });
      scSez.el.classList.add('cor-sezione');
      const swV = ctx.ui.interruttore({ etichetta: 'Verso convenzionale', acceso: false, cambia: (v) => { stato.verso = v; aggiorna('verso'); } });
      const gruppo = (titolo, el) => h('div', { class: 'cor-gruppo' }, h('span', { class: 'cor-gruppo-t' }, titolo), el);
      ctx.comandi.append(gruppo('Interruttore', swC.el), scPile.el, scSez.el, gruppo('Frecce della corrente', swV.el));

      function impostaChiuso(v, daScena) {
        if (v === stato.chiuso) return;
        stato.chiuso = v;
        if (daScena) swC.imposta(v, true);
        raggiuntaLampada = false;
        raggiuntoTratto = false;
        mostrato.impulso = v && !ctx.ridotto ? 0 : -1;
        aggiorna('chiuso');
      }

      function descriviCircuito() {
        const pile = stato.pile === 1 ? 'una pila da 1,5 V' : stato.pile + ' pile da 1,5 V in serie (' + fmt(stato.pile * V_PILA, 'V') + ')';
        return 'Circuito con ' + pile + ', un interruttore ' + (stato.chiuso ? 'chiuso' : 'aperto') + ' e una lampadina da 3 Ω ' +
          (stato.chiuso ? 'accesa' : 'spenta') + '. Filo da ' + sezT(stato.sezione) + '; il tratto evidenziato in basso è ingrandito qui sotto.' +
          (stato.chiuso && stato.verso ? ' Frecce azzurre del verso convenzionale: dal + della pila, attraverso la lampadina, al −.' : '');
      }
      function descriviLente() {
        const base = 'Il filo di rame ingrandito: ioni positivi fermi nel reticolo ed elettroni liberi che si agitano in tutte le direzioni.';
        if (!stato.chiuso) return base + ' Circuito aperto: in media gli elettroni non avanzano.';
        return base + ' Con ' + fmt(corrente(), 'A') + ' gli elettroni derivano verso destra a ' + mmS(deriva()) + ' (sullo schermo la deriva è esagerata).' +
          (stato.verso ? ' Le frecce azzurre del verso convenzionale puntano a sinistra, al contrario degli elettroni.' : '');
      }

      /* --- note e sfide --- */
      let notato = Object.assign({}, stato);
      let ultimaNota = '';
      let timerNota = 0;
      let correntiViste = [];
      const pileT = (n) => (n === 1 ? '1 pila' : n + ' pile');

      function nota() {
        const p = notato;
        const i = corrente();
        const v = deriva();
        const iP = p.chiuso ? p.pile * V_PILA / R_LAMPADA : 0;
        const vP = F.velocitaDeriva(iP, p.sezione * 1e-6);
        let t = '';
        if (stato.chiuso !== p.chiuso) {
          t = stato.chiuso
            ? 'Circuito chiuso: la lampadina si accende **subito**, perché la spinta corre lungo i fili quasi alla velocità della luce. Gli elettroni invece avanzano in media di appena **' + mmS(v) + '**: per fare un metro impiegherebbero **' + durata(1 / v) + '**.' + (stato.verso ? ' Le frecce azzurre del verso convenzionale puntano al contrario.' : '')
            : 'Circuito aperto: la corrente si ferma nello stesso istante in tutto il circuito. Gli elettroni continuano ad agitarsi, ma in media **non avanzano più**.';
        } else if (stato.verso !== p.verso) {
          if (!stato.verso) t = 'Frecce nascoste: resta il moto vero degli elettroni, che nel circuito esterno vanno dal − al + della pila.';
          else if (stato.chiuso) t = 'Le frecce azzurre mostrano il **verso convenzionale**: dal + della pila, attraverso la lampadina, fino al −. Gli elettroni vanno **al contrario**, perché la loro carica è negativa: il verso fu fissato prima che si scoprisse chi si muove davvero nei fili.';
          else t = 'Il verso convenzionale si vede solo quando passa corrente: chiudi il circuito.';
        } else if (stato.pile !== p.pile) {
          const vT = stato.pile * V_PILA;
          t = stato.chiuso
            ? 'Da ' + pileT(p.pile) + ' a ' + pileT(stato.pile) + ': la tensione passa da **' + fmt(p.pile * V_PILA, 'V') + '** a **' + fmt(vT, 'V') + '** e la corrente da **' + fmt(iP, 'A') + '** a **' + fmt(i, 'A') + '** (' + fattore(i / iP) + '). Gli elettroni liberi nel filo sono sempre gli stessi, quindi la deriva cambia dello stesso fattore: da ' + mmS(vP) + ' a **' + mmS(v) + '**.'
            : (stato.pile === 1 ? 'Ora c\'è 1 pila' : 'Ora ci sono ' + pileT(stato.pile)) + ': **' + fmt(vT, 'V') + '**. Chiudi il circuito e passeranno **' + fmt(vT / R_LAMPADA, 'A') + '**.';
        } else if (stato.sezione !== p.sezione) {
          const sottile = stato.sezione < p.sezione;
          t = stato.chiuso
            ? 'Filo più ' + (sottile ? 'sottile' : 'grosso') + ', da ' + sezT(p.sezione) + ' a **' + sezT(stato.sezione) + '**: la corrente resta **' + fmt(i, 'A') + '**, perché il filo ha una resistenza minima rispetto ai 3' + NB + 'Ω della lampadina. La stessa carica al secondo passa da una sezione più ' + (sottile ? 'stretta, quindi gli elettroni **accelerano**' : 'larga, quindi gli elettroni **rallentano**') + ': da ' + mmS(vP) + ' a **' + mmS(v) + '** (' + fattore(v / vP) + ').'
            : 'Filo da **' + sezT(stato.sezione) + '**. Senza corrente non c\'è deriva: chiudi il circuito per confrontare le velocità.';
        }
        notato = Object.assign({}, stato);
        if (!t || t === ultimaNota) return;
        ultimaNota = t;
        ctx.nota(t);
      }

      function sfide(origine, prima) {
        const i = corrente();
        if (stato.chiuso) ctx.completa('chiudi');
        if (stato.chiuso && stato.verso) ctx.completa('verso');
        if (origine === 'sezione') {
          if (i > 0 && stato.sezione < prima) ctx.completa('sottile');
          correntiViste = [];
        }
        if (i > 0) {
          if (correntiViste.some((i0) => Math.abs(i - 2 * i0) < 1e-9)) ctx.completa('doppia');
          if (!correntiViste.includes(i)) correntiViste.push(i);
        }
      }

      // 6,24 × 10¹⁸ con l'esponente in apice (le cifre in apice dei caratteri monospaziati si allargano troppo).
      function potenzaDiDieci(lettura, x) {
        if (!(x > 0)) { lettura.imposta('0'); return; }
        let e = Math.floor(Math.log10(x));
        let m = x / Math.pow(10, e);
        if (m >= 9.995) { m /= 10; e += 1; }
        const testo = num(m, 2) + NB + '×' + NB + '10';
        lettura.imposta(testo + '^' + e);
        const val = lettura.el.querySelector('.eb-lettura-v');
        val.textContent = testo;
        val.append(h('sup', { class: 'cor-apice' }, String(e)));
      }

      function aggiorna(origine, prima) {
        const i = corrente();
        const v = deriva();
        const vT = stato.pile * V_PILA;
        lI.imposta(fmt(i, 'A'));
        potenzaDiDieci(lN, F.elettroniPerSecondo(i));
        lV.imposta(mmS(v));
        lT.imposta(v > 0 ? durata(1 / v) : '–');
        fI.imposta(stato.chiuso
          ? [['I', 'i'], ' = ', ['V', 'v'], ' / ', ['R', 'r'], ' = ', [fmt(vT, 'V'), 'v'], ' / ', ['3' + NB + 'Ω', 'r'], ' = ', [fmt(i, 'A'), 'i']]
          : [['I', 'i'], ' = 0 (circuito aperto)']);
        fV.imposta([['v', 't'], ' = ', ['I', 'i'], ' / (', ['n', 't'], ' · ', ['e', 'q'], ' · ', ['S', 't'], ')', '\n', '= ', [mmS(v), 't']]);
        pilaTesto.textContent = stato.pile === 1 ? '1 pila da 1,5' + NB + 'V' : stato.pile + NB + '×' + NB + '1,5' + NB + 'V = ' + fmt(vT, 'V');
        svg.setAttribute('aria-label', descriviCircuito());
        tela.canvas.setAttribute('aria-label', descriviLente());
        if (origine) sfide(origine, prima);
        if (ctx.ridotto) istantaneo();
        else ciclo.avvia();
        clearTimeout(timerNota);
        if (origine) timerNota = setTimeout(nota, 350);
      }

      const ciclo = ctx.ciclo((dt, t) => {
        const k = (r) => 1 - Math.exp(-dt * r);
        mostrato.pile += (stato.pile - mostrato.pile) * k(9);
        mostrato.sez += (stato.sezione - mostrato.sez) * k(8);
        mostrato.ang += ((stato.chiuso ? 0 : APERTO) - mostrato.ang) * k(stato.chiuso ? 20 : 12);
        if (mostrato.impulso >= 0) {
          mostrato.impulso += dt;
          const q = avanzamento() * geo.lungo / 2;
          if (q >= geo.sLamp) raggiuntaLampada = true;
          if (q >= geo.sTratto) raggiuntoTratto = true;
          if (mostrato.impulso >= IMPULSO) mostrato.impulso = -1;
        }
        const luce = stato.chiuso && raggiuntaLampada ? stato.pile / 4 : 0;
        mostrato.luce += (luce - mostrato.luce) * k(luce > mostrato.luce ? 14 : 8);
        mostrato.deriva += (derivaVis() - mostrato.deriva) * k(2.4);
        mostrato.verso += ((stato.verso && stato.chiuso ? 1 : 0) - mostrato.verso) * k(6);
        scriviSvg();
        muovi(dt);
        disegna(t);
      });
      ctx.pulizia(() => clearTimeout(timerNota));

      tela.alRidimensiona = (w, hh) => {
        disponi(w);
        popola(w, hh);
        if (ctx.ridotto) istantaneo();
      };
      tela.alRidimensiona(tela.w, tela.h);
      aggiorna();
      ctx.nota('Circuito aperto. Dentro il rame gli elettroni liberi si agitano in tutte le direzioni a più di 1000' + NB + 'km/s, ma in media non vanno da nessuna parte. **Chiudi l\'interruttore** (qui sotto o sul disegno) e osserva la lampadina e il filo ingrandito.');
    },
  });
})();
