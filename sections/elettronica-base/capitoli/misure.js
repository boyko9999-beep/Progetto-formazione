/*
 * Capitolo 10 · Strumenti di misura.
 * Schema dei campi: vedi il commento in capitoli/ohm.js. Figura: capitoli/misure.css (classi fig-misure-*).
 */
EB.capitolo({
  id: 'misure',

  apertura: 'La corrente non si vede, non fa rumore e non ha odore. Per sapere che cosa succede dentro un filo servono strumenti che la traducano in qualcosa che sappiamo leggere: una lancetta che si sposta, una cifra che cambia, una riga di luce.',

  intro: [
    'A prima vista un filo percorso da corrente è identico a uno in cui non passa nulla, e una pila scarica somiglia in tutto a una carica. Per capire che cosa fa un [[circuito]] bisogna misurarlo: quanta [[tensione]] c\'è tra due punti, quanta [[corrente]] passa in un filo, quanta [[resistenza]] oppone un componente. Ogni grandezza ha il suo strumento e un modo preciso di collegarlo. Sbagliare il collegamento può dare un numero falso o rovinare lo strumento.',
    'Torna all\'immagine dell\'acqua nei tubi. Per conoscere la differenza di pressione tra due punti basta un manometro collegato con due tubicini, che non ruba quasi acqua: è il [[voltmetro]], che si collega **in parallelo**, ai capi del componente. Per sapere quanti litri passano ogni secondo, invece, devi tagliare il tubo e far scorrere tutta l\'acqua in un contatore: è l\'[[amperometro]], che si inserisce **in serie**, aprendo il circuito.',
    'Per ogni strumento vale una regola: deve disturbare il meno possibile ciò che misura. Il voltmetro ha quindi una resistenza interna altissima, spesso milioni di [[ohm]], e assorbe una corrente minuscola; l\'amperometro ne ha una piccolissima, per non frenare la corrente che deve contare. L\'[[ohmmetro]] fa un altro mestiere: manda nel componente una piccola corrente prodotta dalla sua [[pila]] interna e, con la [[legge di Ohm]], calcola `R = V / I`. Per questo si usa a circuito spento.',
    'Oggi i tre strumenti stanno in uno solo, il [[multimetro]], che molti chiamano tester. Un selettore sceglie la grandezza e la [[portata]], i puntali vanno nelle boccole COM, VΩ e mA, un [[fusibile]] protegge l\'ingresso per le correnti. Nei modelli a lancetta lavora un [[galvanometro]] a bobina mobile, nei digitali un convertitore che trasforma la tensione in cifre. Per i segnali che cambiano troppo in fretta c\'è l\'[[oscilloscopio]], che disegna la tensione istante per istante.',
  ],

  figura: {
    alt: 'Strumento a bobina mobile visto di fronte: magnete permanente a ferro di cavallo con le espansioni polari N e S, nucleo di ferro fisso al centro, bobina di rame che ruota insieme alla lancetta, molla a spirale e scala da 0 a 10 mA con una striscia a specchio.',
    didascalia: 'Lo strumento a bobina mobile (ricostruzione schematica). La corrente fa ruotare la bobina nel campo del magnete finché la molla a spirale non la trattiene: più corrente, più rotazione. È il principio del galvanometro di Deprez e d\'Arsonval (1882), che Edward Weston rese portatile pochi anni dopo: da allora fa muovere le lancette di voltmetri, amperometri e tester.',
    svg: '<svg viewBox="28 12 304 226" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<linearGradient id="fig-misure-acciaio" gradientUnits="userSpaceOnUse" x1="108" y1="0" x2="252" y2="0"><stop offset="0" class="fig-misure-s1"/>' +
      '<stop offset=".07" class="fig-misure-s2"/><stop offset=".167" class="fig-misure-s1"/><stop offset=".5" class="fig-misure-s3"/><stop offset=".833" class="fig-misure-s1"/>' +
      '<stop offset=".9" class="fig-misure-s2"/><stop offset="1" class="fig-misure-s1"/></linearGradient><radialGradient id="fig-misure-ferro" cx=".36" cy=".32" r=".8">' +
      '<stop offset="0" class="fig-misure-s2"/><stop offset="1" class="fig-misure-s3"/></radialGradient></defs>' +
      '<path class="fig-misure-quadrante" d="M76.8 75.7A126 126 0 0 1 283.2 75.7L241.4 105A75 75 0 0 0 118.6 105Z"/>' +
      '<path class="fig-misure-specchio" d="M106.5 86.3A96 96 0 0 1 253.5 86.3L251.2 88.2A93 93 0 0 0 108.8 88.2Z"/>' +
      '<path class="fig-misure-arco" d="M103.4 83.7A100 100 0 0 1 256.6 83.7"/>' +
      '<path class="fig-misure-tacche" d="M103.4 83.7L95.7 77.3M109.3 77.3L106.5 74.5M115.7 71.4L111.2 66M122.6 66.1L120.3 62.8M130 61.4L125 52.7M137.7 57.4L136 53.7M145.8 54L143.4 47.5M154.1 51.4L153.1 47.5M162.6 49.5L160.9 39.7M171.3 48.4L170.9 44.4M180 48L180 41M188.7 48.4L189.1 44.4M197.4 49.5L199.1 39.7M205.9 51.4L206.9 47.5M214.2 54L216.6 47.5M222.3 57.4L224 53.7M230 61.4L235 52.7M237.4 66.1L239.7 62.8M244.3 71.4L248.8 66M250.7 77.3L253.5 74.5M256.6 83.7L264.3 77.3"/>' +
      '<text class="fig-misure-num" x="89.6" y="76.2" text-anchor="middle">0</text><text class="fig-misure-num" x="121" y="49.8" text-anchor="middle">2</text>' +
      '<text class="fig-misure-num" x="159.5" y="35.8" text-anchor="middle">4</text><text class="fig-misure-num" x="200.5" y="35.8" text-anchor="middle">6</text>' +
      '<text class="fig-misure-num" x="239" y="49.8" text-anchor="middle">8</text><text class="fig-misure-num" x="270.4" y="76.2" text-anchor="middle">10</text>' +
      '<text class="fig-misure-unita" x="180" y="70" text-anchor="middle">mA</text>' +
      '<path class="fig-misure-magnete" d="M108 116V202Q108 232 138 232H222Q252 232 252 202V116H228V200Q228 210 218 210H142Q132 210 132 200V116Z"/>' +
      '<path class="fig-misure-polo" d="M132 116H152L158.8 122.7A33 33 0 0 0 158.8 173.3L152 180H132Z"/>' +
      '<path class="fig-misure-polo" d="M228 116H208L201.2 122.7A33 33 0 0 1 201.2 173.3L208 180H228Z"/>' +
      '<path class="fig-misure-campo" d="M154.5 166.5L160.2 162.4M199.8 133.6L205.5 129.5M150 157.7L156.7 155.6M203.3 140.4L210 138.3M148.5 148L155.5 148M204.5 148L211.5 148M150 138.3L156.7 140.4M203.3 155.6L210 157.7M154.5 129.5L160.2 133.6M199.8 162.4L205.5 166.5"/>' +
      '<circle class="fig-misure-nucleo" cx="180" cy="148" r="23"/><g class="fig-misure-rotore"><rect class="fig-misure-bobina" x="150" y="143" width="60" height="10" rx="2.5"/>' +
      '<path class="fig-misure-spire" d="M153 145.5H207M153 148H207M153 150.5H207"/><path class="fig-misure-corrente" d="M153 145.5H207M153 148H207M153 150.5H207"/></g>' +
      '<path class="fig-misure-molla" d="M182.6 151.3L181.9 151.9L181 152.3L180.1 152.5L179.1 152.6L178.1 152.4L177.2 152L176.3 151.4L175.6 150.6L175.1 149.6L174.7 148.6L174.6 147.4L174.7 146.3L175.1 145.1L175.8 144.1L176.6 143.2L177.7 142.5L178.9 142L180.1 141.8L181.5 141.8L182.8 142.2L184 142.8L185.1 143.7L186 144.8L186.6 146.2L187 147.6L187 149.1L186.8 150.6L186.1 152L185.2 153.3L184.1 154.4L182.7 155.2L181.1 155.7L179.4 155.9L177.7 155.7L176.1 155.1L174.6 154.2L173.3 153L172.3 151.6L171.6 149.9L171.3 148.1L171.4 146.2L171.8 144.4L172.7 142.7L173.9 141.2L175.4 139.9L177.2 139.1L179.1 138.6L181.2 138.5L183.2 138.8L185.1 139.6L186.8 140.8L188.3 142.3L189.4 144.2L190.1 146.2L190.4 148.4L190.2 150.6L189.5 152.8L188.3 154.7L186.8 156.4L184.9 157.8L182.8 158.7L180.5 159.2L178.1 159.1L175.7 158.6L173.5 157.5L171.6 156L170 154.1L168.8 151.9L168.1 149.5L168 146.9L168.4 144.4L169.3 141.9L170.7 139.7L172.6 137.9L174.9 136.4L177.4 135.5L180.1 135.1L182.8 135.3L185.5 136.1L187.9 137.5L190.1 139.3L191.8 141.6L193 144.2L193.6 147L193.6 149.9L193 152.8L191.8 155.5L190.1 157.9L187.8 159.9L185.2 161.4L182.2 162.3L179.2 162.5L176.1 162.1L173.1 161.1L170.5 159.4L168.2 157.2L166 168.7"/>' +
      '<circle class="fig-misure-capocorda" cx="166" cy="168.7" r="2.3"/><g class="fig-misure-rotore">' +
      '<path class="fig-misure-lancetta" d="M178.3 148L179.45 46L180 40L180.55 46L181.7 148Z"/></g><circle class="fig-misure-perno" cx="180" cy="148" r="2.8"/>' +
      '<text class="fig-misure-polo-t" x="120" y="153" text-anchor="middle">N</text><text class="fig-misure-polo-t" x="240" y="153" text-anchor="middle">S</text>' +
      '<path class="fig-misure-guida" d="M163 114.5L173.3 136.4M205.5 114.5L200.6 147.2M180 189V171.5M101 214H110M259 172H223.5"/>' +
      '<circle class="fig-misure-punto" cx="173.6" cy="137.1" r="1.6"/><circle class="fig-misure-punto" cx="200.4" cy="148" r="1.6"/>' +
      '<circle class="fig-misure-punto" cx="180" cy="170.5" r="1.6"/><text class="fig-misure-t" x="166" y="111" text-anchor="end">molla</text>' +
      '<text class="fig-misure-t" x="200" y="111">bobina</text><text class="fig-misure-t" x="180" y="200" text-anchor="middle">nucleo di ferro</text>' +
      '<text class="fig-misure-t" x="98" y="211" text-anchor="end">magnete</text><text class="fig-misure-t" x="98" y="224" text-anchor="end">permanente</text>' +
      '<text class="fig-misure-t" x="262" y="169">espansione</text><text class="fig-misure-t" x="262" y="182">polare</text></svg>',
  },

  inBreve: [
    'Il voltmetro si collega in parallelo e ha una resistenza altissima; l\'amperometro si inserisce in serie e ha una resistenza bassissima.',
    'L\'ohmmetro misura con una sua piccola corrente, perciò si usa solo a circuito spento.',
    'Il multimetro riunisce i tre strumenti: con il selettore scegli grandezza e portata, e un fusibile protegge l\'ingresso per le correnti.',
    'L\'oscilloscopio disegna come cambia una tensione nel tempo.',
  ],

  formule: [
    { nome: 'Il conto dell\'ohmmetro', formula: 'R = V / I', legenda: [['R', 'resistenza del componente', 'ohm, Ω'], ['V', 'tensione ai suoi capi', 'volt, V'], ['I', 'corrente di prova dello strumento', 'ampere, A']], nota: 'La corrente di prova viene dalla pila del multimetro: un\'altra tensione nel circuito falserebbe il conto.' },
    { nome: 'Il circuito del laboratorio', formula: 'I = V / (R₁ + R₂)', legenda: [['I', 'corrente nel circuito', 'ampere, A'], ['V', 'tensione della pila', 'volt, V'], ['R₁, R₂', 'resistenze in serie', 'ohm, Ω']], nota: 'Con 9 V e 1 kΩ + 2 kΩ passano 3 mA; ai capi di R₂ ci sono 2 kΩ × 3 mA = 6 V.' },
  ],

  laboratori: [
    {
      id: 'misure',
      titolo: 'Il multimetro virtuale',
      consegna: 'Gira il selettore e appoggia i puntali sui punti del circuito: una pila da 9 V e due resistori da 1 kΩ e 2 kΩ. Ogni grandezza si misura in un modo diverso, e uno sbaglio può costare il fusibile dello strumento.',
      sfide: [
        { id: 'tensione-r2', testo: 'Misura la **tensione** ai capi di **R₂**.' },
        { id: 'corrente', testo: 'Misura la **corrente** del circuito: il multimetro va messo **in serie**.' },
        { id: 'resistenza', testo: 'Misura la **resistenza totale**, ma prima ricordati di **staccare la pila**.' },
        { id: 'fusibile', testo: 'Scopri perché l\'amperometro non va mai messo **in parallelo**: ci rimette il fusibile.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Misurare senza disturbare',
      paragrafi: [
        'Ogni strumento, collegandosi, cambia un po\' il circuito. Un voltmetro messo [[in parallelo|circuito in parallelo]] a un resistore apre una strada in più alla corrente: se avesse una resistenza piccola, ne ruberebbe parecchia e abbasserebbe proprio la tensione da misurare. Un multimetro digitale ha di solito una resistenza d\'ingresso di circa 10 MΩ: sui 9 V di una pila assorbe meno di un microampere.',
        'Con i vecchi tester a lancetta il problema si vedeva di più: uno strumento da 20 000 Ω/V (ohm per ogni volt di portata), sulla portata dei 10 V, offre al circuito solo 200 kΩ. In un [[partitore di tensione]] di due resistori da 1 MΩ alimentato a 12 V, ai capi di ciascuno ci sono 6 V: quel tester ne legge meno di 2, un multimetro digitale circa 5,7.',
        'L\'amperometro sta invece [[in serie|circuito in serie]], sulla strada della corrente, e la sua resistenza è quasi nulla. Collegarlo in parallelo a una pila è l\'errore classico: diventa un [[cortocircuito]], la corrente sale di colpo e, se va bene, salta il fusibile interno.',
      ],
    },
    {
      titolo: 'Lancetta o cifre',
      paragrafi: [
        'In uno strumento a lancetta la corrente attraversa una [[bobina]] leggera immersa nel [[campo magnetico]] di un [[magnete]] permanente, e la bobina ruota. Il nucleo di ferro e le espansioni polari curve rendono il campo radiale, sempre della stessa intensità: la rotazione è proporzionale alla corrente e le tacche della scala sono equidistanti. Una molla a spirale riporta la lancetta a zero e le correnti indotte nel telaio metallico smorzano le oscillazioni. Lo specchio lungo la scala aiuta a leggere dritto: la lancetta deve coprire il proprio riflesso.',
        'Il galvanometro da solo misura correnti minuscole: quello di un tester da 20 000 Ω/V va a fondo scala con 50 µA. Per le correnti più forti si collega in parallelo alla bobina una resistenza piccolissima, lo *shunt*, che si prende quasi tutta la corrente; per le tensioni si aggiunge in serie una resistenza grande. L\'ohmmetro a lancetta ha perfino la scala rovesciata: lo zero sta a destra, a fondo scala.',
        'Un multimetro digitale confronta invece la tensione d\'ingresso con un riferimento interno molto stabile e mostra il risultato in cifre. Anche le cifre hanno un limite. Un display da 2000 conteggi arriva al massimo a 1999: sulla portata dei 2 V legge fino a 1,999 V e oltre segna OL. Per seguire una grandezza che oscilla la lancetta resta la più comoda: l\'occhio vede subito se sale o se scende.',
      ],
    },
    {
      titolo: 'Misurare in sicurezza',
      paragrafi: [
        'Con una pila da 9 V puoi sbagliare senza danni: al massimo bruci un fusibile. La presa di casa è un\'altra storia: lì si misura solo con strumenti adatti e puntali integri, le dita dietro le protezioni, e chi non ha esperienza non misura affatto. I multimetri di qualità riportano una *categoria di misura* secondo le norme IEC 61010: CAT II per gli apparecchi collegati alle prese, CAT III per il quadro elettrico e l\'impianto fisso, CAT IV per l\'origine dell\'impianto, dove arriva la linea del distributore e un guasto può liberare più energia.',
        'Prima di toccare il circuito scegli funzione e portata, poi controlla le boccole: il puntale rosso nella boccola mA serve solo per le correnti. L\'ohmmetro va usato a circuito spento, dopo aver scaricato i [[condensatori|condensatore]], che possono restare carichi a lungo anche a interruttore aperto.',
      ],
    },
  ],

  sapevi: 'Nel 1858 il primo cavo telegrafico sotto l\'Atlantico collegò l\'Irlanda a Terranova, ma i segnali arrivavano debolissimi. William Thomson, il futuro Lord Kelvin, fissò un minuscolo magnete dietro uno specchietto appeso dentro una bobina: la luce di una lampada, riflessa su un righello graduato, trasformava ogni impulso in una macchia luminosa in movimento. Il cavo si guastò dopo poche settimane, anche perché l\'elettricista capo, Wildman Whitehouse, aveva cercato di rinforzare i segnali con tensioni altissime.',

  storia: [
    { anno: 1820, titolo: 'Il moltiplicatore', testo: 'Pochi mesi dopo la scoperta di Hans Christian Ørsted, a Halle, Johann Salomo Christoph Schweigger avvolge molte spire attorno a un ago magnetico: ogni giro somma il suo effetto e l\'ago devia anche con correnti deboli. Il nome *galvanometro*, in onore di Luigi Galvani, si attribuisce di solito ad André-Marie Ampère.', chi: 'Johann Salomo Christoph Schweigger' },
    { anno: 1825, titolo: 'Due aghi contro la Terra', testo: 'Leopoldo Nobili monta due aghi paralleli con i poli invertiti: il campo magnetico terrestre li spinge in versi opposti e il suo effetto quasi si annulla, mentre la corrente della bobina li fa ruotare. È il galvanometro *astatico*.', chi: 'Leopoldo Nobili' },
    { anno: 1882, titolo: 'Gira la bobina, non il magnete', testo: 'Marcel Deprez e Jacques-Arsène d\'Arsonval rovesciano lo schema: il magnete sta fermo e a ruotare è una bobina leggera, attorno a un cilindro di ferro fisso. Il campo del magnete, molto più forte di quello terrestre, rende lo strumento sensibile e quasi indifferente ai disturbi magnetici.', chi: 'Marcel Deprez e Jacques-Arsène d\'Arsonval' },
    { anno: 1888, titolo: 'Lo strumento diventa portatile', testo: 'A Newark, negli Stati Uniti, Edward Weston avvia la produzione dei primi voltmetri e amperometri portatili a lettura diretta: una lancetta sulla bobina mobile, due molle a spirale, un telaio metallico che smorza le oscillazioni.', chi: 'Edward Weston' },
    { anno: 1897, titolo: 'Il tubo di Braun', testo: 'A Strasburgo Karl Ferdinand Braun costruisce un tubo a vuoto in cui un fascio di raggi catodici accende un punto su uno schermo fluorescente, e una bobina devia il fascio al ritmo della corrente. È il primo oscilloscopio a tubo catodico. Nel 1909 Braun dividerà con Guglielmo Marconi il Nobel per la fisica, per la telegrafia senza fili.', chi: 'Karl Ferdinand Braun' },
    { anno: 1923, titolo: 'Ampere, volt, ohm', testo: 'Donald Macadie, ingegnere delle Poste britanniche, brevetta un unico strumento per corrente, tensione e resistenza: l\'AVO, da *amps*, *volts* e *ohms*, uno dei primi multimetri. All\'inizio misura solo in [[corrente continua]]; dal 1933 anche in alternata.', chi: 'Donald Macadie' },
    { anno: 1947, titolo: 'Un\'immagine che sta ferma', testo: 'A Portland, in Oregon, la Tektronix di Howard Vollum e Jack Murdock produce il modello 511, un oscilloscopio con la base dei tempi *a trigger*: ogni passata della traccia parte dallo stesso punto del segnale e l\'immagine sta ferma.', chi: 'Howard Vollum e Jack Murdock (Tektronix)' },
    { anno: 1954, annoTesto: 'anni 1950', titolo: 'Cifre al posto della lancetta', testo: 'Andrew Kay, con la sua Non-Linear Systems, costruisce quello che è considerato il primo voltmetro digitale: niente lancetta da interpretare, la tensione compare direttamente in cifre.', chi: 'Andrew Kay' },
    { anno: 1977, titolo: 'Il tester in tasca', testo: 'Fluke mette in vendita l\'8020A, un multimetro digitale tascabile con display a cristalli liquidi. Secondo l\'azienda ne verranno venduti più di 250 000 esemplari.', chi: 'Fluke' },
  ],

  glossario: [
    { termine: 'Multimetro', definizione: 'Strumento che riunisce voltmetro, amperometro e ohmmetro; un selettore sceglie grandezza e portata. Spesso lo si chiama tester.' },
    { termine: 'Voltmetro', definizione: 'Strumento che misura la tensione tra due punti. Si collega in parallelo e ha una resistenza interna altissima, per sottrarre al circuito pochissima corrente.' },
    { termine: 'Amperometro', definizione: 'Strumento che misura la corrente. Si inserisce in serie, aprendo il circuito, e ha una resistenza interna bassissima per non frenare la corrente.' },
    { termine: 'Ohmmetro', definizione: 'Strumento che misura la resistenza facendo passare nel componente una piccola corrente prodotta da una pila interna. Si usa solo a circuito spento.' },
    { termine: 'Oscilloscopio', definizione: 'Strumento che disegna su uno schermo come varia una tensione nel tempo: mostra segnali troppo rapidi per una lancetta o un display.' },
    { termine: 'Galvanometro', definizione: 'Strumento molto sensibile che rivela correnti piccole con la rotazione di un ago magnetico o di una bobina mobile; è il cuore degli strumenti a lancetta.' },
    { termine: 'Portata', definizione: 'Il valore più alto che uno strumento può misurare su una certa scala, per esempio 20 V. Oltre la portata la lancetta va a fondo scala e il display segna OL.' },
  ],
});
