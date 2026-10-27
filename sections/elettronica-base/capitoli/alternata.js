/*
 * Capitolo 9 · Corrente alternata e trasformatore.
 * Schema dei campi: vedi il commento in capitoli/ohm.js. Stili della figura in capitoli/alternata.css.
 */
EB.capitolo({
  id: 'alternata',

  apertura: 'Nella presa di casa la corrente non scorre in un verso solo: va avanti e indietro, cinquanta volte al secondo. Su questo andirivieni, alla fine dell\'Ottocento, si combatté una guerra industriale. A deciderla fu un oggetto di ferro e rame: il trasformatore.',

  intro: [
    'La corrente di una pila scorre sempre nello stesso verso: è la [[corrente continua]], quella di una torcia o di uno smartphone. La presa di casa fa una cosa diversa: la sua [[tensione]] sale, torna a zero, diventa negativa e risale, cinquanta volte al secondo, disegnando nel tempo un\'onda regolare, la [[sinusoide]]. La corrente la segue e cambia verso a ogni mezzo ciclo: è la [[corrente alternata]]. Nei fili, quindi, gli [[elettroni|elettrone]] non viaggiano dalla centrale fino a te: oscillano avanti e indietro, al massimo di qualche millesimo di millimetro.',
    'Come fa a essere utile una corrente che va e viene? Pensa a una sega: la lama avanza e arretra senza andare da nessuna parte, eppure taglia il legno. Allo stesso modo il filamento di una lampadina si scalda qualunque sia il verso della corrente, perché per l\'[[effetto Joule]] conta quanto è intensa, non da che parte va. Dalla centrale a casa tua viaggia l\'energia, non le cariche.',
    'Il numero di cicli completi in un secondo è la [[frequenza]], misurata in [[hertz]] (Hz): in Europa la rete lavora a 50 Hz, negli Stati Uniti e in Canada a 60 Hz. Il [[periodo]], la durata di un ciclo, è l\'inverso della frequenza: `T = 1 / f`, cioè 20 millisecondi a 50 Hz. Anche la tensione ha due misure. Il **picco** è il valore massimo dell\'onda; il [[valore efficace]] è la tensione continua che scalderebbe una resistenza allo stesso modo. Per una sinusoide `Veff = Vpicco / √2`: i 230 V della presa sono efficaci, e il picco arriva a circa 325 V.',
    'L\'asso nella manica dell\'alternata è il [[trasformatore]]: due [[bobine|bobina]] avvolte sullo stesso nucleo di ferro. La corrente alternata nella bobina *primaria* crea nel ferro un [[flusso magnetico]] che cambia di continuo e, per l\'[[induzione elettromagnetica]], questa variazione genera una tensione nella bobina *secondaria*. Le tensioni stanno tra loro come le spire: con 20 volte meno spire, la tensione è 20 volte più bassa. Con la corrente continua il flusso resta fermo e il secondario tace, a parte un breve impulso quando accendi e quando spegni.',
    'Ecco perché le reti elettriche di tutto il mondo funzionano in alternata. Un cavo disperde in calore una [[potenza]] `P = R · I²`: a parità di potenza trasportata, se alzi la tensione di 10 volte la corrente diventa 10 volte più piccola e le perdite 100 volte più piccole. Così l\'energia lascia le centrali a centinaia di migliaia di volt e i trasformatori la riportano, gradino dopo gradino, ai 230 V della tua presa.',
  ],

  figura: {
    alt: 'Un trasformatore: telaio rettangolare di lamierini di ferro, a sinistra la bobina primaria con molte spire sottili collegata a una sorgente alternata, a destra la secondaria con poche spire di filo grosso collegata a una lampadina accesa. Una linea verde tratteggiata segue il flusso nel ferro; un piccolo grafico ne mostra l\'andamento sinusoidale nel tempo.',
    didascalia: 'Nel trasformatore il flusso creato dal primario cambia verso a ogni mezzo periodo (la sinusoide, qui molto rallentata) e induce una tensione nel secondario, che con meno spire dà meno tensione ma più corrente: per questo ha il filo più grosso. Il nucleo chiuso, brevettato nel 1885 alla Ganz di Budapest, è ancora la forma dei trasformatori di oggi; i lamierini isolati frenano le correnti parassite che scalderebbero il ferro.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="fig-alternata-schermo" x="14" y="12" width="88" height="54" rx="8"/>' +
      '<path class="fig-alternata-griglia" d="M42 18V60M58 18V60M74 18V60"/>' +
      '<path class="fig-alternata-asse" d="M22 39H94"/>' +
      '<path class="fig-alternata-sinusoide" d="M26 39C31.2 31.8 36.2 25 42 25S52.8 31.8 58 39S68.2 53 74 53S84.8 46.2 90 39"/>' +
      '<g class="fig-alternata-cursore"><path class="fig-alternata-istante" d="M42 18V60"/><g class="fig-alternata-punto"><circle cx="42" cy="25" r="3.6"/></g></g>' +
      '<text class="fig-alternata-tb" x="18" y="29">Φ</text>' +
      '<text class="fig-alternata-t" x="95" y="43">t</text>' +
      '<path class="fig-alternata-sopra" d="M120 52L130 44H250L240 52Z"/>' +
      '<path class="fig-alternata-fianco" d="M240 52L250 44V180L240 188Z"/>' +
      '<path class="fig-alternata-fianco" d="M144 76H154V156L144 164Z"/>' +
      '<path class="fig-alternata-sopra" d="M144 164L154 156H216V164Z"/>' +
      '<path class="fig-alternata-lamierini" d="M122 50.4H242V186.4M124 48.8H244V184.8M126 47.2H246V183.2M128 45.6H248V181.6M146 76V162.4H216M148 76V160.8H216M150 76V159.2H216M152 76V157.6H216"/>' +
      '<path class="fig-alternata-nucleo" d="M120 52H240V188H120ZM144 76V164H216V76Z"/>' +
      '<path class="fig-alternata-flusso" d="M142 64H218Q228 64 228 74V166Q228 176 218 176H142Q132 176 132 166V74Q132 64 142 64Z"/>' +
      '<rect class="fig-alternata-avvolgimento" x="110" y="83" width="44" height="77" rx="5"/>' +
      '<path class="fig-alternata-spire fig-alternata-primario" d="M110 87.5q22 9 44 0M110 92.5q22 9 44 0M110 97.5q22 9 44 0M110 102.5q22 9 44 0M110 107.5q22 9 44 0M110 112.5q22 9 44 0M110 117.5q22 9 44 0M110 122.5q22 9 44 0M110 127.5q22 9 44 0M110 132.5q22 9 44 0M110 137.5q22 9 44 0M110 142.5q22 9 44 0M110 147.5q22 9 44 0M110 152.5q22 9 44 0"/>' +
      '<rect class="fig-alternata-avvolgimento" x="206" y="92" width="44" height="58" rx="5"/>' +
      '<path class="fig-alternata-spire fig-alternata-secondario" d="M206 98q22 9 44 0M206 109q22 9 44 0M206 120q22 9 44 0M206 131q22 9 44 0M206 142q22 9 44 0"/>' +
      '<path class="fig-alternata-filo" d="M110 87.5H68Q56 87.5 56 99.5V103M110 152.5H68Q56 152.5 56 140.5V137"/>' +
      '<path class="fig-alternata-filo" d="M250 98H286Q294 98 294 106V124H305M250 142H304Q312 142 312 135"/>' +
      '<circle class="fig-alternata-sorgente" cx="56" cy="120" r="17"/>' +
      '<path class="fig-alternata-onda" d="M45 120c2.5-7 8.5-7 11 0s8.5 7 11 0"/>' +
      '<circle class="fig-alternata-alone" cx="312" cy="100" r="25"/>' +
      '<path class="fig-alternata-vetro" d="M304.5 113A15 15 0 1 1 319.5 113L318 118H306Z"/>' +
      '<path class="fig-alternata-filamento" d="M308 117V105M316 117V105M308 105q2-5 4 0t4 0"/>' +
      '<rect class="fig-alternata-attacco" x="305" y="118" width="14" height="13" rx="2"/>' +
      '<path class="fig-alternata-filetti" d="M305 122.5H319M305 126.5H319"/>' +
      '<circle class="fig-alternata-punta" cx="312" cy="133" r="2.2"/>' +
      '<text class="fig-alternata-t" x="185" y="34" text-anchor="middle">nucleo in lamierini di ferro</text>' +
      '<text class="fig-alternata-tb" x="180" y="116" text-anchor="middle">flusso</text>' +
      '<text class="fig-alternata-tb" x="180" y="131" text-anchor="middle">Φ</text>' +
      '<text class="fig-alternata-t" x="132" y="206" text-anchor="middle">primario</text>' +
      '<text class="fig-alternata-t" x="132" y="220" text-anchor="middle">molte spire</text>' +
      '<text class="fig-alternata-t" x="228" y="206" text-anchor="middle">secondario</text>' +
      '<text class="fig-alternata-t" x="228" y="220" text-anchor="middle">poche spire</text>' +
      '</svg>',
  },

  inBreve: [
    'La corrente continua scorre sempre nello stesso verso; l\'alternata cambia verso a ogni mezzo ciclo, seguendo una sinusoide.',
    'In Europa la rete lavora a 50 Hz, un ciclo ogni 20 ms, e i 230 V della presa sono un valore efficace: il picco è di circa 325 V.',
    'Il trasformatore cambia la tensione nel rapporto tra le spire, `Vs / Vp = Ns / Np`, ma funziona solo con correnti che variano.',
    'A parità di potenza, l\'alta tensione riduce la corrente e quindi le perdite nei cavi, che crescono con il quadrato della corrente.',
  ],

  formule: [
    { nome: 'Frequenza e periodo', formula: 'T = 1 / f', legenda: [['T', 'periodo, durata di un ciclo', 'secondi, s'], ['f', 'frequenza, cicli al secondo', 'hertz, Hz']], nota: 'A 50 Hz un ciclo dura un cinquantesimo di secondo: 20 ms.' },
    { nome: 'Valore efficace di una sinusoide', formula: 'Veff = Vpicco / √2', legenda: [['Veff', 'tensione efficace', 'volt, V'], ['Vpicco', 'tensione di picco', 'volt, V']], nota: '√2 è circa 1,41: 230 V efficaci danno un picco di circa 325 V. La stessa regola vale per la corrente.' },
    { nome: 'Trasformatore ideale', formula: 'Vs / Vp = Ns / Np', legenda: [['Vp', 'tensione del primario', 'volt, V'], ['Vs', 'tensione del secondario', 'volt, V'], ['Np', 'spire del primario', 'numero puro'], ['Ns', 'spire del secondario', 'numero puro']], nota: 'Le correnti fanno il contrario: dove la tensione scende la corrente sale, e la potenza resta quasi la stessa.' },
  ],

  laboratori: [
    {
      id: 'alternata',
      titolo: 'Oscilloscopio e trasformatore',
      consegna: 'Sullo schermo dell\'oscilloscopio confronta la corrente continua con quella alternata. Poi alza e abbassa la tensione con il trasformatore e scopri perché le linee elettriche lavorano a centinaia di migliaia di volt.',
      sfide: [
        { id: 'rete', testo: 'Imposta la tensione di casa: **230 V efficaci a 50 Hz**. Quanto vale il picco?' },
        { id: 'continua', testo: 'Collega il trasformatore alla **corrente continua**: che cosa esce dal secondario?' },
        { id: 'dodici-volt', testo: 'Con il trasformatore, ricava **12 V** dai 230 V della rete.' },
        { id: 'linea', testo: 'Porta le perdite della linea elettrica **sotto l\'1%**.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'La guerra delle correnti',
      paragrafi: [
        'Le prime reti elettriche erano in corrente continua: il sistema di Thomas Edison distribuiva 110 V, ma per le perdite nei cavi ogni centrale arrivava solo ai clienti nel raggio di un chilometro circa. Con i trasformatori, invece, una sola centrale in alternata poteva servire un territorio molto più vasto: su questo puntò George Westinghouse.',
        'Edison rispose con una campagna sui pericoli dell\'alternata. Nel 1888 Harold Brown, aiutato dal laboratorio di Edison, uccise in pubblico alcuni cani con l\'alternata, e nel 1890 lo Stato di New York usò per la prima volta la sedia elettrica, alimentata da un [[generatore]] Westinghouse. Ma l\'alternata costava meno e arrivava più lontano: nel 1892 la società di Edison si fuse con la rivale Thomson-Houston nella General Electric, che presto passò anch\'essa all\'alternata.',
        'Oggi la continua si prende una piccola rivincita nei cavi sottomarini e nelle linee lunghissime: l\'elettronica di potenza la ricava dall\'alternata, ad altissima tensione, e all\'arrivo la riconverte. Così funziona anche il SA.PE.I., il cavo a 500 000 V inaugurato nel 2011 tra la Sardegna e il Lazio.',
      ],
    },
    {
      titolo: 'Dalla centrale alla tua presa',
      paragrafi: [
        'Il viaggio dell\'energia comincia con un salto verso l\'alto: all\'uscita della centrale un trasformatore porta la tensione a 380 000 o 220 000 V, sulla rete di trasmissione nazionale gestita da Terna. Poi si scende un gradino alla volta: 150 000 o 132 000 V verso le città, 15 000 o 20 000 V nella media tensione e infine, nelle cabine di quartiere, 400 V tra due fili di fase e 230 V tra fase e neutro: la tensione delle nostre case.',
        'Perché salire così in alto? Prendi una linea semplificata con 10 Ω di resistenza, che deve trasportare 100 MW. A 380 kV servono circa 263 A e le perdite sono di circa 0,7 MW, meno dell\'1%. A 20 kV servirebbero 5000 A e le perdite, 250 MW, supererebbero la potenza da trasportare: una linea così non potrebbe funzionare.',
      ],
    },
    {
      titolo: 'Trifase, e perché proprio 50 Hz',
      paragrafi: [
        'Le centrali non producono una sola sinusoide ma tre, sfasate di un terzo di periodo: è la [[corrente trifase]]. A parità di potenza richiede meno rame di tre linee separate e, come aveva intuito Galileo Ferraris, correnti sfasate tra loro creano un [[campo magnetico]] rotante, che fa girare i motori senza contatti striscianti. Tra due fasi la tensione è √3 volte quella tra fase e neutro: 230 V × 1,73 fa circa 400 V.',
        'E perché proprio 50 Hz? A fine Ottocento ogni costruttore sceglieva la sua frequenza, da meno di 20 a oltre 130 Hz: troppo bassa fa sfarfallare le lampade, troppo alta aumenta le perdite e non va d\'accordo con i motori. Negli Stati Uniti prevalsero i 60 Hz della Westinghouse, in Europa i 50 Hz della tedesca AEG, adottati intorno al 1891: perché proprio quei valori, nessuno lo ha mai chiarito del tutto.',
      ],
    },
  ],

  sapevi: 'Il Giappone ha due reti elettriche a frequenze diverse: 50 Hz nell\'est, con Tokyo, e 60 Hz nell\'ovest, con Osaka. Tutto risale al 1895, quando a Tokyo arrivò un generatore tedesco della AEG, seguito poco dopo a Osaka da uno americano della General Electric. Ancora oggi le due metà del Paese si scambiano energia solo attraverso poche stazioni di conversione.',

  storia: [
    { anno: 1882, titolo: 'La centrale di Pearl Street', testo: 'Il 4 settembre Thomas Edison avvia a New York la centrale di Pearl Street, in corrente continua a 110 V. Il primo giorno accende circa 400 lampade per un\'ottantina di clienti.', chi: 'Thomas Edison' },
    { anno: 1884, titolo: 'Lampade fino a Lanzo', testo: 'All\'Esposizione generale italiana di Torino, Lucien Gaulard e John Dixon Gibbs alimentano lampade fino alla stazione di Lanzo, a decine di chilometri, con i loro «generatori secondari» in corrente alternata. Galileo Ferraris ne studia la teoria; tra i visitatori c\'è l\'ungherese Ottó Bláthy.', chi: 'Lucien Gaulard e John Dixon Gibbs' },
    { anno: 1885, titolo: 'Nasce il trasformatore', testo: 'Alla Ganz di Budapest, Károly Zipernowsky, Ottó Bláthy e Miksa Déri brevettano un apparecchio migliore: nucleo di ferro chiuso e collegamento in parallelo, che rende ogni utenza indipendente dalle altre. Sono i primi a chiamarlo «trasformatore».', chi: 'Károly Zipernowsky, Ottó Bláthy e Miksa Déri' },
    { anno: 1888, titolo: 'Il campo che gira', testo: 'Il 18 marzo Galileo Ferraris presenta all\'Accademia delle Scienze di Torino le sue *Rotazioni elettrodinamiche*: due bobine percorse da correnti alternate sfasate creano un campo magnetico rotante, che fa girare un cilindro di rame. Ci lavorava dal 1885 e scelse di non brevettare la scoperta.', chi: 'Galileo Ferraris' },
    { anno: 1888, titolo: 'I brevetti di Tesla', testo: 'Il 16 maggio Nikola Tesla presenta a New York il suo sistema di motori e trasformatori a corrente alternata; a luglio George Westinghouse ne compra i brevetti. Ora l\'alternata può far girare le macchine, oltre che accendere le lampade.', chi: 'Nikola Tesla e George Westinghouse' },
    { anno: 1891, titolo: '175 chilometri di trifase', testo: 'Il 25 agosto l\'energia prodotta a Lauffen, sul Neckar, raggiunge l\'Esposizione elettrotecnica internazionale di Francoforte: 175 km di linea trifase a 15 000 V, con un rendimento di circa il 75%.', chi: 'Oskar von Miller, Michail Dolivo-Dobrovol\'skij e Charles E. L. Brown' },
    { anno: 1896, annoTesto: '1895 – 1896', titolo: 'L\'energia del Niagara', testo: 'Nell\'agosto 1895 entra in funzione la centrale Adams alle cascate del Niagara, con generatori Westinghouse in alternata da 5000 cavalli. Nel novembre 1896 la sua energia raggiunge Buffalo, a più di 30 km: è la vittoria decisiva dell\'alternata.', chi: 'Niagara Falls Power Company e Westinghouse' },
  ],

  glossario: [
    { termine: 'Corrente alternata', definizione: 'Corrente che inverte periodicamente il proprio verso, di solito seguendo una sinusoide. È quella della rete elettrica.' },
    { termine: 'Corrente continua', definizione: 'Corrente che scorre sempre nello stesso verso, come quella fornita da pile e batterie.' },
    { termine: 'Frequenza', definizione: 'Il numero di cicli completi che un fenomeno periodico compie in un secondo. Si misura in hertz (Hz).' },
    { termine: 'Hertz', definizione: 'Unità di misura della frequenza, simbolo Hz: 1 hertz è un ciclo al secondo. È dedicata al fisico tedesco Heinrich Hertz, che per primo dimostrò in laboratorio l\'esistenza delle onde elettromagnetiche.' },
    { termine: 'Periodo', definizione: 'La durata di un ciclo completo di un fenomeno periodico; è l\'inverso della frequenza.' },
    { termine: 'Valore efficace', definizione: 'Il valore della tensione o della corrente continua che in una resistenza produrrebbe lo stesso calore di quella alternata. Per una sinusoide è il picco diviso per √2.' },
    { termine: 'Trasformatore', definizione: 'Macchina con due o più bobine avvolte su un nucleo di ferro, che alza o abbassa una tensione alternata nel rapporto tra le spire. Con la corrente continua non funziona.' },
    { termine: 'Corrente trifase', definizione: 'Sistema di tre correnti alternate con la stessa frequenza, sfasate di un terzo di periodo. Si usa per trasportare l\'energia e per far girare i motori elettrici.' },
    { termine: 'Sinusoide', definizione: 'La curva della funzione seno: un\'onda regolare che sale e scende senza scatti. È la forma della tensione di rete.' },
  ],
});
