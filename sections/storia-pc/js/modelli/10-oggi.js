/*
 * Storia del PC · capitolo 10 (oggi): dati e logica pura, senza DOM.
 *
 * 1. «Dal PC a un solo chip»: i pezzi principali di un PC desktop del 1988 e le
 *    tappe con cui entrano, uno alla volta, nel package e poi nel die del processore.
 *    statoAnno(anno) dice dove sta ogni componente in un certo anno, quanti pezzi
 *    restano sulla scheda madre e quanta strada fanno in media i dati.
 * 2. «In valigia o in tasca»: Osborne 1, un portatile del 2008 e uno smartphone
 *    a confronto (massa, spessore, autonomia, transistor), con valori verificati.
 */
(function (root) {
  'use strict';

  const ANNO_MIN = 1988;
  const ANNO_MAX = 2024;

  // Dove può stare un componente.
  //   scheda   pezzo separato sulla scheda madre (chip, modulo o scheda di espansione)
  //   sud      funzione assorbita dal ponte sud (il chipset delle periferiche)
  //   package  nello stesso contenitore del processore, su un pezzo di silicio separato
  //   die      sullo stesso pezzo di silicio (die) del processore
  //   assente  non esiste ancora
  const LUOGHI = ['scheda', 'sud', 'package', 'die', 'assente'];

  // Strada (indicativa, in cm) che un dato fa dal processore a un componente
  // quando questo è nel package o sul die.
  const STRADA_PACKAGE = 1.5;
  const STRADA_DIE = 0.5;

  // I pezzi della scheda. «via» e «tratto» descrivono il percorso dei dati su una
  // scheda Baby AT (circa 22 x 33 cm): per esempio la RAM si raggiunge passando dal
  // ponte nord, con un tratto di circa 6 cm dal ponte nord agli zoccoli dei moduli.
  // Le lunghezze sono indicative: servono a confrontare le epoche, non a misurare
  // una scheda precisa.
  const COMPONENTI = [
    { id: 'cpu', breve: 'Processore', nome: 'Processore (CPU)', sigla: 'CPU', via: null, tratto: 0,
      descr: 'Il cervello del computer: esegue le istruzioni dei programmi una dopo l\'altra.' },
    { id: 'fpu', breve: 'Coprocessore', nome: 'Coprocessore matematico (FPU)', sigla: 'FPU', via: 'cpu', tratto: 4,
      descr: 'Calcola con i numeri con la virgola (floating point) molto più in fretta del processore da solo.' },
    { id: 'cache', breve: 'Cache', nome: 'Memoria cache (SRAM)', sigla: 'L2', via: 'cpu', tratto: 7,
      descr: 'Una piccola memoria velocissima che tiene a portata di mano i dati usati più spesso.' },
    { id: 'nord', breve: 'Ponte nord', nome: 'Ponte nord: controller della memoria', sigla: 'MC', via: 'cpu', tratto: 8,
      descr: 'Il chip che comanda la RAM e smista il traffico veloce fra processore, memoria e scheda video.' },
    { id: 'sud', breve: 'Ponte sud', nome: 'Ponte sud (dal 2009 PCH)', sigla: 'I/O', via: 'nord', tratto: 7,
      descr: 'Il chip delle periferiche: dischi, tastiera, porte, e poi USB, audio e rete.' },
    { id: 'ram', breve: 'Memoria RAM', nome: 'Memoria centrale (RAM)', sigla: 'RAM', via: 'nord', tratto: 6,
      descr: 'La memoria di lavoro dove stanno i programmi e i dati in uso; si svuota quando si spegne.' },
    { id: 'video', breve: 'Scheda video', nome: 'Scheda video (GPU)', sigla: 'GPU', via: 'nord', tratto: 8,
      descr: 'Disegna l\'immagine sullo schermo; oggi è un processore specializzato in calcoli in parallelo.' },
    { id: 'audio', breve: 'Scheda audio', nome: 'Scheda audio', sigla: 'Audio', via: 'sud', tratto: 6,
      descr: 'Trasforma i suoni digitali in segnali per gli altoparlanti e registra dal microfono.' },
    { id: 'rete', breve: 'Scheda di rete', nome: 'Scheda di rete', sigla: 'Rete', via: 'sud', tratto: 8,
      descr: 'Collega il computer alle altre macchine attraverso un cavo Ethernet.' },
    { id: 'modem', breve: 'Modem', nome: 'Modem', sigla: 'Modem', via: 'sud', tratto: 10,
      descr: 'Trasforma i dati in suoni per viaggiare sulla linea del telefono, e viceversa.' },
    { id: 'npu', breve: 'NPU', nome: 'Unità per l\'intelligenza artificiale (NPU)', sigla: 'NPU', via: null, tratto: 0, nuovo: true,
      descr: 'Un\'unità nuova, che nel 1988 non esisteva: fa a basso consumo i calcoli delle reti neurali.' },
  ];

  // Componenti di cui si misura la strada media (il processore è il punto di partenza,
  // l'NPU non c'era all'inizio e non ha un percorso da confrontare).
  const MISURATI = ['fpu', 'cache', 'nord', 'sud', 'ram', 'video', 'audio', 'rete', 'modem'];

  // Le tappe dell'integrazione. Ogni tappa sposta uno o più componenti; «evidenzia»
  // segnala i componenti di cui parla anche quando non si spostano.
  const TAPPE = [
    { anno: 1988, id: 'inizio', titolo: 'Ogni funzione ha il suo chip',
      esempio: 'un PC con Intel 386 e coprocessore 387',
      cambi: [], evidenzia: [],
      testo: 'Sulla scheda madre ci sono dieci pezzi principali: il processore, il coprocessore matematico in uno zoccolo accanto, i chip della cache, i due chip del chipset (che negli anni Novanta si chiameranno ponte nord e ponte sud), i moduli di RAM e quattro schede di espansione per video, audio, rete e modem. Molti PC dei primi anni Novanta erano ancora fatti così, e i dati correvano su piste di rame lunghe decine di centimetri.' },
    { anno: 1989, id: 'fpu', titolo: 'La matematica entra nel processore',
      esempio: 'Intel 486DX (aprile 1989)',
      cambi: [{ id: 'fpu', dove: 'die' }], evidenzia: ['fpu'],
      testo: 'Il 486DX contiene sullo stesso pezzo di silicio l\'unità per i numeri con la virgola (FPU, floating point unit) e 8 KB di cache: lo zoccolo del coprocessore non serve più. Il 486SX del 1991, più economico, ne era privo.' },
    { anno: 1995, id: 'l2-package', titolo: 'La cache di secondo livello nel package',
      esempio: 'Intel Pentium Pro (novembre 1995)',
      cambi: [{ id: 'cache', dove: 'package' }], evidenzia: ['cache'],
      testo: 'Il Pentium Pro porta la cache di secondo livello (L2, da 256 o 512 KB) dentro il contenitore del processore: due pezzi di silicio uno accanto all\'altro, collegati da piste di pochi millimetri e alla stessa velocità del processore.' },
    { anno: 1999, id: 'l2-die', titolo: 'La cache L2 sullo stesso die',
      esempio: 'AMD K6-III e Intel Pentium III «Coppermine» (1999)',
      cambi: [{ id: 'cache', dove: 'die' }], evidenzia: ['cache'],
      testo: 'Con transistor sempre più piccoli la cache L2 trova posto sullo stesso pezzo di silicio del processore, il die: è più veloce, si monta più facilmente e consuma meno.' },
    { anno: 2000, id: 'chipset', titolo: 'Audio, modem e rete passano nel chipset',
      esempio: 'chipset Intel 810 con ICH (1999) e ICH2 (2000)',
      cambi: [{ id: 'audio', dove: 'sud' }, { id: 'modem', dove: 'sud' }, { id: 'rete', dove: 'sud' }], evidenzia: ['sud'],
      testo: 'Con lo standard AC\'97 (1997) la parte digitale dell\'audio e del modem entra nel ponte sud; sulla scheda madre resta solo un piccolo chip analogico, il codec. Con l\'ICH2 del 2000 nel ponte sud entra anche il controllore di rete. Tre schede di espansione diventano funzioni di un solo chip.' },
    { anno: 2003, id: 'mc-amd', titolo: 'Il controller della memoria entra nel processore',
      esempio: 'AMD Opteron e Athlon 64 (2003)',
      cambi: [{ id: 'nord', dove: 'die' }], evidenzia: ['nord', 'ram'],
      testo: 'Il compito principale del ponte nord, comandare la RAM, passa dentro il processore: i dati arrivano dalla memoria senza fermate intermedie e la strada si accorcia. Per l\'Athlon 64 c\'erano già schede con un solo chip di supporto, come l\'NVIDIA nForce3.' },
    { anno: 2008, id: 'mc-intel', titolo: 'Anche Intel: resta un solo chip di supporto',
      esempio: 'Intel Core i7 «Nehalem» (2008) e chipset P55 (2009)',
      cambi: [], evidenzia: ['nord', 'sud'],
      testo: 'Nel novembre 2008 anche Intel porta il controller della memoria nel processore, con il Core i7 «Nehalem». Nel 2009, con il chipset P55, il ponte nord sparisce del tutto: sulla scheda resta un solo chip di supporto, il PCH (platform controller hub), erede del ponte sud.' },
    { anno: 2010, id: 'gpu-package', titolo: 'La grafica entra nel package',
      esempio: 'Intel Core «Clarkdale» e «Arrandale» (gennaio 2010)',
      cambi: [{ id: 'video', dove: 'package' }], evidenzia: ['video'],
      testo: 'Accanto al processore, nello stesso contenitore, arriva un secondo pezzo di silicio con la grafica. Per i giochi più pesanti serve ancora una scheda video, ma per lavorare, navigare e guardare film basta quella integrata. Molti PC economici avevano già la grafica nel chipset, fin dal 1999.' },
    { anno: 2011, id: 'gpu-die', titolo: 'Processore e grafica sullo stesso die',
      esempio: 'Intel «Sandy Bridge» (gennaio 2011) e AMD «Llano» (giugno 2011)',
      cambi: [{ id: 'video', dove: 'die' }], evidenzia: ['video'],
      testo: 'CPU e GPU (graphics processing unit) condividono lo stesso silicio e una parte della cache. AMD chiama questi chip APU, accelerated processing unit.' },
    { anno: 2013, id: 'pch-package', titolo: 'Il chipset entra nel package',
      esempio: 'Intel Core «Haswell» per ultraportatili (giugno 2013)',
      cambi: [{ id: 'sud', dove: 'package' }], evidenzia: ['sud'],
      testo: 'Nei portatili sottili anche il PCH, con USB, dischi, audio e rete, finisce nello stesso contenitore del processore: sulla scheda madre restano il package e la memoria. Si risparmiano spazio, piste e watt.' },
    { anno: 2020, id: 'soc', titolo: 'Un sistema su chip con memoria unificata',
      esempio: 'Apple M1 (novembre 2020)',
      cambi: [{ id: 'ram', dove: 'package' }, { id: 'sud', dove: 'die' }, { id: 'npu', dove: 'die' }], evidenzia: ['ram', 'npu'],
      testo: 'L\'M1 è un SoC (system on a chip, sistema su chip): sullo stesso die stanno CPU, GPU, Neural Engine (un\'NPU, neural processing unit) e i controllori delle periferiche; i chip della memoria sono nello stesso package. CPU e GPU usano la stessa memoria senza copiarsi i dati: è la memoria unificata. Il MacBook Air con M1 non ha nemmeno la ventola.' },
    { anno: 2024, id: 'x86-npu', titolo: 'Memoria nel package anche su x86, e un\'NPU in ogni PC',
      esempio: 'Intel Core Ultra 200V «Lunar Lake», Qualcomm Snapdragon X, AMD Ryzen AI 300',
      cambi: [], evidenzia: ['ram', 'npu'],
      testo: 'Anche i processori x86 per portatili mettono la memoria nel package (Lunar Lake, settembre 2024). Per i Copilot+ PC Microsoft chiede un\'NPU da almeno 40 TOPS, cioè 40 mila miliardi di operazioni al secondo: un\'unità nuova, che nel 1988 non c\'era, per i calcoli dell\'intelligenza artificiale.' },
  ];

  function componente(id) {
    return COMPONENTI.find((c) => c.id === id) || null;
  }

  function tappa(id) {
    return TAPPE.find((t) => t.id === id) || null;
  }

  function limitaAnno(anno) {
    const a = Math.round(Number(anno));
    if (!Number.isFinite(a)) return ANNO_MIN;
    return Math.min(ANNO_MAX, Math.max(ANNO_MIN, a));
  }

  // Ultima tappa raggiunta in un anno.
  function tappaDellAnno(anno) {
    const a = limitaAnno(anno);
    let ultima = TAPPE[0];
    for (const t of TAPPE) if (t.anno <= a) ultima = t;
    return ultima;
  }

  function tappaSuccessiva(anno) {
    const a = limitaAnno(anno);
    return TAPPE.find((t) => t.anno > a) || null;
  }

  function tappaPrecedente(anno) {
    const a = limitaAnno(anno);
    let prec = null;
    for (const t of TAPPE) if (t.anno < a) prec = t;
    return prec;
  }

  // Posizione «grezza» di ogni componente in un anno (scheda, sud, package, die, assente).
  function posizioni(anno) {
    const a = limitaAnno(anno);
    const pos = {};
    COMPONENTI.forEach((c) => { pos[c.id] = c.nuovo ? 'assente' : 'scheda'; });
    TAPPE.forEach((t) => {
      if (t.anno > a) return;
      t.cambi.forEach((k) => { pos[k.id] = k.dove; });
    });
    return pos;
  }

  // Posizione effettiva: chi è dentro il ponte sud sta dove sta il ponte sud.
  function effettiva(pos, id) {
    const p = pos[id];
    return p === 'sud' ? pos.sud : p;
  }

  // Strada (cm, indicativa) dal processore a un componente, seguendo i ponti che restano sulla scheda.
  function strada(pos, id) {
    if (id === 'cpu') return 0;
    const dove = pos[id];
    if (dove === 'assente') return null;
    if (dove === 'die') return STRADA_DIE;
    if (dove === 'package') return STRADA_PACKAGE;
    if (dove === 'sud') return strada(pos, 'sud');
    const c = componente(id);
    return strada(pos, c.via) + c.tratto;
  }

  function arrotonda(v, dec) {
    const k = Math.pow(10, dec);
    return Math.round(v * k) / k;
  }

  // Tutto quello che serve al laboratorio per disegnare un anno.
  function statoAnno(anno) {
    const a = limitaAnno(anno);
    const pos = posizioni(a);
    const eff = {};
    COMPONENTI.forEach((c) => { eff[c.id] = effettiva(pos, c.id); });
    // Pezzi separati: quelli ancora sulla scheda come chip o schede a sé (chi è nel ponte sud non conta).
    const separati = COMPONENTI.filter((c) => pos[c.id] === 'scheda').map((c) => c.id);
    const integrati = COMPONENTI.filter((c) => c.id !== 'cpu' && (eff[c.id] === 'package' || eff[c.id] === 'die')).map((c) => c.id);
    const nelSud = COMPONENTI.filter((c) => pos[c.id] === 'sud').map((c) => c.id);
    const strade = {};
    MISURATI.forEach((id) => { strade[id] = arrotonda(strada(pos, id), 2); });
    const media = MISURATI.reduce((s, id) => s + strada(pos, id), 0) / MISURATI.length;
    return {
      anno: a,
      tappa: tappaDellAnno(a),
      posizioni: pos,
      effettive: eff,
      separati: separati,
      integrati: integrati,
      nelSud: nelSud,
      pezziScheda: separati.length,
      strade: strade,
      stradaMedia: arrotonda(media, 2),
      nomeSud: a >= 2009 ? 'PCH' : 'Ponte sud',
    };
  }

  function componentiSeparati(anno) { return statoAnno(anno).separati; }
  function componentiIntegrati(anno) { return statoAnno(anno).integrati; }

  /* ---------- In valigia o in tasca ---------- */

  // Valori dichiarati dai costruttori o misurati sulle macchine (vedi le fonti nel capitolo).
  // L'autonomia è quella dichiarata, con usi diversi: è un ordine di grandezza.
  // I transistor del processore sono un indice (grezzo) della potenza di calcolo.
  const PORTATILI = [
    { id: 'osborne', nome: 'Osborne 1', anno: 1981,
      massaKg: 11.1, spessoreCm: 22.9, autonomiaOre: 0, transistor: 8500,
      processore: 'Zilog Z80A a 4 MHz (8 bit)',
      dettagli: { massa: '24,5 libbre, con due unità per dischetti e lo schermo da 5 pollici', spessore: 'alto 9 pollici: è il suo lato più corto', autonomia: 'nessuna batteria interna: si collegava alla presa', transistor: 'circa 8.500 transistor nello Z80' } },
    { id: 'air', nome: 'MacBook Air', anno: 2008,
      massaKg: 1.36, spessoreCm: 1.94, autonomiaOre: 5, transistor: 291e6,
      processore: 'Intel Core 2 Duo a 1,6 GHz (2 core)',
      dettagli: { massa: '3 libbre, senza lettore di dischi ottici', spessore: 'da 0,4 cm davanti a 1,94 cm nel punto più spesso', autonomia: 'fino a 5 ore senza fili, secondo Apple', transistor: '291 milioni nel Core 2 Duo' } },
    { id: 'telefono', nome: 'iPhone 15 Pro', anno: 2023,
      massaKg: 0.187, spessoreCm: 0.825, autonomiaOre: 23, transistor: 19e9,
      processore: 'Apple A17 Pro (6 core)',
      dettagli: { massa: '187 grammi', spessore: '8,25 millimetri', autonomia: 'fino a 23 ore di video, secondo Apple', transistor: '19 miliardi nell\'A17 Pro' } },
  ];

  const METRICHE = [
    { id: 'massa', nome: 'Massa', campo: 'massaKg', unita: 'kg', scala: 'lineare',
      spiega: 'La massa scende di quasi sessanta volte: l\'Osborne si portava con la maniglia, il telefono sta in una tasca.' },
    { id: 'spessore', nome: 'Spessore', campo: 'spessoreCm', unita: 'cm', scala: 'lineare',
      spiega: 'Spessore del lato più corto, a computer chiuso. Ventotto telefoni impilati sono alti quanto un Osborne 1.' },
    { id: 'autonomia', nome: 'Autonomia', campo: 'autonomiaOre', unita: 'ore', scala: 'lineare',
      spiega: 'Ore di funzionamento a batteria dichiarate dal costruttore, con usi diversi: valgono come ordine di grandezza. L\'Osborne 1 non aveva una batteria interna.' },
    { id: 'transistor', nome: 'Transistor', campo: 'transistor', unita: 'transistor', scala: 'log', min: 1e3, max: 1e11,
      spiega: 'Transistor nel processore principale, su scala logaritmica: ogni tacca vale dieci volte la precedente. Non misurano la velocità, ma danno un\'idea di quanto lavoro il chip può fare.' },
  ];

  function metrica(id) {
    return METRICHE.find((m) => m.id === id) || null;
  }

  // Frazione (0-1) della barra per un valore, su scala lineare (rispetto al massimo)
  // o logaritmica (fra min e max della metrica).
  function frazione(m, valore) {
    const met = typeof m === 'string' ? metrica(m) : m;
    if (!met || !(valore > 0)) return 0;
    if (met.scala === 'log') {
      const lo = Math.log10(met.min), hi = Math.log10(met.max);
      return Math.min(1, Math.max(0, (Math.log10(valore) - lo) / (hi - lo)));
    }
    const max = Math.max(...PORTATILI.map((p) => p[met.campo]));
    return Math.min(1, Math.max(0, valore / max));
  }

  // Quante volte a è più grande di b (null se b è zero).
  function rapporto(idA, idB, idMetrica) {
    const met = metrica(idMetrica);
    const a = PORTATILI.find((p) => p.id === idA);
    const b = PORTATILI.find((p) => p.id === idB);
    if (!met || !a || !b || !b[met.campo]) return null;
    return a[met.campo] / b[met.campo];
  }

  function confronto(idMetrica) {
    const met = metrica(idMetrica);
    if (!met) return [];
    return PORTATILI.map((p) => ({ id: p.id, nome: p.nome, anno: p.anno, valore: p[met.campo], frazione: frazione(met, p[met.campo]), dettaglio: p.dettagli[met.id] }));
  }

  const api = {
    ANNO_MIN: ANNO_MIN,
    ANNO_MAX: ANNO_MAX,
    LUOGHI: LUOGHI,
    STRADA_PACKAGE: STRADA_PACKAGE,
    STRADA_DIE: STRADA_DIE,
    COMPONENTI: COMPONENTI,
    MISURATI: MISURATI,
    TAPPE: TAPPE,
    PORTATILI: PORTATILI,
    METRICHE: METRICHE,
    componente: componente,
    tappa: tappa,
    limitaAnno: limitaAnno,
    tappaDellAnno: tappaDellAnno,
    tappaSuccessiva: tappaSuccessiva,
    tappaPrecedente: tappaPrecedente,
    posizioni: posizioni,
    statoAnno: statoAnno,
    componentiSeparati: componentiSeparati,
    componentiIntegrati: componentiIntegrati,
    metrica: metrica,
    frazione: frazione,
    rapporto: rapporto,
    confronto: confronto,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['oggi'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
