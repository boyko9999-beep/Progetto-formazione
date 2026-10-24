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
        options: ['Circa 18 000 valvole termoioniche', 'Circa 18 000 transistor', 'Circa 18 000 relè elettromeccanici', 'Circa 18 000 circuiti integrati'],
        answer: 0,
        why: 'L\'ENIAC, completato alla fine del 1945, aveva circa 18 000 valvole e pesava quasi 30 tonnellate. Il transistor fu inventato solo nel 1947 e il circuito integrato alla fine degli anni \'50.',
      },
      {
        id: 'pc-02', level: 1, topic: 'Cronologia dei giganti', chapter: 'giganti', type: 'order',
        q: 'Metti in ordine di nascita questi giganti del calcolo.',
        items: ['Z3 di Konrad Zuse', 'ENIAC', 'UNIVAC I', 'IBM System/360'],
        ends: ['Più antico', 'Più recente'],
        why: 'Z3 (1941, a relè), ENIAC (completato nel 1945, a valvole), UNIVAC I (1951, il primo computer commerciale americano) e IBM System/360 (1964, una famiglia di modelli compatibili).',
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
        options: ['Fu la prima famiglia di modelli compatibili', 'Fu il primo computer costruito con i transistor', 'Fu il primo computer con mouse e finestre', 'Fu il primo computer venduto a un\'azienda'],
        answer: 0,
        why: 'Dal modello più piccolo al più grande eseguivano tutti gli stessi programmi: un\'azienda poteva crescere senza riscrivere il software. Il System/360 rese standard anche il byte da 8 bit.',
      },

      // ------------------------------------------------------------ Von Neumann
      {
        id: 'pc-05', level: 1, topic: 'Programma memorizzato', chapter: 'von-neumann', type: 'choice',
        q: 'Nello schema di von Neumann in figura, dove si trovano le istruzioni del programma mentre il computer lavora?',
        figure: { kind: 'block', name: 'von-neumann' },
        options: ['Nella stessa memoria che contiene i dati', 'In una memoria separata, solo per le istruzioni', 'Nei cavi collegati a mano su un pannello', 'Dentro l\'unità aritmetico-logica'],
        answer: 0,
        why: 'È l\'idea del programma memorizzato, descritta nel First Draft of a Report on the EDVAC (1945): istruzioni e dati sono numeri nella stessa memoria. Per cambiare programma basta caricarne un altro, senza ricollegare cavi come sull\'ENIAC.',
      },
      {
        id: 'pc-06', level: 1, topic: 'Unità di controllo', chapter: 'von-neumann', type: 'choice',
        q: 'Nello schema della CPU in figura, quale blocco preleva le istruzioni, le decodifica e comanda gli altri blocchi?',
        figure: { kind: 'block', name: 'cpu' },
        options: ['L\'unità di controllo', 'L\'unità aritmetico-logica (ALU)', 'Il contatore di programma', 'I registri'],
        answer: 0,
        why: 'L\'unità di controllo ripete il ciclo fetch-decode-execute: preleva l\'istruzione all\'indirizzo indicato dal contatore di programma, la decodifica e fa eseguire i calcoli all\'ALU.',
      },
      {
        id: 'pc-07', level: 2, topic: 'Collo di bottiglia', chapter: 'von-neumann', type: 'choice',
        q: 'Nello schema in figura istruzioni e dati passano tutti dallo stesso collegamento tra CPU e memoria. Quale limite ne deriva?',
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
        id: 'pc-11', level: 2, topic: 'BASIC', chapter: 'primi-pc', type: 'choice',
        q: 'Appena acceso, un Apple II, un Commodore PET o un TRS-80 accettava subito programmi come quello in figura. In quale linguaggio sono scritti?',
        figure: { kind: 'code', lang: 'programma', text: '10 FOR I = 1 TO 10\n20 PRINT I, I * I\n30 NEXT I\n40 END' },
        options: ['BASIC', 'Fortran', 'COBOL', 'Pascal'],
        answer: 0,
        why: 'La "trinità" del 1977 aveva il BASIC in memoria ROM: si accendeva e si programmava subito. Il BASIC era stato anche il primo prodotto di Microsoft, scritto nel 1975 per l\'Altair 8800.',
      },
      {
        id: 'pc-12', level: 2, topic: 'Date dei primi PC', chapter: 'primi-pc', type: 'match',
        q: 'Abbina ogni computer all\'anno in cui fu presentato.',
        pairs: [['Olivetti Programma 101', '1965'], ['Altair 8800', '1975'], ['Apple II', '1977'], ['IBM PC 5150', '1981'], ['Olivetti M24', '1983']],
        why: 'Programma 101 (1965), Altair 8800 (1975), Apple II (1977), IBM PC 5150 (1981) e Olivetti M24 (1983): in meno di vent\'anni il computer arrivò sulle scrivanie di uffici e case.',
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
        id: 'pc-14', level: 2, topic: 'BIOS e cloni', chapter: 'ibm-pc', type: 'choice',
        q: 'Per costruire un computer compatibile con l\'IBM PC, quale parte dovette riscrivere da zero un produttore come Compaq?',
        options: ['Il BIOS, il cui codice apparteneva a IBM', 'Il processore, che costruiva solo IBM', 'Il sistema operativo, che vendeva solo IBM', 'La scheda video, che produceva solo IBM'],
        answer: 0,
        why: 'Processore e chip si compravano sul mercato e Microsoft vendeva MS-DOS a tutti, ma il BIOS era codice protetto di IBM. Compaq lo riscrisse senza copiarlo e aprì la strada ai cloni.',
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
        figure: { kind: 'chip', pins: 40, label: 'Intel 8086', note: '8 MHz' },
        answer: true,
        why: 'Vero: l\'8086 a 8 MHz dell\'M24 scambiava 16 bit alla volta con la memoria, mentre l\'8088 dell\'IBM PC andava a 4,77 MHz con un bus dati esterno di 8 bit. Negli Stati Uniti l\'M24 fu venduto anche come AT&T 6300.',
      },

      // ------------------------------------------------------------ La scheda madre
      {
        id: 'pc-17', level: 1, topic: 'Northbridge', chapter: 'scheda-madre', type: 'choice',
        q: 'Nelle schede madri dei PC degli anni 2000, quale chip collegava la CPU alla RAM e alla scheda video?',
        options: ['Il northbridge', 'Il southbridge', 'Il chip del BIOS', 'Il controller USB'],
        answer: 0,
        why: 'Il northbridge gestiva i collegamenti veloci (CPU, RAM e grafica), il southbridge quelli più lenti come USB, dischi e audio. Insieme formavano il chipset della scheda madre.',
      },
      {
        id: 'pc-18', level: 2, topic: 'Parti della scheda madre', chapter: 'scheda-madre', type: 'match',
        q: 'Abbina ogni termine della scheda madre alla sua descrizione.',
        pairs: [['Zoccolo (socket)', 'Ospita la CPU'], ['Southbridge', 'Gestisce USB, dischi e audio'], ['Slot di espansione', 'Accoglie schede aggiuntive'], ['SoC', 'CPU, grafica e controller in un solo chip']],
        why: 'La CPU si inserisce nello zoccolo e le schede aggiuntive negli slot, oggi PCI Express; il southbridge gestisce le periferiche lente. In un SoC, come quello di uno smartphone, quasi tutto sta in un unico chip.',
      },
      {
        id: 'pc-19', level: 3, topic: 'Controller della memoria', chapter: 'scheda-madre', type: 'choice',
        q: 'Nei PC di oggi non c\'è più un northbridge separato. Dov\'è finito il controller della RAM che conteneva?',
        options: ['Dentro la CPU stessa', 'Dentro il southbridge', 'Dentro i moduli di RAM', 'Dentro la scheda video'],
        answer: 0,
        why: 'AMD lo portò nella CPU nel 2003 e Intel nel 2008: così la RAM risponde prima. Le altre funzioni del chipset stanno in un solo chip, che Intel chiama PCH (Platform Controller Hub).',
      },

      // ------------------------------------------------------------ La memoria
      {
        id: 'pc-20', level: 1, topic: 'Gerarchia di memoria', chapter: 'memoria', type: 'choice',
        q: 'Nella piramide della memoria in figura, come cambia la memoria salendo verso la cima?',
        figure: { kind: 'block', name: 'memory-pyramid' },
        options: ['Più veloce, più piccola e più cara per byte', 'Più lenta, più grande e più economica per byte', 'Più veloce, più grande e più economica per byte', 'Più lenta, più piccola e più cara per byte'],
        answer: 0,
        why: 'In cima ci sono i registri, poi le cache L1, L2 e L3, la RAM e infine SSD e dischi: più un livello è vicino alla CPU, più è veloce, piccolo e costoso per byte.',
      },
      {
        id: 'pc-21', level: 1, topic: 'RAM volatile', chapter: 'memoria', type: 'truefalse',
        q: 'La RAM di un PC perde il suo contenuto quando il computer viene spento.',
        answer: true,
        why: 'Vero: la RAM (DRAM) è volatile, ogni bit è una minuscola carica elettrica che svanisce senza corrente. Per questo i file vanno salvati su SSD o disco rigido, che conservano i dati.',
      },
      {
        id: 'pc-22', level: 3, topic: 'Tecnologie di memoria', chapter: 'memoria', type: 'match',
        q: 'Abbina ogni livello della memoria alla tecnologia con cui è costruito.',
        pairs: [['Cache', 'SRAM: celle a transistor'], ['RAM principale', 'DRAM: condensatori da rinfrescare'], ['SSD', 'Memoria flash'], ['Disco rigido', 'Piatti magnetici rotanti']],
        why: 'La SRAM della cache usa circa 6 transistor per bit ed è velocissima; la DRAM usa 1 transistor e 1 condensatore, più densa ma da rinfrescare. Il primo disco rigido, a piatti magnetici, fu quello del RAMAC di IBM (1956).',
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
        id: 'pc-25', level: 3, topic: 'Firma di avvio', chapter: 'avvio', type: 'bits',
        q: 'In figura c\'è il penultimo byte di un settore di avvio MBR. L\'ultimo byte ha ogni bit invertito rispetto a questo: accendi i suoi bit.',
        figure: { kind: 'bits', value: 85, width: 8 },
        width: 8, value: 170,
        why: 'Invertendo 0101 0101 si ottiene 1010 1010 = 0xAA = 170. La firma completa, nei byte 510 e 511, è 55 AA: senza di essa il BIOS non avvia il settore.',
      },
      {
        id: 'pc-26', level: 2, topic: 'UEFI e GPT', chapter: 'avvio', type: 'choice',
        q: 'Che cosa permette lo schema di partizioni GPT, usato dal firmware UEFI, rispetto al vecchio MBR?',
        options: ['Usare dischi oltre i 2 TB e più di 4 partizioni', 'Rendere il disco più veloce con una cache integrata', 'Cifrare automaticamente i dati del disco', 'Installare due sistemi operativi sullo stesso disco'],
        answer: 0,
        why: 'L\'MBR numera i settori con 32 bit: 2³² settori × 512 byte ≈ 2,2 TB al massimo, con 4 partizioni principali. GPT usa numeri a 64 bit e di solito 128 partizioni.',
      },

      // ------------------------------------------------------------ Grafica e suono
      {
        id: 'pc-27', level: 1, topic: 'Interfaccia grafica', chapter: 'grafica', type: 'choice',
        q: 'Quale computer del 1973 mostrava già finestre e icone sullo schermo e si comandava con un mouse?',
        options: ['Lo Xerox Alto', 'L\'Apple Macintosh', 'L\'IBM PC 5150', 'L\'Altair 8800'],
        answer: 0,
        why: 'Lo Xerox Alto nacque nel centro di ricerca Xerox PARC e non fu mai venduto al pubblico, ma ispirò Apple: il Macintosh del 1984 portò finestre e mouse nei negozi, seguito da Windows.',
      },
      {
        id: 'pc-28', level: 1, topic: 'Sound Blaster', chapter: 'grafica', type: 'choice',
        q: 'Che cosa cambiò nei PC con l\'arrivo di schede audio come la Sound Blaster, nel 1989?',
        options: ['Musica e suoni digitali al posto dei bip', 'Le prime immagini a colori sullo schermo', 'Il collegamento a Internet tramite modem', 'La possibilità di stampare foto a colori'],
        answer: 0,
        why: 'Prima il PC aveva solo un piccolo altoparlante capace di bip. La Sound Blaster di Creative aggiunse musica sintetizzata e suoni registrati e diventò lo standard dei videogiochi.',
      },
      {
        id: 'pc-29', level: 2, topic: 'Standard video', chapter: 'grafica', type: 'match',
        q: 'Abbina ogni standard video dei PC IBM e compatibili alla sua massima risoluzione grafica.',
        pairs: [['MDA', 'Nessuna: solo testo'], ['CGA', '640×200'], ['EGA', '640×350'], ['VGA', '640×480']],
        why: 'MDA (1981) mostrava solo testo; CGA (1981) arrivava a 640×200 con 2 colori (o 320×200 con 4); EGA (1984) a 640×350 con 16 colori; VGA (1987) a 640×480 con 16 colori.',
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
        id: 'pc-31', level: 1, topic: 'Legge di Moore', chapter: 'prestazioni', type: 'choice',
        q: 'Che cosa afferma la legge di Moore, formulata da Gordon Moore, cofondatore di Intel?',
        options: ['I transistor di un chip raddoppiano circa ogni due anni', 'La frequenza delle CPU raddoppia circa ogni diciotto mesi', 'Il prezzo dei computer si dimezza circa ogni due anni', 'La memoria dei computer raddoppia circa ogni sei mesi'],
        answer: 0,
        why: 'Moore la formulò nel 1965 e nel 1975 la fissò a un raddoppio circa ogni due anni. Dai 2300 transistor dell\'Intel 4004 (1971) si è arrivati a decine di miliardi per chip.',
      },
      {
        id: 'pc-32', level: 2, topic: 'Spazio di indirizzi', chapter: 'prestazioni', type: 'number',
        q: 'L\'Intel 80386 del 1985 fu il primo x86 a 32 bit e usava indirizzi di 32 bit. Quanta memoria poteva indirizzare, in GB?',
        value: 4, unit: 'GB', tolerance: 0.3,
        why: '2³² = 4 294 967 296 byte = 4 × 1024 × 1024 × 1024 byte, cioè 4 GB. Con 20 bit l\'8088 arrivava a 1 MB, con 24 bit il 286 a 16 MB.',
      },
      {
        id: 'pc-33', level: 2, topic: 'Muro termico', chapter: 'prestazioni', type: 'choice',
        q: 'Perché verso il 2005 Intel e AMD smisero di inseguire frequenze sempre più alte e passarono ai processori multicore?',
        options: ['Oltre i 3-4 GHz i chip consumavano e scaldavano troppo', 'I transistor avevano raggiunto la dimensione minima possibile', 'La legge di Moore non valeva più per i processori', 'I sistemi operativi non gestivano frequenze più alte'],
        answer: 0,
        why: 'La potenza dissipata cresce con la frequenza e con il quadrato della tensione (P ≈ C × V² × f): il Pentium 4 si fermò a 3,8 GHz. Dal 2005 si aggiungono core invece di alzare i GHz.',
      },
      {
        id: 'pc-34', level: 3, topic: 'Multicore', chapter: 'prestazioni', type: 'truefalse',
        q: 'In un programma metà del lavoro non si può dividere tra i core. Passando da 1 a 8 core, il programma diventa 8 volte più veloce.',
        answer: false,
        why: 'Falso: la metà sequenziale non accelera. Il tempo scende da 1 a 0,5 + 0,5/8 ≈ 0,56, cioè il programma va circa 1,8 volte più veloce (legge di Amdahl). Più core aiutano solo il lavoro che si può dividere.',
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
        pairs: [['ARM', 'Architettura di processori a basso consumo'], ['Apple M1', 'SoC dei Mac presentato nel 2020'], ['Raspberry Pi', 'Computer completo su una piccola scheda'], ['Arduino', 'Scheda con microcontrollore, nata a Ivrea']],
        why: 'I processori ARM sono in quasi tutti gli smartphone; l\'Apple M1 (2020) ha portato un SoC ARM nei Mac; il Raspberry Pi (2012) fa girare Linux; Arduino (Ivrea, 2005) comanda sensori e motori.',
      },
      {
        id: 'pc-37', level: 2, topic: 'Apple M1', chapter: 'oggi', type: 'choice',
        q: 'La CPU dell\'Apple M1 ha 4 core ad alte prestazioni e 4 core ad alta efficienza. A che cosa servono questi ultimi?',
        options: ['A fare i lavori leggeri consumando poca energia', 'A eseguire i programmi scritti per i processori Intel', 'A sostituire i core veloci quando si guastano', 'A gestire da soli la grafica dei videogiochi'],
        answer: 0,
        why: 'Posta, musica e attività in sottofondo girano sui core efficienti, e quelli veloci si attivano solo quando serve. Così il MacBook Air con M1 (2020) dura a lungo a batteria e non ha nemmeno la ventola.',
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
        why: 'Xerox Alto (1973), Apple II (1977), Olivetti M24 (1983), primi dual core per PC (2005) e Raspberry Pi (2012): dalle prime finestre su schermo ai computer da poche decine di euro.',
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
