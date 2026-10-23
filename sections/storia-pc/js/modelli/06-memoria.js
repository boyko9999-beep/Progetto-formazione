/*
 * Storia del PC · capitolo 6 (memoria): dati e logica pura, senza DOM.
 */
(function (root) {
  'use strict';

  const api = {};

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['memoria'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
