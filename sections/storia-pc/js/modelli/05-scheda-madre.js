/*
 * Storia del PC · capitolo 5 (scheda-madre): dati e logica pura, senza DOM.
 */
(function (root) {
  'use strict';

  const api = {};

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['scheda-madre'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
