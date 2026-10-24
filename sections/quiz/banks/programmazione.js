/*
 * Banca domande del quiz: sezione 7, Storia della programmazione.
 * Dai telai a schede perforate ai cavi dell'ENIAC, dall'assembly ai primi linguaggi,
 * da Unix e dal C ai personal, dal web al software ovunque, fino all'intelligenza artificiale.
 */
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'programmazione',
    number: 7,
    title: 'Storia della programmazione',
    subtitle: 'Dai telai Jacquard all\'intelligenza artificiale',
    chapters: [
      { id: 'telai', title: 'Telai e schede' },
      { id: 'logica', title: 'La logica' },
      { id: 'cavi', title: 'Programmare con i cavi' },
      { id: 'assembly', title: 'Codice macchina e assembly' },
      { id: 'fortran', title: 'I primi linguaggi' },
      { id: 'schede', title: 'Schede perforate e lotti' },
      { id: 'strutturata', title: 'La programmazione strutturata' },
      { id: 'unix', title: 'Unix e il C' },
      { id: 'personal', title: 'Il software dei personal' },
      { id: 'oggetti', title: 'La programmazione a oggetti' },
      { id: 'web', title: 'Il web e l\'open source' },
      { id: 'ovunque', title: 'Software ovunque' },
      { id: 'ia', title: 'L\'intelligenza artificiale' },
      { id: 'atlante', title: 'L\'atlante dei linguaggi' },
    ],
    questions: [
      // ------------------------------------------------------------ Telai e schede
      {
        id: 'pr-01', level: 1, topic: 'Telaio Jacquard', chapter: 'telai', type: 'choice',
        q: 'Nel telaio di Joseph-Marie Jacquard, dei primi anni dell\'Ottocento, da che cosa dipendeva il disegno del tessuto?',
        options: ['Da una catena di schede di cartone perforate', 'Da un aiutante che alzava a mano i fili giusti', 'Da una serie di ingranaggi da cambiare ogni volta', 'Dal tessitore, che sceglieva i fili a occhio'],
        answer: 0,
        why: 'Il meccanismo, messo a punto tra il 1804 e il 1805, usava una scheda per ogni riga del tessuto: dove c\'era un foro, un ago passava e il suo filo d\'ordito si alzava. Per cambiare disegno bastava cambiare le schede, un\'idea che Babbage riprese per la macchina analitica.',
      },
      {
        id: 'pr-02', level: 1, topic: 'Ada Lovelace', chapter: 'telai', type: 'choice',
        q: 'Nel 1843 Ada Lovelace pubblicò, nella Nota G, un procedimento per la macchina analitica di Charles Babbage. Che cosa doveva calcolare?',
        options: ['I numeri di Bernoulli', 'Le tavole dei logaritmi', 'Le cifre del pi greco', 'Le posizioni dei pianeti'],
        answer: 0,
        why: 'La Nota G mostra come la macchina, mai costruita, avrebbe calcolato i numeri di Bernoulli: quali numeri prendere dal magazzino e quali conti fare nel mulino (oggi diremmo memoria e processore). È spesso chiamata «il primo programma per computer», anche se Babbage ne aveva già abbozzati altri.',
      },
      {
        id: 'pr-03', level: 2, topic: 'Il censimento del 1890', chapter: 'telai', type: 'choice',
        q: 'Per il censimento degli Stati Uniti del 1890 Herman Hollerith propose di registrare i dati di ogni persona con i fori di una scheda. Come leggeva i fori la sua tabulatrice?',
        options: ['Un ago passava nel foro e chiudeva un circuito', 'Una lampada e una fotocellula vedevano i fori', 'Un impiegato guardava i fori e girava i contatori', 'Un ago passava nel foro e sollevava una leva'],
        answer: 0,
        why: 'Dove c\'era un foro, un ago a molla pescava in una vaschetta di mercurio: il circuito si chiudeva e un contatore avanzava di un passo. Foro o niente foro è già un bit. Lo spoglio fu molto più rapido di quello del 1880, finito a mano solo nel 1887; l\'azienda di Hollerith confluì poi nell\'IBM.',
      },

      // ------------------------------------------------------------ La logica
      {
        id: 'pr-04', level: 1, topic: 'Macchina di Turing', chapter: 'logica', type: 'choice',
        q: 'Nel 1936 Alan Turing descrisse una macchina immaginaria per capire che cosa si può calcolare. Com\'è fatta?',
        options: ['Un nastro a caselle e una testina che legge e scrive', 'Una rete di neuroni artificiali collegati tra loro', 'Un insieme di relè che contano in binario', 'Un pannello di cavi da ricollegare a mano per ogni calcolo'],
        answer: 0,
        why: 'La macchina di Turing ha un nastro infinito diviso in caselle, una testina che legge, scrive e si sposta, e una tabella di regole. È un modello matematico: ciò che un computer può calcolare, lo può calcolare anche lei.',
      },
      {
        id: 'pr-05', level: 2, topic: 'Logica e calcolo', chapter: 'logica', type: 'match',
        q: 'Abbina ogni studioso all\'idea per cui è ricordato.',
        pairs: [['George Boole', 'Un\'algebra per il vero e il falso'], ['Kurt Gödel', 'I teoremi di incompletezza'], ['Alonzo Church', 'Il lambda calcolo'], ['Claude Shannon', 'La logica dei circuiti a relè'], ['Konrad Zuse', 'Il Plankalkül, un linguaggio di programmazione']],
        why: 'Boole ridusse la logica a calcoli con vero e falso; Gödel dimostrò che ogni sistema coerente e abbastanza ricco ha enunciati veri che non può dimostrare; il lambda calcolo di Church ispirò il LISP; Shannon applicò l\'algebra di Boole ai relè; il Plankalkül di Zuse restò sulla carta per decenni.',
      },
      {
        id: 'pr-06', level: 3, topic: 'Tappe della logica', chapter: 'logica', type: 'order',
        q: 'Ordina queste tappe, dalla più antica alla più recente.',
        items: ['Boole pubblica la sua algebra della logica', 'Hilbert pone l\'Entscheidungsproblem', 'Gödel dimostra i teoremi di incompletezza', 'Turing descrive la sua macchina', 'Zuse progetta il Plankalkül'],
        ends: ['Più antica', 'Più recente'],
        why: 'Boole (1847), Hilbert (1928), Gödel (1931), Turing (1936), Zuse (1942-1945). Nel 1936 Turing e Church dimostrarono che l\'Entscheidungsproblem non ha soluzione: nessun algoritmo può decidere, per ogni enunciato, se è dimostrabile.',
      },

      // ------------------------------------------------------------ Programmare con i cavi
      {
        id: 'pr-07', level: 1, topic: 'ENIAC', chapter: 'cavi', type: 'choice',
        q: 'Le sei programmatrici dell\'ENIAC, tra cui Jean Jennings Bartik e Kathleen McNulty, come preparavano la macchina per un nuovo calcolo?',
        options: ['Collegavano cavi e regolavano interruttori', 'Scrivevano il programma su un nastro magnetico', 'Caricavano il programma nella memoria a valvole', 'Digitavano le istruzioni su una tastiera'],
        answer: 0,
        why: 'L\'ENIAC, completato alla fine del 1945, non teneva il programma in memoria: per ogni problema si ricollegavano a mano cavi e interruttori dei suoi pannelli, e potevano servire giorni. Le programmatrici impararono a farlo studiando gli schemi della macchina.',
      },
      {
        id: 'pr-08', level: 3, topic: 'La Manchester Baby', chapter: 'cavi', type: 'truefalse',
        q: 'Nella Manchester Baby, il piccolo computer sperimentale dell\'Università di Manchester, le istruzioni erano numeri scritti nella stessa memoria dei dati: un programma poteva perfino cambiare le proprie istruzioni.',
        answer: true,
        why: 'Dal giugno 1948 la Baby teneva programma e dati in un tubo a raggi catodici, una memoria che si poteva riscrivere: per cambiare calcolo si scrivevano nuovi numeri, senza ricollegare cavi. I primi programmi cambiavano spesso le proprie istruzioni mentre giravano, per esempio per scorrere una tabella.',
      },
      {
        id: 'pr-09', level: 3, topic: 'Calcolatori degli anni \'40', chapter: 'cavi', type: 'order',
        q: 'Ordina questi eventi degli anni \'40, dal più antico al più recente.',
        items: ['Colossus aiuta a decifrare i messaggi tedeschi', 'L\'ENIAC viene completato a Filadelfia', 'Una falena finisce in un relè del Mark II', 'La Manchester Baby esegue il primo programma', 'L\'EDSAC entra in servizio a Cambridge'],
        ends: ['Più antico', 'Più recente'],
        why: 'Colossus (1944), ENIAC (fine del 1945), falena del Mark II (9 settembre 1947, la data scritta nel registro), Manchester Baby (giugno 1948), EDSAC (maggio 1949). La falena fu incollata nel registro come «primo vero caso di bug»: la parola bug, per un difetto, era già in uso tra gli ingegneri.',
      },

      // ------------------------------------------------------------ Codice macchina e assembly
      {
        id: 'pr-10', level: 1, topic: 'L\'assemblatore', chapter: 'assembly', type: 'choice',
        q: 'Il programma in figura è scritto in assembly. Che cosa fa l\'assemblatore con questo testo, prima che il processore lo possa eseguire?',
        figure: { kind: 'code', lang: 'Assembly x86', text: 'MOV  AL, 5     ; AL = 5\nADD  AL, 3     ; AL = AL + 3' },
        options: ['Traduce ogni sigla nel codice binario dell\'istruzione', 'Esegue subito le istruzioni una alla volta, senza tradurle', 'Lo copia in memoria così com\'è, lettera per lettera', 'Controlla che i calcoli del programma siano giusti'],
        answer: 0,
        why: 'Il processore capisce solo numeri: l\'assemblatore sostituisce ogni mnemonico, cioè una sigla come MOV o ADD, con il suo codice macchina. Nell\'x86, per esempio, MOV AL, 5 diventa 10110000 00000101. Già nel 1949 gli ordini iniziali dell\'EDSAC traducevano così A25F, «somma il numero della cella 25».',
      },
      {
        id: 'pr-11', level: 2, topic: 'Pionieri del software', chapter: 'assembly', type: 'match',
        q: 'Abbina ogni pioniere della programmazione al suo contributo.',
        pairs: [['Kathleen Booth', 'Uno dei primi assembly, per il calcolatore ARC'], ['John Mauchly', 'Lo Short Code, per scrivere formule'], ['David Wheeler', 'Il modo di chiamare una subroutine e tornare'], ['Grace Hopper', 'Il compilatore A-0']],
        why: 'La notazione di Kathleen Booth per l\'ARC (Londra, 1947) è spesso indicata come il primo assembly, ma il primato è discusso; Mauchly propose nel 1949 lo Short Code, poi realizzato come interprete; Wheeler inventò a Cambridge il salto che porta il suo nome; Grace Hopper scrisse l\'A-0 nel 1952.',
      },
      {
        id: 'pr-12', level: 3, topic: 'Interpreti e compilatori', chapter: 'assembly', type: 'choice',
        q: 'Lo Short Code (1950) era un interprete, l\'Autocode di Alick Glennie (1952) un compilatore. Perché un ciclo ripetuto mille volte girava molto più lento con un interprete?',
        options: ['Ritraduceva le righe del ciclo a ogni ripetizione', 'Traduceva tutto il programma prima di cominciare', 'Leggeva ogni riga dal nastro invece che dalla memoria', 'Ripeteva ogni calcolo due volte per controllarlo'],
        answer: 0,
        why: 'Un interprete traduce ogni riga mentre la esegue, e in un ciclo rifà lo stesso lavoro a ogni giro. Un compilatore traduce tutto una volta sola, prima dell\'esecuzione, e poi il codice macchina gira veloce. Per lo stesso motivo il Python, interpretato, è di solito più lento del C, compilato.',
      },

      // ------------------------------------------------------------ I primi linguaggi
      {
        id: 'pr-13', level: 1, topic: 'FORTRAN', chapter: 'fortran', type: 'choice',
        q: 'Il FORTRAN, creato da John Backus e dal suo gruppo all\'IBM nel 1957, permetteva di scrivere formule come quella in figura. Per quale tipo di lavoro era nato?',
        figure: { kind: 'code', lang: 'FORTRAN', text: 'C     AREA DI UN CERCHIO DI RAGGIO 2\n      R = 2.0\n      A = 3.14159 * R**2\n      PRINT 10, A\n   10 FORMAT (F8.3)\n      END' },
        options: ['Per i calcoli scientifici e tecnici', 'Per la contabilità di aziende e banche', 'Per la ricerca sull\'intelligenza artificiale', 'Per insegnare a programmare agli studenti'],
        answer: 0,
        why: 'FORTRAN sta per FORmula TRANslation, traduzione di formule: R**2 vuol dire R al quadrato. Il suo compilatore produceva codice veloce quasi quanto quello scritto a mano e convinse molti scienziati a lasciare l\'assembly. Per i programmi gestionali nacque invece il COBOL (1959).',
      },
      {
        id: 'pr-14', level: 2, topic: 'LISP', chapter: 'fortran', type: 'choice',
        q: 'In LISP l\'operazione si scrive prima dei numeri: (+ 1 2) vuol dire 1 + 2. Quale valore restituisce l\'ultima riga del programma in figura?',
        figure: { kind: 'code', lang: 'LISP', text: '(defun quadrato (x)\n  (* x x))\n\n(quadrato (+ 1 2))' },
        options: ['9', '5', '3', '6'],
        answer: 0,
        why: 'Prima si calcola l\'argomento, (+ 1 2) = 3; poi quadrato esegue (* x x) con x = 3, cioè 3 × 3 = 9. Nel LISP, creato da John McCarthy nel 1958, anche il programma è fatto di liste tra parentesi.',
      },
      {
        id: 'pr-15', level: 3, topic: 'ALGOL 60', chapter: 'fortran', type: 'choice',
        q: 'Il rapporto su ALGOL 60, del 1960, rese famoso un modo nuovo e preciso di descrivere un linguaggio di programmazione. Quale?',
        options: ['Una grammatica formale nella notazione BNF', 'Un compilatore di riferimento uguale per tutti', 'Un manuale con tanti esempi commentati', 'Un diagramma di flusso per ogni istruzione'],
        answer: 0,
        why: 'La forma di Backus-Naur (BNF), presentata da John Backus nel 1959 e usata da Peter Naur nel rapporto, elenca con regole precise le frasi valide, per esempio <cifra> ::= 0 | 1 | 2 | ... | 9. Si usa ancora oggi per definire i linguaggi.',
      },

      // ------------------------------------------------------------ Schede perforate e lotti
      {
        id: 'pr-16', level: 1, topic: 'Schede perforate', chapter: 'schede', type: 'choice',
        q: 'Su una scheda IBM ogni colonna contiene un carattere: una cifra è un solo foro, nella riga di quella cifra; una lettera ha due fori. Quale numero è perforato dopo le lettere?',
        figure: { kind: 'card', text: 'IBM 360' },
        options: ['360', '370', '350', '306'],
        answer: 0,
        why: 'Le colonne 1-3 hanno due fori ciascuna (le lettere I, B, M); le colonne 5, 6 e 7 un solo foro, nelle righe 3, 6 e 0: 360, come il System/360 del 1964. Una scheda ha 80 colonne e di solito conteneva una riga di programma.',
      },
      {
        id: 'pr-17', level: 1, topic: 'BASIC e time-sharing', chapter: 'schede', type: 'choice',
        q: 'Nel 1964 John Kemeny e Thomas Kurtz crearono a Dartmouth il BASIC, insieme a un sistema time-sharing. Che cosa cambiò per gli studenti?',
        options: ['Scrivevano al terminale e avevano subito la risposta', 'Consegnavano le schede e aspettavano fino al giorno dopo', 'Usavano il computer da soli, a turno, per un\'ora', 'Collegavano cavi su un pannello per ogni esercizio'],
        answer: 0,
        why: 'Con il time-sharing il computer serve a turno molti terminali, così in fretta che ognuno sembra averlo tutto per sé. Gli studenti scrivevano il programma in BASIC su una telescrivente e lo eseguivano subito, senza aspettare l\'elaborazione a lotti delle schede.',
      },
      {
        id: 'pr-18', level: 2, topic: 'Elaborazione a lotti', chapter: 'schede', type: 'choice',
        q: 'Negli anni \'60 molti centri di calcolo lavoravano a lotti (batch): raccoglievano i pacchi di schede di tanti programmatori e li eseguivano uno dopo l\'altro. Perché?',
        options: ['Il computer costava molto e non doveva restare fermo', 'Così ogni programmatore riceveva prima i suoi risultati', 'I programmi erano troppo lunghi per stare in memoria', 'Così i programmi potevano scambiarsi i dati tra loro'],
        answer: 0,
        why: 'Un\'ora di calcolo costava moltissimo: con i lotti la macchina passava da un lavoro all\'altro senza pause. Il prezzo lo pagava il programmatore, che aspettava ore, a volte un giorno, anche solo per scoprire un errore di battitura.',
      },

      // ------------------------------------------------------------ La programmazione strutturata
      {
        id: 'pr-19', level: 1, topic: 'Teorema di Böhm-Jacopini', chapter: 'strutturata', type: 'choice',
        q: 'Nel 1966 gli italiani Corrado Böhm e Giuseppe Jacopini dimostrarono che ogni programma si può scrivere con tre sole strutture, come fa questo programma Pascal. Quali?',
        figure: { kind: 'code', lang: 'Pascal', text: 'program Strutture(output);\nvar i: integer;\nbegin\n  i := 1;\n  while i <= 4 do\n  begin\n    if i mod 2 = 0 then\n      writeln(i, \' pari\')\n    else\n      writeln(i, \' dispari\');\n    i := i + 1\n  end\nend.' },
        options: ['Sequenza, selezione e iterazione', 'Ingresso dei dati, elaborazione e uscita', 'Variabili, funzioni e oggetti', 'Salto, confronto e somma'],
        answer: 0,
        why: 'Sequenza (un\'istruzione dopo l\'altra), selezione (if... else) e iterazione (while) bastano per qualsiasi algoritmo, senza salti GOTO. Nel 1968 Dijkstra chiese di abbandonarli con la lettera «Go To Statement Considered Harmful»; il Pascal di Niklaus Wirth (1970) nacque per insegnare questo stile.',
      },
      {
        id: 'pr-20', level: 1, topic: 'La crisi del software', chapter: 'strutturata', type: 'choice',
        q: 'Nel 1968, contro la «crisi del software» (programmi in ritardo, costosi e pieni di errori), la NATO riunì a Garmisch una cinquantina di esperti. Il titolo della conferenza, «Software Engineering», era una provocazione. Che cosa chiedeva?',
        options: ['Di costruire i programmi con i metodi degli ingegneri', 'Di far scrivere i programmi agli ingegneri elettronici', 'Di usare i computer per i calcoli degli ingegneri', 'Di insegnare la programmazione nelle facoltà di ingegneria'],
        answer: 0,
        why: 'Come ponti e centrali elettriche, anche i programmi andavano costruiti con metodi rigorosi: specifiche, progetto, collaudo, manutenzione. Da Garmisch l\'espressione «ingegneria del software» si diffuse in tutto il mondo.',
      },
      {
        id: 'pr-21', level: 3, topic: 'Il software dell\'Apollo', chapter: 'strutturata', type: 'truefalse',
        q: 'Durante la discesa dell\'Apollo 11, il computer di bordo, programmato dal gruppo di Margaret Hamilton, andò in sovraccarico e si spense: Armstrong atterrò senza il suo aiuto.',
        answer: false,
        why: 'Il computer segnalò gli allarmi 1202 e 1201 perché era sovraccarico, ma non si spense: il software ripartiva in un attimo e teneva solo i compiti più importanti. Armstrong guidò l\'ultima fase a mano, ma sempre con l\'aiuto del computer.',
      },

      // ------------------------------------------------------------ Unix e il C
      {
        id: 'pr-22', level: 2, topic: 'Linguaggi degli anni \'70', chapter: 'unix', type: 'match',
        q: 'Abbina ogni linguaggio degli anni \'70 alla frase che lo descrive meglio.',
        pairs: [['C', 'Nato per scrivere il sistema operativo Unix'], ['SQL', 'Chiede a un database i dati che servono'], ['Prolog', 'Ricava risposte da fatti e regole logiche'], ['Smalltalk', 'Tutto è un oggetto che riceve messaggi']],
        why: 'C: Dennis Ritchie, Bell Labs, circa 1972, per riscrivere Unix. SQL: IBM, 1974, sul modello relazionale di Edgar Codd. Prolog: Alain Colmerauer, Marsiglia, 1972. Smalltalk: Alan Kay e colleghi allo Xerox PARC, dal 1972.',
      },
      {
        id: 'pr-23', level: 2, topic: 'Pipe di Unix', chapter: 'unix', type: 'choice',
        q: 'In Unix il comando who elenca gli utenti collegati, uno per riga, e wc -l conta le righe che riceve. Che cosa mostra il comando in figura, dove la pipe | li unisce?',
        figure: { kind: 'code', lang: 'Shell Unix', text: 'who | wc -l' },
        options: ['Il numero degli utenti collegati', 'L\'elenco degli utenti collegati', 'Le righe di un file chiamato who', 'Il numero di lettere dei nomi utente'],
        answer: 0,
        why: 'La pipe | manda l\'uscita di who all\'ingresso di wc -l, senza file intermedi: wc conta le righe e stampa quanti utenti ci sono. Unire piccoli programmi è il cuore della filosofia Unix; le pipe arrivarono nel 1973, su idea di Doug McIlroy.',
      },
      {
        id: 'pr-24', level: 3, topic: 'Stringhe in C', chapter: 'unix', type: 'number',
        q: 'In C ogni stringa finisce con il carattere nullo \'\\0\', aggiunto in automatico. Che numero stampa il programma, cioè quanti caratteri conta il ciclo while?',
        figure: { kind: 'code', lang: 'C', text: '#include <stdio.h>\n\nint main(void)\n{\n    char s[] = "hello, world";\n    int n = 0;\n    while (s[n] != \'\\0\')\n        n++;\n    printf("%d\\n", n);\n    return 0;\n}' },
        value: 12, unit: 'caratteri', tolerance: 0,
        why: 'Il ciclo si ferma al carattere nullo, che non viene contato: «hello» (5), la virgola (1), lo spazio (1) e «world» (5) fanno 5 + 1 + 1 + 5 = 12. È la frase del primo esempio nel libro di Kernighan e Ritchie (1978).',
      },
      {
        id: 'pr-25', level: 2, topic: 'Unix e il C', chapter: 'unix', type: 'choice',
        q: 'Nel 1973 Ken Thompson e Dennis Ritchie riscrissero in C quasi tutto il nucleo di Unix, nato in assembly. Quale vantaggio ne venne?',
        options: ['Si poteva portare su computer diversi', 'Diventò molto più veloce di prima', 'Occupava molta meno memoria di prima', 'Gli errori di memoria diventarono impossibili'],
        answer: 0,
        why: 'L\'assembly vale per un solo tipo di processore: scritto in C, Unix si poteva ricompilare, con pochi ritocchi, su macchine diverse. Il nucleo era circa un terzo più grande, ma Unix si diffuse in università e aziende e ha ispirato sistemi come Linux.',
      },

      // ------------------------------------------------------------ Il software dei personal
      {
        id: 'pr-26', level: 1, topic: 'VisiCalc', chapter: 'personal', type: 'choice',
        q: 'VisiCalc, uscito nel 1979 per l\'Apple II, fu il primo foglio di calcolo per personal: molti comprarono il computer solo per usarlo. Che cosa faceva quando si cambiava un numero in una cella?',
        options: ['Ricalcolava da solo tutta la tabella', 'Chiedeva di ricalcolare a mano i conti collegati', 'Stampava subito il foglio aggiornato', 'Salvava il nuovo numero su un dischetto'],
        answer: 0,
        why: 'Nelle celle si potevano scrivere formule, come la somma di una colonna: cambiato un numero, VisiCalc ricalcolava da solo tutte le formule collegate, mentre su carta ogni conto andava rifatto a mano. Lo scrissero Dan Bricklin e Bob Frankston: fu la prima «killer application».',
      },
      {
        id: 'pr-27', level: 2, topic: 'Software libero', chapter: 'personal', type: 'truefalse',
        q: 'Per Richard Stallman, che nel 1983 lanciò il progetto GNU, «software libero» vuol dire soprattutto software gratuito.',
        answer: false,
        why: 'Libero vuol dire libertà, non prezzo: chiunque può usare il programma, studiarne il codice sorgente, modificarlo e ridistribuirlo. In inglese free vuol dire sia «libero» sia «gratis»: Stallman intendeva il primo significato. Da queste idee nacque poi l\'open source.',
      },
      {
        id: 'pr-28', level: 2, topic: 'BASIC sugli home computer', chapter: 'personal', type: 'number',
        q: 'Un gioco in BASIC per Commodore 64 calcola il punteggio. STEP 2 fa crescere L di 2 a ogni giro del ciclo. Quanti punti stampa alla fine?',
        figure: { kind: 'code', lang: 'BASIC', text: '10 LET P = 0\n20 FOR L = 1 TO 7 STEP 2\n30 LET P = P + L * 10\n40 NEXT L\n50 PRINT "PUNTI:"; P' },
        value: 160, unit: 'punti', tolerance: 0,
        why: 'L vale 1, 3, 5 e 7, quindi P = 10 + 30 + 50 + 70 = 160; il valore successivo, 9, supera il limite e il ciclo finisce. Quasi tutti gli home computer avevano il BASIC in ROM, pronto all\'accensione.',
      },
      {
        id: 'pr-29', level: 1, topic: 'Le origini di Microsoft', chapter: 'personal', type: 'choice',
        q: 'Nel 1975 Bill Gates e Paul Allen fondarono la Microsoft. Quale fu il suo primo prodotto?',
        options: ['Un interprete BASIC per l\'Altair 8800', 'Il sistema operativo MS-DOS per l\'IBM PC', 'Il programma di videoscrittura Word', 'Il sistema a finestre Windows'],
        answer: 0,
        why: 'Gates e Allen scrissero l\'Altair BASIC nel 1975, provandolo su un simulatore senza avere un Altair: così chi comprava quel computer in kit poteva programmarlo senza il codice macchina. MS-DOS arrivò nel 1981, Word nel 1983 e Windows nel 1985.',
      },

      // ------------------------------------------------------------ La programmazione a oggetti
      {
        id: 'pr-30', level: 1, topic: 'Classi in Python', chapter: 'oggetti', type: 'choice',
        q: 'Nel programma in figura Cane è una classe. Che cosa sono rex e fido?',
        figure: { kind: 'code', lang: 'Python', text: 'class Cane:\n    def __init__(self, nome):\n        self.nome = nome\n\nrex = Cane(\'Rex\')\nfido = Cane(\'Fido\')' },
        options: ['Due oggetti creati dalla classe Cane', 'Due classi che ereditano da Cane', 'Due funzioni definite dentro Cane', 'Due copie del codice della classe Cane'],
        answer: 0,
        why: 'La classe è il modello: dice quali dati (qui il nome) e quali azioni avrà ogni oggetto. Cane(\'Rex\') crea un oggetto, cioè un\'istanza della classe con i propri dati. Le classi nacquero con Simula, nel 1967, e arrivarono nel C con il C++.',
      },
      {
        id: 'pr-31', level: 2, topic: 'I concetti degli oggetti', chapter: 'oggetti', type: 'match',
        q: 'Abbina ogni concetto della programmazione a oggetti alla sua descrizione.',
        pairs: [['Ereditarietà', 'La sottoclasse riceve tutto dalla classe madre'], ['Incapsulamento', 'I dati interni si cambiano solo con i metodi'], ['Polimorfismo', 'Lo stesso messaggio, risposte diverse secondo la classe'], ['Messaggio', 'La richiesta a un oggetto di eseguire un metodo']],
        why: '«Suona!» detto a un campanello, a una sveglia e a un telefono è polimorfismo; il contachilometri, che cambia solo guidando, è incapsulamento. Sono idee nate con Simula 67 e Smalltalk, che il C++ di Bjarne Stroustrup (1985) portò a milioni di programmatori.',
      },
      {
        id: 'pr-32', level: 2, topic: 'Interfacce grafiche', chapter: 'oggetti', type: 'choice',
        q: 'Con le interfacce grafiche, come quella del Macintosh (1984), e con strumenti come Visual Basic (1991), cambiò il modo di scrivere i programmi. Come lavora un programma a finestre?',
        options: ['Aspetta eventi, come un clic, e reagisce', 'Esegue le istruzioni in un ordine fisso', 'Legge i comandi da un file preparato prima', 'Ripete lo stesso calcolo a intervalli fissi'],
        answer: 0,
        why: 'Un programma grafico disegna la finestra e poi attende: a ogni clic, tasto o movimento del mouse esegue il codice legato a quell\'evento. In Visual Basic si trascinava un pulsante nella finestra e poi si scriveva il codice del suo clic.',
      },

      // ------------------------------------------------------------ Il web e l'open source
      {
        id: 'pr-33', level: 1, topic: 'Creatori del web', chapter: 'web', type: 'match',
        q: 'Abbina ogni novità dell\'epoca del web alla persona che la creò.',
        pairs: [['World Wide Web', 'Tim Berners-Lee'], ['Linux', 'Linus Torvalds'], ['Python', 'Guido van Rossum'], ['Java', 'James Gosling'], ['JavaScript', 'Brendan Eich']],
        why: 'Berners-Lee inventò il web al CERN (1989-1991); Torvalds annunciò Linux nel 1991, l\'anno del primo Python; Gosling guidò Java alla Sun (1995); Eich scrisse JavaScript per Netscape in 10 giorni (1995): somiglia a Java nella sintassi, ma è un linguaggio diverso, con idee prese da Scheme e da Self.',
      },
      {
        id: 'pr-34', level: 2, topic: 'Millennium bug', chapter: 'web', type: 'truefalse',
        q: 'Nel frammento COBOL in figura, PIC 99 vuol dire «due cifre». Il millennium bug nasceva da campi come ANNO: nel 2000 l\'anno sarebbe diventato 00, come il 1900.',
        figure: { kind: 'code', lang: 'COBOL', text: '       01 DATA-NASCITA.\n           05 ANNO     PIC 99.\n           05 MESE     PIC 99.\n           05 GIORNO   PIC 99.' },
        answer: true,
        why: 'Negli anni \'60 e \'70 la memoria costava cara e si risparmiavano le cifre del secolo. Prima del 1° gennaio 2000 aziende e governi controllarono e corressero milioni di righe di codice, e i guasti furono pochi.',
      },
      {
        id: 'pr-35', level: 2, topic: 'JavaScript', chapter: 'web', type: 'number',
        q: 'In JavaScript nome.length dà il numero di caratteri di una stringa. Che numero stampa il programma, cioè quante lettere conta in tutto?',
        figure: { kind: 'code', lang: 'JavaScript', text: 'const linguaggi = [\'Python\', \'Java\', \'PHP\'];\nlet lettere = 0;\nfor (const nome of linguaggi) {\n  lettere += nome.length;\n}\nconsole.log(lettere);' },
        value: 13, unit: 'lettere', tolerance: 0,
        why: 'Il ciclo for prende un nome alla volta: Python ha 6 lettere, Java 4 e PHP 3, quindi 6 + 4 + 3 = 13. JavaScript, nato nel 1995 per i browser, oggi gira anche sui server.',
      },

      // ------------------------------------------------------------ Software ovunque
      {
        id: 'pr-36', level: 1, topic: 'Git', chapter: 'ovunque', type: 'choice',
        q: 'Nel 2005 Linus Torvalds creò Git per lo sviluppo di Linux. Che cos\'è Git?',
        options: ['Un sistema per il controllo di versione', 'Un sito web per pubblicare i progetti', 'Un linguaggio per le app dei telefoni', 'Un servizio cloud per eseguire programmi'],
        answer: 0,
        why: 'Git registra ogni modifica del codice, con autore e data, e permette a molti programmatori di lavorare in parallelo e poi unire il lavoro. GitHub (2008) è invece un sito che ospita progetti Git.',
      },
      {
        id: 'pr-37', level: 2, topic: 'Manifesto Agile', chapter: 'ovunque', type: 'choice',
        q: 'Nel 2001, a Snowbird, diciassette esperti firmarono il Manifesto per lo sviluppo agile di software. Quale di queste preferenze vi è scritta?',
        options: ['Il software che funziona più della documentazione', 'La documentazione completa più del software', 'Seguire il piano più che rispondere ai cambiamenti', 'I processi e gli strumenti più delle persone'],
        answer: 0,
        why: 'Il manifesto preferisce persone e interazioni ai processi, software funzionante alla documentazione, collaborazione con il cliente ai contratti, risposta ai cambiamenti al piano. Anche le seconde voci hanno valore, ma meno; in pratica si lavora a cicli brevi, con software che funziona a ogni ciclo.',
      },
      {
        id: 'pr-38', level: 1, topic: 'Il cloud', chapter: 'ovunque', type: 'choice',
        q: 'Nel 2006 Amazon cominciò ad affittare via Internet spazio per i file e potenza di calcolo, con i servizi S3 ed EC2: era l\'inizio del cloud. Che cosa c\'è davvero dietro la «nuvola»?',
        options: ['Edifici pieni di server, i data center', 'Una rete fatta solo di software, senza computer', 'I computer degli utenti, collegati tra loro', 'Satelliti in orbita che conservano i dati'],
        answer: 0,
        why: 'Invece di comprare i propri server, un\'azienda affitta potenza di calcolo e spazio, e li aumenta o li riduce in pochi minuti. Con la virtualizzazione un server fisico ospita molte macchine simulate: la «nuvola» è fatta di computer veri, di qualcun altro.',
      },

      // ------------------------------------------------------------ L'intelligenza artificiale
      {
        id: 'pr-39', level: 1, topic: 'Tappe dell\'IA', chapter: 'ia', type: 'order',
        q: 'Ordina queste tappe dell\'intelligenza artificiale, dalla più antica alla più recente.',
        items: ['McCulloch e Pitts descrivono il neurone artificiale', 'Rosenblatt presenta il percettrone', 'La rete AlexNet vince la gara ImageNet', 'Ricercatori di Google presentano il Transformer'],
        ends: ['Più antica', 'Più recente'],
        why: 'Neurone artificiale (1943), percettrone (1958), AlexNet (2012), Transformer, nell\'articolo «Attention Is All You Need» (2017). In mezzo ci furono gli «inverni dell\'IA», anni di delusioni e pochi fondi.',
      },
      {
        id: 'pr-40', level: 3, topic: 'Neurone artificiale', chapter: 'ia', type: 'truth',
        q: 'Un neurone di McCulloch e Pitts (1943) somma i suoi ingressi, che valgono 0 o 1, e dà 1 se la somma raggiunge la soglia. Con tre ingressi e soglia 2 fa come il circuito di porte disegnato: completa la tabella di verità.',
        expr: 'OR(AND(A,B),AND(A,C),AND(B,C))',
        why: 'L\'uscita vale 1 quando almeno due ingressi su tre sono a 1: è la funzione «maggioranza». Con soglia 1 lo stesso neurone diventa un OR, con soglia 3 un AND. Lo XOR invece richiede più strati di neuroni: è il limite del percettrone a uno strato, mostrato da Minsky e Papert nel 1969.',
      },
      {
        id: 'pr-41', level: 2, topic: 'Modelli linguistici', chapter: 'ia', type: 'choice',
        q: 'Che cosa fa, a ogni passo, un modello linguistico come quelli degli assistenti di programmazione?',
        options: ['Prevede il token successivo e lo aggiunge', 'Cerca la risposta in un archivio di frasi', 'Prova il codice e tiene solo quello giusto', 'Applica regole scritte a mano da esperti'],
        answer: 0,
        why: 'Il testo è diviso in token, parole o pezzi di parola: il modello calcola la probabilità di ogni token possibile, ne sceglie uno, lo aggiunge e ricomincia. Produce ciò che è probabile, non ciò che è vero: il codice che propone va letto e provato.',
      },

      // ------------------------------------------------------------ L'atlante dei linguaggi
      {
        id: 'pr-42', level: 1, topic: 'Parentesi graffe', chapter: 'atlante', type: 'choice',
        q: 'Java, JavaScript e PHP racchiudono i blocchi di codice tra parentesi graffe { }, come in questo programma Java. Da quale linguaggio viene questa abitudine?',
        figure: { kind: 'code', lang: 'Java', text: 'public class Ciao {\n    public static void main(String[] args) {\n        System.out.println("Ciao!");\n    }\n}' },
        options: ['Dal C', 'Dal Pascal', 'Dal FORTRAN', 'Dal COBOL'],
        answer: 0,
        why: 'Il C (circa 1972) rese popolari le graffe, che aveva già il B, suo predecessore; il C++ le ereditò e da lì passarono a Java, C#, JavaScript e PHP, la grande famiglia del C. Il Pascal, della famiglia di ALGOL, usa invece begin ed end.',
      },
      {
        id: 'pr-43', level: 2, topic: 'Albero dei linguaggi', chapter: 'atlante', type: 'match',
        q: 'Nell\'albero genealogico dei linguaggi, abbina ogni linguaggio a quello da cui discende.',
        pairs: [['Scheme', 'LISP'], ['Pascal', 'ALGOL'], ['Smalltalk', 'Simula'], ['C#', 'C++']],
        why: 'Scheme (1975) è un dialetto del LISP; Niklaus Wirth costruì il Pascal (1970) partendo da ALGOL; Smalltalk prese da Simula le classi e gli oggetti; C# (2000) continua la famiglia del C e del C++, come Java.',
      },
      {
        id: 'pr-44', level: 2, topic: 'Albero dei linguaggi', chapter: 'atlante', type: 'order',
        q: 'Ordina questa linea di discendenza, dall\'antenato al discendente più recente.',
        items: ['FORTRAN', 'ALGOL', 'C', 'C++', 'Java'],
        ends: ['Antenato', 'Discendente'],
        why: 'FORTRAN (1957) ispirò ALGOL (1958-1960); da ALGOL, attraverso CPL, BCPL e B, nacque il C (circa 1972); Stroustrup gli aggiunse le classi e ne fece il C++ (1985); Java (1995) riprese la sintassi del C++.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
