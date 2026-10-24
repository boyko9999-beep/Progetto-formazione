/*
 * Elettronica avanzata: domande di verifica, una banca per capitolo.
 * Formato della banca dei quiz dell'enciclopedia: { q, options, answer, why, chapter },
 * con la risposta giusta sempre per prima (answer: 0); chi mostra le domande le mescola.
 * La pagina della sezione usa le prime domande di ogni capitolo come verifica finale.
 */
(function (root) {
  'use strict';

  const domande = [
    // ------------------------------------------------------------ fourier
    { id: 'ea-fourier-01', chapter: 'fourier', level: 1, topic: 'Armoniche dell\'onda quadra', q: 'Quali armoniche formano un\'onda quadra simmetrica?', options: ['Solo le dispari: f, 3f, 5f…', 'Solo le pari: 2f, 4f, 6f…', 'Tutte, con la stessa ampiezza'], answer: 0, why: 'L\'onda quadra contiene solo armoniche dispari, con ampiezza che cala come 1/n.' },
    { id: 'ea-fourier-02', chapter: 'fourier', level: 2, topic: 'Fenomeno di Gibbs', q: 'Sommando sempre più armoniche di un\'onda quadra, cosa succede al picco vicino ai salti?', options: ['Si stringe ma resta alto circa il 9% del salto', 'Sparisce del tutto dopo dieci armoniche', 'Diventa sempre più alto'], answer: 0, why: 'È il fenomeno di Gibbs: l\'oscillazione si concentra vicino al salto, ma la sua altezza non scende.' },
    { id: 'ea-fourier-03', chapter: 'fourier', level: 2, topic: 'Banda e fronti ripidi', q: 'Perché un segnale con fronti molto ripidi richiede molta banda?', options: ['Gli spigoli sono fatti di armoniche ad alta frequenza', 'Perché assorbe più corrente dal circuito', 'Perché la sua fondamentale è più bassa'], answer: 0, why: 'Più il fronte è ripido, più servono armoniche alte per disegnarlo: tagliarle arrotonda gli spigoli.' },
    { id: 'ea-fourier-04', chapter: 'fourier', level: 1, topic: 'FFT', q: 'Che cosa rese possibile calcolare lo spettro in tempo reale a partire dal 1965?', options: ['L\'algoritmo FFT di Cooley e Tukey', 'L\'invenzione dell\'oscilloscopio a raggi catodici', 'La macchina delle maree di Kelvin'], answer: 0, why: 'La FFT riduce il calcolo da circa N² a circa N·log N operazioni.' },
  ];

  root.EA_QUIZ = domande;
  if (root.QuizBank && typeof root.QuizBank.extend === 'function') root.QuizBank.extend('elettronica-avanzata', domande);
})(typeof window !== 'undefined' ? window : globalThis);
