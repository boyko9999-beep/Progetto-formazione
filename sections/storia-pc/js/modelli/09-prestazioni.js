/*
 * Storia del PC · capitolo 9 (prestazioni): dati e logica pura, senza DOM.
 *
 * Contiene la tabella dei processori usata dal laboratorio «Moore, megahertz e core»
 * (transistor, frequenza, core), le serie dei core per anno, la legge di Amdahl,
 * le scale logaritmiche dei grafici, la retta di Moore e la stima del tempo di raddoppio.
 *
 * Fonti principali dei dati: schede e comunicati di Intel, AMD e Apple; per i chip
 * storici i valori più citati (Intel per i transistor e le frequenze di lancio).
 * Intel non pubblica più il numero di transistor dei suoi processori dal 2015 circa:
 * per quei chip il campo transistor è null e il punto compare solo negli altri grafici.
 */
(function (root) {
  'use strict';

  /* ---------- tabella dei processori ----------
   * anno: anno di presentazione (o, per le tappe di frequenza, anno della tappa)
   * transistor: numero di transistor dichiarato (null se non pubblicato o incerto)
   * mhz: frequenza più alta disponibile al lancio; per i chip con turbo è la frequenza turbo massima
   * mhzBase: frequenza base, per i chip che hanno un turbo
   * mhzMax: frequenza più alta raggiunta poi dallo stesso modello (solo per il testo)
   * core, thread, p, e: core totali, thread, core ad alte prestazioni (P) ed efficienti (E)
   */
  const PROCESSORI = [
    { id: 'i4004', nome: 'Intel 4004', marca: 'Intel', anno: 1971, transistor: 2300, mhz: 0.74, core: 1,
      testo: 'Il primo microprocessore in commercio, a 4 bit, progettato da un gruppo guidato dal vicentino Federico Faggin. Nasce per una calcolatrice giapponese.' },
    { id: 'i8008', nome: 'Intel 8008', marca: 'Intel', anno: 1972, transistor: 3500, mhz: 0.5, core: 1,
      testo: 'Il primo microprocessore a 8 bit di Intel, l\'antenato lontano della famiglia x86.' },
    { id: 'i8086', nome: 'Intel 8086', marca: 'Intel', anno: 1978, transistor: 29000, mhz: 5, mhzMax: 10, core: 1,
      testo: '16 bit e 1 MB di memoria indirizzabile: con la versione 8088 diventa il cuore dell\'IBM PC (1981) e il capostipite della famiglia x86.' },
    { id: 'i286', nome: 'Intel 80286', marca: 'Intel', anno: 1982, transistor: 134000, mhz: 8, mhzMax: 12.5, core: 1,
      testo: 'Introduce la modalità protetta e indirizza fino a 16 MB di memoria. È il processore dell\'IBM PC AT (1984).' },
    { id: 'i386', nome: 'Intel 80386', marca: 'Intel', anno: 1985, transistor: 275000, mhz: 16, mhzMax: 33, core: 1,
      testo: 'Il primo x86 a 32 bit, con la paginazione per la memoria virtuale. Il primo PC che lo monta è il Compaq Deskpro 386 (1986).' },
    { id: 'i486', nome: 'Intel 486', marca: 'Intel', anno: 1989, transistor: 1200000, mhz: 25, mhzMax: 100, core: 1,
      testo: 'Oltre un milione di transistor: integra il coprocessore matematico (FPU), 8 KB di cache e una pipeline a cinque stadi.' },
    { id: 'pentium', nome: 'Pentium', marca: 'Intel', anno: 1993, transistor: 3100000, mhz: 66, mhzMax: 200, core: 1,
      testo: 'Superscalare: due pipeline affiancate completano fino a due istruzioni per ciclo. Nel 1994 il bug FDIV della divisione.' },
    { id: 'pentiumpro', nome: 'Pentium Pro', marca: 'Intel', anno: 1995, transistor: 5500000, mhz: 200, core: 1,
      testo: 'Esecuzione fuori ordine: le istruzioni x86 diventano micro-operazioni, eseguite appena i loro dati sono pronti.' },
    { id: 'pentium2', nome: 'Pentium II', marca: 'Intel', anno: 1997, transistor: 7500000, mhz: 300, mhzMax: 450, core: 1,
      testo: 'Il nucleo del Pentium Pro con le istruzioni MMX, su una cartuccia che ospita anche la cache di secondo livello.' },
    { id: 'pentium3', nome: 'Pentium III', marca: 'Intel', anno: 1999, transistor: 9500000, mhz: 500, mhzMax: 1400, core: 1,
      testo: 'Aggiunge le istruzioni SSE, che lavorano su quattro numeri con la virgola alla volta.' },
    { id: 'athlon', nome: 'AMD Athlon', marca: 'AMD', anno: 1999, transistor: 22000000, mhz: 600, mhzMax: 1400, core: 1,
      testo: 'Il processore che porta AMD alla pari con Intel, e spesso davanti, nella corsa ai megahertz.' },
    { id: 'athlon1g', nome: 'Athlon a 1 GHz', marca: 'AMD', anno: 2000, transistor: null, mhz: 1000, core: 1,
      testo: 'Il 6 marzo 2000 AMD annuncia l\'Athlon a 1.000 MHz, il primo processore per PC a un gigahertz: due giorni dopo arriva il Pentium III a 1 GHz.' },
    { id: 'pentium4', nome: 'Pentium 4', marca: 'Intel', anno: 2000, transistor: 42000000, mhz: 1500, mhzMax: 2000, core: 1,
      testo: 'Architettura NetBurst: una pipeline di 20 stadi pensata per salire di frequenza.' },
    { id: 'p4ht', nome: 'Pentium 4 a 3,06 GHz', marca: 'Intel', anno: 2002, transistor: null, mhz: 3060, core: 1, thread: 2,
      testo: 'Il primo processore per PC oltre i 3 GHz, con l\'Hyper-Threading: un core che il sistema operativo vede come due.' },
    { id: 'athlon64', nome: 'AMD Athlon 64', marca: 'AMD', anno: 2003, transistor: 105900000, mhz: 2200, core: 1,
      testo: 'Porta nei PC l\'estensione x86 a 64 bit (AMD64) e il controller della memoria dentro il processore.' },
    { id: 'prescott', nome: 'Pentium 4 «Prescott»', marca: 'Intel', anno: 2004, transistor: 125000000, mhz: 3800, core: 1, thread: 2,
      testo: 'Pipeline di 31 stadi e fino a 115 watt: a fine 2004 tocca 3,8 GHz, il massimo della serie. Il modello da 4 GHz viene cancellato.' },
    { id: 'pentiumd', nome: 'Pentium D', marca: 'Intel', anno: 2005, transistor: 230000000, mhz: 3200, core: 2,
      testo: 'Due core Pentium 4 sullo stesso chip: la prima risposta di Intel al muro della potenza.' },
    { id: 'athlon64x2', nome: 'AMD Athlon 64 X2', marca: 'AMD', anno: 2005, transistor: null, mhz: 2400, core: 2,
      testo: 'Due core sullo stesso chip, collegati al loro interno, a una frequenza più bassa dei single core più veloci.' },
    { id: 'core2duo', nome: 'Core 2 Duo', marca: 'Intel', anno: 2006, transistor: 291000000, mhz: 2930, core: 2,
      testo: 'Meno megahertz del Pentium 4 ma molto più lavoro per ciclo, con circa la metà dei consumi: l\'IPC conta più della frequenza.' },
    { id: 'qx6700', nome: 'Core 2 Extreme QX6700', marca: 'Intel', anno: 2006, transistor: 582000000, mhz: 2660, core: 4,
      testo: 'Il primo processore desktop a quattro core: due chip Core 2 Duo nello stesso involucro.' },
    { id: 'corei7', nome: 'Core i7 (Nehalem)', marca: 'Intel', anno: 2008, transistor: 731000000, mhz: 3460, mhzBase: 3200, core: 4, thread: 8,
      testo: 'Controller della memoria nel chip, Hyper-Threading (8 thread su 4 core) e Turbo Boost, che accelera un core quando gli altri riposano.' },
    { id: 'i7980x', nome: 'Core i7-980X', marca: 'Intel', anno: 2010, transistor: null, mhz: 3600, mhzBase: 3330, core: 6, thread: 12,
      testo: 'Il primo processore Intel per PC desktop a sei core, per la fascia più alta (HEDT).' },
    { id: 'i72600k', nome: 'Core i7-2600K', marca: 'Intel', anno: 2011, transistor: 1160000000, mhz: 3800, mhzBase: 3400, core: 4, thread: 8,
      testo: 'Sandy Bridge: processore e grafica sullo stesso chip e le istruzioni AVX a 256 bit.' },
    { id: 'fx8150', nome: 'AMD FX-8150', marca: 'AMD', anno: 2011, transistor: null, mhz: 4200, mhzBase: 3600, core: 8,
      testo: 'Otto core raggruppati in quattro moduli da due, che condividono parti come l\'unità per i numeri con la virgola.' },
    { id: 'i74770k', nome: 'Core i7-4770K', marca: 'Intel', anno: 2013, transistor: 1400000000, mhz: 3900, mhzBase: 3500, core: 4, thread: 8,
      testo: 'Haswell: quattro core, grafica integrata e, per la prima volta, il regolatore di tensione dentro il processore.' },
    { id: 'fx9590', nome: 'AMD FX-9590', marca: 'AMD', anno: 2013, transistor: null, mhz: 5000, mhzBase: 4700, core: 8,
      testo: 'Il primo processore per PC venduto con 5 GHz (in turbo), al prezzo di 220 watt di consumo dichiarato.' },
    { id: 'i75960x', nome: 'Core i7-5960X', marca: 'Intel', anno: 2014, transistor: 2600000000, mhz: 3500, mhzBase: 3000, core: 8, thread: 16,
      testo: 'Il primo Intel per PC desktop a otto core, per la fascia più alta (HEDT).' },
    { id: 'ryzen1800x', nome: 'Ryzen 7 1800X', marca: 'AMD', anno: 2017, transistor: 4800000000, mhz: 4000, mhzBase: 3600, core: 8, thread: 16,
      testo: 'Architettura Zen: otto core a meno della metà del prezzo dei rivali Intel di allora.' },
    { id: 'i99900k', nome: 'Core i9-9900K', marca: 'Intel', anno: 2018, transistor: null, mhz: 5000, mhzBase: 3600, core: 8, thread: 16,
      testo: 'Otto core e fino a 5 GHz in turbo su uno o due core; la frequenza base resta a 3,6 GHz.' },
    { id: 'ryzen3950x', nome: 'Ryzen 9 3950X', marca: 'AMD', anno: 2019, transistor: 9890000000, mhz: 4700, mhzBase: 3500, core: 16, thread: 32,
      testo: 'Chiplet: due chip da otto core e un chip per memoria e ingressi-uscite nello stesso involucro.' },
    { id: 'tr3990x', nome: 'Threadripper 3990X', marca: 'AMD', anno: 2020, transistor: null, mhz: 4300, mhzBase: 2900, core: 64, thread: 128,
      testo: '64 core e 128 thread in un PC desktop di fascia altissima, fatto di nove chiplet.' },
    { id: 'm1', nome: 'Apple M1', marca: 'Apple', anno: 2020, transistor: 16000000000, mhz: 3200, core: 8, p: 4, e: 4,
      testo: 'Sistema su chip ARM con CPU, grafica e memoria unificata: 4 core ad alte prestazioni e 4 ad alta efficienza.' },
    { id: 'm1max', nome: 'Apple M1 Max', marca: 'Apple', anno: 2021, transistor: 57000000000, mhz: null, core: 10, p: 8, e: 2,
      testo: '57 miliardi di transistor, in gran parte per la grafica: 32 core grafici accanto ai 10 della CPU.' },
    { id: 'i912900k', nome: 'Core i9-12900K', marca: 'Intel', anno: 2021, transistor: null, mhz: 5200, mhzBase: 3200, core: 16, thread: 24, p: 8, e: 8,
      testo: 'Alder Lake: core ibridi, 8 P-core veloci con Hyper-Threading e 8 E-core piccoli ed efficienti.' },
    { id: 'm1ultra', nome: 'Apple M1 Ultra', marca: 'Apple', anno: 2022, transistor: 114000000000, mhz: null, core: 20, p: 16, e: 4,
      testo: 'Due M1 Max uniti da un ponte di collegamento sul bordo: 114 miliardi di transistor.' },
    { id: 'i913900k', nome: 'Core i9-13900K', marca: 'Intel', anno: 2022, transistor: null, mhz: 5800, mhzBase: 3000, core: 24, thread: 32, p: 8, e: 16,
      testo: '24 core ibridi (8 P + 16 E) e 32 thread.' },
    { id: 'i913900ks', nome: 'Core i9-13900KS', marca: 'Intel', anno: 2023, transistor: null, mhz: 6000, mhzBase: 3200, core: 24, thread: 32, p: 8, e: 16,
      testo: 'Il primo processore per PC venduto con 6 GHz, raggiunti in turbo da uno o due core.' },
    { id: 'm2ultra', nome: 'Apple M2 Ultra', marca: 'Apple', anno: 2023, transistor: 134000000000, mhz: null, core: 24, p: 16, e: 8,
      testo: 'Due chip M2 Max uniti: 134 miliardi di transistor e 24 core (16 P + 8 E).' },
    { id: 'i914900ks', nome: 'Core i9-14900KS', marca: 'Intel', anno: 2024, transistor: null, mhz: 6200, mhzBase: 3200, core: 24, thread: 32, p: 8, e: 16,
      testo: 'Fino a 6,2 GHz in turbo su uno o due core; la frequenza base dei P-core resta a 3,2 GHz.' },
    { id: 'ultra285k', nome: 'Core Ultra 9 285K', marca: 'Intel', anno: 2024, transistor: null, mhz: 5700, mhzBase: 3700, core: 24, thread: 24, p: 8, e: 16,
      testo: 'Arrow Lake: un processore fatto di più chiplet («tile»), con 24 core e senza Hyper-Threading.' },
    { id: 'm3ultra', nome: 'Apple M3 Ultra', marca: 'Apple', anno: 2025, transistor: 184000000000, mhz: null, core: 32, p: 24, e: 8,
      testo: 'Due M3 Max uniti: 184 miliardi di transistor secondo Apple, 32 core nella CPU (24 P + 8 E).' },
  ];

  /* ---------- core per anno nei PC desktop ----------
   * Solo gli anni in cui il record cambia; serieAnnuale() riempie gli anni intermedi.
   * pubblico: il processore desktop con più core per le piattaforme di tutti i giorni.
   * hedt: la fascia più alta dei PC desktop (High-End DeskTop), per appassionati e professionisti.
   */
  const CORE_DESKTOP = {
    da: 2000,
    a: 2025,
    pubblico: [
      { anno: 2000, core: 1, chip: 'Pentium III, Athlon, poi Pentium 4 e Athlon 64', testo: 'Un solo core: per andare più veloci si alza la frequenza.' },
      { anno: 2005, core: 2, chip: 'Pentium D e Athlon 64 X2', testo: 'I primi processori desktop a due core, in vendita dalla primavera.' },
      { anno: 2006, core: 4, chip: 'Core 2 Extreme QX6700', testo: 'A novembre il primo processore desktop a quattro core.' },
      { anno: 2010, core: 6, chip: 'AMD Phenom II X6', testo: 'Sei core per le schede madri di tutti i giorni.' },
      { anno: 2011, core: 8, chip: 'AMD FX-8150', testo: 'Otto core, a coppie in quattro moduli che condividono alcune unità.' },
      { anno: 2019, core: 16, chip: 'Ryzen 9 3950X', testo: 'Sedici core grazie ai chiplet: due chip da otto core nello stesso involucro.' },
      { anno: 2022, core: 24, chip: 'Core i9-13900K', p: 8, e: 16, testo: '24 core ibridi: 8 grandi (P) e 16 piccoli ed efficienti (E).' },
    ],
    hedt: [
      { anno: 2008, core: 4, chip: 'Core i7-965 Extreme', testo: 'Nasce la piattaforma per la fascia più alta: quattro core e otto thread.' },
      { anno: 2010, core: 6, chip: 'Core i7-980X', testo: 'Sei core e dodici thread.' },
      { anno: 2014, core: 8, chip: 'Core i7-5960X', testo: 'Il primo Intel desktop a otto core.' },
      { anno: 2016, core: 10, chip: 'Core i7-6950X', testo: 'Dieci core, per circa 1.700 dollari.' },
      { anno: 2017, core: 18, chip: 'Core i9-7980XE', testo: 'AMD risponde con il Threadripper a 16 core: la gara dei core si accende.' },
      { anno: 2018, core: 32, chip: 'Threadripper 2990WX', testo: 'Trentadue core in quattro chip nello stesso involucro.' },
      { anno: 2020, core: 64, chip: 'Threadripper 3990X', testo: 'Sessantaquattro core e 128 thread; le workstation arriveranno a 96 (Threadripper PRO, 2023).' },
    ],
  };

  /* ---------- formati all'italiana ---------- */

  // Numero con separatore delle migliaia «.» e virgola decimale, senza zeri finali inutili.
  function numeroIt(v, maxDec) {
    const d = maxDec == null ? 0 : maxDec;
    const neg = v < 0;
    let s = Math.abs(v).toFixed(d);
    if (d > 0) s = s.replace(/\.?0+$/, '');
    const parti = s.split('.');
    parti[0] = parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + parti.join(',');
  }

  function cifre(v) {
    // fino a tre cifre significative: 1,16 · 9,89 · 22 · 105,9 · 184
    if (v >= 100) return numeroIt(v, Math.round(v) === v ? 0 : 1);
    if (v >= 10) return numeroIt(v, 1);
    return numeroIt(v, 2);
  }

  // 2.300 · 134.000 · 1,2 milioni · 105,9 milioni · 1,16 miliardi · 184 miliardi
  function formatoTransistor(n) {
    if (n == null) return '—';
    if (n < 1e6) return numeroIt(Math.round(n));
    if (n < 1e9) { const v = n / 1e6; return cifre(v) + (v === 1 ? ' milione' : ' milioni'); }
    const v = n / 1e9;
    return cifre(v) + (v === 1 ? ' miliardo' : ' miliardi');
  }

  // Etichette brevi per gli assi: 1.000 · 10.000 · 100.000 · 1 mln · 10 mln · 1 mld · 1.000 mld
  function etichettaPotenza(n) {
    if (n < 1e6) return numeroIt(n);
    if (n < 1e9) return numeroIt(n / 1e6) + ' mln';
    return numeroIt(n / 1e9) + ' mld';
  }

  // 740 kHz · 4,77 MHz · 66 MHz · 1 GHz · 3,06 GHz · 6,2 GHz
  function formatoFrequenza(mhz) {
    if (mhz == null) return '—';
    if (mhz < 1) return numeroIt(mhz * 1000, 0) + ' kHz';
    if (mhz < 1000) return numeroIt(mhz, 2) + ' MHz';
    return numeroIt(mhz / 1000, 2) + ' GHz';
  }

  // Etichette dell'asse delle frequenze: 100 kHz, 1 MHz, 10 MHz, 100 MHz, 1 GHz, 10 GHz
  function etichettaFrequenza(mhz) {
    if (mhz < 1) return numeroIt(mhz * 1000) + ' kHz';
    if (mhz < 1000) return numeroIt(mhz) + ' MHz';
    return numeroIt(mhz / 1000) + ' GHz';
  }

  /* ---------- scale per i grafici ---------- */

  // Scala lineare: dominio [d0, d1] → intervallo [r0, r1].
  function scalaLineare(d0, d1, r0, r1) {
    const f = (v) => r0 + (v - d0) * (r1 - r0) / (d1 - d0);
    f.inversa = (px) => d0 + (px - r0) * (d1 - d0) / (r1 - r0);
    f.dominio = [d0, d1];
    return f;
  }

  // Scala logaritmica in base b (10 di default): ogni potenza di b è alla stessa distanza dalla successiva.
  function scalaLog(d0, d1, r0, r1, base) {
    const b = base || 10;
    if (!(d0 > 0 && d1 > 0)) throw new RangeError('scalaLog: il dominio deve essere positivo');
    const l = (v) => Math.log(v) / Math.log(b);
    const l0 = l(d0), l1 = l(d1);
    const f = (v) => r0 + (l(v) - l0) * (r1 - r0) / (l1 - l0);
    f.inversa = (px) => Math.pow(b, l0 + (px - r0) * (l1 - l0) / (r1 - r0));
    f.dominio = [d0, d1];
    f.base = b;
    return f;
  }

  // Potenze della base comprese nel dominio: tacche di un asse logaritmico.
  function tacchetteLog(d0, d1, base) {
    const b = base || 10;
    const out = [];
    const e0 = Math.ceil(Math.log(d0) / Math.log(b) - 1e-9);
    const e1 = Math.floor(Math.log(d1) / Math.log(b) + 1e-9);
    for (let e = e0; e <= e1; e++) out.push(Math.pow(b, e));
    return out;
  }

  /* ---------- legge di Moore e tempo di raddoppio ---------- */

  // Funzione anno → valore che raddoppia ogni `periodo` anni partendo da (anno0, n0).
  function raddoppio(n0, anno0, periodo) {
    const per = periodo || 2;
    return (anno) => n0 * Math.pow(2, (anno - anno0) / per);
  }

  // La retta di Moore del laboratorio: 2.300 transistor nel 1971, raddoppio ogni 2 anni.
  const moore = raddoppio(2300, 1971, 2);

  // Tempo di raddoppio (anni) tra due punti {anno, n}.
  function tempoRaddoppio(a, b) {
    const ra = b.n / a.n;
    if (!(ra > 0) || b.anno === a.anno) return NaN;
    return (b.anno - a.anno) / (Math.log(ra) / Math.LN2);
  }

  // Retta dei minimi quadrati su (anno, log2 n): restituisce il periodo di raddoppio e la funzione.
  function regressioneRaddoppio(punti) {
    const k = punti.length;
    if (k < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    punti.forEach((p) => {
      const y = Math.log(p.n) / Math.LN2;
      sx += p.anno; sy += y; sxx += p.anno * p.anno; sxy += p.anno * y;
    });
    const pend = (k * sxy - sx * sy) / (k * sxx - sx * sx); // raddoppi per anno
    const q = (sy - pend * sx) / k;
    return {
      periodo: 1 / pend,
      raddoppiPerAnno: pend,
      valore: (anno) => Math.pow(2, q + pend * anno),
    };
  }

  /* ---------- legge di Amdahl ---------- */

  // Accelerazione con una frazione p (0-1) di lavoro parallelizzabile e n core.
  function amdahl(p, n) {
    if (!(p >= 0 && p <= 1)) throw new RangeError('amdahl: p deve essere tra 0 e 1');
    if (!(n >= 1)) throw new RangeError('amdahl: servono almeno 1 core');
    return 1 / ((1 - p) + p / n);
  }

  // Accelerazione massima con infiniti core: 1 / (1 - p).
  function limiteAmdahl(p) {
    return p >= 1 ? Infinity : 1 / (1 - p);
  }

  // Tempo relativo (1 = un solo core) diviso in parte seriale e parte parallela.
  function tempoAmdahl(p, n) {
    const seriale = 1 - p;
    const parallelo = p / n;
    return { seriale: seriale, parallelo: parallelo, totale: seriale + parallelo };
  }

  // Efficienza: quanto di ogni core viene sfruttato (1 = 100%).
  function efficienza(p, n) {
    return amdahl(p, n) / n;
  }

  /* ---------- altre formule del capitolo ---------- */

  // Tempo di esecuzione (secondi) = istruzioni / (IPC × frequenza).
  function tempoEsecuzione(istruzioni, ipc, ghz) {
    return istruzioni / (ipc * ghz * 1e9);
  }

  // La lavanderia della pipeline: turni necessari per `carichi` lavori di `stadi` fasi.
  function turniSequenziali(carichi, stadi) { return carichi * stadi; }
  function turniPipeline(carichi, stadi) { return carichi > 0 ? stadi + carichi - 1 : 0; }

  /* ---------- viste dei dati ---------- */

  function ordinati(lista) {
    return lista.slice().sort((a, b) => a.anno - b.anno);
  }
  function datiTransistor() { return ordinati(PROCESSORI.filter((c) => c.transistor != null)); }
  function datiFrequenza() { return ordinati(PROCESSORI.filter((c) => c.mhz != null)); }
  function trova(id) { return PROCESSORI.find((c) => c.id === id) || null; }

  // Serie anno per anno (da-a) a partire dai soli anni di cambio.
  function serieAnnuale(cambi, da, a) {
    const out = [];
    let i = -1;
    for (let anno = da; anno <= a; anno++) {
      while (i + 1 < cambi.length && cambi[i + 1].anno <= anno) i++;
      if (i < 0) continue;
      const c = cambi[i];
      out.push({ anno: anno, core: c.core, chip: c.chip, nuovo: c.anno === anno });
    }
    return out;
  }

  // Raddoppio dei transistor tra il 4004 e un altro chip della tabella.
  function raddoppioDal4004(id) {
    const a = trova('i4004');
    const b = trova(id);
    if (!a || !b || b.transistor == null || b.anno === a.anno) return NaN;
    return tempoRaddoppio({ anno: a.anno, n: a.transistor }, { anno: b.anno, n: b.transistor });
  }

  // Tendenza delle frequenze prima del muro della potenza (1971-2004).
  function tendenzaFrequenza(finoA) {
    const limite = finoA || 2004;
    return regressioneRaddoppio(datiFrequenza().filter((c) => c.anno <= limite).map((c) => ({ anno: c.anno, n: c.mhz })));
  }

  const api = {
    PROCESSORI: PROCESSORI,
    CORE_DESKTOP: CORE_DESKTOP,
    numeroIt: numeroIt,
    formatoTransistor: formatoTransistor,
    etichettaPotenza: etichettaPotenza,
    formatoFrequenza: formatoFrequenza,
    etichettaFrequenza: etichettaFrequenza,
    scalaLineare: scalaLineare,
    scalaLog: scalaLog,
    tacchetteLog: tacchetteLog,
    raddoppio: raddoppio,
    moore: moore,
    tempoRaddoppio: tempoRaddoppio,
    regressioneRaddoppio: regressioneRaddoppio,
    amdahl: amdahl,
    limiteAmdahl: limiteAmdahl,
    tempoAmdahl: tempoAmdahl,
    efficienza: efficienza,
    tempoEsecuzione: tempoEsecuzione,
    turniSequenziali: turniSequenziali,
    turniPipeline: turniPipeline,
    datiTransistor: datiTransistor,
    datiFrequenza: datiFrequenza,
    trova: trova,
    serieAnnuale: serieAnnuale,
    raddoppioDal4004: raddoppioDal4004,
    tendenzaFrequenza: tendenzaFrequenza,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['prestazioni'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
