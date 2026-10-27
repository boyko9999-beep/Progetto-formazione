/*
 * Laboratorio "L'esperimento di Faraday" (capitolo 7).
 * Banco di Faraday: una calamita scorre sull'asse di una bobina collegata a un galvanometro
 * a zero centrale e a un LED bicolore (due LED in versi opposti nello stesso involucro:
 * giallo con la tensione positiva, rosso con quella negativa). La tensione indotta è ε = −N · ΔΦ/Δt, con il flusso di un
 * dipolo in asse con le spire (EBFisica.flussoRelativo) sommato lungo tutta la bobina.
 * Banco di Ørsted: un filo verticale percorso da corrente e sei bussole che seguono la
 * somma del campo del filo (B = μ₀ · I / 2πr) e della parte orizzontale di quello terrestre.
 */
(function () {
  'use strict';

  /* --- Faraday: 1 cm = 7 unità del disegno --- */
  const CM = 7;
  const CX = 240;
  const CY = 92;
  const RAGGIO = 5;          // cm, raggio delle spire
  const L_BOB = 15;          // cm
  const L_CAL = 11;          // cm
  const CORSA = 24;          // cm dal centro della bobina, a sinistra e a destra
  const RIPOSO = -20;
  const PHI0 = 3.6e-4;       // Wb in una spira con la calamita al centro
  const SOGLIA_LED = 1.8;    // V
  const SOGLIA = 0.015;      // V: sotto questa tensione l'ago è fermo
  const SPIRE = [100, 200, 400, 600, 800, 1000];
  const VEL = { lenta: 1.4, rapida: 0.35 };   // secondi per 20 cm di corsa
  const R_MAG = 35;          // 1/s, inerzia della calamita
  const R_FEM = 25;          // 1/s, filtro della tensione
  const GIRO = 0.5;          // s per capovolgere la calamita
  const A_MAX = 55;          // gradi di fondo scala
  const PERNO = [240, 248];
  const BX0 = CX - L_BOB * CM / 2;
  const BX1 = CX + L_BOB * CM / 2;
  const BR = RAGGIO * CM;
  const DENTRO = (L_BOB + L_CAL) / 2 - 2;     // cm: la calamita è entrata di almeno 2 cm

  /* --- Ørsted: 1 cm = 20 unità sul tavolo, visto di sbieco --- */
  const PX = 240;
  const PY = 172;
  const SQ = 0.55;
  const B_TERRA = 25e-6;     // T, parte orizzontale del campo terrestre: in Italia da circa 22 µT (Alpi) a 27 µT (Sicilia)
  const BUSSOLE = [[85, -85], [-85, -85], [60, 0], [-60, 0], [85, 85], [-85, 85]];   // [verso nord, verso est]
  const CERCHI = [24, 36, 54, 81, 121];   // in progressione geometrica: le linee si infittiscono come 1/r
  const SP = ' ';

  const CAMPIONI = 15;
  function somma(x) {
    let s = 0;
    for (let j = 0; j < CAMPIONI; j++) s += EBFisica.flussoRelativo(x - L_BOB * ((j + 0.5) / CAMPIONI - 0.5), RAGGIO);
    return s;
  }
  const NORMA = somma(0);
  // Flusso in una spira (Wb): m = 1 con il nord a destra, −1 con la calamita capovolta.
  const flusso = (x, m) => PHI0 * m * somma(x) / NORMA;
  // Scala compressa del galvanometro: si legge da qualche centesimo di volt a 3 V.
  const angolo = (e) => Math.sign(e) * Math.min(1.04, Math.log(1 + Math.abs(e) / 0.05) / Math.log(61)) * A_MAX;
  const morbido = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(2 - 2 * p, 2) / 2);
  const f1 = (v) => v.toFixed(1);

  function fattore(k, num) {
    return k >= 1 ? '×' + num(k, k < 10 && k % 1 ? 1 : 0) : '÷' + num(1 / k, 1 / k < 10 && (1 / k) % 1 ? 1 : 0);
  }

  EB.laboratorio('magnetismo', {
    monta(ctx) {
      const { h, s, num } = ctx;
      const rid = ctx.ridotto;
      const uid = EB.uid('mag');
      const stato = { modo: 'faraday', n: 400, vel: 'rapida', acceso: false, verso: 1, i: 5 };
      const conSegno = (v, d) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? '' : v > 0 ? '+' : '−') + num(Math.abs(v), d);
      let ultimaNota = '';
      const nota = (t) => { if (t !== ultimaNota) { ultimaNota = t; ctx.nota(t); } };

      /* ===== banco di Faraday ===== */
      const svgF = s('svg', { viewBox: '0 0 480 300', class: 'mag-svg' + (rid ? '' : ' mag-entra'), role: 'img' });
      const stop = (o, c, op) => s('stop', { offset: o, class: c, 'stop-opacity': op });
      svgF.append(s('defs', null,
        s('linearGradient', { id: uid + '-n', x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, 'mag-n1'), stop(0.45, 'mag-n2'), stop(1, 'mag-n3')),
        s('linearGradient', { id: uid + '-s', x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, 'mag-s1'), stop(0.45, 'mag-s2'), stop(1, 'mag-s3')),
        s('radialGradient', { id: uid + '-luce' }, stop(0, 'mag-l1', 0.95), stop(0.35, 'mag-l1', 0.4), stop(1, 'mag-l1', 0)),
        s('radialGradient', { id: uid + '-luce2' }, stop(0, 'mag-l2', 0.95), stop(0.35, 'mag-l2', 0.4), stop(1, 'mag-l2', 0)),
        s('radialGradient', { id: uid + '-sf', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 175, gradientTransform: 'scale(1 0.7)' },
          stop(0, 'mag-m1'), stop(0.5, 'mag-m1'), stop(1, 'mag-m1', 0)),
        s('mask', { id: uid + '-m', maskUnits: 'userSpaceOnUse', x: -200, y: -130, width: 400, height: 260 },
          s('rect', { x: -200, y: -130, width: 400, height: 260, fill: 'url(#' + uid + '-sf)' }))));

      // Fondo: asse della corsa, linee di campo della calamita (si muovono con lei), righello, circuito, LED, galvanometro.
      const campo = s('g', { class: 'mag-campo', mask: 'url(#' + uid + '-m)', 'aria-hidden': 'true' });
      tracciaCampo().forEach((l) => campo.append(s('path', { d: l.d }), s('path', { d: 'M3.5 0L-3 -3L-3 3Z', class: 'mag-campo-f', transform: l.freccia })));
      // LED bicolore: un alone giallo per le tensioni positive, uno rosso per le negative
      const ledLuce = ['-luce', '-luce2'].map((g) => s('circle', { cx: 240, cy: 149, r: 30, fill: 'url(#' + uid + g + ')', class: 'mag-led-luce', opacity: 0 }));
      const ledCupola = s('path', { d: 'M232 157V148A8 8 0 0 1 248 148V157Z', class: 'mag-led' });
      const tacche = [0, 0.1, 0.3, 1, 3].flatMap((e) => (e ? [e, -e] : [0])).map((e) => {
        const a = angolo(e) * Math.PI / 180;
        const r2 = e === 0 || Math.abs(e) >= 1 ? 62 : 59;
        return 'M' + f1(PERNO[0] + Math.sin(a) * 56) + ' ' + f1(PERNO[1] - Math.cos(a) * 56) + 'L' + f1(PERNO[0] + Math.sin(a) * r2) + ' ' + f1(PERNO[1] - Math.cos(a) * r2);
      }).join('');
      const picco = s('path', { d: 'M240 186V198', class: 'mag-picco', opacity: 0 });
      const ago = s('g', { class: 'mag-ago' }, s('path', { d: 'M240 254V194' }), s('circle', { cx: 240, cy: 248, r: 4.5, class: 'mag-perno' }));
      svgF.append(
        s('path', { d: 'M14 92H466', class: 'mag-asse', 'aria-hidden': 'true' }),
        campo,
        s('g', { class: 'mag-righello', 'aria-hidden': 'true' }, s('path', { d: 'M20 284H55M20 280V288M55 280V288' }), s('text', { x: 62, y: 288.5 }, '5 cm')),
        s('path', { d: 'M187.5 127V176M292.5 127V176M187.5 157H228M252 157H292.5', class: 'mag-filo' }),
        s('path', { d: 'M187.5 127V176M292.5 127V176M187.5 157H228M252 157H292.5', class: 'mag-filo-rame' }),
        s('circle', { cx: 187.5, cy: 157, r: 3.2, class: 'mag-nodo' }), s('circle', { cx: 292.5, cy: 157, r: 3.2, class: 'mag-nodo' }),
        ...ledLuce,
        s('rect', { x: 229, y: 156, width: 22, height: 4, rx: 1.5, class: 'mag-led-base' }), ledCupola,
        s('text', { x: 256, y: 153, class: 'mag-t' }, 'LED'),
        s('rect', { x: 168, y: 176, width: 144, height: 88, rx: 12, class: 'mag-g-cassa' }),
        s('rect', { x: 176, y: 184, width: 128, height: 72, rx: 8, class: 'mag-g-quadrante' }),
        s('path', { d: 'M194.1 215.9A56 56 0 0 1 285.9 215.9', class: 'mag-g-arco' }),
        s('path', { d: tacche, class: 'mag-g-tacca' }),
        s('text', { x: 211, y: 233, class: 'mag-g-segno', 'text-anchor': 'middle' }, '−'),
        s('text', { x: 269, y: 233, class: 'mag-g-segno', 'text-anchor': 'middle' }, '+'),
        picco, ago,
        s('circle', { cx: 187.5, cy: 176, r: 4, class: 'mag-morsetto' }), s('circle', { cx: 292.5, cy: 176, r: 4, class: 'mag-morsetto' }),
        s('text', { x: 160, y: 224, class: 'mag-t', 'text-anchor': 'end' }, 'galvanometro'));

      // Bobina: archi dietro, tubo, calamita, archi davanti con la corrente indotta.
      const spireDietro = s('path', { class: 'mag-spire-dietro' });
      const spireDavanti = s('path', { class: 'mag-spire' });
      const corr = s('path', { class: 'mag-corrente', opacity: 0 });
      const etSpire = s('text', { x: 240, y: 30, class: 'mag-t mag-t-rame', 'text-anchor': 'middle' });
      const frecceI = [0, 1, 2].map(() => s('path', { d: 'M-4.5 -3.5H4.5L0 3.5Z', class: 'mag-freccia-i', opacity: 0 }));
      const posFrecce = [[BX0, 141], [0, CY], [BX1, 141]];
      const poli = [BX0, BX1].map((x) => {
        const t = s('text', { x: 0, y: 4.6, 'text-anchor': 'middle' }, 'N');
        return { g: s('g', { class: 'mag-polo-b', transform: 'translate(' + x + ' 42)', opacity: 0 }, s('rect', { x: -11, y: -10, width: 22, height: 20, rx: 6 }), t), t: t };
      });

      const corpo = s('g', null,
        s('path', { d: 'M0 -12H35.5Q38.5 -12 38.5 -9V9Q38.5 12 35.5 12H0Z', fill: 'url(#' + uid + '-n)' }),
        s('path', { d: 'M0 -12H-35.5Q-38.5 -12 -38.5 -9V9Q-38.5 12 -35.5 12H0Z', fill: 'url(#' + uid + '-s)' }),
        s('rect', { x: -35, y: -9.5, width: 70, height: 3.5, rx: 1.75, class: 'mag-riflesso' }),
        s('path', { d: 'M0 -12V12', class: 'mag-giunto' }));
      const calamita = s('g', { class: 'mag-calamita' },
        s('rect', { x: -54, y: -24, width: 108, height: 48, class: 'mag-presa' }),
        s('rect', { x: -45, y: -18, width: 90, height: 36, rx: 9, class: 'mag-anello' }),
        s('path', { d: 'M-45 -5L-51 0L-45 5M45 -5L51 0L45 5', class: 'mag-indizio' }),
        corpo);
      const tN = s('text', { y: 4.6, 'text-anchor': 'middle' }, 'N');
      const tS = s('text', { y: 4.6, 'text-anchor': 'middle' }, 'S');
      const etCal = s('g', { class: 'mag-polo-c', 'aria-hidden': 'true' }, tN, tS);
      svgF.append(spireDietro,
        s('rect', { x: BX0, y: CY - BR, width: BX1 - BX0, height: 2 * BR, class: 'mag-tubo' }),
        calamita, spireDavanti, corr, ...frecceI, etSpire, ...poli.map((p) => p.g), etCal);

      function tracciaCampo() {
        const sorgenti = [{ x: 32, y: 0, q: 1 }, { x: -32, y: 0, q: -1 }];
        const linee = [];
        [34, 44, 56, 70, 90, 122].forEach((g) => [1, -1].forEach((lato) => {
          const a = g * Math.PI / 180;
          let x = 32 + 4 * Math.cos(a);
          let y = lato * 4 * Math.sin(a);
          const pt = [[x, y]];
          for (let k = 0; k < 1500; k++) {
            const c = EBFisica.campo(sorgenti, x, y);
            const m = Math.hypot(c.x, c.y);
            x += 2.4 * c.x / m;
            y += 2.4 * c.y / m;
            pt.push([x, y]);
            if (Math.hypot(x + 32, y) < 4) break;
            if (Math.abs(x) > 500 || Math.abs(y) > 400) break;
          }
          // freccia nel tratto visibile: in cima ai cerchi piccoli, a 60 unità dal nord sui grandi
          let i = 0;
          pt.forEach((p, k) => { if (Math.abs(p[1]) > Math.abs(pt[i][1])) i = k; });
          const lontano = pt.findIndex((p) => Math.hypot(p[0] - 32, p[1]) > 60);
          if (lontano > 0) i = Math.min(i, lontano);
          i = EB.clamp(i, 1, pt.length - 2);
          const ang = Math.atan2(pt[i + 1][1] - pt[i - 1][1], pt[i + 1][0] - pt[i - 1][0]) * 180 / Math.PI;
          let d = '';
          let fuori = true;
          pt.forEach((p, k) => {
            if (k % 3 && k !== pt.length - 1) return;
            const vede = Math.abs(p[0]) < 230 && Math.abs(p[1]) < 150;
            if (vede) d += (fuori ? 'M' : 'L') + f1(p[0]) + ' ' + f1(p[1]);
            fuori = !vede;
          });
          linee.push({
            d: d,
            freccia: 'translate(' + f1(pt[i][0]) + ' ' + f1(pt[i][1]) + ') rotate(' + ang.toFixed(0) + ')',
          });
        }));
        return linee;
      }

      function disegnaBobina() {
        const nv = Math.round(5 + stato.n / 60);
        const p = (BX1 - BX0) / nv;
        const c = 9.3;
        const T = CY - BR;
        const B = CY + BR;
        let dietro = '';
        let davanti = '';
        for (let j = 0; j < nv; j++) {
          const x = BX0 + j * p;
          const xm = x + p / 2;
          dietro += 'M' + f1(x) + ' ' + B + 'C' + f1(x - c) + ' ' + B + ' ' + f1(xm - c) + ' ' + T + ' ' + f1(xm) + ' ' + T;
          davanti += 'M' + f1(xm) + ' ' + T + 'C' + f1(xm + c) + ' ' + T + ' ' + f1(x + p + c) + ' ' + B + ' ' + f1(x + p) + ' ' + B;
        }
        spireDietro.setAttribute('d', dietro);
        spireDavanti.setAttribute('d', davanti);
        corr.setAttribute('d', 'M' + BX0 + ' 176V' + B + davanti + 'M' + BX1 + ' ' + B + 'V176');
        const sw = Math.min(3.4, p * 0.62);
        spireDavanti.style.strokeWidth = sw;
        spireDietro.style.strokeWidth = sw * 0.8;
        // freccia sulla spira centrale, sotto l'asse per non coprire le lettere della calamita
        const xa = BX0 + Math.floor(nv / 2) * p + p / 2;
        const u = 0.28;
        posFrecce[1] = [u * u * u * xa + 3 * u * u * 0.72 * (xa + c) + 3 * u * 0.5184 * (xa + p / 2 + c) + 0.373 * (xa + p / 2), CY + 22];
        etSpire.textContent = stato.n + ' spire';
      }

      /* ===== banco di Ørsted ===== */
      const svgO = s('svg', { viewBox: '0 0 480 300', class: 'mag-svg mag-nascosto', role: 'img' });
      const piano = s('g', { transform: 'translate(' + PX + ' ' + PY + ') scale(1 ' + SQ + ')' },
        s('rect', { x: -190, y: -144, width: 380, height: 320, rx: 28, class: 'mag-tavolo-lato' }),
        s('rect', { x: -190, y: -160, width: 380, height: 320, rx: 28, class: 'mag-tavolo' }),
        s('path', { d: 'M-178 0H178M0 -150V150', class: 'mag-assi' }));
      const anelli = CERCHI.map((r) => {
        const frecce = [[0, r]].concat(r > 30 && r < 90 ? [] : [[r, 0], [-r, 0]]).map(([x, y]) => {
          const f = s('path', { d: 'M-5 -4.5L4 0L-5 4.5', class: 'mag-cerchio-f' });
          return { el: f, x: x, y: y, phi: Math.atan2(y, x) };
        });
        const g = s('g', { class: 'mag-cerchio-g', opacity: 0 }, s('circle', { r: r, class: 'mag-cerchio' }), frecce.map((f) => f.el));
        piano.append(g);
        return { g: g, r: r, frecce: frecce, op: 0, meta: 0 };
      });
      piano.append(s('ellipse', { rx: 9, ry: 9, class: 'mag-foro' }));
      const aghi = BUSSOLE.map(([x, y]) => {
        const ago = s('g', null,
          s('path', { d: 'M20 0L0 -4.4L0 4.4Z', class: 'mag-ago-n' }),
          s('path', { d: 'M-20 0L0 -4.4L0 4.4Z', class: 'mag-ago-s' }),
          s('circle', { r: 2.6, class: 'mag-ago-perno' }));
        piano.append(s('g', { transform: 'translate(' + x + ' ' + y + ')' },
          s('circle', { cy: 13, r: 25, class: 'mag-bussola-lato' }),
          s('circle', { r: 25, class: 'mag-bussola' }),
          s('path', { d: 'M21 0H25M-21 0H-25M0 21V25M0 -21V-25', class: 'mag-bussola-t' }),
          ago));
        return { el: ago, x: x, y: y, th: 0, w: 0, meta: 0, forza: 1 };
      });
      const leva = s('path', { d: 'M130 31H164', class: 'mag-leva' });
      const segni = [s('text', { x: 41, y: 35.5, 'text-anchor': 'middle', class: 'mag-pila-s' }), s('text', { x: 79, y: 35.5, 'text-anchor': 'middle', class: 'mag-pila-s' })];
      const corrO = ['M30 31H22Q14 31 14 39V277Q14 285 22 285H232Q240 285 240 277V268', 'M240 172V43Q240 31 228 31H166', 'M130 31H90'].map((d) => s('path', { d: d, class: 'mag-corrente', opacity: 0 }));
      const frecciaFilo = s('path', { d: 'M-5.5 4H5.5L0 -5Z', class: 'mag-freccia-i', transform: 'translate(240 112)', opacity: 0 });
      const etI = s('text', { x: 252, y: 116, class: 'mag-t mag-t-i' });
      const ritorno = 'M30 31H22Q14 31 14 39V277Q14 285 22 285H232Q240 285 240 277V268';
      svgO.append(
        s('path', { d: ritorno, class: 'mag-filo' }), s('path', { d: ritorno, class: 'mag-filo-rame' }), corrO[0],
        piano,
        s('path', { d: 'M240 172V43Q240 31 228 31H166M130 31H90', class: 'mag-filo mag-filo-grosso' }),
        s('path', { d: 'M240 172V43Q240 31 228 31H166M130 31H90', class: 'mag-filo-rame mag-filo-grosso' }),
        corrO[1], corrO[2],
        s('rect', { x: 30, y: 19, width: 60, height: 24, rx: 5, class: 'mag-pila' }), ...segni,
        s('text', { x: 60, y: 60, 'text-anchor': 'middle', class: 'mag-t' }, 'pila'),
        leva, s('circle', { cx: 130, cy: 31, r: 3.5, class: 'mag-morsetto' }), s('circle', { cx: 166, cy: 31, r: 3.5, class: 'mag-morsetto' }),
        s('text', { x: 148, y: 60, 'text-anchor': 'middle', class: 'mag-t' }, 'interruttore'),
        frecciaFilo, etI,
        s('path', { d: 'M436 172H457M450 166.5L458 172L450 177.5', class: 'mag-nord' }),
        s('text', { x: 447, y: 193, 'text-anchor': 'middle', class: 'mag-t mag-t-b' }, 'nord'));

      /* ===== scena, legende, letture, comandi ===== */
      const banco = h('div', { class: 'mag-banco' }, svgF, svgO);
      const voce = (cls, testo) => h('span', { class: 'mag-leg' }, h('span', { class: 'mag-leg-i ' + cls, 'aria-hidden': 'true' }), testo);
      const legF = h('p', { class: 'mag-legenda' }, voce('mag-leg-campo', 'linee del campo della calamita'), voce('mag-leg-corr', 'corrente indotta'),
        voce('mag-leg-polo', 'poli della bobina mentre passa corrente'), voce('mag-leg-g', 'galvanometro a zero centrale, scala compressa'),
        voce('mag-leg-led', 'LED bicolore: due LED in versi opposti, giallo con la tensione positiva, rosso con la negativa'));
      const legO = h('p', { class: 'mag-legenda mag-nascosto' }, voce('mag-leg-anello', 'campo del filo: più fitto e intenso vicino al filo'),
        voce('mag-leg-ago', 'punta rossa: nord dell\'ago'), voce('mag-leg-nord', 'campo terrestre verso nord: parte orizzontale, in Italia circa 25' + SP + 'µT'));
      const modo = ctx.ui.scelta({ etichetta: 'Esperimento', opzioni: [{ valore: 'faraday', etichetta: 'Faraday' }, { valore: 'oersted', etichetta: 'Ørsted' }], valore: 'faraday', cambia: cambiaModo });
      modo.el.classList.add('mag-modo');
      ctx.scena.append(modo.el, banco, legF, legO);

      const lFem = ctx.ui.lettura({ etichetta: 'Tensione indotta', grandezza: 'v' });
      const lPhi = ctx.ui.lettura({ etichetta: 'Flusso in una spira', grandezza: 'b' });
      const lPicco = ctx.ui.lettura({ etichetta: 'Ultimo picco', grandezza: 'v', nota: 'il LED si accende oltre 1,8' + SP + 'V' });
      const formulaF = ctx.ui.formulaViva();
      const lI = ctx.ui.lettura({ etichetta: 'Corrente nel filo', grandezza: 'i' });
      const lB = ctx.ui.lettura({ etichetta: 'Campo del filo a 3' + SP + 'cm', grandezza: 'b' });
      const lT = ctx.ui.lettura({ etichetta: 'Campo terrestre', grandezza: 'b', nota: 'parte orizzontale; in Italia tra 22 e 27' + SP + 'µT', valore: '≈' + SP + '25' + SP + 'µT' });
      const lDev = ctx.ui.lettura({ etichetta: 'Ago a 3' + SP + 'cm dal filo', grandezza: 't' });
      const formulaO = ctx.ui.formulaViva();
      formulaF.el.classList.add('mag-formula');
      formulaO.el.classList.add('mag-formula');
      const pannelloF = [lFem.el, lPhi.el, lPicco.el, formulaF.el];
      const pannelloO = [lI.el, lB.el, lT.el, lDev.el, formulaO.el];
      ctx.pannello.append(...pannelloF, ...pannelloO);

      const curN = ctx.ui.cursore({ etichetta: 'Spire della bobina', valori: SPIRE, valore: stato.n, grandezza: 'b', formato: (v) => String(v), cambia: cambiaSpire });
      const sceltaVel = ctx.ui.scelta({ etichetta: 'Movimento automatico', opzioni: [{ valore: 'lenta', etichetta: 'lento' }, { valore: 'rapida', etichetta: 'rapido' }], valore: stato.vel, cambia: (v) => { stato.vel = v; } });
      const azioni = h('div', { class: 'mag-azioni' },
        ctx.ui.bottone({ etichetta: 'Dentro e fuori', icona: '↔', primario: true, click: dentroFuori }),
        ctx.ui.bottone({ etichetta: 'Capovolgi la calamita', icona: '⇄', click: capovolgi }));
      const swI = ctx.ui.interruttore({ etichetta: 'Corrente nel filo', acceso: false, cambia: (v) => { stato.acceso = v; aggiornaO('acceso'); } });
      const sceltaVerso = ctx.ui.scelta({ etichetta: 'Verso della corrente', opzioni: [{ valore: 1, etichetta: 'verso l\'alto' }, { valore: -1, etichetta: 'verso il basso' }], valore: 1, cambia: (v) => { stato.verso = v; aggiornaO('verso'); } });
      const curI = ctx.ui.cursore({ etichetta: 'Intensità della corrente', min: 1, max: 10, passo: 0.5, valore: stato.i, unita: 'A', grandezza: 'i', cambia: (v) => { const prima = stato.i; stato.i = v; aggiornaO('i', prima); } });
      const comandiF = [curN.el, sceltaVel.el, azioni];
      const comandiO = [swI.el, sceltaVerso.el, curI.el];
      ctx.comandi.append(...comandiF, ...comandiO);

      /* ===== fisica e disegno: Faraday ===== */
      const F = { xt: RIPOSO, xv: RIPOSO, m: 1, sx: 1, phi: flusso(RIPOSO, 1), fem: 0, ago: 0, vAgo: 0, luce: [0, 0], off: 0, quiete: 0, giro: null, auto: null, presa: null, tLett: 0, timer: 0, timerAuto: 0, tEv: 0 };
      let partenza = { x: F.xv, phi: F.phi };
      let imp = null;
      let ultimoPicco = null;
      const visti = { pos: false, neg: false };
      let timerNota = 0;
      ctx.pulizia(() => { clearTimeout(timerNota); clearTimeout(F.timer); clearTimeout(F.timerAuto); });

      const poloVerso = (x, m) => ((x <= 0) === (m > 0) ? 'N' : 'S');   // polo della calamita rivolto alla bobina

      function disegnaF() {
        const xs = f1(CX + F.xv * CM);
        calamita.setAttribute('transform', 'translate(' + xs + ' ' + CY + ')');
        corpo.setAttribute('transform', 'scale(' + F.sx.toFixed(3) + ' 1)');
        campo.setAttribute('transform', 'translate(' + xs + ' ' + CY + ') scale(' + F.sx.toFixed(3) + ' 1)');
        etCal.setAttribute('transform', 'translate(' + xs + ' ' + CY + ')');
        tN.setAttribute('x', f1(19 * F.sx));
        tS.setAttribute('x', f1(-19 * F.sx));
        etCal.setAttribute('opacity', Math.abs(F.sx).toFixed(2));
        ago.setAttribute('transform', 'rotate(' + F.ago.toFixed(2) + ' ' + PERNO[0] + ' ' + PERNO[1] + ')');
        ledLuce.forEach((c, k) => c.setAttribute('opacity', F.luce[k].toFixed(3)));
        ledCupola.classList.toggle('acceso', F.luce[0] > 0.3 && F.luce[0] >= F.luce[1]);
        ledCupola.classList.toggle('acceso2', F.luce[1] > 0.3 && F.luce[1] > F.luce[0]);
        const forte = Math.min(1, Math.abs(F.fem) / 0.25);
        const su = F.fem < 0;   // tensione negativa: corrente verso l'alto davanti alle spire
        corr.setAttribute('opacity', (rid ? (Math.abs(F.fem) >= SOGLIA ? 0.9 : 0) : Math.sqrt(forte) * 0.95).toFixed(3));
        corr.style.strokeDashoffset = F.off.toFixed(1);
        frecceI.forEach((fr, k) => {
          const giu = (k === 0) === su;   // nel filo di sinistra la corrente sale quando nelle spire scende
          fr.setAttribute('transform', 'translate(' + f1(posFrecce[k][0]) + ' ' + posFrecce[k][1] + ')' + (giu ? '' : ' rotate(180)'));
          fr.setAttribute('opacity', Math.abs(F.fem) >= SOGLIA ? Math.max(0.55, forte).toFixed(2) : 0);
        });
        const lenz = Math.abs(F.fem) >= SOGLIA ? Math.min(1, Math.abs(F.fem) / 0.12) : 0;
        poli.forEach((p, k) => {
          p.t.textContent = (k === 0) === su ? 'N' : 'S';
          p.g.setAttribute('opacity', lenz.toFixed(2));
        });
      }

      function aggiornaLetture() {
        lFem.imposta(conSegno(F.fem, 2) + SP + 'V');
        lPhi.imposta(conSegno(F.phi * 1000, 2) + SP + 'mWb');
        const rate = -F.fem / stato.n * 1000;
        const r = num(Math.abs(rate), 2) + SP + 'mWb/s';
        formulaF.imposta([['ε', 'v'], ' = −', ['N', 'b'], ' · Δ', ['Φ', 'b'], '/Δ', ['t', 't'], ' = −', [String(stato.n), 'b'], ' · ', [rate < -0.005 ? '(−' + r + ')' : r, 'b'], ' = ', [conSegno(F.fem, 2) + SP + 'V', 'v']]);
      }

      function aggiornaPicco() {
        if (ultimoPicco === null) return;
        lPicco.imposta(conSegno(ultimoPicco, 2) + SP + 'V');
        picco.setAttribute('transform', 'rotate(' + angolo(ultimoPicco).toFixed(2) + ' ' + PERNO[0] + ' ' + PERNO[1] + ')');
        picco.setAttribute('opacity', '0.9');
      }

      function ariaF() {
        const x = Math.round(Math.abs(F.xv));
        const dove = Math.abs(F.xv) <= DENTRO ? 'dentro la bobina' : 'fuori dalla bobina, a ' + x + ' cm dal centro';
        svgF.setAttribute('aria-label', 'Esperimento di Faraday: una bobina di ' + stato.n + ' spire collegata a un galvanometro a zero centrale e a un LED bicolore. La calamita, con il polo ' + poloVerso(F.xv, F.m) + ' verso la bobina, è ferma ' + dove + '.');
      }

      // Ogni tensione abbastanza grande fa parte di un impulso; le sfide si riconoscono qui.
      function registra(e, xa, xb) {
        const a = Math.abs(e);
        if (a < SOGLIA) return;
        if (!imp) imp = { x0: partenza.x, phi0: partenza.phi, picco: 0, pos: 0, neg: 0, giro: false, auto: !!F.auto, tratti: [] };
        if (a > Math.abs(imp.picco)) imp.picco = e;
        if (e > 0) imp.pos = Math.max(imp.pos, e);
        else imp.neg = Math.min(imp.neg, e);
        if (F.giro) imp.giro = true;
        if (F.auto) {
          const k = F.auto.k;
          if (!imp.tratti[k] || a > Math.abs(imp.tratti[k].e)) imp.tratti[k] = { e: e, entra: Math.abs(F.auto.tappe[k]) < Math.abs(F.auto.da) };
        }
        ultimoPicco = imp.picco;
        if (e > 0.05) visti.pos = true;
        if (e < -0.05) visti.neg = true;
        if (visti.pos && visti.neg) ctx.completa('verso');
        if (a >= SOGLIA_LED) ctx.completa('led');
        if (Math.abs(xb) < Math.abs(xa) - 1e-6 && Math.abs(xb) <= DENTRO) ctx.completa('muovi');
      }

      function chiudiImpulso() {
        const p = imp;
        imp = null;
        if (!p) return;
        const V = (e) => '**' + conSegno(e, 2) + SP + 'V**';
        const mWb = (f) => num(Math.abs(f) * 1000, 2);
        let t;
        const tratti = p.tratti.filter(Boolean);
        if (p.auto && tratti.length >= 2) {
          const dentro = tratti.find((x) => x.entra) || tratti[0];
          const fuori = tratti.slice().reverse().find((x) => !x.entra) || tratti[tratti.length - 1];
          t = 'Dentro e fuori, movimento ' + (stato.vel === 'rapida' ? 'rapido' : 'lento') + ': entrando l\'ago segna ' + V(dentro.e) + ', uscendo ' + V(fuori.e) + '. Entrando il flusso cresce, uscendo cala: la tensione cambia segno.';
        } else if (p.giro) {
          t = 'Hai capovolto la calamita' + (Math.abs(F.xv) <= DENTRO ? ' dentro la bobina' : '') + ': il flusso in una spira passa da **' + conSegno(p.phi0 * 1000, 2) + '** a **' + conSegno(F.phi * 1000, 2) + SP + 'mWb** e l\'ago segna ' + V(p.picco) + '. Anche ruotare il magnete cambia il flusso, e quindi induce tensione.';
        } else if (Math.sign(F.xv) !== Math.sign(p.x0) && Math.abs(F.xv) > 8 && Math.abs(p.x0) > 8) {
          t = 'La calamita ha attraversato la bobina: entrando l\'ago devia da una parte, uscendo dall\'altra (' + V(p.neg) + ' e ' + V(p.pos) + '). Il flusso prima cresce, poi cala.';
        } else if (Math.abs(F.xv) < Math.abs(p.x0)) {
          const polo = poloVerso(p.x0, F.m);
          t = 'Avvicini il polo **' + polo + '**: il flusso in una spira sale da **' + mWb(p.phi0) + '** a **' + mWb(F.phi) + SP + 'mWb** e l\'ago arriva a ' + V(p.picco) + '. Mentre passa la corrente indotta, la bobina diventa una calamita con il polo ' + polo + ' rivolto verso quello che si avvicina, e lo respinge (legge di Lenz). Ora la calamita è ferma: niente cambiamento, niente tensione, anche dentro la bobina.';
        } else {
          const polo = poloVerso(F.xv, F.m);
          t = 'Allontani il polo **' + polo + '**: il flusso cala da **' + mWb(p.phi0) + '** a **' + mWb(F.phi) + SP + 'mWb**, la tensione cambia segno (' + V(p.picco) + ') e l\'ago devia dall\'altra parte. Mentre la calamita si allontana, la bobina le mostra un polo ' + (polo === 'N' ? 'S' : 'N') + ' che la trattiene (legge di Lenz).';
        }
        const piu = p.pos >= SOGLIA_LED;
        const meno = -p.neg >= SOGLIA_LED;
        if (piu || meno) t += ' Oltre 1,8' + SP + 'V il **LED** si accende: ' + (piu && meno ? 'giallo con la tensione positiva, rosso con quella negativa.' : piu ? 'giallo, perché la tensione è positiva.' : 'rosso, perché la tensione è negativa.');
        else if (Math.max(p.pos, -p.neg) >= 0.2) {
          const spire = stato.n < 1000 ? 'aumenta le spire' : '';
          const consiglio = !p.giro ? 'muovi più in fretta' + (spire ? ' o ' + spire : '') : Math.abs(F.xv) > DENTRO ? 'capovolgi la calamita dentro la bobina' : spire;
          if (consiglio) t += ' Per accendere il LED servono circa 1,8' + SP + 'V: ' + consiglio + '.';
        }
        nota(t);
        ariaF();
      }

      // Simula un movimento (usata col movimento ridotto, dove non c'è animazione).
      function simula(pos, mom, durata) {
        const dt = 1 / 240;
        let prima = flusso(pos(0), mom(0));
        let e = 0;
        let max = 0;
        for (let t = dt; t <= durata + 0.3; t += dt) {
          const u = Math.min(t, durata);
          const phi = flusso(pos(u), mom(u));
          e += (-stato.n * (phi - prima) / dt - e) * (1 - Math.exp(-dt * R_FEM));
          if (Math.abs(e) > Math.abs(max)) max = e;
          prima = phi;
        }
        return max;
      }

      // Movimento ridotto: stato istantaneo, l'ago resta deviato un momento e poi torna a zero.
      function evento(xa, xb, mb, e, attesa) {
        F.xv = F.xt = xb;
        F.m = F.sx = mb;
        F.phi = flusso(xb, mb);
        F.fem = Math.abs(e) >= SOGLIA ? e : 0;
        F.ago = angolo(F.fem);
        F.luce[0] = e >= SOGLIA_LED ? 1 : 0;
        F.luce[1] = e <= -SOGLIA_LED ? 1 : 0;
        registra(e, xa, xb);
        aggiornaPicco();
        disegnaF();
        aggiornaLetture();
        clearTimeout(F.timer);
        F.timer = setTimeout(() => {
          F.fem = 0; F.ago = 0; F.luce[0] = F.luce[1] = 0;
          disegnaF();
          aggiornaLetture();
          if (!F.timerAuto) { chiudiImpulso(); partenza = { x: F.xv, phi: F.phi }; }
        }, attesa);
      }

      // Una nuova azione chiude l'impulso precedente: ogni nota racconta un solo gesto.
      function nuovaAzione() {
        fermaAuto();
        if (imp) chiudiImpulso();
        partenza = { x: F.xv, phi: F.phi };
      }

      function fermaAuto() {
        F.auto = null;
        clearTimeout(F.timerAuto);
        F.timerAuto = 0;
      }

      function tappeAuto() {
        const lato = F.xv > 0.01 ? 1 : -1;
        return Math.abs(F.xv) > 13 ? [0, lato * 20] : [lato * 20, 0, lato * 20];
      }

      function dentroFuori() {
        if (stato.modo !== 'faraday') return;
        nuovaAzione();
        const tappe = tappeAuto();
        if (!rid) {
          F.auto = { tappe: tappe, k: 0, t: 0, pausa: 0, da: F.xv, dur: 0 };
          nuovoTratto();
          ciclo.avvia();
          return;
        }
        // Movimento ridotto: un tratto alla volta, con l'ago fermo sul picco di ciascuno.
        const finto = { tappe: tappe, k: 0, da: F.xv };
        const passo = () => {
          if (finto.k >= tappe.length) {
            F.timerAuto = 0;
            F.auto = null;
            chiudiImpulso();
            partenza = { x: F.xv, phi: F.phi };
            return;
          }
          const da = F.xv;
          const a = tappe[finto.k];
          const dur = VEL[stato.vel] * Math.max(0.35, Math.abs(a - da) / 20);
          finto.da = da;
          F.auto = finto;
          const e = simula((t) => da + (a - da) * (1 - Math.cos(Math.PI * Math.min(1, t / dur))) / 2, () => F.m, dur);
          evento(da, a, F.m, e, 1300);
          finto.k += 1;
          F.timerAuto = setTimeout(passo, 1600);
        };
        passo();
      }

      function nuovoTratto() {
        const a = F.auto;
        a.da = F.xv;
        a.t = 0;
        a.dur = VEL[stato.vel] * Math.max(0.35, Math.abs(a.tappe[a.k] - a.da) / 20);
      }

      function avanzaAuto(dt) {
        const a = F.auto;
        if (a.pausa > 0) { a.pausa -= dt; return; }
        a.t += dt;
        const p = Math.min(1, a.t / a.dur);
        F.xv = F.xt = a.da + (a.tappe[a.k] - a.da) * (1 - Math.cos(Math.PI * p)) / 2;
        if (p < 1) return;
        a.k += 1;
        if (a.k >= a.tappe.length) F.auto = null;
        else { a.pausa = 0.45; nuovoTratto(); }
      }

      function capovolgi() {
        if (stato.modo !== 'faraday' || (F.giro && !rid)) return;
        nuovaAzione();
        if (rid) {
          const m0 = F.m;
          const x = F.xv;
          F.giro = { da: m0 };
          const e = simula(() => x, (t) => m0 * Math.cos(Math.PI * morbido(Math.min(1, t / GIRO))), GIRO);
          evento(x, x, -m0, e, 900);
          F.giro = null;
          if (Math.abs(e) < SOGLIA) notaGiro();
          ariaF();
          return;
        }
        F.giro = { da: F.m, t: 0 };
        ciclo.avvia();
      }

      function notaGiro() {
        nota('Calamita capovolta: ora verso la bobina c\'è il polo **' + poloVerso(F.xv, F.m) + '**. Infilala di nuovo: l\'ago devierà dalla parte opposta rispetto a prima.');
        ariaF();
      }

      function passoF(dt) {
        const xa = F.xv;
        if (F.auto) avanzaAuto(dt);
        else {
          F.xv += (F.xt - F.xv) * (1 - Math.exp(-dt * R_MAG));
          if (Math.abs(F.xt - F.xv) < 0.002) F.xv = F.xt;
        }
        if (F.giro) {
          F.giro.t += dt;
          const p = Math.min(1, F.giro.t / GIRO);
          F.sx = F.giro.da * Math.cos(Math.PI * morbido(p));
          if (p >= 1) {
            F.m = F.sx = -F.giro.da;
            F.giro = null;
            if (!imp) notaGiro();
          }
        }
        const phi = flusso(F.xv, F.sx);
        F.fem += (-stato.n * (phi - F.phi) / dt - F.fem) * (1 - Math.exp(-dt * R_FEM));
        F.phi = phi;
        // ago smorzato: una molla con attrito, un piccolo rimbalzo e poi fermo
        const n = Math.ceil(dt * 240);
        const meta = angolo(F.fem);
        for (let k = 0; k < n; k++) {
          F.vAgo += (225 * (meta - F.ago) - 15 * F.vAgo) * dt / n;
          F.ago += F.vAgo * dt / n;
        }
        const luce = Math.abs(F.fem) >= SOGLIA_LED ? Math.min(1, 0.6 + (Math.abs(F.fem) - SOGLIA_LED) / 2) : 0;
        for (let k = 0; k < 2; k++) {
          const meta = (k === 0) === (F.fem > 0) ? luce : 0;   // 0: giallo, tensione positiva; 1: rosso, negativa
          F.luce[k] += (meta - F.luce[k]) * (1 - Math.exp(-dt * (meta > F.luce[k] ? 30 : 7)));
        }
        F.off -= F.fem * 50 * dt;
        registra(F.fem, xa, F.xv);
        const fermo = !F.auto && !F.giro && F.xv === F.xt;
        if (Math.abs(F.fem) < SOGLIA && fermo) {
          F.quiete += dt;
          if (F.quiete > 0.25 && imp) chiudiImpulso();
        } else F.quiete = 0;
        if (!imp && Math.abs(F.fem) < SOGLIA) partenza = { x: F.xv, phi: F.phi };
        aggiornaPicco();
        disegnaF();
        F.tLett += dt;
        const finito = fermo && !imp && Math.abs(F.fem) < 1e-4 && Math.abs(F.ago) < 0.03 && Math.abs(F.vAgo) < 0.05 && Math.max(F.luce[0], F.luce[1]) < 0.004;
        if (F.tLett > 0.1 || finito) { F.tLett = 0; aggiornaLetture(); }
        ctx.box.classList.toggle('mag-vivo', !finito);
        if (finito) {
          F.fem = 0; F.ago = 0; F.vAgo = 0; F.luce[0] = F.luce[1] = 0;
          disegnaF();
          aggiornaLetture();
        }
        return !finito;
      }

      /* ===== fisica e disegno: Ørsted ===== */
      const O = { off: 0, prima: null };
      const campoFilo = (rCm) => 2e-7 * stato.i / (rCm / 100);   // tesla

      function bersagliO() {
        const I = stato.acceso ? stato.i * stato.verso : 0;
        aghi.forEach((a) => {
          const r = Math.hypot(a.x, a.y);
          const bw = 2e-7 * I / (r / 2000);
          const bx = bw * a.y / r + B_TERRA;   // verso nord
          const by = -bw * a.x / r;            // verso est
          a.meta = Math.atan2(by, bx);
          a.forza = Math.hypot(bx, by) / B_TERRA;
        });
        anelli.forEach((c) => {
          c.meta = stato.acceso ? EB.clamp(campoFilo(c.r / 20) / 40e-6, 0.16, 0.9) : 0;
          c.frecce.forEach((f) => {
            const a = (f.phi * 180 / Math.PI) - 90 * stato.verso;
            f.el.setAttribute('transform', 'translate(' + f.x + ' ' + f.y + ') rotate(' + a.toFixed(0) + ')');
          });
        });
      }

      function disegnaO() {
        aghi.forEach((a) => a.el.setAttribute('transform', 'rotate(' + (a.th * 180 / Math.PI).toFixed(2) + ')'));
        anelli.forEach((c) => c.g.setAttribute('opacity', c.op.toFixed(3)));
        corrO.forEach((p) => {
          p.setAttribute('opacity', stato.acceso ? 0.9 : 0);
          p.style.strokeDashoffset = O.off.toFixed(1);
        });
        frecciaFilo.setAttribute('opacity', stato.acceso ? 1 : 0);
        frecciaFilo.setAttribute('transform', 'translate(240 112)' + (stato.verso > 0 ? '' : ' rotate(180)'));
        leva.classList.toggle('aperta', !stato.acceso);
        segni.forEach((t, k) => {
          const pos = (k === 0) === (stato.verso > 0);
          t.textContent = pos ? '+' : '−';
          t.setAttribute('class', 'mag-pila-s ' + (pos ? 'pos' : 'neg'));
        });
        etI.textContent = stato.acceso ? 'I = ' + num(stato.i, stato.i % 1 ? 1 : 0) + ' A' : 'I = 0';
      }

      function deviazione() {
        const a = aghi[2];
        return Math.abs(a.meta) * 180 / Math.PI;
      }

      function lettureO() {
        const bw = stato.acceso ? campoFilo(3) : 0;
        lI.imposta(stato.acceso ? (stato.verso > 0 ? '↑ ' : '↓ ') + num(stato.i, stato.i % 1 ? 1 : 0) + SP + 'A' : '0' + SP + 'A');
        lB.imposta(stato.acceso ? ctx.fmt(bw, 'T', { cifre: 2 }) : '0' + SP + 'µT');
        lDev.imposta(num(deviazione(), 0) + '°');
        formulaO.imposta([['B', 'b'], ' = μ₀ · ', ['I', 'i'], ' / (2π · r) = 2·10⁻⁷ · ', [num(stato.acceso ? stato.i : 0, stato.i % 1 ? 1 : 0) + SP + 'A', 'i'], ' / 0,03 m = ', [stato.acceso ? ctx.fmt(bw, 'T', { cifre: 2 }) : '0' + SP + 'µT', 'b']]);
        svgO.setAttribute('aria-label', 'Esperimento di Ørsted: un filo verticale, collegato a una pila tramite un interruttore, attraversa un tavolo con sei bussole intorno. ' +
          (stato.acceso ? 'Passano ' + num(stato.i, stato.i % 1 ? 1 : 0) + ' A ' + (stato.verso > 0 ? 'verso l\'alto' : 'verso il basso') + ': intorno al filo il campo forma cerchi, ' + (stato.verso > 0 ? 'in senso antiorario' : 'in senso orario') + ' visti dall\'alto, e l\'ago a 3 cm dal filo ruota di ' + num(deviazione(), 0) + ' gradi.' : 'Corrente spenta: tutti gli aghi puntano a nord, verso destra.'));
      }

      function aggiornaO(origine, prima) {
        bersagliO();
        lettureO();
        if (origine === 'acceso' && stato.acceso) ctx.completa('oersted');
        if (rid) {
          aghi.forEach((a) => { a.th = a.meta; a.w = 0; });
          anelli.forEach((c) => { c.op = c.meta; });
          disegnaO();
        } else {
          disegnaO();
          ciclo.avvia();
        }
        clearTimeout(timerNota);
        const bw = num(campoFilo(3) * 1e6, 0);
        const dev = num(deviazione(), 0);
        if (origine === 'acceso') {
          nota(stato.acceso
            ? 'Passano **' + ctx.fmt(stato.i, 'A') + ' ' + (stato.verso > 0 ? 'verso l\'alto' : 'verso il basso') + '**: a 3' + SP + 'cm il campo del filo vale **' + bw + SP + 'µT**, ' + (campoFilo(3) > B_TERRA ? 'più' : 'meno') + ' dei circa 25' + SP + 'µT del campo terrestre, e l\'ago lì ruota di **' + dev + '°**. Il campo forma cerchi intorno al filo e cala con la distanza: gli aghi più lontani ruotano meno.'
            : 'Corrente spenta: resta solo il campo terrestre e tutti gli aghi tornano verso nord.');
        } else if (origine === 'verso') {
          nota(stato.acceso
            ? 'Corrente invertita, ora **' + (stato.verso > 0 ? 'verso l\'alto' : 'verso il basso') + '**: i cerchi del campo girano nell\'altro senso e gli aghi ruotano dalla parte opposta.'
            : 'Corrente impostata ' + (stato.verso > 0 ? 'verso l\'alto' : 'verso il basso') + ': accendila per vedere da che parte ruotano gli aghi.');
        } else if (origine === 'i') {
          const vecchio = O.prima === null ? prima : O.prima;
          if (O.prima === null) O.prima = prima;
          timerNota = setTimeout(() => {
            O.prima = null;
            if (!stato.acceso) { nota('Intensità impostata a **' + ctx.fmt(stato.i, 'A') + '**: accendi la corrente per vedere l\'effetto sulle bussole.'); return; }
            if (vecchio === stato.i) return;
            const bw0 = campoFilo(3) * vecchio / stato.i;
            const dev0 = Math.atan(bw0 / B_TERRA) * 180 / Math.PI;
            nota('Da **' + ctx.fmt(vecchio, 'A') + '** a **' + ctx.fmt(stato.i, 'A') + '**: il campo a 3' + SP + 'cm passa da ' + num(bw0 * 1e6, 0) + ' a **' + bw + SP + 'µT** (' + fattore(stato.i / vecchio, num) + '), ma la deviazione solo da ' + num(dev0, 0) + '° a **' + dev + '°**: l\'ago segue la somma con il campo terrestre.');
          }, 350);
        }
      }

      function passoO(dt) {
        let attivo = stato.acceso;
        const n = Math.ceil(dt * 240);
        aghi.forEach((a) => {
          for (let k = 0; k < n; k++) {
            a.w += (-36 * a.forza * Math.sin(a.th - a.meta) - 2.6 * a.w) * dt / n;
            a.th += a.w * dt / n;
          }
          if (Math.abs(a.w) > 0.004 || Math.abs(Math.sin(a.th - a.meta)) > 0.002) attivo = true;
          else { a.w = 0; a.th = a.meta; }
        });
        anelli.forEach((c) => {
          c.op += (c.meta - c.op) * (1 - Math.exp(-dt * 10 / (1 + c.r / 50)));
          if (Math.abs(c.meta - c.op) > 0.004) attivo = true;
          else c.op = c.meta;
        });
        if (stato.acceso) O.off -= stato.verso * (14 + 5 * stato.i) * dt;
        disegnaO();
        return attivo;
      }

      /* ===== modi, comandi e trascinamento ===== */
      function cambiaModo(v) {
        stato.modo = v;
        const far = v === 'faraday';
        if (!far) {
          fermaAuto();
          clearTimeout(F.timer);
          if (F.giro) { F.m = F.sx = -F.giro.da; F.giro = null; }
          imp = null;
          Object.assign(F, { xv: F.xt, fem: 0, ago: 0, vAgo: 0, luce: [0, 0], phi: flusso(F.xt, F.m) });
          partenza = { x: F.xv, phi: F.phi };
          disegnaF();
          aggiornaLetture();
        }
        mostraModo(far);
        ctx.box.classList.remove('mag-vivo');
        if (!rid) {
          const nuovo = far ? svgF : svgO;
          nuovo.classList.remove('mag-entra');
          void nuovo.offsetWidth;
          nuovo.classList.add('mag-entra');
        }
        clearTimeout(timerNota);
        if (far) nota('Di nuovo al banco di Faraday: trascina la calamita dentro e fuori dalla bobina, o premi «Dentro e fuori».');
        else {
          lettureO();
          nota(stato.acceso ? 'Il filo è percorso da corrente: gli aghi seguono la somma del suo campo e di quello terrestre.' : 'Un filo verticale attraversa il tavolo; intorno, sei bussole puntano a nord, verso destra. Accendi la corrente e guarda gli aghi: è la scoperta di Ørsted del 1820.');
          if (!rid) ciclo.avvia();
        }
      }

      function mostraModo(far) {
        [svgF, legF].concat(pannelloF, comandiF).forEach((el) => el.classList.toggle('mag-nascosto', !far));
        [svgO, legO].concat(pannelloO, comandiO).forEach((el) => el.classList.toggle('mag-nascosto', far));
      }

      let nNotato = stato.n;
      function cambiaSpire(v) {
        stato.n = v;
        disegnaBobina();
        aggiornaLetture();
        ariaF();
        clearTimeout(timerNota);
        timerNota = setTimeout(() => {
          if (stato.n === nNotato) return;
          nota('Ora la bobina ha **' + stato.n + ' spire** (' + fattore(stato.n / nNotato, num) + ' rispetto a ' + nNotato + '): con lo stesso movimento la tensione indotta cambia nello stesso rapporto, perché in `ε = −N · ΔΦ / Δt` il numero di spire moltiplica tutto.');
          nNotato = stato.n;
        }, 350);
      }

      EB.trascina(calamita, {
        svg: svgF,
        passo: CM,
        etichetta: 'Calamita: trascinala, oppure usa le frecce sinistra e destra per spostarla lungo l\'asse della bobina (Maiusc per passi più lunghi)',
        inizio() { fermaAuto(); F.presa = null; F.tEv = performance.now(); },
        muovi(x) {
          if (F.presa === null) { F.presa = x - (CX + F.xv * CM); return; }
          const xb = EB.clamp((x - F.presa - CX) / CM, -CORSA, CORSA);
          if (!rid) { F.xt = xb; ciclo.avvia(); return; }
          const ora = performance.now();
          const dtR = EB.clamp((ora - F.tEv) / 1000, 0.016, 0.25);
          F.tEv = ora;
          const xa = F.xv;
          const e = F.fem + (-stato.n * (flusso(xb, F.m) - flusso(xa, F.m)) / dtR - F.fem) * (1 - Math.exp(-dtR * R_FEM));
          evento(xa, xb, F.m, e, 300);
        },
        sposta(dx) {
          if (!dx) return;
          fermaAuto();
          if (!rid) { F.xt = EB.clamp(F.xt + dx / CM, -CORSA, CORSA); ciclo.avvia(); return; }
          const xa = F.xv;
          const xb = EB.clamp(xa + dx / CM, -CORSA, CORSA);
          const e = simula((t) => xb + (xa - xb) * Math.exp(-R_MAG * t), () => F.m, 0.5);
          evento(xa, xb, F.m, e, 900);
        },
      });

      const ciclo = ctx.ciclo((dt) => {
        if (dt <= 0) return;   // primo fotogramma dopo una pausa: niente da derivare
        const attivo = stato.modo === 'faraday' ? passoF(dt) : passoO(dt);
        if (!attivo) ciclo.ferma();
      });

      disegnaBobina();
      bersagliO();
      disegnaF();
      disegnaO();
      aggiornaLetture();
      lettureO();
      ariaF();
      mostraModo(true);
      nota('La calamita è ferma fuori dalla bobina: il flusso nelle spire è quasi nullo e l\'ago resta sullo zero. Trascinala dentro (o selezionala e usa le frecce), oppure premi «Dentro e fuori».');
    },
  });
})();
