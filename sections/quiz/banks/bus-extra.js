/*
 * Banca domande del quiz: sezione 9, Bus e protocolli (aggiunte scritte a mano).
 * QuizBusFixes ritocca le opzioni di alcune domande di BusLab (js/buses.js),
 * perché la risposta giusta non si riconosca dalla lunghezza; le domande nuove
 * fanno usare i bus: frame da riordinare, bit da accendere, tempi da calcolare,
 * forme d'onda da leggere. I capitoli sono le categorie di BusLab.
 */
(function (root) {
  'use strict';

  // Opzioni ritoccate di alcune domande di BusLab (vedi banks/bus.js), indicizzate per id.
  // La risposta giusta resta la prima: il motore mescola le opzioni.
  root.QuizBusFixes = {
    'bus-rs232-1': {
      options: ['Una tensione tra −3 e −15 V', 'Una tensione tra +3 e +15 V', 'Una tensione di circa +5 V', 'Una tensione di circa 0 V'],
      why: 'La logica è invertita: l\'1 ("mark") è tra −3 e −15 V, lo 0 ("space") tra +3 e +15 V. Un chip come il MAX232 converte questi livelli da e verso quelli TTL del microcontrollore.',
    },
    'bus-rs485-1': {
      options: ['Usa la differenza di tensione tra due fili', 'Usa tensioni più alte di quelle dell\'RS-232', 'Ritrasmette ogni byte finché arriva intatto', 'Aggiunge un bit di parità a ogni byte'],
      why: 'Il ricevitore guarda solo la differenza tra A e B: un disturbo colpisce allo stesso modo i due fili intrecciati e nella differenza si annulla. Così l\'RS-485 arriva fino a 1200 m.',
    },
    'bus-midi-2': {
      options: ['Per isolare gli strumenti ed evitare ronzii', 'Per trasmettere i dati su fibra ottica', 'Per raddoppiare la velocità di trasmissione', 'Per alimentare lo strumento che riceve'],
      why: 'Nell\'optoisolatore il segnale passa come luce: gli strumenti non condividono la massa, così non si formano anelli di massa che producono ronzii.',
    },
    'bus-i2c-2': {
      options: ['Perché i chip sanno solo tirare le linee a 0', 'Perché alimentano i sensori collegati al bus', 'Perché adattano l\'impedenza in fondo al cavo', 'Perché fissano l\'indirizzo di ogni dispositivo'],
      why: 'Le uscite I²C sono open-drain: un chip può solo collegare la linea a massa. È la resistenza di pull-up a riportarla a 1, così due chip non vanno mai in cortocircuito.',
    },
    'bus-i3c-1': {
      options: ['Il master pilota le linee in push-pull', 'Usa più fili dati che lavorano in parallelo', 'Comprime i dati prima di inviarli', 'Usa due coppie di fili differenziali'],
      why: 'In push-pull il master spinge la linea sia a 0 sia a 1: i fronti sono rapidi e non deve aspettare che le resistenze di pull-up la riportino su. Così I3C arriva a 12,5 MHz sugli stessi due fili.',
    },
    'bus-spi-1': {
      options: ['Dati nei due sensi nello stesso momento', 'Dati nei due sensi, ma uno alla volta', 'Due master che parlano nello stesso momento', 'Due clock separati, uno per direzione'],
      why: 'A ogni colpo di clock un bit va dal master allo slave su MOSI e uno torna indietro su MISO, nello stesso istante. Trasmettere a turno si chiama half-duplex, come in I²C.',
    },
    'bus-i2s-1': {
      options: ['Indica il canale, sinistro o destro', 'Porta il clock dei bit del campione', 'Regola il volume dei due canali stereo', 'Accende e spegne l\'amplificatore audio'],
      why: 'WS (Word Select) vale 0 per il campione del canale sinistro e 1 per il destro: i due canali si alternano sullo stesso filo SD. Il clock dei bit viaggia invece su SCK.',
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
      why: 'Il simbolo # indica un segnale attivo basso: IRDY# basso vuol dire initiator pronto, TRDY# basso target pronto. Il dato passa sul fronte del clock in cui sono pronti tutti e due.',
    },
    'bus-pcie-2': {
      options: ['A garantire fronti per ricostruire il clock', 'A comprimere i dati per risparmiare banda', 'A cifrare i dati contro chi ascolta sulla linea', 'A correggere i bit che arrivano sbagliati'],
      why: 'Ogni byte diventa un simbolo di 10 bit con abbastanza transizioni e con 0 e 1 bilanciati: il ricevitore ricava il clock dai fronti. Il prezzo è il 25% di bit in più.',
    },
    'bus-gpib-1': {
      options: ['Il dispositivo più lento', 'Il dispositivo più veloce', 'Il controller che comanda il bus', 'Un clock comune a tutti gli strumenti'],
      why: 'L\'handshake a tre fili (DAV, NRFD, NDAC) aspetta che tutti i listener siano pronti prima di ogni byte: nessun dato si perde, ma il bus va al passo del più lento.',
    },
    'bus-firewire-1': {
      options: ['Quando il bit di Data non cambia', 'Quando il bit di Data cambia', 'A ogni bit, come un clock', 'Solo all\'inizio di ogni pacchetto'],
      why: 'A ogni bit commuta una sola delle due linee: se Data cambia, Strobe resta ferma; se Data resta uguale, cambia Strobe. Lo XOR di Data e Strobe ricostruisce così il clock.',
    },
    'bus-lin-1': {
      options: ['A far misurare la velocità agli slave', 'A dire quale slave deve rispondere', 'A controllare che i dati siano corretti', 'A segnalare la fine del frame'],
      why: '0x55 è 0101 0101: con i bit di start e di stop la linea cambia a ogni bit. Misurando questi fronti regolari gli slave, che spesso non hanno un quarzo, si adattano alla velocità del master.',
    },
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
      id: 'bus-x-01', level: 1, topic: 'Frame UART', chapter: 'seriali', type: 'order',
      q: 'Un UART spedisce un carattere nel formato 8E1: 8 bit di dati, parità pari, 1 bit di stop. Metti in ordine i campi, dal primo che esce sul filo.',
      items: ['Bit di start', '8 bit di dati', 'Bit di parità', 'Bit di stop'],
      ends: ['Primo sul filo', 'Ultimo sul filo'],
      why: 'A riposo la linea è a 1: il bit di start (0) avvisa il ricevitore, poi arrivano i dati dal bit meno significativo, la parità e infine lo stop (1), che riporta la linea a riposo. In tutto sono 11 bit.',
    },
    {
      id: 'bus-x-02', level: 1, topic: 'Trasmissione differenziale', chapter: 'seriali', type: 'truefalse',
      q: 'La figura mostra i due fili di una linea differenziale, come quella dell\'RS-485. Se un disturbo alza di 1 V la tensione di entrambi i fili, il ricevitore legge un bit sbagliato.',
      figure: { kind: 'wave', shape: 'differential' },
      answer: false,
      why: 'Falso: il ricevitore guarda solo la differenza tra i due fili, e se tutti e due salgono di 1 V la differenza non cambia. Per questo l\'RS-485 usa fili intrecciati, che prendono lo stesso disturbo, e arriva fino a 1200 m.',
    },
    {
      id: 'bus-x-03', level: 2, topic: 'Velocità utile', chapter: 'seriali', type: 'number',
      q: 'Un UART a 9600 baud spedisce caratteri nel formato 8N1, uno dopo l\'altro senza pause. Quanti byte di dati passano al massimo in un secondo, in byte/s?',
      value: 960, unit: 'byte/s', tolerance: 1,
      why: 'Ogni carattere 8N1 occupa 10 bit sul filo: 1 di start, 8 di dati e 1 di stop. 9600 bit/s ÷ 10 = 960 byte/s: start e stop occupano il 20% dei bit.',
    },
    {
      id: 'bus-x-04', level: 3, topic: 'Ordine dei bit', chapter: 'seriali', type: 'bits',
      q: 'Su una linea UART in formato 8N1, dopo il bit di start arrivano nell\'ordine questi 8 bit di dati: 1, 0, 0, 0, 0, 0, 1, 0. Accendi i bit del byte ricevuto.',
      width: 8, value: 65,
      why: 'L\'UART spedisce i dati partendo dal bit meno significativo: il primo 1 vale 1, il settimo bit vale 64. Il byte è 0100 0001 = 0x41 = 65, la lettera "A" in ASCII.',
    },

    // ------------------------------------------------------------ Tra i chip della scheda
    {
      id: 'bus-x-05', level: 1, topic: 'Numero di fili', chapter: 'chip', type: 'match',
      q: 'Abbina ogni bus al numero di fili di segnale che usa nella versione base, senza contare la massa.',
      pairs: [['1-Wire', '1 filo'], ['I²C', '2 fili'], ['I²S', '3 fili'], ['SPI con un solo slave', '4 fili']],
      why: '1-Wire usa un solo filo per dati e alimentazione; I²C ha SDA e SCL; I²S ha SCK, WS e SD; SPI ha SCLK, MOSI, MISO e un CS per ogni slave.',
    },
    {
      id: 'bus-x-06', level: 2, topic: 'Transazione I²C', chapter: 'chip', type: 'order',
      q: 'Il master scrive un byte in un sensore I²C. Metti in ordine ciò che passa sul bus.',
      items: ['Condizione di START', 'Indirizzo a 7 bit', 'Bit R/W a 0 (scrittura)', 'ACK dello slave all\'indirizzo', 'Byte di dati e il suo ACK', 'Condizione di STOP'],
      ends: ['Primo sul bus', 'Ultimo sul bus'],
      why: 'START (SDA scende con SCL alto), poi l\'indirizzo a 7 bit e il bit R/W, che insieme formano il primo byte; lo slave conferma con un ACK. Seguono i dati, ognuno con il suo ACK, e lo STOP (SDA sale con SCL alto).',
    },
    {
      id: 'bus-x-07', level: 2, topic: 'Indirizzi I²C', chapter: 'chip', type: 'number',
      q: 'Un dispositivo I²C si riconosce dal suo indirizzo a 7 bit. Quanti indirizzi diversi si possono scrivere con 7 bit?',
      value: 128, unit: 'indirizzi', tolerance: 0,
      why: 'Con 7 bit si scrivono 2⁷ = 128 combinazioni, da 0 a 127 (da 0x00 a 0x7F). Sedici sono riservate a usi speciali: per i dispositivi restano 112 indirizzi.',
    },
    {
      id: 'bus-x-08', level: 2, topic: 'Bus sincrono', chapter: 'chip', type: 'bits',
      q: 'In figura un bus sincrono: il ricevitore legge DATA a ogni fronte di discesa di CLK, e il primo bit che arriva è il più significativo. Accendi i bit del byte trasmesso.',
      figure: { kind: 'wave', shape: 'clock-data' },
      width: 8, value: 178,
      why: 'A ogni discesa di CLK la traccia DATA vale 1, 0, 1, 1, 0, 0, 1, 0: il byte è 1011 0010 = 128 + 32 + 16 + 2 = 178 (0xB2). È il clock, sul suo filo, a dire al ricevitore quando leggere.',
    },

    // ------------------------------------------------------------ Dentro il computer
    {
      id: 'bus-x-09', level: 3, topic: 'Banda del PCI', chapter: 'pc', type: 'choice',
      q: 'Il clock del bus PCI in figura va a 33,3 MHz e, in modalità burst, a ogni colpo passa una parola di 32 bit. Quanti dati passano al massimo in un secondo?',
      figure: { kind: 'wave', shape: 'square', cycles: 6, label: 'PCI · 33,3 MHz' },
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
      id: 'bus-x-11', level: 2, topic: 'Codifica 8b/10b', chapter: 'pc', type: 'truefalse',
      q: 'Una corsia PCI Express 2.0 trasmette 5 GT/s, cioè 5 miliardi di bit al secondo sulla linea. Con la codifica 8b/10b, anche i dati utili arrivano a 5 Gbit/s.',
      answer: false,
      why: 'Falso: 8b/10b spedisce 10 bit per ogni 8 bit di dati, quindi i dati utili sono 5 × 8 ÷ 10 = 4 Gbit/s per corsia. Con la versione 3.0 PCIe è passato alla codifica 128b/130b, che spreca meno di 2 bit su 100.',
    },

    // ------------------------------------------------------------ Periferiche esterne
    {
      id: 'bus-x-12', level: 2, topic: 'Fine pacchetto USB', chapter: 'periferiche', type: 'choice',
      q: 'In figura i fili D+ e D− del cavo di un mouse USB: quando uno è alto, l\'altro è basso. In quale momento, invece, sono bassi tutti e due?',
      figure: { kind: 'wave', shape: 'differential' },
      options: ['Alla fine di ogni pacchetto', 'A ogni bit 0 dei dati', 'Durante il SYNC iniziale', 'Quando c\'è un errore di CRC'],
      answer: 0,
      why: 'Lo stato con entrambi i fili bassi si chiama SE0 (Single-Ended Zero) e chiude ogni pacchetto, subito dopo il CRC. Durante i dati i due fili sono sempre opposti e il ricevitore ne legge la differenza.',
    },
    {
      id: 'bus-x-13', level: 3, topic: 'Nomi dei segnali', chapter: 'periferiche', type: 'match',
      q: 'Abbina ogni collegamento ai nomi di alcuni suoi segnali.',
      pairs: [['USB', 'D+ e D−'], ['Porta seriale RS-232', 'TxD, RxD, RTS e CTS'], ['Porta parallela', 'STROBE, BUSY e ACK'], ['GPIB', 'DAV, NRFD e NDAC']],
      why: 'USB: la coppia differenziale D+ e D−. RS-232: TxD e RxD per i dati, RTS e CTS per il controllo di flusso. Porta parallela: STROBE dal computer, BUSY e ACK dalla stampante. GPIB: la stretta di mano a tre fili DAV, NRFD e NDAC.',
    },
    {
      id: 'bus-x-14', level: 1, topic: 'Host USB', chapter: 'periferiche', type: 'truefalse',
      q: 'Con l\'USB è l\'host, cioè il computer, a interrogare il mouse: il mouse trasmette i suoi dati solo quando viene interpellato.',
      answer: true,
      why: 'Vero: in USB l\'host comanda sempre e i dispositivi parlano solo quando sono interpellati. Per questo il computer interroga il mouse di continuo, a intervalli di pochi millisecondi.',
    },

    // ------------------------------------------------------------ Industria, auto e aerei
    {
      id: 'bus-x-15', level: 2, topic: 'Arbitraggio CAN', chapter: 'industria', type: 'order',
      q: 'Quattro nodi CAN iniziano a trasmettere nello stesso istante, con questi identificatori a 11 bit. In che ordine passano i loro messaggi?',
      items: ['ID 0x080', 'ID 0x123', 'ID 0x2A0', 'ID 0x5F0'],
      ends: ['Passa per primo', 'Passa per ultimo'],
      why: 'Vince l\'identificatore più basso: al primo bit in cui gli ID differiscono, il suo 0 dominante copre l\'1 degli altri. Chi perde riprova appena il bus si libera: 0x080, poi 0x123, 0x2A0 e 0x5F0.',
    },
    {
      id: 'bus-x-16', level: 1, topic: 'Durata di un bit', chapter: 'industria', type: 'number',
      q: 'Il bus CAN di un\'auto lavora a 500 kbit/s. Quanto dura un bit, in µs?',
      value: 2, unit: 'µs', tolerance: 0.05,
      why: 'T = 1 ÷ 500 000 bit/s = 0,000002 s = 2 µs. Nell\'arbitraggio ogni bit deve fare andata e ritorno su tutto il cavo prima di finire: per questo a 1 Mbit/s il bus arriva al massimo a circa 40 m.',
    },
    {
      id: 'bus-x-17', level: 3, topic: 'Sincronismo LIN', chapter: 'industria', type: 'choice',
      q: 'Un master LIN a 19 200 bit/s manda il byte di sincronismo 0x55. Con i bit di start e di stop la linea cambia livello a ogni bit, come l\'onda quadra in figura. Che frequenza ha quest\'onda?',
      figure: { kind: 'wave', shape: 'square', cycles: 5, label: '0x55 · 19 200 bit/s' },
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

    // ------------------------------------------------------------ Reti
    {
      id: 'bus-x-19', level: 1, topic: 'Frame Ethernet', chapter: 'reti', type: 'order',
      q: 'Metti in ordine i campi di un frame Ethernet, dal primo che parte sul cavo.',
      items: ['Preambolo', 'Indirizzo MAC di destinazione', 'Indirizzo MAC di sorgente', 'Tipo', 'Dati', 'FCS (CRC-32)'],
      ends: ['Primo sul cavo', 'Ultimo sul cavo'],
      why: 'Il preambolo sincronizza il ricevitore; subito dopo viene la destinazione, così chi riceve capisce presto se il frame è per lui. Seguono sorgente, tipo, dati e il CRC-32 di controllo.',
    },
    {
      id: 'bus-x-20', level: 1, topic: 'Codifica Manchester', chapter: 'reti', type: 'choice',
      q: 'In figura un collegamento con il clock su un filo a parte (CLK). Ethernet 10BASE-T non ha questo filo: come capisce il ricevitore quando leggere ogni bit?',
      figure: { kind: 'wave', shape: 'clock-data' },
      options: ['Dalla transizione a metà di ogni bit', 'Da un quarzo identico in ogni scheda', 'Dal bit di start di ogni byte', 'Da un impulso di clock ogni 8 bit'],
      answer: 0,
      why: 'Con la codifica Manchester ogni bit ha un fronte al centro: l\'1 sale, lo 0 scende. Il ricevitore si aggancia a questi fronti e ricostruisce il clock, che così viaggia insieme ai dati.',
    },
    {
      id: 'bus-x-21', level: 2, topic: 'Switch e collisioni', chapter: 'reti', type: 'truefalse',
      q: 'In una rete Ethernet con switch, ogni dispositivo ha un collegamento full-duplex tutto suo: per questo le collisioni spariscono.',
      answer: true,
      why: 'Vero: sul vecchio cavo coassiale tutti condividevano lo stesso mezzo e serviva CSMA/CD. Lo switch dà a ogni porta un collegamento dedicato, in cui si trasmette e si riceve nello stesso momento.',
    },
    {
      id: 'bus-x-22', level: 3, topic: 'Frame minimo', chapter: 'reti', type: 'number',
      q: 'Il frame Ethernet più corto misura 64 byte, dall\'indirizzo di destinazione all\'FCS compreso. Gli indirizzi MAC sono due da 6 byte, il campo tipo è di 2 byte e l\'FCS è un CRC a 32 bit. Quanti byte di dati porta al minimo?',
      value: 46, unit: 'byte', tolerance: 0,
      why: 'Il CRC a 32 bit occupa 4 byte: 64 − 6 − 6 − 2 − 4 = 46 byte. Se i dati sono meno, si aggiungono byte di riempimento: il frame minimo serviva a CSMA/CD per accorgersi in tempo delle collisioni.',
    },
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
// Questo file va caricato PRIMA di banks/bus.js.
