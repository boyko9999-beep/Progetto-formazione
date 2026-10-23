/*
 * Registra la sezione nell'hub dell'enciclopedia (sections/index.html).
 * L'hub apre i capitoli con programmazione/index.html#<id>.
 */
(function (root) {
  'use strict';
  if (!root.Enciclopedia || typeof root.Enciclopedia.register !== 'function') return;
  root.Enciclopedia.register({
    slug: 'programmazione',
    numero: 7,
    titolo: 'Storia della programmazione',
    sottotitolo: 'Dalle schede del telaio Jacquard all\'intelligenza artificiale: come abbiamo imparato a parlare alle macchine.',
    periodo: '1725–2026',
    colore: '#8e44ad',
    capitoli: [
      { id: 'telai', titolo: 'Le schede che comandano', periodo: '1725–1890', descrizione: 'Il telaio Jacquard, la macchina analitica di Babbage, le note di Ada Lovelace e le schede di Hollerith.' },
      { id: 'logica', titolo: 'La logica diventa macchina', periodo: '1847–1945', descrizione: 'L\'algebra di Boole, la macchina di Turing, i circuiti a relè di Shannon e i calcolatori di Zuse.' },
      { id: 'cavi', titolo: 'Programmare con le mani', periodo: '1943–1949', descrizione: 'Colossus, ENIAC e le sue programmatrici, von Neumann, la Manchester Baby e il primo bug.' },
      { id: 'assembly', titolo: 'Dai numeri alle parole', periodo: '1947–1956', descrizione: 'Dal codice binario all\'assembly di Kathleen Booth, le subroutine dell\'EDSAC e il compilatore A-0 di Grace Hopper.' },
      { id: 'fortran', titolo: 'I primi linguaggi ad alto livello', periodo: '1954–1962', descrizione: 'FORTRAN, FLOW-MATIC, LISP, COBOL e ALGOL: nascono i compilatori e i linguaggi ad alto livello.' },
      { id: 'schede', titolo: 'Schede, lotti e terminali', periodo: '1956–1975', descrizione: 'Programmare con le schede perforate, l\'elaborazione a lotti, l\'IBM System/360, il time-sharing e il BASIC.' },
      { id: 'strutturata', titolo: 'La crisi del software', periodo: '1966–1980', descrizione: 'La conferenza NATO del 1968, Böhm e Jacopini, Dijkstra contro il GOTO, Pascal, Simula e il software dell\'Apollo.' },
      { id: 'unix', titolo: 'Unix, C e i piccoli strumenti', periodo: '1969–1985', descrizione: 'Unix e il linguaggio C ai Bell Labs, le pipe, Smalltalk, SQL e Prolog.' },
      { id: 'personal', titolo: 'Il software per tutti', periodo: '1975–1990', descrizione: 'Altair BASIC, Apple II, Commodore 64, VisiCalc, MS-DOS, Turbo Pascal e il progetto GNU.' },
      { id: 'oggetti', titolo: 'Oggetti e finestre', periodo: '1979–1995', descrizione: 'Classi e oggetti, C++, le interfacce grafiche, il Macintosh, Visual Basic e i design pattern.' },
      { id: 'web', titolo: 'Il web e l\'open source', periodo: '1989–2005', descrizione: 'Il World Wide Web, Linux, Python, Java, JavaScript, PHP, l\'open source e il millennium bug.' },
      { id: 'ovunque', titolo: 'Software ovunque', periodo: '2001–2020', descrizione: 'Il manifesto agile, Git e GitHub, smartphone e app, il cloud, Go, Rust, Swift e i container.' },
      { id: 'ia', titolo: 'Quando il software impara', periodo: '1943–2026', descrizione: 'Dal neurone artificiale al deep learning, dai Transformer agli assistenti che scrivono codice.' },
      { id: 'atlante', titolo: 'Atlante dei linguaggi', periodo: '1957–2026', descrizione: 'L\'albero genealogico interattivo dei linguaggi: chi ha ispirato chi, dal FORTRAN a Rust.' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
