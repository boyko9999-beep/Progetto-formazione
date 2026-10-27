/*
 * Banca domande del quiz: sezione 9, Bus e protocolli (aggiunte scritte a mano).
 * QuizBusFixes ritocca le domande delle lezioni di BusLab (js/buses.js): quattro
 * opzioni credibili, la risposta giusta che non si riconosce dalla lunghezza, un
 * why che spiega, il livello giusto. Le domande nuove fanno usare i bus: frame da
 * riordinare, bit da accendere, tempi da calcolare, forme d'onda da leggere.
 * I capitoli sono le categorie di BusLab, più «confronti» per le domande che
 * mettono insieme bus di categorie diverse.
 */
(function (root) {
  'use strict';

  // Ritocchi delle domande di BusLab (vedi banks/bus.js), indicizzati per id.
  // La risposta giusta resta la prima: il motore mescola le opzioni.
  root.QuizBusFixes = {
    // ------------------------------------------------------------ Seriali classiche
    'bus-uart-1': {
      options: ['Perché non c\'è un filo di clock condiviso', 'Perché trasmette in una sola direzione', 'Perché i due lati usano velocità diverse', 'Perché trasmette e riceve a turno'],
      why: 'Non c\'è un clock in comune: ogni carattere si sincronizza da solo con il suo bit di start, e i due lati devono solo accordarsi sulla velocità. Con un filo TX e uno RX, poi, l\'UART può trasmettere e ricevere nello stesso momento.',
    },
    'bus-uart-2': {
      options: ['8 bit di dati, nessuna parità, 1 bit di stop', '8 bit di dati, nessuna parità, 1 bit di start', '8 bit di dati, parità negativa, 1 bit di stop', '8 fili di dati, nessun clock, 1 filo di massa'],
      why: 'Si legge così: 8 bit di dati, N = nessun bit di parità (E sarebbe parità pari, O dispari), 1 bit di stop. Il bit di start c\'è sempre, per questo la sigla non lo nomina.',
    },
    'bus-rs232-1': {
      options: ['Una tensione tra −3 e −15 V', 'Una tensione tra +3 e +15 V', 'Una tensione di circa +5 V', 'Una tensione di circa 0 V'],
      why: 'La logica è invertita: l\'1 ("mark") è tra −3 e −15 V, lo 0 ("space") tra +3 e +15 V. Un chip come il MAX232 converte questi livelli da e verso quelli TTL del microcontrollore.',
    },
    'bus-rs232-2': {
      options: ['Al controllo di flusso hardware', 'A trasmettere e ricevere i dati', 'A portare l\'alimentazione', 'A scegliere la velocità'],
      why: 'Request To Send e Clear To Send fanno da semaforo: chi riceve può dire "fermati, il mio buffer è pieno" e chi trasmette aspetta. I dati viaggiano invece su TxD e RxD.',
    },
    'bus-rs485-1': {
      options: ['Usa la differenza di tensione tra due fili', 'Usa tensioni più alte di quelle dell\'RS-232', 'Ritrasmette ogni byte finché arriva intatto', 'Aggiunge un bit di parità a ogni byte'],
      why: 'Il ricevitore guarda solo la differenza tra A e B: un disturbo colpisce allo stesso modo i due fili intrecciati e nella differenza si annulla. Così l\'RS-485 arriva fino a 1200 m.',
    },
    'bus-rs485-2': {
      q: 'Che cosa permette l\'RS-485 che l\'RS-232 non permette?',
      options: ['Collegare decine di dispositivi sullo stesso cavo', 'Portare dati e alimentazione sugli stessi fili', 'Usare tensioni più alte, fino a ±25 V', 'Mandare il clock su un filo separato'],
      why: 'L\'RS-232 collega solo due apparecchi, punto-punto, fino a circa 15 m. Sul doppino dell\'RS-485 si collegano invece decine di dispositivi, uno dopo l\'altro, fino a 1200 m.',
    },
    'bus-midi-1': {
      options: ['Comandi come "suona questa nota"', 'Il suono digitalizzato dello strumento', 'Il segnale audio analogico', 'L\'alimentazione per gli strumenti'],
      why: 'Sono istruzioni, come Note On con il numero della nota e la forza con cui si è premuto il tasto: il suono lo genera lo strumento che le riceve. Per questo un brano MIDI occupa pochissimo spazio.',
    },
    'bus-midi-2': {
      options: ['Per isolare gli strumenti ed evitare ronzii', 'Per trasmettere i dati su fibra ottica', 'Per raddoppiare la velocità di trasmissione', 'Per alimentare lo strumento che riceve'],
      why: 'Nell\'optoisolatore il segnale passa come luce: gli strumenti non condividono la massa, così non si formano anelli di massa che producono ronzii.',
    },

    // ------------------------------------------------------------ Tra i chip della scheda
    'bus-i2c-1': {
      options: ['SDA scende mentre SCL è alto', 'SDA sale mentre SCL è alto', 'SDA scende mentre SCL è basso', 'SCL resta basso per 10 ms'],
      why: 'Durante i dati SDA cambia solo con SCL basso: un cambio con SCL alto è un segnale speciale. Se SDA scende è lo START, se sale è lo STOP.',
    },
    'bus-i2c-2': {
      options: ['Perché i chip sanno solo tirare le linee a 0', 'Perché alimentano i sensori collegati al bus', 'Perché adattano l\'impedenza in fondo al cavo', 'Perché fissano l\'indirizzo di ogni dispositivo'],
      why: 'Le uscite I²C sono open-drain: un chip può solo collegare la linea a massa. È la resistenza di pull-up a riportarla a 1, così due chip non vanno mai in cortocircuito.',
    },
    'bus-smbus-1': {
      options: ['I²C', 'SPI', 'USB', '1-Wire'],
      why: 'Intel prese I²C e lo rese più rigoroso, con livelli di tensione precisi, per gestire batterie e sensori dei PC. Le due linee si chiamano SMBCLK e SMBDAT, ma funzionano come SCL e SDA.',
    },
    'bus-smbus-2': {
      options: ['Un timeout che sblocca il bus', 'Un terzo filo per il clock', 'La trasmissione differenziale', 'Una velocità più alta di I²C'],
      why: 'Se la linea del clock resta bassa per più di 35 ms, i dispositivi rilasciano il bus e ripartono: un chip bloccato non ferma più tutto. Lo SMBus classico va da 10 a 100 kHz, quindi non è più veloce di I²C.',
    },
    'bus-i3c-1': {
      options: ['Il master pilota le linee in push-pull', 'Aggiunge un filo dedicato agli interrupt', 'Comprime i dati prima di inviarli', 'Usa due coppie di fili differenziali'],
      why: 'In push-pull il master spinge la linea sia a 0 sia a 1: i fronti sono rapidi e non deve aspettare che le resistenze di pull-up la riportino su. Così I3C arriva a 12,5 MHz sugli stessi due fili, che portano anche gli interrupt.',
    },
    'bus-spi-1': {
      options: ['Dati nei due sensi nello stesso momento', 'Dati nei due sensi, ma uno alla volta', 'Due master che parlano nello stesso momento', 'Due clock separati, uno per direzione'],
      why: 'A ogni colpo di clock un bit va dal master allo slave su MOSI e uno torna indietro su MISO, nello stesso istante. Trasmettere a turno si chiama half-duplex, come in I²C.',
    },
    'bus-spi-2': {
      q: 'In SPI, come sceglie il master con quale slave parlare?',
      options: ['Abbassando il Chip Select di quello slave', 'Alzando il Chip Select di quello slave', 'Mandando un indirizzo a 7 bit', 'Cambiando la frequenza del clock'],
      why: 'Ogni slave ha il suo filo CS, attivo basso: ascolta solo quello con CS a 0, mentre gli altri ignorano il clock. Per questo con SPI serve un filo in più per ogni slave.',
    },
    'bus-onewire-1': {
      q: 'Sul bus 1-Wire, come si distingue un bit 1 da un bit 0?',
      options: ['Dalla durata dell\'impulso basso', 'Dal livello di tensione sul filo', 'Dal numero di impulsi nel bit', 'Dal verso del fronte a metà bit'],
      why: 'Ogni bit occupa una finestra di almeno 60 µs, che il master apre portando la linea a 0: se la tiene bassa solo per pochi µs è un 1, se la tiene bassa per quasi tutta la finestra è uno 0.',
    },
    'bus-onewire-2': {
      q: 'Nel bus 1-Wire, che cosa significa "alimentazione parassita"?',
      options: ['Il dispositivo si alimenta dalla linea dati', 'Il dispositivo si alimenta da un filo a parte', 'Il dispositivo usa una pila interna', 'Il dispositivo prende energia dagli altri'],
      why: 'Quando la linea dati è a riposo, cioè alta, il dispositivo carica un piccolo condensatore e lo usa mentre la linea è bassa: così bastano un filo e la massa.',
    },
    'bus-i2s-1': {
      options: ['Indica il canale, sinistro o destro', 'Porta il clock dei bit del campione', 'Regola il volume dei due canali stereo', 'Accende e spegne l\'amplificatore audio'],
      why: 'WS (Word Select) vale 0 per il campione del canale sinistro e 1 per il destro: i due canali si alternano sullo stesso filo SD. Il clock dei bit viaggia invece su SCK.',
    },
    'bus-jtag-1': {
      q: 'A ogni fronte di salita del clock TCK, la macchina a stati JTAG può passare a un altro stato. Quale segnale decide in quale?',
      options: ['TMS', 'TDI', 'TDO', 'TCK'],
      level: 3,
      why: 'TMS (Test Mode Select), letto a ogni fronte di salita di TCK, sceglie lo stato successivo tra i 16 della macchina a stati. TDI e TDO portano invece i dati dentro e fuori dalla catena, e TCK dà solo il ritmo.',
    },
    'bus-axi-1': {
      options: ['Quando VALID e READY sono entrambi a 1', 'Appena chi trasmette porta VALID a 1', 'Appena chi riceve porta READY a 1', 'A ogni colpo di clock, senza conferme'],
      level: 3,
      why: 'Chi trasmette alza VALID quando il dato è pronto, chi riceve alza READY quando può prenderlo: il dato passa solo sul fronte di clock in cui sono a 1 tutti e due. Ogni canale AXI fa questa stretta di mano per conto suo.',
    },

    // ------------------------------------------------------------ Dentro il computer
    'bus-unibus-1': {
      q: 'Quale idea importante ha reso famoso l\'Unibus del PDP-11?',
      options: ['Periferiche con indirizzi come la memoria', 'Un clock comune per tutte le schede', 'Indirizzi e dati che viaggiano sulle stesse linee', 'Un bus separato per ogni periferica'],
      why: 'Registri delle periferiche e celle di memoria stavano sullo stesso bus e si usavano con le stesse istruzioni: è l\'I/O mappato in memoria, usato ancora oggi. L\'Unibus non aveva clock e teneva indirizzi e dati su linee separate.',
    },
    'bus-s100-1': {
      options: ['Altair 8800', 'IBM PC', 'Apple II', 'Apple Macintosh'],
      why: 'MITS lo creò per le schede dell\'Altair 8800, nel 1974-75: il nome viene dai 100 contatti del connettore. Lo copiarono poi molti altri computer, e nel 1983 diventò lo standard IEEE-696.',
    },
    'bus-isa-1': {
      options: ['Con jumper e interruttori sulla scheda', 'Dal setup del BIOS, all\'accensione', 'Dal sistema operativo, in automatico', 'Dalla scheda madre, in base allo slot'],
      why: 'Indirizzo di I/O, IRQ e canale DMA si sceglievano spostando a mano jumper e microinterruttori: se due schede usavano lo stesso IRQ andavano in conflitto. Il Plug and Play del 1993 nacque per risolvere questo problema.',
    },
    'bus-scsi-1': {
      options: ['I segnali rimbalzano e causano errori', 'Niente: il terminatore è facoltativo', 'L\'ultimo disco resta senza alimentazione', 'I dischi restano senza un ID assegnato'],
      why: 'Il terminatore assorbe il segnale in fondo alla linea. Senza, il segnale si riflette, torna indietro e si somma ai bit successivi: è lo stesso problema che risolvono le resistenze da 120 Ω dell\'RS-485.',
    },
    'bus-pci-1': {
      options: ['Le stesse linee portano indirizzo e poi dati', 'Indirizzi e dati viaggiano su linee separate', 'Più schede possono trasmettere nello stesso momento', 'Usa più frequenze sulla stessa linea'],
      why: 'Nella prima fase della transazione le linee AD[31:0] portano l\'indirizzo, nelle successive i dati: si risparmiano 32 piedini. L\'ISA, invece, aveva linee separate per indirizzi e dati.',
    },
    'bus-pci-2': {
      options: ['Quando IRDY# e TRDY# sono entrambi bassi', 'Quando IRDY# e TRDY# sono entrambi alti', 'Quando FRAME# è alto e il bus è libero', 'A ogni colpo di clock, senza attendere conferme'],
      level: 3,
      why: 'Il simbolo # indica un segnale attivo basso: IRDY# basso vuol dire initiator pronto, TRDY# basso target pronto. Il dato passa sul fronte del clock in cui sono pronti tutti e due.',
    },
    'bus-pcie-1': {
      options: ['Perché ad alte frequenze i bit paralleli arrivano sfasati', 'Perché il seriale usa tensioni più alte e robuste', 'Perché così nei nuovi slot entrano anche le vecchie schede PCI', 'Perché i dati seriali si possono comprimere meglio'],
      why: 'Su tanti fili paralleli i bit di uno stesso dato arrivano con ritardi un po\' diversi (lo skew) e, ad alta frequenza, si mescolano con quelli del colpo dopo. Le corsie seriali sono indipendenti e non devono restare al passo l\'una con l\'altra.',
    },
    'bus-pcie-2': {
      options: ['A garantire fronti per ricostruire il clock', 'A comprimere i dati per risparmiare banda', 'A cifrare i dati contro chi ascolta sulla linea', 'A correggere i bit che arrivano sbagliati'],
      why: 'Ogni byte diventa un simbolo di 10 bit con abbastanza transizioni e con 0 e 1 bilanciati: il ricevitore ricava il clock dai fronti. Il prezzo è il 25% di bit in più.',
    },
    'bus-sata-1': {
      q: 'Nei PC, quale collegamento per i dischi è stato sostituito da SATA?',
      options: ['PATA (IDE)', 'NVMe su PCI Express', 'USB', 'FireWire'],
      why: 'SATA (Serial ATA) ha preso il posto del PATA, detto anche IDE: stessi comandi ATA, ma su un cavo sottile a 7 fili invece del cavo piatto a 40 o 80 fili. NVMe su PCI Express è arrivato dopo, per gli SSD più veloci.',
    },

    // ------------------------------------------------------------ Periferiche esterne
    'bus-gpib-1': {
      options: ['Il dispositivo più lento', 'Il dispositivo più veloce', 'Il controller che comanda il bus', 'Un clock comune a tutti gli strumenti'],
      why: 'La stretta di mano a tre fili (DAV, NRFD, NDAC) aspetta che tutti gli strumenti in ascolto siano pronti prima di ogni byte: nessun dato si perde, ma il bus va al passo del più lento.',
    },
    'bus-centronics-1': {
      options: ['8', '1', '16', '32'],
      level: 1,
      why: 'La porta parallela ha 8 fili per i dati: un intero byte passa in un colpo solo, mentre una porta seriale manda un bit alla volta.',
    },
    'bus-usb-1': {
      q: 'Nella codifica NRZI dell\'USB, che cosa fa un bit 0?',
      options: ['Fa cambiare lo stato della linea', 'Lascia la linea com\'era', 'Mette entrambi i fili a 0', 'Crea un fronte a metà di ogni bit'],
      why: 'In NRZI conta il cambiamento, non il livello: uno 0 scambia i livelli di D+ e D−, un 1 li lascia come sono. Il ricevitore guarda quindi se la linea è cambiata rispetto al bit prima.',
    },
    'bus-usb-2': {
      options: ['Per garantire transizioni al ricevitore', 'Per segnalare la fine del pacchetto', 'Per controllare che i dati siano giusti', 'Per separare un byte dal successivo'],
      why: 'In NRZI un 1 lascia la linea ferma: dopo tanti 1 di fila non ci sarebbero fronti e il ricevitore perderebbe il passo. Lo 0 aggiunto (bit stuffing) forza un cambio, e chi riceve lo toglie.',
    },
    'bus-firewire-1': {
      options: ['Quando il bit di Data non cambia', 'Quando il bit di Data cambia', 'A ogni bit, come un clock', 'Solo all\'inizio di ogni pacchetto'],
      level: 3,
      why: 'A ogni bit commuta una sola delle due linee: se Data cambia, Strobe resta ferma; se Data resta uguale, cambia Strobe. Lo XOR di Data e Strobe ricostruisce così il clock.',
    },
    'bus-thunderbolt-1': {
      options: ['USB4', 'USB 3.0', 'HDMI 2.1', 'SATA'],
      why: 'Nel 2019 Intel ha ceduto la specifica di Thunderbolt 3, senza chiedere diritti, all\'USB Promoter Group, le aziende che scrivono lo standard USB: su quella base è nato USB4.',
    },

    // ------------------------------------------------------------ Industria, auto e aerei
    'bus-mil1553-1': {
      options: ['Per ridondanza in caso di guasto', 'Uno per andata e uno per ritorno', 'Per raddoppiare la velocità', 'Uno per i comandi e uno per i dati'],
      level: 1,
      why: 'In aereo un guasto non deve togliere la comunicazione: se il bus A si danneggia, i terminali continuano a parlare sul bus B, identico.',
    },
    'bus-modbus-1': {
      options: ['Legge uno o più registri', 'Scrive un solo registro', 'Riavvia lo slave', 'Cambia l\'indirizzo dello slave'],
      level: 2,
      why: 'La funzione 03 è Read Holding Registers: il master chiede allo slave il valore di uno o più registri da 16 bit. Per scriverne uno solo si usa la funzione 06.',
    },
    'bus-modbus-2': {
      options: ['Da un silenzio di almeno 3,5 caratteri', 'Da un carattere speciale ":"', 'Da un bit di start più lungo degli altri', 'Da un impulso su un filo separato'],
      why: 'In Modbus RTU i frame sono separati da pause: se la linea resta ferma per almeno 3,5 tempi di carattere, il byte successivo apre un nuovo frame. Il ":" iniziale si usa solo nella variante Modbus ASCII.',
    },
    'bus-can-1': {
      options: ['Quello con l\'identificatore più basso', 'Quello con l\'identificatore più alto', 'Nessuno: tutti e due riprovano dopo', 'Quello collegato per primo al bus'],
      why: 'Gli identificatori si confrontano bit per bit, dal più significativo: al primo bit diverso lo 0 dominante copre l\'1, e chi aveva scritto 1 smette di trasmettere e riprova dopo. Vince l\'identificatore più basso, e il suo messaggio passa intatto.',
    },
    'bus-can-2': {
      options: ['Il contenuto e la priorità del messaggio', 'L\'indirizzo della centralina che deve riceverlo', 'L\'indirizzo del nodo che trasmette', 'Il numero di serie della centralina'],
      why: 'Il CAN non ha indirizzi: l\'ID dice che cosa contiene il messaggio, per esempio i giri del motore, e più è basso più il messaggio ha priorità. Tutti i nodi ricevono tutto e ognuno tiene gli ID che gli interessano.',
    },
    'bus-lin-1': {
      options: ['A far misurare la velocità agli slave', 'A dire quale slave deve rispondere', 'A controllare che i dati siano corretti', 'A segnalare la fine del frame'],
      why: '0x55 è 0101 0101: con i bit di start e di stop la linea cambia a ogni bit. Misurando questi fronti regolari gli slave, che spesso non hanno un quarzo, si adattano alla velocità del master.',
    },
    'bus-profibus-1': {
      q: 'Su quale collegamento elettrico viaggia di solito Profibus DP?',
      options: ['RS-485', 'RS-232', 'CAN', 'Ethernet'],
      why: 'Profibus DP usa l\'RS-485 su un doppino, nel tipico cavo viola, con caratteri UART da 11 bit: start, 8 bit di dati, parità pari e stop. Il suo successore su Ethernet si chiama Profinet.',
    },
    'bus-flexray-1': {
      q: 'Che cosa rende FlexRay deterministico, cioè con tempi sempre prevedibili?',
      options: ['Ogni nodo ha uno slot di tempo fisso', 'Chi trova il bus libero trasmette subito', 'Ritrasmette i messaggi arrivati rovinati', 'Usa l\'arbitraggio bit per bit del CAN'],
      why: 'Il tempo è diviso in cicli e slot fissi (TDMA, accesso a divisione di tempo), come un orario ferroviario: ogni nodo sa in anticipo quando trasmettere e nessuno si contende il bus.',
    },

    // ------------------------------------------------------------ Reti
    'bus-ethernet-1': {
      options: ['Un fronte di salita a metà bit', 'Un fronte di discesa a metà bit', 'Un livello alto per tutto il bit', 'Un cambio di livello a inizio bit'],
      why: 'Nel 10BASE-T l\'1 è una salita e lo 0 una discesa, sempre a metà bit: questa transizione centrale c\'è in ogni bit, così il clock viaggia insieme ai dati.',
    },
    'bus-ethernet-2': {
      options: ['A scoprire errori di trasmissione', 'A indicare il destinatario del frame', 'A cifrare i dati del frame', 'A sincronizzare il ricevitore'],
      why: 'L\'FCS (Frame Check Sequence) è un CRC-32 calcolato su indirizzi, tipo e dati: il ricevitore lo ricalcola e, se non coincide, scarta il frame.',
    },
  };

  root.QuizBank.extend('bus', [
    // ------------------------------------------------------------ Seriali classiche
    {
      id: 'bus-x-01', level: 1, topic: 'UART', chapter: 'seriali', type: 'order',
      q: 'Un UART spedisce un carattere con il bit di parità. Metti in ordine i campi del frame, dal primo che esce sul filo.',
      items: ['Bit di start', '8 bit di dati', 'Bit di parità', 'Bit di stop'],
      ends: ['Primo sul filo', 'Ultimo sul filo'],
      why: 'A riposo la linea è a 1: il bit di start (0) avvisa il ricevitore, poi arrivano i dati dal bit meno significativo, la parità e infine lo stop (1), che riporta la linea a riposo. In tutto sono 11 bit.',
    },
    {
      id: 'bus-x-02', level: 1, topic: 'UART', chapter: 'seriali', type: 'truefalse',
      q: 'Per far parlare due schede con l\'UART si collega il TX di una al TX dell\'altra e l\'RX all\'RX, più la massa in comune.',
      answer: false,
      why: 'Falso: il TX di una scheda va all\'RX dell\'altra e viceversa, perché ciò che una trasmette l\'altra deve riceverlo. Collegare TX con TX è il classico errore da laboratorio: due uscite parlano insieme e nessuno ascolta.',
    },
    {
      id: 'bus-x-03', level: 2, topic: 'UART', chapter: 'seriali', type: 'number',
      q: 'Un UART a 9600 baud spedisce caratteri nel formato 8N1, uno dopo l\'altro senza pause. Quanti byte di dati passano al massimo in un secondo, in byte/s?',
      value: 960, unit: 'byte/s', tolerance: 1,
      why: 'Ogni carattere 8N1 occupa 10 bit sul filo: 1 di start, 8 di dati e 1 di stop. 9600 bit/s ÷ 10 = 960 byte/s: start e stop occupano il 20% dei bit.',
    },
    {
      id: 'bus-x-04', level: 3, topic: 'UART', chapter: 'seriali', type: 'bits',
      q: 'Su una linea UART in formato 8N1, dopo il bit di start arrivano nell\'ordine questi 8 bit di dati: 1, 0, 0, 0, 0, 0, 1, 0. Accendi i bit del byte ricevuto.',
      width: 8, value: 65,
      why: 'L\'UART spedisce i dati partendo dal bit meno significativo: il primo 1 vale 1, il settimo bit vale 64. Il byte è 0100 0001 = 0x41 = 65, la lettera "A" in ASCII.',
    },
    {
      id: 'bus-x-23', level: 2, topic: 'UART', chapter: 'seriali', type: 'choice',
      q: 'Un UART con parità pari spedisce il byte 0110 1001. Quanto vale il bit di parità?',
      options: ['0, perché il byte ha già un numero pari di 1', '1, perché il byte ha già un numero pari di 1', '0, perché l\'ultimo bit del byte vale 1', '1, perché l\'ultimo bit del byte vale 1'],
      answer: 0,
      why: 'Il byte contiene quattro 1: con la parità pari il totale degli 1, bit di parità compreso, deve restare pari, quindi il bit vale 0. Se un disturbo cambia un solo bit, il conto diventa dispari e il ricevitore scopre l\'errore.',
    },

    // ------------------------------------------------------------ Tra i chip della scheda
    {
      id: 'bus-x-05', level: 2, topic: 'Numero di fili', chapter: 'chip', type: 'match',
      q: 'Abbina ogni bus al numero di fili di segnale che usa nella versione base, senza contare massa e alimentazione.',
      pairs: [['I²C', '2 fili'], ['I²S', '3 fili'], ['SPI con un solo slave', '4 fili'], ['JTAG con il reset TRST', '5 fili']],
      why: 'I²C ha SDA e SCL; I²S ha SCK, WS e SD; SPI ha SCLK, MOSI, MISO e un CS per ogni slave; JTAG ha TCK, TMS, TDI, TDO e il reset TRST, che è facoltativo.',
    },
    {
      id: 'bus-x-06', level: 2, topic: 'I²C', chapter: 'chip', type: 'order',
      q: 'Il master scrive un byte in un sensore I²C. Metti in ordine ciò che passa sul bus.',
      items: ['Condizione di START', 'Indirizzo a 7 bit', 'Bit R/W a 0 (scrittura)', 'ACK dello slave all\'indirizzo', 'Byte di dati e il suo ACK', 'Condizione di STOP'],
      ends: ['Primo sul bus', 'Ultimo sul bus'],
      why: 'START (SDA scende con SCL alto), poi l\'indirizzo a 7 bit e il bit R/W, che insieme formano il primo byte; lo slave conferma con un ACK. Seguono i dati, ognuno con il suo ACK, e lo STOP (SDA sale con SCL alto).',
    },
    {
      id: 'bus-x-07', level: 3, topic: 'I²C', chapter: 'chip', type: 'bits',
      q: 'Un sensore I²C ha l\'indirizzo a 7 bit 100 1000 (0x48). Per leggerlo, dopo lo START il master spedisce i 7 bit dell\'indirizzo seguiti dal bit R/W a 1. Accendi i bit del byte spedito.',
      width: 8, value: 145,
      why: 'L\'indirizzo occupa i 7 bit più alti e R/W l\'ultimo: 100 1000 seguito da 1 dà 1001 0001 = 0x91 = 145. Per scrivere, con R/W a 0, il byte sarebbe 0x90.',
    },
    {
      id: 'bus-x-08', level: 2, topic: 'Bus sincrono', chapter: 'chip', type: 'bits',
      q: 'In figura un bus sincrono: il ricevitore legge DATA a ogni fronte di discesa di CLK, e il primo bit che arriva è il più significativo. Accendi i bit del byte trasmesso.',
      figure: { kind: 'wave', shape: 'clock-data' },
      width: 8, value: 178,
      why: 'A ogni discesa di CLK la traccia DATA vale 1, 0, 1, 1, 0, 0, 1, 0: il byte è 1011 0010 = 128 + 32 + 16 + 2 = 178 (0xB2). È il clock, sul suo filo, a dire al ricevitore quando leggere.',
    },
    {
      id: 'bus-x-24', level: 3, topic: 'I²C', chapter: 'chip', type: 'choice',
      q: 'Un master I²C manda l\'indirizzo 0x50 e il bit R/W, ma al nono colpo di clock SDA resta a 1. Che cosa significa?',
      options: ['Nessuno slave ha risposto a 0x50', 'Lo slave 0x50 ha ricevuto l\'indirizzo', 'Il master deve abbassare la velocità', 'Lo slave 0x50 sta per mandare dati'],
      answer: 0,
      why: 'Al nono colpo di clock chi riceve tira SDA a 0 per dire «ricevuto» (ACK). Se SDA resta a 1 è un NACK: nessun dispositivo ha quell\'indirizzo, non è collegato bene oppure è occupato, come una EEPROM mentre scrive.',
    },

    // ------------------------------------------------------------ Dentro il computer
    {
      id: 'bus-x-09', level: 2, topic: 'PCI', chapter: 'pc', type: 'choice',
      q: 'Il bus PCI ha un clock a 33,3 MHz e, in modalità burst, a ogni colpo di clock passa una parola di 32 bit. Quanti dati passano al massimo in un secondo?',
      options: ['133 MB/s', '33 MB/s', '1066 MB/s', '266 MB/s'],
      answer: 0,
      why: 'Una parola di 32 bit è di 4 byte: 33,3 milioni di colpi al secondo × 4 byte ≈ 133 MB/s. È una banda condivisa, perché sul PCI trasmette un solo dispositivo alla volta.',
    },
    {
      id: 'bus-x-10', level: 3, topic: 'Segnali di controllo', chapter: 'pc', type: 'match',
      q: 'Abbina ogni bus ai segnali che regolano i suoi trasferimenti.',
      pairs: [['Unibus', 'MSYN e SSYN'], ['ISA', 'BALE e IOW#'], ['SCSI', 'REQ e ACK'], ['PCI', 'FRAME#, IRDY# e TRDY#']],
      why: 'Unibus: niente clock, il master attiva MSYN e lo slave risponde con SSYN. ISA: BALE dice che l\'indirizzo è valido, IOW# chiede una scrittura di I/O. SCSI: ogni byte passa con la stretta di mano REQ/ACK. PCI: FRAME# apre la transazione, IRDY# e TRDY# dicono chi è pronto.',
    },
    {
      id: 'bus-x-11', level: 2, topic: 'PCI Express', chapter: 'pc', type: 'number',
      q: 'Una corsia PCI Express 2.0 trasmette 5 GT/s, cioè 5 miliardi di bit al secondo sulla linea, con la codifica 8b/10b. Quanti Gbit/s di dati utili porta?',
      value: 4, unit: 'Gbit/s', tolerance: 0.05,
      why: 'La codifica 8b/10b spedisce 10 bit sulla linea per ogni 8 bit di dati: 5 × 8 ÷ 10 = 4 Gbit/s per corsia. Con la versione 3.0 PCIe è passato alla codifica 128b/130b, che spreca meno di 2 bit su 100.',
    },
    {
      id: 'bus-x-25', level: 2, topic: 'PCI Express', chapter: 'pc', type: 'number',
      q: 'Ogni corsia PCI Express ha una coppia differenziale per trasmettere e una per ricevere. Quanti fili di segnale usano in tutto le corsie di una scheda video x16?',
      value: 64, unit: 'fili', tolerance: 0,
      why: 'Una corsia ha 2 coppie, cioè 4 fili: 16 corsie × 4 fili = 64 fili. I dati vengono distribuiti a turno sulle corsie e il ricevitore li rimette in fila: non serve che arrivino tutti nello stesso istante, come in un bus parallelo.',
    },
    {
      id: 'bus-x-26', level: 2, topic: 'PCI', chapter: 'pc', type: 'choice',
      q: 'Con il PCI arrivò il vero Plug and Play. All\'accensione, come riconosce il sistema una scheda appena montata?',
      options: ['Legge i codici di produttore e di dispositivo', 'Legge la posizione dei jumper sulla scheda', 'Usa il driver che l\'utente ha installato', 'Aspetta che l\'utente scelga IRQ e indirizzo'],
      answer: 0,
      why: 'Ogni scheda PCI ha uno spazio di configurazione con il codice del produttore (per Intel è 0x8086) e quello del dispositivo: il sistema lo legge all\'avvio e assegna le risorse da solo, senza jumper. Il driver giusto si sceglie dopo, proprio in base a quei codici.',
    },

    // ------------------------------------------------------------ Periferiche esterne
    {
      id: 'bus-x-12', level: 2, topic: 'USB', chapter: 'periferiche', type: 'choice',
      q: 'In figura i fili D+ e D− del cavo di un mouse USB: quando uno è alto, l\'altro è basso. In quale momento, invece, sono bassi tutti e due?',
      figure: { kind: 'wave', shape: 'differential' },
      options: ['Alla fine di ogni pacchetto', 'A ogni bit 0 dei dati', 'Durante il SYNC iniziale', 'Quando c\'è un errore di CRC'],
      answer: 0,
      why: 'Lo stato con entrambi i fili bassi si chiama SE0 (Single-Ended Zero): due bit di SE0 segnano la fine di ogni pacchetto (End Of Packet). Durante i dati i due fili sono sempre opposti e il ricevitore ne legge la differenza; un SE0 lungo almeno 10 ms, invece, resetta il dispositivo.',
    },
    {
      id: 'bus-x-13', level: 3, topic: 'Nomi dei segnali', chapter: 'periferiche', type: 'match',
      q: 'Abbina ogni collegamento ai nomi di alcuni suoi segnali.',
      pairs: [['USB', 'D+ e D−'], ['Porta seriale RS-232', 'TxD, RxD, RTS e CTS'], ['Porta parallela', 'STROBE, BUSY e ACK'], ['GPIB', 'DAV, NRFD e NDAC']],
      why: 'USB: la coppia differenziale D+ e D−. RS-232: TxD e RxD per i dati, RTS e CTS per il controllo di flusso. Porta parallela: STROBE dal computer, BUSY e ACK dalla stampante. GPIB: la stretta di mano a tre fili DAV, NRFD e NDAC.',
    },
    {
      id: 'bus-x-14', level: 1, topic: 'USB', chapter: 'periferiche', type: 'truefalse',
      q: 'Con l\'USB è l\'host, cioè il computer, a interrogare il mouse: il mouse trasmette i suoi dati solo quando viene interpellato.',
      answer: true,
      why: 'Vero: in USB l\'host comanda sempre e i dispositivi parlano solo quando sono interpellati. Per questo il computer interroga il mouse di continuo, a intervalli di pochi millisecondi.',
    },
    {
      id: 'bus-x-27', level: 2, topic: 'Thunderbolt', chapter: 'periferiche', type: 'choice',
      q: 'Una scheda video esterna è collegata al portatile con un cavo Thunderbolt. Come la vede il computer?',
      options: ['Come una normale scheda PCI Express', 'Come un monitor collegato in DisplayPort', 'Come un disco esterno collegato in USB', 'Come una periferica FireWire'],
      answer: 0,
      why: 'Thunderbolt porta sullo stesso cavo, «in tunnel», i pacchetti di PCI Express, DisplayPort e USB: la scheda video esterna parla PCIe come se fosse montata dentro il computer.',
    },
    {
      id: 'bus-x-28', level: 1, topic: 'FireWire', chapter: 'periferiche', type: 'truefalse',
      q: 'Con FireWire una videocamera può copiare un filmato su un videoregistratore digitale direttamente, senza un computer in mezzo.',
      answer: true,
      why: 'Vero: in FireWire i dispositivi sono alla pari (peer-to-peer) e uno qualsiasi può avviare un trasferimento, senza un computer che comandi. Per questo era la porta delle videocamere digitali (DV) tra gli anni \'90 e 2000.',
    },

    // ------------------------------------------------------------ Industria, auto e aerei
    {
      id: 'bus-x-15', level: 2, topic: 'CAN', chapter: 'industria', type: 'order',
      q: 'Quattro nodi CAN iniziano a trasmettere nello stesso istante, con questi identificatori a 11 bit. In che ordine passano i loro messaggi?',
      items: ['ID 0x080', 'ID 0x123', 'ID 0x2A0', 'ID 0x5F0'],
      ends: ['Passa per primo', 'Passa per ultimo'],
      why: 'Vince l\'identificatore più basso: al primo bit in cui gli ID differiscono, il suo 0 dominante copre l\'1 degli altri. Chi perde riprova appena il bus si libera: 0x080, poi 0x123, 0x2A0 e 0x5F0.',
    },
    {
      id: 'bus-x-16', level: 1, topic: 'CAN', chapter: 'industria', type: 'number',
      q: 'Il bus CAN di un\'auto lavora a 500 kbit/s. Quanto dura un bit, in µs?',
      value: 2, unit: 'µs', tolerance: 0.05,
      why: 'T = 1 ÷ 500 000 bit/s = 0,000002 s = 2 µs. Nell\'arbitraggio ogni bit deve fare andata e ritorno su tutto il cavo prima di finire: per questo a 1 Mbit/s il bus arriva al massimo a circa 40 m.',
    },
    {
      id: 'bus-x-17', level: 3, topic: 'LIN', chapter: 'industria', type: 'choice',
      q: 'Un master LIN a 19 200 bit/s manda il byte di sincronismo 0x55: con i bit di start e di stop la linea cambia livello a ogni bit e forma un\'onda quadra. Che frequenza ha quest\'onda?',
      figure: { kind: 'wave', shape: 'square', cycles: 5, label: '0x55 · 19 200 bit/s', caption: 'Un tratto dell\'onda: ogni livello alto o basso dura un bit.' },
      options: ['9,6 kHz', '19,2 kHz', '4,8 kHz', '38,4 kHz'],
      answer: 0,
      why: 'Un periodo dell\'onda contiene due bit, uno a 0 e uno a 1: f = 19 200 ÷ 2 = 9600 Hz = 9,6 kHz. Misurando questi fronti regolari, gli slave senza quarzo si adattano alla velocità del master.',
    },
    {
      id: 'bus-x-18', level: 3, topic: 'Accesso al bus', chapter: 'industria', type: 'match',
      q: 'Abbina ogni bus al modo in cui decide chi può trasmettere.',
      pairs: [['CAN', 'Vince l\'identificatore più basso'], ['FlexRay', 'Ogni nodo ha il suo slot di tempo'], ['Profibus', 'I master si passano un gettone'], ['Ethernet su coassiale', 'Dopo una collisione aspetta un tempo casuale']],
      why: 'CAN confronta gli identificatori bit per bit e vince il più basso. FlexRay divide il tempo in slot fissi (TDMA), come un orario ferroviario. In Profibus i master si passano un gettone (token). Ethernet, sul vecchio coassiale, usava CSMA/CD: dopo una collisione ognuno riprova dopo un tempo casuale.',
    },
    {
      id: 'bus-x-29', level: 3, topic: 'CAN', chapter: 'industria', type: 'choice',
      q: 'Un nodo CAN deve spedire sei bit 0 di fila. Che cosa mette davvero sul bus?',
      options: ['Cinque 0, un 1 aggiunto, poi l\'ultimo 0', 'Sei 0 di fila, senza aggiunte', 'Sei 0 e poi un 1 aggiunto', 'Tre 0, un 1 aggiunto e poi gli altri tre 0'],
      answer: 0,
      why: 'Dopo 5 bit uguali il trasmettitore inserisce un bit opposto (bit stuffing), che il ricevitore poi toglie: così sul bus ci sono abbastanza fronti per restare sincronizzati. L\'USB fa lo stesso, ma dopo sei 1 di fila.',
    },

    // ------------------------------------------------------------ Reti
    {
      id: 'bus-x-19', level: 1, topic: 'Ethernet', chapter: 'reti', type: 'order',
      q: 'Metti in ordine i campi di un frame Ethernet, dal primo che parte sul cavo.',
      items: ['Preambolo', 'Indirizzo MAC di destinazione', 'Indirizzo MAC di sorgente', 'Tipo', 'Dati', 'FCS (CRC-32)'],
      ends: ['Primo sul cavo', 'Ultimo sul cavo'],
      why: 'Il preambolo sincronizza il ricevitore; subito dopo viene la destinazione, così chi riceve capisce presto se il frame è per lui. Seguono sorgente, tipo, dati e il CRC-32 di controllo.',
    },
    {
      id: 'bus-x-20', level: 2, topic: 'Ethernet', chapter: 'reti', type: 'number',
      q: 'Una scheda di rete ha l\'indirizzo MAC 00:1A:2B:3C:4D:5E, scritto in esadecimale. Quanti bit contiene l\'indirizzo?',
      value: 48, unit: 'bit', tolerance: 0,
      why: 'Ogni coppia di cifre esadecimali è un byte: 6 byte × 8 bit = 48 bit. I primi 3 byte indicano il produttore della scheda, gli altri 3 la singola scheda.',
    },
    {
      id: 'bus-x-21', level: 1, topic: 'Ethernet', chapter: 'reti', type: 'truefalse',
      q: 'In una rete Ethernet in cui ogni dispositivo è collegato a uno switch in full-duplex, le collisioni non possono più avvenire.',
      answer: true,
      why: 'Vero: in full-duplex ogni dispositivo ha con lo switch un collegamento tutto suo, in cui trasmette e riceve nello stesso momento. Le collisioni c\'erano quando il mezzo era condiviso, sul coassiale o con gli hub, e serviva CSMA/CD.',
    },
    {
      id: 'bus-x-22', level: 3, topic: 'Ethernet', chapter: 'reti', type: 'number',
      q: 'Il frame Ethernet più corto misura 64 byte, dall\'indirizzo di destinazione all\'FCS compreso. Gli indirizzi MAC sono due da 6 byte, il campo tipo è di 2 byte e l\'FCS è un CRC a 32 bit. Quanti byte di dati porta al minimo?',
      value: 46, unit: 'byte', tolerance: 0,
      why: 'Il CRC a 32 bit occupa 4 byte: 64 − 6 − 6 − 2 − 4 = 46 byte. Se i dati sono meno, si aggiungono byte di riempimento: il frame minimo serviva a CSMA/CD per accorgersi in tempo delle collisioni.',
    },
    {
      id: 'bus-x-30', level: 1, topic: 'Ethernet', chapter: 'reti', type: 'choice',
      q: 'Dove nacque Ethernet, nel 1973?',
      options: ['Allo Xerox PARC', 'Ai Bell Labs', 'All\'IBM', 'Al CERN di Ginevra'],
      answer: 0,
      why: 'Il 22 maggio 1973 Bob Metcalfe scrisse allo Xerox PARC il promemoria che descriveva Ethernet: 2,94 Mbit/s su cavo coassiale. Nel 1983 diventò lo standard IEEE 802.3.',
    },
    {
      id: 'bus-x-31', level: 2, topic: 'Ethernet', chapter: 'reti', type: 'number',
      q: 'Quanto può essere lungo al massimo un cavo Ethernet in doppino di rame, dallo switch al computer?',
      value: 100, unit: 'm', tolerance: 0,
      why: 'Su doppino di rame un collegamento Ethernet arriva a 100 m: oltre, il segnale si attenua troppo. Per distanze maggiori si usa la fibra ottica, che arriva a diversi chilometri.',
    },

    // ------------------------------------------------------------ Tutti i bus a confronto
    {
      id: 'bus-mondi-1', level: 1, topic: 'Dove si usano', chapter: 'confronti', type: 'match',
      q: 'Abbina ogni bus al posto in cui lo trovi più spesso.',
      pairs: [['MIDI', 'Tastiere e sintetizzatori'], ['I²C', 'Sensori accanto al microcontrollore'], ['SATA', 'Dischi rigidi e SSD del PC'], ['LIN', 'Specchietti e alzacristalli dell\'auto'], ['Ethernet', 'Presa di rete dell\'ufficio']],
      why: 'MIDI collega tastiere e sintetizzatori; I²C i sensori al microcontrollore sulla stessa scheda; SATA i dischi del PC; LIN i comandi semplici dell\'auto, dove non serve la velocità del CAN; Ethernet i computer di una rete locale.',
    },
    {
      id: 'bus-x-32', level: 2, topic: 'Come funzionano', chapter: 'confronti', type: 'match',
      q: 'UART, SPI e I²C collegano chip vicini, l\'USB le periferiche. Abbina ognuno al modo in cui funziona.',
      pairs: [['UART', 'Asincrono, senza filo di clock'], ['SPI', 'Sincrono, un filo CS per ogni slave'], ['I²C', 'Sincrono su due fili, con indirizzi'], ['USB', 'Differenziale, comandato dall\'host']],
      why: 'UART: ogni carattere si sincronizza con il suo bit di start. SPI: il master sceglie lo slave con il suo filo Chip Select. I²C: SDA e SCL, e ogni slave ha un indirizzo a 7 bit. USB: D+ e D−, e i dispositivi parlano solo quando l\'host li interpella.',
    },
    {
      id: 'bus-x-33', level: 2, topic: 'Come funzionano', chapter: 'confronti', type: 'match',
      q: 'Dall\'automobile al PC: abbina ogni bus al modo in cui funziona.',
      pairs: [['CAN', 'Due fili differenziali, più master'], ['LIN', 'Un filo solo, un master e più slave'], ['SATA', 'Seriale punto-punto verso un disco'], ['PCI', 'Parallelo, indirizzi e dati sulle stesse linee']],
      why: 'CAN: CAN_H e CAN_L, e ogni nodo può trasmettere. LIN: un filo a 12 V e un master che decide chi parla. SATA: una coppia differenziale per direzione verso un solo disco. PCI: le linee AD portano prima l\'indirizzo e poi i dati.',
    },
    {
      id: 'bus-x-34', level: 3, topic: 'A che cosa servivano', chapter: 'confronti', type: 'match',
      q: 'Abbina ogni bus al lavoro per cui è nato.',
      pairs: [['SCSI', 'Dischi, nastri e scanner in catena'], ['ISA', 'Schede di espansione dell\'IBM PC'], ['GPIB', 'Strumenti di misura da laboratorio'], ['Porta parallela', 'Stampanti collegate al computer']],
      why: 'SCSI collegava in catena dischi, nastri e scanner, con un terminatore in fondo. ISA era il bus delle schede dell\'IBM PC del 1981. GPIB nacque in HP per comandare gli strumenti di misura da un computer. La porta parallela Centronics portava i caratteri alla stampante, un byte alla volta.',
    },
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
// Questo file va caricato PRIMA di banks/bus.js.
