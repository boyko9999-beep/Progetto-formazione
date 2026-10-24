/*
 * Laboratorio «L'albero dei linguaggi» (capitolo 14, Atlante dei linguaggi).
 *
 * Una mappa del tempo: ogni linguaggio è un punto nell'anno in cui è apparso,
 * su una corsia di famiglia; le curve collegano chi ha ispirato a chi è stato ispirato.
 * Tocca un linguaggio: antenati in ambra, discendenti in azzurro. Filtri per paradigma,
 * ricerca per nome o autore, vista elenco ordinabile, cursore del tempo con riproduzione.
 *
 * La logica pura (dati, antenati, discendenti, ricerca, impaginazione) è esportata
 * con module.exports per i test in Node; il DOM si tocca solo dentro monta().
 */
(function (root) {
  'use strict';

  const ANNO_MIN = 1945;
  const ANNO_MAX = 2026;

  /* ---------- corsie (famiglie) e paradigmi ---------- */

  const CORSIE = [
    { id: 'dati', nome: 'Dati e gestionali' },
    { id: 'algol', nome: 'FORTRAN e ALGOL' },
    { id: 'c', nome: 'Famiglia del C' },
    { id: 'oggetti', nome: 'Oggetti' },
    { id: 'scripting', nome: 'Scripting e web' },
    { id: 'funzionali', nome: 'Funzionali e logici' },
  ];

  const PARADIGMI = [
    { id: 'imperativo', nome: 'Imperativo', idea: 'il programma è una sequenza di ordini che cambiano, passo dopo passo, i dati in memoria.' },
    { id: 'strutturato', nome: 'Strutturato', idea: 'gli ordini si raccolgono in procedure e blocchi con un solo ingresso e una sola uscita, senza salti arbitrari.' },
    { id: 'oggetti', nome: 'A oggetti', idea: 'dati e operazioni stanno insieme dentro oggetti che si scambiano messaggi.' },
    { id: 'funzionale', nome: 'Funzionale', idea: 'si calcola applicando e componendo funzioni, evitando di modificare i dati.' },
    { id: 'logico', nome: 'Logico', idea: 'si scrivono fatti e regole, e la macchina cerca da sola le risposte.' },
    { id: 'dichiarativo', nome: 'Dichiarativo', idea: 'si descrive il risultato voluto, non i passi per ottenerlo.' },
    { id: 'scripting', nome: 'Scripting', idea: 'programmi brevi, di solito interpretati, che automatizzano compiti e collegano altri programmi.' },
  ];

  // Capitoli della sezione (riserva, se il motore non è caricato): id -> [numero, titolo].
  const CAPITOLI = {
    telai: [1, 'Le schede che comandano'],
    logica: [2, 'La logica diventa macchina'],
    cavi: [3, 'Programmare con le mani'],
    assembly: [4, 'Dai numeri alle parole'],
    fortran: [5, 'I primi linguaggi ad alto livello'],
    schede: [6, 'Schede, lotti e terminali'],
    strutturata: [7, 'La crisi del software'],
    unix: [8, 'Unix, C e i piccoli strumenti'],
    personal: [9, 'Il software per tutti'],
    oggetti: [10, 'Oggetti e finestre'],
    web: [11, 'Il web e l\'open source'],
    ovunque: [12, 'Software ovunque'],
    ia: [13, 'Quando il software impara'],
  };

  /* ---------- i linguaggi ----------
   * anno: prima apparizione come la si cita di solito (prima versione pubblica,
   * primo compilatore o, per Plankalkül, il progetto). influenzatoDa: solo le
   * influenze principali documentate, sempre da un linguaggio più vecchio o coetaneo.
   * ciaoTipo: 'assaggio' (un frammento al posto del saluto) o 'assente' (spiegato in ciaoNota).
   * etichetta: 'sinistra' sposta il nome a sinistra del punto per fare spazio ai vicini.
   */
  const LINGUAGGI = [
    {
      id: 'plankalkul', nome: 'Plankalkül', anno: 1945, progetto: true,
      notaAnno: 'Progettato tra il 1942 e il 1945, pubblicato per intero solo nel 1972.',
      autori: 'Konrad Zuse', paradigmi: ['imperativo'], famiglia: 'algol', influenzatoDa: [], capitolo: 'logica',
      descrizione: 'Konrad Zuse lo progettò in Germania negli anni della guerra, mentre costruiva i suoi calcolatori a relè: è considerato il primo linguaggio ad alto livello mai concepito. Rimase sulla carta per decenni.',
      ciao: 'V0 + V1 ⇒ R0', ciaoTipo: 'assaggio',
      ciaoNota: 'Plankalkül non prevedeva testi da stampare. Questa riga, in notazione semplificata, somma i valori d\'ingresso V0 e V1 e scrive il risultato in R0: la freccia indica dove va il risultato. Zuse scriveva su più righe, con indici e tipi sotto ogni variabile.',
    },
    {
      id: 'short-code', nome: 'Short Code', anno: 1949, alias: ['brief code'],
      autori: 'John Mauchly, William F. Schmitt', paradigmi: ['imperativo'], famiglia: 'algol', influenzatoDa: [], capitolo: 'assembly',
      descrizione: 'Proposto da John Mauchly nel 1949 e realizzato da William Schmitt per il BINAC e poi per l\'UNIVAC I: si scrivevano formule invece di istruzioni macchina. Era interpretato, quindi molto più lento del codice macchina.',
      ciao: '', ciaoTipo: 'assente',
      ciaoNota: 'Nessun «Ciao, mondo»: Short Code lavorava con numeri e formule, e ogni formula andava trascritta a mano in codici numerici.',
    },
    {
      id: 'autocode', nome: 'Autocode', anno: 1952,
      autori: 'Alick Glennie', paradigmi: ['imperativo'], famiglia: 'algol', influenzatoDa: [], capitolo: 'assembly',
      descrizione: 'Alick Glennie lo scrisse nel 1952 per il Manchester Mark 1: è spesso considerato il primo linguaggio compilato, cioè tradotto per intero in codice macchina prima dell\'esecuzione. Nel 1954 Tony Brooker ne creò una versione più comoda, il Mark 1 Autocode.',
      ciao: '', ciaoTipo: 'assente',
      ciaoNota: 'Nessun «Ciao, mondo» d\'epoca: l\'Autocode serviva a scrivere calcoli in forma quasi algebrica, non a stampare frasi.',
    },
    {
      id: 'fortran', nome: 'FORTRAN', anno: 1957, alias: ['formula translation'],
      autori: 'John Backus e il suo gruppo all\'IBM', paradigmi: ['imperativo'], famiglia: 'algol', influenzatoDa: [], capitolo: 'fortran',
      descrizione: 'Il gruppo di John Backus consegnò il primo compilatore nel 1957, per l\'IBM 704: dimostrò che un programma scritto con formule poteva essere veloce quasi quanto uno scritto a mano. Il nome viene da FORmula TRANslation, e il Fortran si usa ancora nel calcolo scientifico.',
      ciao: '      PROGRAM CIAO\n      PRINT *, \'CIAO, MONDO\'\n      END',
      ciaoNota: 'In FORTRAN 77, con le colonne fisse delle schede perforate: le istruzioni cominciano dalla settima colonna.',
    },
    {
      id: 'flow-matic', nome: 'FLOW-MATIC', anno: 1957, alias: ['b-0'],
      notaAnno: 'Sviluppato tra il 1955 e il 1959.',
      autori: 'Grace Hopper e il suo gruppo alla Remington Rand', paradigmi: ['imperativo'], famiglia: 'dati', influenzatoDa: [], capitolo: 'fortran',
      descrizione: 'Il gruppo di Grace Hopper lo sviluppò per l\'UNIVAC I: fu il primo linguaggio per l\'elaborazione dei dati aziendali a usare parole inglesi al posto dei simboli matematici, e preparò la strada al COBOL.',
      ciao: '(0) INPUT INVENTORY FILE-A PRICE FILE-B ;\n    OUTPUT PRICED-INV FILE-C UNPRICED-INV\n    FILE-D ; HSP D .\n(1) COMPARE PRODUCT-NO (A) WITH PRODUCT-NO (B) ;\n    IF GREATER GO TO OPERATION 10 ;\n    IF EQUAL GO TO OPERATION 5 ;\n    OTHERWISE GO TO OPERATION 2 .',
      ciaoTipo: 'assaggio',
      ciaoNota: 'FLOW-MATIC non aveva un\'istruzione per stampare un saluto: leggeva e scriveva archivi su nastro. Sono le prime righe del programma d\'esempio del manuale, che confronta un archivio di magazzino con un listino prezzi (righe spezzate per leggibilità).',
    },
    {
      id: 'lisp', nome: 'LISP', anno: 1958,
      autori: 'John McCarthy', paradigmi: ['funzionale'], famiglia: 'funzionali', influenzatoDa: [], capitolo: 'fortran',
      descrizione: 'John McCarthy lo ideò al MIT nel 1958 per la ricerca sull\'intelligenza artificiale: programmi e dati hanno la stessa forma, liste tra parentesi. Portò idee che usiamo ancora, come la ricorsione e la gestione automatica della memoria (garbage collection).',
      ciao: '(PRINT (QUOTE (CIAO MONDO)))',
      ciaoNota: 'Nello stile dei primi Lisp: stampa la lista di due simboli (CIAO MONDO).',
    },
    {
      id: 'algol-58', nome: 'ALGOL 58', anno: 1958, alias: ['ial'],
      autori: 'Comitato internazionale ACM-GAMM (tra gli altri John Backus, Friedrich L. Bauer, Alan Perlis e Heinz Rutishauser)',
      paradigmi: ['imperativo'], famiglia: 'algol', influenzatoDa: ['fortran', 'plankalkul'], capitolo: 'fortran',
      descrizione: 'Nato da un incontro a Zurigo tra esperti americani ed europei, all\'inizio si chiamava IAL (International Algebraic Language): un linguaggio universale per scrivere algoritmi, non legato a una marca di computer. Ne derivarono dialetti come JOVIAL, MAD e NELIAC.',
      ciao: '', ciaoTipo: 'assente',
      ciaoNota: 'Il rapporto del 1958 non stabiliva come stampare: ogni dialetto aveva le sue istruzioni, e non esiste un «Ciao, mondo» comune.',
    },
    {
      id: 'cobol', nome: 'COBOL', anno: 1959,
      autori: 'Comitato CODASYL (tra cui Jean Sammet), con Grace Hopper come consulente', paradigmi: ['imperativo'], famiglia: 'dati', influenzatoDa: ['flow-matic'], capitolo: 'fortran',
      descrizione: 'Un comitato di aziende e del governo statunitense, il CODASYL, lo progettò nel 1959 per scrivere programmi gestionali in un inglese quasi parlato, che girassero su computer di marche diverse. Funziona ancora in molte banche e assicurazioni.',
      ciao: '       IDENTIFICATION DIVISION.\n       PROGRAM-ID. CIAO.\n       PROCEDURE DIVISION.\n           DISPLAY "CIAO, MONDO".\n           STOP RUN.',
      ciaoNota: 'Nella forma dello standard COBOL 85: anche qui le colonne contano, come sulle schede.',
    },
    {
      id: 'algol-60', nome: 'ALGOL 60', anno: 1960,
      autori: 'Comitato internazionale; rapporto curato da Peter Naur', paradigmi: ['imperativo', 'strutturato'], famiglia: 'algol', influenzatoDa: ['algol-58'], capitolo: 'fortran',
      descrizione: 'Il rapporto del 1960, curato dal danese Peter Naur, introdusse i blocchi con le loro variabili locali e la ricorsione, e descrisse la sintassi con una notazione precisa, la BNF. Pascal, C, Java e quasi tutti i linguaggi moderni ne discendono.',
      ciao: 'begin\n  outstring(1, "Ciao, mondo!")\nend',
      ciaoNota: 'Il rapporto del 1960 non diceva come stampare: ogni compilatore aveva le sue procedure. Qui si usa outstring, introdotta in una revisione successiva del linguaggio.',
    },
    {
      id: 'cpl', nome: 'CPL', anno: 1963, alias: ['combined programming language'],
      autori: 'Christopher Strachey e colleghi delle università di Cambridge e di Londra', paradigmi: ['imperativo', 'strutturato'], famiglia: 'c', influenzatoDa: ['algol-60'],
      descrizione: 'Combined Programming Language: un ALGOL più ricco, pensato tra Cambridge e Londra sotto la guida di Christopher Strachey. Era così ambizioso che la sua realizzazione andò per le lunghe; una sua versione ridotta, il BCPL, aprì la strada al C.',
      ciao: '', ciaoTipo: 'assente',
      ciaoNota: 'CPL fu usato pochissimo: non ci è arrivato un «Ciao, mondo» d\'epoca.',
    },
    {
      id: 'basic', nome: 'BASIC', anno: 1964,
      autori: 'John G. Kemeny e Thomas E. Kurtz', paradigmi: ['imperativo'], famiglia: 'algol', influenzatoDa: ['fortran', 'algol-60'], capitolo: 'personal',
      descrizione: 'John Kemeny e Thomas Kurtz lo crearono al Dartmouth College nel 1964 perché tutti gli studenti, non solo gli scienziati, potessero programmare da un terminale. Negli anni Ottanta era il linguaggio di quasi tutti gli home computer.',
      ciao: '10 PRINT "CIAO, MONDO"\n20 END',
    },
    {
      id: 'pl-i', nome: 'PL/I', anno: 1964, alias: ['pl1', 'pli'],
      autori: 'IBM, con il comitato degli utenti SHARE', paradigmi: ['imperativo', 'strutturato'], famiglia: 'algol', influenzatoDa: ['fortran', 'cobol', 'algol-60'],
      descrizione: 'L\'IBM lo presentò nel 1964 insieme ai computer System/360, per unire il calcolo scientifico del FORTRAN, la gestione dei dati del COBOL e la struttura a blocchi di ALGOL. Potente ma enorme, servì tra l\'altro a scrivere il sistema operativo Multics.',
      ciao: 'CIAO: PROCEDURE OPTIONS (MAIN);\n   PUT SKIP LIST (\'CIAO, MONDO\');\nEND CIAO;',
    },
    {
      id: 'apl', nome: 'APL', anno: 1966,
      notaAnno: 'Notazione pubblicata nel 1962, primo interprete nel 1966.',
      autori: 'Kenneth E. Iverson', paradigmi: ['funzionale'], famiglia: 'dati', influenzatoDa: [], capitolo: 'fortran',
      descrizione: 'Kenneth Iverson lo inventò come notazione matematica, descritta nel libro del 1962 «A Programming Language»; dal 1966 girò sui computer IBM. Con un solo simbolo opera su intere tabelle di numeri: programmi brevissimi, scritti con una tastiera speciale.',
      ciao: '\'Ciao, mondo!\'',
      ciaoNota: 'In APL basta scrivere il testo tra apici: l\'interprete lo mostra.',
    },
    {
      id: 'simula', nome: 'Simula', anno: 1967, alias: ['simula 67'],
      notaAnno: 'La prima versione risale ai primi anni Sessanta; classi e oggetti arrivano con Simula 67.',
      autori: 'Ole-Johan Dahl e Kristen Nygaard', paradigmi: ['imperativo', 'strutturato', 'oggetti'], famiglia: 'oggetti', influenzatoDa: ['algol-60'], capitolo: 'oggetti',
      descrizione: 'Ole-Johan Dahl e Kristen Nygaard lo crearono al Centro di calcolo norvegese, a Oslo, per scrivere simulazioni. Con Simula 67 nacquero classi, oggetti ed ereditarietà: è il capostipite della programmazione a oggetti.',
      ciao: 'Begin\n   OutText("Ciao, mondo!");\n   OutImage;\nEnd;',
    },
    {
      id: 'bcpl', nome: 'BCPL', anno: 1967,
      autori: 'Martin Richards', paradigmi: ['imperativo', 'strutturato'], famiglia: 'c', influenzatoDa: ['cpl'], capitolo: 'unix',
      descrizione: 'Martin Richards, di Cambridge, lo ricavò da CPL nel 1967: un linguaggio piccolo e facile da portare su macchine diverse, con un solo tipo di dato, la parola di memoria. Ken Thompson lo semplificò ancora, e ne nacque il B.',
      ciao: 'GET "LIBHDR"\n\nLET START() BE\n$(\n    WRITES("CIAO, MONDO*N")\n$)',
      ciaoNota: 'Nella forma classica: $( e $) fanno da parentesi graffe, *N va a capo.',
    },
    {
      id: 'logo', nome: 'Logo', anno: 1967, alias: ['tartaruga'],
      autori: 'Wally Feurzeig, Seymour Papert e Cynthia Solomon', paradigmi: ['funzionale', 'imperativo'], famiglia: 'funzionali', influenzatoDa: ['lisp'],
      descrizione: 'Ideato nel 1967 alla BBN, nel Massachusetts, per avvicinare i bambini alla matematica: è un parente del Lisp. Diventò famoso grazie alla tartaruga, un cursore (all\'inizio un piccolo robot) che disegna obbedendo a comandi come FORWARD 100 e RIGHT 90.',
      ciao: 'print [Ciao, mondo!]',
    },
    {
      id: 'b', nome: 'B', anno: 1969,
      autori: 'Ken Thompson, con Dennis Ritchie', paradigmi: ['imperativo', 'strutturato'], famiglia: 'c', influenzatoDa: ['bcpl'], capitolo: 'unix',
      descrizione: 'Ken Thompson lo ricavò dal BCPL ai Bell Labs, nel 1969, per programmare il piccolo PDP-7 su cui stava nascendo Unix. Nel tutorial di Brian Kernighan su B compare il primo «hello, world» documentato.',
      ciao: 'main( ) {\n  extrn a, b, c;\n  putchar(a); putchar(b); putchar(c); putchar(\'!*n\');\n}\n\na \'hell\';\nb \'o, w\';\nc \'orld\';',
      ciaoNota: 'L\'originale di Brian Kernighan (1972): ogni costante conteneva al massimo quattro caratteri, per questo il saluto è spezzato in tre pezzi.',
    },
    {
      id: 'pascal', nome: 'Pascal', anno: 1970,
      autori: 'Niklaus Wirth', paradigmi: ['imperativo', 'strutturato'], famiglia: 'algol', influenzatoDa: ['algol-60'], capitolo: 'strutturata',
      descrizione: 'Niklaus Wirth lo progettò al Politecnico di Zurigo (ETH) partendo da ALGOL W, la sua proposta di erede di ALGOL 60, pensando all\'insegnamento della programmazione strutturata. Con Turbo Pascal, negli anni Ottanta, diventò popolarissimo anche sui personal computer.',
      ciao: 'program Ciao(output);\nbegin\n  writeln(\'Ciao, mondo!\')\nend.',
    },
    {
      id: 'c', nome: 'C', anno: 1972,
      autori: 'Dennis Ritchie', paradigmi: ['imperativo', 'strutturato'], famiglia: 'c', influenzatoDa: ['b'], capitolo: 'unix',
      descrizione: 'Dennis Ritchie lo sviluppò ai Bell Labs intorno al 1972, e nel 1973 il nucleo di Unix fu riscritto in C. Vicino all\'hardware ma portabile, è ancora il linguaggio dei sistemi operativi e dei microcontrollori, e la sua sintassi vive in decine di discendenti.',
      ciao: '#include <stdio.h>\n\nint main(void) {\n    printf("Ciao, mondo!\\n");\n    return 0;\n}',
    },
    {
      id: 'smalltalk', nome: 'Smalltalk', anno: 1972, alias: ['smalltalk-80'],
      autori: 'Alan Kay, Dan Ingalls, Adele Goldberg e colleghi della Xerox PARC', paradigmi: ['oggetti'], famiglia: 'oggetti', influenzatoDa: ['simula', 'lisp', 'logo'], capitolo: 'oggetti',
      descrizione: 'Nato alla Xerox PARC dal 1972: in Smalltalk tutto è un oggetto e gli oggetti si parlano con messaggi. Il suo ambiente di lavoro, con finestre, menu e mouse, anticipò le interfacce grafiche di oggi; la versione più nota è Smalltalk-80.',
      ciao: 'Transcript show: \'Ciao, mondo!\'; cr.',
    },
    {
      id: 'prolog', nome: 'Prolog', anno: 1972,
      autori: 'Alain Colmerauer e Philippe Roussel, con Robert Kowalski', paradigmi: ['logico', 'dichiarativo'], famiglia: 'funzionali', influenzatoDa: [], capitolo: 'unix',
      descrizione: 'Alain Colmerauer e Philippe Roussel lo crearono a Marsiglia nel 1972, sulle idee di Robert Kowalski: si scrivono fatti e regole, e il programma risponde alle domande cercando da solo le deduzioni. Il nome viene dal francese «programmation en logique».',
      ciao: '?- write(\'Ciao, mondo!\'), nl.',
    },
    {
      id: 'ml', nome: 'ML', anno: 1973,
      autori: 'Robin Milner', paradigmi: ['funzionale'], famiglia: 'funzionali', influenzatoDa: [], capitolo: 'unix',
      descrizione: 'Robin Milner lo creò all\'Università di Edimburgo come «metalinguaggio» di LCF, un programma per dimostrare teoremi. Il compilatore deduce da solo i tipi e trova molti errori prima dell\'esecuzione: un\'idea ripresa da OCaml, Haskell, F#, Rust e Swift.',
      ciao: 'print "Ciao, mondo!\\n";',
      ciaoNota: 'In Standard ML, la versione standardizzata del linguaggio.',
    },
    {
      id: 'sql', nome: 'SQL', anno: 1974, alias: ['sequel'],
      autori: 'Donald D. Chamberlin e Raymond F. Boyce', paradigmi: ['dichiarativo'], famiglia: 'dati', influenzatoDa: [], capitolo: 'unix',
      descrizione: 'Donald Chamberlin e Raymond Boyce lo idearono all\'IBM nel 1974 (allora si chiamava SEQUEL) per interrogare i database relazionali proposti da Edgar F. Codd. Si descrive quali dati si vogliono, non come andarli a prendere.',
      ciao: 'SELECT \'Ciao, mondo!\';',
      ciaoNota: 'Funziona in molti database, per esempio PostgreSQL e SQLite; in Oracle si aggiunge FROM DUAL.',
    },
    {
      id: 'scheme', nome: 'Scheme', anno: 1975,
      autori: 'Guy L. Steele e Gerald Jay Sussman', paradigmi: ['funzionale'], famiglia: 'funzionali', influenzatoDa: ['lisp', 'algol-60'], capitolo: 'unix',
      descrizione: 'Guy Steele e Gerald Sussman lo crearono al MIT nel 1975: un Lisp piccolo ed elegante, con le regole di visibilità delle variabili prese da ALGOL. Per anni fu il linguaggio del corso introduttivo del MIT e del libro «Structure and Interpretation of Computer Programs».',
      ciao: '(display "Ciao, mondo!")\n(newline)',
    },
    {
      id: 's', nome: 'S', anno: 1976,
      autori: 'John Chambers e colleghi dei Bell Labs', paradigmi: ['imperativo', 'funzionale'], famiglia: 'dati', influenzatoDa: ['fortran'],
      descrizione: 'John Chambers e i colleghi dei Bell Labs lo crearono dal 1976 per analizzare dati in modo interattivo, richiamando le procedure di calcolo già scritte in FORTRAN. È l\'antenato diretto di R.',
      ciao: 'cat("Ciao, mondo!\\n")',
    },
    {
      id: 'awk', nome: 'AWK', anno: 1977,
      autori: 'Alfred Aho, Peter Weinberger e Brian Kernighan', paradigmi: ['scripting', 'imperativo'], famiglia: 'scripting', influenzatoDa: ['c'], capitolo: 'unix',
      descrizione: 'Scritto ai Bell Labs nel 1977: il nome unisce le iniziali dei tre autori. Legge un testo riga per riga e compie un\'azione su quelle che corrispondono a uno schema; è uno dei capostipiti dei linguaggi di scripting.',
      ciao: 'BEGIN { print "Ciao, mondo!" }',
    },
    {
      id: 'modula-2', nome: 'Modula-2', anno: 1978,
      autori: 'Niklaus Wirth', paradigmi: ['imperativo', 'strutturato'], famiglia: 'algol', influenzatoDa: ['pascal'],
      descrizione: 'Niklaus Wirth lo derivò dal Pascal dopo un periodo alla Xerox PARC: aggiunse i moduli, pezzi di programma con un\'interfaccia pubblica e un\'implementazione nascosta, compilati separatamente. Con Modula-2 scrisse anche il sistema della sua workstation Lilith.',
      ciao: 'MODULE Ciao;\nFROM InOut IMPORT WriteString, WriteLn;\nBEGIN\n  WriteString("Ciao, mondo!");\n  WriteLn\nEND Ciao.',
    },
    {
      id: 'ada', nome: 'Ada', anno: 1980,
      autori: 'Jean Ichbiah e il suo gruppo alla CII Honeywell Bull', paradigmi: ['imperativo', 'strutturato', 'oggetti'], famiglia: 'algol', influenzatoDa: ['pascal', 'simula'],
      descrizione: 'Nato da un concorso del Dipartimento della Difesa statunitense, vinto dal gruppo di Jean Ichbiah: la prima norma è del 1980. Porta il nome di Ada Lovelace ed è pensato per software che non deve sbagliare, come quello di aerei, treni e satelliti.',
      ciao: 'with Ada.Text_IO;\n\nprocedure Ciao is\nbegin\n   Ada.Text_IO.Put_Line("Ciao, mondo!");\nend Ciao;',
    },
    {
      id: 'objective-c', nome: 'Objective-C', anno: 1984, alias: ['objc', 'obj-c'],
      autori: 'Brad Cox e Tom Love', paradigmi: ['imperativo', 'oggetti'], famiglia: 'oggetti', influenzatoDa: ['c', 'smalltalk'], capitolo: 'oggetti',
      descrizione: 'Brad Cox e Tom Love aggiunsero al C i messaggi tra oggetti di Smalltalk. Scelto dalla NeXT di Steve Jobs, diventò poi il linguaggio delle applicazioni per Mac e iPhone, finché nel 2014 arrivò Swift.',
      ciao: '#import <Foundation/Foundation.h>\n\nint main(void) {\n    @autoreleasepool {\n        NSLog(@"Ciao, mondo!");\n    }\n    return 0;\n}',
    },
    {
      id: 'common-lisp', nome: 'Common Lisp', anno: 1984,
      autori: 'Comitato di esperti (tra gli altri Guy L. Steele e Scott Fahlman)', paradigmi: ['funzionale', 'imperativo', 'oggetti'], famiglia: 'funzionali', influenzatoDa: ['lisp', 'scheme'],
      descrizione: 'Negli anni Settanta i dialetti del Lisp si erano moltiplicati: Common Lisp li riunì in un unico standard, descritto nel 1984 nel libro di Guy Steele «Common Lisp: the Language» e approvato dall\'ANSI nel 1994.',
      ciao: '(format t "Ciao, mondo!~%")',
    },
    {
      id: 'cpp', nome: 'C++', anno: 1985, alias: ['cpp', 'c plus plus'],
      autori: 'Bjarne Stroustrup', paradigmi: ['imperativo', 'strutturato', 'oggetti'], famiglia: 'c', influenzatoDa: ['c', 'simula'], capitolo: 'oggetti',
      descrizione: 'Bjarne Stroustrup, ai Bell Labs, cominciò nel 1979 a portare le classi di Simula nel C («C con classi»); il nome C++ arrivò nel 1983 e la prima versione commerciale nel 1985. È il linguaggio di molti videogiochi, browser e sistemi embedded.',
      ciao: '#include <iostream>\n\nint main() {\n    std::cout << "Ciao, mondo!\\n";\n}',
    },
    {
      id: 'miranda', nome: 'Miranda', anno: 1985,
      autori: 'David Turner', paradigmi: ['funzionale', 'dichiarativo'], famiglia: 'funzionali', influenzatoDa: ['ml'],
      descrizione: 'David Turner lo pubblicò nel 1985: un linguaggio funzionale «pigro», che calcola ogni valore solo quando serve. Era un prodotto commerciale, e il desiderio di un linguaggio simile ma aperto a tutti portò alla nascita di Haskell.',
      ciao: '|| nello script\nsaluto = "Ciao, mondo!"',
      ciaoNota: 'Si scrive la definizione in uno script, poi si chiede saluto al prompt dell\'interprete, che ne mostra il valore.',
    },
    {
      id: 'erlang', nome: 'Erlang', anno: 1986,
      autori: 'Joe Armstrong, Robert Virding e Mike Williams', paradigmi: ['funzionale'], famiglia: 'funzionali', influenzatoDa: ['prolog', 'lisp'],
      descrizione: 'Nato all\'Ericsson dal 1986 per le centrali telefoniche: migliaia di piccoli processi che si scambiano messaggi, e un sistema che continua a funzionare anche quando una parte si guasta. Il primo interprete era scritto in Prolog.',
      ciao: '-module(ciao).\n-export([main/0]).\n\nmain() -> io:format("Ciao, mondo!~n").',
    },
    {
      id: 'eiffel', nome: 'Eiffel', anno: 1986,
      autori: 'Bertrand Meyer', paradigmi: ['oggetti'], famiglia: 'oggetti', influenzatoDa: ['ada', 'simula'], capitolo: 'oggetti',
      descrizione: 'Bertrand Meyer lo presentò nel 1986 con un\'idea guida, la progettazione per contratto: ogni metodo dichiara che cosa pretende (precondizioni) e che cosa garantisce (postcondizioni), e il programma lo verifica mentre gira. Il nome ricorda l\'ingegnere della torre di Parigi.',
      ciao: 'class\n    CIAO\ncreate\n    make\nfeature\n    make\n        do\n            print ("Ciao, mondo!%N")\n        end\nend',
    },
    {
      id: 'perl', nome: 'Perl', anno: 1987,
      autori: 'Larry Wall', paradigmi: ['scripting', 'imperativo'], famiglia: 'scripting', influenzatoDa: ['c', 'awk'], capitolo: 'web',
      descrizione: 'Larry Wall lo pubblicò nel 1987 per estrarre informazioni da file di testo e preparare rapporti. Con le sue espressioni regolari diventò l\'attrezzo preferito dei sistemisti e, negli anni Novanta, il linguaggio di molte delle prime pagine web dinamiche.',
      ciao: 'print "Ciao, mondo!\\n";',
    },
    {
      id: 'self', nome: 'Self', anno: 1987,
      autori: 'David Ungar e Randall Smith', paradigmi: ['oggetti'], famiglia: 'oggetti', influenzatoDa: ['smalltalk'],
      descrizione: 'David Ungar e Randall Smith lo idearono alla Xerox PARC e lo presentarono nel 1987: uno Smalltalk senza classi, in cui ogni oggetto nasce copiando un altro oggetto, il suo prototipo. Le tecniche dei suoi compilatori veloci finirono nella macchina virtuale di Java, e i prototipi in JavaScript.',
      ciao: '\'Ciao, mondo!\' printLine.',
    },
    {
      id: 'abc', nome: 'ABC', anno: 1987,
      autori: 'Leo Geurts, Lambert Meertens e Steven Pemberton', paradigmi: ['imperativo', 'strutturato'], famiglia: 'scripting', influenzatoDa: [],
      descrizione: 'Creato al CWI di Amsterdam come linguaggio facile da imparare, per sostituire il BASIC. Non ebbe grande successo, ma Guido van Rossum, che ci aveva lavorato, ne riprese molte idee in Python, a cominciare dall\'indentazione al posto delle parentesi.',
      ciao: 'WRITE "Ciao, mondo!"',
    },
    {
      id: 'haskell', nome: 'Haskell', anno: 1990,
      autori: 'Comitato di ricercatori (tra gli altri Paul Hudak, Simon Peyton Jones e Philip Wadler)', paradigmi: ['funzionale', 'dichiarativo'], famiglia: 'funzionali', influenzatoDa: ['miranda', 'ml', 'scheme'],
      descrizione: 'Un comitato internazionale lo definì a partire dal 1987 e ne pubblicò la prima versione nel 1990: un linguaggio funzionale puro e «pigro», chiamato così in onore del logico Haskell Curry. Molte sue idee sono poi passate nei linguaggi più diffusi.',
      ciao: 'main = putStrLn "Ciao, mondo!"',
    },
    {
      id: 'python', nome: 'Python', anno: 1991,
      autori: 'Guido van Rossum', paradigmi: ['scripting', 'imperativo', 'oggetti', 'funzionale'], famiglia: 'scripting', influenzatoDa: ['abc', 'c', 'haskell'], capitolo: 'web',
      descrizione: 'Guido van Rossum lo pubblicò nel febbraio 1991 al CWI di Amsterdam; il nome viene dal gruppo comico dei Monty Python. Leggibile e con una libreria sterminata, oggi è il linguaggio di riferimento per l\'analisi dei dati e l\'intelligenza artificiale.',
      ciao: 'print("Ciao, mondo!")',
      ciaoNota: 'In Python 3; fino a Python 2 si scriveva senza parentesi.',
    },
    {
      id: 'visual-basic', nome: 'Visual Basic', anno: 1991, alias: ['vb'],
      autori: 'Microsoft, da un prototipo di Alan Cooper', paradigmi: ['imperativo'], famiglia: 'dati', influenzatoDa: ['basic'], capitolo: 'oggetti',
      descrizione: 'Microsoft lo lanciò nel 1991: si disegna la finestra trascinando pulsanti e caselle, poi si scrive che cosa succede a ogni clic. Rese facile creare programmi per Windows e fu per anni il linguaggio dei gestionali d\'ufficio.',
      ciao: 'Private Sub Form_Load()\n    MsgBox "Ciao, mondo!"\nEnd Sub',
    },
    {
      id: 'lua', nome: 'Lua', anno: 1993, etichetta: 'sinistra',
      autori: 'Roberto Ierusalimschy, Luiz Henrique de Figueiredo e Waldemar Celes', paradigmi: ['scripting', 'imperativo', 'funzionale'], famiglia: 'scripting', influenzatoDa: ['scheme'],
      descrizione: 'Nato nel 1993 alla Pontificia Università Cattolica di Rio de Janeiro: piccolo, veloce e facile da incorporare dentro altri programmi, per questo è diffusissimo nei videogiochi. In portoghese il nome significa «luna».',
      ciao: 'print("Ciao, mondo!")',
    },
    {
      id: 'r', nome: 'R', anno: 1993,
      autori: 'Ross Ihaka e Robert Gentleman', paradigmi: ['funzionale', 'imperativo'], famiglia: 'dati', influenzatoDa: ['s', 'scheme'],
      descrizione: 'Ross Ihaka e Robert Gentleman lo crearono all\'Università di Auckland, in Nuova Zelanda, come versione libera di S arricchita da idee di Scheme; il nome viene dalle loro iniziali. È lo strumento quotidiano di statistici, biologi ed economisti.',
      ciao: 'cat("Ciao, mondo!\\n")',
    },
    {
      id: 'java', nome: 'Java', anno: 1995,
      autori: 'James Gosling e il suo gruppo alla Sun Microsystems', paradigmi: ['oggetti', 'imperativo'], famiglia: 'oggetti', influenzatoDa: ['cpp', 'smalltalk', 'objective-c'], capitolo: 'web',
      descrizione: 'Presentato dalla Sun nel maggio 1995: il compilatore produce bytecode per una macchina virtuale, così lo stesso programma gira su sistemi diversi («write once, run anywhere», scrivi una volta, esegui ovunque). Oggi lo si trova dai server delle banche ad Android.',
      ciao: 'public class Ciao {\n    public static void main(String[] args) {\n        System.out.println("Ciao, mondo!");\n    }\n}',
    },
    {
      id: 'javascript', nome: 'JavaScript', anno: 1995, alias: ['js', 'ecmascript'],
      autori: 'Brendan Eich', paradigmi: ['scripting', 'imperativo', 'funzionale', 'oggetti'], famiglia: 'scripting', influenzatoDa: ['scheme', 'self', 'java'], capitolo: 'web',
      descrizione: 'Brendan Eich ne scrisse il primo prototipo in una decina di giorni, nel maggio 1995, per il browser Netscape: la sintassi somiglia a Java, ma le idee vengono da Scheme e da Self. Oggi gira in ogni browser e, con Node.js, anche sui server.',
      ciao: 'console.log("Ciao, mondo!");',
    },
    {
      id: 'php', nome: 'PHP', anno: 1995,
      autori: 'Rasmus Lerdorf', paradigmi: ['scripting', 'imperativo', 'oggetti'], famiglia: 'scripting', influenzatoDa: ['perl', 'c'], capitolo: 'web',
      descrizione: 'Rasmus Lerdorf lo pubblicò nel 1995 come insieme di strumenti per la sua pagina personale («Personal Home Page Tools»). Il codice si mescola all\'HTML e il server lo esegue prima di spedire la pagina: in PHP sono scritti MediaWiki, il software di Wikipedia, e WordPress.',
      ciao: '<?php\necho "Ciao, mondo!\\n";',
    },
    {
      id: 'ruby', nome: 'Ruby', anno: 1995,
      autori: 'Yukihiro «Matz» Matsumoto', paradigmi: ['scripting', 'oggetti', 'funzionale'], famiglia: 'scripting', influenzatoDa: ['perl', 'smalltalk', 'lisp'], capitolo: 'web',
      descrizione: 'Yukihiro Matsumoto lo pubblicò in Giappone nel 1995 con un obiettivo dichiarato: rendere felici i programmatori. Unisce la praticità di Perl agli oggetti di Smalltalk; il framework Ruby on Rails, del 2004, lo rese famoso in tutto il mondo.',
      ciao: 'puts "Ciao, mondo!"',
    },
    {
      id: 'ocaml', nome: 'OCaml', anno: 1996,
      autori: 'Xavier Leroy e colleghi dell\'INRIA', paradigmi: ['funzionale', 'imperativo', 'oggetti'], famiglia: 'funzionali', influenzatoDa: ['ml'],
      descrizione: 'Sviluppato all\'INRIA, in Francia, a partire da Caml, un dialetto di ML: aggiunge gli oggetti alla programmazione funzionale con tipi dedotti automaticamente. Il primo compilatore di Rust era scritto in OCaml.',
      ciao: 'let () = print_endline "Ciao, mondo!"',
    },
    {
      id: 'csharp', nome: 'C#', anno: 2000, alias: ['c sharp', 'csharp'],
      autori: 'Anders Hejlsberg (Microsoft)', paradigmi: ['oggetti', 'imperativo', 'funzionale'], famiglia: 'oggetti', influenzatoDa: ['java', 'cpp'], capitolo: 'ovunque',
      descrizione: 'Anders Hejlsberg, già autore di Turbo Pascal e Delphi, lo progettò alla Microsoft per la piattaforma .NET; fu presentato nel 2000. Somiglia a Java ma è cresciuto in fretta: si usa per applicazioni Windows, servizi web e videogiochi.',
      ciao: 'using System;\n\nclass Ciao {\n    static void Main() {\n        Console.WriteLine("Ciao, mondo!");\n    }\n}',
    },
    {
      id: 'scala', nome: 'Scala', anno: 2004,
      autori: 'Martin Odersky', paradigmi: ['oggetti', 'funzionale'], famiglia: 'oggetti', influenzatoDa: ['java', 'ml', 'haskell'],
      descrizione: 'Martin Odersky lo creò al Politecnico federale di Losanna (EPFL) e lo pubblicò nel 2004: gira sulla macchina virtuale di Java e fonde oggetti e programmazione funzionale. Il nome viene da «scalable language», linguaggio che cresce con i problemi.',
      ciao: 'object Ciao {\n  def main(args: Array[String]): Unit =\n    println("Ciao, mondo!")\n}',
    },
    {
      id: 'fsharp', nome: 'F#', anno: 2005, alias: ['f sharp', 'fsharp'],
      autori: 'Don Syme (Microsoft Research)', paradigmi: ['funzionale', 'oggetti'], famiglia: 'funzionali', influenzatoDa: ['ocaml', 'csharp', 'haskell'],
      descrizione: 'Don Syme, a Microsoft Research di Cambridge, portò le idee di OCaml sulla piattaforma .NET: la prima versione è del 2005. Funzionale per vocazione, può usare tutte le librerie scritte in C#.',
      ciao: 'printfn "Ciao, mondo!"',
    },
    {
      id: 'clojure', nome: 'Clojure', anno: 2007,
      autori: 'Rich Hickey', paradigmi: ['funzionale'], famiglia: 'funzionali', influenzatoDa: ['common-lisp', 'haskell', 'java'],
      descrizione: 'Rich Hickey lo pubblicò nel 2007: un Lisp moderno che gira sulla macchina virtuale di Java, con dati immutabili pensati per i programmi che fanno molte cose in parallelo.',
      ciao: '(println "Ciao, mondo!")',
    },
    {
      id: 'go', nome: 'Go', anno: 2009, alias: ['golang'],
      autori: 'Robert Griesemer, Rob Pike e Ken Thompson (Google)', paradigmi: ['imperativo', 'strutturato'], famiglia: 'c', influenzatoDa: ['c', 'pascal', 'modula-2'], capitolo: 'ovunque',
      descrizione: 'Progettato alla Google da Robert Griesemer, Rob Pike e Ken Thompson (lo stesso di Unix) e annunciato nel novembre 2009: semplice, veloce da compilare, con la concorrenza integrata. È il linguaggio di molti strumenti del cloud, come Docker e Kubernetes.',
      ciao: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Ciao, mondo!")\n}',
    },
    {
      id: 'rust', nome: 'Rust', anno: 2010,
      notaAnno: 'Progetto personale dal 2006, annunciato da Mozilla nel 2010, versione 1.0 nel 2015.',
      autori: 'Graydon Hoare, poi Mozilla e una grande comunità', paradigmi: ['imperativo', 'strutturato', 'funzionale'], famiglia: 'c', influenzatoDa: ['cpp', 'ocaml', 'haskell', 'erlang'], capitolo: 'ovunque',
      descrizione: 'Nato come progetto personale di Graydon Hoare e sostenuto da Mozilla, che lo annunciò nel 2010; la versione 1.0 è del 2015. Il compilatore controlla chi possiede ogni dato in memoria: così evita intere famiglie di errori senza bisogno di un garbage collector.',
      ciao: 'fn main() {\n    println!("Ciao, mondo!");\n}',
    },
    {
      id: 'kotlin', nome: 'Kotlin', anno: 2011,
      autori: 'JetBrains, con Andrey Breslav alla guida del progetto', paradigmi: ['oggetti', 'funzionale'], famiglia: 'oggetti', influenzatoDa: ['java', 'scala', 'csharp'], capitolo: 'ovunque',
      descrizione: 'L\'azienda JetBrains lo presentò nel 2011: gira sulla macchina virtuale di Java, ma è più conciso e protegge dagli errori con i valori nulli. Dal 2017 Google lo sostiene ufficialmente per le app Android; il nome viene da un\'isola vicino a San Pietroburgo.',
      ciao: 'fun main() {\n    println("Ciao, mondo!")\n}',
    },
    {
      id: 'julia', nome: 'Julia', anno: 2012,
      autori: 'Jeff Bezanson, Stefan Karpinski, Viral B. Shah e Alan Edelman', paradigmi: ['imperativo', 'funzionale'], famiglia: 'dati', influenzatoDa: ['fortran', 'lisp', 'python', 'r'],
      descrizione: 'Presentato nel 2012 da un gruppo legato al MIT con un obiettivo ambizioso: la comodità di Python e di R insieme alla velocità del C e del Fortran, per il calcolo scientifico.',
      ciao: 'println("Ciao, mondo!")',
    },
    {
      id: 'typescript', nome: 'TypeScript', anno: 2012, alias: ['ts'],
      autori: 'Microsoft (tra i progettisti Anders Hejlsberg)', paradigmi: ['scripting', 'oggetti', 'funzionale'], famiglia: 'scripting', influenzatoDa: ['javascript', 'csharp'], capitolo: 'ovunque',
      descrizione: 'Presentato dalla Microsoft nell\'ottobre 2012: è JavaScript con l\'aggiunta dei tipi. Il compilatore controlla il codice e poi lo traduce in JavaScript normale, che gira ovunque.',
      ciao: 'const saluto: string = "Ciao, mondo!";\nconsole.log(saluto);',
    },
    {
      id: 'swift', nome: 'Swift', anno: 2014,
      autori: 'Chris Lattner e il gruppo di Apple', paradigmi: ['oggetti', 'funzionale', 'imperativo'], famiglia: 'oggetti', influenzatoDa: ['objective-c', 'rust', 'haskell'], capitolo: 'ovunque',
      descrizione: 'Apple lo presentò nel giugno 2014, su progetto di Chris Lattner, per sostituire Objective-C nelle app per iPhone e Mac: più sicuro e moderno, con idee prese da Rust, Haskell e altri. Dal 2015 è open source.',
      ciao: 'print("Ciao, mondo!")',
    },
    {
      id: 'zig', nome: 'Zig', anno: 2016,
      autori: 'Andrew Kelley', paradigmi: ['imperativo', 'strutturato'], famiglia: 'c', influenzatoDa: ['c'],
      descrizione: 'Andrew Kelley lo presentò nel 2016 come possibile erede del C: niente allocazioni di memoria nascoste, e un compilatore che sa compilare anche programmi scritti in C.',
      ciao: 'const std = @import("std");\n\npub fn main() void {\n    std.debug.print("Ciao, mondo!\\n", .{});\n}',
      ciaoNota: 'std.debug.print scrive sul canale degli errori: è il modo più breve per salutare in Zig.',
    },
  ];

  /* ---------- relazioni: antenati e discendenti ---------- */

  const PER_ID = new Map(LINGUAGGI.map((l) => [l.id, l]));
  const FIGLI = new Map(LINGUAGGI.map((l) => [l.id, []]));
  for (const l of LINGUAGGI) for (const p of l.influenzatoDa) if (FIGLI.has(p)) FIGLI.get(p).push(l.id);

  function trova(id) { return PER_ID.get(id) || null; }
  function antenatiDiretti(id) { const l = trova(id); return l ? l.influenzatoDa.filter((p) => PER_ID.has(p)) : []; }
  function discendentiDiretti(id) { return (FIGLI.get(id) || []).slice(); }

  // Visita in ampiezza: Map id -> distanza (1 = diretto, 2 = di seconda generazione...).
  function visita(id, vicini) {
    const dist = new Map();
    const coda = [id];
    const livello = new Map([[id, 0]]);
    while (coda.length) {
      const x = coda.shift();
      for (const y of vicini(x)) {
        if (livello.has(y)) continue;
        livello.set(y, livello.get(x) + 1);
        dist.set(y, livello.get(x) + 1);
        coda.push(y);
      }
    }
    return dist;
  }
  function antenati(id) { return visita(id, antenatiDiretti); }
  function discendenti(id) { return visita(id, discendentiDiretti); }

  // Restituisce un ciclo [a, b, ..., a] se le influenze ne contengono uno, altrimenti null.
  function trovaCiclo(lista) {
    const elenco = lista || LINGUAGGI;
    const mappa = new Map(elenco.map((l) => [l.id, l]));
    const colore = new Map();
    const pila = [];
    function dfs(id) {
      colore.set(id, 1);
      pila.push(id);
      const l = mappa.get(id);
      for (const p of (l ? l.influenzatoDa : [])) {
        if (!mappa.has(p)) continue;
        if (colore.get(p) === 1) return pila.slice(pila.indexOf(p)).concat(p);
        if (!colore.get(p)) { const c = dfs(p); if (c) return c; }
      }
      pila.pop();
      colore.set(id, 2);
      return null;
    }
    for (const l of elenco) if (!colore.get(l.id)) { const c = dfs(l.id); if (c) return c; }
    return null;
  }

  // Il linguaggio con più discendenti (anche indiretti): una curiosità per la scheda vuota.
  function piuProlifico() {
    let migliore = null;
    for (const l of LINGUAGGI) {
      const n = discendenti(l.id).size;
      if (!migliore || n > migliore.n) migliore = { id: l.id, n: n };
    }
    return migliore;
  }

  /* ---------- ricerca, filtri, ordinamento ---------- */

  function normalizza(t) {
    return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function inizioParola(testo, q) {
    return (' ' + testo.replace(/[^a-z0-9+#/\- ]+/g, ' ')).indexOf(' ' + q) >= 0;
  }
  // Una o due lettere: inizio di parola nei nomi (così «c» trova C, C++, COBOL, ma «go» non trova ALGOL).
  // Da tre lettere: anche dentro il nome. Gli autori si cercano per inizio di parola («wirth», «hopper»).
  function corrisponde(l, testo) {
    const q = normalizza(testo);
    if (!q) return true;
    const nomi = [l.nome].concat(l.alias || []).map(normalizza);
    if (q.length <= 2 ? nomi.some((n) => inizioParola(n, q)) : nomi.some((n) => n.indexOf(q) >= 0)) return true;
    return q.length >= 3 && inizioParola(normalizza(l.autori), q);
  }
  function cerca(testo, lista) {
    return (lista || LINGUAGGI).filter((l) => corrisponde(l, testo)).map((l) => l.id);
  }
  function filtra(paradigma, testo, lista) {
    return (lista || LINGUAGGI).filter((l) => (!paradigma || paradigma === 'tutti' || l.paradigmi.indexOf(paradigma) >= 0) && corrisponde(l, testo)).map((l) => l.id);
  }
  function ordina(lista, chiave, verso) {
    const v = verso === -1 ? -1 : 1;
    const posCorsia = new Map(CORSIE.map((c, i) => [c.id, i]));
    const perNome = (a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
    const confronti = {
      nome: perNome,
      anno: (a, b) => a.anno - b.anno || perNome(a, b),
      famiglia: (a, b) => posCorsia.get(a.famiglia) - posCorsia.get(b.famiglia) || a.anno - b.anno || perNome(a, b),
    };
    const cmp = confronti[chiave] || confronti.anno;
    return lista.slice().sort((a, b) => v * cmp(a, b));
  }
  function nomeParadigma(id) { const p = PARADIGMI.find((x) => x.id === id); return p ? p.nome : id; }
  function nomeCorsia(id) { const c = CORSIE.find((x) => x.id === id); return c ? c.nome : id; }

  /* ---------- impaginazione della mappa ----------
   * x = anno (pxAnno pixel per anno); ogni corsia ha tante righe quante ne servono
   * perché le etichette non si sovrappongano (si riempie la prima riga libera).
   */

  const GEO = { anno0: 1943, pxAnno: 18, margine: 18, asse: 34, riga: 26, pad: 8, offEt: 9, spazio: 10, raggio: 4.5, fondo: 6 };

  function xAnno(anno, geo) { const g = geo || GEO; return g.margine + (anno - g.anno0) * g.pxAnno; }

  // Larghezza stimata di un nome a 13 px, peso 600 (in Node; nel browser si misura davvero).
  function stimaLarghezza(t) {
    let s = 0;
    for (const ch of String(t)) {
      if ('iIl.,:;!|j\''.indexOf(ch) >= 0) s += 3.9;
      else if (ch === ' ') s += 3.6;
      else if ('ftr-/()'.indexOf(ch) >= 0) s += 4.8;
      else if ('mwMW'.indexOf(ch) >= 0) s += 11.2;
      else if (ch >= 'A' && ch <= 'Z') s += 8.9;
      else if (ch >= '0' && ch <= '9') s += 7.6;
      else if ('+#'.indexOf(ch) >= 0) s += 8;
      else s += 7.3;
    }
    return Math.ceil(s * 1.04);
  }

  function arrotonda(n) { return Math.round(n * 10) / 10; }

  // Curva morbida dal punto dell'antenato a quello del discendente.
  function curva(x1, y1, x2, y2) {
    const r = arrotonda;
    if (Math.abs(x2 - x1) < 6) {
      const b = 26;
      return 'M' + r(x1) + ' ' + r(y1) + 'C' + r(x1 + b) + ' ' + r(y1) + ' ' + r(x2 + b) + ' ' + r(y2) + ' ' + r(x2) + ' ' + r(y2);
    }
    const dx = Math.max(18, (x2 - x1) * 0.5);
    return 'M' + r(x1) + ' ' + r(y1) + 'C' + r(x1 + dx) + ' ' + r(y1) + ' ' + r(x2 - dx) + ' ' + r(y2) + ' ' + r(x2) + ' ' + r(y2);
  }

  function impagina(opz) {
    const geo = Object.assign({}, GEO, opz && opz.geo);
    const misura = (opz && opz.misura) || stimaLarghezza;
    const nodi = new Map();
    const corsie = [];
    let y = geo.asse;
    let rigaGlobale = 0;
    for (const c of CORSIE) {
      const membri = LINGUAGGI.filter((l) => l.famiglia === c.id)
        .sort((a, b) => a.anno - b.anno || LINGUAGGI.indexOf(a) - LINGUAGGI.indexOf(b));
      const fini = [];
      const posti = [];
      for (const l of membri) {
        const x = xAnno(l.anno, geo);
        const w = misura(l.nome);
        const sinistra = l.etichetta === 'sinistra';
        const da = sinistra ? x - geo.offEt - w : x - geo.raggio;
        const a = sinistra ? x + geo.raggio : x + geo.offEt + w;
        let r = fini.findIndex((f) => f + geo.spazio <= da);
        if (r < 0) { r = fini.length; fini.push(-Infinity); }
        fini[r] = a;
        posti.push({ l: l, x: x, w: w, r: r, sinistra: sinistra, da: da, a: a });
      }
      const righe = Math.max(1, fini.length);
      const altezza = righe * geo.riga + geo.pad * 2;
      for (const p of posti) {
        nodi.set(p.l.id, {
          id: p.l.id, x: p.x, y: y + geo.pad + p.r * geo.riga + geo.riga / 2,
          riga: p.r, rigaGlobale: rigaGlobale + p.r, corsia: c.id, larghezza: p.w, sinistra: p.sinistra, x0: p.da, x1: p.a,
        });
      }
      corsie.push({ id: c.id, nome: c.nome, y: y, altezza: altezza, righe: righe });
      y += altezza;
      rigaGlobale += righe;
    }
    const archi = [];
    for (const l of LINGUAGGI) {
      for (const p of l.influenzatoDa) {
        const A = nodi.get(p);
        const B = nodi.get(l.id);
        if (A && B) archi.push({ da: p, a: l.id, d: curva(A.x, A.y, B.x, B.y) });
      }
    }
    return {
      geo: geo,
      larghezza: Math.ceil(xAnno(ANNO_MAX + 1, geo) + 20),
      altezza: Math.ceil(y + geo.fondo),
      righe: rigaGlobale,
      nodi: nodi,
      corsie: corsie,
      archi: archi,
    };
  }

  // Quanta parte di una curva è disegnata quando il cursore del tempo è all'anno «tempo».
  function frazioneArco(tempo, annoDa, annoA) {
    if (annoA <= annoDa) return tempo >= annoA ? 1 : 0;
    return Math.max(0, Math.min(1, (tempo - annoDa) / (annoA - annoDa)));
  }

  /* ---------- aspetto ---------- */

  const css = `
.lab-atlante { container-type: inline-size; --atl-sel: var(--trace-1); --atl-anc: var(--trace-2); --atl-disc: var(--trace-3); --atl-trova: var(--trace-4); }
.lab-atlante .pg-btn[aria-pressed="true"] { background: var(--lab-bright); border-color: var(--lab-bright); color: #08130f; }
.lab-atlante .pg-btn[aria-pressed="true"]:hover { color: #08130f; }

.lab-atlante-barra { gap: 10px 12px; }
.lab-atlante-barra .pg-campo { flex: 1 1 200px; max-width: 360px; min-width: 0; font-family: var(--font); font-weight: 600; color: var(--lab-bright); }
.lab-atlante-barra .pg-campo::placeholder { color: var(--lab-text); opacity: .75; font-weight: 500; }

.lab-atlante-filtri { display: flex; align-items: center; gap: 8px 12px; padding: 10px 18px; border-bottom: 1px solid var(--lab-line); }
.lab-atlante-filtri-t, .lab-atlante-angolo, .lab-atlante-ciao-t, .lab-atlante-eyebrow, .lab-atlante-conta-t {
  font: 700 .8125rem var(--mono); text-transform: uppercase; letter-spacing: .1em; color: var(--lab-text);
}
.lab-atlante-filtri-t { flex: none; }
.lab-atlante-chips { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; padding: 3px; margin: -3px; }
.lab-atlante-chip { border-radius: 999px; padding: 0 14px; font-size: .875rem; }

.lab-atlante-tempobar { display: flex; align-items: center; gap: 8px 14px; padding: 10px 18px; border-bottom: 1px solid var(--lab-line); }
.lab-atlante-play { min-width: 128px; }
.lab-atlante-play-i { display: inline-block; width: 1.1em; text-align: center; }
.lab-atlante-tempobar .pg-cursore { flex: 1 1 auto; width: auto; min-width: 0; height: 40px; margin: 0; accent-color: var(--lab-bright); cursor: pointer; }
.lab-atlante-anno { min-width: 4ch; text-align: right; font: 700 1.05rem var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; }

.lab-atlante-scroll {
  --atl-col: 128px;
  display: flex; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain;
  scroll-padding-left: var(--atl-col); background: var(--lab-bg);
  scrollbar-width: thin; scrollbar-color: #33463f transparent;
}
.lab-atlante-corsie {
  position: sticky; left: 0; z-index: 2; flex: none; width: var(--atl-col);
  background: var(--lab-panel); border-right: 1px solid var(--lab-line);
  box-shadow: 12px 0 18px -16px rgba(0, 0, 0, .95);
}
.lab-atlante-angolo { display: flex; align-items: center; padding: 0 12px; letter-spacing: .08em; }
.lab-atlante-corsia { display: flex; align-items: center; padding: 0 10px 0 14px; border-top: 1px solid var(--lab-line); font: 700 .8125rem/1.3 var(--font); color: var(--lab-bright); text-wrap: balance; }
.lab-atlante-corsia.dispari { background: rgba(255, 255, 255, .025); }
.lab-atlante-svg { display: block; flex: none; -webkit-tap-highlight-color: transparent; }

.lab-atlante-banda.dispari { fill: rgba(255, 255, 255, .025); }
.lab-atlante-banda { fill: transparent; }
.lab-atlante-sep { stroke: var(--lab-line); stroke-width: 1; }
.lab-atlante-dec { stroke: rgba(169, 195, 185, .16); stroke-width: 1; }
.lab-atlante-min { stroke: rgba(169, 195, 185, .07); stroke-width: 1; }
.lab-atlante-dec-t { font: 600 13px var(--mono); fill: var(--lab-text); }
.lab-atlante-oggi { stroke: var(--lab-bright); stroke-width: 1; stroke-dasharray: 3 5; opacity: .45; }
.lab-atlante-oggi-t { font: 700 13px var(--mono); fill: var(--lab-bright); }

.lab-atlante-arco {
  fill: none; stroke: rgba(169, 195, 185, .34); stroke-width: 1.3; stroke-linecap: round;
  transition: opacity var(--pg-dur-normale) ease, stroke var(--pg-dur-normale) ease, stroke-width var(--pg-dur-normale) ease;
}
.lab-atlante-arco.hover { stroke: var(--lab-bright); stroke-width: 2; }
.lab-atlante-arco.e-anc { stroke: var(--atl-anc); stroke-width: 1.8; }
.lab-atlante-arco.e-disc { stroke: var(--atl-disc); stroke-width: 1.8; }
.lab-atlante-arco.e-dir { stroke-width: 2.8; }
.lab-atlante-arco.spento { opacity: .07; }

.lab-atlante-nodo { cursor: pointer; outline: none; transition: opacity var(--pg-dur-normale) ease; }
.lab-atlante-nodo:focus { outline: none; }
.lab-atlante-hit { fill: transparent; }
.lab-atlante-fuoco { fill: none; stroke: var(--atl-sel); stroke-width: 2; opacity: 0; }
.lab-atlante-nodo:focus-visible .lab-atlante-fuoco { opacity: 1; }
.lab-atlante-punto {
  fill: var(--lab-bg); stroke: var(--lab-text); stroke-width: 1.7;
  transform-box: fill-box; transform-origin: center;
  transition: transform var(--pg-dur-normale) var(--pg-ease-bounce), fill var(--pg-dur-veloce) ease, stroke var(--pg-dur-veloce) ease;
}
.lab-atlante-etichetta {
  font: 600 13px var(--font); fill: var(--lab-bright);
  paint-order: stroke; stroke: var(--lab-bg); stroke-width: 4px; stroke-linejoin: round;
  transition: fill var(--pg-dur-veloce) ease;
}
.lab-atlante-alone { fill: none; stroke: var(--atl-sel); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; }
.lab-atlante-nodo:hover .lab-atlante-punto, .lab-atlante-nodo.hover .lab-atlante-punto { transform: scale(1.35); stroke: var(--lab-bright); }
.lab-atlante-nodo.progetto .lab-atlante-punto { stroke-dasharray: 2.2 2; }
.lab-atlante-nodo.anc .lab-atlante-punto { fill: var(--atl-anc); stroke: var(--atl-anc); }
.lab-atlante-nodo.anc .lab-atlante-etichetta { fill: var(--atl-anc); }
.lab-atlante-nodo.disc .lab-atlante-punto { fill: var(--atl-disc); stroke: var(--atl-disc); }
.lab-atlante-nodo.disc .lab-atlante-etichetta { fill: var(--atl-disc); }
.lab-atlante-nodo.indiretto { opacity: .72; }
.lab-atlante-nodo.sel .lab-atlante-punto { fill: var(--atl-sel); stroke: var(--atl-sel); transform: scale(1.55); }
.lab-atlante-nodo.sel .lab-atlante-etichetta { fill: #fff; font-weight: 800; }
.lab-atlante-nodo.sel .lab-atlante-alone { opacity: .5; }
.lab-atlante-nodo.sel.pulsa .lab-atlante-alone { animation: lab-atlante-pulsa var(--pg-dur-lenta) var(--pg-ease-smooth) both; }
.lab-atlante-nodo.trovato .lab-atlante-punto { stroke: var(--atl-trova); stroke-width: 2.6; }
.lab-atlante-nodo.trovato .lab-atlante-etichetta { text-decoration: underline; text-decoration-color: var(--atl-trova); }
.lab-atlante-nodo.spento { opacity: .16; }
.lab-atlante-nodo.futuro { opacity: 0; pointer-events: none; }
.lab-atlante-nodo.futuro .lab-atlante-punto { transform: scale(.3); }
@keyframes lab-atlante-pulsa { from { transform: scale(.6); opacity: .85; } to { transform: scale(1.9); opacity: 0; } }

.lab-atlante-cursore { pointer-events: none; transition: opacity var(--pg-dur-normale) ease; }
.lab-atlante-cursore.nascosto { opacity: 0; }
.lab-atlante-cursore-alone { fill: rgba(238, 246, 242, .06); }
.lab-atlante-cursore-linea { stroke: var(--lab-bright); stroke-width: 1.5; }
.lab-atlante-cursore-et { fill: var(--lab-bright); }
.lab-atlante-cursore-t { font: 800 13px var(--mono); fill: #08130f; }

.lab-atlante-legenda { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 18px; margin: 0; padding: 10px 18px; border-top: 1px solid var(--lab-line); font-size: .8125rem; color: var(--lab-text); }
.lab-atlante-leg { display: inline-flex; align-items: center; gap: 7px; }
.lab-atlante-leg i { width: 10px; height: 10px; border-radius: 50%; border: 2px solid currentColor; }
.lab-atlante-leg.sel i { background: var(--atl-sel); border-color: var(--atl-sel); }
.lab-atlante-leg.anc i { background: var(--atl-anc); border-color: var(--atl-anc); }
.lab-atlante-leg.disc i { background: var(--atl-disc); border-color: var(--atl-disc); }
.lab-atlante-leg.prog i { border-style: dashed; color: var(--lab-text); }
.lab-atlante-leg.trova i { border-color: var(--atl-trova); }
.lab-atlante-conta { margin-left: auto; font: 600 .8125rem var(--mono); color: var(--lab-text); }

.lab-atlante-elenco { max-height: 560px; overflow: auto; border-bottom: 1px solid var(--lab-line); }
/* min-width: 0 annulla il min-width: 1050px che css/style.css dà a tutte le tabelle. */
.lab-atlante-tab { width: 100%; min-width: 0; border-collapse: collapse; font-size: .9rem; color: var(--lab-text); }
/* La didascalia nascosta non deve allargare la tabella (pg-sr ha white-space: nowrap). */
.lab-atlante-tab > caption { white-space: normal; }
.lab-atlante-tab th, .lab-atlante-tab td { padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--lab-line); vertical-align: middle; background: none; color: inherit; }
.lab-atlante-tab thead th { position: sticky; top: 0; z-index: 1; background: var(--lab-panel); padding: 4px 6px; white-space: nowrap; }
.lab-atlante-tab thead th.lab-atlante-th-fissa { padding: 4px 12px; font: 700 .8125rem var(--mono); text-transform: uppercase; letter-spacing: .08em; }
.lab-atlante-ord { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 8px; border: 0; border-radius: 8px; background: none; color: var(--lab-text); cursor: pointer; font: 700 .8125rem var(--mono); text-transform: uppercase; letter-spacing: .08em; }
.lab-atlante-ord:hover { color: var(--lab-bright); background: rgba(255, 255, 255, .05); }
th[aria-sort="ascending"] .lab-atlante-ord, th[aria-sort="descending"] .lab-atlante-ord { color: var(--lab-bright); }
.lab-atlante-freccia { display: inline-block; width: 1em; color: var(--lab-bright); }
.lab-atlante-tab tbody th { font-weight: 600; }
.lab-atlante-riga { display: inline-flex; align-items: center; min-height: 40px; padding: 0 10px; margin-left: -10px; border: 1px solid transparent; border-radius: 8px; background: none; color: var(--lab-bright); font: 700 .95rem var(--font); cursor: pointer; text-align: left; }
.lab-atlante-riga:hover { border-color: var(--lab-line); background: rgba(255, 255, 255, .04); }
.lab-atlante-riga[aria-pressed="true"] { background: color-mix(in srgb, var(--atl-sel) 18%, transparent); border-color: var(--atl-sel); }
.lab-atlante-riga-sub { display: none; }
.lab-atlante-td-anno { font: 600 .9rem var(--mono); color: var(--lab-bright); font-variant-numeric: tabular-nums; white-space: nowrap; }
.lab-atlante-tab tbody tr:hover { background: rgba(255, 255, 255, .025); }
.lab-atlante-tab tr.anc-riga .lab-atlante-riga { color: var(--atl-anc); }
.lab-atlante-tab tr.disc-riga .lab-atlante-riga { color: var(--atl-disc); }
.lab-atlante-vuota td { padding: 26px 16px; text-align: center; color: var(--lab-text); }
.lab-atlante-nota-tab { margin: 0; padding: 10px 18px; font-size: .8125rem; color: var(--lab-text); }

.lab-atlante-scheda { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 18px 26px; padding: 20px 22px 22px; background: var(--lab-panel); min-height: 230px; }
.lab-atlante-scheda > .lab-atlante-vuoto { grid-column: 1 / -1; }
.lab-atlante-scheda p { margin: 0; }
.lab-atlante-info { display: grid; gap: 10px; align-content: start; min-width: 0; }
.lab-atlante-eyebrow { color: var(--lab-text); }
.lab-atlante-nome { margin: 0; color: var(--lab-bright); font: 800 1.55rem/1.15 var(--font); letter-spacing: -0.01em; outline: none; }
.lab-atlante-nome:focus-visible { outline: 3px solid var(--atl-sel); outline-offset: 3px; border-radius: 4px; }
.lab-atlante-nome-anno { margin-left: 10px; padding: 2px 9px; border-radius: 999px; font: 700 .95rem var(--mono); color: #08130f; background: var(--atl-sel); vertical-align: 3px; }
.lab-atlante-notaanno { font-size: .875rem; color: var(--lab-text); font-style: italic; }
.lab-atlante-dati { display: grid; gap: 6px; margin: 0; font-size: .9rem; }
.lab-atlante-dati div { display: grid; grid-template-columns: 6.5em minmax(0, 1fr); gap: 10px; }
.lab-atlante-dati dt { color: var(--lab-text); font-weight: 600; }
.lab-atlante-dati dd { margin: 0; color: var(--lab-bright); }
.lab-atlante-par { display: inline-block; margin: 0 6px 4px 0; padding: 1px 9px; border-radius: 999px; border: 1px solid var(--lab-line); background: var(--lab-raised); font-size: .8125rem; color: var(--lab-bright); }
.lab-atlante-descr { font: 1rem/1.6 var(--pg-serif, Georgia, serif); color: var(--lab-text); }
.lab-atlante-rel { display: grid; gap: 6px; }
.lab-atlante-rel-t { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font-weight: 700; font-size: .875rem; }
.lab-atlante-rel.anc .lab-atlante-rel-t { color: var(--atl-anc); }
.lab-atlante-rel.disc .lab-atlante-rel-t { color: var(--atl-disc); }
.lab-atlante-rel-n { font: 500 .8125rem var(--font); color: var(--lab-text); }
.lab-atlante-rel-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.lab-atlante-relbtn {
  display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border-radius: 999px;
  border: 1px solid var(--lab-line); background: var(--lab-raised); color: var(--lab-bright);
  font: 600 .875rem var(--font); cursor: pointer;
  transition: border-color var(--pg-dur-veloce) ease, background var(--pg-dur-veloce) ease;
}
.lab-atlante-relbtn span { font: 500 .8125rem var(--mono); color: var(--lab-text); }
.lab-atlante-relbtn:hover { background: #1c2a26; border-color: var(--lab-bright); }
.lab-atlante-rel.anc .lab-atlante-relbtn { border-color: color-mix(in srgb, var(--atl-anc) 55%, var(--lab-line)); }
.lab-atlante-rel.disc .lab-atlante-relbtn { border-color: color-mix(in srgb, var(--atl-disc) 55%, var(--lab-line)); }
.lab-atlante-rel-vuoto { font-size: .875rem; color: var(--lab-text); }
.lab-atlante-cap a { color: var(--lab-bright); font-weight: 700; text-underline-offset: 3px; }
.lab-atlante-cap a:hover { color: var(--atl-sel); }
.lab-atlante-azioni { display: flex; flex-wrap: wrap; gap: 8px; }

.lab-atlante-ciao { margin: 0; min-width: 0; display: grid; gap: 8px; align-content: start; }
.lab-atlante-ciao pre { margin: 0; padding: 14px 16px; overflow-x: auto; background: #000; color: #d8e7e0; border: 1px solid var(--lab-line); border-radius: 10px; font: .875rem/1.6 var(--mono); tab-size: 4; }
.lab-atlante-ciao pre code { background: none; border: 0; padding: 0; color: inherit; font: inherit; }
.lab-atlante-ciao-n { font-size: .875rem; line-height: 1.55; color: var(--lab-text); }
.lab-atlante-ciao.assente .lab-atlante-ciao-n { padding: 14px 16px; border: 1px dashed var(--lab-line); border-radius: 10px; }

.lab-atlante-vuoto { display: grid; gap: 10px; max-width: 72ch; }
.lab-atlante-vuoto-t { font: 800 1.2rem var(--font); color: var(--lab-bright); }
.lab-atlante-vuoto p { color: var(--lab-text); line-height: 1.55; }
.lab-atlante-prova { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.lab-atlante-curiosa { font-size: .875rem; border-left: 3px solid var(--atl-disc); padding-left: 12px; }

.lab-atlante-spiega strong { color: var(--lab-bright); }
.lab-atlante-spiega .anc { color: var(--atl-anc); font-weight: 700; }
.lab-atlante-spiega .disc { color: var(--atl-disc); font-weight: 700; }

@container (max-width: 720px) {
  .lab-atlante-scheda { grid-template-columns: minmax(0, 1fr); padding: 16px; }
}
@container (max-width: 640px) {
  .lab-atlante-filtri { padding: 8px 0 8px 12px; }
  .lab-atlante-chips {
    flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-right: 30px;
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 34px), transparent);
    mask-image: linear-gradient(90deg, #000 calc(100% - 34px), transparent);
  }
  .lab-atlante-chips::-webkit-scrollbar { display: none; }
  .lab-atlante-chip { flex: none; }
  .lab-atlante-tempobar { padding: 8px 12px; gap: 8px 10px; }
  .lab-atlante-play { min-width: 0; }
  .lab-atlante-play-t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .lab-atlante-legenda { padding: 10px 12px; gap: 6px 14px; }
  .lab-atlante-conta { margin-left: 0; }
}
@container (max-width: 560px) {
  .lab-atlante-scroll { --atl-col: 86px; }
  .lab-atlante-corsia { padding: 0 6px 0 10px; }
  .lab-atlante-angolo { padding: 0 8px; letter-spacing: .04em; }
  .lab-atlante-td-fam, .lab-atlante-td-par, .lab-atlante-th-fam, .lab-atlante-th-par { display: none; }
  .lab-atlante-elenco { max-height: none; }
  .lab-atlante-riga-sub { display: block; margin-top: -2px; padding-bottom: 6px; font: 500 .8125rem var(--font); color: var(--lab-text); }
  .lab-atlante-dati div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .lab-atlante-arco, .lab-atlante-nodo, .lab-atlante-punto, .lab-atlante-etichetta, .lab-atlante-cursore, .lab-atlante-relbtn { transition: none; }
  .lab-atlante-nodo.sel.pulsa .lab-atlante-alone { animation: none; }
}
`;

  /* ---------- interfaccia ---------- */

  function monta(el, ctx) {
    const h = ctx.h;
    const s = ctx.s;
    const win = typeof window !== 'undefined' ? window : null;
    el.classList.add('lab-atlante');

    // Larghezze vere delle etichette: il carattere di sistema cambia da un computer all'altro.
    let misura = stimaLarghezza;
    try {
      const c2d = document.createElement('canvas').getContext('2d');
      const famiglia = getComputedStyle(el).fontFamily;
      if (c2d && famiglia) {
        c2d.font = '600 13px ' + famiglia;
        if (c2d.measureText('Python').width > 0) misura = (t) => Math.ceil(c2d.measureText(t).width) + 2;
      }
    } catch (e) { /* resta la stima */ }
    const M = impagina({ misura: misura });
    const G = M.geo;
    const ORDINE = LINGUAGGI.slice().sort((a, b) => a.anno - b.anno || M.nodi.get(a.id).y - M.nodi.get(b.id).y);
    const PROLIFICO = piuProlifico();

    const st = {
      sel: null, fuoco: ORDINE[0].id, paradigma: 'tutti', query: '', vista: 'mappa',
      tempo: ANNO_MAX, inRiproduzione: false, toccato: false, cameraLibera: false,
      aperti: new Set(), fatto: false, ord: { chiave: 'anno', verso: 1 },
    };

    const idCerca = ctx.uid('atl-cerca');
    const idTempo = ctx.uid('atl-tempo');
    const idPar = ctx.uid('atl-par');
    const idNome = ctx.uid('atl-nome');
    const idSpiega = ctx.uid('atl-spiega');

    /* barra: ricerca e vista */
    const campo = h('input', {
      type: 'search', id: idCerca, class: 'pg-campo', placeholder: 'Nome o autore, es. Wirth',
      autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-describedby': idSpiega,
    });
    const btnMappa = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'true' }, 'Mappa');
    const btnElenco = h('button', { type: 'button', class: 'pg-btn', 'aria-pressed': 'false' }, 'Vista elenco');
    const barra = h('div', { class: 'pg-strumenti lab-atlante-barra' },
      h('label', { class: 'pg-etichetta', for: idCerca }, 'Cerca'),
      campo,
      h('span', { class: 'pg-spazio' }),
      h('div', { class: 'pg-gruppo', role: 'group', 'aria-label': 'Vista' }, btnMappa, btnElenco));

    /* filtri per paradigma */
    const chips = [{ id: 'tutti', nome: 'Tutti' }].concat(PARADIGMI).map((p) => h('button', {
      type: 'button', class: 'pg-btn lab-atlante-chip', 'data-par': p.id, 'aria-pressed': p.id === 'tutti' ? 'true' : 'false',
    }, p.nome));
    const filtri = h('div', { class: 'lab-atlante-filtri' },
      h('span', { class: 'lab-atlante-filtri-t', id: idPar }, 'Paradigma'),
      h('div', { class: 'lab-atlante-chips', role: 'group', 'aria-labelledby': idPar }, chips));

    /* tempo */
    const btnPlay = h('button', { type: 'button', class: 'pg-btn lab-atlante-play', 'aria-controls': idTempo },
      h('span', { class: 'lab-atlante-play-i', 'aria-hidden': 'true' }, '▶'), h('span', { class: 'lab-atlante-play-t' }, 'Riproduci'));
    const cursoreTempo = h('input', {
      type: 'range', id: idTempo, class: 'pg-cursore', min: String(ANNO_MIN), max: String(ANNO_MAX), step: '1', value: String(ANNO_MAX),
      'aria-valuetext': 'fino al ' + ANNO_MAX,
    });
    const lettura = h('output', { class: 'lab-atlante-anno', for: idTempo, 'aria-hidden': 'true' }, String(ANNO_MAX));
    const barraTempo = h('div', { class: 'lab-atlante-tempobar' },
      btnPlay, h('label', { class: 'pg-etichetta', for: idTempo }, 'Fino al'), cursoreTempo, lettura);

    /* la mappa (SVG) */
    const svg = s('svg', {
      class: 'lab-atlante-svg', width: M.larghezza, height: M.altezza, viewBox: '0 0 ' + M.larghezza + ' ' + M.altezza,
      role: 'group', 'aria-label': 'Mappa dei linguaggi dal ' + ANNO_MIN + ' al ' + ANNO_MAX + '. Frecce per spostarsi tra i linguaggi, Invio per aprirne uno, Esc per chiudere.',
    });
    const gBande = s('g', { 'aria-hidden': 'true' });
    M.corsie.forEach((c, i) => {
      gBande.append(
        s('rect', { class: 'lab-atlante-banda' + (i % 2 ? ' dispari' : ''), x: 0, y: c.y, width: M.larghezza, height: c.altezza }),
        s('line', { class: 'lab-atlante-sep', x1: 0, x2: M.larghezza, y1: c.y + 0.5, y2: c.y + 0.5 }));
    });
    const gGriglia = s('g', { 'aria-hidden': 'true' });
    for (let a = ANNO_MIN; a < ANNO_MAX; a += 5) {
      const x = xAnno(a, G);
      const decennio = a % 10 === 0;
      gGriglia.append(s('line', { class: decennio ? 'lab-atlante-dec' : 'lab-atlante-min', x1: x, x2: x, y1: decennio ? 26 : G.asse, y2: M.altezza }));
      if (decennio) gGriglia.append(s('text', { class: 'lab-atlante-dec-t', x: x, y: 19, 'text-anchor': 'middle' }, String(a)));
    }
    const xOggi = xAnno(ANNO_MAX, G);
    gGriglia.append(
      s('line', { class: 'lab-atlante-oggi', x1: xOggi, x2: xOggi, y1: 26, y2: M.altezza }),
      s('text', { class: 'lab-atlante-oggi-t', x: xOggi, y: 19, 'text-anchor': 'middle' }, 'oggi'));

    const gArchi = s('g', { 'aria-hidden': 'true' });
    const archi = M.archi.map((a) => {
      const p = s('path', { class: 'lab-atlante-arco', d: a.d, pathLength: '1' });
      gArchi.append(p);
      return { da: a.da, a: a.a, el: p, annoDa: trova(a.da).anno, annoA: trova(a.a).anno, f: 1, animato: false };
    });

    const cursoreEt = s('text', { class: 'lab-atlante-cursore-t', x: 0, y: 19, 'text-anchor': 'middle' }, String(ANNO_MIN));
    const gCursore = s('g', { class: 'lab-atlante-cursore nascosto', 'aria-hidden': 'true' },
      s('rect', { class: 'lab-atlante-cursore-alone', x: -9, y: 26, width: 18, height: M.altezza - 26 }),
      s('line', { class: 'lab-atlante-cursore-linea', x1: 0, x2: 0, y1: 26, y2: M.altezza }),
      s('rect', { class: 'lab-atlante-cursore-et', x: -25, y: 4, width: 50, height: 21, rx: 6 }),
      cursoreEt);

    const gNodi = s('g', { role: 'list', 'aria-label': 'Linguaggi' });
    const nodi = new Map();
    for (const l of ORDINE) {
      const p = M.nodi.get(l.id);
      const hx = p.sinistra ? -(G.offEt + p.larghezza + 8) : -12;
      const hw = p.larghezza + G.offEt + 20;
      const g = s('g', {
        class: 'lab-atlante-nodo' + (l.progetto ? ' progetto' : ''), 'data-id': l.id,
        transform: 'translate(' + p.x + ' ' + p.y + ')', tabindex: l.id === st.fuoco ? '0' : '-1',
        role: 'button', 'aria-pressed': 'false', 'aria-label': etichettaAria(l),
      },
      s('rect', { class: 'lab-atlante-hit', x: hx, y: -13, width: hw, height: 26, rx: 7 }),
      s('rect', { class: 'lab-atlante-fuoco', x: hx + 1, y: -12, width: hw - 2, height: 24, rx: 7 }),
      s('circle', { class: 'lab-atlante-alone', r: 11 }),
      s('circle', { class: 'lab-atlante-punto', r: G.raggio }),
      s('text', { class: 'lab-atlante-etichetta', x: p.sinistra ? -G.offEt : G.offEt, y: 4.5, 'text-anchor': p.sinistra ? 'end' : 'start' }, l.nome));
      const voce = s('g', { role: 'listitem' }, g);
      gNodi.append(voce);
      nodi.set(l.id, g);
    }
    svg.append(gBande, gGriglia, gArchi, gCursore, gNodi);

    const colonna = h('div', { class: 'lab-atlante-corsie', 'aria-hidden': 'true' },
      h('div', { class: 'lab-atlante-angolo', style: 'height:' + G.asse + 'px' }, 'Famiglie'),
      M.corsie.map((c, i) => h('div', { class: 'lab-atlante-corsia' + (i % 2 ? ' dispari' : ''), style: 'height:' + c.altezza + 'px' }, h('span', null, c.nome))));
    const scroller = h('div', { class: 'lab-atlante-scroll' }, colonna, svg);

    const legenda = h('p', { class: 'lab-atlante-legenda' },
      h('span', { class: 'lab-atlante-leg sel' }, h('i'), 'scelto'),
      h('span', { class: 'lab-atlante-leg anc' }, h('i'), 'antenati: da chi ha preso idee'),
      h('span', { class: 'lab-atlante-leg disc' }, h('i'), 'discendenti: quelli che ha ispirato'),
      h('span', { class: 'lab-atlante-leg prog' }, h('i'), 'solo progetto'),
      h('span', { class: 'lab-atlante-conta' }, LINGUAGGI.length + ' linguaggi · ' + M.archi.length + ' influenze'));

    const vistaMappa = h('div', { class: 'lab-atlante-mappa' }, barraTempo, scroller, legenda);

    /* vista elenco */
    const colonne = [
      { chiave: 'nome', nome: 'Linguaggio', cls: '' },
      { chiave: 'anno', nome: 'Anno', cls: '' },
      { chiave: 'famiglia', nome: 'Famiglia', cls: 'lab-atlante-th-fam' },
      { chiave: null, nome: 'Paradigmi', cls: 'lab-atlante-th-par' },
    ];
    const intestazioni = colonne.map((c) => (c.chiave
      ? h('th', { scope: 'col', class: c.cls, 'data-chiave': c.chiave, 'aria-sort': 'none' },
        h('button', { type: 'button', class: 'lab-atlante-ord', 'data-chiave': c.chiave }, c.nome, h('span', { class: 'lab-atlante-freccia', 'aria-hidden': 'true' })))
      : h('th', { scope: 'col', class: c.cls + ' lab-atlante-th-fissa' }, c.nome)));
    const righe = new Map();
    for (const l of LINGUAGGI) {
      const par = l.paradigmi.map(nomeParadigma).join(', ');
      righe.set(l.id, h('tr', { 'data-id': l.id },
        h('th', { scope: 'row' },
          h('button', { type: 'button', class: 'lab-atlante-riga', 'data-id': l.id, 'aria-pressed': 'false' }, l.nome),
          h('span', { class: 'lab-atlante-riga-sub' }, nomeCorsia(l.famiglia) + ' · ' + par)),
        h('td', { class: 'lab-atlante-td-anno' }, String(l.anno) + (l.progetto ? '*' : '')),
        h('td', { class: 'lab-atlante-td-fam' }, nomeCorsia(l.famiglia)),
        h('td', { class: 'lab-atlante-td-par' }, par)));
    }
    const rigaVuota = h('tr', { class: 'lab-atlante-vuota', hidden: true }, h('td', { colspan: '4' }));
    const tbody = h('tbody');
    const tabella = h('table', { class: 'lab-atlante-tab' },
      h('caption', { class: 'pg-sr' }, 'Linguaggi di programmazione con anno, famiglia e paradigmi. I pulsanti nelle intestazioni ordinano la tabella.'),
      h('thead', null, h('tr', null, intestazioni)),
      tbody);
    const notaTab = h('p', { class: 'lab-atlante-nota-tab' }, '* Plankalkül rimase un progetto: fu realizzato su un computer solo decenni dopo.');
    const vistaElenco = h('div', { class: 'lab-atlante-vistaelenco', hidden: true },
      h('div', { class: 'lab-atlante-elenco' }, tabella), notaTab);

    /* scheda e spiegazione */
    const scheda = h('section', { class: 'lab-atlante-scheda', 'aria-label': 'Scheda del linguaggio' });
    const spiega = h('div', { class: 'pg-spiega lab-atlante-spiega', id: idSpiega });

    el.append(barra, filtri, vistaMappa, vistaElenco, scheda, spiega);

    /* ---------- disegno dello stato ---------- */

    function etichettaAria(l) {
      return l.nome + ', ' + l.anno + (l.progetto ? ', solo progetto' : '') + '. ' + nomeCorsia(l.famiglia) + '.';
    }

    function insiemeFiltro() {
      const q = normalizza(st.query);
      if (st.paradigma === 'tutti' && !q) return null;
      return new Set(filtra(st.paradigma, q));
    }

    function navigabile(id) {
      const l = trova(id);
      if (!l || l.anno > st.tempo + 1e-6) return false;
      const f = insiemeFiltro();
      return !f || !f.size || f.has(id);
    }

    function ridisegna() {
      const sel = st.sel;
      const anc = sel ? antenati(sel) : null;
      const disc = sel ? discendenti(sel) : null;
      const filtro = insiemeFiltro();
      const attivo = filtro && filtro.size ? filtro : null;
      const q = normalizza(st.query);
      for (const l of LINGUAGGI) {
        const g = nodi.get(l.id);
        const dA = anc ? anc.get(l.id) : undefined;
        const dD = disc ? disc.get(l.id) : undefined;
        const lignaggio = l.id === sel || dA != null || dD != null;
        g.classList.toggle('sel', l.id === sel);
        g.classList.toggle('anc', dA != null);
        g.classList.toggle('disc', dD != null);
        g.classList.toggle('indiretto', (dA != null && dA > 1) || (dD != null && dD > 1));
        g.classList.toggle('spento', (!!sel && !lignaggio) || (!!attivo && !attivo.has(l.id)));
        g.classList.toggle('trovato', !!q && !!attivo && attivo.has(l.id));
        g.setAttribute('aria-pressed', l.id === sel ? 'true' : 'false');
        const riga = righe.get(l.id);
        riga.classList.toggle('anc-riga', dA != null);
        riga.classList.toggle('disc-riga', dD != null);
        riga.querySelector('.lab-atlante-riga').setAttribute('aria-pressed', l.id === sel ? 'true' : 'false');
      }
      for (const a of archi) {
        const eAnc = !!sel && (a.a === sel || (anc.has(a.a) && anc.has(a.da)));
        const eDisc = !!sel && (a.da === sel || (disc.has(a.da) && disc.has(a.a)));
        a.el.classList.toggle('e-anc', eAnc);
        a.el.classList.toggle('e-disc', eDisc);
        a.el.classList.toggle('e-dir', (eAnc && a.a === sel) || (eDisc && a.da === sel));
        a.el.classList.toggle('spento', (!!sel && !eAnc && !eDisc) || (!!attivo && !(attivo.has(a.da) && attivo.has(a.a))));
      }
    }

    /* ---------- tempo: cursore, riproduzione e telecamera ---------- */

    function applicaTempo(t) {
      st.tempo = t;
      for (const l of LINGUAGGI) {
        const g = nodi.get(l.id);
        const futuro = l.anno > t + 1e-6;
        if (g.classList.contains('futuro') !== futuro) {
          g.classList.toggle('futuro', futuro);
          if (futuro) g.setAttribute('aria-hidden', 'true'); else g.removeAttribute('aria-hidden');
        }
      }
      for (const a of archi) {
        if (a.animato) continue;
        const f = frazioneArco(t, a.annoDa, a.annoA);
        if (f >= 1) {
          if (a.f < 1) { a.el.style.strokeDasharray = ''; a.el.style.strokeDashoffset = ''; }
        } else {
          if (a.f >= 1) a.el.style.strokeDasharray = '1 1';
          a.el.style.strokeDashoffset = String(arrotonda(1 - f) === 0 ? 0.001 : 1 - f);
        }
        a.f = f;
      }
      const fine = t >= ANNO_MAX - 1e-6;
      const anno = Math.max(ANNO_MIN, Math.min(ANNO_MAX, Math.floor(t + 1e-6)));
      gCursore.classList.toggle('nascosto', fine);
      gCursore.setAttribute('transform', 'translate(' + arrotonda(xAnno(Math.max(t, ANNO_MIN - 1), G)) + ' 0)');
      cursoreEt.textContent = String(anno);
      cursoreTempo.value = String(anno);
      cursoreTempo.setAttribute('aria-valuetext', fine ? 'fino a oggi, ' + ANNO_MAX : 'fino al ' + anno);
      lettura.textContent = String(anno);
      if (!navigabile(st.fuoco)) {
        const primo = ORDINE.find((l) => navigabile(l.id));
        if (primo) impostaFuoco(primo.id, false);
      }
    }

    let fermaPlay = null;
    function aggiornaPlay() {
      btnPlay.querySelector('.lab-atlante-play-i').textContent = st.inRiproduzione ? '❚❚' : '▶';
      btnPlay.querySelector('.lab-atlante-play-t').textContent = st.inRiproduzione ? 'Pausa' : (st.tempo >= ANNO_MAX ? 'Riproduci' : 'Continua');
      btnPlay.setAttribute('aria-label', st.inRiproduzione ? 'Metti in pausa la cronologia' : 'Riproduci la cronologia dal ' + (st.tempo >= ANNO_MAX ? ANNO_MIN : Math.floor(st.tempo)));
    }

    function larghezzaColonna() { return colonna.offsetWidth || 0; }

    function seguiCamera(anno) {
      if (st.cameraLibera) return;
      const vis = scroller.clientWidth - larghezzaColonna();
      if (vis <= 0) return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const obiettivo = Math.max(0, Math.min(max, xAnno(anno, G) - vis * 0.62));
      if (Math.abs(scroller.scrollLeft - obiettivo) > 0.5) scroller.scrollLeft = obiettivo;
    }

    function riproduci() {
      fermaLignaggio();
      const t0 = st.tempo >= ANNO_MAX - 0.5 ? ANNO_MIN - 1 : st.tempo;
      st.inRiproduzione = true;
      st.cameraLibera = false;
      applicaTempo(t0);
      aggiornaPlay();
      ctx.annuncia('Il tempo scorre: i linguaggi compaiono anno dopo anno.');
      if (ctx.riduci) {
        // Movimento ridotto: un decennio alla volta, senza scorrimenti morbidi.
        let attesa = 0;
        let anno = t0;
        fermaPlay = ctx.ciclo((dt) => {
          attesa += dt;
          if (attesa < 1100) return;
          attesa = 0;
          anno = Math.min(ANNO_MAX, Math.floor(anno / 10) * 10 + 10);
          applicaTempo(anno);
          seguiCamera(anno);
          if (anno >= ANNO_MAX) fineRiproduzione();
        });
        return;
      }
      const durata = 6500 * (ANNO_MAX - t0) / (ANNO_MAX - ANNO_MIN + 1);
      let trascorso = 0;
      fermaPlay = ctx.ciclo((dt) => {
        trascorso += dt;
        const p = Math.min(1, trascorso / durata);
        const anno = t0 + (ANNO_MAX - t0) * ctx.EASING.sharp(p);
        applicaTempo(anno);
        seguiCamera(anno);
        if (p >= 1) fineRiproduzione();
      });
    }
    function fineRiproduzione() {
      if (fermaPlay) fermaPlay();
      fermaPlay = null;
      st.inRiproduzione = false;
      aggiornaPlay();
      ctx.annuncia(LINGUAGGI.length + ' linguaggi e ' + M.archi.length + ' influenze, dal ' + ANNO_MIN + ' a oggi. Tocca un linguaggio per vederne la parentela.');
    }
    function fermaRiproduzione() {
      if (!st.inRiproduzione) return;
      if (fermaPlay) fermaPlay();
      fermaPlay = null;
      st.inRiproduzione = false;
      aggiornaPlay();
    }

    // Qualsiasi scelta dell'utente ferma l'animazione d'ingresso e mostra la mappa completa.
    function interazione() {
      st.toccato = true;
      if (osservatore) { osservatore.disconnect(); osservatore = null; }
      if (st.inRiproduzione) { fermaRiproduzione(); applicaTempo(ANNO_MAX); aggiornaPlay(); }
    }

    /* ---------- lignaggio animato ---------- */

    let fermaAnim = null;
    let vociAnim = [];
    function fermaLignaggio() {
      if (fermaAnim) fermaAnim();
      fermaAnim = null;
      for (const v of vociAnim) {
        v.a.animato = false;
        v.a.el.style.strokeDasharray = '';
        v.a.el.style.strokeDashoffset = '';
        v.a.f = 1;
      }
      vociAnim = [];
    }
    // Le idee scorrono nel tempo: prima gli antenati più lontani verso il linguaggio scelto,
    // poi dal linguaggio scelto verso i discendenti, generazione dopo generazione.
    function animaLignaggio() {
      fermaLignaggio();
      const sel = st.sel;
      if (!sel || ctx.riduci) return;
      const anc = antenati(sel);
      const disc = discendenti(sel);
      let maxA = 0;
      for (const d of anc.values()) maxA = Math.max(maxA, d);
      const passo = 110;
      const durata = 330;
      for (const a of archi) {
        if (frazioneArco(st.tempo, a.annoDa, a.annoA) < 1) continue;
        let inizio = null;
        if (a.a === sel || (anc.has(a.a) && anc.has(a.da))) {
          const d = a.a === sel ? 0 : anc.get(a.a);
          inizio = (maxA - 1 - d) * passo;
        } else if (a.da === sel || (disc.has(a.da) && disc.has(a.a))) {
          const d = a.da === sel ? 0 : disc.get(a.da);
          inizio = maxA * passo + d * passo;
        }
        if (inizio == null) continue;
        a.animato = true;
        a.el.style.strokeDasharray = '1 1';
        a.el.style.strokeDashoffset = '1';
        vociAnim.push({ a: a, inizio: Math.max(0, inizio) });
      }
      if (!vociAnim.length) return;
      const totale = vociAnim.reduce((m, v) => Math.max(m, v.inizio), 0) + durata;
      let t = 0;
      const stop = ctx.ciclo((dt) => {
        t += dt;
        for (const v of vociAnim) {
          const p = Math.max(0, Math.min(1, (t - v.inizio) / durata));
          v.a.el.style.strokeDashoffset = String(1 - ctx.EASING.smooth(p));
        }
        if (t >= totale) fermaLignaggio();
      });
      fermaAnim = stop;
    }

    function pulsa(id) {
      const g = nodi.get(id);
      if (!g || ctx.riduci) return;
      g.classList.remove('pulsa');
      void g.getBoundingClientRect();
      g.classList.add('pulsa');
    }

    /* ---------- selezione ---------- */

    function seleziona(id, opz) {
      const o = opz || {};
      const l = trova(id);
      if (!l) return;
      interazione();
      if (l.anno > st.tempo + 1e-6) { fermaRiproduzione(); applicaTempo(ANNO_MAX); aggiornaPlay(); }
      st.sel = id;
      ridisegna();
      animaLignaggio();
      pulsa(id);
      mostraScheda(id);
      if (o.centra && st.vista === 'mappa') assicuraVisibile(id, true);
      if (st.vista === 'mappa') impostaFuoco(id, false);
      if (o.fuoco === 'scheda') {
        const t = scheda.querySelector('#' + idNome);
        if (t) t.focus({ preventScroll: true });
      }
      const nA = antenatiDiretti(id).length;
      const nD = discendentiDiretti(id).length;
      ctx.annuncia(l.nome + ', ' + l.anno + '. ' +
        (nA ? 'Ha preso idee da ' + elencoNomi(antenatiDiretti(id)) + '. ' : 'Nessun antenato nella mappa. ') +
        (nD ? 'Ha ispirato ' + elencoNomi(discendentiDiretti(id)) + '.' : 'Nessun discendente nella mappa.'));
      st.aperti.add(id);
      if (!st.fatto && st.aperti.size >= 3) {
        st.fatto = true;
        ctx.completa();
      }
      aggiornaSpiega();
    }

    function deseleziona() {
      if (!st.sel) return;
      st.sel = null;
      fermaLignaggio();
      ridisegna();
      mostraScheda(null);
      aggiornaSpiega();
      ctx.annuncia('Nessun linguaggio scelto: la mappa è di nuovo completa.');
    }

    function elencoNomi(ids) {
      const nomi = ids.map((x) => trova(x).nome);
      if (nomi.length <= 1) return nomi.join('');
      return nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1];
    }

    /* ---------- fuoco e scorrimento della mappa ---------- */

    function impostaFuoco(id, sposta) {
      const vecchio = nodi.get(st.fuoco);
      if (vecchio && st.fuoco !== id) vecchio.setAttribute('tabindex', '-1');
      st.fuoco = id;
      const g = nodi.get(id);
      if (!g) return;
      g.setAttribute('tabindex', '0');
      if (sposta) {
        g.focus({ preventScroll: true });
        assicuraVisibile(id, false);
      }
    }

    function assicuraVisibile(id, centra) {
      const p = M.nodi.get(id);
      if (!p) return;
      const col = larghezzaColonna();
      const vis = scroller.clientWidth - col;
      if (vis <= 0) return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const sx = scroller.scrollLeft;
      let obiettivo = null;
      if (centra) obiettivo = (p.x0 + p.x1) / 2 - vis / 2;
      else if (p.x0 - 24 < sx) obiettivo = p.x0 - 40;
      else if (p.x1 + 24 > sx + vis) obiettivo = p.x1 + 40 - vis;
      if (obiettivo != null) {
        obiettivo = Math.max(0, Math.min(max, obiettivo));
        if (Math.abs(obiettivo - sx) > 1) scroller.scrollTo({ left: obiettivo, behavior: ctx.riduci || !centra ? 'auto' : 'smooth' });
      }
      // se la mappa è fuori dallo schermo in verticale, la si porta in vista con il minimo spostamento
      const r = scroller.getBoundingClientRect();
      const alto = win ? win.innerHeight : 0;
      if (alto && (r.bottom < 80 || r.top > alto - 80)) scroller.scrollIntoView({ block: 'nearest', behavior: ctx.riduci ? 'auto' : 'smooth' });
    }

    function passo(id, dir) {
      const i = ORDINE.findIndex((l) => l.id === id);
      for (let j = i + dir; j >= 0 && j < ORDINE.length; j += dir) if (navigabile(ORDINE[j].id)) return ORDINE[j].id;
      return null;
    }
    function rigaVicina(id, dir) {
      const p = M.nodi.get(id);
      for (let r = p.rigaGlobale + dir; r >= 0 && r < M.righe; r += dir) {
        let migliore = null;
        let dist = Infinity;
        for (const l of LINGUAGGI) {
          const q = M.nodi.get(l.id);
          if (q.rigaGlobale !== r || !navigabile(l.id)) continue;
          const d = Math.abs(q.x - p.x);
          if (d < dist) { dist = d; migliore = l.id; }
        }
        if (migliore) return migliore;
      }
      return null;
    }

    function nodoVicino(e) {
      const r = svg.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      let migliore = null;
      let best = 22;
      for (const l of LINGUAGGI) {
        if (l.anno > st.tempo + 1e-6) continue;
        const p = M.nodi.get(l.id);
        const dx = px < p.x0 ? p.x0 - px : (px > p.x1 ? px - p.x1 : 0);
        const dy = Math.max(0, Math.abs(py - p.y) - 8);
        const d = Math.hypot(dx, dy);
        if (d < best) { best = d; migliore = l.id; }
      }
      return migliore;
    }

    /* ---------- scheda ---------- */

    function infoCapitolo(id) {
      try {
        const caps = root.ProgStoria && root.ProgStoria.dati ? root.ProgStoria.dati().capitoli : [];
        const c = caps.find((x) => x.id === id);
        if (c) return { numero: c.numero, titolo: c.titolo };
      } catch (e) { /* motore non disponibile */ }
      const f = CAPITOLI[id];
      return f ? { numero: f[0], titolo: f[1] } : null;
    }

    function bottoneLinguaggio(l, fuoco) {
      return h('button', {
        type: 'button', class: 'lab-atlante-relbtn', 'data-vai': l.id, 'data-fuoco': fuoco || 'scheda',
        'aria-label': l.nome + ', ' + l.anno,
      }, l.nome, h('span', { 'aria-hidden': 'true' }, String(l.anno)));
    }

    function relazioni(tipo, titolo, ids, totale) {
      const lista = ids.map(trova).sort((a, b) => a.anno - b.anno);
      return h('div', { class: 'lab-atlante-rel ' + tipo },
        h('p', { class: 'lab-atlante-rel-t' }, titolo,
          lista.length ? h('span', { class: 'lab-atlante-rel-n' }, totale > lista.length ? (tipo === 'anc' ? totale + ' antenati in tutto, contando anche quelli lontani' : totale + ' discendenti in tutto, contando anche quelli lontani') : '') : null),
        lista.length
          ? h('div', { class: 'lab-atlante-rel-chips' }, lista.map((x) => bottoneLinguaggio(x)))
          : h('p', { class: 'lab-atlante-rel-vuoto' }, tipo === 'anc' ? 'Nessun antenato nella mappa: è un punto di partenza.' : 'Nessun discendente nella mappa.'));
    }

    function boxCiao(l) {
      const tipo = l.ciaoTipo || 'ciao';
      const titolo = tipo === 'assaggio' ? 'Un assaggio di ' + l.nome : (tipo === 'assente' ? '«Ciao, mondo»' : '«Ciao, mondo» in ' + l.nome);
      return h('figure', { class: 'lab-atlante-ciao' + (tipo === 'assente' ? ' assente' : '') },
        h('figcaption', { class: 'lab-atlante-ciao-t' }, titolo),
        l.ciao ? h('pre', { tabindex: '0', 'aria-label': 'Codice in ' + l.nome }, h('code', null, l.ciao)) : null,
        l.ciaoNota ? h('p', { class: 'lab-atlante-ciao-n' }, l.ciaoNota) : null);
    }

    function schedaVuota() {
      return h('div', { class: 'lab-atlante-vuoto' },
        h('p', { class: 'lab-atlante-vuoto-t' }, 'Scegli un linguaggio'),
        h('p', null, 'Tocca un punto della mappa, oppure entra con Tab, spostati con le frecce e premi Invio: vedrai da chi ha preso le idee e a chi le ha passate.'),
        h('p', { class: 'lab-atlante-prova' }, 'Prova con:', ['c', 'lisp', 'python', 'java'].map((id) => bottoneLinguaggio(trova(id), 'scheda'))),
        PROLIFICO ? h('p', { class: 'lab-atlante-curiosa' }, 'Curiosità: nella mappa ' + PROLIFICO.n + ' linguaggi su ' + LINGUAGGI.length + ' discendono, anche alla lontana, da ' + trova(PROLIFICO.id).nome + '.') : null);
    }

    function mostraScheda(id) {
      const l = id ? trova(id) : null;
      if (!l) { scheda.replaceChildren(schedaVuota()); return; }
      const cap = l.capitolo ? infoCapitolo(l.capitolo) : null;
      scheda.replaceChildren(
        h('div', { class: 'lab-atlante-info' },
          h('p', { class: 'lab-atlante-eyebrow' }, nomeCorsia(l.famiglia)),
          h('h4', { class: 'lab-atlante-nome', id: idNome, tabindex: '-1' }, l.nome, h('span', { class: 'lab-atlante-nome-anno' }, String(l.anno))),
          l.notaAnno ? h('p', { class: 'lab-atlante-notaanno' }, l.notaAnno) : null,
          h('dl', { class: 'lab-atlante-dati' },
            h('div', null, h('dt', null, 'Autori'), h('dd', null, l.autori)),
            h('div', null, h('dt', null, 'Paradigmi'), h('dd', null, l.paradigmi.map((p) => h('span', { class: 'lab-atlante-par' }, nomeParadigma(p)))))),
          h('p', { class: 'lab-atlante-descr' }, l.descrizione),
          relazioni('anc', 'Ha preso idee da', antenatiDiretti(l.id), antenati(l.id).size),
          relazioni('disc', 'Ha ispirato', discendentiDiretti(l.id), discendenti(l.id).size),
          cap ? h('p', { class: 'lab-atlante-cap' }, h('a', { href: '#' + l.capitolo }, 'Leggi il capitolo ' + cap.numero + ': ' + cap.titolo + ' →')) : null,
          h('div', { class: 'lab-atlante-azioni' },
            st.vista === 'elenco' ? h('button', { type: 'button', class: 'pg-btn pg-btn--primario', 'data-azione': 'mappa' }, 'Mostra nella mappa') : null,
            h('button', { type: 'button', class: 'pg-btn', 'data-azione': 'chiudi' }, 'Chiudi la scheda'))),
        boxCiao(l));
    }

    /* ---------- filtri, ricerca e spiegazione ---------- */

    let timerAnnuncio = 0;
    function aggiornaSpiega(annunciaSubito) {
      const q = st.query.trim();
      const par = PARADIGMI.find((p) => p.id === st.paradigma);
      const ids = filtra(st.paradigma, q);
      let testo;
      if (!q && !par) {
        testo = st.fatto
          ? [h('strong', null, '✓ Laboratorio esplorato.'), ' Hai aperto ' + st.aperti.size + ' linguaggi: continua pure a curiosare, oppure prova i filtri per paradigma.']
          : [h('strong', null, 'Come si legge: '), 'ogni punto è un linguaggio, nell\'anno in cui è apparso; le curve vanno da chi ha dato un\'idea a chi l\'ha ricevuta. Toccane uno: gli ', h('span', { class: 'anc' }, 'antenati'), ' si accendono in ambra, i ', h('span', { class: 'disc' }, 'discendenti'), ' in azzurro.' +
            (st.aperti.size ? ' Linguaggi aperti: ' + st.aperti.size + ' di 3.' : '')];
      } else if (!ids.length) {
        testo = q
          ? [h('strong', null, 'Nessun risultato. '), 'Nessun linguaggio corrisponde a «' + q + '»' + (par ? ' tra quelli di tipo ' + par.nome.toLowerCase() : '') + ': prova con un nome (per esempio «Pascal») o con un autore (per esempio «Hopper»)' + (par ? ', oppure scegli «Tutti» tra i paradigmi.' : '.')]
          : [h('strong', null, 'Nessun risultato.')];
      } else {
        const nomi = ids.length <= 6 ? ': ' + elencoNomi(ids) : '';
        if (par && !q) testo = [h('strong', null, par.nome + ': '), par.idea.charAt(0).toUpperCase() + par.idea.slice(1) + ' Nella mappa: ' + ids.length + ' linguaggi su ' + LINGUAGGI.length + nomi + '.'];
        else testo = [h('strong', null, ids.length === 1 ? '1 linguaggio' : ids.length + ' linguaggi'), (par ? ' di tipo ' + par.nome.toLowerCase() : '') + ' corrispond' + (ids.length === 1 ? 'e' : 'ono') + ' a «' + q + '»' + nomi + '. Premi Invio per aprire ' + (ids.length === 1 ? 'la scheda.' : 'il primo.')];
      }
      spiega.replaceChildren(h('p', null, testo));
      if (q || par) {
        clearTimeout(timerAnnuncio);
        const frase = spiega.textContent;
        if (annunciaSubito) ctx.annuncia(frase);
        else timerAnnuncio = setTimeout(() => ctx.annuncia(frase), 650);
      }
    }

    function applicaFiltri(annunciaSubito) {
      ridisegna();
      const ids = new Set(filtra(st.paradigma, st.query));
      let visibili = 0;
      for (const [id, tr] of righe) {
        const ok = ids.has(id);
        tr.hidden = !ok;
        if (ok) visibili++;
      }
      rigaVuota.hidden = visibili > 0;
      notaTab.hidden = !LINGUAGGI.some((l) => l.progetto && ids.has(l.id));
      if (!visibili) rigaVuota.firstChild.textContent = 'Nessun linguaggio corrisponde ai filtri: cambia la ricerca o scegli «Tutti» tra i paradigmi.';
      if (!navigabile(st.fuoco)) {
        const primo = ORDINE.find((l) => navigabile(l.id));
        if (primo) impostaFuoco(primo.id, false);
      }
      aggiornaSpiega(annunciaSubito);
    }

    function ordinaElenco(chiave) {
      if (st.ord.chiave === chiave) st.ord.verso = -st.ord.verso;
      else st.ord = { chiave: chiave, verso: 1 };
      disponiElenco();
      ctx.annuncia('Elenco ordinato per ' + (chiave === 'nome' ? 'nome' : chiave === 'anno' ? 'anno' : 'famiglia') + (st.ord.verso === 1 ? ', in ordine crescente.' : ', in ordine decrescente.'));
    }
    function disponiElenco() {
      const lista = ordina(LINGUAGGI, st.ord.chiave, st.ord.verso);
      tbody.replaceChildren(...lista.map((l) => righe.get(l.id)), rigaVuota);
      for (const th of intestazioni) {
        const k = th.getAttribute('data-chiave');
        if (!k) continue;
        const attivo = k === st.ord.chiave;
        th.setAttribute('aria-sort', attivo ? (st.ord.verso === 1 ? 'ascending' : 'descending') : 'none');
        th.querySelector('.lab-atlante-freccia').textContent = attivo ? (st.ord.verso === 1 ? '▲' : '▼') : '';
      }
    }

    function impostaVista(v) {
      if (st.vista === v) return;
      st.vista = v;
      btnMappa.setAttribute('aria-pressed', String(v === 'mappa'));
      btnElenco.setAttribute('aria-pressed', String(v === 'elenco'));
      vistaMappa.hidden = v !== 'mappa';
      vistaElenco.hidden = v !== 'elenco';
      interazione();
      if (st.tempo < ANNO_MAX) { applicaTempo(ANNO_MAX); aggiornaPlay(); }
      mostraScheda(st.sel);
      ctx.annuncia(v === 'mappa' ? 'Vista mappa.' : 'Vista elenco: ' + LINGUAGGI.length + ' linguaggi, ordinabili per nome, anno o famiglia.');
    }

    function mostraNellaMappa(id) {
      impostaVista('mappa');
      mostraScheda(id);
      assicuraVisibile(id, true);
      impostaFuoco(id, true);
    }

    /* ---------- eventi ---------- */

    campo.addEventListener('input', () => {
      st.query = campo.value;
      interazione();
      applicaFiltri(false);
    });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const ids = filtra(st.paradigma, st.query);
        if (ids.length && st.query.trim()) {
          const primo = ORDINE.find((l) => ids.indexOf(l.id) >= 0);
          seleziona(primo.id, { centra: true });
        }
      } else if (e.key === 'Escape' && campo.value) {
        e.preventDefault();
        campo.value = '';
        st.query = '';
        applicaFiltri(true);
      }
    });

    chips.forEach((b) => b.addEventListener('click', () => {
      st.paradigma = b.getAttribute('data-par');
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      interazione();
      applicaFiltri(true);
    }));

    btnMappa.addEventListener('click', () => impostaVista('mappa'));
    btnElenco.addEventListener('click', () => impostaVista('elenco'));

    btnPlay.addEventListener('click', () => {
      st.toccato = true;
      if (osservatore) { osservatore.disconnect(); osservatore = null; }
      if (st.inRiproduzione) fermaRiproduzione(); else riproduci();
    });
    cursoreTempo.addEventListener('input', () => {
      st.toccato = true;
      if (osservatore) { osservatore.disconnect(); osservatore = null; }
      fermaRiproduzione();
      fermaLignaggio();
      applicaTempo(Number(cursoreTempo.value));
      aggiornaPlay();
    });

    svg.addEventListener('click', (e) => {
      const g = e.target.closest ? e.target.closest('.lab-atlante-nodo') : null;
      let id = g && !g.classList.contains('futuro') ? g.getAttribute('data-id') : null;
      if (!id) id = nodoVicino(e);
      if (id) seleziona(id, {});
      else if (st.sel) deseleziona();
    });
    svg.addEventListener('keydown', (e) => {
      const g = e.target.closest ? e.target.closest('.lab-atlante-nodo') : null;
      if (!g) return;
      const id = g.getAttribute('data-id');
      let nuovo = null;
      switch (e.key) {
        case 'ArrowRight': nuovo = passo(id, 1); break;
        case 'ArrowLeft': nuovo = passo(id, -1); break;
        case 'ArrowDown': nuovo = rigaVicina(id, 1); break;
        case 'ArrowUp': nuovo = rigaVicina(id, -1); break;
        case 'Home': nuovo = (ORDINE.find((l) => navigabile(l.id)) || {}).id; break;
        case 'End': nuovo = (ORDINE.slice().reverse().find((l) => navigabile(l.id)) || {}).id; break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          seleziona(id, {});
          return;
        case 'Escape':
          if (st.sel) { e.preventDefault(); deseleziona(); }
          return;
        default:
          return;
      }
      e.preventDefault();
      if (nuovo) impostaFuoco(nuovo, true);
    });

    // Al passaggio del mouse si illuminano le influenze dirette.
    let inEvidenza = null;
    function evidenzia(id) {
      if (inEvidenza === id) return;
      if (inEvidenza) {
        nodi.get(inEvidenza).classList.remove('hover');
        for (const a of archi) if (a.da === inEvidenza || a.a === inEvidenza) a.el.classList.remove('hover');
      }
      inEvidenza = id;
      if (id) {
        nodi.get(id).classList.add('hover');
        for (const a of archi) if (a.da === id || a.a === id) a.el.classList.add('hover');
      }
    }
    svg.addEventListener('pointerover', (e) => {
      const g = e.target.closest ? e.target.closest('.lab-atlante-nodo') : null;
      evidenzia(g && !g.classList.contains('futuro') ? g.getAttribute('data-id') : null);
    });
    svg.addEventListener('pointerleave', () => evidenzia(null));

    function liberaCamera() { if (st.inRiproduzione) st.cameraLibera = true; }
    scroller.addEventListener('wheel', liberaCamera, { passive: true });
    scroller.addEventListener('touchstart', liberaCamera, { passive: true });
    scroller.addEventListener('pointerdown', liberaCamera);

    tbody.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('.lab-atlante-riga') : null;
      if (b) seleziona(b.getAttribute('data-id'), {});
    });
    vistaElenco.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('.lab-atlante-ord') : null;
      if (b) ordinaElenco(b.getAttribute('data-chiave'));
    });

    scheda.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      const vai = b.getAttribute('data-vai');
      if (vai) { seleziona(vai, { centra: true, fuoco: b.getAttribute('data-fuoco') }); return; }
      const azione = b.getAttribute('data-azione');
      if (azione === 'mappa' && st.sel) mostraNellaMappa(st.sel);
      else if (azione === 'chiudi') {
        const id = st.sel;
        deseleziona();
        if (st.vista === 'mappa' && id) impostaFuoco(id, true);
        else if (id && righe.get(id)) righe.get(id).querySelector('.lab-atlante-riga').focus();
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && st.sel && scheda.contains(e.target)) { e.preventDefault(); const id = st.sel; deseleziona(); if (st.vista === 'mappa') impostaFuoco(id, true); }
    });

    /* ---------- avvio ---------- */

    disponiElenco();
    mostraScheda(null);
    ridisegna();
    aggiornaSpiega();

    // Entrata: la mappa si costruisce decennio dopo decennio la prima volta che la guardi.
    let osservatore = null;
    if (!ctx.riduci && win && 'IntersectionObserver' in win) {
      applicaTempo(ANNO_MIN - 1);
      osservatore = new IntersectionObserver((voci) => {
        if (!voci.some((v) => v.isIntersecting)) return;
        osservatore.disconnect();
        osservatore = null;
        if (!st.toccato && st.tempo < ANNO_MAX) riproduci();
      }, { threshold: 0.35 });
      osservatore.observe(scroller);
    } else {
      applicaTempo(ANNO_MAX);
    }
    aggiornaPlay();

    return {
      pausa() { /* il motore ferma già orologio e animazioni */ },
      riprendi() {},
    };
  }

  const Atlante = {
    ANNO_MIN: ANNO_MIN,
    ANNO_MAX: ANNO_MAX,
    CORSIE: CORSIE,
    PARADIGMI: PARADIGMI,
    CAPITOLI: CAPITOLI,
    LINGUAGGI: LINGUAGGI,
    GEO: GEO,
    trova: trova,
    antenatiDiretti: antenatiDiretti,
    discendentiDiretti: discendentiDiretti,
    antenati: antenati,
    discendenti: discendenti,
    trovaCiclo: trovaCiclo,
    piuProlifico: piuProlifico,
    normalizza: normalizza,
    corrisponde: corrisponde,
    cerca: cerca,
    filtra: filtra,
    ordina: ordina,
    nomeParadigma: nomeParadigma,
    nomeCorsia: nomeCorsia,
    xAnno: xAnno,
    stimaLarghezza: stimaLarghezza,
    curva: curva,
    impagina: impagina,
    frazioneArco: frazioneArco,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Atlante;
  if (root.ProgStoria) root.ProgStoria.lab('atlante', { titolo: 'L\'albero dei linguaggi', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
