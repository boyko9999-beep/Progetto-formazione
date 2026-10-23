/*
 * Elettronica base · pagina della sezione: router a hash e viste
 * (panoramica, capitolo, cronologia, glossario), binario dei capitoli,
 * avanzamento e circuito animato d'apertura.
 */
(function () {
  'use strict';

  const E = window.Enciclopedia;
  const SEZ = (E && E.get('elettronica-base')) || { titolo: 'Elettronica base', capitoli: [] };
  const CAPITOLI = SEZ.capitoli;
  const h = EB.h;
  const s = EB.s;
  const main = document.getElementById('main');
  const rail = document.getElementById('eb-rail');

  const BREVI = {
    carica: 'Carica', corrente: 'Corrente', ohm: 'Legge di Ohm', potenza: 'Potenza', circuiti: 'Serie e parallelo',
    condensatore: 'Condensatore', magnetismo: 'Magnetismo', rele: 'Relè', alternata: 'Alternata', misure: 'Misure',
  };

  // Icone 24×24 a tratto, una per capitolo.
  const ICONE = {
    carica: '<circle cx="7" cy="12" r="4.5"/><path d="M4.8 12h4.4M7 9.8v4.4"/><circle cx="17" cy="12" r="4.5"/><path d="M14.8 12h4.4"/>',
    corrente: '<rect x="2.5" y="7.5" width="16" height="9" rx="1.6"/><path d="M18.5 10.5h2.2v3h-2.2M6 12h3.6M7.8 10.2v3.6M12.2 12h3.6"/>',
    ohm: '<path d="M1.5 12h4l1.5-4.5 3 9 3-9 3 9 1.5-4.5h4"/>',
    potenza: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path d="M10.5 11.5 12 9l1.5 2.5"/>',
    circuiti: '<path d="M2 12h3M19 12h3M5 6v12M19 6v12M5 6h3l1-2 2 4 2-4 2 4 1-2h3M5 18h3l1-2 2 4 2-4 2 4 1-2h3"/>',
    condensatore: '<path d="M2 12h8M14 12h8M10 5v14M14 5v14"/>',
    magnetismo: '<path d="M5 3v9a7 7 0 0 0 14 0V3h-5v9a2 2 0 0 1-4 0V3z"/><path d="M5 7h5M14 7h5"/>',
    rele: '<path d="M3.5 18.5c0-2.6 2.4-2.6 2.4 0s2.4 2.6 2.4 0 2.4-2.6 2.4 0 2.4 2.6 2.4 0 2.4-2.6 2.4 0"/><path d="M2.5 9.5h5l8-4.5M17.5 9.5h4"/><circle cx="7.5" cy="9.5" r="1"/>',
    alternata: '<path d="M2 12c1.6-5.4 4.4-5.4 6 0s4.4 5.4 6 0 4.4-5.4 6 0"/><path d="M2 12h20" opacity=".35"/>',
    misure: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4.5-5.5"/><circle cx="12" cy="16" r="1.3"/><path d="M4 20h16M6.3 10.3l1.2 1M12 7v1.6M17.7 10.3l-1.2 1"/>',
  };
  const ICO_EXTRA = {
    panoramica: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
    cronologia: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    glossario: '<path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h11M9 8h6"/>',
  };

  function svgIcona(markup, cls) {
    const span = h('span', { class: cls || 'ico', 'aria-hidden': 'true' });
    span.innerHTML = '<svg viewBox="0 0 24 24">' + markup + '</svg>';
    return span;
  }

  function due(n) { return String(n).padStart(2, '0'); }

  function anno(ev) {
    if (ev.annoTesto) return ev.annoTesto;
    return ev.anno < 0 ? (-ev.anno) + ' a.C.' : String(ev.anno);
  }

  EB.titoloCapitolo = (id) => (CAPITOLI.find((c) => c.id === id) || {}).titolo || id;

  /* ---------- avanzamento ---------- */

  const VISTI = 'eb-visti';
  function visti() {
    try { return new Set(JSON.parse(localStorage.getItem(VISTI) || '[]')); } catch (e) { return new Set(); }
  }
  function segnaVisto(id) {
    const v = visti();
    if (v.has(id)) return;
    v.add(id);
    try { localStorage.setItem(VISTI, JSON.stringify([...v])); } catch (e) { /* archiviazione non disponibile */ }
  }

  function statoCapitolo(id) {
    const def = EB.capitoli[id];
    const fatte = EB.sfideFatte();
    const chiavi = def ? (def.laboratori || []).flatMap((l) => (l.sfide || []).map((x) => l.id + ':' + x.id)) : [];
    const n = chiavi.filter((k) => fatte.has(k)).length;
    return { totale: chiavi.length, fatte: n, completo: chiavi.length > 0 && n === chiavi.length, visto: visti().has(id) };
  }

  function aggiornaAvanzamento() {
    const completi = CAPITOLI.filter((c) => statoCapitolo(c.id).completo).length;
    const testo = document.getElementById('eb-prog');
    if (testo) testo.textContent = completi + '/' + CAPITOLI.length + ' capitoli';
    const barra = document.getElementById('progress-bar');
    if (barra) barra.style.width = (CAPITOLI.length ? 100 * completi / CAPITOLI.length : 0) + '%';
    if (E) E.progresso('elettronica-base', completi, CAPITOLI.length);
  }

  /* ---------- binario dei capitoli ---------- */

  let correnteRail = '';
  function disegnaRail(attivo) {
    correnteRail = attivo;
    const voce = (href, chiave, contenuto, corrente) => h('li', null, h('a', { href: href, 'aria-current': corrente ? 'page' : null, 'data-k': chiave }, contenuto));
    const lista = h('ul', null,
      voce('#', 'inizio', [svgIcona(ICO_EXTRA.panoramica, 'ico-mini'), h('span', null, 'Panoramica'), h('span', { class: 'st' })], attivo === 'inizio'),
      CAPITOLI.map((c, i) => {
        const st = statoCapitolo(c.id);
        return voce('#' + c.id, c.id, [
          h('span', { class: 'n' }, due(i + 1)),
          h('span', null, h('span', { class: 'titolo-lungo' }, c.titolo), h('span', { class: 'titolo-corto' }, BREVI[c.id] || c.titolo)),
          h('span', { class: 'st' + (st.completo ? '' : ' visto'), 'aria-label': st.completo ? 'completato' : st.visto ? 'visitato' : null }, st.completo ? '✓' : st.visto ? '•' : ''),
        ], attivo === c.id);
      }),
      h('li', { class: 'sep', 'aria-hidden': 'true' }),
      voce('#cronologia', 'cronologia', [svgIcona(ICO_EXTRA.cronologia, 'ico-mini'), h('span', null, 'Cronologia'), h('span', { class: 'st' })], attivo === 'cronologia'),
      voce('#glossario', 'glossario', [svgIcona(ICO_EXTRA.glossario, 'ico-mini'), h('span', null, 'Glossario'), h('span', { class: 'st' })], attivo === 'glossario'));
    rail.replaceChildren(h('p', { class: 'eb-rail-t' }, SEZ.titolo), lista);
    const a = lista.querySelector('[aria-current="page"]');
    if (a && lista.scrollWidth > lista.clientWidth) lista.scrollLeft = a.offsetLeft - lista.clientWidth / 2 + a.offsetWidth / 2;
  }

  document.addEventListener('eb:sfida', () => {
    aggiornaAvanzamento();
    disegnaRail(correnteRail);
  });

  /* ---------- circuito d'apertura ---------- */

  function circuitoApertura() {
    const percorso = 'M100 250 L100 266 Q100 290 124 290 L436 290 Q460 290 460 266 L460 74 Q460 50 436 50 L124 50 Q100 50 100 74 L100 90';
    const svg = s('svg', { viewBox: '0 0 560 340', class: 'eb-circ', role: 'img', 'aria-label': 'Circuito con una pila di Volta, un interruttore e una lampadina: quando l\'interruttore è chiuso gli elettroni scorrono e la lampadina si accende.' });
    const defs = s('defs', null,
      s('filter', { id: 'eb-bagliore', x: '-50%', y: '-50%', width: '200%', height: '200%' },
        s('feGaussianBlur', { stdDeviation: '2.2', result: 'b' }),
        s('feMerge', null, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' }))),
      s('radialGradient', { id: 'eb-alone' },
        s('stop', { offset: '0', 'stop-color': '#fff3c4', 'stop-opacity': '.95' }),
        s('stop', { offset: '.35', 'stop-color': '#ffd27a', 'stop-opacity': '.45' }),
        s('stop', { offset: '1', 'stop-color': '#ffb347', 'stop-opacity': '0' })));
    svg.append(defs);
    const filo = s('path', { d: percorso, class: 'filo' });
    const luce = s('path', { d: percorso, class: 'filo-luce' });
    svg.append(filo, luce);

    // pila di Volta: zinco, rame e feltro imbevuto di salamoia, ripetuti
    const pila = s('g', { 'aria-hidden': 'true' });
    const strati = [];
    for (let k = 0; k < 6; k++) strati.push('zn', 'cu', k < 5 ? 'feltro' : null);
    let y = 248;
    strati.filter(Boolean).forEach((t) => {
      const alt = t === 'feltro' ? 7 : 9;
      y -= alt;
      pila.append(s('rect', { x: 70, y: y, width: 60, height: alt - 0.8, rx: 3, class: 'disco-' + (t === 'feltro' ? 'feltro' : t) }));
    });
    pila.append(
      s('rect', { x: 64, y: y - 6, width: 72, height: 6, rx: 2, fill: '#6b7c76' }),
      s('rect', { x: 64, y: 248, width: 72, height: 6, rx: 2, fill: '#6b7c76' }),
      s('text', { x: 148, y: y + 12, class: 'segno pos' }, '+'),
      s('text', { x: 148, y: 246, class: 'segno neg' }, '−'),
      s('text', { x: 100, y: 324, 'text-anchor': 'middle', class: 'etichetta' }, 'pila di Volta'));

    // lampadina
    const lamp = s('g', { 'aria-hidden': 'true' },
      s('circle', { cx: 460, cy: 160, r: 120, fill: 'url(#eb-alone)', class: 'alone' }),
      s('circle', { cx: 460, cy: 158, r: 36, class: 'vetro' }),
      s('path', { d: 'M451 196 L451 168 L455 160 L459 168 L463 160 L467 168 L469 168 L469 196', class: 'filamento' }),
      s('rect', { x: 444, y: 192, width: 32, height: 26, rx: 4, class: 'attacco' }),
      s('path', { d: 'M444 199h32M444 206h32M444 213h32', stroke: '#2f3a36', 'stroke-width': 2 }),
      s('text', { x: 460, y: 324, 'text-anchor': 'middle', class: 'etichetta' }, 'lampadina'));

    // interruttore sul filo in alto
    const interr = s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 254, y: 44, width: 52, height: 12, fill: '#0d1714' }),
      s('circle', { cx: 252, cy: 50, r: 5, class: 'contatto' }),
      s('circle', { cx: 308, cy: 50, r: 5, class: 'contatto' }),
      s('rect', { x: 252, y: 47, width: 58, height: 6, rx: 3, fill: '#e6eeea', class: 'leva' }),
      s('text', { x: 280, y: 28, 'text-anchor': 'middle', class: 'etichetta' }, 'interruttore'));
    const area = s('rect', { x: 236, y: 14, width: 88, height: 60, class: 'interr-area' });

    const elettroni = s('g', { 'aria-hidden': 'true' });
    svg.append(pila, elettroni, lamp, interr, area);

    const N = 22;
    const punti = [];
    for (let i = 0; i < N; i++) {
      const g = s('g', null, s('circle', { r: 5.5, class: 'elettrone' }), s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'elettrone-segno' }, '−'));
      elettroni.append(g);
      punti.push({ g: g, u: i / N });
    }
    let lunghezza = 0;
    let posizione = 0;
    let velocita = 0;
    let chiuso = true;
    function disponi() {
      if (!lunghezza) lunghezza = filo.getTotalLength();
      punti.forEach((p) => {
        const pt = filo.getPointAtLength((((p.u + posizione) % 1) + 1) % 1 * lunghezza);
        p.g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      });
    }

    const nota = h('span', { 'aria-live': 'polite' });
    const sw = EB.ui.interruttore({ etichetta: 'Circuito chiuso', acceso: true, cambia: (v) => imposta(v) });
    function imposta(v) {
      chiuso = v;
      svg.classList.toggle('aperto', !v);
      nota.textContent = v ? 'Circuito chiuso: gli elettroni scorrono, la lampadina è accesa.' : 'Circuito aperto: niente corrente, la lampadina è spenta.';
      if (ciclo) ciclo.avvia();
    }
    area.addEventListener('click', () => sw.imposta(!sw.acceso));

    const fig = h('figure', { class: 'eb-hero-fig' }, svg, h('figcaption', null, sw.el, nota));
    let ciclo = null;
    requestAnimationFrame(() => {
      disponi();
      if (EB.ridotto()) return;
      ciclo = EB.ciclo(fig, (dt) => {
        const obiettivo = chiuso ? 0.055 : 0;
        velocita += (obiettivo - velocita) * Math.min(1, dt * 2.5);
        posizione = (posizione + velocita * dt) % 1;
        disponi();
        if (!chiuso && velocita < 0.0005) ciclo.ferma();
      });
      ciclo.avvia();
      pulizie.push(() => ciclo.distruggi());
    });
    imposta(true);
    return fig;
  }

  /* ---------- viste ---------- */

  let pulizie = [];
  function pulisci() {
    EB.chiudiVoce();
    pulizie.forEach((fn) => { try { fn(); } catch (e) { /* già rimosso */ } });
    pulizie = [];
  }

  function reveal(radice) {
    const items = radice.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || EB.ridotto()) {
      items.forEach((i) => i.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach((i) => io.observe(i));
    pulizie.push(() => io.disconnect());
  }

  function eventiStoria() {
    return CAPITOLI.flatMap((c) => ((EB.capitoli[c.id] || {}).storia || []).map((ev) => Object.assign({ cap: c.id }, ev)))
      .sort((a, b) => a.anno - b.anno);
  }

  const esterni = { prossima: null, quiz: null };

  function blocchiProsegui() {
    const box = h('div', { class: 'eb-prosegui' });
    const succ = E && E.get('elettronica-intermedia');
    box.append(succ
      ? h('a', { href: '../elettronica-intermedia/index.html' }, h('small', null, 'Sezione successiva'), h('strong', null, '2 · ' + succ.titolo + ' →'), succ.sottotitolo ? h('span', null, succ.sottotitolo) : null)
      : h('div', { class: 'attesa' }, h('small', null, 'Sezione successiva'), h('strong', null, '2 · Elettronica intermedia'), h('span', null, 'In preparazione.')));
    box.append(E && E.get('quiz')
      ? h('a', { href: '../quiz/index.html#elettronica-base' }, h('small', null, 'Mettiti alla prova'), h('strong', null, 'Quiz di Elettronica base →'), h('span', null, 'Domande su tutti i capitoli della sezione.'))
      : h('a', { href: '../index.html' }, h('small', null, 'Enciclopedia'), h('strong', null, 'Tutte le sezioni →'), h('span', null, 'Torna all\'elenco delle otto sezioni.')));
    return box;
  }

  function vistaInizio() {
    const primoDaFare = CAPITOLI.find((c) => !statoCapitolo(c.id).completo) || CAPITOLI[0];
    const iniziato = CAPITOLI.some((c) => statoCapitolo(c.id).visto);
    const hero = h('section', { class: 'eb-hero' },
      h('div', null,
        h('p', { class: 'eyebrow' }, 'Sezione 1 · Enciclopedia'),
        h('h1', null, SEZ.titolo),
        h('p', { class: 'lead' }, SEZ.sottotitolo),
        h('div', { class: 'eb-hero-azioni' },
          primoDaFare ? h('a', { class: 'btn primary', href: '#' + primoDaFare.id }, (iniziato ? 'Riprendi: ' : 'Inizia: ') + primoDaFare.titolo.charAt(0).toLowerCase() + primoDaFare.titolo.slice(1)) : null,
          h('a', { class: 'btn', href: '#cronologia' }, 'Cronologia'),
          h('a', { class: 'btn', href: '#glossario' }, 'Glossario'))),
      circuitoApertura());

    const mappa = h('ol', { class: 'eb-mappa' }, CAPITOLI.map((c, i) => {
      const st = statoCapitolo(c.id);
      return h('li', { class: 'reveal' }, h('a', { class: 'eb-scheda', href: '#' + c.id },
        svgIcona(ICONE[c.id] || ICO_EXTRA.panoramica),
        h('span', { class: 'meta' }, h('span', { class: 'num', 'aria-hidden': 'true' }, due(i + 1)), h('span', null, c.periodo || '')),
        h('span', { class: 'tit' }, h('span', { class: 'sr-only' }, 'Capitolo ' + (i + 1) + ': '), c.titolo),
        h('span', { class: 'desc' }, c.descrizione || ''),
        st.completo ? h('span', { class: 'fatto' }, '✓ completato') : null));
    }));

    const formule = CAPITOLI.flatMap((c) => ((EB.capitoli[c.id] || {}).formule || []).map((f) => ({ f: f, c: c })));
    const eventi = eventiStoria();

    const v = h('div', { class: 'eb-inizio' },
      hero,
      h('div', { class: 'eb-sezione-t' }, h('h2', null, 'I dieci capitoli'), h('p', null, 'Ogni capitolo ha testo, immagini, un laboratorio da provare e la sua storia.')),
      mappa,
      formule.length ? [
        h('div', { class: 'eb-sezione-t' }, h('h2', null, 'Le formule da ricordare'), h('p', null, 'Clicca una formula per aprire il suo capitolo.')),
        h('ul', { class: 'eb-formule-griglia' }, formule.map((x) => h('li', { class: 'reveal' }, h('a', { href: '#' + x.c.id }, EB.formula(x.f.formula), h('small', null, x.f.nome + ' · ' + BREVI[x.c.id]))))),
      ] : null,
      eventi.length ? [
        h('div', { class: 'eb-sezione-t' }, h('h2', null, 'Da Talete a oggi'), h('a', { href: '#cronologia' }, 'Tutta la cronologia →')),
        h('ol', { class: 'eb-striscia', 'aria-label': 'Tappe principali in ordine cronologico' }, eventi.map((ev) => h('li', null,
          h('a', { href: '#' + ev.cap }, h('span', { class: 'anno' }, anno(ev)), h('span', { class: 't' }, ev.titolo), h('span', { class: 'c' }, BREVI[ev.cap]))))),
      ] : null,
      blocchiProsegui());
    return { el: v, titolo: SEZ.titolo, rail: 'inizio' };
  }

  function figura(def) {
    if (!def.figura || !def.figura.svg) return null;
    const svg = EB.svgDaTesto(def.figura.svg);
    if (!svg) return null;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', def.figura.alt || def.figura.didascalia || '');
    if (EB.ridotto() && svg.pauseAnimations) svg.pauseAnimations();
    return h('figure', { class: 'eb-figura' }, h('div', { class: 'tela-fig' }, svg), def.figura.didascalia ? h('figcaption', null, EB.testo(def.figura.didascalia)) : null);
  }

  function vistaCapitolo(id) {
    const i = CAPITOLI.findIndex((c) => c.id === id);
    const meta = CAPITOLI[i];
    const def = EB.capitoli[id];
    const ctx = { capitolo: id };
    const prev = CAPITOLI[i - 1];
    const next = CAPITOLI[i + 1];
    segnaVisto(id);

    const testa = [
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#' }, SEZ.titolo), ' / ', h('span', null, 'Capitolo ' + (i + 1))),
      h('header', { class: 'eb-cap-testa' },
        h('span', { class: 'eb-cap-num', 'aria-hidden': 'true' }, due(i + 1)),
        h('div', null,
          h('p', { class: 'eyebrow' }, 'Capitolo ' + (i + 1) + (meta.periodo ? ' · ' + meta.periodo : '')),
          h('h1', null, meta.titolo),
          meta.descrizione ? h('p', { class: 'lead' }, meta.descrizione) : null)),
    ];

    const pager = h('nav', { class: 'pager', 'aria-label': 'Capitoli vicini' },
      prev ? h('a', { href: '#' + prev.id, class: 'prev' }, h('small', null, '← capitolo precedente'), prev.titolo) : h('a', { href: '#', class: 'prev' }, h('small', null, '← sezione'), 'Panoramica'),
      next ? h('a', { href: '#' + next.id, class: 'next' }, h('small', null, 'capitolo successivo →'), next.titolo) : h('a', { href: '#cronologia', class: 'next' }, h('small', null, 'per finire →'), 'Cronologia'));

    if (!def) {
      return { el: h('article', { class: 'eb-cap' }, testa, h('p', { class: 'eb-vuoto' }, 'Questo capitolo è in preparazione.'), pager), titolo: meta.titolo, rail: id };
    }

    const lato = h('aside', { class: 'eb-lato' },
      figura(def),
      def.inBreve && def.inBreve.length ? h('section', { class: 'eb-breve', 'aria-labelledby': 'breve-' + id },
        h('h2', { id: 'breve-' + id }, 'In breve'),
        h('ul', null, def.inBreve.map((x) => h('li', null, EB.testo(x, ctx))))) : null);

    const chiave = def.formule && def.formule.length ? h('div', { class: 'eb-chiave' }, def.formule.map((f) => h('section', { class: 'eb-formula-card' },
      h('h2', null, f.nome),
      EB.formula(f.formula),
      f.legenda ? h('dl', { class: 'eb-legenda' }, f.legenda.map((l) => [h('dt', null, EB.formula(l[0], { inline: false })), h('dd', null, l[1] + (l[2] ? ' (' + l[2] + ')' : ''))])) : null,
      f.nota ? h('p', { class: 'eb-vuoto' }, EB.testo(f.nota, ctx)) : null))) : null;

    const labs = h('div', { class: 'eb-labs' });
    const appro = def.approfondimenti && def.approfondimenti.length
      ? h('div', { class: 'eb-approfondimenti eb-prosa' }, def.approfondimenti.map((a) => h('section', null, h('h2', null, a.titolo), EB.paragrafi(a.paragrafi, ctx))))
      : null;
    const sapevi = def.sapevi ? h('aside', { class: 'eb-sapevi' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '💡'), h('p', null, h('strong', null, 'Lo sapevi?'), EB.testo(def.sapevi, ctx))) : null;
    const storia = def.storia && def.storia.length ? h('section', { class: 'eb-storia', 'aria-labelledby': 'storia-' + id },
      h('h2', { id: 'storia-' + id }, 'La storia'),
      h('ol', null, def.storia.slice().sort((a, b) => a.anno - b.anno).map((ev) => h('li', { class: 'reveal' },
        h('span', { class: 'anno' }, anno(ev)),
        h('div', { class: 'evento' }, h('h3', null, ev.titolo), h('p', null, EB.testo(ev.testo, ctx)), ev.chi ? h('span', { class: 'chi' }, ev.chi) : null))))) : null;
    const prova = E && E.get('quiz')
      ? h('div', { class: 'eb-prova' }, h('div', null, h('strong', null, 'Mettiti alla prova'), h('p', { style: 'margin:0' }, 'Domande e piccoli esercizi su questo capitolo.')), h('a', { class: 'btn', href: '../quiz/index.html#elettronica-base/' + id }, 'Apri il quiz →'))
      : null;

    const art = h('article', { class: 'eb-cap', 'data-cap': id },
      testa,
      def.apertura ? h('p', { class: 'eb-apertura' }, EB.testo(def.apertura, ctx)) : null,
      h('div', { class: 'eb-cap-intro' }, h('div', { class: 'eb-prosa' }, EB.paragrafi(def.intro, ctx)), lato),
      chiave,
      labs,
      appro,
      sapevi,
      storia,
      h('div', { class: 'eb-fine' }, prova, pager));

    const dopo = () => {
      (def.laboratori || []).forEach((cfg) => {
        const lab = EB.montaLaboratorio(labs, cfg, id);
        pulizie.push(() => lab.distruggi());
      });
    };
    return { el: art, titolo: meta.titolo, rail: id, dopo: dopo };
  }

  function vistaCronologia() {
    const eventi = eventiStoria();
    const ere = [
      { fino: 1499, nome: 'Antichità e Medioevo' },
      { fino: 1799, nome: 'Seicento e Settecento' },
      { fino: 1849, nome: 'Prima metà dell\'Ottocento' },
      { fino: 1899, nome: 'Seconda metà dell\'Ottocento' },
      { fino: 1999, nome: 'Novecento' },
      { fino: Infinity, nome: 'Dal 2000 a oggi' },
    ];
    const lista = h('ol', { class: 'timeline' });
    let era = null;
    eventi.forEach((ev) => {
      const e = ere.find((x) => ev.anno <= x.fino);
      if (e !== era) {
        era = e;
        lista.append(h('li', { class: 'decade reveal' }, e.nome));
      }
      lista.append(h('li', { class: 'event reveal' },
        h('span', { class: 'event-year' }, anno(ev)),
        h('div', { class: 'event-body' },
          h('h3', null, h('a', { href: '#' + ev.cap }, ev.titolo)),
          h('span', { class: 'chip' }, BREVI[ev.cap]),
          h('p', null, EB.testo(ev.testo, { capitolo: ev.cap })))));
    });
    const v = h('div', { class: 'eb-cronologia' },
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#' }, SEZ.titolo), ' / ', h('span', null, 'Cronologia')),
      h('header', { class: 'page-head' }, h('h1', { style: 'font-family:var(--serif)' }, 'Cronologia'),
        h('p', { class: 'lead' }, 'Venticinque secoli di scoperte, dall\'ambra strofinata di Talete agli strumenti che misurano i circuiti di oggi. Clicca un evento per aprire il suo capitolo.')),
      eventi.length ? lista : h('p', { class: 'eb-vuoto' }, 'La cronologia si riempie man mano che arrivano i capitoli.'));
    return { el: v, titolo: 'Cronologia', rail: 'cronologia' };
  }

  function vistaGlossario() {
    const voci = Object.values(EB.glossario).sort((a, b) => a.termine.localeCompare(b.termine, 'it'));
    const lista = h('dl', { class: 'eb-gloss' });
    const vuoto = h('p', { class: 'eb-vuoto', 'aria-live': 'polite' });
    const cerca = h('input', { type: 'search', id: 'eb-cerca', placeholder: 'Per esempio: tensione', autocomplete: 'off' });
    function disegna() {
      const q = cerca.value.trim().toLowerCase();
      const trovate = voci.filter((g) => !q || g.termine.toLowerCase().includes(q) || g.definizione.toLowerCase().includes(q));
      lista.replaceChildren(...trovate.map((g) => h('div', null,
        h('dt', { id: 'voce-' + g.termine.toLowerCase().replace(/[^a-z0-9àèéìòù]+/g, '-') }, g.termine),
        h('dd', null, EB.testo(g.definizione), ' ', h('a', { href: '#' + g.capitolo }, BREVI[g.capitolo] + ' →')))));
      vuoto.textContent = trovate.length ? '' : 'Nessuna voce trovata per «' + cerca.value.trim() + '».';
    }
    cerca.addEventListener('input', disegna);
    disegna();
    const v = h('div', { class: 'eb-glossario' },
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#' }, SEZ.titolo), ' / ', h('span', null, 'Glossario')),
      h('header', { class: 'page-head' }, h('h1', { style: 'font-family:var(--serif)' }, 'Glossario'),
        h('p', { class: 'lead' }, voci.length + ' parole dell\'elettronica spiegate in breve. Nel testo dei capitoli le trovi sottolineate: toccale per leggere la definizione.')),
      h('div', { class: 'eb-gloss-cerca' }, h('label', { for: 'eb-cerca' }, 'Cerca'), cerca),
      vuoto,
      lista);
    return { el: v, titolo: 'Glossario', rail: 'glossario' };
  }

  function vistaNonTrovata() {
    return {
      el: h('div', { class: 'page-head' }, h('h1', null, 'Pagina non trovata'), h('p', null, h('a', { href: '#' }, 'Torna alla panoramica di ' + SEZ.titolo))),
      titolo: 'Pagina non trovata',
      rail: '',
    };
  }

  /* ---------- router ---------- */

  let primaVolta = true;
  function rotta() {
    const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const [chiave, ancora] = hash.split('/');
    let vista;
    if (!chiave || chiave === 'inizio') vista = vistaInizio;
    else if (chiave === 'cronologia') vista = vistaCronologia;
    else if (chiave === 'glossario') vista = vistaGlossario;
    else if (CAPITOLI.some((c) => c.id === chiave)) vista = () => vistaCapitolo(chiave);
    else vista = vistaNonTrovata;

    const disegna = () => {
      pulisci();
      const v = vista();
      main.replaceChildren(v.el);
      if (v.dopo) v.dopo();
      disegnaRail(v.rail);
      reveal(main);
      document.title = (v.rail === 'inizio' ? '' : v.titolo + ' · ') + SEZ.titolo + ' · Enciclopedia';
      const bersaglio = ancora && document.getElementById(ancora);
      if (bersaglio) bersaglio.scrollIntoView();
      else window.scrollTo(0, 0);
      if (!primaVolta) main.focus({ preventScroll: true });
      primaVolta = false;
    };
    if (!primaVolta && document.startViewTransition && !EB.ridotto()) document.startViewTransition(disegna);
    else disegna();
  }

  /* ---------- barra superiore e lettura ---------- */

  const topbar = document.querySelector('.topbar');
  if (topbar && 'ResizeObserver' in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px')).observe(topbar);
  }
  const barraLettura = document.querySelector('.eb-lettura-barra span');
  let rafLettura = 0;
  window.addEventListener('scroll', () => {
    if (rafLettura || !barraLettura) return;
    rafLettura = requestAnimationFrame(() => {
      rafLettura = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      barraLettura.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4) + ')';
    });
  }, { passive: true });

  // Sezione successiva e quiz: se sono già pubblicati compaiono i collegamenti.
  function caricaEsterno(src) {
    return new Promise((resolve) => {
      const sc = document.createElement('script');
      sc.src = src;
      sc.onload = () => resolve(true);
      sc.onerror = () => { sc.remove(); resolve(false); };
      document.head.appendChild(sc);
    });
  }
  Promise.all([caricaEsterno('../elettronica-intermedia/section.js'), caricaEsterno('../quiz/section.js')]).then((r) => {
    esterni.prossima = r[0];
    esterni.quiz = r[1];
    if (r[0] || r[1]) {
      const vecchio = main.querySelector('.eb-prosegui');
      if (vecchio) vecchio.replaceWith(blocchiProsegui());
      const cap = main.querySelector('.eb-cap[data-cap]');
      if (cap && r[1] && !cap.querySelector('.eb-prova')) {
        const fine = cap.querySelector('.eb-fine');
        if (fine) fine.prepend(h('div', { class: 'eb-prova' }, h('div', null, h('strong', null, 'Mettiti alla prova'), h('p', { style: 'margin:0' }, 'Domande e piccoli esercizi su questo capitolo.')), h('a', { class: 'btn', href: '../quiz/index.html#elettronica-base/' + cap.dataset.cap }, 'Apri il quiz →')));
      }
    }
  });

  window.addEventListener('hashchange', rotta);
  aggiornaAvanzamento();
  rotta();
})();
