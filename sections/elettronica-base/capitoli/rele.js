/*
 * Capitolo 8 · Elettromagnete e relè.
 * Schema come in capitoli/ohm.js; stili e animazioni della figura in capitoli/rele.css.
 */
EB.capitolo({
  id: 'rele',

  apertura: 'Un filo avvolto su un pezzo di ferro, una molla, due contatti: quando passa la corrente, l\'ancora scatta con un clic. Con quel clic l\'Ottocento ha mandato messaggi da una città all\'altra e il Novecento ha costruito i primi calcolatori.',

  intro: [
    'Avvolgi un filo di rame isolato intorno a un chiodo di ferro e collega i due capi a una [[pila]] per qualche secondo: il chiodo attira le graffette. Stacca un capo e le graffette cadono. Hai costruito un [[elettromagnete]], una [[calamita|magnete]] che si accende e si spegne con la [[corrente]]. Nel capitolo sul magnetismo hai visto che un filo percorso da corrente crea un [[campo magnetico]]; avvolto in tante spire diventa una [[bobina]], e i campi delle spire si sommano. Il ferro fa il resto: si magnetizza e rende il campo molto più intenso.',
    'Quanto è forte un elettromagnete? Dipende dalle spire e dalla corrente. In una bobina lunga e regolare, un [[solenoide]], il campo all\'interno vale `B = μ₀ · N · I / l`: se raddoppi le spire o la corrente, il campo raddoppia. William Sturgeon, che nel 1825 presentò a Londra il primo elettromagnete vero e proprio, usava diciotto spire di filo nudo. L\'americano Joseph Henry rivestì il filo di seta, un [[isolante]], e ne avvolse molti strati uno sopra l\'altro: nel 1831 un suo elettromagnete reggeva più di 900 chili.',
    'Un elettromagnete sa muovere le cose, e il movimento più utile è aprire e chiudere un altro [[circuito]]. È il [[relè]]: la bobina attira un\'[[ancora]] di ferro, l\'ancora chiude due contatti, una molla la riporta indietro quando la corrente si ferma. Il nome viene dal francese *relais*, la stazione di posta dove si cambiavano i cavalli stanchi con cavalli freschi. Il relè fa lo stesso con i segnali: riceve una corrente debole, magari arrivata da chilometri di filo, e al suo posto ne fa partire una nuova, presa da una pila vicina.',
    'Con i relè il [[telegrafo]] poté coprire distanze enormi: lungo la linea, ogni relè ripeteva i punti e le linee del [[codice Morse]] con forze fresche. Poi i relè impararono a smistare le telefonate nelle centrali automatiche e, negli anni Trenta e Quaranta del Novecento, a fare i conti: un relè è aperto o chiuso, zero o uno. Oggi li senti ancora scattare nelle caldaie, nelle lavatrici e nelle automobili, e la loro logica vive nei chip, come vedrai nella sezione «Porte logiche e nascita dei chip».',
  ],

  figura: {
    alt: 'Disegno di un relè da telegrafo visto di lato, su una base di legno: i fili della linea entrano in una bobina di rame avvolta su un nucleo di ferro; sopra, una leva di ottone con l\'ancora di ferro ruota su un fulcro ed è tirata da una molla; a destra due contatti chiudono il circuito locale, con una pila e una lampadina.',
    didascalia: 'Un relè telegrafico (ricostruzione). La debole corrente della linea magnetizza il nucleo, che attira l\'ancora: la leva ruota e chiude i contatti del circuito locale, alimentato da una pila vicina, e il segnale riparte con forze fresche. Nell\'animazione il relè batte la lettera A del codice Morse, un punto e una linea.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="fig-rele-bagliore"><stop offset="0" class="fig-rele-g0"/><stop offset=".5" class="fig-rele-g1"/><stop offset="1" class="fig-rele-g2"/></radialGradient></defs>' +
      '<rect class="fig-rele-legno" x="12" y="194" width="336" height="16" rx="4"/>' +
      '<path class="fig-rele-venatura" d="M30 201h44M100 205h66M222 200h40M288 205h42"/>' +
      '<path class="fig-rele-filo" d="M8 134h80M8 150h80"/>' +
      '<g class="fig-rele-campo">' +
      '<path d="M95 83C66 82 58 112 60 140C62 168 70 186 80 190"/>' +
      '<path d="M99 90C82 95 74 116 75 140C76 162 79 178 84 186"/>' +
      '<path d="M133 83C162 82 170 112 168 140C166 168 158 186 148 190"/>' +
      '<path d="M129 90C146 95 154 116 153 140C152 162 149 178 144 186"/>' +
      '</g>' +
      '<rect class="fig-rele-ferro" x="104" y="88" width="20" height="100"/>' +
      '<rect class="fig-rele-avvolgimento" x="86" y="103" width="56" height="78"/>' +
      '<path class="fig-rele-spire" d="M86 107q28 3 56 0M86 111q28 3 56 0M86 115q28 3 56 0M86 119q28 3 56 0M86 123q28 3 56 0M86 127q28 3 56 0M86 131q28 3 56 0M86 135q28 3 56 0M86 139q28 3 56 0M86 143q28 3 56 0M86 147q28 3 56 0M86 151q28 3 56 0M86 155q28 3 56 0M86 159q28 3 56 0M86 163q28 3 56 0M86 167q28 3 56 0M86 171q28 3 56 0M86 175q28 3 56 0"/>' +
      '<rect class="fig-rele-flangia" x="82" y="96" width="64" height="7" rx="2"/>' +
      '<rect class="fig-rele-flangia" x="82" y="181" width="64" height="7" rx="2"/>' +
      '<rect class="fig-rele-ferro" x="78" y="188" width="72" height="6" rx="1"/>' +
      '<rect class="fig-rele-ottone" x="194" y="62" width="12" height="132" rx="2"/>' +
      '<rect class="fig-rele-ottone" x="186" y="189" width="28" height="5" rx="1.5"/>' +
      '<path class="fig-rele-molla" d="M236 80v4l6 3-12 6 12 6-12 6 12 6-12 6 12 6-12 6 12 6-12 6 12 6-6 3"/>' +
      '<rect class="fig-rele-ottone" x="231" y="150" width="10" height="44" rx="2"/>' +
      '<rect class="fig-rele-ottone" x="318" y="50" width="8" height="144" rx="2"/>' +
      '<rect class="fig-rele-ottone" x="292" y="50" width="34" height="6" rx="2"/>' +
      '<rect class="fig-rele-ottone" x="292" y="96" width="34" height="6" rx="2"/>' +
      '<rect class="fig-rele-ferro" x="297" y="56" width="6" height="9"/>' +
      '<circle class="fig-rele-contatto" cx="300" cy="66.5" r="2.6"/>' +
      '<rect class="fig-rele-ferro" x="297" y="86" width="6" height="10"/>' +
      '<path class="fig-rele-filo" d="M200 63V30h122v20"/>' +
      '<rect class="fig-rele-pila" x="214" y="23" width="28" height="14" rx="3"/>' +
      '<rect class="fig-rele-polo" x="242" y="27" width="4" height="6" rx="1"/>' +
      '<circle class="fig-rele-luce" cx="282" cy="18" r="20" fill="url(#fig-rele-bagliore)"/>' +
      '<circle class="fig-rele-vetro" cx="282" cy="18" r="9"/>' +
      '<path class="fig-rele-filamento" d="M279 27v-7l1.5-3 1.5 3 1.5-3 1.5 3v7"/>' +
      '<rect class="fig-rele-attacco" x="277" y="26" width="10" height="7" rx="1.5"/>' +
      '<g class="fig-rele-leva">' +
      '<rect class="fig-rele-ferro" x="96" y="78" width="36" height="8" rx="1.5"/>' +
      '<rect class="fig-rele-ottone" x="78" y="73" width="232" height="6" rx="3"/>' +
      '<circle class="fig-rele-contatto" cx="300" cy="72" r="2.6"/>' +
      '</g>' +
      '<circle class="fig-rele-perno" cx="200" cy="76" r="4.2"/>' +
      '<circle class="fig-rele-vite" cx="200" cy="64" r="2.4"/>' +
      '<circle class="fig-rele-vite" cx="236" cy="152" r="2.4"/>' +
      '<text class="fig-rele-t" x="8" y="126">dalla linea</text>' +
      '<text class="fig-rele-t" x="114" y="60" text-anchor="middle">ancora</text>' +
      '<text class="fig-rele-t" x="70" y="100" text-anchor="end">nucleo</text>' +
      '<text class="fig-rele-t" x="114" y="228" text-anchor="middle">bobina</text>' +
      '<text class="fig-rele-t" x="248" y="124">molla</text>' +
      '<text class="fig-rele-t" x="292" y="100" text-anchor="end">contatti</text>' +
      '<text class="fig-rele-t" x="228" y="14" text-anchor="middle">pila locale</text>' +
      '</svg>',
  },

  inBreve: [
    'Un elettromagnete è una bobina su un nucleo di ferro: è una calamita solo finché passa corrente.',
    'Il campo cresce con il numero di spire e con la corrente: `B = μ₀ · N · I / l`.',
    'Il relè è un interruttore mosso da un elettromagnete: una piccola corrente comanda una corrente grande, in un altro circuito.',
    'Telegrafo, centrali telefoniche e primi calcolatori sono stati costruiti con i relè: aperto o chiuso, zero o uno.',
  ],

  formule: [
    { nome: 'Campo in un solenoide', formula: 'B = μ₀ · N · I / l', legenda: [['B', 'campo magnetico dentro la bobina', 'tesla, T'], ['N', 'numero di spire', ''], ['I', 'corrente nella bobina', 'ampere, A'], ['l', 'lunghezza della bobina', 'metri, m'], ['μ₀', 'costante magnetica', 'circa 1,26 × 10⁻⁶ T·m/A']], nota: 'Vale per una bobina lunga e stretta, senza ferro. Un nucleo di ferro concentra il campo e lo rende molte volte più intenso.' },
    { nome: 'Il ritmo del Morse', formula: 't = 1,2 / v', legenda: [['t', 'durata di un punto', 'secondi, s'], ['v', 'velocità di trasmissione', 'parole al minuto']], nota: 'Una linea vale tre punti. Tra i segni di una lettera si lascia un punto di silenzio, tra due lettere tre, tra due parole sette. Il numero 1,2 viene dalla parola di prova PARIS, lunga 50 punti: a 20 parole al minuto un punto dura 0,06 s, cioè 60 ms.' },
  ],

  laboratori: [
    {
      id: 'rele',
      titolo: 'Il relè e il telegrafo',
      consegna: 'Premi il tasto, anche con la barra spaziatrice: la corrente attraversa la bobina, l\'elettromagnete attira l\'ancora e chiude un secondo circuito. Un tocco breve è un punto, uno lungo una linea: la striscia di carta registra i segni e li traduce in lettere.',
      sfide: [
        { id: 'scatto', testo: '**Premi il tasto**: l\'elettromagnete attira l\'ancora e accende la lampada.' },
        { id: 'sos', testo: 'Trasmetti **SOS**: tre punti, tre linee, tre punti.' },
        { id: 'ciao', testo: 'Trasmetti la parola **CIAO**.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Dentro un relè',
      paragrafi: [
        'Apri un relè di oggi e trovi le stesse parti del telegrafo, in miniatura: bobina, nucleo, ancora, molla e contatti. Di solito i contatti sono tre: il *comune*, che si muove con l\'ancora, e due fissi. Il contatto *normalmente chiuso* tocca il comune quando la bobina è spenta, quello *normalmente aperto* solo quando è accesa. Con un solo relè puoi accendere una cosa e intanto spegnerne un\'altra.',
        'La cosa più importante è che i due circuiti non si toccano: tra la bobina e i contatti passa solo una forza magnetica. Per la [[legge di Ohm]] un relè da 12 V con una bobina da 400 Ω assorbe 30 mA, eppure i suoi contatti possono comandare 10 A a 230 V, la corrente di una stufetta. L\'energia però arriva dalla presa, non dalla bobina: il relè non crea [[potenza]], apre e chiude la strada. E i contatti restano collegati alla rete, quindi pericolosi da toccare.',
        'L\'ancora impiega qualche millesimo di secondo a muoversi e ogni apertura sotto carico fa una piccola scintilla che consuma i contatti. Dove servono commutazioni rapide e silenziose si usano interruttori elettronici senza parti in movimento, come i transistor, che incontrerai nella sezione Elettronica intermedia. Il vecchio campanello elettrico, invece, è un relè che si interrompe da solo: l\'ancora attirata apre il proprio circuito, la molla la riporta indietro e tutto ricomincia, decine di volte al secondo.',
      ],
    },
    {
      titolo: 'Punti, linee e SOS',
      paragrafi: [
        'Nel codice Morse le lettere più frequenti hanno i segni più brevi: la E è un solo punto, la T una sola linea. Si racconta che Alfred Vail, il socio di Morse, abbia stimato le frequenze contando i caratteri di piombo nella tipografia di un giornale. Gli operatori impararono presto a leggere a orecchio, dal ticchettio dell\'ancora, senza guardare la striscia di carta. Nel 1865, a Parigi, venti Stati fondarono l\'Unione telegrafica internazionale e adottarono il sistema Morse per le linee tra un Paese e l\'altro.',
        'Con la radio il Morse andò per mare. Nel 1906 la conferenza di Berlino scelse come richiesta di soccorso ···−−−···. SOS non è una sigla e non vuol dire «Save Our Souls»: è una sequenza facile da battere e da riconoscere, trasmessa tutta di seguito, senza pause tra le lettere. Nel 1912 il Titanic chiese aiuto alternando il vecchio segnale CQD e il nuovo SOS. Il Morse è rimasto la voce del soccorso in mare fino al primo febbraio 1999, quando lo ha sostituito un sistema automatico via radio e satellite.',
      ],
    },
    {
      titolo: 'Dal relè al calcolatore',
      paragrafi: [
        'Un relè ha due stati, aperto o chiuso: è un bit fatto di ferro e rame. Metti due contatti [[in serie|circuito in serie]] davanti a una lampada e la lampada si accende solo se sono chiusi tutti e due; mettili [[in parallelo|circuito in parallelo]] e basta che se ne chiuda uno. Con un contatto normalmente chiuso la lampada fa il contrario della bobina. Sono le operazioni logiche «e», «o» e «non»: nel 1937 Claude Shannon dimostrò che con queste regole si può progettare qualunque circuito di commutazione, perfino uno che somma numeri in binario.',
        'Nacquero così i calcolatori a relè: lo Z3 di Konrad Zuse nel 1941, il Mark I dell\'Università di Harvard nel 1944, lungo una quindicina di metri. Erano lenti e rumorosi, ma funzionavano. Il 9 settembre 1947 i tecnici del Mark II trovarono una falena incastrata in un relè e la incollarono sul registro, con un commento ironico: «primo vero caso di bug trovato». La parola *bug*, insetto, indicava già da decenni i difetti delle macchine; quella pagina, oggi allo Smithsonian, la rese famosa.',
        'Poi valvole e transistor presero il posto dei relè: fanno lo stesso lavoro, aprire e chiudere un circuito, migliaia e poi milioni di volte più in fretta e senza parti in movimento. Le porte logiche nate da loro sono il tema della sezione «Porte logiche e nascita dei chip». L\'idea di partenza però è quella del relè: un interruttore comandato da una corrente.',
      ],
    },
  ],

  sapevi: 'Prima del telegrafo, Samuel Morse era un pittore di ritratti affermato. Nel febbraio 1825, mentre a Washington dipingeva il marchese di La Fayette, una lettera del padre gli portò brutte notizie sulla moglie Lucretia: quando arrivò a casa, a New Haven, lei era già morta e sepolta. Nessuno sa quanto quel lutto abbia contato, ma Morse dedicò poi anni a far viaggiare le notizie più veloci di qualsiasi corriere.',

  storia: [
    { anno: 1825, titolo: 'La calamita che si accende', testo: 'Alla Society of Arts di Londra William Sturgeon presenta un ferro di cavallo verniciato, con diciotto spire di filo di rame nudo. Collegato a una sola pila, il magnete di 200 grammi regge 4 chili di ferro; senza corrente torna un ferro qualsiasi.', chi: 'William Sturgeon' },
    { anno: 1831, titolo: 'Il magnete di Yale', testo: 'Joseph Henry, insegnante all\'Albany Academy, isola il filo con la seta e lo avvolge a strati. L\'elettromagnete che costruisce per l\'Università di Yale regge 2063 libbre, quasi una tonnellata. Lo stesso anno fa suonare un campanello a distanza, attraverso un lungo filo teso nell\'aula.', chi: 'Joseph Henry' },
    { anno: 1835, titolo: 'Un magnete ne comanda un altro', testo: 'A Princeton Henry usa un piccolo elettromagnete per aprire e chiudere il circuito di uno grande, che regge dei pesi: è il principio del relè. Negli stessi anni l\'inglese Edward Davy costruisce un «rinnovatore elettrico» che ripete i segnali del telegrafo con una pila locale.', chi: 'Joseph Henry, Edward Davy' },
    { anno: 1837, titolo: 'Aghi, punti e linee', testo: 'A Londra William Fothergill Cooke e Charles Wheatstone brevettano un telegrafo a cinque aghi, che nel 1839 è già in servizio lungo la ferrovia Great Western. Negli Stati Uniti Samuel Morse e Alfred Vail scelgono un segnale più semplice: nel gennaio 1838 un elettromagnete segna punti e linee su una striscia di carta, comandato attraverso 3 km di filo.', chi: 'William F. Cooke, Charles Wheatstone, Samuel Morse, Alfred Vail' },
    { anno: 1844, titolo: 'Da Washington a Baltimora', testo: 'Il 24 maggio Morse trasmette dal Campidoglio di Washington a Baltimora, a circa 64 km, una frase della Bibbia scelta da Annie Ellsworth: «What hath God wrought», «Che cosa ha operato Dio». Vail la rimanda indietro identica. La linea era stata pagata con 30 000 dollari votati dal Congresso.', chi: 'Samuel Morse, Alfred Vail' },
    { anno: 1891, titolo: 'La centrale senza centralinista', testo: 'Almon Strowger brevetta una centrale telefonica automatica: elettromagneti e cricchetti spostano un contatto, passo dopo passo, fino alla linea chiamata. Strowger faceva l\'impresario di pompe funebri e, si racconta, era convinto che una centralinista passasse le sue chiamate a un concorrente. La prima centrale apre nel 1892 a La Porte, nell\'Indiana.', chi: 'Almon Strowger' },
    { anno: 1906, titolo: 'Tre punti, tre linee, tre punti', testo: 'La prima conferenza radiotelegrafica internazionale, a Berlino, sceglie ···−−−··· come segnale di soccorso per le navi, riprendendo un regolamento tedesco del 1905. Le nuove regole entrano in vigore nel 1908.', chi: 'Conferenza radiotelegrafica di Berlino' },
    { anno: 1937, titolo: 'I relè imparano la logica', testo: 'Nella tesi scritta al MIT, Claude Shannon, 21 anni, dimostra che i circuiti di relè seguono l\'algebra di George Boole. Il progetto delle centrali telefoniche, e poi dei calcolatori, diventa un calcolo con zeri e uni.', chi: 'Claude Shannon' },
    { anno: 1941, titolo: 'Duemilaseicento relè', testo: 'A Berlino Konrad Zuse completa lo Z3, considerato il primo calcolatore programmabile e completamente automatico mai entrato in funzione. Conta in binario con circa 2600 relè e legge il programma da una pellicola perforata. Un bombardamento lo distrugge nel 1943.', chi: 'Konrad Zuse' },
  ],

  glossario: [
    { termine: 'Elettromagnete', definizione: 'Bobina avvolta intorno a un nucleo di ferro: diventa una calamita quando la attraversa la corrente e smette di esserlo quando la corrente si ferma.' },
    { termine: 'Relè', definizione: 'Interruttore comandato da un elettromagnete: una piccola corrente nella bobina attira un\'ancora che apre o chiude i contatti di un altro circuito.' },
    { termine: 'Telegrafo', definizione: 'Sistema per trasmettere messaggi a distanza con impulsi di corrente lungo un filo: un tasto apre e chiude il circuito, un elettromagnete all\'altro capo li registra o li fa sentire.' },
    { termine: 'Codice Morse', definizione: 'Alfabeto fatto di segnali brevi (punti) e lunghi (linee) separati da pause. Nato per il telegrafo, lo usano ancora i radioamatori.' },
    { termine: 'Solenoide', definizione: 'Bobina lunga e regolare: quando la percorre una corrente, al suo interno il campo magnetico è quasi uniforme. Si chiama così anche l\'attuatore in cui la bobina tira dentro un nucleo mobile, come nelle elettrovalvole.' },
    { termine: 'Ancora', definizione: 'Parte mobile di ferro di un relè o di un elettromagnete: il nucleo la attira quando passa corrente, una molla la riporta indietro quando la corrente si interrompe.' },
  ],
});
