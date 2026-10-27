/*
 * Banca domande del quiz: sezione 5, I primi chip programmabili.
 * Dalla commessa Busicom all'Intel 4004, le memorie, il ciclo fetch-decode-execute,
 * i processori a 8, 16 e 32 bit, i microcontrollori e la logica programmabile.
 */
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'chip-programmabili',
    number: 5,
    title: 'I primi chip programmabili',
    subtitle: 'Microprocessori, memorie e logica programmabile: architettura e storia',
    chapters: [
      { id: 'idea', title: 'Cablato o programmato' },
      { id: 'memorie', title: 'Le memorie' },
      { id: 'intel-4004', title: 'Intel 4004' },
      { id: 'ciclo', title: 'Fetch, decode, execute' },
      { id: 'otto-bit', title: 'I processori a 8 bit' },
      { id: 'microcontrollori', title: 'I microcontrollori' },
      { id: 'logica-programmabile', title: 'Logica programmabile' },
      { id: 'sedici-bit', title: 'Verso i 16 e 32 bit' },
    ],
    questions: [
      // ------------------------------------------------------------ Cablato o programmato
      {
        id: 'cp-01', level: 1, topic: 'Logica cablata', chapter: 'idea', type: 'choice',
        q: 'Il circuito in figura è a logica cablata. Che cosa bisogna fare per fargli svolgere una funzione diversa?',
        figure: { kind: 'logic', expr: 'OR(AND(A,B),C)' },
        options: ['Cambiare le porte e i loro collegamenti', 'Caricare un nuovo programma in memoria', 'Cambiare i valori sugli ingressi A, B e C', 'Aumentare la frequenza del clock'],
        answer: 0,
        why: 'Nella logica cablata la funzione è decisa dai collegamenti tra le porte: per cambiarla si rifà il circuito. Con un processore, invece, lo stesso hardware cambia comportamento quando si cambia il programma in memoria.',
      },
      {
        id: 'cp-02', level: 1, topic: 'Commessa Busicom', chapter: 'idea', type: 'choice',
        q: 'Nel 1969 l\'azienda giapponese Busicom chiese a Intel una serie di chip. Per quale prodotto erano pensati?',
        options: ['Per una linea di calcolatrici', 'Per un terminale di computer', 'Per un orologio digitale da polso', 'Per una console di videogiochi'],
        answer: 0,
        why: 'Busicom voleva i chip per le sue calcolatrici, come la 141-PF con stampante: da quella commessa nacque nel 1971 l\'Intel 4004. Il terminale è la storia dell\'8008, nato per il Datapoint 2200.',
      },
      {
        id: 'cp-03', level: 2, topic: 'Ted Hoff', chapter: 'idea', type: 'choice',
        q: 'Busicom chiedeva a Intel molti chip diversi, ciascuno progettato su misura. Che cosa propose invece Ted Hoff?',
        options: ['Un processore generico che esegue un programma', 'Un unico grande chip cablato con tutte le funzioni', 'Una memoria con i risultati di tutti i calcoli', 'Una calcolatrice collegata a un minicomputer'],
        answer: 0,
        why: 'Hoff propose pochi chip generici: un processore a 4 bit, una ROM con il programma e una RAM per i dati; poi ne definì l\'architettura con Stan Mazor. Le funzioni della calcolatrice diventavano software, più facile da cambiare.',
      },
      {
        id: 'cp-04', level: 2, topic: 'Cablato e programmato', chapter: 'idea', type: 'truefalse',
        q: 'A parità di tecnologia, un processore che esegue un programma è più veloce di un circuito cablato progettato per quel solo compito.',
        answer: false,
        why: 'Di solito è il contrario: il circuito cablato fa solo quel lavoro, mentre il processore deve prelevare e decodificare un\'istruzione dopo l\'altra. Il vantaggio del processore è la flessibilità: basta cambiare il programma.',
      },
      {
        id: 'cp-05', level: 3, topic: 'Storia del 4004', chapter: 'idea', type: 'order',
        q: 'Metti in ordine gli eventi che portarono l\'Intel 4004 sul mercato.',
        items: ['Busicom chiede a Intel i chip per le sue calcolatrici', 'Ted Hoff propone un processore generico', 'Federico Faggin viene assunto in Intel', 'Intel ottiene il diritto di vendere il chip ad altri', 'Intel presenta il 4004 al pubblico'],
        ends: ['Prima', 'Dopo'],
        why: 'Busicom si rivolge a Intel e Hoff propone l\'idea nel 1969; Faggin arriva nell\'aprile 1970 e realizza il chip con Masatoshi Shima di Busicom; nel 1971 Intel ottiene i diritti e a novembre annuncia il 4004.',
      },

      // ------------------------------------------------------------ Le memorie
      {
        id: 'cp-06', level: 1, topic: 'ROM e RAM', chapter: 'memorie', type: 'choice',
        q: 'Una calcolatrice tiene il programma in ROM e i numeri digitati in RAM. Perché il programma non sta in RAM?',
        options: ['La RAM perde tutto quando si spegne', 'La RAM è più lenta della ROM', 'La RAM può contenere solo numeri', 'La RAM si rovina se la si riscrive spesso'],
        answer: 0,
        why: 'La RAM è volatile: senza alimentazione dimentica tutto. La ROM conserva il programma anche a calcolatrice spenta, mentre i numeri digitati servono solo durante il calcolo e possono stare in RAM.',
      },
      {
        id: 'cp-07', level: 1, topic: 'RAM dinamica', chapter: 'memorie', type: 'truefalse',
        q: 'La RAM dinamica (DRAM) va rinfrescata di continuo, perché i suoi minuscoli condensatori perdono la carica.',
        answer: true,
        why: 'Nelle DRAM di oggi ogni bit è un condensatore con un transistor: la carica si disperde, quindi un circuito la rilegge e la riscrive più volte al secondo (refresh). La RAM statica usa un flip-flop e non ne ha bisogno.',
      },
      {
        // Stesso id della domanda della sezione su EEPROM e Flash: quando
        // sections/chip-programmabili/quiz.js è caricato vale quella.
        id: 'memorie-4', level: 2, topic: 'Cancellare le memorie', chapter: 'memorie', type: 'match',
        q: 'Abbina ogni memoria al modo in cui si cancella.',
        pairs: [['PROM', 'Non si cancella: si scrive una volta sola'], ['EPROM', 'Con luce ultravioletta'], ['EEPROM', 'Elettricamente, un byte alla volta'], ['Flash', 'Elettricamente, a blocchi interi']],
        why: 'La PROM si programma bruciando fusibili, una volta sola. La EPROM (Dov Frohman, Intel, 1971) si cancella con gli UV dalla finestrella; la EEPROM elettricamente, byte per byte; la Flash (presentata nel 1984 da Fujio Masuoka di Toshiba) a blocchi.',
      },
      {
        id: 'cp-09', level: 1, topic: 'Storia delle memorie', chapter: 'memorie', type: 'order',
        q: 'Ordina queste memorie non volatili dalla più antica alla più recente.',
        items: ['PROM', 'EPROM', 'EEPROM', 'Flash'],
        ends: ['Più antica', 'Più recente'],
        why: 'PROM (1956), EPROM (1971, Dov Frohman in Intel), EEPROM (fine anni \'70), Flash (presentata nel 1984 da Fujio Masuoka di Toshiba). Oggi la Flash è nelle chiavette USB, nelle schede SD e nei dischi SSD.',
      },
      {
        id: 'cp-10', level: 3, topic: 'RAM statica e dinamica', chapter: 'memorie', type: 'choice',
        q: 'La cache dei processori usa RAM statica, la memoria principale RAM dinamica. Perché non si fa tutta la memoria con RAM statica?',
        figure: { kind: 'block', name: 'memory-pyramid' },
        options: ['Costa di più e occupa più spazio per bit', 'È più lenta della RAM dinamica', 'Va rinfrescata più spesso della dinamica', 'Perde i dati ogni volta che viene letta'],
        answer: 0,
        why: 'Una cella di RAM statica è un flip-flop di circa 6 transistor, una di RAM dinamica 1 transistor e 1 condensatore. La statica è più veloce e non va rinfrescata, ma nello stesso spazio contiene molti meno bit e costa di più.',
      },

      // ------------------------------------------------------------ Intel 4004
      {
        id: 'cp-11', level: 3, topic: 'Piedini del 4004', chapter: 'intel-4004', type: 'choice',
        q: 'Il 4004 in figura ha solo 16 piedini, ma usa indirizzi da 12 bit e legge il programma un byte (8 bit) alla volta. Come scambia indirizzi e byte con le memorie?',
        figure: { kind: 'chip', pins: 16, label: 'Intel 4004', note: '1971' },
        options: ['In gruppi di 4 bit, sulle stesse 4 linee dati', 'Con 12 piedini riservati solo agli indirizzi', 'Comprimendo ogni indirizzo in soli 4 bit', 'Non li scambia: il programma sta dentro il chip'],
        answer: 0,
        why: 'Le 4 linee dati D0-D3 portano tutto, a turno: in un ciclo di 8 periodi di clock il 4004 manda l\'indirizzo in tre gruppi da 4 bit, riceve un byte del programma in due gruppi e dedica gli ultimi tre periodi all\'esecuzione. Così bastano 16 piedini.',
      },
      {
        id: 'cp-12', level: 1, topic: 'Progetto del 4004', chapter: 'intel-4004', type: 'choice',
        q: 'Chi guidò in Intel la progettazione del 4004, usando la tecnologia silicon gate che aveva messo a punto alla Fairchild?',
        options: ['Federico Faggin', 'Ted Hoff', 'Masatoshi Shima', 'Stan Mazor'],
        answer: 0,
        why: 'Federico Faggin, fisico nato a Vicenza, aveva sviluppato la tecnologia silicon gate alla Fairchild nel 1968. In Intel la usò per mettere circa 2300 transistor (processo da 10 µm) in un chip di 3 × 4 mm, che firmò con le sue iniziali: F.F.',
      },
      {
        id: 'cp-13', level: 2, topic: 'Famiglia MCS-4', chapter: 'intel-4004', type: 'match',
        q: 'Abbina ogni chip della famiglia MCS-4 al suo compito.',
        pairs: [['4001', 'ROM con il programma'], ['4002', 'RAM per i dati'], ['4003', 'Registro a scorrimento'], ['4004', 'Processore a 4 bit']],
        why: 'Nella famiglia MCS-4 (1971) il 4001 è una ROM da 256 byte, il 4002 una RAM da 320 bit, il 4003 un registro a scorrimento a 10 bit per avere più uscite, il 4004 la CPU. Con questi chip era fatta la calcolatrice Busicom.',
      },
      {
        id: 'cp-14', level: 2, topic: 'Periodo del clock', chapter: 'intel-4004', type: 'number',
        q: 'Il clock dell\'Intel 4004 va a 740 kHz. Quanto dura un periodo di clock, in µs?',
        value: 1.351, unit: 'µs', tolerance: 0.05,
        why: 'T = 1 / f = 1 / 740 000 Hz ≈ 0,00000135 s = 1,35 µs. Un processore di oggi a 4 GHz ha un periodo di 0,25 ns, più di cinquemila volte più breve.',
      },
      {
        id: 'cp-15', level: 2, topic: 'Codice BCD', chapter: 'intel-4004', type: 'bits',
        q: 'Le calcolatrici con il 4004 usavano il codice BCD: ogni cifra decimale occupa 4 bit. Accendi i bit per scrivere 47 in BCD, con la cifra delle decine nei 4 bit di sinistra.',
        width: 8, value: 71,
        why: 'In BCD 4 = 0100 e 7 = 0111, quindi 47 = 0100 0111. In binario puro la stessa fila di bit varrebbe 71, mentre 47 sarebbe 0010 1111: il BCD spreca qualche combinazione, ma rende facile mostrare le cifre.',
      },

      // ------------------------------------------------------------ Fetch, decode, execute
      {
        id: 'cp-16', level: 1, topic: 'Fetch, decode, execute', chapter: 'ciclo', type: 'choice',
        q: 'Ogni processore ripete di continuo tre fasi: fetch, decode, execute. Che cosa succede nella fase di fetch?',
        options: ['Si preleva l\'istruzione dalla memoria', 'Si interpreta l\'opcode dell\'istruzione', 'L\'ALU esegue il calcolo richiesto', 'Il risultato viene scritto in un registro'],
        answer: 0,
        why: 'Fetch significa "prelevare": il program counter fornisce l\'indirizzo e l\'istruzione arriva dalla memoria nel registro istruzioni. Seguono decode (decodifica) ed execute (esecuzione), poi il ciclo ricomincia.',
      },
      {
        id: 'cp-17', level: 1, topic: 'Program counter', chapter: 'ciclo', type: 'truefalse',
        q: 'Il program counter si chiama così perché conta quante istruzioni il processore ha già eseguito.',
        answer: false,
        why: 'Nonostante il nome, il program counter contiene l\'indirizzo della prossima istruzione da prelevare. Di solito avanza dopo ogni lettura, ma un salto può mandarlo altrove.',
      },
      {
        id: 'cp-18', level: 2, topic: 'Passi del ciclo', chapter: 'ciclo', type: 'order',
        q: 'Metti in ordine i passi con cui un processore preleva ed esegue un\'istruzione.',
        figure: { kind: 'block', name: 'cpu' },
        items: ['Il program counter mette l\'indirizzo sul bus indirizzi', 'La memoria manda l\'istruzione sul bus dati', 'L\'istruzione entra nel registro istruzioni', 'L\'unità di controllo decodifica l\'opcode', 'L\'ALU esegue l\'operazione'],
        ends: ['Primo passo', 'Ultimo passo'],
        why: 'Fetch: il PC indica l\'indirizzo, la memoria risponde sul bus dati e l\'istruzione finisce nel registro istruzioni. Decode: l\'unità di controllo interpreta l\'opcode. Execute: l\'ALU calcola.',
      },
      {
        id: 'cp-19', level: 2, topic: 'Accumulatore', chapter: 'ciclo', type: 'choice',
        q: 'Nel 6502, LDA carica un valore nell\'accumulatore e ADC gli somma un altro valore più il riporto, che CLC azzera. Il simbolo $ indica un numero esadecimale. Che valore resta alla fine nell\'accumulatore?',
        figure: { kind: 'code', lang: 'Assembly 6502', text: 'CLC         ; riporto = 0\nLDA #$05\nADC #$03' },
        options: ['$08', '$05', '$03', '$09'],
        answer: 0,
        why: 'CLC azzera il riporto, LDA #$05 mette 5 nell\'accumulatore, ADC #$03 calcola 5 + 3 + 0 = 8. Il simbolo # indica un valore immediato: il risultato è $08.',
      },
      {
        id: 'cp-20', level: 2, topic: 'Opcode in binario', chapter: 'ciclo', type: 'bits',
        q: 'Nel 6502, l\'istruzione LDA con valore immediato ha opcode $A9, cioè A9 in esadecimale. Accendi i bit per scrivere questo byte.',
        width: 8, value: 169,
        why: 'Ogni cifra esadecimale corrisponde a 4 bit: A = 1010 e 9 = 1001, quindi $A9 = 1010 1001, cioè 169. È il byte che il processore legge e decodifica come "carica nell\'accumulatore".',
      },

      // ------------------------------------------------------------ I processori a 8 bit
      {
        id: 'cp-21', level: 1, topic: 'MOS 6502', chapter: 'otto-bit', type: 'choice',
        q: 'Il processore in figura, del 1975, finì nell\'Apple II, nel Commodore PET e in molti home computer. Chi ne guidò il progetto?',
        figure: { kind: 'chip', pins: 40, label: 'MOS 6502', note: '1975' },
        options: ['Chuck Peddle', 'Federico Faggin', 'Steve Wozniak', 'Ted Hoff'],
        answer: 0,
        why: 'Chuck Peddle aveva lavorato al 6800 in Motorola; alla MOS Technology progettò il 6502 con Bill Mensch e altri colleghi. Steve Wozniak lo scelse per l\'Apple II, ma non lo progettò.',
      },
      {
        id: 'cp-22', level: 3, topic: 'Assembly Z80', chapter: 'otto-bit', type: 'choice',
        q: 'Nello Z80, DJNZ toglie 1 dal registro B e torna all\'etichetta indicata se B non è ancora 0. Quanto vale il registro A alla fine?',
        figure: { kind: 'code', lang: 'Assembly Z80', text: '        LD   A,0\n        LD   B,3\nCICLO:  ADD  A,5\n        DJNZ CICLO' },
        options: ['15', '5', '10', '20'],
        answer: 0,
        why: 'ADD A,5 viene eseguita tre volte: A passa da 0 a 5, 10, 15 mentre B scende da 3 a 2, 1, 0. Quando B arriva a 0, DJNZ non salta più e il programma prosegue con A = 15.',
      },
      {
        id: 'cp-23', level: 2, topic: 'Linea del tempo', chapter: 'otto-bit', type: 'order',
        q: 'Ordina questi processori a 8 bit dal più antico al più recente.',
        items: ['Intel 8008', 'Intel 8080', 'MOS 6502', 'Zilog Z80'],
        ends: ['Più antico', 'Più recente'],
        why: 'Intel 8008 (1972), Intel 8080 (1974), MOS 6502 (1975), Zilog Z80 (1976): in quattro anni i processori a 8 bit passarono dai terminali ai primi personal computer.',
      },
      {
        id: 'cp-24', level: 1, topic: 'Processori e aziende', chapter: 'otto-bit', type: 'match',
        q: 'Abbina ogni processore a 8 bit all\'azienda che lo creò.',
        pairs: [['8080', 'Intel'], ['6800', 'Motorola'], ['6502', 'MOS Technology'], ['Z80', 'Zilog']],
        why: 'L\'8080 di Intel e il 6800 di Motorola sono del 1974, il 6502 di MOS Technology del 1975, lo Z80 di Zilog del 1976. Il 6502 nacque da ex progettisti del 6800; la Zilog fu fondata da Federico Faggin e Ralph Ungermann, usciti da Intel.',
      },
      {
        id: 'cp-25', level: 2, topic: 'Spazio di indirizzi', chapter: 'otto-bit', type: 'number',
        q: 'Il 6502 ha un bus indirizzi a 16 bit: l\'indirizzo più alto è quello in figura, con tutti i bit a 1. Quanta memoria può indirizzare, in KB (1 KB = 1024 byte)?',
        figure: { kind: 'bits', value: 65535, width: 16 },
        value: 64, unit: 'KB', tolerance: 0.5,
        why: '16 bit danno 2¹⁶ = 65 536 indirizzi (da 0 a 65 535, cioè $FFFF), uno per byte: 65 536 / 1024 = 64 KB. Per questo molti home computer a 8 bit, come il Commodore 64, avevano 64 KB di RAM.',
      },

      // ------------------------------------------------------------ I microcontrollori
      {
        id: 'cp-26', level: 1, topic: 'Microcontrollore', chapter: 'microcontrollori', type: 'choice',
        q: 'Che cosa distingue un microcontrollore da un microprocessore?',
        options: ['Ha CPU, memorie e periferiche in un solo chip', 'Ha registri più larghi e un clock molto più veloce', 'Ha la logica cablata e non esegue programmi', 'Tiene il programma su un disco esterno'],
        answer: 0,
        why: 'Un microcontrollore è un piccolo computer completo: processore, memoria per il programma, RAM e periferiche (porte, timer, convertitori) nello stesso chip. Un microprocessore ha bisogno di chip esterni per memoria e ingressi/uscite.',
      },
      {
        id: 'cp-27', level: 1, topic: 'Harvard e von Neumann', chapter: 'microcontrollori', type: 'choice',
        q: 'Lo schema mostra l\'architettura di von Neumann. Che cosa cambia nell\'architettura Harvard, usata da molti microcontrollori?',
        figure: { kind: 'block', name: 'von-neumann' },
        options: ['Programma e dati hanno memorie e bus separati', 'Due processori lavorano sulla stessa memoria', 'Ingressi e uscite hanno un bus tutto loro', 'I dati stanno solo nei registri del processore'],
        answer: 0,
        why: 'Nell\'architettura Harvard istruzioni e dati hanno memorie e bus propri: il processore può leggere la prossima istruzione mentre usa un dato. È la scelta di molti microcontrollori, come l\'8051 e l\'AVR dell\'Arduino Uno.',
      },
      {
        id: 'cp-28', level: 1, topic: 'TMS1000', chapter: 'microcontrollori', type: 'truefalse',
        q: 'Il TMS1000 di Texas Instruments, del 1974, è considerato uno dei primi microcontrollori: aveva processore, ROM e RAM nello stesso chip.',
        answer: true,
        why: 'Il TMS1000 univa un processore a 4 bit, la ROM per il programma, una piccola RAM e le linee di ingresso e uscita. Era economico e finì in calcolatrici, giocattoli ed elettrodomestici.',
      },
      {
        id: 'cp-29', level: 2, topic: 'Periferiche', chapter: 'microcontrollori', type: 'match',
        q: 'Abbina ogni periferica di un microcontrollore al suo compito.',
        pairs: [['Timer', 'Misura il tempo e genera ritardi'], ['Convertitore analogico-digitale', 'Trasforma una tensione in un numero'], ['Porta seriale', 'Trasmette i dati un bit alla volta'], ['Porta di ingresso e uscita', 'Legge pulsanti e accende LED']],
        why: 'Oltre a CPU e memorie, un microcontrollore ha nel chip le periferiche che lo collegano al mondo esterno. L\'Intel 8051 (1980) aveva due timer, quattro porte da 8 bit e una seriale; l\'ATmega328P dell\'Arduino Uno ha in più un convertitore analogico-digitale.',
      },
      {
        id: 'cp-30', level: 3, topic: 'Istruzioni dei PIC', chapter: 'microcontrollori', type: 'choice',
        q: 'Nei PIC16 di fascia media, come il PIC16F84, i dati sono a 8 bit, ma ogni istruzione è lunga 14 bit. Che cosa lo rende possibile?',
        options: ['Programma e dati usano memorie separate', 'Ogni istruzione occupa due byte di RAM', 'Il processore in realtà lavora a 16 bit', 'I bit in più servono a correggere errori'],
        answer: 0,
        why: 'Nell\'architettura Harvard la memoria del programma è separata da quella dei dati e può avere parole di larghezza diversa: nel PIC16F84 ogni istruzione è una parola da 14 bit letta in un colpo solo, mentre la RAM resta a 8 bit.',
      },

      // ------------------------------------------------------------ Logica programmabile
      {
        id: 'cp-31', level: 1, topic: 'FPGA', chapter: 'logica-programmabile', type: 'choice',
        q: 'Che cosa ha di speciale una FPGA rispetto a un chip a logica fissa?',
        options: ['I collegamenti interni si possono riconfigurare', 'Esegue un programma un\'istruzione alla volta', 'Lavora con segnali analogici invece che digitali', 'Si programma una sola volta, in fabbrica'],
        answer: 0,
        why: 'Una FPGA è una griglia di blocchi logici e collegamenti programmabili: si descrive il circuito con un linguaggio come VHDL o Verilog, si carica la configurazione e il chip diventa quel circuito. Nella maggior parte delle FPGA la configurazione si può cambiare quante volte si vuole.',
      },
      {
        id: 'cp-32', level: 2, topic: 'Tabelle di lookup', chapter: 'logica-programmabile', type: 'choice',
        q: 'In una FPGA le funzioni logiche stanno in tabelle di lookup (LUT): piccole memorie con un bit per ogni combinazione degli ingressi. Quanti bit ha una LUT a 4 ingressi?',
        options: ['16', '4', '8', '65 536'],
        answer: 0,
        why: '4 ingressi danno 2⁴ = 16 combinazioni, quindi 16 celle da un bit: scrivendoci la tabella di verità si ottiene qualsiasi funzione di 4 ingressi. Le funzioni possibili sono 2¹⁶ = 65 536.',
      },
      {
        id: 'cp-33', level: 3, topic: 'Linguaggi per l\'hardware', chapter: 'logica-programmabile', type: 'choice',
        q: 'Da questa descrizione in Verilog (^ è XOR, & è AND) si ricava la configurazione di una FPGA. Come funzionano, nel chip, i due circuiti descritti?',
        figure: { kind: 'code', lang: 'Verilog', text: 'assign s = a ^ b;   // somma\nassign c = a & b;   // riporto' },
        options: ['Lavorano insieme, in parallelo e di continuo', 'Prima si calcola s, poi si calcola c', 'Uno per ciclo di clock, come in un programma', 'Solo una volta, quando si carica la configurazione'],
        answer: 0,
        why: 'Verilog e VHDL descrivono circuiti, non elencano istruzioni da eseguire. Caricata la configurazione, ogni assign diventa logica nelle LUT: s e c si aggiornano insieme appena cambia a o b, come le uscite di un semisommatore.',
      },
      {
        id: 'cp-34', level: 3, topic: 'PLA, PAL, CPLD, FPGA', chapter: 'logica-programmabile', type: 'match',
        q: 'Abbina ogni dispositivo di logica programmabile alla sua struttura.',
        pairs: [['PLA', 'Matrici AND e OR entrambe programmabili'], ['PAL', 'Matrice AND programmabile e OR fissa'], ['CPLD', 'Più blocchi tipo PAL uniti da collegamenti'], ['FPGA', 'Griglia di LUT e collegamenti configurabili']],
        why: 'La PLA ha due matrici programmabili; la PAL (MMI, 1978) fissa la OR ed è più semplice e veloce; la CPLD unisce più blocchi tipo PAL; la FPGA (Xilinx XC2064, 1985) usa tabelle di lookup. La GAL è una PAL cancellabile elettricamente.',
      },
      {
        id: 'cp-35', level: 2, topic: 'Configurazione FPGA', chapter: 'logica-programmabile', type: 'truefalse',
        q: 'In molte FPGA la configurazione sta in celle di RAM statica: si perde allo spegnimento e va ricaricata a ogni accensione.',
        answer: true,
        why: 'Già la Xilinx XC2064 del 1985 teneva la configurazione in RAM statica: all\'accensione la FPGA la rilegge da una memoria non volatile esterna, oggi di solito una Flash. Esistono anche FPGA con la configurazione in Flash interna.',
      },

      // ------------------------------------------------------------ Verso i 16 e 32 bit
      {
        id: 'cp-36', level: 3, topic: 'Motorola 68000', chapter: 'sedici-bit', type: 'choice',
        q: 'Il Motorola 68000 in figura ha registri a 32 bit, un bus dati a 16 bit e un bus indirizzi a 24 bit. Quanta memoria può indirizzare?',
        figure: { kind: 'chip', pins: 64, label: 'Motorola 68000', note: '1979' },
        options: ['16 MB', '4 GB', '1 MB', '64 KB'],
        answer: 0,
        why: 'Contano i bit dell\'indirizzo, non quelli dei registri: 2²⁴ = 16 777 216 byte, cioè 16 MB. Con indirizzi a 32 bit sarebbero stati 4 GB. Il 68000 fu il cuore di Macintosh, Amiga e Atari ST.',
      },
      {
        id: 'cp-37', level: 1, topic: 'RISC e CISC', chapter: 'sedici-bit', type: 'choice',
        q: 'L\'ARM1 della Acorn (1985), progettato da Sophie Wilson e Steve Furber, è un processore RISC. Che cosa significa?',
        options: ['Poche istruzioni semplici, eseguite in fretta', 'Molte istruzioni complesse, anche sulla memoria', 'Istruzioni lunghe che fanno più cose insieme', 'Istruzioni di pochi bit, per occupare meno memoria'],
        answer: 0,
        why: 'RISC sta per Reduced Instruction Set Computer: è ridotto l\'insieme delle istruzioni, non la loro lunghezza (nell\'ARM1 sono tutte da 32 bit). Sono poche e semplici, quasi tutte eseguite in un ciclo di clock; i CISC come 8086 e 68000 ne hanno molte, anche complesse.',
      },
      {
        id: 'cp-38', level: 2, topic: 'Linea del tempo', chapter: 'sedici-bit', type: 'order',
        q: 'Metti in ordine cronologico queste tappe verso i 16 e i 32 bit.',
        items: ['Intel presenta l\'8086', 'Motorola presenta il 68000', 'IBM lancia il PC con l\'8088', 'Acorn prova il primo chip ARM'],
        ends: ['Prima', 'Dopo'],
        why: 'Intel 8086 (1978), Motorola 68000 (1979), IBM PC (1981), ARM1 (1985): in sette anni si passa dall\'8086, capostipite dei processori x86 dei PC, all\'architettura ARM, oggi presente in quasi tutti gli smartphone.',
      },
      {
        id: 'cp-39', level: 1, topic: 'Processori e computer', chapter: 'sedici-bit', type: 'match',
        q: 'Abbina ogni processore a un famoso computer che lo usava.',
        pairs: [['6502', 'Apple II'], ['Z80', 'Sinclair ZX Spectrum'], ['8088', 'IBM PC'], ['68000', 'Apple Macintosh']],
        why: 'Apple II (1977): 6502. ZX Spectrum (1982): Z80. IBM PC (1981): 8088, una versione dell\'8086 con bus dati esterno a 8 bit, più economica. Macintosh (1984): 68000.',
      },
      {
        id: 'cp-40', level: 2, topic: 'Registri dell\'8086', chapter: 'sedici-bit', type: 'bits',
        q: 'L\'8086 divide il registro AX da 16 bit in due metà: AH (byte alto) e AL (byte basso). Se AX vale 1234h (esadecimale), quanto vale AL? Accendi i bit per scriverlo.',
        width: 8, value: 52,
        why: 'Ogni cifra esadecimale corrisponde a 4 bit: 1234h si divide in AH = 12h e AL = 34h. AL = 0011 0100, cioè 52. Così l\'8086 poteva lavorare anche con dati a 8 bit, come i suoi predecessori.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
