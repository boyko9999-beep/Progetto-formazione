/*
 * Pagina dei quiz: l'elenco delle banche con record e medaglie, il quiz di
 * una sezione o di un capitolo, l'esame finale, la sfida a tempo e il ripasso
 * degli errori. Indirizzi, dopo il #:
 *   <sezione>              10 domande della sezione, dalle più facili
 *   <sezione>/<capitolo>   fino a 6 domande del capitolo (se non ce ne sono, tutta la sezione)
 *   esame · tempo · errori
 * I risultati restano solo in questo browser (localStorage).
 */
(function (root) {
  'use strict';

  const Core = root.QuizCore;
  const Engine = root.QuizEngine;
  const main = document.getElementById('main');
  if (!Core || !Engine || !main) return;

  const STORE = 'enciclopedia-quiz-v1';
  const COUNT = { section: 10, chapter: 6, exam: 24, time: 15, review: 12 };
  const SECONDS = 25;
  // Nella sfida a tempo solo domande che si risolvono in pochi secondi.
  const QUICK = ['choice', 'truefalse', 'bits'];
  const MEDAL = { oro: 'medaglia d\'oro', argento: 'medaglia d\'argento', bronzo: 'medaglia di bronzo' };
  const RANK = { bronzo: 1, argento: 2, oro: 3 };
  const SHORT = {
    'elettronica-base': 'Elettronica base',
    'elettronica-intermedia': 'Elettronica intermedia',
    'elettronica-avanzata': 'Elettronica avanzata',
    'porte-logiche': 'Porte logiche',
    'chip-programmabili': 'Chip programmabili',
    'storia-pc': 'Storia dei PC',
    programmazione: 'Programmazione',
    bus: 'BusLab',
  };
  const MODE_ICON = {
    exam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.6 9 2.6 12 0v-5"/><path d="M22 9v6"/></svg>',
    time: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="8"/><path d="M12 9.5v4l2.6 2.6M9.5 2.5h5M12 2.5v3"/></svg>',
    review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v4.5h4.5"/><path d="M9 12.5l2 2 4-4.5"/></svg>',
  };

  const banks = root.QuizBank ? root.QuizBank.list().filter((b) => b.questions.length) : [];
  const bySlug = {};
  const byId = new Map();
  banks.forEach((b) => {
    bySlug[b.slug] = b;
    b.questions.forEach((q) => byId.set(q.id, q));
  });

  /* ---------- risultati salvati ---------- */

  function blank() {
    return { best: {}, medals: {}, wrong: [], seen: [], runs: 0, answered: 0, right: 0, points: 0, streak: 0, sound: false };
  }

  function load() {
    const s = blank();
    try {
      const v = JSON.parse(root.localStorage.getItem(STORE) || '{}');
      for (const k in s) {
        if (v && v[k] != null && typeof v[k] === typeof s[k] && Array.isArray(v[k]) === Array.isArray(s[k])) s[k] = v[k];
      }
    } catch (e) { /* archiviazione non disponibile: si riparte da zero */ }
    return s;
  }

  function save() {
    try { root.localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) { /* archiviazione non disponibile */ }
  }

  let store = load();
  Engine.Sound.on = store.sound;

  function record(q, ok) {
    store.answered++;
    if (ok) store.right++;
    if (!store.seen.includes(q.id)) {
      store.seen.push(q.id);
      if (store.seen.length > 2000) store.seen.splice(0, store.seen.length - 2000);
    }
    const at = store.wrong.indexOf(q.id);
    if (ok && at >= 0) store.wrong.splice(at, 1);
    if (!ok && at < 0) store.wrong.push(q.id);
    save();
  }

  const seenSet = () => new Set(store.seen);
  const medalCount = () => banks.filter((b) => store.medals[b.slug]).length;
  const wrongList = () => store.wrong.map((id) => byId.get(id)).filter(Boolean);
  const mastery = () => (banks.length ? banks.reduce((t, b) => t + (store.best[b.slug] || 0), 0) / banks.length / 100 : 0);

  function updateTopbar() {
    const m = medalCount();
    const label = document.getElementById('qz-prog');
    const bar = document.getElementById('progress-bar');
    if (label) label.textContent = m + '/' + banks.length + ' medaglie';
    if (bar) bar.style.width = (banks.length ? 100 * m / banks.length : 0) + '%';
    // L'hub dell'enciclopedia mostra quante medaglie hai preso.
    const E = root.Enciclopedia;
    if (E && E.progresso && store.runs) E.progresso('quiz', m, banks.length);
  }

  /* ---------- elementi ---------- */

  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style') for (const p in v) n.style.setProperty(p, v[p]);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) n.append(c);
    return n;
  }

  const colorOf = (slug) => 'var(--qz-c-' + slug + ', var(--accent))';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const notice = (text) => h('p', { class: 'qz-notice', role: 'status' }, text);

  // Il capitolo da rileggere dopo un errore: la pagina della sezione o la lezione di BusLab.
  function learnLink(q) {
    if (q.section === 'bus') {
      const data = root.BusData;
      const m = /^bus-([a-z0-9]+)-\d+$/.exec(q.id || '');
      const bus = data && data.BUSES.find((b) => (m && b.id === m[1]) || b.name === q.topic);
      return bus ? { href: '../../index.html#/bus/' + bus.id, text: 'Ripassa la lezione di BusLab: ' + bus.name } : null;
    }
    const bank = bySlug[q.section];
    const ch = bank && (bank.chapters || []).find((c) => c.id === q.chapter);
    if (!ch) return null;
    return { href: '../' + q.section + '/index.html#' + encodeURIComponent(ch.id), text: 'Rileggi il capitolo «' + ch.title + '»' };
  }

  /* ---------- una sessione ---------- */

  let session = null;
  let last = '';

  function stop() {
    if (session) session.destroy();
    session = null;
  }

  function crumbs(parts) {
    const nav = h('nav', { class: 'qz-crumbs', 'aria-label': 'Percorso' }, h('a', { href: '#' }, 'Tutti i quiz'));
    parts.forEach((p, i) => {
      const end = i === parts.length - 1;
      nav.append(' / ', p.href && !end ? h('a', { href: p.href }, p.text) : h('span', end ? { 'aria-current': 'page' } : null, p.text));
    });
    return nav;
  }

  function run(cfg) {
    stop();
    main.innerHTML = '';
    const host = h('div');
    main.append(crumbs(cfg.crumbs));
    if (cfg.notice) main.append(notice(cfg.notice));
    main.append(host);
    document.title = cfg.title + ' · Quiz · Enciclopedia';
    root.scrollTo(0, 0);
    session = Engine.mount(host, {
      questions: cfg.questions,
      title: cfg.title,
      subtitle: cfg.subtitle,
      color: cfg.color,
      seconds: cfg.seconds || 0,
      sectionOf: cfg.mixed ? (q) => SHORT[q.section] || q.section : null,
      learn: learnLink,
      onAnswer: record,
      onFinish: (res) => finish(cfg, res),
      onRetry: () => open(last),
      onExit: () => goHome(),
      exitLabel: 'Tutti i quiz',
      onSound: (on) => { store.sound = on; save(); },
    });
  }

  function finish(cfg, res) {
    store.runs++;
    store.streak = Math.max(store.streak, res.bestStreak);
    const pct = Math.round(res.pct * 100);
    const notes = [];
    if (cfg.kind === 'time') {
      if (res.points > store.points) {
        notes.push(store.points ? 'Nuovo record: ' + res.points + ' punti (prima erano ' + store.points + ').' : 'Il tuo primo record: ' + res.points + ' punti.');
        store.points = res.points;
      } else notes.push('Il record da battere è ' + store.points + ' punti.');
    } else if (cfg.kind === 'review') {
      const left = wrongList().length;
      notes.push(left ? 'Restano ' + plural(left, 'domanda', 'domande') + ' da ripassare.' : 'Hai sistemato tutti gli errori.');
    } else {
      const prev = store.best[cfg.key];
      if (prev == null || pct > prev) {
        store.best[cfg.key] = pct;
        if (prev != null) notes.push('Nuovo record: ' + pct + '% (prima ' + prev + '%).');
      } else notes.push('Il tuo record qui è ' + prev + '%.');
      const old = store.medals[cfg.key];
      if ((cfg.kind === 'section' || cfg.kind === 'exam') && res.medal && (!old || RANK[res.medal] > RANK[old])) {
        store.medals[cfg.key] = res.medal;
        notes.unshift('Hai conquistato la ' + MEDAL[res.medal] + '!');
      }
    }
    save();
    updateTopbar();

    const actions = [];
    if (cfg.kind !== 'review' && res.wrongIds.length) actions.push(h('a', { class: 'btn', href: '#errori' }, 'Ripassa gli errori'));
    if (cfg.kind === 'chapter') actions.push(h('a', { class: 'btn', href: '#' + cfg.bank.slug }, 'Quiz di tutta la sezione'));
    if (cfg.kind === 'section') {
      const next = banks[banks.indexOf(cfg.bank) + 1];
      if (next) actions.push(h('a', { class: 'btn', href: '#' + next.slug }, 'Prossima: ' + (SHORT[next.slug] || next.title)));
    }
    return { note: notes.join(' '), actions: actions };
  }

  function startSection(bank, chapterId) {
    let chapter = chapterId ? (bank.chapters || []).find((c) => c.id === chapterId) : null;
    let pool = chapter ? bank.questions.filter((q) => q.chapter === chapter.id) : [];
    let note = '';
    if (chapterId && !pool.length) {
      note = 'Questo capitolo non ha ancora domande sue: ecco il quiz di tutta la sezione.';
      chapter = null;
    }
    if (!chapter) pool = bank.questions;
    const parts = [{ text: bank.title, href: '#' + bank.slug }];
    if (chapter) parts.push({ text: chapter.title });
    run({
      kind: chapter ? 'chapter' : 'section',
      key: chapter ? bank.slug + '/' + chapter.id : bank.slug,
      bank: bank,
      title: chapter ? chapter.title : bank.title,
      subtitle: chapter ? bank.title : bank.slug === 'bus' ? 'BusLab' : 'Sezione ' + bank.number,
      color: colorOf(bank.slug),
      questions: Core.pick(pool, chapter ? COUNT.chapter : COUNT.section, Math.random, { seen: seenSet() }),
      crumbs: parts,
      notice: note,
    });
  }

  function startExam() {
    run({
      kind: 'exam', key: 'esame', mixed: true,
      title: 'Esame finale', subtitle: 'Tutte le sezioni', color: colorOf('mix'),
      questions: Core.pickMixed(banks, COUNT.exam, Math.random, { seen: seenSet() }),
      crumbs: [{ text: 'Esame finale' }],
    });
  }

  function startTime() {
    const quick = banks
      .map((b) => ({ slug: b.slug, questions: b.questions.filter((q) => QUICK.includes(q.type || 'choice')) }))
      .filter((b) => b.questions.length);
    run({
      kind: 'time', key: 'tempo', mixed: true, seconds: SECONDS,
      title: 'Sfida a tempo', subtitle: SECONDS + ' secondi a domanda', color: colorOf('mix'),
      questions: Core.pickMixed(quick, COUNT.time, Math.random, { seen: seenSet() }),
      crumbs: [{ text: 'Sfida a tempo' }],
    });
  }

  function startReview() {
    const list = wrongList();
    if (!list.length) return home('Non hai errori da ripassare: quando sbagli una domanda, la ritrovi qui.', true);
    run({
      kind: 'review', key: 'errori', mixed: true,
      title: 'Ripasso degli errori', subtitle: plural(list.length, 'domanda da rifare', 'domande da rifare'), color: colorOf('mix'),
      questions: Core.pick(list, COUNT.review, Math.random),
      crumbs: [{ text: 'Ripasso degli errori' }],
    });
  }

  /* ---------- pagina iniziale ---------- */

  function ring(best) {
    const has = best != null;
    return h('span', { class: 'qz-ring' + (has ? '' : ' empty'), style: { '--qz-p': has ? best / 100 : 0 }, role: 'img', 'aria-label': has ? 'Record ' + best + '%' : 'Non ancora provato' },
      h('span', { 'aria-hidden': 'true' }, has ? best + '%' : '–'));
  }

  function chapterList(b, chapters) {
    return h('details', { class: 'qz-chapters' },
      h('summary', null, plural(chapters.length, 'capitolo', 'capitoli')),
      h('ul', null, chapters.map((c) => {
        const best = store.best[b.slug + '/' + c.id];
        const done = best >= 75;
        return h('li', null, h('a', { href: '#' + b.slug + '/' + c.id, class: done ? 'done' : null, title: best != null ? 'Record ' + best + '%' : null },
          c.title, done ? h('span', { class: 'qz-sr' }, ', superato') : null));
      })));
  }

  function card(b, i) {
    const best = store.best[b.slug];
    const medal = store.medals[b.slug];
    const chapters = (b.chapters || []).filter((c) => b.questions.some((q) => q.chapter === c.id));
    return h('li', { style: { '--i': i } },
      h('article', { class: 'qz-sec', style: { '--sec': colorOf(b.slug) } },
        h('div', { class: 'qz-sec-top' },
          h('span', { class: 'qz-sec-num' }, b.slug === 'bus' ? 'BUSLAB' : 'SEZIONE ' + String(b.number).padStart(2, '0')),
          h('span', { class: 'qz-sec-score' },
            medal ? h('span', { class: 'qz-minimedal ' + medal, role: 'img', 'aria-label': MEDAL[medal] }) : null,
            ring(best))),
        h('h3', null, b.title),
        h('p', null, b.subtitle || ''),
        h('div', { class: 'qz-sec-bottom' },
          chapters.length ? chapterList(b, chapters) : null,
          h('div', { class: 'qz-sec-foot' },
            h('span', { class: 'qz-sec-meta' }, b.questions.length + ' domande'),
            h('a', { class: 'btn primary', href: '#' + b.slug, 'aria-label': (best == null ? 'Inizia' : 'Riprova') + ' il quiz: ' + b.title }, best == null ? 'Inizia' : 'Riprova')))));
  }

  function mode(i, href, ic, title, text, rec) {
    return h('li', { style: { '--i': i } },
      h('a', { class: 'qz-mode', href: href, 'aria-disabled': href ? null : 'true' },
        h('span', { class: 'qz-mode-ic', html: MODE_ICON[ic] }),
        h('strong', null, title),
        h('span', null, text),
        rec ? h('span', { class: 'qz-mode-rec' }, rec) : null));
  }

  const stat = (n, label) => h('span', null, h('b', null, String(n)), ' ' + label);

  function home(message, moveFocus) {
    stop();
    document.title = 'Quiz · Enciclopedia';
    main.innerHTML = '';
    const total = banks.reduce((t, b) => t + b.questions.length, 0);
    const medals = medalCount();
    const todo = banks.find((b) => !store.medals[b.slug]);
    const g = Engine.gauge({ label: 'PADRONANZA' });
    const wrongN = wrongList().length;
    const exam = store.best.esame;

    if (message) main.append(notice(message));
    main.append(
      h('section', { class: 'qz-hero', 'aria-labelledby': 'qz-title' },
        h('div', null,
          h('p', { class: 'eyebrow' }, 'Sezione 8 · Quiz'),
          h('h1', { id: 'qz-title' }, 'Mettiti alla prova'),
          h('p', { class: 'lead' }, total + ' domande su tutta l\'enciclopedia: circuiti da far funzionare, resistenze da leggere, tabelle di verità da completare, invenzioni da rimettere in ordine. Ogni sezione ha la sua medaglia.'),
          h('div', { class: 'qz-hero-actions' },
            todo
              ? h('a', { class: 'btn primary', href: '#' + todo.slug }, (store.runs ? 'Continua con ' : 'Comincia da ') + (SHORT[todo.slug] || todo.title))
              : h('a', { class: 'btn primary', href: '#esame' }, 'Esame finale'),
            h('a', { class: 'btn', href: todo ? '#esame' : '#tempo' }, todo ? 'Esame finale' : 'Sfida a tempo'))),
        h('figure', { class: 'qz-hero-meter' },
          g.el,
          h('p', { class: 'qz-hero-stats' }, stat(medals, medals === 1 ? 'medaglia' : 'medaglie'), stat(store.right, 'risposte giuste'), stat(store.streak, 'di fila al massimo')),
          h('figcaption', null, 'La padronanza è la media dei tuoi record nelle ' + banks.length + ' banche di domande.'))),
      h('section', { 'aria-labelledby': 'qz-sez' },
        h('div', { class: 'qz-block-title' },
          h('h2', { id: 'qz-sez' }, 'Quiz per sezione'),
          h('p', null, COUNT.section + ' domande a caso, dalle più facili alle più difficili. Apri i capitoli per un ripasso mirato.')),
        h('ol', { class: 'qz-sections' }, banks.map(card))),
      h('section', { 'aria-labelledby': 'qz-sfide' },
        h('div', { class: 'qz-block-title' },
          h('h2', { id: 'qz-sfide' }, 'Altre sfide'),
          h('p', null, 'Domande da tutte le sezioni insieme.')),
        h('ul', { class: 'qz-modes' },
          mode(0, '#esame', 'exam', 'Esame finale', COUNT.exam + ' domande da tutte le sezioni, in ordine di difficoltà.',
            exam != null ? 'Record: ' + exam + '%' + (store.medals.esame ? ' · ' + MEDAL[store.medals.esame] : '') : null),
          mode(1, '#tempo', 'time', 'Sfida a tempo', COUNT.time + ' domande, ' + SECONDS + ' secondi ciascuna: più sei veloce, più punti fai.',
            store.points ? 'Record: ' + store.points + ' punti' : null),
          mode(2, wrongN ? '#errori' : null, 'review', 'Ripasso degli errori',
            wrongN ? 'Le ' + plural(wrongN, 'domanda che hai sbagliato', 'domande che hai sbagliato') + ', finché non le indovini.' : 'Qui ritrovi le domande che sbagli. Per ora nessuna.', null))));
    if (store.runs || store.answered) {
      main.append(h('p', { class: 'qz-reset-row' }, h('button', {
        type: 'button', class: 'qz-reset',
        onclick: () => {
          if (!root.confirm('Vuoi cancellare record, medaglie ed errori salvati in questo browser?')) return;
          const sound = store.sound;
          store = blank();
          store.sound = sound;
          save();
          if (root.Enciclopedia && root.Enciclopedia.progresso) root.Enciclopedia.progresso('quiz', 0, banks.length);
          updateTopbar();
          home('Risultati azzerati.', true);
        },
      }, 'Azzera i miei risultati')));
    }
    if (moveFocus) {
      root.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    const m = mastery();
    if (m > 0) setTimeout(() => g.set(m, true), 350);
    else g.set(0, false);
  }

  function goHome() {
    if (location.hash && location.hash !== '#') location.hash = '';
    else home(null, true);
  }

  /* ---------- indirizzi ---------- */

  function open(hash) {
    const raw = hash.replace(/^#\/?/, '');
    let parts;
    try { parts = decodeURIComponent(raw).split('/'); } catch (e) { parts = raw.split('/'); }
    const a = parts[0];
    if (!a) return home(null, !!session);
    if (a === 'esame') return startExam();
    if (a === 'tempo') return startTime();
    if (a === 'errori') return startReview();
    if (bySlug[a]) return startSection(bySlug[a], parts[1]);
    return home('Il quiz «' + a + '» non c\'è (ancora): scegline uno qui sotto.', true);
  }

  function route(first) {
    // "#main" è il link "Vai al contenuto": sposta solo il fuoco, la pagina resta com'è.
    if (location.hash === '#main' && first !== true) return;
    last = location.hash === '#main' ? '' : location.hash;
    open(last);
  }

  root.addEventListener('hashchange', route);
  root.addEventListener('pageshow', (e) => {
    if (e.persisted && !session) { store = load(); route(true); }
  });
  updateTopbar();
  if (!banks.length) {
    main.append(notice('Le domande non si sono caricate: prova a ricaricare la pagina.'));
    return;
  }
  route(true);
})(typeof window !== 'undefined' ? window : globalThis);
