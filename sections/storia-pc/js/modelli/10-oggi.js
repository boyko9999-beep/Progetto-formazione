/*
 * Storia del PC · capitolo 10 (oggi): dati e logica pura, senza DOM.
 */
(function (root) {
  'use strict';

  const api = {};

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['oggi'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
