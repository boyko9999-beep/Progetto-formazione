/*
 * Capitolo 7 · Magnetismo e induzione.
 * Schema descritto in capitoli/ohm.js; stili e animazioni della figura in capitoli/magnetismo.css.
 */
EB.capitolo({
  id: 'magnetismo',

  apertura: 'Nel 1820 un ago di bussola si mosse accanto a un filo percorso da corrente. Undici anni dopo Michael Faraday fece il cammino inverso e ottenne una corrente dal magnetismo: da quell\'idea viene ancora oggi gran parte dell\'elettricità che usi.',

  intro: [
    'Avvicina due calamite e le senti spingere o tirare prima ancora che si tocchino. Ogni [[magnete]] ha due **poli**, nord e sud: poli uguali si respingono, poli opposti si attraggono, e se spezzi una calamita a metà ottieni due calamite più piccole, non due poli separati. Intorno c\'è un [[campo magnetico]], che si misura in [[tesla]] (T) e si disegna con linee chiuse che escono dal polo nord e rientrano nel sud: la limatura di ferro le rende visibili. Anche la Terra è un enorme magnete: il nord dell\'ago della bussola punta verso l\'Artico, dove si trova, curiosamente, un polo sud magnetico.',
    'Per secoli elettricità e magnetismo sembrarono due mondi separati. Nella primavera del 1820, durante una lezione a Copenaghen, Hans Christian Ørsted notò che un ago magnetico si spostava di poco quando nel filo vicino passava [[corrente]]. In estate ripeté la prova con cura: invertendo la corrente, l\'ago deviava dall\'altra parte. Una corrente, dunque, crea un campo magnetico, con linee a forma di cerchi intorno al filo. Avvolgi il filo in una [[bobina]] e i campi delle spire si sommano: la bobina si comporta come una calamita, con nord e sud che si scambiano se inverti la corrente. Con un nucleo di ferro diventa un [[elettromagnete]], protagonista del capitolo sui relè.',
    'Se la corrente produce magnetismo, si chiese Michael Faraday, il magnetismo può produrre corrente? Nel 1831 trovò la risposta, con una sorpresa: una calamita ferma dentro una bobina non fa nulla. La corrente compare solo **mentre il campo cambia**, quando avvicini o allontani la calamita o quando accendi o spegni una corrente vicina. È l\'[[induzione elettromagnetica]]. La [[tensione]] indotta cresce con la rapidità con cui cambia il [[flusso magnetico]], cioè quanto campo attraversa le spire, e con il numero delle spire: `ε = −N · ΔΦ / Δt`. Il segno meno è la [[legge di Lenz]]: la corrente indotta si oppone sempre al cambiamento che la produce.',
    'Su questa scoperta si reggono le centrali elettriche. Un [[generatore]] fa ruotare un magnete davanti a una bobina, o una bobina tra i poli di un magnete: il flusso cambia di continuo e il moto di una turbina diventa tensione. Una bobina reagisce anche ai cambiamenti della propria corrente e li frena: costruita apposta per questo si chiama [[induttore]], e la sua *induttanza* si misura in [[henry]]. Nel 1865, infine, James Clerk Maxwell riunì elettricità e magnetismo in un\'unica teoria e ne ricavò una conseguenza inattesa: la luce è un\'onda elettromagnetica.',
  ],

  figura: {
    alt: 'Ricostruzione dell\'anello di Faraday: un anello di ferro con due bobine di rame su lati opposti, A e B. La bobina A è collegata a una pila tramite un contatto, la bobina B a un galvanometro, cioè un ago magnetico sotto un filo; una linea verde tratteggiata indica il flusso nel ferro.',
    didascalia: 'L\'anello di Faraday, 29 agosto 1831 (ricostruzione). Due bobine di filo di rame isolato con cotone, su un anello di ferro di circa 15 cm di diametro: una collegata a una pila, l\'altra a un filo che passa sopra un ago magnetico. L\'ago scattava solo quando il circuito della pila si chiudeva, da una parte, o si apriva, dall\'altra: la corrente nasce dal flusso che cambia, non dal flusso che c\'è.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="fig-magnetismo-ferro" gradientUnits="userSpaceOnUse" cx="188" cy="110" r="64"><stop offset="0.672" class="fig-magnetismo-ombra"/><stop offset=".84" class="fig-magnetismo-luce"/><stop offset="1" class="fig-magnetismo-ombra"/></radialGradient></defs>' +
      '<path class="fig-magnetismo-filo" d="M30 84V60q0-10 10-10H64"/>' +
      '<path class="fig-magnetismo-filo" d="M84 50H107C121 50 128 54 133 71.8"/>' +
      '<path class="fig-magnetismo-filo" d="M92 84V76q0-6 6-6h4q6 0 6 6V148q0 8 8 8H122.1C130.1 156 133.1 155 136.1 152.3"/>' +
      '<path class="fig-magnetismo-filo" d="M239.9 67.7C244.9 54 251.9 50 265.9 50H302q8 0 8 8V148q0 8-8 8H269C255 156 248 153 243 148.2"/>' +
      '<g class="fig-magnetismo-pila"><rect x="20" y="92" width="84" height="38" rx="4"/></g>' +
      '<g class="fig-magnetismo-piastre"><path class="fig-magnetismo-cu" d="M37 86v6M53 86v6M69 86v6M85 86v6"/><path class="fig-magnetismo-zn" d="M41 86v6M57 86v6M73 86v6M89 86v6"/></g>' +
      '<rect class="fig-magnetismo-morsetto" x="27" y="83" width="6" height="9" rx="1.5"/><rect class="fig-magnetismo-morsetto" x="89" y="83" width="6" height="9" rx="1.5"/>' +
      '<circle class="fig-magnetismo-perno" cx="64" cy="50" r="3"/><circle class="fig-magnetismo-perno" cx="84" cy="50" r="3"/>' +
      '<path class="fig-magnetismo-tasto" d="M64 50H84"/>' +
      '<path class="fig-magnetismo-anello" fill-rule="evenodd" d="M124 110a64 64 0 1 0 128 0a64 64 0 1 0 -128 0zM145 110a43 43 0 1 1 86 0a43 43 0 1 1 -86 0z"/>' +
      '<g class="fig-magnetismo-flusso"><circle class="fig-magnetismo-linea" cx="188" cy="110" r="53.5"/><path class="fig-magnetismo-freccia" d="M184 51.5l7 5-7 5M192 158.5l-7 5 7 5"/><text class="fig-magnetismo-t fig-magnetismo-tb" x="188" y="34" text-anchor="middle">flusso magnetico</text></g>' +
      '<path class="fig-magnetismo-fascia" d="M135.9 66.3A68 68 0 0 0 135.9 153.7L158.1 135.1A39 39 0 0 1 158.1 84.9Z"/>' +
      '<path class="fig-magnetismo-fascia" d="M240.1 153.7A68 68 0 0 0 240.1 66.3L217.9 84.9A39 39 0 0 1 217.9 135.1Z"/>' +
      '<path class="fig-magnetismo-spire" d="M156.1 85.9L133 71.8M154.2 88.6L130.1 76.3M152.6 91.4L127.6 81.1M151.2 94.3L125.4 86.1M150.1 97.3L123.7 91.2M149.2 100.4L122.4 96.4M148.5 103.6L121.5 101.8M148.1 106.8L121.1 107.2M148 110L121 112.6M148.1 113.2L121.5 118M148.5 116.4L122.3 123.3M149.2 119.6L123.6 128.6M150.1 122.7L125.3 133.7M151.2 125.7L127.4 138.7M152.6 128.6L129.9 143.4M154.2 131.4L132.8 148M156.1 134.1L136.1 152.3"/>' +
      '<path class="fig-magnetismo-spire" d="M219.9 134.1L243 148.2M221.8 131.4L245.9 143.7M223.4 128.6L248.4 138.9M224.8 125.7L250.6 133.9M225.9 122.7L252.3 128.8M226.8 119.6L253.6 123.6M227.5 116.4L254.5 118.2M227.9 113.2L254.9 112.8M228 110L255 107.4M227.9 106.8L254.5 102M227.5 103.6L253.7 96.7M226.8 100.4L252.4 91.4M225.9 97.3L250.7 86.3M224.8 94.3L248.6 81.3M223.4 91.4L246.1 76.6M221.8 88.6L243.2 72M219.9 85.9L239.9 67.7"/>' +
      '<circle class="fig-magnetismo-cassa" cx="310" cy="110" r="29"/>' +
      '<circle class="fig-magnetismo-quadrante" cx="310" cy="110" r="25"/>' +
      '<path class="fig-magnetismo-tacche" d="M327.3 100L330.8 98M324.1 95.9L327 93M320 92.7L322 89.2M315.2 90.7L316.2 86.8M310 93L310 86M304.8 90.7L303.8 86.8M300 92.7L298 89.2M295.9 95.9L293 93M292.7 100L289.2 98M292.7 120L289.2 122M295.9 124.1L293 127M300 127.3L298 130.8M304.8 129.3L303.8 133.2M310 127L310 134M315.2 129.3L316.2 133.2M320 127.3L322 130.8M324.1 124.1L327 127M327.3 120L330.8 122"/>' +
      '<g class="fig-magnetismo-ago"><path class="fig-magnetismo-nord" d="M310 89l4 21h-8z"/><path class="fig-magnetismo-sud" d="M310 131l4 -21h-8z"/></g>' +
      '<circle class="fig-magnetismo-perno" cx="310" cy="110" r="2.6"/>' +
      '<path class="fig-magnetismo-filo fig-magnetismo-sopra" d="M310 78V142"/>' +
      '<text class="fig-magnetismo-t fig-magnetismo-segno" x="31" y="116" text-anchor="middle">+</text><text class="fig-magnetismo-t fig-magnetismo-segno" x="92" y="116" text-anchor="middle">−</text>' +
      '<text class="fig-magnetismo-t" x="62" y="148" text-anchor="middle">pila</text>' +
      '<text class="fig-magnetismo-t fig-magnetismo-lettera" x="161" y="114" text-anchor="middle">A</text>' +
      '<text class="fig-magnetismo-t fig-magnetismo-lettera" x="215" y="114" text-anchor="middle">B</text>' +
      '<text class="fig-magnetismo-t" x="188" y="198" text-anchor="middle">anello di ferro</text>' +
      '<text class="fig-magnetismo-t" x="310" y="178" text-anchor="middle">galvanometro</text>' +
      '</svg>',
  },

  inBreve: [
    'Una corrente crea un campo magnetico (Ørsted, 1820): una bobina percorsa da corrente si comporta come una calamita.',
    'Un campo magnetico che **cambia** induce una tensione in una bobina (Faraday, 1831); un campo fermo, per quanto intenso, no.',
    'Più rapida è la variazione e più spire ha la bobina, più alta è la tensione; la corrente indotta si oppone al cambiamento (legge di Lenz).',
    'Generatori, [[trasformatori|trasformatore]], piani a induzione e caricabatterie senza fili funzionano grazie all\'induzione.',
  ],

  formule: [
    {
      nome: 'Legge di Faraday-Neumann-Lenz',
      formula: 'ε = −N · ΔΦ / Δt',
      legenda: [['ε', 'tensione indotta', 'volt, V'], ['N', 'numero di spire', 'numero puro'], ['ΔΦ', 'variazione del flusso in ogni spira', 'weber, Wb'], ['Δt', 'durata della variazione', 'secondi, s']],
    },
    { nome: 'Flusso magnetico', formula: 'Φ = B · A', legenda: [['Φ', 'flusso attraverso una spira', 'weber, Wb'], ['B', 'campo perpendicolare alla spira', 'tesla, T'], ['A', 'area della spira', 'm²']] },
    { nome: 'Tensione su un induttore', formula: 'V = L · ΔI / Δt', legenda: [['V', 'tensione ai capi', 'volt, V'], ['L', 'induttanza', 'henry, H'], ['ΔI', 'variazione della corrente', 'ampere, A'], ['Δt', 'durata della variazione', 'secondi, s']] },
  ],

  laboratori: [
    {
      id: 'magnetismo',
      titolo: 'L\'esperimento di Faraday',
      consegna: 'Trascina la calamita dentro e fuori dalla bobina e guarda l\'ago del galvanometro. Poi passa all\'esperimento di Ørsted: una corrente in un filo fa ruotare la bussola.',
      sfide: [
        { id: 'muovi', testo: '**Infila la calamita** nella bobina: quando si muove l\'ago e quando torna a zero?' },
        { id: 'verso', testo: '**Estrai la calamita**: l\'ago devia dall\'altra parte.' },
        { id: 'led', testo: 'Muovi la calamita **abbastanza in fretta** da accendere il LED.' },
        { id: 'oersted', testo: 'Nell\'esperimento di **Ørsted**, fai passare la corrente e guarda la bussola.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Dalla dinamo della bicicletta alla centrale',
      paragrafi: [
        'Nella dinamo della bicicletta la ruota fa girare un piccolo magnete davanti a una bobina: più pedali in fretta, più il flusso cambia rapidamente e più il faro è luminoso. Una centrale fa lo stesso in grande: vapore, acqua o vento muovono una turbina collegata a un alternatore, che in Europa produce [[corrente alternata]] a 50 Hz. Se ha un solo polo nord e un solo polo sud, per dare 50 Hz l\'alternatore deve compiere 3000 giri al minuto.',
        'La stessa macchina funziona anche al contrario: se mandi corrente nelle bobine, il campo magnetico fa girare l\'albero e il generatore diventa un motore. Antonio Pacinotti se ne accorse già nel 1860, e le auto elettriche lo sfruttano in frenata, quando il motore torna generatore e ricarica la batteria.',
      ],
    },
    {
      titolo: 'Lenz in cucina e sui binari',
      paragrafi: [
        'Lascia cadere una calamita molto forte in un tubo di rame: invece di precipitare, scende adagio, come nel miele. Il flusso che cambia fa circolare nel rame correnti indotte, dette *correnti parassite* o di Foucault, il cui campo si oppone al moto. Sui treni tedeschi ICE 3 e su alcune montagne russe le stesse correnti fanno da freno senza attrito, ma la loro azione si indebolisce man mano che si rallenta: per fermarsi del tutto serve un freno tradizionale.',
        'Il piano a induzione usa le correnti parassite per cucinare. Sotto il vetro, una bobina è percorsa da corrente alternata a una [[frequenza]] tra circa 20 e 100 kHz: il campo che cambia induce correnti nel fondo della pentola, che si scalda per [[effetto Joule]]. Il riscaldamento funziona bene soprattutto nei metalli ferromagnetici: per questo servono pentole di ghisa o di acciaio adatto.',
      ],
    },
    {
      titolo: 'Che cosa fa un induttore',
      paragrafi: [
        'Un induttore è una bobina costruita apposta, spesso con un nucleo di ferro o di ferrite. Quando la corrente cambia, cambia anche il suo campo, e la bobina induce su sé stessa una tensione che si oppone alla variazione: è l\'*autoinduzione*, studiata da Joseph Henry e da Faraday. L\'induttore fa da volano per la corrente: non le impedisce di scorrere, ma ne rallenta i cambiamenti.',
        'Se apri di colpo il circuito di una bobina, la corrente dovrebbe azzerarsi in un istante, e la tensione autoindotta può salire tanto da far scoccare una scintilla tra i contatti: Henry la descrisse già nel 1832. Per questo accanto alla bobina di un [[relè]] si monta spesso un diodo che evita la scintilla: lo incontrerai nella sezione Elettronica intermedia.',
      ],
    },
  ],

  sapevi: 'Il campo magnetico della Terra non è sempre stato orientato come oggi: il nord e il sud magnetici si sono scambiati molte volte. L\'ultima inversione completa risale a più di 770 000 anni fa. Lo sappiamo dalle rocce: le lave, raffreddandosi, conservano la direzione del campo di quel momento, come bussole fossili.',

  storia: [
    { anno: 1269, titolo: 'La lettera sulla calamita', testo: 'In una lettera del 1269, scritta secondo la tradizione durante l\'assedio di Lucera, in Puglia, Pietro Peregrino di Maricourt descrive le calamite con esperimenti accurati: individua i due poli, li chiama nord e sud e spiega che poli opposti si attraggono.', chi: 'Pietro Peregrino di Maricourt' },
    { anno: 1820, titolo: 'L\'ago che si sposta', testo: 'Il 21 luglio Hans Christian Ørsted, professore a Copenaghen, fa circolare in tutta Europa quattro pagine in latino: una corrente elettrica fa deviare l\'ago di una bussola. Elettricità e magnetismo sono legati.', chi: 'Hans Christian Ørsted' },
    { anno: 1820, titolo: 'Correnti che si attraggono', testo: 'A settembre la notizia arriva a Parigi, e in poche settimane André-Marie Ampère mostra all\'Accademia delle scienze che due fili paralleli percorsi da corrente si attraggono o si respingono, secondo il verso delle correnti.', chi: 'André-Marie Ampère' },
    { anno: 1831, titolo: 'L\'anello e la calamita', testo: 'Il 29 agosto, alla Royal Institution di Londra, Michael Faraday prova un anello di ferro con due bobine: l\'ago scatta solo quando il circuito della pila si chiude o si apre. In ottobre ottiene corrente spingendo una calamita in una bobina; il 24 novembre la sua memoria è letta alla Royal Society.', chi: 'Michael Faraday' },
    { anno: 1832, titolo: 'Corrente a manovella', testo: 'A Parigi il costruttore di strumenti Hippolyte Pixii fa girare a manovella una calamita a ferro di cavallo sotto due bobine: è uno dei primi generatori elettrici. Su consiglio di Ampère aggiunge un commutatore, che manda la corrente sempre nello stesso verso.', chi: 'Hippolyte Pixii' },
    { anno: 1834, titolo: 'Il verso della corrente indotta', testo: 'Alla fine del 1833, all\'Accademia delle scienze di San Pietroburgo, Heinrich Friedrich Emil Lenz presenta una regola che pubblica l\'anno seguente: la corrente indotta circola sempre in modo da opporsi alla causa che la genera.', chi: 'Emil Lenz' },
    { anno: 1860, titolo: 'La macchinetta di Pisa', testo: 'A Pisa Antonio Pacinotti costruisce una «macchinetta» con un anello di ferro avvolto da molte bobine: funziona sia da motore sia da generatore, e dà una corrente continua più regolare di quella delle macchine di allora. La descrive a metà degli anni Sessanta su *Il Nuovo Cimento*, prima che Zénobe Gramme costruisca la sua dinamo.', chi: 'Antonio Pacinotti' },
    { anno: 1865, annoTesto: '1861–1865', titolo: 'La luce è un\'onda', testo: 'James Clerk Maxwell traduce in equazioni le linee di forza di Faraday. Prima trova che le onde previste dal suo modello viaggerebbero quasi alla velocità misurata per la luce; nel 1865, con una teoria più generale, conclude che la luce è un\'onda elettromagnetica.', chi: 'James Clerk Maxwell' },
  ],

  glossario: [
    { termine: 'Magnete', definizione: 'Oggetto che attira il ferro e ha due poli, nord e sud: poli uguali si respingono, opposti si attraggono. Può essere permanente, come una calamita, o temporaneo, come un elettromagnete.' },
    { termine: 'Campo magnetico', definizione: 'La regione intorno a un magnete o a una corrente in cui agiscono forze magnetiche. Si disegna con linee chiuse che escono dal polo nord e rientrano nel sud, e si misura in tesla.' },
    { termine: 'Tesla', definizione: 'Unità di misura del campo magnetico, simbolo T, dedicata a Nikola Tesla. Il campo terrestre vale qualche decina di microtesla, una calamita da frigorifero qualche millitesla (mT), una risonanza magnetica da 1,5 a 3 T.' },
    { termine: 'Induzione elettromagnetica', definizione: 'La comparsa di una tensione in un circuito quando cambia il flusso magnetico che lo attraversa. Scoperta da Michael Faraday nel 1831, fa funzionare generatori e trasformatori.' },
    { termine: 'Flusso magnetico', definizione: 'Quanto campo magnetico attraversa una superficie, per esempio una spira: con il campo perpendicolare vale `Φ = B · A`. Si misura in weber (Wb).' },
    { termine: 'Legge di Lenz', definizione: 'La corrente indotta circola sempre in modo da opporsi alla variazione di flusso che l\'ha prodotta. L\'enunciò Emil Lenz tra il 1833 e il 1834.' },
    { termine: 'Bobina', definizione: 'Filo isolato avvolto in molte spire, spesso attorno a un nucleo di ferro. Percorsa da corrente si comporta come una calamita; se il flusso che la attraversa cambia, ai suoi capi nasce una tensione.' },
    { termine: 'Induttore', definizione: 'Componente formato da una bobina, costruito per avere una certa induttanza: immagazzina energia nel campo magnetico e si oppone alle variazioni rapide della corrente.' },
    { termine: 'Henry', definizione: 'Unità di misura dell\'induttanza, simbolo H, dedicata a Joseph Henry: un induttore da 1 H ha ai capi 1 V quando la corrente che lo attraversa cambia di 1 A ogni secondo.' },
    { termine: 'Generatore', definizione: 'Macchina che trasforma il movimento in energia elettrica grazie all\'induzione: un magnete e una bobina ruotano l\'uno rispetto all\'altra e il flusso che cambia induce una tensione.' },
  ],
});
