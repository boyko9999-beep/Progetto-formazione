/*
 * Storia del PC · capitolo 5 (scheda-madre): dati e logica pura, senza DOM.
 *
 * Quattro epoche di schede madri (1981, 1998, 2010, 2020): componenti, collegamenti
 * con la loro banda, percorsi dei dati dalla CPU ai dispositivi e disposizioni dello
 * schema a blocchi (larga e stretta). Più gli strumenti che servono al laboratorio:
 * calcolo delle bande, scala logaritmica degli spessori, tempi di trasferimento,
 * formattazione all'italiana e geometria dei percorsi ad angolo retto.
 *
 * Unità: 1 kB = 1.000 byte, 1 MB = 1.000.000 di byte, 1 GB = 1.000.000.000 di byte.
 * Le bande sono in byte al secondo; per i collegamenti a doppio senso (PCI Express,
 * DMI) è la banda in una direzione.
 */
(function (root) {
  'use strict';

  const kB = 1e3;
  const MB = 1e6;
  const GB = 1e9;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ---------- calcolo delle bande (byte al secondo) ---------- */

  // PCI Express: velocità di linea (miliardi di trasferimenti al secondo) ed efficienza della codifica.
  const PCIE = {
    1: { gt: 2.5, eff: 8 / 10 },
    2: { gt: 5, eff: 8 / 10 },
    3: { gt: 8, eff: 128 / 130 },
    4: { gt: 16, eff: 128 / 130 },
    5: { gt: 32, eff: 128 / 130 },
  };

  const banda = {
    // Bus parallelo: larghezza in bit, clock in MHz, trasferimenti per ciclo di clock.
    parallelo(bit, mhz, perCiclo) { return (bit / 8) * mhz * 1e6 * (perCiclo || 1); },
    // L'8088 impiega almeno 4 cicli di clock per ogni byte che passa sul bus.
    bus8088(mhz) { return mhz * 1e6 / 4; },
    // Linea seriale: bit al secondo e bit spediti per ogni byte utile (10 con start e stop).
    seriale(bitAlSecondo, bitPerByte) { return bitAlSecondo / (bitPerByte || 8); },
    // Linea seriale veloce con codifica (per esempio 8b/10b: efficienza 0,8).
    codificata(gbit, eff) { return gbit * 1e9 * eff / 8; },
    // PCI Express: byte al secondo in una direzione.
    pcie(gen, corsie) {
      const g = PCIE[gen];
      if (!g) throw new Error('Generazione PCI Express sconosciuta: ' + gen);
      return g.gt * 1e9 * g.eff / 8 * (corsie || 1);
    },
    // Memoria DDR: milioni di trasferimenti al secondo, canali, bit per canale.
    ddr(mts, canali, bit) { return mts * 1e6 * ((bit || 64) / 8) * (canali || 1); },
  };

  /* ---------- scala logaritmica: spessori e velocità ---------- */

  // Dominio della scala: da 500 B/s (sotto la porta seriale) a 100 GB/s.
  const SCALA = { min: 500, max: 1e11, spessoreMin: 2, spessoreMax: 17, velMin: 46, velMax: 300 };

  // Posizione (0-1) di una banda sulla scala logaritmica: ogni fattore 10 vale lo stesso passo.
  function frazioneLog(b) {
    if (!(b > 0)) return 0;
    const lg = Math.log10;
    return clamp((lg(b) - lg(SCALA.min)) / (lg(SCALA.max) - lg(SCALA.min)), 0, 1);
  }

  // Spessore del collegamento nello schema (unità del viewBox).
  function spessore(b) { return SCALA.spessoreMin + (SCALA.spessoreMax - SCALA.spessoreMin) * frazioneLog(b); }

  // Velocità dei pacchetti animati (unità del viewBox al secondo).
  function velocita(b) { return SCALA.velMin + (SCALA.velMax - SCALA.velMin) * frazioneLog(b); }

  /* ---------- tempi e formattazione all'italiana ---------- */

  function tempo(byte, bandaBps) { return bandaBps > 0 ? byte / bandaBps : Infinity; }

  const cacheNf = {};
  function numero(n, decimali) {
    const k = 'd' + decimali;
    if (!cacheNf[k]) cacheNf[k] = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: decimali });
    return cacheNf[k].format(n);
  }

  // Tre cifre significative: 1,19 · 31,3 · 133 · 800.
  function tre(n) { return numero(Number(n.toPrecision(3)), 2); }

  function formattaBanda(b) {
    const unita = [[GB, 'GB/s'], [MB, 'MB/s'], [kB, 'kB/s'], [1, 'B/s']];
    for (let i = 0; i < unita.length; i++) {
      const [u, nome] = unita[i];
      if (b >= u || i === unita.length - 1) {
        const v = Number((b / u).toPrecision(3));
        if (v >= 1000 && i > 0) return tre(v / 1000) + ' ' + unita[i - 1][1];
        return tre(v) + ' ' + nome;
      }
    }
    return '';
  }

  function formattaByte(n) {
    if (n >= GB) return numero(n / GB, 1) + ' GB';
    if (n >= MB) return numero(n / MB, 1) + ' MB';
    if (n >= kB) return numero(n / kB, 1) + ' kB';
    return numero(n, 0) + ' byte';
  }

  function formattaTempo(s) {
    if (!isFinite(s)) return 'mai';
    if (s <= 0) return '0 s';
    if (s < 1e-3) { const us = s * 1e6; return numero(us, us < 10 ? 1 : 0) + ' µs'; }
    if (s < 1) { const ms = s * 1e3; return numero(ms, ms < 10 ? 1 : 0) + ' ms'; }
    if (s < 10) return numero(s, 2) + ' s';
    if (s < 59.95) return numero(s, 1) + ' s';
    if (s < 3600) {
      let m = Math.floor(s / 60);
      let r = Math.round(s - m * 60);
      if (r === 60) { m += 1; r = 0; }
      if (m === 60) return '1 h';
      return m + ' min' + (r ? ' ' + r + ' s' : '');
    }
    if (s < 86400) {
      let hh = Math.floor(s / 3600);
      let m = Math.round((s - hh * 3600) / 60);
      if (m === 60) { hh += 1; m = 0; }
      if (hh === 24) return '1 giorno';
      return hh + ' h' + (m ? ' ' + m + ' min' : '');
    }
    let g = Math.floor(s / 86400);
    let hh = Math.round((s - g * 86400) / 3600);
    if (hh === 24) { g += 1; hh = 0; }
    return g + (g === 1 ? ' giorno' : ' giorni') + (hh ? ' ' + hh + ' h' : '');
  }

  /* ---------- flussi di dati e dimensioni dei file ---------- */

  const FLUSSI = [
    { id: 'memoria', nome: 'Memoria', destinazione: 'ram', verso: 'la memoria', colore: 'var(--trace-1)' },
    { id: 'grafica', nome: 'Grafica', destinazione: 'gpu', verso: 'la scheda video', colore: 'var(--trace-3)' },
    { id: 'disco', nome: 'Disco', destinazione: 'disco', verso: 'il disco', colore: 'var(--trace-2)' },
    { id: 'periferiche', nome: 'Periferiche', destinazione: 'usb', verso: 'le periferiche', colore: 'var(--trace-4)' },
  ];

  // Quale flusso raccontare quando si sceglie un collegamento con un certo ruolo.
  const FLUSSO_DI_RUOLO = { bus: 'memoria', cpu: 'memoria', mem: 'memoria', gfx: 'grafica', hub: 'disco', disco: 'disco', usb: 'periferiche' };

  const DIMENSIONI = [
    { id: 'foto', nome: 'Foto', byte: 5 * MB, testo: 'una foto da 5 MB' },
    { id: 'film', nome: 'Film', byte: 1 * GB, testo: 'un film da 1 GB' },
    { id: 'gioco', nome: 'Gioco', byte: 50 * GB, testo: 'un videogioco da 50 GB' },
  ];

  // Identificativi delle lezioni di BusLab (../../index.html#/bus/<id>).
  const BUSLAB = ['uart', 'rs232', 'rs485', 'midi', 'i2c', 'smbus', 'i3c', 'spi', 'onewire', 'i2s', 'jtag', 'axi', 'unibus', 's100', 'isa', 'scsi', 'pci', 'pcie', 'sata', 'gpib', 'centronics', 'usb', 'firewire', 'thunderbolt', 'mil1553', 'modbus', 'can', 'lin', 'profibus', 'flexray', 'ethernet'];

  /* ---------- le quattro epoche ---------- */

  const EPOCHE = [
    {
      id: '1981',
      anno: 1981,
      titolo: 'Un bus per tutti',
      breve: 'bus unico',
      esempio: 'IBM PC 5150 (agosto 1981)',
      racconto: '<strong>1981, IBM PC.</strong> Una sola strada per tutti: processore, memoria e schede negli slot si passano i dati sullo stesso bus a 8 bit, circa 1 MB/s. Il bus è condiviso: passa un dato alla volta e gli altri aspettano in fila.',
      nodi: {
        cpu: { nome: 'CPU', sotto: 'Intel 8088' },
        ram: { nome: 'Memoria', sotto: '16–64 KB' },
        sb: { nome: 'Chip di supporto', nomeBreve: 'Supporto', sotto: 'DMA, timer, BIOS' },
        gpu: { nome: 'Scheda video', sotto: 'MDA o CGA' },
        disco: { nome: 'Floppy', sotto: 'dischi da 160 KB' },
        usb: { nome: 'Porte', sotto: 'RS-232, stampante' },
        bus: { nome: 'Bus di sistema', linea: true },
      },
      collegamenti: [
        {
          id: 'bus', bus: true, ruolo: 'bus', nome: 'Bus di sistema (I/O channel, poi ISA)', sigla: 'Bus di sistema', anno: 1981,
          banda: 1 * MB, stima: true, massimo: banda.bus8088(4.77), condiviso: 'bus', buslab: 'isa',
          formula: '4,77 MHz ÷ 4 cicli × 1 byte = 1,19 MB/s al massimo; stima prudente: circa 1 MB/s',
          testo: 'Otto linee di dati e venti di indirizzo uniscono il processore, la memoria e i cinque slot. L\'8088 impiega almeno 4 cicli di clock per ogni byte, quindi il massimo teorico è 1,19 MB/s; in pratica si va più piano, perché le schede lente aggiungono attese e il refresh della memoria dinamica occupa il bus a intervalli regolari. Per questo usiamo una stima prudente: circa 1 MB/s.',
        },
        { id: 'cpu', da: 'cpu', a: 'bus', gruppo: 'bus' },
        { id: 'mem', da: 'ram', a: 'bus', gruppo: 'bus' },
        { id: 'sup', da: 'sb', a: 'bus', gruppo: 'bus' },
        { id: 'gfx', da: 'gpu', a: 'bus', gruppo: 'bus' },
        {
          id: 'disco', da: 'disco', a: 'bus', ruolo: 'disco', nome: 'Floppy disk da 5,25 pollici', sigla: 'Floppy', anno: 1981,
          banda: banda.seriale(250e3, 8), buslab: null,
          formula: '250.000 bit/s ÷ 8 = 31.250 byte al secondo',
          testo: 'Il controller del floppy è una scheda in uno slot. Il dischetto gira a 300 giri al minuto e consegna 250.000 bit al secondo: circa 31 kB/s. Un dischetto conteneva 160 KB.',
        },
        {
          id: 'usb', da: 'usb', a: 'bus', ruolo: 'usb', nome: 'Porta seriale RS-232', sigla: 'RS-232', anno: 1981,
          banda: banda.seriale(9600, 10), buslab: 'rs232',
          formula: '9.600 bit/s ÷ 10 bit per carattere = 960 byte al secondo',
          testo: 'Anche la porta seriale sta su una scheda di espansione. Spedisce un bit alla volta: a 9.600 bit/s, con un bit di start e uno di stop per ogni carattere, passano 960 byte al secondo. Serviva per modem e stampanti.',
        },
      ],
      percorsi: { memoria: ['cpu', 'mem'], grafica: ['cpu', 'gfx'], disco: ['cpu', 'disco'], periferiche: ['cpu', 'usb'] },
    },
    {
      id: '1998',
      anno: 1998,
      titolo: 'Northbridge e southbridge',
      breve: 'due ponti',
      esempio: 'Pentium II con chipset Intel 440BX (aprile 1998)',
      racconto: '<strong>1998, Pentium II e chipset 440BX.</strong> Il bus unico si è diviso in due ponti. Il northbridge, vicino alla CPU, serve le strade veloci: memoria (800 MB/s) e scheda video AGP. Il southbridge raccoglie quelle lente: disco IDE, USB, ISA. Tra i due c\'è il bus PCI, condiviso con le schede negli slot.',
      nodi: {
        cpu: { nome: 'CPU', sotto: 'Pentium II' },
        nb: { nome: 'Northbridge', sotto: 'Intel 82443BX' },
        ram: { nome: 'Memoria', sotto: 'SDRAM PC100' },
        gpu: { nome: 'Scheda video', sotto: 'su slot AGP' },
        sb: { nome: 'Southbridge', sotto: 'Intel PIIX4' },
        disco: { nome: 'Disco rigido', sotto: 'IDE (PATA)' },
        usb: { nome: 'Periferiche', sotto: 'USB, tastiera' },
      },
      collegamenti: [
        {
          id: 'cpu', da: 'cpu', a: 'nb', ruolo: 'cpu', nome: 'Front side bus (FSB)', sigla: 'FSB', anno: 1998,
          banda: banda.parallelo(64, 100), buslab: null,
          formula: '100 MHz × 8 byte = 800 MB/s',
          testo: 'La strada tra il processore e il northbridge: 64 bit a 100 MHz. Tutto quello che la CPU legge o scrive, verso la memoria o verso le periferiche, passa di qui.',
        },
        {
          id: 'mem', da: 'nb', a: 'ram', ruolo: 'mem', nome: 'Bus della memoria SDRAM PC100', sigla: 'SDRAM', anno: 1998,
          banda: banda.parallelo(64, 100), buslab: null,
          formula: '100 MHz × 8 byte = 800 MB/s',
          testo: 'Il controller della memoria sta nel northbridge: da lì partono 64 linee di dati verso i moduli DIMM di SDRAM, sincronizzati con il clock a 100 MHz.',
        },
        {
          id: 'gfx', da: 'nb', a: 'gpu', ruolo: 'gfx', nome: 'AGP 2x (Accelerated Graphics Port)', sigla: 'AGP 2x', anno: 1997,
          banda: banda.parallelo(32, 200 / 3, 2), buslab: 'pci',
          formula: '66,7 MHz × 4 byte × 2 trasferimenti per ciclo = 533 MB/s',
          testo: 'Una porta tutta per la scheda video, derivata dal PCI ma a 66 MHz e non condivisa con nessuno. In modalità 2x passa due dati per ogni ciclo di clock.',
        },
        {
          id: 'hub', da: 'nb', a: 'sb', ruolo: 'hub', nome: 'Bus PCI (Peripheral Component Interconnect)', sigla: 'PCI', anno: 1992,
          banda: banda.parallelo(32, 100 / 3), condiviso: 'pci', buslab: 'pci',
          formula: '33,3 MHz × 4 byte = 133 MB/s',
          testo: 'Nel 440BX i due ponti sono uniti dal bus PCI stesso, condiviso con le schede negli slot: disco, USB, rete e audio fanno la fila sui suoi 133 MB/s.',
        },
        {
          id: 'disco', da: 'sb', a: 'disco', ruolo: 'disco', nome: 'IDE/ATA in modalità Ultra DMA/33', sigla: 'IDE', anno: 1997,
          banda: banda.parallelo(16, 50 / 3), buslab: 'sata',
          formula: '2 byte × 16,7 milioni di trasferimenti al secondo = 33,3 MB/s',
          testo: 'Un cavo piatto a 40 fili porta 16 bit alla volta verso il disco rigido. La modalità Ultra DMA/33, arrivata nei PC nel 1997, raddoppia la velocità precedente.',
        },
        {
          id: 'usb', da: 'sb', a: 'usb', ruolo: 'usb', nome: 'USB 1.x (Universal Serial Bus)', sigla: 'USB 1.x', anno: 1996,
          banda: banda.seriale(12e6, 8), buslab: 'usb',
          formula: '12 Mbit/s ÷ 8 = 1,5 MB/s',
          testo: 'La porta universale nata nel 1996 (la revisione 1.1 è del 1998): 12 Mbit/s, abbastanza per tastiera, mouse, stampanti e scanner. Il southbridge PIIX4 ne gestisce due.',
        },
      ],
      percorsi: { memoria: ['cpu', 'mem'], grafica: ['cpu', 'gfx'], disco: ['cpu', 'hub', 'disco'], periferiche: ['cpu', 'hub', 'usb'] },
    },
    {
      id: '2010',
      anno: 2010,
      titolo: 'Il northbridge entra nella CPU',
      breve: 'PCH',
      esempio: 'Intel Core i5 «Lynnfield» con chipset P55 (in vendita dal 2009)',
      racconto: '<strong>2010, Core i5 e PCH.</strong> Il northbridge è entrato nella CPU: memoria (21 GB/s) e scheda video (PCI Express x16) parlano direttamente con il processore. Sulla scheda resta un solo chip, il PCH, collegato con il DMI.',
      nodi: {
        cpu: { nome: 'CPU', sotto: 'Intel Core i5', contenitore: true },
        nb: { nome: 'Ex northbridge', sotto: 'memoria e PCIe' },
        ram: { nome: 'Memoria', sotto: 'DDR3, 2 canali' },
        gpu: { nome: 'Scheda video', sotto: 'PCIe 2.0 x16' },
        sb: { nome: 'PCH', sotto: 'Intel P55' },
        disco: { nome: 'Disco', sotto: 'SATA' },
        usb: { nome: 'Periferiche', sotto: 'USB 2.0' },
      },
      collegamenti: [
        {
          id: 'cpu', da: 'cpu', a: 'nb', interno: true, nome: 'Dentro la CPU',
          testo: 'Dentro la CPU i core passano le richieste alla parte che un tempo era il northbridge, sullo stesso pezzo di silicio.',
        },
        {
          id: 'mem', da: 'nb', a: 'ram', ruolo: 'mem', nome: 'Memoria DDR3-1333 a doppio canale', sigla: 'DDR3', anno: 2007,
          banda: banda.ddr(4000 / 3, 2), buslab: null,
          formula: '1.333 milioni di trasferimenti al secondo × 8 byte × 2 canali = 21,3 GB/s',
          testo: 'Il controller della memoria ora è nella CPU: due canali indipendenti da 64 bit, ciascuno con i suoi moduli DDR3. Per questo i moduli si montano a coppie.',
        },
        {
          id: 'gfx', da: 'nb', a: 'gpu', ruolo: 'gfx', nome: 'PCI Express 2.0 x16', sigla: 'PCIe x16', anno: 2007,
          banda: banda.pcie(2, 16), buslab: 'pcie',
          formula: '16 corsie × 500 MB/s = 8 GB/s per direzione',
          testo: 'Sedici corsie seriali vanno direttamente dal processore alla scheda video. Ogni corsia porta 500 MB/s in ciascuna direzione, nei due sensi insieme.',
        },
        {
          id: 'hub', da: 'nb', a: 'sb', ruolo: 'hub', nome: 'DMI (Direct Media Interface)', sigla: 'DMI', anno: 2004,
          banda: banda.pcie(1, 4), buslab: 'pcie',
          formula: '4 corsie × 250 MB/s = 1 GB/s per direzione',
          testo: 'Il cordone ombelicale tra CPU e PCH: in pratica quattro corsie PCI Express di prima generazione. Ci passa tutto il traffico di dischi, USB, rete e audio.',
        },
        {
          id: 'disco', da: 'sb', a: 'disco', ruolo: 'disco', nome: 'SATA a 3 Gbit/s', sigla: 'SATA', anno: 2004,
          banda: banda.codificata(3, 0.8), buslab: 'sata',
          formula: '3 Gbit/s × 8/10 (codifica 8b/10b) ÷ 8 = 300 MB/s',
          testo: 'Un cavo sottile a 7 fili al posto del cavo piatto: i bit viaggiano uno dopo l\'altro a 3 Gbit/s e, tolta la codifica, restano 300 MB/s.',
        },
        {
          id: 'usb', da: 'sb', a: 'usb', ruolo: 'usb', nome: 'USB 2.0', sigla: 'USB 2.0', anno: 2000,
          banda: banda.seriale(480e6, 8), buslab: 'usb',
          formula: '480 Mbit/s ÷ 8 = 60 MB/s',
          testo: 'I suoi 480 Mbit/s bastano per chiavette, dischi esterni e webcam. Il PCH P55 gestisce fino a 14 porte.',
        },
      ],
      percorsi: { memoria: ['cpu', 'mem'], grafica: ['cpu', 'gfx'], disco: ['cpu', 'hub', 'disco'], periferiche: ['cpu', 'hub', 'usb'] },
    },
    {
      id: '2020',
      anno: 2020,
      titolo: 'Tutto in un chip: il SoC',
      breve: 'SoC',
      esempio: 'Apple M1 (novembre 2020)',
      racconto: '<strong>2020, Apple M1.</strong> Quasi tutto è finito dentro un solo chip, il SoC: CPU, GPU, Neural Engine e controller. La memoria sta nello stesso package e la usano tutti (68 GB/s): la GPU non deve più ricevere copie dei dati.',
      nodi: {
        cpu: { nome: 'SoC', sotto: 'Apple M1', contenitore: true },
        nb: { nome: 'Controller', sotto: 'memoria e fabric', sottoBreve: 'memoria' },
        ram: { nome: 'Memoria', sotto: 'unificata' },
        gpu: { nome: 'GPU', sotto: '8 core' },
        npu: { nome: 'Neural', sotto: 'Engine' },
        sb: { nome: 'I/O', sotto: 'SSD, USB4' },
        disco: { nome: 'SSD', sotto: 'flash NAND' },
        usb: { nome: 'Periferiche', sotto: 'Thunderbolt/USB4' },
        pkg: { nome: 'un solo package' },
      },
      collegamenti: [
        {
          id: 'cpu', da: 'cpu', a: 'nb', interno: true, nome: 'Dentro il SoC',
          testo: 'Dentro il SoC i core della CPU, la GPU e gli altri blocchi comunicano attraverso una rete interna (fabric) che porta alla memoria.',
        },
        {
          id: 'mem', da: 'nb', a: 'ram', ruolo: 'mem', nome: 'Memoria unificata LPDDR4X-4266', sigla: 'LPDDR4X', anno: 2020,
          banda: banda.ddr(4266, 2, 64), buslab: null,
          formula: '4.266 milioni di trasferimenti al secondo × 16 byte (128 bit) = 68,3 GB/s',
          testo: 'La memoria sta nello stesso package del SoC, a pochi millimetri: 128 bit di dati condivisi da CPU, GPU e Neural Engine.',
        },
        {
          id: 'gfx', da: 'nb', a: 'gpu', ruolo: 'gfx', interno: true, zeroCopia: true, nome: 'GPU nel SoC: memoria unificata', sigla: 'stessa memoria', anno: 2020,
          banda: banda.ddr(4266, 2, 64), buslab: null,
          formula: 'nessuna copia: CPU e GPU leggono gli stessi byte nella memoria unificata (68,3 GB/s)',
          testo: 'La GPU è nello stesso chip e legge la stessa memoria della CPU: i dati da disegnare non vanno più copiati da una memoria all\'altra.',
        },
        {
          id: 'hub', da: 'nb', a: 'sb', interno: true, nome: 'Dentro il SoC',
          testo: 'Anche il vecchio southbridge è diventato un blocco del SoC: gestisce l\'SSD, le porte Thunderbolt e le altre periferiche.',
        },
        {
          id: 'disco', da: 'sb', a: 'disco', ruolo: 'disco', nome: 'SSD con il controller nel SoC', sigla: 'SSD', anno: 2020,
          banda: 2.8 * GB, stima: true, buslab: null,
          formula: 'Apple non dichiara la velocità: le misure in lettura danno circa 2,7–3,5 GB/s',
          testo: 'Il controller dell\'SSD è dentro il SoC e parla il protocollo NVMe; i chip di memoria flash sono sulla scheda, accanto. Qui usiamo 2,8 GB/s, un valore tipico delle prove in lettura.',
        },
        {
          id: 'usb', da: 'sb', a: 'usb', ruolo: 'usb', nome: 'Thunderbolt 3 e USB4', sigla: 'USB4', anno: 2019,
          banda: banda.seriale(40e9, 8), buslab: 'thunderbolt',
          formula: '40 Gbit/s ÷ 8 = 5 GB/s (velocità massima dichiarata)',
          testo: 'Due porte USB-C con Thunderbolt 3 e USB4 a 40 Gbit/s: ci passano dischi esterni, monitor e alimentazione.',
        },
      ],
      percorsi: { memoria: ['cpu', 'mem'], grafica: ['cpu', 'gfx'], disco: ['cpu', 'hub', 'disco'], periferiche: ['cpu', 'hub', 'usb'] },
    },
  ];

  /* ---------- disposizioni dello schema a blocchi ---------- */

  function B(x, y, w, hh, o) { return { x: x, y: y, w: w, h: hh, o: o == null ? 1 : o }; }

  // Tutti i nodi che possono comparire: quelli assenti in un'epoca hanno opacità 0.
  const NODI = ['pkg', 'cpu', 'bus', 'nb', 'sb', 'ram', 'gpu', 'disco', 'usb', 'npu'];

  // Anche le posizioni nascoste contano: da lì i nodi compaiono o lì spariscono.
  const NASCOSTI = {
    larga: { bus: B(20, 226, 600, 0, 0), npu: B(240, 148, 88, 98, 0), pkg: B(104, 8, 528, 276, 0) },
    stretta: { bus: B(170, 52, 0, 486, 0), npu: B(224, 126, 88, 50, 0), pkg: B(4, 6, 332, 344, 0) },
  };

  // Ancore: 'l' 'r' 't' 'b' (lato, a metà), ['b', 0.3] (lato e frazione),
  // ['p', fx, fy, dir] (punto interno in frazioni del riquadro, con direzione di uscita),
  // 'proj' (proiezione sul bus, che è una linea). et = posizione dell'etichetta.
  const DISPOSIZIONI = {
    larga: {
      w: 640,
      h: 410,
      epoche: {
        1981: {
          nodi: {
            bus: B(20, 226, 600, 0),
            cpu: B(44, 66, 150, 66), ram: B(245, 66, 150, 66), sb: B(446, 66, 150, 66),
            gpu: B(44, 318, 150, 66), disco: B(245, 318, 150, 66), usb: B(446, 318, 150, 66),
            nb: B(270, 220, 100, 12, 0),
          },
          link: {
            bus: { et: { x: 220, y: 199, a: 'middle' } },
            cpu: { da: 'b', a: 'proj' }, mem: { da: 'b', a: 'proj' }, sup: { da: 'b', a: 'proj' },
            gfx: { da: 't', a: 'proj' }, disco: { da: 't', a: 'proj' }, usb: { da: 't', a: 'proj' },
          },
        },
        1998: {
          nodi: {
            cpu: B(245, 14, 150, 62), nb: B(236, 144, 168, 66), ram: B(484, 144, 140, 66), gpu: B(16, 144, 140, 66),
            sb: B(236, 296, 168, 66), disco: B(16, 296, 140, 66), usb: B(484, 296, 140, 66),
          },
          link: {
            cpu: { da: 'b', a: 't' }, mem: { da: 'r', a: 'l' }, gfx: { da: 'l', a: 'r' },
            hub: { da: 'b', a: 't' }, disco: { da: 'l', a: 'r' }, usb: { da: 'r', a: 'l' },
          },
          deco: { slot: { x: 320, ys: [234, 252, 270], lato: 'l' } },
        },
        2010: {
          nodi: {
            cpu: B(150, 8, 340, 162), nb: B(228, 100, 184, 56), ram: B(508, 95, 116, 66), gpu: B(16, 95, 116, 66),
            sb: B(236, 296, 168, 66), disco: B(16, 296, 140, 66), usb: B(484, 296, 140, 66),
          },
          link: {
            cpu: { da: ['p', 0.5, 76 / 162, 'b'], a: 't' },
            mem: { da: 'r', a: 'l' }, gfx: { da: 'l', a: 'r' }, hub: { da: 'b', a: 't' },
            disco: { da: 'l', a: 'r' }, usb: { da: 'r', a: 'l' },
          },
          deco: { core: { x: 228, y: 44, w: 184, h: 40, tipo: '4' } },
        },
        2020: {
          nodi: {
            pkg: B(104, 8, 528, 276), cpu: B(114, 20, 328, 240), nb: B(282, 58, 146, 60),
            gpu: B(130, 148, 100, 98), npu: B(240, 148, 88, 98), sb: B(334, 148, 100, 98),
            ram: B(516, 32, 108, 228), disco: B(196, 330, 150, 66), usb: B(400, 330, 150, 66),
          },
          link: {
            cpu: { da: ['p', (270 - 114) / 328, (88 - 20) / 240, 'r'], a: 'l' },
            mem: { da: 'r', a: ['l', (88 - 32) / 228] },
            gfx: { da: ['b', 0.2], a: 't' },
            hub: { da: ['b', 0.8], a: 't' },
            disco: { da: ['b', 0.3], a: 't', mid: 0.45, et: { x: 262, y: 305, a: 'end' } },
            usb: { da: ['b', 0.7], a: 't', mid: 0.6, et: { x: 485, y: 308, a: 'start' } },
          },
          deco: { core: { x: 130, y: 58, w: 140, h: 60, tipo: '4+4' } },
        },
      },
    },
    stretta: {
      w: 340,
      h: 548,
      epoche: {
        1981: {
          nodi: {
            bus: B(170, 52, 0, 486),
            cpu: B(8, 70, 130, 64), ram: B(202, 70, 130, 64),
            gpu: B(8, 250, 130, 64), sb: B(202, 250, 130, 64),
            disco: B(8, 430, 130, 64), usb: B(202, 430, 130, 64),
            nb: B(150, 280, 40, 24, 0),
          },
          link: {
            bus: { et: { x: 170, y: 20, a: 'middle' } },
            cpu: { da: 'r', a: 'proj' }, mem: { da: 'l', a: 'proj' }, gfx: { da: 'r', a: 'proj' }, sup: { da: 'l', a: 'proj' },
            disco: { da: 'r', a: 'proj', et: { x: 73, y: 514, a: 'middle' } },
            usb: { da: 'l', a: 'proj', et: { x: 267, y: 514, a: 'middle' } },
          },
        },
        1998: {
          nodi: {
            cpu: B(105, 8, 130, 54), nb: B(95, 110, 150, 58),
            gpu: B(8, 224, 130, 58), ram: B(202, 224, 130, 58),
            sb: B(95, 366, 150, 58), disco: B(8, 478, 130, 58), usb: B(202, 478, 130, 58),
          },
          link: {
            cpu: { da: 'b', a: 't' },
            gfx: { da: 'l', a: 't', et: { x: 86, y: 190, a: 'start' } },
            mem: { da: 'r', a: 't', et: { x: 254, y: 190, a: 'end' } },
            hub: { da: 'b', a: 't', et: { x: 180, y: 314, a: 'start' } },
            disco: { da: 'l', a: 't', et: { x: 86, y: 444, a: 'start' } },
            usb: { da: 'r', a: 't', et: { x: 254, y: 444, a: 'end' } },
          },
          deco: { slot: { x: 170, ys: [298, 314, 330], lato: 'l' } },
        },
        2010: {
          nodi: {
            cpu: B(56, 8, 228, 172), nb: B(90, 108, 160, 56),
            gpu: B(8, 236, 130, 58), ram: B(202, 236, 130, 58),
            sb: B(95, 372, 150, 58), disco: B(8, 482, 130, 58), usb: B(202, 482, 130, 58),
          },
          link: {
            cpu: { da: ['p', 0.5, 68 / 172, 'b'], a: 't' },
            gfx: { da: 'l', a: 't', et: { x: 86, y: 206, a: 'start' } },
            mem: { da: 'r', a: 't', et: { x: 254, y: 206, a: 'end' } },
            hub: { da: 'b', a: 't', et: { x: 180, y: 320, a: 'start' } },
            disco: { da: 'l', a: 't', et: { x: 86, y: 448, a: 'start' } },
            usb: { da: 'r', a: 't', et: { x: 254, y: 448, a: 'end' } },
          },
          deco: { core: { x: 90, y: 42, w: 160, h: 34, tipo: '4' } },
        },
        2020: {
          nodi: {
            pkg: B(4, 6, 332, 344), ram: B(14, 16, 312, 52), cpu: B(14, 92, 312, 230),
            nb: B(124, 126, 92, 50), npu: B(224, 126, 88, 50), gpu: B(28, 212, 130, 42), sb: B(28, 270, 284, 44),
            disco: B(8, 420, 150, 62), usb: B(182, 420, 150, 62),
          },
          link: {
            cpu: { da: ['p', (116 - 14) / 312, (151 - 92) / 230, 'r'], a: 'l' },
            mem: { da: 't', a: 'b', et: { x: 180, y: 86, a: 'start', riga: true } },
            gfx: { da: ['b', 0.2], a: ['t', (142.4 - 28) / 130], et: { x: 128, y: 190, a: 'end' } },
            hub: { da: ['b', 0.8], a: ['t', (197.6 - 28) / 284] },
            disco: { da: ['b', 0.25], a: 't', et: { x: 108, y: 390, a: 'start' } },
            usb: { da: ['b', 0.75], a: 't', et: { x: 266, y: 390, a: 'start' } },
          },
          deco: { core: { x: 28, y: 126, w: 88, h: 50, tipo: '4+4' } },
          // il nome del SoC va a sinistra: al centro passa il collegamento con la memoria
          titoli: { cpu: 'sx' },
        },
      },
    },
  };

  /* ---------- accesso ai dati ---------- */

  function epoca(id) {
    const e = EPOCHE.find((x) => x.id === String(id));
    if (!e) throw new Error('Epoca sconosciuta: ' + id);
    return e;
  }

  // Collegamento con le informazioni complete (quelli del bus del 1981 le prendono dal bus).
  function collegamento(epocaId, linkId) {
    const e = epoca(epocaId);
    const l = e.collegamenti.find((x) => x.id === linkId);
    if (!l) return null;
    if (!l.gruppo) return l;
    const g = e.collegamenti.find((x) => x.id === l.gruppo);
    return Object.assign({}, g, { id: l.id, da: l.da, a: l.a, gruppo: l.gruppo, bus: false });
  }

  // Percorso di un flusso: collegamenti orientati dalla CPU verso il dispositivo.
  function percorso(epocaId, flussoId) {
    const e = epoca(epocaId);
    const ids = e.percorsi[flussoId];
    if (!ids) throw new Error('Flusso sconosciuto: ' + flussoId);
    let nodo = 'cpu';
    return ids.map((id) => {
      const l = collegamento(epocaId, id);
      if (!l) throw new Error('Collegamento ' + id + ' mancante nel ' + epocaId);
      let verso;
      if (l.da === nodo) verso = 1;
      else if (l.a === nodo) verso = -1;
      else throw new Error('Percorso interrotto nel ' + epocaId + ': ' + id + ' non tocca ' + nodo);
      const passo = { link: l, verso: verso, daNodo: nodo, aNodo: verso === 1 ? l.a : l.da };
      nodo = passo.aNodo;
      return passo;
    });
  }

  // Il collegamento più lento del percorso decide il tempo; la memoria unificata non copia niente.
  function tempoPercorso(epocaId, flussoId, byte) {
    const passi = percorso(epocaId, flussoId).map((p) => p.link);
    const misurabili = passi.filter((l) => l.banda > 0 && !l.zeroCopia);
    const zero = passi.find((l) => l.zeroCopia);
    if (!misurabili.length) {
      return { secondi: 0, zeroCopia: !!zero, collo: zero || null };
    }
    // A parità di banda vince il tratto più vicino al dispositivo (l'ultimo del percorso).
    const collo = misurabili.reduce((m, l) => (l.banda <= m.banda ? l : m));
    return { secondi: tempo(byte, collo.banda), zeroCopia: false, collo: collo };
  }

  function confronto(flussoId, byte) {
    return EPOCHE.map((e) => Object.assign({ epoca: e }, tempoPercorso(e.id, flussoId, byte)));
  }

  // Collegamenti "da mostrare": niente tratti interni senza banda e un solo bus per il 1981.
  function collegamentiVisibili(epocaId) {
    const e = epoca(epocaId);
    return e.collegamenti.filter((l) => !l.gruppo && (l.banda > 0)).map((l) => collegamento(epocaId, l.id));
  }

  // Flussi che passano su un collegamento.
  function flussiDi(epocaId, linkId) {
    const e = epoca(epocaId);
    const l = e.collegamenti.find((x) => x.id === linkId);
    return FLUSSI.filter((f) => {
      const ids = e.percorsi[f.id];
      if (ids.includes(linkId)) return true;
      return !!(l && l.bus && ids.some((id) => { const x = e.collegamenti.find((c) => c.id === id); return x && x.gruppo === 'bus'; }));
    }).map((f) => f.id);
  }

  function disposizione(nome, epocaId) {
    const d = DISPOSIZIONI[nome];
    if (!d) throw new Error('Disposizione sconosciuta: ' + nome);
    const ep = d.epoche[epocaId];
    const nodi = {};
    NODI.forEach((id) => {
      const b = ep.nodi[id] || NASCOSTI[nome][id];
      if (b) nodi[id] = Object.assign({}, b);
    });
    // Nodi senza posizione propria in questa epoca (assenti): restano dove sono nell'epoca vicina.
    NODI.forEach((id) => {
      if (nodi[id]) return;
      const altra = ['2020', '2010', '1998', '1981'].map((k) => d.epoche[k].nodi[id]).find(Boolean);
      if (altra) nodi[id] = Object.assign({}, altra, { o: 0 });
    });
    return { w: d.w, h: d.h, nodi: nodi, link: ep.link, deco: ep.deco || {}, titoli: ep.titoli || {} };
  }

  /* ---------- geometria: ancore e percorsi ad angolo retto ---------- */

  const ORIZZ = { l: true, r: true };

  // Punto di attacco di un collegamento su un riquadro. altro = punto dell'altro capo (serve a 'proj').
  function ancora(box, spec, altro) {
    if (spec === 'proj') {
      if (box.h === 0) return { x: altro.x, y: box.y, dir: altro.y < box.y ? 't' : 'b' };
      return { x: box.x, y: altro.y, dir: altro.x < box.x ? 'l' : 'r' };
    }
    let lato = spec;
    let f = 0.5;
    if (Array.isArray(spec)) {
      if (spec[0] === 'p') return { x: box.x + box.w * spec[1], y: box.y + box.h * spec[2], dir: spec[3] };
      lato = spec[0];
      f = spec[1];
    }
    if (lato === 'l') return { x: box.x, y: box.y + box.h * f, dir: 'l' };
    if (lato === 'r') return { x: box.x + box.w, y: box.y + box.h * f, dir: 'r' };
    if (lato === 't') return { x: box.x + box.w * f, y: box.y, dir: 't' };
    return { x: box.x + box.w * f, y: box.y + box.h, dir: 'b' };
  }

  // Polilinea ad angolo retto da A (che esce verso A.dir) a B (che si raggiunge dal lato B.dir).
  function instrada(A, Bp, mid) {
    const m = mid == null ? 0.5 : mid;
    const pts = [{ x: A.x, y: A.y }];
    const hA = !!ORIZZ[A.dir];
    const hB = !!ORIZZ[Bp.dir];
    if (hA && hB) {
      if (Math.abs(A.y - Bp.y) >= 2) {
        const mx = A.x + (Bp.x - A.x) * m;
        pts.push({ x: mx, y: A.y }, { x: mx, y: Bp.y });
      }
      pts.push({ x: Bp.x, y: Math.abs(A.y - Bp.y) < 2 ? A.y : Bp.y });
    } else if (!hA && !hB) {
      if (Math.abs(A.x - Bp.x) >= 2) {
        const my = A.y + (Bp.y - A.y) * m;
        pts.push({ x: A.x, y: my }, { x: Bp.x, y: my });
      }
      pts.push({ x: Math.abs(A.x - Bp.x) < 2 ? A.x : Bp.x, y: Bp.y });
    } else if (hA) {
      pts.push({ x: Bp.x, y: A.y }, { x: Bp.x, y: Bp.y });
    } else {
      pts.push({ x: A.x, y: Bp.y }, { x: Bp.x, y: Bp.y });
    }
    // Toglie i punti doppi.
    return pts.filter((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) > 1e-6 || Math.abs(p.y - pts[i - 1].y) > 1e-6);
  }

  function lunghezza(poly) {
    let L = 0;
    for (let i = 1; i < poly.length; i++) L += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y);
    return L;
  }

  // Punto alla distanza d dall'inizio (d negativa: prolunga il primo tratto all'indietro).
  function puntoSu(poly, d) {
    if (poly.length === 1) return { x: poly[0].x, y: poly[0].y };
    if (d <= 0) {
      const a = poly[0];
      const b = poly[1];
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: a.x + (b.x - a.x) / l * d, y: a.y + (b.y - a.y) / l * d };
    }
    let resto = d;
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1];
      const b = poly[i];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (resto <= l) { const t = l ? resto / l : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
      resto -= l;
    }
    const z = poly[poly.length - 1];
    return { x: z.x, y: z.y };
  }

  // Tratto più lungo (per posare l'etichetta) e suo punto medio.
  function trattoPiuLungo(poly) {
    let best = { l: -1 };
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1];
      const b = poly[i];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l > best.l) best = { l: l, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, verticale: Math.abs(a.x - b.x) < 1e-6 };
    }
    return best;
  }

  function percorsoSvg(poly) {
    return poly.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ');
  }

  function interpolaBox(a, b, k) {
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k, o: a.o + (b.o - a.o) * k };
  }

  const api = {
    kB: kB,
    MB: MB,
    GB: GB,
    banda: banda,
    PCIE: PCIE,
    SCALA: SCALA,
    frazioneLog: frazioneLog,
    spessore: spessore,
    velocita: velocita,
    tempo: tempo,
    formattaBanda: formattaBanda,
    formattaByte: formattaByte,
    formattaTempo: formattaTempo,
    FLUSSI: FLUSSI,
    FLUSSO_DI_RUOLO: FLUSSO_DI_RUOLO,
    DIMENSIONI: DIMENSIONI,
    BUSLAB: BUSLAB,
    EPOCHE: EPOCHE,
    NODI: NODI,
    DISPOSIZIONI: DISPOSIZIONI,
    epoca: epoca,
    collegamento: collegamento,
    percorso: percorso,
    tempoPercorso: tempoPercorso,
    confronto: confronto,
    collegamentiVisibili: collegamentiVisibili,
    flussiDi: flussiDi,
    disposizione: disposizione,
    geometria: {
      ancora: ancora,
      instrada: instrada,
      lunghezza: lunghezza,
      puntoSu: puntoSu,
      trattoPiuLungo: trattoPiuLungo,
      percorsoSvg: percorsoSvg,
      interpolaBox: interpolaBox,
    },
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['scheda-madre'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
