/*
 * Banca domande del quiz: sezione 1, Elettronica base.
 * 40 domande, quattro per ognuno dei dieci capitoli della sezione, dalla carica
 * elettrica agli strumenti di misura. Gli id dei capitoli sono le ancore delle
 * pagine della sezione: non vanno cambiati.
 */
(function (root) {
  'use strict';

  if (!root.QuizBank) return;

  root.QuizBank.register({
    slug: 'elettronica-base',
    number: 1,
    title: 'Elettronica base',
    subtitle: 'Carica, corrente, tensione e i primi circuiti',
    chapters: [
      { id: 'carica', title: 'La carica elettrica' },
      { id: 'corrente', title: 'La corrente' },
      { id: 'ohm', title: 'La legge di Ohm' },
      { id: 'potenza', title: 'Potenza ed energia' },
      { id: 'circuiti', title: 'Circuiti in serie e in parallelo' },
      { id: 'condensatore', title: 'Il condensatore' },
      { id: 'magnetismo', title: 'Elettricità e magnetismo' },
      { id: 'rele', title: 'Il relè' },
      { id: 'alternata', title: 'La corrente alternata' },
      { id: 'misure', title: 'Strumenti di misura' },
    ],
    questions: [
      // ------------------------------------------------------------ carica
      {
        id: 'eb-01', level: 1, topic: 'Elettricità statica', chapter: 'carica', type: 'choice',
        q: 'Perché un palloncino strofinato sui capelli si carica di elettricità?',
        options: ['Perché acquista elettroni dai capelli', 'Perché acquista protoni dai capelli', 'Perché diventa una piccola calamita', 'Perché si scalda con lo sfregamento'],
        answer: 0,
        why: 'Strofinando, alcuni elettroni passano dai capelli al palloncino, che diventa negativo, mentre i capelli restano positivi. Si spostano solo gli elettroni: i protoni restano fermi nei nuclei degli atomi.',
      },
      {
        id: 'eb-02', level: 1, topic: 'Attrazione e repulsione', chapter: 'carica', type: 'truefalse',
        q: 'Due corpi con cariche elettriche dello stesso segno si attraggono.',
        answer: false,
        why: 'Cariche dello stesso segno si respingono, cariche di segno opposto si attraggono. Per questo due palloncini strofinati sui capelli, entrambi negativi, si allontanano l\'uno dall\'altro.',
      },
      {
        id: 'eb-03', level: 2, topic: 'Parafulmine', chapter: 'carica', type: 'choice',
        q: 'Come protegge un edificio il parafulmine ideato da Benjamin Franklin?',
        options: ['Offre al fulmine una via conduttrice verso terra', 'Respinge il fulmine con una carica dello stesso segno', 'Assorbe l\'energia del fulmine e la conserva', 'Isola l\'edificio dal terreno sottostante'],
        answer: 0,
        why: 'Il parafulmine è un\'asta di metallo collegata a terra con un grosso conduttore: la scarica scorre nel metallo invece di attraversare i muri. Franklin lo propose intorno al 1750, dopo i suoi studi sui fulmini.',
      },
      {
        id: 'eb-04', level: 3, topic: 'Legge di Coulomb', chapter: 'carica', type: 'choice',
        q: 'Secondo la legge di Coulomb, che cosa succede alla forza tra due cariche se la loro distanza raddoppia?',
        options: ['Diventa un quarto', 'Diventa la metà', 'Diventa il doppio', 'Resta la stessa'],
        answer: 0,
        why: 'La forza è proporzionale a 1 / d²: con distanza doppia diventa 1 / 2² = 1/4. Charles-Augustin de Coulomb la misurò nel 1785 con una bilancia di torsione.',
      },

      // ------------------------------------------------------------ corrente
      {
        id: 'eb-05', level: 1, topic: 'Tensione', chapter: 'corrente', type: 'choice',
        q: 'Che cos\'è la tensione elettrica?',
        options: ['La differenza di potenziale tra due punti', 'La quantità di carica che passa in un secondo', 'L\'opposizione di un materiale alla corrente', 'L\'energia consumata da un apparecchio in un\'ora'],
        answer: 0,
        why: 'La tensione, misurata in volt, è la differenza di potenziale che spinge le cariche nel circuito, come un dislivello spinge l\'acqua. La carica al secondo è la corrente; l\'opposizione al passaggio è la resistenza.',
      },
      {
        id: 'eb-06', level: 1, topic: 'Unità di misura', chapter: 'corrente', type: 'match',
        q: 'Abbina ogni grandezza elettrica alla sua unità di misura.',
        pairs: [['Carica', 'coulomb (C)'], ['Corrente', 'ampere (A)'], ['Tensione', 'volt (V)'], ['Resistenza', 'ohm (Ω)']],
        why: 'Carica in coulomb, corrente in ampere (1 A = 1 coulomb al secondo), tensione in volt, resistenza in ohm. I nomi ricordano Coulomb, Ampère, Volta e Ohm.',
      },
      {
        id: 'eb-07', level: 2, topic: 'Verso della corrente', chapter: 'corrente', type: 'truefalse',
        q: 'In un filo di metallo gli elettroni si muovono nello stesso verso della corrente convenzionale.',
        answer: false,
        why: 'Per convenzione la corrente va dal polo + al polo −. Gli elettroni, che sono negativi, si muovono al contrario, dal − al +: la convenzione fu fissata prima che si scoprisse l\'elettrone (1897).',
      },
      {
        id: 'eb-08', level: 2, topic: 'Pila di Volta', chapter: 'corrente', type: 'choice',
        q: 'Com\'era fatta la pila che Alessandro Volta presentò nel 1800?',
        options: ['Dischi di zinco e rame impilati, con panni bagnati di acqua salata', 'Una bottiglia di vetro rivestita di metallo, dentro e fuori', 'Un disco di rame che gira tra i poli di una grossa calamita', 'Una sfera di zolfo strofinata facendola girare con una manovella'],
        answer: 0,
        why: 'Era una colonna di dischi di zinco e rame alternati, separati da panni imbevuti di acqua salata: il primo generatore di corrente continua. Dal nome di Volta viene l\'unità di misura volt.',
      },

      // ------------------------------------------------------------ ohm
      {
        id: 'eb-09', level: 2, topic: 'Resistività', chapter: 'ohm', type: 'truefalse',
        q: 'A parità di materiale e di lunghezza, un filo più spesso ha una resistenza minore di un filo sottile.',
        answer: true,
        why: 'R = ρ × L / S: la resistenza cresce con la lunghezza L e cala con la sezione S, mentre ρ, la resistività, dipende dal materiale. Per questo gli apparecchi potenti usano cavi più grossi.',
      },
      {
        id: 'eb-10', level: 1, topic: 'Legge di Ohm', chapter: 'ohm', type: 'number',
        q: 'Un resistore da 1,5 kΩ è collegato a una pila da 9 V. Quanta corrente lo attraversa, in mA?',
        value: 6, unit: 'mA', tolerance: 0.1,
        why: 'Legge di Ohm: I = V / R = 9 V / 1500 Ω = 0,006 A, cioè 6 mA.',
      },
      {
        id: 'eb-11', level: 2, topic: 'Codice colori', chapter: 'ohm', type: 'choice',
        q: 'Quanto vale il resistore in figura?',
        figure: { kind: 'resistor', bands: ['giallo', 'viola', 'rosso', 'oro'] },
        options: ['4,7 kΩ ±5%', '47 kΩ ±5%', '470 Ω ±5%', '4,7 kΩ ±10%'],
        answer: 0,
        why: 'Giallo 4, viola 7, rosso moltiplica per 100: 47 × 100 = 4700 Ω = 4,7 kΩ. La quarta banda, oro, indica una tolleranza del ±5% (l\'argento indica ±10%).',
      },
      {
        id: 'eb-12', level: 3, topic: 'Resistore per LED', chapter: 'ohm', type: 'number',
        q: 'Nel circuito in figura il LED acceso ha ai suoi capi 2 V. Quanta corrente scorre nel circuito, in mA?',
        figure: { kind: 'circuit', topo: 'led', v: '5 V', r: '150 Ω' },
        value: 20, unit: 'mA', tolerance: 0.5,
        why: 'Sul resistore restano 5 − 2 = 3 V, quindi I = 3 V / 150 Ω = 0,02 A = 20 mA, un valore tipico per un LED. Senza il resistore la corrente salirebbe troppo e il LED si brucerebbe.',
      },

      // ------------------------------------------------------------ potenza
      {
        id: 'eb-13', level: 1, topic: 'Potenza', chapter: 'potenza', type: 'number',
        q: 'Un caricatore USB fornisce 5 V con una corrente di 2 A. Quanta potenza eroga, in W?',
        value: 10, unit: 'W', tolerance: 0.1,
        why: 'P = V × I = 5 V × 2 A = 10 W. Un watt è un joule di energia al secondo.',
      },
      {
        id: 'eb-14', level: 2, topic: 'Energia in bolletta', chapter: 'potenza', type: 'number',
        q: 'Una stufetta da 2 kW resta accesa per 3 ore. Se l\'energia costa 0,25 € al kWh, quanto si spende, in euro?',
        value: 1.5, unit: '€', tolerance: 0.01,
        why: 'Energia = P × t = 2 kW × 3 h = 6 kWh, che a 0,25 € al kWh costano 6 × 0,25 = 1,50 €. In bolletta si paga l\'energia consumata, in kWh, non la potenza.',
      },
      {
        id: 'eb-15', level: 2, topic: 'Fusibile', chapter: 'potenza', type: 'choice',
        q: 'Che cosa fa il componente rappresentato da questo simbolo?',
        figure: { kind: 'symbol', name: 'fuse' },
        options: ['Fonde e apre il circuito se la corrente è troppo alta', 'Abbassa la tensione quando supera il valore giusto', 'Accumula la corrente in eccesso per usarla dopo', 'Misura la corrente e la mostra su un display'],
        answer: 0,
        why: 'È il fusibile: un filo sottile che per effetto Joule si scalda e fonde quando la corrente supera il suo valore, aprendo il circuito prima che i cavi si surriscaldino.',
      },
      {
        id: 'eb-16', level: 3, topic: 'Dissipazione', chapter: 'potenza', type: 'choice',
        q: 'Il resistore in figura viene collegato a 12 V. Va bene un modello che regge al massimo 0,25 W?',
        figure: { kind: 'resistor', bands: ['rosso', 'rosso', 'marrone', 'oro'] },
        options: ['No, dissipa circa 0,65 W', 'Sì, dissipa circa 0,07 W', 'Sì, dissipa circa 0,05 W', 'No, dissipa circa 6,5 W'],
        answer: 0,
        why: 'Rosso 2, rosso 2, marrone × 10: 220 Ω. P = V² / R = 144 / 220 ≈ 0,65 W, più del doppio di 0,25 W: per effetto Joule scalderebbe troppo, quindi serve un modello da 1 W.',
      },

      // ------------------------------------------------------------ circuiti
      {
        id: 'eb-17', level: 1, topic: 'Cortocircuito', chapter: 'circuiti', type: 'choice',
        q: 'Che cos\'è un cortocircuito?',
        options: ['Un collegamento quasi senza resistenza tra i due poli', 'Un circuito in cui l\'interruttore è rimasto aperto', 'Un circuito costruito apposta con fili molto corti', 'Un circuito con più lampadine collegate in serie'],
        answer: 0,
        why: 'Se i due poli di una pila o della rete si toccano attraverso un conduttore, la resistenza è quasi zero e per la legge di Ohm la corrente diventa enorme: i fili si scaldano e devono intervenire fusibili o interruttori automatici.',
      },
      {
        id: 'eb-18', level: 1, topic: 'Resistori in serie', chapter: 'circuiti', type: 'number',
        q: 'I tre resistori in figura sono collegati in serie tra A e B. Quanto vale la resistenza totale, in Ω?',
        figure: { kind: 'circuit', topo: 'series', values: ['100 Ω', '220 Ω', '470 Ω'] },
        value: 790, unit: 'Ω', tolerance: 0.5,
        why: 'In serie la corrente attraversa un resistore dopo l\'altro, quindi le resistenze si sommano: 100 + 220 + 470 = 790 Ω.',
      },
      {
        id: 'eb-19', level: 2, topic: 'Resistori in parallelo', chapter: 'circuiti', type: 'number',
        q: 'I due resistori in figura sono in parallelo. Se tra A e B colleghi una pila da 12 V, quanta corrente esce in tutto dalla pila, in mA?',
        figure: { kind: 'circuit', topo: 'parallel', values: ['300 Ω', '600 Ω'] },
        value: 60, unit: 'mA', tolerance: 0.5,
        why: 'Ogni ramo ha 12 V: 12 / 300 = 40 mA e 12 / 600 = 20 mA. Per la legge di Kirchhoff delle correnti la pila fornisce la somma, 60 mA: come una sola resistenza da 200 Ω.',
      },
      {
        id: 'eb-20', level: 1, topic: 'Interruttori in serie', chapter: 'circuiti', type: 'logic',
        q: 'Nel circuito in figura la lampada è comandata dagli interruttori A e B, collegati in serie (1 = chiuso). Imposta gli interruttori per accenderla.',
        figure: { kind: 'circuit', topo: 'switches-series' },
        expr: 'AND(A,B)', target: 1,
        why: 'In serie la corrente passa solo se A e B sono chiusi tutti e due: è la funzione logica AND. Basta un interruttore aperto per spegnere la lampada.',
      },

      // ------------------------------------------------------------ condensatore
      {
        id: 'eb-21', level: 1, topic: 'Simboli', chapter: 'condensatore', type: 'choice',
        q: 'Come si chiama il componente rappresentato da questo simbolo?',
        figure: { kind: 'symbol', name: 'capacitor' },
        options: ['Un condensatore', 'Una pila', 'Un interruttore aperto', 'Un resistore'],
        answer: 0,
        why: 'Le due piastre parallele, separate da un isolante, sono le armature del condensatore. La sua capacità si misura in farad (F); in pratica si usano µF, nF e pF.',
      },
      {
        id: 'eb-22', level: 1, topic: 'Condensatori elettrolitici', chapter: 'condensatore', type: 'truefalse',
        q: 'Un condensatore elettrolitico, come quello del simbolo in figura, ha un polo positivo e uno negativo: va montato nel verso giusto.',
        figure: { kind: 'symbol', name: 'electrolytic' },
        answer: true,
        why: 'Gli elettrolitici sono polarizzati: il terminale + va verso il punto a tensione più alta, altrimenti il condensatore si scalda e può gonfiarsi o scoppiare. In cambio offrono capacità grandi, fino a migliaia di µF.',
      },
      {
        id: 'eb-23', level: 2, topic: 'Prefissi', chapter: 'condensatore', type: 'order',
        q: 'Ordina queste capacità dalla più piccola alla più grande.',
        items: ['470 pF', '22 nF', '0,1 µF', '47 µF'],
        ends: ['Più piccola', 'Più grande'],
        why: '1 µF = 1000 nF e 1 nF = 1000 pF. Quindi 470 pF = 0,47 nF, poi 22 nF, poi 0,1 µF = 100 nF e infine 47 µF = 47 000 nF.',
      },
      {
        id: 'eb-24', level: 3, topic: 'Carica e scarica', chapter: 'condensatore', type: 'choice',
        q: 'Nel circuito in figura il condensatore è scarico. Si chiude l\'interruttore: come varia nel tempo la corrente nel resistore?',
        figure: { kind: 'circuit', topo: 'rc', v: '9 V', r: '10 kΩ', c: '100 µF' },
        options: ['Parte alta e cala fino quasi a zero', 'Parte da zero e cresce fino al massimo', 'Resta costante finché non è carico', 'Sale e scende più volte, poi si ferma'],
        answer: 0,
        why: 'All\'inizio il condensatore scarico non oppone tensione e I = 9 V / 10 kΩ = 0,9 mA; poi la sua tensione sale e la corrente cala. Con τ = R × C = 10 kΩ × 100 µF = 1 s, dopo circa 5 s è quasi carico.',
      },

      // ------------------------------------------------------------ magnetismo
      {
        id: 'eb-25', level: 1, topic: 'Elettromagnete', chapter: 'magnetismo', type: 'truefalse',
        q: 'Un elettromagnete smette di attirare il ferro quando si interrompe la corrente nella sua bobina.',
        answer: true,
        why: 'Il campo magnetico dell\'elettromagnete nasce dalla corrente: niente corrente, niente campo. Per questo si può accendere e spegnere a comando, come nelle gru che sollevano rottami di ferro e nei relè.',
      },
      {
        id: 'eb-26', level: 1, topic: 'Induttore', chapter: 'magnetismo', type: 'choice',
        q: 'Quale componente rappresenta questo simbolo?',
        figure: { kind: 'symbol', name: 'inductor' },
        options: ['Un induttore', 'Un resistore', 'Un condensatore', 'Un trasformatore'],
        answer: 0,
        why: 'È l\'induttore, cioè una bobina: un filo avvolto a spirale che crea un campo magnetico quando è percorso da corrente. La sua induttanza si misura in henry (H), dal nome di Joseph Henry.',
      },
      {
        id: 'eb-27', level: 2, topic: 'Induzione', chapter: 'magnetismo', type: 'choice',
        q: 'Nel 1831 Michael Faraday scoprì l\'induzione elettromagnetica. In quale caso compare una corrente in una bobina?',
        options: ['Quando cambia il campo magnetico che la attraversa', 'Quando una calamita ferma è appoggiata accanto', 'Quando la bobina è fatta di un metallo magnetico', 'Quando in una bobina vicina scorre corrente costante'],
        answer: 0,
        why: 'Serve un campo magnetico che varia: una calamita che si muove, o una corrente vicina che si accende, si spegne o cambia. È il principio di generatori, alternatori e trasformatori.',
      },
      {
        id: 'eb-28', level: 3, topic: 'Storia', chapter: 'magnetismo', type: 'order',
        q: 'Metti in ordine cronologico queste tappe della storia dell\'elettricità.',
        items: ['Bottiglia di Leida', 'Pila di Volta', 'Esperimento di Ørsted con la bussola', 'Legge di Ohm', 'Induzione elettromagnetica di Faraday'],
        ends: ['Più antica', 'Più recente'],
        why: 'Bottiglia di Leida (1745), pila di Volta (1800), esperimento di Ørsted (1820), legge di Ohm (1827), induzione di Faraday (1831). Ørsted mostrò che la corrente crea magnetismo; Faraday, undici anni dopo, il contrario.',
      },

      // ------------------------------------------------------------ rele
      {
        id: 'eb-29', level: 1, topic: 'Relè', chapter: 'rele', type: 'choice',
        q: 'Il simbolo in figura è quello di un relè. Che cosa fa questo componente?',
        figure: { kind: 'symbol', name: 'relay' },
        options: ['Apre o chiude un contatto con un elettromagnete', 'Alza o abbassa la tensione alternata di rete', 'Accumula carica e poi la rilascia di colpo', 'Interrompe il circuito fondendo un filo sottile'],
        answer: 0,
        why: 'Nel relè una piccola corrente nella bobina crea un elettromagnete che sposta un contatto, e quel contatto può comandare correnti molto più grandi. Uno dei primi a costruirlo fu Joseph Henry, negli anni Trenta dell\'Ottocento.',
      },
      {
        id: 'eb-30', level: 2, topic: 'Parti del relè', chapter: 'rele', type: 'match',
        q: 'Abbina ogni parte del relè alla sua funzione.',
        pairs: [
          ['Bobina', 'Diventa un elettromagnete quando passa corrente'],
          ['Ancora', 'Lamina di ferro attirata dalla bobina'],
          ['Molla', 'Riporta l\'ancora nella posizione di riposo'],
          ['Contatto normalmente aperto', 'Si chiude quando la bobina è alimentata'],
          ['Contatto normalmente chiuso', 'Si apre quando la bobina è alimentata'],
        ],
        why: 'Con la bobina alimentata l\'ancora viene attirata e sposta i contatti: il normalmente aperto si chiude, il normalmente chiuso si apre. Tolta la corrente, la molla riporta tutto a riposo.',
      },
      {
        id: 'eb-31', level: 3, topic: 'Telegrafo', chapter: 'rele', type: 'choice',
        q: 'Perché i relè furono preziosi per il telegrafo sulle lunghe distanze?',
        options: ['Rilanciavano il segnale indebolito con una pila locale', 'Rendevano più veloci gli impulsi lungo il filo', 'Trasformavano gli impulsi in suoni da ascoltare', 'Proteggevano gli operatori dalle scariche dei fulmini'],
        answer: 0,
        why: 'Dopo molti chilometri la corrente arriva debole, ma basta a muovere il contatto di un relè, che lancia un impulso nuovo con una pila locale. Il nome viene dal francese relais, la stazione dove si cambiavano i cavalli.',
      },
      {
        id: 'eb-32', level: 3, topic: 'Logica a relè', chapter: 'rele', type: 'logic',
        q: 'Logica a relè: i contatti normalmente aperti dei relè A e B sono in parallelo; in serie a loro c\'è il contatto normalmente chiuso del relè C. Imposta i relè (1 = bobina alimentata) per accendere la lampada.',
        expr: 'AND(OR(A,B),NOT(C))', target: 1,
        why: 'I contatti in parallelo fanno da OR, quelli in serie da AND; il contatto normalmente chiuso si apre quando C è alimentato, quindi fa da NOT. Serve A o B alimentato, con C a riposo.',
      },

      // ------------------------------------------------------------ alternata
      {
        id: 'eb-33', level: 1, topic: 'Frequenza di rete', chapter: 'alternata', type: 'choice',
        q: 'Il grafico in figura mostra la tensione di una presa di casa in Italia. Quante volte al secondo si ripete un ciclo completo?',
        figure: { kind: 'wave', shape: 'sine', cycles: 3 },
        options: ['50 volte', '60 volte', '100 volte', '230 volte'],
        answer: 0,
        why: 'In Europa la rete è a 50 Hz: 50 cicli completi al secondo, e in ogni ciclo la corrente cambia verso due volte. Negli Stati Uniti si usano 60 Hz; 230 V è invece il valore efficace della tensione.',
      },
      {
        id: 'eb-34', level: 2, topic: 'Tensioni di tutti i giorni', chapter: 'alternata', type: 'match',
        q: 'Abbina ogni sorgente alla tensione che fornisce.',
        pairs: [
          ['Presa di casa in Italia', '230 V alternata, 50 Hz'],
          ['Presa di casa negli Stati Uniti', '120 V alternata, 60 Hz'],
          ['Batteria dell\'auto', '12 V continua'],
          ['Porta USB', '5 V continua'],
          ['Pila stilo (AA)', '1,5 V continua'],
        ],
        why: 'Le reti elettriche sono alternate: 230 V a 50 Hz in Europa, 120 V a 60 Hz negli Stati Uniti. Pile, batterie e porte USB danno tensione continua: 1,5 V, 12 V e 5 V.',
      },
      {
        id: 'eb-35', level: 2, topic: 'Guerra delle correnti', chapter: 'alternata', type: 'choice',
        q: 'Alla fine dell\'Ottocento, nella "guerra delle correnti", perché la corrente alternata vinse su quella continua?',
        options: ['La sua tensione si alza e si abbassa con un trasformatore', 'A parità di tensione è molto meno pericolosa per le persone', 'Si può accumulare direttamente nelle batterie', 'Scorre nei cavi senza scaldarli, qualunque sia la corrente'],
        answer: 0,
        why: 'Il trasformatore alza la tensione per il trasporto, così la corrente e le perdite nei cavi calano, e la riabbassa vicino alle case. Edison difendeva la continua; Tesla e Westinghouse l\'alternata, resa pratica anche dal campo magnetico rotante di Galileo Ferraris.',
      },
      {
        id: 'eb-36', level: 2, topic: 'Dalla centrale a casa', chapter: 'alternata', type: 'order',
        q: 'Metti in ordine il viaggio dell\'energia elettrica, dalla centrale fino alla presa di casa.',
        items: ['Generatore della centrale', 'Trasformatore che alza la tensione', 'Linea ad alta tensione', 'Trasformatore che abbassa la tensione', 'Presa di casa a 230 V'],
        ends: ['Centrale', 'Casa'],
        why: 'Il generatore produce corrente alternata; un trasformatore alza la tensione a centinaia di migliaia di volt per ridurre le perdite sulle linee; vicino alle città altri trasformatori la abbassano fino ai 230 V delle prese.',
      },

      // ------------------------------------------------------------ misure
      {
        id: 'eb-37', level: 1, topic: 'Strumenti', chapter: 'misure', type: 'match',
        q: 'Abbina ogni strumento a ciò che misura o mostra.',
        pairs: [
          ['Voltmetro', 'La tensione tra due punti'],
          ['Amperometro', 'La corrente in un ramo'],
          ['Ohmmetro', 'La resistenza di un componente'],
          ['Oscilloscopio', 'Come varia una tensione nel tempo'],
        ],
        why: 'Il multimetro riunisce voltmetro, amperometro e ohmmetro in un solo strumento; l\'oscilloscopio disegna su uno schermo l\'andamento di una tensione nel tempo, per esempio una sinusoide.',
      },
      {
        id: 'eb-38', level: 2, topic: 'Amperometro', chapter: 'misure', type: 'truefalse',
        q: 'Lo strumento del simbolo in figura si collega in parallelo al componente da misurare.',
        figure: { kind: 'symbol', name: 'ammeter' },
        answer: false,
        why: 'Il cerchio con la A è l\'amperometro: va inserito in serie, aprendo il circuito, perché deve essere attraversato dalla stessa corrente del componente. In parallelo si collega il voltmetro.',
      },
      {
        id: 'eb-39', level: 2, topic: 'Partitore di tensione', chapter: 'misure', type: 'number',
        q: 'Un voltmetro collegato all\'uscita Vout del partitore in figura, cioè ai capi di R2, che tensione indica, in V?',
        figure: { kind: 'circuit', topo: 'divider', vin: '12 V', r1: '10 kΩ', r2: '20 kΩ' },
        value: 8, unit: 'V', tolerance: 0.1,
        why: 'La corrente è I = 12 V / 30 kΩ = 0,4 mA, quindi su R2 ci sono 0,4 mA × 20 kΩ = 8 V. In breve: Vout = Vin × R2 / (R1 + R2) = 12 × 20 / 30 = 8 V.',
      },
      {
        id: 'eb-40', level: 3, topic: 'Tolleranza', chapter: 'misure', type: 'choice',
        q: 'Misuri con l\'ohmmetro il resistore in figura, staccato dal circuito. Entro quale intervallo deve stare la lettura perché il resistore rispetti la sua tolleranza?',
        figure: { kind: 'resistor', bands: ['marrone', 'nero', 'arancione', 'oro'] },
        options: ['Da 9,5 a 10,5 kΩ', 'Da 9 a 11 kΩ', 'Da 9,9 a 10,1 kΩ', 'Da 0,95 a 1,05 kΩ'],
        answer: 0,
        why: 'Marrone 1, nero 0, arancione moltiplica per 1000: 10 kΩ; l\'oro indica ±5%, cioè ±0,5 kΩ, quindi la lettura deve stare tra 9,5 e 10,5 kΩ. Si misura a circuito spento, perché l\'ohmmetro usa la sua pila interna.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
