/*
 * Capitolo 6 · Il condensatore.
 * Schema dei campi: vedi il commento in capitoli/ohm.js. Stili e animazioni della figura
 * in capitoli/condensatore.css (classi fig-condensatore-*).
 */
EB.capitolo({
  id: 'condensatore',

  apertura: 'Due lastre di metallo che non si toccano, un velo di isolante in mezzo: non serve altro per mettere da parte energia elettrica e restituirla in un lampo. È il condensatore, e in uno smartphone ce ne sono fino a un migliaio.',

  intro: [
    'Prendi due lastre di metallo, mettile una di fronte all\'altra e separale con un sottile strato [[isolante]], come aria, carta o vetro. Collegale ai poli di una [[pila]]: per un istante scorre una [[corrente]], poi si ferma. La pila ha tolto [[elettroni|elettrone]] a una lastra e li ha spinti sull\'altra: ora una è carica positivamente, l\'altra negativamente, e le due cariche si attirano senza potersi raggiungere. Hai costruito un [[condensatore]]: le lastre sono le sue [[armature|armatura]], l\'isolante è il [[dielettrico]]. Il primo della storia, la [[bottiglia di Leida]], era un vaso di vetro con dell\'acqua dentro e una mano fuori; presto le due armature diventarono fogli di metallo.',
    'Pensa a un tubo pieno d\'acqua, chiuso nel mezzo da una membrana di gomma. Se una pompa spinge, l\'acqua si sposta per un attimo e la membrana si tende, poi tutto si ferma. La membrana tesa, però, conserva energia: lasciata libera, rimanda indietro l\'acqua. Nel condensatore la pompa è la pila, che fornisce la [[tensione]], e la membrana è il dielettrico: l\'energia resta immagazzinata nel [[campo elettrico]] tra le armature.',
    'Quanta carica accumula un condensatore? Dipende dalla tensione: con il doppio dei volt raddoppia anche la carica. Il rapporto tra le due è la [[capacità]], `C = Q / V`, e si misura in [[farad]] (F): 1 farad vuol dire 1 [[coulomb]] per ogni volt. È un\'unità enorme: per avere 1 F con due armature distanti 1 mm nel vuoto, ciascuna dovrebbe misurare più di 110 km², un quadrato di oltre 10 km di lato. In pratica si usano microfarad (µF), nanofarad (nF) e picofarad (pF). La capacità cresce con la superficie delle armature, cala con la loro distanza e dipende dal dielettrico: `C = ε₀ · εr · A / d`.',
    'Un condensatore carico conserva [[energia]]: `E = ½ · C · V²`, quattro volte tanta se raddoppi la tensione. A parità di peso una pila ne contiene molta di più, ma la cede piano; il condensatore ne contiene poca e la restituisce in un istante, come nel flash. E fa molto altro: negli alimentatori è un piccolo serbatoio che rende regolare la tensione; sotto lo schermo del telefono il dito cambia la capacità di una griglia di elettrodi trasparenti, e così il circuito sa dove l\'hai toccato; nella memoria principale del computer ogni bit è affidato a un condensatore microscopico, carico o scarico.',
  ],

  figura: {
    alt: 'Bottiglia di Leida: vaso di vetro rivestito di stagnola dentro e fuori, tappo di legno, asta di ottone con un pomello in cima e una catenella che scende all\'armatura interna. Segni più sull\'armatura interna, meno su quella esterna. Uno scaricatore ad arco con manico di vetro tocca l\'armatura esterna; una scintilla scocca verso il pomello.',
    didascalia: 'La bottiglia di Leida nella forma classica (ricostruzione). La stagnola interna, collegata al pomello, ha qui una carica positiva, quella esterna una carica negativa uguale. Quando lo scaricatore le collega, l\'energia se ne va in una scintilla: per la prima volta l\'elettricità si poteva conservare e liberare a comando.',
    svg: '<svg class="fig-condensatore-svg" viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<linearGradient id="fig-condensatore-g-stagnola" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" class="fig-condensatore-st-scuro"/><stop offset=".26" class="fig-condensatore-st-chiaro"/><stop offset=".6" class="fig-condensatore-st-medio"/><stop offset="1" class="fig-condensatore-st-scuro"/>' +
      '</linearGradient>' +
      '<linearGradient id="fig-condensatore-g-interna" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" class="fig-condensatore-st-scuro"/><stop offset="1" class="fig-condensatore-st-medio"/>' +
      '</linearGradient>' +
      '<radialGradient id="fig-condensatore-g-ottone" cx=".38" cy=".34" r=".72">' +
      '<stop offset="0" class="fig-condensatore-ot-luce"/><stop offset=".55" class="fig-condensatore-ot-medio"/><stop offset="1" class="fig-condensatore-ot-ombra"/>' +
      '</radialGradient>' +
      '<radialGradient id="fig-condensatore-g-bagliore">' +
      '<stop offset="0" class="fig-condensatore-bg-centro"/><stop offset="1" class="fig-condensatore-bg-bordo"/>' +
      '</radialGradient>' +
      '</defs>' +
      // bottiglia: interno visto attraverso il vetro, poi vetro, stagnola esterna e tappo
      '<ellipse class="fig-condensatore-ombra" cx="150" cy="218" rx="62" ry="7"/>' +
      '<ellipse class="fig-condensatore-interna" cx="150" cy="126" rx="42" ry="8.6"/>' +
      '<path class="fig-condensatore-asta" d="M150 76v12"/>' +
      '<path class="fig-condensatore-catena" d="M150 88c1.6 14 2.6 31 .6 48"/>' +
      '<path class="fig-condensatore-vetro" d="M106 72A44 9 0 0 1 194 72V208A44 9 0 0 1 106 208Z"/>' +
      '<path class="fig-condensatore-esterna" d="M106 126A44 9 0 0 0 194 126V208A44 9 0 0 1 106 208Z"/>' +
      '<path class="fig-condensatore-orlo" d="M106 126A44 9 0 0 0 194 126"/>' +
      '<path class="fig-condensatore-sagoma" d="M106 74V208A44 9 0 0 0 194 208V74"/>' +
      '<path class="fig-condensatore-riflesso" d="M114 88v28"/>' +
      '<path class="fig-condensatore-legno" d="M103 64V72A47 9.6 0 0 0 197 72V64A47 9.6 0 0 1 103 64Z"/>' +
      '<ellipse class="fig-condensatore-legno-sopra" cx="150" cy="64" rx="47" ry="9.6"/>' +
      '<path class="fig-condensatore-asta" d="M150 64V30"/>' +
      '<circle class="fig-condensatore-sfera" cx="150" cy="22" r="10"/>' +
      // cariche: + sull'armatura interna, − su quella esterna, in ugual numero
      '<g class="fig-condensatore-cariche">' +
      '<g class="fig-condensatore-piu">' +
      '<circle cx="121" cy="126" r="4.6"/><path d="M118.6 126h4.8M121 123.6v4.8"/>' +
      '<circle cx="136" cy="126" r="4.6"/><path d="M133.6 126h4.8M136 123.6v4.8"/>' +
      '<circle cx="165" cy="126" r="4.6"/><path d="M162.6 126h4.8M165 123.6v4.8"/>' +
      '<circle cx="180" cy="126" r="4.6"/><path d="M177.6 126h4.8M180 123.6v4.8"/>' +
      '</g>' +
      '<g class="fig-condensatore-meno">' +
      '<circle cx="121" cy="155" r="4.6"/><path d="M118.6 155h4.8"/>' +
      '<circle cx="136" cy="158" r="4.6"/><path d="M133.6 158h4.8"/>' +
      '<circle cx="165" cy="158" r="4.6"/><path d="M162.6 158h4.8"/>' +
      '<circle cx="180" cy="155" r="4.6"/><path d="M177.6 155h4.8"/>' +
      '</g>' +
      '</g>' +
      // scaricatore: arco di ottone con manico di vetro, ruota attorno al pomello inferiore
      '<g class="fig-condensatore-arco">' +
      '<path class="fig-condensatore-manico-bordo" d="M269 105L326 117"/>' +
      '<path class="fig-condensatore-manico" d="M269 105L326 117"/>' +
      '<path class="fig-condensatore-ottone" d="M200.5 176C246 176 268 128 262 92C256 52 222 22 182 22"/>' +
      '<path class="fig-condensatore-ottone-luce" d="M200.5 176C246 176 268 128 262 92C256 52 222 22 182 22"/>' +
      '<circle class="fig-condensatore-sfera" cx="265" cy="103.5" r="4.4"/>' +
      '<circle class="fig-condensatore-sfera" cx="200.5" cy="176" r="6.5"/>' +
      '<circle class="fig-condensatore-sfera" cx="182" cy="22" r="6"/>' +
      '</g>' +
      '<circle class="fig-condensatore-bagliore" cx="168" cy="21.5" r="15"/>' +
      '<g class="fig-condensatore-scintilla">' +
      '<path d="M160 21.5L164.2 16.6L167.4 25.6L171.8 18.4L176 22.2"/>' +
      '<path class="fig-condensatore-nucleo" d="M160 21.5L164.2 16.6L167.4 25.6L171.8 18.4L176 22.2"/>' +
      '</g>' +
      // didascalie con linee di richiamo
      '<g class="fig-condensatore-guide"><path d="M101 22.5H139M101 88.5H112M101 107.5H148M101 127.5H113M101 174.5H117"/></g>' +
      '<g class="fig-condensatore-punti"><circle cx="139" cy="22.5" r="1.8"/><circle cx="112" cy="88.5" r="1.8"/><circle cx="148" cy="107.5" r="1.8"/><circle cx="113" cy="127.5" r="1.8"/><circle cx="117" cy="174.5" r="1.8"/></g>' +
      '<text class="fig-condensatore-t" x="98" y="26" text-anchor="end">pomello</text>' +
      '<text class="fig-condensatore-t" x="98" y="92" text-anchor="end">vetro</text>' +
      '<text class="fig-condensatore-t" x="98" y="111" text-anchor="end">catenella</text>' +
      '<text class="fig-condensatore-t" x="98" y="131" text-anchor="end">armatura interna</text>' +
      '<text class="fig-condensatore-t" x="98" y="178" text-anchor="end">armatura esterna</text>' +
      '<text class="fig-condensatore-t" x="298" y="146" text-anchor="middle">scaricatore</text>' +
      '</svg>',
  },

  inBreve: [
    'Un condensatore è fatto di due armature separate da un isolante, il dielettrico: quando lo carichi, prendono cariche uguali e opposte.',
    'La capacità `C = Q / V` è la carica accumulata per ogni volt; si misura in farad, un\'unità così grande che in pratica si usano µF, nF e pF.',
    'Armature più grandi e più vicine, separate da un dielettrico migliore, danno più capacità: `C = ε₀ · εr · A / d`.',
    'L\'energia immagazzinata, `E = ½ · C · V²`, cresce con il quadrato della tensione e si può liberare in un istante, come nel flash.',
  ],

  formule: [
    { nome: 'Capacità', formula: 'C = Q / V', legenda: [['C', 'capacità', 'farad, F'], ['Q', 'carica su ciascuna armatura', 'coulomb, C'], ['V', 'tensione tra le armature', 'volt, V']] },
    { nome: 'Condensatore a piatti piani', formula: 'C = ε₀ · εr · A / d', legenda: [['ε₀', 'costante dielettrica del vuoto', '8,85 × 10⁻¹² F/m'], ['εr', 'costante dielettrica relativa dell\'isolante', 'numero puro'], ['A', 'area di ciascuna armatura', 'm²'], ['d', 'distanza tra le armature', 'm']], nota: 'Due armature di 1 m² distanti 1 mm, nel vuoto, fanno appena 8,85 nF.' },
    { nome: 'Energia immagazzinata', formula: 'E = ½ · C · V²', legenda: [['E', 'energia', 'joule, J'], ['C', 'capacità', 'farad, F'], ['V', 'tensione', 'volt, V']] },
  ],

  laboratori: [
    {
      id: 'condensatore',
      titolo: 'Il condensatore a piatti',
      consegna: 'Cambia la superficie dei piatti, la loro distanza e il materiale che li separa, poi carica il condensatore con la pila. Quando è carico, scaricalo nel flash e guarda dove va a finire l\'energia.',
      sfide: [
        { id: 'doppia-capacita', testo: '**Raddoppia la capacità** senza cambiare il materiale tra i piatti.' },
        { id: 'dielettrico', testo: 'Metti il **vetro** tra i piatti e carica il condensatore: quanta carica in più accumula, a parità di tensione?' },
        { id: 'lampo', testo: '**Carica** il condensatore e poi **scaricalo** nel flash.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Dentro un condensatore vero',
      paragrafi: [
        'Per avere tanta capacità in poco spazio si agisce sulle tre leve della formula: superfici grandi ripiegate su sé stesse, dielettrici sottilissimi e materiali, come certe ceramiche, che la moltiplicano anche migliaia di volte. Nei condensatori a film due nastri di plastica metallizzata sono avvolti a rotolo; in quelli ceramici molti strati di ceramica e di metallo sono impilati in un blocchetto spesso più piccolo di un chicco di riso.',
        'Gli elettrolitici sono i più capienti tra i condensatori comuni. Un\'armatura è un foglio di alluminio, il dielettrico è il velo di ossido che lo ricopre, con uno spessore inferiore a un millesimo di millimetro, e l\'altra armatura è un liquido conduttore, l\'elettrolita. Hanno una polarità, indicata da una fascia sul lato del terminale negativo: collegati al contrario si scaldano, producono gas e possono gonfiarsi o scoppiare.',
        'Sui condensatori piccoli il valore è stampato in codice, in picofarad: le prime due cifre si leggono così come sono, la terza dice quanti zeri aggiungere. Così 104 vuol dire 10 seguito da quattro zeri, cioè 100 000 pF, ovvero 100 nF: lo stesso trucco della terza banda nel [[codice colori]] dei [[resistori|resistore]].',
      ],
    },
    {
      titolo: 'Il flash: carica lenta, scarica velocissima',
      paragrafi: [
        'Il tubo allo xeno di un flash richiede, per un attimo, qualche centinaio di volt e una corrente fortissima: una pila stilo da 1,5 V non potrebbe darli. Così un piccolo circuito che alza la tensione carica con calma un condensatore fino a circa 300 V, in qualche secondo; quando scatti, il condensatore si svuota nel tubo in circa un millesimo di secondo.',
        'Ecco i conti per una fotocamera usa e getta, con un condensatore da 160 µF caricato a 300 V. L\'energia, `E = ½ · C · V²`, è di circa 7 J: quanta ne serve per sollevare un litro d\'acqua di 70 cm. Liberata in un millesimo di secondo, però, corrisponde a una [[potenza]] di migliaia di watt, molto più di quanto la pila saprebbe dare. Il condensatore non crea energia: la raccoglie piano e la restituisce tutta insieme.',
      ],
    },
    {
      titolo: 'Attenzione: la carica resta',
      paragrafi: [
        'Un condensatore non si scarica per forza quando spegni un apparecchio. Negli alimentatori, nei forni a microonde e nei vecchi televisori a tubo ci sono condensatori caricati a centinaia o migliaia di volt, che possono restare carichi a lungo, per esempio se il resistore di scarica è guasto. Per questo quegli apparecchi non si aprono, nemmeno con la spina staccata: è un lavoro da tecnici.',
        'Due equivoci da evitare. Primo: un condensatore carico non contiene carica «in più». Le armature hanno cariche uguali e opposte, che in totale fanno zero: ciò che accumula è energia, nel campo elettrico tra loro. Secondo: la corrente non attraversa il dielettrico. Durante la carica gli elettroni arrivano su un\'armatura e lasciano l\'altra, così nel resto del circuito sembra proprio che passino; a carica finita, la corrente si ferma.',
      ],
    },
  ],

  sapevi: 'Considerata come una sfera conduttrice isolata nello spazio, la Terra ha una capacità di circa 710 µF: meno di un comune condensatore elettrolitico da 1000 µF, alto un paio di centimetri. Un supercondensatore da 3000 F, grande più o meno come una lattina, ha la capacità di oltre quattro milioni di Terre.',

  storia: [
    { anno: 1745, titolo: 'Un chiodo in una boccetta', testo: 'Nell\'autunno del 1745 Ewald Georg von Kleist, decano della cattedrale di Cammin, in Pomerania, elettrizza un chiodo infilato nel tappo di una boccetta da farmacia con dentro dell\'alcol, che tiene in mano. Quando tocca il chiodo prende una scossa violenta.', chi: 'Ewald Georg von Kleist' },
    { anno: 1746, titolo: 'La bottiglia di Leida', testo: 'A Leida Andreas Cunaeus e poi Pieter van Musschenbroek prendono una forte scossa da un vaso d\'acqua elettrizzato; il 20 gennaio 1746 Musschenbroek scrive a Parigi che non rifarebbe la prova per tutto il regno di Francia. L\'abate Jean-Antoine Nollet, a cui si attribuisce il nome «bottiglia di Leida», rende celebre il vaso scaricandolo, davanti a Luigi XV, attraverso una catena di 180 guardie.', chi: 'Andreas Cunaeus, Pieter van Musschenbroek, Jean-Antoine Nollet' },
    { anno: 1749, annoTesto: '1747–1749', titolo: 'La «batteria» di Franklin', testo: 'Benjamin Franklin mostra che le due armature prendono cariche uguali e opposte, «più» e «meno», tenute separate dal vetro. Tra il 1748 e il 1749 collega undici lastre di vetro rivestite di piombo e chiama l\'insieme «batteria elettrica», con la parola che indicava un gruppo di cannoni.', chi: 'Benjamin Franklin' },
    { anno: 1782, titolo: 'Il «condensatore» di Volta', testo: 'In una memoria pubblicata dalla Royal Society di Londra, Alessandro Volta presenta un nuovo strumento e lo chiama «condensatore»: due piatti di metallo separati da un sottile strato isolante, che raccolgono cariche debolissime. Quando si solleva il piatto superiore la tensione sale e l\'elettrometro, finalmente, le rivela.', chi: 'Alessandro Volta' },
    { anno: 1837, titolo: 'Il ruolo dell\'isolante', testo: 'Michael Faraday confronta due condensatori identici, uno con aria tra le armature e l\'altro con gommalacca o zolfo: a parità di tensione il secondo accumula più carica. Chiama questi isolanti «dielettrici»; la loro «capacità induttiva specifica» è quella che oggi chiamiamo costante dielettrica.', chi: 'Michael Faraday' },
    { anno: 1896, titolo: 'Nasce l\'elettrolitico', testo: 'L\'ingegnere polacco Karol Pollak deposita il brevetto di un condensatore con elettrodi di alluminio immersi in un liquido conduttore: il dielettrico è il sottilissimo velo di ossido che ricopre il metallo. È il principio degli elettrolitici di oggi.', chi: 'Karol Pollak' },
    { anno: 1957, titolo: 'Il carbonio poroso', testo: 'Howard Becker, della General Electric, brevetta un condensatore con elettrodi di carbonio poroso immersi in un elettrolita. È l\'antenato dei supercondensatori, che oggi arrivano a migliaia di farad e fanno viaggiare perfino autobus elettrici ricaricati alle fermate.', chi: 'Howard Becker, General Electric' },
    { anno: 1966, annoTesto: '1966–1968', titolo: 'Un bit in un condensatore', testo: 'Robert Dennard, dell\'IBM, immagina una cella di memoria fatta di un transistor e di un minuscolo condensatore: carica presente o assente, 1 o 0. Brevettata nel 1968, è il cuore della DRAM, la memoria «dinamica»: la carica sfugge in fretta e va riscritta almeno ogni 64 millesimi di secondo.', chi: 'Robert Dennard, IBM' },
  ],

  glossario: [
    { termine: 'Condensatore', definizione: 'Componente formato da due conduttori, le armature, separati da un isolante: accumula cariche uguali e opposte e conserva energia nel campo elettrico tra loro.' },
    { termine: 'Capacità', definizione: 'Quanta carica accumula un condensatore per ogni volt di tensione, `C = Q / V`. Si misura in farad.' },
    { termine: 'Farad', definizione: 'Unità di misura della capacità, simbolo F, dedicata a Michael Faraday: 1 farad è 1 coulomb per volt. È enorme, perciò si usano µF, nF e pF.' },
    { termine: 'Dielettrico', definizione: 'L\'isolante tra le armature di un condensatore, come aria, carta, vetro o ceramica. La sua costante dielettrica relativa `εr` dice quante volte fa crescere la capacità rispetto al vuoto.' },
    { termine: 'Bottiglia di Leida', definizione: 'Il primo condensatore, nato tra il 1745 e il 1746: un vaso di vetro, all\'inizio con dell\'acqua, poi rivestito di stagnola dentro e fuori, con un\'asta metallica collegata all\'armatura interna.' },
    { termine: 'Armatura', definizione: 'Ciascuno dei due conduttori affacciati di un condensatore, come un piatto o un foglio di metallo.' },
  ],
});
