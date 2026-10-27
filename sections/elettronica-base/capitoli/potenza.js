/*
 * Capitolo 4 · Potenza ed effetto Joule.
 * Schema dei campi: vedi il commento in capitoli/ohm.js.
 * Il blocco «laboratori» è quello definitivo: id del laboratorio e id delle sfide non vanno cambiati.
 */
EB.capitolo({
  id: 'potenza',

  apertura: 'Ogni filo percorso da corrente si scalda. Nel 1841 James Prescott Joule, figlio di un birraio di Salford, misurò quel calore con un vaso d\'acqua e un termometro: è la stessa legge che accende il tostapane e fa fondere un fusibile.',

  intro: [
    'Tocca il caricabatterie del telefono dopo un\'ora di ricarica: è tiepido. Il filo di un tostapane diventa rosso, un bollitore porta l\'acqua a ebollizione in pochi minuti, il cavo di una prolunga sovraccarica scotta. Dietro tutti questi fenomeni c\'è lo stesso fatto: quando una [[corrente]] attraversa un conduttore, una parte della sua [[energia]] si trasforma in calore. È l\'[[effetto Joule]]. A volte è proprio quello che vogliamo, come nella stufetta; altre volte è uno spreco, come nel caricabatterie, o un pericolo, come nella prolunga.',
    'Per misurare questi fenomeni servono due grandezze. L\'energia dice quanto lavoro si può fare, o quanto calore si può produrre, e si misura in [[joule]] (J). La [[potenza]] dice quanto in fretta l\'energia si trasforma e si misura in [[watt]] (W): 1 watt è 1 joule al secondo. Pensa a due modi di salire le scale, al passo o di corsa. L\'energia che spendi è la stessa, ma di corsa la spendi in meno tempo, cioè con più potenza. Un bollitore da 2000 W e una lampadina a LED da 8 W differiscono proprio in questo: nei joule che trasformano ogni secondo.',
    'Quanta potenza porta una corrente? Dipende dalla spinta, cioè dalla [[tensione]], e da quante cariche passano ogni secondo, cioè dalla corrente: `P = V · I`. Un asciugacapelli collegato alla presa da 230 V assorbe circa 8,7 A, e 230 per 8,7 fa circa 2000 W. Per il calore nei fili, però, conta soprattutto la corrente. Unendo questa formula alla [[legge di Ohm]] si ottiene `P = R · I²`: in un filo di [[resistenza]] R, il calore cresce con il **quadrato** della corrente. Con il doppio della corrente, il filo scalda quattro volte tanto.',
    'Per questo i cavi che portano molta corrente sono più grossi: un filo con sezione doppia ha metà resistenza e, con la stessa corrente, scalda la metà. Negli impianti di casa, di solito, le luci usano cavi da 1,5 mm² e le prese cavi da 2,5 mm². Per la stessa ragione esiste il [[fusibile]], un tratto di filo calibrato inserito apposta nel circuito: se la corrente supera il suo valore, fonde e apre il circuito prima che i cavi si surriscaldino. È un punto debole voluto.',
    'Resta da capire quanto consumi. L\'energia è potenza per tempo, `E = P · t`, ma il joule è troppo piccolo per gli usi di casa: in bolletta l\'energia si conta in [[kilowattora]] (kWh). Un kWh è l\'energia di 1000 W per un\'ora, cioè 3 600 000 J. Un forno da 2500 W acceso per un\'ora consuma 2,5 kWh; una lampadina a LED da 8 W, per consumare altrettanto, dovrebbe restare accesa più di 300 ore. Non a caso gli apparecchi che scaldano, come forno, bollitore e asciugacapelli, sono anche i più potenti di casa.',
  ],

  figura: {
    alt: 'Ricostruzione dell\'esperimento di Joule del 1841: due celle di una pila di Daniell, un galvanometro con un anello di rame e un ago magnetico al centro, e un vaso di vetro pieno d\'acqua in cui sono immersi un termometro e un filo avvolto a spirale su un tubetto di vetro.',
    didascalia: 'L\'esperimento di Joule (ricostruzione). Il filo da provare, avvolto su un sottile tubo di vetro, stava in un vaso d\'acqua: la pila lo faceva attraversare dalla corrente, il galvanometro ne misurava l\'intensità e il termometro diceva di quanto si scaldava l\'acqua. Cambiando fili e correnti, Joule trovò che il calore cresce con la resistenza e con il quadrato della corrente.',
    svg: '<svg viewBox="0 0 360 236" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="fig-potenza-calore"><stop offset="0" class="fig-potenza-calore-0"/><stop offset="1" class="fig-potenza-calore-1"/></radialGradient></defs>' +
      '<g class="fig-potenza-ombra"><ellipse cx="30" cy="212.5" rx="18" ry="2.4"/><ellipse cx="72" cy="212.5" rx="18" ry="2.4"/><ellipse cx="138" cy="212.5" rx="35" ry="2.4"/><ellipse cx="242" cy="212.5" rx="54" ry="2.6"/></g>' +
      '<path class="fig-potenza-banco" d="M8 213H352"/>' +
      // pila di Daniell: due celle in serie
      '<path class="fig-potenza-cella" d="M14 150V206q0 6 6 6h20q6 0 6-6V150"/><ellipse class="fig-potenza-solfato" cx="30" cy="150" rx="16" ry="4.5"/>' +
      '<path class="fig-potenza-poroso" d="M23 151V139h14v12"/><ellipse class="fig-potenza-poroso" cx="30" cy="139" rx="7" ry="2.2"/>' +
      '<rect class="fig-potenza-zinco" x="27.8" y="113" width="4.4" height="27" rx="1"/>' +
      '<path class="fig-potenza-cella" d="M56 150V206q0 6 6 6h20q6 0 6-6V150"/><ellipse class="fig-potenza-solfato" cx="72" cy="150" rx="16" ry="4.5"/>' +
      '<path class="fig-potenza-poroso" d="M65 151V139h14v12"/><ellipse class="fig-potenza-poroso" cx="72" cy="139" rx="7" ry="2.2"/>' +
      '<rect class="fig-potenza-zinco" x="69.8" y="113" width="4.4" height="27" rx="1"/>' +
      '<rect class="fig-potenza-lamina" x="42" y="140" width="3" height="10"/><rect class="fig-potenza-lamina" x="84" y="140" width="3" height="10"/>' +
      // galvanometro: anello di rame su un piedistallo, bussola al centro
      '<rect class="fig-potenza-legno" x="134" y="143" width="8" height="58"/>' +
      '<rect class="fig-potenza-legno" x="106" y="200" width="64" height="12" rx="2.5"/>' +
      '<circle class="fig-potenza-anello" cx="138" cy="114" r="29"/><circle class="fig-potenza-spire" cx="138" cy="114" r="29"/>' +
      '<path class="fig-potenza-mensola" d="M113.5 122H162.5"/>' +
      '<path class="fig-potenza-bussola" d="M119 117v3.2a19 6 0 0 0 38 0V117"/><ellipse class="fig-potenza-bussola" cx="138" cy="117" rx="19" ry="6"/>' +
      '<ellipse class="fig-potenza-quadrante" cx="138" cy="117" rx="15" ry="4.4"/>' +
      '<path class="fig-potenza-nord" d="M138 115.5L154 113.2L138 118.5Z"/><path class="fig-potenza-sud" d="M138 115.5L122 120.8L138 118.5Z"/><circle class="fig-potenza-perno" cx="138" cy="117" r="1.5"/>' +
      '<rect class="fig-potenza-lamina" x="114" y="194" width="4" height="6"/><rect class="fig-potenza-lamina" x="158" y="194" width="4" height="6"/>' +
      // vaso d'acqua con la spirale di filo
      '<path class="fig-potenza-acqua" d="M193 124V200q0 11 11 11h76q11 0 11-11V124Z"/>' +
      '<path class="fig-potenza-pelo" d="M193 124H291"/>' +
      '<ellipse cx="227" cy="166" rx="34" ry="40" fill="url(#fig-potenza-calore)"/>' +
      '<g class="fig-potenza-onde"><path d="M207 196c-3-5 3-9 0-14s3-9 0-14 3-9 0-14 3-9 0-14"/><path d="M248 196c-3-5 3-9 0-14s3-9 0-14 3-9 0-14 3-9 0-14"/><path d="M227 136c-3-5 3-9 0-12"/></g>' +
      '<path class="fig-potenza-spira-dietro" d="M238 139Q227 137.4 216 142M238 145Q227 143.4 216 148M238 151Q227 149.4 216 154M238 157Q227 155.4 216 160M238 163Q227 161.4 216 166M238 169Q227 167.4 216 172M238 175Q227 173.4 216 178M238 181Q227 179.4 216 184M238 187Q227 185.4 216 190M238 193Q227 191.4 216 196"/>' +
      // fili: dalla pila al galvanometro, dal galvanometro alla spirale, ritorno dall'alto
      '<path class="fig-potenza-filo" d="M43.5 140C43.5 124 58 112 72 112"/>' +
      '<path class="fig-potenza-filo" d="M85.5 140C88 176 104 193 116 193"/>' +
      '<path class="fig-potenza-filo" d="M160 193C181 193 175 100 196 100H210q6 0 6 6V136"/>' +
      '<path class="fig-potenza-filo" d="M30 112V36q0-6 6-6H221q6 0 6 6V128"/>' +
      '<path class="fig-potenza-filo-dentro" d="M227 128V197Q221 199 216 196"/>' +
      '<rect class="fig-potenza-tubo" x="223" y="128" width="8" height="74" rx="3"/>' +
      '<path class="fig-potenza-spira" d="M216 136Q227 140.6 238 139M216 142Q227 146.6 238 145M216 148Q227 152.6 238 151M216 154Q227 158.6 238 157M216 160Q227 164.6 238 163M216 166Q227 170.6 238 169M216 172Q227 176.6 238 175M216 178Q227 182.6 238 181M216 184Q227 188.6 238 187M216 190Q227 194.6 238 193"/>' +
      // termometro graduato
      '<rect class="fig-potenza-termo" x="260.5" y="38" width="7" height="152" rx="3.5"/>' +
      '<path class="fig-potenza-capillare" d="M264 44V188"/>' +
      '<rect class="fig-potenza-mercurio" x="262.6" y="60" width="2.8" height="132"/>' +
      '<circle class="fig-potenza-bulbo" cx="264" cy="193" r="6"/>' +
      '<path class="fig-potenza-tacche" d="M268 52h6M268 60h3.5M268 68h3.5M268 76h3.5M268 84h6M268 92h3.5M268 100h3.5M268 108h3.5M268 116h6M268 124h3.5M268 132h3.5M268 140h3.5M268 148h6M268 156h3.5M268 164h3.5M268 172h3.5"/>' +
      '<path class="fig-potenza-vetro" d="M187 104h5V200q0 12 12 12h76q12 0 12-12V104h5"/>' +
      '<path class="fig-potenza-riflesso" d="M199 116V194"/>' +
      '<circle class="fig-potenza-morsetto" cx="30" cy="112" r="2.6"/><circle class="fig-potenza-morsetto" cx="72" cy="112" r="2.6"/>' +
      '<circle class="fig-potenza-morsetto" cx="43.5" cy="140" r="2.6"/><circle class="fig-potenza-morsetto" cx="85.5" cy="140" r="2.6"/>' +
      '<circle class="fig-potenza-morsetto" cx="116" cy="193" r="2.6"/><circle class="fig-potenza-morsetto" cx="160" cy="193" r="2.6"/>' +
      '<text class="fig-potenza-segno" x="17" y="117">−</text><text class="fig-potenza-segno" x="91" y="137">+</text>' +
      '<text class="fig-potenza-t" x="51" y="230" text-anchor="middle">pila di Daniell</text>' +
      '<text class="fig-potenza-t" x="138" y="230" text-anchor="middle">galvanometro</text>' +
      '<text class="fig-potenza-t" x="242" y="230" text-anchor="middle">filo di prova in acqua</text>' +
      '<text class="fig-potenza-t" x="277" y="56">termometro</text>' +
      '</svg>',
  },

  inBreve: [
    'La potenza dice quanta energia si trasforma ogni secondo: `P = V · I`, in watt (1 W è 1 J al secondo).',
    'Ogni conduttore percorso da corrente si scalda: è l\'effetto Joule, `P = R · I²`. Doppia corrente, calore quadruplo.',
    'L\'energia è potenza per tempo, `E = P · t`; in bolletta si conta in kilowattora (1 kWh = 3,6 MJ).',
    'Il fusibile è un punto debole voluto: fonde prima che i cavi si surriscaldino.',
  ],

  formule: [
    { nome: 'Potenza elettrica', formula: 'P = V · I', legenda: [['P', 'potenza', 'watt, W'], ['V', 'tensione', 'volt, V'], ['I', 'corrente', 'ampere, A']] },
    { nome: 'Effetto Joule', formula: 'P = R · I²', legenda: [['P', 'potenza trasformata in calore', 'watt, W'], ['R', 'resistenza', 'ohm, Ω'], ['I', 'corrente', 'ampere, A']], nota: 'Con la legge di Ohm si scrive anche `P = V² / R`.' },
    { nome: 'Energia consumata', formula: 'E = P · t', legenda: [['E', 'energia', 'joule, J'], ['P', 'potenza', 'watt, W'], ['t', 'tempo', 'secondi, s']], nota: 'Con la potenza in kilowatt e il tempo in ore, l\'energia risulta in kilowattora: 1 kWh = 3 600 000 J.' },
  ],

  laboratori: [
    {
      id: 'potenza',
      titolo: 'Il filamento',
      consegna: 'Regola la tensione e guarda il filamento passare dal rosso cupo al bianco. Il fusibile protegge il circuito: se la corrente supera il suo valore, fonde. Più sotto puoi calcolare quanto consuma un elettrodomestico.',
      sfide: [
        { id: 'quadrupla', testo: '**Raddoppia la tensione**: la potenza raddoppia o quadruplica?' },
        { id: 'fusibile', testo: 'Fai **saltare il fusibile**, poi rimettine uno adatto e riaccendi la lampadina.' },
        { id: 'kilowattora', testo: 'Scopri quanti **kWh** consuma in un mese un **asciugacapelli da 2000 W** usato 10 minuti al giorno.' },
      ],
    },
  ],

  approfondimenti: [
    {
      titolo: 'Dalla lampadina a incandescenza al LED',
      paragrafi: [
        'In una lampadina a incandescenza la corrente attraversa un filamento di tungsteno sottilissimo che, per effetto Joule, supera i 2000 °C e diventa [[incandescente|incandescenza]]: emette luce perché è caldissimo. Più potenza riceve, più si scalda, e il suo colore passa dal rosso cupo all\'arancione, al giallo, quasi al bianco. Il tungsteno è stato scelto perché fonde solo verso i 3400 °C.',
        'Il guaio è che più del 90% dell\'energia esce come calore e come raggi infrarossi, invisibili. Una vecchia lampadina da 60 W emette circa 800 lumen, l\'unità che misura la luce; un LED dà la stessa luce consumando da 6 a 10 W, perché la produce in un altro modo, senza scaldarsi tanto. Per questo tra il 2009 e il 2012 l\'Unione europea ha tolto dal mercato le lampadine a incandescenza per la casa. Come funziona un LED lo scoprirai nella sezione Elettronica intermedia.',
      ],
    },
    {
      titolo: 'Fusibili e interruttori automatici',
      paragrafi: [
        'Un fusibile contiene un filo o una lamina di metallo calibrata, chiusi in un tubetto di vetro o di ceramica. Finché la corrente resta sotto il valore stampato sopra, per esempio 10 A, il filo si scalda poco; se lo supera a lungo, o se c\'è un [[cortocircuito]], fonde e apre il circuito. Un fusibile bruciato va sostituito con uno **dello stesso valore**: metterne uno più grosso, o peggio un pezzo di filo qualsiasi, toglie la protezione, e a scaldarsi saranno i cavi nei muri.',
        'I fusibili sono ancora ovunque nelle auto, negli elettrodomestici e nei [[multimetri|multimetro]]. Nel quadro elettrico di casa, invece, oggi ci sono gli [[interruttori magnetotermici|interruttore magnetotermico]]. Dentro hanno due protezioni: una lamina bimetallica che, scaldata dalla corrente, si piega e fa scattare l\'interruttore se il sovraccarico dura troppo; e un piccolo [[elettromagnete]] che reagisce in un istante alla corrente enorme di un cortocircuito. Dopo lo scatto basta rialzare la levetta. Il «salvavita» è un\'altra cosa: è l\'interruttore differenziale, che stacca tutto se una parte della corrente si disperde verso terra, magari attraverso una persona.',
      ],
    },
    {
      titolo: 'Potenza o energia? Il contatore e la bolletta',
      paragrafi: [
        'Potenza ed energia si confondono spesso, ma sono due cose diverse. Il contratto fissa la potenza, cioè quanti apparecchi puoi usare **nello stesso momento**: nella maggior parte delle case italiane è di 3 kW. Il contatore tollera fino a 3,3 kW senza limiti di tempo e stacca la corrente se li si supera troppo a lungo, tanto prima quanto più si va oltre. La bolletta invece conta l\'energia, cioè **quanta** ne hai usata in tutto. Un forno da 2500 W acceso per 24 minuti e un televisore da 100 W acceso per 10 ore consumano la stessa energia, 1 kWh; ma solo il forno può far saltare il contatore, se intanto accendi anche il bollitore.',
        'Una famiglia tipo, con 3 kW di contratto, consuma circa 2700 kWh in un anno: poco più di 7 kWh al giorno, come se in casa restassero sempre accesi 300 W. Un\'ultima avvertenza: si scrive kWh, non kW/h. Il kilowattora è una potenza moltiplicata per un tempo, non divisa.',
      ],
    },
  ],

  sapevi: 'Le 2000 kcal che le etichette europee usano come riferimento per l\'alimentazione di un adulto valgono 8400 kJ, cioè circa 2,3 kWh: meno dell\'energia che un forno da 2500 W consuma in un\'ora. Distribuita sulle 24 ore, quell\'energia corrisponde a circa 100 W: il tuo corpo produce calore più o meno come una vecchia lampadina da 100 W.',

  storia: [
    { anno: 1810, annoTesto: 'intorno al 1810', titolo: 'L\'arco di Davy', testo: 'Alla Royal Institution di Londra, Humphry Davy collega due bastoncini di carbone a una pila enorme, di circa 2000 elementi. Quando allontana le punte, tra loro resta acceso un arco di luce abbagliante: la corrente diventa luce e calore.', chi: 'Humphry Davy' },
    { anno: 1841, titolo: 'Il calore ha una legge', testo: 'James Prescott Joule, 22 anni, immerge nell\'acqua fili di metalli e spessori diversi e misura di quanto la scaldano. Il calore risulta proporzionale alla resistenza del filo e al quadrato della corrente. La Royal Society ne aveva pubblicato solo un riassunto: l\'articolo completo esce sul *Philosophical Magazine*.', chi: 'James Prescott Joule' },
    { anno: 1842, titolo: 'Lo stesso risultato, in Russia', testo: 'Senza conoscere il lavoro di Joule, il fisico Emil Lenz arriva alla stessa legge con esperimenti indipendenti, pubblicati l\'anno seguente. Per questo la legge si chiama anche di Joule-Lenz.', chi: 'Emil Lenz' },
    { anno: 1845, titolo: 'Il mulinello di Joule', testo: 'Joule presenta alla British Association un esperimento con dei pesi che, scendendo, fanno girare un mulinello a palette immerso nell\'acqua: l\'attrito la scalda di una frazione di grado. Lavoro e calore sono due forme della stessa energia: scaldare di 1 °C un litro d\'acqua costa quanto sollevarlo di circa 427 metri.', chi: 'James Prescott Joule' },
    { anno: 1879, titolo: 'La corsa alla lampadina', testo: 'A febbraio Joseph Swan accende le sue lampade a filamento di carbone davanti a oltre 700 persone, a Newcastle. A ottobre, a Menlo Park, il gruppo di Thomas Edison tiene acceso per più di 13 ore un filamento di cotone carbonizzato; la notte di Capodanno Edison illumina il laboratorio per i visitatori.', chi: 'Joseph Swan e Thomas Edison' },
    { anno: 1880, titolo: 'Il filo che si sacrifica', testo: 'Edison brevetta un «conduttore di sicurezza»: un tratto di filo molto sottile da inserire nei cavi di una casa o nel circuito di ogni lampada. Se la corrente diventa eccessiva fonde lui, e il resto dell\'impianto è salvo: è l\'idea di ogni fusibile.', chi: 'Thomas Edison' },
    { anno: 1882, titolo: 'La potenza ha un nome', testo: 'Nel discorso da presidente della British Association, Carl Wilhelm Siemens propone di chiamare watt la potenza di una corrente di 1 ampere spinta da 1 volt, in onore di James Watt, l\'inventore scozzese che perfezionò la macchina a vapore. Nel 1889 il Congresso internazionale degli elettricisti di Parigi adotta il watt e il joule; Joule muore poche settimane dopo.', chi: 'Carl Wilhelm Siemens' },
    { anno: 1904, annoTesto: '1904 – 1910', titolo: 'Il filamento di tungsteno', testo: 'In Ungheria Sándor Just e Franjo Hanaman brevettano le lampadine a filamento di tungsteno, il metallo che fonde più in alto di tutti. Nel 1910 William Coolidge, alla General Electric, riesce a renderlo duttile e a tirarlo in fili sottilissimi: sarà il filamento delle lampadine per tutto il Novecento.', chi: 'Sándor Just, Franjo Hanaman e William Coolidge' },
  ],

  glossario: [
    { termine: 'Potenza', definizione: 'Quanta energia viene trasformata o trasferita ogni secondo. Si misura in watt; in un circuito vale `P = V · I`.' },
    { termine: 'Watt', definizione: 'Unità di misura della potenza (W), dedicata a James Watt: 1 watt è 1 joule al secondo, la potenza di una corrente di 1 ampere spinta da 1 volt.' },
    { termine: 'Energia', definizione: 'La capacità di compiere un lavoro o di produrre calore e luce: non si crea né si distrugge, si trasforma da una forma all\'altra. Si misura in joule (J).' },
    { termine: 'Joule', definizione: 'Unità di misura dell\'energia (J), dedicata a James Prescott Joule: è più o meno l\'energia che serve per sollevare di un metro una mela da 100 g.' },
    { termine: 'Effetto Joule', definizione: 'Il riscaldamento di un conduttore attraversato da corrente: la potenza trasformata in calore vale `P = R · I²`.' },
    { termine: 'Kilowattora', definizione: 'Unità di energia usata in bolletta (kWh): l\'energia di una potenza di 1000 W per un\'ora, pari a 3,6 milioni di joule.' },
    { termine: 'Fusibile', definizione: 'Dispositivo di protezione con un filo o una lamina calibrata che fonde, aprendo il circuito, quando la corrente supera il valore previsto.' },
    { termine: 'Interruttore magnetotermico', definizione: 'Interruttore automatico che apre il circuito se c\'è un sovraccarico (una lamina bimetallica si piega scaldandosi) o un cortocircuito (scatta un elettromagnete). Si riarma alzando la levetta.' },
    { termine: 'Incandescenza', definizione: 'Emissione di luce da parte di un corpo molto caldo: un filamento passa dal rosso al giallo e quasi al bianco man mano che la sua temperatura sale.' },
  ],
});
