/*
 * Capitolo 1 · La carica elettrica.
 * Schema dei campi: vedi il commento in capitoli/ohm.js. Stili e animazione della figura in capitoli/carica.css.
 */
EB.capitolo({
  id: 'carica',

  apertura: 'Un pezzo d\'ambra che attira una pagliuzza, un palloncino che solleva i capelli, un fulmine che squarcia il cielo: dietro c\'è sempre la stessa forza. Per capirla bisogna scendere fin dentro l\'atomo.',

  intro: [
    'Strofina un palloncino sui capelli e allontanalo piano: i capelli si sollevano e lo inseguono. Gli antichi Greci avevano notato qualcosa di simile con l\'ambra, che strofinata attira le pagliuzze; la chiamavano *ēlektron*, e da quella parola viene «elettricità». Palloncino e ambra hanno acquistato una [[carica elettrica]], che può essere **positiva** o **negativa**. Due palloncini strofinati sugli stessi capelli si allontanano l\'uno dall\'altro, mentre palloncino e capelli si cercano: cariche uguali si respingono, cariche opposte si attirano.',
    'Da dove viene la carica? Tutto ciò che tocchi è fatto di [[atomi|atomo]]: un nucleo minuscolo, con [[protoni|protone]] positivi e neutroni senza carica, avvolto da [[elettroni|elettrone]] negativi. Protone ed elettrone portano la stessa quantità di carica, con segno opposto, e un atomo con tanti elettroni quanti protoni è neutro. Lo strofinio non crea carica: sposta elettroni da un materiale all\'altro. Il palloncino ne strappa qualcuno ai capelli e diventa negativo; i capelli, rimasti con un piccolo ammanco, diventano positivi.',
    'Non tutti i materiali trattengono la carica. Nei metalli alcuni elettroni non appartengono a un atomo preciso e girano liberi per tutto il pezzo: i metalli sono [[conduttori|conduttore]] e la carica vi scorre in un istante. Se strofini un cucchiaio di metallo tenendolo in mano, la carica scappa subito attraverso il tuo corpo. In plastica, vetro, gomma e ambra, invece, gli elettroni restano legati ai loro atomi: sono [[isolanti|isolante]], e la carica resta dove si è formata. Questa carica ferma è l\'[[elettricità statica]].',
    'Nel 1785 Charles-Augustin de Coulomb misurò la forza tra due cariche con una bilancia di torsione sensibilissima, quella della figura, e trovò la [[legge di Coulomb]]: `F = k · q₁ · q₂ / r²`. La forza cresce con il prodotto delle cariche e cala con il **quadrato** della distanza: a distanza doppia diventa quattro volte più debole. Succede qualcosa di simile con una bomboletta spray: se la tieni a distanza doppia dal muro, la vernice copre un\'area quattro volte più grande, in uno strato quattro volte più sottile. La carica si misura in [[coulomb]] (C): un coulomb è la carica di circa 6,24 × 10¹⁸ elettroni, più di sei miliardi di miliardi.',
    'Una carica cambia lo spazio intorno a sé anche quando non c\'è nulla da spingere o da attirare: è il [[campo elettrico]]. Lo si disegna con linee che escono dalle cariche positive ed entrano in quelle negative, fitte dove la forza è intensa e rade dove è debole. È il campo a far funzionare le stampanti laser: la luce disegna su un cilindro una mappa di cariche, e la polvere di toner, carica anch\'essa, si posa solo dove serve.',
  ],

  figura: {
    alt: 'Ricostruzione della bilancia di torsione di Coulomb: in un cilindro di vetro graduato, un filo d\'argento appeso a un micrometro regge un ago orizzontale con una pallina, respinta da una seconda pallina fissa che scende dal coperchio.',
    didascalia: 'La bilancia di torsione di Coulomb (ricostruzione). Le due palline hanno carica dello stesso segno: l\'ago gira finché la torsione del filo d\'argento non equilibra la repulsione, e l\'angolo si legge sulla scala. Secondo il resoconto di Coulomb, per dimezzare la distanza (da 36 a 18 gradi) bisognò torcere il filo quattro volte di più, da 36 a 144 gradi: la forza era quadruplicata.',
    svg: '' +
      '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="fig-carica-vetro" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="fig-carica-v0"/><stop offset=".22" class="fig-carica-v1"/><stop offset=".7" class="fig-carica-v2"/><stop offset="1" class="fig-carica-v0"/></linearGradient><radialGradient id="fig-carica-sfera" cx=".38" cy=".34" r=".7"><stop offset="0" class="fig-carica-s0"/><stop offset="1" class="fig-carica-s1"/></radialGradient></defs>' +
      '<ellipse class="fig-carica-ombra" cx="170" cy="229.5" rx="92" ry="7"/>' +
      '<path class="fig-carica-legno-lato" d="M86 196v7A84 23.5 0 0 0 254 203v-7z"/>' +
      '<ellipse class="fig-carica-legno" cx="170" cy="196" rx="84" ry="23.5"/>' +
      '<path class="fig-carica-vetro-corpo" d="M96 84V192A74 20.7 0 0 0 244 192V84A74 20.7 0 0 0 96 84z"/>' +
      '<path class="fig-carica-vetro-retro" d="M96 192A74 20.7 0 0 1 244 192"/>' +
      '<g class="fig-carica-scala-retro"><path d="M96 153A74 20.7 0 0 1 244 153"/><path d="M96 163A74 20.7 0 0 1 244 163"/></g>' +
      '<path class="fig-carica-filo" d="M170 84V148"/>' +
      '<path class="fig-carica-traccia" d="M227.4 150.3A58 16.2 0 0 1 176.1 164.2"/>' +
      '<path class="fig-carica-asta-fissa" d="M224.5 89.6V153.6"/>' +
      '<circle class="fig-carica-alone" cx="224.5" cy="153.6" r="9"/>' +
      '<circle class="fig-carica-palla" cx="224.5" cy="153.6" r="5"/>' +
      '<text class="fig-carica-segno" x="235.5" y="148.6" text-anchor="middle">+</text>' +
      '<g transform="translate(170 148) scale(1 0.28)"><g class="fig-carica-ago"><path class="fig-carica-asta" vector-effect="non-scaling-stroke" d="M-58 0H58"/><g transform="translate(-58 0)"><g class="fig-carica-dritto"><rect class="fig-carica-paletta" x="-2.6" y="-8" width="5.2" height="16" rx="1.4"/></g></g><g transform="translate(58 0)"><g class="fig-carica-dritto"><circle class="fig-carica-alone" r="9"/><circle class="fig-carica-palla" r="5"/><text class="fig-carica-segno" x="1" y="-10" text-anchor="middle">+</text></g></g></g></g>' +
      '<circle class="fig-carica-pinza" cx="170" cy="148" r="2.2"/>' +
      '<g class="fig-carica-scala"><path d="M96 153A74 20.7 0 0 0 244 153"/><path d="M96 163A74 20.7 0 0 0 244 163"/><path class="fig-carica-tacche" d="M242.9 156.6v2.6M239.5 160.1v2.6M234.1 163.4v5M234.1 173.4v-2M226.7 166.3v2.6M217.6 168.9v2.6M207 170.9v5M207 180.9v-2M195.3 172.5v2.6M182.8 173.4v2.6M170 173.7v5M170 183.7v-2M157.2 173.4v2.6M144.7 172.5v2.6M133 170.9v5M133 180.9v-2M122.4 168.9v2.6M113.3 166.3v2.6M105.9 163.4v5M105.9 173.4v-2M100.5 160.1v2.6M97.1 156.6v2.6"/></g>' +
      '<path class="fig-carica-vetro-bordo" d="M96 192A74 20.7 0 0 0 244 192M96 84V192M244 84V192"/>' +
      '<path class="fig-carica-coperchio-lato" d="M90 84A80 22.4 0 0 0 250 84v3A80 22.4 0 0 1 90 87z"/>' +
      '<ellipse class="fig-carica-coperchio" cx="170" cy="84" rx="80" ry="22.4"/>' +
      '<ellipse class="fig-carica-foro" cx="224.5" cy="89.6" rx="4" ry="1.4"/>' +
      '<path class="fig-carica-asta-fissa" d="M224.5 89.6V68"/>' +
      '<rect class="fig-carica-ottone" x="221" y="61" width="7" height="8" rx="2"/>' +
      '<rect class="fig-carica-tubo" x="163" y="21" width="14" height="63"/>' +
      '<ellipse class="fig-carica-ottone" cx="170" cy="84" rx="11" ry="3.1"/>' +
      '<path class="fig-carica-filo" d="M170 21V84"/>' +
      '<path class="fig-carica-ottone-lato" d="M150 13V21A20 5.6 0 0 0 190 21V13z"/>' +
      '<ellipse class="fig-carica-ottone" cx="170" cy="13" rx="20" ry="5.6"/>' +
      '<path class="fig-carica-tacche" d="M189.3 14.4v2.4M187.3 15.8v2.4M184.1 17v4M180 17.8v2.4M175.2 18.4v2.4M170 18.6v4M164.8 18.4v2.4M160 17.8v2.4M155.9 17v4M152.7 15.8v2.4M150.7 14.4v2.4"/>' +
      '<path class="fig-carica-ottone-lato" d="M166 13V6h8v7"/>' +
      '<ellipse class="fig-carica-ottone" cx="170" cy="6" rx="4" ry="1.2"/>' +
      '<text class="fig-carica-t" x="142" y="21" text-anchor="end">micrometro</text>' +
      '<text class="fig-carica-t" x="154" y="56" text-anchor="end">filo d\'argento</text>' +
      '<path class="fig-carica-guida" d="M156 52.5H168"/>' +
      '<text class="fig-carica-t" x="258" y="138">pallina fissa</text>' +
      '<path class="fig-carica-guida" d="M256 134.5L231.5 150.6"/>' +
      '<text class="fig-carica-t" x="258" y="190">ago</text>' +
      '<path class="fig-carica-guida" d="M256 186.5L187.2 156.7"/>' +
      '<text class="fig-carica-t" x="86" y="162" text-anchor="end">scala in gradi</text>' +
      '<path class="fig-carica-guida" d="M88 158.5H94"/>' +
      '</svg>',
  },

  inBreve: [
    'Le cariche elettriche sono di due tipi: uguali si respingono, opposte si attirano.',
    'Di norma gli atomi sono neutri; quando si strofinano due materiali, alcuni elettroni passano dall\'uno all\'altro.',
    'Nei conduttori la carica si sposta liberamente, negli isolanti resta ferma.',
    'Legge di Coulomb: `F = k · q₁ · q₂ / r²`. A distanza doppia, la forza è quattro volte più piccola.',
  ],

  formule: [
    {
      nome: 'Legge di Coulomb',
      formula: 'F = k · q₁ · q₂ / r²',
      legenda: [['F', 'forza tra le due cariche', 'newton, N'], ['k', 'costante di Coulomb', '8,99 × 10⁹ N·m²/C²'], ['q₁, q₂', 'le due cariche', 'coulomb, C'], ['r', 'distanza tra le cariche', 'metro, m']],
      nota: 'Due cariche uguali di 1 µC a 10 cm si respingono con circa 0,9 N, quasi il peso di un etto di cioccolato; a 5 cm la forza sale a 3,6 N, quattro volte tanto.',
    },
    {
      nome: 'Carica e numero di elettroni',
      formula: 'Q = n · e',
      legenda: [['Q', 'carica totale', 'coulomb, C'], ['n', 'elettroni in più o in meno', 'numero intero'], ['e', 'carica elementare', '1,602 × 10⁻¹⁹ C']],
    },
  ],

  laboratori: [
    {
      id: 'carica',
      titolo: 'Il campo di Coulomb',
      consegna: 'Trascina le cariche con il dito, con il mouse o con le frecce della tastiera, e cambia segno e intensità di ciascuna. Le linee mostrano il campo elettrico, le frecce la forza che agisce su ogni carica.',
      sfide: [
        { id: 'opposte', testo: 'Rendi **opposte** le due cariche: invece di respingersi, si attirano.' },
        { id: 'quadruplo', testo: '**Dimezza la distanza** tra le cariche: di quanto cresce la forza?' },
        { id: 'un-newton', testo: 'Trova una posizione in cui la forza vale circa **1 newton**.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'La scossa della portiera',
      paragrafi: [
        'Quando scendi dall\'auto, i vestiti strisciano sul sedile e si scambiano elettroni con la sua stoffa. Il tuo corpo si carica e le suole di gomma non lo lasciano scaricare: con l\'aria secca dell\'inverno puoi superare i 10 000 [[volt]], mentre l\'umidità aiuta la carica a disperdersi. Appena la mano si avvicina alla carrozzeria, la carica salta con una scintilla.',
        'Pizzica, però è innocua: la tensione è alta (sotto i 2000 o 3000 volt la scossa non si sente nemmeno), ma la carica in gioco è dell\'ordine di un milionesimo di coulomb e l\'energia di pochi millesimi di [[joule]]. Per evitarla, scendi tenendo una mano sul metallo della portiera. Alcuni chip, invece, si guastano con scariche di 100 volt o anche meno, che tu non sentiresti affatto: per questo i componenti elettronici viaggiano in buste antistatiche.',
      ],
    },
    {
      titolo: 'Fulmini e parafulmini',
      paragrafi: [
        'In un temporale, chicchi di ghiaccio e cristalli più leggeri si urtano e si scambiano carica, e le correnti d\'aria li separano. Di solito la parte bassa della nuvola diventa negativa e richiama cariche positive sul terreno sottostante. Quando il campo è troppo intenso, l\'aria smette di isolare e si apre un canale di scarica: un fulmine tipico porta una corrente di circa 30 000 [[ampere]] e scalda l\'aria fino a quasi 28 000 °C, cinque volte la temperatura della superficie del Sole.',
        'Il parafulmine, proposto da Benjamin Franklin intorno al 1750, è un\'asta di metallo in cima all\'edificio collegata a terra da un grosso conduttore: la corrente del fulmine scende nel terreno senza attraversare muri e travi. Per un motivo simile un\'auto con la carrozzeria di metallo, a finestrini chiusi, è un buon rifugio: la corrente corre sulla lamiera e arriva al suolo. Le gomme non c\'entrano: moto e decappottabili non proteggono affatto.',
      ],
    },
    {
      titolo: 'Perché l\'elettrone è «negativo»',
      paragrafi: [
        'Nel 1747 Franklin immaginò l\'elettricità come un unico fluido: un corpo che ne aveva in eccesso era «positivo», uno che ne aveva meno del normale «negativo». Bisognava decidere quale fosse quale, e Franklin chiamò positivo il vetro strofinato: una convenzione, non una scoperta.',
        'Un secolo e mezzo dopo, nel 1897, Joseph John Thomson scoprì l\'elettrone. Sia nei fili di metallo sia, di solito, nello strofinio, a spostarsi sono gli elettroni, e la loro carica è proprio quella che Franklin aveva chiamato negativa: il vetro strofinato è positivo perché ha *perso* elettroni. I nomi però erano ormai in tutti i libri. Per questo il [[verso convenzionale della corrente|corrente convenzionale]] va dal + al −, mentre gli elettroni viaggiano al contrario, come vedrai nel capitolo sulla corrente elettrica.',
      ],
    },
  ],

  sapevi: 'La prima copia xerografica, antenata di tutte le fotocopie, fu fatta il 22 ottobre 1938 in un piccolo laboratorio ad Astoria, un quartiere di New York. Chester Carlson e il suo assistente Otto Kornei strofinarono con un fazzoletto una lastra di zinco ricoperta di zolfo, la illuminarono attraverso un vetrino con la scritta «10-22-38 ASTORIA» e la cosparsero di una polvere finissima, che restò solo dove l\'ombra delle lettere aveva conservato la carica. Fotocopiatrici e stampanti laser sfruttano ancora lo stesso principio.',

  storia: [
    { anno: -600, annoTesto: 'circa 600 a.C.', titolo: 'L\'ambra di Talete', testo: 'Secondo una tradizione raccolta secoli dopo, il filosofo Talete di Mileto attribuisce un\'anima alla calamita e all\'ambra, perché attirano altri oggetti: l\'ambra, però, solo dopo essere stata strofinata. In greco si chiama *ēlektron*.', chi: 'Talete di Mileto' },
    { anno: 1600, titolo: 'Nasce la parola «elettrico»', testo: 'Nel *De Magnete* il medico inglese William Gilbert distingue l\'attrazione dell\'ambra da quella della calamita e chiama *electrica* le sostanze che, strofinate, si comportano come l\'ambra. Per riconoscerle usa il *versorium*, un ago di metallo libero di girare su una punta.', chi: 'William Gilbert' },
    { anno: 1660, annoTesto: 'anni 1660', titolo: 'La sfera di zolfo', testo: 'Otto von Guericke, borgomastro di Magdeburgo, monta su un asse una sfera di zolfo e la strofina con la mano: la sfera attira piume e pezzetti di carta. È spesso considerata la prima macchina elettrostatica, anche se Guericke non parlava di elettricità.', chi: 'Otto von Guericke' },
    { anno: 1729, titolo: 'La carica viaggia', testo: 'Stephen Gray scopre che l\'elettricità passa da un corpo all\'altro: con l\'amico Granville Wheler la porta lungo uno spago per oltre 200 metri, appeso a fili di seta. Se i sostegni sono di metallo, la carica si disperde.', chi: 'Stephen Gray, Granville Wheler' },
    { anno: 1733, titolo: 'Due elettricità', testo: 'Charles du Fay nota che i corpi elettrizzati a volte si attirano e a volte si respingono, e conclude che esistono due elettricità, «vetrosa» e «resinosa»: ciascuna respinge sé stessa e attira l\'altra.', chi: 'Charles François de Cisternay du Fay' },
    { anno: 1752, titolo: 'Il fulmine è elettrico', testo: 'Il 10 maggio, a Marly-la-Ville vicino a Parigi, un\'asta di ferro preparata da Thomas-François Dalibard su un\'idea di Benjamin Franklin dà scintille durante un temporale. Secondo un racconto successivo, a giugno Franklin ci riesce con un aquilone, ma alcuni storici ne dubitano.', chi: 'Benjamin Franklin, Thomas-François Dalibard' },
    { anno: 1785, titolo: 'La bilancia di torsione', testo: 'L\'ingegnere militare Charles-Augustin de Coulomb presenta all\'Accademia delle scienze di Parigi la sua bilancia di torsione. Con essa mostra che la repulsione tra due cariche cala con il quadrato della distanza.', chi: 'Charles-Augustin de Coulomb' },
    { anno: 1897, titolo: 'Ecco l\'elettrone', testo: 'Studiando i raggi catodici, Joseph John Thomson scopre che sono fatti di particelle con carica negativa, molto più leggere di un atomo di idrogeno. Lui le chiama «corpuscoli»; si imporrà il nome *elettrone*, che George Johnstone Stoney aveva proposto nel 1891 per l\'unità di carica.', chi: 'Joseph John Thomson' },
    { anno: 1909, titolo: 'Le gocce di Millikan', testo: 'Robert Millikan e il suo studente Harvey Fletcher osservano minuscole gocce d\'olio cariche che cadono e risalgono tra due piastre metalliche: la carica di ogni goccia è sempre un multiplo della carica dell\'elettrone. I risultati definitivi escono nel 1913.', chi: 'Robert Andrews Millikan, Harvey Fletcher' },
  ],

  glossario: [
    { termine: 'Carica elettrica', definizione: 'Proprietà della materia che fa nascere le forze elettriche: può essere positiva o negativa e si misura in coulomb (C). Cariche dello stesso segno si respingono, di segno opposto si attirano.' },
    { termine: 'Coulomb', definizione: 'Unità di misura della carica elettrica, simbolo C: è la carica di circa 6,24 × 10¹⁸ elettroni, quella che una corrente di 1 ampere trasporta in un secondo.' },
    { termine: 'Elettrone', definizione: 'Particella leggerissima con carica negativa che forma la parte esterna degli atomi: porta la più piccola quantità di carica che si trovi libera in natura, circa 1,602 × 10⁻¹⁹ C.' },
    { termine: 'Protone', definizione: 'Particella con carica positiva che si trova nel nucleo dell\'atomo, circa 1836 volte più pesante dell\'elettrone: ha la sua stessa quantità di carica, con segno opposto.' },
    { termine: 'Atomo', definizione: 'Il mattone della materia: un nucleo piccolissimo di protoni e neutroni circondato da elettroni. Se ha tanti elettroni quanti protoni, è elettricamente neutro.' },
    { termine: 'Conduttore', definizione: 'Materiale in cui le cariche si spostano facilmente, come i metalli, l\'acqua salata e il corpo umano.' },
    { termine: 'Isolante', definizione: 'Materiale in cui le cariche restano ferme al loro posto, come plastica, vetro, gomma, ambra e aria secca: un oggetto isolante strofinato resta carico.' },
    { termine: 'Elettricità statica', definizione: 'Carica ferma accumulata su un oggetto, di solito un isolante strofinato: si fa notare con attrazioni, capelli che si rizzano e piccole scintille quando si scarica.' },
    { termine: 'Legge di Coulomb', definizione: 'La forza tra due cariche è proporzionale al prodotto delle cariche e inversamente proporzionale al quadrato della loro distanza: `F = k · q₁ · q₂ / r²`.' },
    { termine: 'Campo elettrico', definizione: 'Il modo in cui una carica modifica lo spazio intorno a sé: in ogni punto dice quale forza sentirebbe una piccola carica positiva.' },
  ],
});
