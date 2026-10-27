/*
 * Elettronica avanzata: pagine della sezione.
 * Indice con la mappa delle frequenze, capitoli (animazione, laboratorio,
 * storia, verifica) e linea del tempo di tutta la sezione.
 * Indirizzi: #fourier apre un capitolo (come li collega l'hub), #storia la linea del tempo.
 */
(function () {
  'use strict';

  const EA = window.EA;
  const SEZ = window.EA_SEZIONE;
  const { h, s } = EA;
  const main = document.getElementById('main');
  const META = SEZ.capitoli;
  const QUIZ_URL = '../quiz/index.html#' + SEZ.slug;
  let scopes = [];

  /* ---------- progressi (solo comodità locale) ---------- */

  const STORE = 'avanzata-completati';
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
    const n = [...loadDone()].filter((id) => META.some((m) => m.id === id)).length;
    const label = document.getElementById('progress');
    const bar = document.getElementById('progress-bar');
    if (label) label.textContent = n + '/' + META.length + ' capitoli';
    if (bar) bar.style.width = (100 * n / META.length) + '%';
    if (window.Enciclopedia && typeof window.Enciclopedia.progresso === 'function') {
      try { window.Enciclopedia.progresso(SEZ.slug, n, META.length); } catch (e) { /* hub assente */ }
    }
  }

  /* ---------- utilità ---------- */

  const pad2 = (n) => String(n).padStart(2, '0');
  const chapterHref = (id) => '#' + id;

  function icon(m, cls) {
    const svg = s('svg', { viewBox: '0 0 48 48', class: cls || 'ea-icon', 'aria-hidden': 'true', focusable: 'false' });
    svg.innerHTML = m.icona;
    return svg;
  }

  function reveal(rootEl) {
    const items = rootEl.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || EA.reduced()) {
      items.forEach((i) => i.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach((i) => io.observe(i));
    scopes.push({ destroy: () => io.disconnect() });
  }

  function sectionHead(kicker, title, id) {
    return h('div', { class: 'ea-shead' },
      h('p', { class: 'ea-kicker' }, kicker),
      h('h2', { id }, title));
  }

  // Mescolamento stabile: la risposta giusta (sempre la prima nei dati) cambia posto.
  function seededOrder(n, seedText) {
    let x = 2166136261;
    for (let i = 0; i < seedText.length; i++) { x ^= seedText.charCodeAt(i); x = Math.imul(x, 16777619); }
    const order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      const j = Math.abs(x) % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  /* ---------- verifica ---------- */

  function quizBlock(questions, onAllCorrect) {
    const right = new Set();
    const wrap = h('div', { class: 'quiz' });
    questions.forEach((q, qi) => {
      const fb = h('p', { class: 'quiz-feedback', 'aria-live': 'polite' });
      const opts = h('div', { class: 'quiz-options', role: 'group', 'aria-label': q.q });
      seededOrder(q.options.length, q.q).forEach((oi) => {
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
      wrap.append(h('div', { class: 'quiz-q' },
        h('p', { class: 'quiz-text' }, h('span', { class: 'quiz-n' }, String(qi + 1)), q.q), opts, fb));
    });
    return wrap;
  }

  /* ---------- mappa delle frequenze ---------- */

  const DECADES = [[0, '1 Hz'], [3, '1 kHz'], [6, '1 MHz'], [9, '1 GHz'], [12, '1 THz'], [15, '1 PHz']];
  const REGIONS = [
    { from: 20, to: 2e4, name: 'Udibile', color: '#3ee08f' },
    { from: 3e3, to: 3e11, name: 'Onde radio', color: '#ffc04d' },
    { from: 3e8, to: 3e11, name: 'Microonde', color: '#ff9f43' },
    { from: 3e11, to: 4.3e14, name: 'Infrarosso', color: '#ff6b6b' },
    { from: 4.3e14, to: 7.7e14, name: 'Luce', color: '#dfe7ff' },
  ];

  function frequencyMap() {
    const markers = h('div', { class: 'ea-map-markers' });
    const plot = h('div', { class: 'ea-map-plot' });
    const info = h('p', { class: 'ea-map-info', 'aria-live': 'polite' }, 'Passa sopra un capitolo, o raggiungilo con il tasto Tab, per vedere la sua banda di frequenze.');
    const panel = h('figure', { class: 'ea-map' },
      h('figcaption', { class: 'ea-map-head' },
        h('span', { class: 'ea-map-title' }, 'La scala delle frequenze'),
        h('span', { class: 'ea-map-sub' }, 'da 1 Hz a 1 PHz, scala logaritmica: ogni tacca vale mille volte la precedente')),
      plot, info);
    const scope = EA.createScope(panel);
    scopes.push(scope);
    const cv = scope.canvas(plot, { class: 'ea-map-canvas', label: 'Onda la cui frequenza cresce da sinistra a destra, dall\'udibile alla luce, con le bande dei dieci capitoli.' });
    plot.append(markers);
    let active = null;
    let geo = null;

    const els = META.map((m) => {
      const a = h('a', {
        class: 'ea-map-marker', href: chapterHref(m.id), style: { '--ch': m.tinta },
        'aria-label': 'Capitolo ' + m.numero + ': ' + m.titolo + ', ' + m.freq.label,
      }, h('span', { class: 'n' }, String(m.numero)), h('span', { class: 't' }, m.argomento));
      const on = () => { active = m; a.classList.add('on'); info.textContent = pad2(m.numero) + ' · ' + m.titolo + ' — ' + m.freq.label; scope.invalidate(); };
      const off = () => { if (active === m) active = null; a.classList.remove('on'); scope.invalidate(); };
      a.addEventListener('mouseenter', on);
      a.addEventListener('focus', on);
      a.addEventListener('mouseleave', off);
      a.addEventListener('blur', off);
      markers.append(a);
      return { m, a };
    });

    // Geometria e corsie: i segnaposto vicini salgono su corsie diverse.
    function layout() {
      const w = cv.w;
      const hh = cv.h;
      if (!w) return;
      const pad = 26;
      const axisY = hh - 64;
      const x = (f) => pad + (Math.log10(f) / 15) * (w - pad * 2);
      const laneH = w < 560 ? 30 : 34;
      const lanes = [];
      const sorted = els.slice().sort((p, q) => p.m.freq.f - q.m.freq.f);
      sorted.forEach((e) => {
        const cx = x(e.m.freq.f);
        const half = e.a.offsetWidth / 2 + 6;
        let lane = lanes.findIndex((right) => right < cx - half);
        if (lane < 0) { lane = lanes.length; lanes.push(-Infinity); }
        lanes[lane] = cx + half;
        e.lane = lane;
        e.cx = cx;
      });
      const top = w < 560 ? 6 : 10;
      sorted.forEach((e) => {
        const y = top + e.lane * laneH;
        const left = EA.clamp(e.cx, e.a.offsetWidth / 2 + 2, w - e.a.offsetWidth / 2 - 2);
        e.a.style.left = left + 'px';
        e.a.style.top = y + 'px';
        e.a.style.setProperty('--stem', Math.max(8, axisY - 52 - y - e.a.offsetHeight) + 'px');
        e.a.style.setProperty('--dx', (e.cx - left) + 'px');
      });
      geo = { w, hh, pad, axisY, x };
    }

    function render(t) {
      if (!geo || geo.w !== cv.w || geo.hh !== cv.h) layout();
      if (!geo) return;
      const ctx = cv.ctx;
      const { w, hh, pad, axisY, x } = geo;
      ctx.clearRect(0, 0, w, hh);

      // Bande delle regioni sotto l'asse; le etichette che non ci stanno scendono di riga.
      const rows = [[], []];
      ctx.save();
      ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      REGIONS.forEach((r, i) => {
        const x0 = x(r.from);
        const x1 = x(r.to);
        const y = axisY + 26;
        ctx.fillStyle = EA.alpha(r.color, 0.5);
        ctx.fillRect(x0, y, Math.max(2, x1 - x0), 3);
        const tw = ctx.measureText(r.name).width;
        const cx = EA.clamp((x0 + x1) / 2, pad + tw / 2, w - pad - tw / 2);
        const span = [cx - tw / 2 - 6, cx + tw / 2 + 6];
        const row = rows.findIndex((occ) => occ.every((o) => span[1] < o[0] || span[0] > o[1]));
        if (row < 0) return;
        rows[row].push(span);
        EA.draw.text(ctx, r.name, cx, axisY + 41 + row * 13, { color: EA.alpha(r.color, 0.95), size: 10.5, align: 'center' });
      });
      ctx.restore();

      // Banda del capitolo evidenziato.
      if (active) {
        const x0 = x(active.freq.min);
        const x1 = x(active.freq.max);
        const g = ctx.createLinearGradient(0, axisY - 70, 0, axisY);
        g.addColorStop(0, EA.alpha(active.tinta, 0));
        g.addColorStop(1, EA.alpha(active.tinta, 0.22));
        ctx.fillStyle = g;
        ctx.fillRect(x0, axisY - 70, Math.max(3, x1 - x0), 70);
        ctx.fillStyle = active.tinta;
        ctx.fillRect(x0, axisY - 1, Math.max(3, x1 - x0), 3);
      }

      // Onda "chirp": il periodo si accorcia da 140 px a 3 px andando verso destra.
      const midY = axisY - 30;
      const amp = 16;
      const P0 = 140;
      const Pmin = 3.2;
      const span = w - pad * 2;
      const k = Math.log(P0 / Pmin) / span;
      const phase = (xx) => (EA.TAU / (P0 * k)) * (Math.exp(k * (xx - pad)) - 1);
      const xCut = pad + Math.log(P0 / 5) / k;
      const grad = ctx.createLinearGradient(pad, 0, w - pad, 0);
      grad.addColorStop(0, '#3ee08f');
      grad.addColorStop(0.45, '#5cc8ff');
      grad.addColorStop(0.78, '#b49cff');
      grad.addColorStop(0.955, '#ff6b6b');
      grad.addColorStop(0.97, '#ffc04d');
      grad.addColorStop(0.985, '#3ee08f');
      grad.addColorStop(1, '#7aa2ff');
      const pts = [];
      for (let xx = pad; xx <= xCut; xx += 1) pts.push([xx, midY - amp * Math.sin(phase(xx) - t * 2.2)]);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Oltre il limite dei pixel l'onda diventa una fascia luminosa.
      const shimmer = 0.75 + 0.25 * Math.sin(t * 3);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35 * shimmer;
      ctx.fillRect(xCut, midY - amp, w - pad - xCut, amp * 2);
      ctx.globalAlpha = 0.8;
      ctx.fillRect(xCut, midY - 1, w - pad - xCut, 2);
      ctx.restore();

      // Asse con tacche di decade.
      ctx.save();
      ctx.strokeStyle = '#2b3d37';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, axisY + 0.5);
      ctx.lineTo(w - pad, axisY + 0.5);
      for (let d = 0; d <= 15; d++) {
        const xx = Math.round(x(Math.pow(10, d))) + 0.5;
        const major = d % 3 === 0;
        ctx.moveTo(xx, axisY - (major ? 6 : 3));
        ctx.lineTo(xx, axisY + (major ? 6 : 3));
      }
      ctx.stroke();
      ctx.restore();
      DECADES.forEach(([d, label]) => EA.draw.text(ctx, label, x(Math.pow(10, d)), axisY + 18, { color: EA.colors.text, size: 11, align: 'center' }));
    }

    const loop = scope.loop(render);
    cv.onresize = () => { layout(); };
    return { el: panel, start: () => { layout(); scope.start(); loop.render(); } };
  }

  /* ---------- viste ---------- */

  function viewHome() {
    const done = loadDone();
    const first = META[0];
    const map = frequencyMap();
    const hero = h('section', { class: 'ea-home-hero' },
      h('div', { class: 'ea-home-text' },
        h('p', { class: 'eyebrow' }, 'Enciclopedia · Sezione ' + SEZ.numero + ' di 8'),
        h('h1', null, SEZ.titolo),
        h('p', { class: 'lead' }, 'Quando i segnali diventano velocissimi i fili si comportano come onde, la luce trasporta i dati e la meccanica quantistica entra nei circuiti. Dieci capitoli, ciascuno con un\'animazione, un laboratorio da provare e la sua storia.'),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn primary', href: chapterHref(first.id) }, 'Inizia: ' + first.titolo.toLowerCase()),
          h('a', { class: 'btn', href: '#storia' }, 'Linea del tempo'),
          h('a', { class: 'btn', href: QUIZ_URL }, 'Quiz della sezione'))),
      map.el);

    const grid = h('ol', { class: 'ea-grid' }, META.map((m) => h('li', { class: 'reveal' },
      h('a', { class: 'ea-card' + (done.has(m.id) ? ' done' : ''), href: chapterHref(m.id), style: { '--ch': m.tinta } },
        h('span', { class: 'ea-card-icon' }, icon(m)),
        h('span', { class: 'ea-card-num' }, 'Capitolo ' + m.numero + ' · ' + m.periodo),
        h('span', { class: 'ea-card-title' }, m.titolo),
        h('span', { class: 'ea-card-topic' }, m.argomento),
        h('span', { class: 'ea-card-desc' }, m.descrizione),
        done.has(m.id) ? h('span', { class: 'ea-card-done', 'aria-label': 'completato' }, '✓') : null))));

    const view = h('div', { class: 'ea-view ea-home' },
      hero,
      h('section', { class: 'ea-block', 'aria-labelledby': 'cap-title' },
        sectionHead('Il percorso', 'I dieci capitoli', 'cap-title'),
        h('p', { class: 'ea-block-lead' }, 'Si possono leggere in ordine o saltando: ognuno parte da un\'idea semplice e arriva alla tecnologia di oggi.'),
        grid));
    requestAnimationFrame(() => map.start());
    return view;
  }

  function chapterStub(m) {
    return h('section', { class: 'ea-stub' },
      h('p', null, 'Questo capitolo è in preparazione.'),
      h('p', null, h('a', { href: '#' }, 'Torna all\'indice dei capitoli')));
  }

  function heroFigure(ch, m) {
    const ar = {};
    if (ch.hero.aspect) ar['--ar'] = ch.hero.aspect;
    if (ch.hero.aspectMobile) ar['--ar-m'] = ch.hero.aspectMobile;
    const view = h('div', { class: 'ea-stage-view', style: ar });
    const cap = h('figcaption', { class: 'ea-stage-cap' }, ch.hero.caption || '');
    const bar = h('div', { class: 'ea-stage-bar' });
    const fig = h('figure', { class: 'ea-stage', 'aria-label': ch.hero.label || ('Animazione: ' + m.titolo) }, view, bar);
    bar.append(cap);
    return { fig, view, bar };
  }

  function mountSafely(fn, target, label) {
    try {
      return fn() || {};
    } catch (err) {
      console.error('[elettronica-avanzata] ' + label + ':', err);
      target.append(h('p', { class: 'ea-error' }, 'Questa animazione non è riuscita a partire. Il resto del capitolo funziona.'));
      return {};
    }
  }

  function viewChapter(id) {
    const m = META.find((c) => c.id === id);
    if (!m) return viewNotFound();
    const ch = EA.chapter(id);
    const idx = META.indexOf(m);
    const prev = META[idx - 1];
    const next = META[idx + 1];
    const done = loadDone().has(m.id);

    const head = h('header', { class: 'ea-chead' },
      h('div', { class: 'ea-cnum', 'aria-hidden': 'true' }, pad2(m.numero)),
      h('div', { class: 'ea-chead-text' },
        h('p', { class: 'eyebrow' }, 'Capitolo ' + m.numero + ' · ' + m.argomento),
        h('h1', null, m.titolo),
        h('p', { class: 'lead' }, m.descrizione),
        h('ul', { class: 'ea-tags', 'aria-label': 'In breve' },
          h('li', null, m.periodo),
          h('li', null, m.freq.label))));

    const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Percorso' },
      h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ',
      h('a', { href: '#' }, SEZ.titolo), ' / ',
      h('span', { 'aria-current': 'page' }, 'Capitolo ' + m.numero));

    const pager = h('nav', { class: 'pager', 'aria-label': 'Capitoli vicini' },
      prev ? h('a', { href: chapterHref(prev.id), class: 'prev' }, h('small', null, '← capitolo ' + prev.numero), prev.titolo) : h('a', { href: '#', class: 'prev' }, h('small', null, '← sezione'), 'Indice dei capitoli'),
      next ? h('a', { href: chapterHref(next.id), class: 'next' }, h('small', null, 'capitolo ' + next.numero + ' →'), next.titolo) : h('a', { href: QUIZ_URL, class: 'next' }, h('small', null, 'fine sezione →'), 'Quiz della sezione'));

    const page = h('article', { class: 'ea-view ea-chapter', style: { '--ch': m.tinta } }, crumbs, head);

    if (!ch || ch.stub) {
      page.append(chapterStub(m), pager);
      return page;
    }

    // Animazione principale.
    const hero = heroFigure(ch, m);
    page.append(hero.fig);

    // L'idea e come funziona.
    const stepButtons = [];
    const steps = h('ol', { class: 'ea-steps' }, (ch.steps || []).map((st, i) => {
      const b = h('button', { type: 'button', class: 'ea-step', 'data-i': String(i) },
        h('strong', null, st.title), h('span', null, st.text));
      stepButtons.push(b);
      return h('li', null, b);
    }));
    page.append(h('div', { class: 'ea-cols' },
      h('section', { class: 'ea-prose', 'aria-labelledby': 'idea-title' },
        sectionHead('L\'idea', 'In parole semplici', 'idea-title'),
        (ch.intro || []).map((p) => h('p', { html: p }))),
      h('section', { 'aria-labelledby': 'how-title' },
        sectionHead('Passo per passo', 'Come funziona', 'how-title'),
        h('p', { class: 'ea-hint' }, 'Tocca un passo per vederlo nell\'animazione.'),
        steps)));

    // Laboratorio.
    const labControls = h('div', { class: 'ea-lab-controls' });
    const labDisplay = h('div', { class: 'ea-lab-display' });
    const labReadouts = h('div', { class: 'ea-lab-readouts' });
    const labTools = h('div', { class: 'ea-lab-tools' });
    const lab = h('section', { class: 'ea-lab' + (ch.lab.layout === 'stack' ? ' is-stack' : ''), 'aria-labelledby': 'lab-title' },
      h('div', { class: 'ea-lab-head' },
        h('div', null,
          h('p', { class: 'ea-lab-kicker' }, 'Laboratorio'),
          h('h2', { id: 'lab-title' }, ch.lab.title),
          ch.lab.intro ? h('p', { class: 'ea-lab-intro', html: ch.lab.intro }) : null),
        labTools),
      h('div', { class: 'ea-lab-body' }, labControls, labDisplay),
      labReadouts);
    page.append(lab);

    // Formule chiave.
    if (ch.formulas && ch.formulas.length) {
      page.append(h('section', { class: 'ea-block', 'aria-labelledby': 'formule-title' },
        sectionHead('Da ricordare', 'Le formule chiave', 'formule-title'),
        h('ul', { class: 'ea-formulas' }, ch.formulas.map((f) => h('li', { class: 'ea-formula reveal' },
          h('p', { class: 'ea-formula-label' }, f.label),
          h('p', { class: 'ea-formula-eq', html: f.eq }),
          h('p', { html: f.text }))))));
    }

    // Storia, curiosità, usi, glossario.
    const timeline = (ch.timeline || []).slice().sort((a, b) => a.year - b.year);
    page.append(h('div', { class: 'ea-history' },
      h('section', { 'aria-labelledby': 'storia-title' },
        sectionHead('La storia', 'Chi ci è arrivato, e quando', 'storia-title'),
        h('ol', { class: 'ea-tl' }, timeline.map((e) => h('li', { class: 'reveal' },
          h('span', { class: 'ea-tl-year' }, String(e.year)),
          h('h3', { class: 'ea-tl-title' }, e.title),
          e.who ? h('p', { class: 'ea-tl-who' }, e.who) : null,
          h('p', { class: 'ea-tl-text', html: e.text }))))),
      h('aside', { class: 'ea-side' },
        ch.fun ? h('div', { class: 'ea-fun' }, h('p', { class: 'ea-kicker' }, 'Lo sapevi?'), h('p', { html: ch.fun })) : null,
        ch.uses && ch.uses.length ? h('div', { class: 'ea-uses' },
          h('p', { class: 'ea-kicker' }, 'Dove lo trovi oggi'),
          h('ul', null, ch.uses.map((u) => h('li', null, u)))) : null,
        ch.glossary && ch.glossary.length ? h('div', { class: 'ea-gloss' },
          h('p', { class: 'ea-kicker' }, 'Glossario'),
          h('dl', null, ch.glossary.map((g) => h('div', null, h('dt', null, g.term), h('dd', { html: g.def }))))) : null)));

    // Verifica.
    const qs = (window.EA_QUIZ || []).filter((q) => q.chapter === m.id).concat(ch.quiz || []).slice(0, 4);
    if (qs.length) {
      const doneNote = h('p', { class: 'done-note' + (done ? ' show' : '') }, '✓ Capitolo completato');
      page.append(h('section', { class: 'ea-block ea-check', style: { '--cat': 'var(--ea-accent)' }, 'aria-labelledby': 'verifica-title' },
        sectionHead('Verifica', 'Hai capito?', 'verifica-title'),
        quizBlock(qs, () => { markDone(m.id); doneNote.classList.add('show'); }),
        doneNote,
        h('p', { class: 'ea-more' }, h('a', { href: QUIZ_URL + '/' + m.id }, 'Altre domande su questo capitolo nel quiz dell\'enciclopedia →'))));
    }

    // Fonti.
    if (ch.sources && ch.sources.length) {
      page.append(h('section', { class: 'ea-sources', 'aria-labelledby': 'fonti-title' },
        h('h2', { id: 'fonti-title' }, 'Per approfondire'),
        h('ul', null, ch.sources.map((src) => h('li', null,
          h('a', { href: src.url, target: '_blank', rel: 'noopener' }, src.title))))));
    }

    page.append(pager);

    // Montaggio delle parti animate, dopo che la pagina è nel documento.
    page._mount = () => {
      const heroScope = EA.createScope(hero.view, {
        steps: ch.steps || [],
        setStep(i) {
          stepButtons.forEach((b, k) => {
            if (k === i) b.setAttribute('aria-current', 'step');
            else b.removeAttribute('aria-current');
          });
        },
      });
      scopes.push(heroScope);
      const heroCtl = mountSafely(() => ch.hero.mount(hero.view, heroScope), hero.view, 'animazione');
      if (heroCtl.destroy) heroScope.cleanup(heroCtl.destroy);
      if (heroScope.hasLoops) hero.bar.prepend(EA.ui.playButton(heroScope, 'l\'animazione'));
      stepButtons.forEach((b, i) => b.addEventListener('click', () => {
        heroScope.setStep(i);
        if (heroCtl.focus) heroCtl.focus((ch.steps[i] || {}).focus, i);
        else heroScope.invalidate();
        if (window.innerWidth < 900) hero.fig.scrollIntoView({ behavior: EA.reduced() ? 'auto' : 'smooth', block: 'center' });
      }));
      heroScope.start();

      const labScope = EA.createScope(lab);
      scopes.push(labScope);
      const labCtl = mountSafely(() => ch.lab.mount({ root: lab, controls: labControls, display: labDisplay, readouts: labReadouts, tools: labTools }, labScope), labDisplay, 'laboratorio');
      if (labCtl.destroy) labScope.cleanup(labCtl.destroy);
      if (labScope.hasLoops && !ch.lab.noPlayButton) labTools.append(EA.ui.playButton(labScope, 'il laboratorio'));
      if (!labReadouts.children.length) labReadouts.remove();
      labScope.start();
    };
    return page;
  }

  function viewHistory() {
    const items = [];
    META.forEach((m) => {
      const ch = EA.chapter(m.id);
      if (!ch || ch.stub) return;
      (ch.timeline || []).forEach((e) => items.push(Object.assign({ m }, e)));
    });
    items.sort((a, b) => a.year - b.year || a.m.numero - b.m.numero);
    const ERAS = [
      { to: 1899, name: 'L\'Ottocento: le leggi del campo' },
      { to: 1945, name: '1900 – 1945: valvole, radio e quarzo' },
      { to: 1979, name: '1946 – 1979: transistor, laser e circuiti integrati' },
      { to: 1999, name: '1980 – 1999: il digitale ovunque' },
      { to: 9999, name: 'Dal 2000 a oggi: miniaturizzazione estrema e quanti' },
    ];
    let era = null;
    const list = h('ol', { class: 'timeline ea-timeline' });
    items.forEach((it) => {
      const e = ERAS.find((x) => it.year <= x.to);
      if (e !== era) {
        era = e;
        list.append(h('li', { class: 'decade reveal' }, e.name));
      }
      list.append(h('li', { class: 'event reveal', style: { '--cat': it.m.tinta, '--ch': it.m.tinta } },
        h('span', { class: 'event-year' }, String(it.year)),
        h('div', { class: 'event-body' },
          h('h3', null, it.title),
          h('a', { class: 'ea-chip', href: chapterHref(it.m.id) }, pad2(it.m.numero) + ' · ' + it.m.argomento),
          h('p', { html: it.text }))));
    });
    return h('div', { class: 'ea-view ea-history-view' },
      h('header', { class: 'page-head' },
        h('p', { class: 'eyebrow' }, SEZ.titolo),
        h('h1', null, 'Linea del tempo'),
        h('p', { class: 'lead' }, 'Due secoli di idee, da Fourier ai qubit. Ogni tappa porta al capitolo che la racconta.')),
      items.length ? list : h('p', null, 'La linea del tempo si riempie man mano che i capitoli sono pronti.'));
  }

  function viewNotFound() {
    return h('div', { class: 'ea-view page-head' },
      h('h1', null, 'Pagina non trovata'),
      h('p', null, h('a', { href: '#' }, 'Torna all\'indice dei capitoli')));
  }

  /* ---------- router ---------- */

  function parse() {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { view: 'home' };
    if (parts[0] === 'storia') return { view: 'storia' };
    if (parts[0] === 'capitolo' && parts[1]) return { view: 'capitolo', id: parts[1] };
    return { view: 'capitolo', id: parts[0] };
  }

  function route() {
    scopes.forEach((sc) => sc.destroy());
    scopes = [];
    const r = parse();
    let view;
    let nav = 'home';
    if (r.view === 'home') view = viewHome();
    else if (r.view === 'storia') { view = viewHistory(); nav = 'storia'; }
    else { view = viewChapter(r.id); nav = 'capitolo'; }
    document.querySelectorAll('.topnav a[data-nav]').forEach((a) => {
      if (a.dataset.nav === nav || (nav === 'capitolo' && a.dataset.nav === 'home')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    main.innerHTML = '';
    main.append(view);
    if (view._mount) view._mount();
    reveal(main);
    const title = view.querySelector('h1');
    document.title = (title && r.view !== 'home' ? title.textContent + ' · ' : '') + SEZ.titolo + ' · Enciclopedia BusLab';
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', route);
  updateProgress();
  route();
})();
