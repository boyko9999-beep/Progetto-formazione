/*
 * Storia del PC · pagina.
 * Disegna i capitoli registrati con StoriaPC.registra, l'indice con
 * l'avanzamento di lettura, la linea del tempo, e accende ogni laboratorio
 * solo quando entra nello schermo (lo sospende quando esce).
 */
(function () {
  'use strict';

  const P = window.StoriaPC;
  const { h } = P;
  const STORE = 'enciclopedia-storia-pc-letti';
  const capitoli = P.capitoli.slice().sort((a, b) => a.numero - b.numero);
  const elCapitoli = document.getElementById('spc-capitoli');
  const elRail = document.getElementById('spc-rail');
  const labs = [];
  const labPerEl = new Map();

  /* ---------- progressi (solo comodità locale) ---------- */

  function letti() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch (e) { return new Set(); }
  }

  function segnaLetto(id) {
    const l = letti();
    if (l.has(id)) return;
    l.add(id);
    try { localStorage.setItem(STORE, JSON.stringify([...l])); } catch (e) { /* storage non disponibile */ }
    aggiornaProgressi();
  }

  function aggiornaProgressi() {
    const l = letti();
    const n = capitoli.filter((c) => l.has(c.id)).length;
    const testo = document.getElementById('progress');
    const barra = document.getElementById('progress-bar');
    if (testo) testo.textContent = n + '/' + capitoli.length + ' capitoli';
    if (barra) barra.style.width = (capitoli.length ? (100 * n / capitoli.length) : 0) + '%';
    elRail.querySelectorAll('[data-cap]').forEach((a) => a.classList.toggle('letto', l.has(a.dataset.cap)));
    if (window.Enciclopedia && typeof window.Enciclopedia.progresso === 'function') {
      try { window.Enciclopedia.progresso('storia-pc', n, capitoli.length); } catch (e) { /* hub assente */ }
    }
  }

  /* ---------- blocchi di contenuto ---------- */

  function paragrafi(lista) {
    return (lista || []).map((p) => h('p', { html: p }));
  }

  const BLOCCHI = {
    testo(b) {
      return h('div', { class: 'spc-testo' }, b.titolo ? h('h3', { html: b.titolo }) : null, paragrafi(b.paragrafi));
    },

    figura(b) {
      let grafica = null;
      try {
        const v = typeof b.svg === 'function' ? b.svg(P) : b.svg;
        grafica = typeof v === 'string' ? P.svgDaTesto(v) : v;
      } catch (err) {
        console.error('Figura non disegnata:', b.didascalia, err);
      }
      if (grafica) {
        grafica.setAttribute('role', 'img');
        if (b.alt) grafica.setAttribute('aria-label', b.alt);
        grafica.classList.add('spc-ill');
      }
      return h('figure', { class: 'spc-figura' + (b.larga ? ' larga' : '') },
        h('div', { class: 'spc-figura-tela' }, grafica),
        b.didascalia ? h('figcaption', { html: b.didascalia }) : null);
    },

    schede(b) {
      return h('div', { class: 'spc-schede' },
        b.titolo ? h('h3', { html: b.titolo }) : null,
        h('ol', { class: 'spc-schede-lista' }, (b.items || []).map((it) => h('li', { class: 'scheda' + (it.italia ? ' italia' : '') },
          h('span', { class: 'scheda-anno' }, String(it.anno)),
          h('h4', { class: 'scheda-nome', html: it.nome }),
          it.luogo ? h('p', { class: 'scheda-luogo' }, it.luogo) : null,
          h('p', { class: 'scheda-testo', html: it.testo }),
          it.italia ? h('span', { class: 'scheda-italia', title: 'Storia italiana' }, 'Italia') : null))));
    },

    citazione(b) {
      return h('blockquote', { class: 'spc-citazione' },
        h('p', { html: b.testo }),
        h('footer', null, b.autore, b.fonte ? [', ', h('cite', { html: b.fonte })] : null));
    },

    numeri(b) {
      return h('div', { class: 'spc-numeri' }, (b.items || []).map((it) => h('div', { class: 'numero' },
        h('span', { class: 'numero-val' },
          it.prefisso ? h('span', { class: 'numero-pre' }, it.prefisso) : null,
          typeof it.valore === 'number'
            ? h('span', { class: 'numero-cifra', 'data-to': it.valore, 'data-dec': it.decimali || 0 }, P.formato(it.valore, it.decimali || 0))
            : h('span', { class: 'numero-cifra' }, String(it.valore)),
          it.unita ? h('span', { class: 'numero-unita' }, it.unita) : null),
        h('span', { class: 'numero-etichetta', html: it.etichetta }))));
    },

    nota(b) {
      return h('aside', { class: 'spc-nota' },
        h('p', { class: 'spc-nota-tit' }, b.titolo || 'Lo sapevi?'),
        paragrafi(b.paragrafi || [b.testo]));
    },

    italia(b) {
      return h('aside', { class: 'spc-italia' },
        h('p', { class: 'spc-italia-tag' }, h('span', { class: 'tricolore', 'aria-hidden': 'true' }), 'Il filo italiano'),
        b.titolo ? h('h4', { html: b.titolo }) : null,
        paragrafi(b.paragrafi || [b.testo]));
    },

    confronto(b) {
      return h('div', { class: 'spc-tabella' },
        h('table', null,
          b.titolo ? h('caption', { html: b.titolo }) : null,
          h('thead', null, h('tr', null, (b.colonne || []).map((c) => h('th', { scope: 'col', html: c })))),
          h('tbody', null, (b.righe || []).map((r) => h('tr', null, r.map((v, i) => (i === 0
            ? h('th', { scope: 'row', html: String(v) })
            : h('td', { html: String(v) }))))))));
    },

    lab(b, cap) {
      const lab = cap.lab || {};
      const idTit = 'lab-' + cap.id + '-titolo';
      const stage = h('div', { class: 'lab-stage' });
      const fig = h('figure', { class: 'lab', id: 'lab-' + cap.id, 'aria-labelledby': idTit },
        h('figcaption', { class: 'lab-bar' },
          h('span', { class: 'lab-tag' }, 'Lab'),
          h('strong', { class: 'lab-title', id: idTit, html: lab.titolo || 'Laboratorio' }),
          lab.sottotitolo ? h('span', { class: 'lab-sub', html: lab.sottotitolo }) : null),
        stage);
      if (typeof lab.crea === 'function') {
        const voce = { cap: cap, el: fig, stage: stage, istanza: null, visibile: false };
        labs.push(voce);
        labPerEl.set(fig, voce);
      } else {
        stage.append(h('p', { class: 'lab-errore' }, 'Laboratorio in preparazione.'));
      }
      return fig;
    },
  };

  function blocco(b, cap) {
    const fn = BLOCCHI[b && b.tipo];
    if (!fn) { console.warn('Tipo di blocco sconosciuto in', cap.id, b); return null; }
    try {
      const el = fn(b, cap);
      if (el) el.classList.add('reveal');
      return el;
    } catch (err) {
      console.error('Blocco non disegnato in', cap.id, err);
      return null;
    }
  }

  /* ---------- capitoli ---------- */

  function numero2(n) { return String(n).padStart(2, '0'); }

  // Minuti di lettura stimati (circa 200 parole al minuto, laboratorio escluso).
  function minutiLettura(cap) {
    const pezzi = [cap.intro];
    (cap.blocchi || []).forEach((b) => {
      pezzi.push(b.titolo, b.testo, b.didascalia);
      (b.paragrafi || []).forEach((p) => pezzi.push(p));
      (b.items || []).forEach((it) => pezzi.push(it.nome, it.testo, it.etichetta));
    });
    (cap.punti || []).forEach((p) => pezzi.push(p));
    const parole = pezzi.filter(Boolean).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(parole / 200));
  }

  function capitolo(cap, i) {
    const idTit = cap.id + '-titolo';
    const prec = capitoli[i - 1];
    const succ = capitoli[i + 1];
    const blocchi = (cap.blocchi || []).slice();
    if (cap.lab && !blocchi.some((b) => b.tipo === 'lab')) blocchi.push({ tipo: 'lab' });
    return h('section', { class: 'cap', id: cap.id, 'data-cap': cap.id, 'aria-labelledby': idTit, style: '--cap:' + (cap.colore || 'var(--c-pc)') },
      h('header', { class: 'cap-head reveal' },
        h('p', { class: 'cap-meta' },
          h('span', { class: 'cap-num' }, 'Capitolo ' + numero2(cap.numero)),
          cap.periodo ? h('span', { class: 'cap-periodo' }, cap.periodo) : null,
          h('span', { class: 'cap-tempo' }, '≈ ' + minutiLettura(cap) + ' min di lettura' + (cap.lab ? ' + laboratorio' : ''))),
        h('h2', { id: idTit, html: cap.titolo }),
        cap.intro ? h('p', { class: 'cap-intro', html: cap.intro }) : null),
      blocchi.map((b) => blocco(b, cap)),
      cap.punti && cap.punti.length ? h('aside', { class: 'cap-punti reveal', 'aria-label': 'Punti chiave' },
        h('h3', null, 'Punti chiave'),
        h('ul', null, cap.punti.map((p) => h('li', { html: p })))) : null,
      cap.collegamenti && cap.collegamenti.length ? h('nav', { class: 'cap-link reveal', 'aria-label': 'Approfondimenti' },
        h('span', { class: 'cap-link-tit' }, 'Approfondisci'),
        cap.collegamenti.map((l) => h('a', { class: 'cap-link-voce ' + (l.tipo || ''), href: l.href }, l.testo))) : null,
      h('div', { class: 'cap-fine', 'data-fine': cap.id, 'aria-hidden': 'true' }),
      h('nav', { class: 'cap-pager', 'aria-label': 'Capitoli vicini' },
        prec ? h('a', { class: 'prec', href: '#' + prec.id }, h('small', null, '← capitolo ' + prec.numero), h('span', { html: prec.breve || prec.titolo })) : h('span'),
        succ ? h('a', { class: 'succ', href: '#' + succ.id }, h('small', null, 'capitolo ' + succ.numero + ' →'), h('span', { html: succ.breve || succ.titolo }))
          : h('a', { class: 'succ', href: '#linea-del-tempo' }, h('small', null, 'per finire →'), h('span', null, 'La linea del tempo'))));
  }

  /* ---------- indice laterale ---------- */

  function disegnaRail() {
    elRail.replaceChildren(
      h('p', { class: 'rail-tit' }, 'Capitoli'),
      h('ol', { class: 'rail-lista' }, capitoli.map((c) => h('li', null,
        h('a', { href: '#' + c.id, 'data-cap': c.id, style: '--cap:' + (c.colore || 'var(--c-pc)') },
          h('span', { class: 'rail-num' }, numero2(c.numero)),
          h('span', { class: 'rail-testo' },
            h('span', { class: 'rail-nome', html: c.breve || c.titolo }),
            c.periodo ? h('span', { class: 'rail-per' }, c.periodo) : null),
          h('span', { class: 'rail-barra', 'aria-hidden': 'true' }, h('i')))))),
      h('a', { class: 'rail-tempo', href: '#linea-del-tempo', 'data-cap': 'linea-del-tempo' },
        h('span', { class: 'rail-num' }, '⟶'), h('span', { class: 'rail-testo' }, h('span', { class: 'rail-nome' }, 'Linea del tempo'))));
  }

  /* ---------- linea del tempo (dalle schede di tutti i capitoli) ---------- */

  function lineaDelTempo() {
    const eventi = [];
    capitoli.forEach((c) => (c.blocchi || []).forEach((b) => {
      if (b.tipo !== 'schede') return;
      (b.items || []).forEach((it) => { if (typeof it.anno === 'number') eventi.push(Object.assign({ cap: c }, it)); });
    }));
    eventi.sort((a, b) => a.anno - b.anno || a.cap.numero - b.cap.numero);

    const sezione = h('section', { class: 'spc-tempo', id: 'linea-del-tempo', 'data-cap': 'linea-del-tempo', 'aria-labelledby': 'tempo-titolo' });
    if (!eventi.length) return sezione;

    const min = Math.floor(eventi[0].anno / 10) * 10;
    const max = Math.ceil((eventi[eventi.length - 1].anno + 1) / 10) * 10;
    const stato = { filtro: 'tutti' };

    const nastro = h('div', { class: 'tempo-nastro', 'aria-hidden': 'true' });
    for (let d = min; d <= max; d += 10) {
      nastro.append(h('span', { class: 'tempo-tacca', style: 'left:' + (100 * (d - min) / (max - min)) + '%' }, String(d)));
    }
    // I punti vicini si impilano in righe, così non si coprono.
    const righe = [];
    const punti = eventi.map((e) => {
      const x = 100 * (e.anno - min) / (max - min);
      let r = righe.findIndex((ultimo) => x - ultimo >= 1.4);
      if (r < 0) { r = righe.length < 4 ? righe.length : righe.indexOf(Math.min(...righe)); }
      righe[r] = x;
      const p = h('span', { class: 'tempo-punto' + (e.italia ? ' italia' : ''), style: 'left:' + x + '%;--cap:' + (e.cap.colore || 'var(--c-pc)') + ';--riga:' + r });
      nastro.append(p);
      return p;
    });

    const lista = h('ol', { class: 'tempo-lista' });
    const voci = [];
    let decennio = null;
    eventi.forEach((e, i) => {
      const d = Math.floor(e.anno / 10) * 10;
      if (d !== decennio) {
        decennio = d;
        lista.append(h('li', { class: 'tempo-decennio reveal', 'data-dec': d }, 'Anni ' + String(d).slice(2) + ' · ' + d));
      }
      const li = h('li', { class: 'tempo-evento reveal' + (e.italia ? ' italia' : ''), style: '--cap:' + (e.cap.colore || 'var(--c-pc)'), 'data-cap': e.cap.id },
        h('span', { class: 'tempo-anno' }, String(e.anno)),
        h('div', { class: 'tempo-corpo' },
          h('h3', { html: e.nome }),
          h('p', { class: 'tempo-dove' },
            h('a', { href: '#' + e.cap.id, class: 'tempo-cap' }, 'Cap. ' + e.cap.numero + ' · ' + (e.cap.breve || e.cap.titolo).replace(/<[^>]+>/g, '')),
            e.italia ? h('span', { class: 'scheda-italia' }, 'Italia') : null),
          h('p', { html: e.testo })));
      li.__punto = punti[i];
      voci.push(li);
      lista.append(li);
    });

    const filtri = h('div', { class: 'tempo-filtri', role: 'group', 'aria-label': 'Filtra gli eventi' });
    const opzioni = [{ id: 'tutti', nome: 'Tutti' }, { id: 'italia', nome: 'Il filo italiano' }]
      .concat(capitoli.map((c) => ({ id: c.id, nome: numero2(c.numero) + ' ' + (c.breve || c.titolo).replace(/<[^>]+>/g, ''), colore: c.colore })));
    opzioni.forEach((o) => {
      filtri.append(h('button', {
        type: 'button',
        class: 'tempo-filtro' + (o.id === 'italia' ? ' italia' : ''),
        'aria-pressed': o.id === 'tutti' ? 'true' : 'false',
        style: o.colore ? '--cap:' + o.colore : null,
        onclick: () => { stato.filtro = o.id; applica(); },
      }, o.nome));
    });

    function applica() {
      filtri.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(opzioni[i].id === stato.filtro)));
      const visibiliPerDec = new Map();
      voci.forEach((li, i) => {
        const e = eventi[i];
        const ok = stato.filtro === 'tutti' || (stato.filtro === 'italia' ? !!e.italia : e.cap.id === stato.filtro);
        li.hidden = !ok;
        li.__punto.classList.toggle('spento', !ok);
        const d = Math.floor(e.anno / 10) * 10;
        visibiliPerDec.set(d, (visibiliPerDec.get(d) || 0) + (ok ? 1 : 0));
        if (ok) li.classList.add('in');
      });
      lista.querySelectorAll('.tempo-decennio').forEach((d) => { d.hidden = !visibiliPerDec.get(Number(d.dataset.dec)); d.classList.add('in'); });
      P.annuncia(conteggio, voci.filter((v) => !v.hidden).length + ' eventi');
    }

    const conteggio = h('p', { class: 'tempo-conteggio', 'aria-live': 'polite' }, eventi.length + ' eventi');

    sezione.append(
      h('header', { class: 'cap-head reveal' },
        h('p', { class: 'cap-meta' }, h('span', { class: 'cap-num' }, 'Per finire'), h('span', { class: 'cap-periodo' }, eventi[0].anno + '–' + eventi[eventi.length - 1].anno)),
        h('h2', { id: 'tempo-titolo' }, 'La linea del tempo'),
        h('p', { class: 'cap-intro' }, 'Tutte le macchine, le persone e le idee dei capitoli, in ordine. Filtra per capitolo o segui il filo italiano.')),
      h('div', { class: 'tempo-testa reveal' }, nastro, filtri, conteggio),
      lista);
    return sezione;
  }

  /* ---------- numeri che contano ---------- */

  function contaNumeri(root) {
    const cifre = root.querySelectorAll('.numero-cifra[data-to]');
    if (!cifre.length) return;
    const avvia = (el) => {
      const to = Number(el.dataset.to);
      const dec = Number(el.dataset.dec) || 0;
      P.tween({ from: 0, to: to, dur: P.motion.dur.crawl * 1.4, ease: 'smooth', update: (v) => { el.textContent = P.formato(v, dec); } });
    };
    if (!('IntersectionObserver' in window) || P.ridotto()) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { avvia(e.target); io.unobserve(e.target); }
    }), { threshold: 0.6 });
    cifre.forEach((c) => { c.textContent = P.formato(0, Number(c.dataset.dec) || 0); io.observe(c); });
  }

  /* ---------- comparsa dolce dei blocchi ---------- */

  function rivela(root) {
    const items = root.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || P.ridotto()) { items.forEach((i) => i.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px' });
    items.forEach((i) => io.observe(i));
  }

  /* ---------- laboratori: creazione pigra, pausa fuori schermo ---------- */

  function creaLab(voce) {
    if (voce.istanza) return;
    try {
      const ctx = Object.assign({}, P, { capitolo: voce.cap });
      voce.istanza = voce.cap.lab.crea(voce.stage, ctx) || {};
      if (voce.visibile && typeof voce.istanza.attiva === 'function') voce.istanza.attiva();
    } catch (err) {
      console.error('Laboratorio non avviato:', voce.cap.id, err);
      voce.istanza = {};
      voce.stage.replaceChildren(h('p', { class: 'lab-errore' }, 'Questo laboratorio non si è avviato. Ricarica la pagina per riprovare.'));
    }
  }

  function chiama(voce, metodo) {
    const ist = voce.istanza;
    if (!ist || typeof ist[metodo] !== 'function') return;
    try { ist[metodo](); } catch (err) { console.error('Laboratorio', voce.cap.id, metodo, err); }
  }

  function osservaLab() {
    if (!('IntersectionObserver' in window)) {
      labs.forEach((v) => { v.visibile = true; creaLab(v); });
      return;
    }
    const vicino = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { creaLab(labPerEl.get(e.target)); vicino.unobserve(e.target); }
    }), { rootMargin: '600px 0px' });
    const visibile = new IntersectionObserver((entries) => entries.forEach((e) => {
      const v = labPerEl.get(e.target);
      v.visibile = e.isIntersecting;
      if (!v.istanza) { if (v.visibile) creaLab(v); return; }
      chiama(v, v.visibile ? 'attiva' : 'sospendi');
    }), { threshold: 0.02 });
    labs.forEach((v) => { vicino.observe(v.el); visibile.observe(v.el); });
    document.addEventListener('visibilitychange', () => {
      labs.forEach((v) => { if (v.visibile) chiama(v, document.hidden ? 'sospendi' : 'attiva'); });
    });
  }

  /* ---------- capitolo attivo e avanzamento ---------- */

  function seguiLettura() {
    const sezioni = [...elCapitoli.querySelectorAll('section[data-cap]')];
    const voci = new Map([...elRail.querySelectorAll('a[data-cap]')].map((a) => [a.dataset.cap, a]));
    let attivo = null;
    let richiesto = false;

    function aggiorna() {
      richiesto = false;
      const vh = window.innerHeight;
      const soglia = vh * 0.35;
      let corrente = null;
      for (const sez of sezioni) {
        const r = sez.getBoundingClientRect();
        if (r.top <= soglia) corrente = sez;
        const id = sez.dataset.cap;
        const a = voci.get(id);
        if (a && id !== 'linea-del-tempo') {
          const p = P.clamp((soglia - r.top) / Math.max(1, r.height - soglia), 0, 1);
          a.style.setProperty('--p', p.toFixed(3));
        }
      }
      const id = corrente ? corrente.dataset.cap : null;
      if (id !== attivo) {
        if (attivo && voci.get(attivo)) voci.get(attivo).removeAttribute('aria-current');
        attivo = id;
        const a = id && voci.get(id);
        if (a) {
          a.setAttribute('aria-current', 'location');
          // Sul telefono l'indice è una striscia orizzontale: porta in vista la voce attiva.
          const lista = elRail;
          if (lista.scrollWidth > lista.clientWidth + 4) {
            const x = a.offsetLeft - (lista.clientWidth - a.offsetWidth) / 2;
            lista.scrollTo({ left: Math.max(0, x), behavior: P.ridotto() ? 'auto' : 'smooth' });
          }
        }
      }
    }

    const onScroll = () => { if (!richiesto) { richiesto = true; requestAnimationFrame(aggiorna); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    aggiorna();

    // Un capitolo è "letto" quando se ne raggiunge la fine.
    if ('IntersectionObserver' in window) {
      const fine = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { segnaLetto(e.target.dataset.fine); fine.unobserve(e.target); }
      }));
      elCapitoli.querySelectorAll('[data-fine]').forEach((el) => fine.observe(el));
    }
  }

  // Altezza reale della barra in alto, per posizionare l'indice adesivo sotto di lei (--topbar-h),
  // e di tutto ciò che resta adesivo in cima, per gli elementi adesivi dei capitoli (--spc-cima).
  function misuraBarra() {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    const stretto = window.matchMedia('(max-width: 1080px)');
    const set = () => {
      // Sui telefoni la barra non è adesiva (lascia spazio al testo), ma lo è l'indice orizzontale dei capitoli.
      const barra = getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0;
      const indice = stretto.matches && elRail ? elRail.offsetHeight : 0;
      document.documentElement.style.setProperty('--topbar-h', barra + 'px');
      document.documentElement.style.setProperty('--spc-cima', (barra + indice) + 'px');
    };
    set();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(set);
      ro.observe(bar);
      if (elRail) ro.observe(elRail);
    } else window.addEventListener('resize', set);
  }

  /* ---------- figure: le animazioni CSS si fermano fuori dallo schermo ---------- */

  function fermaFigureFuori(root) {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      e.target.classList.toggle('fuori', !e.isIntersecting);
    }), { rootMargin: '120px 0px' });
    root.querySelectorAll('.spc-figura').forEach((f) => io.observe(f));
  }

  /* ---------- link ai capitoli: arrivo nel punto giusto ---------- */

  // I laboratori nascono quando si avvicinano allo schermo e allungano la pagina: dopo un salto a un
  // capitolo (dall'indice, dall'hub o da un'altra sezione) la pagina si assesta per un attimo e il
  // capitolo scivolerebbe via. Finché la pagina non si assesta, e finché chi legge non scorre da sé,
  // il capitolo resta allineato in cima.
  let tenuta = null;

  function tieniAllineato(id) {
    const dest = id && document.getElementById(id);
    if (!dest) return;
    if (tenuta) tenuta();
    const allinea = () => {
      const d = dest.getBoundingClientRect().top - (parseFloat(getComputedStyle(dest).scrollMarginTop) || 0);
      if (Math.abs(d) > 2) window.scrollBy(0, d);
    };
    const ro = 'ResizeObserver' in window ? new ResizeObserver(allinea) : null;
    if (ro) ro.observe(elCapitoli);
    const gesti = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    const fine = () => {
      if (ro) ro.disconnect();
      gesti.forEach((g) => window.removeEventListener(g, fine, true));
      clearTimeout(timer);
      tenuta = null;
    };
    gesti.forEach((g) => window.addEventListener(g, fine, { capture: true, passive: true }));
    const timer = setTimeout(fine, 2500);
    tenuta = fine;
    allinea();
  }

  function seguiAncore() {
    const daHash = () => tieniAllineato(decodeURIComponent(location.hash.slice(1)));
    window.addEventListener('hashchange', daHash);
    // Anche il secondo clic sullo stesso link (l'indirizzo non cambia, quindi niente hashchange).
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && a.getAttribute('href').length > 1) setTimeout(daHash, 0);
    });
    if (location.hash.length > 1) daHash();
  }

  /* ---------- avvio ---------- */

  function avvia() {
    misuraBarra();
    disegnaRail();
    const frammento = document.createDocumentFragment();
    capitoli.forEach((cap, i) => {
      try { frammento.append(capitolo(cap, i)); } catch (err) { console.error('Capitolo non disegnato:', cap.id, err); }
    });
    frammento.append(lineaDelTempo());
    elCapitoli.replaceChildren(frammento);
    aggiornaProgressi();
    rivela(document.getElementById('main'));
    contaNumeri(elCapitoli);
    fermaFigureFuori(elCapitoli);
    osservaLab();
    seguiLettura();
    const voce = document.getElementById('spc-num-capitoli');
    if (voce) voce.textContent = String(capitoli.length);
    seguiAncore();
  }

  avvia();
})();
