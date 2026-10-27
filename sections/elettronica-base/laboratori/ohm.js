/*
 * Laboratorio "Il banco di Ohm" (capitolo 3).
 * Una pila regolabile, un resistore con le sue bande colorate, un amperometro a
 * lancetta con tre portate e il grafico corrente-tensione con la retta del resistore.
 * Gli elettroni corrono più veloci quando la corrente cresce: la velocità è
 * esagerata e compressa, così resta visibile anche con pochi milliampere.
 */
(function () {
  'use strict';

  const V_MAX = 12;
  const I_MAX = 1.2;
  const PORTATE = [0.012, 0.12, 1.2];
  const PERCORSO = 'M60 215 L60 240 Q60 260 80 260 L340 260 Q360 260 360 240 L360 60 Q360 40 340 40 L80 40 Q60 40 60 60 L60 85';

  // Valori E12 da 10 Ω a 1 kΩ.
  const RESISTENZE = [];
  [10, 100].forEach((dec) => EBFisica.E12.forEach((b) => RESISTENZE.push(b * dec / 10)));
  RESISTENZE.push(1000);

  const COLORE_BANDA = { oro: '#c9a227', argento: '#b9c0c6' };
  function hexColore(nome) {
    if (COLORE_BANDA[nome]) return COLORE_BANDA[nome];
    const c = EBFisica.COLORI.find((x) => x.nome === nome);
    return c ? c.hex : '#000';
  }

  function fattore(k, num) {
    return k >= 1 ? '×' + num(k, k < 10 && k % 1 ? 1 : 0) : '÷' + num(1 / k, 1 / k < 10 && (1 / k) % 1 ? 1 : 0);
  }

  EB.laboratorio('ohm', {
    monta(ctx) {
      const { h, s, fmt, num } = ctx;
      const stato = { v: 6, r: 100 };
      const corrente = () => stato.v / stato.r;

      /* --- circuito --- */
      const circ = s('svg', { viewBox: '0 0 420 300', role: 'img', 'aria-label': 'Circuito: una pila, un resistore e un amperometro collegati in un anello di filo.' });
      const filo = s('path', { d: PERCORSO, class: 'ohm-filo' });
      circ.append(filo, s('path', { d: PERCORSO, class: 'ohm-filo-rame' }));

      const frecce = s('g', { 'aria-hidden': 'true' });
      if (ctx.ridotto) {
        [[210, 260, 0], [210, 40, 180], [360, 110, -90]].forEach(([x, y, a]) => {
          frecce.append(s('path', { d: 'M-7 -6 L7 0 L-7 6 z', class: 'ohm-freccia', transform: 'translate(' + x + ' ' + y + ') rotate(' + a + ')' }));
        });
      }
      const elettroni = s('g', { 'aria-hidden': 'true' });
      const punti = [];
      for (let k = 0; k < 24; k++) {
        const g = s('g', { class: 'ohm-elettrone' }, s('circle', { r: 5 }), s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '−'));
        elettroni.append(g);
        punti.push({ g: g, u: k / 24 });
      }

      const livello = s('rect', { x: 40, y: 91, width: 40, height: 118, rx: 5, class: 'ohm-pila-livello' });
      const pilaTesto = s('text', { x: 60, y: 154, 'text-anchor': 'middle', class: 'ohm-pila-testo' });
      const pila = s('g', { 'aria-hidden': 'true' },
        s('rect', { x: 50, y: 78, width: 20, height: 9, rx: 2, class: 'ohm-pila-polo' }),
        s('rect', { x: 34, y: 85, width: 52, height: 130, rx: 9, class: 'ohm-pila-corpo' }),
        livello, pilaTesto,
        s('text', { x: 96, y: 100, class: 'ohm-segno pos' }, '+'),
        s('text', { x: 96, y: 212, class: 'ohm-segno neg' }, '−'),
        s('text', { x: 60, y: 288, 'text-anchor': 'middle', class: 'ohm-etichetta' }, 'pila'));

      const bande = [168, 188, 208, 246].map((x) => s('rect', { x: x, y: 24, width: 10, height: 32 }));
      const resTesto = s('text', { x: 210, y: 82, 'text-anchor': 'middle', class: 'ohm-res-testo' });
      const resistore = s('g', { 'aria-hidden': 'true' },
        s('rect', { x: 150, y: 24, width: 120, height: 32, rx: 13, class: 'ohm-res-corpo' }), bande, resTesto);

      const ago = s('line', { x1: 360, y1: 162, x2: 360, y2: 136, class: 'ohm-ago' });
      const fondoScala = s('text', { x: 318, y: 154, 'text-anchor': 'end', class: 'ohm-strum-fs' });
      const tacche = [];
      for (let k = 0; k <= 4; k++) {
        const a = (-55 + k * 27.5) * Math.PI / 180;
        tacche.push(s('line', { x1: 360 + Math.sin(a) * 22, y1: 162 - Math.cos(a) * 22, x2: 360 + Math.sin(a) * 27, y2: 162 - Math.cos(a) * 27, class: 'ohm-tacca' }));
      }
      const amperometro = s('g', { 'aria-hidden': 'true' },
        s('circle', { cx: 360, cy: 150, r: 34, class: 'ohm-strumento' }), tacche, ago,
        s('circle', { cx: 360, cy: 162, r: 3.5, class: 'ohm-perno' }),
        s('text', { x: 360, y: 179, 'text-anchor': 'middle', class: 'ohm-strum-l' }, 'A'),
        fondoScala,
        s('text', { x: 360, y: 288, 'text-anchor': 'middle', class: 'ohm-etichetta' }, 'amperometro'));
      circ.append(frecce, elettroni, pila, resistore, amperometro,
        s('text', { x: 110, y: 288, class: 'ohm-etichetta' }, ctx.ridotto ? 'frecce: verso degli elettroni' : 'elettroni: velocità non in scala'));

      /* --- grafico corrente-tensione --- */
      const X = (v) => 46 + v / V_MAX * 236;
      const Y = (i) => 220 - i / I_MAX * 196;
      const graf = s('svg', { viewBox: '0 0 300 260', role: 'img', 'aria-label': 'Grafico della corrente in funzione della tensione: la retta del resistore e il punto di lavoro.' });
      const griglia = s('g', { class: 'ohm-griglia', 'aria-hidden': 'true' });
      const assi = s('g', { class: 'ohm-assi', 'aria-hidden': 'true' });
      for (let v = 2; v <= V_MAX; v += 2) {
        griglia.append(s('line', { x1: X(v), y1: Y(0), x2: X(v), y2: Y(I_MAX) }));
        assi.append(s('text', { x: X(v), y: 236, 'text-anchor': 'middle', class: 'ohm-tick' }, String(v)));
      }
      for (let k = 1; k <= 4; k++) {
        const i = k * 0.3;
        griglia.append(s('line', { x1: X(0), y1: Y(i), x2: X(V_MAX), y2: Y(i) }));
        assi.append(s('text', { x: 40, y: Y(i) + 4, 'text-anchor': 'end', class: 'ohm-tick' }, num(i, 1)));
      }
      assi.append(
        s('path', { d: 'M46 220 H286 M46 220 V20' }),
        s('text', { x: 286, y: 254, 'text-anchor': 'end', class: 'ohm-asse-t v' }, 'V (volt)'),
        s('text', { x: 50, y: 14, class: 'ohm-asse-t i' }, 'I (ampere)'));
      const fantasmi = s('g', { 'aria-hidden': 'true' });
      const retta = s('line', { x1: X(0), y1: Y(0), class: 'ohm-retta' });
      const rettaTesto = s('text', { class: 'ohm-retta-t' });
      const guidaV = s('line', { class: 'ohm-guida' });
      const guidaI = s('line', { class: 'ohm-guida' });
      const punto = s('circle', { r: 6, class: 'ohm-punto' });
      graf.append(griglia, assi, fantasmi, retta, rettaTesto, guidaV, guidaI, punto);

      const scena = h('div', { class: 'ohm-scena' }, circ, graf);
      ctx.scena.append(scena);

      /* --- letture e comandi --- */
      const lV = ctx.ui.lettura({ etichetta: 'Tensione', grandezza: 'v' });
      const lR = ctx.ui.lettura({ etichetta: 'Resistenza', grandezza: 'r' });
      const lI = ctx.ui.lettura({ etichetta: 'Corrente', grandezza: 'i' });
      const formula = ctx.ui.formulaViva();
      ctx.pannello.append(lV.el, lR.el, lI.el, formula.el);

      const curV = ctx.ui.cursore({ etichetta: 'Tensione della pila', min: 0, max: V_MAX, passo: 0.5, valore: stato.v, unita: 'V', grandezza: 'v', cambia: (v) => { stato.v = v; aggiorna('v'); } });
      const curR = ctx.ui.cursore({ etichetta: 'Resistenza', valori: RESISTENZE, valore: stato.r, unita: 'Ω', grandezza: 'r', cambia: (r) => { stato.r = r; aggiorna('r'); } });
      ctx.comandi.append(curV.el, curR.el);

      /* --- stato mostrato (si avvicina a quello vero con un po' di inerzia) --- */
      const mostrato = { g: 1 / stato.r, v: stato.v, ago: 0 };
      let posizione = 0;
      let lunghezza = 0;
      let rPrecedenti = [];
      let vConQuestaR = [stato.v];
      const combinazioni = [];
      let notato = { v: stato.v, r: stato.r };
      let timerNota = 0;

      function portata(i) {
        return PORTATE.find((p) => i <= p * 1.0001) || PORTATE[PORTATE.length - 1];
      }

      function disegnaResistore() {
        const nomi = EBFisica.coloriDaValore(stato.r);
        nomi.forEach((n, k) => bande[k].setAttribute('fill', hexColore(n)));
        bande[3].setAttribute('fill', COLORE_BANDA.oro);
        resTesto.textContent = fmt(stato.r, 'Ω');
      }

      function disegnaFantasmi() {
        fantasmi.replaceChildren(...rPrecedenti.map((r, k) => {
          const fine = V_MAX / r <= I_MAX ? [V_MAX, V_MAX / r] : [I_MAX * r, I_MAX];
          return s('line', { x1: X(0), y1: Y(0), x2: X(fine[0]), y2: Y(fine[1]), class: 'ohm-fantasma', opacity: (0.45 - k * 0.13).toFixed(2) });
        }));
      }

      function disegnaGrafico() {
        const g = mostrato.g;
        const fine = V_MAX * g <= I_MAX ? [V_MAX, V_MAX * g] : [I_MAX / g, I_MAX];
        retta.setAttribute('x2', X(fine[0]));
        retta.setAttribute('y2', Y(fine[1]));
        const tx = Math.min(X(fine[0]), 268);
        rettaTesto.setAttribute('x', tx);
        rettaTesto.setAttribute('y', Math.max(Y(fine[1]) - 8, 30));
        rettaTesto.setAttribute('text-anchor', 'end');
        rettaTesto.textContent = 'R = ' + fmt(stato.r, 'Ω');
        const px = X(mostrato.v);
        const py = Y(Math.min(I_MAX, mostrato.v * g));
        punto.setAttribute('cx', px);
        punto.setAttribute('cy', py);
        guidaV.setAttribute('x1', px); guidaV.setAttribute('x2', px); guidaV.setAttribute('y1', py); guidaV.setAttribute('y2', Y(0));
        guidaI.setAttribute('x1', X(0)); guidaI.setAttribute('x2', px); guidaI.setAttribute('y1', py); guidaI.setAttribute('y2', py);
      }

      function disegnaAgo() {
        const a = (-55 + 110 * EB.clamp(mostrato.ago, 0, 1.03)) * Math.PI / 180;
        ago.setAttribute('x2', (360 + Math.sin(a) * 25).toFixed(2));
        ago.setAttribute('y2', (162 - Math.cos(a) * 25).toFixed(2));
      }

      function disponiElettroni() {
        if (!lunghezza) lunghezza = filo.getTotalLength();
        punti.forEach((p) => {
          const d = ((p.u * lunghezza + posizione) % lunghezza + lunghezza) % lunghezza;
          const pt = filo.getPointAtLength(d);
          p.g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
        });
      }

      function nota() {
        const i = corrente();
        const prima = notato;
        const iPrima = prima.v / prima.r;
        let testo;
        if (stato.v === 0) {
          testo = '**Tensione zero**: nessuna spinta, quindi nessuna corrente, qualunque sia la resistenza.';
        } else if (stato.r === prima.r && stato.v !== prima.v && prima.v > 0) {
          testo = 'Tensione da **' + fmt(prima.v, 'V') + '** a **' + fmt(stato.v, 'V') + '** (' + fattore(stato.v / prima.v, num) + '): la corrente passa da **' + fmt(iPrima, 'A') + '** a **' + fmt(i, 'A') + '**, ' + (stato.v > prima.v ? 'cresce' : 'cala') + ' dello stesso fattore. Corrente e tensione sono proporzionali.';
        } else if (stato.v === prima.v && stato.r !== prima.r) {
          testo = 'Resistenza da **' + fmt(prima.r, 'Ω') + '** a **' + fmt(stato.r, 'Ω') + '** (' + fattore(stato.r / prima.r, num) + '): la corrente diventa **' + fmt(i, 'A') + '** (' + fattore(i / iPrima, num) + '). ' + (stato.r > prima.r ? 'Più il resistore frena, meno corrente passa: la retta del grafico si abbassa.' : 'Meno resistenza, più corrente: la retta del grafico si alza.');
        } else {
          testo = 'Con **' + fmt(stato.v, 'V') + '** e **' + fmt(stato.r, 'Ω') + '** passano **' + fmt(i, 'A') + '**.';
        }
        ctx.nota(testo);
        notato = { v: stato.v, r: stato.r };
      }

      function sfide(origine) {
        const i = corrente();
        if (origine === 'r') vConQuestaR = [stato.v];
        else if (origine === 'v') {
          if (vConQuestaR.some((v0) => v0 >= 0.5 && Math.abs(stato.v - 2 * v0) < 1e-9)) ctx.completa('proporzionale');
          vConQuestaR.push(stato.v);
        }
        if (Math.abs(i - 0.1) <= 0.0015) ctx.completa('cento-milli');
        if (i > 0) {
          if (combinazioni.some((c) => c.v !== stato.v && c.r !== stato.r && Math.abs(c.i - i) <= 0.01 * i)) ctx.completa('stessa-corrente');
          combinazioni.push({ v: stato.v, r: stato.r, i: i });
        }
      }

      function aggiorna(origine) {
        const i = corrente();
        if (origine === 'r') {
          const vecchia = notato.r;
          if (vecchia !== stato.r && !rPrecedenti.includes(vecchia)) rPrecedenti = [vecchia].concat(rPrecedenti).slice(0, 3);
          rPrecedenti = rPrecedenti.filter((r) => r !== stato.r);
          disegnaFantasmi();
          disegnaResistore();
        }
        livello.style.transform = 'scaleY(' + (stato.v / V_MAX).toFixed(3) + ')';
        pilaTesto.textContent = fmt(stato.v, 'V');
        pilaTesto.setAttribute('class', 'ohm-pila-testo' + (stato.v / V_MAX >= 0.6 ? '' : ' fuori'));
        const fs = portata(i);
        fondoScala.textContent = 'fondo scala ' + fmt(fs, 'A');
        lV.imposta(fmt(stato.v, 'V'));
        lR.imposta(fmt(stato.r, 'Ω'));
        lI.imposta(fmt(i, 'A'));
        formula.imposta([['I', 'i'], ' = ', ['V', 'v'], ' / ', ['R', 'r'], ' = ', [fmt(stato.v, 'V'), 'v'], ' / ', [fmt(stato.r, 'Ω'), 'r'], ' = ', [fmt(i, 'A'), 'i']]);
        if (origine) sfide(origine);
        if (ctx.ridotto) {
          mostrato.g = 1 / stato.r;
          mostrato.v = stato.v;
          mostrato.ago = i / fs;
          disegnaGrafico();
          disegnaAgo();
        } else {
          ciclo.avvia();
        }
        clearTimeout(timerNota);
        if (origine) timerNota = setTimeout(nota, 350);
      }

      const ciclo = ctx.ciclo((dt) => {
        const i = corrente();
        const k = 1 - Math.exp(-dt * 9);
        mostrato.g += (1 / stato.r - mostrato.g) * k;
        mostrato.v += (stato.v - mostrato.v) * k;
        mostrato.ago += (i / portata(i) - mostrato.ago) * (1 - Math.exp(-dt * 7));
        posizione += 260 * Math.pow(i / I_MAX, 0.6) * dt;
        disegnaGrafico();
        disegnaAgo();
        disponiElettroni();
      });
      ctx.pulizia(() => clearTimeout(timerNota));

      disegnaResistore();
      aggiorna();
      requestAnimationFrame(() => {
        disponiElettroni();
        mostrato.ago = corrente() / portata(corrente());
        disegnaAgo();
        disegnaGrafico();
      });
      ctx.nota('Con **' + fmt(stato.v, 'V') + '** e **' + fmt(stato.r, 'Ω') + '** passano **' + fmt(corrente(), 'A') + '**. Muovi un cursore e osserva l\'amperometro e il grafico.');
    },
  });
})();
