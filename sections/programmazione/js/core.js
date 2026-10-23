/*
 * Storia della programmazione: motore della sezione.
 *
 * I file della sezione si registrano qui e poi avvia() disegna la pagina:
 *   ProgStoria.capitolo({...})     contenuti di un'epoca (js/capitoli/)
 *   ProgStoria.lab(id, {...})      laboratorio interattivo (js/lab/)
 *   ProgStoria.figura(id, {...})   illustrazione SVG (js/figure/)
 *   ProgStoria.schermo(tipo, fn)   schermo d'epoca del «Ciao, mondo» (js/schermi.js)
 *
 * Laboratori e figure vengono montati solo quando si avvicinano allo schermo
 * e messi in pausa quando escono dalla vista o la scheda del browser è nascosta.
 * Questo file non tocca il DOM finché non si chiama avvia(): i test in Node
 * possono caricarlo insieme ai capitoli per controllarne i dati.
 */
(function (root) {
  'use strict';

  const SLUG = 'programmazione';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORE_LETTI = 'pg-programmazione-letti';
  const STORE_LAB = 'pg-programmazione-lab';

  const capitoli = [];
  const labs = Object.create(null);
  const figure = Object.create(null);
  const schermi = Object.create(null);
  const glossario = new Map(); // chiave minuscola -> { termine, definizione, capitolo }

  /* ---------- movimento: gli stessi valori dei token CSS --pg-dur-* e --pg-ease-* ---------- */

  const DURATA = { istante: 80, veloce: 180, normale: 350, lenta: 600, narrativa: 1000 };

  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }

  const EASING = {
    smooth: cubicBezier(0.22, 1, 0.36, 1),
    sharp: cubicBezier(0.4, 0, 0.2, 1),
    bounce: cubicBezier(0.34, 1.56, 0.64, 1),
    linear: (t) => t,
  };

  function riduciMovimento() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---------- registrazione ---------- */

  function capitolo(def) {
    if (!def || !def.id) throw new Error('ProgStoria.capitolo: manca l\'id');
    const i = capitoli.findIndex((c) => c.id === def.id);
    if (i >= 0) capitoli[i] = def; else capitoli.push(def);
  }
  function lab(id, def) { labs[id] = Object.assign({ id: id }, def); }
  function figura(id, def) { figure[id] = Object.assign({ id: id }, def); }
  function schermo(tipo, fn) { schermi[tipo] = fn; }

  function ordinati() { return capitoli.slice().sort((a, b) => a.numero - b.numero); }

  /* ---------- utilità DOM ---------- */

  function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
    return n;
  }

  function s(tag, attrs, ...children) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return n;
  }

  let idSeq = 0;
  function uid(prefisso) { idSeq += 1; return (prefisso || 'pg') + '-' + idSeq; }

  function store(chiave) {
    try { return new Set(JSON.parse(localStorage.getItem(chiave) || '[]')); } catch (e) { return new Set(); }
  }
  function salva(chiave, set) {
    try { localStorage.setItem(chiave, JSON.stringify([...set])); } catch (e) { /* archiviazione non disponibile */ }
  }

  /* ---------- testo con un mini-markup ----------
   * **grassetto**  *corsivo*  `codice`  {{termine}}  {{termine|testo visibile}}  [testo](#ancora o https://...)
   */

  const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\{\{([^}|]+)(?:\|([^}]+))?\}\}|\[([^\]]+)\]\(([^)\s]+)\)/g;

  function inline(testo) {
    const frag = document.createDocumentFragment();
    const str = String(testo == null ? '' : testo);
    const re = new RegExp(INLINE.source, 'g');
    let ultimo = 0;
    let m;
    while ((m = re.exec(str))) {
      if (m.index > ultimo) frag.append(str.slice(ultimo, m.index));
      if (m[1] != null) frag.append(h('strong', null, inline(m[1])));
      else if (m[2] != null) frag.append(h('em', null, inline(m[2])));
      else if (m[3] != null) frag.append(h('code', null, m[3]));
      else if (m[4] != null) frag.append(termine(m[4].trim(), (m[5] || m[4]).trim()));
      else if (m[6] != null) frag.append(collegamento(m[6], m[7]));
      ultimo = re.lastIndex;
    }
    if (ultimo < str.length) frag.append(str.slice(ultimo));
    return frag;
  }

  function collegamento(testo, href) {
    if (/^#[\w-]+$/.test(href)) return h('a', { href: href }, inline(testo));
    if (/^https:\/\//.test(href)) return h('a', { href: href, target: '_blank', rel: 'noopener' }, inline(testo));
    if (/^\.\.\/[\w./#-]+$/.test(href)) return h('a', { href: href }, inline(testo));
    return document.createTextNode(testo);
  }

  // Termini del mini-markup ({{...}}) presenti in un testo: servono ai test.
  function terminiIn(testo) {
    const out = [];
    const re = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;
    let m;
    while ((m = re.exec(String(testo || '')))) out.push(m[1].trim());
    return out;
  }

  /* ---------- glossario ---------- */

  function indicizzaGlossario() {
    glossario.clear();
    for (const cap of ordinati()) {
      for (const termine of Object.keys(cap.glossario || {})) {
        const k = termine.toLowerCase();
        if (!glossario.has(k)) glossario.set(k, { termine: termine, definizione: cap.glossario[termine], capitolo: cap });
      }
    }
  }

  function termine(chiave, etichetta) {
    const voce = glossario.get(chiave.toLowerCase());
    if (!voce) return document.createTextNode(etichetta);
    return h('button', {
      type: 'button',
      class: 'pg-term',
      'data-term': chiave.toLowerCase(),
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      onclick: (e) => apriTermine(e.currentTarget),
    }, etichetta);
  }

  let pop = null;
  let popAperto = null;

  function creaPopover() {
    pop = h('div', { class: 'pg-pop', id: 'pg-pop', role: 'dialog', 'aria-labelledby': 'pg-pop-t', hidden: true },
      h('p', { class: 'pg-pop-t', id: 'pg-pop-t' }),
      h('p', { class: 'pg-pop-d' }),
      h('p', { class: 'pg-pop-foot' }, h('a', { class: 'pg-pop-cap', href: '#' }), h('a', { href: '#glossario' }, 'Tutto il glossario')),
      h('button', { type: 'button', class: 'pg-pop-x', 'aria-label': 'Chiudi', onclick: () => chiudiTermine(true) }, '×'));
    document.body.append(pop);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popAperto) chiudiTermine(true); });
    document.addEventListener('click', (e) => {
      if (popAperto && !pop.contains(e.target) && !e.target.closest('.pg-term')) chiudiTermine(false);
    });
    window.addEventListener('resize', () => { if (popAperto) posiziona(popAperto); });
    pop.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => chiudiTermine(false)));
  }

  function apriTermine(btn) {
    if (popAperto === btn) { chiudiTermine(true); return; }
    if (popAperto) chiudiTermine(false);
    const voce = glossario.get(btn.dataset.term);
    if (!voce) return;
    pop.querySelector('.pg-pop-t').textContent = voce.termine;
    pop.querySelector('.pg-pop-d').replaceChildren(inline(voce.definizione));
    const capLink = pop.querySelector('.pg-pop-cap');
    capLink.href = '#' + voce.capitolo.id;
    capLink.textContent = 'Capitolo ' + voce.capitolo.numero;
    pop.className = 'pg-pop pg-c-' + voce.capitolo.id;
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    popAperto = btn;
    posiziona(btn);
  }

  function chiudiTermine(rimettiFuoco) {
    if (!popAperto) return;
    popAperto.setAttribute('aria-expanded', 'false');
    if (rimettiFuoco) popAperto.focus();
    popAperto = null;
    pop.hidden = true;
  }

  function posiziona(btn) {
    const r = btn.getBoundingClientRect();
    const largo = Math.min(340, window.innerWidth - 32);
    pop.style.width = largo + 'px';
    let x = r.left + window.scrollX + r.width / 2 - largo / 2;
    x = Math.max(16 + window.scrollX, Math.min(x, window.scrollX + window.innerWidth - largo - 16));
    pop.style.left = x + 'px';
    pop.style.top = (r.bottom + window.scrollY + 10) + 'px';
  }

  /* ---------- orologio per le animazioni dei laboratori ----------
   * Un ciclo requestAnimationFrame per laboratorio: si ferma da solo quando il
   * laboratorio esce dalla vista, così le attese e le animazioni si sospendono.
   */

  function annullato(err) { return !!(err && err.annullato); }

  function creaOrologio() {
    let attivo = true;
    let raf = 0;
    let ultimo = 0;
    const cicli = new Set();
    const attese = new Set();

    function tick(t) {
      raf = 0;
      const dt = ultimo ? Math.min(t - ultimo, 64) : 16;
      ultimo = t;
      for (const f of [...cicli]) {
        try { f(dt); } catch (e) { cicli.delete(f); console.error(e); }
      }
      if (attivo && cicli.size) raf = requestAnimationFrame(tick); else ultimo = 0;
    }
    function parti() {
      if (attivo && cicli.size && !raf) { ultimo = 0; raf = requestAnimationFrame(tick); }
    }
    const api = {
      get attivo() { return attivo; },
      ciclo(f) { cicli.add(f); parti(); return () => cicli.delete(f); },
      attendi(ms) {
        return new Promise((resolve, reject) => {
          let t = 0;
          const voce = { reject: reject };
          voce.stop = api.ciclo((dt) => {
            t += dt;
            if (t >= ms) { voce.stop(); attese.delete(voce); resolve(); }
          });
          attese.add(voce);
        });
      },
      anima(opz) {
        const durata = opz.durata == null ? DURATA.normale : opz.durata;
        const easing = typeof opz.easing === 'function' ? opz.easing : EASING[opz.easing || 'smooth'];
        if (riduciMovimento() || durata <= 0) { opz.aggiorna(1); return Promise.resolve(); }
        return new Promise((resolve, reject) => {
          let t = 0;
          const voce = { reject: reject };
          opz.aggiorna(0);
          voce.stop = api.ciclo((dt) => {
            t += dt;
            const p = Math.min(1, t / durata);
            opz.aggiorna(easing(p));
            if (p >= 1) { voce.stop(); attese.delete(voce); resolve(); }
          });
          attese.add(voce);
        });
      },
      annulla() {
        for (const voce of attese) {
          voce.stop();
          const err = new Error('annullato');
          err.annullato = true;
          voce.reject(err);
        }
        attese.clear();
      },
      pausa() { attivo = false; if (raf) cancelAnimationFrame(raf); raf = 0; ultimo = 0; },
      riprendi() { attivo = true; parti(); },
      svuota() { api.annulla(); cicli.clear(); },
    };
    return api;
  }

  /* ---------- laboratori e figure montati su richiesta ---------- */

  const istanze = [];
  let ioMonta = null;
  let ioVista = null;

  function osserva(rec) {
    istanze.push(rec);
    if (!ioMonta) { monta(rec); rec.visibile = true; aggiornaAttivita(rec); return; }
    ioMonta.observe(rec.box);
    ioVista.observe(rec.box);
  }

  function iniettaCss(chiave, css) {
    if (!css || document.querySelector('style[data-pg="' + chiave + '"]')) return;
    document.head.append(h('style', { 'data-pg': chiave }, css));
  }

  function messaggio(classe, testo) {
    return h('div', { class: 'pg-stato ' + classe, role: classe === 'pg-stato--errore' ? 'alert' : null }, h('p', null, testo));
  }

  function monta(rec) {
    if (rec.montato) return;
    rec.montato = true;
    if (rec.tipo === 'lab') montaLab(rec);
    else if (rec.tipo === 'figura') montaFigura(rec);
    else if (rec.tipo === 'schermo') montaSchermo(rec);
    aggiornaAttivita(rec);
  }

  function creaCtx(rec) {
    const orologio = rec.orologio;
    const live = rec.box.querySelector('.pg-live');
    return {
      h: h,
      s: s,
      inline: inline,
      uid: uid,
      DURATA: DURATA,
      EASING: EASING,
      get riduci() { return riduciMovimento(); },
      get attivo() { return orologio.attivo; },
      ciclo: orologio.ciclo,
      attendi: orologio.attendi,
      anima: orologio.anima,
      annulla: orologio.annulla,
      annullato: annullato,
      annuncia(testo) { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = testo; }); } },
      completa() {
        const fatti = store(STORE_LAB);
        if (!fatti.has(rec.id)) { fatti.add(rec.id); salva(STORE_LAB, fatti); }
        rec.box.classList.add('pg-lab--fatto');
      },
    };
  }

  function montaLab(rec) {
    const def = labs[rec.id];
    if (!def) { rec.corpo.replaceChildren(messaggio('pg-stato--vuoto', 'Questo laboratorio non è ancora disponibile.')); return; }
    iniettaCss('lab-' + rec.id, def.css);
    rec.corpo.replaceChildren();
    try {
      rec.api = def.monta(rec.corpo, creaCtx(rec)) || {};
    } catch (err) {
      console.error('Laboratorio ' + rec.id + ':', err);
      rec.orologio.svuota();
      rec.api = {};
      rec.corpo.replaceChildren(messaggio('pg-stato--errore', 'Il laboratorio non è riuscito a partire. Ricarica la pagina per riprovare.'));
    }
  }

  function montaFigura(rec) {
    const def = figure[rec.id];
    if (!def) { rec.corpo.replaceChildren(messaggio('pg-stato--vuoto', 'Illustrazione in preparazione.')); return; }
    iniettaCss('fig-' + rec.id, def.css);
    try {
      const out = def.disegna({ h: h, s: s, uid: uid, riduci: riduciMovimento() });
      if (typeof out === 'string') rec.corpo.innerHTML = out; else rec.corpo.replaceChildren(out);
      if (def.alt) rec.corpo.setAttribute('aria-label', def.alt);
    } catch (err) {
      console.error('Figura ' + rec.id + ':', err);
      rec.corpo.replaceChildren(messaggio('pg-stato--errore', 'Illustrazione non disponibile.'));
    }
  }

  function montaSchermo(rec) {
    const fn = schermi[rec.schermo] || schermi.editor;
    if (!fn) { rec.corpo.replaceChildren(h('pre', { class: 'pg-schermo-testo' }, rec.ciao.codice || rec.ciao.uscita || '')); return; }
    try {
      rec.api = fn(rec.corpo, rec.ciao, creaCtx(rec)) || {};
    } catch (err) {
      console.error('Schermo ' + rec.schermo + ':', err);
      rec.corpo.replaceChildren(h('pre', { class: 'pg-schermo-testo' }, rec.ciao.codice || rec.ciao.uscita || ''));
    }
  }

  function aggiornaAttivita(rec) {
    if (!rec.montato) return;
    const attivo = rec.visibile && !document.hidden;
    if (attivo === rec.attivo) return;
    rec.attivo = attivo;
    rec.box.classList.toggle('pg-fermo', !attivo);
    if (rec.orologio) { if (attivo) rec.orologio.riprendi(); else rec.orologio.pausa(); }
    if (!rec.api) return;
    try {
      if (attivo) { if (rec.api.riprendi) rec.api.riprendi(); } else if (rec.api.pausa) rec.api.pausa();
    } catch (err) { console.error(err); }
  }

  function avviaOsservatori() {
    if (!('IntersectionObserver' in window)) return;
    ioMonta = new IntersectionObserver((voci) => {
      for (const v of voci) {
        if (!v.isIntersecting) continue;
        const rec = istanze.find((r) => r.box === v.target);
        ioMonta.unobserve(v.target);
        if (rec) monta(rec);
      }
    }, { rootMargin: '700px 0px' });
    ioVista = new IntersectionObserver((voci) => {
      for (const v of voci) {
        const rec = istanze.find((r) => r.box === v.target);
        if (!rec) continue;
        rec.visibile = v.isIntersecting;
        aggiornaAttivita(rec);
      }
    }, { rootMargin: '80px 0px' });
    document.addEventListener('visibilitychange', () => istanze.forEach(aggiornaAttivita));
  }

  /* ---------- blocchi di contenuto ---------- */

  function paragrafi(lista) {
    return (Array.isArray(lista) ? lista : [lista]).filter(Boolean).map((p) => h('p', null, inline(p)));
  }

  const BLOCCHI = {
    testo(b) {
      return h('div', { class: 'pg-testo' }, b.titolo ? h('h3', null, inline(b.titolo)) : null, paragrafi(b.paragrafi || b.testo));
    },
    elenco(b) {
      const Tag = b.numerato ? 'ol' : 'ul';
      return h('div', { class: 'pg-testo' }, b.titolo ? h('h3', null, inline(b.titolo)) : null,
        b.intro ? h('p', null, inline(b.intro)) : null,
        h(Tag, { class: 'pg-elenco' }, (b.voci || []).map((v) => h('li', null, inline(v)))));
    },
    citazione(b) {
      return h('figure', { class: 'pg-citazione' },
        h('blockquote', null, h('p', null, inline(b.testo))),
        h('figcaption', null, '— ', inline(b.autore || ''), b.fonte ? [', ', h('cite', null, inline(b.fonte))] : null));
    },
    sapevi(b) {
      return h('aside', { class: 'pg-sapevi' }, h('p', { class: 'pg-sapevi-t' }, b.titolo ? inline(b.titolo) : 'Lo sapevi?'), paragrafi(b.testo));
    },
    codice(b) {
      return h('figure', { class: 'pg-codice' },
        h('div', { class: 'pg-codice-head' }, h('span', null, b.linguaggio || 'Codice'), b.anno ? h('span', null, String(b.anno)) : null),
        h('pre', { tabindex: '0' }, h('code', null, b.codice || '')),
        b.didascalia ? h('figcaption', null, inline(b.didascalia)) : null);
    },
    tabella(b) {
      return h('figure', { class: 'pg-tabella' },
        h('div', { class: 'pg-tabella-wrap', tabindex: '0' },
          h('table', null,
            h('thead', null, h('tr', null, (b.intestazioni || []).map((x) => h('th', { scope: 'col' }, inline(x))))),
            h('tbody', null, (b.righe || []).map((r) => h('tr', null, r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, inline(c)) : h('td', null, inline(c))))))))),
        b.didascalia ? h('figcaption', null, inline(b.didascalia)) : null);
    },
    figura(b) {
      const def = figure[b.id];
      const corpo = h('div', { class: 'pg-fig-art', role: 'img', 'aria-label': (def && def.alt) || b.alt || b.didascalia || 'Illustrazione' });
      const box = h('figure', { class: 'pg-fig' + (b.larga ? ' pg-fig--larga' : ''), 'data-fig': b.id }, corpo,
        b.didascalia ? h('figcaption', null, inline(b.didascalia)) : null);
      osserva({ tipo: 'figura', id: b.id, box: box, corpo: corpo });
      return box;
    },
    lab(b) {
      const def = labs[b.id] || {};
      const idTitolo = uid('lab');
      const corpo = h('div', { class: 'pg-lab-corpo' }, messaggio('pg-stato--carica', 'Preparo il laboratorio…'));
      const fatto = store(STORE_LAB).has(b.id);
      const box = h('section', { class: 'pg-lab' + (fatto ? ' pg-lab--fatto' : '') + (b.largo ? ' pg-lab--largo' : ''), 'data-lab': b.id, 'aria-labelledby': idTitolo },
        h('header', { class: 'pg-lab-head' },
          h('p', { class: 'pg-lab-eyebrow' }, h('span', null, 'Laboratorio'), h('span', { class: 'pg-lab-ok' }, '✓ esplorato')),
          h('h3', { id: idTitolo }, inline(b.titolo || def.titolo || 'Laboratorio')),
          b.intro ? h('p', { class: 'pg-lab-intro' }, inline(b.intro)) : null),
        corpo,
        h('p', { class: 'pg-live pg-sr', 'aria-live': 'polite' }));
      osserva({ tipo: 'lab', id: b.id, box: box, corpo: corpo, orologio: creaOrologio() });
      return box;
    },
    ciao(b, cap) {
      const ciao = cap.ciao;
      if (!ciao) return null;
      const tipo = ciao.schermo || cap.epoca || 'editor';
      const corpo = h('div', { class: 'pg-schermo-corpo' });
      const box = h('figure', { class: 'pg-ciao pg-schermo--' + tipo, 'data-schermo': tipo },
        h('div', { class: 'pg-ciao-head' },
          h('p', { class: 'pg-ciao-eyebrow' }, 'Il «Ciao, mondo» ' + (ciao.anno ? 'del ' + ciao.anno : 'dell\'epoca')),
          h('p', { class: 'pg-ciao-lang' }, inline(ciao.linguaggio || ''))),
        corpo,
        ciao.nota ? h('figcaption', null, inline(ciao.nota)) : null);
      osserva({ tipo: 'schermo', schermo: tipo, ciao: ciao, box: box, corpo: corpo, orologio: creaOrologio() });
      return box;
    },
  };

  function blocco(b, cap) {
    const fn = BLOCCHI[b.tipo];
    if (!fn) return null;
    return fn(b, cap);
  }

  function iniziali(nome) {
    const parti = nome.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter((p) => /^[A-ZÀ-Ý]/.test(p));
    return ((parti[0] || nome)[0] + (parti.length > 1 ? parti[parti.length - 1][0] : '')).toUpperCase();
  }

  function protagonisti(cap) {
    return h('section', { class: 'pg-persone', 'aria-label': 'Protagonisti' },
      h('h3', null, 'Protagonisti'),
      h('ul', null, cap.protagonisti.map((p) => h('li', { class: 'pg-persona' },
        h('span', { class: 'pg-persona-mono', 'aria-hidden': 'true' }, iniziali(p.nome)),
        h('div', null,
          h('p', { class: 'pg-persona-nome' }, p.nome, p.anni ? h('span', null, ' ' + p.anni) : null),
          p.ruolo ? h('p', { class: 'pg-persona-ruolo' }, inline(p.ruolo)) : null,
          p.testo ? h('p', { class: 'pg-persona-testo' }, inline(p.testo)) : null)))));
  }

  function tappe(cap) {
    return h('section', { class: 'pg-tappe', 'aria-label': 'Tappe principali' },
      h('h3', null, 'Le tappe'),
      h('ol', null, cap.tappe.slice().sort((a, b) => a.anno - b.anno).map((t) => h('li', null,
        h('span', { class: 'pg-tappa-anno' }, String(t.anno)),
        h('span', { class: 'pg-tappa-testo' }, inline(t.testo))))));
  }

  function fonti(cap) {
    return h('details', { class: 'pg-fonti' },
      h('summary', null, 'Fonti e approfondimenti (' + cap.fonti.length + ')'),
      h('ul', null, cap.fonti.map((f) => h('li', null,
        typeof f === 'string' ? inline(f) : [inline(f.testo), f.url ? [' ', h('a', { href: f.url, target: '_blank', rel: 'noopener' }, 'link')] : null]))));
  }

  /* ---------- pagina ---------- */

  function renderCapitolo(cap, i, lista) {
    const prev = lista[i - 1];
    const next = lista[i + 1];
    return h('section', { class: 'pg-cap pg-c-' + cap.id, id: cap.id, 'data-cap': cap.id, 'aria-labelledby': cap.id + '-t' },
      h('header', { class: 'pg-cap-head' },
        h('p', { class: 'pg-cap-num' }, h('span', null, cap.etichetta || ('Capitolo ' + cap.numero)), cap.anni ? h('span', { class: 'pg-cap-anni' }, cap.anni) : null),
        h('h2', { id: cap.id + '-t' }, cap.titolo),
        cap.sottotitolo ? h('p', { class: 'pg-cap-sub' }, inline(cap.sottotitolo)) : null,
        cap.intro ? h('p', { class: 'pg-cap-intro' }, inline(cap.intro)) : null),
      h('div', { class: 'pg-cap-corpo' }, (cap.blocchi || []).map((b) => blocco(b, cap))),
      cap.protagonisti && cap.protagonisti.length ? protagonisti(cap) : null,
      cap.tappe && cap.tappe.length ? tappe(cap) : null,
      cap.fonti && cap.fonti.length ? fonti(cap) : null,
      h('footer', { class: 'pg-cap-fine', 'data-fine': cap.id },
        h('a', { class: 'pg-quiz-link', href: '../quiz/index.html#' + SLUG + '/' + cap.id }, 'Mettiti alla prova sul capitolo ' + cap.numero),
        h('nav', { class: 'pg-cap-nav', 'aria-label': 'Capitoli vicini' },
          prev ? h('a', { href: '#' + prev.id, class: 'prev pg-c-' + prev.id }, h('small', null, '← ' + (prev.anni || '')), prev.titolo) : h('span'),
          next ? h('a', { href: '#' + next.id, class: 'next pg-c-' + next.id }, h('small', null, (next.anni || '') + ' →'), next.titolo) : h('span'))));
  }

  function indice(lista) {
    const letti = store(STORE_LETTI);
    const voci = lista.map((c) => h('li', null,
      h('a', { href: '#' + c.id, class: 'pg-c-' + c.id + (letti.has(c.id) ? ' letto' : ''), 'data-cap': c.id },
        h('span', { class: 'pg-rail-anni' }, c.anni || ''),
        h('span', { class: 'pg-rail-tit' }, c.titoloBreve || c.titolo))));
    return h('nav', { class: 'pg-rail', 'aria-label': 'Capitoli' },
      h('div', { class: 'pg-anno', 'aria-hidden': 'true' }, contatore()),
      h('ol', null, voci));
  }

  function contatore() {
    const cifre = [];
    for (let i = 0; i < 4; i++) {
      const col = h('span', { class: 'pg-cifra' }, h('span', { class: 'pg-cifra-nastro' }, '0123456789'.split('').map((d) => h('span', null, d))));
      cifre.push(col);
    }
    return h('span', { class: 'pg-contatore' }, cifre);
  }

  function impostaAnno(anno) {
    const str = String(anno).padStart(4, '0').slice(-4);
    document.querySelectorAll('.pg-contatore').forEach((c) => {
      c.querySelectorAll('.pg-cifra-nastro').forEach((n, i) => { n.style.transform = 'translateY(' + (-Number(str[i])) + 'em)'; });
      c.setAttribute('data-anno', str);
    });
  }

  // Anno mostrato dal contatore: cap.anno se c'è, altrimenti il primo anno del periodo.
  function annoInizio(cap) {
    if (cap.anno) return cap.anno;
    const m = String(cap.anni || '').match(/\d{4}/);
    return m ? Number(m[0]) : null;
  }

  function barraMobile(lista) {
    const dlgId = 'pg-indice-dlg';
    const lst = h('ol', null, lista.map((c) => h('li', null,
      h('a', { href: '#' + c.id, class: 'pg-c-' + c.id, 'data-cap': c.id, onclick: () => dlg.close() },
        h('span', { class: 'pg-rail-anni' }, c.anni || ''), h('span', null, c.titolo)))));
    const dlg = h('dialog', { class: 'pg-dlg', id: dlgId, 'aria-label': 'Indice dei capitoli' },
      h('div', { class: 'pg-dlg-head' }, h('p', null, 'Indice'), h('button', { type: 'button', class: 'pg-dlg-x', 'aria-label': 'Chiudi indice', onclick: () => dlg.close() }, '×')),
      lst);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    const bar = h('div', { class: 'pg-barra' },
      h('span', { class: 'pg-barra-anno' }, contatore()),
      h('span', { class: 'pg-barra-tit' }, h('span', { class: 'pg-barra-num' }), h('span', { class: 'pg-barra-nome' }, 'Storia della programmazione')),
      h('button', { type: 'button', class: 'pg-barra-btn', 'aria-haspopup': 'dialog', 'aria-controls': dlgId, onclick: () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); } }, 'Indice'));
    return [bar, dlg];
  }

  function hero(cfg, lista) {
    const nLab = lista.reduce((n, c) => n + (c.blocchi || []).filter((b) => b.tipo === 'lab').length, 0) + (cfg.lab ? 1 : 0);
    const nCap = lista.filter((c) => !c.speciale).length;
    return h('section', { class: 'pg-hero', id: 'inizio', 'aria-labelledby': 'pg-hero-t' },
      h('div', { class: 'pg-hero-testo' },
        h('p', { class: 'eyebrow' }, cfg.eyebrow),
        h('h1', { id: 'pg-hero-t' }, cfg.titolo),
        h('p', { class: 'lead' }, inline(cfg.lead)),
        h('ul', { class: 'pg-hero-numeri', 'aria-label': 'In questa sezione' },
          h('li', null, h('strong', null, String(nCap)), ' epoche'),
          h('li', null, h('strong', null, String(nLab)), ' laboratori'),
          h('li', null, h('strong', null, String(glossario.size)), ' voci di glossario')),
        h('div', { class: 'hero-actions' },
          lista[0] ? h('a', { class: 'btn primary', href: '#' + lista[0].id }, cfg.inizia || 'Inizia il viaggio') : null,
          cfg.secondario ? h('a', { class: 'btn', href: cfg.secondario.href }, cfg.secondario.testo) : null)),
      cfg.lab ? BLOCCHI.lab({ id: cfg.lab, titolo: cfg.labTitolo, intro: cfg.labIntro, largo: true }) : null);
  }

  function finale(lista) {
    const voci = [...glossario.values()].sort((a, b) => a.termine.localeCompare(b.termine, 'it', { sensitivity: 'base' }));
    const gruppi = new Map();
    for (const v of voci) {
      const l = v.termine[0].toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const k = /[A-Z]/.test(l) ? l : '#';
      if (!gruppi.has(k)) gruppi.set(k, []);
      gruppi.get(k).push(v);
    }
    return h('section', { class: 'pg-finale', 'aria-label': 'Glossario e conclusione' },
      h('div', { class: 'pg-finale-cta' },
        h('h2', null, 'E adesso, mettiti alla prova'),
        h('p', null, 'Hai attraversato due secoli di idee: dalle schede del telaio alle frasi rivolte a un\'intelligenza artificiale. Il quiz della sezione ti aiuta a fissare date, persone e concetti.'),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn primary', href: '../quiz/index.html#' + SLUG }, 'Quiz sulla storia della programmazione'),
          h('a', { class: 'btn', href: '../index.html' }, 'Torna all\'enciclopedia'))),
      h('section', { class: 'pg-glossario', id: 'glossario', 'aria-labelledby': 'glossario-t' },
        h('h2', { id: 'glossario-t' }, 'Glossario'),
        h('p', { class: 'pg-glossario-intro' }, 'Le parole evidenziate nel testo si aprono con un clic. Qui le trovi tutte, con il capitolo in cui compaiono.'),
        h('div', { class: 'pg-glossario-lettere' }, [...gruppi.keys()].map((k) => h('a', { href: '#gl-' + k }, k))),
        [...gruppi.entries()].map(([k, lista2]) => h('div', { class: 'pg-glossario-gruppo', id: 'gl-' + k },
          h('h3', null, k),
          h('dl', null, lista2.map((v) => h('div', { class: 'pg-c-' + v.capitolo.id },
            h('dt', null, v.termine),
            h('dd', null, inline(v.definizione), ' ', h('a', { href: '#' + v.capitolo.id, class: 'pg-glossario-cap' }, 'cap. ' + v.capitolo.numero)))))))));
  }

  /* ---------- scorrimento: capitolo attivo, anno, letture ---------- */

  function avviaScorrimento(lista) {
    const rail = document.querySelectorAll('.pg-rail a[data-cap], .pg-dlg a[data-cap]');
    const barNum = document.querySelector('.pg-barra-num');
    const barNome = document.querySelector('.pg-barra-nome');
    let attivo = null;

    function attiva(id) {
      if (id === attivo) return;
      attivo = id;
      const cap = lista.find((c) => c.id === id);
      rail.forEach((a) => {
        if (a.dataset.cap === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      const barra = document.querySelector('.pg-barra');
      if (cap) {
        const anno = annoInizio(cap);
        if (anno) impostaAnno(anno);
        if (barNum) barNum.textContent = cap.speciale ? '' : cap.numero + ' · ';
        if (barNome) barNome.textContent = cap.titoloBreve || cap.titolo;
        if (barra) barra.className = 'pg-barra pg-c-' + cap.id;
        const inRail = document.querySelector('.pg-rail a[aria-current]');
        const scroller = document.querySelector('.pg-rail');
        if (inRail && scroller && scroller.scrollHeight > scroller.clientHeight) {
          const r = inRail.offsetTop - scroller.clientHeight / 2;
          scroller.scrollTo({ top: r, behavior: riduciMovimento() ? 'auto' : 'smooth' });
        }
      } else if (barra) {
        barra.className = 'pg-barra';
        if (barNum) barNum.textContent = '';
        if (barNome) barNome.textContent = 'Storia della programmazione';
      }
    }

    if (!('IntersectionObserver' in window)) return;
    const visibili = new Map();
    const io = new IntersectionObserver((voci) => {
      for (const v of voci) visibili.set(v.target.id, v.isIntersecting);
      const primo = lista.find((c) => visibili.get(c.id));
      attiva(primo ? primo.id : null);
    }, { rootMargin: '-35% 0px -60% 0px' });
    lista.forEach((c) => { const el = document.getElementById(c.id); if (el) io.observe(el); });

    // Un capitolo è "letto" quando se ne raggiunge la fine.
    const ioFine = new IntersectionObserver((voci) => {
      for (const v of voci) {
        if (!v.isIntersecting) continue;
        segnaLetto(v.target.dataset.fine, lista);
        ioFine.unobserve(v.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.pg-cap-fine').forEach((el) => ioFine.observe(el));
  }

  function segnaLetto(id, lista) {
    const letti = store(STORE_LETTI);
    if (!letti.has(id)) { letti.add(id); salva(STORE_LETTI, letti); }
    document.querySelectorAll('.pg-rail a[data-cap="' + id + '"]').forEach((a) => a.classList.add('letto'));
    aggiornaProgresso(lista);
  }

  function aggiornaProgresso(lista) {
    const ids = new Set(lista.map((c) => c.id));
    const n = [...store(STORE_LETTI)].filter((id) => ids.has(id)).length;
    const testo = document.getElementById('progress');
    const barra = document.getElementById('progress-bar');
    if (testo) testo.textContent = n + '/' + lista.length + ' capitoli letti';
    if (barra) barra.style.width = (100 * n / Math.max(1, lista.length)) + '%';
    if (root.Enciclopedia && typeof root.Enciclopedia.progresso === 'function') {
      try { root.Enciclopedia.progresso(SLUG, n, lista.length); } catch (e) { /* hub non disponibile */ }
    }
  }

  function misuraTopbar() {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--pg-top', bar.offsetHeight + 'px');
    set();
    if ('ResizeObserver' in window) new ResizeObserver(set).observe(bar);
    else window.addEventListener('resize', set);
  }

  function vaiAllAncora() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start' });
  }

  /* ---------- avvio ---------- */

  let avviato = false;
  const HERO = {
    eyebrow: 'Sezione 7 · Storia della programmazione',
    titolo: 'Come abbiamo imparato a parlare alle macchine',
    lead: 'Duecento anni di idee per dire a una macchina che cosa fare: dai fori nelle schede di un telaio alle frasi rivolte a un\'intelligenza artificiale. Ogni epoca ha inventato un linguaggio più vicino al nostro, ma sotto ogni riga di codice ci sono ancora porte logiche che si aprono e si chiudono.',
    inizia: 'Comincia dal telaio del 1804',
    secondario: { href: '#atlante', testo: 'Apri l\'atlante dei linguaggi' },
    lab: 'scala',
    labTitolo: 'La scala dell\'astrazione: una somma, sette livelli',
    labIntro: 'Scendi un gradino alla volta, dalla frase in italiano fino agli elettroni: è lo stesso calcolo, scritto in tutti i linguaggi che la storia ha messo uno sopra l\'altro.',
  };

  function avvia(opzioni) {
    if (avviato) return;
    avviato = true;
    const cfg = Object.assign({}, HERO, opzioni || {});
    const lista = ordinati();
    indicizzaGlossario();
    avviaOsservatori();
    misuraTopbar();
    creaPopover();
    const radice = document.getElementById('pg-root');
    const [barra, dlg] = barraMobile(lista);
    radice.replaceChildren(
      hero(cfg, lista),
      barra,
      h('div', { class: 'pg-layout' },
        indice(lista),
        h('div', { class: 'pg-contenuto' }, lista.map(renderCapitolo), finale(lista))),
      dlg);
    impostaAnno(annoInizio(lista[0] || {}) || 1804);
    avviaScorrimento(lista);
    aggiornaProgresso(lista);
    requestAnimationFrame(vaiAllAncora);
  }

  root.ProgStoria = {
    SLUG: SLUG,
    capitolo: capitolo,
    lab: lab,
    figura: figura,
    schermo: schermo,
    avvia: avvia,
    // usati dai test e dagli schermi d'epoca
    dati: () => ({ capitoli: ordinati(), labs: labs, figure: figure, schermi: schermi }),
    terminiIn: terminiIn,
    util: { h: h, s: s, inline: inline, uid: uid, DURATA: DURATA, EASING: EASING, riduciMovimento: riduciMovimento, creaOrologio: creaOrologio, annullato: annullato },
  };
})(typeof window !== 'undefined' ? window : globalThis);
