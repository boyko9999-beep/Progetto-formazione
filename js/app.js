/*
 * Applicazione: router a hash e viste (lezioni, linea del tempo, confronto, quiz).
 */
(function () {
  'use strict';

  const { CATEGORIES, ROOTS, BUSES } = window.BusData;
  const main = document.getElementById('main');
  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const ordered = CATEGORIES.flatMap((c) => BUSES.filter((b) => b.category === c.id));
  let currentSim = null;

  /* ---------- progressi (solo comodità locale) ---------- */

  const STORE = 'buslab-completati';
  function loadDone() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch (e) { return new Set(); }
  }
  function markDone(id) {
    const d = loadDone();
    d.add(id);
    try { localStorage.setItem(STORE, JSON.stringify([...d])); } catch (e) { /* storage non disponibile */ }
    updateProgress();
  }
  function updateProgress() {
    const n = loadDone().size;
    document.getElementById('progress').textContent = n + '/' + BUSES.length + ' completati';
    document.getElementById('progress-bar').style.width = (100 * n / BUSES.length) + '%';
  }

  /* ---------- utilità ---------- */

  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    for (const c of children.flat()) if (c != null) n.append(c);
    return n;
  }

  function catChip(cat) {
    return h('span', { class: 'chip', style: '--cat:' + cat.color }, cat.name);
  }

  function reveal(root) {
    const items = root.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((i) => i.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((i) => io.observe(i));
  }

  /* ---------- quiz ---------- */

  function quizBlock(questions, onAllCorrect) {
    const right = new Set();
    const wrap = h('div', { class: 'quiz' });
    questions.forEach((q, qi) => {
      const fb = h('p', { class: 'quiz-feedback', 'aria-live': 'polite' });
      const opts = h('div', { class: 'quiz-options', role: 'group', 'aria-label': q.q });
      const order = q.options.map((o, i) => i).sort((a, b) => ((a * 7 + qi * 3 + q.q.length) % 5) - ((b * 7 + qi * 3 + q.q.length) % 5));
      order.forEach((oi) => {
        opts.append(h('button', {
          type: 'button',
          class: 'quiz-option',
          onclick: (e) => {
            const ok = oi === q.answer;
            e.currentTarget.classList.add(ok ? 'right' : 'wrong');
            if (ok) {
              opts.querySelectorAll('button').forEach((b) => { b.disabled = true; });
              right.add(qi);
              fb.textContent = 'Giusto! ' + (q.why || '');
              fb.className = 'quiz-feedback ok';
              if (right.size === questions.length && onAllCorrect) onAllCorrect();
            } else {
              e.currentTarget.disabled = true;
              fb.textContent = 'Non proprio, riprova.';
              fb.className = 'quiz-feedback ko';
            }
          },
        }, q.options[oi]));
      });
      wrap.append(h('div', { class: 'quiz-q' }, h('p', { class: 'quiz-text' }, h('span', { class: 'quiz-n' }, String(qi + 1)), q.q), opts, fb));
    });
    return wrap;
  }

  /* ---------- viste ---------- */

  function viewHome() {
    const done = loadDone();
    const hero = h('section', { class: 'hero' },
      h('div', { class: 'hero-text' },
        h('p', { class: 'eyebrow' }, 'Formazione · comunicazione hardware'),
        h('h1', null, 'Come parlano i circuiti'),
        h('p', { class: 'lead' }, 'Dal telegrafo al PCI Express: ' + BUSES.length + ' bus e protocolli spiegati con animazioni dei segnali reali. Scrivi un messaggio, premi ▶︎ e guarda i bit viaggiare sui fili, campo per campo.'),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn primary', href: '#/bus/uart' }, 'Inizia dall\'UART'),
          h('a', { class: 'btn', href: '#/storia' }, 'Esplora la storia'))),
      h('figure', { class: 'hero-demo', 'aria-label': 'Lo stesso byte in parallelo e in seriale' },
        h('div', { class: 'demo-row' }, h('span', { class: 'demo-label' }, 'Parallelo: 8 fili, 1 colpo'),
          h('div', { class: 'demo-par' }, ...[1, 0, 0, 0, 0, 0, 1, 0].map((b, i) => h('span', { class: 'wire' }, h('i', { class: 'bit b' + b, style: '--i:' + i }, String(b)))))),
        h('div', { class: 'demo-row' }, h('span', { class: 'demo-label' }, 'Seriale: 1 filo, 8 colpi'),
          h('div', { class: 'demo-ser' }, h('span', { class: 'wire' }, ...[0, 1, 0, 0, 0, 0, 0, 1].map((b, i) => h('i', { class: 'bit b' + b, style: '--i:' + i }, String(b)))))),
        h('figcaption', null, 'Il byte 0x41, la lettera "A", spedito nei due modi.')));

    const sections = CATEGORIES.map((cat) => {
      const list = BUSES.filter((b) => b.category === cat.id).sort((a, b) => a.year - b.year);
      return h('section', { class: 'cat reveal', style: '--cat:' + cat.color },
        h('div', { class: 'cat-head' }, h('h2', null, cat.name), h('p', null, cat.intro)),
        h('ul', { class: 'bus-grid' }, list.map((b) => h('li', null,
          h('a', { class: 'bus-tile' + (done.has(b.id) ? ' done' : ''), href: '#/bus/' + b.id },
            h('span', { class: 'bus-year' }, String(b.year)),
            h('span', { class: 'bus-name' }, b.name),
            h('span', { class: 'bus-type' }, b.type + ' · ' + b.sync),
            done.has(b.id) ? h('span', { class: 'bus-done', 'aria-label': 'completato' }, '✓') : null)))));
    });
    return h('div', { class: 'view-home' }, hero, ...sections);
  }

  function viewBus(id) {
    const b = BUSES.find((x) => x.id === id);
    if (!b) return viewNotFound();
    const cat = catById[b.category];
    const idx = ordered.indexOf(b);
    const prev = ordered[idx - 1];
    const next = ordered[idx + 1];
    const facts = [['Anno', String(b.year)], ['Ideato da', b.inventor], ['Tipo', b.type], ['Sincronismo', b.sync], ['Fili', b.wires], ['Topologia', b.topology], ['Velocità', b.speed], ['Distanza', b.distance]];
    const simEl = h('div');
    const done = loadDone().has(b.id);
    const doneNote = h('p', { class: 'done-note' + (done ? ' show' : '') }, '✓ Lezione completata');

    const page = h('article', { class: 'lesson', style: '--cat:' + cat.color },
      h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '#/' }, 'Lezioni'), ' / ', h('span', null, cat.name)),
      h('header', { class: 'lesson-head' },
        h('div', null,
          catChip(cat),
          h('h1', null, b.name),
          h('p', { class: 'full' }, b.full)),
        h('dl', { class: 'facts' }, facts.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))))),
      h('section', { class: 'block sim-block', 'aria-labelledby': 'sim-title' },
        h('div', { class: 'block-head' }, h('h2', { id: 'sim-title' }, 'Guarda i segnali'),
          h('p', null, 'Scrivi fino a 8 caratteri (o byte esadecimali, per esempio 0x12 0xAB) e premi ▶︎. Clicca un campo qui sotto per saltarci.')),
        simEl),
      h('div', { class: 'lesson-cols' },
        h('section', { class: 'block' }, h('h2', null, 'La storia'), b.story.map((p) => h('p', null, p))),
        h('section', { class: 'block' }, h('h2', null, 'Come funziona'), h('ol', { class: 'how' }, b.how.map((x) => h('li', null, x))),
          h('aside', { class: 'fun' }, h('strong', null, 'Lo sapevi? '), b.fun),
          h('p', { class: 'uses' }, h('strong', null, 'Dove lo trovi: '), b.uses))),
      h('section', { class: 'block' }, h('h2', null, 'Verifica'), quizBlock(b.quiz, () => { markDone(b.id); doneNote.classList.add('show'); }), doneNote),
      h('nav', { class: 'pager', 'aria-label': 'Lezioni vicine' },
        prev ? h('a', { href: '#/bus/' + prev.id, class: 'prev' }, h('small', null, '← precedente'), prev.name) : h('span'),
        next ? h('a', { href: '#/bus/' + next.id, class: 'next' }, h('small', null, 'successiva →'), next.name) : h('span')));

    requestAnimationFrame(() => { currentSim = new Simulator(simEl, b.sim, { message: 'Ciao' }); });
    return page;
  }

  function viewTimeline() {
    const items = ROOTS.map((r) => ({ year: r.year, name: r.name, text: r.text, root: true }))
      .concat(BUSES.map((b) => ({ year: b.year, name: b.name, text: b.story[0], bus: b })))
      .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
    let decade = null;
    const list = h('ol', { class: 'timeline' });
    for (const it of items) {
      const d = it.year < 1950 ? 'Le origini' : Math.floor(it.year / 10) * 10 + '';
      if (d !== decade) {
        decade = d;
        list.append(h('li', { class: 'decade reveal' }, d === 'Le origini' ? d : 'Anni ' + d.slice(2) + ' · ' + d));
      }
      const cat = it.bus ? catById[it.bus.category] : null;
      list.append(h('li', { class: 'event reveal' + (it.root ? ' root' : ''), style: cat ? '--cat:' + cat.color : '' },
        h('span', { class: 'event-year' }, String(it.year)),
        h('div', { class: 'event-body' },
          h('h3', null, it.bus ? h('a', { href: '#/bus/' + it.bus.id }, it.name) : it.name),
          cat ? catChip(cat) : h('span', { class: 'chip', style: '--cat:var(--muted)' }, 'Preistoria'),
          h('p', null, it.text))));
    }
    return h('div', { class: 'view-timeline' },
      h('header', { class: 'page-head' }, h('h1', null, 'Linea del tempo'),
        h('p', { class: 'lead' }, 'Quasi due secoli di idee: ogni bus nasce per risolvere un limite di quello precedente. Il bit di start delle telescriventi del 1908 è ancora dentro ogni UART di oggi.')),
      list);
  }

  function viewCompare() {
    const cols = [['name', 'Bus'], ['year', 'Anno'], ['category', 'Categoria'], ['type', 'Tipo'], ['sync', 'Sincronismo'], ['wires', 'Fili'], ['topology', 'Topologia'], ['speed', 'Velocità'], ['distance', 'Distanza']];
    const state = { sort: 'year', dir: 1, cat: 'all' };
    const tbody = h('tbody');
    const head = h('tr', null, cols.map(([k, label]) => h('th', { scope: 'col' },
      k === 'name' || k === 'year' || k === 'category'
        ? h('button', { type: 'button', 'data-k': k, onclick: () => { state.dir = state.sort === k ? -state.dir : 1; state.sort = k; draw(); } }, label)
        : label)));
    const filters = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filtra per categoria' },
      [{ id: 'all', name: 'Tutti', color: 'var(--ink)' }].concat(CATEGORIES).map((c) => h('button', {
        type: 'button', class: 'chip-btn' + (c.id === 'all' ? ' on' : ''), style: '--cat:' + c.color, 'data-c': c.id,
        onclick: (e) => {
          state.cat = c.id;
          filters.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === e.currentTarget));
          draw();
        },
      }, c.name)));
    function draw() {
      const rows = BUSES.filter((b) => state.cat === 'all' || b.category === state.cat).slice().sort((a, b) => {
        const k = state.sort;
        const av = k === 'category' ? catById[a.category].name : a[k];
        const bv = k === 'category' ? catById[b.category].name : b[k];
        return (av > bv ? 1 : av < bv ? -1 : 0) * state.dir;
      });
      tbody.innerHTML = '';
      rows.forEach((b) => tbody.append(h('tr', { style: '--cat:' + catById[b.category].color },
        cols.map(([k]) => {
          if (k === 'name') return h('th', { scope: 'row' }, h('a', { href: '#/bus/' + b.id }, b.name));
          if (k === 'category') return h('td', null, catChip(catById[b.category]));
          return h('td', null, String(b[k]));
        }))));
      head.querySelectorAll('button').forEach((x) => {
        x.setAttribute('aria-sort', x.dataset.k === state.sort ? (state.dir > 0 ? 'ascending' : 'descending') : 'none');
        x.dataset.arrow = x.dataset.k === state.sort ? (state.dir > 0 ? '▲' : '▼') : '';
      });
    }
    draw();
    return h('div', { class: 'view-compare' },
      h('header', { class: 'page-head' }, h('h1', null, 'Confronto'),
        h('p', { class: 'lead' }, 'Tutti i bus a colpo d\'occhio. Clicca le intestazioni per ordinare.')),
      filters,
      h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, head), tbody)));
  }

  function viewQuiz() {
    const pool = BUSES.flatMap((b) => b.quiz.map((q) => Object.assign({ bus: b }, q)));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const qs = pool.slice(0, 10).map((q) => Object.assign({}, q, { q: '[' + q.bus.name + '] ' + q.q }));
    const result = h('p', { class: 'quiz-result' });
    const block = quizBlock(qs, () => {
      const firstTry = [...block.querySelectorAll('.quiz-options')].filter((g) => !g.querySelector('.wrong')).length;
      result.textContent = 'Hai risposto bene al primo colpo a ' + firstTry + ' domande su ' + qs.length + '.';
      result.classList.add('show');
    });
    return h('div', { class: 'view-quiz' },
      h('header', { class: 'page-head' }, h('h1', null, 'Quiz finale'),
        h('p', { class: 'lead' }, '10 domande pescate a caso da tutte le lezioni.'),
        h('a', { class: 'btn', href: '#/quiz', onclick: (e) => { e.preventDefault(); route(true); } }, 'Nuove domande')),
      block, result);
  }

  function viewNotFound() {
    return h('div', { class: 'page-head' }, h('h1', null, 'Pagina non trovata'), h('p', null, h('a', { href: '#/' }, 'Torna alle lezioni')));
  }

  /* ---------- router ---------- */

  function route(force) {
    const hash = location.hash.replace(/^#/, '') || '/';
    if (currentSim) { currentSim.destroy(); currentSim = null; }
    let view;
    let nav = 'home';
    if (hash === '/' || hash === '') view = viewHome();
    else if (hash.startsWith('/bus/')) view = viewBus(hash.slice(5));
    else if (hash === '/storia') { view = viewTimeline(); nav = 'storia'; }
    else if (hash === '/confronto') { view = viewCompare(); nav = 'confronto'; }
    else if (hash === '/quiz') { view = viewQuiz(); nav = 'quiz'; }
    else view = viewNotFound();
    document.querySelectorAll('.topnav a').forEach((a) => {
      if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    main.innerHTML = '';
    main.append(view);
    reveal(main);
    const title = view.querySelector('h1');
    document.title = (title && nav !== 'home' ? title.textContent + ' · ' : '') + 'BusLab';
    if (!force) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', () => route());
  updateProgress();
  route();
})();
