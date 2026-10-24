/*
 * Elettronica base · nucleo comune della pagina.
 *
 * Contiene i registri (capitoli e laboratori), le utilità DOM e SVG,
 * il testo arricchito con le voci di glossario, i controlli dei laboratori
 * (cursori, scelte, interruttori, letture digitali, formule vive),
 * il ciclo di animazione che si ferma da solo fuori schermo e la "cornice"
 * comune di ogni laboratorio con le sfide.
 *
 * Un capitolo (capitoli/<id>.js) chiama EB.capitolo({...});
 * un laboratorio (laboratori/<id>.js) chiama EB.laboratorio('<id>', { monta(ctx) {...} }).
 */
(function (root) {
  'use strict';

  const EB = root.EB || {};
  root.EB = EB;
  const F = root.EBFisica;
  const SVGNS = 'http://www.w3.org/2000/svg';

  EB.F = F;
  EB.capitoli = EB.capitoli || {};
  EB.laboratori = EB.laboratori || {};
  EB.glossario = EB.glossario || {};

  EB.capitolo = function (def) {
    EB.capitoli[def.id] = def;
    (def.glossario || []).forEach((g) => {
      EB.glossario[g.termine.toLowerCase()] = Object.assign({ capitolo: def.id }, g);
    });
  };

  EB.laboratorio = function (id, def) {
    EB.laboratori[id] = def;
  };

  /* ---------- movimento ---------- */

  const mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  EB.ridotto = function () {
    return !!(mq && mq.matches);
  };
  EB.durate = { veloce: 180, normale: 350, lenta: 600 };

  /* ---------- DOM ---------- */

  function applica(n, attrs, svg) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') {
        if (svg) n.setAttribute('class', v);
        else n.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        for (const p in v) n.style.setProperty(p, v[p]);
      } else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
        n.addEventListener(k.slice(2), v);
      } else if (k === 'testo') {
        n.textContent = v;
      } else {
        n.setAttribute(k, v === true ? '' : v);
      }
    }
  }

  function figli(n, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : String(c));
    }
  }

  // h('div', { class: 'x', onclick: fn }, 'testo', altroNodo)
  EB.h = function h(tag, attrs, ...children) {
    const n = document.createElement(tag);
    applica(n, attrs, false);
    figli(n, children);
    return n;
  };

  // s('circle', { cx: 10, cy: 10, r: 4 }) crea elementi SVG.
  EB.s = function s(tag, attrs, ...children) {
    const n = document.createElementNS(SVGNS, tag);
    applica(n, attrs, true);
    figli(n, children);
    return n;
  };

  // Converte una stringa SVG scritta nei contenuti in un nodo.
  EB.svgDaTesto = function (markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  };

  EB.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  EB.lerp = (a, b, t) => a + (b - a) * t;
  EB.fmt = (v, u, o) => F.formatta(v, u, o);
  EB.num = (v, d) => F.numero(v, d);

  let contatore = 0;
  EB.uid = (p) => (p || 'eb') + '-' + (++contatore);

  /* ---------- testo arricchito e glossario ---------- */

  // **grassetto**, *corsivo*, `formula`, [[voce]] o [[testo|voce]] del glossario.
  const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\[[^\]]+\]\])/g;

  EB.testo = function (str, ctx) {
    const frag = document.createDocumentFragment();
    String(str).split(TOKEN).forEach((parte) => {
      if (!parte) return;
      if (parte.startsWith('**')) frag.append(EB.h('strong', null, parte.slice(2, -2)));
      else if (parte.startsWith('`')) frag.append(EB.formula(parte.slice(1, -1), { inline: true }));
      else if (parte.startsWith('[[')) frag.append(voce(parte.slice(2, -2), ctx));
      else if (parte.startsWith('*')) frag.append(EB.h('em', null, parte.slice(1, -1)));
      else frag.append(parte);
    });
    return frag;
  };

  EB.paragrafi = function (lista, ctx) {
    return (lista || []).map((p) => EB.h('p', null, EB.testo(p, ctx)));
  };

  function voce(dentro, ctx) {
    const [visibile, chiave] = dentro.split('|');
    const g = EB.glossario[(chiave || visibile).trim().toLowerCase()];
    if (!g) return visibile;
    return EB.h('button', {
      type: 'button',
      class: 'eb-voce',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'data-voce': g.termine.toLowerCase(),
      'data-cap': ctx && ctx.capitolo ? ctx.capitolo : '',
    }, visibile);
  }

  // Un solo riquadro di definizione per tutta la pagina.
  let pop = null;
  let popDa = null;
  function chiudiVoce(rimettiFuoco) {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (popDa) {
      popDa.setAttribute('aria-expanded', 'false');
      if (rimettiFuoco) popDa.focus();
    }
    popDa = null;
  }
  function apriVoce(btn) {
    const g = EB.glossario[btn.dataset.voce];
    if (!g) return;
    if (!pop) {
      pop = EB.h('div', { class: 'eb-pop', role: 'dialog', id: 'eb-pop', hidden: true });
      document.body.append(pop);
    }
    if (popDa === btn && !pop.hidden) { chiudiVoce(); return; }
    chiudiVoce();
    pop.innerHTML = '';
    pop.setAttribute('aria-label', g.termine);
    const cap = EB.capitoli[g.capitolo];
    pop.append(
      EB.h('p', { class: 'eb-pop-t' }, g.termine),
      EB.h('p', null, EB.testo(g.definizione)),
      cap && g.capitolo !== btn.dataset.cap ? EB.h('a', { href: '#' + g.capitolo, class: 'eb-pop-link' }, 'Capitolo: ' + (EB.titoloCapitolo ? EB.titoloCapitolo(g.capitolo) : g.capitolo) + ' →') : null,
      EB.h('a', { href: '#glossario', class: 'eb-pop-link muted' }, 'Tutto il glossario'));
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-controls', 'eb-pop');
    popDa = btn;
    const r = btn.getBoundingClientRect();
    const larg = Math.min(320, document.documentElement.clientWidth - 24);
    pop.style.width = larg + 'px';
    const x = EB.clamp(r.left + root.scrollX + r.width / 2 - larg / 2, root.scrollX + 12, root.scrollX + document.documentElement.clientWidth - larg - 12);
    pop.style.left = x + 'px';
    pop.style.top = (r.bottom + root.scrollY + 8) + 'px';
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.eb-voce');
    if (b) { e.preventDefault(); apriVoce(b); return; }
    if (pop && !pop.hidden && !pop.contains(e.target)) chiudiVoce();
    if (e.target.closest && e.target.closest('.eb-pop-link')) chiudiVoce();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chiudiVoce(true);
  });
  EB.chiudiVoce = chiudiVoce;

  /* ---------- formule con le grandezze colorate ---------- */

  // Ogni grandezza ha sempre lo stesso colore: V tensione, I corrente, R resistenza...
  // I pedici numerici e i suffissi tot, eff, max, min, x prendono il colore della grandezza base:
  // V₁ e Vtot come V, q₂ come q, Rx come R. Le costanti con valore '' restano neutre (ε₀ non è una tensione).
  const GRANDEZZE = {
    V: 'v', U: 'v', ε: 'v', Vp: 'v', Vs: 'v', Vpicco: 'v',
    I: 'i', Ip: 'i', Is: 'i',
    R: 'r', Req: 'r', ρ: 'r',
    P: 'p', E: 'p', W: 'p',
    Q: 'q', q: 'q', C: 'q', e: 'q',
    B: 'b', Φ: 'b', L: 'b', N: 'b', Np: 'b', Ns: 'b',
    F: 'f', t: 't', f: 't', T: 't', τ: 't',
    ε0: '', 'ε₀': '', εr: '',
  };
  function grandezza(p) {
    if (p in GRANDEZZE) return GRANDEZZE[p];
    const base = p.replace(/(?:[₀-₉0-9]+|tot|eff|max|min|x)$/, '');
    return base !== p && base in GRANDEZZE ? GRANDEZZE[base] : null;
  }

  EB.formula = function (testo, opzioni) {
    const o = opzioni || {};
    const el = EB.h(o.inline ? 'code' : 'div', { class: o.inline ? 'eb-f eb-f-in' : 'eb-f' });
    String(testo).split(/([A-Za-zΦτεργ][A-Za-z0-9₀-₉]*)/).forEach((p) => {
      if (!p) return;
      const g = grandezza(p);
      if (g) el.append(EB.h('var', { class: 'q-' + g }, p));
      else if (g === '' || /^[A-Za-zΦτεργ][₀-₉0-9]?$/.test(p)) el.append(EB.h('var', null, p));
      else el.append(p);
    });
    return el;
  };

  /* ---------- tela e ciclo di animazione ---------- */

  // Canvas nitido sugli schermi ad alta densità, ridimensionato col contenitore.
  EB.tela = function (contenitore, opzioni) {
    const o = Object.assign({ rapporto: 16 / 9, min: 220, max: 520, etichetta: '' }, opzioni);
    const canvas = EB.h('canvas', { class: 'eb-tela', role: 'img', 'aria-label': o.etichetta });
    contenitore.append(canvas);
    const t = { canvas: canvas, ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1, alRidimensiona: null };
    function misura() {
      const w = Math.max(200, contenitore.clientWidth);
      const hh = EB.clamp(Math.round(w / o.rapporto), o.min, o.max);
      const dpr = Math.min(2.5, root.devicePixelRatio || 1);
      if (w === t.w && hh === t.h && dpr === t.dpr) return;
      t.w = w; t.h = hh; t.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
      canvas.style.height = hh + 'px';
      t.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (t.alRidimensiona) t.alRidimensiona(w, hh);
    }
    t.misura = misura;
    if ('ResizeObserver' in root) {
      t.ro = new ResizeObserver(() => misura());
      t.ro.observe(contenitore);
    }
    misura();
    t.distruggi = () => { if (t.ro) t.ro.disconnect(); };
    return t;
  };

  // Ciclo rAF che si ferma quando il laboratorio esce dallo schermo o la scheda è nascosta.
  EB.ciclo = function (elemento, passo) {
    let attivo = false;
    let visibile = true;
    let raf = 0;
    let ultimo = 0;
    let tempo = 0;
    function frame(ora) {
      raf = 0;
      if (!attivo || !visibile || document.hidden) return;
      const dt = Math.min(0.05, Math.max(0, (ora - ultimo) / 1000));
      ultimo = ora;
      tempo += dt;
      passo(dt, tempo);
      raf = requestAnimationFrame(frame);
    }
    function riprendi() {
      if (attivo && visibile && !document.hidden && !raf) {
        ultimo = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    let io = null;
    if ('IntersectionObserver' in root) {
      io = new IntersectionObserver((e) => { visibile = e[0].isIntersecting; riprendi(); }, { rootMargin: '120px' });
      io.observe(elemento);
    }
    const vis = () => riprendi();
    document.addEventListener('visibilitychange', vis);
    return {
      avvia() { attivo = true; riprendi(); },
      ferma() { attivo = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      get attivo() { return attivo; },
      distruggi() {
        attivo = false;
        if (raf) cancelAnimationFrame(raf);
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', vis);
      },
    };
  };

  /* ---------- trascinamento ---------- */

  // Coordinate di un evento puntatore nel sistema del viewBox di un SVG.
  EB.puntoSvg = function (svg, e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };

  /*
   * Rende trascinabile un elemento SVG con mouse, dito o penna, e spostabile con le frecce
   * (Maiusc + freccia = passo più lungo). Opzioni:
   *   svg            l'SVG che definisce le coordinate
   *   muovi(x, y)    nuova posizione assoluta durante il trascinamento
   *   sposta(dx, dy) spostamento da tastiera
   *   inizio(), fine()  facoltativi
   *   etichetta      testo per gli screen reader ("Carica positiva: usa le frecce per spostarla")
   *   passo          passo da tastiera in unità del viewBox (predefinito 6)
   * Restituisce una funzione che rimuove gli ascoltatori.
   */
  EB.trascina = function (el, o) {
    let attivo = false;
    el.style.touchAction = 'none';
    el.classList.add('eb-trascinabile');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    if (o.etichetta) el.setAttribute('aria-label', o.etichetta);
    const giu = (e) => {
      attivo = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('in-presa');
      if (o.inizio) o.inizio();
      const p = EB.puntoSvg(o.svg, e);
      o.muovi(p.x, p.y);
      e.preventDefault();
    };
    const muovi = (e) => {
      if (!attivo) return;
      const p = EB.puntoSvg(o.svg, e);
      o.muovi(p.x, p.y);
    };
    const su = () => {
      if (!attivo) return;
      attivo = false;
      el.classList.remove('in-presa');
      if (o.fine) o.fine();
    };
    const tasto = (e) => {
      const passo = (o.passo || 6) * (e.shiftKey ? 4 : 1);
      const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
      if (!d || !o.sposta) return;
      e.preventDefault();
      o.sposta(d[0], d[1]);
      if (o.fine) o.fine();
    };
    el.addEventListener('pointerdown', giu);
    el.addEventListener('pointermove', muovi);
    el.addEventListener('pointerup', su);
    el.addEventListener('pointercancel', su);
    el.addEventListener('keydown', tasto);
    return () => {
      el.removeEventListener('pointerdown', giu);
      el.removeEventListener('pointermove', muovi);
      el.removeEventListener('pointerup', su);
      el.removeEventListener('pointercancel', su);
      el.removeEventListener('keydown', tasto);
    };
  };

  /* ---------- controlli ---------- */

  const ui = {};
  EB.ui = ui;

  /*
   * Cursore con valore leggibile. Tre modi:
   *   { min, max, passo }        scala lineare
   *   { min, max, scala: 'log' } scala logaritmica, per grandezze che vanno da 1 a 1000 e oltre
   *   { valori: [10, 12, 15] }   solo i valori dell'elenco (per esempio la serie E12), un passo per tasto
   */
  ui.cursore = function (o) {
    const id = o.id || EB.uid('cur');
    const log = o.scala === 'log';
    const lista = Array.isArray(o.valori) ? o.valori : null;
    const fmt = o.formato || ((v) => EB.fmt(v, o.unita || ''));
    const vicino = (v) => lista.reduce((best, x, k) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(lista[best] / v)) ? k : best), 0);
    const dalValore = (v) => {
      if (lista) return vicino(v);
      return log ? 1000 * Math.log(v / o.min) / Math.log(o.max / o.min) : v;
    };
    const alValore = (x) => {
      if (lista) return lista[Math.round(+x)];
      if (!log) return +x;
      let v = o.min * Math.pow(o.max / o.min, x / 1000);
      if (o.arrotonda) v = o.arrotonda(v);
      return v;
    };
    const input = EB.h('input', {
      type: 'range', id: id,
      min: lista || log ? 0 : o.min,
      max: lista ? lista.length - 1 : log ? 1000 : o.max,
      step: lista || log ? 1 : (o.passo || 'any'),
      value: dalValore(o.valore),
    });
    const out = EB.h('output', { for: id });
    const el = EB.h('div', { class: 'eb-cursore' + (o.grandezza ? ' q-' + o.grandezza : '') },
      EB.h('label', { for: id }, EB.h('span', null, o.etichetta), out),
      input);
    let valore = o.valore;
    function mostra() {
      const testo = fmt(valore);
      out.textContent = testo;
      input.setAttribute('aria-valuetext', testo.replace(/ /g, ' '));
      const p = (+input.value - +input.min) / (+input.max - +input.min);
      input.style.setProperty('--p', (p * 100).toFixed(2) + '%');
    }
    input.addEventListener('input', () => {
      valore = alValore(input.value);
      mostra();
      if (o.cambia) o.cambia(valore);
    });
    mostra();
    return {
      el: el,
      input: input,
      get valore() { return valore; },
      imposta(v, silenzioso) {
        valore = v;
        input.value = dalValore(v);
        mostra();
        if (!silenzioso && o.cambia) o.cambia(valore);
      },
    };
  };

  // Gruppo di scelte esclusive (pulsanti radio con l'aspetto di un selettore).
  ui.scelta = function (o) {
    const nome = EB.uid('scelta');
    let valore = o.valore;
    const el = EB.h('fieldset', { class: 'eb-scelta' }, EB.h('legend', null, o.etichetta));
    const radio = o.opzioni.map((op) => {
      const r = EB.h('input', { type: 'radio', name: nome, value: String(op.valore), checked: op.valore === valore });
      r.addEventListener('change', () => {
        if (!r.checked) return;
        valore = op.valore;
        if (o.cambia) o.cambia(valore);
      });
      el.append(EB.h('label', null, r, EB.h('span', null, op.etichetta)));
      return { r: r, op: op };
    });
    return {
      el: el,
      get valore() { return valore; },
      imposta(v, silenzioso) {
        valore = v;
        radio.forEach((x) => { x.r.checked = x.op.valore === v; });
        if (!silenzioso && o.cambia) o.cambia(valore);
      },
    };
  };

  // Interruttore acceso/spento (role="switch").
  ui.interruttore = function (o) {
    let acceso = !!o.acceso;
    const b = EB.h('button', { type: 'button', role: 'switch', class: 'eb-switch', 'aria-checked': String(acceso) },
      EB.h('span', { class: 'eb-switch-track', 'aria-hidden': 'true' }, EB.h('span', { class: 'eb-switch-dot' })),
      EB.h('span', null, o.etichetta));
    b.addEventListener('click', () => {
      acceso = !acceso;
      b.setAttribute('aria-checked', String(acceso));
      if (o.cambia) o.cambia(acceso);
    });
    return {
      el: b,
      get acceso() { return acceso; },
      imposta(v, silenzioso) {
        acceso = !!v;
        b.setAttribute('aria-checked', String(acceso));
        if (!silenzioso && o.cambia) o.cambia(acceso);
      },
    };
  };

  ui.bottone = function (o) {
    return EB.h('button', { type: 'button', class: 'eb-btn' + (o.primario ? ' primario' : ''), onclick: o.click, 'aria-label': o.aria || null },
      o.icona ? EB.h('span', { 'aria-hidden': 'true', class: 'eb-btn-ico' }, o.icona) : null, o.etichetta);
  };

  // Lettura digitale da strumento: etichetta piccola, valore grande a cifre fisse.
  // nota(testo) cambia la riga piccola sotto il valore (la crea se manca, la toglie se il testo è vuoto).
  ui.lettura = function (o) {
    const val = EB.h('span', { class: 'eb-lettura-v' }, o.valore || '–');
    let notaEl = o.nota ? EB.h('span', { class: 'eb-lettura-n' }, o.nota) : null;
    const el = EB.h('div', { class: 'eb-lettura' + (o.grandezza ? ' q-' + o.grandezza : '') },
      EB.h('span', { class: 'eb-lettura-l' }, o.etichetta), val, notaEl);
    let ultimo = val.textContent;
    return {
      el: el,
      imposta(testo) {
        if (testo === ultimo) return;
        ultimo = testo;
        val.textContent = testo;
        if (!EB.ridotto()) {
          el.classList.remove('cambia');
          void el.offsetWidth;
          el.classList.add('cambia');
        }
      },
      nota(testo) {
        if (!testo) { if (notaEl) { notaEl.remove(); notaEl = null; } return; }
        if (!notaEl) { notaEl = EB.h('span', { class: 'eb-lettura-n' }); el.append(notaEl); }
        notaEl.textContent = testo;
      },
    };
  };

  // Formula che mostra i numeri del momento: [['I', 'i'], ' = ', ['12 V', 'v'], ...]; '\n' va a capo.
  ui.formulaViva = function () {
    const el = EB.h('p', { class: 'eb-f eb-f-viva', 'aria-live': 'off' });
    return {
      el: el,
      imposta(parti) {
        el.innerHTML = '';
        parti.forEach((p) => {
          if (Array.isArray(p)) el.append(EB.h('var', { class: 'q-' + p[1] }, p[0]));
          else if (p === '\n') el.append(EB.h('br'));
          else el.append(p);
        });
      },
    };
  };

  /* ---------- sfide e avanzamento ---------- */

  const STORE = 'eb-sfide';
  function sfideFatte() {
    try { return new Set(JSON.parse(root.localStorage.getItem(STORE) || '[]')); } catch (e) { return new Set(); }
  }
  EB.sfideFatte = sfideFatte;
  EB.segnaSfida = function (chiave) {
    const s = sfideFatte();
    if (s.has(chiave)) return false;
    s.add(chiave);
    try { root.localStorage.setItem(STORE, JSON.stringify([...s])); } catch (e) { /* archiviazione non disponibile */ }
    document.dispatchEvent(new CustomEvent('eb:sfida', { detail: { chiave: chiave } }));
    return true;
  };

  /* ---------- cornice del laboratorio ---------- */

  /*
   * Monta il laboratorio descritto nel capitolo ({ id, titolo, consegna, sfide })
   * dentro "dove". Il laboratorio registrato riceve un contesto ctx con:
   *   ctx.scena, ctx.pannello, ctx.comandi   contenitori da riempire
   *   ctx.nota(testo)                         spiegazione dinamica (letta dagli screen reader)
   *   ctx.completa(idSfida)                   segna una sfida come superata
   *   ctx.ciclo(fn)                           ciclo di animazione già gestito
   *   ctx.tela(opzioni)                       canvas nitido nella scena
   *   ctx.su(bersaglio, evento, fn)           ascoltatore rimosso da solo allo smontaggio
   *   ctx.ridotto                             true se l'utente preferisce meno movimento
   * monta(ctx) può restituire { distruggi() }.
   */
  EB.montaLaboratorio = function (dove, cfg, capId) {
    const id = cfg.id;
    const titoloId = EB.uid('lab');
    const fatte = sfideFatte();
    const sfide = (cfg.sfide || []).map((sf) => {
      const chiave = id + ':' + sf.id;
      const li = EB.h('li', { class: fatte.has(chiave) ? 'fatta' : '', 'data-sfida': sf.id },
        EB.h('span', { class: 'eb-sfida-box', 'aria-hidden': 'true' }),
        EB.h('span', null, EB.testo(sf.testo)),
        EB.h('span', { class: 'sr-only eb-sfida-stato' }, fatte.has(chiave) ? ' (superata)' : ''));
      return { def: sf, chiave: chiave, li: li };
    });
    const scena = EB.h('div', { class: 'eb-lab-scena' });
    const pannello = EB.h('div', { class: 'eb-lab-pannello' });
    const comandi = EB.h('div', { class: 'eb-lab-comandi' });
    const nota = EB.h('p', { class: 'eb-lab-nota', 'aria-live': 'polite' });
    const annuncio = EB.h('p', { class: 'sr-only', 'aria-live': 'assertive' });
    const reset = EB.h('button', { type: 'button', class: 'eb-lab-reset', 'aria-label': 'Ricomincia il laboratorio ' + (cfg.titolo || '') }, '↺ Ricomincia');
    const conta = EB.h('span', { class: 'eb-lab-conta' });
    const box = EB.h('section', { class: 'eb-lab', 'aria-labelledby': titoloId, 'data-lab': id },
      EB.h('header', { class: 'eb-lab-testa' },
        EB.h('div', null,
          EB.h('p', { class: 'eb-lab-kicker' }, 'Laboratorio'),
          EB.h('h2', { id: titoloId }, cfg.titolo || 'Laboratorio')),
        reset,
        cfg.consegna ? EB.h('p', { class: 'eb-lab-consegna' }, EB.testo(cfg.consegna, { capitolo: capId })) : null),
      EB.h('div', { class: 'eb-lab-corpo' }, scena, pannello),
      comandi,
      nota,
      sfide.length ? EB.h('div', { class: 'eb-lab-sfide' },
        EB.h('p', { class: 'eb-lab-sfide-t' }, 'Sfide ', conta),
        EB.h('ol', null, sfide.map((x) => x.li))) : null,
      annuncio);
    dove.append(box);

    function aggiornaConta() {
      const n = sfide.filter((x) => x.li.classList.contains('fatta')).length;
      conta.textContent = n + '/' + sfide.length;
      box.classList.toggle('completo', sfide.length > 0 && n === sfide.length);
    }
    aggiornaConta();

    let istanza = null;
    let pulizie = [];
    function smonta() {
      pulizie.forEach((fn) => { try { fn(); } catch (e) { /* già smontato */ } });
      pulizie = [];
      if (istanza && istanza.distruggi) { try { istanza.distruggi(); } catch (e) { /* ignora */ } }
      istanza = null;
      scena.innerHTML = '';
      pannello.innerHTML = '';
      comandi.innerHTML = '';
      nota.textContent = '';
    }
    function monta() {
      const def = EB.laboratori[id];
      if (!def) {
        box.classList.add('vuoto');
        scena.append(EB.h('p', { class: 'eb-lab-stato' }, 'Questo laboratorio è in preparazione.'));
        return;
      }
      const ctx = {
        id: id,
        capitolo: capId,
        box: box,
        scena: scena,
        pannello: pannello,
        comandi: comandi,
        ridotto: EB.ridotto(),
        h: EB.h,
        s: EB.s,
        ui: ui,
        F: F,
        fmt: EB.fmt,
        num: EB.num,
        nota(testo) { nota.textContent = ''; nota.append(EB.testo(testo, { capitolo: capId })); },
        completa(sfidaId) {
          const x = sfide.find((y) => y.def.id === sfidaId);
          if (!x || x.li.classList.contains('fatta')) return;
          x.li.classList.add('fatta', 'appena');
          x.li.querySelector('.eb-sfida-stato').textContent = ' (superata)';
          annuncio.textContent = 'Sfida superata: ' + x.li.textContent.replace(' (superata)', '');
          EB.segnaSfida(x.chiave);
          aggiornaConta();
        },
        fatta(sfidaId) {
          const x = sfide.find((y) => y.def.id === sfidaId);
          return !!(x && x.li.classList.contains('fatta'));
        },
        ciclo(fn) {
          const c = EB.ciclo(box, fn);
          pulizie.push(() => c.distruggi());
          return c;
        },
        tela(opzioni) {
          const t = EB.tela(scena, opzioni);
          pulizie.push(() => t.distruggi());
          return t;
        },
        su(bersaglio, evento, fn, opz) {
          bersaglio.addEventListener(evento, fn, opz);
          pulizie.push(() => bersaglio.removeEventListener(evento, fn, opz));
        },
        pulizia(fn) { pulizie.push(fn); },
      };
      try {
        istanza = def.monta(ctx) || null;
      } catch (err) {
        smonta();
        box.classList.add('errore');
        scena.append(EB.h('p', { class: 'eb-lab-stato' }, 'Il laboratorio non è partito. Prova a ricaricare la pagina.'));
        if (root.console) console.error('Laboratorio ' + id + ':', err);
      }
    }
    reset.addEventListener('click', () => { smonta(); box.classList.remove('errore', 'vuoto'); monta(); });
    monta();
    return { box: box, distruggi: smonta };
  };
})(window);
