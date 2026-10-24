/*
 * Capitolo 2 · La corrente elettrica.
 * Schema descritto in capitoli/ohm.js; stili e animazioni della figura in capitoli/corrente.css.
 */
EB.capitolo({
  id: 'corrente',

  apertura: 'Per secoli l\'elettricità era stata fatta di scintille e di scosse che duravano un istante. Nel 1800 Alessandro Volta impilò dischi di zinco e di rame e riuscì, per la prima volta, a farla scorrere in un filo senza interruzione.',

  intro: [
    'Strofina un palloncino sui capelli: la [[carica elettrica]] che accumuli resta lì, ferma. Ora collega una lampadina ai due poli di una [[pila]] con due fili di metallo: dentro i fili le cariche si mettono in marcia tutte insieme, e continuano finché il percorso resta chiuso. Questo flusso ordinato è la [[corrente]] elettrica. Nei metalli, ottimi [[conduttori|conduttore]], a muoversi sono gli [[elettroni|elettrone]] più esterni degli atomi, liberi di passare dall\'uno all\'altro; nell\'acqua salata e nel corpo umano si muovono invece gli ioni, atomi con qualche elettrone in più o in meno.',
    'Pensa all\'impianto di riscaldamento di casa: la pompa spinge l\'acqua nei tubi, l\'acqua attraversa i termosifoni e torna alla pompa. La pila fa lo stesso con le cariche: non le crea, le spinge, e la sua spinta si chiama [[tensione]]. Serve però un [[circuito]] chiuso, un anello senza interruzioni da un polo della pila all\'altro. Se apri l\'interruttore il giro si spezza, e la corrente si ferma in tutto il circuito nello stesso istante, non solo nel punto in cui l\'hai aperto.',
    'L\'intensità di una corrente è la carica che attraversa una sezione del filo in un certo tempo: `I = Q / t`. Si misura in [[ampere]] (A): 1 ampere è 1 [[coulomb]] al secondo, cioè circa 6,24 miliardi di miliardi di elettroni ogni secondo. Il cavo che ricarica un telefono porta di solito uno o due ampere; un asciugacapelli da 2000 W, alla presa di casa, ne assorbe quasi 9. Sono gli ampere a scaldare i cavi, a far saltare i [[fusibili|fusibile]] e a scaricare le batterie.',
    'Negli schemi la corrente esce dal polo positivo della pila, percorre il circuito e rientra dal polo negativo. È il [[verso convenzionale|corrente convenzionale]], fissato quando nessuno sapeva ancora che cosa si muovesse nei fili. Nel 1897 fu scoperto l\'elettrone, e si capì presto che nei metalli a muoversi sono proprio gli elettroni, con la loro carica negativa: viaggiano quindi al contrario, dal polo negativo al positivo. Non c\'è niente da correggere: nei calcoli, una carica negativa che va a sinistra equivale a una positiva che va a destra.',
    'Ultima sorpresa. Gli elettroni di un metallo si agitano in tutte le direzioni a più di mille chilometri al secondo, ma lungo il filo avanzano lentissimi: con 1 A in un filo di rame da 1 mm², in media 0,07 mm al secondo. È la loro [[velocità di deriva]], e per fare un metro impiegherebbero quasi quattro ore. Eppure la lampadina si accende appena chiudi l\'interruttore: il filo è già pieno di elettroni, come un tubo già pieno d\'acqua, e la spinta della pila corre lungo il circuito a una velocità paragonabile a quella della luce, mettendoli in moto tutti quasi nello stesso istante.',
  ],

  figura: {
    alt: 'Ricostruzione di una pila di Volta: una colonna di dischi di rame e di zinco alternati a panni bagnati, su una base di legno. I fili del polo positivo, in cima, e del polo negativo, in fondo, pescano in un bicchiere d\'acqua da cui salgono bollicine di idrogeno e di ossigeno; puntini lungo i fili indicano il verso degli elettroni.',
    didascalia: 'La pila di Volta (ricostruzione). Ogni coppia di dischi di zinco e di rame, separata dalla successiva da un panno bagnato di acqua salata, aggiunge la sua piccola spinta: la colonna dà per la prima volta una corrente che dura. Poche settimane dopo, a Londra, due fili collegati a una pila e immersi nell\'acqua fecero salire bollicine di idrogeno e di ossigeno.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="fig-corrente-cilindro" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" class="fig-corrente-ombra"/><stop offset=".2" class="fig-corrente-ombra-lieve"/><stop offset=".36" class="fig-corrente-riflesso"/><stop offset=".56" class="fig-corrente-chiaro"/><stop offset="1" class="fig-corrente-ombra"/>' +
      '</linearGradient></defs>' +
      // bicchiere d'acqua con i due elettrodi
      '<rect class="fig-corrente-acqua" x="230" y="142" width="108" height="70" rx="8"/>' +
      '<path class="fig-corrente-pelo" d="M232 142h104"/>' +
      '<path class="fig-corrente-vetro" d="M226 116q2 0 2 3v85q0 10 10 10h92q10 0 10-10v-85q0-3 2-3"/>' +
      // fili: dal rame (+) all'elettrodo di destra, dallo zinco (−) a quello di sinistra
      '<path class="fig-corrente-filo" d="M124 86V42q0-8 8-8H306q8 0 8 8V196"/>' +
      '<path class="fig-corrente-filo" d="M166 205H192q8 0 8-8V64q0-8 8-8H246q8 0 8 8V196"/>' +
      '<path class="fig-corrente-flusso" d="M166 205H192q8 0 8-8V64q0-8 8-8H246q8 0 8 8V136"/>' +
      '<path class="fig-corrente-flusso" d="M314 136V42q0-8-8-8H132q-8 0-8 8V86"/>' +
      '<rect class="fig-corrente-elettrodo" x="251" y="168" width="6" height="30" rx="1.5"/>' +
      '<rect class="fig-corrente-elettrodo" x="311" y="168" width="6" height="30" rx="1.5"/>' +
      '<g class="fig-corrente-bolle fig-corrente-h2"><circle cx="247.5" cy="182" r="2.8"/><circle cx="260.5" cy="182" r="2.3"/><circle cx="248" cy="182" r="3.1"/><circle cx="260" cy="182" r="2.6"/></g>' +
      '<g class="fig-corrente-bolle fig-corrente-o2"><circle cx="307.5" cy="182" r="3"/><circle cx="320.5" cy="182" r="2.6"/></g>' +
      // la pila: base, dischi dal basso verso l'alto (zinco, panno, rame), aste
      '<rect class="fig-corrente-legno" x="74" y="206" width="100" height="14" rx="3"/>' +
      '<path class="fig-corrente-zn" d="M96 202h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 198h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 192h56v6a28 4 0 0 1-56 0z"/>' +
      '<path class="fig-corrente-zn" d="M96 186h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 182h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 176h56v6a28 4 0 0 1-56 0z"/>' +
      '<path class="fig-corrente-zn" d="M96 170h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 166h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 160h56v6a28 4 0 0 1-56 0z"/>' +
      '<path class="fig-corrente-zn" d="M96 154h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 150h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 144h56v6a28 4 0 0 1-56 0z"/>' +
      '<path class="fig-corrente-zn" d="M96 138h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 134h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 128h56v6a28 4 0 0 1-56 0z"/>' +
      '<path class="fig-corrente-zn" d="M96 122h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 118h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 112h56v6a28 4 0 0 1-56 0z"/>' +
      '<path class="fig-corrente-zn" d="M96 106h56v6a28 4 0 0 1-56 0z"/><path class="fig-corrente-panno" d="M96 102h56v4a28 4 0 0 1-56 0z"/><path class="fig-corrente-cu" d="M96 96h56v6a28 4 0 0 1-56 0z"/>' +
      '<path fill="url(#fig-corrente-cilindro)" d="M96 96h56v112a28 4 0 0 1-56 0z"/>' +
      '<ellipse class="fig-corrente-faccia" cx="124" cy="96" rx="28" ry="4"/>' +
      '<rect class="fig-corrente-morsetto" x="120.5" y="86" width="7" height="11" rx="1.5"/>' +
      '<path class="fig-corrente-asta" d="M91 88V207M157 88V207"/>' +
      '<circle class="fig-corrente-pomo" cx="91" cy="88" r="2.6"/><circle class="fig-corrente-pomo" cx="157" cy="88" r="2.6"/>' +
      '<rect class="fig-corrente-morsetto" x="148" y="203" width="18" height="4" rx="1"/>' +
      // didascalie interne
      '<path class="fig-corrente-guida" d="M87 115h9M87 152h9M87 189h9"/>' +
      '<text class="fig-corrente-t" x="84" y="119" text-anchor="end">rame</text>' +
      '<text class="fig-corrente-t" x="84" y="149" text-anchor="end">panno con</text>' +
      '<text class="fig-corrente-t" x="84" y="162" text-anchor="end">acqua salata</text>' +
      '<text class="fig-corrente-t" x="84" y="193" text-anchor="end">zinco</text>' +
      '<text class="fig-corrente-segno fig-corrente-pos" x="134" y="82">+</text>' +
      '<text class="fig-corrente-segno fig-corrente-neg" x="176" y="199">−</text>' +
      '<text class="fig-corrente-t" x="256" y="50" text-anchor="end">elettroni</text>' +
      '<path class="fig-corrente-freccia" d="M262 46.5h11m-4-3.5 4 3.5-4 3.5"/>' +
      '<text class="fig-corrente-t" x="124" y="231" text-anchor="middle">pila di Volta</text>' +
      '<text class="fig-corrente-t" x="254" y="231" text-anchor="middle">idrogeno</text>' +
      '<text class="fig-corrente-t" x="314" y="231" text-anchor="middle">ossigeno</text>' +
      '</svg>',
  },

  inBreve: [
    'La corrente è carica in movimento, `I = Q / t`, e si misura in ampere: 1 A è 1 coulomb al secondo.',
    'La pila spinge le cariche come una pompa spinge l\'acqua, ma solo se il circuito è chiuso.',
    'Il verso convenzionale va dal polo positivo al negativo; nei fili di metallo gli elettroni si muovono al contrario.',
    'Gli elettroni avanzano di pochi centesimi di millimetro al secondo, ma la spinta corre lungo i fili a una velocità paragonabile a quella della luce.',
  ],

  formule: [
    { nome: 'Intensità di corrente', formula: 'I = Q / t', legenda: [['I', 'corrente', 'ampere, A'], ['Q', 'carica che attraversa il filo', 'coulomb, C'], ['t', 'tempo', 'secondi, s']] },
    { nome: 'Velocità di deriva', formula: 'v = I / (n · e · S)', legenda: [['v', 'velocità media degli elettroni', 'm/s'], ['n', 'elettroni liberi per metro cubo', 'nel rame circa 8,5 × 10²⁸'], ['e', 'carica di un elettrone', '1,6 × 10⁻¹⁹ C'], ['S', 'sezione del filo', 'm²']], nota: 'Con 1 A in un filo di rame da 1 mm² risulta circa 0,07 mm/s; in un filo più sottile, a parità di corrente, è maggiore.' },
  ],

  laboratori: [
    {
      id: 'corrente',
      titolo: 'Dentro il filo',
      consegna: 'Chiudi l\'interruttore e guarda dentro un filo di rame ingrandito milioni di volte. Aggiungi pile, cambia lo spessore del filo e confronta il moto degli elettroni con il verso convenzionale della corrente.',
      sfide: [
        { id: 'chiudi', testo: 'Chiudi il circuito: la lampadina si accende **subito**, eppure gli elettroni avanzano lentissimi.' },
        { id: 'verso', testo: 'Mostra il **verso convenzionale** della corrente: va nello stesso senso degli elettroni?' },
        { id: 'doppia', testo: '**Raddoppia la corrente**: che cosa succede alla velocità di deriva?' },
        { id: 'sottile', testo: 'Con la stessa corrente, passa a un **filo più sottile**: gli elettroni rallentano o accelerano?' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Galvani contro Volta',
      paragrafi: [
        'Intorno al 1780, a Bologna, il medico Luigi Galvani notò che le zampe di una rana sezionata scattavano quando un bisturi ne toccava i nervi mentre, poco lontano, una macchina elettrostatica faceva scoccare una scintilla. Poi scoprì che bastava un arco di metallo fra nervi e muscoli, e concluse che l\'elettricità nasceva dentro l\'animale: la chiamò *elettricità animale*. Alessandro Volta, professore di fisica a Pavia, sostenne invece che nasceva dal contatto fra due metalli diversi e che la rana faceva solo da rivelatore, sensibilissimo. Per dimostrarlo costruì una sorgente di elettricità senza alcun tessuto animale: la pila.',
        'Avevano ragione tutti e due, ma solo in parte. I nervi trasmettono davvero segnali elettrici: Galvani riuscì perfino a far contrarre un muscolo senza metalli, toccandolo soltanto con il nervo. E due metalli diversi separati da una soluzione salata producono davvero una corrente, come diceva Volta. Galvani non vide la fine della disputa: nel 1797 perse la cattedra per essersi rifiutato di giurare fedeltà alla Repubblica Cisalpina, e morì l\'anno dopo.',
      ],
    },
    {
      titolo: 'Come funziona una pila',
      paragrafi: [
        'Una pila ha due elettrodi di materiali diversi immersi in un *elettrolita*, una sostanza che conduce grazie agli ioni: nella pila di Volta, zinco, rame e l\'acqua salata dei panni. Lo zinco tende a sciogliersi lasciando indietro i propri elettroni e diventa il polo negativo; sul rame le reazioni sottraggono elettroni, e il rame diventa il polo positivo. A circuito chiuso gli elettroni escono dal polo negativo, attraversano fili e lampadina e rientrano dal positivo, mentre dentro la pila gli ioni si spostano e completano l\'anello.',
        'La pila, quindi, non è un serbatoio di elettroni: contiene sostanze che reagiscono, e quando si sono consumate è scarica. Una cella dà una tensione modesta, che dipende dai materiali: 1,5 [[volt]] per una pila stilo. Per averne di più si mettono più celle in fila, come i dischi di Volta: la batteria rettangolare da 9 V ne contiene sei.',
      ],
    },
    {
      titolo: 'Dalla colonna di Volta al litio',
      paragrafi: [
        'La pila di Volta si indeboliva in fretta, perché sul rame si formava un velo di bollicine di idrogeno che ostacolava le reazioni. Per tutto l\'Ottocento si cercarono pile più costanti e più comode, fino alla pila a secco, antenata delle pile usa e getta che oggi danno [[corrente continua]] a telecomandi e torce. Le batterie agli ioni di litio, invece, si ricaricano: il caricabatterie riporta indietro gli ioni di litio che, durante la scarica, passano da un elettrodo all\'altro.',
        'Sulle batterie trovi spesso un numero in milliampereora (mAh): non è una tensione ma una carica, e 1 mAh vale 3,6 coulomb. Visto che `Q = I · t`, una batteria da 4000 mAh, valore comune nei telefoni, può dare 400 mA per dieci ore oppure 2 A per due ore: la carica è la stessa, cambia solo quanto in fretta la usi.',
      ],
    },
  ],

  sapevi: 'Nella lettera del 1800 Volta presentò la sua invenzione come un «organo elettrico artificiale». Si era ispirato alla torpedine, un pesce parente delle razze che stordisce le prede con scariche elettriche: il suo organo elettrico è formato da centinaia di colonnine di cellule sovrapposte, come monete impilate. La prima pila della storia, insomma, imitava un pesce.',

  storia: [
    { anno: 1791, titolo: 'Le rane di Bologna', testo: 'Luigi Galvani pubblica il *De viribus electricitatis in motu musculari*, frutto di oltre dieci anni di esperimenti: secondo lui i muscoli si contraggono per un\'elettricità prodotta dall\'animale stesso.', chi: 'Luigi Galvani' },
    { anno: 1800, titolo: 'La colonna di Volta', testo: 'Il 20 marzo Alessandro Volta descrive in una lettera a Joseph Banks, presidente della Royal Society, una colonna di dischi di zinco e di rame separati da panni bagnati: è la prima sorgente di corrente continua.', chi: 'Alessandro Volta' },
    { anno: 1800, titolo: 'L\'acqua si divide', testo: 'A maggio, a Londra, William Nicholson e Anthony Carlisle immergono nell\'acqua i due fili di una pila e ne vedono salire bollicine di idrogeno e di ossigeno: comincia l\'elettrochimica.', chi: 'William Nicholson e Anthony Carlisle' },
    { anno: 1807, titolo: 'Due metalli nuovi', testo: 'Alla Royal Institution di Londra Humphry Davy fa passare la corrente di una grande pila nella potassa fusa e ottiene un metallo mai visto, il potassio; pochi giorni dopo, dalla soda, ricava il sodio.', chi: 'Humphry Davy' },
    { anno: 1836, titolo: 'Una pila costante', testo: 'John Frederic Daniell immerge il rame in una soluzione di solfato di rame, separata da quella dello zinco: sul rame non si formano più bollicine di idrogeno, e la corrente resta stabile.', chi: 'John Frederic Daniell' },
    { anno: 1859, titolo: 'La prima ricaricabile', testo: 'Gaston Planté immerge due lastre di piombo in acido solforico diluito: quando la cella è scarica, una corrente in senso opposto la ricarica. È l\'antenata della batteria delle automobili.', chi: 'Gaston Planté' },
    { anno: 1866, titolo: 'Verso la pila a secco', testo: 'Georges Leclanché brevetta una cella con zinco, carbone e biossido di manganese: nel 1868 ne funzionano già circa ventimila sulle linee del telegrafo. Resa «a secco» da altri, è l\'antenata delle pile a zinco-carbone.', chi: 'Georges Leclanché' },
    { anno: 1959, titolo: 'L\'alcalina', testo: 'Alla Eveready, in Ohio, Lewis Urry realizza una pila alcalina con lo zinco in polvere: dura molto più delle pile a zinco-carbone ed entra in produzione nel 1959.', chi: 'Lewis Urry' },
    { anno: 1991, titolo: 'Il litio in tasca', testo: 'Sony mette in vendita la prima batteria agli ioni di litio, frutto delle ricerche di Stanley Whittingham, John Goodenough e Akira Yoshino, Nobel per la chimica nel 2019. Diventerà la batteria di telefoni, portatili e auto elettriche.', chi: 'Sony; Whittingham, Goodenough e Yoshino' },
  ],

  glossario: [
    { termine: 'Corrente', definizione: 'Flusso ordinato di cariche elettriche in un conduttore. La sua intensità è la carica che attraversa una sezione del filo ogni secondo e si misura in ampere (A).' },
    { termine: 'Ampere', definizione: 'Unità di misura della corrente, simbolo A, dedicata al fisico francese André-Marie Ampère: 1 ampere è 1 coulomb al secondo, circa 6,24 × 10¹⁸ elettroni al secondo.' },
    { termine: 'Pila', definizione: 'Generatore che trasforma energia chimica in energia elettrica, con due elettrodi di materiali diversi immersi in un elettrolita. Il nome viene dalla colonna di dischi impilati di Volta.' },
    { termine: 'Circuito', definizione: 'Percorso chiuso di conduttori che parte da un polo del generatore e torna all\'altro: se l\'anello si interrompe, la corrente si ferma.' },
    { termine: 'Corrente convenzionale', definizione: 'Il verso che per convenzione si dà alla corrente: dal polo positivo al negativo nel circuito esterno. Nei metalli gli elettroni vanno al contrario.' },
    { termine: 'Velocità di deriva', definizione: 'Velocità media con cui gli elettroni avanzano lungo un filo percorso da corrente, sovrapposta al loro rapidissimo moto disordinato: con 1 A in un filo di rame da 1 mm² è di circa 0,07 mm/s.' },
  ],
});
