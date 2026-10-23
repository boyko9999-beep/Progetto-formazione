/*
 * Enciclopedia "Dall'elettronica a oggi": registro comune delle sezioni.
 *
 * Ogni sezione vive in sections/<slug>/ e si registra dal suo section.js:
 *
 *   window.Enciclopedia && Enciclopedia.register({
 *     slug: 'storia-pc',          // obbligatorio, uguale al nome della cartella
 *     numero: 6,                  // obbligatorio, da 1 a 8
 *     titolo: 'Architettura e storia dei PC',
 *     sottotitolo: 'una frase',   // facoltativo
 *     periodo: '1971 – oggi',     // facoltativo
 *     colore: 'var(--c-pc)',      // facoltativo, qualsiasi colore CSS
 *     capitoli: [{ id, titolo, descrizione, periodo, href }],  // descrizione, periodo, href facoltativi
 *   });
 *
 * L'hub (sections/index.html) carica i section.js con tag <script>, quindi
 * funziona anche aprendo i file dal disco, senza server. Il link a un
 * capitolo è <slug>/index.html#<id>, salvo un href (relativo a sections/).
 */
(function (root) {
  'use strict';

  // Le otto sezioni previste: l'hub le mostra anche prima che siano pronte.
  const PREVISTE = [
    { slug: 'elettronica-base', numero: 1, titolo: 'Elettronica base', sottotitolo: 'Cariche, tensione e corrente: le leggi che fanno funzionare ogni circuito.' },
    { slug: 'elettronica-intermedia', numero: 2, titolo: 'Elettronica intermedia', sottotitolo: 'Semiconduttori, diodi, transistor e amplificatori.' },
    { slug: 'elettronica-avanzata', numero: 3, titolo: 'Elettronica avanzata', sottotitolo: 'I circuiti dell\'elettronica di fascia alta.' },
    { slug: 'porte-logiche', numero: 4, titolo: 'Porte logiche e nascita dei chip', sottotitolo: 'Dal relè al circuito integrato: come si costruisce un ragionamento con gli interruttori.' },
    { slug: 'chip-programmabili', numero: 5, titolo: 'I primi chip programmabili', sottotitolo: 'Microprocessori e logiche programmabili: architettura e storia.' },
    { slug: 'storia-pc', numero: 6, titolo: 'Architettura e storia dei PC', sottotitolo: 'Come è fatto un personal computer e come ci siamo arrivati.' },
    { slug: 'programmazione', numero: 7, titolo: 'Storia della programmazione', sottotitolo: 'Dalle schede perforate ai linguaggi di oggi.' },
    { slug: 'quiz', numero: 8, titolo: 'Quiz', sottotitolo: 'Mettiti alla prova, sezione per sezione.' },
  ];

  const STORE = 'enciclopedia-progressi';
  const registrate = {};
  const ascoltatori = [];

  function register(def) {
    if (!def || typeof def.slug !== 'string' || !def.slug) return;
    registrate[def.slug] = Object.assign({}, def, { capitoli: Array.isArray(def.capitoli) ? def.capitoli.slice() : [] });
    ascoltatori.forEach((fn) => {
      try { fn(def.slug); } catch (e) { /* un ascoltatore guasto non blocca gli altri */ }
    });
  }

  function onRegister(fn) {
    ascoltatori.push(fn);
  }

  function get(slug) {
    return registrate[slug] || null;
  }

  function coloreDefault(numero) {
    return 'var(--sez-' + (numero >= 1 && numero <= 8 ? numero : 1) + ')';
  }

  // Elenco completo: le sezioni previste (pronte o no) più eventuali sezioni nuove.
  function sezioni() {
    const out = PREVISTE.map((p) => {
      const r = registrate[p.slug];
      const s = Object.assign({}, p, r || {});
      s.pronta = !!r;
      s.colore = s.colore || coloreDefault(s.numero);
      s.capitoli = r ? r.capitoli : [];
      return s;
    });
    Object.keys(registrate).forEach((slug) => {
      if (PREVISTE.some((p) => p.slug === slug)) return;
      const r = registrate[slug];
      out.push(Object.assign({ pronta: true, colore: coloreDefault(r.numero) }, r));
    });
    return out.sort((a, b) => (a.numero || 99) - (b.numero || 99));
  }

  // Percorso di una sezione o di un suo capitolo, relativo alla cartella sections/.
  function link(slug, capitolo) {
    const s = registrate[slug];
    if (capitolo) {
      const c = s && s.capitoli.find((x) => x.id === capitolo);
      if (c && c.href) return c.href;
      return slug + '/index.html#' + encodeURIComponent(capitolo);
    }
    return slug + '/index.html';
  }

  function progressi() {
    try {
      const v = JSON.parse(root.localStorage.getItem(STORE) || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) {
      return {};
    }
  }

  // Le sezioni possono segnalare quanti capitoli ha completato chi legge.
  function progresso(slug, fatti, totale) {
    if (!slug) return;
    const tutti = progressi();
    const tot = Math.max(1, Math.round(+totale || 1));
    tutti[slug] = { fatti: Math.min(tot, Math.max(0, Math.round(+fatti || 0))), totale: tot };
    try { root.localStorage.setItem(STORE, JSON.stringify(tutti)); } catch (e) { /* archiviazione non disponibile */ }
  }

  const api = {
    PREVISTE: PREVISTE,
    register: register,
    onRegister: onRegister,
    get: get,
    sezioni: sezioni,
    link: link,
    progresso: progresso,
    progressi: progressi,
  };
  root.Enciclopedia = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
