/*
 * Storia del PC · capitolo 7 (avvio): dati e logica pura, senza DOM.
 *
 * - Settori di avvio di esempio da 512 byte: il master boot record (MBR) di un disco rigido
 *   di fine anni Ottanta, con codice, tabella delle partizioni (byte 446–509) e firma 55h AAh
 *   (byte 510–511), e il settore di un dischetto del 1981, che la firma non l'aveva.
 * - Conversioni fra indirizzi CHS (cilindro, testina, settore) e LBA (numero di blocco),
 *   codifica CHS nei 3 byte della tabella, indirizzi segmento:offset dell'8088.
 * - Un'impronta digitale semplificata (FNV-1a a 32 bit) per mostrare la verifica di Secure Boot.
 * - Le fasi dei sei scenari del laboratorio (BIOS e UEFI) e gli elenchi dei controlli del POST.
 */
(function (root) {
  'use strict';

  const SETTORE = 512;        // byte in un settore
  const TABELLA = 446;        // inizio della tabella delle partizioni (1BEh)
  const VOCE = 16;            // byte per voce della tabella
  const VOCI = 4;             // voci nella tabella
  const FIRMA = 510;          // posizione della firma 55h AAh (1FEh)
  const CARICAMENTO = 0x7C00; // dove il BIOS copia il settore (0000:7C00)

  /* ---------- numeri e indirizzi ---------- */

  function esa(n, cifre) {
    return (n >>> 0).toString(16).toUpperCase().padStart(cifre || 2, '0');
  }

  // Indirizzo fisico dell'8088: segmento × 16 + offset (20 bit).
  function fisico(segmento, offset) {
    return segmento * 16 + offset;
  }

  function segOff(segmento, offset) {
    return esa(segmento, 4) + ':' + esa(offset, 4);
  }

  /* ---------- geometrie dei dischi e conversioni CHS / LBA ---------- */

  const GEOMETRIE = {
    // Dischetto da 5,25 pollici a una faccia del PC IBM (1981): 40 × 1 × 8 × 512 = 163.840 byte.
    dischetto: { nome: 'dischetto da 160 KB', cilindri: 40, testine: 1, settori: 8 },
    // Disco rigido da 20 MB tipico di fine anni Ottanta (geometria del Seagate ST-225).
    disco: { nome: 'disco rigido da 20 MB', cilindri: 615, testine: 4, settori: 17 },
  };

  function controllaChs(c, h, s, g) {
    if (!Number.isInteger(c) || !Number.isInteger(h) || !Number.isInteger(s)) throw new RangeError('CHS non intero');
    if (s < 1 || s > g.settori) throw new RangeError('settore fuori geometria: i settori si contano da 1');
    if (h < 0 || h >= g.testine) throw new RangeError('testina fuori geometria');
    if (c < 0 || c >= g.cilindri) throw new RangeError('cilindro fuori geometria');
  }

  // LBA = (C × testine + H) × settori per traccia + (S − 1). I settori si contano da 1, il resto da 0.
  function chsInLba(c, h, s, g) {
    controllaChs(c, h, s, g);
    return (c * g.testine + h) * g.settori + (s - 1);
  }

  function lbaInChs(lba, g) {
    const totale = g.cilindri * g.testine * g.settori;
    if (!Number.isInteger(lba) || lba < 0 || lba >= totale) throw new RangeError('LBA fuori dal disco');
    const traccia = Math.floor(lba / g.settori);
    return { c: Math.floor(traccia / g.testine), h: traccia % g.testine, s: (lba % g.settori) + 1 };
  }

  function settoriTotali(g) { return g.cilindri * g.testine * g.settori; }

  // Nei 3 byte CHS della tabella: testina; settore (6 bit) con i 2 bit alti del cilindro; 8 bit bassi del cilindro.
  function codificaChs(chs) {
    if (chs.c > 1023 || chs.h > 255 || chs.s > 63 || chs.s < 1) throw new RangeError('CHS non rappresentabile nella tabella');
    return [chs.h & 0xFF, (chs.s & 0x3F) | ((chs.c >> 2) & 0xC0), chs.c & 0xFF];
  }

  function decodificaChs(b0, b1, b2) {
    return { c: ((b1 & 0xC0) << 2) | b2, h: b0, s: b1 & 0x3F };
  }

  // Il disco più grande descrivibile dalla tabella MBR: 2^32 settori (numeri a 32 bit).
  function limiteMbr(byteSettore) {
    return Math.pow(2, 32) * (byteSettore || SETTORE);
  }

  /* ---------- byte in ordine little-endian ---------- */

  function scriviU32(b, off, v) {
    b[off] = v & 0xFF; b[off + 1] = (v >>> 8) & 0xFF; b[off + 2] = (v >>> 16) & 0xFF; b[off + 3] = (v >>> 24) & 0xFF;
  }

  function leggiU32(b, off) {
    return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
  }

  /* ---------- tabella delle partizioni ---------- */

  const TIPI = { 0x00: 'vuota', 0x01: 'FAT12', 0x04: 'FAT16 (fino a 32 MB)', 0x05: 'estesa', 0x06: 'FAT16', 0x07: 'NTFS', 0x0B: 'FAT32', 0x83: 'Linux', 0xEE: 'GPT protettiva', 0xEF: 'partizione di sistema EFI' };

  // Una voce di 16 byte: stato (80h = attiva), CHS di inizio, tipo, CHS di fine, LBA di inizio, numero di settori.
  function voce(p) {
    const v = new Array(VOCE).fill(0);
    if (!p) return v;
    v[0] = p.attiva ? 0x80 : 0x00;
    const a = codificaChs(p.inizio);
    const z = codificaChs(p.fine);
    v[1] = a[0]; v[2] = a[1]; v[3] = a[2];
    v[4] = p.tipo & 0xFF;
    v[5] = z[0]; v[6] = z[1]; v[7] = z[2];
    scriviU32(v, 8, p.lba);
    scriviU32(v, 12, p.settori);
    return v;
  }

  function leggiVoce(settore, i) {
    const o = TABELLA + i * VOCE;
    const b = Array.prototype.slice.call(settore, o, o + VOCE);
    const vuota = b.every((x) => x === 0);
    return {
      indice: i,
      offset: o,
      vuota: vuota,
      stato: b[0],
      attiva: b[0] === 0x80,
      tipo: b[4],
      nomeTipo: TIPI[b[4]] || 'sconosciuto',
      inizio: decodificaChs(b[1], b[2], b[3]),
      fine: decodificaChs(b[5], b[6], b[7]),
      lba: leggiU32(b, 8),
      settori: leggiU32(b, 12),
    };
  }

  /* ---------- settori di avvio di esempio ---------- */

  // Generatore pseudo-casuale ripetibile, per riempire con byte «da codice» le zone di esempio.
  function lcg(seme) {
    let x = seme >>> 0;
    return function () { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x >>> 24; };
  }

  function scriviTesto(b, zone, off, testo) {
    for (let i = 0; i < testo.length; i++) { b[off + i] = testo.charCodeAt(i) & 0xFF; zone[off + i] = 'testo'; }
    b[off + testo.length] = 0;
  }

  // Le prime istruzioni dell'MBR del DOS: CLI; XOR AX,AX; MOV SS,AX; MOV SP,7C00h; MOV SI,SP; PUSH AX; POP ES;
  // PUSH AX; POP DS; STI; CLD; MOV DI,0600h; MOV CX,0100h; REP MOVSW; JMP FAR 0000:061D (si copia più in basso),
  // poi cerca la partizione attiva: MOV SI,07BEh; MOV BL,4; CMP BYTE [SI],80h ... e, se non la trova, INT 18h.
  const MBR_INIZIO = [
    0xFA, 0x33, 0xC0, 0x8E, 0xD0, 0xBC, 0x00, 0x7C, 0x8B, 0xF4, 0x50, 0x07, 0x50, 0x1F, 0xFB, 0xFC,
    0xBF, 0x00, 0x06, 0xB9, 0x00, 0x01, 0xF2, 0xA5, 0xEA, 0x1D, 0x06, 0x00, 0x00, 0xBE, 0xBE, 0x07,
    0xB3, 0x04, 0x80, 0x3C, 0x80, 0x74, 0x0E, 0x80, 0x3C, 0x00, 0x75, 0x1C, 0x83, 0xC6, 0x10, 0xFE,
    0xCB, 0x75, 0xEF, 0xCD, 0x18,
  ];
  const MBR_CODICE = 0x8B;   // fin qui istruzioni, poi i messaggi d'errore
  const MBR_MESSAGGI = [
    [0x8B, 'Invalid partition table'],
    [0xA3, 'Error loading operating system'],
    [0xC2, 'Missing operating system'],
  ];

  // L'unica partizione del disco da 20 MB: attiva, FAT16, dal cilindro 0 testina 1 settore 1 alla fine del disco.
  function partizioneEsempio() {
    const g = GEOMETRIE.disco;
    const inizio = { c: 0, h: 1, s: 1 };
    const fine = { c: g.cilindri - 1, h: g.testine - 1, s: g.settori };
    const lba = chsInLba(inizio.c, inizio.h, inizio.s, g);
    const ultimo = chsInLba(fine.c, fine.h, fine.s, g);
    return { attiva: true, tipo: 0x04, inizio: inizio, fine: fine, lba: lba, settori: ultimo - lba + 1 };
  }

  // MBR di esempio: { byte, zone, partizioni }. zone[i] vale codice, testo, vuoto, tabella o firma.
  function settoreMbr(opz) {
    const o = opz || {};
    const b = new Uint8Array(SETTORE);
    const zone = new Array(SETTORE).fill('vuoto');
    const caso = lcg(7);
    MBR_INIZIO.forEach((x, i) => { b[i] = x; });
    for (let i = MBR_INIZIO.length; i < MBR_CODICE; i++) b[i] = caso();
    for (let i = 0; i < MBR_CODICE; i++) zone[i] = 'codice';
    MBR_MESSAGGI.forEach((m) => scriviTesto(b, zone, m[0], m[1]));
    const partizioni = [partizioneEsempio(), null, null, null];
    partizioni.forEach((p, i) => {
      voce(p).forEach((x, k) => { b[TABELLA + i * VOCE + k] = x; });
    });
    for (let i = TABELLA; i < FIRMA; i++) zone[i] = 'tabella';
    if (!o.senzaFirma) { b[FIRMA] = 0x55; b[FIRMA + 1] = 0xAA; }
    zone[FIRMA] = zone[FIRMA + 1] = o.senzaFirma ? 'nofirma' : 'firma';
    return { byte: b, zone: zone, partizioni: partizioni };
  }

  // Settore di avvio del dischetto del DOS 1.0 (1981), semplificato: codice, poi zeri; niente tabella né firma.
  function settoreDischetto() {
    const b = new Uint8Array(SETTORE);
    const zone = new Array(SETTORE).fill('vuoto');
    const caso = lcg(1981);
    const inizio = [0xEB, 0x2F, 0x14, 0x00, 0x00, 0x00, 0x60, 0x00, 0xFA, 0x33, 0xC0, 0x8E, 0xD0, 0xBC, 0x00, 0x7C];
    const fineCodice = 0x150;
    for (let i = 0; i < fineCodice; i++) { b[i] = i < inizio.length ? inizio[i] : caso(); zone[i] = 'codice'; }
    zone[FIRMA] = zone[FIRMA + 1] = 'nofirma';
    return { byte: b, zone: zone, partizioni: [] };
  }

  // Avviabile per il BIOS che controlla la firma: 512 byte che finiscono con 55h AAh.
  function avviabile(settore) {
    return !!settore && settore.length === SETTORE && settore[FIRMA] === 0x55 && settore[FIRMA + 1] === 0xAA;
  }

  function contaZone(zone) {
    const n = {};
    zone.forEach((z) => { n[z] = (n[z] || 0) + 1; });
    return n;
  }

  /* ---------- Secure Boot: impronta e verifica (versione semplificata) ---------- */

  // FNV-1a a 32 bit: cambia del tutto anche se cambia un solo bit. I veri firmware usano SHA-256 e firme RSA.
  function impronta(byte) {
    let h = 0x811C9DC5;
    for (let i = 0; i < byte.length; i++) {
      h ^= byte[i] & 0xFF;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function daTesto(t) { return Array.from(t, (c) => c.charCodeAt(0) & 0xFF); }

  // I primi 32 byte di un file .efi: l'intestazione «MZ» che hanno tutti i programmi in formato PE.
  const CARICATORE = [
    0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00,
    0xB8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ];
  const BYTE_MANOMESSO = 20; // il byte che cambia nella copia manomessa

  function caricatore(manomesso) {
    const b = CARICATORE.slice();
    if (manomesso) b[BYTE_MANOMESSO] = 0xEB;
    return b;
  }

  const FIRMA_CARICATORE = impronta(CARICATORE); // l'impronta che il produttore ha firmato

  function verificaFirma(byte, firmata) {
    return impronta(byte) === (firmata == null ? FIRMA_CARICATORE : firmata);
  }

  /* ---------- il POST ---------- */

  const POST_IBM = [
    { id: 'cpu', nome: 'Processore 8088', dettaglio: 'registri e flag' },
    { id: 'rom', nome: 'ROM del BIOS', dettaglio: 'somma di controllo degli 8 KB' },
    { id: 'timer', nome: 'Timer 8253 e DMA 8237', dettaglio: 'contano e trasferiscono' },
    { id: 'ram16', nome: 'Primi 16 KB di memoria', dettaglio: 'scrive e rilegge' },
    { id: 'pic', nome: 'Interruzioni 8259', dettaglio: 'il controllore delle richieste' },
    { id: 'video', nome: 'Scheda video', dettaglio: 'compare il cursore' },
    { id: 'ram', nome: 'Resto della memoria', dettaglio: 'fino a 64 KB sulla scheda madre' },
    { id: 'tastiera', nome: 'Tastiera', dettaglio: 'risponde al reset?' },
    { id: 'dischetti', nome: 'Unità a dischetti', dettaglio: 'controller e motore' },
  ];

  const POST_COMPATIBILE = [
    { id: 'cpu', nome: 'Processore 80386', dettaglio: 'registri e modalità' },
    { id: 'rom', nome: 'ROM del BIOS', dettaglio: 'somma di controllo' },
    { id: 'cmos', nome: 'Memoria CMOS', dettaglio: 'impostazioni e batteria' },
    { id: 'video', nome: 'BIOS della scheda VGA', dettaglio: 'una ROM che inizia con 55h AAh' },
    { id: 'ram', nome: 'Memoria', dettaglio: '640 KB + 3 MB, contati a schermo' },
    { id: 'tastiera', nome: 'Tastiera', dettaglio: 'controller 8042' },
    { id: 'dischi', nome: 'Dischetto e disco rigido', dettaglio: 'A: e C: rispondono' },
  ];

  // Codici di errore del POST dell'IBM PC (numeri a tre cifre e bip).
  const ERRORI_IBM = {
    '101': 'scheda madre',
    '201': 'memoria',
    '301': 'tastiera',
    '601': 'dischetti',
  };

  const BIP_IBM = [
    { bip: '1 breve', significato: 'tutto a posto' },
    { bip: '2 brevi', significato: 'errore, con il codice sullo schermo' },
    { bip: '1 lungo e 1 breve', significato: 'guasto della scheda madre' },
    { bip: '1 lungo e 2 brevi', significato: 'guasto della scheda video' },
    { bip: 'nessuno', significato: 'alimentatore o scheda madre' },
  ];

  /* ---------- le fasi degli scenari ---------- */

  // nome: etichetta corta per la linea delle fasi; titolo e testo: la spiegazione; dove/indirizzo: le letture;
  // durata: millisecondi dell'animazione (ritmo del laboratorio, non tempi reali).
  const F = {
    corrente1981: { id: 'corrente', nome: 'Corrente', titolo: 'Arriva la corrente', dove: 'Alimentatore', indirizzo: '—', durata: 1500,
      testo: 'La levetta rossa sul fianco dell\'IBM PC accende l\'alimentatore. Per una frazione di secondo le tensioni non sono stabili, e il segnale <strong>Power Good</strong> resta basso: il generatore di clock 8284 tiene l\'8088 bloccato in reset. Intanto il tubo catodico si scalda.' },
    reset1981: { id: 'reset', nome: 'Reset', titolo: 'Il processore si sveglia', dove: 'ROM del BIOS', indirizzo: 'FFFF:0000', durata: 1300,
      testo: 'Power Good sale e l\'8088 esce dal reset. Va a prendere la prima istruzione sempre allo stesso indirizzo, <strong>FFFF0h</strong>, 16 byte prima della fine del suo megabyte. Lì c\'è la ROM del BIOS, e in 16 byte c\'è posto solo per un salto: JMP F000:E05B, l\'inizio del programma vero.' },
    postIbm: { id: 'post', nome: 'POST', titolo: 'Il POST, l\'autodiagnosi', dove: 'ROM del BIOS', indirizzo: 'F000:E05B', durata: 4200,
      testo: 'Il <strong>POST</strong> (power-on self-test) prova i componenti uno dopo l\'altro, dai più essenziali: processore, ROM, timer, memoria, interruzioni, video, tastiera, dischetti. Sull\'IBM PC lo schermo mostra solo il cursore: l\'elenco del pannello racconta che cosa succede dentro.' },
    bip: { id: 'bip', nome: 'Bip', titolo: 'Un bip breve: tutto a posto', dove: 'Altoparlante', indirizzo: 'F000', durata: 1000,
      testo: 'Un <strong>bip breve</strong> dall\'altoparlante vuol dire che il POST non ha trovato errori. Accendi il suono per sentirlo: è un\'onda quadra a circa 900 Hz, prodotta dal timer 8253.' },
    int19Dischetto: { id: 'settore', nome: 'Settore', titolo: 'INT 19h: il primo settore del dischetto', dove: 'Dischetto A:', indirizzo: '0000:7C00', durata: 2600,
      testo: 'Il BIOS esegue l\'interruzione <strong>19h</strong>: legge il settore 1 della traccia 0 del dischetto (512 byte) e lo copia all\'indirizzo <strong>0000:7C00</strong>. Guarda gli ultimi due byte: nel 1981 il DOS non scriveva nessuna firma, e il BIOS non la controllava.' },
    salto1981: { id: 'salto', nome: '7C00', titolo: 'Salto a 0000:7C00', dove: 'RAM', indirizzo: '0000:7C00', durata: 1500,
      testo: 'Il BIOS salta a <strong>0000:7C00</strong> e da qui comanda il codice del dischetto. Quei 512 byte sanno fare una cosa sola: caricare in memoria i due file del sistema, IBMBIO.COM e IBMDOS.COM, e passare loro il comando.' },
    dos1: { id: 'dos', nome: 'DOS', titolo: 'Il PC DOS 1.00 è pronto', dove: 'RAM', indirizzo: '—', durata: 3600,
      testo: 'Parte l\'interprete dei comandi, COMMAND.COM. Il PC non aveva un orologio a batteria, e il PC DOS 1.00 chiedeva la data a ogni avvio. Poi il prompt <strong>A&gt;</strong>: il computer aspetta i comandi.' },
    int19Vuoto: { id: 'settore', nome: 'Dischetto', titolo: 'INT 19h: nessun dischetto', dove: 'Dischetto A:', indirizzo: '—', durata: 2000,
      testo: 'Il BIOS prova a leggere il dischetto, ma l\'unità è vuota. Riprova qualche volta, poi si arrende e chiama l\'interruzione <strong>18h</strong>.' },
    basic: { id: 'basic', nome: 'BASIC', titolo: 'INT 18h: il BASIC in ROM', dove: 'ROM del BASIC', indirizzo: 'F600:0000', durata: 2400,
      testo: 'L\'IBM PC non si arrende: avvia il <strong>BASIC</strong> registrato in quattro ROM della scheda madre (32 KB). Si può programmare subito, con 61.404 byte liberi sui 64 KB, e salvare i programmi su cassetta, senza nessun disco. Il «C» di C1.00 sta per <em>Cassette</em>.' },
    postRam: { id: 'post', nome: 'POST', titolo: 'Il POST trova un guasto', dove: 'ROM del BIOS', indirizzo: 'F000:E05B', durata: 3600, esito: 'errore',
      testo: 'Il POST scrive valori di prova in ogni cella di memoria e li rilegge. Nel blocco che comincia a 32 KB un bit torna diverso da come era stato scritto: un chip di memoria è guasto.' },
    errore: { id: 'errore', nome: 'Errore', titolo: 'Due bip e il codice 201', dove: 'ROM del BIOS', indirizzo: '—', durata: 1600, esito: 'errore',
      testo: '<strong>Due bip brevi</strong> e un codice sullo schermo: <strong>201</strong> vuol dire «memoria». Le cifre prima del codice dicono al tecnico quale chip sostituire: 08 è il blocco di memoria che comincia a 32 KB (segmento 0800h), 40 il bit sbagliato (40h, il bit 6). Con un chip guasto il PC non è affidabile: il laboratorio si ferma qui.' },

    correnteAT: { id: 'corrente', nome: 'Corrente', titolo: 'Arriva la corrente', dove: 'Alimentatore', indirizzo: '—', durata: 1400,
      testo: 'Il tasto sul frontale accende l\'alimentatore. Come nel 1981, finché le tensioni non sono stabili il segnale <strong>Power Good</strong> resta basso e il processore aspetta in reset.' },
    reset386: { id: 'reset', nome: 'Reset', titolo: 'Il 386 parte da FFFFFFF0h', dove: 'ROM del BIOS', indirizzo: 'FFFFFFF0h', durata: 1300,
      testo: 'Un 80386 esce dal reset all\'indirizzo <strong>FFFFFFF0h</strong>, 16 byte sotto i 4 GB: lo stesso trucco dell\'8088, spostato in cima a uno spazio più grande. Il chipset fa comparire lì una copia della ROM del BIOS.' },
    postCompatibile: { id: 'post', nome: 'POST', titolo: 'Il POST conta la memoria', dove: 'ROM del BIOS', indirizzo: 'F000:E05B', durata: 4400,
      testo: 'Su un compatibile di fine anni Ottanta il POST si vede: il BIOS cerca e avvia la ROM della scheda VGA (comincia anch\'essa con 55h AAh), poi conta i kilobyte di memoria provati. Premendo Canc si entra nel <strong>setup</strong>, che legge e scrive le impostazioni nella memoria CMOS tenuta in vita dalla batteria.' },
    int19Disco: { id: 'settore', nome: 'MBR', titolo: 'INT 19h: l\'MBR del disco rigido', dove: 'Disco C:', indirizzo: '0000:7C00', durata: 3000,
      testo: 'Niente dischetto in A:, allora il BIOS legge il primo settore del disco rigido, il <strong>master boot record</strong>: fino a 446 byte di codice, la tabella delle partizioni (byte 446–509, quattro voci da 16 byte) e la firma <strong>55h AAh</strong> nei byte 510 e 511. La firma c\'è: il disco è avviabile.' },
    catena: { id: 'salto', nome: '7C00', titolo: 'La catena: MBR, partizione, DOS', dove: 'RAM', indirizzo: '0000:7C00', durata: 2000,
      testo: 'Il codice dell\'MBR si copia più in basso (a 0000:0600), cerca nella tabella la partizione attiva (80h), legge dove comincia (cilindro 0, testina 1, settore 1: il settore 17 del disco, contando da 0) e ne carica il primo settore, di nuovo a 7C00h. Ogni anello carica il successivo.' },
    dos3: { id: 'dos', nome: 'DOS', titolo: 'MS-DOS dal disco rigido', dove: 'RAM', indirizzo: '—', durata: 3000,
      testo: 'Il settore della partizione carica IO.SYS e MSDOS.SYS, che leggono CONFIG.SYS e avviano COMMAND.COM. Senza un file AUTOEXEC.BAT il DOS chiede data e ora: l\'orologio CMOS le conosce già, basta premere Invio. Poi il prompt <strong>C&gt;</strong>: il sistema è partito dal disco rigido.' },

    correnteOggi: { id: 'corrente', nome: 'Corrente', titolo: 'Il tasto è solo un segnale', dove: 'Scheda madre', indirizzo: '—', durata: 1500,
      testo: 'L\'alimentatore ATX tiene sempre accesi 5 V di riposo (<em>standby</em>). Il tasto avvisa la scheda madre, che chiede all\'alimentatore di partire (PS_ON). Quando le tensioni sono stabili arriva <strong>PWR_OK</strong>, il Power Good di oggi. Prima del processore principale si sveglia un piccolo processore di servizio (il Management Engine di Intel o il Platform Security Processor di AMD).' },
    sec: { id: 'sec', nome: 'SEC', titolo: 'SEC: sicurezza, senza memoria', dove: 'Flash SPI', indirizzo: 'FFFFFFF0h', durata: 1700,
      testo: 'Il processore parte ancora 16 byte sotto i 4 GB, dove compare il chip di memoria flash del firmware (collegato con il bus SPI). La RAM non funziona ancora: nella fase <strong>SEC</strong> (<em>security</em>) il firmware usa come memoria provvisoria la cache del processore e controlla il codice che eseguirà dopo.' },
    pei: { id: 'pei', nome: 'PEI', titolo: 'PEI: la memoria si sveglia', dove: 'Flash SPI e cache', indirizzo: '—', durata: 2400,
      testo: 'Nella fase <strong>PEI</strong> (<em>pre-EFI initialization</em>) piccoli moduli preparano processore e chipset e soprattutto la memoria: il firmware legge le caratteristiche dei moduli attraverso l\'SMBus, il bus di servizio della scheda madre, e «addestra» i segnali, regolando i tempi di ogni linea. Da qui in poi c\'è la RAM.' },
    dxe: { id: 'dxe', nome: 'DXE', titolo: 'DXE: centinaia di driver', dove: 'RAM', indirizzo: '—', durata: 2600,
      testo: 'Nella fase <strong>DXE</strong> (<em>driver execution environment</em>) il firmware diventa un piccolo sistema operativo: carica i driver per PCI Express, USB, dischi NVMe, rete. Quando parte il driver video (GOP, <em>graphics output protocol</em>) compare il logo del produttore.' },
    bds: { id: 'bds', nome: 'BDS', titolo: 'BDS: il gestore di avvio', dove: 'RAM', indirizzo: '—', durata: 2200,
      testo: 'La fase <strong>BDS</strong> (<em>boot device selection</em>) legge nella flash la variabile BootOrder, prova le voci di avvio in quell\'ordine e trova sul disco GPT la <strong>partizione di sistema EFI</strong>: una partizione FAT32 con i caricatori come normali file .efi.' },
    firmaOk: { id: 'firma', nome: 'Firma', titolo: 'Secure Boot: firma valida', dove: 'RAM', indirizzo: '—', durata: 2400,
      testo: 'Prima di eseguire il caricatore, <strong>Secure Boot</strong> ne calcola l\'impronta digitale e la confronta con quella firmata da chi l\'ha scritto (Microsoft, per Windows), il cui certificato è nella banca dati db e non nella lista delle firme revocate, dbx. Coincidono: ✓ il caricatore può partire.' },
    firmaKo: { id: 'firma', nome: 'Firma', titolo: 'Secure Boot: firma non valida', dove: 'RAM', indirizzo: '—', durata: 2400, esito: 'errore',
      testo: 'Qualcuno ha modificato un solo byte del caricatore, come farebbe un <em>bootkit</em>, un virus che si annida prima del sistema operativo. L\'impronta calcolata non coincide più con quella firmata: ✗ <strong>Secure Boot blocca l\'avvio</strong> e mostra un avviso.' },
    caricatore: { id: 'caricatore', nome: 'Caricatore', titolo: 'Il caricatore carica il kernel', dove: 'RAM', indirizzo: '—', durata: 2200,
      testo: 'Il caricatore (per esempio bootmgfw.efi di Windows, o GRUB su Linux) legge dal disco il nucleo del sistema operativo, il <strong>kernel</strong>, e i driver essenziali. Poi chiama ExitBootServices: da qui il sistema operativo è padrone della macchina.' },
    os: { id: 'os', nome: 'Sistema', titolo: 'Il sistema operativo è partito', dove: 'RAM', indirizzo: '—', durata: 2400,
      testo: 'Il kernel avvia i suoi driver e i servizi e mostra la schermata di accesso. Del firmware restano solo pochi servizi (l\'orologio, le variabili) e le <strong>tabelle ACPI</strong>, che descrivono l\'hardware e la gestione dell\'energia.' },
  };

  const SCENARI = {
    ibm: { id: 'ibm', modo: 'bios', etichetta: 'IBM PC 1981', macchina: 'IBM PC 5150 (1981) con 64 KB, PC DOS 1.00 su dischetto',
      post: 'ibm', fasi: [F.corrente1981, F.reset1981, F.postIbm, F.bip, F.int19Dischetto, F.salto1981, F.dos1] },
    'ibm-vuoto': { id: 'ibm-vuoto', modo: 'bios', etichetta: 'Senza dischetto', macchina: 'IBM PC 5150 (1981) con 64 KB, unità A: vuota',
      post: 'ibm', fasi: [F.corrente1981, F.reset1981, F.postIbm, F.bip, F.int19Vuoto, F.basic] },
    'ibm-ram': { id: 'ibm-ram', modo: 'bios', etichetta: 'Memoria guasta', macchina: 'IBM PC 5150 (1981) con un chip di memoria guasto',
      post: 'ibm', fasi: [F.corrente1981, F.reset1981, F.postRam, F.errore] },
    compatibile: { id: 'compatibile', modo: 'bios', etichetta: 'Compatibile 1989', macchina: 'PC compatibile con 80386 (1989), MS-DOS 3.30 su disco rigido',
      post: 'compatibile', fasi: [F.correnteAT, F.reset386, F.postCompatibile, F.bip, F.int19Disco, F.catena, F.dos3] },
    uefi: { id: 'uefi', modo: 'uefi', etichetta: 'Firma valida', macchina: 'PC di oggi con UEFI e Secure Boot attivo',
      fasi: [F.correnteOggi, F.sec, F.pei, F.dxe, F.bds, F.firmaOk, F.caricatore, F.os] },
    'uefi-ko': { id: 'uefi-ko', modo: 'uefi', etichetta: 'Firma non valida', macchina: 'PC di oggi con UEFI: il caricatore è stato manomesso',
      fasi: [F.correnteOggi, F.sec, F.pei, F.dxe, F.bds, F.firmaKo] },
  };

  const MODI = {
    bios: { id: 'bios', etichetta: 'Ieri: BIOS', scenari: ['ibm', 'ibm-vuoto', 'ibm-ram', 'compatibile'] },
    uefi: { id: 'uefi', etichetta: 'Oggi: UEFI', scenari: ['uefi', 'uefi-ko'] },
  };

  function durataTotale(idScenario) {
    return SCENARI[idScenario].fasi.reduce((t, f) => t + f.durata, 0);
  }

  /* ---------- schermate di testo (righe del monitor) ---------- */

  const SCHERMI = {
    dosData: 'Enter today\'s date (m-d-y): ',
    dataLancio: '8-12-1981', // il giorno della presentazione dell'IBM PC
    dos1: ['', 'The IBM Personal Computer DOS', 'Version 1.00 (C)Copyright IBM Corp 1981', '', 'A>'],
    basic: ['The IBM Personal Computer Basic', 'Version C1.00 Copyright IBM Corp 1981', '61404 Bytes free', 'Ok'],
    tastiBasic: '1LIST  2RUN← 3LOAD" 4SAVE" 5CONT←',
    errore: ['0840 201'],
    compatibileTesta: ['386 Compatible BIOS (C) 1989', ''],
    memoria: { base: 640, estesa: 3072 },
    setup: 'Press DEL to enter SETUP',
    dos3: ['Current date is Tue 10-24-1989', 'Enter new date (mm-dd-yy): ', 'Current time is  8:30:12.05', 'Enter new time: ', '', 'Microsoft(R) MS-DOS(R)  Version 3.30', '(C)Copyright Microsoft Corp 1981-1987', '', 'C>'],
    secureBoot: ['Secure Boot Violation', 'Invalid signature detected.', 'Check Secure Boot Policy in Setup'],
  };

  // Voci di avvio (variabili Boot####) nella flash del firmware.
  const VOCI_AVVIO = [
    { id: 'Boot0001', nome: 'Windows Boot Manager', file: '\\EFI\\Microsoft\\Boot\\bootmgfw.efi' },
    { id: 'Boot0002', nome: 'ubuntu (GRUB)', file: '\\EFI\\ubuntu\\shimx64.efi' },
    { id: 'Boot0003', nome: 'Chiavetta USB', file: '\\EFI\\BOOT\\BOOTX64.EFI' },
  ];

  // Partizioni di un disco GPT di oggi: la partizione di sistema EFI è piccola e formattata FAT32.
  const DISCO_GPT = [
    { nome: 'Partizione di sistema EFI', sigla: 'ESP', dim: '100 MB', fs: 'FAT32' },
    { nome: 'Riservata Microsoft', sigla: 'MSR', dim: '16 MB', fs: '—' },
    { nome: 'Windows', sigla: 'C:', dim: '930 GB', fs: 'NTFS' },
  ];

  const api = {
    SETTORE: SETTORE,
    TABELLA: TABELLA,
    VOCE: VOCE,
    VOCI: VOCI,
    FIRMA: FIRMA,
    CARICAMENTO: CARICAMENTO,
    VETTORE_8088: fisico(0xFFFF, 0x0000),
    VETTORE_386: 0xFFFFFFF0,
    GEOMETRIE: GEOMETRIE,
    TIPI: TIPI,
    esa: esa,
    fisico: fisico,
    segOff: segOff,
    chsInLba: chsInLba,
    lbaInChs: lbaInChs,
    settoriTotali: settoriTotali,
    codificaChs: codificaChs,
    decodificaChs: decodificaChs,
    limiteMbr: limiteMbr,
    leggiU32: leggiU32,
    voce: voce,
    leggiVoce: leggiVoce,
    partizioneEsempio: partizioneEsempio,
    settoreMbr: settoreMbr,
    settoreDischetto: settoreDischetto,
    avviabile: avviabile,
    contaZone: contaZone,
    impronta: impronta,
    daTesto: daTesto,
    caricatore: caricatore,
    BYTE_MANOMESSO: BYTE_MANOMESSO,
    FIRMA_CARICATORE: FIRMA_CARICATORE,
    verificaFirma: verificaFirma,
    POST_IBM: POST_IBM,
    POST_COMPATIBILE: POST_COMPATIBILE,
    ERRORI_IBM: ERRORI_IBM,
    BIP_IBM: BIP_IBM,
    SCENARI: SCENARI,
    MODI: MODI,
    durataTotale: durataTotale,
    SCHERMI: SCHERMI,
    VOCI_AVVIO: VOCI_AVVIO,
    DISCO_GPT: DISCO_GPT,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['avvio'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
