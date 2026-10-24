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
        q: 'Nel telaio di Joseph-Marie Jacquard, del 1804, da che cosa dipendeva il disegno del tessuto?',
        options: ['Da una catena di schede di cartone perforate', 'Da un aiutante che alzava a mano i fili giusti', 'Da una serie di ingranaggi da cambiare ogni volta', 'Dal tessitore, che sceglieva i fili a occhio'],
        answer: 0,
        why: 'Ogni scheda comandava una passata della navetta: dove c\'era un foro, un ago passava e il suo filo veniva sollevato. Per cambiare disegno bastava cambiare le schede, un\'idea che Babbage riprese per la sua macchina analitica.',
      },
      {
        id: 'pr-02', level: 1, topic: 'Ada Lovelace', chapter: 'telai', type: 'choice',
        q: 'Nel 1843 Ada Lovelace pubblicò, nella nota G, un procedimento per la macchina analitica di Charles Babbage. Che cosa doveva calcolare?',
        options: ['I numeri di Bernoulli', 'Le tavole dei logaritmi', 'Le cifre del pi greco', 'Le posizioni dei pianeti'],
        answer: 0,
        why: 'La nota G spiega passo per passo come la macchina avrebbe calcolato i numeri di Bernoulli: per questo è spesso considerata il primo programma pubblicato. La macchina però non fu mai costruita: il programma restò sulla carta.',
      },
      {
        id: 'pr-03', level: 2, topic: 'Linea del tempo', chapter: 'telai', type: 'order',
        q: 'Dal telaio alle macchine per il censimento: metti in ordine questi eventi.',
        items: ['Jacquard presenta il telaio a schede perforate', 'Babbage progetta la macchina analitica', 'Ada Lovelace pubblica le sue note sulla macchina', 'Hollerith elabora il censimento USA con le schede'],
        ends: ['Più antico', 'Più recente'],
        why: 'Telaio Jacquard (1804), progetto della macchina analitica (dal 1834), note di Ada Lovelace (1843), censimento USA del 1890 con le macchine di Hollerith. L\'azienda di Hollerith confluì poi nell\'IBM.',
      },

      // ------------------------------------------------------------ La logica
      {
        id: 'pr-04', level: 1, topic: 'Macchina di Turing', chapter: 'logica', type: 'choice',
        q: 'Nel 1936 Alan Turing descrisse una macchina immaginaria per capire che cosa si può calcolare. Com\'è fatta?',
        options: ['Un nastro a caselle e una testina che legge e scrive', 'Una rete di neuroni artificiali collegati tra loro', 'Un insieme di relè che contano in binario', 'Un pannello di cavi da ricollegare per ogni calcolo'],
        answer: 0,
        why: 'La macchina di Turing ha un nastro infinito diviso in caselle, una testina che legge, scrive e si sposta, e una tabella di regole. È un modello matematico: ciò che un computer può calcolare, lo può calcolare anche lei.',
      },
      {
        id: 'pr-05', level: 2, topic: 'Logica e calcolo', chapter: 'logica', type: 'match',
        q: 'Abbina ogni studioso all\'idea per cui è ricordato.',
        pairs: [['George Boole', 'Un\'algebra per il vero e il falso'], ['Kurt Gödel', 'I teoremi di incompletezza'], ['Alonzo Church', 'Il lambda calcolo'], ['Claude Shannon', 'La logica dei circuiti a relè'], ['Konrad Zuse', 'Il Plankalkül, un linguaggio di programmazione']],
        why: 'Boole pubblicò la sua algebra nel 1847; Gödel dimostrò nel 1931 che ogni sistema matematico abbastanza ricco contiene verità indimostrabili; il lambda calcolo di Church ispirò il LISP; Shannon nel 1937 applicò l\'algebra di Boole ai relè; Zuse progettò il Plankalkül negli anni \'40.',
      },
      {
        id: 'pr-06', level: 3, topic: 'Linea del tempo', chapter: 'logica', type: 'order',
        q: 'Dalla logica ai primi linguaggi: ordina queste tappe dalla più antica alla più recente.',
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
        why: 'L\'ENIAC (1945) non teneva il programma in memoria: per ogni problema si ricollegavano a mano cavi e interruttori dei suoi pannelli, e potevano servire giorni. Le programmatrici impararono a farlo studiando gli schemi della macchina.',
      },
      {
        id: 'pr-08', level: 2, topic: 'Programma memorizzato', chapter: 'cavi', type: 'truefalse',
        q: 'Nel Manchester Baby, che nel 1948 eseguì il suo primo programma, istruzioni e dati stavano nella stessa memoria, come nello schema in figura.',
        figure: { kind: 'block', name: 'von-neumann' },
        answer: true,
        why: 'Il Baby fu il primo computer a programma memorizzato a funzionare, con l\'architettura descritta da von Neumann nel 1945: istruzioni e dati stavano in un tubo a raggi catodici. Per cambiare programma si scrivevano nuovi numeri in memoria, senza ricollegare cavi.',
      },
      {
        id: 'pr-09', level: 3, topic: 'Linea del tempo', chapter: 'cavi', type: 'order',
        q: 'Ordina questi eventi degli anni \'40, dal più antico al più recente.',
        items: ['Colossus aiuta a decifrare i messaggi tedeschi', 'L\'ENIAC viene completato a Filadelfia', 'Una falena finisce in un relè del Mark II', 'Il Manchester Baby esegue il primo programma', 'L\'EDSAC entra in servizio a Cambridge'],
        ends: ['Più antico', 'Più recente'],
        why: 'Colossus (1944), ENIAC (1945), falena del Mark II (1947), Manchester Baby (giugno 1948), EDSAC (maggio 1949). La falena fu incollata nel registro come «primo vero caso di bug»: la parola bug era già in uso tra gli ingegneri.',
      },

      // ------------------------------------------------------------ Codice macchina e assembly
      {
        id: 'pr-10', level: 1, topic: 'Assembler', chapter: 'assembly', type: 'choice',
        q: 'Il programma in figura è scritto in assembly. Che cosa fa l\'assembler con questo testo, prima che il processore lo possa eseguire?',
        figure: { kind: 'code', lang: 'Assembly x86', text: 'MOV  AL, 5     ; AL = 5\nADD  AL, 3     ; AL = AL + 3' },
        options: ['Traduce ogni sigla nel codice binario dell\'istruzione', 'Esegue le istruzioni una alla volta, senza tradurle', 'Lo trasforma in un programma FORTRAN equivalente', 'Controlla che i calcoli del programma siano giusti'],
        answer: 0,
        why: 'Il processore capisce solo numeri: l\'assembler sostituisce ogni sigla mnemonica, come MOV o ADD, con il codice macchina corrispondente. Nell\'x86, per esempio, MOV AL, 5 diventa i due byte B0 05.',
      },
      {
        id: 'pr-11', level: 2, topic: 'Pionieri del software', chapter: 'assembly', type: 'match',
        q: 'Abbina ogni pioniere della programmazione al suo contributo.',
        pairs: [['Kathleen Booth', 'Il primo linguaggio assembly'], ['John von Neumann', 'Il programma in memoria con i dati'], ['David Wheeler', 'La subroutine, sull\'EDSAC'], ['Grace Hopper', 'Il compilatore A-0']],
        why: 'Kathleen Booth ideò l\'assembly dal 1947, al Birkbeck College di Londra; von Neumann descrisse il programma memorizzato nel 1945; Wheeler inventò la subroutine, un pezzo di codice da richiamare più volte; Grace Hopper scrisse l\'A-0 nel 1952.',
      },
      {
        id: 'pr-12', level: 3, topic: 'Il compilatore A-0', chapter: 'assembly', type: 'choice',
        q: 'Il sistema A-0, scritto nel 1952 per l\'UNIVAC, è spesso indicato come il primo compilatore. Che cosa faceva?',
        options: ['Montava routine già pronte in un unico programma', 'Traduceva frasi in inglese in codice macchina', 'Eseguiva il programma una riga alla volta', 'Cercava gli errori nei programmi prima dell\'uso'],
        answer: 0,
        why: 'Il programmatore indicava con dei codici le routine da usare, prese da una libreria su nastro, e A-0 le «compilava», cioè le raccoglieva in un programma in codice macchina. La sua autrice, Grace Hopper, passò poi alle frasi in inglese con FLOW-MATIC.',
      },

      // ------------------------------------------------------------ I primi linguaggi
      {
        id: 'pr-13', level: 1, topic: 'FORTRAN', chapter: 'fortran', type: 'choice',
        q: 'Il FORTRAN, creato da John Backus e dal suo gruppo all\'IBM nel 1957, permetteva di scrivere formule come quella in figura. Per quale tipo di lavoro era nato?',
        figure: { kind: 'code', lang: 'FORTRAN', text: 'C     AREA DI UN CERCHIO DI RAGGIO 2\n      R = 2.0\n      A = 3.14159 * R**2\n      PRINT 10, A\n   10 FORMAT (F8.3)\n      END' },
        options: ['Per i calcoli scientifici e tecnici', 'Per la contabilità di aziende e banche', 'Per la ricerca sull\'intelligenza artificiale', 'Per insegnare a programmare agli studenti'],
        answer: 0,
        why: 'FORTRAN sta per FORmula TRANslation, traduzione di formule: R**2 vuol dire R al quadrato. Il suo compilatore produceva codice veloce quasi quanto quello scritto a mano, e convinse molti scienziati a lasciare l\'assembly.',
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
        id: 'pr-15', level: 3, topic: 'ALGOL 60 e BNF', chapter: 'fortran', type: 'choice',
        q: 'Il rapporto su ALGOL 60, del 1960, introdusse un modo nuovo e preciso di descrivere un linguaggio di programmazione. Quale?',
        options: ['Una grammatica formale nella notazione BNF', 'Un compilatore di riferimento uguale per tutti', 'Un manuale con tanti esempi commentati', 'Un diagramma di flusso per ogni istruzione'],
        answer: 0,
        why: 'La forma di Backus-Naur (BNF), proposta da John Backus e usata da Peter Naur nel rapporto, elenca con regole precise le frasi valide, per esempio <cifra> ::= 0 | 1 | 2 | ... | 9. Si usa ancora oggi per definire i linguaggi.',
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
        options: ['Scrivevano al terminale e avevano subito la risposta', 'Consegnavano le schede e aspettavano il giorno dopo', 'Usavano il computer da soli, a turno, per un\'ora', 'Collegavano cavi su un pannello per ogni esercizio'],
        answer: 0,
        why: 'Con il time-sharing il computer serve a turno molti terminali, così in fretta che ognuno sembra averlo tutto per sé. Gli studenti scrivevano il programma in BASIC su una telescrivente e lo eseguivano subito, senza aspettare l\'elaborazione a lotti delle schede.',
      },
      {
        id: 'pr-18', level: 2, topic: 'IBM System/360', chapter: 'schede', type: 'choice',
        q: 'Che cosa aveva di nuovo la famiglia di computer IBM System/360, annunciata nel 1964?',
        options: ['Modelli diversi che usavano gli stessi programmi', 'Il primo processore costruito su un solo chip', 'Il primo schermo grafico con finestre e mouse', 'La prima memoria di massa a dischi magnetici'],
        answer: 0,
        why: 'Prima, passare a un computer IBM più potente voleva dire riscrivere i programmi. Con il System/360 modelli piccoli e grandi eseguivano lo stesso software. La famiglia rese standard anche il byte da 8 bit.',
      },

      // ------------------------------------------------------------ La programmazione strutturata
      {
        id: 'pr-19', level: 1, topic: 'Teorema di Böhm-Jacopini', chapter: 'strutturata', type: 'choice',
        q: 'Nel 1966 gli italiani Corrado Böhm e Giuseppe Jacopini dimostrarono che ogni programma si può scrivere con tre sole strutture, come fa questo programma Pascal. Quali?',
        figure: { kind: 'code', lang: 'Pascal', text: 'program Strutture;\nvar i: integer;\nbegin\n  i := 1;\n  while i <= 4 do\n  begin\n    if i mod 2 = 0 then\n      writeln(i, \' pari\')\n    else\n      writeln(i, \' dispari\');\n    i := i + 1\n  end\nend.' },
        options: ['Sequenza, selezione e iterazione', 'Variabili, funzioni e oggetti', 'Ingresso, elaborazione e uscita', 'Salto, confronto e somma'],
        answer: 0,
        why: 'Sequenza (un\'istruzione dopo l\'altra), selezione (if... else) e iterazione (while) bastano per qualsiasi algoritmo, senza salti GOTO. Il Pascal, creato da Niklaus Wirth nel 1970, nacque per insegnare proprio questo stile.',
      },
      {
        id: 'pr-20', level: 2, topic: 'Dijkstra e il GOTO', chapter: 'strutturata', type: 'choice',
        q: 'Nel 1968 Edsger Dijkstra scrisse la famosa lettera «Go To Statement Considered Harmful», contro i salti come quelli di questo programma BASIC. Che cosa criticava?',
        figure: { kind: 'code', lang: 'BASIC', text: '10 LET I = 1\n20 IF I > 3 THEN 60\n30 PRINT I\n40 LET I = I + 1\n50 GOTO 20\n60 END' },
        options: ['I salti rendono difficile seguire il programma', 'I salti rendono il programma molto più lento', 'I salti occupano troppa memoria nel computer', 'I salti impediscono di usare le subroutine'],
        answer: 0,
        why: 'Con molti GOTO l\'esecuzione salta avanti e indietro e il codice diventa «spaghetti», difficile da capire e da correggere. Dijkstra chiedeva cicli e selezioni: qui basterebbe un FOR I = 1 TO 3 ... NEXT I.',
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
        id: 'pr-25', level: 1, topic: 'Caratteri ASCII in C', chapter: 'unix', type: 'bits',
        q: 'In C un char è un numero di 8 bit: il codice ASCII del carattere. Le minuscole valgono 32 più delle maiuscole: \'A\' è 65, \'a\' è 97. Accendi gli 8 bit di \'a\'.',
        width: 8, value: 97,
        why: '97 = 64 + 32 + 1, quindi 0110 0001. La \'A\' è 0100 0001: cambia solo il bit che vale 32. Per questo in C si passa da minuscola a maiuscola togliendo 32, cioè spegnendo quel bit.',
      },

      // ------------------------------------------------------------ Il software dei personal
      {
        id: 'pr-26', level: 1, topic: 'VisiCalc', chapter: 'personal', type: 'choice',
        q: 'Nel 1979 uscì VisiCalc per l\'Apple II, e molte persone comprarono il computer solo per usarlo. Che cos\'era?',
        options: ['Il primo foglio di calcolo per personal', 'Il primo programma di videoscrittura', 'Il primo videogioco con la grafica a colori', 'Il primo programma per la posta elettronica'],
        answer: 0,
        why: 'VisiCalc, di Dan Bricklin e Bob Frankston, ricalcolava da solo tutta la tabella quando si cambiava un numero. Fu la prima «killer application»: un programma così utile da far comprare il computer per usarlo.',
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
        id: 'pr-29', level: 2, topic: 'Codice ASCII', chapter: 'personal', type: 'bits',
        q: 'In BASIC la funzione ASC dà il codice ASCII di un carattere: ASC("A") vale 65 e le lettere seguono l\'ordine alfabetico. Accendi i bit del numero stampato dal programma.',
        figure: { kind: 'code', lang: 'BASIC', text: '10 PRINT ASC("D")' },
        width: 8, value: 68,
        why: 'D è la quarta lettera, quindi 65 + 3 = 68. In binario 68 = 64 + 4, cioè 0100 0100. Per il computer ogni carattere è un numero come questo.',
      },

      // ------------------------------------------------------------ La programmazione a oggetti
      {
        id: 'pr-30', level: 1, topic: 'Classi e oggetti', chapter: 'oggetti', type: 'choice',
        q: 'Nel programma in figura Cane è una classe. Che cosa sono rex e fido?',
        figure: { kind: 'code', lang: 'Python', text: 'class Cane:\n    def __init__(self, nome):\n        self.nome = nome\n\nrex = Cane(\'Rex\')\nfido = Cane(\'Fido\')' },
        options: ['Due oggetti creati dalla classe Cane', 'Due classi che ereditano da Cane', 'Due funzioni definite dentro Cane', 'Due copie del codice della classe'],
        answer: 0,
        why: 'La classe è il modello: dice quali dati (qui il nome) e quali azioni avrà ogni oggetto. Cane(\'Rex\') crea un oggetto, cioè un\'istanza della classe con i propri dati. Le classi nacquero con Simula, nel 1967, e arrivarono nel C con il C++.',
      },
      {
        id: 'pr-31', level: 2, topic: 'Ereditarietà', chapter: 'oggetti', type: 'truefalse',
        q: 'Nel C++ di Bjarne Stroustrup, uscito nel 1985, come negli altri linguaggi a oggetti, una classe che eredita da un\'altra deve riscrivere da capo tutti i suoi metodi.',
        answer: false,
        why: 'È il contrario: la classe figlia riceve dati e metodi della classe madre e riscrive solo quelli che vuole cambiare. Una classe Cane che eredita da Animale, per esempio, sa già fare tutto ciò che fa un Animale.',
      },
      {
        id: 'pr-32', level: 3, topic: 'Programmi a eventi', chapter: 'oggetti', type: 'choice',
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
        why: 'Berners-Lee inventò il web al CERN (1989-1991); Torvalds annunciò Linux nel 1991, l\'anno del primo Python; Gosling guidò Java alla Sun (1995); Eich scrisse JavaScript per Netscape in 10 giorni (1995). Nonostante il nome, JavaScript non deriva da Java.',
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
        q: 'In JavaScript nome.length dà il numero di caratteri di una stringa. Quante lettere conta in tutto il programma, cioè che numero stampa?',
        figure: { kind: 'code', lang: 'JavaScript', text: 'const linguaggi = [\'Python\', \'Java\', \'PHP\'];\nlet lettere = 0;\nfor (const nome of linguaggi) {\n  lettere += nome.length;\n}\nconsole.log(lettere);' },
        value: 13, unit: 'lettere', tolerance: 0,
        why: 'Il ciclo for prende un nome alla volta: Python ha 6 lettere, Java 4 e PHP 3, quindi 6 + 4 + 3 = 13. JavaScript, nato nel 1995 per i browser, oggi gira anche sui server.',
      },

      // ------------------------------------------------------------ Software ovunque
      {
        id: 'pr-36', level: 1, topic: 'Git', chapter: 'ovunque', type: 'choice',
        q: 'Nel 2005 Linus Torvalds creò Git per lo sviluppo di Linux. Che cos\'è Git?',
        options: ['Un sistema per il controllo delle versioni', 'Un sito web per pubblicare i progetti', 'Un linguaggio per le app dei telefoni', 'Un servizio cloud per eseguire programmi'],
        answer: 0,
        why: 'Git registra ogni modifica del codice, con autore e data, e permette a molti programmatori di lavorare in parallelo e poi unire il lavoro. GitHub (2008) è invece un sito che ospita progetti Git.',
      },
      {
        id: 'pr-37', level: 1, topic: 'Linea del tempo', chapter: 'ovunque', type: 'order',
        q: 'Ordina queste tappe del software del nuovo secolo, dalla più antica alla più recente.',
        items: ['Viene firmato il Manifesto Agile', 'Torvalds crea Git', 'Apple presenta il primo iPhone', 'Nasce Docker, per i container'],
        ends: ['Più antica', 'Più recente'],
        why: 'Manifesto Agile (2001), Git (2005), iPhone (2007, con l\'App Store dal 2008), Docker (2013). In pochi anni il software è finito in tasca e nel cloud.',
      },
      {
        id: 'pr-38', level: 2, topic: 'Linguaggi e aziende', chapter: 'ovunque', type: 'match',
        q: 'Abbina ogni linguaggio recente all\'azienda che lo ha creato o sostenuto.',
        pairs: [['Go', 'Google'], ['Swift', 'Apple'], ['Rust', 'Mozilla'], ['C#', 'Microsoft']],
        why: 'Go (2009) nacque a Google, tra gli altri da Ken Thompson, uno dei padri di Unix; Swift (2014) è il successore dell\'Objective-C per iPhone e Mac; Rust, sostenuto da Mozilla (prima versione stabile nel 2015), evita gli errori di memoria del C; C# (2000) è di Microsoft.',
      },

      // ------------------------------------------------------------ L'intelligenza artificiale
      {
        id: 'pr-39', level: 1, topic: 'Linea del tempo', chapter: 'ia', type: 'order',
        q: 'Ordina queste tappe dell\'intelligenza artificiale, dalla più antica alla più recente.',
        items: ['McCulloch e Pitts descrivono il neurone artificiale', 'Rosenblatt presenta il percettrone', 'La rete AlexNet vince la gara ImageNet', 'Google presenta il Transformer'],
        ends: ['Più antica', 'Più recente'],
        why: 'Neurone artificiale (1943), percettrone (1958), AlexNet (2012), Transformer, nell\'articolo «Attention Is All You Need» (2017). In mezzo ci furono gli «inverni dell\'IA», anni di delusioni e pochi fondi.',
      },
      {
        id: 'pr-40', level: 3, topic: 'Neurone artificiale', chapter: 'ia', type: 'truth',
        q: 'Un neurone di McCulloch e Pitts (1943) somma i suoi ingressi, che valgono 0 o 1, e dà 1 se la somma raggiunge la soglia. Con tre ingressi e soglia 2 fa come il circuito di porte disegnato: completa la tabella di verità.',
        expr: 'OR(AND(A,B),AND(A,C),AND(B,C))',
        why: 'L\'uscita vale 1 quando almeno due ingressi su tre sono a 1: è la funzione «maggioranza». Cambiando la soglia lo stesso neurone fa altre funzioni: con soglia 1 diventa un OR, con soglia 3 un AND.',
      },
      {
        id: 'pr-41', level: 1, topic: 'Assistenti di programmazione', chapter: 'ia', type: 'truefalse',
        q: 'Un assistente di programmazione basato su un modello linguistico può sbagliare: il codice che propone va letto e provato prima di usarlo.',
        answer: true,
        why: 'Un modello linguistico genera il codice più probabile in base a ciò che ha imparato, e a volte inventa funzioni o introduce errori. Il programmatore resta responsabile: legge, prova e capisce il codice che usa.',
      },

      // ------------------------------------------------------------ L'atlante dei linguaggi
      {
        id: 'pr-42', level: 1, topic: 'La famiglia del C', chapter: 'atlante', type: 'choice',
        q: 'Java, C# e JavaScript racchiudono i blocchi di codice tra parentesi graffe { }, come in questo programma Java. Da quale linguaggio viene questa abitudine?',
        figure: { kind: 'code', lang: 'Java', text: 'public class Ciao {\n    public static void main(String[] args) {\n        System.out.println("Ciao!");\n    }\n}' },
        options: ['Dal C', 'Dal Pascal', 'Dal FORTRAN', 'Dal COBOL'],
        answer: 0,
        why: 'Il C (circa 1972) rese popolari le graffe; il C++ le ereditò e da lì passarono a Java, C# e JavaScript, la grande famiglia del C. Il Pascal, della famiglia di ALGOL, usa invece begin ed end.',
      },
      {
        id: 'pr-43', level: 2, topic: 'Albero dei linguaggi', chapter: 'atlante', type: 'match',
        q: 'Nell\'albero genealogico dei linguaggi, abbina ogni linguaggio a quello da cui discende.',
        pairs: [['Scheme', 'LISP'], ['Pascal', 'ALGOL'], ['Smalltalk', 'Simula'], ['C#', 'C++']],
        why: 'Scheme (1975) è un dialetto del LISP; Niklaus Wirth costruì il Pascal (1970) partendo da ALGOL; Smalltalk prese da Simula le classi e gli oggetti; C# (2000) continua la famiglia del C e del C++, come Java.',
      },
      {
        id: 'pr-44', level: 3, topic: 'Albero dei linguaggi', chapter: 'atlante', type: 'order',
        q: 'Ordina questa linea di discendenza, dall\'antenato al discendente più recente.',
        items: ['FORTRAN', 'ALGOL', 'C', 'C++', 'Java'],
        ends: ['Antenato', 'Discendente'],
        why: 'FORTRAN (1957) ispirò ALGOL (1958-1960); da ALGOL, attraverso CPL, BCPL e B, nacque il C (circa 1972); Stroustrup gli aggiunse le classi e ne fece il C++ (1985); Java (1995) riprese la sintassi del C++.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
