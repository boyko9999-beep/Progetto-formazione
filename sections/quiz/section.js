/*
 * Sezione 8 dell'enciclopedia: i quiz. L'hub (sections/index.html) carica solo
 * questo file. I capitoli sono i quiz delle singole banche più le sfide miste;
 * "domande" dice all'hub quante domande ha ogni sezione (un test controlla
 * che i numeri corrispondano alle banche in sections/quiz/banks/).
 */
(function (root) {
  'use strict';

  const domande = {
    'elettronica-base': 40,
    'elettronica-intermedia': 40,
    'elettronica-avanzata': 40,
    'porte-logiche': 40,
    'chip-programmabili': 40,
    'storia-pc': 40,
    programmazione: 44,
    bus: 77,
  };
  const totale = Object.keys(domande).reduce((t, k) => t + domande[k], 0);

  const capitoli = [
    { id: 'elettronica-base', titolo: 'Elettronica base' },
    { id: 'elettronica-intermedia', titolo: 'Elettronica intermedia' },
    { id: 'elettronica-avanzata', titolo: 'Elettronica avanzata' },
    { id: 'porte-logiche', titolo: 'Porte logiche e nascita dei chip' },
    { id: 'chip-programmabili', titolo: 'I primi chip programmabili' },
    { id: 'storia-pc', titolo: 'Architettura e storia dei PC' },
    { id: 'programmazione', titolo: 'Storia della programmazione' },
    { id: 'bus', titolo: 'BusLab: bus e protocolli' },
    { id: 'esame', titolo: 'Esame finale', descrizione: '24 domande da tutte le sezioni, in ordine di difficoltà' },
    { id: 'tempo', titolo: 'Sfida a tempo', descrizione: '15 domande, 25 secondi ciascuna' },
  ].map((c) => Object.assign({ href: 'quiz/index.html#' + c.id }, c));

  const def = {
    slug: 'quiz',
    numero: 8,
    titolo: 'Quiz',
    sottotitolo: 'Mettiti alla prova: circuiti da far funzionare, resistenze da leggere, tabelle di verità e linee del tempo. Una medaglia per ogni sezione.',
    periodo: totale + ' domande',
    capitoli: capitoli,
    domande: domande,
  };

  root.QuizSection = def;
  if (root.Enciclopedia && typeof root.Enciclopedia.register === 'function') root.Enciclopedia.register(def);
  if (typeof module !== 'undefined' && module.exports) module.exports = def;
})(typeof window !== 'undefined' ? window : globalThis);
