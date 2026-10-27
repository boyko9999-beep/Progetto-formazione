/*
 * Codice Hollerith delle schede perforate IBM a 80 colonne (perforatrice IBM 029, 1964).
 * Ogni colonna ha 12 posizioni: dall'alto le righe 12, 11, 0, 1, 2, ..., 9.
 * Cifre: un foro. Lettere: un foro di "zona" (12, 11 o 0) più un foro numerico.
 * Simboli: combinazioni con il foro 8.
 *
 * La usano il laboratorio della scheda perforata e lo schermo d'epoca "scheda".
 */
(function (root) {
  'use strict';

  const RIGHE = [12, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const COLONNE = 80;

  const SIMBOLI = {
    '&': [12], '-': [11], '/': [0, 1],
    ':': [2, 8], '#': [3, 8], '@': [4, 8], '\'': [5, 8], '=': [6, 8], '"': [7, 8],
    '¢': [12, 2, 8], '.': [12, 3, 8], '<': [12, 4, 8], '(': [12, 5, 8], '+': [12, 6, 8], '|': [12, 7, 8],
    '!': [11, 2, 8], '$': [11, 3, 8], '*': [11, 4, 8], ')': [11, 5, 8], ';': [11, 6, 8], '¬': [11, 7, 8],
    ',': [0, 3, 8], '%': [0, 4, 8], '_': [0, 5, 8], '>': [0, 6, 8], '?': [0, 7, 8],
  };

  // Fori di un carattere (array di righe), [] per lo spazio, null se la 029 non lo sa perforare.
  function fori(ch) {
    if (ch === ' ' || ch === '' || ch == null) return [];
    const c = ch.toUpperCase();
    if (c >= '0' && c <= '9') return [Number(c)];
    if (c >= 'A' && c <= 'I') return [12, c.charCodeAt(0) - 64];
    if (c >= 'J' && c <= 'R') return [11, c.charCodeAt(0) - 73];
    if (c >= 'S' && c <= 'Z') return [0, c.charCodeAt(0) - 81];
    return SIMBOLI[c] ? SIMBOLI[c].slice() : null;
  }

  const INVERSO = new Map();
  ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(Object.keys(SIMBOLI)).forEach((c) => {
    INVERSO.set(chiave(fori(c)), c);
  });

  function chiave(lista) {
    return (lista || []).slice().sort((a, b) => RIGHE.indexOf(a) - RIGHE.indexOf(b)).join('-');
  }

  // Carattere corrispondente a un insieme di fori, o null se la combinazione non ha significato.
  function carattere(lista) {
    const k = chiave(lista);
    return INVERSO.has(k) ? INVERSO.get(k) : null;
  }

  // Maiuscole senza accenti: la 029 non aveva minuscole né lettere accentate.
  function normalizza(testo) {
    return String(testo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  }

  // Una scheda intera: 80 colonne con il carattere stampato in alto e i suoi fori.
  function scheda(testo) {
    const t = normalizza(testo).slice(0, COLONNE);
    const colonne = [];
    for (let i = 0; i < COLONNE; i++) {
      const c = t[i] || ' ';
      const f = fori(c);
      colonne.push({ carattere: f ? c : '?', fori: f || fori('?'), valido: !!f });
    }
    return colonne;
  }

  const api = { RIGHE: RIGHE, COLONNE: COLONNE, fori: fori, carattere: carattere, normalizza: normalizza, scheda: scheda };
  root.Hollerith = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
