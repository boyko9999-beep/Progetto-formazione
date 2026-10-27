/*
 * Capitolo 5 · Serie, parallelo e leggi di Kirchhoff.
 * Schema dei campi: vedi il commento in capitoli/ohm.js. Stili della figura in capitoli/circuiti.css.
 */
EB.capitolo({
  id: 'circuiti',

  apertura: 'Una pila, tre lampadine e due modi di collegarle: in fila, se una si brucia si spengono tutte; una accanto all\'altra, ognuna va per conto suo. Nel 1845 uno studente poco più che ventenne scrisse le due regole che valgono in qualunque circuito.',

  intro: [
    'Quando i componenti di un circuito sono più di uno, conta come li colleghi. In un [[circuito in serie]] stanno uno dopo l\'altro, come le perle di una collana, e la [[corrente]] ha una sola strada: li attraversa tutti con la stessa intensità. Non si «consuma» passando da una lampadina all\'altra: le lampadine prendono energia, non corrente. La [[tensione]] della pila invece si divide: ogni componente se ne prende una parte, e le parti sommate danno il totale. Basta svitare una lampadina per interrompere l\'unica strada, e si spengono tutte.',
    'In un [[circuito in parallelo]] i componenti stanno invece uno accanto all\'altro, ognuno sul suo ramo, e tutti i rami partono da uno stesso punto per ritrovarsi in un altro. Ogni ramo riceve tutta la tensione della pila, mentre la corrente si divide fra i rami: ne passa di più dove la [[resistenza]] è minore. Se sviti una lampadina si interrompe solo il suo ramo, e le altre restano accese. Le prese di casa sono collegate così: ricevono tutte 230 V, e spegnere il forno non spegne il frigorifero.',
    'Ripensa all\'acqua nei tubi: dove un tubo si dirama, tanta acqua arriva e tanta ne riparte, perché non se ne crea e non se ne perde. È la legge dei nodi, la prima delle due [[leggi di Kirchhoff]] pubblicate nel 1845 da Gustav Robert Kirchhoff: in ogni [[nodo]] la corrente che entra è uguale a quella che esce, quindi in parallelo `I = I₁ + I₂ + I₃`. La seconda, la legge delle maglie, vale per ogni giro chiuso ed è come una gita in montagna: se torni al punto di partenza, hai sceso tanti metri quanti ne hai saliti. La pila «solleva» le cariche, i componenti le fanno «scendere»: in serie `V = V₁ + V₂ + V₃`.',
    'Insieme alla [[legge di Ohm]], queste due regole bastano per calcolare qualsiasi circuito fatto di pile e [[resistori|resistore]]. In serie le resistenze si sommano: la [[resistenza equivalente]], cioè quella dell\'unico resistore che potrebbe sostituirle tutte, è più grande di ciascuna. In parallelo ogni ramo è una strada in più, e la resistenza equivalente scende persino sotto la più piccola. Due resistori in serie formano poi un [[partitore di tensione]], che divide la tensione in parti proporzionali alle resistenze: è così che un sensore di luce o di temperatura «parla» al circuito che lo legge. Sono conti che si fanno ogni giorno, dal quadro elettrico di casa al telefono che hai in tasca.',
  ],

  figura: {
    alt: 'Ricostruzione del ponte di Wheatstone: quattro resistori a filo, avvolti su rocchetti, formano un rombo. Una pila collega il vertice alto e quello basso, un galvanometro con l\'ago sullo zero unisce i vertici laterali. R₃ ha un cursore, R₄ è la resistenza da misurare.',
    didascalia: 'Il ponte descritto da Samuel Hunter Christie nel 1833 e reso famoso da Charles Wheatstone nel 1843 (ricostruzione). Si sposta il cursore di R₃ finché l\'ago del galvanometro G resta sullo zero: allora la resistenza sconosciuta vale `R₄\u00a0=\u00a0R₃\u00a0·\u00a0R₂\u00a0/\u00a0R₁`. Per riconoscere lo zero non serve un galvanometro tarato, basta che sia sensibile: per questo il metodo è così preciso.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<path class="fig-circuiti-filo" d="M130 30L38 120L130 210L222 120ZM38 120H103M157 120H222M130 30H290V88M130 210H290V148"/>' +
      // R₁ e R₂ a sinistra, R₃ (con cursore) e R₄ a destra
      '<g transform="translate(84 75) rotate(-44.37)">' +
      '<rect class="fig-circuiti-corpo" x="-20" y="-8" width="40" height="16" rx="3"/>' +
      '<path class="fig-circuiti-spire" d="M-16-8l3 16M-12-8l3 16M-8-8l3 16M-4-8l3 16M0-8l3 16M4-8l3 16M8-8l3 16M12-8l3 16"/>' +
      '<rect class="fig-circuiti-flangia" x="-24" y="-11" width="5" height="22" rx="1.5"/><rect class="fig-circuiti-flangia" x="19" y="-11" width="5" height="22" rx="1.5"/>' +
      '</g>' +
      '<g transform="translate(84 165) rotate(44.37)">' +
      '<rect class="fig-circuiti-corpo" x="-20" y="-8" width="40" height="16" rx="3"/>' +
      '<path class="fig-circuiti-spire" d="M-16-8l3 16M-12-8l3 16M-8-8l3 16M-4-8l3 16M0-8l3 16M4-8l3 16M8-8l3 16M12-8l3 16"/>' +
      '<rect class="fig-circuiti-flangia" x="-24" y="-11" width="5" height="22" rx="1.5"/><rect class="fig-circuiti-flangia" x="19" y="-11" width="5" height="22" rx="1.5"/>' +
      '</g>' +
      '<g transform="translate(176 75) rotate(44.37)">' +
      '<rect class="fig-circuiti-corpo" x="-20" y="-8" width="40" height="16" rx="3"/>' +
      '<path class="fig-circuiti-spire" d="M-16-8l3 16M-12-8l3 16M-8-8l3 16M-4-8l3 16M0-8l3 16M4-8l3 16M8-8l3 16M12-8l3 16"/>' +
      '<rect class="fig-circuiti-flangia" x="-24" y="-11" width="5" height="22" rx="1.5"/><rect class="fig-circuiti-flangia" x="19" y="-11" width="5" height="22" rx="1.5"/>' +
      '<path class="fig-circuiti-guida" d="M-14-16H28V0"/><circle class="fig-circuiti-nodo" cx="28" cy="0" r="2.2"/>' +
      '<path class="fig-circuiti-cursore" d="M-7.5-21h7v6l-3.5 6.5-3.5-6.5z"/>' +
      '</g>' +
      '<g transform="translate(176 165) rotate(-44.37)">' +
      '<rect class="fig-circuiti-corpo" x="-20" y="-8" width="40" height="16" rx="3"/>' +
      '<path class="fig-circuiti-spire" d="M-16-8l3 16M-12-8l3 16M-8-8l3 16M-4-8l3 16M0-8l3 16M4-8l3 16M8-8l3 16M12-8l3 16"/>' +
      '<rect class="fig-circuiti-flangia" x="-24" y="-11" width="5" height="22" rx="1.5"/><rect class="fig-circuiti-flangia" x="19" y="-11" width="5" height="22" rx="1.5"/>' +
      '</g>' +
      // galvanometro
      '<circle class="fig-circuiti-cassa" cx="130" cy="120" r="27"/>' +
      '<path class="fig-circuiti-scala" d="M115.45 113.79A19 19 0 0 1 144.55 113.79"/>' +
      '<path class="fig-circuiti-tacche" d="M130 112V104M124.53 110.96L123.5 108.15M135.47 110.96L136.5 108.15M119.72 113.74L117.79 111.45M140.28 113.74L142.21 111.45"/>' +
      '<path class="fig-circuiti-ago" d="M130 104.5L132.2 126H127.8Z"/>' +
      '<circle class="fig-circuiti-perno" cx="130" cy="126" r="2.6"/>' +
      '<text class="fig-circuiti-t" x="130" y="142" text-anchor="middle">G</text>' +
      // pila
      '<rect class="fig-circuiti-polo" x="284" y="88" width="12" height="7" rx="1.5"/>' +
      '<rect class="fig-circuiti-pila" x="276" y="94" width="28" height="54" rx="5"/>' +
      '<path class="fig-circuiti-riflesso" d="M283 102v36"/>' +
      '<text class="fig-circuiti-segno" x="270" y="106" text-anchor="end">+</text>' +
      '<text class="fig-circuiti-segno" x="270" y="146" text-anchor="end">−</text>' +
      '<text class="fig-circuiti-t" x="312" y="125">pila</text>' +
      '<circle class="fig-circuiti-nodo" cx="130" cy="30" r="3.6"/><circle class="fig-circuiti-nodo" cx="38" cy="120" r="3.6"/>' +
      '<circle class="fig-circuiti-nodo" cx="130" cy="210" r="3.6"/><circle class="fig-circuiti-nodo" cx="222" cy="120" r="3.6"/>' +
      '<text class="fig-circuiti-r" x="66" y="60" text-anchor="middle">R₁</text>' +
      '<text class="fig-circuiti-r" x="66" y="188" text-anchor="middle">R₂</text>' +
      '<text class="fig-circuiti-r" x="200" y="55" text-anchor="middle">R₃</text>' +
      '<text class="fig-circuiti-r" x="194" y="188" text-anchor="middle">R₄</text>' +
      '</svg>',
  },

  inBreve: [
    'In serie la corrente è la stessa in ogni componente e le tensioni si sommano: se un componente si interrompe, si ferma tutto.',
    'In parallelo ogni ramo ha la stessa tensione e le correnti si sommano: ogni ramo funziona per conto suo.',
    'Leggi di Kirchhoff: in un nodo entra tanta corrente quanta ne esce; lungo un percorso chiuso le tensioni si compensano.',
    'La resistenza equivalente cresce in serie e cala in parallelo: ogni apparecchio acceso in casa fa salire la corrente totale.',
  ],

  formule: [
    { nome: 'Resistenze in serie', formula: 'Req = R₁ + R₂ + R₃', legenda: [['Req', 'resistenza equivalente', 'ohm, Ω'], ['R₁, R₂, R₃', 'resistenze in serie', 'ohm, Ω']], nota: 'Stessa corrente in tutti i componenti; le tensioni si sommano: `V = V₁ + V₂ + V₃`.' },
    { nome: 'Resistenze in parallelo', formula: '1 / Req = 1 / R₁ + 1 / R₂ + 1 / R₃', legenda: [['Req', 'resistenza equivalente', 'ohm, Ω'], ['R₁, R₂, R₃', 'resistenze in parallelo', 'ohm, Ω']], nota: 'Stessa tensione su ogni ramo; le correnti si sommano: `I = I₁ + I₂ + I₃`. Con due soli resistori: `Req = R₁ · R₂ / (R₁ + R₂)`.' },
    { nome: 'Partitore di tensione', formula: 'V₂ = V · R₂ / (R₁ + R₂)', legenda: [['V₂', 'tensione ai capi di R₂', 'volt, V'], ['V', 'tensione totale', 'volt, V'], ['R₁, R₂', 'resistenze in serie', 'ohm, Ω']] },
  ],

  laboratori: [
    {
      id: 'circuiti',
      titolo: 'Il banco delle lampadine',
      consegna: 'Collega tre lampadine uguali in serie o in parallelo, poi svitane una toccandola. Guarda come si dividono tensione e corrente: i numeri accanto a ogni lampadina seguono le leggi di Kirchhoff.',
      sfide: [
        { id: 'svita-serie', testo: 'In **serie**, svita una lampadina: che cosa succede alle altre?' },
        { id: 'svita-parallelo', testo: 'In **parallelo**, svita una lampadina: le altre restano accese?' },
        { id: 'somma-correnti', testo: 'In parallelo, confronta la corrente della pila con **una** e con **tre** lampadine avvitate.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'In casa in parallelo, sull\'albero in serie',
      paragrafi: [
        'Collegare tutto in parallelo ha un prezzo: ogni apparecchio acceso apre un ramo in più, e per la legge dei nodi nel filo che arriva dal contatore passa la somma di tutte le correnti. Un forno da 2500 W chiede circa 11 A, un asciugacapelli da 2000 W quasi 9 A: insieme quasi 20 A, cioè 4500 W. Con il contratto più diffuso, da 3 kW, il contatore regge senza limiti di tempo 3,3 kW e per un tempo limitato qualcosa di più: forno e asciugacapelli insieme lo fanno scattare in pochi minuti. I cavi, invece, li proteggono gli interruttori automatici del quadro.',
        'Le vecchie catene di lucine per l\'albero di Natale erano invece in serie, perché costavano molto meno: se una lampadina si bruciava, restava al buio tutta la fila e bisognava provarle una per una. Nelle lucine a incandescenza più recenti, sui sostegni del filamento è avvolto un ponticello di filo isolato: se il filamento si rompe, ai capi della lampadina arriva tutta la tensione, l\'isolante cede e il circuito si richiude.',
      ],
    },
    {
      titolo: 'Il partitore di tensione e i sensori',
      paragrafi: [
        'Due resistori in serie si dividono la tensione in proporzione al loro valore: chi ha più ohm si prende più volt. Con una pila da 9 V, un resistore da 1 kΩ e uno da 2 kΩ, sul primo trovi 3 V e sul secondo 6 V: è il circuito che misurerai con il [[multimetro]] nel capitolo sugli strumenti di misura.',
        'Il trucco diventa prezioso quando uno dei due resistori cambia valore da solo. Una fotoresistenza ha meno resistenza quando c\'è più luce, un termistore cambia valore con la temperatura: in un partitore trasformano luce e temperatura in una tensione che un circuito può leggere. Così si accendono al tramonto molti lampioni, e tanti termostati capiscono quando spegnere la caldaia.',
      ],
    },
    {
      titolo: 'Cortocircuito, la scorciatoia pericolosa',
      paragrafi: [
        'Un [[cortocircuito]] è un collegamento quasi senza resistenza tra due punti a tensione diversa, come i due poli di una pila. Con una resistenza quasi nulla la legge di Ohm dà una corrente enorme, frenata solo dalla resistenza dei fili e della sorgente: in casa, centinaia o migliaia di ampere in un istante. I fili si scaldano per [[effetto Joule]] e l\'isolante può prendere fuoco; per questo gli interruttori automatici del quadro sono fatti per interrompere correnti fino a 4500 o 6000 A.',
        'Un errore comune è pensare che la corrente passi soltanto dalla strada più facile. In realtà si divide fra tutte le strade, in proporzione inversa alla loro resistenza; ma se una strada ha resistenza quasi nulla, quasi tutta la corrente passa di lì. Per questo un filo messo in parallelo a una lampadina la spegne, e un [[fusibile]] va sempre in serie, dove passa tutta la corrente.',
      ],
    },
  ],

  sapevi: 'Nel 1860 Kirchhoff e il chimico Robert Bunsen riconobbero un elemento nuovo prima ancora di poterlo isolare: scaldarono in una fiamma i residui di un\'acqua minerale, ne scomposero la luce con un prisma e videro due righe azzurre che nessun elemento conosciuto produceva. Lo chiamarono cesio, dal latino *caesius*, «azzurro»; l\'anno dopo due righe rosso scuro rivelarono il rubidio, da *rubidus*, «rosso cupo».',

  storia: [
    { anno: 1833, titolo: 'Il rombo di Christie', testo: 'Samuel Hunter Christie, che insegna matematica all\'Accademia militare reale di Woolwich, descrive alla Royal Society un modo per confrontare la resistenza di due fili: quattro conduttori a rombo e un [[galvanometro]] in mezzo. Per dieci anni quasi nessuno ci fa caso.', chi: 'Samuel Hunter Christie' },
    { anno: 1843, titolo: 'Un ponte con un altro nome', testo: 'Charles Wheatstone riprende il metodo in una lezione alla Royal Society, dove presenta anche il reostato, un resistore regolabile. Cita Christie, ma pare che le traduzioni francese e tedesca omettessero il suo nome: forse anche per questo si parla di [[ponte di Wheatstone]].', chi: 'Charles Wheatstone' },
    { anno: 1845, titolo: 'Le regole di uno studente', testo: 'A Königsberg, oggi Kaliningrad, Gustav Robert Kirchhoff ha ventun anni e frequenta il seminario di fisica matematica di Franz Neumann. In un articolo sugli *Annalen der Physik* enuncia la legge dei nodi e quella delle maglie, che estendono la legge di Ohm ai circuiti con più rami.', chi: 'Gustav Robert Kirchhoff' },
    { anno: 1879, titolo: 'Archi in serie, lampadine in parallelo', testo: 'Il 29 aprile Charles Brush illumina la piazza principale di Cleveland con dodici lampade ad arco in serie, alimentate da una sola dinamo. Thomas Edison sceglie la strada opposta: lampadine ad alta resistenza in parallelo, da accendere e spegnere una per una come le lampade a gas.', chi: 'Charles Brush e Thomas Edison' },
    { anno: 1883, titolo: 'Una rete in una pila sola', testo: 'Léon Charles Thévenin, ingegnere dei telegrafi francesi, dimostra che qualsiasi rete di pile e resistori, vista da due morsetti, equivale a una sola pila con un resistore in serie. Hermann von Helmholtz ci era arrivato nel 1853, ma il teorema porta il nome di Thévenin.', chi: 'Léon Charles Thévenin' },
    { anno: 1938, titolo: 'Il ponte che pesa', testo: 'L\'estensimetro nasce due volte, in modo indipendente: al Caltech con Edward Simmons, che ci lavorava dal 1936, e al MIT con Arthur Ruge. È un filo sottilissimo incollato al metallo, che cambia di poco la sua resistenza quando il pezzo si deforma. Lo si legge con un ponte di Wheatstone, come fanno ancora oggi molte bilance digitali.', chi: 'Edward E. Simmons e Arthur C. Ruge' },
  ],

  glossario: [
    { termine: 'Circuito in serie', definizione: 'Circuito in cui i componenti sono collegati uno dopo l\'altro, su un\'unica strada: la corrente è la stessa in tutti e le tensioni si sommano.' },
    { termine: 'Circuito in parallelo', definizione: 'Circuito in cui i componenti sono collegati tra gli stessi due punti, ciascuno su un ramo: hanno la stessa tensione e le loro correnti si sommano.' },
    { termine: 'Nodo', definizione: 'Punto di un circuito in cui si incontrano almeno tre conduttori: lì la corrente si divide tra i rami o si riunisce.' },
    { termine: 'Leggi di Kirchhoff', definizione: 'In un nodo la corrente che entra è uguale a quella che esce (legge dei nodi); lungo un percorso chiuso, o maglia, la tensione delle pile è uguale alla somma di quelle sui componenti (legge delle maglie).' },
    { termine: 'Resistenza equivalente', definizione: 'La resistenza di un solo resistore che può sostituire un gruppo di resistori lasciando uguali corrente e tensione. In serie è la somma delle resistenze, in parallelo è minore della più piccola.' },
    { termine: 'Partitore di tensione', definizione: 'Due o più resistori in serie che si dividono una tensione in parti proporzionali alle loro resistenze; serve anche a leggere sensori come fotoresistenze e termistori.' },
    { termine: 'Cortocircuito', definizione: 'Collegamento quasi senza resistenza tra due punti a tensione diversa, come i poli di una pila: la corrente diventa altissima e può surriscaldare i fili fino a provocare un incendio.' },
    { termine: 'Ponte di Wheatstone', definizione: 'Circuito di quattro resistori disposti a rombo, con una pila tra due vertici opposti e un galvanometro tra gli altri due. Quando l\'ago segna zero, dalle tre resistenze note si ricava la quarta.' },
  ],
});
