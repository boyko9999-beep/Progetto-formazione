/*
 * Banca domande del quiz: sezione 2, Elettronica intermedia.
 * Semiconduttori, diodi, LED e Zener, transistor bipolari e MOSFET, circuiti RC
 * e filtri, amplificatore operazionale, 555, alimentatore e un po' di storia.
 * I capitoli sono le ancore delle pagine della sezione; il formato delle
 * domande è descritto in sections/quiz/README.md.
 */
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'elettronica-intermedia',
    number: 2,
    title: 'Elettronica intermedia',
    subtitle: 'Semiconduttori, diodi, transistor, filtri e alimentatori',
    chapters: [
      { id: 'semiconduttori', title: 'I semiconduttori' },
      { id: 'diodo', title: 'Il diodo' },
      { id: 'led-zener', title: 'LED e Zener' },
      { id: 'bjt', title: 'Il transistor bipolare' },
      { id: 'mosfet', title: 'Il MOSFET' },
      { id: 'rc-filtri', title: 'Circuiti RC e filtri' },
      { id: 'operazionale', title: 'L\'amplificatore operazionale' },
      { id: 'oscillatori', title: 'Oscillatori e 555' },
      { id: 'alimentatore', title: 'L\'alimentatore' },
      { id: 'storia', title: 'Storia' },
    ],
    questions: [
      // ------------------------------------------------------------ semiconduttori
      {
        id: 'ei-01', level: 1, topic: 'Elettroni, lacune, drogaggio', chapter: 'semiconduttori', type: 'match',
        q: 'Abbina ogni termine alla sua descrizione.',
        pairs: [
          ['Lacuna', 'Posto vuoto lasciato da un elettrone'],
          ['Drogaggio', 'Aggiunta controllata di impurità'],
          ['Tipo N', 'Silicio con elettroni liberi in più'],
          ['Tipo P', 'Silicio con lacune in più'],
          ['Banda proibita', 'Salto di energia per liberare un elettrone'],
        ],
        why: 'La lacuna è il posto lasciato vuoto da un elettrone e si comporta come una carica positiva. Il fosforo (5 elettroni di valenza) dà silicio di tipo N, il boro (3) di tipo P. La banda proibita è l\'energia per staccare un elettrone dal legame.',
      },
      {
        id: 'ei-02', level: 2, topic: 'Silicio di tipo N', chapter: 'semiconduttori', type: 'truefalse',
        q: 'Un cristallo di silicio di tipo N ha molti elettroni liberi in più, quindi nel complesso ha una carica negativa.',
        answer: false,
        why: 'Ogni atomo donatore, come il fosforo, cede il suo quinto elettrone e resta nel reticolo come ione positivo fisso: le cariche si bilanciano e il cristallo resta neutro. La N dice solo che i portatori liberi sono soprattutto elettroni.',
      },
      {
        id: 'ei-03', level: 2, topic: 'Semiconduttori e calore', chapter: 'semiconduttori', type: 'truefalse',
        q: 'Se scaldi un pezzo di silicio puro, la sua resistenza diminuisce.',
        answer: true,
        why: 'Il calore spezza alcuni legami e libera coppie elettrone-lacuna: più portatori di carica, meno resistenza. Nei metalli succede il contrario: se li scaldi, la resistenza aumenta.',
      },
      {
        id: 'ei-04', level: 3, topic: 'Perché il silicio', chapter: 'semiconduttori', type: 'choice',
        q: 'Perché i transistor e i chip di oggi si fanno con il silicio e non con il germanio?',
        options: [
          'Regge temperature più alte e forma un ottimo ossido isolante',
          'Ha una banda proibita più piccola e quindi conduce meglio',
          'Fonde a temperatura più bassa ed è più facile da purificare',
          'Conduce bene anche puro, senza bisogno di drogaggio',
        ],
        answer: 0,
        why: 'Il silicio ha una banda proibita più larga (1,12 eV contro 0,66 eV del germanio), quindi funziona bene fino a circa 150 °C. Il suo ossido, SiO₂, è un ottimo isolante; in più il silicio abbonda nella sabbia.',
      },

      // ------------------------------------------------------------ diodo
      {
        id: 'ei-05', level: 1, topic: 'Simbolo del diodo', chapter: 'diodo', type: 'choice',
        q: 'Che cosa indica la barretta nel simbolo del diodo?',
        figure: { kind: 'symbol', name: 'diode' },
        options: ['Il catodo, cioè il lato N', 'L\'anodo, cioè il lato P', 'Il catodo, cioè il lato P', 'L\'anodo, cioè il lato N'],
        answer: 0,
        why: 'La corrente entra dall\'anodo (lato P) ed esce dal catodo (lato N), nel verso del triangolo; la barretta segna il catodo. Sul corpo del diodo il catodo è indicato da una fascetta colorata.',
      },
      {
        id: 'ei-06', level: 2, topic: 'Polarizzazione inversa', chapter: 'diodo', type: 'truefalse',
        q: 'Un diodo al silicio polarizzato in inversa, con il + sul catodo, comincia a condurre appena la tensione supera 0,7 V.',
        answer: false,
        why: 'La soglia di 0,6-0,7 V vale solo in diretta. In inversa la zona di svuotamento si allarga e passa una corrente minuscola, di pochi nanoampere; la giunzione cede solo a tensioni molto più alte (è il breakdown, che lo Zener sfrutta apposta).',
      },
      {
        id: 'ei-08', level: 2, topic: 'Giunzione P-N', chapter: 'diodo', type: 'choice',
        q: 'In una giunzione P-N al silicio, che cosa dà origine alla barriera di potenziale di circa 0,7 V?',
        options: [
          'Gli ioni fissi rimasti nella zona di svuotamento',
          'Gli elettroni liberi che si accumulano nel lato P',
          'Un sottile strato di ossido tra il lato P e il lato N',
          'La resistenza del silicio puro tra P e N',
        ],
        answer: 0,
        why: 'Al confine elettroni e lacune si incontrano e si ricombinano. Restano gli ioni dei droganti, che non possono muoversi: negativi dal lato P, positivi dal lato N. Il loro campo elettrico respinge le altre cariche: è la barriera che la tensione diretta deve abbassare.',
      },

      // ------------------------------------------------------------ LED e Zener
      {
        id: 'ei-09', level: 1, topic: 'Resistenza per il LED', chapter: 'led-zener', type: 'number',
        q: 'Nel circuito il LED rosso lavora con 2 V e 20 mA. Che resistenza serve in serie, in Ω?',
        figure: { kind: 'circuit', topo: 'led', v: '9 V', r: '?' },
        value: 350, unit: 'Ω', tolerance: 2,
        why: 'R = (Vs − Vled) / I = (9 V − 2 V) / 0,02 A = 350 Ω. In pratica si sceglie un valore standard vicino, come 330 Ω o 390 Ω.',
      },
      {
        id: 'ei-10', level: 1, topic: 'Tipi di diodo', chapter: 'led-zener', type: 'match',
        q: 'Abbina ogni diodo al lavoro che sa fare.',
        pairs: [
          ['LED', 'Emette luce quando conduce'],
          ['Fotodiodo', 'Rileva la luce che lo colpisce'],
          ['Zener', 'Mantiene costante una tensione'],
          ['Diodo raddrizzatore', 'Lascia passare una sola semionda dell\'alternata'],
        ],
        why: 'Sono tutti giunzioni P-N: il LED trasforma la corrente in luce, il fotodiodo la luce in corrente, lo Zener lavora in inversa come riferimento di tensione, il raddrizzatore fa passare la corrente in un solo verso, cioè una sola semionda.',
      },
      {
        id: 'ei-11', level: 2, topic: 'Riferimento di tensione', chapter: 'led-zener', type: 'choice',
        q: 'Questo simbolo rappresenta un diodo da 5,1 V: vuoi usarlo per avere 5,1 V stabili da una pila da 9 V. Come lo colleghi?',
        figure: { kind: 'symbol', name: 'zener' },
        options: [
          'In inversa, con una resistenza in serie',
          'In diretta, con una resistenza in serie',
          'In inversa, senza resistenza in serie',
          'In diretta, senza resistenza in serie',
        ],
        answer: 0,
        why: 'È un diodo Zener: la barretta piegata ricorda una Z. Si usa in inversa: oltre la sua tensione di Zener conduce e tiene ai suoi capi circa 5,1 V. La resistenza in serie prende la tensione in più (9 V − 5,1 V = 3,9 V) e limita la corrente.',
      },
      {
        id: 'ei-12', level: 3, topic: 'Colore e soglia del LED', chapter: 'led-zener', type: 'choice',
        q: 'Nel circuito c\'è un LED rosso, con una soglia di circa 2 V. Se lo sostituisci con un LED blu senza cambiare la resistenza, che cosa succede alla corrente?',
        figure: { kind: 'circuit', topo: 'led', v: '5 V', r: '150 Ω' },
        options: [
          'Diminuisce, perché il LED blu ha una soglia più alta',
          'Aumenta, perché il LED blu ha una soglia più alta',
          'Resta uguale, perché la resistenza non cambia',
          'Aumenta, perché il LED blu ha una soglia più bassa',
        ],
        answer: 0,
        why: 'Il LED blu ha una soglia di circa 3 V. Con il rosso: (5 V − 2 V) / 150 Ω = 20 mA; con il blu: (5 V − 3 V) / 150 Ω ≈ 13 mA. Il blu si accende, ma con meno corrente.',
      },

      // ------------------------------------------------------------ transistor bipolare
      {
        id: 'ei-13', level: 1, topic: 'Simboli', chapter: 'bjt', type: 'choice',
        q: 'Quale componente rappresenta questo simbolo?',
        figure: { kind: 'symbol', name: 'npn' },
        options: ['Un transistor NPN', 'Un transistor PNP', 'Un MOSFET a canale N', 'Un MOSFET a canale P'],
        answer: 0,
        why: 'B, C ed E (base, collettore, emettitore) sono i terminali del transistor bipolare; il MOSFET ha gate, drain e source. La freccia sta sull\'emettitore: nell\'NPN punta verso l\'esterno, nel PNP verso l\'interno.',
      },
      {
        id: 'ei-14', level: 1, topic: 'Guadagno β', chapter: 'bjt', type: 'number',
        q: 'Un transistor NPN in zona attiva ha β = 150. Se nella base entrano 40 µA, quanta corrente scorre nel collettore, in mA?',
        value: 6, unit: 'mA', tolerance: 0.05,
        why: 'Ic = β × Ib = 150 × 40 µA = 6000 µA = 6 mA. Una piccola corrente di base comanda una corrente di collettore 150 volte più grande.',
      },
      {
        id: 'ei-15', level: 2, topic: 'Correnti del transistor', chapter: 'bjt', type: 'truefalse',
        q: 'In un transistor NPN la corrente di emettitore è la somma della corrente di base e di quella di collettore.',
        answer: true,
        why: 'Le correnti di base e di collettore entrano nel transistor ed escono insieme dall\'emettitore: Ie = Ib + Ic. Poiché Ib è piccola, Ie è quasi uguale a Ic.',
      },
      {
        id: 'ei-16', level: 3, topic: 'Corrente di collettore', chapter: 'bjt', type: 'choice',
        q: 'Un NPN con β = 200 riceve 0,1 mA di corrente di base. L\'emettitore è a massa e il collettore è collegato a 5 V attraverso una resistenza da 1 kΩ. Quanta corrente scorre circa nel collettore?',
        options: [
          'Circa 4,8 mA: il transistor è saturo',
          'Circa 20 mA: il transistor è in zona attiva',
          'Quasi zero: il transistor è interdetto',
          'Circa 0,1 mA: come la corrente di base',
        ],
        answer: 0,
        why: 'β × Ib darebbe 20 mA, ma la resistenza ne lascia passare al massimo (5 V − 0,2 V) / 1 kΩ ≈ 4,8 mA, perché tra collettore ed emettitore restano circa 0,2 V. Il transistor è saturo: si comporta come un interruttore chiuso.',
      },

      // ------------------------------------------------------------ MOSFET
      {
        id: 'ei-17', level: 1, topic: 'Simbolo del MOSFET', chapter: 'mosfet', type: 'choice',
        q: 'Nel simbolo del MOSFET il gate è disegnato staccato dal resto. Perché?',
        figure: { kind: 'symbol', name: 'nmos' },
        options: [
          'È isolato dal canale da un sottile strato di ossido',
          'Si collega al canale solo quando il MOSFET conduce',
          'È il terminale da cui esce la corrente del carico',
          'Funziona solo con tensioni alternate, non con la continua',
        ],
        answer: 0,
        why: 'Il gate è separato dal canale da un sottilissimo strato di ossido di silicio (la O di MOS). Per questo non assorbe corrente continua: il MOSFET si comanda con una tensione, anche continua, e non con una corrente.',
      },
      {
        id: 'ei-18', level: 2, topic: 'Terminali BJT e MOSFET', chapter: 'mosfet', type: 'match',
        q: 'Un NPN e un MOSFET a canale N si usano in modo simile come interruttori. Abbina ogni terminale del transistor bipolare a quello del MOSFET che fa lo stesso lavoro.',
        pairs: [
          ['Base', 'Gate'],
          ['Collettore', 'Drain'],
          ['Emettitore', 'Source'],
        ],
        why: 'Base e gate comandano l\'accensione; la corrente del carico entra dal collettore o dal drain ed esce dall\'emettitore o dal source, che di solito va a massa.',
      },
      {
        id: 'ei-19', level: 2, topic: 'Tensione di soglia', chapter: 'mosfet', type: 'truefalse',
        q: 'Se un MOSFET a canale N ha una tensione di soglia di 2 V, basta portare il gate a 2 V rispetto al source per farlo condurre come un interruttore chiuso.',
        answer: false,
        why: 'Alla soglia il canale comincia appena a formarsi e passa pochissima corrente. Per farlo condurre bene serve una tensione ben più alta: molti MOSFET di potenza sono pensati per circa 10 V tra gate e source.',
      },
      {
        id: 'ei-20', level: 3, topic: 'MOSFET di potenza', chapter: 'mosfet', type: 'choice',
        q: 'Un MOSFET acceso ha una resistenza tra drain e source di 10 mΩ e porta una corrente di 10 A. Quanta potenza si trasforma in calore?',
        options: ['1 W', '0,1 W', '10 W', '100 W'],
        answer: 0,
        why: 'P = I² × R = (10 A)² × 0,01 Ω = 100 × 0,01 = 1 W. Con una resistenza così bassa il MOSFET scalda poco: per questo è un ottimo interruttore di potenza.',
      },

      // ------------------------------------------------------------ circuiti RC e filtri
      {
        id: 'ei-21', level: 1, topic: 'Costante di tempo', chapter: 'rc-filtri', type: 'number',
        q: 'Quanto vale la costante di tempo τ di questo circuito, in ms?',
        figure: { kind: 'circuit', topo: 'rc', v: '9 V', r: '47 kΩ', c: '10 µF' },
        value: 470, unit: 'ms', tolerance: 1,
        why: 'τ = R × C = 47 kΩ × 10 µF = 47 000 Ω × 0,000 01 F = 0,47 s = 470 ms. La tensione di alimentazione non conta: τ dipende solo da R e C.',
      },
      {
        id: 'ei-22', level: 1, topic: 'Carica del condensatore', chapter: 'rc-filtri', type: 'choice',
        q: 'Il condensatore parte scarico. Si chiude l\'interruttore: quanto vale circa la tensione sul condensatore dopo 1 secondo?',
        figure: { kind: 'circuit', topo: 'rc', v: '5 V', r: '10 kΩ', c: '100 µF' },
        options: ['Circa 3,2 V', 'Circa 2,5 V', 'Circa 1,8 V', 'Circa 5 V'],
        answer: 0,
        why: 'τ = R × C = 10 kΩ × 100 µF = 1 s. Dopo un tempo τ il condensatore arriva al 63% della tensione finale: 0,63 × 5 V ≈ 3,2 V. Per arrivare quasi a 5 V servono circa 5τ, cioè 5 s.',
      },
      {
        id: 'ei-23', level: 2, topic: 'Frequenza di taglio', chapter: 'rc-filtri', type: 'number',
        q: 'Un filtro passa-basso RC ha R = 1 kΩ e C = 1 µF. Quanto vale la sua frequenza di taglio, in Hz?',
        value: 159.2, unit: 'Hz', tolerance: 1,
        why: 'fc = 1 / (2π × R × C) = 1 / (6,28 × 1000 Ω × 0,000 001 F) = 1 / 0,006 28 s ≈ 159 Hz. A questa frequenza l\'uscita scende al 70,7% dell\'ingresso (−3 dB); sopra, il segnale viene attenuato sempre di più.',
      },
      {
        id: 'ei-24', level: 3, topic: 'Passa-alto e passa-basso', chapter: 'rc-filtri', type: 'choice',
        q: 'Vuoi attenuare un ronzio a 50 Hz lasciando passare i segnali da 5 kHz in su. Quale filtro RC scegli?',
        options: [
          'Un passa-alto con taglio a circa 500 Hz',
          'Un passa-basso con taglio a circa 500 Hz',
          'Un passa-alto con taglio a circa 50 kHz',
          'Un passa-basso con taglio a circa 50 Hz',
        ],
        answer: 0,
        why: 'Il passa-alto, con l\'uscita presa sulla resistenza, lascia passare le frequenze sopra il taglio. Con fc ≈ 500 Hz i segnali da 5 kHz passano quasi interi, mentre i 50 Hz, dieci volte sotto il taglio, scendono a circa un decimo.',
      },

      // ------------------------------------------------------------ amplificatore operazionale
      {
        id: 'ei-25', level: 1, topic: 'Ingressi dell\'operazionale', chapter: 'operazionale', type: 'choice',
        q: 'Nel simbolo dell\'amplificatore operazionale uno dei due ingressi è segnato con +. Come si chiama?',
        figure: { kind: 'symbol', name: 'opamp' },
        options: ['Ingresso non invertente', 'Ingresso invertente', 'Ingresso di alimentazione', 'Ingresso di retroazione'],
        answer: 0,
        why: 'Il + è l\'ingresso non invertente: un segnale applicato lì esce amplificato con lo stesso segno. Il − è l\'ingresso invertente: il segnale esce rovesciato. L\'operazionale amplifica la differenza tra i due.',
      },
      {
        id: 'ei-26', level: 3, topic: 'Il µA741', chapter: 'operazionale', type: 'choice',
        q: 'Chi progettò alla Fairchild l\'amplificatore operazionale µA741, uscito nel 1968?',
        options: ['Dave Fullagar', 'Bob Widlar', 'Harold Black', 'Hans Camenzind'],
        answer: 0,
        why: 'Il µA741 è di Dave Fullagar: ha il condensatore di compensazione dentro il chip, quindi non servono componenti esterni per renderlo stabile. Bob Widlar aveva progettato i precedenti µA702 e µA709; Harold Black ideò l\'amplificatore a retroazione negativa (1927), Hans Camenzind il timer 555.',
      },
      {
        id: 'ei-27', level: 2, topic: 'Amplificatore non invertente', chapter: 'operazionale', type: 'number',
        q: 'Un amplificatore non invertente ha Rf = 47 kΩ tra l\'uscita e l\'ingresso invertente (−) e Rg = 10 kΩ tra lo stesso ingresso e massa. Con 0,5 V in ingresso, quanto vale la tensione d\'uscita, in V?',
        value: 2.85, unit: 'V', tolerance: 0.05,
        why: 'Guadagno = 1 + Rf / Rg = 1 + 47 kΩ / 10 kΩ = 5,7, quindi Vout = 5,7 × 0,5 V = 2,85 V. Con Rf = 0 e senza Rg il guadagno vale 1: è l\'inseguitore di tensione.',
      },
      {
        id: 'ei-28', level: 3, topic: 'Amplificatore invertente', chapter: 'operazionale', type: 'choice',
        q: 'Un operazionale alimentato a ±12 V è montato come amplificatore invertente, con Rin = 10 kΩ e Rf = 1 MΩ. In ingresso ci sono 0,5 V. Che cosa trovi in uscita?',
        options: [
          'Circa −11 V: l\'uscita è in saturazione',
          'Circa −50 V: l\'uscita segue il guadagno',
          'Circa +11 V: l\'uscita satura in positivo',
          'Circa 0 V: l\'operazionale si blocca',
        ],
        answer: 0,
        why: 'Il guadagno è −Rf / Rin = −1 MΩ / 10 kΩ = −100: servirebbero −100 × 0,5 V = −50 V. Ma l\'uscita non supera l\'alimentazione e si ferma 1 o 2 V prima di −12 V, a circa −11 V: è la saturazione.',
      },

      // ------------------------------------------------------------ oscillatori e 555
      {
        id: 'ei-29', level: 1, topic: 'Monostabile', chapter: 'oscillatori', type: 'truefalse',
        q: 'Un 555 in configurazione monostabile, a ogni comando di avvio, genera un solo impulso di durata fissa.',
        answer: true,
        why: 'Il monostabile ha un solo stato stabile: quando riceve il comando dà un impulso lungo circa 1,1 × R × C, poi torna a riposo. L\'onda quadra continua la genera invece l\'astabile.',
      },
      {
        id: 'ei-30', level: 2, topic: 'PWM', chapter: 'oscillatori', type: 'choice',
        q: 'Questo segnale PWM passa da 0 a 5 V. Quanto vale la sua tensione media?',
        figure: { kind: 'wave', shape: 'pwm', duty: 0.25, cycles: 4, label: '5 V · 1 kHz' },
        options: ['1,25 V', '2,5 V', '3,75 V', '5 V'],
        answer: 0,
        why: 'Il segnale resta alto per un quarto del periodo (duty cycle 25%): la media è 0,25 × 5 V = 1,25 V. Cambiando il duty cycle si regola la potenza media, per esempio la luce di un LED o la velocità di un motore.',
      },
      {
        id: 'ei-31', level: 2, topic: 'Frequenza del 555', chapter: 'oscillatori', type: 'number',
        q: 'Un 555 astabile ha R1 = 10 kΩ, R2 = 10 kΩ e C = 1 µF. Quale frequenza produce, in Hz?',
        value: 48, unit: 'Hz', tolerance: 0.5,
        why: 'f ≈ 1,44 / ((R1 + 2 × R2) × C) = 1,44 / (30 kΩ × 1 µF) = 1,44 / 0,03 s = 48 Hz.',
      },
      {
        id: 'ei-32', level: 3, topic: 'Duty cycle', chapter: 'oscillatori', type: 'choice',
        q: 'Un 555 astabile ha R1 = R2 = 10 kΩ. Per quale parte del periodo l\'uscita resta alta, cioè quanto vale il duty cycle?',
        options: ['Circa 67%', 'Circa 50%', 'Circa 33%', 'Circa 75%'],
        answer: 0,
        why: 'Il condensatore si carica attraverso R1 + R2 (uscita alta) e si scarica solo attraverso R2 (uscita bassa). Duty cycle = (R1 + R2) / (R1 + 2 × R2) = 20 / 30 ≈ 67%.',
      },

      // ------------------------------------------------------------ alimentatore
      {
        id: 'ei-07', level: 1, topic: 'Forme d\'onda', chapter: 'alimentatore', type: 'choice',
        q: 'Quale circuito trasforma una tensione sinusoidale nella forma d\'onda in figura?',
        figure: { kind: 'wave', shape: 'half-wave' },
        options: ['Un diodo in serie al carico', 'Un ponte di quattro diodi', 'Un condensatore in serie al carico', 'Un trasformatore che abbassa la tensione'],
        answer: 0,
        why: 'Il diodo conduce solo quando è polarizzato in diretta: delle due semionde ne passa una sola. È il raddrizzatore a una semionda. Il ponte di quattro diodi le raddrizza tutte e due, mentre il trasformatore cambia solo l\'ampiezza della sinusoide.',
      },
      {
        id: 'ei-33', level: 1, topic: 'Blocchi dell\'alimentatore', chapter: 'alimentatore', type: 'order',
        q: 'Metti in ordine i blocchi di un alimentatore lineare, dalla presa di rete all\'uscita a 5 V.',
        items: ['Trasformatore', 'Ponte di diodi (Graetz)', 'Condensatore di livellamento', 'Regolatore 7805'],
        ends: ['Presa di rete', 'Uscita a 5 V'],
        why: 'Il trasformatore abbassa i 230 V alternati, il ponte di diodi (ponte di Graetz) raddrizza le due semionde, il condensatore riempie i vuoti tra un impulso e l\'altro e il 7805 fissa l\'uscita a 5 V.',
      },
      {
        id: 'ei-34', level: 1, topic: 'Componenti dell\'alimentatore', chapter: 'alimentatore', type: 'choice',
        q: 'A che cosa serve, in un alimentatore, il componente rappresentato da questo simbolo?',
        figure: { kind: 'symbol', name: 'transformer' },
        options: ['Ad abbassare la tensione della rete', 'A trasformare l\'alternata in continua', 'A livellare la tensione raddrizzata', 'A tenere l\'uscita fissa a 5 V'],
        answer: 0,
        why: 'Il trasformatore ha due avvolgimenti sullo stesso nucleo: abbassa una tensione alternata (per esempio da 230 V a 12 V) e isola il circuito dalla rete. Non la rende continua: funziona solo in alternata.',
      },
      {
        id: 'ei-35', level: 2, topic: 'Ponte di Graetz', chapter: 'alimentatore', type: 'choice',
        q: 'Questa è la tensione all\'uscita di un ponte di diodi (ponte di Graetz) alimentato dalla rete a 50 Hz. Con quale frequenza si ripetono gli impulsi?',
        figure: { kind: 'wave', shape: 'full-wave' },
        options: ['100 Hz', '50 Hz', '25 Hz', '200 Hz'],
        answer: 0,
        why: 'Il ponte rovescia la semionda negativa e la rende positiva: in ogni periodo di 20 ms arrivano due impulsi, cioè 100 al secondo. Per questo anche il ripple dopo il condensatore ha frequenza 100 Hz.',
      },
      {
        id: 'ei-36', level: 2, topic: 'Regolatore 7805', chapter: 'alimentatore', type: 'truefalse',
        q: 'Un regolatore 7805 alimentato con 5 V in ingresso fornisce ancora 5 V stabili in uscita.',
        answer: false,
        why: 'Il 7805 ha bisogno di circa 2 V di margine: in ingresso servono circa 7 V o più. La tensione in più, moltiplicata per la corrente, diventa calore: con 12 V e 0,5 A sono (12 − 5) × 0,5 = 3,5 W.',
      },

      // ------------------------------------------------------------ storia
      {
        id: 'ei-37', level: 1, topic: 'Linea del tempo', chapter: 'storia', type: 'order',
        q: 'Metti queste tappe dell\'elettronica in ordine cronologico.',
        items: ['Effetto Edison', 'Valvola diodo', 'Transistor a punta di contatto', 'Primi transistor al silicio', 'Primo circuito integrato'],
        ends: ['Più antica', 'Più recente'],
        why: 'Effetto Edison (1883), valvola diodo di Fleming (1904), transistor a punta di contatto dei Bell Labs (1947, al germanio), primi transistor al silicio (1954) e primo circuito integrato, di Jack Kilby (1958): dalla valvola al chip.',
      },
      {
        id: 'ei-38', level: 1, topic: 'Valvola triodo', chapter: 'storia', type: 'choice',
        q: 'Che cosa ha in più una valvola triodo rispetto a una valvola diodo?',
        options: [
          'Una griglia che regola il flusso di elettroni',
          'Un secondo filamento che scalda di più',
          'Un cristallo di germanio al posto del vuoto',
          'Un magnete che devia gli elettroni',
        ],
        answer: 0,
        why: 'Nel triodo (Lee De Forest, 1906) una griglia tra filamento e placca regola il flusso di elettroni: piccole variazioni della tensione di griglia producono grandi variazioni della corrente di placca. È il primo componente elettronico capace di amplificare un segnale.',
      },
      {
        id: 'ei-39', level: 2, topic: 'Inventori', chapter: 'storia', type: 'match',
        q: 'Abbina ogni inventore alla sua invenzione.',
        pairs: [
          ['John Ambrose Fleming', 'Valvola diodo'],
          ['Lee De Forest', 'Valvola triodo (Audion)'],
          ['Bardeen, Brattain e Shockley', 'Transistor'],
          ['Atalla e Kahng', 'MOSFET'],
          ['Hans Camenzind', 'Timer 555'],
        ],
        why: 'Fleming inventò la valvola diodo (1904) e De Forest il triodo (1906). Ai Bell Labs Bardeen e Brattain costruirono il primo transistor (1947) e Shockley, che guidava il gruppo, ideò quello a giunzione (1948); Atalla e Kahng inventarono il MOSFET (1959), Camenzind il timer 555 (1971).',
      },
      {
        id: 'ei-40', level: 2, topic: 'Dalla valvola al transistor', chapter: 'storia', type: 'choice',
        q: 'Perché, dagli anni Cinquanta, il transistor ha preso il posto della valvola termoionica?',
        options: [
          'È piccolo, robusto e non ha un filamento da scaldare',
          'Lavora nel vuoto e quindi si consuma molto meno',
          'Regge tensioni e potenze più alte delle valvole',
          'Fin dall\'inizio costava meno ed era di silicio',
        ],
        answer: 0,
        why: 'La valvola scalda un filamento: consuma molto, è grande, fragile e prima o poi si esaurisce. Il transistor è minuscolo, consuma poco e dura a lungo. Già nel 1945 i Bell Labs cercavano un dispositivo a semiconduttore che sostituisse valvole e relè nelle centrali telefoniche.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
