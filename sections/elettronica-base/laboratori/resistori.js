/*
 * Laboratorio "Leggi il resistore" (capitolo 3).
 * Un grande resistore a quattro bande: ogni banda è un pulsante che apre una tavolozza
 * di colori (le frecce li fanno scorrere), un cursore percorre la serie E12 e la tabella
 * del codice colori si accende sulle cifre in uso. In modalità «Misteriosi» il resistore
 * arriva a sorpresa e si sceglie il suo valore fra quattro risposte.
 */
(function () {
  'use strict';

  const F = EBFisica;
  const NB = ' ';
  const NOMI = F.COLORI.map((c) => c.nome);
  const ORDINE = NOMI.concat(['oro', 'argento']);
  // Colori ammessi per ogni banda: la prima cifra non è mai zero.
  const LISTE = [
    NOMI.slice(1),
    NOMI,
    ORDINE.filter((n) => n in F.MOLTIPLICATORI),
    ORDINE.filter((n) => n in F.TOLLERANZE),
  ];
  const SFONDO = { oro: 'linear-gradient(90deg, #8c6a14, #f1d06a, #a37f1f)', argento: 'linear-gradient(90deg, #788188, #f0f3f5, #8b949b)' };
  F.COLORI.forEach((c) => { SFONDO[c.nome] = c.hex; });
  const TESTO_CHIARO = ['nero', 'marrone', 'rosso', 'blu', 'viola'];
  const RUOLI = ['1ª cifra', '2ª cifra', 'moltiplicatore', 'tolleranza'];
  const BANDE = ['prima cifra', 'seconda cifra', 'moltiplicatore', 'tolleranza'];
  const NOTE_TAVOLOZZA = ['La prima banda non è mai nera: uno zero davanti non servirebbe.', '', 'Oro e argento non aggiungono zeri: dividono per 10 e per 100.', 'Più la percentuale è piccola, più il resistore è preciso.'];
  const CONSIGLI = {
    zeri: 'Conta bene gli zeri: il moltiplicatore dice quanti aggiungerne dopo le due cifre.',
    terza: 'La terza banda non è una cifra: è il moltiplicatore.',
    verso: 'Si legge partendo dal lato opposto alla banda della tolleranza.',
  };
  const XB = [190, 244, 298, 456]; // centro di ogni banda nel viewBox 640 × 236
  const CORPO = 'M174 36H200C210 36 212 48 222 48H418C428 48 430 36 440 36H466C482 36 490 60 490 92S482 148 466 148H440C430 148 428 136 418 136H222C212 136 210 148 200 148H174C158 148 150 124 150 92S158 36 174 36Z';

  // Serie E12 da 1 Ω a 10 MΩ per il cursore; i misteriosi vanno da 10 Ω a 820 kΩ.
  const SERIE = [];
  for (let e = -1; e <= 5; e++) F.E12.forEach((b) => SERIE.push(Number((b * Math.pow(10, e)).toPrecision(12))));
  SERIE.push(1e7);
  const MISTERIOSI = SERIE.filter((v) => v >= 10 && v < 1e6);
  const TOLL_MISTERIOSE = ['oro', 'oro', 'oro', 'argento', 'marrone', 'rosso'];

  function ohm(v, cifre) {
    if (v < 1) return v.toLocaleString('it-IT', { maximumSignificantDigits: cifre || 3 }) + NB + 'Ω';
    return F.formatta(v, 'Ω', { cifre: cifre || 3 });
  }
  function decimale(v) { return v.toLocaleString('it-IT', { maximumFractionDigits: 2 }); }
  // 47000 → "47 000"; i numeri di quattro cifre restano interi ("4700").
  function intero(v) {
    const t = String(Math.round(v));
    return t.length > 4 ? t.replace(/\B(?=(\d{3})+(?!\d))/g, NB) : t;
  }
  function molt(m) {
    if (m < 0) return '×' + NB + decimale(Math.pow(10, m));
    return '×' + NB + Math.pow(10, m % 3) + ['', NB + 'k', NB + 'M', NB + 'G'][Math.floor(m / 3)];
  }
  function fattore(m) { return m < 0 ? decimale(Math.pow(10, m)) : intero(Math.pow(10, m)); }
  function toll(t) { return '±' + NB + decimale(t) + '%'; }
  function significato(k, n) {
    if (k < 2) return String(NOMI.indexOf(n));
    return k === 2 ? molt(F.MOLTIPLICATORI[n]) : toll(F.TOLLERANZE[n]);
  }
  function ad(n) { return (/^a/.test(n) ? 'ad ' : 'a ') + '**' + n + '**'; }
  function nelleE12(v) { return Math.abs(F.arrotondaE12(v) / v - 1) < 1e-9; }
  function caso(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  function mescola(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // «giallo (4), viola (7) e rosso (× 100) fanno 47 × 100 Ω = 4,7 kΩ»
  function lettura(b) {
    const v = F.valoreDaColori(b);
    const due = NOMI.indexOf(b[0]) * 10 + NOMI.indexOf(b[1]);
    return '**' + b[0] + '** (' + significato(0, b[0]) + '), **' + b[1] + '** (' + significato(1, b[1]) + ') e **' + b[2] + '** (' + significato(2, b[2]) + ') fanno ' +
      due + ' × ' + fattore(F.MOLTIPLICATORI[b[2]]) + NB + 'Ω = **' + ohm(v) + '**';
  }
  function fuoriSerie(v) {
    const dec = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    const base = v / dec;
    const sotto = F.E12.filter((x) => x <= base + 1e-9).pop() * dec;
    const sopra = (F.E12.find((x) => x >= base - 1e-9) || 100) * dec;
    return ohm(v) + ' non fa parte della serie E12: i valori vicini sono ' + ohm(sotto) + ' e ' + ohm(sopra) + '.';
  }

  EB.laboratorio('resistori', {
    monta(ctx) {
      const { h, s, ui } = ctx;
      const id = EB.uid('res');
      const url = (n) => 'url(#' + id + '-' + n + ')';
      const vernice = (n) => (n === 'oro' || n === 'argento' ? url(n) : SFONDO[n]);
      const stato = { bande: ['marrone', 'nero', 'rosso', 'oro'], modo: 'componi' };
      const quiz = { valore: 0, opzioni: [], risposto: false, serie: 0 };
      const ingresso = { x: 0, v: 0 };
      const vista = { stretto: null, x0: 0, w: 640 };
      let composte = stato.bande.slice();
      let notato = stato.bande.slice();
      let aperta = -1;
      let sopra = -1;
      let fuoco = -1;
      let giu = null;
      let timerNota = 0;
      let ultimaNota = '';

      /* --- il resistore --- */
      function gradiente(nome, stop, orizzontale) {
        return s('linearGradient', { id: id + '-' + nome, x2: orizzontale ? 1 : 0, y2: orizzontale ? 0 : 1 },
          stop.map(([o, c, a]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': a == null ? 1 : a })));
      }
      function radiale(nome, colore, a) {
        return s('radialGradient', { id: id + '-' + nome },
          s('stop', { offset: 0, 'stop-color': colore, 'stop-opacity': a }), s('stop', { offset: 1, 'stop-color': colore, 'stop-opacity': 0 }));
      }
      // Ogni banda ha due strisce: quella visibile e quella che entra quando il colore cambia.
      const rulli = XB.map((x) => {
        const a = s('rect', { x: -12, y: 28, width: 24, height: 128 });
        const b = s('rect', { x: -12, y: 28, width: 24, height: 128, transform: 'translate(0 128)' });
        return { a: a, b: b, g: s('g', { transform: 'translate(' + x + ' 0)' }, a, b), p: 1, dir: 1 };
      });
      const pezzo = s('g', null,
        s('ellipse', { cx: 320, cy: 168, rx: 196, ry: 11, fill: url('ombra') }),
        [30, 470].map((x) => s('rect', { x: x, y: 88.5, width: 140, height: 7, rx: 3.5, fill: url('filo') })),
        s('path', { d: CORPO, fill: url('corpo') }),
        s('g', { 'clip-path': url('sagoma') }, rulli.map((r) => r.g)),
        s('path', { d: CORPO, fill: url('cil') }),
        s('path', { d: CORPO, class: 'res-bordo' }));
      const guide = XB.map(() => s('path', { class: 'res-guida' }));
      const punti = XB.map(() => s('circle', { cy: 231, r: 3.5, class: 'res-guida-punto' }));
      const svg = s('svg', { viewBox: '0 0 640 236', class: 'res-svg', role: 'img' },
        s('defs', null,
          gradiente('corpo', [[0, '#f1e3c1'], [0.55, '#dbc495'], [1, '#a98f5a']]),
          gradiente('cil', [[0, '#fff', 0], [0.17, '#fff', 0.5], [0.4, '#fff', 0], [0.75, '#000', 0.1], [1, '#000', 0.42]]),
          gradiente('filo', [[0, '#f4f7f8'], [0.45, '#aab4b9'], [1, '#535c61']]),
          gradiente('oro', [[0, '#8c6a14'], [0.5, '#f1d06a'], [1, '#a37f1f']], true),
          gradiente('argento', [[0, '#788188'], [0.5, '#f0f3f5'], [1, '#8b949b']], true),
          radiale('luce', '#ffd27a', 0.09), radiale('ombra', '#000', 0.6),
          s('clipPath', { id: id + '-sagoma' }, s('path', { d: CORPO }))),
        s('ellipse', { cx: 320, cy: 96, rx: 340, ry: 140, fill: url('luce') }),
        pezzo,
        s('g', { 'aria-hidden': 'true' }, guide, punti));

      /* --- pulsanti delle bande e tavolozza --- */
      const tavTitolo = h('p', { class: 'res-tav-t', id: id + '-tav-t' });
      const tavGriglia = h('div', { class: 'res-tav-griglia', role: 'radiogroup', 'aria-labelledby': id + '-tav-t' });
      const tavNota = h('p', { class: 'res-tav-nota' });
      const tavolozza = h('div', { class: 'res-tavolozza', id: id + '-tav', role: 'dialog', 'aria-labelledby': id + '-tav-t', hidden: true }, tavTitolo, tavGriglia, tavNota);
      const pulsanti = XB.map((x, k) => {
        const b = h('button', {
          type: 'button', class: 'res-banda-btn', 'aria-expanded': 'false', 'aria-controls': id + '-tav', 'aria-describedby': id + '-aiuto',
          style: { top: 28 / 2.36 + '%', height: 128 / 2.36 + '%' },
        });
        b.addEventListener('click', () => {
          giu = null;
          if (aperta === k) chiudiTavolozza(true);
          else apriTavolozza(k);
        });
        b.addEventListener('keydown', (e) => frecce(e, k));
        b.addEventListener('pointerenter', () => { sopra = k; accendi(); });
        b.addEventListener('pointerleave', () => { sopra = -1; accendi(); });
        b.addEventListener('focus', () => { fuoco = k; accendi(); });
        b.addEventListener('blur', () => { fuoco = -1; accendi(); });
        return b;
      });
      const banco = h('div', { class: 'res-banco' }, svg, h('div', { class: 'res-bande' }, pulsanti, tavolozza),
        h('span', { id: id + '-aiuto', class: 'sr-only' }, 'Frecce: cambia colore. Invio: apri la tavolozza dei colori.'));

      const etichette = [0, 1, 2, 3].map((k) => {
        const e = { sw: h('span', { class: 'res-etichetta-sw' }), nome: h('span', { class: 'res-etichetta-nome' }), val: h('span', { class: 'res-etichetta-val' }) };
        e.el = h('div', { class: 'res-etichetta' }, e.sw, e.nome, e.val, h('span', { class: 'res-etichetta-ruolo' }, RUOLI[k]));
        e.el.addEventListener('click', () => apriTavolozza(k));
        e.el.addEventListener('pointerenter', () => { sopra = k; accendi(); });
        e.el.addEventListener('pointerleave', () => { sopra = -1; accendi(); });
        return e;
      });

      /* --- valore letto, oppure la domanda dei misteriosi --- */
      const lValore = ui.lettura({ etichetta: 'Valore', grandezza: 'r' });
      const lMin = ui.lettura({ etichetta: 'Minimo', grandezza: 'r' });
      const lMax = ui.lettura({ etichetta: 'Massimo', grandezza: 'r' });
      const fasciaBanda = h('span', { class: 'res-fascia-banda' });
      const fasciaT = h('span', { class: 'res-fascia-t' });
      const formula = ui.formulaViva();
      const bloccoValore = h('div', { class: 'res-valore' },
        h('div', { class: 'res-letture' }, lValore.el, lMin.el, lMax.el),
        h('div', { class: 'res-fascia', 'aria-hidden': 'true' },
          h('div', { class: 'res-fascia-scala' }, fasciaBanda, h('span', { class: 'res-fascia-zero' })),
          h('div', { class: 'res-fascia-assi' }, h('span', null, '−10%'), fasciaT, h('span', null, '+10%'))),
        formula.el);

      const risposte = [0, 1, 2, 3].map((i) => {
        const b = h('button', { type: 'button', class: 'eb-btn res-risposta' });
        b.addEventListener('click', () => rispondi(i));
        return b;
      });
      const puntiSerie = [0, 1, 2].map(() => h('span', { class: 'res-serie-p' }));
      const serieT = h('span');
      const esito = h('p', { class: 'res-esito' });
      const prossimo = h('button', { type: 'button', class: 'eb-btn primario res-prossimo', hidden: true }, 'Nuovo resistore', h('span', { 'aria-hidden': 'true' }, ' →'));
      prossimo.addEventListener('click', () => nuovoMisterioso(true));
      const bloccoQuiz = h('div', { class: 'res-quiz', hidden: true },
        h('div', { class: 'res-quiz-testa' },
          h('p', { class: 'res-quiz-t' }, 'Quanto vale questo resistore?'),
          h('p', { class: 'res-serie' }, h('span', { class: 'res-serie-punti', 'aria-hidden': 'true' }, puntiSerie), serieT)),
        h('div', { class: 'res-risposte' }, risposte),
        h('div', { class: 'res-quiz-piede' }, esito, prossimo));

      const scena = h('div', { class: 'res-scena' }, banco,
        h('div', { class: 'res-etichette', 'aria-hidden': 'true' }, etichette.map((e) => e.el)),
        bloccoValore, bloccoQuiz);
      ctx.scena.append(scena);

      /* --- tabella del codice colori --- */
      const righe = {};
      const corpoTab = h('tbody', null, ORDINE.map((n) => {
        const celle = [NOMI.includes(n) ? String(NOMI.indexOf(n)) : '–', molt(F.MOLTIPLICATORI[n]), n in F.TOLLERANZE ? decimale(F.TOLLERANZE[n]) + '%' : '–']
          .map((t) => h('td', null, h('span', null, t)));
        righe[n] = celle;
        return h('tr', null, h('th', { scope: 'row' }, h('span', { class: 'res-sw', style: { '--c': SFONDO[n] } }), n), celle);
      }));
      const nascosto = (t) => h('span', { class: 'sr-only' }, t);
      ctx.pannello.append(h('div', { class: 'res-pannello' },
        h('table', { class: 'res-tab' },
          h('caption', null, 'Codice colori'),
          h('thead', null, h('tr', null,
            h('th', { scope: 'col' }, 'Colore'),
            h('th', { scope: 'col' }, 'Cifra'),
            h('th', { scope: 'col' }, h('span', { 'aria-hidden': 'true' }, '×'), nascosto('Moltiplicatore')),
            h('th', { scope: 'col' }, h('span', { 'aria-hidden': 'true' }, '±'), nascosto('Tolleranza')))),
          corpoTab),
        h('p', { class: 'res-consiglio' }, EB.testo('**Come si legge.** Tieni a destra la banda della tolleranza: di solito è oro o argento ed è un po\' staccata dalle altre. Poi leggi da sinistra: due cifre e il moltiplicatore.'))));

      /* --- comandi --- */
      const modo = ui.scelta({
        etichetta: 'Modalità', valore: 'componi', cambia: cambiaModo,
        opzioni: [{ valore: 'componi', etichetta: 'Componi' }, { valore: 'misteriosi', etichetta: 'Misteriosi' }],
      });
      const cursore = ui.cursore({ etichetta: 'Valore della serie E12', valori: SERIE, valore: 1000, unita: 'Ω', grandezza: 'r', formato: (v) => ohm(v, 4), cambia: dalCursore });
      ctx.comandi.append(modo.el, cursore.el);

      /* --- cambi di colore --- */
      function frecce(e, k) {
        const lista = LISTE[k];
        const i = lista.indexOf(stato.bande[k]);
        const passo = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
        let j;
        if (passo) j = (i + passo + lista.length) % lista.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = lista.length - 1;
        else return;
        e.preventDefault();
        cambiaBanda(k, lista[j], passo || (j > i ? 1 : -1), 'frecce');
      }

      function cambiaBanda(k, n, dir, origine) {
        if (stato.modo !== 'componi' || stato.bande[k] === n) return;
        stato.bande[k] = n;
        rotola(k, n, dir);
        if (aperta === k && origine !== 'tavolozza') {
          const r = tavGriglia.querySelector('input[value="' + n + '"]');
          if (r) r.checked = true;
        }
        aggiorna(origine);
      }

      function dalCursore(v) {
        if (stato.modo !== 'componi') return;
        const prima = F.valoreDaColori(stato.bande);
        F.coloriDaValore(v).forEach((n, k) => {
          if (stato.bande[k] === n) return;
          stato.bande[k] = n;
          rotola(k, n, v >= prima ? 1 : -1);
        });
        aggiorna('cursore');
      }

      function colora(k, n) {
        const r = rulli[k];
        r.p = 1;
        r.a.setAttribute('fill', vernice(n));
        r.a.setAttribute('transform', 'translate(0 0)');
        r.b.setAttribute('transform', 'translate(0 128)');
      }

      // La banda gira come un anello: il colore nuovo entra dal basso (o dall'alto).
      function rotola(k, n, dir) {
        if (ctx.ridotto) { colora(k, n); return; }
        const r = rulli[k];
        if (r.p < 1) {
          const t = r.a;
          r.a = r.b;
          r.b = t;
          r.a.setAttribute('transform', 'translate(0 0)');
        }
        r.b.setAttribute('fill', vernice(n));
        r.b.setAttribute('transform', 'translate(0 ' + 128 * dir + ')');
        r.dir = dir;
        r.p = 0;
        ciclo.avvia();
      }

      // Il resistore nuovo scivola dentro da destra e si ferma con una piccola molla.
      function entra() {
        if (ctx.ridotto) return;
        ingresso.x = 64;
        ingresso.v = 0;
        ciclo.avvia();
      }

      const ciclo = ctx.ciclo((dt) => {
        let fermo = true;
        const k = 1 - Math.exp(-dt * 15);
        rulli.forEach((r) => {
          if (r.p >= 1) return;
          r.p += (1 - r.p) * k;
          if (r.p > 0.996) r.p = 1;
          const y = 128 * r.dir;
          r.a.setAttribute('transform', 'translate(0 ' + (-y * r.p).toFixed(2) + ')');
          r.b.setAttribute('transform', 'translate(0 ' + (y * (1 - r.p)).toFixed(2) + ')');
          if (r.p < 1) fermo = false;
          else {
            const t = r.a;
            r.a = r.b;
            r.b = t;
          }
        });
        if (ingresso.x || ingresso.v) {
          ingresso.v += (-180 * ingresso.x - 19 * ingresso.v) * dt;
          ingresso.x += ingresso.v * dt;
          if (Math.abs(ingresso.x) < 0.05 && Math.abs(ingresso.v) < 1) { ingresso.x = 0; ingresso.v = 0; } else fermo = false;
          pezzo.setAttribute('transform', 'translate(' + ingresso.x.toFixed(2) + ' 0)');
          pezzo.style.opacity = (1 - Math.max(0, ingresso.x) / 64).toFixed(3);
        }
        if (fermo) ciclo.ferma();
      });

      /* --- tavolozza --- */
      function apriTavolozza(k) {
        if (stato.modo !== 'componi') return;
        chiudiTavolozza(false);
        aperta = k;
        tavTitolo.textContent = 'Banda ' + (k + 1) + ': ' + BANDE[k];
        tavGriglia.style.gridTemplateRows = 'repeat(' + Math.ceil(LISTE[k].length / 2) + ', auto)';
        tavGriglia.replaceChildren(...LISTE[k].map((n) => {
          const r = h('input', { type: 'radio', name: id + '-b' + k, value: n, checked: n === stato.bande[k] });
          r.addEventListener('change', () => {
            if (r.checked) cambiaBanda(k, n, LISTE[k].indexOf(n) > LISTE[k].indexOf(stato.bande[k]) ? 1 : -1, 'tavolozza');
          });
          const l = h('label', { class: 'res-opz' }, r, h('span', { class: 'res-opz-c' },
            h('span', { class: 'res-sw', style: { '--c': SFONDO[n] } }), h('span', null, n), h('span', { class: 'res-opz-v' }, significato(k, n))));
          // Con il puntatore la scelta chiude subito la tavolozza; con la tastiera si chiude con Invio.
          l.addEventListener('click', (e) => { if (e.detail > 0) setTimeout(() => chiudiTavolozza(true), 0); });
          return l;
        }));
        tavNota.textContent = NOTE_TAVOLOZZA[k];
        pulsanti[k].after(tavolozza);
        tavolozza.hidden = false;
        posiziona(k);
        pulsanti[k].setAttribute('aria-expanded', 'true');
        accendi();
        const scelto = tavGriglia.querySelector('input:checked');
        if (scelto) scelto.focus({ preventScroll: true });
      }

      function chiudiTavolozza(rimettiFuoco) {
        if (aperta < 0) return;
        const k = aperta;
        aperta = -1;
        tavolozza.hidden = true;
        pulsanti[k].setAttribute('aria-expanded', 'false');
        accendi();
        if (rimettiFuoco && !pulsanti[k].disabled) pulsanti[k].focus({ preventScroll: true });
      }

      // Su uno schermo stretto il disegno si stringe sul corpo del resistore, così bande e pulsanti restano grandi.
      function disponi() {
        const stretto = banco.clientWidth < 520;
        if (stretto !== vista.stretto) {
          vista.stretto = stretto;
          vista.x0 = stretto ? 100 : 0;
          vista.w = stretto ? 440 : 640;
          svg.setAttribute('viewBox', vista.x0 + ' 0 ' + vista.w + ' 236');
          XB.forEach((x, k) => {
            const xe = vista.x0 + vista.w * (k + 0.5) / 4;
            const y0 = k === 0 || k === 3 ? 155 : 143;
            const ym = (y0 + 230) / 2;
            guide[k].setAttribute('d', 'M' + x + ' ' + y0 + 'C' + x + ' ' + ym + ' ' + xe + ' ' + ym + ' ' + xe + ' 230');
            punti[k].setAttribute('cx', xe);
            pulsanti[k].style.left = (x - 24 - vista.x0) / vista.w * 100 + '%';
            pulsanti[k].style.width = 48 / vista.w * 100 + '%';
          });
        }
        if (aperta >= 0) posiziona(aperta);
      }

      function posiziona(k) {
        const box = tavolozza.parentNode;
        const larg = box.clientWidth;
        const w = tavolozza.offsetWidth;
        const cx = (XB[k] - vista.x0) / vista.w * larg;
        const x = EB.clamp(cx - w / 2, 0, Math.max(0, larg - w));
        tavolozza.style.left = x + 'px';
        tavolozza.style.top = 162 / 236 * box.clientHeight + 'px';
        tavolozza.style.setProperty('--freccia', cx - x + 'px');
      }

      tavolozza.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' && e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        chiudiTavolozza(true);
      });
      tavolozza.addEventListener('focusout', (e) => {
        const verso = e.relatedTarget;
        if (aperta < 0 || (verso && tavolozza.contains(verso))) return;
        if (verso && verso === pulsanti[aperta] && giu === verso) return; // ci pensa il clic sul pulsante
        chiudiTavolozza(false);
      });
      ctx.su(document, 'pointerdown', (e) => {
        giu = e.target;
        if (aperta >= 0 && !tavolozza.contains(e.target) && e.target !== pulsanti[aperta]) chiudiTavolozza(false);
      }, true);
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(disponi);
        ro.observe(banco);
        ctx.pulizia(() => ro.disconnect());
      }

      function accendi() {
        for (let k = 0; k < 4; k++) {
          const on = k === aperta || k === sopra || k === fuoco;
          guide[k].classList.toggle('attiva', on);
          punti[k].classList.toggle('attiva', on);
          etichette[k].el.classList.toggle('attiva', on);
        }
      }

      /* --- tutto ciò che dipende dalle bande --- */
      function aggiorna(origine) {
        const b = stato.bande;
        const v = F.valoreDaColori(b);
        const t = F.TOLLERANZE[b[3]];
        const mist = stato.modo === 'misteriosi';
        const svela = !mist || quiz.risposto;
        b.forEach((n, k) => {
          etichette[k].sw.style.setProperty('--c', SFONDO[n]);
          etichette[k].nome.textContent = n;
          etichette[k].val.textContent = svela ? significato(k, n) : '?';
          pulsanti[k].setAttribute('aria-label', 'Banda ' + (k + 1) + ', ' + BANDE[k] + ': ' + n + (svela ? ' (' + significato(k, n) + ')' : ''));
        });
        corpoTab.querySelectorAll('.res-uso').forEach((c) => c.classList.remove('res-uso', 'res-chiaro'));
        if (svela) {
          b.forEach((n, k) => {
            const c = righe[n][k < 2 ? 0 : k - 1];
            c.classList.add('res-uso');
            c.classList.toggle('res-chiaro', TESTO_CHIARO.includes(n));
            c.style.setProperty('--c', SFONDO[n]);
          });
        }
        const elenco = b.slice(0, 3).join(', ') + ' e ' + b[3];
        svg.setAttribute('aria-label', (mist ? 'Resistore misterioso a quattro bande: ' : 'Resistore a quattro bande: ') + elenco +
          (svela ? '. Vale ' + ohm(v) + ', tolleranza ' + toll(t) + '.' : '. Quanto vale?'));
        if (mist) return;
        lValore.imposta(ohm(v) + NB + toll(t));
        lMin.imposta(ohm(v * (1 - t / 100), 4));
        lMax.imposta(ohm(v * (1 + t / 100), 4));
        fasciaBanda.style.transform = 'scaleX(' + Math.max(t / 10, 0.012) + ')';
        fasciaT.textContent = toll(t);
        const m = F.MOLTIPLICATORI[b[2]];
        const pieno = m >= 0 ? intero(v) + NB + 'Ω' : ohm(v);
        const parti = [['R', 'r'], ' = ', (NOMI.indexOf(b[0]) * 10 + NOMI.indexOf(b[1])) + ' · ' + fattore(m) + NB + 'Ω = ', [pieno, 'r']];
        if (ohm(v) !== pieno) parti.push(' = ', [ohm(v), 'r']);
        formula.imposta(parti);
        if (origine !== 'cursore') cursore.imposta(v, true);
        if (!origine) return;
        if (b[0] === 'giallo' && b[1] === 'viola' && b[2] === 'rosso') ctx.completa('quattro-sette');
        clearTimeout(timerNota);
        timerNota = setTimeout(scriviNota, 350);
      }

      function dici(testo) {
        if (testo === ultimaNota) return;
        ultimaNota = testo;
        ctx.nota(testo);
      }

      // Spiega che cosa è cambiato dall'ultima nota, con i numeri.
      function scriviNota() {
        const b = stato.bande;
        const p = notato;
        const cambiate = [0, 1, 2, 3].filter((k) => b[k] !== p[k]);
        if (!cambiate.length || stato.modo !== 'componi') return;
        notato = b.slice();
        const v = F.valoreDaColori(b);
        const v0 = F.valoreDaColori(p);
        const t = F.TOLLERANZE[b[3]];
        const k = cambiate[0];
        let testo;
        if (b[0] === 'giallo' && b[1] === 'viola' && b[2] === 'rosso' && k < 3) {
          testo = '**Giallo** 4, **viola** 7, **rosso** due zeri: 4700 Ω, cioè **4,7 kΩ**. È uno dei valori più usati in elettronica.';
        } else if (cambiate.length > 1) {
          testo = 'Ora ' + lettura(b) + '.';
        } else if (k < 2) {
          testo = (k ? 'Seconda' : 'Prima') + ' cifra da **' + p[k] + '** (' + significato(k, p[k]) + ') ' + ad(b[k]) + ' (' + significato(k, b[k]) + '): il valore passa da **' +
            ohm(v0) + '** a **' + ohm(v) + '**.' + (k ? '' : ' Un passo della prima banda vale dieci passi della seconda.');
        } else if (k === 2) {
          const d = F.MOLTIPLICATORI[b[2]] - F.MOLTIPLICATORI[p[2]];
          testo = 'Moltiplicatore da **' + p[2] + '** (' + significato(2, p[2]) + ') ' + ad(b[2]) + ' (' + significato(2, b[2]) + '): da **' + ohm(v0) + '** a **' + ohm(v) + '**, ' +
            (d > 0 ? 'moltiplicato' : 'diviso') + ' per ' + intero(Math.pow(10, Math.abs(d))) + '. Ogni passo del moltiplicatore aggiunge o toglie uno zero.';
        } else {
          testo = 'Tolleranza da **' + p[3] + '** (' + toll(F.TOLLERANZE[p[3]]) + ') ' + ad(b[3]) + ' (' + toll(t) + '): il valore vero sta fra **' + ohm(v * (1 - t / 100), 4) + '** e **' +
            ohm(v * (1 + t / 100), 4) + '**. ' + (t < F.TOLLERANZE[p[3]] ? 'Fascia più stretta, resistore più preciso.' : 'Fascia più larga, resistore meno preciso.');
        }
        if (k < 3 && !nelleE12(v)) testo += ' ' + fuoriSerie(v);
        dici(testo);
      }

      /* --- resistori misteriosi --- */
      function cambiaModo(m) {
        chiudiTavolozza(false);
        clearTimeout(timerNota);
        stato.modo = m;
        const mist = m === 'misteriosi';
        scena.classList.toggle('res-misteriosi', mist);
        bloccoValore.hidden = mist;
        bloccoQuiz.hidden = !mist;
        pulsanti.forEach((b) => { b.disabled = mist; });
        cursore.input.disabled = mist;
        cursore.el.classList.toggle('res-spento', mist);
        if (mist) {
          composte = stato.bande.slice();
          quiz.serie = 0;
          quiz.valore = 0;
          segnaSerie();
          nuovoMisterioso(false);
          dici('**Resistori misteriosi**: leggi le bande, aiutati con la tabella e scegli il valore giusto fra le quattro risposte. Servono tre risposte giuste di fila.');
          return;
        }
        stato.bande = composte.slice();
        notato = composte.slice();
        stato.bande.forEach((n, k) => colora(k, n));
        entra();
        aggiorna();
        dici('Di nuovo il tuo resistore: ' + lettura(stato.bande) + '.');
      }

      // Le risposte sbagliate sono gli errori tipici: zeri contati male, terza banda letta come cifra, verso sbagliato.
      function opzioniPer(v, b) {
        const a = NOMI.indexOf(b[0]);
        const c = NOMI.indexOf(b[1]);
        const m = F.MOLTIPLICATORI[b[2]];
        const candidati = mescola([[v * 10, 'zeri'], [v / 10, 'zeri'], [v * 100, 'zeri'], [v / 100, 'zeri'],
          [a * 100 + c * 10 + m, 'terza'], [c > 0 && c !== a ? (c * 10 + a) * Math.pow(10, m) : 0, 'verso']]);
        const viste = new Set([ohm(v)]);
        const scelte = [{ v: v, tipo: '' }];
        candidati.forEach(([x, tipo]) => {
          const y = Number(x.toPrecision(12));
          if (!(y > 0) || viste.has(ohm(y)) || scelte.length === 4) return;
          viste.add(ohm(y));
          scelte.push({ v: y, tipo: tipo });
        });
        return mescola(scelte);
      }

      function nuovoMisterioso(spostaFuoco) {
        let v;
        do { v = caso(MISTERIOSI); } while (v === quiz.valore);
        const b = F.coloriDaValore(v).concat(caso(TOLL_MISTERIOSE));
        quiz.valore = v;
        quiz.risposto = false;
        quiz.opzioni = opzioniPer(v, b);
        stato.bande = b;
        b.forEach((n, k) => colora(k, n));
        risposte.forEach((btn, i) => {
          btn.textContent = ohm(quiz.opzioni[i].v);
          btn.dataset.valore = String(quiz.opzioni[i].v);
          btn.classList.remove('giusta', 'sbagliata');
          btn.removeAttribute('aria-disabled');
          btn.removeAttribute('aria-label');
        });
        esito.textContent = '';
        prossimo.hidden = true;
        entra();
        aggiorna();
        if (spostaFuoco) risposte[0].focus({ preventScroll: true });
      }

      function segnaSerie() {
        puntiSerie.forEach((p, i) => p.classList.toggle('pieno', i < quiz.serie));
        serieT.textContent = 'Di fila: ' + quiz.serie + (quiz.serie < 3 ? ' su 3' : '');
      }

      function rispondi(i) {
        if (stato.modo !== 'misteriosi' || quiz.risposto) return;
        quiz.risposto = true;
        const scelta = quiz.opzioni[i];
        const giusto = scelta.v === quiz.valore;
        risposte.forEach((btn, j) => {
          btn.setAttribute('aria-disabled', 'true');
          if (quiz.opzioni[j].v === quiz.valore) {
            btn.classList.add('giusta');
            btn.setAttribute('aria-label', btn.textContent + ', risposta giusta');
          } else if (j === i) {
            btn.classList.add('sbagliata');
            btn.setAttribute('aria-label', btn.textContent + ', la tua risposta');
          }
        });
        quiz.serie = giusto ? quiz.serie + 1 : 0;
        segnaSerie();
        aggiorna();
        esito.textContent = giusto ? '✓ Giusto' : '✗ Vale ' + ohm(quiz.valore);
        if (quiz.serie >= 3) ctx.completa('misteriosi');
        prossimo.hidden = false;
        prossimo.focus({ preventScroll: true });
        const spiega = lettura(stato.bande) + '.';
        if (giusto) dici('Giusto: ' + spiega + ' ' + (quiz.serie === 3 ? 'Tre di fila: ormai il codice colori lo leggi al volo.' : 'Di fila: ' + quiz.serie + (quiz.serie < 3 ? ' su 3.' : '.')));
        else dici('Non è ' + ohm(scelta.v) + ': ' + spiega + ' ' + CONSIGLI[scelta.tipo] + ' La serie riparte da zero.');
      }

      /* --- avvio --- */
      ctx.pulizia(() => clearTimeout(timerNota));
      disponi();
      stato.bande.forEach((n, k) => colora(k, n));
      segnaSerie();
      aggiorna();
      dici('Le bande **marrone** (1), **nero** (0) e **rosso** (× 100) fanno 10 × 100 Ω = **1 kΩ**; l\'**oro** vale ± 5%. Scegli una banda per cambiarne il colore, oppure muovi il cursore della serie E12.');
    },
  });
})();
