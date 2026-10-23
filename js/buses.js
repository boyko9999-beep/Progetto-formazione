/*
 * Contenuti didattici: un oggetto per ogni bus, con storia, funzionamento,
 * simulazione (generatore di js/encoders.js) e domande di verifica.
 */
(function (root) {
  'use strict';

  const CATEGORIES = [
    { id: 'seriali', name: 'Seriali classiche', color: 'var(--c-seriali)', intro: 'Un bit dopo l\'altro su un filo: il modo più antico e più semplice di comunicare, nato con il telegrafo.' },
    { id: 'chip', name: 'Tra i chip della scheda', color: 'var(--c-chip)', intro: 'Pochi fili e brevi distanze: così il microcontrollore parla con sensori, memorie, convertitori audio.' },
    { id: 'pc', name: 'Dentro il computer', color: 'var(--c-pc)', intro: 'I bus che collegano CPU, memoria e schede di espansione: dal parallelo largo al seriale velocissimo.' },
    { id: 'periferiche', name: 'Periferiche esterne', color: 'var(--c-periferiche)', intro: 'Stampanti, strumenti, dischi, videocamere: dalla porta parallela all\'USB-C.' },
    { id: 'industria', name: 'Industria, auto e aerei', color: 'var(--c-industria)', intro: 'Bus robusti contro disturbi, lunghe distanze e guasti: dove un errore può costare caro.' },
    { id: 'reti', name: 'Reti', color: 'var(--c-reti)', intro: 'Quando i dispositivi sono molti e lontani, il bus diventa una rete.' },
  ];

  // Tappe della preistoria: compaiono solo nella linea del tempo.
  const ROOTS = [
    { year: 1837, name: 'Telegrafo elettrico', text: 'Cooke e Wheatstone in Inghilterra, Morse negli Stati Uniti: per la prima volta un messaggio viaggia come impulsi elettrici su un filo. È il primo "protocollo seriale".' },
    { year: 1874, name: 'Codice Baudot', text: 'Émile Baudot codifica ogni lettera con 5 bit di lunghezza fissa. Il suo nome resta nell\'unità di misura "baud" (simboli al secondo).' },
    { year: 1908, name: 'Telescrivente start-stop', text: 'La Morkrum Company (Charles e Howard Krum) introduce i bit di start e di stop per sincronizzare ogni carattere: è esattamente il frame che usa ancora oggi ogni UART.' },
    { year: 1963, name: 'Codice ASCII', text: 'Nasce lo standard a 7 bit per lettere, numeri e comandi. Ancora oggi le lettere che scrivi nel simulatore viaggiano come codici ASCII.' },
  ];

  const BUSES = [
    // ------------------------------------------------------------ seriali
    {
      id: 'uart', name: 'UART', full: 'Universal Asynchronous Receiver-Transmitter', category: 'seriali',
      year: 1971, inventor: 'Western Digital (primo UART su un chip, WD1402A)',
      type: 'Seriale', sync: 'Asincrono', wires: '2 (TX, RX) + massa', topology: 'Punto-punto', speed: 'tipicamente 9600 – 921 600 baud', distance: 'pochi metri (livelli TTL: centimetri)',
      uses: 'Console di debug, moduli GPS e Bluetooth, Arduino, bootloader',
      story: [
        'L\'idea viene dalle telescriventi: ogni carattere è preceduto da un bit di start e seguito da un bit di stop, così trasmettitore e ricevitore non hanno bisogno di condividere un orologio.',
        'Nei primi computer questa logica era fatta con decine di componenti. Nel 1971 Western Digital la mise in un solo chip, il WD1402A. Nel 1987 il National Semiconductor 16550, con il suo buffer FIFO da 16 byte, diventò lo standard di tutte le porte COM dei PC.',
        'Oggi quasi ogni microcontrollore ha uno o più UART integrati: è ancora il modo più semplice per far parlare due circuiti.',
      ],
      how: [
        'A riposo la linea è a 1. Il bit di start (0) avvisa il ricevitore.',
        'Seguono 5-9 bit di dati, dal meno significativo, e un eventuale bit di parità.',
        'Il bit di stop (1) chiude il carattere. Entrambi i lati devono essere impostati sulla stessa velocità (baud rate), per esempio 115 200.',
        'La notazione "8N1" significa: 8 bit di dati, nessuna parità, 1 bit di stop.',
      ],
      fun: 'TX di un dispositivo va collegato a RX dell\'altro: il classico errore da laboratorio è collegare TX con TX.',
      sim: { gen: 'uart', opts: { name: 'TX' } },
      quiz: [
        { q: 'Perché l\'UART si chiama "asincrono"?', options: ['Perché non c\'è un filo di clock condiviso', 'Perché può trasmettere solo in una direzione', 'Perché i dati arrivano in ordine casuale'], answer: 0, why: 'Ogni carattere si sincronizza da solo grazie al bit di start; i due lati devono solo concordare la velocità.' },
        { q: 'Cosa significa la sigla 8N1?', options: ['8 bit di dati, nessuna parità, 1 bit di stop', '8 dispositivi, nessun master, 1 filo', '8 MHz, nessun errore, 1 canale'], answer: 0, why: 'È la configurazione più diffusa in assoluto.' },
      ],
    },
    {
      id: 'rs232', name: 'RS-232', full: 'Recommended Standard 232 (EIA, poi TIA-232)', category: 'seriali',
      year: 1960, inventor: 'Electronic Industries Association (EIA)',
      type: 'Seriale', sync: 'Asincrono (di solito)', wires: 'da 3 a 9 (DB9 o DB25)', topology: 'Punto-punto', speed: 'fino a 20 kbit/s da standard, 115 kbit/s in pratica', distance: 'circa 15 m',
      uses: 'Modem, terminali, strumenti di misura, macchine CNC, apparati di rete (porta console)',
      story: [
        'Nel 1960 l\'EIA pubblicò lo standard per collegare un terminale (DTE) a un modem (DCE): definiva connettori, livelli di tensione e segnali di controllo come RTS, CTS, DTR.',
        'Con i personal computer degli anni \'80 la "porta seriale" RS-232 diventò onnipresente: mouse, modem, stampanti. L\'USB l\'ha sostituita sui PC, ma resiste nell\'industria e sulle porte console dei router.',
      ],
      how: [
        'Il frame è quello dell\'UART, ma con tensioni alte e INVERTITE: 1 logico ("mark") = da -3 a -15 V, 0 logico ("space") = da +3 a +15 V.',
        'Le tensioni elevate rendono il segnale più robusto ai disturbi su qualche metro di cavo.',
        'Le linee RTS/CTS permettono il controllo di flusso hardware: "fermati, il mio buffer è pieno".',
        'Un chip come il MAX232 converte i livelli TTL del microcontrollore in livelli RS-232.',
      ],
      fun: 'Il cavo "null modem" incrocia TX e RX per collegare direttamente due computer senza modem.',
      sim: { gen: 'uart', opts: { name: 'TxD (livello RS-232)', inverted: true } },
      quiz: [
        { q: 'In RS-232 un 1 logico corrisponde a...', options: ['Una tensione negativa (da -3 a -15 V)', '+5 V', '0 V'], answer: 0, why: 'La logica è invertita: "mark" (1) è negativo.' },
        { q: 'A cosa servono RTS e CTS?', options: ['Al controllo di flusso hardware', 'A trasportare l\'alimentazione', 'A scegliere la velocità'], answer: 0, why: 'Request To Send e Clear To Send permettono di sospendere la trasmissione se il ricevitore è pieno.' },
      ],
    },
    {
      id: 'rs485', name: 'RS-485', full: 'TIA/EIA-485', category: 'seriali',
      year: 1983, inventor: 'Electronic Industries Association (EIA)',
      type: 'Seriale differenziale', sync: 'Asincrono (di solito)', wires: '2 (A, B) + massa', topology: 'Multipunto (bus)', speed: 'fino a 10 Mbit/s su brevi distanze', distance: 'fino a 1200 m',
      uses: 'Automazione industriale, Modbus, Profibus, impianti di riscaldamento e condizionamento, illuminazione da palco (DMX512)',
      story: [
        'L\'RS-232 non bastava per le fabbriche: troppo corto e solo punto-punto. Nel 1983 l\'EIA pubblicò l\'RS-485, che usa due fili intrecciati e permette di collegare decine di dispositivi sullo stesso cavo.',
        'Lo standard definisce solo la parte elettrica: sopra ci viaggiano protocolli come Modbus RTU, Profibus DP, DMX512 e BACnet.',
      ],
      how: [
        'Trasmissione differenziale: il ricevitore guarda la DIFFERENZA di tensione tra A e B, non il valore assoluto.',
        'Un disturbo elettrico colpisce entrambi i fili nello stesso modo e quindi si annulla.',
        'Fino a 32 "carichi unitari" sullo stesso bus (anche 256 con ricetrasmettitori moderni), half-duplex su 2 fili.',
        'Agli estremi del cavo servono resistenze di terminazione da 120 Ω per evitare riflessioni.',
      ],
      fun: 'Le luci dei concerti sono comandate con DMX512, che viaggia proprio su RS-485.',
      sim: { gen: 'uart', opts: { a: 'A', b: 'B', diff: true, devices: ['Master', 'Slave'] } },
      quiz: [
        { q: 'Perché l\'RS-485 resiste bene ai disturbi?', options: ['Usa la differenza di tensione tra due fili intrecciati', 'Usa tensioni di 230 V', 'Trasmette ogni bit tre volte'], answer: 0, why: 'Il disturbo di modo comune si annulla nella differenza.' },
        { q: 'A cosa servono le resistenze da 120 Ω agli estremi?', options: ['Evitano le riflessioni del segnale', 'Alimentano i dispositivi', 'Impostano l\'indirizzo'], answer: 0, why: 'Adattano l\'impedenza del cavo, così il segnale non "rimbalza" in fondo alla linea.' },
      ],
    },
    {
      id: 'midi', name: 'MIDI', full: 'Musical Instrument Digital Interface', category: 'seriali',
      year: 1983, inventor: 'Dave Smith (Sequential Circuits) e Ikutaro Kakehashi (Roland)',
      type: 'Seriale ad anello di corrente', sync: 'Asincrono', wires: '2 attivi (DIN a 5 poli)', topology: 'Catena (OUT → IN → THRU)', speed: '31 250 bit/s', distance: 'circa 15 m',
      uses: 'Tastiere, sintetizzatori, batterie elettroniche, luci, software musicali',
      story: [
        'Nel 1983, al NAMM Show, un Prophet-600 di Sequential Circuits e un Jupiter-6 di Roland suonarono insieme collegati da un cavo: era nato il MIDI.',
        'Dave Smith e Ikutaro Kakehashi decisero di non brevettarlo. Per questo è diventato lo standard universale degli strumenti elettronici e nel 2013 hanno ricevuto un Grammy tecnico.',
      ],
      how: [
        'È un UART a 31 250 baud (1 MHz diviso 32), 8N1.',
        'Usa un anello di corrente con optoisolatore: gli strumenti non condividono la massa, quindi niente ronzii.',
        'I messaggi sono brevi: Note On (0x90 + canale), numero della nota, velocity (quanto forte).',
        'MIDI non trasporta suono, ma istruzioni: "suona il Do centrale con questa forza".',
      ],
      fun: 'Il Do centrale del pianoforte è la nota MIDI numero 60.',
      sim: { gen: 'midi' },
      quiz: [
        { q: 'Cosa trasporta un cavo MIDI?', options: ['Comandi come "suona questa nota"', 'Audio digitale', 'Alimentazione per gli strumenti'], answer: 0, why: 'Sono istruzioni: il suono lo genera lo strumento che le riceve.' },
        { q: 'Perché il MIDI usa un optoisolatore?', options: ['Per separare elettricamente gli strumenti ed evitare ronzii', 'Per andare più veloce', 'Per trasmettere su fibra ottica'], answer: 0, why: 'Così non si formano anelli di massa.' },
      ],
    },

    // ------------------------------------------------------------ tra i chip
    {
      id: 'i2c', name: 'I²C', full: 'Inter-Integrated Circuit', category: 'chip',
      year: 1982, inventor: 'Philips Semiconductors (oggi NXP)',
      type: 'Seriale', sync: 'Sincrono', wires: '2 (SCL, SDA) + massa', topology: 'Bus multi-master', speed: '100 kbit/s, 400 kbit/s, 1 Mbit/s, 3,4 Mbit/s', distance: 'sulla stessa scheda (pochi metri al massimo)',
      uses: 'Sensori di temperatura e accelerometri, EEPROM, display OLED, orologi RTC, gestione batterie',
      story: [
        'Nei televisori Philips degli anni \'70-\'80 il microcontrollore doveva parlare con molti chip: tuner, audio, video. Collegarli tutti in parallelo richiedeva troppe piste. Nel 1982 Philips creò un bus a due soli fili.',
        'La specifica ufficiale 1.0 è del 1992; nel tempo sono arrivati il Fast-mode (400 kbit/s), l\'High-speed (3,4 Mbit/s, 1998) e il Fast-mode Plus (1 Mbit/s, 2007).',
        'Oggi lo trovi in quasi ogni scheda elettronica, spesso con il nome "TWI" (Two Wire Interface) usato da chi non voleva pagare la licenza.',
      ],
      how: [
        'SCL è il clock, generato dal master; SDA trasporta i dati in entrambe le direzioni.',
        'Uscite open-drain e resistenze di pull-up: un chip può solo tirare la linea a 0, mai spingerla a 1. Così due chip non vanno mai in cortocircuito.',
        'Ogni transazione inizia con START, un indirizzo a 7 bit e il bit R/W; ogni byte è confermato da un ACK.',
        'Più master possono convivere: se due iniziano insieme, perde chi per primo vede uno 0 dove aveva scritto 1.',
      ],
      fun: 'Molti sensori hanno 1-2 piedini per cambiare l\'indirizzo: così puoi metterne più di uno uguale sullo stesso bus.',
      sim: { gen: 'i2c', opts: { addr: 0x50 } },
      quiz: [
        { q: 'Come si riconosce la condizione di START in I²C?', options: ['SDA scende mentre SCL è alto', 'SCL resta basso per 10 ms', 'Il master invia il byte 0x00'], answer: 0, why: 'Durante i dati SDA cambia solo con SCL basso: un cambio con SCL alto è quindi un segnale speciale.' },
        { q: 'Perché I²C ha bisogno di resistenze di pull-up?', options: ['Perché i chip possono solo tirare le linee a 0', 'Per limitare la velocità', 'Per alimentare i sensori'], answer: 0, why: 'Le uscite sono open-drain: è la resistenza a riportare la linea a 1.' },
      ],
    },
    {
      id: 'smbus', name: 'SMBus', full: 'System Management Bus', category: 'chip',
      year: 1995, inventor: 'Intel (poi SBS Implementers Forum)',
      type: 'Seriale', sync: 'Sincrono', wires: '2 (SMBCLK, SMBDAT)', topology: 'Bus', speed: '10 – 100 kHz (fino a 1 MHz dalla 3.0)', distance: 'sulla scheda',
      uses: 'Batterie intelligenti dei portatili, sensori di temperatura della scheda madre, ventole, alimentatori (PMBus)',
      story: [
        'Nel 1995 Intel prese I²C e lo rese più rigoroso per gestire batterie e sensori nei PC. Il risultato è l\'SMBus, quasi compatibile con I²C.',
        'Le differenze sono nei dettagli: tensioni ben definite, timeout di 35 ms (se un dispositivo si blocca il bus si libera da solo) e comandi standard.',
      ],
      how: [
        'Elettricamente e nel frame è come I²C: START, indirizzo, ACK, dati, STOP.',
        'Aggiunge un timeout: un dispositivo che tiene il clock basso per più di 35 ms viene considerato bloccato.',
        'Può aggiungere un byte di controllo PEC (un CRC-8) alla fine dei messaggi.',
      ],
      fun: 'Quando il portatile ti dice "batteria al 73%", l\'informazione arriva via SMBus dal chip dentro la batteria.',
      sim: { gen: 'i2c', opts: { scl: 'SMBCLK', sda: 'SMBDAT', addr: 0x0b } },
      quiz: [
        { q: 'Da quale bus deriva SMBus?', options: ['I²C', 'SPI', 'USB'], answer: 0, why: 'È una versione di I²C con regole più rigide.' },
        { q: 'Cosa aggiunge SMBus rispetto a I²C?', options: ['Un timeout che sblocca il bus', 'Un terzo filo di clock', 'La trasmissione differenziale'], answer: 0, why: 'Il timeout di 35 ms evita che un dispositivo bloccato fermi tutto.' },
      ],
    },
    {
      id: 'i3c', name: 'I3C', full: 'Improved Inter-Integrated Circuit', category: 'chip',
      year: 2017, inventor: 'MIPI Alliance',
      type: 'Seriale', sync: 'Sincrono', wires: '2 (SCL, SDA)', topology: 'Bus', speed: '12,5 MHz (oltre 30 Mbit/s nei modi HDR)', distance: 'sulla scheda',
      uses: 'Smartphone, sensori, moduli di memoria DDR5',
      story: [
        'Negli smartphone i sensori erano tantissimi e I²C era diventato lento e affamato di energia. La MIPI Alliance (il consorzio degli standard per dispositivi mobili) pubblicò I3C nel 2017.',
        'Resta compatibile con molti dispositivi I²C, ma è molto più veloce e permette ai sensori di "alzare la mano" (interrupt) senza un filo in più.',
      ],
      how: [
        'Stessi due fili di I²C, ma il master pilota le linee in push-pull: i fronti sono rapidi e si arriva a 12,5 MHz.',
        'Gli indirizzi vengono assegnati dinamicamente all\'avvio.',
        'In-Band Interrupt: un sensore può chiedere attenzione direttamente sul bus.',
        'La simulazione mostra il frame in stile I²C che I3C usa per compatibilità.',
      ],
      fun: 'Le memorie DDR5 dei PC usano I3C per comunicare temperatura e configurazione.',
      sim: { gen: 'i2c', opts: { addr: 0x7e } },
      quiz: [
        { q: 'Perché I3C è più veloce di I²C?', options: ['Il master pilota le linee in push-pull', 'Usa otto fili', 'Comprime i dati'], answer: 0, why: 'Non deve aspettare che le resistenze di pull-up riportino su la linea.' },
      ],
    },
    {
      id: 'spi', name: 'SPI', full: 'Serial Peripheral Interface', category: 'chip',
      year: 1985, inventor: 'Motorola',
      type: 'Seriale', sync: 'Sincrono', wires: '4 (SCLK, MOSI, MISO, CS) + 1 CS per ogni slave', topology: 'Un master, più slave', speed: 'decine di MHz (oltre 100 MHz per le flash)', distance: 'sulla scheda',
      uses: 'Memorie flash (anche il BIOS del PC), schede SD, display, convertitori ADC/DAC, moduli radio',
      story: [
        'Motorola lo introdusse a metà anni \'80 nei suoi microcontrollori (come il 68HC11) per collegare periferiche in modo semplice e veloce.',
        'SPI non è mai stato uno standard ufficiale: è una convenzione così semplice che tutti l\'hanno copiata. Per questo esistono quattro "modi" diversi e nomi diversi per gli stessi fili.',
        'Le varianti Dual, Quad e Octal SPI usano più linee dati in parallelo: è così che si legge il firmware dalle flash moderne.',
      ],
      how: [
        'Il master abbassa il Chip Select dello slave con cui vuole parlare.',
        'A ogni colpo di clock un bit va dal master allo slave (MOSI) e uno torna indietro (MISO): full-duplex.',
        'Non ci sono indirizzi né ACK: per questo è velocissimo, ma serve un filo CS per ogni slave.',
        'CPOL e CPHA (i 4 modi) dicono quale fronte del clock usare per leggere: master e slave devono usare lo stesso modo.',
      ],
      fun: 'Dal 2022 i nomi ufficiali consigliati sono COPI/CIPO (Controller Out Peripheral In) invece di MOSI/MISO.',
      sim: { gen: 'spi' },
      quiz: [
        { q: 'Cosa significa full-duplex in SPI?', options: ['Dati in entrambe le direzioni contemporaneamente', 'Due master allo stesso tempo', 'Due clock diversi'], answer: 0, why: 'A ogni colpo di clock un bit va su MOSI e uno torna su MISO.' },
        { q: 'Come sceglie il master con quale slave parlare?', options: ['Abbassando il suo Chip Select', 'Mandando un indirizzo a 7 bit', 'Cambiando frequenza'], answer: 0, why: 'Ogni slave ha il suo filo CS.' },
      ],
    },
    {
      id: 'onewire', name: '1-Wire', full: '1-Wire', category: 'chip',
      year: 1989, inventor: 'Dallas Semiconductor (oggi Analog Devices)',
      type: 'Seriale', sync: 'Asincrono (a finestre temporali)', wires: '1 + massa', topology: 'Bus', speed: '16 kbit/s (142 kbit/s in overdrive)', distance: 'fino a qualche centinaio di metri',
      uses: 'Sensore di temperatura DS18B20, chiavi elettroniche iButton, riconoscimento di cartucce e batterie',
      story: [
        'Dallas Semiconductor lo progettò alla fine degli anni \'80: un solo filo per dati E alimentazione. Il prodotto più famoso è l\'iButton, una "moneta" di acciaio con dentro un chip, usata come chiave e badge.',
        'Ogni dispositivo esce dalla fabbrica con un numero di serie unico a 64 bit inciso nel silicio.',
      ],
      how: [
        'Il master avvia tutto con un impulso di reset lungo; i dispositivi rispondono con un impulso di presenza.',
        'Ogni bit è una finestra di circa 60 µs: un impulso basso corto vale 1, uno lungo vale 0.',
        'Alimentazione parassita: il dispositivo si carica un piccolo condensatore quando la linea è alta.',
        'Con l\'algoritmo "Search ROM" il master scopre tutti i numeri di serie collegati.',
      ],
      fun: 'A Istanbul, per molti anni, il biglietto dei mezzi pubblici (l\'Akbil) è stato un iButton da appendere al portachiavi.',
      sim: { gen: 'onewire' },
      quiz: [
        { q: 'Come distingue 1-Wire un bit 1 da un bit 0?', options: ['Dalla durata dell\'impulso basso', 'Dalla tensione', 'Dal colore del filo'], answer: 0, why: 'Impulso corto = 1, impulso lungo = 0.' },
        { q: 'Cosa significa "alimentazione parassita"?', options: ['Il dispositivo si alimenta dalla linea dati', 'Serve una batteria esterna', 'Il dispositivo ruba energia agli altri'], answer: 0, why: 'Accumula energia quando la linea è a riposo alta.' },
      ],
    },
    {
      id: 'i2s', name: 'I²S', full: 'Inter-IC Sound', category: 'chip',
      year: 1986, inventor: 'Philips Semiconductors',
      type: 'Seriale', sync: 'Sincrono', wires: '3 (SCK, WS, SD) + clock master opzionale', topology: 'Punto-punto', speed: 'qualche MHz (per esempio 48 kHz × 2 canali × 32 bit = 3 MHz)', distance: 'sulla scheda',
      uses: 'Collegare processori audio, convertitori DAC/ADC, microfoni digitali, amplificatori',
      story: [
        'Con l\'arrivo del CD (1982) l\'audio diventò digitale. Philips, coinventrice del CD, nel 1986 definì un bus semplice per far viaggiare i campioni audio tra i chip di un lettore.',
      ],
      how: [
        'SCK è il clock dei bit, WS (Word Select) dice se il campione è del canale sinistro (0) o destro (1).',
        'Il campione parte un colpo di clock dopo il cambio di WS, dal bit più significativo.',
        'Il flusso è continuo: niente indirizzi, niente pacchetti, solo campioni uno dopo l\'altro.',
      ],
      fun: 'Un CD audio contiene 44 100 campioni da 16 bit al secondo per ciascun canale.',
      sim: { gen: 'i2s' },
      quiz: [
        { q: 'A cosa serve la linea WS in I²S?', options: ['Indica se il campione è del canale sinistro o destro', 'Regola il volume', 'Accende l\'amplificatore'], answer: 0, why: 'Word Select alterna i due canali stereo.' },
      ],
    },
    {
      id: 'jtag', name: 'JTAG', full: 'Joint Test Action Group, IEEE 1149.1', category: 'chip',
      year: 1990, inventor: 'Joint Test Action Group (consorzio europeo, 1985)',
      type: 'Seriale', sync: 'Sincrono', wires: '4-5 (TCK, TMS, TDI, TDO, TRST)', topology: 'Catena (daisy chain)', speed: 'decine di MHz', distance: 'sulla scheda',
      uses: 'Collaudo delle saldature, programmazione di FPGA e microcontrollori, debug passo-passo del firmware',
      story: [
        'Con i chip in contenitori BGA i piedini finirono sotto il chip: impossibile toccarli con una sonda per il collaudo. Nel 1985 un gruppo di aziende fondò il Joint Test Action Group e nel 1990 nacque lo standard IEEE 1149.1.',
        'L\'idea era il "boundary scan": una catena di celle intorno a ogni piedino che si può leggere e scrivere serialmente. Poi lo si è usato per molto altro, soprattutto per il debug.',
      ],
      how: [
        'Ogni chip ha una macchina a stati (TAP) con 16 stati, pilotata dal solo segnale TMS.',
        'Negli stati di "Shift" i dati entrano da TDI ed escono da TDO, un bit per ogni colpo di TCK.',
        'Più chip si collegano in catena: il TDO di uno entra nel TDI del successivo.',
      ],
      fun: 'Molti hacker di hardware iniziano cercando i piedini JTAG dimenticati sulle schede dei router.',
      sim: { gen: 'jtag' },
      quiz: [
        { q: 'Quale segnale sposta la macchina a stati JTAG?', options: ['TMS', 'TDO', 'VCC'], answer: 0, why: 'Test Mode Select: il suo valore a ogni fronte di TCK decide il prossimo stato.' },
      ],
    },
    {
      id: 'axi', name: 'AMBA / AXI', full: 'Advanced Microcontroller Bus Architecture / Advanced eXtensible Interface', category: 'chip',
      year: 1996, inventor: 'ARM',
      type: 'Parallelo (interno al chip)', sync: 'Sincrono', wires: 'centinaia di segnali interni', topology: 'Interconnessione (switch)', speed: 'decine di GB/s', distance: 'dentro il silicio',
      uses: 'Collegare core, memoria, GPU e periferiche dentro i System-on-Chip di smartphone e FPGA',
      story: [
        'Un System-on-Chip contiene decine di blocchi progettati da aziende diverse. Nel 1996 ARM pubblicò AMBA, un insieme di bus "on-chip" gratuiti, così tutti potevano progettare blocchi compatibili.',
        'AXI è arrivato con AMBA 3 nel 2003 ed è oggi lo standard di fatto anche nelle FPGA.',
      ],
      how: [
        'Cinque canali indipendenti: indirizzo di lettura, dati letti, indirizzo di scrittura, dati scritti, risposta di scrittura.',
        'Ogni canale usa la stretta di mano VALID/READY: il trasferimento avviene solo quando entrambi sono a 1.',
        'Più transazioni possono essere in corso insieme e completarsi fuori ordine.',
      ],
      fun: 'Sono bus che non vedrai mai: esistono solo come fili microscopici dentro il chip.',
      sim: { gen: 'axi' },
      quiz: [
        { q: 'Quando avviene un trasferimento su un canale AXI?', options: ['Quando VALID e READY sono entrambi a 1', 'A ogni colpo di clock', 'Quando il bus è libero da 3 cicli'], answer: 0, why: 'È la regola della stretta di mano VALID/READY.' },
      ],
    },

    // ------------------------------------------------------------ dentro il computer
    {
      id: 'unibus', name: 'Unibus', full: 'Unibus (DEC PDP-11)', category: 'pc',
      year: 1970, inventor: 'Digital Equipment Corporation (DEC), Gordon Bell e Harold McFarland',
      type: 'Parallelo', sync: 'Asincrono (handshake)', wires: '56 linee', topology: 'Bus unico condiviso', speed: 'circa 1-2 MB/s', distance: 'circa 15 m',
      uses: 'Minicomputer PDP-11',
      story: [
        'Prima del PDP-11 ogni computer aveva collegamenti diversi tra CPU, memoria e periferiche. Con l\'Unibus DEC mise TUTTO sullo stesso bus: anche i registri delle periferiche erano semplici indirizzi di memoria.',
        'Questa idea, l\'I/O mappato in memoria, è usata ancora oggi da quasi tutti i processori. Sul PDP-11 sono nati anche Unix e il linguaggio C.',
      ],
      how: [
        'Indirizzi a 18 bit e dati a 16 bit su linee separate.',
        'Nessun clock: il master mette indirizzo e dato e attiva MSYN; lo slave risponde con SSYN quando ha finito. Un dispositivo lento semplicemente risponde più tardi.',
        'Un arbitro decide a chi tocca il bus in base alla priorità.',
      ],
      fun: 'Il PDP-11 ha venduto oltre 600 000 esemplari ed è stato usato in centrali nucleari fino a dopo il 2000.',
      sim: { gen: 'parbus', opts: { addr: 'A[17:0]', data: 'D[15:0]', wr: 'MSYN', ack: 'SSYN', base: 0o177560, addrDigits: 5, devices: ['CPU PDP-11', 'Terminale'], idleDesc: 'Bus libero. Nessun clock: tutto è regolato dalla stretta di mano MSYN/SSYN.', addrDesc: 'La CPU mette l\'indirizzo: anche le periferiche hanno un indirizzo come la memoria (I/O mappato in memoria).', dataDesc: 'Il dato è sulle linee e la CPU attiva MSYN: "Master SYNc, il dato è valido".', ackDesc: 'Lo slave attiva SSYN quando ha preso il dato: "Slave SYNc, fatto". Un dispositivo lento risponde semplicemente più tardi.' } },
      quiz: [
        { q: 'Che idea importante ha reso famosa l\'Unibus?', options: ['Periferiche indirizzate come se fossero memoria', 'Il primo bus senza fili', 'La trasmissione su fibra ottica'], answer: 0, why: 'L\'I/O mappato in memoria è usato ancora oggi.' },
      ],
    },
    {
      id: 's100', name: 'S-100', full: 'S-100 bus (IEEE 696)', category: 'pc',
      year: 1974, inventor: 'MITS (Altair 8800), Ed Roberts',
      type: 'Parallelo', sync: 'Sincrono', wires: '100 contatti', topology: 'Backplane con slot', speed: '2 MHz', distance: 'dentro il cabinet',
      uses: 'I primi personal computer hobbistici',
      story: [
        'L\'Altair 8800, in copertina su Popular Electronics nel gennaio 1975, aveva le schede montate su un connettore a 100 contatti preso da un magazzino di surplus. Quel connettore diventò un bus: l\'S-100.',
        'Decine di aziende produssero schede compatibili: è stato il primo standard aperto dei personal computer. Bill Gates e Paul Allen scrissero il loro primo BASIC proprio per l\'Altair.',
      ],
      how: [
        'Linee separate per indirizzi (16), dati in ingresso (8) e dati in uscita (8).',
        'Segue da vicino i segnali del processore Intel 8080.',
        'Le schede si inseriscono in slot tutti uguali: CPU, memoria, interfacce seriali.',
      ],
      fun: 'Il nome "S-100" significa semplicemente "Standard 100", dal numero di contatti.',
      sim: { gen: 'parbus', opts: { clk: 'Φ2', ale: 'pSYNC', addr: 'A15-A0', data: 'DO7-DO0', wr: 'pWR*', base: 0x1000, devices: ['CPU 8080', 'Scheda RAM'], idleDesc: 'Bus libero. Il clock Φ2 scandisce ogni operazione.', addrDesc: 'pSYNC segnala l\'inizio di un ciclo macchina; la CPU mette l\'indirizzo sulle 16 linee A.', dataDesc: 'Il dato va sulle linee "Data Out" e pWR* (attivo basso) chiede alla memoria di scriverlo.' } },
      quiz: [
        { q: 'Per quale computer nacque l\'S-100?', options: ['Altair 8800', 'IBM PC', 'Apple Macintosh'], answer: 0, why: 'MITS lo usò per le schede dell\'Altair nel 1974-75.' },
      ],
    },
    {
      id: 'isa', name: 'ISA', full: 'Industry Standard Architecture', category: 'pc',
      year: 1981, inventor: 'IBM (IBM PC 5150)',
      type: 'Parallelo', sync: 'Sincrono', wires: '62 contatti (8 bit), 98 (16 bit)', topology: 'Slot su scheda madre', speed: '4,77-8 MHz, circa 8 MB/s', distance: 'dentro il PC',
      uses: 'Schede audio, modem, schede di rete e video dei PC fino agli anni \'90',
      story: [
        'Il bus delle schede di espansione dell\'IBM PC (1981) era a 8 bit e a 4,77 MHz. Con il PC/AT del 1984 diventò a 16 bit. Siccome tutti i "compatibili IBM" lo copiavano, nel 1988 gli fu dato il nome ISA.',
        'Configurare le schede era un incubo: indirizzi, IRQ e canali DMA si sceglievano a mano con i jumper. Il "Plug and Play" del 1993 nacque per risolvere questo problema.',
      ],
      how: [
        'Indirizzi (20-24 bit) e dati (8-16 bit) su linee separate, scandite dal clock BCLK.',
        'BALE segnala che l\'indirizzo è valido; MEMW# o IOW# indicano una scrittura.',
        'Le schede possono chiedere attenzione con le linee di interrupt IRQ.',
      ],
      fun: 'Le Sound Blaster si configuravano quasi sempre con indirizzo 220h, IRQ 5 e DMA 1: generazioni di giocatori lo sanno a memoria.',
      sim: { gen: 'parbus', opts: { clk: 'BCLK', ale: 'BALE', addr: 'SA[19:0]', data: 'SD[7:0]', wr: 'IOW#', base: 0x220, addrDigits: 5, devices: ['CPU 8088', 'Scheda audio'], idleDesc: 'Bus libero, il clock BCLK gira.', addrDesc: 'BALE (Address Latch Enable) segnala che l\'indirizzo sulle linee SA è valido: ogni scheda controlla se è il suo.', dataDesc: 'La CPU mette il dato sulle linee SD e abbassa IOW#: "scrivi questo nella porta di I/O".' } },
      quiz: [
        { q: 'Come si configuravano le schede ISA prima del Plug and Play?', options: ['Con jumper e interruttori sulla scheda', 'Da Wi-Fi', 'Automaticamente dal BIOS'], answer: 0, why: 'Indirizzo, IRQ e DMA si sceglievano a mano.' },
      ],
    },
    {
      id: 'scsi', name: 'SCSI', full: 'Small Computer System Interface', category: 'pc',
      year: 1986, inventor: 'Shugart Associates (SASI, 1981), poi ANSI',
      type: 'Parallelo', sync: 'Asincrono o sincrono', wires: '50 o 68 fili', topology: 'Catena con terminatori', speed: 'da 5 a 320 MB/s', distance: 'da 1,5 a 25 m',
      uses: 'Dischi, scanner e unità a nastro di server e workstation; i primi Macintosh',
      story: [
        'Nel 1981 Shugart Associates propose SASI per collegare dischi senza dipendere dal costruttore. Standardizzato dall\'ANSI nel 1986 diventò SCSI (si pronuncia "scasi").',
        'Il protocollo SCSI sopravvive ancora oggi: i dischi SAS, le chiavette USB e lo storage iSCSI usano gli stessi comandi.',
      ],
      how: [
        'Fino a 8 o 16 dispositivi sulla stessa catena, ognuno con un ID.',
        'L\'ultimo dispositivo deve avere un terminatore, altrimenti i segnali rimbalzano.',
        'Il computer manda comandi standard (Read, Write, Inquiry) e il dispositivo li esegue da solo.',
      ],
      fun: 'Una chiavetta USB, internamente, riceve comandi SCSI.',
      sim: { gen: 'parbus', opts: { addrLabel: 'Comando', addr: 'Fase', data: 'DB[7:0]', wr: 'REQ', ack: 'ACK', base: 0x28, addrDigits: 2, width: 0, devices: ['Controller (initiator)', 'Disco (target)'], idleDesc: 'Bus libero (fase BUS FREE).', addrDesc: 'Fase COMMAND: il byte 0x28 è il codice del comando "READ(10)".', dataDesc: 'Il byte è sulle linee DB e REQ si attiva: "c\'è un byte".', ackDesc: 'L\'altro lato risponde con ACK. Ogni byte viaggia con questa stretta di mano REQ/ACK.' } },
      quiz: [
        { q: 'Cosa succede se manca il terminatore in una catena SCSI?', options: ['I segnali rimbalzano e si hanno errori', 'Va più veloce', 'Niente, è facoltativo'], answer: 0, why: 'Il terminatore assorbe il segnale in fondo alla linea.' },
      ],
    },
    {
      id: 'pci', name: 'PCI', full: 'Peripheral Component Interconnect', category: 'pc',
      year: 1992, inventor: 'Intel, poi PCI-SIG',
      type: 'Parallelo', sync: 'Sincrono', wires: '32 o 64 linee AD multiplexate + controllo', topology: 'Bus condiviso con slot', speed: '133 MB/s (32 bit, 33 MHz)', distance: 'dentro il PC',
      uses: 'Schede di rete, audio, video e controller dei PC dal 1993 al 2010 circa',
      story: [
        'All\'inizio degli anni \'90 l\'ISA era diventato un collo di bottiglia per le grafiche e le reti. Intel progettò il PCI e lo rese uno standard aperto gestito dal PCI-SIG.',
        'Introdusse il "Plug and Play" vero: ogni scheda ha uno spazio di configurazione con il suo codice di produttore e di dispositivo, e il sistema assegna le risorse da solo.',
      ],
      how: [
        'Le stesse 32 linee AD trasportano prima l\'indirizzo e poi i dati (bus multiplexato).',
        'FRAME# indica la durata della transazione; IRDY# e TRDY# dicono quando initiator e target sono pronti.',
        'In modalità burst passa una parola di 32 bit a ogni colpo di clock.',
        'Il bus è condiviso: un solo dispositivo alla volta può trasmettere.',
      ],
      fun: 'I numeri come "8086" che vedi negli elenchi delle periferiche sono il Vendor ID di Intel: 0x8086, come il suo processore.',
      sim: { gen: 'pci' },
      quiz: [
        { q: 'Cosa significa che PCI è un bus multiplexato?', options: ['Le stesse linee portano prima l\'indirizzo e poi i dati', 'Usa più frequenze radio', 'Ha più CPU'], answer: 0, why: 'Le linee AD[31:0] fanno entrambe le cose in fasi diverse.' },
        { q: 'Quando passa un dato su PCI?', options: ['Quando IRDY# e TRDY# sono entrambi bassi', 'Quando FRAME# è alto', 'Ogni 10 clock'], answer: 0, why: 'Initiator e target devono essere entrambi pronti.' },
      ],
    },
    {
      id: 'pcie', name: 'PCI Express', full: 'PCI Express (PCIe)', category: 'pc',
      year: 2003, inventor: 'Intel (progetto "3GIO"), PCI-SIG',
      type: 'Seriale differenziale, a corsie (lane)', sync: 'Clock incorporato nei dati', wires: '4 fili per corsia (x1, x4, x8, x16)', topology: 'Punto-punto con switch', speed: 'da 2,5 GT/s (1.0) a 64 GT/s (6.0) per corsia', distance: 'dentro il PC (decine di cm)',
      uses: 'Schede video, dischi NVMe, schede di rete, collegamento tra CPU e chipset',
      story: [
        'Un bus parallelo ad alta frequenza ha un problema: i bit sui diversi fili arrivano in tempi leggermente diversi (skew). La soluzione è stata tornare al seriale, ma velocissimo e su più corsie indipendenti.',
        'PCI Express 1.0 è del 2003. Ogni generazione ha circa raddoppiato la velocità: la 3.0 (2010) ha abbandonato l\'8b/10b per il più efficiente 128b/130b, la 6.0 (2022) usa segnali PAM4 a 4 livelli.',
        'Il software vede ancora tutto come se fosse PCI: compatibilità totale.',
      ],
      how: [
        'Ogni corsia (lane) ha una coppia differenziale per trasmettere e una per ricevere. Una scheda video x16 ne ha 16.',
        'Il clock non viaggia su un filo: il ricevitore lo ricostruisce dai fronti dei dati. Per questo serve una codifica come l\'8b/10b.',
        'Collegamenti punto-punto: ogni dispositivo ha la sua corsia, niente bus condiviso.',
        'I dati viaggiano in pacchetti (TLP) con numero di sequenza e CRC: se uno si rovina viene ritrasmesso.',
      ],
      fun: 'Un dato 8b/10b costa il 25% in più di bit: per questo PCIe 2.0 a 5 GT/s trasporta "solo" 4 Gbit/s di dati utili per corsia.',
      sim: { gen: 'pcie' },
      quiz: [
        { q: 'Perché PCIe è seriale invece che parallelo?', options: ['Ad alte frequenze i bit paralleli arrivano sfasati', 'Perché costa di più', 'Perché il parallelo è più lento a qualunque frequenza'], answer: 0, why: 'Lo skew tra fili diversi limita i bus paralleli; le corsie seriali sono indipendenti.' },
        { q: 'A cosa serve la codifica 8b/10b?', options: ['Bilanciare 0 e 1 e garantire fronti per ricostruire il clock', 'Cifrare i dati', 'Comprimere i dati'], answer: 0, why: 'Il ricevitore ricava il clock dalle transizioni del segnale.' },
      ],
    },
    {
      id: 'sata', name: 'SATA', full: 'Serial ATA', category: 'pc',
      year: 2003, inventor: 'Serial ATA Working Group (Intel, Seagate, Dell, Maxtor, APT)',
      type: 'Seriale differenziale', sync: 'Clock incorporato nei dati', wires: '7 (2 coppie + 3 masse)', topology: 'Punto-punto', speed: '1,5 / 3 / 6 Gbit/s', distance: '1 m',
      uses: 'Dischi rigidi, SSD da 2,5", masterizzatori',
      story: [
        'I dischi usavano il PATA (IDE): un cavo piatto a 40 o 80 fili, largo e scomodo. La specifica Serial ATA uscì nel 2001 e i primi dischi arrivarono nel 2003, con un cavo sottile a 7 fili.',
        'SATA III (2009) arriva a 6 Gbit/s. Gli SSD più veloci sono poi passati a NVMe su PCI Express.',
      ],
      how: [
        'Una coppia differenziale per direzione, codifica 8b/10b come PCIe 1.x e 2.x.',
        'Comandi ATA, gli stessi dei vecchi dischi IDE, impacchettati in frame.',
        'Supporta l\'hot-plug: puoi collegare un disco a computer acceso.',
      ],
      fun: 'Il connettore di alimentazione SATA ha contatti di lunghezze diverse, così massa e alimentazione si collegano prima dei segnali durante l\'hot-plug.',
      sim: { gen: 'sata' },
      quiz: [
        { q: 'Quale bus ha sostituito SATA?', options: ['PATA (IDE)', 'USB', 'PCI'], answer: 0, why: 'SATA ha reso seriale il vecchio collegamento parallelo dei dischi.' },
      ],
    },

    // ------------------------------------------------------------ periferiche
    {
      id: 'gpib', name: 'GPIB', full: 'General Purpose Interface Bus (HP-IB, IEEE-488)', category: 'periferiche',
      year: 1965, inventor: 'Hewlett-Packard',
      type: 'Parallelo (8 bit)', sync: 'Asincrono (handshake a 3 fili)', wires: '24', topology: 'Bus (a stella o in catena)', speed: '1 MB/s (8 MB/s con HS488)', distance: '20 m in totale',
      uses: 'Strumenti da laboratorio: oscilloscopi, multimetri, generatori di segnale',
      story: [
        'Alla fine degli anni \'60 Hewlett-Packard voleva comandare i suoi strumenti di misura da un computer. Creò l\'HP-IB, standardizzato nel 1975 come IEEE-488.',
        'I connettori si possono impilare uno sull\'altro, e ancora oggi molti strumenti da laboratorio hanno questa porta.',
      ],
      how: [
        '8 linee dati, 3 di handshake (DAV, NRFD, NDAC) e 5 di gestione.',
        'L\'handshake a tre fili fa andare il bus alla velocità del dispositivo più lento: nessun dato viene perso.',
        'Fino a 15 dispositivi; un controller decide chi parla (talker) e chi ascolta (listener).',
      ],
      fun: 'I comandi testuali che si mandano agli strumenti, come "*IDN?", sono nati sul GPIB (standard SCPI) e oggi si usano anche via USB ed Ethernet.',
      sim: { gen: 'gpib' },
      quiz: [
        { q: 'Chi decide la velocità del GPIB?', options: ['Il dispositivo più lento', 'Il computer', 'Il cavo'], answer: 0, why: 'L\'handshake aspetta che TUTTI i listener siano pronti.' },
      ],
    },
    {
      id: 'centronics', name: 'Porta parallela', full: 'Centronics, poi IEEE 1284', category: 'periferiche',
      year: 1970, inventor: 'Centronics Data Computer Corporation',
      type: 'Parallelo (8 bit)', sync: 'Asincrono (strobe/ack)', wires: '25 (DB25) o 36 (Centronics)', topology: 'Punto-punto', speed: '150 kB/s (fino a 2 MB/s con ECP)', distance: 'circa 5 m',
      uses: 'Stampanti, scanner, unità Zip, chiavi hardware',
      story: [
        'Nel 1970 Centronics presentò una stampante con un\'interfaccia parallela molto semplice. Era così pratica che divenne lo standard di fatto per tutte le stampanti.',
        'Nel 1994 lo standard IEEE 1284 aggiunse modalità bidirezionali (EPP, ECP). L\'USB l\'ha resa obsoleta all\'inizio degli anni 2000.',
      ],
      how: [
        'Otto fili dati: un intero byte viaggia in una volta.',
        'Il computer dà un impulso su STROBE; la stampante risponde con BUSY e poi con ACK.',
        'Le linee di stato dicono se la carta è finita (PE) o se c\'è un errore.',
      ],
      fun: 'Con 8 fili e qualche resistenza gli hobbisti la usavano per accendere LED e comandare motori: era la "GPIO" dei PC.',
      sim: { gen: 'parallel' },
      quiz: [
        { q: 'Quanti bit viaggiano contemporaneamente sulla porta parallela?', options: ['8', '1', '64'], answer: 0, why: 'Un intero byte su 8 fili.' },
      ],
    },
    {
      id: 'usb', name: 'USB', full: 'Universal Serial Bus', category: 'periferiche',
      year: 1996, inventor: 'Compaq, DEC, IBM, Intel, Microsoft, NEC, Nortel (Ajay Bhatt di Intel)',
      type: 'Seriale differenziale', sync: 'Clock incorporato (NRZI)', wires: '4 (USB 2.0), fino a 24 (USB-C)', topology: 'Stella a livelli con hub', speed: '1,5 Mbit/s (1.0) → 480 Mbit/s (2.0) → 80 Gbit/s (USB4 v2)', distance: '5 m (USB 2.0)',
      uses: 'Praticamente tutto: tastiere, mouse, memorie, telefoni, ricarica',
      story: [
        'A metà anni \'90 il retro del PC era una giungla: porta seriale, parallela, PS/2, joystick, ciascuna con il suo connettore. Sette aziende si unirono per creare un\'unica porta universale: USB 1.0 è del 1996.',
        'USB 2.0 (2000) portò 480 Mbit/s e la vittoria definitiva. Poi USB 3.0 (2008, 5 Gbit/s), il connettore reversibile USB-C (2014) e USB4 (2019) basato su Thunderbolt 3.',
      ],
      how: [
        'L\'host comanda sempre: i dispositivi parlano solo quando interpellati.',
        'D+ e D- sono una coppia differenziale. Codifica NRZI: uno 0 fa cambiare stato, un 1 lo lascia uguale.',
        'Dopo sei 1 consecutivi si inserisce uno 0 (bit stuffing), così il ricevitore vede abbastanza transizioni.',
        'Ogni pacchetto inizia con SYNC e un PID, finisce con un CRC e con lo stato SE0 (entrambi i fili bassi).',
      ],
      fun: 'Il connettore USB-A si gira mediamente tre volte prima di entrare: per questo è nato l\'USB-C reversibile.',
      sim: { gen: 'usb' },
      quiz: [
        { q: 'In codifica NRZI di USB, cosa fa uno 0?', options: ['Fa cambiare lo stato della linea', 'Lascia la linea uguale', 'Mette entrambi i fili a 0'], answer: 0, why: 'Lo 0 è una transizione J↔K, l\'1 è "nessun cambiamento".' },
        { q: 'Perché USB inserisce uno 0 dopo sei 1 di fila?', options: ['Per garantire transizioni al ricevitore', 'Per segnalare la fine del pacchetto', 'Per errore'], answer: 0, why: 'Senza transizioni il ricevitore perderebbe il sincronismo.' },
      ],
    },
    {
      id: 'firewire', name: 'FireWire', full: 'IEEE 1394 (FireWire, i.LINK)', category: 'periferiche',
      year: 1995, inventor: 'Apple, poi IEEE',
      type: 'Seriale differenziale', sync: 'Data-Strobe', wires: '4 o 6 (2 coppie + alimentazione)', topology: 'Albero peer-to-peer', speed: '400 Mbit/s (800 con 1394b)', distance: '4,5 m',
      uses: 'Videocamere digitali, schede audio professionali, dischi esterni dei Mac',
      story: [
        'Apple lo progettò alla fine degli anni \'80 e nel 1995 divenne lo standard IEEE 1394. Sony lo chiamava i.LINK.',
        'Era più veloce dell\'USB 1.1 e permetteva trasferimenti "isocroni" a banda garantita: perfetto per il video. Le videocamere MiniDV lo usavano tutte.',
      ],
      how: [
        'Due coppie differenziali: Data e Strobe.',
        'A ogni bit cambia esattamente una delle due linee: lo XOR di Data e Strobe ricostruisce il clock.',
        'Non serve un computer al centro: due dispositivi possono parlarsi direttamente.',
      ],
      fun: 'I primi iPod si sincronizzavano via FireWire.',
      sim: { gen: 'firewire' },
      quiz: [
        { q: 'Nella codifica Data-Strobe, quando cambia la linea Strobe?', options: ['Quando il bit di Data non cambia', 'A ogni bit', 'Mai'], answer: 0, why: 'Così a ogni bit commuta una e una sola linea.' },
      ],
    },
    {
      id: 'thunderbolt', name: 'Thunderbolt', full: 'Thunderbolt', category: 'periferiche',
      year: 2011, inventor: 'Intel con Apple',
      type: 'Seriale differenziale', sync: 'Clock incorporato', wires: 'USB-C (dalla versione 3)', topology: 'Catena (daisy chain)', speed: '10 → 40 → 80 Gbit/s (Thunderbolt 5)', distance: '0,8-2 m in rame, decine di metri in fibra',
      uses: 'Docking station, monitor, schede video esterne, dischi veloci',
      story: [
        'Nato come progetto "Light Peak" di Intel per usare la fibra ottica, arrivò nel 2011 sui MacBook Pro, in rame e sul connettore Mini DisplayPort.',
        'Thunderbolt 3 (2015) passò al connettore USB-C, e nel 2019 la sua tecnologia è diventata la base dello standard USB4.',
      ],
      how: [
        'Porta su un solo cavo PCI Express, DisplayPort e USB, in tunnel dentro gli stessi pacchetti.',
        'Più dispositivi si collegano in catena, uno dopo l\'altro.',
        'La simulazione mostra semplicemente bit NRZ su una coppia differenziale: la codifica reale è più sofisticata.',
      ],
      fun: 'Una scheda video esterna collegata via Thunderbolt per il computer è una normale scheda PCIe.',
      sim: { gen: 'nrz', opts: { p: 'TX+', n: 'TX-', devices: ['Computer', 'Dock'], desc: 'Bit in sequenza su una coppia differenziale: Thunderbolt incapsula PCIe, DisplayPort e USB in questo flusso.' } },
      quiz: [
        { q: 'Quale standard si basa su Thunderbolt 3?', options: ['USB4', 'HDMI 2.1', 'SATA'], answer: 0, why: 'Intel ha donato la specifica a USB-IF nel 2019.' },
      ],
    },

    // ------------------------------------------------------------ industria
    {
      id: 'mil1553', name: 'MIL-STD-1553', full: 'MIL-STD-1553 Digital Time Division Command/Response Multiplex Data Bus', category: 'industria',
      year: 1973, inventor: 'United States Air Force',
      type: 'Seriale differenziale', sync: 'Manchester II', wires: '2 (twinax schermato), ridondato', topology: 'Bus con stub accoppiati a trasformatore', speed: '1 Mbit/s', distance: 'circa 100 m',
      uses: 'Aerei militari (F-16), elicotteri, satelliti, Stazione Spaziale Internazionale',
      story: [
        'Negli aerei militari degli anni \'60 ogni sistema era collegato con un fascio di cavi dedicato: pesante e difficile da modificare. Nel 1973 l\'aeronautica statunitense pubblicò questo standard per far passare tutto su un unico bus ridondato.',
        'L\'F-16 fu uno dei primi aerei a usarlo. A cinquant\'anni di distanza è ancora usato in moltissimi velivoli e satelliti.',
      ],
      how: [
        'Un Bus Controller comanda; fino a 31 terminali remoti rispondono.',
        'Ogni parola è di 20 bit: 3 di sincronismo, 16 di dati, 1 di parità.',
        'Codifica Manchester: ogni bit ha una transizione al centro.',
        'Due bus identici (A e B): se uno si guasta si usa l\'altro.',
      ],
      fun: 'La tecnologia è così affidabile che è stata scelta anche per molti moduli della Stazione Spaziale Internazionale.',
      sim: { gen: 'mil1553' },
      quiz: [
        { q: 'Perché MIL-STD-1553 ha due bus, A e B?', options: ['Per ridondanza in caso di guasto', 'Uno per andata e uno per ritorno', 'Per raddoppiare la velocità'], answer: 0, why: 'In aereo un guasto non deve togliere la comunicazione.' },
      ],
    },
    {
      id: 'modbus', name: 'Modbus', full: 'Modbus RTU / ASCII / TCP', category: 'industria',
      year: 1979, inventor: 'Modicon (oggi Schneider Electric)',
      type: 'Protocollo su RS-485 / RS-232 / Ethernet', sync: 'Asincrono', wires: '2 (su RS-485)', topology: 'Master-slave (client-server su TCP)', speed: 'tipicamente 9600-115 200 baud', distance: 'fino a 1200 m su RS-485',
      uses: 'PLC, inverter, contatori di energia, caldaie e pompe di calore, impianti fotovoltaici',
      story: [
        'Modicon, l\'azienda che inventò il PLC, pubblicò Modbus nel 1979 per far comunicare i suoi controllori. Era semplice e senza diritti da pagare, e così è diventato il "linguaggio comune" dell\'automazione.',
        'Nel 1999 è arrivato Modbus TCP, che trasporta gli stessi messaggi su Ethernet.',
      ],
      how: [
        'Un master interroga gli slave numerati da 1 a 247; gli slave rispondono solo se interpellati.',
        'Ogni messaggio contiene: indirizzo, codice funzione (per esempio 03 = leggi registri, 06 = scrivi un registro), dati e CRC-16.',
        'I dati sono organizzati in "registri" da 16 bit e "coil" da 1 bit.',
        'In RTU il frame è delimitato da silenzi di almeno 3,5 caratteri.',
      ],
      fun: 'Moltissime caldaie e pompe di calore espongono la temperatura di mandata come un semplice registro Modbus.',
      sim: { gen: 'modbus' },
      quiz: [
        { q: 'Cosa fa la funzione Modbus 03?', options: ['Legge registri', 'Riavvia lo slave', 'Cambia l\'indirizzo'], answer: 0, why: 'Read Holding Registers: è la funzione più usata.' },
        { q: 'Come capisce lo slave dove inizia un frame Modbus RTU?', options: ['Da un silenzio di almeno 3,5 caratteri', 'Da un carattere speciale ":"', 'Da un filo di clock'], answer: 0, why: 'Il ":" è usato solo nella variante Modbus ASCII.' },
      ],
    },
    {
      id: 'can', name: 'CAN', full: 'Controller Area Network', category: 'industria',
      year: 1986, inventor: 'Robert Bosch GmbH',
      type: 'Seriale differenziale', sync: 'Asincrono con risincronizzazione', wires: '2 (CAN_H, CAN_L)', topology: 'Bus multi-master', speed: 'fino a 1 Mbit/s (CAN FD: 5-8 Mbit/s nei dati)', distance: '40 m a 1 Mbit/s, 500 m a 125 kbit/s',
      uses: 'Automobili, camion, trattori, macchine industriali, dispositivi medicali, ascensori',
      story: [
        'Nei primi anni \'80 un\'auto di lusso aveva chilometri di cavi. Bosch iniziò a sviluppare un bus per auto nel 1983 e lo presentò al congresso SAE di Detroit nel febbraio 1986.',
        'Nel 1987 Intel e Philips produssero i primi chip CAN. La prima auto di serie con CAN fu la Mercedes Classe S W140 del 1991. Nel 1993 divenne standard ISO 11898.',
        'Dal 2008 la diagnosi delle auto (la presa OBD-II) passa per legge dal CAN. Nel 2012 Bosch ha presentato CAN FD, più veloce e con fino a 64 byte di dati.',
      ],
      how: [
        'Non ci sono indirizzi: ogni messaggio ha un identificatore che dice cosa contiene (per esempio "giri motore").',
        'Livello dominante (0) e recessivo (1): se un nodo scrive 0 e un altro 1, vince lo 0.',
        'Arbitraggio senza perdite: se due nodi trasmettono insieme, vince l\'identificatore più basso e l\'altro riprova dopo, senza che nessun messaggio venga rovinato.',
        'Bit stuffing dopo 5 bit uguali, CRC a 15 bit, e ACK dato da tutti i nodi che hanno ricevuto bene.',
      ],
      fun: 'Un\'auto moderna contiene da 70 a oltre 100 centraline, collegate da più bus CAN.',
      sim: { gen: 'can', opts: { id: 0x123 } },
      quiz: [
        { q: 'Se due nodi CAN trasmettono insieme, chi vince?', options: ['Quello con l\'identificatore più basso', 'Quello più vicino', 'Il primo collegato al bus'], answer: 0, why: 'Lo 0 dominante prevale: l\'ID più basso ha più zeri nei bit alti.' },
        { q: 'Cosa identifica l\'ID di un messaggio CAN?', options: ['Il contenuto e la priorità del messaggio', 'L\'indirizzo del destinatario', 'Il numero di serie del nodo'], answer: 0, why: 'Tutti i nodi ricevono tutto; ognuno filtra gli ID che gli interessano.' },
      ],
    },
    {
      id: 'lin', name: 'LIN', full: 'Local Interconnect Network', category: 'industria',
      year: 1999, inventor: 'Consorzio LIN (Audi, BMW, DaimlerChrysler, Volkswagen, Volvo, Motorola, Volcano)',
      type: 'Seriale', sync: 'Asincrono (UART)', wires: '1 + massa (12 V)', topology: 'Un master, fino a 16 slave', speed: 'fino a 20 kbit/s', distance: '40 m',
      uses: 'Specchietti, sedili, alzacristalli, tergicristalli, sensori di pioggia, luci ambiente',
      story: [
        'Il CAN era troppo costoso per un motorino di specchietto. Nel 1998 alcune case automobilistiche fondarono il consorzio LIN e nel 1999 uscì la versione 1.0: un bus economico basato sull\'UART, con un solo filo.',
        'Oggi è standard ISO 17987 e ogni auto ne ha diversi, collegati alla rete CAN tramite una centralina che fa da master.',
      ],
      how: [
        'Il master manda l\'intestazione: un break lungo, il byte di sincronismo 0x55 e l\'identificatore.',
        'Lo slave che "possiede" quell\'identificatore risponde con i dati e un checksum.',
        'Lo 0x55 permette agli slave senza quarzo di misurare la velocità esatta del master.',
      ],
      fun: 'Quando regoli lo specchietto dall\'interruttore in portiera, il comando probabilmente viaggia su LIN.',
      sim: { gen: 'lin', opts: { id: 0x10 } },
      quiz: [
        { q: 'A cosa serve il byte 0x55 nel frame LIN?', options: ['A far misurare la velocità agli slave', 'A indicare un errore', 'A spegnere il bus'], answer: 0, why: '01010101 dà una serie di fronti regolari.' },
      ],
    },
    {
      id: 'profibus', name: 'Profibus', full: 'Process Field Bus', category: 'industria',
      year: 1989, inventor: 'Consorzio di aziende e università tedesche (Siemens tra i promotori)',
      type: 'Protocollo su RS-485', sync: 'Asincrono', wires: '2 (cavo viola)', topology: 'Bus', speed: 'da 9,6 kbit/s a 12 Mbit/s', distance: 'da 100 a 1200 m',
      uses: 'Fabbriche, impianti chimici, linee di produzione con PLC Siemens',
      story: [
        'Nel 1987 il governo tedesco finanziò un progetto per un bus di campo comune; nel 1989 nacque Profibus, poi standard europeo e mondiale (IEC 61158).',
        'Oggi molte nuove installazioni usano il successore su Ethernet, Profinet.',
      ],
      how: [
        'Fisicamente è RS-485 con caratteri UART da 11 bit (8 dati, parità pari, 1 stop).',
        'Il master interroga ciclicamente ogni slave; più master si passano un "gettone" (token).',
        'Il cavo è tipicamente viola, così in fabbrica si riconosce al volo.',
      ],
      fun: 'Un impianto può avere migliaia di dispositivi Profibus.',
      sim: { gen: 'uart', opts: { a: 'A', b: 'B', diff: true, parity: 'even', devices: ['PLC (master)', 'Valvola (slave)'] } },
      quiz: [
        { q: 'Su quale livello fisico viaggia Profibus DP?', options: ['RS-485', 'USB', 'Fibra ottica obbligatoria'], answer: 0, why: 'Usa RS-485 con caratteri a 11 bit.' },
      ],
    },
    {
      id: 'flexray', name: 'FlexRay', full: 'FlexRay', category: 'industria',
      year: 2006, inventor: 'Consorzio FlexRay (BMW, DaimlerChrysler, Motorola, Philips)',
      type: 'Seriale differenziale', sync: 'A divisione di tempo (TDMA)', wires: '2 (o 4 con doppio canale)', topology: 'Bus o stella', speed: '10 Mbit/s per canale', distance: '24 m',
      uses: 'Sospensioni attive, telaio e sistemi di sicurezza in auto di fascia alta',
      story: [
        'Per i comandi "by-wire" (sterzo o freni elettronici) non basta che un messaggio arrivi, deve arrivare SEMPRE nello stesso istante. Nel 2000 nacque il consorzio FlexRay; la prima auto fu la BMW X5 del 2006.',
      ],
      how: [
        'Il tempo è diviso in cicli e slot: ogni nodo trasmette nel suo slot prefissato, come un orario ferroviario.',
        'Due canali indipendenti per la ridondanza.',
        'Ogni byte è preceduto da una sequenza di sincronismo (BSS).',
      ],
      fun: 'Oggi molte funzioni FlexRay stanno migrando verso CAN FD e Ethernet automobilistica.',
      sim: { gen: 'flexray' },
      quiz: [
        { q: 'Cosa rende FlexRay deterministico?', options: ['Ogni nodo trasmette in uno slot di tempo prefissato', 'Usa la fibra ottica', 'Trasmette ogni messaggio due volte'], answer: 0, why: 'Divisione di tempo (TDMA): nessuna contesa.' },
      ],
    },

    // ------------------------------------------------------------ reti
    {
      id: 'ethernet', name: 'Ethernet', full: 'Ethernet (IEEE 802.3)', category: 'reti',
      year: 1973, inventor: 'Robert Metcalfe e David Boggs (Xerox PARC)',
      type: 'Seriale differenziale', sync: 'Clock incorporato (Manchester in 10BASE-T)', wires: '2-4 doppini (o fibra)', topology: 'In origine bus su coassiale, oggi stella con switch', speed: 'da 2,94 Mbit/s (1973) a 800 Gbit/s', distance: '100 m su rame, km su fibra',
      uses: 'Reti locali, data center, Internet, automazione (Profinet, EtherCAT), automobili',
      story: [
        'Il 22 maggio 1973 Bob Metcalfe scrisse allo Xerox PARC il memo che descriveva "Ethernet", ispirato alla rete radio ALOHAnet delle Hawaii. Funzionava a 2,94 Mbit/s su cavo coassiale.',
        'Nel 1980 Digital, Intel e Xerox pubblicarono lo standard a 10 Mbit/s; nel 1983 divenne IEEE 802.3. Con il 10BASE-T del 1990 arrivarono il doppino e il connettore RJ45.',
        'Da allora la velocità è cresciuta di oltre centomila volte, ma il formato del frame è rimasto lo stesso.',
      ],
      how: [
        'Ogni frame contiene preambolo, indirizzi MAC di destinazione e sorgente, tipo, dati e un CRC-32 (FCS).',
        'Nel 10BASE-T ogni bit ha una transizione a metà (codifica Manchester), così il clock viaggia con i dati.',
        'In origine tutti condividevano lo stesso cavo e le collisioni si gestivano con CSMA/CD: ascolta, trasmetti, e se c\'è una collisione aspetta un tempo casuale.',
        'Oggi gli switch danno a ogni dispositivo un collegamento full-duplex dedicato: niente più collisioni.',
      ],
      fun: 'Il nome viene dall\'"etere luminifero", il mezzo immaginario in cui l\'Ottocento credeva viaggiasse la luce.',
      sim: { gen: 'ethernet' },
      quiz: [
        { q: 'Nella codifica Manchester di 10BASE-T, cosa rappresenta un 1?', options: ['Una transizione dal basso all\'alto a metà bit', 'Una linea sempre alta', 'Un impulso doppio'], answer: 0, why: 'Ogni bit ha una transizione centrale: 1 sale, 0 scende.' },
        { q: 'A cosa serve l\'FCS alla fine del frame?', options: ['A scoprire errori di trasmissione (CRC-32)', 'A indicare il destinatario', 'A cifrare i dati'], answer: 0, why: 'Se il CRC non torna, il frame viene scartato.' },
      ],
    },
  ];

  root.BusData = { CATEGORIES: CATEGORIES, ROOTS: ROOTS, BUSES: BUSES };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BusData;
})(typeof window !== 'undefined' ? window : globalThis);
