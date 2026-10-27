/*
 * Banca domande del quiz: sezione 6, Architettura e storia dei PC.
 * Dai giganti a valvole all'IBM PC e ai SoC di oggi, con la storia italiana
 * (Olivetti Programma 101 e M24). Gli id dei capitoli sono le ancore delle
 * pagine della sezione.
 */
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'storia-pc',
    number: 6,
    title: 'Architettura e storia dei PC',
    subtitle: 'Dai giganti a valvole ai portatili di oggi',
    chapters: [
      { id: 'giganti', title: 'I giganti' },
      { id: 'von-neumann', title: 'Von Neumann' },
      { id: 'primi-pc', title: 'I primi personal computer' },
      { id: 'ibm-pc', title: 'L\'IBM PC e i cloni' },
      { id: 'scheda-madre', title: 'La scheda madre' },
      { id: 'memoria', title: 'La memoria' },
      { id: 'avvio', title: 'L\'avvio' },
      { id: 'grafica', title: 'Grafica e suono' },
      { id: 'prestazioni', title: 'Prestazioni' },
      { id: 'oggi', title: 'Oggi' },
      { id: 'linea-del-tempo', title: 'Linea del tempo' },
    ],
    questions: [
      // ------------------------------------------------------------ I giganti
      {
        id: 'pc-01', level: 1, topic: 'ENIAC', chapter: 'giganti', type: 'choice',
        q: 'Su quali componenti si basava l\'ENIAC, il gigante elettronico costruito per l\'esercito degli Stati Uniti?',
        options: ['Circa 17 500 valvole termoioniche', 'Circa 17 500 transistor', 'Circa 17 500 relè elettromeccanici', 'Circa 17 500 circuiti integrati'],
        answer: 0,
        why: 'L\'ENIAC, completato alla fine del 1945 e presentato al pubblico nel febbraio 1946, aveva 17 468 valvole e pesava circa 27 tonnellate. Il transistor fu inventato solo nel 1947 e il circuito integrato alla fine degli anni \'50.',
      },
      {
        id: 'pc-02', level: 1, topic: 'Cronologia dei giganti', chapter: 'giganti', type: 'order',
        q: 'Metti in ordine di nascita questi giganti del calcolo.',
        items: ['Atanasoff-Berry Computer (ABC)', 'ENIAC', 'UNIVAC I', 'IBM System/360'],
        ends: ['Più antico', 'Più recente'],
        why: 'Atanasoff-Berry Computer (1939-1942, elettronico ma non programmabile), ENIAC (1945-46, a valvole), UNIVAC I (1951, il primo computer commerciale americano) e IBM System/360 (1964).',
      },
      {
        id: 'pc-03', level: 3, topic: 'Colossus', chapter: 'giganti', type: 'truefalse',
        q: 'Colossus, il calcolatore elettronico usato a Bletchley Park durante la seconda guerra mondiale, serviva a decifrare i messaggi della macchina Enigma.',
        answer: false,
        why: 'Falso: Colossus (1944) attaccava il cifrario Lorenz, usato dall\'alto comando tedesco per le telescriventi. Contro Enigma lavoravano le Bombe elettromeccaniche ideate da Alan Turing e Gordon Welchman.',
      },
      {
        id: 'pc-04', level: 2, topic: 'IBM System/360', chapter: 'giganti', type: 'choice',
        q: 'Perché l\'IBM System/360, annunciato nel 1964, è una pietra miliare nella storia dei computer?',
        options: ['Fu la prima gamma completa di modelli compatibili', 'Fu il primo computer costruito con i transistor', 'Fu il primo computer con mouse e finestre', 'Fu il primo computer venduto a un\'azienda'],
        answer: 0,
        why: 'Dal modello più piccolo al più grande eseguivano tutti gli stessi programmi: un\'azienda poteva crescere senza riscrivere il software. Il System/360 rese standard anche il byte da 8 bit.',
      },

      // ------------------------------------------------------------ Von Neumann
      {
        id: 'pc-05', level: 1, topic: 'Architettura di von Neumann', chapter: 'von-neumann', type: 'choice',
        q: 'Nell\'architettura descritta da von Neumann nel 1945, dove si trovano le istruzioni del programma mentre il computer lavora?',
        options: ['Nella stessa memoria che contiene i dati', 'Dentro l\'unità di controllo della CPU', 'Nei cavi collegati a mano su un pannello', 'Su un nastro perforato letto passo passo'],
        answer: 0,
        why: 'È l\'idea del programma memorizzato, descritta nel First Draft of a Report on the EDVAC (1945): istruzioni e dati sono numeri nella stessa memoria. Per cambiare programma basta caricarne un altro, senza ricollegare cavi come sull\'ENIAC.',
      },
      {
        id: 'pc-06', level: 1, topic: 'Blocchi della CPU', chapter: 'von-neumann', type: 'choice',
        q: 'Nello schema della CPU in figura, quale blocco preleva le istruzioni, le decodifica e comanda gli altri blocchi?',
        figure: { kind: 'block', name: 'cpu', caption: 'PC = contatore di programma · IR = registro delle istruzioni' },
        options: ['L\'unità di controllo', 'L\'unità aritmetico-logica (ALU)', 'Il contatore di programma', 'I registri'],
        answer: 0,
        why: 'L\'unità di controllo ripete il ciclo prendi-decodifica-esegui (fetch-decode-execute): preleva l\'istruzione all\'indirizzo indicato dal contatore di programma, la decodifica e fa eseguire i calcoli all\'ALU.',
      },
      {
        id: 'pc-07', level: 2, topic: 'Limiti di von Neumann', chapter: 'von-neumann', type: 'choice',
        q: 'Nello schema in figura, istruzioni e dati passano tutti dallo stesso collegamento tra CPU e memoria. Quale limite ne deriva?',
        figure: { kind: 'block', name: 'von-neumann' },
        options: ['La CPU resta spesso ferma ad aspettare la memoria', 'La memoria può contenere un solo programma alla volta', 'Il programma non si può più cambiare dopo il caricamento', 'Le periferiche non possono scambiare dati con la CPU'],
        answer: 0,
        why: 'È il collo di bottiglia di von Neumann: la CPU è molto più veloce della memoria e il canale è uno solo, quindi spesso aspetta. Le memorie cache servono proprio a ridurre questa attesa.',
      },
      {
        id: 'pc-08', level: 3, topic: 'Primi programmi memorizzati', chapter: 'von-neumann', type: 'order',
        q: 'Ordina queste tappe del computer a programma memorizzato, dalla più antica.',
        items: ['First Draft of a Report on the EDVAC', 'Manchester Baby', 'EDSAC', 'IBM 701'],
        ends: ['Più antica', 'Più recente'],
        why: 'Von Neumann descrisse l\'idea nel First Draft of a Report on the EDVAC (1945); il Manchester Baby la realizzò per primo (1948), EDSAC offrì un servizio di calcolo regolare (1949) e l\'IBM 701 (1952) fu il primo computer scientifico commerciale di IBM.',
      },

      // ------------------------------------------------------------ I primi personal computer
      {
        id: 'pc-09', level: 1, topic: 'Programma 101', chapter: 'primi-pc', type: 'choice',
        q: 'Chi guidò il gruppo di ingegneri Olivetti che progettò la Programma 101, uno dei primi computer da scrivania?',
        options: ['Pier Giorgio Perotto', 'Federico Faggin', 'Adriano Olivetti', 'Mario Tchou'],
        answer: 0,
        why: 'La Programma 101 fu progettata dal gruppo di Pier Giorgio Perotto e presentata a New York nel 1965. Stava su una scrivania e si programmava: per molti è il primo personal computer.',
      },
      {
        id: 'pc-10', level: 2, topic: 'Programma 101', chapter: 'primi-pc', type: 'truefalse',
        q: 'La Programma 101 di Olivetti poteva registrare un programma su una cartolina magnetica e ricaricarlo in un secondo momento.',
        answer: true,
        why: 'Vero: i programmi si registravano su cartoline magnetiche da inserire nella macchina, e i risultati uscivano stampati su un rotolo di carta. Non c\'era uno schermo.',
      },
      {
        id: 'pc-11', level: 2, topic: 'Linguaggi dei primi PC', chapter: 'primi-pc', type: 'choice',
        q: 'L\'Apple II, il Commodore PET e il TRS-80 avevano già in ROM il linguaggio con cui è scritto il programma in figura. Quale?',
        figure: { kind: 'code', lang: 'programma', text: '10 FOR I = 1 TO 10\n20 PRINT I, I * I\n30 NEXT I\n40 END' },
        options: ['BASIC', 'Fortran', 'COBOL', 'Pascal'],
        answer: 0,
        why: 'La "trinità" del 1977 aveva il BASIC in memoria ROM: per programmare non serviva caricare nulla da nastro o da disco. Il linguaggio era nato nel 1964 a Dartmouth; un interprete BASIC per l\'Altair 8800 (1975) fu il primo prodotto di Microsoft.',
      },
      {
        id: 'pc-12', level: 2, topic: 'Primi personal computer', chapter: 'primi-pc', type: 'match',
        q: 'Abbina ogni personal computer degli anni \'70 alla sua caratteristica.',
        pairs: [['Altair 8800', 'Kit da montare, con levette e LED'], ['Apple II', 'Grafica a colori fin dal primo modello'], ['Commodore PET', 'Monitor, tastiera e registratore in un corpo solo'], ['TRS-80', 'Venduto nei negozi RadioShack']],
        why: 'L\'Altair 8800 (1975) era un kit senza tastiera né schermo, comandato da levette. Nel 1977 arrivarono tre computer già pronti: l\'Apple II con la grafica a colori, il Commodore PET tutto in un corpo e il TRS-80 dei negozi RadioShack.',
      },

      // ------------------------------------------------------------ L'IBM PC e i cloni
      {
        id: 'pc-13', level: 1, topic: 'Intel 8088', chapter: 'ibm-pc', type: 'choice',
        q: 'Il processore in figura era il cuore del primo IBM PC, il modello 5150. A quale frequenza di clock lavorava?',
        figure: { kind: 'chip', pins: 40, label: 'Intel 8088', note: 'DIP-40' },
        options: ['4,77 MHz', '1,02 MHz', '3,58 MHz', '7,16 MHz'],
        answer: 0,
        why: 'L\'8088 dell\'IBM PC lavorava a 4,77 MHz, cioè 4,77 milioni di cicli al secondo: un terzo dei 14,318 MHz del quarzo della scheda madre.',
      },
      {
        id: 'pc-41', level: 1, topic: 'Il sistema operativo', chapter: 'ibm-pc', type: 'choice',
        q: 'Quale azienda fornì a IBM il sistema operativo del suo PC del 1981, venduto da IBM con il nome PC DOS?',
        options: ['Microsoft', 'Digital Research', 'Intel', 'Apple'],
        answer: 0,
        why: 'Microsoft comprò 86-DOS dalla Seattle Computer Products, lo adattò per IBM e si tenne il diritto di venderlo ad altri come MS-DOS: così ogni clone poteva avere lo stesso sistema operativo.',
      },
      {
        id: 'pc-14', level: 2, topic: 'I cloni dell\'IBM PC', chapter: 'ibm-pc', type: 'choice',
        q: 'Per costruire un computer compatibile con l\'IBM PC, quale parte dovette rifare da zero un produttore come Compaq?',
        options: ['Il BIOS, perché il suo codice era di IBM', 'Il processore, perché lo aveva progettato IBM', 'Il sistema operativo, perché lo aveva scritto IBM', 'La scheda video, perché l\'aveva brevettata IBM'],
        answer: 0,
        why: 'Processore e chip si compravano sul mercato e Microsoft vendeva MS-DOS a tutti, ma il BIOS era codice protetto di IBM. Compaq lo riscrisse «in camera bianca», senza copiarlo: il suo Portable (1983) fu uno dei primi compatibili e fece scuola.',
      },
      {
        id: 'pc-15', level: 2, topic: 'Mappa della memoria', chapter: 'ibm-pc', type: 'number',
        q: 'La mappa in figura mostra il megabyte che l\'8088 dell\'IBM PC poteva indirizzare. Quanti KB sono riservati sopra la RAM dei programmi, da A0000 a FFFFF?',
        figure: { kind: 'code', lang: 'mappa', text: 'Indirizzi      Contenuto\n00000-9FFFF    RAM dei programmi (640 KB)\nA0000-BFFFF    memoria video\nC0000-EFFFF    ROM delle schede di espansione\nF0000-FFFFF    ROM del BIOS' },
        value: 384, unit: 'KB', tolerance: 0.5,
        why: 'Con 20 bit di indirizzo si arriva a 2²⁰ = 1 048 576 byte = 1024 KB. Tolti i 640 KB della RAM restano 1024 − 640 = 384 KB per memoria video e ROM: da qui il famoso limite dei 640 KB.',
      },
      {
        id: 'pc-16', level: 3, topic: 'Olivetti M24', chapter: 'ibm-pc', type: 'truefalse',
        q: 'L\'Olivetti M24, costruito attorno al processore in figura, era compatibile con l\'IBM PC ma più veloce.',
        figure: { kind: 'chip', pins: 40, label: 'Intel 8086', note: 'DIP-40' },
        answer: true,
        why: 'Vero: l\'8086 a 8 MHz dell\'M24 scambiava 16 bit alla volta con la memoria, mentre l\'8088 dell\'IBM PC andava a 4,77 MHz con un bus dati esterno di 8 bit. Negli Stati Uniti l\'M24 fu venduto anche come AT&T 6300.',
      },

      // ------------------------------------------------------------ La scheda madre
      {
        id: 'pc-17', level: 1, topic: 'Il chipset', chapter: 'scheda-madre', type: 'choice',
        q: 'Nelle schede madri dei PC con Pentium 4, quale chip collegava la CPU alla RAM e alla scheda video?',
        options: ['Il northbridge', 'Il southbridge', 'Il chip del BIOS', 'Il controller USB'],
        answer: 0,
        why: 'Il northbridge gestiva i collegamenti veloci (CPU, RAM e grafica), il southbridge quelli più lenti come USB, dischi e audio. Insieme formavano il chipset della scheda madre.',
      },
      {
        id: 'pc-18', level: 2, topic: 'Parti della scheda madre', chapter: 'scheda-madre', type: 'match',
        q: 'Abbina ogni termine della scheda madre alla sua descrizione.',
        pairs: [['Zoccolo (socket)', 'Ospita la CPU'], ['Chip del firmware', 'Conserva il programma di avvio (BIOS o UEFI)'], ['Slot di espansione', 'Accoglie schede aggiuntive'], ['SoC', 'CPU, grafica e controller in un solo chip']],
        why: 'La CPU si inserisce nello zoccolo e le schede aggiuntive negli slot, oggi PCI Express; il firmware di avvio sta in una memoria flash sulla scheda. In un SoC, come quello di uno smartphone, quasi tutto sta in un unico chip.',
      },
      {
        id: 'pc-19', level: 3, topic: 'Controller della memoria', chapter: 'scheda-madre', type: 'choice',
        q: 'Nei PC di oggi non c\'è più un northbridge separato. Dov\'è finito il controller della RAM che si trovava al suo interno?',
        options: ['Dentro la CPU stessa', 'Dentro il southbridge', 'Dentro i moduli di RAM', 'Dentro la scheda video'],
        answer: 0,
        why: 'AMD lo portò nella CPU nel 2003 e Intel nel 2008: così la RAM risponde prima. Le altre funzioni del chipset stanno in un solo chip, che Intel chiama PCH (Platform Controller Hub).',
      },

      // ------------------------------------------------------------ La memoria
      {
        id: 'pc-20', level: 1, topic: 'Gerarchia di memoria', chapter: 'memoria', type: 'choice',
        q: 'Nella gerarchia della memoria di un PC (registri, cache, RAM, SSD e dischi), come cambia la memoria man mano che ci si avvicina alla CPU?',
        options: ['Più veloce, più piccola e più cara per byte', 'Più lenta, più grande e più economica per byte', 'Più veloce, più grande e più economica per byte', 'Più lenta, più piccola e più cara per byte'],
        answer: 0,
        why: 'Vicino alla CPU ci sono i registri, poi le cache L1, L2 e L3, la RAM e infine SSD e dischi: più un livello è vicino alla CPU, più è veloce, piccolo e costoso per byte.',
      },
      {
        id: 'pc-21', level: 1, topic: 'SSD e disco rigido', chapter: 'memoria', type: 'truefalse',
        q: 'Un SSD trova i dati più in fretta di un disco rigido perché non deve aspettare che un piatto giri sotto una testina.',
        answer: true,
        why: 'Vero: il disco rigido deve spostare la testina e aspettare che il piatto, che fa migliaia di giri al minuto, porti il dato sotto di essa. L\'SSD legge chip di memoria flash e non ha parti in movimento.',
      },
      {
        id: 'pc-22', level: 3, topic: 'Cache e RAM', chapter: 'memoria', type: 'number',
        q: 'Un dato trovato nella cache arriva in 1 ns; se manca, servono 100 ns in più per prenderlo dalla RAM. Se il 90% degli accessi trova il dato nella cache, quanto dura in media un accesso, in ns?',
        value: 11, unit: 'ns', tolerance: 0.5,
        why: 'Ogni accesso costa almeno 1 ns, e un accesso su dieci aggiunge 100 ns: 1 + 0,1 × 100 = 11 ns. Senza cache ogni accesso costerebbe circa 100 ns, nove volte tanto; se i dati trovati scendessero all\'80%, la media salirebbe a 21 ns.',
      },

      // ------------------------------------------------------------ L'avvio
      {
        id: 'pc-23', level: 1, topic: 'Sequenza di avvio', chapter: 'avvio', type: 'order',
        q: 'Metti in ordine quello che succede quando si accende un PC con il BIOS.',
        items: ['La CPU comincia a eseguire il BIOS dalla ROM', 'Il POST controlla memoria, tastiera e scheda video', 'Il BIOS carica in memoria il settore MBR del disco', 'Il codice dell\'MBR avvia il bootloader', 'Il bootloader carica il sistema operativo'],
        ends: ['Primo passo', 'Ultimo passo'],
        why: 'All\'accensione la CPU esegue il BIOS, che fa il POST (Power-On Self-Test), legge i 512 byte dell\'MBR e gli passa il controllo; poi il bootloader carica il sistema operativo.',
      },
      {
        id: 'pc-24', level: 2, topic: 'Firma di avvio', chapter: 'avvio', type: 'bits',
        q: 'La figura mostra, in esadecimale, gli ultimi 16 byte del primo settore di un disco avviabile. Accendi i bit del penultimo byte.',
        figure: { kind: 'code', lang: 'hex', text: 'posizione  byte in esadecimale\n01F0       00 00 00 00 00 00 00 00\n01F8       00 00 00 00 00 00 55 AA' },
        width: 8, value: 85,
        why: 'Il penultimo byte è 55: ogni cifra esadecimale vale 4 bit e 5 = 0101, quindi 0x55 = 0101 0101 = 85. Con l\'ultimo, AA, forma la firma che il BIOS controlla prima di avviare il settore.',
      },
      {
        id: 'pc-25', level: 3, topic: 'Firmware UEFI', chapter: 'avvio', type: 'choice',
        q: 'Un PC che si avvia in modalità UEFI non esegue il codice del settore MBR. Dove trova sul disco il programma da avviare?',
        options: ['In un file di una partizione dedicata all\'avvio', 'Nel primo settore di ogni partizione', 'Nella tabella delle partizioni GPT', 'In un\'area nascosta prima della prima partizione'],
        answer: 0,
        why: 'In modalità UEFI il firmware legge la partizione di sistema EFI (ESP), formattata FAT, e lancia un programma .efi, per esempio BOOTX64.EFI. Il BIOS invece eseguiva i 446 byte di codice all\'inizio del settore MBR.',
      },
      {
        id: 'pc-26', level: 2, topic: 'UEFI e GPT', chapter: 'avvio', type: 'choice',
        q: 'Che cosa permette lo schema di partizioni GPT, usato dal firmware UEFI, rispetto al vecchio MBR?',
        options: ['Usare dischi oltre i 2 TB e più di 4 partizioni principali', 'Rendere il disco più veloce con una cache integrata', 'Cifrare automaticamente i dati del disco', 'Installare due sistemi operativi sullo stesso disco'],
        answer: 0,
        why: 'L\'MBR numera i settori con 32 bit: 2³² settori × 512 byte ≈ 2,2 TB al massimo, e ha posto per 4 partizioni principali (le altre solo come logiche dentro una estesa). GPT usa numeri a 64 bit e di solito 128 partizioni.',
      },

      // ------------------------------------------------------------ Grafica e suono
      {
        id: 'pc-27', level: 1, topic: 'Interfaccia grafica', chapter: 'grafica', type: 'truefalse',
        q: 'Il Macintosh di Apple, nel 1984, fu il primo computer in vendita con mouse, finestre e icone.',
        answer: false,
        why: 'Falso: lo Xerox Star (1981) e l\'Apple Lisa (1983) erano già in vendita, ma costavano carissimi e vendettero poco; le loro idee venivano dallo Xerox Alto (1973), mai venduto. Il Macintosh, a 2495 dollari, portò mouse e finestre al grande pubblico.',
      },
      {
        id: 'pc-43', level: 1, topic: 'Il primo mouse', chapter: 'grafica', type: 'choice',
        q: 'Chi mostrò in pubblico il mouse per la prima volta, nella dimostrazione del 9 dicembre 1968 poi chiamata «la madre di tutte le demo»?',
        options: ['Douglas Engelbart', 'Alan Kay', 'Steve Jobs', 'Bill Atkinson'],
        answer: 0,
        why: 'A San Francisco Douglas Engelbart, dello Stanford Research Institute, mostrò in 90 minuti mouse, ipertesto, finestre e videochiamata. Il mouse, una scatoletta di legno con due rotelle, era stato costruito nel 1964 da Bill English.',
      },
      {
        id: 'pc-28', level: 2, topic: 'Sound Blaster', chapter: 'grafica', type: 'choice',
        q: 'Che cosa aggiungeva la Sound Blaster (1989) rispetto alla scheda AdLib (1987), che già suonava musica a sintesi FM?',
        options: ['Registrare e riprodurre suoni digitali', 'Il suono stereo su due canali', 'Il riconoscimento dei comandi dati a voce', 'L\'audio a 16 bit con qualità da CD'],
        answer: 0,
        why: 'La Sound Blaster usava lo stesso chip FM della AdLib, quindi suonava la musica dei suoi giochi, e aggiungeva un convertitore per i suoni digitali a 8 bit e la porta del joystick. Lo stereo arrivò nel 1991 con la Sound Blaster Pro, i 16 bit nel 1992 con la Sound Blaster 16.',
      },
      {
        id: 'pc-29', level: 2, topic: 'Standard video', chapter: 'grafica', type: 'match',
        q: 'Abbina ogni standard video dei PC IBM e compatibili alla sua massima risoluzione grafica.',
        pairs: [['MDA', 'Nessuna: solo testo'], ['CGA', '640×200'], ['EGA', '640×350'], ['VGA', '640×480']],
        why: 'MDA (1981) mostrava solo testo; CGA (1981) arrivava a 640×200 con 2 colori (o 320×200 con 4); EGA (1984) a 640×350 con 16 colori; VGA (1987) a 640×480 con 16 colori.',
      },
      {
        id: 'pc-42', level: 2, topic: 'Memoria video', chapter: 'grafica', type: 'choice',
        q: 'La CGA disegnava 320×200 pixel con 4 colori, cioè 2 bit per pixel. Quanta memoria video occupava una schermata?',
        options: ['16 000 byte', '64 000 byte', '128 000 byte', '8000 byte'],
        answer: 0,
        why: '320 × 200 = 64 000 pixel; × 2 bit = 128 000 bit; ÷ 8 = 16 000 byte, quasi tutti i 16 KB della scheda. In generale una schermata occupa larghezza × altezza × bit per pixel ÷ 8 byte.',
      },
      {
        id: 'pc-30', level: 2, topic: 'GPU', chapter: 'grafica', type: 'choice',
        q: 'Perché una GPU disegna la grafica 3D molto più in fretta di una CPU?',
        options: ['Ha migliaia di core che calcolano in parallelo', 'Ha un clock molto più alto di quello della CPU', 'Ha una cache molto più grande di quella della CPU', 'Calcola un pixel alla volta, ma a velocità altissima'],
        answer: 0,
        why: 'Un\'immagine richiede gli stessi calcoli su milioni di pixel: la GPU li divide tra migliaia di piccoli core, mentre la CPU ne ha pochi ma potenti. Per lo stesso motivo oggi le GPU servono anche all\'intelligenza artificiale.',
      },

      // ------------------------------------------------------------ Prestazioni
      {
        id: 'pc-31', level: 1, topic: 'MHz e GHz', chapter: 'prestazioni', type: 'choice',
        q: 'Un processore degli anni \'80 lavorava a 8 MHz, uno di oggi lavora a 4 GHz. Quante volte più alta è la frequenza di oggi?',
        options: ['500 volte', '2 volte', '50 volte', '500 000 volte'],
        answer: 0,
        why: '1 GHz = 1000 MHz, quindi 4 GHz = 4000 MHz e 4000 / 8 = 500. La velocità vera è cresciuta ancora di più, perché oggi ogni core esegue più istruzioni per ciclo e i core sono molti.',
      },
      {
        id: 'pc-32', level: 2, topic: 'Intel 80386', chapter: 'prestazioni', type: 'choice',
        q: 'Che cosa portò di nuovo l\'Intel 80386 del 1985 rispetto al 286?',
        options: ['Registri e indirizzi a 32 bit', 'Due core nello stesso chip', 'La cache integrata nel chip', 'Il coprocessore matematico integrato'],
        answer: 0,
        why: 'Il 386 portò l\'architettura x86 a 32 bit: registri da 32 bit e indirizzi da 32 bit, cioè fino a 2³² byte = 4 GB di memoria. Cache e coprocessore matematico entrarono nel chip con il 486 (1989), i due core nel 2005.',
      },
      {
        id: 'pc-33', level: 2, topic: 'Il muro della potenza', chapter: 'prestazioni', type: 'number',
        q: 'La potenza che un processore trasforma in calore vale circa P = C · V² · f, con C costante. Se per raddoppiare la frequenza f bisogna alzare la tensione V da 1 V a 1,2 V, quante volte cresce la potenza?',
        value: 2.88, unit: 'volte', tolerance: 0.05,
        why: 'La frequenza doppia dà ×2 e la tensione dà ×1,2² = ×1,44: in tutto 2 × 1,44 = 2,88 volte. Quasi il triplo del calore per il doppio dei cicli: è il «muro della potenza», che verso il 2005 fermò la corsa ai GHz e aprì quella ai core.',
      },
      {
        id: 'pc-34', level: 3, topic: 'Multicore', chapter: 'prestazioni', type: 'number',
        q: 'In un programma metà del lavoro non si può dividere tra i core, mentre l\'altra metà si divide alla perfezione. Passando da 1 a 8 core, quante volte diventa più veloce il programma?',
        value: 1.78, unit: 'volte', tolerance: 0.05,
        why: 'La metà sequenziale non accelera: il tempo scende da 1 a 0,5 + 0,5 / 8 = 0,5625, e 1 / 0,5625 ≈ 1,78 (legge di Amdahl). Anche con infiniti core non si arriverebbe a 2.',
      },

      // ------------------------------------------------------------ Oggi
      {
        id: 'pc-35', level: 1, topic: 'Arduino', chapter: 'oggi', type: 'truefalse',
        q: 'Il chip in figura è il microcontrollore della classica scheda Arduino Uno. Come il Raspberry Pi, fa girare un sistema operativo come Linux.',
        figure: { kind: 'chip', pins: 28, label: 'ATmega328P', note: 'Arduino Uno' },
        answer: false,
        why: 'Falso: l\'ATmega328P ha 32 KB di memoria flash e 2 KB di RAM ed esegue un solo programma, senza sistema operativo. Il Raspberry Pi è invece un computer completo con un SoC ARM e fa girare Linux.',
      },
      {
        id: 'pc-36', level: 1, topic: 'Informatica di oggi', chapter: 'oggi', type: 'match',
        q: 'Abbina ogni nome dell\'informatica di oggi alla sua descrizione.',
        pairs: [['ARM', 'Architettura di processori a basso consumo'], ['x86', 'Architettura dei processori Intel e AMD'], ['Apple M1', 'SoC presentato nel 2020'], ['Arduino', 'Scheda con microcontrollore, nata a Ivrea']],
        why: 'I processori ARM consumano poco e sono in quasi tutti gli smartphone; x86 è l\'architettura di Intel e AMD, nata con l\'8086. L\'Apple M1 (2020) ha portato un SoC ARM nei Mac; Arduino (Ivrea, 2005) comanda sensori e motori.',
      },
      {
        id: 'pc-37', level: 2, topic: 'Apple M1', chapter: 'oggi', type: 'choice',
        q: 'La CPU dell\'Apple M1 ha 4 core grandi e veloci e 4 core più piccoli e lenti. A che cosa servono quelli piccoli?',
        options: ['A fare i lavori leggeri consumando poca energia', 'A eseguire i programmi scritti per i processori Intel', 'A controllare la temperatura dei core veloci', 'A gestire da soli la grafica dei videogiochi'],
        answer: 0,
        why: 'Posta, musica e attività in sottofondo girano sui core piccoli ed efficienti, e quelli veloci si attivano solo quando serve. Così il MacBook Air con M1 (2020) dura a lungo a batteria e non ha nemmeno la ventola.',
      },

      // ------------------------------------------------------------ Linea del tempo
      {
        id: 'pc-38', level: 1, topic: 'Linea del tempo', chapter: 'linea-del-tempo', type: 'order',
        q: 'Metti in ordine queste tappe della storia dei computer, dalla più antica.',
        items: ['ENIAC', 'Olivetti Programma 101', 'Altair 8800', 'IBM PC 5150', 'Apple M1'],
        ends: ['Più antica', 'Più recente'],
        why: 'ENIAC (1945-46), Programma 101 (1965), Altair 8800 (1975), IBM PC 5150 (1981) e Apple M1 (2020): da una stanza piena di valvole a un chip dentro un portatile.',
      },
      {
        id: 'pc-39', level: 2, topic: 'Linea del tempo', chapter: 'linea-del-tempo', type: 'order',
        q: 'Ordina queste novità dalla più antica alla più recente.',
        items: ['Xerox Alto', 'Apple II', 'Olivetti M24', 'Primi processori dual core per PC', 'Raspberry Pi'],
        ends: ['Più antica', 'Più recente'],
        why: 'Xerox Alto (1973), Apple II (1977), Olivetti M24 (1983-84), primi dual core per PC (2005) e Raspberry Pi (2012): dalle finestre sovrapposte dei laboratori Xerox ai computer da poche decine di euro.',
      },
      {
        id: 'pc-40', level: 3, topic: 'Linea del tempo', chapter: 'linea-del-tempo', type: 'order',
        q: 'Anni \'80: metti in ordine queste novità, dalla più antica alla più recente.',
        items: ['IBM PC 5150', 'Apple Macintosh', 'Intel 80386', 'Standard VGA', 'Sound Blaster'],
        ends: ['Più antica', 'Più recente'],
        why: 'IBM PC (1981), Macintosh (1984), Intel 80386 (1985), VGA (1987) e Sound Blaster (1989): in un solo decennio arrivarono finestre e mouse, i 32 bit, la grafica VGA e il suono.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
