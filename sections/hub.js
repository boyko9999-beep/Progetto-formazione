/*
 * Hub dell'enciclopedia: carica il section.js di ogni sezione e disegna
 * il percorso in otto tappe e le schede. Le sezioni non ancora pronte
 * restano visibili come "in preparazione".
 */
(function () {
  'use strict';

  const E = window.Enciclopedia;
  const evo = document.getElementById('evo');
  const grid = document.getElementById('sezioni');

  // Icone 24×24 a tratto, una per sezione.
  const ICONE = {
    'elettronica-base': '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    'elettronica-intermedia': '<circle cx="12" cy="12" r="9"/><path d="M4 12h5M9 7v10M9 10l6-4V3M9 14l6 4v3"/><path d="m12.6 17.6 2.4.4-.9-2.2"/>',
    'elettronica-avanzata': '<path d="M12 21v-9"/><circle cx="12" cy="10" r="2"/><path d="M8.5 6.5a5 5 0 0 0 0 7M15.5 6.5a5 5 0 0 1 0 7M5.5 3.5a9 9 0 0 0 0 13M18.5 3.5a9 9 0 0 1 0 13"/>',
    'porte-logiche': '<path d="M5 6h6a6 6 0 0 1 0 12H5z"/><path d="M1.5 9H5M1.5 15H5M17 12h5.5"/>',
    'chip-programmabili': '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 2.5V6M12 2.5V6M15 2.5V6M9 18v3.5M12 18v3.5M15 18v3.5M2.5 9H6M2.5 12H6M2.5 15H6M18 9h3.5M18 12h3.5M18 15h3.5"/>',
    'storia-pc': '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    programmazione: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.3-2.5 3.8M12 17.2v.1"/>',
  };
  const ICONA_GENERICA = '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>';

  const NOMI_BREVI = {
    'elettronica-base': 'Elettronica base',
    'elettronica-intermedia': 'Elettronica intermedia',
    'elettronica-avanzata': 'Elettronica avanzata',
    'porte-logiche': 'Porte logiche',
    'chip-programmabili': 'Chip programmabili',
    'storia-pc': 'Storia dei PC',
    programmazione: 'Programmazione',
    quiz: 'Quiz',
  };

  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    for (const c of children.flat()) if (c != null && c !== false) n.append(c);
    return n;
  }

  function icona(slug) {
    const span = h('span', { class: 'evo-ico', 'aria-hidden': 'true' });
    span.innerHTML = '<svg viewBox="0 0 24 24">' + (ICONE[slug] || ICONA_GENERICA) + '</svg>';
    return span;
  }

  function due(n) {
    return String(n).padStart(2, '0');
  }

  function carica(slug) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = slug + '/section.js';
      s.onload = () => resolve(true);
      s.onerror = () => { s.remove(); resolve(false); };
      document.head.appendChild(s);
    });
  }

  function disegnaPercorso(sezioni) {
    evo.innerHTML = '';
    sezioni.forEach((s) => {
      const nome = NOMI_BREVI[s.slug] || s.titolo;
      const testo = [icona(s.slug), h('span', { class: 'evo-anno' }, due(s.numero)), h('span', { class: 'evo-nome' }, nome)];
      evo.append(h('li', { style: '--c:' + s.colore },
        s.pronta
          ? h('a', { href: E.link(s.slug), 'aria-label': 'Sezione ' + s.numero + ': ' + s.titolo }, testo)
          : h('span', { class: 'evo-attesa', title: 'In preparazione' }, testo)));
    });
  }

  function scheda(s, quiz, prog) {
    const id = 'sez-' + s.slug;
    if (!s.pronta) {
      return h('li', { id: id },
        h('article', { class: 'enc-card attesa', style: '--c:' + s.colore },
          h('div', { class: 'enc-card-top' }, h('span', { class: 'enc-num', 'aria-hidden': 'true' }, due(s.numero)), h('span', { class: 'enc-stato' }, 'In preparazione')),
          h('div', null, h('h3', null, s.titolo), s.sottotitolo ? h('p', { class: 'enc-sotto' }, s.sottotitolo) : null)));
    }
    const caps = s.capitoli || [];
    const mostrati = caps.slice(0, 5);
    const lista = caps.length
      ? h('ul', { class: 'enc-capitoli', 'aria-label': 'Capitoli' },
        mostrati.map((c) => h('li', null, c.titolo)),
        caps.length > mostrati.length ? h('li', { class: 'altri' }, 'e altri ' + (caps.length - mostrati.length) + ' capitoli') : null)
      : h('span');
    const p = prog[s.slug];
    const barra = p ? h('div', { class: 'enc-barra' },
      h('span', { class: 'enc-barra-track', 'aria-hidden': 'true' }, h('span', { style: 'width:' + Math.round(100 * p.fatti / p.totale) + '%' })),
      h('span', null, p.fatti + ' di ' + p.totale + ' completati')) : null;
    const nDomande = quiz && quiz.domande && quiz.domande[s.slug];
    const azioni = h('div', { class: 'enc-azioni' },
      h('a', { class: 'btn primary', href: E.link(s.slug), 'aria-label': 'Apri la sezione ' + s.titolo }, s.slug === 'quiz' ? 'Inizia' : 'Apri'),
      quiz && s.slug !== 'quiz'
        ? h('a', { class: 'btn', href: 'quiz/index.html#' + encodeURIComponent(s.slug), 'aria-label': 'Quiz della sezione ' + s.titolo }, nDomande ? 'Quiz · ' + nDomande + ' domande' : 'Mettiti alla prova')
        : null);
    return h('li', { id: id },
      h('article', { class: 'enc-card', style: '--c:' + s.colore },
        h('div', { class: 'enc-card-top' },
          h('span', { class: 'enc-num', 'aria-hidden': 'true' }, due(s.numero)),
          s.periodo ? h('span', { class: 'enc-periodo' }, s.periodo) : null),
        h('div', null,
          h('h3', null, h('a', { href: E.link(s.slug) }, s.titolo)),
          s.sottotitolo ? h('p', { class: 'enc-sotto' }, s.sottotitolo) : null),
        lista,
        h('div', { class: 'enc-card-foot' }, barra, azioni)));
  }

  function disegnaSchede(sezioni) {
    const quiz = E.get('quiz');
    const prog = E.progressi();
    grid.innerHTML = '';
    sezioni.forEach((s) => grid.append(scheda(s, quiz, prog)));
    grid.removeAttribute('aria-busy');
  }

  function disegnaPercorsoUtente(sezioni) {
    const prog = E.progressi();
    let fatti = 0;
    let totale = 0;
    sezioni.forEach((s) => {
      const p = prog[s.slug];
      if (s.pronta && p) { fatti += p.fatti; totale += p.totale; }
    });
    const box = document.getElementById('percorso');
    if (!totale) { box.hidden = true; return; }
    box.hidden = false;
    document.getElementById('percorso-testo').textContent = 'Il tuo percorso: ' + fatti + '/' + totale;
    document.getElementById('progress-bar').style.width = (100 * fatti / totale) + '%';
  }

  function disegnaScheletro() {
    grid.innerHTML = '';
    E.PREVISTE.forEach(() => grid.append(h('li', { 'aria-hidden': 'true' }, h('div', { class: 'enc-card scheletro' }))));
    disegnaPercorso(E.sezioni());
  }

  function disegna() {
    const sezioni = E.sezioni();
    disegnaPercorso(sezioni);
    disegnaSchede(sezioni);
    disegnaPercorsoUtente(sezioni);
  }

  disegnaScheletro();
  Promise.all(E.PREVISTE.map((p) => carica(p.slug))).then(disegna);
  // Tornando indietro dalla pagina di una sezione i progressi potrebbero essere cambiati.
  window.addEventListener('pageshow', (e) => { if (e.persisted) disegna(); });
})();
