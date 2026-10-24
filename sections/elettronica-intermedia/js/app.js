/*
 * Elettronica intermedia: pagine della sezione (panoramica, capitoli, storia, glossario),
 * navigazione con l'hash (#diodo, #storia, #glossario/lacuna) e progressi salvati nel browser.
 */
(function () {
  'use strict';

  const { h } = EI;
  const SEZ = window.EI_SEZIONE;
  const main = document.getElementById('main');
  const QUIZ = '../quiz/index.html#elettronica-intermedia';
  const registered = Object.fromEntries(EI.chapters.map((c) => [c.id, c]));
  // "P-N" non va a capo dopo il trattino: trattino non separabile solo nella pagina.
  const nobreak = (t) => String(t).replace(/([A-Z])-([A-Z])/g, '$1\u2011$2');
  const chapters = SEZ.capitoli.map((m, i) => Object.assign(
    { number: i + 1, title: nobreak(m.titolo), tagline: m.descrizione, period: m.periodo },
    registered[m.id] || { id: m.id, pending: true }));
  const byId = Object.fromEntries(chapters.map((c) => [c.id, c]));

  // Glossario: ogni capitolo porta i suoi termini; storia.js può aggiungerne altri.
  chapters.forEach((c) => {
    for (const k in c.glossary || {}) {
      if (!EI.glossary[k]) EI.glossary[k] = Object.assign({ chapter: c.id }, c.glossary[k]);
    }
  });

  // Stili propri dei capitoli (campo css), inseriti una volta sola.
  const css = chapters.filter((c) => c.css).map((c) => '/* ' + c.id + ' */\n' + c.css).join('\n');
  if (css) document.head.append(h('style', { id: 'ei-chapter-css' }, css));

  let current = null; // { lab, cleanup }

  /* ---------- progressi (solo comodità locale) ---------- */

  const VISTI = 'ei-visitati';
  function loadSeen() {
    try { return new Set(JSON.parse(localStorage.getItem(VISTI) || '[]')); } catch (e) { return new Set(); }
  }
  function markSeen(id) {
    const s = loadSeen();
    if (s.has(id)) return;
    s.add(id);
    try { localStorage.setItem(VISTI, JSON.stringify([...s])); } catch (e) { /* archivio non disponibile */ }
    updateProgress();
  }
  function challengeCount(id) {
    const done = EI.loadDone();
    return [...done].filter((k) => k.startsWith(id + ':')).length;
  }
  function updateProgress() {
    const seen = loadSeen();
    const n = chapters.filter((c) => seen.has(c.id)).length;
    const sfide = EI.loadDone().size;
    document.getElementById('progress').textContent = n + '/' + chapters.length + ' capitoli' + (sfide ? ' · ' + sfide + (sfide === 1 ? ' sfida' : ' sfide') : '');
    document.getElementById('progress-bar').style.width = (100 * n / chapters.length) + '%';
    reportToHub(n);
  }
  window.addEventListener('ei:progress', updateProgress);

  // L'hub dell'enciclopedia (sections/index.html) mostra i capitoli letti di ogni sezione:
  // stesso formato di Enciclopedia.progresso, scritto direttamente se questa pagina non carica l'hub.
  function reportToHub(n) {
    const slug = (window.EI_SEZIONE && EI_SEZIONE.slug) || 'elettronica-intermedia';
    if (window.Enciclopedia && Enciclopedia.progresso) { Enciclopedia.progresso(slug, n, chapters.length); return; }
    try {
      const all = JSON.parse(localStorage.getItem('enciclopedia-progressi') || '{}') || {};
      all[slug] = { fatti: n, totale: chapters.length };
      localStorage.setItem('enciclopedia-progressi', JSON.stringify(all));
    } catch (e) { /* archivio non disponibile */ }
  }

  /* ---------- termini del glossario con definizione al passaggio ---------- */

  const tip = h('div', { class: 'ei-tip', role: 'tooltip', id: 'ei-tip' });
  document.body.append(tip);
  let tipFor = null;
  function showTip(a) {
    const g = EI.glossary[a.dataset.term];
    if (!g) return;
    tipFor = a;
    tip.innerHTML = '';
    tip.append(h('strong', null, g.term), h('span', null, g.def));
    a.setAttribute('aria-describedby', 'ei-tip');
    const r = a.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.classList.add('show');
    const tr = tip.getBoundingClientRect();
    const left = EI.clamp(r.left + r.width / 2 - tr.width / 2, 12, window.innerWidth - tr.width - 12);
    const top = r.top - tr.height - 10 > 8 ? r.top - tr.height - 10 : r.bottom + 10;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() {
    if (tipFor) tipFor.removeAttribute('aria-describedby');
    tipFor = null;
    tip.classList.remove('show');
  }
  document.addEventListener('mouseover', (e) => { const a = e.target.closest && e.target.closest('.ei-term'); if (a) showTip(a); });
  document.addEventListener('mouseout', (e) => { const a = e.target.closest && e.target.closest('.ei-term'); if (a) hideTip(); });
  document.addEventListener('focusin', (e) => { const a = e.target.closest && e.target.closest('.ei-term'); if (a) showTip(a); else hideTip(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ---------- utilità ---------- */

  function rich(tag, attrs, str) {
    return h(tag, Object.assign({}, attrs, { html: EI.rich(str) }));
  }
  function reveal(rootEl) {
    const items = rootEl.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || EI.reduced()) {
      items.forEach((i) => i.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach((i) => io.observe(i));
  }
  function figure(f) {
    const box = h('div', { class: 'ei-figure-art' });
    if (f.svg) box.innerHTML = f.svg;
    else if (f.draw) {
      const svg = EI.svg(f.viewBox ? f.viewBox[0] : 480, f.viewBox ? f.viewBox[1] : 300, { role: 'img', 'aria-label': f.alt || f.title || 'Illustrazione' });
      box.append(svg);
      requestAnimationFrame(() => { try { f.draw(svg); } catch (e) { console.error(e); } });
    }
    const svgEl = box.querySelector('svg');
    if (svgEl && !svgEl.getAttribute('role')) {
      svgEl.setAttribute('role', 'img');
      svgEl.setAttribute('aria-label', f.alt || f.title || 'Illustrazione');
    }
    return h('figure', { class: 'ei-figure reveal' },
      f.title ? h('p', { class: 'ei-figure-title' }, f.title) : null,
      box,
      f.caption ? rich('figcaption', null, f.caption) : null);
  }
  function chapterHref(id) { return '#' + id; }

  /* ---------- panoramica ---------- */

  function heroViz() {
    const W = 600;
    const H = 146;
    const svg = EI.svg(W, H, { role: 'img', 'aria-label': 'Dalla presa ai 5 volt: tensione alternata, raddrizzata, livellata e regolata' });
    const SW = 104;
    const SH = 72;
    const GAP = 61.3;
    const top = 26;
    const stages = [
      { title: 'Alternata', sub: '12 V~', color: 'var(--trace-2)', f: (x) => Math.sin(x) },
      { title: 'Raddrizzata', sub: 'ponte di diodi', color: 'var(--trace-3)', f: (x) => Math.abs(Math.sin(x)) },
      { title: 'Livellata', sub: 'ripple ~1 V', color: 'var(--trace-4)', f: (x) => ripple(x) },
      { title: 'Regolata', sub: '5,00 V', color: 'var(--trace-1)', f: () => 0.62 },
    ];
    function ripple(x) {
      const ph = ((x % Math.PI) + Math.PI) % Math.PI; // ogni semiperiodo
      const peak = Math.PI / 2;
      if (ph >= peak && ph < peak + 0.25) return Math.sin(ph);
      const tDis = ph >= peak ? ph - peak : ph + Math.PI - peak;
      const v = 1 - 0.16 * (tDis / Math.PI);
      return Math.max(v, Math.abs(Math.sin(x)));
    }
    stages.forEach((st, i) => {
      const x0 = 8 + i * (SW + GAP);
      const g = EI.s('g', { class: 'hv-scope', transform: 'translate(' + x0 + ',' + top + ')' }, svg);
      EI.s('rect', { class: 'screen', x: 0, y: 0, width: SW, height: SH, rx: 8 }, g);
      for (let k = 1; k < 4; k++) EI.s('path', { class: 'grid', d: 'M' + (k * SW / 4) + ' 4V' + (SH - 4) }, g);
      EI.s('path', { class: 'grid', d: 'M4 ' + SH / 2 + 'H' + (SW - 4) }, g);
      const clipId = 'hv-clip-' + i;
      const cp = EI.s('clipPath', { id: clipId }, svg);
      EI.s('rect', { x: x0 + 2, y: top + 2, width: SW - 4, height: SH - 4, rx: 6 }, cp);
      const holder = EI.s('g', { 'clip-path': 'url(#' + clipId + ')' }, svg);
      const roll = EI.s('g', { class: 'hv-roll' }, holder);
      let d = '';
      const amp = i === 0 ? SH * 0.36 : SH * 0.62;
      const base = i === 0 ? top + SH / 2 : top + SH - 12;
      for (let px = 0; px <= SW + 64; px += 1.5) {
        const v = st.f(px / 60 * 2 * Math.PI);
        d += (px ? 'L' : 'M') + (x0 + px).toFixed(1) + ' ' + (base - v * amp).toFixed(1);
      }
      EI.s('path', { class: 'hv-trace', d: d, style: 'stroke:' + st.color }, roll);
      EI.s('text', { class: 'hv-label', x: x0 + SW / 2, y: top + SH + 22, 'text-anchor': 'middle', text: st.title }, svg);
      EI.s('text', { class: 'hv-sub', x: x0 + SW / 2, y: top + SH + 38, 'text-anchor': 'middle', text: st.sub }, svg);
      if (i < stages.length - 1) {
        const xa = x0 + SW;
        const xb = xa + GAP;
        const ym = top + SH / 2;
        EI.wire(svg, [[xa + 3, ym], [xb - 3, ym]], { cls: 'thin' });
        const sg = EI.s('g', { transform: 'translate(' + (xa + GAP / 2 - 17) + ',' + ym + ') scale(.62)' }, svg);
        if (i === 0) EI.sym.diode(sg, { x: 0, y: 0, len: 56 });
        if (i === 1) EI.sym.capacitor(sg, { x: 4, y: 0, len: 48, polar: true });
        if (i === 2) EI.sym.ic(sg, { x: 6, y: -20, w: 44, h: 40, label: '7805', pins: [] });
      }
    });
    return h('figure', { class: 'ei-hero-viz' }, svg,
      h('figcaption', null, 'Il progetto finale della sezione: dalla tensione alternata ai 5 volt stabili che alimentano un circuito digitale. Ogni passaggio è un capitolo.'));
  }

  function viewHome() {
    const seen = loadSeen();
    const first = chapters.find((c) => !seen.has(c.id)) || chapters[0];
    const hero = h('section', { class: 'ei-hero' },
      h('div', null,
        h('p', { class: 'ei-eyebrow' }, 'Enciclopedia · Sezione 2'),
        h('h1', null, 'Elettronica intermedia'),
        h('p', { class: 'lead' }, 'Dal cristallo di silicio all\'alimentatore da 5 volt: semiconduttori, diodi, LED, transistor, filtri, amplificatori e oscillatori. In ogni capitolo c\'è un laboratorio animato in cui giri le manopole e vedi le cariche muoversi.'),
        h('div', { class: 'ei-hero-actions' },
          h('a', { class: 'btn primary', href: chapterHref(first.id) }, seen.size ? 'Continua: ' + first.title : 'Inizia dal capitolo 1'),
          h('a', { class: 'btn', href: '#storia' }, 'La storia'),
          h('a', { class: 'btn', href: '#glossario' }, 'Glossario'))),
      heroViz());

    const cards = chapters.map((c) => {
      const n = challengeCount(c.id);
      return h('li', null, h('a', { class: 'ei-card' + (c.pending ? ' pending' : ''), href: chapterHref(c.id), 'data-id': c.id },
        h('span', { class: 'ei-card-icon' }, EI.icon(c.icon || 'diode')),
        h('span', { class: 'ei-card-num' }, 'CAPITOLO ' + String(c.number).padStart(2, '0')),
        h('span', { class: 'ei-card-title' }, c.title),
        h('span', { class: 'ei-card-desc' }, c.tagline),
        h('span', { class: 'ei-card-meta' },
          c.pending ? h('span', null, 'In preparazione') : h('span', null, (c.minutes || 10) + ' min'),
          c.period ? h('span', null, c.period) : null,
          seen.has(c.id) ? h('span', { class: 'ok' }, '✓ visto') : null,
          n ? h('span', { class: 'ok' }, n + (n === 1 ? ' sfida' : ' sfide')) : null)));
    });
    const traceSvg = EI.s('svg', { class: 'ei-map-trace', 'aria-hidden': 'true' });
    const map = h('div', { class: 'ei-map' }, traceSvg, h('ol', { class: 'ei-cards' }, cards));

    const page = h('div', { class: 'ei-home' },
      hero,
      h('div', { class: 'ei-map-head reveal' },
        h('h2', { class: 'ei-h2' }, 'Il percorso'),
        h('p', null, 'Nove capitoli in fila, come i componenti su una scheda: la pista si accende man mano che li esplori. Ogni capitolo usa quello che hai visto nei precedenti.')),
      map,
      h('h2', { class: 'ei-h2 reveal' }, 'Prima e dopo'),
      h('div', { class: 'ei-around reveal' },
        h('a', { href: '../elettronica-base/index.html' }, h('small', null, 'Sezione 1 · prima'), h('strong', null, 'Elettronica base'), h('span', null, 'Carica, corrente, legge di Ohm, condensatore e corrente alternata: le basi che qui diamo per note.')),
        h('a', { href: '../elettronica-avanzata/index.html' }, h('small', null, 'Sezione 3 · dopo'), h('strong', null, 'Elettronica avanzata'), h('span', null, 'Quarzo e PLL, radiofrequenza, alimentatori switching ed elettronica di potenza.')),
        h('a', { href: '../porte-logiche/index.html' }, h('small', null, 'Sezione 4 · dopo'), h('strong', null, 'Porte logiche e chip'), h('span', null, 'Il transistor come interruttore: porte, algebra di Boole e circuito integrato.'))));

    const drawTrace = () => drawMapTrace(map, traceSvg, seen);
    requestAnimationFrame(drawTrace);
    let timer = 0;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(drawTrace, 120); };
    window.addEventListener('resize', onResize);
    return { el: page, cleanup: () => window.removeEventListener('resize', onResize) };
  }

  // Pista "a circuito stampato" che collega i capitoli nell'ordine; si illumina fino all'ultimo visto.
  function drawMapTrace(map, svg, seen) {
    if (!map.isConnected) return;
    const box = map.getBoundingClientRect();
    const pts = [...map.querySelectorAll('.ei-card')].map((a) => {
      const r = a.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, top: r.top - box.top, bottom: r.bottom - box.top };
    });
    if (!pts.length) return;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    const vias = [];
    const pathTo = (n) => {
      let d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (Math.abs(a.y - b.y) < 4) d += 'H' + b.x;
        else {
          const ym = (a.bottom + b.top) / 2;
          d += 'V' + ym + 'H' + b.x + 'V' + b.y;
          if (n === pts.length) vias.push([a.x, ym], [b.x, ym]);
        }
      }
      return d;
    };
    const base = EI.s('path', { class: 'base', d: pathTo(pts.length) }, svg);
    let last = -1;
    chapters.forEach((c, i) => { if (seen.has(c.id)) last = Math.max(last, i); });
    if (last > 0) EI.s('path', { class: 'lit', d: pathTo(last + 1) }, svg);
    vias.forEach(([x, y], i) => EI.s('circle', { class: 'via' + (Math.floor(i / 2) < last ? ' lit-via' : ''), cx: x, cy: y, r: 5 }, svg));
    if (!EI.reduced()) {
      const len = base.getTotalLength();
      const pulse = EI.s('path', { class: 'pulse', d: base.getAttribute('d') }, svg);
      pulse.style.strokeDasharray = '26 ' + Math.ceil(len + 40);
      pulse.animate([{ strokeDashoffset: 26 }, { strokeDashoffset: -len }], { duration: Math.max(4000, len * 3.2), iterations: Infinity });
    }
  }

  /* ---------- capitolo ---------- */

  function viewChapter(c) {
    const idx = chapters.indexOf(c);
    const prev = chapters[idx - 1];
    const next = chapters[idx + 1];
    const pager = h('nav', { class: 'pager', 'aria-label': 'Capitoli vicini' },
      prev ? h('a', { href: chapterHref(prev.id), class: 'prev' }, h('small', null, '← capitolo ' + prev.number), prev.title) : h('a', { href: '#', class: 'prev' }, h('small', null, '← sezione'), 'Tutti i capitoli'),
      next ? h('a', { href: chapterHref(next.id), class: 'next' }, h('small', null, 'capitolo ' + next.number + ' →'), next.title) : h('a', { href: '#storia', class: 'next' }, h('small', null, 'e ora →'), 'La storia della sezione'));
    const crumbs = h('nav', { class: 'ei-crumbs', 'aria-label': 'Percorso' },
      h('a', { href: '../index.html' }, 'Enciclopedia'), ' / ', h('a', { href: '#' }, 'Elettronica intermedia'), ' / ', h('span', null, 'Capitolo ' + c.number));
    const head = h('header', { class: 'ei-chapter-head' },
      h('span', { class: 'ei-num', 'aria-hidden': 'true' }, String(c.number).padStart(2, '0')),
      h('p', { class: 'ei-eyebrow' }, 'Capitolo ' + c.number + (c.minutes ? ' · ' + c.minutes + ' minuti' : '') + (c.period ? ' · ' + c.period : '')),
      h('div', null, h('h1', null, c.title), h('p', { class: 'ei-tagline' }, c.tagline)),
      c.summary ? h('div', { class: 'ei-summary' },
        h('div', null, h('span', { class: 'ei-summary-tag' }, 'In breve'), rich('p', null, c.summary)),
        c.keywords && c.keywords.length ? h('div', { class: 'ei-meta', 'aria-label': 'Parole chiave' },
          c.keywords.filter((k) => EI.glossary[k]).map((k) => h('a', { class: 'ei-kchip', href: '#glossario/' + k }, EI.glossary[k].term))) : null) : null);

    if (c.pending) {
      return { el: h('article', { class: 'ei-chapter' }, crumbs, head,
        h('div', { class: 'ei-pending' }, h('p', null, 'Questo capitolo è in preparazione: presto qui troverai il laboratorio, le illustrazioni e la storia.'), h('a', { class: 'btn', href: '#' }, 'Torna ai capitoli')),
        pager) };
    }

    const labHost = h('div', { class: 'ei-lab-host' });
    const blocks = [];
    blocks.push(h('section', { class: 'ei-block', 'aria-labelledby': 'ei-lab-h' },
      h('div', { class: 'ei-lab-intro' }, h('h2', { class: 'ei-h2', id: 'ei-lab-h' }, 'Laboratorio'), c.lab && c.lab.intro ? rich('p', null, c.lab.intro) : null),
      labHost));
    if (c.how || c.figures) {
      blocks.push(h('section', { class: 'ei-block ei-cols' },
        h('div', { class: 'reveal' }, h('h2', { class: 'ei-h2' }, 'Come funziona'),
          h('ol', { class: 'ei-steps' }, (c.how || []).map((x) => rich('li', null, x)))),
        h('div', { class: 'ei-figures' }, (c.figures || []).map(figure))));
    }
    if (c.formulas && c.formulas.length) {
      blocks.push(h('section', { class: 'ei-block reveal' }, h('h2', { class: 'ei-h2' }, c.formulas.length > 1 ? 'Le formule' : 'La formula'),
        h('div', { class: 'ei-formulas' }, c.formulas.map((f) => h('div', { class: 'ei-formula' },
          h('span', { class: 'ei-formula-name' }, f.name),
          h('div', { class: 'ei-formula-expr', html: f.expr }),
          f.legend ? h('dl', null, f.legend.map(([k, v]) => [h('dt', { html: k }), rich('dd', null, v)])) : null,
          f.note ? rich('p', { class: 'ei-formula-note' }, f.note) : null)))));
    }
    if (c.history) {
      blocks.push(h('section', { class: 'ei-block' }, h('h2', { class: 'ei-h2 reveal' }, 'La storia'),
        h('div', { class: 'ei-history' },
          h('div', { class: 'ei-history-text reveal' }, (c.history.text || []).map((p) => rich('p', null, p))),
          h('ol', { class: 'ei-events reveal' }, (c.history.events || []).map((e) => h('li', null,
            h('span', { class: 'ei-ev-year' }, String(e.year)), h('span', { class: 'ei-ev-title' }, e.title),
            e.who ? h('span', { class: 'ei-ev-who' }, e.who) : null,
            e.text ? rich('p', null, e.text) : null))))));
    }
    if (c.fun || c.uses) {
      blocks.push(h('section', { class: 'ei-block ei-duo reveal' },
        c.fun ? h('div', { class: 'ei-callout fun' }, h('h3', null, '✦ Lo sapevi?'), rich('p', null, c.fun)) : null,
        c.uses ? h('div', { class: 'ei-callout' }, h('h3', null, '⌁ Dove lo trovi'), rich('p', null, c.uses)) : null));
    }
    if (c.links && c.links.length) {
      blocks.push(h('section', { class: 'ei-block reveal' }, h('h2', { class: 'ei-h2' }, 'Collegamenti'),
        h('ul', { class: 'ei-links' }, c.links.map((l) => h('li', null, h('a', { class: 'ei-link', href: l.href }, h('small', null, l.section || 'Questa sezione'), h('span', null, l.title)))))));
    }
    blocks.push(h('section', { class: 'ei-block ei-quiz-cta reveal' },
      h('div', null, h('h2', null, 'Mettiti alla prova'), h('p', null, 'Domande sul capitolo "' + c.title + '" nel quiz dell\'enciclopedia.')),
      h('a', { class: 'btn primary', href: QUIZ + '/' + c.id }, 'Vai al quiz')));

    const page = h('article', { class: 'ei-chapter' }, crumbs, head, blocks, pager);
    const state = { lab: null };
    requestAnimationFrame(() => {
      if (!labHost.isConnected || !c.lab) return;
      try {
        const lab = EI.lab(labHost, { title: c.lab.title, chapter: c.id, layout: c.lab.layout, viewBox: c.lab.viewBox, svgLabel: c.lab.svgLabel });
        state.lab = lab;
        c.lab.mount(lab);
        lab.invalidate();
      } catch (e) {
        console.error(e);
        labHost.innerHTML = '';
        labHost.append(h('div', { class: 'ei-lab-error', role: 'alert' }, 'Il laboratorio non è riuscito a partire. Ricarica la pagina; se il problema resta, prova un altro browser.'));
      }
    });
    markSeen(c.id);
    return { el: page, cleanup: () => { if (state.lab) state.lab.destroy(); } };
  }

  /* ---------- storia ---------- */

  function viewHistory() {
    const events = (EI.timeline || []).map((e) => Object.assign({}, e))
      .concat(chapters.flatMap((c) => ((c.history && c.history.events) || []).map((e) => Object.assign({ chapter: c.id }, e))))
      .sort((a, b) => a.year - b.year || String(a.title).localeCompare(String(b.title), 'it'));
    const eras = EI.eras && EI.eras.length ? EI.eras : [{ from: 0, to: 9999, title: 'Cronologia', text: '' }];
    const demo = h('div', { class: 'ei-demo' });
    const page = h('div', { class: 'ei-history-page' },
      h('header', { class: 'page-head' },
        h('p', { class: 'ei-eyebrow' }, 'Elettronica intermedia · Storia'),
        h('h1', null, 'Dal cristallo al circuito integrato'),
        h('p', { class: 'lead' }, EI.historyLead || 'Un secolo di idee: il raddrizzatore a cristallo, la valvola, il transistor, gli amplificatori e i regolatori integrati. Ogni tappa porta al capitolo dove la provi in laboratorio.')),
      demo,
      h('div', { class: 'ei-eras' }, eras.map((era) => {
        const list = events.filter((e) => e.year >= era.from && e.year <= era.to);
        if (!list.length) return null;
        return h('section', { class: 'ei-era reveal' },
          h('div', { class: 'ei-era-head' }, h('span', { class: 'ei-era-years' }, era.label || (era.from + '–' + (era.to > 2100 ? 'oggi' : era.to))), h('h2', null, era.title), era.text ? rich('p', null, era.text) : null),
          h('ol', { class: 'timeline' }, list.map((e) => {
            const c = e.chapter && byId[e.chapter];
            return h('li', { class: 'event' + (c ? '' : ' root'), style: '--cat:var(--ei)' },
              h('span', { class: 'event-year' }, String(e.year)),
              h('div', { class: 'event-body' },
                h('h3', null, e.title), ' ',
                c ? h('a', { class: 'chip', href: chapterHref(c.id), style: '--cat:var(--ei)' }, c.number + ' · ' + c.title) : null,
                e.who ? h('span', { class: 'ei-ev-who' }, e.who) : null,
                e.text ? rich('p', null, e.text) : null));
          })));
      })));
    const state = {};
    if (EI.historyDemo) {
      requestAnimationFrame(() => {
        if (!demo.isConnected) return;
        try { state.lab = EI.historyDemo(demo); } catch (e) { console.error(e); }
      });
    }
    return { el: page, cleanup: () => { if (state.lab && state.lab.destroy) state.lab.destroy(); } };
  }

  /* ---------- glossario ---------- */

  function viewGlossary(target) {
    const items = Object.keys(EI.glossary).map((id) => Object.assign({ id: id }, EI.glossary[id]))
      .sort((a, b) => a.term.localeCompare(b.term, 'it', { sensitivity: 'base' }));
    const list = h('dl', { class: 'ei-gloss' });
    const count = h('span', { class: 'ei-gloss-count', 'aria-live': 'polite' });
    const letters = h('nav', { class: 'ei-letters', 'aria-label': 'Iniziali' });
    const input = h('input', { class: 'ei-search', type: 'search', placeholder: 'Cerca un termine (per esempio lacuna, soglia, ripple)', 'aria-label': 'Cerca nel glossario' });
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    function draw(q) {
      list.innerHTML = '';
      letters.innerHTML = '';
      const nq = norm(q || '');
      const shown = items.filter((g) => !nq || norm(g.term + ' ' + g.def).includes(nq));
      count.textContent = shown.length + (shown.length === 1 ? ' termine' : ' termini');
      if (!shown.length) {
        list.append(h('div', { class: 'ei-empty' }, 'Nessun termine trovato. Prova con una parola più corta o controlla l\'ortografia.'));
        return;
      }
      let letter = '';
      for (const g of shown) {
        const L = norm(g.term).charAt(0).toUpperCase();
        if (L !== letter) {
          letter = L;
          list.append(h('div', { class: 'ei-gloss-letter', id: 'gl-' + L }, L));
          letters.append(h('a', { href: '#glossario/' + 'lettera-' + L, onclick: (e) => { e.preventDefault(); document.getElementById('gl-' + L).scrollIntoView({ behavior: EI.reduced() ? 'auto' : 'smooth' }); } }, L));
        }
        const ch = g.chapter && byId[g.chapter];
        list.append(h('div', { class: 'ei-gloss-item' + (g.id === target ? ' target' : ''), id: 'g-' + g.id },
          h('dt', null, g.term),
          h('dd', null, g.def, ch ? h('br') : null, ch ? h('a', { class: 'from', href: chapterHref(ch.id) }, '→ Capitolo ' + ch.number + ': ' + ch.title) : null)));
      }
    }
    input.addEventListener('input', () => draw(input.value));
    draw('');
    if (target) {
      requestAnimationFrame(() => {
        const el = document.getElementById('g-' + target);
        if (el) el.scrollIntoView({ block: 'center' });
      });
    }
    return { el: h('div', { class: 'ei-glossary-page' },
      h('header', { class: 'page-head' },
        h('p', { class: 'ei-eyebrow' }, 'Elettronica intermedia · Glossario'),
        h('h1', null, 'Glossario'),
        h('p', { class: 'lead' }, 'Le parole dei semiconduttori e dei circuiti analogici, spiegate in due righe. Nei testi le trovi sottolineate: passaci sopra per leggere la definizione.')),
      h('div', { class: 'ei-gloss-tools' }, input, count),
      letters,
      list) };
  }

  function viewNotFound() {
    return { el: h('div', { class: 'page-head' }, h('h1', null, 'Pagina non trovata'), h('p', null, 'Questo indirizzo non corrisponde a nessun capitolo. ', h('a', { href: '#' }, 'Torna ai capitoli'))) };
  }

  /* ---------- router ---------- */

  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (hash === 'main') return;
    hideTip();
    if (current && current.cleanup) current.cleanup();
    current = null;
    let view;
    let nav = 'home';
    if (!hash) view = viewHome();
    else if (hash === 'storia') { view = viewHistory(); nav = 'storia'; }
    else if (hash === 'glossario' || hash.startsWith('glossario/')) { view = viewGlossary(hash.split('/')[1]); nav = 'glossario'; }
    else if (byId[hash]) view = viewChapter(byId[hash]);
    else view = viewNotFound();
    document.querySelectorAll('.topnav a[data-nav]').forEach((a) => {
      if (a.dataset.nav === nav && (nav !== 'home' || !hash)) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    main.innerHTML = '';
    view.el.classList.add('ei-enter');
    main.append(view.el);
    current = view;
    reveal(main);
    const title = view.el.querySelector('h1');
    document.title = (title && hash ? title.textContent + ' · ' : '') + 'Elettronica intermedia · Enciclopedia BusLab';
    if (!hash.startsWith('glossario/')) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  document.querySelector('.skip').addEventListener('click', (e) => { e.preventDefault(); main.focus(); });
  window.addEventListener('hashchange', route);
  updateProgress();
  route();
})();
