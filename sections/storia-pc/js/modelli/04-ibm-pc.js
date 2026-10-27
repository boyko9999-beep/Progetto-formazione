/*
 * Storia del PC · capitolo 4 (ibm-pc): dati e logica pura, senza DOM.
 *
 * - MAPPA: le quattro zone del megabyte indirizzabile dall'8088 (20 linee di indirizzo).
 * - DETTAGLI: la stessa memoria divisa in pezzi più piccoli (schermo MDA e CGA, BASIC, BIOS...),
 *   contigui e senza buchi, usati dalla "lente" del laboratorio.
 * - indirizzoFisico(): segmento × 16 + offset, con e senza la porta A20 dell'IBM PC AT.
 * - COMPONENTI: i pezzi dell'IBM PC 5150 che si scoprono aprendo il case.
 */
(function (root) {
  'use strict';

  const UN_MEGA = 0x100000;          // 2^20 byte: 1 MB, 20 linee di indirizzo
  const MAX_20_BIT = UN_MEGA - 1;    // FFFFF
  const MAX_SEG_OFF = 0xFFFF * 16 + 0xFFFF; // FFFF:FFFF = 10FFEF

  /* ---------- la mappa della memoria dell'IBM PC (1 MB) ---------- */

  const MAPPA = [
    {
      id: 'convenzionale', da: 0x00000, a: 0x9FFFF, colore: 'trace-1',
      nome: 'Memoria convenzionale', breve: 'RAM',
      testo: 'RAM per il sistema operativo e i programmi. All\'inizio ci sono i vettori di interruzione e l\'area dati del BIOS. Il 5150 ne montava da 16 a 64 KB sulla scheda madre; altra memoria si aggiungeva con le schede di espansione, e la mappa le lasciava spazio fino a 640 KB.',
    },
    {
      id: 'video', da: 0xA0000, a: 0xBFFFF, colore: 'trace-3',
      nome: 'Memoria video', breve: 'Video',
      testo: 'Riservata alle schede video: ciò che il processore scrive qui compare sullo schermo. La MDA usa 4 KB da B0000, la CGA 16 KB da B8000; il resto lo occuperanno le schede EGA (1984) e VGA (1987).',
    },
    {
      id: 'rom-schede', da: 0xC0000, a: 0xEFFFF, colore: 'trace-4',
      nome: 'ROM delle schede', breve: 'ROM schede',
      testo: 'Spazio per le ROM che alcune schede di espansione portano con sé, con i loro programmi: per esempio il controller del disco rigido dell\'XT (da C8000) o le schede grafiche EGA e VGA (da C0000).',
    },
    {
      id: 'rom-sistema', da: 0xF0000, a: 0xFFFFF, colore: 'trace-2',
      nome: 'ROM di sistema', breve: 'ROM sistema',
      testo: 'Le ROM della scheda madre: il BASIC (F6000–FDFFF) e il BIOS (FE000–FFFFF). Dopo il reset l\'8088 comincia a eseguire da FFFF0, 16 byte prima della fine del megabyte: lì c\'è un salto all\'inizio del BIOS.',
    },
  ];

  // Oltre il megabyte: esiste solo per un 286 (o successivo) con la linea A20 accesa.
  const OLTRE = {
    id: 'oltre', da: UN_MEGA, a: MAX_SEG_OFF, colore: 'grigio',
    nome: 'Oltre 1 MB (HMA)', breve: 'Oltre 1 MB',
    testo: 'Con 20 linee di indirizzo l\'8088 non può superare FFFFF: un indirizzo più grande «fa il giro» e ricomincia da 00000. Il 286 del PC AT ha 24 linee: per restare compatibile IBM aggiunse la porta A20, che tiene spenta la ventunesima linea finché un programma non la accende. Con A20 accesa questi 64 KB meno 16 byte, la HMA (<em>high memory area</em>), diventano raggiungibili.',
  };

  // Pezzi più piccoli: coprono tutto il megabyte, in ordine e senza buchi.
  // usata: false per le zone libere o riservate (disegnate a tratteggio).
  const DETTAGLI = [
    { id: 'ivt', regione: 'convenzionale', da: 0x00000, a: 0x003FF, usata: true, nome: 'Vettori di interruzione', breve: 'Vettori',
      testo: '256 indirizzi da 4 byte (segmento e offset): per ogni interruzione dicono al processore dove si trova il programma che la gestisce.' },
    { id: 'bda', regione: 'convenzionale', da: 0x00400, a: 0x004FF, usata: true, nome: 'Area dati del BIOS', breve: 'Dati BIOS',
      testo: 'Le variabili del BIOS: le porte installate, la modalità video, il buffer della tastiera, il contatore dell\'orologio.' },
    { id: 'programmi', regione: 'convenzionale', da: 0x00500, a: 0x9FFFF, usata: true, nome: 'DOS e programmi', breve: 'Programmi',
      testo: 'Qui si caricano il DOS, i programmi e i loro dati. Sul 5150 la RAM vera arrivava fin dove c\'erano chip: 16 KB nel modello base.' },
    { id: 'ega', regione: 'video', da: 0xA0000, a: 0xAFFFF, usata: false, nome: 'Riservata (poi EGA e VGA)', breve: 'EGA e VGA',
      testo: 'Vuota sul 5150: dal 1984 la userà la grafica della scheda EGA, poi quella della VGA.' },
    { id: 'mda', regione: 'video', da: 0xB0000, a: 0xB0FFF, usata: true, nome: 'Schermo MDA', breve: 'MDA',
      testo: 'La memoria della scheda monocromatica: 80 × 25 caratteri, 2 byte ciascuno (il codice e l\'attributo), cioè 4.000 byte.' },
    { id: 'video-libera', regione: 'video', da: 0xB1000, a: 0xB7FFF, usata: false, nome: 'Non usata', breve: 'non usata',
      testo: 'Indirizzi riservati al video ma non occupati dalle due schede del 1981.' },
    { id: 'cga', regione: 'video', da: 0xB8000, a: 0xBBFFF, usata: true, nome: 'Schermo CGA', breve: 'CGA',
      testo: 'La memoria della scheda a colori: 16 KB, abbastanza per quattro pagine di testo da 80 × 25 o per un\'immagine di 320 × 200 punti a 4 colori.' },
    { id: 'video-libera-2', regione: 'video', da: 0xBC000, a: 0xBFFFF, usata: false, nome: 'Non usata', breve: 'non usata',
      testo: 'Ultimi 16 KB della zona video, liberi sul primo PC.' },
    { id: 'rom-video', regione: 'rom-schede', da: 0xC0000, a: 0xC7FFF, usata: false, nome: 'ROM video (EGA, VGA)', breve: 'ROM video',
      testo: 'Le schede EGA e VGA portano qui il loro BIOS video, che sostituisce quello della scheda madre.' },
    { id: 'rom-disco', regione: 'rom-schede', da: 0xC8000, a: 0xC9FFF, usata: false, nome: 'ROM disco rigido (XT)', breve: 'ROM disco',
      testo: 'Dal PC/XT del 1983 qui c\'è la ROM da 8 KB del controller del disco rigido.' },
    { id: 'rom-libera', regione: 'rom-schede', da: 0xCA000, a: 0xEFFFF, usata: false, nome: 'Libera per altre schede', breve: 'libera',
      testo: 'Spazio libero per le ROM di altre schede di espansione.' },
    { id: 'riservata', regione: 'rom-sistema', da: 0xF0000, a: 0xF5FFF, usata: false, nome: 'Riservata', breve: 'riservata',
      testo: 'Riservata da IBM per altre ROM della scheda madre.' },
    { id: 'basic', regione: 'rom-sistema', da: 0xF6000, a: 0xFDFFF, usata: true, nome: 'BASIC in ROM', breve: 'BASIC',
      testo: 'Il BASIC di Microsoft in quattro ROM da 8 KB: parte se all\'accensione non c\'è un dischetto.' },
    { id: 'bios', regione: 'rom-sistema', da: 0xFE000, a: 0xFFFEF, usata: true, nome: 'BIOS', breve: 'BIOS',
      testo: 'Gli 8 KB del BIOS: autodiagnosi all\'accensione e servizi per tastiera, schermo, dischetti, stampante.' },
    { id: 'reset', regione: 'rom-sistema', da: 0xFFFF0, a: 0xFFFFF, usata: true, nome: 'Punto di partenza', breve: 'reset',
      testo: 'Gli ultimi 16 byte: dopo il reset l\'8088 esegue da qui, e il BIOS ci mette un salto a F000:E05B, l\'inizio dell\'autodiagnosi.' },
  ];

  /* ---------- esadecimale ---------- */

  // esa(0xB8000, 5) -> 'B8000'
  function esa(n, cifre) {
    const s = Math.max(0, Math.floor(Number(n) || 0)).toString(16).toUpperCase();
    return cifre ? s.padStart(cifre, '0') : s;
  }

  // Legge un numero esadecimale scritto da una persona: 'B800', 'b800h', '0xB800', ' b8 00 '.
  // Restituisce NaN se non è valido o supera il massimo (di solito FFFF).
  function leggiEsa(testo, massimo) {
    const max = massimo == null ? 0xFFFF : massimo;
    let s = String(testo == null ? '' : testo).trim().replace(/\s+/g, '').toUpperCase();
    if (s.startsWith('0X')) s = s.slice(2);
    if (s.endsWith('H')) s = s.slice(0, -1);
    if (!/^[0-9A-F]{1,8}$/.test(s)) return NaN;
    const n = parseInt(s, 16);
    return n >= 0 && n <= max ? n : NaN;
  }

  /* ---------- segmento:offset ---------- */

  // L'8086/8088 forma un indirizzo di 20 bit da due numeri di 16 bit:
  // fisico = segmento × 16 + offset. Il risultato può superare FFFFF (fino a 10FFEF):
  // senza A20 (8088, o AT con A20 spenta) la ventunesima cifra binaria si perde e l'indirizzo fa il giro.
  function indirizzoFisico(segmento, offset, a20) {
    const seg = Number(segmento) >>> 0;
    const off = Number(offset) >>> 0;
    if (!Number.isInteger(Number(segmento)) || !Number.isInteger(Number(offset)) || seg > 0xFFFF || off > 0xFFFF) {
      throw new RangeError('segmento e offset vanno da 0000 a FFFF');
    }
    const base = seg * 16;
    const lineare = base + off;
    const oltre = lineare > MAX_20_BIT;
    const fisico = a20 ? lineare : (lineare & MAX_20_BIT);
    return { segmento: seg, offset: off, base: base, lineare: lineare, fisico: fisico, oltre: oltre, giro: oltre && !a20, a20: !!a20 };
  }

  // Le righe dell'addizione in colonna che il laboratorio mostra (6 cifre esadecimali).
  // Moltiplicare per 16 in esadecimale = aggiungere uno zero a destra.
  function colonne(segmento, offset, a20) {
    const r = indirizzoFisico(segmento, offset, a20);
    return {
      base: esa(r.base, 5),            // B8000
      offset: esa(r.offset, 4),        // 0000
      somma: r.oltre ? esa(r.lineare, 6) : esa(r.lineare, 5),
      fisico: r.fisico > MAX_20_BIT ? esa(r.fisico, 6) : esa(r.fisico, 5),
      giro: r.giro,
      oltre: r.oltre,
    };
  }

  // Coppia "SSSS:OOOO".
  function coppia(segmento, offset) { return esa(segmento, 4) + ':' + esa(offset, 4); }

  // Tutte le coppie segmento:offset che puntano allo stesso indirizzo fisico (senza giro): sono tante,
  // perché i segmenti si sovrappongono ogni 16 byte. Qui basta sapere quante sono.
  function quanteCoppie(fisico) {
    let n = 0;
    const segMin = Math.max(0, Math.ceil((fisico - 0xFFFF) / 16));
    const segMax = Math.min(0xFFFF, Math.floor(fisico / 16));
    if (segMax >= segMin) n = segMax - segMin + 1;
    return n;
  }

  /* ---------- dove cade un indirizzo ---------- */

  function regione(indirizzo) {
    if (indirizzo > MAX_20_BIT) return indirizzo <= MAX_SEG_OFF ? OLTRE : null;
    return MAPPA.find((z) => indirizzo >= z.da && indirizzo <= z.a) || null;
  }

  function dettaglio(indirizzo) {
    if (indirizzo > MAX_20_BIT) return null;
    return DETTAGLI.find((z) => indirizzo >= z.da && indirizzo <= z.a) || null;
  }

  function dimensioneKB(zona) { return (zona.a - zona.da + 1) / 1024; }

  /* ---------- esempi del calcolatore ---------- */

  const ESEMPI = [
    { id: 'cga', seg: 0xB800, off: 0x0000, nome: 'Schermo CGA',
      testo: 'È il primo carattere in alto a sinistra dello schermo a colori: ogni carattere occupa 2 byte, il codice e il colore. Scrivere qui era il modo più veloce per far comparire un testo.' },
    { id: 'mda', seg: 0xB000, off: 0x0000, nome: 'Schermo MDA',
      testo: 'Lo stesso per la scheda monocromatica: il suo schermo comincia 32 KB prima di quello della CGA, così le due schede potevano stare insieme nello stesso PC.' },
    { id: 'reset', seg: 0xFFFF, off: 0x0000, nome: 'Dopo il reset',
      testo: 'Qui l\'8088 comincia a lavorare appena acceso: 16 byte prima della fine del megabyte. Il BIOS ci mette un salto a F000:E05B, l\'inizio dell\'autodiagnosi.' },
    { id: 'basic', seg: 0xF600, off: 0x0000, nome: 'BASIC in ROM',
      testo: 'Il primo byte delle quattro ROM del BASIC: F600 × 16 = F6000. Da qui a FDFFF ci sono 32 KB di programma, scritti da Microsoft.' },
    { id: 'vettori', seg: 0x0000, off: 0x0000, nome: 'Vettori di interruzione',
      testo: 'Il primo byte della memoria: comincia la tabella dei 256 vettori di interruzione.' },
    { id: 'stesso', seg: 0xB801, off: 0x0000, nome: 'Stesso byte',
      testo: 'B801:0000 e B800:0010 indicano lo stesso byte: alzare il segmento di 1 sposta la finestra di 16 byte. I segmenti si sovrappongono.' },
    { id: 'oltre', seg: 0xFFFF, off: 0x0010, nome: 'Oltre 1 MB',
      testo: 'La somma fa 100000: servirebbero 21 bit. Con l\'8088 la cifra in più si perde e l\'indirizzo fa il giro fino a 00000; con la linea A20 accesa, su un AT, si entra nella HMA.' },
  ];

  /* ---------- i pezzi dell'IBM PC 5150 (laboratorio "Apri il case") ---------- */

  // mappa: l'esempio del calcolatore che mostra dove il pezzo sta in memoria (se c'è).
  const COMPONENTI = [
    { id: 'cpu', nome: 'Intel 8088', gruppo: 'Processore',
      testo: 'Il cervello del PC: esegue le istruzioni dei programmi. All\'interno lavora a 16 bit, ma verso l\'esterno usa un bus dati a 8 bit, come i chip più economici della generazione precedente. Con 20 linee di indirizzo arriva a 1 MB di memoria.',
      dati: [['Frequenza', '4,77 MHz'], ['Bus dati', '8 bit (16 all\'interno)'], ['Indirizzi', '20 linee: 1 MB'], ['Transistor', 'circa 29.000']] },
    { id: 'fpu', nome: 'Zoccolo dell\'8087', gruppo: 'Coprocessore, a richiesta',
      testo: 'Accanto al processore c\'è uno zoccolo vuoto: aspetta l\'Intel 8087, un coprocessore matematico che calcola in hardware con i numeri con la virgola (in virgola mobile). Si comprava a parte e serviva a chi usava fogli elettronici pesanti o programmi scientifici e di progettazione.',
      dati: [['Piedini', '40'], ['Calcola', 'virgola mobile a 32, 64 e 80 bit'], ['Prezzo', 'a parte, come opzione']] },
    { id: 'bios', nome: 'ROM del BIOS', gruppo: 'Firmware', mappa: 'reset',
      testo: 'Una ROM da 8 KB con il BIOS. All\'accensione esegue il POST (<em>power-on self test</em>, l\'autodiagnosi) e poi carica il sistema operativo dal dischetto; dopo resta a disposizione dei programmi per tastiera, schermo, dischetti e stampante. Protetto dal diritto d\'autore, era il pezzo che i costruttori di cloni dovevano riscrivere da capo.',
      dati: [['Capacità', '8 KB'], ['Indirizzi', 'FE000–FFFFF'], ['Avvio', 'da FFFF0, con un salto al POST']] },
    { id: 'basic', nome: 'ROM del BASIC', gruppo: 'Linguaggio in ROM', mappa: 'basic',
      testo: 'Quattro ROM da 8 KB contengono il BASIC di Microsoft. Se all\'accensione non trova un dischetto il PC parte da qui: compare il BASIC e si può scrivere subito un programma, da salvare sulla cassetta. I cloni non potevano copiarlo e davano il BASIC su dischetto.',
      dati: [['Capacità', '32 KB (4 × 8 KB)'], ['Indirizzi', 'F6000–FDFFF'], ['Autore', 'Microsoft']] },
    { id: 'ram', nome: 'Banchi di RAM', gruppo: 'Memoria', mappa: 'vettori',
      testo: 'Quattro file di nove chip da 16 kilobit: otto chip per gli 8 bit di ogni byte e un nono per il bit di parità, che si accorge se un bit si è guastato (allora il PC si ferma con il messaggio PARITY CHECK). Il modello base aveva una sola fila, 16 KB; con quattro si arriva a 64 KB, oltre si aggiungono schede.',
      dati: [['Chip', '36 da 16 kbit'], ['Per fila', '16 KB + parità'], ['Sulla scheda', 'da 16 a 64 KB']] },
    { id: 'slot', nome: 'Slot di espansione', gruppo: 'Bus',
      testo: 'Cinque connettori da 62 contatti collegati agli stessi fili: 8 linee di dati, 20 di indirizzo, i segnali di controllo e le alimentazioni. IBM lo chiamava <em>I/O channel</em>; diventerà il bus ISA. Era descritto nel manuale tecnico, perché chiunque potesse costruire schede.',
      dati: [['Slot', '5'], ['Contatti', '62 per slot'], ['Dati', '8 bit'], ['Clock', '4,77 MHz']] },
    { id: 'video', nome: 'Scheda video MDA', gruppo: 'Scheda di espansione', mappa: 'mda',
      testo: 'La <em>Monochrome Display and Printer Adapter</em> mostra 25 righe di 80 caratteri molto nitidi sul monitor IBM 5151, e ha anche la porta per la stampante. I suoi 4 KB di memoria video il processore li trova all\'indirizzo B0000. L\'alternativa era la CGA, a colori, con 16 KB da B8000.',
      dati: [['Testo', '80 × 25 caratteri'], ['Memoria', '4 KB da B0000'], ['In più', 'porta per la stampante']] },
    { id: 'fdc', nome: 'Controller dei dischetti', gruppo: 'Scheda di espansione',
      testo: 'Una scheda più corta, con il chip NEC µPD765, comanda fino a quattro unità per dischetti: le due interne con un cavo piatto, altre due con un connettore sul retro. Per portare i dati in memoria senza impegnare il processore usa il canale 2 del DMA.',
      dati: [['Controller', 'NEC µPD765'], ['Unità', 'fino a 4'], ['DMA', 'canale 2'], ['Interruzione', 'IRQ 6']] },
    { id: 'psu', nome: 'Alimentatore', gruppo: 'Alimentazione',
      testo: 'Trasforma la corrente della presa in quattro tensioni continue: +5 V per i chip, +12 V soprattutto per i motori dei drive, −5 V e −12 V per alcune schede. La sua ventola raffredda tutto il PC. I suoi 63,5 W bastavano per due dischetti ma non per un disco rigido: l\'XT del 1983 salirà a 130 W.',
      dati: [['Potenza', '63,5 W'], ['Uscite', '+5, −5, +12, −12 V'], ['Interruttore', 'rosso, sul fianco destro']] },
    { id: 'floppy', nome: 'Unità per dischetti', gruppo: 'Memoria di massa',
      testo: 'Due drive Tandon da 5,25 pollici a una sola faccia: 40 tracce di 8 settori da 512 byte, cioè 160 KB per dischetto con il DOS 1.0. Dal 1982, con il DOS 1.1 e i drive a due facce, si arriverà a 320 KB; dal 1983, con il DOS 2.0, a 360 KB.',
      dati: [['Formato', '5,25 pollici'], ['Capacità', '160 KB, una faccia'], ['Tracce', '40 da 8 settori']] },
    { id: 'speaker', nome: 'Altoparlante', gruppo: 'Suono',
      testo: 'Un piccolo altoparlante comandato dal timer 8253: riceve un\'onda quadra e produce bip di altezza variabile. Un bip breve all\'accensione vuol dire che l\'autodiagnosi è andata bene; sequenze diverse segnalano un guasto.',
      dati: [['Segnale', 'onda quadra'], ['Comandato da', '8253, canale 2'], ['All\'avvio', 'un bip breve se va tutto bene']] },
    { id: 'pit', nome: 'Timer 8253', gruppo: 'Chip di supporto',
      testo: 'Tre contatori che dividono un clock di 1,19 MHz. Il canale 0 produce 18,2 interruzioni al secondo, con cui il BIOS tiene l\'ora; il canale 1 ricorda al DMA di rinfrescare la memoria dinamica; il canale 2 fa suonare l\'altoparlante.',
      dati: [['Canali', '3 contatori da 16 bit'], ['Clock', '1,19 MHz'], ['Orologio', '18,2 scatti al secondo']] },
    { id: 'pic', nome: 'Interruzioni 8259', gruppo: 'Chip di supporto',
      testo: 'Raccoglie le richieste di attenzione (interruzioni, IRQ) di otto dispositivi e le passa al processore una alla volta, in ordine di priorità: IRQ 0 è il timer, IRQ 1 la tastiera, IRQ 6 i dischetti, IRQ 7 la stampante. Così il processore non deve interrogare di continuo ogni periferica.',
      dati: [['Linee', '8, da IRQ 0 a IRQ 7'], ['Priorità', 'IRQ 0 la più alta']] },
    { id: 'dma', nome: 'DMA 8237', gruppo: 'Chip di supporto',
      testo: 'Il DMA (<em>direct memory access</em>, accesso diretto alla memoria) sposta dati fra le periferiche e la memoria al posto del processore. Dei suoi quattro canali, lo 0 rinfresca di continuo la RAM dinamica, che altrimenti perderebbe i dati, e il 2 serve ai dischetti.',
      dati: [['Canali', '4'], ['Canale 0', 'rinfresco della RAM'], ['Canale 2', 'dischetti']] },
    { id: 'ppi', nome: '8255 e interruttori', gruppo: 'Chip di supporto',
      testo: 'Un chip con tre porte da 8 bit che fa da tuttofare: legge i codici dei tasti, legge gli interruttori DIP con cui si dichiarano memoria, scheda video e numero di drive (non esisteva ancora un programma di configurazione) e comanda altoparlante e motore del registratore.',
      dati: [['Porte', '3 da 8 bit'], ['Legge', 'tastiera e interruttori'], ['Comanda', 'altoparlante, registratore']] },
    { id: 'din', nome: 'Prese tastiera e cassette', gruppo: 'Connettori',
      testo: 'Due prese DIN rotonde a 5 poli sul retro. Nella prima entra il cavo spiralato della tastiera Model F, che invia i codici dei tasti un bit alla volta. Nella seconda si collega un comune registratore a cassette: il PC registra i programmi come suoni, lentamente.',
      dati: [['Tastiera', 'Model F, 83 tasti'], ['Cassette', 'presa DIN a 5 poli'], ['Uso', 'programmi del BASIC']] },
  ];

  function componente(id) { return COMPONENTI.find((c) => c.id === id) || null; }
  function esempio(id) { return ESEMPI.find((e) => e.id === id) || null; }

  const api = {
    UN_MEGA: UN_MEGA,
    MAX_20_BIT: MAX_20_BIT,
    MAX_SEG_OFF: MAX_SEG_OFF,
    MAPPA: MAPPA,
    OLTRE: OLTRE,
    DETTAGLI: DETTAGLI,
    ESEMPI: ESEMPI,
    COMPONENTI: COMPONENTI,
    esa: esa,
    leggiEsa: leggiEsa,
    indirizzoFisico: indirizzoFisico,
    colonne: colonne,
    coppia: coppia,
    quanteCoppie: quanteCoppie,
    regione: regione,
    dettaglio: dettaglio,
    dimensioneKB: dimensioneKB,
    componente: componente,
    esempio: esempio,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['ibm-pc'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
