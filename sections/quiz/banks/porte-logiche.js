/*
 * Banca domande del quiz: sezione 4, Porte logiche e chip.
 * Dall'algebra di Boole alle porte logiche, dai relè al transistor, le famiglie
 * logiche, il circuito integrato, come si fabbrica un chip, che cosa c'è dentro
 * e la legge di Moore. Gli id dei capitoli sono le ancore delle pagine della
 * sezione: non vanno cambiati.
 */
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'porte-logiche',
    number: 4,
    title: 'Porte logiche e chip',
    subtitle: 'Dalla logica di Boole al circuito integrato',
    chapters: [
      { id: 'boole', title: 'Boole e la logica' },
      { id: 'porte', title: 'Le porte logiche' },
      { id: 'calcolo', title: 'Calcolare con le porte' },
      { id: 'interruttori', title: 'Relè, valvole e transistor' },
      { id: 'famiglie', title: 'Famiglie logiche' },
      { id: 'integrato', title: 'Il circuito integrato' },
      { id: 'fabbrica', title: 'Come si fabbrica un chip' },
      { id: 'struttura', title: 'Dentro il chip' },
      { id: 'moore', title: 'La legge di Moore' },
    ],
    questions: [
      // ------------------------------------------------------------ Boole e la logica
      {
        id: 'pl-01', level: 1, topic: 'Pionieri della logica', chapter: 'boole', type: 'match',
        q: 'Abbina ogni personaggio al suo contributo.',
        pairs: [
          ['George Boole', 'Le leggi del pensiero (1854)'],
          ['Augustus De Morgan', 'Le leggi sulla negazione di AND e OR'],
          ['Claude Shannon', 'La logica nei circuiti a relè (1937)'],
          ['Konrad Zuse', 'Il calcolatore a relè Z3 (1941)'],
        ],
        why: 'Boole trasformò la logica in algebra e il suo contemporaneo De Morgan formulò le leggi che legano NOT, AND e OR. Shannon, nella tesi del 1937, applicò l\'algebra di Boole ai circuiti a relè; Zuse costruì a Berlino lo Z3, uno dei primi calcolatori programmabili.',
      },
      {
        id: 'pl-02', level: 1, topic: 'Interruttori in parallelo', chapter: 'boole', type: 'logic',
        q: 'Nel circuito in figura gli interruttori A e B sono collegati in parallelo (1 = chiuso). Imposta gli interruttori per accendere la lampada.',
        figure: { kind: 'circuit', topo: 'switches-parallel' },
        expr: 'OR(A,B)', target: 1,
        why: 'In parallelo la corrente ha due strade: basta un interruttore chiuso perché la lampada si accenda. È la funzione OR, che vale 0 solo quando A e B sono entrambi aperti.',
      },
      {
        id: 'pl-03', level: 1, topic: 'Interruttori in serie', chapter: 'boole', type: 'truth',
        q: 'Completa la tabella di verità del circuito in figura. Per A e B, 1 vuol dire interruttore chiuso; per l\'uscita Y, 1 vuol dire lampada accesa.',
        figure: { kind: 'circuit', topo: 'switches-series' },
        expr: 'AND(A,B)',
        why: 'Gli interruttori sono in serie: la corrente deve attraversarli entrambi, quindi la lampada si accende solo con A e B chiusi. È la funzione AND; due interruttori in parallelo fanno invece un OR.',
      },
      {
        id: 'pl-04', level: 2, topic: 'Algebra di Boole', chapter: 'boole', type: 'choice',
        q: 'Nell\'algebra di Boole il punto (·) indica AND e il più (+) indica OR. Quale espressione descrive il circuito in figura?',
        figure: { kind: 'logic', expr: 'AND(A,OR(B,C))' },
        options: ['A · (B + C)', 'A + (B · C)', '(A · B) + C', 'A · B · C'],
        answer: 0,
        why: 'B e C entrano in una porta OR, che dà B + C; la sua uscita entra con A in una porta AND: A · (B + C). Con gli interruttori è un contatto A in serie a due contatti B e C messi in parallelo.',
      },
      {
        id: 'pl-05', level: 1, topic: 'Semplificare con Boole', chapter: 'boole', type: 'truth',
        q: 'Il circuito calcola A OR (A AND B). Completa la sua tabella di verità: scoprirai che si può semplificare.',
        expr: 'OR(A,AND(A,B))',
        why: 'L\'uscita è uguale ad A, qualunque valore abbia B: è la legge di assorbimento, A + A · B = A. Con semplificazioni come questa Shannon mostrò come togliere contatti inutili dai circuiti a relè.',
      },

      // ------------------------------------------------------------ Le porte logiche
      {
        id: 'pl-06', level: 1, topic: 'Simboli delle porte', chapter: 'porte', type: 'choice',
        q: 'Quale porta logica rappresenta questo simbolo?',
        figure: { kind: 'gate', gate: 'NAND' },
        options: ['NAND', 'AND', 'NOR', 'NOT'],
        answer: 0,
        why: 'Il corpo a forma di D è quello della porta AND; il cerchietto sull\'uscita indica la negazione: è una NAND, cioè NOT AND. La NOR ha il corpo a punta della OR, la NOT è un triangolo con un solo ingresso.',
      },
      {
        id: 'pl-07', level: 2, topic: 'Porta XNOR', chapter: 'porte', type: 'truefalse',
        q: 'La porta logica di questo simbolo dà 1 in uscita quando i suoi due ingressi sono uguali.',
        figure: { kind: 'gate', gate: 'XNOR' },
        answer: true,
        why: 'Il secondo arco sul retro indica una porta XOR e il cerchietto la negazione: è una XNOR. La XOR dà 1 quando gli ingressi sono diversi, la XNOR quando sono uguali (00 e 11): per questo serve a confrontare due bit.',
      },
      {
        id: 'pl-08', level: 2, topic: 'Leggi di De Morgan', chapter: 'porte', type: 'truth',
        q: 'Ciascun ingresso passa da una porta NOT, poi le due uscite entrano in una porta OR. Completa la tabella di verità del circuito.',
        expr: 'OR(NOT(A),NOT(B))',
        why: 'L\'uscita vale 0 solo con A = B = 1: è la tabella della NAND. È una legge di De Morgan, NOT (A AND B) = (NOT A) OR (NOT B): per questo una NAND si può disegnare anche come una OR con gli ingressi negati.',
      },
      {
        id: 'pl-09', level: 2, topic: 'NOR e De Morgan', chapter: 'porte', type: 'logic',
        q: 'Gli ingressi A e B passano ciascuno da una porta NOT, poi entrano in una porta NOR. Imposta gli ingressi per accendere il LED.',
        expr: 'NOR(NOT(A),NOT(B))', target: 1,
        why: 'La NOR dà 1 solo se i suoi due ingressi valgono 0, cioè se NOT A = 0 e NOT B = 0: serve A = B = 1. È l\'altra legge di De Morgan, NOT (A OR B) = (NOT A) AND (NOT B): una NOR con gli ingressi negati fa da AND.',
      },
      {
        id: 'pl-10', level: 3, topic: 'XOR e maschere', chapter: 'porte', type: 'bits',
        q: 'Otto porte XOR combinano, bit per bit, il byte del registro in figura con la maschera 0000 1111 (0F in esadecimale). Accendi i bit delle otto uscite.',
        figure: { kind: 'bits', value: 165, width: 8 },
        width: 8, value: 170,
        why: 'Una XOR con 0 lascia passare il bit, con 1 lo inverte. Il registro contiene 1010 0101 (A5): la metà alta resta 1010, quella bassa 0101 diventa 1010. Il risultato è 1010 1010, cioè AA in esadecimale (170).',
      },

      // ------------------------------------------------------------ Calcolare con le porte
      {
        id: 'pl-11', level: 1, topic: 'Semisommatore', chapter: 'calcolo', type: 'truth',
        q: 'Il semisommatore somma due bit, A e B. Completa la tabella della cifra della somma S, che esce da una porta XOR.',
        expr: 'XOR(A,B)',
        why: '0 + 0 = 0, 0 + 1 = 1 e 1 + 0 = 1, ma 1 + 1 = 10 in binario: la cifra della somma è 0 e c\'è un riporto. Per questo S esce da una porta XOR, mentre il riporto esce da una porta AND.',
      },
      {
        id: 'pl-12', level: 1, topic: 'Contatore binario', chapter: 'calcolo', type: 'bits',
        q: 'Il contatore binario a 4 bit in figura riceve un altro impulso di clock e aumenta di 1. Accendi i bit che mostra ora.',
        figure: { kind: 'bits', value: 7, width: 4 },
        width: 4, value: 8,
        why: 'In figura c\'è 0111, cioè 7; ora il contatore mostra 8 = 1000. Sommando 1, i tre bit a 1 tornano a 0 e il riporto accende il bit di peso 8, come un contachilometri che passa da 0999 a 1000.',
      },
      {
        id: 'pl-13', level: 3, topic: 'Sommatore completo', chapter: 'calcolo', type: 'truth',
        q: 'Il sommatore completo somma tre bit: A, B e il riporto in arrivo C. Completa la tabella del riporto in uscita.',
        expr: 'OR(AND(A,B),AND(A,C),AND(B,C))',
        why: 'Il riporto vale 1 quando la somma dei tre bit è 2 o 3 (10 o 11 in binario), cioè quando almeno due bit sono a 1: il circuito controlla le tre coppie con tre AND e le unisce con una OR. Per esempio 1 + 1 + 1 = 11 dà somma 1 e riporto 1.',
      },
      {
        id: 'pl-14', level: 2, topic: 'Latch SR', chapter: 'calcolo', type: 'choice',
        q: 'Un latch SR è fatto con due porte come quella in figura, collegate a incrocio: l\'uscita di ciascuna entra nell\'altra. Dopo un impulso su S (set), S e R tornano entrambi a 0. Che cosa fa l\'uscita Q?',
        figure: { kind: 'gate', gate: 'NOR' },
        options: ['Resta a 1: il latch ricorda l\'impulso', 'Torna a 0, perché S non vale più 1', 'Oscilla tra 0 e 1 finché non arriva R', 'Si porta al valore di R, cioè a 0'],
        answer: 0,
        why: 'Le due NOR si tengono a vicenda: con S = R = 0 il latch conserva lo stato in cui si trova. Un impulso su S mette l\'uscita a 1, uno su R la rimette a 0: è la cella di memoria più semplice, un bit che resta finché serve.',
      },
      {
        id: 'pl-15', level: 3, topic: 'Registro a scorrimento', chapter: 'calcolo', type: 'bits',
        q: 'Un registro a scorrimento legge il segnale DATA in figura a ogni fronte di discesa di CLK, e il primo bit letto finisce nella posizione più pesante. Accendi gli 8 bit del byte ricevuto.',
        figure: { kind: 'wave', shape: 'clock-data' },
        width: 8, value: 178,
        why: 'A ogni fronte di discesa DATA è stabile e vale, in ordine, 1, 0, 1, 1, 0, 0, 1, 0: il byte è 1011 0010, cioè 178 (B2 in esadecimale). Il registro è una fila di flip-flop D: a ogni fronte ogni bit passa al flip-flop vicino ed entra quello nuovo.',
      },

      // ------------------------------------------------------------ Relè, valvole e transistor
      {
        id: 'pl-16', level: 1, topic: 'Linea del tempo', chapter: 'interruttori', type: 'order',
        q: 'Metti in ordine cronologico questi calcolatori, dal più antico al più recente.',
        items: ['Z3 di Konrad Zuse', 'Colossus', 'ENIAC', 'TRADIC dei Bell Labs'],
        ends: ['Più antico', 'Più recente'],
        why: 'Z3 (1941, a relè), Colossus (1943-44, a valvole), ENIAC (1945-46, circa 18 000 valvole), TRADIC (1954, a transistor): in poco più di dieci anni l\'interruttore dei calcolatori passò dal relè alla valvola e poi al transistor.',
      },
      {
        id: 'pl-17', level: 1, topic: 'Relè', chapter: 'interruttori', type: 'choice',
        q: 'Il componente di questo simbolo fu l\'interruttore dei primi calcolatori, come lo Z3 di Zuse. Perché fu presto superato dalle valvole?',
        figure: { kind: 'symbol', name: 'relay' },
        options: ['Deve muovere un contatto, quindi commuta lentamente', 'Funziona solo con la corrente alternata della rete', 'Ha bisogno di un filamento caldo per funzionare', 'Non riesce a restare chiuso per più di un secondo'],
        answer: 0,
        why: 'È un relè: un elettromagnete sposta un contatto metallico e ogni scatto richiede qualche millesimo di secondo. Le valvole commutano in milionesimi di secondo; poi i transistor superarono anche le valvole, perché erano più piccoli, freddi e affidabili.',
      },
      {
        id: 'pl-18', level: 2, topic: 'Logica a relè', chapter: 'interruttori', type: 'logic',
        q: 'In un calcolatore a relè la lampada è alimentata attraverso il contatto normalmente aperto del relè A, in serie con il contatto normalmente chiuso del relè B. Imposta i relè (1 = bobina alimentata) per accendere la lampada.',
        expr: 'AND(A,NOT(B))', target: 1,
        why: 'Il contatto normalmente aperto di A si chiude quando la sua bobina è alimentata; quello normalmente chiuso di B si apre quando lo è la bobina di B, quindi fa da NOT. In serie formano un AND: serve A = 1 e B = 0.',
      },
      {
        id: 'pl-19', level: 1, topic: 'Zuse Z3', chapter: 'interruttori', type: 'bits',
        q: 'Lo Z3 di Konrad Zuse lavorava in binario: nella sua memoria ogni bit era un relè, eccitato per 1 e a riposo per 0. Accendi i bit per memorizzare il numero 13.',
        width: 4, value: 13,
        why: '13 = 8 + 4 + 1, quindi 1101. Un relè ha due soli stati, e anche per questo Zuse scelse il binario; l\'ENIAC, a valvole, contava invece in decimale, con un anello di dieci elementi per ogni cifra.',
      },

      // ------------------------------------------------------------ Famiglie logiche
      {
        id: 'pl-20', level: 2, topic: 'Famiglie logiche', chapter: 'famiglie', type: 'match',
        q: 'Abbina ogni famiglia logica alla sua caratteristica.',
        pairs: [
          ['RTL', 'Resistori agli ingressi dei transistor'],
          ['DTL', 'Diodi agli ingressi, transistor in uscita'],
          ['TTL', 'La serie 7400 di Texas Instruments, a 5 V'],
          ['ECL', 'Velocissima, ma consuma molta corrente'],
          ['CMOS', 'Consuma quasi solo quando commuta'],
        ],
        why: 'RTL e DTL furono le prime famiglie integrate; la TTL della serie 7400 divenne lo standard a 5 V. La ECL non porta mai i transistor in saturazione ed è la più veloce, ma scalda molto; la CMOS usa coppie di MOSFET complementari e consuma quasi solo quando commuta.',
      },
      {
        id: 'pl-21', level: 2, topic: 'Livelli logici TTL', chapter: 'famiglie', type: 'bits',
        q: 'Quattro uscite di un chip TTL, dal bit più pesante al più leggero, misurano 3,4 V, 0,2 V, 3,5 V e 3,3 V. Accendi i bit corrispondenti.',
        width: 4, value: 11,
        why: 'Nella TTL, alimentata a 5 V, una tensione sotto 0,8 V vale 0 e una sopra 2 V vale 1; in mezzo il livello non è garantito. Quindi 3,4 V, 3,5 V e 3,3 V sono 1 e 0,2 V è 0: 1011, cioè 11.',
      },
      {
        id: 'pl-22', level: 2, topic: 'Fan-out', chapter: 'famiglie', type: 'number',
        q: 'Un\'uscita TTL standard a livello basso assorbe al massimo 16 mA, e ogni ingresso TTL collegato le manda 1,6 mA. Quanti ingressi può pilotare al massimo, cioè qual è il suo fan-out?',
        value: 10, unit: 'ingressi', tolerance: 0,
        why: 'Fan-out = 16 mA / 1,6 mA = 10: un\'uscita TTL standard pilota fino a 10 ingressi. Collegandone di più, la tensione dello 0 salirebbe oltre il limite e il segnale non sarebbe più affidabile.',
      },
      {
        id: 'pl-23', level: 3, topic: 'Porte NOR universali', chapter: 'famiglie', type: 'logic',
        q: 'Il computer di bordo delle missioni Apollo aveva la logica fatta solo di porte NOR. Qui due NOR ricevono A, B e C, D, e le loro uscite entrano in una terza NOR. Imposta gli ingressi per accendere il LED.',
        expr: 'NOR(NOR(A,B),NOR(C,D))', target: 1,
        why: 'Una NOR dà 1 solo se tutti i suoi ingressi sono 0. L\'ultima dà 1 quindi quando le prime due danno 0, cioè con almeno un 1 tra A e B e almeno un 1 tra C e D: (A OR B) AND (C OR D). Come la NAND, la NOR basta da sola per costruire qualsiasi circuito.',
      },
      {
        id: 'pl-24', level: 2, topic: 'Porte NAND universali', chapter: 'famiglie', type: 'logic',
        q: 'Con tre delle quattro porte NAND di un chip 7400 si costruisce un circuito: due NAND ricevono A, B e C, D, e le loro uscite entrano nella terza. Imposta gli ingressi per accendere il LED.',
        expr: 'NAND(NAND(A,B),NAND(C,D))', target: 1,
        why: 'Una NAND dà 0 solo se entrambi gli ingressi sono 1, e l\'ultima dà 1 se almeno una delle prime due dà 0. Il LED si accende con A = B = 1 oppure con C = D = 1: NAND seguite da una NAND fanno il lavoro di AND seguite da una OR.',
      },

      // ------------------------------------------------------------ Il circuito integrato
      {
        id: 'pl-25', level: 1, topic: 'Tirannia dei numeri', chapter: 'integrato', type: 'choice',
        q: 'Alla fine degli anni Cinquanta gli ingegneri parlavano di "tirannia dei numeri". Quale problema indicavano?',
        options: ['Troppi componenti da collegare e saldare a mano', 'Troppi bit per rappresentare i numeri grandi', 'Troppi brevetti da pagare per ogni circuito', 'Troppi calcoli per progettare ogni circuito'],
        answer: 0,
        why: 'Un calcolatore a transistor richiedeva decine di migliaia di componenti e di saldature fatte a mano: più collegamenti volevano dire più guasti e più costi. Il circuito integrato risolse il problema realizzando componenti e collegamenti insieme, nello stesso pezzo di semiconduttore.',
      },
      {
        id: 'pl-26', level: 1, topic: 'Jack Kilby', chapter: 'integrato', type: 'truefalse',
        q: 'Il primo circuito integrato, costruito da Jack Kilby alla Texas Instruments nel 1958, era fatto di silicio.',
        answer: false,
        why: 'Kilby usò una piastrina di germanio e collegò i componenti con fili d\'oro saldati a mano. Nel 1959 Robert Noyce, alla Fairchild, propose l\'integrato in silicio: grazie al processo planare di Jean Hoerni, i collegamenti si depositavano direttamente sopra il chip.',
      },
      {
        id: 'pl-27', level: 3, topic: 'Linea del tempo', chapter: 'integrato', type: 'order',
        q: 'Metti in ordine cronologico queste tappe della storia del circuito integrato.',
        items: ['Geoffrey Dummer descrive un circuito in un unico blocco', 'Jack Kilby costruisce il primo circuito integrato', 'Robert Noyce propone l\'integrato planare in silicio', 'Gordon Moore pubblica la sua previsione', 'Intel presenta il microprocessore 4004'],
        ends: ['Più antica', 'Più recente'],
        why: 'Dummer espose l\'idea nel 1952; Kilby costruì il primo integrato nel 1958 e Noyce propose quello planare nel 1959; Moore pubblicò la sua previsione nel 1965 e il 4004, con circa 2300 transistor, arrivò nel 1971.',
      },
      {
        id: 'pl-28', level: 2, topic: 'Scale di integrazione', chapter: 'integrato', type: 'choice',
        q: 'A quale scala di integrazione appartiene il chip in figura?',
        figure: { kind: 'chip', pins: 16, label: '74161', note: 'contatore a 4 bit' },
        options: ['MSI', 'SSI', 'LSI', 'VLSI'],
        answer: 0,
        why: 'Un contatore a 4 bit contiene alcune decine di porte: è un tipico chip MSI, a media scala di integrazione. Il 7400, con quattro porte, è SSI; il microprocessore 4004, con circa 2300 transistor, è LSI; i processori di oggi sono VLSI.',
      },

      // ------------------------------------------------------------ Come si fabbrica un chip
      {
        id: 'pl-29', level: 1, topic: 'Dalla sabbia al chip', chapter: 'fabbrica', type: 'order',
        q: 'Metti in ordine le tappe che portano dalla sabbia a un chip finito.',
        items: ['Purificazione del silicio ricavato dalla sabbia', 'Crescita del lingotto con il metodo Czochralski', 'Taglio del lingotto in wafer sottili', 'Fotolitografia e drogaggio, strato dopo strato', 'Separazione dei chip e montaggio nel package'],
        ends: ['Primo passo', 'Ultimo passo'],
        why: 'Il quarzo della sabbia diventa silicio purissimo; dal silicio fuso si tira su un lingotto monocristallino, che si taglia in wafer. Fotolitografia e drogaggio ripetuti costruiscono i circuiti; infine i chip buoni si separano e si chiudono nel package.',
      },
      {
        id: 'pl-30', level: 1, topic: 'Parole della fabbrica', chapter: 'fabbrica', type: 'match',
        q: 'Abbina ogni termine della fabbrica di chip al suo significato.',
        pairs: [
          ['Wafer', 'Disco sottile tagliato dal lingotto'],
          ['Maschera', 'Lastra con il disegno di uno strato'],
          ['Drogaggio', 'Aggiunta di atomi come boro o fosforo'],
          ['Camera bianca', 'Ambiente con l\'aria quasi senza polvere'],
          ['Resa', 'Percentuale di chip che funzionano'],
        ],
        why: 'La fotolitografia proietta sul wafer il disegno di una maschera per ogni strato; il drogaggio con boro o fosforo crea le zone P e N dei transistor. Tutto avviene in camera bianca, perché un granello di polvere può rovinare un chip e abbassare la resa.',
      },
      {
        id: 'pl-31', level: 2, topic: 'Resa e costo', chapter: 'fabbrica', type: 'number',
        q: 'Un wafer lavorato costa 6000 € e contiene 500 chip, ma la resa è dell\'80%: gli altri sono difettosi. Quanto costa ogni chip funzionante, in euro?',
        value: 15, unit: '€', tolerance: 0.1,
        why: 'I chip buoni sono 500 × 0,8 = 400, quindi ognuno costa 6000 € / 400 = 15 €. Con una resa del 50% salirebbe a 24 €: per questo i chip molto grandi, più esposti ai difetti, oggi spesso si dividono in chiplet.',
      },
      {
        id: 'pl-32', level: 3, topic: 'Litografia EUV', chapter: 'fabbrica', type: 'choice',
        q: 'Per i chip più avanzati la fotolitografia usa luce ultravioletta estrema (EUV), con lunghezza d\'onda di 13,5 nm invece dei 193 nm usati prima. Perché?',
        options: ['Una lunghezza d\'onda più corta disegna dettagli più piccoli', 'La luce più energetica accelera il drogaggio del silicio', 'Attraversa le maschere di vetro senza esserne assorbita', 'Permette di lavorare anche fuori dalla camera bianca'],
        answer: 0,
        why: 'Come un pennello più fine, una lunghezza d\'onda più corta traccia linee più sottili. La luce EUV però viene assorbita da quasi tutto, anche dall\'aria: le macchine, costruite dall\'olandese ASML, lavorano nel vuoto e usano specchi al posto delle lenti.',
      },

      // ------------------------------------------------------------ Dentro il chip
      {
        id: 'pl-33', level: 1, topic: 'Package e piedini', chapter: 'struttura', type: 'choice',
        q: 'Il 7400 in figura contiene quattro porte NAND a due ingressi. Come sono usati i suoi piedini?',
        figure: { kind: 'chip', pins: 14, label: '7400', note: 'TTL' },
        options: ['8 ingressi e 4 uscite, più alimentazione e massa', '8 ingressi e 4 uscite, più 2 piedini di riserva', '8 ingressi e 4 uscite, più 2 ingressi di clock', '7 ingressi e 7 uscite, divisi sui due lati'],
        answer: 0,
        why: 'Ogni NAND ha 2 ingressi e 1 uscita: 4 × 3 = 12 piedini, più +5 V sul piedino 14 e massa sul 7. Dentro il package c\'è il die di silicio: i suoi transistor sono collegati da strati di metallo e fili sottilissimi lo uniscono ai piedini.',
      },
      {
        id: 'pl-34', level: 2, topic: 'MOSFET nei chip CMOS', chapter: 'struttura', type: 'choice',
        q: 'Nelle porte CMOS i transistor come quello di questo simbolo collegano l\'uscita a massa. Di che tipo è e quando conduce?',
        figure: { kind: 'symbol', name: 'nmos' },
        options: ['MOSFET a canale N: conduce con il gate a 1', 'MOSFET a canale P: conduce con il gate a 0', 'MOSFET a canale N: conduce con il gate a 0', 'MOSFET a canale P: conduce con il gate a 1'],
        answer: 0,
        why: 'La freccia punta verso il canale: è un nMOS, che conduce quando il gate è a 1. Il pMOS, con la freccia verso l\'esterno, conduce con il gate a 0 e collega l\'uscita all\'alimentazione: a ingressi fermi uno dei due è sempre spento, per questo la CMOS consuma pochissimo.',
      },
      {
        id: 'pl-35', level: 2, topic: 'FinFET e GAA', chapter: 'struttura', type: 'truefalse',
        q: 'Nei transistor FinFET il canale è una sottile pinna verticale, e il gate la avvolge su tre lati invece di stare solo sopra di essa.',
        answer: true,
        why: 'Quando i transistor planari scesero a poche decine di nanometri, il gate non riusciva più a chiudere bene il canale e passava corrente anche a transistor spento. Il FinFET, usato per primo da Intel nei chip da 22 nm, avvolge la pinna su tre lati; il GAA (gate-all-around) circonda tutto il canale.',
      },
      {
        id: 'pl-36', level: 2, topic: 'Porte CMOS', chapter: 'struttura', type: 'logic',
        q: 'In una porta CMOS due pMOS in serie collegano l\'uscita all\'alimentazione e due nMOS in parallelo la collegano a massa. Un nMOS conduce con il gate a 1, un pMOS con il gate a 0. Imposta A e B per spegnere il LED (uscita 0).',
        expr: 'NOR(A,B)', target: 0,
        why: 'Basta un ingresso a 1: il suo nMOS collega l\'uscita a massa e il suo pMOS si spegne, interrompendo la serie verso l\'alimentazione. È una NOR fatta con 4 transistor; la NAND usa lo schema opposto, con gli nMOS in serie e i pMOS in parallelo.',
      },

      // ------------------------------------------------------------ La legge di Moore
      {
        id: 'pl-37', level: 1, topic: 'Gordon Moore', chapter: 'moore', type: 'choice',
        q: 'Nel 1965 Gordon Moore, che tre anni dopo avrebbe fondato Intel con Robert Noyce, fece una previsione sui circuiti integrati. Quale?',
        options: ['I componenti per chip sarebbero raddoppiati ogni anno', 'La frequenza dei chip sarebbe raddoppiata ogni anno', 'La tensione dei chip si sarebbe dimezzata ogni anno', 'Le dimensioni dei chip sarebbero raddoppiate ogni anno'],
        answer: 0,
        why: 'Nell\'articolo del 1965 Moore notò che i componenti per chip raddoppiavano circa ogni anno e previde che il ritmo sarebbe durato almeno dieci anni. Nel 1975 lo corresse in un raddoppio ogni due anni circa: è la "legge di Moore".',
      },
      {
        id: 'pl-38', level: 3, topic: 'Raddoppi di Moore', chapter: 'moore', type: 'choice',
        q: 'Il chip in figura aveva circa 2300 transistor. Se il numero di transistor per chip raddoppia ogni 2 anni, quanti ne avrà circa un chip del 1991?',
        figure: { kind: 'chip', pins: 16, label: 'Intel 4004', note: '1971' },
        options: ['Circa 2,4 milioni', 'Circa 46 000', 'Circa 23 000', 'Circa 2,4 miliardi'],
        answer: 0,
        why: 'Dal 1971 al 1991 ci sono 10 raddoppi: 2300 × 2¹⁰ = 2300 × 1024 ≈ 2,4 milioni. È l\'ordine di grandezza dei processori di quegli anni: l\'Intel 486 del 1989 aveva circa 1,2 milioni di transistor, il Pentium del 1993 circa 3,1 milioni.',
      },
      {
        id: 'pl-39', level: 2, topic: 'Nodi in nanometri', chapter: 'moore', type: 'truefalse',
        q: 'In un chip prodotto con il processo "da 5 nm", il gate dei transistor è lungo 5 nm.',
        answer: false,
        why: 'Un tempo il nome del nodo corrispondeva davvero a una misura del transistor; da molti anni è solo un\'etichetta della generazione tecnologica. Nei chip "da 5 nm" il gate è lungo diverse volte di più e due gate vicini distano alcune decine di nanometri.',
      },
      {
        id: 'pl-40', level: 3, topic: 'Scaling di Dennard', chapter: 'moore', type: 'choice',
        q: 'Fino ai primi anni Duemila, rimpicciolendo i transistor si poteva alzare la frequenza senza aumentare il calore per millimetro quadrato (scaling di Dennard). Perché poi la frequenza dei processori si è fermata a pochi GHz?',
        options: ['La tensione non scendeva più e le perdite crescevano', 'I transistor non si riuscivano più a rimpicciolire', 'I programmi non potevano sfruttare un clock più veloce', 'Il silicio smetteva di condurre bene sopra i 5 GHz'],
        answer: 0,
        why: 'Lo scaling di Dennard (1974) funzionava perché tensione e corrente calavano con le dimensioni. Verso il 2005 la tensione non poteva più scendere e le correnti di perdita crescevano: il calore diventava eccessivo. Da allora si aggiungono core e, oggi, si uniscono più chiplet nello stesso package.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
