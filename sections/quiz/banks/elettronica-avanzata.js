/*
 * Banca domande del quiz: sezione 3, Elettronica avanzata.
 * Spettro e armoniche, linee di trasmissione, segnali differenziali, radio,
 * conversione analogico-digitale, clock e PLL, elettronica di potenza, MEMS,
 * fotonica ed elettronica quantistica: quattro domande per capitolo.
 * I capitoli sono le ancore delle pagine della sezione; il formato delle
 * domande è descritto in sections/quiz/README.md.
 * Le domande con id come 'ea-fourier-01' chiedono le stesse cose di quelle
 * della sezione (sections/elettronica-avanzata/quiz.js) e ne hanno lo stesso
 * id: quando quel file è caricato vale la versione della sezione.
 */
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'elettronica-avanzata',
    number: 3,
    title: 'Elettronica avanzata',
    subtitle: 'Segnali veloci, radio, conversione, potenza e frontiere',
    chapters: [
      { id: 'fourier', title: 'Fourier e lo spettro' },
      { id: 'linee', title: 'Linee di trasmissione' },
      { id: 'differenziale', title: 'Segnali differenziali' },
      { id: 'radio', title: 'Radio e modulazione' },
      { id: 'conversione', title: 'Conversione analogico-digitale' },
      { id: 'clock', title: 'Clock, quarzi e PLL' },
      { id: 'potenza', title: 'Elettronica di potenza' },
      { id: 'mems', title: 'MEMS' },
      { id: 'fotonica', title: 'Fotonica' },
      { id: 'quantistica', title: 'Elettronica quantistica' },
    ],
    questions: [
      // ------------------------------------------------------------ Fourier e lo spettro
      {
        id: 'ea-01', level: 1, topic: 'Serie di Fourier', chapter: 'fourier', type: 'choice',
        q: 'Secondo Fourier, come si può costruire un\'onda quadra come quella in figura?',
        figure: { kind: 'wave', shape: 'square', cycles: 3 },
        options: [
          'Sommando tante sinusoidi di frequenze diverse',
          'Sommando tante sinusoidi della stessa frequenza',
          'Moltiplicando tra loro due sinusoidi uguali',
          'Sommando una sinusoide e una tensione continua',
        ],
        answer: 0,
        why: 'Studiando come si propaga il calore, nel 1807 Joseph Fourier mostrò che un segnale periodico si può scrivere come somma di sinusoidi. Per l\'onda quadra servono la fondamentale e tante armoniche, a frequenze multiple della sua: più se ne sommano, più gli spigoli sono netti.',
      },
      {
        id: 'ea-02', level: 1, topic: 'Lo spettro', chapter: 'fourier', type: 'choice',
        q: 'In figura c\'è una sinusoide pura. Che cosa mostra il suo spettro, cioè il grafico delle frequenze che la compongono?',
        figure: { kind: 'wave', shape: 'sine', cycles: 3 },
        options: [
          'Una sola riga, alla frequenza della sinusoide',
          'Una riga per ogni armonica dispari, sempre più bassa',
          'Una fascia continua che copre tutte le frequenze',
          'Due righe, alla frequenza della sinusoide e al doppio',
        ],
        answer: 0,
        why: 'Una sinusoide pura contiene una sola frequenza: nello spettro c\'è una sola riga, alta quanto la sua ampiezza. Un\'onda quadra o triangolare della stessa frequenza avrebbe in più le righe delle armoniche, a frequenze multiple.',
      },
      {
        id: 'ea-fourier-01', level: 2, topic: 'Ampiezza delle armoniche', chapter: 'fourier', type: 'number',
        q: 'In un\'onda quadra simmetrica la fondamentale ha un\'ampiezza di 1,5 V. Quanto vale l\'ampiezza della quinta armonica, in V?',
        value: 0.3, unit: 'V', tolerance: 0.02,
        why: 'Nell\'onda quadra l\'armonica n ha 1/n dell\'ampiezza della fondamentale: 1,5 V / 5 = 0,3 V. La terza vale 0,5 V, la settima circa 0,21 V; le armoniche pari mancano.',
      },
      {
        id: 'ea-04', level: 3, topic: 'Armoniche e filtri', chapter: 'fourier', type: 'choice',
        q: 'Un\'onda quadra a 1 kHz, che va da −1 V a +1 V, entra in un filtro passa-basso ideale che elimina tutte le frequenze sopra i 4 kHz. Quali frequenze escono dal filtro?',
        options: ['1 kHz e 3 kHz', '1, 2, 3 e 4 kHz', 'Solo 1 kHz', '2 kHz e 4 kHz'],
        answer: 0,
        why: 'L\'onda quadra contiene solo la fondamentale e le armoniche dispari: 1, 3, 5, 7 kHz e così via. Sotto i 4 kHz restano 1 kHz e 3 kHz: in uscita c\'è un\'onda con gli spigoli arrotondati, a metà tra sinusoide e onda quadra.',
      },

      // ------------------------------------------------------------ linee di trasmissione
      {
        id: 'ea-05', level: 1, topic: 'Impedenza caratteristica', chapter: 'linee', type: 'match',
        q: 'Abbina ogni impedenza caratteristica al cavo in cui la trovi di solito.',
        pairs: [
          ['50 Ω', 'Coassiale di radiotrasmettitori e strumenti'],
          ['75 Ω', 'Coassiale dell\'antenna TV'],
          ['100 Ω', 'Coppia intrecciata del cavo Ethernet'],
        ],
        why: 'Il 50 Ω è lo standard di radiotrasmettitori e strumenti, il 75 Ω di TV e video; le coppie intrecciate del cavo Ethernet hanno 100 Ω differenziali. L\'impedenza caratteristica dipende dalla forma del cavo e dall\'isolante, non dalla lunghezza.',
      },
      {
        id: 'ea-06', level: 2, topic: 'Terminazione', chapter: 'linee', type: 'choice',
        q: 'Perché in fondo a una linea da 50 Ω si mette spesso un resistore da 50 Ω?',
        options: [
          'Per assorbire il segnale senza riflessioni',
          'Per limitare la corrente che scorre nel cavo',
          'Per scaricare a terra i disturbi esterni',
          'Per alzare la tensione che arriva in fondo',
        ],
        answer: 0,
        why: 'Una linea chiusa sulla sua impedenza caratteristica si comporta come se fosse infinitamente lunga: il segnale finisce nel resistore e non torna indietro. Senza questo adattamento, gli echi riflessi deformano i fronti dei segnali veloci.',
      },
      {
        id: 'ea-07', level: 2, topic: 'Velocità nel cavo', chapter: 'linee', type: 'truefalse',
        q: 'In un cavo coassiale il segnale viaggia alla stessa velocità della luce nel vuoto, cioè a circa 300 000 km/s.',
        answer: false,
        why: 'L\'isolante rallenta l\'onda: nei cavi comuni il segnale viaggia a circa 2/3 della velocità della luce, cioè a 200 000 km/s, e 1 m di cavo lo ritarda di circa 5 ns. Se questo ritardo è paragonabile alla durata dei fronti, il cavo va trattato come una linea di trasmissione.',
      },
      {
        id: 'ea-linee-01', level: 3, topic: 'Riflessioni', chapter: 'linee', type: 'choice',
        q: 'Su un cavo da 50 Ω viaggia un gradino di 1 V. In fondo al cavo c\'è un carico da 150 Ω. Quanto vale il gradino riflesso che torna verso il generatore?',
        options: ['+0,5 V', '−0,5 V', '+1 V', '0 V'],
        answer: 0,
        why: 'Il coefficiente di riflessione vale Γ = (R − Z₀) / (R + Z₀) = (150 − 50) / (150 + 50) = 0,5: torna indietro un gradino di 0,5 V, positivo perché il carico supera i 50 Ω. Con un carico da 50 Ω non tornerebbe niente.',
      },

      // ------------------------------------------------------------ segnali differenziali
      {
        id: 'ea-differenziale-01', level: 1, topic: 'Coppia D+ e D−', chapter: 'differenziale', type: 'choice',
        q: 'In figura i fili D+ e D− portano gli stessi bit con due segnali opposti. Che cosa guarda il ricevitore per decidere se un bit è 1 o 0?',
        figure: { kind: 'wave', shape: 'differential' },
        options: [
          'La differenza tra D+ e D−',
          'Solo D+, rispetto alla massa',
          'La somma di D+ e D−',
          'Quale dei due fili si muove prima',
        ],
        answer: 0,
        why: 'Il ricevitore calcola la differenza D+ − D−, cioè guarda quale dei due fili è più alto: così distingue 1 e 0. Un disturbo che si somma allo stesso modo ai due fili non cambia la differenza, e quindi non cambia il bit letto.',
      },
      {
        id: 'ea-10', level: 1, topic: 'Doppino intrecciato', chapter: 'differenziale', type: 'truefalse',
        q: 'Nel doppino i due fili sono intrecciati perché un disturbo esterno li colpisca quasi allo stesso modo.',
        answer: true,
        why: 'Con l\'intreccio i due fili si scambiano continuamente di posto: in media stanno alla stessa distanza dalla sorgente del disturbo e raccolgono lo stesso rumore.',
      },
      {
        id: 'ea-11', level: 2, topic: 'Collegamenti differenziali', chapter: 'differenziale', type: 'match',
        q: 'Abbina ogni collegamento differenziale al posto in cui lo trovi più spesso.',
        pairs: [
          ['LVDS', 'Pannello LCD di uno schermo'],
          ['RS-485', 'Macchine di una fabbrica'],
          ['CAN', 'Centraline di un\'automobile'],
          ['USB', 'Mouse e chiavette del PC'],
          ['PCI Express', 'Scheda video dentro il PC'],
        ],
        why: 'Tutti usano coppie di fili con segnali opposti: LVDS porta le immagini ai pannelli LCD, RS-485 collega le macchine industriali anche a 1200 m, CAN unisce le centraline delle auto, USB le periferiche e PCI Express le schede dentro il PC.',
      },
      {
        id: 'ea-12', level: 2, topic: 'Rumore di modo comune', chapter: 'differenziale', type: 'choice',
        q: 'Il ricevitore differenziale in figura ha 1,4 V sull\'ingresso + e 1,0 V sull\'ingresso −. Un disturbo aggiunge 0,3 V a tutti e due gli ingressi: quale tensione usa il ricevitore per decidere il bit?',
        figure: { kind: 'symbol', name: 'opamp' },
        options: ['0,4 V', '0,7 V', '1,7 V', '0,1 V'],
        answer: 0,
        why: 'Il ricevitore usa solo la differenza: con il disturbo il + sale a 1,7 V e il − a 1,3 V, e 1,7 − 1,3 = 0,4 V, come prima. Un disturbo uguale sui due fili si chiama di modo comune, e il ricevitore differenziale lo ignora.',
      },

      // ------------------------------------------------------------ radio e modulazione
      {
        id: 'ea-13', level: 1, topic: 'Tipi di modulazione', chapter: 'radio', type: 'choice',
        q: 'Quale modulazione mostra la figura?',
        figure: { kind: 'wave', shape: 'am' },
        options: [
          'Modulazione di ampiezza (AM)',
          'Modulazione di frequenza (FM)',
          'Modulazione di fase (PM)',
          'Modulazione a larghezza d\'impulso (PWM)',
        ],
        answer: 0,
        why: 'La portante oscilla sempre alla stessa frequenza, ma la sua ampiezza segue il segnale da trasmettere: la linea tratteggiata, detta inviluppo, ne ripete la forma. È la modulazione di ampiezza, usata dalle radio in onde medie e lunghe.',
      },
      {
        id: 'ea-radio-01', level: 1, topic: 'Lunghezza d\'onda', chapter: 'radio', type: 'number',
        q: 'Una stazione FM trasmette a 100 MHz. Quanto è lunga la sua onda, in m? Usa λ = c / f, con c = 300 000 km/s.',
        value: 3, unit: 'm', tolerance: 0.05,
        why: 'λ = c / f = 300 000 000 m/s / 100 000 000 Hz = 3 m. Un\'antenna a mezz\'onda per questa frequenza, come un dipolo, è lunga circa 1,5 m.',
      },
      {
        id: 'ea-15', level: 2, topic: 'Modulazione FM', chapter: 'radio', type: 'choice',
        q: 'La figura mostra un segnale FM. Perché la radio FM è meno disturbata dai temporali e dai motori elettrici rispetto alla AM?',
        figure: { kind: 'wave', shape: 'fm' },
        options: [
          'La FM affida il suono alla frequenza, non all\'ampiezza',
          'La FM usa onde più lunghe, che aggirano gli ostacoli',
          'La FM trasmette con molta più potenza della AM',
          'La FM usa antenne più grandi e più sensibili',
        ],
        answer: 0,
        why: 'Fulmini, motori e scintille disturbano soprattutto l\'ampiezza del segnale. In FM l\'informazione sta nella frequenza: le oscillazioni si fanno più fitte o più rade. Il ricevitore taglia via le variazioni di ampiezza e, con loro, gran parte dei disturbi.',
      },
      {
        id: 'ea-16', level: 2, topic: 'Storia della radio', chapter: 'radio', type: 'order',
        q: 'Metti in ordine cronologico queste tappe della storia della radio.',
        items: [
          'Maxwell prevede le onde elettromagnetiche',
          'Hertz produce e rileva le onde in laboratorio',
          'Marconi trasmette segnali senza fili a Pontecchio',
          'Un segnale di Marconi attraversa l\'Atlantico',
          'Nascono le prime stazioni radio per il pubblico',
        ],
        ends: ['Più antico', 'Più recente'],
        why: 'Maxwell previde le onde con le sue equazioni, intorno al 1865; Hertz le produsse e le rilevò tra il 1886 e il 1888. Marconi trasmise a Pontecchio, vicino a Bologna, nel 1895 e attraverso l\'Atlantico nel 1901. Le prime stazioni per il pubblico nacquero intorno al 1920.',
      },

      // ------------------------------------------------------------ conversione analogico-digitale
      {
        id: 'ea-17', level: 1, topic: 'Campionamento', chapter: 'conversione', type: 'choice',
        q: 'I punti in figura sono i campioni presi da un convertitore analogico-digitale (ADC). Il suono di un CD audio è campionato a 44,1 kHz: che cosa significa?',
        figure: { kind: 'wave', shape: 'sampled', cycles: 2 },
        options: [
          'Il suono viene misurato 44 100 volte al secondo',
          'Il CD registra suoni fino a 44 100 Hz',
          'La tensione viene divisa in 44 100 livelli',
          'Ogni secondo di musica occupa 44 100 byte',
        ],
        answer: 0,
        why: 'Campionare a 44,1 kHz vuol dire prendere 44 100 campioni al secondo, uno ogni 22,7 µs circa. I livelli dipendono invece dai bit di ogni campione: nel CD sono 16, cioè 65 536 livelli.',
      },
      {
        id: 'ea-conversione-01', level: 1, topic: 'Teorema di Nyquist', chapter: 'conversione', type: 'number',
        q: 'Vuoi registrare suoni con frequenze fino a 20 kHz. Secondo il teorema di Nyquist-Shannon, quale valore deve superare la frequenza di campionamento, in kHz?',
        value: 40, unit: 'kHz', tolerance: 0.5,
        why: 'Bisogna campionare a più del doppio della frequenza più alta: fc > 2 × 20 kHz = 40 kHz. Il CD usa 44,1 kHz: il margine in più lascia spazio al filtro che elimina le frequenze sopra i 20 kHz.',
      },
      {
        id: 'ea-19', level: 2, topic: 'Risoluzione e LSB', chapter: 'conversione', type: 'number',
        q: 'Un ADC a 10 bit misura tensioni da 0 a 5 V. Quanto vale un LSB, cioè il gradino di tensione più piccolo che sa distinguere, in mV?',
        value: 4.88, unit: 'mV', tolerance: 0.05,
        why: 'Con 10 bit ci sono 2¹⁰ = 1024 livelli: un LSB vale 5 V / 1024 ≈ 0,00488 V ≈ 4,88 mV. È l\'ADC di Arduino Uno, di tipo SAR: trova il valore in 10 passi, decidendo un bit alla volta, dal più significativo.',
      },
      {
        id: 'ea-20', level: 3, topic: 'Aliasing', chapter: 'conversione', type: 'choice',
        q: 'Una sinusoide a 900 Hz viene campionata a 1 kHz, senza filtro anti-aliasing. Che frequenza sembra avere il segnale ricostruito dai campioni?',
        options: ['100 Hz', '900 Hz', '450 Hz', '1,9 kHz'],
        answer: 0,
        why: 'Servirebbe campionare a più di 2 × 900 Hz = 1,8 kHz. A 1 kHz c\'è aliasing: il segnale si ripiega e compare a 1000 − 900 = 100 Hz. È lo stesso effetto per cui, nei film, le ruote delle carrozze sembrano girare piano o all\'indietro.',
      },

      // ------------------------------------------------------------ clock, quarzi e PLL
      {
        id: 'ea-21', level: 1, topic: 'Simboli', chapter: 'clock', type: 'choice',
        q: 'Quale componente rappresenta questo simbolo?',
        figure: { kind: 'symbol', name: 'crystal' },
        options: ['Un quarzo', 'Un condensatore', 'Un fusibile', 'Un resistore'],
        answer: 0,
        why: 'È il quarzo: una lamina di cristallo tra due elettrodi. Per effetto piezoelettrico vibra a una frequenza precisissima; quello degli orologi vibra a 32 768 Hz, cioè 2¹⁵ Hz: dimezzando la frequenza 15 volte si ottiene esattamente 1 Hz.',
      },
      {
        id: 'ea-22', level: 1, topic: 'Periodo del clock', chapter: 'clock', type: 'number',
        q: 'Il segnale in figura è il clock di un microcontrollore. Quanto dura un periodo, in ns? Ricorda che T = 1 / f.',
        figure: { kind: 'wave', shape: 'square', cycles: 4, label: 'CLK · 50 MHz' },
        value: 20, unit: 'ns', tolerance: 0.1,
        why: 'T = 1 / f = 1 / 50 000 000 Hz = 0,02 µs = 20 ns. In ogni periodo il clock fa un fronte di salita e uno di discesa, e in un secondo i periodi sono 50 milioni.',
      },
      {
        id: 'ea-23', level: 2, topic: 'Qualità del clock', chapter: 'clock', type: 'choice',
        q: 'Che cos\'è il jitter di un segnale di clock?',
        options: [
          'Il tremolio dei fronti attorno all\'istante ideale',
          'Il ritardo fisso tra due copie dello stesso clock',
          'La parte del periodo in cui il clock resta alto',
          'La lenta deriva della frequenza dovuta al calore',
        ],
        answer: 0,
        why: 'Il jitter è la piccola incertezza, spesso di pochi picosecondi, sul momento in cui arriva ogni fronte. Il ritardo tra due copie dello stesso clock in punti diversi del circuito si chiama invece skew; la parte del periodo a livello alto è il duty cycle.',
      },
      {
        id: 'ea-24', level: 3, topic: 'PLL', chapter: 'clock', type: 'choice',
        q: 'Un PLL riceve 25 MHz da un quarzo; nell\'anello di retroazione divide la frequenza d\'uscita per 40. Quale frequenza dà in uscita quando è agganciato?',
        options: ['1 GHz', '625 kHz', '65 MHz', '25 MHz'],
        answer: 0,
        why: 'Il PLL (Phase-Locked Loop, anello ad aggancio di fase) corregge l\'oscillatore finché l\'uscita divisa per 40 non vale quanto il riferimento: fout / 40 = 25 MHz, quindi fout = 40 × 25 MHz = 1000 MHz = 1 GHz. Così un quarzo lento e stabile genera il clock veloce di un processore.',
      },

      // ------------------------------------------------------------ elettronica di potenza
      {
        id: 'ea-25', level: 1, topic: 'Convertitore boost', chapter: 'potenza', type: 'truefalse',
        q: 'Un convertitore switching di tipo boost può dare in uscita una tensione più alta di quella che riceve in ingresso.',
        answer: true,
        why: 'Il boost accumula energia in un induttore mentre l\'interruttore è chiuso; quando si apre, la tensione dell\'induttore si somma a quella d\'ingresso. Così un power bank alza i 3,7 V della batteria al litio a 5 V. Il buck, invece, abbassa la tensione.',
      },
      {
        id: 'ea-potenza-01', level: 2, topic: 'Rendimento', chapter: 'potenza', type: 'number',
        q: 'Un regolatore lineare abbassa la tensione da 12 V a 5 V per un carico che assorbe 1 A. Quanto vale il suo rendimento, in %?',
        value: 41.7, unit: '%', tolerance: 0.5,
        why: 'Nel regolatore lineare entra la stessa corrente che esce: η = (5 V × 1 A) / (12 V × 1 A) = 5 W / 12 W ≈ 41,7%. Gli altri (12 − 5) V × 1 A = 7 W diventano calore; un convertitore switching supera spesso il 90%.',
      },
      {
        id: 'ea-potenza-02', level: 2, topic: 'Convertitore buck', chapter: 'potenza', type: 'number',
        q: 'Un convertitore buck alimentato a 12 V deve dare 3,3 V a un microcontrollore. Con quale duty cycle, circa, deve lavorare il PWM che comanda il suo interruttore, in %?',
        value: 27.5, unit: '%', tolerance: 0.5,
        why: 'Nel buck Vout ≈ D × Vin, quindi D = Vout / Vin = 3,3 V / 12 V = 0,275, cioè 27,5%: l\'interruttore, di solito un MOSFET di potenza, resta chiuso per poco più di un quarto del periodo. Induttore e condensatore filtrano gli impulsi e lasciano passare la media.',
      },
      {
        id: 'ea-potenza-04', level: 3, topic: 'GaN e SiC', chapter: 'potenza', type: 'choice',
        q: 'I caricabatterie con transistor al nitruro di gallio (GaN) sono molto più piccoli di quelli al silicio. Quale proprietà del GaN lo permette?',
        options: [
          'Commuta più in fretta e con meno perdite',
          'Commuta più lentamente e fa meno disturbi',
          'Lavora senza bisogno di un trasformatore',
          'Conduce il calore meglio del rame',
        ],
        answer: 0,
        why: 'GaN e carburo di silicio (SiC) sono semiconduttori a banda proibita larga: i loro transistor commutano molto in fretta e sprecano poco. A frequenza più alta bastano induttori, trasformatori e condensatori più piccoli, e c\'è meno calore da smaltire.',
      },

      // ------------------------------------------------------------ MEMS
      {
        id: 'ea-29', level: 1, topic: 'Che cos\'è un MEMS', chapter: 'mems', type: 'choice',
        q: 'Che cosa ha di speciale un MEMS rispetto a un normale chip?',
        options: [
          'Ha minuscole parti meccaniche che si muovono',
          'È fatto di germanio invece che di silicio',
          'Lavora con la luce invece che con la corrente',
          'Funziona senza bisogno di alimentazione',
        ],
        answer: 0,
        why: 'MEMS sta per Micro-Electro-Mechanical Systems, sistemi micro-elettro-meccanici: nel silicio si scolpiscono masse, molle, membrane e specchi più piccoli di un millimetro, che si muovono davvero. Nei sensori il chip misura il loro movimento; negli specchi DLP è il chip a muoverli.',
      },
      {
        id: 'ea-30', level: 1, topic: 'MEMS di ogni giorno', chapter: 'mems', type: 'match',
        q: 'Abbina ogni MEMS al lavoro che fa più spesso.',
        pairs: [
          ['Accelerometro', 'Sente l\'urto e fa scattare l\'airbag'],
          ['Giroscopio', 'Misura la velocità di rotazione'],
          ['Microfono MEMS', 'Capta la voce durante le telefonate'],
          ['Sensore di pressione', 'Stima la quota a cui ti trovi'],
          ['Specchi DLP', 'Formano l\'immagine nei proiettori'],
        ],
        why: 'L\'accelerometro sente gli urti, il giroscopio le rotazioni, e nel microfono MEMS una membrana di silicio vibra con la voce. Il sensore di pressione stima la quota dal calo della pressione dell\'aria; nei proiettori DLP ogni pixel è un microspecchio che si inclina per accendersi o spegnersi.',
      },
      {
        id: 'ea-mems-01', level: 2, topic: 'Accelerometro', chapter: 'mems', type: 'truefalse',
        q: 'L\'accelerometro di uno smartphone fermo sul tavolo misura un\'accelerazione nulla, perché il telefono non si muove.',
        answer: false,
        why: 'L\'accelerometro sente anche la gravità: da fermo misura circa 1 g, cioè 9,8 m/s², in verticale. È così che il telefono capisce come lo tieni e gira lo schermo. In caduta libera, invece, leggerebbe quasi zero.',
      },
      {
        id: 'ea-mems-04', level: 3, topic: 'Giroscopio MEMS', chapter: 'mems', type: 'choice',
        q: 'Come fa il giroscopio MEMS di uno smartphone a misurare le rotazioni?',
        options: [
          'Una massa che vibra viene deviata dalla forza di Coriolis',
          'Una minuscola trottola gira a migliaia di giri al secondo',
          'Una bussola interna segue il campo magnetico terrestre',
          'Una pallina di metallo rotola tra due contatti elettrici',
        ],
        answer: 0,
        why: 'Nel chip una minuscola massa vibra avanti e indietro. Se il telefono ruota, la forza di Coriolis la spinge di lato, tanto più quanto più la rotazione è veloce, e degli elettrodi misurano lo spostamento. La bussola dello smartphone è un altro sensore: il magnetometro.',
      },

      // ------------------------------------------------------------ fotonica
      {
        id: 'ea-fotonica-01', level: 1, topic: 'Fibra ottica', chapter: 'fotonica', type: 'choice',
        q: 'Perché la luce resta dentro una fibra ottica anche quando la fibra fa una curva?',
        options: [
          'Perché si riflette tutta al confine col mantello',
          'Perché il vetro è ricoperto da uno strato d\'argento',
          'Perché il raggio laser è stretto e non si allarga',
          'Perché la guaina nera assorbe la luce che sfugge',
        ],
        answer: 0,
        why: 'Il nucleo di vetro ha un indice di rifrazione un po\' più alto del mantello che lo avvolge. La luce che colpisce il confine con un angolo radente viene riflessa tutta: è la riflessione totale interna, e funziona anche quando la fibra si piega dolcemente.',
      },
      {
        id: 'ea-34', level: 2, topic: 'Simboli', chapter: 'fotonica', type: 'choice',
        q: 'In un collegamento in fibra ottica trovi questo simbolo. Quale componente rappresenta?',
        figure: { kind: 'symbol', name: 'photodiode' },
        options: ['Un fotodiodo', 'Un LED', 'Un diodo laser', 'Un diodo Zener'],
        answer: 0,
        why: 'Le frecce entrano nel simbolo: il componente riceve la luce. È il fotodiodo, che in fondo alla fibra trasforma gli impulsi di luce in corrente. Nel LED e nel diodo laser, che la luce la emettono, le frecce escono.',
      },
      {
        id: 'ea-35', level: 2, topic: 'Storia della fotonica', chapter: 'fotonica', type: 'order',
        q: 'Metti in ordine cronologico queste tappe della fotonica.',
        items: [
          'Maiman accende il primo laser',
          'Charles Kao propone le fibre di vetro per le comunicazioni',
          'Corning produce la prima fibra a bassa perdita',
          'Il primo cavo in fibra ottica attraversa l\'Atlantico',
        ],
        ends: ['Più antico', 'Più recente'],
        why: 'Theodore Maiman costruì il laser a rubino nel 1960. Nel 1966 Kao calcolò che un vetro purissimo poteva portare la luce per chilometri (Nobel 2009); Corning ci riuscì nel 1970. Il cavo transatlantico TAT-8 entrò in servizio nel 1988.',
      },
      {
        id: 'ea-36', level: 3, topic: 'Attenuazione in dB', chapter: 'fotonica', type: 'number',
        q: 'Una fibra ottica attenua la luce di 0,2 dB per ogni chilometro. Dopo 50 km, quanta parte della potenza iniziale arriva in fondo, in %?',
        value: 10, unit: '%', tolerance: 0.5,
        why: 'La perdita totale è 0,2 dB/km × 50 km = 10 dB. Ogni 10 dB la potenza si divide per 10 (con 3 dB circa si dimezza): arriva 1/10 della potenza iniziale, cioè il 10%.',
      },

      // ------------------------------------------------------------ elettronica quantistica
      {
        id: 'ea-37', level: 1, topic: 'Limiti della miniaturizzazione', chapter: 'quantistica', type: 'choice',
        q: 'Se l\'isolante di un transistor è spesso pochi atomi, alcuni elettroni lo attraversano anche senza avere l\'energia per farlo. Come si chiama questo fenomeno?',
        options: ['Effetto tunnel', 'Effetto Joule', 'Effetto fotoelettrico', 'Effetto piezoelettrico'],
        answer: 0,
        why: 'Per la meccanica quantistica un elettrone può attraversare una barriera sottilissima anche senza l\'energia per scavalcarla: è l\'effetto tunnel. Nei transistor più piccoli causa correnti di perdita ed è uno dei limiti alla miniaturizzazione.',
      },
      {
        id: 'ea-38', level: 1, topic: 'Misura di un qubit', chapter: 'quantistica', type: 'truefalse',
        q: 'Se misuri un qubit che si trova in sovrapposizione, leggi 0 e 1 nello stesso momento.',
        answer: false,
        why: 'Prima della misura il qubit è in una sovrapposizione di 0 e 1; quando lo misuri ottieni un solo valore, 0 oppure 1, con una certa probabilità, e la sovrapposizione si perde. Per questo un algoritmo quantistico deve rendere molto probabile la risposta giusta.',
      },
      {
        id: 'ea-39', level: 2, topic: 'Concetti quantistici', chapter: 'quantistica', type: 'match',
        q: 'Abbina ogni concetto alla sua descrizione.',
        pairs: [
          ['Sovrapposizione', 'Un qubit combina 0 e 1 finché non lo misuri'],
          ['Entanglement', 'Due qubit danno misure legate, anche se lontani'],
          ['Effetto tunnel', 'Un elettrone attraversa una barriera sottile'],
          ['Giunzione Josephson', 'Due superconduttori divisi da un isolante'],
        ],
        why: 'Sovrapposizione ed entanglement sono le risorse dei computer quantistici. Nella giunzione Josephson, il cuore di molti qubit, coppie di elettroni passano per effetto tunnel da un superconduttore all\'altro; questi chip lavorano a pochi centesimi di grado sopra lo zero assoluto.',
      },
      {
        id: 'ea-40', level: 3, topic: 'Storia della quantistica', chapter: 'quantistica', type: 'order',
        q: 'Metti in ordine cronologico queste tappe dell\'elettronica quantistica.',
        items: [
          'Esaki costruisce il diodo tunnel',
          'Josephson prevede l\'effetto che porta il suo nome',
          'Feynman propone di simulare la natura con computer quantistici',
          'Shor scopre come scomporre i numeri in fattori con i qubit',
          'Google annuncia la supremazia quantistica con il chip Sycamore',
        ],
        ends: ['Più antico', 'Più recente'],
        why: 'Esaki inventò il diodo tunnel alla fine degli anni \'50 e Josephson previde il suo effetto nel 1962: furono premiati con il Nobel del 1973. Feynman lanciò l\'idea all\'inizio degli anni \'80, Shor pubblicò il suo algoritmo nel 1994 e Google il suo esperimento nel 2019.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
