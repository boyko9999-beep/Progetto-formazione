/*
 * Storia del PC · capitolo 3 (primi-pc): dati e logica pura, senza DOM.
 */
(function (root) {
  'use strict';

  const api = {};

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['primi-pc'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
