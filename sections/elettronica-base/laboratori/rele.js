/*
 * Laboratorio "Il relè e il telegrafo" (capitolo 8).
 * Il tasto chiude il circuito di linea: la corrente corre sul filo, magnetizza il nucleo
 * del relè e l'ancora scatta, chiudendo il circuito locale della lampada e del pennino
 * che segna la striscia di carta. Il decodificatore impara il ritmo di chi trasmette.
 * L'impulso sulla linea è rallentato: in realtà arriva in meno di un millesimo di secondo.
 */
(function () {
  'use strict';

  const MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
    J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  };
  // SOS si trasmette anche tutto attaccato, come un unico segnale.
  const LETTERA = { '...---...': 'SOS' };
  Object.keys(MORSE).forEach((k) => { LETTERA[MORSE[k]] = k; });
  const ALFABETO = Object.keys(MORSE).filter((k) => /[A-Z]/.test(k));

  const V_LINEA = 24;
  const R_BOBINA = 150;
  const SOGLIA = 0.02;
  const RHO_FERRO = 1e-7;
  const AREA_FILO = Math.PI * 0.002 * 0.002;
  const V_LOCALE = 6;
  const R_LAMPADA = 12;
  const U = 130; // durata di un punto battuto con i pulsanti, in ms
  const NH = 88; // altezza della striscia di carta, in px

  // Geometria: perno della leva del tasto, centro del nucleo, perno dell'ancora, lampada.
  const KX = 86;
  const KY = 186;
  const CX = 486;
  const PY = 111;
  const AX = CX + 72;
  const AY = PY - 4;
  const LX = 686;
  const LY = 58;
  const LEVA_SU = -6;
  const ANCORA_SU = 9;
  const PERCORSO_LINEA = 'M192 208 H200 Q206 208 206 202 V70 Q206 62 214 62 H428 Q436 62 436 70 V146 Q436 152 442 152 H470';
  const PERCORSO_LOCALE = 'M' + AX + ' 220 V232 Q' + AX + ' 240 ' + (AX + 8) + ' 240 H' + (LX - 8) + ' Q' + LX + ' 240 ' + LX + ' 232 V86 H654 Q646 86 646 92';

  const segni = (c) => c.split('').map((x) => (x === '.' ? '·' : '−')).join(' ');
  const aParole = (c) => c.split('').map((x) => (x === '.' ? 'punto' : 'linea')).join(', ');

  // Molla a zigzag fra due punti.
  function molla(x1, y1, x2, y2, giri, largo) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * largo;
    const ny = dx / l * largo;
    let d = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    for (let k = 1; k < giri * 2; k++) {
      const f = k / (giri * 2);
      const v = k % 2 ? 1 : -1;
      d += ' L' + (x1 + dx * f + nx * v).toFixed(1) + ' ' + (y1 + dy * f + ny * v).toFixed(1);
    }
    return d + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1);
  }

  // Punto (x, y) ruotato di "gradi" attorno a (cx, cy), come fa rotate() in SVG.
  function ruota(x, y, cx, cy, gradi) {
    const a = gradi * Math.PI / 180;
    return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
  }

  EB.laboratorio('rele', {
    monta(ctx) {
      const { h, s, fmt, F } = ctx;
      const ridotto = ctx.ridotto;
      const uid = EB.uid('rel');
      const stato = { km: 50, tasto: false, arrivo: false, chiuso: false, sorgente: null, rit: 0, marca: null };
      const rLinea = () => F.resistenzaFilo(RHO_FERRO, stato.km * 1000, AREA_FILO);
      const iLinea = () => F.corrente(V_LINEA, rLinea() + R_BOBINA);
      const iLocale = () => F.corrente(V_LOCALE, R_LAMPADA);
      const kmMax = () => Math.floor((V_LINEA / SOGLIA - R_BOBINA) / rLinea() * stato.km);
      const ritardo = () => (ridotto ? 0 : 90 + 1.4 * stato.km);

      const r = (x, y, w, hh, cls, rx) => s('rect', { x: x, y: y, width: w, height: hh, rx: rx || 0, class: cls });
      const p = (d, cls) => s('path', { d: d, class: cls });
      const t = (x, y, testo, cls, anc) => s('text', { x: x, y: y, class: cls, 'text-anchor': anc || 'middle' }, testo);
      const filo = (d) => [p(d, 'rel-filo'), p(d, 'rel-filo-rame')];
      const terra = (x, y) => p('M' + (x - 12) + ' ' + y + ' H' + (x + 12) + ' M' + (x - 8) + ' ' + (y + 5) + ' H' + (x + 8) + ' M' + (x - 4) + ' ' + (y + 10) + ' H' + (x + 4), 'rel-terra');
      function pila(x, y, w, hh, testo) {
        return [r(x + w / 2 - 7, y - 6, 14, 7, 'rel-pila-polo', 2), r(x, y, w, hh, 'rel-pila', 9),
          r(x + 6, y + 8, w - 12, hh - 14, 'rel-pila-livello', 5), t(x + w / 2, y + hh / 2 + 5, testo, 'rel-pila-testo')];
      }

      /* --- circuito: tasto, pila, linea, relè, lampada --- */
      const svg = s('svg', { viewBox: '0 0 720 270', role: 'img' });
      const pali = [264, 321, 378].map((x) => s('g', null, r(x - 2.5, 64, 5, 182, 'rel-palo'), r(x - 15, 68, 30, 4, 'rel-palo', 1), r(x - 13, 63, 5, 6, 'rel-isolatore', 1), r(x + 8, 63, 5, 6, 'rel-isolatore', 1)));
      const sfondo = s('g', { 'aria-hidden': 'true' },
        p('M42 248 H452', 'rel-terra-tratto'), pali, terra(42, 232), terra(452, 232));

      const linea = s('path', { d: PERCORSO_LINEA, class: 'rel-corrente', 'stroke-dasharray': '0 4000' });
      const locale = s('path', { d: PERCORSO_LOCALE, class: 'rel-corrente locale', opacity: 0 });
      const fili = s('g', { 'aria-hidden': 'true' },
        filo('M42 136 V126 Q42 118 50 118 H' + (KX - 8) + ' Q' + KX + ' 118 ' + KX + ' 126 V' + (KY - 4)),
        filo(PERCORSO_LINEA), filo('M42 212 V232'), filo('M470 196 H460 Q452 196 452 204 V232'),
        filo(PERCORSO_LOCALE), filo('M' + LX + ' 97 V146'), linea, locale);

      const molla1 = p('', 'rel-molla');
      const leva = s('g', null,
        r(KX - 8, KY - 4, 108, 7, 'rel-ottone', 3), r(KX + 66, KY + 3, 10, 3, 'rel-argento', 1),
        r(KX + 94, KY - 12, 6, 9, 'rel-metallo'),
        s('ellipse', { cx: KX + 97, cy: KY - 16, rx: 16, ry: 8, class: 'rel-pomello' }),
        s('ellipse', { cx: KX + 92, cy: KY - 19, rx: 7, ry: 2.4, class: 'rel-pomello-luce' }));
      const pomello = ruota(KX + 97, KY - 16, KX, KY, LEVA_SU);
      const invito = s('circle', { cx: pomello[0].toFixed(1), cy: pomello[1].toFixed(1), r: 24, class: 'rel-invito' + (ridotto ? '' : ' attivo') });
      const tasto = s('g', { 'aria-hidden': 'true' },
        pila(16, 142, 52, 70, fmt(V_LINEA, 'V')),
        t(8, 156, '+', 'rel-segno pos'), t(8, 210, '−', 'rel-segno neg'),
        r(68, 200, 130, 16, 'rel-legno', 4), p('M72 201.5 H194', 'rel-legno-luce'),
        r(KX + 65, 192, 12, 8, 'rel-argento', 1), r(KX + 71, 205, 38, 3, 'rel-rame-striscia'),
        s('circle', { cx: 192, cy: 208, r: 3.5, class: 'rel-vite' }),
        r(KX - 7, KY - 4, 14, 18, 'rel-metallo', 2), molla1, leva,
        s('circle', { cx: KX, cy: KY, r: 4.5, class: 'rel-perno' }), invito);

      const flusso = p('M' + CX + ' 200 V118 Q' + CX + ' 112 ' + (CX + 6) + ' 112 H' + (AX - 6) + ' Q' + AX + ' 112 ' + AX + ' 118 V200 Q' + AX + ' 206 ' + (AX - 6) + ' 206 H' + (CX + 6) + ' Q' + CX + ' 206 ' + CX + ' 200 Z', 'rel-campo');
      const anelli = [
        p('M' + (CX - 10) + ' 116 C' + (CX - 44) + ' 112 ' + (CX - 44) + ' 210 ' + (CX - 10) + ' 208', 'rel-campo'),
        p('M' + (CX - 12) + ' 113 C' + (CX - 62) + ' 100 ' + (CX - 62) + ' 222 ' + (CX - 12) + ' 214', 'rel-campo'),
      ];
      const frecceCampo = s('g', { class: 'rel-campo-frecce' },
        p('M' + (CX - 5) + ' 170 L' + CX + ' 161 L' + (CX + 5) + ' 170', ''),
        p('M' + (AX - 5) + ' 150 L' + AX + ' 159 L' + (AX + 5) + ' 150', ''));
      const campo = s('g', { class: 'rel-campo-g', opacity: 0 }, anelli, flusso, frecceCampo, t(CX - 20, 126, 'N', 'rel-polo'));

      const molla2 = p('', 'rel-molla');
      const ancora = s('g', null,
        r(AX - 94, AY - 4, 156, 8, 'rel-ancora', 2), p('M' + (AX - 92) + ' ' + (AY - 2.5) + ' H' + (AX + 60), 'rel-ancora-luce'),
        r(AX + 50, AY - 8, 10, 4, 'rel-argento', 1));
      const righe = [];
      for (let y = 138; y <= 202; y += 5) righe.push('M' + (CX - 18) + ' ' + y + ' H' + (CX + 18));
      const spire = p(righe.join(' '), 'rel-spire');
      const rele = s('g', { 'aria-hidden': 'true' },
        r(462, 210, 192, 10, 'rel-basetta', 3),
        r(CX - 10, PY, 20, 99, 'rel-ferro'), r(CX - 12, PY, 24, 4, 'rel-ferro-polo', 1),
        r(CX - 22, 128, 44, 5, 'rel-flangia', 1), r(CX - 18, 133, 36, 72, 'rel-bobina'), spire,
        r(CX - 22, 205, 44, 5, 'rel-flangia', 1),
        r(AX - 7, PY, 14, 99, 'rel-ferro'), r(AX + 28, 196, 8, 14, 'rel-metallo', 1), molla2,
        r(638, 90, 8, 120, 'rel-ottone', 1), r(604, 90, 42, 5, 'rel-ottone', 1), r(AX + 50, 95, 10, 4, 'rel-argento', 1),
        campo, ancora, s('circle', { cx: AX, cy: AY, r: 4, class: 'rel-perno' }));

      const idAlone = uid + '-alone';
      const filamento = 'M' + (LX - 7) + ' ' + (LY + 6) + ' L' + (LX - 5) + ' ' + (LY - 6) + ' L' + (LX - 2) + ' ' + (LY + 2) + ' L' + LX + ' ' + (LY - 8) + ' L' + (LX + 2) + ' ' + (LY + 2) + ' L' + (LX + 5) + ' ' + (LY - 6) + ' L' + (LX + 7) + ' ' + (LY + 6);
      const alone = s('circle', { cx: LX, cy: LY, r: 34, fill: 'url(#' + idAlone + ')', class: 'rel-alone', opacity: 0 });
      const accesa = p(filamento, 'rel-filamento acceso');
      accesa.setAttribute('opacity', 0);
      const lampada = s('g', { 'aria-hidden': 'true' },
        s('defs', null, s('radialGradient', { id: idAlone }, s('stop', { offset: '0', class: 'rel-alone-c' }), s('stop', { offset: '1', class: 'rel-alone-b' }))),
        alone, pila(LX - 26, 150, 52, 58, fmt(V_LOCALE, 'V')),
        s('circle', { cx: LX, cy: LY, r: 17, class: 'rel-vetro' }),
        p('M' + (LX - 7) + ' ' + (LY + 6) + ' L' + (LX - 6) + ' ' + (LY + 18) + ' M' + (LX + 7) + ' ' + (LY + 6) + ' L' + (LX + 6) + ' ' + (LY + 18), 'rel-sostegno'),
        p(filamento, 'rel-filamento'), accesa,
        r(LX - 8, LY + 17, 16, 20, 'rel-attacco', 2), p('M' + (LX - 8) + ' ' + (LY + 23) + ' H' + (LX + 8) + ' M' + (LX - 8) + ' ' + (LY + 29) + ' H' + (LX + 8), 'rel-attacco-righe'));

      const testoLinea = t(321, 44, '', 'rel-t');
      const etichette = s('g', { class: 'rel-etichette' },
        t(14, 104, 'pila di linea', 'rel-t', 'start'), t(133, 240, 'tasto', 'rel-t'), testoLinea,
        ridotto ? null : t(321, 24, 'impulso rallentato', 'rel-t rel-t-nota'),
        t(247, 266, 'ritorno attraverso la terra', 'rel-t'), t(510, 240, 'relè', 'rel-t'),
        t(662, 40, 'lampada', 'rel-t', 'end'), t(622, 262, 'circuito locale', 'rel-t'),
        t(430, 182, 'bobina', 'rel-t rel-t-parte', 'end'), t(520, 82, 'ancora', 'rel-t rel-t-parte'),
        t(598, 168, 'molla', 'rel-t rel-t-parte', 'start'), t(612, 80, 'contatti', 'rel-t rel-t-parte'));
      svg.append(sfondo, fili, tasto, rele, lampada, etichette);

      const tastoBtn = h('button', { type: 'button', class: 'rel-tasto-btn', 'aria-pressed': 'false', 'aria-label': 'Tasto del telegrafo: tienilo premuto con il mouse, con il dito, con la barra spaziatrice o con Invio' });
      const circuito = h('div', { class: 'rel-circuito' }, svg, tastoBtn);

      /* --- registratore: striscia di carta, pennino e rotolo --- */
      const idSfuma = uid + '-sfuma';
      const nastroSvg = s('svg', { class: 'rel-nastro-svg', viewBox: '0 0 720 ' + NH, role: 'img', 'aria-label': 'Striscia di carta, ancora bianca.' });
      const carta = r(-4, 14, 700, 34, 'rel-carta', 2);
      const orli = p('', 'rel-carta-orlo');
      const vuoto = t(320, 35.5, '', 'rel-nastro-vuoto');
      const pozzaM = [];
      for (let k = 0; k < 48; k++) pozzaM.push(r(0, 27.5, 0, 7, 'rel-marchio', 3.5));
      const pozzaL = [];
      for (let k = 0; k < 20; k++) pozzaL.push({ t: t(0, 78, '', 'rel-lettera'), g: p('', 'rel-graffa'), testo: '' });
      const raggi = s('g', null, p('M0 -16 V16 M-16 0 H16', 'rel-rotolo-raggi'), s('circle', { r: 6, class: 'rel-rotolo-mozzo' }));
      const rotolo = s('g', null, s('circle', { cy: 31, r: 25, class: 'rel-rotolo' }), s('circle', { cy: 31, r: 18, class: 'rel-rotolo-giro' }), raggi);
      const stilo = s('g', null, p('M0 6 L50 1.5', 'rel-stilo-leva'), s('circle', { cx: 50, cy: 1.5, r: 3, class: 'rel-perno' }), p('M-3.5 4.5 L3.5 4.5 L0 11.5 Z', 'rel-stilo'));
      const pennino = s('g', null, stilo);
      const sfuma = r(0, 0, 44, NH, '');
      sfuma.setAttribute('fill', 'url(#' + idSfuma + ')');
      nastroSvg.append(
        s('defs', null, s('linearGradient', { id: idSfuma }, s('stop', { offset: '0', class: 'rel-sfuma-a' }), s('stop', { offset: '1', class: 'rel-sfuma-b' }))),
        s('g', { 'aria-hidden': 'true' }, carta, orli, vuoto, pozzaM, pozzaL.map((x) => [x.g, x.t]), rotolo, pennino, sfuma));
      const nastroBox = h('div', { class: 'rel-nastro' },
        h('div', { class: 'rel-nastro-testa' }, h('p', null, 'Striscia di carta'), ctx.ui.bottone({ etichetta: 'Nuova striscia', click: () => nuovaStriscia(), aria: 'Nuova striscia: cancella i segni e il testo ricevuto' })),
        nastroSvg);

      /* --- alfabeto Morse --- */
      const codice = (c) => h('span', { class: 'rel-codice', 'aria-hidden': 'true' }, c.split('').map((x) => h('i', { class: x === '.' ? 'rel-p' : 'rel-l' })));
      const celle = ALFABETO.map((k) => h('li', { 'data-codice': MORSE[k], 'aria-label': k + ': ' + aParole(MORSE[k]) }, h('b', null, k), codice(MORSE[k])));
      // Sul telefono l'alfabeto parte chiuso, per non allontanare letture e comandi dal tasto.
      const stretto = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
      const tabella = h('div', { class: 'rel-tabella', hidden: stretto },
        h('p', { class: 'rel-tabella-t' }, 'Alfabeto Morse internazionale'),
        h('ol', { class: 'rel-celle' }, celle),
        h('p', { class: 'rel-tabella-n' }, h('span', null, 'SOS si batte tutto di seguito, senza pause: '), codice('...---...')));
      ctx.scena.append(circuito, nastroBox, tabella);

      /* --- letture e comandi --- */
      const lTesto = ctx.ui.lettura({ etichetta: 'Testo ricevuto', nota: ' ' });
      const lI = ctx.ui.lettura({ etichetta: 'Corrente di linea', grandezza: 'i', nota: ' ' });
      const lR = ctx.ui.lettura({ etichetta: 'Resistenza in serie', grandezza: 'r', nota: ' ' });
      const lT = ctx.ui.lettura({ etichetta: 'Il tuo punto', grandezza: 't', nota: ' ' });
      const formula = ctx.ui.formulaViva();
      const notaDi = (l) => l.el.querySelector('.eb-lettura-n');
      ctx.pannello.append(lTesto.el, lI.el, lR.el, lT.el, formula.el);

      const coda = [];
      let inCoda = false;
      const bottoni = h('div', { class: 'rel-bottoni' },
        ctx.ui.bottone({ etichetta: 'Punto', icona: '·', click: () => accoda('.') }),
        ctx.ui.bottone({ etichetta: 'Linea', icona: '−', click: () => accoda('-') }),
        ctx.ui.bottone({ etichetta: 'Fine lettera', click: () => accoda('/') }));
      const curKm = ctx.ui.cursore({ etichetta: 'Lunghezza della linea', min: 10, max: 200, passo: 10, valore: stato.km, formato: (v) => v + ' km', grandezza: 'r', cambia: cambiaKm });
      const swSuono = ctx.ui.interruttore({ etichetta: 'Suono', cambia: (on) => (on ? apriAudio() : chiudiAudio()) });
      const swTabella = ctx.ui.interruttore({ etichetta: 'Alfabeto Morse', acceso: !stretto, cambia: (on) => { tabella.hidden = !on; evidenzia(); } });
      ctx.comandi.classList.add('rel-comandi');
      ctx.comandi.append(
        h('div', { class: 'rel-gruppo', role: 'group', 'aria-label': 'Batti i segni senza tenere premuto' }, h('p', { class: 'rel-gruppo-t' }, 'Oppure batti i segni uno alla volta'), bottoni),
        curKm.el,
        h('div', { class: 'rel-opzioni' }, swSuono.el, swTabella.el));

      /* --- tempi: timer con pulizia automatica --- */
      const attese = new Set();
      function programma(fn, ms) {
        if (ms <= 0) { fn(); return; }
        const id = setTimeout(() => { attese.delete(id); fn(); }, ms);
        attese.add(id);
      }
      const timer = {};
      const dopo = (nome, fn, ms) => { clearTimeout(timer[nome]); timer[nome] = setTimeout(fn, ms); };
      const annulla = (nome) => clearTimeout(timer[nome]);
      let timerNota = 0;
      ctx.pulizia(() => {
        attese.forEach(clearTimeout);
        Object.keys(timer).forEach(annulla);
        clearTimeout(timerNota);
      });

      /* --- suono facoltativo: un cicalino mentre l'ancora è chiusa --- */
      let audio = null;
      function apriAudio() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC || audio) return;
        const ac = new AC();
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = 640;
        g.gain.value = 0;
        osc.connect(g);
        g.connect(ac.destination);
        osc.start();
        audio = { ac: ac, g: g };
        if (stato.chiuso) tono(true);
      }
      function chiudiAudio() {
        if (!audio) return;
        const pr = audio.ac.close();
        if (pr && pr.catch) pr.catch(() => {});
        audio = null;
      }
      function tono(on) {
        if (!audio) return;
        const t0 = audio.ac.currentTime;
        audio.g.gain.cancelScheduledValues(t0);
        audio.g.gain.setTargetAtTime(on ? 0.12 : 0, t0, on ? 0.004 : 0.01);
      }

      /* --- striscia: il tempo della carta avanza solo mentre il registratore gira --- */
      const nastro = { base: 0, da: 0, corre: false, w: 720, pen: 624, vel: 0.08 };
      const segnati = [];
      const ricevute = [];
      const nastroOra = (ora) => (nastro.corre ? nastro.base + ora - nastro.da : nastro.base);
      function nastroParti(ora) {
        if (nastro.corre) return;
        nastro.corre = true;
        nastro.da = ora;
      }
      function fermaNastro() {
        const ora = performance.now();
        nastro.base = nastroOra(ora);
        nastro.corre = false;
        aggiornaVista();
      }
      function misuraNastro() {
        const w = Math.max(260, Math.round(nastroBox.clientWidth || 720));
        nastro.w = w;
        nastro.pen = w - 96;
        nastro.vel = EB.clamp(w / 7500, 0.045, 0.09);
        nastroSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + NH);
        carta.setAttribute('width', w - 26);
        orli.setAttribute('d', 'M0 17.5 H' + (w - 30) + ' M0 44.5 H' + (w - 30));
        rotolo.setAttribute('transform', 'translate(' + (w - 30) + ' 0)');
        vuoto.textContent = w >= 560 ? 'tieni premuto il tasto: la carta scorre quando l’ancora scatta' : 'la carta scorre quando l’ancora scatta';
        vuoto.setAttribute('x', Math.round((nastro.pen + 30) / 2));
        disegnaNastro(performance.now());
      }
      const ro = 'ResizeObserver' in window ? new ResizeObserver(misuraNastro) : null;
      if (ro) ro.observe(nastroBox);

      /* --- decodificatore adattivo --- */
      const dec = { punto: 140, linea: 420, pausa: 160, marchi: [], testo: '', ultima: '', lettere: 0 };
      const sogliaLinea = () => Math.sqrt(dec.punto * dec.linea);
      const sogliaLettera = () => EB.clamp(Math.max(3 * dec.punto, 2.4 * dec.pausa), 300, 1500);
      const sogliaParola = () => 2.4 * sogliaLettera();
      const segniInCorso = () => dec.marchi.filter((m) => m.fin != null).map((m) => m.tipo).join('');
      const ms10 = (x) => fmt(Math.round(x / 10) / 100, 's');

      function adatta(tipo, d) {
        if (tipo === '.') dec.punto = EB.clamp(dec.punto * 0.65 + EB.clamp(d, dec.punto / 2, dec.punto * 2) * 0.35, 50, 400);
        else dec.linea = EB.clamp(dec.linea * 0.65 + EB.clamp(d, dec.linea / 2, dec.linea * 2) * 0.35, 150, 1600);
        dec.linea = Math.max(dec.linea, 2 * dec.punto);
      }

      // Un codice che non è una lettera viene diviso dove le pause erano più lunghe.
      function dividi(ms, da, a, memo) {
        const chiave = da + ':' + a;
        if (memo.has(chiave)) return memo.get(chiave);
        let esito = null;
        if (LETTERA[ms.slice(da, a).map((m) => m.tipo).join('')]) esito = [[da, a]];
        else if (a - da > 1 && a - da <= 16) {
          const tagli = [];
          for (let k = da + 1; k < a; k++) tagli.push(k);
          tagli.sort((x, y) => (ms[y].t0 - ms[y - 1].t1) - (ms[x].t0 - ms[x - 1].t1));
          for (const k of tagli) {
            const sx = dividi(ms, da, k, memo);
            const dx = sx && dividi(ms, k, a, memo);
            if (dx) { esito = sx.concat(dx); break; }
          }
        }
        memo.set(chiave, esito);
        return esito;
      }

      function chiudiLettera(auto) {
        annulla('lettera');
        const fatti = dec.marchi.filter((m) => m.fin != null);
        if (!fatti.length) return false;
        dec.marchi = dec.marchi.filter((m) => m.fin == null);
        const parti = dividi(fatti, 0, fatti.length, new Map()) || [[0, fatti.length]];
        const nuove = parti.map(([da, a]) => {
          const ms = fatti.slice(da, a);
          const codice = ms.map((m) => m.tipo).join('');
          return { testo: LETTERA[codice] || '?', codice: codice, ini: ms[0].ini, fin: ms[ms.length - 1].fin, t0: ms[0].t0, t1: ms[ms.length - 1].t1 };
        });
        ricevute.push(...nuove);
        dec.testo += nuove.map((x) => x.testo).join('');
        dec.ultima = nuove[nuove.length - 1].codice;
        if (auto) dopo('parola', spazio, sogliaParola() - sogliaLettera());
        const visibile = nastroOra(performance.now()) - (nastro.pen + 40) / nastro.vel;
        while (segnati.length && segnati[0].fin != null && segnati[0].fin < visibile) segnati.shift();
        while (ricevute.length > pozzaL.length) ricevute.shift();
        aggiornaTesto();
        lT.imposta(ms10(dec.punto));
        notaDi(lT).textContent = 'linea oltre ' + ms10(sogliaLinea()) + ', pausa ' + ms10(sogliaLettera());
        notaLettere(nuove);
        dec.lettere += nuove.length;
        const compatto = dec.testo.replace(/\s+/g, '');
        if (compatto.includes('SOS')) ctx.completa('sos');
        if (compatto.includes('CIAO')) ctx.completa('ciao');
        aggiornaVista();
        return true;
      }

      function spazio() {
        if (dec.testo && !/\s$/.test(dec.testo)) dec.testo += ' ';
        aggiornaTesto();
      }

      /* --- tasto, linea e relè --- */
      const impulsi = [];
      function premi(forzato) {
        if (stato.tasto) return;
        stato.tasto = true;
        tastoBtn.setAttribute('aria-pressed', 'true');
        invito.classList.add('spento');
        const ora = performance.now();
        stato.rit = ritardo();
        impulsi.push({ t0: ora, t1: null, rit: stato.rit });
        const rit = stato.rit;
        programma(() => arrivo(true, forzato), rit);
        aggiornaVista();
      }
      function rilascia() {
        if (!stato.tasto) return;
        stato.tasto = false;
        stato.sorgente = null;
        tastoBtn.setAttribute('aria-pressed', 'false');
        const im = impulsi[impulsi.length - 1];
        if (im) im.t1 = performance.now();
        if (ridotto) impulsi.length = 0;
        programma(() => arrivo(false), stato.rit);
        aggiornaVista();
      }
      function premiTasto() {
        coda.length = 0;
        stato.sorgente = 'tasto';
        premi(null);
      }
      function lasciaTasto() {
        if (stato.sorgente === 'tasto') rilascia();
      }

      // Pulsanti "punto", "linea", "fine lettera": una coda suonata con tempi regolari.
      function accoda(x) {
        coda.push(x);
        if (!inCoda) prossimo();
      }
      function prossimo() {
        if (!coda.length || stato.sorgente === 'tasto') { inCoda = false; return; }
        inCoda = true;
        const x = coda.shift();
        if (x === '/') {
          programma(() => { if (!chiudiLettera(false)) spazio(); }, ritardo());
          programma(prossimo, U);
          return;
        }
        stato.sorgente = 'coda';
        premi(x);
        programma(() => {
          if (stato.sorgente === 'coda') rilascia();
          programma(prossimo, U);
        }, x === '.' ? U : 3 * U);
      }

      let primoScatto = true;
      let debolePer = 0;
      function arrivo(on, forzato) {
        stato.arrivo = on;
        spire.classList.toggle('on', on);
        campo.classList.toggle('on', on);
        if (on) {
          if (iLinea() >= SOGLIA) chiudiRele(forzato);
          else if (debolePer !== stato.km) {
            debolePer = stato.km;
            nota('La corrente arriva, ma **' + fmt(iLinea(), 'A') + '** non bastano: il nucleo si magnetizza poco e la molla tiene ferma l\'ancora, così la striscia resta bianca. Accorcia la linea sotto i **' + kmMax() + ' km**.');
          }
        } else if (stato.chiuso) apriRele();
        aggiornaVista();
      }

      function chiudiRele(forzato) {
        const ora = performance.now();
        stato.chiuso = true;
        tono(true);
        nastroParti(ora);
        annulla('lettera');
        annulla('parola');
        annulla('fermo');
        const prec = dec.marchi[dec.marchi.length - 1];
        if (prec && !forzato && !prec.forzato) dec.pausa = EB.clamp(dec.pausa * 0.7 + (ora - prec.t1) * 0.3, 60, 600);
        const m = { ini: nastroOra(ora), fin: null, t0: ora, t1: 0, tipo: forzato || null, forzato: !!forzato };
        segnati.push(m);
        dec.marchi.push(m);
        stato.marca = m;
        descrivi();
        ctx.completa('scatto');
        if (primoScatto) {
          primoScatto = false;
          nota('L\'ancora è scattata: **' + fmt(iLinea(), 'A') + '** nella bobina magnetizzano il nucleo e l\'ancora chiude i contatti. La pila locale manda **' + fmt(iLocale(), 'A') + '** nella lampada, più di **' + Math.floor(iLocale() / iLinea()) + ' volte** la corrente di linea: un circuito debole ne comanda uno forte.');
        }
      }

      function apriRele() {
        const ora = performance.now();
        stato.chiuso = false;
        tono(false);
        const m = stato.marca;
        stato.marca = null;
        descrivi();
        if (!m) return;
        m.fin = nastroOra(ora);
        m.t1 = ora;
        if (!m.tipo) {
          const d = ora - m.t0;
          m.tipo = d < sogliaLinea() ? '.' : '-';
          adatta(m.tipo, d);
        }
        if (!m.forzato) dopo('lettera', () => chiudiLettera(true), sogliaLettera());
        dopo('fermo', fermaNastro, sogliaParola() + 700);
        aggiornaTesto();
      }

      function nuovaStriscia() {
        annulla('lettera');
        annulla('parola');
        segnati.length = 0;
        ricevute.length = 0;
        dec.marchi = stato.marca ? [stato.marca] : [];
        if (stato.marca) segnati.push(stato.marca);
        dec.testo = '';
        dec.ultima = '';
        aggiornaTesto();
        aggiornaVista();
        nota('Striscia nuova. Il decodificatore ricorda il tuo ritmo: un punto dura circa **' + ms10(dec.punto) + '**, oltre **' + ms10(sogliaLinea()) + '** è una linea.');
      }

      /* --- testi --- */
      let ultimaNota = '';
      function nota(testo) {
        if (testo === ultimaNota) return;
        ultimaNota = testo;
        ctx.nota(testo);
      }

      function notaLettere(nuove) {
        const elenco = nuove.map((x) => '**' + x.testo + '** (' + segni(x.codice) + ')').join(' e ');
        const testo = dec.testo.trim();
        const compatto = testo.replace(/\s+/g, '');
        const ult = nuove[nuove.length - 1];
        if (ult.testo === '?') {
          nota('Il codice **' + segni(ult.codice) + '** non è una lettera: forse due lettere si sono unite. Stacca un po\' di più tra una lettera e l\'altra: ora la pausa che chiude una lettera è di **' + ms10(sogliaLettera()) + '**.');
        } else if (compatto.includes('CIAO') && !ctx.fatta('ciao')) {
          const lt = ricevute.slice(-4);
          const durata = lt.length === 4 && lt.map((x) => x.testo).join('') === 'CIAO' ? (lt[3].t1 - lt[0].t0) / 1000 : 0;
          nota('Ricevuto **CIAO**: 11 segni in 4 lettere' + (durata ? ', battuti in **' + ctx.num(durata, 1) + ' s**' : '') + '. A 20 parole al minuto, il ritmo di un operatore allenato, bastano circa **2,3 s**.');
        } else if (compatto.includes('SOS') && !ctx.fatta('sos')) {
          nota('Ricevuto **SOS**: tre punti, tre linee, tre punti. Nel 1906 la conferenza radiotelegrafica di Berlino lo scelse come segnale di soccorso: non è una sigla, è una sequenza facile da battere e da riconoscere.');
        } else if (!dec.lettere) {
          nota('Ricevuto ' + elenco + '. Il decodificatore impara il tuo ritmo: per ora un punto dura circa **' + ms10(dec.punto) + '**, oltre **' + ms10(sogliaLinea()) + '** è una linea e una pausa di **' + ms10(sogliaLettera()) + '** chiude la lettera.');
        } else {
          nota('Ricevuto ' + elenco + (nuove.length > 1 ? ', divise dove la pausa era più lunga' : '') + '. Testo: **' + testo + '**.');
        }
      }

      function notaKm() {
        const rl = rLinea();
        const i = iLinea();
        if (i >= SOGLIA) {
          nota('Linea di **' + stato.km + ' km**: il filo di ferro ha **' + fmt(rl, 'Ω') + '**, con la bobina **' + fmt(rl + R_BOBINA, 'Ω') + '**. A tasto premuto passano **' + fmt(i, 'A') + '**, sopra la soglia di **' + fmt(SOGLIA, 'A') + '**: il relè scatta.');
        } else {
          debolePer = stato.km;
          nota('Linea di **' + stato.km + ' km**: **' + fmt(rl, 'Ω') + '** di filo più **' + fmt(R_BOBINA, 'Ω') + '** di bobina. Passerebbero solo **' + fmt(i, 'A') + '**, sotto i **' + fmt(SOGLIA, 'A') + '** che servono all\'ancora: il relè non scatta. Per questo sulle linee lunghe si inserivano relè ripetitori, ciascuno con la sua pila.');
        }
      }

      function cambiaKm(v) {
        stato.km = v;
        aggiornaLetture();
        clearTimeout(timerNota);
        timerNota = setTimeout(notaKm, 350);
        aggiornaVista();
      }

      function aggiornaLetture() {
        const rl = rLinea();
        const rt = rl + R_BOBINA;
        const i = iLinea();
        lI.imposta(fmt(i, 'A'));
        lI.el.classList.toggle('rel-debole', i < SOGLIA);
        notaDi(lI).textContent = i < SOGLIA ? 'sotto i ' + fmt(SOGLIA, 'A') + ': l’ancora non scatta' : 'il relè scatta da ' + fmt(SOGLIA, 'A');
        lR.imposta(fmt(rt, 'Ω'));
        notaDi(lR).textContent = fmt(rl, 'Ω') + ' linea + ' + fmt(R_BOBINA, 'Ω') + ' bobina';
        formula.imposta([['I', 'i'], ' = ', ['V', 'v'], ' / ', ['R', 'r'], ' = ', [fmt(V_LINEA, 'V'), 'v'], ' / ', [fmt(rt, 'Ω'), 'r'], ' = ', [fmt(i, 'A'), 'i']]);
        testoLinea.textContent = stato.km + ' km di linea · ' + fmt(rl, 'Ω');
        descrivi();
      }

      function aggiornaTesto() {
        const testo = dec.testo.trim();
        lTesto.imposta(testo ? testo.slice(-10) : '–');
        const inCorso = segniInCorso();
        const ult = ricevute[ricevute.length - 1];
        notaDi(lTesto).textContent = inCorso ? 'in arrivo: ' + segni(inCorso) : ult && testo ? 'ultima: ' + ult.testo + ' (' + segni(ult.codice) + ')' : 'ancora nessun segno';
        nastroSvg.setAttribute('aria-label', 'Striscia di carta: ' + (testo ? 'ricevuto ' + testo : 'ancora bianca') + (inCorso ? ', segni in arrivo ' + aParole(inCorso) : '') + '.');
        evidenzia();
      }

      function evidenzia() {
        if (tabella.hidden) return;
        const inCorso = segniInCorso();
        celle.forEach((li) => {
          const c = li.dataset.codice;
          li.classList.toggle('rel-possibile', !!inCorso && c.startsWith(inCorso) && c !== inCorso);
          li.classList.toggle('rel-esatta', !!inCorso && c === inCorso);
          li.classList.toggle('rel-ultima', !inCorso && c === dec.ultima);
        });
      }

      function descrivi() {
        svg.setAttribute('aria-label', 'Telegrafo con relè. A sinistra la pila di linea da ' + fmt(V_LINEA, 'V') + ' e il tasto, ' + (stato.tasto ? 'premuto' : 'alzato') +
          '; al centro ' + stato.km + ' km di filo su pali, con ritorno attraverso la terra; a destra il relè, con la bobina da ' + fmt(R_BOBINA, 'Ω') + ' sul nucleo di ferro e l\'ancora ' +
          (stato.chiuso ? 'attirata: i contatti chiudono il circuito locale e la lampada è accesa.' : 'sollevata dalla molla: i contatti sono aperti e la lampada è spenta.'));
      }

      /* --- disegno e animazione --- */
      const mostra = { leva: LEVA_SU, ancora: ANCORA_SU, v: 0, luce: 0, campo: 0 };
      let lungLinea = 0;
      const intensita = () => EB.clamp(iLinea() / 0.04, 0.25, 1);
      const bersagli = () => ({ leva: stato.tasto ? 0 : LEVA_SU, luce: stato.chiuso ? 1 : 0, campo: stato.arrivo ? intensita() : 0 });

      function disegnaLinea(ora) {
        if (ridotto) {
          linea.setAttribute('stroke-dasharray', stato.tasto ? 'none' : '0 4000');
          return;
        }
        if (!lungLinea) lungLinea = linea.getTotalLength() || 600;
        const L = lungLinea;
        const tratti = impulsi.map((im) => [im.t1 == null ? 0 : EB.clamp((ora - im.t1) / im.rit, 0, 1) * L, EB.clamp((ora - im.t0) / im.rit, 0, 1) * L])
          .filter((x) => x[1] > x[0] + 0.5).sort((a, b) => a[0] - b[0]);
        const d = [0];
        let pos = 0;
        tratti.forEach(([a, b]) => {
          const ini = Math.max(a, pos);
          if (b <= ini) return;
          d.push(ini - pos, b - ini);
          pos = b;
        });
        d.push(L + 10);
        linea.setAttribute('stroke-dasharray', d.length > 2 ? d.map((x) => x.toFixed(1)).join(' ') : '0 ' + (L + 10));
      }

      function disegnaNastro(ora) {
        const tn = nastroOra(ora);
        const x = (tt) => nastro.pen - (tn - tt) * nastro.vel;
        let k = 0;
        for (let i = segnati.length - 1; i >= 0 && k < pozzaM.length; i--) {
          const m = segnati[i];
          const x2 = m.fin == null ? nastro.pen : x(m.fin);
          if (x2 < -10) break;
          const x1 = Math.min(x(m.ini), x2 - 4);
          pozzaM[k].setAttribute('x', x1.toFixed(1));
          pozzaM[k].setAttribute('width', (x2 - x1).toFixed(1));
          k++;
        }
        for (; k < pozzaM.length; k++) pozzaM[k].setAttribute('width', 0);
        pozzaL.forEach((el, j) => {
          const l = ricevute[ricevute.length - 1 - j];
          const x1 = l ? x(l.ini) : 0;
          const x2 = l ? Math.max(x(l.fin), x1 + 4) : 0;
          const testo = l && x2 > -20 ? l.testo : '';
          if (testo !== el.testo) {
            el.testo = testo;
            el.t.textContent = testo;
          }
          if (!testo) { el.g.setAttribute('d', ''); return; }
          el.t.setAttribute('x', ((x1 + x2) / 2).toFixed(1));
          el.g.setAttribute('d', 'M' + x1.toFixed(1) + ' 53 V57 H' + x2.toFixed(1) + ' V53');
        });
        vuoto.style.display = segnati.length ? 'none' : '';
        const giu = 1 - mostra.ancora / ANCORA_SU;
        pennino.setAttribute('transform', 'translate(' + nastro.pen + ' 0)');
        stilo.setAttribute('transform', 'translate(0 ' + (giu * 2.5).toFixed(2) + ')');
        raggi.setAttribute('transform', 'translate(0 31) rotate(' + (-(tn * nastro.vel / 25) * 180 / Math.PI % 360).toFixed(1) + ')');
      }

      function disegna(ora) {
        leva.setAttribute('transform', 'rotate(' + mostra.leva.toFixed(2) + ' ' + KX + ' ' + KY + ')');
        ancora.setAttribute('transform', 'rotate(' + mostra.ancora.toFixed(2) + ' ' + AX + ' ' + AY + ')');
        const a1 = ruota(KX + 40, KY + 3.5, KX, KY, mostra.leva);
        molla1.setAttribute('d', molla(a1[0], a1[1], KX + 40, 200, 3, 3.5));
        const a2 = ruota(AX + 32, AY + 4, AX, AY, mostra.ancora);
        molla2.setAttribute('d', molla(a2[0], a2[1], AX + 32, 196, 7, 4));
        const luce = mostra.luce.toFixed(3);
        alone.setAttribute('opacity', luce);
        accesa.setAttribute('opacity', luce);
        locale.setAttribute('opacity', luce);
        campo.setAttribute('opacity', mostra.campo.toFixed(3));
        disegnaLinea(ora);
        disegnaNastro(ora);
      }

      const ciclo = ctx.ciclo((dt) => {
        const ora = performance.now();
        const b = bersagli();
        mostra.leva += (b.leva - mostra.leva) * (1 - Math.exp(-dt * 40));
        // L'ancora accelera verso il nucleo (o la molla la riporta su) e rimbalza un poco sull'arresto.
        const acc = stato.chiuso ? -5200 : 3600;
        const rimbalzo = Math.abs(acc) * dt * 2 + 20;
        mostra.v += acc * dt;
        mostra.ancora += mostra.v * dt;
        if (mostra.ancora <= 0) {
          mostra.ancora = 0;
          mostra.v = mostra.v < -rimbalzo ? -mostra.v * 0.3 : 0;
        } else if (mostra.ancora >= ANCORA_SU) {
          mostra.ancora = ANCORA_SU;
          mostra.v = mostra.v > rimbalzo ? -mostra.v * 0.25 : 0;
        }
        mostra.luce += (b.luce - mostra.luce) * (1 - Math.exp(-dt * (b.luce > mostra.luce ? 30 : 12)));
        mostra.campo += (b.campo - mostra.campo) * (1 - Math.exp(-dt * 20));
        while (impulsi.length && impulsi[0].t1 != null && ora - impulsi[0].t1 >= impulsi[0].rit) impulsi.shift();
        disegna(ora);
        const fermo = !stato.tasto && !impulsi.length && !nastro.corre && mostra.v === 0 &&
          mostra.ancora === (stato.chiuso ? 0 : ANCORA_SU) && Math.abs(b.leva - mostra.leva) < 0.02 &&
          Math.abs(b.luce - mostra.luce) < 0.004 && Math.abs(b.campo - mostra.campo) < 0.004;
        if (fermo) {
          Object.assign(mostra, { leva: b.leva, luce: b.luce, campo: b.campo });
          disegna(ora);
          ciclo.ferma();
        }
      });

      // Con il movimento ridotto gli stati cambiano di colpo e la carta avanza a scatti.
      function aggiornaVista() {
        if (!ridotto) { ciclo.avvia(); return; }
        const b = bersagli();
        Object.assign(mostra, { leva: b.leva, ancora: stato.chiuso ? 0 : ANCORA_SU, v: 0, luce: b.luce, campo: b.campo });
        disegna(performance.now());
      }

      /* --- tasto: puntatore, dito, barra spaziatrice o Invio (la ripetizione è ignorata) --- */
      ctx.su(tastoBtn, 'pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { tastoBtn.setPointerCapture(e.pointerId); } catch (err) { /* puntatore già rilasciato */ }
        premiTasto();
      });
      ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach((ev) => ctx.su(tastoBtn, ev, lasciaTasto));
      ctx.su(window, 'blur', lasciaTasto);
      ctx.su(tastoBtn, 'contextmenu', (e) => e.preventDefault());
      ctx.su(tastoBtn, 'keydown', (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        if (!e.repeat) premiTasto();
      });
      ctx.su(tastoBtn, 'keyup', (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        lasciaTasto();
      });

      aggiornaLetture();
      aggiornaTesto();
      lT.imposta(ms10(dec.punto));
      notaDi(lT).textContent = 'si adatta al tuo ritmo';
      misuraNastro();
      aggiornaVista();
      nota('Tieni premuto il **tasto**, anche con la barra spaziatrice: con **' + stato.km + ' km** di linea nella bobina passano **' + fmt(iLinea(), 'A') + '**, più dei **' + fmt(SOGLIA, 'A') + '** che servono ad attirare l\'ancora. Un tocco breve è un punto, uno lungo una linea.');

      return {
        distruggi() {
          chiudiAudio();
          if (ro) ro.disconnect();
        },
      };
    },
  });
})();
