/*
 * Storia del PC · capitolo 6 (memoria): dati e logica pura, senza DOM.
 *
 * - LIVELLI: la gerarchia di un PC di oggi con latenze tipiche (valori indicativi) e la
 *   loro conversione in «tempo umano»: un ciclo di clock di 0,3 ns diventa un secondo.
 * - Un simulatore di cache configurabile (a corrispondenza diretta o associativa a più vie,
 *   con sostituzione LRU) e i generatori degli schemi di accesso del laboratorio.
 * - Le generazioni della RAM dei PC, per la tabella del capitolo.
 */
(function (root) {
  'use strict';

  /* ======================================================================
   * Formattazione all'italiana (senza Intl, così il risultato è identico ovunque)
   * ====================================================================== */

  function numeroIt(v, decimali) {
    const d = decimali || 0;
    const s = Math.abs(v).toFixed(d);
    const parti = s.split('.');
    const intera = parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '-' : '') + intera + (parti[1] ? ',' + parti[1] : '');
  }

  // Due cifre significative circa: un decimale sotto 10 («5,6»), nessuno sopra («13», «150»).
  function compatto(v) {
    if (v >= 9.95) return numeroIt(Math.round(v), 0);
    const s = numeroIt(v, 1);
    return s.slice(-2) === ',0' ? s.slice(0, -2) : s;
  }

  const MINUTO = 60;
  const ORA = 60 * MINUTO;
  const GIORNO = 24 * ORA;
  const ANNO = 365.25 * GIORNO;
  const MESE = ANNO / 12;

  const UNITA = [
    { s: 1, uno: 'secondo', molti: 'secondi' },
    { s: MINUTO, uno: 'minuto', molti: 'minuti' },
    { s: ORA, uno: 'ora', molti: 'ore' },
    { s: GIORNO, uno: 'giorno', molti: 'giorni' },
    { s: MESE, uno: 'mese', molti: 'mesi' },
    { s: ANNO, uno: 'anno', molti: 'anni' },
  ];

  // Una durata in secondi nell'unità più adatta: { valore, unita, testo }.
  function formattaDurata(secondi) {
    let u = UNITA[0];
    for (const x of UNITA) if (secondi >= x.s) u = x;
    const valore = compatto(secondi / u.s);
    const unita = valore === '1' ? u.uno : u.molti;
    return { valore: valore, unita: unita, testo: valore + ' ' + unita };
  }

  // Un tempo reale in nanosecondi: «0,3 ns», «50 µs», «8 ms».
  function formattaNs(ns) {
    if (ns < 999.5) return compatto(ns) + ' ns';
    if (ns < 999.5e3) return compatto(ns / 1e3) + ' µs';
    if (ns < 999.5e6) return compatto(ns / 1e6) + ' ms';
    return compatto(ns / 1e9) + ' s';
  }

  function clamp01(k) { return Math.min(1, Math.max(0, k)); }

  /* ======================================================================
   * La gerarchia di oggi e il «tempo umano»
   * ====================================================================== */

  // Processore di riferimento a circa 3,3 GHz: un ciclo dura 0,3 ns.
  const CICLO_NS = 0.3;

  // Latenze tipiche di un PC da tavolo recente (valori indicativi: cambiano da modello a
  // modello). Per SSD, disco e rete è il tempo di una lettura casuale o di un'andata e ritorno.
  const LIVELLI = [
    {
      id: 'registro', nome: 'Registro', capacita: 'centinaia di byte', ns: 0.3,
      spiega: 'Il dato è già in un <strong>registro</strong>, dentro il core: si usa nello stesso ciclo. È la nostra unità di misura: un ciclo, cioè un secondo.',
    },
    {
      id: 'l1', nome: 'Cache L1', capacita: 'decine di KB per core', ns: 1,
      spiega: 'La <strong>cache L1</strong> è accanto alle unità di calcolo e risponde in 3–5 cicli. In un programma ben scritto più di 9 accessi su 10 si fermano qui.',
    },
    {
      id: 'l2', nome: 'Cache L2', capacita: '1–3 MB per core', ns: 4,
      spiega: 'Non c\'era in L1, quindi la richiesta prova la <strong>cache L2</strong>: più grande, ma servono una dozzina di cicli. A scala umana, il tempo di versarsi un bicchiere d\'acqua.',
    },
    {
      id: 'l3', nome: 'Cache L3', capacita: '8–128 MB condivisa', ns: 15,
      spiega: 'La <strong>cache L3</strong> è condivisa da tutti i core e sta più lontano sul chip: una cinquantina di cicli, quasi un minuto in tempo umano.',
    },
    {
      id: 'ram', nome: 'RAM', capacita: '16–64 GB', ns: 100,
      spiega: 'Mancato in tutte le cache: il dato arriva dalla <strong>DRAM</strong> dei moduli sulla scheda madre. Circa 100 ns, più di 300 cicli: a scala umana, oltre cinque minuti fermi ad aspettare.',
    },
    {
      id: 'ssd', nome: 'SSD NVMe', capacita: '1–4 TB', ns: 50e3,
      spiega: 'Il dato non è in RAM e va letto dall\'<strong>SSD</strong>: qualche decina di microsecondi, quasi due giorni a scala umana. Intanto il sistema operativo fa lavorare il processore su altro.',
    },
    {
      id: 'disco', nome: 'Disco rigido', capacita: '4–30 TB', ns: 8e6,
      spiega: 'Nel <strong>disco rigido</strong> il braccio deve portare la testina sulla traccia giusta e poi aspettare che il settore passi sotto: millisecondi, cioè mesi a scala umana.',
    },
    {
      id: 'rete', nome: 'Internet', capacita: 'un server in un altro continente', ns: 150e6,
      spiega: 'Andata e ritorno verso un <strong>server in un altro continente</strong>: anche alla velocità della luce nella fibra (circa 200.000 km al secondo) la distanza pesa. Per il processore sono anni.',
    },
  ];

  function perId(id) { return LIVELLI.find((l) => l.id === id) || null; }
  function secondiUmani(ns) { return ns / CICLO_NS; }
  function cicli(ns) { return ns / CICLO_NS; }
  function tempoUmano(ns) { return formattaDurata(secondiUmani(ns)); }

  // Durata (ms) dell'attesa animata a un livello: scala logaritmica, così ogni fattore 10
  // di tempo vale lo stesso tratto di animazione e il disco non dura un anno.
  function durataAttesa(ns) {
    return Math.round(320 + 400 * Math.log10(1 + secondiUmani(ns)));
  }

  // Valore dell'orologio (in secondi umani) a una frazione k dell'attesa: cresce in modo
  // esponenziale, passando per secondi, minuti, ore, giorni, mesi e anni.
  function orologio(secondiFinali, k) {
    return Math.pow(1 + secondiFinali, clamp01(k)) - 1;
  }

  // Posizione (0-1) di una durata sulla scala logaritmica dell'orologio, fino a 100 anni.
  const SCALA_MAX_S = 100 * ANNO;
  function posizioneLog(secondi) {
    return clamp01(Math.log10(1 + Math.max(0, secondi)) / Math.log10(1 + SCALA_MAX_S));
  }

  const TACCHE = [
    { s: 1, et: '1 s' },
    { s: MINUTO, et: '1 min' },
    { s: ORA, et: '1 h' },
    { s: GIORNO, et: '1 g' },
    { s: MESE, et: '1 mese' },
    { s: ANNO, et: '1 anno' },
    { s: 10 * ANNO, et: '10 anni' },
  ];

  /* ======================================================================
   * Simulatore di cache
   * ====================================================================== */

  // Latenze usate per stimare il tempo nel laboratorio: colpo in L1, mancato fino alla RAM.
  const LATENZA_CACHE_NS = 1;
  const LATENZA_RAM_NS = 100;

  function potenzaDi2(n) { return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0; }
  function log2(n) { return Math.round(Math.log2(n)); }

  // opz: { righe: 8, blocco: 4, vie: 1 | 2 | ..., ram: 64 } (tutte potenze di 2).
  function creaCache(opz) {
    const o = opz || {};
    const righe = o.righe || 8;
    const blocco = o.blocco || 4;
    const vie = o.vie || 1;
    const ram = o.ram || 64;
    [righe, blocco, vie, ram].forEach((n) => {
      if (!potenzaDi2(n)) throw new RangeError('creaCache: righe, blocco, vie e ram devono essere potenze di 2');
    });
    if (vie > righe || righe * blocco > ram) throw new RangeError('creaCache: configurazione impossibile');
    const insiemi = righe / vie;
    const c = {
      righe: righe, blocco: blocco, vie: vie, ram: ram, insiemi: insiemi,
      bit: { posizione: log2(blocco), indice: log2(insiemi), etichetta: log2(ram) - log2(blocco) - log2(insiemi) },
      tempo: 0, accessi: 0, colpi: 0, mancati: 0,
      ultimoBlocco: -1,
      visti: new Set(),
      ombra: [], // cache «ideale» completamente associativa della stessa capienza (per classificare i mancati)
      linee: [],
    };
    for (let s = 0; s < insiemi; s++) {
      const set = [];
      for (let v = 0; v < vie; v++) set.push({ valida: false, etichetta: 0, blocco: -1, uso: 0 });
      c.linee.push(set);
    }
    return c;
  }

  // Divide un indirizzo in blocco, posizione nel blocco, insieme (riga) ed etichetta.
  function scomponi(c, indirizzo) {
    const blocco = Math.floor(indirizzo / c.blocco);
    return {
      indirizzo: indirizzo,
      blocco: blocco,
      posizione: indirizzo % c.blocco,
      insieme: blocco % c.insiemi,
      etichetta: Math.floor(blocco / c.insiemi),
    };
  }

  function binario(n, bit) {
    if (bit <= 0) return '';
    return n.toString(2).padStart(bit, '0');
  }

  // I tre campi dell'indirizzo in binario, come li vede la cache.
  function campiIndirizzo(c, indirizzo) {
    const d = scomponi(c, indirizzo);
    return {
      etichetta: binario(d.etichetta, c.bit.etichetta),
      indice: binario(d.insieme, c.bit.indice),
      posizione: binario(d.posizione, c.bit.posizione),
      tutto: binario(indirizzo, log2(c.ram)),
    };
  }

  // Blocchi della RAM che si contendono lo stesso insieme.
  function rivali(c, blocco) {
    const out = [];
    const n = c.ram / c.blocco;
    for (let b = blocco % c.insiemi; b < n; b += c.insiemi) out.push(b);
    return out;
  }

  // Un accesso in lettura. Aggiorna la cache e restituisce che cosa è successo.
  function accedi(c, indirizzo) {
    if (!Number.isInteger(indirizzo) || indirizzo < 0 || indirizzo >= c.ram) {
      throw new RangeError('accedi: indirizzo fuori dalla RAM: ' + indirizzo);
    }
    const d = scomponi(c, indirizzo);
    c.tempo += 1;
    c.accessi += 1;
    const stessoBlocco = d.blocco === c.ultimoBlocco;
    c.ultimoBlocco = d.blocco;

    // Cache ideale (completamente associativa, LRU) della stessa capienza.
    const io = c.ombra.indexOf(d.blocco);
    const nellOmbra = io >= 0;
    if (nellOmbra) c.ombra.splice(io, 1);
    c.ombra.push(d.blocco);
    if (c.ombra.length > c.righe) c.ombra.shift();

    const set = c.linee[d.insieme];
    let via = set.findIndex((l) => l.valida && l.etichetta === d.etichetta);
    if (via >= 0) {
      set[via].uso = c.tempo;
      c.colpi += 1;
      c.visti.add(d.blocco);
      return Object.assign(d, {
        colpo: true, via: via, riga: d.insieme * c.vie + via, scartato: null,
        motivo: stessoBlocco ? 'spaziale' : 'temporale', ns: LATENZA_CACHE_NS,
      });
    }

    // Mancato: prima una via libera, altrimenti quella usata meno di recente (LRU).
    let scartato = null;
    via = set.findIndex((l) => !l.valida);
    if (via < 0) {
      via = 0;
      for (let v = 1; v < set.length; v++) if (set[v].uso < set[via].uso) via = v;
      scartato = { blocco: set[via].blocco, etichetta: set[via].etichetta };
    }
    let motivo = 'obbligatorio';
    if (c.visti.has(d.blocco)) motivo = nellOmbra ? 'conflitto' : 'capienza';
    c.visti.add(d.blocco);
    set[via] = { valida: true, etichetta: d.etichetta, blocco: d.blocco, uso: c.tempo };
    c.mancati += 1;
    return Object.assign(d, {
      colpo: false, via: via, riga: d.insieme * c.vie + via, scartato: scartato,
      motivo: motivo, ns: LATENZA_CACHE_NS + LATENZA_RAM_NS,
    });
  }

  // La via più vecchia di un insieme (la prossima da sostituire), o -1 se c'è una via libera.
  function prossimaVittima(c, insieme) {
    const set = c.linee[insieme];
    if (set.some((l) => !l.valida)) return -1;
    let via = 0;
    for (let v = 1; v < set.length; v++) if (set[v].uso < set[via].uso) via = v;
    return via;
  }

  // Tempo stimato (ns) con e senza cache.
  function stimaTempo(colpi, mancati) {
    return {
      conCache: colpi * LATENZA_CACHE_NS + mancati * (LATENZA_CACHE_NS + LATENZA_RAM_NS),
      senzaCache: (colpi + mancati) * LATENZA_RAM_NS,
    };
  }

  // Esegue un'intera sequenza di accessi su una cache nuova.
  function simula(opz, indirizzi) {
    const c = creaCache(opz);
    const esiti = indirizzi.map((a) => accedi(c, a));
    const t = stimaTempo(c.colpi, c.mancati);
    return {
      cache: c, esiti: esiti, colpi: c.colpi, mancati: c.mancati,
      percentuale: indirizzi.length ? (100 * c.colpi) / indirizzi.length : 0,
      conCache: t.conCache, senzaCache: t.senzaCache,
    };
  }

  /* ======================================================================
   * Schemi di accesso
   * ====================================================================== */

  // Generatore pseudocasuale con seme (mulberry32): stessa sequenza a ogni esecuzione.
  function rng(seme) {
    let a = seme >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SEME = 2026;

  const SCHEMI = [
    {
      id: 'sequenziale', nome: 'In fila',
      descrizione: 'Legge un array di 32 byte dall\'inizio alla fine: a[0], a[1], a[2]…',
      genera: function () { const out = []; for (let i = 0; i < 32; i++) out.push(i); return out; },
    },
    {
      id: 'casuale', nome: 'A caso',
      descrizione: '32 letture in punti qualsiasi dei 64 byte, come chi salta da una pagina all\'altra di un libro.',
      genera: function (seme) {
        const r = rng(seme == null ? SEME : seme);
        const out = [];
        for (let i = 0; i < 32; i++) out.push(Math.floor(r() * 64));
        return out;
      },
    },
    {
      id: 'ciclo', nome: 'Ciclo corto',
      descrizione: 'Un ciclo ripete quattro volte la lettura degli stessi 8 byte (per esempio i contatori di un gioco).',
      genera: function () { const out = []; for (let g = 0; g < 4; g++) for (let i = 0; i < 8; i++) out.push(i); return out; },
    },
    {
      id: 'conflitto', nome: 'Due array',
      descrizione: 'Somma due array distanti 32 byte: a[0], b[0], a[1], b[1]… Gli indirizzi a[i] e b[i] cadono sulla stessa riga.',
      genera: function () { const out = []; for (let i = 0; i < 16; i++) out.push(i, 32 + i); return out; },
    },
  ];

  function schema(id) { return SCHEMI.find((s) => s.id === id) || null; }
  function generaAccessi(id, seme) {
    const s = schema(id);
    if (!s) throw new RangeError('schema di accesso sconosciuto: ' + id);
    return s.genera(seme);
  }

  /* ======================================================================
   * Spiegazioni per il laboratorio (HTML semplice, solo numeri generati qui)
   * ====================================================================== */

  function intervallo(c, blocco) { return (blocco * c.blocco) + '–' + (blocco * c.blocco + c.blocco - 1); }
  function luogo(c, insieme) { return c.vie === 1 ? 'riga ' + insieme : 'insieme ' + insieme; }

  function spiegaAccesso(c, e) {
    const testa = 'Indirizzo <strong>' + e.indirizzo + '</strong> → blocco ' + intervallo(c, e.blocco) + ', ' + luogo(c, e.insieme) + '. ';
    if (e.colpo) {
      const perche = e.motivo === 'spaziale'
        ? 'È la <strong>località spaziale</strong>: il blocco era arrivato con un accesso vicino.'
        : 'È la <strong>località temporale</strong>: il dato era già servito poco fa.';
      return testa + 'L\'etichetta corrisponde: <strong>colpo</strong>, il dato arriva in 1 ns. ' + perche;
    }
    let perche;
    if (e.motivo === 'obbligatorio') perche = 'È la prima volta che serve questo blocco: un mancato inevitabile.';
    else if (e.motivo === 'conflitto') perche = 'Il blocco c\'era già stato, ma un altro blocco che usa la stessa ' + (c.vie === 1 ? 'riga' : 'posizione') + ' l\'ha scacciato: <strong>mancato per conflitto</strong>.';
    else perche = 'Il blocco c\'era già stato, ma è uscito perché la cache era piena: <strong>mancato per capienza</strong>.';
    let fuori = '';
    if (e.scartato) {
      fuori = c.vie === 1
        ? ' Per fargli posto esce il blocco ' + intervallo(c, e.scartato.blocco) + '.'
        : ' Le ' + c.vie + ' vie sono occupate: esce il blocco usato meno di recente (LRU), ' + intervallo(c, e.scartato.blocco) + '.';
    }
    return testa + '<strong>Mancato</strong>: i 4 byte ' + intervallo(c, e.blocco) + ' arrivano dalla RAM in circa 100 ns. ' + perche + fuori;
  }

  /* ======================================================================
   * Le generazioni della RAM dei PC (anno dello standard JEDEC)
   * ====================================================================== */

  const GENERAZIONI_RAM = [
    { nome: 'SDRAM', anno: 1993, contatti: 168, volt: 3.3, esempio: 'PC100', mts: 100, gbs: 0.8 },
    { nome: 'DDR', anno: 2000, contatti: 184, volt: 2.5, esempio: 'DDR-400', mts: 400, gbs: 3.2 },
    { nome: 'DDR2', anno: 2003, contatti: 240, volt: 1.8, esempio: 'DDR2-800', mts: 800, gbs: 6.4 },
    { nome: 'DDR3', anno: 2007, contatti: 240, volt: 1.5, esempio: 'DDR3-1600', mts: 1600, gbs: 12.8 },
    { nome: 'DDR4', anno: 2012, contatti: 288, volt: 1.2, esempio: 'DDR4-3200', mts: 3200, gbs: 25.6 },
    { nome: 'DDR5', anno: 2020, contatti: 288, volt: 1.1, esempio: 'DDR5-6400', mts: 6400, gbs: 51.2 },
  ];

  // Banda di picco di un modulo a 64 bit (8 byte per trasferimento), in GB/s.
  function bandaModulo(mts) { return (mts * 8) / 1000; }

  const api = {
    // formattazione
    numeroIt: numeroIt,
    compatto: compatto,
    formattaDurata: formattaDurata,
    formattaNs: formattaNs,
    UNITA_TEMPO: { MINUTO: MINUTO, ORA: ORA, GIORNO: GIORNO, MESE: MESE, ANNO: ANNO },
    // gerarchia e tempo umano
    CICLO_NS: CICLO_NS,
    LIVELLI: LIVELLI,
    perId: perId,
    secondiUmani: secondiUmani,
    cicli: cicli,
    tempoUmano: tempoUmano,
    durataAttesa: durataAttesa,
    orologio: orologio,
    posizioneLog: posizioneLog,
    SCALA_MAX_S: SCALA_MAX_S,
    TACCHE: TACCHE,
    // cache
    LATENZA_CACHE_NS: LATENZA_CACHE_NS,
    LATENZA_RAM_NS: LATENZA_RAM_NS,
    creaCache: creaCache,
    scomponi: scomponi,
    campiIndirizzo: campiIndirizzo,
    rivali: rivali,
    accedi: accedi,
    prossimaVittima: prossimaVittima,
    stimaTempo: stimaTempo,
    simula: simula,
    // schemi di accesso
    rng: rng,
    SEME: SEME,
    SCHEMI: SCHEMI,
    schema: schema,
    generaAccessi: generaAccessi,
    spiegaAccesso: spiegaAccesso,
    intervallo: intervallo,
    // RAM dei PC
    GENERAZIONI_RAM: GENERAZIONI_RAM,
    bandaModulo: bandaModulo,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['memoria'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
