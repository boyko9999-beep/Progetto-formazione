/*
 * Capitolo 3 · Tensione, resistenza e legge di Ohm.
 *
 * Schema di un capitolo (titolo, descrizione e periodo stanno in section.js):
 *   apertura         frase d'impatto in corsivo
 *   intro            paragrafi; nel testo: **grassetto**, *corsivo*, `formula`,
 *                    [[voce]] o [[testo visibile|voce]] del glossario
 *   figura           { svg, alt, didascalia }: illustrazione SVG originale; stili e
 *                    animazioni in capitoli/<id>.css con le classi fig-<id>-*
 *   inBreve          3-4 punti chiave
 *   formule          [{ nome, formula, legenda: [[simbolo, grandezza, unità]] }]
 *   laboratori       [{ id, titolo, consegna, sfide: [{ id, testo }] }]
 *   approfondimenti  [{ titolo, paragrafi }]
 *   sapevi           curiosità
 *   storia           [{ anno, annoTesto?, titolo, testo, chi }] (anno negativo = a.C.)
 *   glossario        [{ termine, definizione }]
 */
EB.capitolo({
  id: 'ohm',

  apertura: 'Tre grandezze e una sola relazione: se raddoppi la spinta, raddoppia il flusso. Georg Simon Ohm la spiegò in un libro del 1827, ma ci vollero anni perché gli altri fisici la accettassero.',

  intro: [
    'Ogni circuito ha tre protagonisti. La [[tensione]] è la «spinta» che mette in movimento le cariche: la fornisce una pila o una presa e si misura in [[volt]] (V), in onore di Alessandro Volta. La [[corrente]] è la quantità di carica che attraversa il filo ogni secondo e si misura in [[ampere]] (A). La [[resistenza]] dice quanto il circuito si oppone al passaggio delle cariche e si misura in [[ohm]] (Ω).',
    'Un\'immagine aiuta: pensa all\'acqua in un tubo. La tensione è la differenza di pressione tra le due estremità, la corrente è quanti litri passano ogni secondo, la resistenza è quanto il tubo è stretto o intasato. Più pressione spinge più acqua; un tubo più stretto ne lascia passare meno.',
    'La [[legge di Ohm]] lega le tre grandezze in una formula sola: `V = R · I`. Se la resistenza non cambia, la corrente è **proporzionale** alla tensione: con il doppio dei volt passa il doppio degli ampere. Se invece la tensione resta la stessa, la corrente è **inversamente proporzionale** alla resistenza: con il doppio degli ohm passa metà corrente.',
    'Con una divisione la formula si gira come serve: `I = V / R` per calcolare la corrente, `R = V / I` per ricavare una resistenza dalle misure. È il calcolo più frequente in elettronica: serve per scegliere il [[resistore]] che protegge un LED, per capire se un filo reggerà la corrente, per controllare un circuito con il [[multimetro]].',
  ],

  figura: {
    alt: 'Ricostruzione dell\'esperimento di Ohm: una termocoppia di bismuto e rame con una giunzione in acqua bollente e una nel ghiaccio, collegata con fili di rame a un galvanometro a torsione con un ago magnetico appeso a un filo.',
    didascalia: 'L\'esperimento di Ohm (ricostruzione). Le pile di allora davano una tensione che calava durante le misure, così nel 1826 Ohm passò a una termocoppia: una giunzione nell\'acqua bollente, l\'altra nel ghiaccio. La corrente nei fili di prova faceva ruotare un ago magnetico appeso a un filo sottile: con una sorgente finalmente stabile, Ohm poté confrontare fili di lunghezza diversa.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<g class="fig-ohm-vetro">' +
      '<path d="M26 112v86q0 8 8 8h62q8 0 8-8v-86"/>' +
      '<path d="M136 112v86q0 8 8 8h62q8 0 8-8v-86"/>' +
      '</g>' +
      '<rect class="fig-ohm-acqua-calda" x="28" y="134" width="74" height="70" rx="6"/>' +
      '<rect class="fig-ohm-acqua-fredda" x="138" y="134" width="74" height="70" rx="6"/>' +
      '<g class="fig-ohm-ghiaccio"><rect x="146" y="140" width="16" height="16" rx="3"/><rect x="186" y="146" width="15" height="15" rx="3"/><rect x="164" y="170" width="17" height="17" rx="3"/></g>' +
      '<g class="fig-ohm-vapore"><path d="M48 128c-6-8 6-12 0-20"/><path d="M66 126c-6-8 6-12 0-20"/><path d="M84 128c-6-8 6-12 0-20"/></g>' +
      '<g class="fig-ohm-fiamma"><path d="M65 232c-9 0-13-7-9-14 2-4 6-6 7-11 4 4 11 9 11 16 0 6-4 9-9 9z"/></g>' +
      '<path class="fig-ohm-bismuto" d="M70 182V92h102v90"/>' +
      '<path class="fig-ohm-rame" d="M70 182c-12 0-16-6-16-14V60h212"/>' +
      '<path class="fig-ohm-rame" d="M172 182c14 0 18-6 18-14v-48h22c4-10 12-10 14 0s10 10 14 0 12-10 14 0h12"/>' +
      '<circle class="fig-ohm-giunzione" cx="70" cy="182" r="4.5"/><circle class="fig-ohm-giunzione" cx="172" cy="182" r="4.5"/>' +
      '<rect class="fig-ohm-cilindro" x="262" y="40" width="80" height="176" rx="12"/>' +
      '<path class="fig-ohm-sospensione" d="M302 44v108"/>' +
      '<ellipse class="fig-ohm-scala" cx="302" cy="170" rx="32" ry="11"/>' +
      '<g class="fig-ohm-ago"><path d="M302 166l-26 4 26 4 26-4z"/></g>' +
      '<circle cx="302" cy="44" r="3.5" class="fig-ohm-giunzione"/>' +
      '<text class="fig-ohm-t" x="80" y="226">100 °C</text>' +
      '<text class="fig-ohm-t" x="175" y="226" text-anchor="middle">0 °C</text>' +
      '<text class="fig-ohm-t" x="121" y="86" text-anchor="middle">bismuto</text>' +
      '<text class="fig-ohm-t" x="170" y="52" text-anchor="middle">rame</text>' +
      '<text class="fig-ohm-t" x="226" y="144" text-anchor="middle">filo di prova</text>' +
      '<text class="fig-ohm-t" x="302" y="232" text-anchor="middle">galvanometro</text>' +
      '</svg>',
  },

  inBreve: [
    'La tensione (V, volt) spinge, la corrente (I, ampere) scorre, la resistenza (R, ohm) frena.',
    'Legge di Ohm: `V = R · I`. A resistenza fissa, corrente e tensione crescono insieme, in proporzione.',
    'Sul grafico corrente-tensione un resistore è una retta che parte da zero: più è ripida, più la resistenza è piccola.',
    'Le bande colorate di un resistore seguono il [[codice colori]]: dicono il suo valore in ohm e la sua [[tolleranza]].',
  ],

  formule: [
    { nome: 'Prima legge di Ohm', formula: 'V = R · I', legenda: [['V', 'tensione', 'volt, V'], ['R', 'resistenza', 'ohm, Ω'], ['I', 'corrente', 'ampere, A']] },
    { nome: 'Seconda legge di Ohm', formula: 'R = ρ · l / S', legenda: [['ρ', 'resistività del materiale', 'Ω·m'], ['l', 'lunghezza del filo', 'm'], ['S', 'sezione del filo', 'm²']] },
  ],

  laboratori: [
    {
      id: 'ohm',
      titolo: 'Il banco di Ohm',
      consegna: 'Regola la tensione della pila e il valore del resistore. Guarda l\'ago dell\'amperometro, la velocità degli elettroni e il punto sul grafico corrente-tensione.',
      sfide: [
        { id: 'proporzionale', testo: 'Lascia ferma la resistenza e **raddoppia la tensione**: che cosa fa la corrente?' },
        { id: 'cento-milli', testo: 'Fai passare esattamente **100 mA** (cioè 0,1 A).' },
        { id: 'stessa-corrente', testo: 'Trova **due coppie diverse** di tensione e resistenza con la stessa corrente (prova con 100 Ω e poi con 120 Ω).' },
      ],
    },
    {
      id: 'resistori',
      titolo: 'Leggi il resistore',
      consegna: 'Le bande colorate sono un codice: le prime due sono cifre e formano un numero, la terza dice quanti zeri aggiungere, la quarta indica la precisione. Cambia i colori o scegli un valore e guarda le bande.',
      sfide: [
        { id: 'quattro-sette', testo: 'Componi un resistore da **4,7 kΩ** (giallo, viola, rosso).' },
        { id: 'misteriosi', testo: 'Leggi **tre resistori misteriosi** di fila senza sbagliare.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Da dove viene la resistenza',
      paragrafi: [
        'Dentro un metallo gli elettroni liberi non viaggiano indisturbati: urtano di continuo gli atomi, che vibrano per il calore. Ogni urto sottrae un po\' di energia al moto delle cariche e la trasforma in calore. La resistenza è l\'effetto complessivo di questi urti.',
        'La resistenza di un filo dipende da tre cose: il materiale, la lunghezza e lo spessore. È la *seconda legge di Ohm*, `R = ρ · l / S`. Il rame ha una [[resistività]] bassissima, 0,0000000168 Ω·m, ed è il materiale dei cavi; il nichel-cromo ne ha una sessantina di volte di più ed è il filo delle resistenze che scaldano tostapane e asciugacapelli.',
        'Un filo lungo il doppio ha resistenza doppia; un filo con sezione doppia ha resistenza dimezzata, proprio come un tubo più largo lascia passare più acqua.',
      ],
    },
    {
      titolo: 'Quando la legge di Ohm non vale',
      paragrafi: [
        'La legge di Ohm descrive bene i conduttori *ohmici*: resistori e fili metallici a temperatura costante. Non tutti i componenti però si comportano così.',
        'Il filamento di una lampadina, scaldandosi, aumenta la sua resistenza di dieci volte e più. Per questo le lampadine a incandescenza si bruciavano spesso proprio all\'accensione, quando il filamento è freddo e la corrente è massima. Diodi e LED seguono regole ancora diverse: li incontrerai nella sezione Elettronica intermedia.',
      ],
    },
    {
      titolo: 'Perché la presa è pericolosa e la pila no',
      paragrafi: [
        'Tra una mano e l\'altra il corpo umano ha una resistenza che va da circa 1000 Ω, con la pelle bagnata, a 100 000 Ω e oltre con la pelle asciutta. Con una pila da 9 V la corrente resta piccola: nel caso peggiore 9 volt divisi per 1000 ohm fanno 9 milliampere, e con le mani asciutte meno di un decimo di milliampere, che non si sente nemmeno.',
        'Con i 230 V della presa, attraverso la pelle bagnata possono passare oltre 200 milliampere: abbastanza per far perdere il ritmo al cuore. A fare danno è la corrente, ma è la tensione a spingerla: ecco perché con la rete elettrica non si scherza.',
      ],
    },
  ],

  sapevi: 'Quasi cinquant\'anni prima di Ohm, l\'inglese Henry Cavendish era arrivato molto vicino alla stessa legge, ma non pubblicò mai i suoi risultati. Non avendo uno strumento per misurare la corrente, la «misurava» con il proprio corpo: toccava i due capi del circuito e valutava quanto era forte la scossa. I suoi appunti uscirono solo nel 1879, curati da James Clerk Maxwell.',

  storia: [
    { anno: 1781, titolo: 'La scossa come strumento', testo: 'Henry Cavendish scarica [[bottiglie di Leida|bottiglia di Leida]] attraverso tubi di vetro pieni di acqua salata e confronta le scosse che sente sul proprio corpo: la corrente risulta quasi proporzionale alla tensione. Non pubblica nulla, e i suoi appunti restano inediti per quasi un secolo.', chi: 'Henry Cavendish' },
    { anno: 1821, titolo: 'La termocoppia di Seebeck', testo: 'A Berlino Thomas Johann Seebeck scopre che un anello di due metalli diversi devia un ago magnetico se le due saldature sono a temperature diverse. Lui pensa a un effetto magnetico, ma nell\'anello circola una corrente. Nel 1826, su consiglio di Johann Christian Poggendorff, Ohm userà proprio una termocoppia come sorgente stabile.', chi: 'Thomas Johann Seebeck' },
    { anno: 1827, titolo: 'Il circuito galvanico', testo: 'Georg Simon Ohm, insegnante di matematica e fisica, pubblica a Berlino *Die galvanische Kette, mathematisch bearbeitet* («Il circuito galvanico studiato matematicamente»): la corrente è proporzionale alla tensione e inversamente proporzionale alla resistenza. Molti studiosi tedeschi accolgono il libro con freddezza.', chi: 'Georg Simon Ohm' },
    { anno: 1841, titolo: 'La medaglia Copley', testo: 'La Royal Society di Londra assegna a Ohm la medaglia Copley, uno dei massimi riconoscimenti scientifici dell\'epoca. Nel 1852 otterrà finalmente la cattedra di fisica all\'Università di Monaco.', chi: 'Royal Society' },
    { anno: 1881, titolo: 'Unità per tutto il mondo', testo: 'Al primo Congresso internazionale degli elettricisti, a Parigi, scienziati di molti paesi adottano volt, ampere e ohm come unità pratiche comuni, al posto delle tante unità diverse usate fino ad allora. Il nome «ohm» circolava già in Gran Bretagna dalla fine degli anni 1860; il suo simbolo è la lettera greca Ω, omega, che ne ricorda il suono.', chi: 'Congresso internazionale degli elettricisti' },
    { anno: 1924, annoTesto: 'anni 1920', titolo: 'Il codice a colori', testo: 'Con la diffusione della radio i resistori sono sempre più piccoli: stamparci sopra un numero leggibile è difficile, e la scritta può rovinarsi durante la saldatura. Negli Stati Uniti l\'associazione dei costruttori di radio introduce le bande colorate, che si leggono a colpo d\'occhio; dal 1952 il codice è una norma internazionale.', chi: 'Radio Manufacturers Association' },
  ],

  glossario: [
    { termine: 'Tensione', definizione: 'La «spinta» che mette in movimento le cariche: è l\'energia che ogni coulomb di carica guadagna o perde passando da un punto all\'altro del circuito. Si misura in volt (V) e si chiama anche differenza di potenziale.' },
    { termine: 'Volt', definizione: 'Unità di misura della tensione, dedicata ad Alessandro Volta: 1 volt corrisponde a 1 joule di energia per ogni coulomb di carica.' },
    { termine: 'Resistenza', definizione: 'Quanto un componente si oppone al passaggio della corrente. Si misura in ohm (Ω).' },
    { termine: 'Ohm', definizione: 'Unità di misura della resistenza, simbolo Ω: un resistore da 1 ohm con 1 volt ai capi lascia passare 1 ampere.' },
    { termine: 'Legge di Ohm', definizione: 'La relazione `V = R · I` tra tensione, resistenza e corrente, valida per i conduttori ohmici come fili metallici e resistori.' },
    { termine: 'Resistore', definizione: 'Componente costruito per avere una resistenza precisa; il valore è indicato da bande colorate o da un codice stampato.' },
    { termine: 'Resistività', definizione: 'Quanto un materiale si oppone alla corrente, indipendentemente dalla forma del pezzo; si misura in Ω·m. Il rame ne ha pochissima, il vetro moltissima.' },
    { termine: 'Codice colori', definizione: 'Sistema di bande colorate che indica valore e tolleranza di un resistore: ogni colore vale una cifra, dal nero (0) al bianco (9).' },
    { termine: 'Tolleranza', definizione: 'Di quanto il valore reale di un componente può scostarsi da quello dichiarato: un resistore da 100 Ω al 5% può valere tra 95 e 105 Ω.' },
  ],
});
