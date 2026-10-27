/*
 * Porte logiche e chip · applicazione della sezione.
 * Router a hash (#indice, #<capitolo>, #<capitolo>/<sottosezione>, #storia, #glossario),
 * indice con la mappa del chip, cornice dei capitoli, linea del tempo e glossario.
 */
(function () {
  'use strict';

  const { h, s, ui } = PL;
  const SLUG = 'porte-logiche';
  const SECTION_TITLE = 'Porte logiche e chip';
  const QUIZ = '../quiz/index.html#' + SLUG;
  const main = document.getElementById('main');
  const chapters = PL.chapters;

  const ACTS = [
    { num: 'I', title: 'La logica', from: 1, to: 3, text: 'Prima dei fili viene l\'idea: vero e falso diventano 1 e 0, e con poche regole si impara a sommare e a ricordare.' },
    { num: 'II', title: 'Gli interruttori', from: 4, to: 5, text: 'Ogni porta è fatta di interruttori: relè, valvole, transistor, sempre più veloci, piccoli e parsimoniosi.' },
    { num: 'III', title: 'Il chip', from: 6, to: 8, text: 'Un intero circuito in un pezzo di silicio: come è nato, come si fabbrica e che cosa c\'è dentro.' },
    { num: 'IV', title: 'Il futuro', from: 9, to: 9, text: 'Sessant\'anni di raddoppi, i limiti della fisica e le strade per andare oltre.' },
  ];

  const ERAS = [
    { to: 1936, title: 'Le idee', text: 'Logica e matematica, prima dell\'elettronica.' },
    { to: 1946, title: 'Relè e valvole', text: 'I primi calcolatori: interruttori che scattano o si accendono.' },
    { to: 1957, title: 'L\'era del transistor', text: 'L\'interruttore diventa solido, piccolo e affidabile.' },
    { to: 1970, title: 'Nasce il circuito integrato', text: 'Interi circuiti in un solo pezzo di semiconduttore.' },
    { to: 1999, title: 'Il microchip conquista il mondo', text: 'Dalle migliaia ai milioni di transistor per chip.' },
    { to: 9999, title: 'L\'era dei nanometri', text: 'Miliardi di transistor, luce ultravioletta estrema, transistor in 3D.' },
  ];

  /* ---------- progressi (solo comodità locale) ---------- */

  function doneSet() { return new Set(PL.store.get('capitoli-letti', [])); }
  function markDone(id) {
    const d = doneSet();
    if (d.has(id)) return;
    d.add(id);
    PL.store.set('capitoli-letti', [...d]);
    updateProgress();
  }
  function updateProgress() {
    const n = chapters.filter((c) => doneSet().has(c.id)).length;
    const label = document.getElementById('progress');
    const bar = document.getElementById('progress-bar');
    if (label) label.textContent = n + '/' + chapters.length + ' capitoli';
    if (bar) bar.style.width = (100 * n) / Math.max(1, chapters.length) + '%';
    if (window.Enciclopedia && typeof window.Enciclopedia.progresso === 'function') {
      try { window.Enciclopedia.progresso(SLUG, n, chapters.length); } catch (e) { /* hub assente */ }
    }
  }

  // Lo script comune dell'enciclopedia è facoltativo: se non c'è, la sezione funziona lo stesso.
  function loadOptional(src, done) {
    const sc = document.createElement('script');
    sc.src = src;
    sc.onload = done;
    sc.onerror = () => sc.remove();
    document.head.append(sc);
  }

  /* ---------- trame dei blocchi del chip (una per capitolo) ---------- */

  function texture(id, w, hgt) {
    const g = s('g', { class: 'blk-tex' });
    const pad = 12;
    const W = w - pad * 2;
    const H = hgt - pad * 2;
    const add = (tag, a) => g.append(s(tag, a));
    if (id === 'boole') {
      const cols = Math.max(3, Math.floor(W / 16));
      const rows = Math.max(3, Math.floor(H / 16));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const on = ((r * 7 + c * 13 + r * c) % 5) < 2;
          add('circle', { class: on ? 'fill' : '', cx: pad + 8 + c * (W - 16) / Math.max(1, cols - 1), cy: pad + 8 + r * (H - 16) / Math.max(1, rows - 1), r: 3.4 });
        }
      }
    } else if (id === 'porte') {
      const cols = Math.max(2, Math.floor(W / 26));
      const rows = Math.max(2, Math.floor(H / 22));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = pad + c * (W / cols) + 2;
          const y = pad + r * (H / rows) + 3;
          add('path', { d: `M${x} ${y}h7a7 7 0 0 1 0 14h-7z` });
        }
      }
    } else if (id === 'calcolo') {
      const cols = Math.max(3, Math.floor(W / 12));
      const rows = Math.max(3, Math.floor(H / 12));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          add('rect', { class: (c % 4 === 3 || r === 0) ? 'fill' : '', x: pad + c * (W / cols), y: pad + r * (H / rows), width: W / cols - 3, height: H / rows - 3, rx: 1 });
        }
      }
    } else if (id === 'interruttori') {
      const n = Math.max(3, Math.floor(W / 18));
      for (let i = 0; i < n; i++) {
        const x = pad + 4 + i * (W - 8) / n;
        add('rect', { x, y: pad + 4, width: (W - 8) / n - 6, height: H * 0.62, rx: 6 });
        add('line', { x1: x + ((W - 8) / n - 6) / 2, y1: pad + 4 + H * 0.62, x2: x + ((W - 8) / n - 6) / 2, y2: pad + H });
      }
    } else if (id === 'famiglie') {
      const rows = Math.max(3, Math.floor(H / 16));
      for (let r = 0; r < rows; r++) {
        const y = pad + r * (H / rows);
        add('line', { x1: pad, y1: y + 5, x2: pad + W, y2: y + 5 });
        const n = Math.max(3, Math.floor(W / 22));
        for (let c = 0; c < n; c++) add('rect', { class: (r + c) % 3 === 0 ? 'fill' : '', x: pad + c * (W / n) + 2, y: y + 1, width: 7, height: 9 });
      }
    } else if (id === 'integrato') {
      const cx = w / 2;
      const cy = hgt / 2;
      const iw = W * 0.42;
      const ih = H * 0.42;
      add('rect', { class: 'fill', x: cx - iw / 2, y: cy - ih / 2, width: iw, height: ih, rx: 2 });
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5;
        add('path', { d: `M${cx - iw / 2 + iw * t} ${cy - ih / 2}Q${cx - iw / 2 + iw * t} ${pad + 2} ${pad + W * t} ${pad}` });
        add('path', { d: `M${cx - iw / 2 + iw * t} ${cy + ih / 2}Q${cx - iw / 2 + iw * t} ${pad + H - 2} ${pad + W * t} ${pad + H}` });
      }
    } else if (id === 'fabbrica') {
      const r = Math.min(W, H) / 2;
      const cx = w / 2;
      const cy = hgt / 2;
      add('circle', { cx, cy, r });
      const step = r / 3.2;
      for (let x = cx - r; x < cx + r; x += step) {
        for (let y = cy - r; y < cy + r; y += step) {
          if (Math.hypot(x + step / 2 - cx, y + step / 2 - cy) < r - step * 0.6) add('rect', { x: x + 1.5, y: y + 1.5, width: step - 3, height: step - 3 });
        }
      }
    } else if (id === 'struttura') {
      const cx = w / 2;
      const cy = hgt / 2;
      for (let i = 1; i <= 4; i++) {
        const k = i / 4;
        add('rect', { x: cx - (W / 2) * k, y: cy - (H / 2) * k, width: W * k, height: H * k, rx: 2 });
      }
      add('circle', { class: 'fill', cx, cy, r: 3 });
    } else if (id === 'moore') {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const bh = H * Math.pow(2, i) / Math.pow(2, n - 1);
        add('rect', { class: i === n - 1 ? 'fill' : '', x: pad + i * (W / n) + 1, y: pad + H - Math.max(2, bh), width: W / n - 4, height: Math.max(2, bh) });
      }
    }
    return g;
  }

  /* ---------- mappa del chip (indice) ---------- */

  const BLOCKS = {
    1: [84, 84, 130, 130], 2: [228, 84, 164, 130], 3: [406, 84, 110, 130],
    6: [84, 234, 160, 130], 5: [258, 234, 130, 130], 4: [402, 234, 114, 130],
    7: [84, 384, 184, 132], 8: [282, 384, 126, 132], 9: [422, 384, 94, 132],
  };

  function dieMap(caption) {
    const done = doneSet();
    const intro = !PL.reduced() && !PL.store.get('mappa-vista', false);
    const svgEl = PL.svg('0 0 600 600', { class: 'pl-die' + (intro ? ' intro' : ''), role: 'group', 'aria-label': 'Mappa della sezione disegnata come un chip: ogni blocco è un capitolo' });
    svgEl.append(s('rect', { class: 'die-body', x: 30, y: 30, width: 540, height: 540, rx: 18 }));
    const grid = s('g', { class: 'die-grid' });
    for (let k = 60; k < 560; k += 20) {
      grid.append(s('line', { x1: k, y1: 36, x2: k, y2: 564 }), s('line', { x1: 36, y1: k, x2: 564, y2: k }));
    }
    svgEl.append(grid, s('rect', { class: 'die-ring', x: 62, y: 62, width: 476, height: 476, rx: 10 }));
    const pads = s('g');
    const padEls = [];
    for (let i = 0; i < 11; i++) {
      const p = 82 + i * 43.6;
      for (const [x, y, w, hh] of [[p - 7, 40, 14, 10], [p - 7, 550, 14, 10], [40, p - 7, 10, 14], [550, p - 7, 10, 14]]) {
        const pad = s('rect', { class: 'pad', x, y, width: w, height: hh, rx: 2 });
        padEls.push(pad);
        pads.append(pad);
      }
    }
    svgEl.append(pads);
    const routeD = PL.draw.path([[44, 149], [461, 149], [461, 299], [164, 299], [164, 450], [556, 450]], 18);
    svgEl.append(s('path', { class: 'route', d: routeD }), s('path', { class: 'route-glow', d: routeD }));
    svgEl.append(PL.draw.label(300, 531, 'PORTE LOGICHE E CHIP · SEZ. 4', 'die-label'));

    const defaultCaption = 'Ogni blocco del chip è un capitolo: passaci sopra (o usa Tab) per vederlo, clicca per aprirlo.';
    caption.textContent = defaultCaption;
    const showInfo = (ch) => {
      caption.replaceChildren(h('strong', null, 'Capitolo ' + ch.num + ' · ' + ch.title), ' — ', ch.summary);
    };
    chapters.forEach((ch, idx) => {
      const b = BLOCKS[ch.num];
      if (!b) return;
      const [x, y, w, hh] = b;
      const a = s('a', { class: 'blk' + (done.has(ch.id) ? ' is-done' : ''), href: '#' + ch.id, style: '--i:' + idx, 'aria-label': 'Capitolo ' + ch.num + ': ' + ch.title });
      // la trama sta tra il numero (in alto) e il nome (in basso)
      const tex = texture(ch.id, w, hh - 44);
      tex.setAttribute('transform', `translate(${x} ${y + 26})`);
      a.append(
        s('rect', { class: 'blk-bg', x, y, width: w, height: hh, rx: 6 }),
        tex,
        s('rect', { class: 'blk-done', x: x + w - 16, y: y + 8, width: 8, height: 8, rx: 2 }),
        s('text', { class: 'blk-num', x: x + 10, y: y + 26 }, String(ch.num).padStart(2, '0')),
        s('text', { class: 'blk-name', x: x + 10, y: y + hh - 12 }, ch.short || ch.title));
      a.addEventListener('mouseenter', () => showInfo(ch));
      a.addEventListener('focus', () => showInfo(ch));
      a.addEventListener('mouseleave', () => { caption.textContent = defaultCaption; });
      svgEl.append(a);
    });
    if (intro) {
      PL.store.set('mappa-vista', true);
      padEls.forEach((p, i) => PL.timeout(() => p.classList.add('lit'), 200 + (i % 11) * 60));
    } else padEls.forEach((p) => p.classList.add('lit'));
    return svgEl;
  }

  /* ---------- viste ---------- */

  function chapterCard(ch, done) {
    return h('li', null, h('a', { class: 'pl-card', href: '#' + ch.id },
      h('span', { class: 'pl-card-icon', 'aria-hidden': 'true' }, (() => { const v = PL.svg('0 0 64 64'); v.append(texture(ch.id, 64, 64)); return v; })()),
      h('span', { class: 'pl-card-meta' }, 'Cap. ' + ch.num + ' · ' + ch.era),
      h('span', { class: 'pl-card-title' }, ch.title),
      h('span', { class: 'pl-card-sum' }, ch.summary),
      h('span', { class: 'pl-card-foot' },
        h('span', null, '⏱ ' + (ch.minutes || 10) + ' min'),
        done ? h('span', { class: 'pl-card-done' }, '✓ letto') : h('span', null, 'Apri →'))));
  }

  function viewHub() {
    const done = doneSet();
    const caption = h('p', { class: 'pl-die-caption', 'aria-live': 'polite' });
    const labs = chapters.reduce((n, c) => n + (c.labs || 0), 0);
    const first = chapters[0];
    const hero = h('section', { class: 'pl-hero' },
      h('div', null,
        h('p', { class: 'eyebrow' }, 'Enciclopedia · Sezione 4'),
        h('h1', null, 'Porte logiche ', h('em', null, 'e chip')),
        h('p', { class: 'lead' }, 'Come un\'idea di logica del 1847 è diventata miliardi di interruttori su un pezzo di silicio grande come un\'unghia. Leggi la storia, poi accendi le porte, somma in binario, fabbrica un transistor e fai uno zoom fino agli atomi.'),
        h('div', { class: 'hero-actions' },
          first ? h('a', { class: 'btn primary', href: '#' + first.id }, 'Inizia dal capitolo 1') : null,
          h('a', { class: 'btn', href: '#storia' }, 'Linea del tempo'),
          h('a', { class: 'btn', href: QUIZ }, 'Mettiti alla prova')),
        h('ul', { class: 'pl-hero-facts' },
          h('li', null, h('strong', null, String(chapters.length)), h('span', null, 'capitoli')),
          labs ? h('li', null, h('strong', null, String(labs)), h('span', null, 'laboratori interattivi')) : null,
          h('li', null, h('strong', null, '1847 → oggi'), h('span', null, 'da Boole ai chip di oggi')))),
      h('figure', { class: 'pl-die-wrap' }, dieMap(caption), caption));

    const acts = h('div', { class: 'pl-acts' }, ACTS.map((act) => {
      const list = chapters.filter((c) => c.num >= act.from && c.num <= act.to);
      if (!list.length) return null;
      return ui.reveal(h('section', { class: 'pl-act', 'aria-labelledby': 'atto-' + act.num },
        h('div', { class: 'pl-act-head' },
          h('span', { class: 'pl-act-num' }, 'Atto ' + act.num),
          h('h2', { id: 'atto-' + act.num }, act.title),
          h('p', null, act.text)),
        h('ul', { class: 'pl-cards' }, list.map((ch) => chapterCard(ch, done.has(ch.id))))));
    }));

    const highlights = chapters.flatMap((c) => (c.timeline || []).filter((e) => e.key).map((e) => Object.assign({ chapter: c }, e)))
      .sort((a, b) => a.year - b.year).slice(0, 10);
    const band = h('div', { class: 'pl-hub-band' },
      highlights.length ? ui.reveal(h('section', null,
        ui.timeline(highlights, { title: 'Le tappe fondamentali' }),
        h('p', null, h('a', { class: 'btn', href: '#storia' }, 'Tutta la linea del tempo →')))) : null,
      ui.reveal(h('section', null,
        h('h3', { class: 'pl-tl-title' }, 'Dove si colloca questa sezione'),
        h('div', { class: 'pl-neighbors' },
          ui.crossLink({ href: '../elettronica-avanzata/index.html', kicker: '← Sezione 3', title: 'Elettronica avanzata', text: 'I componenti e i circuiti da cui partiamo.' }),
          ui.crossLink({ href: '../chip-programmabili/index.html#idea', kicker: 'Sezione 5 →', title: 'Chip programmabili', text: 'Dal circuito integrato al microprocessore.' })),
        h('p', { style: 'margin-top:14px' }, h('a', { href: '#glossario' }, 'Glossario della sezione'), ' · ', h('a', { href: '../index.html' }, 'Torna all\'enciclopedia')))));

    return h('div', { class: 'pl-hub pl-view' }, hero, acts, band);
  }

  function buildToc(content, chId) {
    const secs = PL.$$('[data-toc]', content);
    if (!secs.length) return null;
    const bar = h('span');
    const links = secs.map((sec) => h('a', {
      href: '#' + chId + '/' + sec.id.replace(/^sez-/, ''),
      onclick: (e) => {
        e.preventDefault();
        sec.scrollIntoView({ behavior: PL.reduced() ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + chId + '/' + sec.id.replace(/^sez-/, ''));
        if (details && window.matchMedia('(max-width: 1080px)').matches) details.open = false;
      },
    }, sec.dataset.toc));
    const list = h('ol', null, links.map((a) => h('li', null, a)));
    const details = h('details', null, h('summary', null, 'In questo capitolo'), h('p', { class: 'pl-toc-title' }, 'In questo capitolo'), list);
    if (window.matchMedia && !window.matchMedia('(max-width: 1080px)').matches) details.open = true;
    const nav = h('nav', { class: 'pl-toc', 'aria-label': 'Indice del capitolo' }, details, h('div', { class: 'pl-toc-progress', 'aria-hidden': 'true' }, bar));
    // evidenzia la sottosezione che si sta leggendo e la barra di avanzamento
    let active = -1;
    let ticking = false;
    const sync = () => {
      ticking = false;
      const line = window.innerHeight * 0.3;
      let i = 0;
      secs.forEach((sec, j) => { if (sec.getBoundingClientRect().top <= line) i = j; });
      if (i !== active) {
        active = i;
        links.forEach((a, j) => { a.classList.toggle('is-active', j === i); if (j === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      }
      const r = content.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height - line)));
      bar.style.width = (p * 100).toFixed(1) + '%';
    };
    PL.listen(window, 'scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
    requestAnimationFrame(sync);
    return nav;
  }

  function viewChapter(ch) {
    const idx = chapters.indexOf(ch);
    const prev = chapters[idx - 1];
    const next = chapters[idx + 1];
    const done = doneSet().has(ch.id);
    const content = h('div', { class: 'pl-chap-content' });
    try {
      ch.render(content);
    } catch (e) {
      console.error(e);
      content.append(ui.callout({ kind: 'warn', title: 'Questo capitolo non si è caricato', body: 'Si è verificato un errore nel disegnare il capitolo. Ricarica la pagina; se il problema resta, segnalalo.' }));
    }
    const toc = buildToc(content, ch.id);
    const end = h('section', { class: 'pl-chap-end' + (done ? ' is-done' : ''), 'aria-labelledby': 'fine-cap' },
      h('div', null,
        h('h2', { id: 'fine-cap' }, 'Fine del capitolo ' + ch.num),
        h('p', null, next ? 'Prossimo: ' + next.title + '. Oppure verifica subito quello che hai imparato.' : 'Hai completato la sezione. Il viaggio continua con i chip programmabili.')),
      h('div', { class: 'pl-chap-end-actions' },
        h('a', { class: 'btn', href: QUIZ + '/' + ch.id }, 'Mettiti alla prova'),
        next ? h('a', { class: 'btn primary', href: '#' + next.id }, 'Capitolo ' + next.num + ' →')
          : h('a', { class: 'btn primary', href: '../chip-programmabili/index.html#idea' }, 'Sezione 5 →')));
    PL.onVisible(end, () => { markDone(ch.id); end.classList.add('is-done'); }, { threshold: 0.6 });

    const article = h('article', { class: 'pl-chapter cap-' + ch.id + ' pl-view' },
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' },
        h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#indice' }, SECTION_TITLE), ' / ', h('span', null, 'Capitolo ' + ch.num)),
      h('header', { class: 'pl-chap-head' },
        h('div', null,
          h('p', { class: 'eyebrow' }, 'Capitolo ' + ch.num + ' · ' + ch.era),
          h('h1', null, ch.title),
          h('p', { class: 'lead' }, PL.rich(ch.kicker)),
          h('p', { class: 'pl-chap-meta' },
            h('span', null, '⏱ ' + (ch.minutes || 10) + ' minuti'),
            ch.labs ? h('span', null, '🔬 ' + ch.labs + (ch.labs === 1 ? ' laboratorio' : ' laboratori')) : null,
            done ? h('span', null, '✓ già letto') : null)),
        h('div', { class: 'pl-chap-num', 'aria-hidden': 'true' }, String(ch.num).padStart(2, '0'))),
      h('div', { class: 'pl-chap-body' }, toc || h('span'), h('div', null, content, end,
        h('nav', { class: 'pager pl-pager', 'aria-label': 'Capitoli vicini' },
          prev ? h('a', { href: '#' + prev.id, class: 'prev' }, h('small', null, '← capitolo ' + prev.num), prev.title) : h('a', { href: '#indice', class: 'prev' }, h('small', null, '← indice'), SECTION_TITLE),
          next ? h('a', { href: '#' + next.id, class: 'next' }, h('small', null, 'capitolo ' + next.num + ' →'), next.title) : h('a', { href: '../chip-programmabili/index.html#idea', class: 'next' }, h('small', null, 'sezione 5 →'), 'Chip programmabili')))));
    return article;
  }

  function eraOf(year) { return ERAS.findIndex((e) => year <= e.to); }

  function viewTimeline() {
    const all = chapters.flatMap((c) => (c.timeline || []).map((e) => Object.assign({ chapter: c }, e)))
      .sort((a, b) => a.year - b.year || a.chapter.num - b.chapter.num);
    let filter = 'all';
    const list = h('div');
    const draw = () => {
      list.replaceChildren();
      const items = all.filter((e) => filter === 'all' || e.chapter.id === filter);
      ERAS.forEach((era, i) => {
        const evs = items.filter((e) => eraOf(e.year) === i);
        if (!evs.length) return;
        list.append(h('section', { class: 'pl-era' },
          h('header', { class: 'pl-era-head' }, h('h2', null, era.title), h('p', null, era.text)),
          h('ol', { class: 'pl-tl' }, evs.map((e) => h('li', { class: 'pl-tl-item' },
            h('span', { class: 'pl-tl-year' }, String(e.year)),
            h('div', { class: 'pl-tl-body' },
              h('strong', null, e.title),
              h('a', { class: 'pl-tl-chip', href: '#' + e.chapter.id }, 'Cap. ' + e.chapter.num),
              e.text ? h('p', null, PL.rich(e.text)) : null))))));
      });
    };
    const filters = h('div', { class: 'pl-filter', role: 'group', 'aria-label': 'Filtra per capitolo' },
      [{ id: 'all', label: 'Tutti' }].concat(chapters.map((c) => ({ id: c.id, label: c.num + '. ' + (c.short || c.title) }))).map((f) => h('button', {
        type: 'button', 'aria-pressed': f.id === 'all' ? 'true' : 'false',
        onclick: (e) => {
          filter = f.id;
          filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'));
          draw();
        },
      }, f.label)));
    draw();
    return h('div', { class: 'pl-view' },
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#indice' }, SECTION_TITLE), ' / ', h('span', null, 'Linea del tempo')),
      h('header', { class: 'page-head' },
        h('h1', null, 'Linea del tempo'),
        h('p', { class: 'lead' }, 'Da un libro di logica del 1847 ai chip con decine di miliardi di transistor: ' + all.length + ' tappe, raccolte da tutti i capitoli. Ogni invenzione risolve un limite di quella precedente.')),
      filters, list);
  }

  function viewGlossary() {
    const terms = [...PL.glossary().values()].sort((a, b) => a.term.localeCompare(b.term, 'it', { sensitivity: 'base' }));
    const input = h('input', { type: 'search', placeholder: 'Cerca un termine…', 'aria-label': 'Cerca nel glossario' });
    const letters = h('nav', { class: 'pl-letters', 'aria-label': 'Lettere' });
    const list = h('dl', { class: 'pl-gloss' });
    const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const draw = () => {
      const q = norm(input.value.trim());
      list.replaceChildren();
      letters.replaceChildren();
      let cur = '';
      terms.filter((t) => !q || norm(t.term + ' ' + t.def).includes(q)).forEach((t) => {
        const L = norm(t.term)[0];
        if (L !== cur) {
          cur = L;
          list.append(h('div', { class: 'pl-gloss-letter', id: 'lettera-' + L }, L));
          letters.append(h('a', { href: '#glossario', onclick: (e) => { e.preventDefault(); const el = document.getElementById('lettera-' + L); if (el) el.scrollIntoView({ behavior: PL.reduced() ? 'auto' : 'smooth' }); } }, L));
        }
        list.append(h('div', { class: 'pl-gloss-item' },
          h('dt', null, t.term),
          h('dd', null, t.def, ' ', h('a', { href: '#' + t.chapter.id }, '→ cap. ' + t.chapter.num))));
      });
      if (!list.children.length) list.append(h('p', null, 'Nessun termine trovato.'));
    };
    input.addEventListener('input', draw);
    draw();
    return h('div', { class: 'pl-view' },
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#indice' }, SECTION_TITLE), ' / ', h('span', null, 'Glossario')),
      h('header', { class: 'page-head' }, h('h1', null, 'Glossario'), h('p', { class: 'lead' }, terms.length + ' parole chiave della sezione. Nel testo dei capitoli le trovi sottolineate a puntini: passaci sopra per leggere la definizione.')),
      h('div', { class: 'pl-glossary-tools' }, input, letters),
      list);
  }

  function viewNotFound() {
    return h('div', { class: 'page-head pl-view' }, h('h1', null, 'Pagina non trovata'), h('p', null, h('a', { href: '#indice' }, 'Torna all\'indice della sezione')));
  }

  /* ---------- router ---------- */

  function route() {
    PL.cleanup();
    PL.hideTip();
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const [id, sub] = raw.split('/');
    let view;
    let nav = 'home';
    let title = SECTION_TITLE;
    const ch = PL.getChapter(id);
    if (!id || id === 'indice') view = viewHub();
    else if (ch) { view = viewChapter(ch); title = ch.title + ' · ' + SECTION_TITLE; nav = 'chapter'; }
    else if (id === 'storia') { view = viewTimeline(); nav = 'storia'; title = 'Linea del tempo · ' + SECTION_TITLE; }
    else if (id === 'glossario') { view = viewGlossary(); nav = 'glossario'; title = 'Glossario · ' + SECTION_TITLE; }
    else view = viewNotFound();
    document.querySelectorAll('.topnav a[data-nav]').forEach((a) => {
      if (a.dataset.nav === nav || (nav === 'chapter' && a.dataset.nav === 'home')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    main.replaceChildren(view);
    document.title = title + ' · Enciclopedia BusLab';
    const target = sub && document.getElementById('sez-' + sub);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    else window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', route);
  PL.initTips();
  updateProgress();
  route();
  loadOptional('../enciclopedia.js', updateProgress);
})();
