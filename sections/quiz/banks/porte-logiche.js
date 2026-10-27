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
    subtitle: 'Dall\'algebra di Boole ai chip con miliardi di transistor',
    chapters: [
      { id: 'boole', title: 'La logica prima dei circuiti' },
      { id: 'porte', title: 'Le porte logiche' },
      { id: 'calcolo', title: 'Porte che contano e ricordano' },
      { id: 'interruttori', title: 'Relè, valvole, transistor' },
      { id: 'famiglie', title: 'Le famiglie logiche' },
      { id: 'integrato', title: 'Nasce il circuito integrato' },
      { id: 'fabbrica', title: 'Come si fabbrica un chip' },
      { id: 'struttura', title: 'Dentro il chip' },
      { id: 'moore', title: 'La legge di Moore e il futuro' },
    ],
    questions: [
      // ------------------------------------------------------------ La logica prima dei circuiti
      {
        id: 'pl-01', level: 1, topic: 'Pionieri della logica', chapter: 'boole', type: 'match',
        q: 'Abbina ogni personaggio al suo contributo.',
        pairs: [
          ['George Boole', 'Le leggi del pensiero (1854)'],
          ['Augustus De Morgan', 'Le leggi sulla negazione di AND e OR'],
          ['Henry M. Sheffer', 'Basta un solo operatore logico (1913)'],
          ['Claude Shannon', 'Interruttori in serie e in parallelo (1937)'],
        ],
        why: 'Boole trasformò la logica in algebra e il suo amico De Morgan formulò le leggi che legano NOT, AND e OR. Sheffer dimostrò nel 1913 che basta un solo operatore: il suo «tratto» oggi indica la NAND. Shannon, nella tesi del 1937, mostrò che interruttori in serie e in parallelo calcolano AND e OR.',
      },
      {
        id: 'pl-02', level: 1, topic: 'Interruttori in parallelo', chapter: 'boole', type: 'truth',
        q: 'Completa la tabella di verità del circuito in figura, con gli interruttori A e B collegati in parallelo. Per A e B, 1 vuol dire interruttore chiuso; per l\'uscita Y, 1 vuol dire lampada accesa.',
        figure: { kind: 'circuit', topo: 'switches-parallel' },
        expr: 'OR(A,B)',
        why: 'In parallelo la corrente ha due strade: basta un interruttore chiuso perché la lampada si accenda. È la funzione OR, che vale 0 solo quando A e B sono entrambi aperti. In serie, invece, servirebbero chiusi tutti e due: è la funzione AND.',
      },
      {
        id: 'pl-03', level: 3, topic: 'Perché il binario', chapter: 'boole', type: 'number',
        q: 'Su un filo il segnale può avere dieci livelli di tensione equidistanti, da 0 a 5 V, e il ricevitore sceglie il livello più vicino alla tensione che misura. Quanto deve essere grande, almeno, un disturbo per fargli scambiare un livello con quello accanto? Rispondi in volt.',
        value: 0.28, unit: 'V', tolerance: 0.02,
        why: 'Dieci livelli da 0 a 5 V lasciano nove intervalli: 5 V / 9 ≈ 0,56 V tra un livello e l\'altro. Il ricevitore sbaglia quando il disturbo supera la metà dell\'intervallo, 0,56 V / 2 ≈ 0,28 V. Con due soli livelli, 0 e 5 V, servirebbero 2,5 V: per questo i circuiti digitali usano il binario.',
      },
      {
        id: 'pl-04', level: 2, topic: 'Algebra di Boole', chapter: 'boole', type: 'choice',
        q: 'Nell\'algebra di Boole il punto (·) indica AND e il più (+) indica OR. Una pila accende una lampada attraverso l\'interruttore A, seguito da due interruttori B e C collegati in parallelo tra loro (1 = chiuso). Quale espressione dice quando la lampada è accesa?',
        options: ['A · (B + C)', 'A + (B · C)', '(A · B) + C', 'A · B · C'],
        answer: 0,
        why: 'B e C in parallelo danno B + C; A, in serie, aggiunge un AND: A · (B + C). La lampada si accende se A è chiuso e almeno uno tra B e C è chiuso. Serie vuol dire AND e parallelo vuol dire OR: è l\'idea della tesi di Shannon del 1937.',
      },
      {
        id: 'pl-05', level: 1, topic: 'Tabelle di verità', chapter: 'boole', type: 'number',
        q: 'Un circuito logico ha 5 ingressi, e ognuno può valere 0 o 1. Quante righe ha la sua tabella di verità?',
        value: 32, unit: 'righe', tolerance: 0,
        why: 'Ogni ingresso in più raddoppia le combinazioni: 2 ingressi danno 4 righe, 3 ne danno 8 e 5 ne danno 2 × 2 × 2 × 2 × 2 = 32. Con 10 ingressi le righe sarebbero già 1024.',
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
        id: 'pl-07', level: 2, topic: 'Simboli delle porte', chapter: 'porte', type: 'truefalse',
        q: 'La porta logica rappresentata da questo simbolo dà 1 in uscita quando i suoi due ingressi sono uguali.',
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
        q: 'A e B passano ciascuno da una porta NOT; le due uscite entrano, insieme all\'ingresso C, in una porta NOR a tre ingressi. Imposta gli ingressi per accendere il LED.',
        expr: 'NOR(NOT(A),NOT(B),C)', target: 1,
        why: 'La NOR dà 1 solo se tutti i suoi ingressi valgono 0: serve NOT A = 0 e NOT B = 0, cioè A = B = 1, e poi C = 0. È la seconda legge di De Morgan: una NOR con gli ingressi negati fa da AND, perché NOT ((NOT A) OR (NOT B)) = A AND B.',
      },
      {
        id: 'pl-10', level: 3, topic: 'XOR e maschere', chapter: 'porte', type: 'bits',
        q: 'Otto porte XOR combinano, bit per bit, il byte del registro in figura con la maschera 0000 1111 (0F in esadecimale). Accendi i bit delle otto uscite.',
        figure: { kind: 'bits', value: 165, width: 8 },
        width: 8, value: 170,
        why: 'Una XOR con 0 lascia passare il bit, con 1 lo inverte. Il registro contiene 1010 0101 (A5): la metà alta resta 1010, quella bassa 0101 diventa 1010. Il risultato è 1010 1010, cioè AA in esadecimale (170).',
      },
      {
        id: 'pl-24', level: 2, topic: 'Porte NAND universali', chapter: 'porte', type: 'choice',
        q: 'Il circuito in figura usa tre delle quattro porte NAND di un chip 7400. Quale funzione logica calcola?',
        figure: { kind: 'logic', expr: 'NAND(NAND(A,B),NAND(C,D))' },
        options: ['(A AND B) OR (C AND D)', '(A OR B) AND (C OR D)', 'NOT ((A AND B) OR (C AND D))', '(A AND B) AND (C AND D)'],
        answer: 0,
        why: 'Le prime due NAND danno NOT (A AND B) e NOT (C AND D); la terza dà 1 se almeno una delle due vale 0: (A AND B) OR (C AND D). Le sole NAND fanno quindi il lavoro di AND e OR e bastano per qualsiasi circuito; lo stesso vale per le NOR, le sole porte del computer di bordo dell\'Apollo.',
      },

      // ------------------------------------------------------------ Porte che contano e ricordano
      {
        id: 'pl-11', level: 1, topic: 'Semisommatore', chapter: 'calcolo', type: 'truth',
        q: 'Il semisommatore somma due bit, A e B: la cifra della somma, qui l\'uscita Y, è data da una porta XOR. Completa la sua tabella di verità.',
        expr: 'XOR(A,B)',
        why: '0 + 0 = 0, 0 + 1 = 1 e 1 + 0 = 1, ma 1 + 1 = 10 in binario: la cifra della somma è 0 e c\'è un riporto. Per questo la somma esce da una porta XOR, mentre il riporto esce da una porta AND.',
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
        q: 'Il sommatore completo somma tre bit: A, B e il riporto in arrivo C. La cifra della somma, qui l\'uscita Y, è data da due porte XOR in cascata: completa la sua tabella di verità.',
        expr: 'XOR(XOR(A,B),C)',
        why: 'La somma vale 1 quando i bit a 1 sono uno o tre: 1 + 1 + 1 = 11 dà somma 1 e riporto 1, mentre 1 + 1 + 0 = 10 dà somma 0 e riporto 1. Il riporto in uscita, invece, vale 1 quando almeno due dei tre bit sono a 1.',
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
        q: 'Un registro a scorrimento legge il segnale DATA in figura a ogni fronte di discesa di CLK, e il primo bit letto finisce nella posizione meno pesante (peso 1). Accendi gli 8 bit del byte ricevuto.',
        figure: { kind: 'wave', shape: 'clock-data' },
        width: 8, value: 77,
        why: 'Sui fronti di discesa DATA è stabile e vale, in ordine, 1, 0, 1, 1, 0, 0, 1, 0. Il primo bit va nel peso 1 e l\'ultimo nel peso 128: il byte è 0100 1101 = 64 + 8 + 4 + 1 = 77 (4D in esadecimale). A ogni fronte ogni bit passa al flip-flop D vicino ed entra quello nuovo.',
      },

      // ------------------------------------------------------------ Relè, valvole, transistor
      {
        id: 'pl-16', level: 1, topic: 'Linea del tempo', chapter: 'interruttori', type: 'order',
        q: 'Metti in ordine cronologico questi calcolatori, dal più antico al più recente.',
        items: ['Z3 di Konrad Zuse', 'Colossus', 'ENIAC', 'TRADIC dei Bell Labs'],
        ends: ['Più antico', 'Più recente'],
        why: 'Z3 (1941, a relè), Colossus (1943-44, a valvole), ENIAC (1945-46, circa 18 000 valvole), TRADIC (1954, a transistor): in poco più di dieci anni l\'interruttore dei calcolatori passò dal relè alla valvola e poi al transistor.',
      },
      {
        id: 'pl-17', level: 1, topic: 'Interruttori dei calcolatori', chapter: 'interruttori', type: 'choice',
        q: 'Il componente rappresentato da questo simbolo fu l\'interruttore dei primi calcolatori, come lo Z3 di Zuse. Perché fu presto superato dalle valvole?',
        figure: { kind: 'symbol', name: 'relay' },
        options: ['Deve muovere un contatto, quindi commuta lentamente', 'Funziona solo con la corrente alternata della rete', 'Ha bisogno di un filamento caldo per funzionare', 'Il contatto fa passare la corrente in un solo verso'],
        answer: 0,
        why: 'È un relè: un elettromagnete sposta un contatto metallico, e ogni scatto richiede qualche millesimo di secondo. Una valvola non ha parti in movimento e commuta in milionesimi di secondo, circa mille volte più in fretta.',
      },
      {
        id: 'pl-18', level: 2, topic: 'Valvole e guasti', chapter: 'interruttori', type: 'number',
        q: 'L\'ENIAC aveva circa 18 000 valvole. Se ogni valvola si guastasse in media una volta ogni 90 000 ore di funzionamento, ogni quante ore, in media, si guasterebbe una valvola qualsiasi della macchina?',
        value: 5, unit: 'ore', tolerance: 0.2,
        why: 'I guasti delle valvole si sommano: 90 000 ore / 18 000 = 5 ore, cioè in media un guasto ogni 5 ore di lavoro. Più componenti vogliono dire più guasti: anche per questo vinse il transistor, senza filamento e molto più durevole.',
      },
      {
        id: 'pl-19', level: 1, topic: 'Zuse Z3', chapter: 'interruttori', type: 'bits',
        q: 'Lo Z3 di Konrad Zuse lavorava in binario: ogni bit della sua memoria era un relè, con la bobina alimentata per 1 e a riposo per 0. Con quattro relè, come si scrive il numero 13? Accendi i bit.',
        width: 4, value: 13,
        why: '13 = 8 + 4 + 1, quindi 1101. Un relè ha due soli stati, e anche per questo Zuse scelse il binario: lo Z3 lavorava su parole di 22 bit, in virgola mobile. L\'ENIAC, a valvole, contava invece in decimale, con un anello di dieci elementi per ogni cifra.',
      },

      // ------------------------------------------------------------ Le famiglie logiche
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
        q: 'Quattro ingressi di un chip TTL, dal bit più pesante al più leggero, ricevono 2,2 V, 0,4 V, 3,4 V e 2,6 V. Accendi i bit che il chip legge.',
        width: 4, value: 11,
        why: 'Un ingresso TTL legge 0 sotto 0,8 V e 1 sopra 2 V: la soglia non è a metà dei 5 V di alimentazione. Quindi 2,2 V, 3,4 V e 2,6 V valgono 1 e 0,4 V vale 0: 1011, cioè 11. Le uscite, per avere margine, danno meno di 0,4 V per lo 0 e più di 2,4 V per l\'1.',
      },
      {
        id: 'pl-22', level: 2, topic: 'Fan-out', chapter: 'famiglie', type: 'number',
        q: 'Un\'uscita TTL standard a livello basso assorbe al massimo 16 mA, e ogni ingresso TTL collegato le manda 1,6 mA. Quanti ingressi può pilotare al massimo, cioè qual è il suo fan-out?',
        value: 10, unit: 'ingressi', tolerance: 0,
        why: 'Fan-out = 16 mA / 1,6 mA = 10: un\'uscita TTL standard pilota fino a 10 ingressi. Collegandone di più, la tensione dello 0 salirebbe oltre il limite e il segnale non sarebbe più affidabile.',
      },
      {
        id: 'pl-23', level: 3, topic: 'Porte CMOS', chapter: 'famiglie', type: 'choice',
        q: 'In una porta CMOS con due ingressi, A e B, ogni ingresso comanda un pMOS e un nMOS. I due pMOS sono in serie tra l\'uscita e l\'alimentazione, i due nMOS in parallelo tra l\'uscita e la massa. Un nMOS conduce con il gate a 1, un pMOS con il gate a 0. Quale porta formano?',
        options: ['NOR', 'NAND', 'OR', 'AND'],
        answer: 0,
        why: 'L\'uscita va a 1 solo se conducono tutti e due i pMOS in serie, cioè con A = B = 0; basta un ingresso a 1 perché il suo nMOS la colleghi a massa. È una NOR con 4 transistor; la NAND ha invece gli nMOS in serie e i pMOS in parallelo.',
      },
      {
        id: 'pl-33', level: 1, topic: 'Contenitore e piedini', chapter: 'famiglie', type: 'choice',
        q: 'Il 7400 in figura contiene quattro porte NAND a due ingressi. Come sono usati i suoi piedini?',
        figure: { kind: 'chip', pins: 14, label: '7400', note: 'TTL' },
        options: ['8 ingressi e 4 uscite, più alimentazione e massa', '8 ingressi e 4 uscite, più 2 piedini di riserva', '8 ingressi e 4 uscite, più 2 ingressi di clock', '8 ingressi e 4 uscite, più 2 uscite negate'],
        answer: 0,
        why: 'Ogni NAND ha 2 ingressi e 1 uscita: 4 × 3 = 12 piedini. Gli altri due portano l\'alimentazione, +5 V sul piedino 14, e la massa, sul piedino 7: senza di loro nessuna porta potrebbe funzionare.',
      },

      // ------------------------------------------------------------ Nasce il circuito integrato
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
        items: ['Purificazione del silicio ricavato dalla sabbia', 'Crescita del lingotto con il metodo Czochralski', 'Taglio del lingotto in wafer sottili', 'Fotolitografia e drogaggio, strato dopo strato', 'Separazione dei chip e montaggio nel contenitore'],
        ends: ['Primo passo', 'Ultimo passo'],
        why: 'Il quarzo della sabbia diventa silicio purissimo; dal silicio fuso si tira su un lingotto monocristallino, che si taglia in wafer. Fotolitografia e drogaggio ripetuti costruiscono i circuiti; infine i chip buoni si separano e si chiudono nel contenitore.',
      },
      {
        id: 'pl-30', level: 1, topic: 'Parole della fabbrica', chapter: 'fabbrica', type: 'match',
        q: 'Abbina ogni termine della fabbrica di chip al suo significato.',
        pairs: [
          ['Wafer', 'Disco sottile tagliato dal lingotto'],
          ['Maschera', 'Lastra con il disegno di uno strato'],
          ['Fotolitografia', 'Stampa di un disegno con la luce'],
          ['Camera bianca', 'Ambiente con l\'aria quasi senza polvere'],
          ['Resa', 'Percentuale di chip che funzionano'],
        ],
        why: 'La fotolitografia proietta sul wafer, con la luce, il disegno di una maschera, uno strato alla volta; il drogaggio con boro o fosforo crea poi le zone P e N dei transistor. Tutto avviene in camera bianca, perché un granello di polvere può rovinare un chip e abbassare la resa.',
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
        options: ['Più l\'onda è corta, più piccoli sono i dettagli che disegna', 'Più l\'onda è corta, meglio attraversa le maschere di vetro', 'Più l\'onda è corta, meno calore porta sul wafer', 'Più l\'onda è corta, più a fondo droga il silicio'],
        answer: 0,
        why: 'Come un pennello più fine, una lunghezza d\'onda più corta traccia linee più sottili. La luce EUV però viene assorbita da quasi tutto, anche dall\'aria e dal vetro: le macchine dell\'olandese ASML lavorano nel vuoto e usano solo specchi; anche la maschera riflette la luce invece di lasciarla passare.',
      },

      // ------------------------------------------------------------ Dentro il chip
      {
        id: 'pl-34', level: 2, topic: 'MOSFET nei chip CMOS', chapter: 'struttura', type: 'choice',
        q: 'Nelle porte CMOS lavorano insieme due tipi di MOSFET, pMOS e nMOS. Quando conduce un nMOS, e a quale livello porta l\'uscita della porta?',
        options: ['Con il gate a 1, e porta l\'uscita a 0', 'Con il gate a 0, e porta l\'uscita a 0', 'Con il gate a 1, e porta l\'uscita a 1', 'Con il gate a 0, e porta l\'uscita a 1'],
        answer: 0,
        why: 'Gli nMOS stanno tra l\'uscita e la massa e conducono con il gate a 1: quando conducono, l\'uscita va a 0. I pMOS fanno il contrario: conducono con il gate a 0 e collegano l\'uscita all\'alimentazione. Per ogni combinazione degli ingressi conducono i transistor verso l\'alimentazione oppure quelli verso massa, mai tutti e due.',
      },
      {
        id: 'pl-35', level: 2, topic: 'FinFET e GAA', chapter: 'struttura', type: 'truefalse',
        q: 'Nei transistor FinFET il canale è una sottile pinna verticale, e il gate la avvolge su tre lati invece di stare solo sopra di essa.',
        answer: true,
        why: 'Quando i transistor planari scesero a poche decine di nanometri, il gate non riusciva più a chiudere bene il canale e passava corrente anche a transistor spento. Il FinFET, usato per primo da Intel nei chip da 22 nm, avvolge la pinna su tre lati; il GAA (gate-all-around) circonda tutto il canale.',
      },
      {
        id: 'pl-36', level: 2, topic: 'Collegamenti nel chip', chapter: 'struttura', type: 'choice',
        q: 'Un processore moderno ha miliardi di transistor, costruiti sulla superficie di un pezzetto di silicio. Come sono collegati tra loro?',
        options: ['Da molti strati di piste di metallo, uno sopra l\'altro', 'Da un solo strato di piste di metallo, sopra il silicio', 'Da fili d\'oro sottilissimi, saldati uno per uno', 'Dalle piste di rame del circuito stampato sotto il chip'],
        answer: 0,
        why: 'Sopra i transistor si costruiscono più di dieci strati di piste di metallo, oggi soprattutto di rame, separati da isolante e uniti da collegamenti verticali. Con un solo strato le piste non potrebbero incrociarsi; i fili saldati uno per uno erano quelli del primo integrato di Kilby.',
      },

      // ------------------------------------------------------------ La legge di Moore e il futuro
      {
        id: 'pl-37', level: 1, topic: 'Gordon Moore', chapter: 'moore', type: 'choice',
        q: 'Nel 1965 Gordon Moore, che tre anni dopo avrebbe fondato Intel con Robert Noyce, fece una previsione sui circuiti integrati. Quale?',
        options: ['I componenti per chip sarebbero raddoppiati ogni anno', 'La frequenza dei chip sarebbe raddoppiata ogni anno', 'La tensione dei chip si sarebbe dimezzata ogni anno', 'Le dimensioni dei chip sarebbero raddoppiate ogni anno'],
        answer: 0,
        why: 'Nell\'articolo del 1965 Moore notò che i componenti per chip raddoppiavano circa ogni anno e previde che il ritmo sarebbe durato almeno dieci anni. Nel 1975 corresse la previsione: verso il 1980 il ritmo sarebbe sceso a un raddoppio ogni due anni circa. È la "legge di Moore".',
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
        q: 'Nel 1974 Robert Dennard mostrò che, rimpicciolendo i transistor, si possono abbassare insieme la loro tensione e la loro corrente. Che cosa restava allora costante, generazione dopo generazione?',
        options: ['Il calore prodotto per mm² di chip', 'La frequenza massima del clock', 'Il numero di transistor per chip', 'Il consumo di ogni singolo transistor'],
        answer: 0,
        why: 'Con transistor k volte più piccoli, tensione e corrente calano di k volte e la potenza di ognuno di k² volte; nello stesso spazio ne entrano k² volte di più, quindi il calore per mm² resta uguale mentre la frequenza sale. Verso il 2005 la tensione smise di scendere e lo scaling di Dennard finì.',
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
