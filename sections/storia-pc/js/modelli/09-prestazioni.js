/*
 * Storia del PC · capitolo 9 (prestazioni): dati e logica pura, senza DOM.
 */
(function (root) {
  'use strict';

  const api = {};

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['prestazioni'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
