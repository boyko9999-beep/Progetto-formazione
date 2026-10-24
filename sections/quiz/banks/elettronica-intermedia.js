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
        id: 'ei-02', level: 2, topic: 'Conduttori e isolanti', chapter: 'semiconduttori', type: 'order',
        q: 'Metti questi materiali in ordine, dal più isolante al più conduttore.',
        items: ['Vetro', 'Silicio puro', 'Silicio drogato', 'Rame'],
        ends: ['Più isolante', 'Più conduttore'],
        why: 'Il vetro è un isolante. Il silicio puro conduce poco, ma drogato conduce da migliaia a milioni di volte di più. Resta comunque molto lontano da un metallo come il rame.',
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
        why: 'Il silicio ha una banda proibita più larga (circa 1,1 eV contro 0,7 eV del germanio), quindi funziona bene fino a circa 150 °C. Il suo ossido, SiO₂, è un ottimo isolante; in più il silicio abbonda nella sabbia.',
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
        id: 'ei-06', level: 2, topic: 'Curva I-V', chapter: 'diodo', type: 'truefalse',
        q: 'In un diodo al silicio polarizzato in diretta, la corrente cresce in proporzione alla tensione, come in un resistore.',
        answer: false,
        why: 'Fino a circa 0,6 V passa pochissima corrente; poi la corrente sale di colpo, mentre la tensione resta intorno a 0,6-0,7 V. La curva I-V del diodo non è una retta come quella di un resistore.',
      },
      {
        id: 'ei-07', level: 1, topic: 'Raddrizzatore a una semionda', chapter: 'diodo', type: 'choice',
        q: 'Quale circuito trasforma una tensione sinusoidale nella forma d\'onda in figura?',
        figure: { kind: 'wave', shape: 'half-wave' },
        options: ['Un diodo in serie al carico', 'Un ponte di quattro diodi', 'Un condensatore in serie al carico', 'Un resistore in serie al carico'],
        answer: 0,
        why: 'Il diodo conduce solo quando l\'anodo è positivo: delle due semionde ne passa una sola. È il raddrizzatore a una semionda; il ponte di quattro diodi le raddrizza invece tutte e due.',
      },
      {
        id: 'ei-08', level: 3, topic: 'Tensione di picco', chapter: 'diodo', type: 'choice',
        q: 'Un trasformatore fornisce 12 V efficaci, raddrizzati da un solo diodo al silicio. Quanto vale circa il picco della tensione sul carico?',
        options: ['Circa 16,3 V', 'Circa 11,3 V', 'Circa 17 V', 'Circa 6 V'],
        answer: 0,
        why: 'Il picco della sinusoide è 12 V × √2 ≈ 17 V; il diodo ne fa cadere circa 0,7 V, quindi sul carico arrivano circa 16,3 V. Il raddrizzatore non dimezza la tensione: elimina una semionda.',
      },

      // ------------------------------------------------------------ LED e Zener
      {
        id: 'ei-09', level: 1, topic: 'Resistenza per il LED', chapter: 'led-zener', type: 'number',
        q: 'Nel circuito il LED rosso lavora con 2 V e 20 mA. Che resistenza serve in serie, in Ω?',
        figure: { kind: 'circuit', topo: 'led', v: '9 V', r: 'R = ?' },
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
          ['Diodo raddrizzatore', 'Raddrizza la tensione alternata'],
        ],
        why: 'Sono tutti giunzioni P-N: il LED trasforma la corrente in luce, il fotodiodo la luce in corrente, lo Zener lavora in inversa come riferimento di tensione, il raddrizzatore fa passare la corrente in un solo verso.',
      },
      {
        id: 'ei-11', level: 2, topic: 'Simbolo dello Zener', chapter: 'led-zener', type: 'choice',
        q: 'Che componente rappresenta questo simbolo?',
        figure: { kind: 'symbol', name: 'zener' },
        options: ['Un diodo Zener', 'Un diodo raddrizzatore', 'Un LED', 'Un fotodiodo'],
        answer: 0,
        why: 'È il diodo Zener: le estremità piegate della barretta ricordano una Z. Si usa in polarizzazione inversa, con una resistenza in serie, per avere una tensione di riferimento stabile, per esempio 5,1 V.',
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
        id: 'ei-13', level: 1, topic: 'Simbolo del transistor', chapter: 'bjt', type: 'choice',
        q: 'Quale componente rappresenta questo simbolo?',
        figure: { kind: 'symbol', name: 'npn' },
        options: ['Un transistor NPN', 'Un transistor PNP', 'Un MOSFET a canale N', 'Un MOSFET a canale P'],
        answer: 0,
        why: 'Nel transistor bipolare la freccia sta sull\'emettitore: nell\'NPN punta verso l\'esterno, nel PNP verso l\'interno. Nel simbolo del MOSFET, invece, il gate è disegnato staccato dal resto.',
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
        id: 'ei-16', level: 3, topic: 'Saturazione', chapter: 'bjt', type: 'choice',
        q: 'Un NPN con β = 200 riceve 0,1 mA di corrente di base. Il collettore è collegato a 5 V attraverso una resistenza da 1 kΩ. Quanta corrente scorre circa nel collettore?',
        options: [
          'Circa 4,8 mA: il transistor è saturo',
          'Circa 20 mA: il transistor è in zona attiva',
          'Quasi zero: il transistor è interdetto',
          'Circa 0,1 mA: come la corrente di base',
        ],
        answer: 0,
        why: 'β × Ib darebbe 20 mA, ma la resistenza ne lascia passare al massimo (5 V − 0,2 V) / 1 kΩ ≈ 4,8 mA. Il transistor è saturo: si comporta come un interruttore chiuso.',
      },

      // ------------------------------------------------------------ MOSFET
      {
        id: 'ei-17', level: 1, topic: 'Gate isolato', chapter: 'mosfet', type: 'choice',
        q: 'Nel simbolo del MOSFET il gate è disegnato staccato dal resto. Perché?',
        figure: { kind: 'symbol', name: 'nmos' },
        options: [
          'È isolato dal canale da un sottile strato di ossido',
          'Si collega al canale solo quando il MOSFET conduce',
          'È il terminale da cui esce la corrente del carico',
          'È un terminale di riserva, che spesso resta libero',
        ],
        answer: 0,
        why: 'Il gate è separato dal canale da un sottilissimo strato di ossido di silicio (la O di MOS). Per questo non assorbe corrente continua: il MOSFET si comanda con la tensione, non con la corrente.',
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
        q: 'Un MOSFET a canale N con tensione di soglia di 2 V conduce già bene se tra gate e source ci sono solo 1 V.',
        answer: false,
        why: 'Sotto la tensione di soglia il canale non si forma e il MOSFET resta spento. Per farlo condurre bene serve una tensione ben più alta della soglia: molti MOSFET di potenza richiedono circa 10 V.',
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
        q: 'Il condensatore parte scarico e il circuito viene acceso. Quanto vale circa la tensione sul condensatore dopo 1 secondo?',
        figure: { kind: 'circuit', topo: 'rc', v: '10 V', r: '10 kΩ', c: '100 µF' },
        options: ['Circa 6,3 V', 'Circa 5 V', 'Circa 3,7 V', 'Circa 9,9 V'],
        answer: 0,
        why: 'τ = R × C = 10 kΩ × 100 µF = 1 s. Dopo un tempo τ il condensatore arriva al 63% della tensione finale: 0,63 × 10 V ≈ 6,3 V. Per arrivare quasi a 10 V servono circa 5τ, cioè 5 s.',
      },
      {
        id: 'ei-23', level: 2, topic: 'Frequenza di taglio', chapter: 'rc-filtri', type: 'number',
        q: 'Un filtro passa-basso RC ha R = 1 kΩ e C = 1 µF. Quanto vale la sua frequenza di taglio, in Hz?',
        value: 159.2, unit: 'Hz', tolerance: 1,
        why: 'fc = 1 / (2π × R × C) = 1 / (6,28 × 1000 Ω × 0,000 001 F) = 1 / 0,006 28 s ≈ 159 Hz. Sopra questa frequenza il segnale viene attenuato sempre di più.',
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
        why: 'Il passa-alto lascia passare le frequenze sopra il taglio. Con fc ≈ 500 Hz i segnali da 5 kHz passano quasi interi, mentre i 50 Hz, dieci volte sotto il taglio, scendono a circa un decimo.',
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
        id: 'ei-26', level: 2, topic: 'Amplificatore invertente', chapter: 'operazionale', type: 'number',
        q: 'Un amplificatore invertente ha Rin = 10 kΩ e Rf = 100 kΩ, con 0,3 V in ingresso. Quanto vale la tensione d\'uscita, in V (con il segno)?',
        value: -3, unit: 'V', tolerance: 0.05,
        why: 'Guadagno = −Rf / Rin = −100 kΩ / 10 kΩ = −10, quindi Vout = −10 × 0,3 V = −3 V. Il segno meno indica che l\'uscita è rovesciata rispetto all\'ingresso.',
      },
      {
        id: 'ei-27', level: 2, topic: 'Amplificatore non invertente', chapter: 'operazionale', type: 'number',
        q: 'Un amplificatore non invertente ha Rin = 10 kΩ e Rf = 47 kΩ. Con 0,5 V in ingresso, quanto vale la tensione d\'uscita, in V?',
        value: 2.85, unit: 'V', tolerance: 0.05,
        why: 'Guadagno = 1 + Rf / Rin = 1 + 47 kΩ / 10 kΩ = 5,7, quindi Vout = 5,7 × 0,5 V = 2,85 V. Con Rf = 0 il guadagno vale 1: è l\'inseguitore di tensione.',
      },
      {
        id: 'ei-28', level: 3, topic: 'Saturazione dell\'uscita', chapter: 'operazionale', type: 'choice',
        q: 'Un operazionale alimentato a ±12 V è montato come invertente con guadagno −100. In ingresso ci sono 0,5 V. Che cosa trovi in uscita?',
        options: [
          'Circa −11 V: l\'uscita è in saturazione',
          'Circa −50 V: il guadagno è −100',
          'Circa +11 V: l\'uscita satura in positivo',
          'Circa 0 V: l\'operazionale si blocca',
        ],
        answer: 0,
        why: 'In teoria servirebbero −100 × 0,5 V = −50 V, ma l\'uscita non può superare l\'alimentazione: si ferma poco prima di −12 V (circa −11 V, secondo il modello). L\'operazionale è in saturazione.',
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
        id: 'ei-33', level: 1, topic: 'Blocchi dell\'alimentatore', chapter: 'alimentatore', type: 'order',
        q: 'Metti in ordine i blocchi di un alimentatore lineare, dalla presa di rete all\'uscita a 5 V.',
        items: ['Trasformatore', 'Ponte di Graetz', 'Condensatore di livellamento', 'Regolatore 7805'],
        ends: ['Presa di rete', 'Uscita a 5 V'],
        why: 'Il trasformatore abbassa i 230 V alternati, il ponte di Graetz raddrizza le due semionde, il condensatore riempie i vuoti tra un impulso e l\'altro e il 7805 fissa l\'uscita a 5 V.',
      },
      {
        id: 'ei-34', level: 1, topic: 'Trasformatore', chapter: 'alimentatore', type: 'choice',
        q: 'A che cosa serve, in un alimentatore, il componente di questo simbolo?',
        figure: { kind: 'symbol', name: 'transformer' },
        options: ['Ad abbassare la tensione della rete', 'A trasformare l\'alternata in continua', 'A livellare la tensione raddrizzata', 'A tenere l\'uscita fissa a 5 V'],
        answer: 0,
        why: 'Il trasformatore ha due avvolgimenti sullo stesso nucleo: abbassa una tensione alternata (per esempio da 230 V a 12 V) e isola il circuito dalla rete. Non la rende continua: funziona solo in alternata.',
      },
      {
        id: 'ei-35', level: 2, topic: 'Ponte di Graetz', chapter: 'alimentatore', type: 'choice',
        q: 'Questa è la tensione all\'uscita di un ponte di Graetz collegato alla rete a 50 Hz. Con quale frequenza si ripetono gli impulsi?',
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
        q: 'Dalla valvola al chip: metti queste invenzioni in ordine cronologico.',
        items: ['Valvola diodo', 'Valvola triodo', 'Transistor a punta di contatto', 'Primi transistor al silicio', 'Timer integrato 555'],
        ends: ['Più antico', 'Più recente'],
        why: 'Valvola diodo di Fleming (1904), triodo di De Forest (1906), transistor a punta di contatto dei Bell Labs (1947, al germanio), primi transistor al silicio della Texas Instruments (1954), timer 555 progettato da Hans Camenzind (1971).',
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
        why: 'Nel triodo (Lee De Forest, 1906) una griglia tra catodo e placca regola la corrente: una piccola tensione sulla griglia ne comanda una grande. È il primo componente elettronico capace di amplificare un segnale.',
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
        why: 'Fleming (1904) e De Forest (1906) inventarono le valvole; Bardeen, Brattain e Shockley, ai Bell Labs, il transistor (1947); Atalla e Kahng il MOSFET (1959); Camenzind il timer 555 (1971).',
      },
      {
        id: 'ei-40', level: 2, topic: 'Dalla valvola al transistor', chapter: 'storia', type: 'choice',
        q: 'Perché, dagli anni \'50, il transistor ha preso il posto della valvola termoionica?',
        options: [
          'È piccolo, robusto e non ha un filamento da scaldare',
          'Lavora nel vuoto e quindi si consuma molto meno',
          'Regge tensioni molto più alte di qualsiasi valvola',
          'Fin dall\'inizio costava meno ed era di silicio',
        ],
        answer: 0,
        why: 'La valvola deve scaldare un filamento: consuma molta energia, è grande, fragile e prima o poi si esaurisce. Il transistor è minuscolo, consuma poco e dura a lungo: così sono nate le radio tascabili e poi i chip.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
