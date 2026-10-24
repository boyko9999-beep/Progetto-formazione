/*
 * Storia del PC · capitolo 1 (giganti): dati e logica pura, senza DOM.
 *
 * Il laboratorio «Il computer che si rimpicciolisce» mette sette macchine, in scala,
 * accanto a una persona alta 1,75 m. Qui stanno:
 *  - i dati delle macchine, tutti «circa»: dove le fonti non concordano c'è un
 *    intervallo { min, max }, dove non sono affidabili il valore manca (null);
 *  - i confronti con l'ENIAC: rapporti, scala logaritmica, formattazione all'italiana
 *    con i prefissi (kW, t, cm², milioni, miliardi);
 *  - la geometria della «telecamera»: inquadrature, zoom intorno a un punto fisso,
 *    barra della scala e griglia a potenze di dieci.
 *
 * Fonti dei numeri (controllate nell'ottobre 2026):
 *  - ENIAC: 17.468 valvole, circa 27 t (30 tonnellate corte), circa 150 kW (altre fonti
 *    fino a 174 kW), 1.800 piedi quadrati (167 m²), 40 pannelli a U lungo tre pareti di
 *    una sala di 15 × 9 m, circa 2,4 × 0,9 × 30 m, 5.000 addizioni al secondo,
 *    costo circa 487.000 dollari (Università della Pennsylvania, IEEE).
 *  - UNIVAC I: circa 5.200 valvole, 29.000 libbre (13 t) per il sistema completo,
 *    7,6 t secondo altre fonti, 125 kW, 1.905 operazioni al secondo, oltre 35,5 m²,
 *    unità centrale 4,3 × 2,4 × 2,6 m, da 1,25 a 1,5 milioni di dollari, 46 esemplari.
 *  - IBM 1401: da 2 a 4 t e fino a 13 kW (scheda del Computer History Museum);
 *    da 2,88 a 12,15 kW, 33,8 piedi quadrati minimi di macchine, addizione di due numeri
 *    di 8 cifre in 300 µs (rassegna BRL del 1964); affitto da 2.500 dollari al mese;
 *    oltre 12.000 prodotti. Le misure delle sagome sono approssimate.
 *  - DEC PDP-8: 780 W, 18.000 dollari, ciclo di memoria di 1,5 µs (scheda DEC; altre
 *    fonti danno 18.500 dollari); armadio di 62 × 24 × 25,5 pollici (Computer History
 *    Museum, esemplare n. 8 del 1965); la massa non ha una fonte affidabile: omessa.
 *  - IBM PC 5150: unità centrale 50,8 × 40,6 × 14 cm, 12,7 kg con due floppy, monitor
 *    7,7 kg, alimentatore da 63,5 W, 1.565 dollari senza dischi né monitor.
 *  - Portatile e smartphone di oggi: valori tipici, ordini di grandezza.
 */
(function (root) {
  'use strict';

  const ALTEZZA_PERSONA = 1.75;          // metri
  const LARGHEZZA_PERSONA = 0.54;        // metri, vista di fronte con le braccia lungo i fianchi
  const SCRIVANIA = { x: -0.15, larghezza: 1.4, altezza: 0.75 };

  // Le quattro grandezze confrontate con barre in scala logaritmica.
  // scala: estremi della barra; prima/piu/meno: pezzi della frase del confronto.
  const GRANDEZZE = {
    ops: { nome: 'Velocità', unita: 'operazioni al secondo', scala: [1e2, 1e12], prima: '', piu: 'più veloce', meno: 'più lento' },
    massa: { nome: 'Massa', unita: 'kg', scala: [1e-1, 1e5], prima: '', piu: 'più pesante', meno: 'più leggero' },
    potenza: { nome: 'Potenza elettrica', unita: 'W', scala: [1, 1e6], prima: 'consuma ', piu: 'di più', meno: 'meno' },
    superficie: { nome: 'Superficie occupata', unita: 'm²', scala: [1e-3, 1e3], prima: 'occupa ', piu: 'più spazio', meno: 'meno spazio' },
  };
  const CHIAVI = ['ops', 'massa', 'potenza', 'superficie'];

  // Ciclo di memoria del PDP-8: un'addizione (TAD) occupa due cicli.
  const PDP8_CICLO_S = 1.5e-6;

  /*
   * Le sette macchine. Ogni grandezza è { val } oppure { min, max } oppure null.
   * scena: geometria in metri (x verso destra, y verso l'alto dal pavimento):
   *   personaX  centro della persona;
   *   scatola   ingombro della macchina (sulla scrivania, se scrivania è vero);
   *   vicino    zona da inquadrare «da vicino»;
   *   piccola   la telecamera, dopo aver mostrato la persona, si avvicina da sola.
   */
  const MACCHINE = [
    {
      id: 'eniac',
      nome: 'ENIAC',
      anno: 1946,
      epoca: '1946',
      luogo: 'Moore School, Università della Pennsylvania (Filadelfia)',
      tecnologia: '17.468 valvole; si programma con cavi e commutatori',
      prezzo: 'circa 487.000 dollari (costo di costruzione)',
      diffusione: 'un solo esemplare',
      ops: { val: 5000, testo: 'circa 5.000 addizioni al secondo' },
      massa: { val: 27000, testo: 'circa 27 t' },
      potenza: { val: 150000, testo: 'circa 150 kW' },
      superficie: { val: 167, testo: 'circa 167 m² (una sala di 15 × 9 m)' },
      scena: {
        personaX: -1.1,
        scatola: { x: 0, y: 0, w: 30, h: 2.4 },
        vicino: { x: 12, y: 0, w: 6, h: 2.4 },
        misura: '40 pannelli messi in fila: circa 30 m',
      },
      racconto: '<strong>ENIAC, 1946.</strong> I suoi 40 pannelli stavano a U lungo tre pareti di una sala di 15 × 9 metri: qui li vedi messi in fila, una parete lunga circa 30 m e alta 2,4. Dentro c\'erano 17.468 valvole accese come lampadine. Per cambiare programma si ricollegavano a mano cavi e commutatori.',
    },
    {
      id: 'univac',
      nome: 'UNIVAC I',
      anno: 1951,
      epoca: '1951',
      luogo: 'Remington Rand; il primo esemplare al Census Bureau',
      tecnologia: 'circa 5.200 valvole, memoria a linee di ritardo, nastri magnetici',
      prezzo: 'da 1,25 a 1,5 milioni di dollari (i primi contratti costavano meno)',
      diffusione: '46 esemplari',
      ops: { val: 1905, testo: 'circa 1.900 operazioni al secondo' },
      massa: { min: 7600, max: 13000, testo: 'da 7,6 a 13 t secondo le fonti' },
      potenza: { val: 125000, testo: 'circa 125 kW' },
      superficie: { val: 35.5, testo: 'oltre 35 m² per il sistema completo' },
      scena: {
        personaX: -0.9,
        scatola: { x: 0, y: 0, w: 7.5, h: 2.6 },
        vicino: { x: 1.9, y: 0, w: 5.7, h: 2.6 },
        misura: 'unità centrale: circa 4,3 × 2,6 m',
        indicativa: 'console e unità a nastro sono indicative',
      },
      racconto: '<strong>UNIVAC I, 1951.</strong> L\'unità centrale da sola è grande come una stanzetta, eppure nelle somme semplici è più lenta dell\'ENIAC: circa 1.900 operazioni al secondo contro 5.000. Ma il programma sta in memoria e i dati arrivano da nastri magnetici: il computer diventa un prodotto da comprare, non un esperimento da costruire.',
    },
    {
      id: 'ibm1401',
      nome: 'IBM 1401',
      anno: 1959,
      epoca: '1959',
      luogo: 'IBM, Stati Uniti; installato in migliaia di aziende',
      tecnologia: 'transistor e memoria a nuclei di ferrite',
      prezzo: 'in affitto da 2.500 dollari al mese',
      diffusione: 'oltre 12.000 esemplari prodotti',
      ops: { val: 3300, testo: 'circa 3.300 addizioni al secondo (numeri di 8 cifre)' },
      massa: { min: 2000, max: 4000, testo: 'da 2 a 4 t secondo la configurazione' },
      potenza: { min: 2900, max: 13000, testo: 'da circa 3 a 13 kW secondo la configurazione' },
      superficie: { val: 3.1, testo: 'circa 3 m² di macchine nella configurazione minima' },
      scena: {
        personaX: -0.9,
        scatola: { x: 0, y: 0, w: 4.4, h: 1.4 },
        vicino: { x: 1.3, y: 0, w: 1.8, h: 1.4 },
        misura: 'lettore di schede, unità centrale e stampante',
        indicativa: 'sagome approssimate',
      },
      racconto: '<strong>IBM 1401, 1959.</strong> Transistor al posto delle valvole: niente filamenti da scaldare, meno guasti, molta meno corrente. Nelle somme non è più veloce dell\'ENIAC, ma costa così poco, in confronto, che migliaia di aziende lo affittano per paghe, fatture e magazzino. Le sagome di lettore di schede, unità centrale e stampante sono approssimate.',
    },
    {
      id: 'pdp8',
      nome: 'PDP-8',
      anno: 1965,
      epoca: '1965',
      luogo: 'Digital Equipment Corporation, Maynard (Massachusetts)',
      tecnologia: 'transistor su schedine innestabili, parole di 12 bit',
      prezzo: 'circa 18.000 dollari',
      diffusione: 'oltre 50.000 esemplari della famiglia PDP-8',
      ops: { val: 1 / (2 * PDP8_CICLO_S), testo: 'circa 330.000 addizioni al secondo' },
      massa: null,
      potenza: { val: 780, testo: 'circa 780 W' },
      superficie: { val: 0.4, testo: 'circa 0,4 m² (armadio di 61 × 65 cm)' },
      scena: {
        personaX: -0.7,
        scatola: { x: 0, y: 0, w: 0.61, h: 1.57 },
        vicino: { x: 0, y: 1.0, w: 0.61, h: 0.57 },
        misura: 'armadio alto circa 1,57 m',
      },
      racconto: '<strong>PDP-8, 1965.</strong> Il primo minicomputer di successo: un armadio grande come un piccolo frigorifero, da circa 18.000 dollari. Un laboratorio poteva averne uno tutto per sé, senza fare la fila al centro di calcolo. Nelle addizioni è già quasi 70 volte più veloce dell\'ENIAC. La sua massa non ha una fonte affidabile, quindi qui manca.',
    },
    {
      id: 'ibmpc',
      nome: 'IBM PC',
      anno: 1981,
      epoca: '1981',
      luogo: 'IBM, Boca Raton (Florida)',
      tecnologia: 'microprocessore Intel 8088 a 4,77 MHz',
      prezzo: 'da 1.565 dollari (senza dischi né monitor)',
      diffusione: 'il capostipite di centinaia di milioni di PC compatibili',
      ops: { val: 330000, testo: 'circa 330.000 istruzioni al secondo' },
      massa: { val: 20.4, testo: 'circa 20 kg (unità centrale con due floppy e monitor)' },
      potenza: { val: 63.5, testo: '63,5 W, il massimo dell\'alimentatore' },
      superficie: { val: 0.21, testo: 'circa 0,2 m² di scrivania (51 × 41 cm)' },
      scena: {
        personaX: -0.6,
        scrivania: true,
        scatola: { x: 0.33, y: 0.75, w: 0.51, h: 0.44 },
        vicino: { x: 0.33, y: 0.75, w: 0.51, h: 0.44 },
        misura: 'unità centrale larga 51 cm',
      },
      racconto: '<strong>IBM PC, 1981.</strong> Il computer arriva sulla scrivania: con il monitor pesa circa 20 kg e il suo alimentatore eroga al massimo 63,5 W, quanto una lampadina di allora. Esegue circa 330.000 istruzioni al secondo, come un PDP-8, ma costa più di dieci volte meno. Lo racconta il capitolo 4.',
    },
    {
      id: 'portatile',
      nome: 'Portatile',
      anno: 2024,
      epoca: 'oggi',
      luogo: 'ovunque',
      tecnologia: 'un sistema su chip con miliardi di transistor',
      prezzo: 'circa 1.000 dollari (fascia media)',
      diffusione: 'centinaia di milioni venduti ogni anno',
      ops: { val: 2e11, testo: 'circa 200 miliardi di operazioni al secondo (stima, solo processore)' },
      massa: { val: 1.3, testo: 'circa 1,3 kg' },
      potenza: { val: 30, testo: 'circa 30 W sotto sforzo, pochi watt a riposo' },
      superficie: { val: 0.063, testo: 'circa 630 cm² (30 × 21 cm)' },
      scena: {
        personaX: -0.6,
        scrivania: true,
        piccola: true,
        scatola: { x: 0.5, y: 0.75, w: 0.3, h: 0.215 },
        vicino: { x: 0.5, y: 0.75, w: 0.3, h: 0.215 },
        misura: 'largo circa 30 cm',
      },
      racconto: '<strong>Un portatile di oggi.</strong> Circa 1,3 kg e una trentina di watt sotto sforzo. Il processore ha più nuclei di calcolo (core) che lavorano insieme e fa centinaia di miliardi di operazioni al secondo: circa 40 milioni di volte l\'ENIAC, su una superficie circa 2.700 volte più piccola.',
    },
    {
      id: 'smartphone',
      nome: 'Smartphone',
      anno: 2024,
      epoca: 'oggi',
      luogo: 'in tasca',
      tecnologia: 'un sistema su chip, come il portatile',
      prezzo: 'da circa 200 a oltre 1.000 dollari',
      diffusione: 'più di un miliardo venduti ogni anno',
      ops: { val: 1e11, testo: 'circa 100 miliardi di operazioni al secondo (stima, solo processore)' },
      massa: { val: 0.19, testo: 'circa 190 g' },
      potenza: { val: 5, testo: 'circa 5 W sotto sforzo' },
      superficie: { val: 0.011, testo: 'circa 110 cm² (15 × 7 cm)' },
      scena: {
        personaX: -0.6,
        scrivania: true,
        piccola: true,
        scatola: { x: 0.6, y: 0.75, w: 0.072, h: 0.162 },
        vicino: { x: 0.6, y: 0.75, w: 0.072, h: 0.162 },
        misura: 'alto circa 15 cm',
      },
      racconto: '<strong>Uno smartphone.</strong> Sta in una mano: circa 190 grammi e 5 watt. Fa un centinaio di miliardi di operazioni al secondo, circa 20 milioni di volte l\'ENIAC, che pesava quanto 140.000 telefoni. Le operazioni al secondo delle macchine moderne sono stime: contano molti calcoli in parallelo.',
    },
  ];

  const RIFERIMENTO = MACCHINE[0];

  /* ---------- numeri all'italiana ---------- */

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // 17468 -> "17.468", (4.77, 2) -> "4,77". Raggruppa anche le migliaia (5.000), come nei testi.
  function numero(n, decimali) {
    const d = decimali || 0;
    const neg = n < 0;
    const parti = Math.abs(n).toFixed(d).split('.');
    const intera = parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + intera + (parti[1] ? ',' + parti[1] : '');
  }

  // Arrotonda a un certo numero di cifre significative.
  function arrotonda(n, cifre) {
    if (!n) return 0;
    const k = Math.floor(Math.log10(Math.abs(n))) - (cifre - 1);
    const v = Math.round(n / Math.pow(10, k)) * Math.pow(10, k);
    return parseFloat(v.toPrecision(12));
  }

  function haDecimali(x) { return Math.abs(x - Math.round(x)) > 1e-9; }

  // Numeri grandi a parole, con due cifre significative: "5.000", "330.000", "20 milioni", "1,5 miliardi".
  function grande(n) {
    const v = arrotonda(n, 2);
    function parola(x, sing, plur) { return numero(x, haDecimali(x) ? 1 : 0) + ' ' + (x === 1 ? sing : plur); }
    if (v >= 1e9) return parola(parseFloat((v / 1e9).toPrecision(12)), 'miliardo', 'miliardi');
    if (v >= 1e6) return parola(parseFloat((v / 1e6).toPrecision(12)), 'milione', 'milioni');
    return numero(v, haDecimali(v) ? 1 : 0);
  }

  // "20 milioni di volte", "140.000 volte", "2,6 volte".
  function volte(n) {
    return grande(n) + (arrotonda(n, 2) >= 1e6 ? ' di volte' : ' volte');
  }

  // Tre cifre significative, senza zeri inutili: 125, 63,5, 7,6, 0,4.
  function breve(x) {
    const v = arrotonda(x, 3);
    const d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    let s = numero(v, d);
    if (d > 0) s = s.replace(/,?0+$/, '');
    return s;
  }

  function formatoMassa(kg) {
    if (kg >= 1000) return breve(kg / 1000) + ' t';
    if (kg >= 1) return breve(kg) + ' kg';
    return breve(kg * 1000) + ' g';
  }

  function formatoPotenza(w) {
    if (w >= 1e6) return breve(w / 1e6) + ' MW';
    if (w >= 1000) return breve(w / 1000) + ' kW';
    return breve(w) + ' W';
  }

  function formatoSuperficie(m2) {
    if (m2 >= 0.1) return breve(m2) + ' m²';
    return breve(m2 * 1e4) + ' cm²';
  }

  function formatoOps(n) {
    if (n >= 1e6) return grande(n);
    return numero(arrotonda(n, 2));
  }

  const FORMATI = { ops: formatoOps, massa: formatoMassa, potenza: formatoPotenza, superficie: formatoSuperficie };

  // Valore breve per le barre: "27 t", "2–4 t", "200 miliardi". Null se il dato manca.
  function formato(chiave, v) {
    if (!v) return null;
    const f = FORMATI[chiave];
    if (v.min != null) {
      const a = f(v.min).split(' ');
      const b = f(v.max).split(' ');
      if (a.length === 2 && b.length === 2 && a[1] === b[1]) return a[0] + '–' + b[0] + ' ' + a[1];
      return f(v.min) + ' – ' + f(v.max);
    }
    return f(v.val);
  }

  /* ---------- confronti con l'ENIAC ---------- */

  // Il valore che rappresenta la grandezza: il valore stesso o la media geometrica dell'intervallo.
  function rappresentativo(v) {
    if (!v) return null;
    if (v.val != null) return v.val;
    return Math.sqrt(v.min * v.max);
  }

  // Quante volte v è più grande del riferimento (numero puro).
  function rapporto(v, rif) {
    const a = rappresentativo(v);
    const b = rappresentativo(rif);
    if (a == null || b == null) return null;
    return a / b;
  }

  // Frase del confronto: "20 milioni di volte più veloce", "da 2,1 a 3,6 volte più leggero".
  function fraseRapporto(chiave, v, rif) {
    if (!v || !rif) return null;
    const g = GRANDEZZE[chiave];
    if (v === rif) return 'è il termine di paragone';
    const r = rappresentativo(rif);
    const lo = v.min != null ? v.min / r : v.val / r;
    const hi = v.max != null ? v.max / r : v.val / r;
    const simile = (f) => Math.abs(Math.log10(f)) < 0.02;
    if ((lo < 1 && hi > 1) || (simile(lo) && simile(hi))) return 'circa come l\'ENIAC';
    const piu = lo > 1;
    const a = piu ? lo : 1 / hi;
    const b = piu ? hi : 1 / lo;
    const quante = (Math.abs(a - b) / b < 0.02) ? volte(a) : 'da ' + grande(a) + ' a ' + volte(b);
    return g.prima + quante + ' ' + (piu ? g.piu : g.meno);
  }

  // Posizione (0-1) di un valore su una barra in scala logaritmica.
  function frazioneLog(x, scala) {
    const a = Math.log10(scala[0]);
    const b = Math.log10(scala[1]);
    return clamp((Math.log10(x) - a) / (b - a), 0, 1);
  }

  // Tutto quello che serve per disegnare la barra di una grandezza.
  function confronto(m, chiave) {
    const g = GRANDEZZE[chiave];
    const v = m[chiave];
    const rif = RIFERIMENTO[chiave];
    const base = { chiave: chiave, nome: g.nome, rif: frazioneLog(rappresentativo(rif), g.scala) };
    if (!v) return Object.assign(base, { manca: true, valore: null, testo: null, frase: null });
    return Object.assign(base, {
      manca: false,
      valore: formato(chiave, v),
      testo: v.testo,
      da: frazioneLog(v.min != null ? v.min : v.val, g.scala),
      a: frazioneLog(v.max != null ? v.max : v.val, g.scala),
      frazione: frazioneLog(rappresentativo(v), g.scala),
      fattore: rapporto(v, rif),
      frase: fraseRapporto(chiave, v, rif),
    });
  }

  function trova(id) { return MACCHINE.find((m) => m.id === id) || null; }

  /* ---------- la telecamera ---------- */

  function unisci(a, b) {
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const x1 = Math.max(a.x + a.w, b.x + b.w);
    const y1 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function scatolaPersona(m) {
    return { x: m.scena.personaX - LARGHEZZA_PERSONA / 2, y: 0, w: LARGHEZZA_PERSONA, h: ALTEZZA_PERSONA };
  }

  function scatolaScrivania() {
    return { x: SCRIVANIA.x, y: 0, w: SCRIVANIA.larghezza, h: SCRIVANIA.altezza };
  }

  // Ingombro della scena larga: persona, macchina e, se serve, scrivania.
  function scatolaLarga(m) {
    let b = unisci(scatolaPersona(m), m.scena.scatola);
    if (m.scena.scrivania) b = unisci(b, scatolaScrivania());
    return b;
  }

  // Inquadratura che contiene una scatola, con il rapporto larghezza/altezza dello schermo.
  // Con pavimento: il pavimento sta in basso, con poca terra sotto i piedi.
  function inquadratura(box, aspetto, opz) {
    const o = opz || {};
    const marg = o.margine == null ? 0.1 : o.margine;
    let w = box.w * (1 + 2 * marg);
    let h = box.h * (1 + 2 * marg);
    if (w / h < aspetto) w = h * aspetto; else h = w / aspetto;
    const cx = box.x + box.w / 2;
    let cy = box.y + box.h / 2;
    if (o.pavimento && box.y <= 0) cy = h / 2 - h * (o.terra == null ? 0.1 : o.terra);
    return { cx: cx, cy: cy, larghezza: w };
  }

  // Inquadratura con la persona: sopra la scena resta un po' di cielo per le etichette.
  function inquadraturaLarga(m, aspetto) {
    const b = scatolaLarga(m);
    return inquadratura({ x: b.x, y: b.y, w: b.w, h: b.h * 1.22 }, aspetto, { margine: 0.07, pavimento: true });
  }

  function inquadraturaVicina(m, aspetto) {
    const piccola = m.scena.vicino.w < 1;
    return inquadratura(m.scena.vicino, aspetto, { margine: piccola ? 0.45 : 0.08, pavimento: m.scena.vicino.y <= 0 });
  }

  // I movimenti della telecamera quando si sceglie una macchina.
  // ENIAC: parte dalla persona, percorre la parete di pannelli, poi si allontana per mostrarla tutta.
  // Macchine piccole: prima la persona accanto alla scrivania, poi lo zoom sulla macchina.
  function percorso(m, aspetto) {
    const largo = inquadraturaLarga(m, aspetto);
    if (m.id === 'eniac') {
      const tratto = 8.5;
      const sc = m.scena.scatola;
      const inizio = inquadratura({ x: m.scena.personaX - 0.5, y: 0, w: tratto, h: sc.h }, aspetto, { margine: 0.05, pavimento: true });
      const fine = inquadratura({ x: sc.x + sc.w - tratto + 0.6, y: 0, w: tratto, h: sc.h }, aspetto, { margine: 0.05, pavimento: true });
      return [
        { cam: inizio, attesa: 450, modo: 'largo' },
        { cam: fine, attesa: 250, modo: 'largo' },
        { cam: largo, attesa: 0, modo: 'largo' },
      ];
    }
    if (m.scena.piccola) {
      return [
        { cam: largo, attesa: 650, modo: 'largo' },
        { cam: inquadraturaVicina(m, aspetto), attesa: 0, modo: 'vicino' },
      ];
    }
    return [{ cam: largo, attesa: 0, modo: 'largo' }];
  }

  // Posizione della telecamera a metà di un movimento (k da 0 a 1).
  // Lo zoom avanza in modo geometrico e la scena si ingrandisce intorno a un punto fisso,
  // come quando si avvicina una mappa con le dita; senza zoom è una semplice panoramica.
  function telecamera(a, b, k) {
    if (k <= 0) return { cx: a.cx, cy: a.cy, larghezza: a.larghezza };
    if (k >= 1) return { cx: b.cx, cy: b.cy, larghezza: b.larghezza };
    const z0 = 1 / a.larghezza;
    const z1 = 1 / b.larghezza;
    const z = z0 * Math.pow(z1 / z0, k);
    if (Math.abs(Math.log(z1 / z0)) < 1e-3) {
      return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), larghezza: 1 / z };
    }
    const fx = (a.cx * z0 - b.cx * z1) / (z0 - z1);
    const fy = (a.cy * z0 - b.cy * z1) / (z0 - z1);
    return { cx: fx - (fx - a.cx) * z0 / z, cy: fy - (fy - a.cy) * z0 / z, larghezza: 1 / z };
  }

  // Durata di un movimento (ms): più lunga se lo zoom o lo spostamento sono grandi.
  function durataMovimento(a, b, larghezzaPx) {
    const zoom = Math.abs(Math.log(a.larghezza / b.larghezza));
    const pxm = larghezzaPx / Math.max(a.larghezza, b.larghezza);
    const pan = Math.hypot(b.cx - a.cx, b.cy - a.cy) * pxm;
    return Math.round(clamp(520 + 330 * zoom + 0.9 * pan, 520, 2800));
  }

  // "5 m", "50 cm", "5 mm".
  function testoLunghezza(m) {
    if (m >= 1) return numero(m, haDecimali(m) ? 1 : 0) + ' m';
    if (m >= 0.01) return Math.round(m * 100) + ' cm';
    return Math.round(m * 1000) + ' mm';
  }

  // Barra della scala: la lunghezza «tonda» (1, 2 o 5 per una potenza di 10) che misura tra min e max pixel.
  function barraScala(pxPerMetro, minPx, maxPx) {
    const lo = minPx || 56;
    const hi = maxPx || 140;
    let k = Math.floor(Math.log10(lo / pxPerMetro)) - 1;
    for (let giro = 0; giro < 6; giro++, k++) {
      for (const p of [1, 2, 5]) {
        const m = parseFloat((p * Math.pow(10, k)).toPrecision(6));
        const px = m * pxPerMetro;
        if (px >= lo && px <= hi) return { metri: m, px: px, testo: testoLunghezza(m) };
      }
    }
    const m = parseFloat(Math.pow(10, Math.round(Math.log10(lo / pxPerMetro))).toPrecision(6));
    return { metri: m, px: m * pxPerMetro, testo: testoLunghezza(m) };
  }

  // Griglia a potenze di dieci: il passo più fitto ancora visibile (almeno 8 px) compare piano piano.
  function griglia(pxPerMetro) {
    const k = Math.ceil(Math.log10(8 / pxPerMetro) - 1e-9);
    const fine = parseFloat(Math.pow(10, k).toPrecision(6));
    const pxFine = fine * pxPerMetro;
    return { fine: fine, grossa: parseFloat((fine * 10).toPrecision(6)), alfaFine: clamp((pxFine - 8) / 40, 0, 1) };
  }

  const api = {
    ALTEZZA_PERSONA: ALTEZZA_PERSONA,
    LARGHEZZA_PERSONA: LARGHEZZA_PERSONA,
    SCRIVANIA: SCRIVANIA,
    GRANDEZZE: GRANDEZZE,
    CHIAVI: CHIAVI,
    PDP8_CICLO_S: PDP8_CICLO_S,
    MACCHINE: MACCHINE,
    RIFERIMENTO: RIFERIMENTO,
    trova: trova,
    clamp: clamp,
    numero: numero,
    arrotonda: arrotonda,
    grande: grande,
    volte: volte,
    breve: breve,
    formatoMassa: formatoMassa,
    formatoPotenza: formatoPotenza,
    formatoSuperficie: formatoSuperficie,
    formatoOps: formatoOps,
    formato: formato,
    rappresentativo: rappresentativo,
    rapporto: rapporto,
    fraseRapporto: fraseRapporto,
    frazioneLog: frazioneLog,
    confronto: confronto,
    unisci: unisci,
    scatolaPersona: scatolaPersona,
    scatolaLarga: scatolaLarga,
    inquadratura: inquadratura,
    inquadraturaLarga: inquadraturaLarga,
    inquadraturaVicina: inquadraturaVicina,
    percorso: percorso,
    telecamera: telecamera,
    durataMovimento: durataMovimento,
    testoLunghezza: testoLunghezza,
    barraScala: barraScala,
    griglia: griglia,
  };

  (root.StoriaPCModelli = root.StoriaPCModelli || {})['giganti'] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
