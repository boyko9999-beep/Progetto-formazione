/*
 * Elettronica avanzata: scheda della sezione per l'hub dell'enciclopedia.
 * Ordine, titoli, bande di frequenza e icone dei capitoli vivono solo qui:
 * la pagina della sezione e l'hub leggono gli stessi dati.
 */
(function (root) {
  'use strict';

  // Icone 48×48 a tratto (stroke = currentColor), una per capitolo.
  const ICONE = {
    fourier: '<path d="M4 31h7V15h9v16h9V15h9v16h6"/><path d="M4 23c4-11 9-11 13 0s9 11 13 0 9-11 14 0" opacity=".55"/>',
    linee: '<path d="M4 15h40M4 33h40" opacity=".55"/><path d="M4 28h8l4-10 4 10h6"/><path d="M44 24h-9m4-4-4 4 4 4"/>',
    differenziale: '<path d="M4 24c5-10 10-10 15 0s10 10 15 0 7-8 10-8"/><path d="M4 24c5 10 10 10 15 0s10-10 15 0 7 8 10 8" opacity=".55"/>',
    radio: '<path d="M24 22v20M17 42l7-14 7 14"/><circle cx="24" cy="18" r="3"/><path d="M16 11a11 11 0 0 0 0 14M32 11a11 11 0 0 1 0 14M10 6a18 18 0 0 0 0 24M38 6a18 18 0 0 1 0 24" opacity=".7"/>',
    conversione: '<path d="M4 34c6-24 14-26 20-10s12 14 20-6" opacity=".55"/><path d="M4 36h6v-9h6v-8h6v5h6v7h6v-6h6v-9h4"/>',
    clock: '<rect x="11" y="10" width="26" height="24" rx="12"/><path d="M17 34v8M31 34v8"/><path d="M16 22c2.7-5 5.3-5 8 0s5.3 5 8 0"/>',
    potenza: '<path d="M27 4 12 27h11l-4 17 17-25H25z"/>',
    mems: '<rect x="17" y="17" width="14" height="14" rx="2"/><path d="M4 24h3l2-4 3 8 3-8 2 4M44 24h-3l-2-4-3 8-3-8-2 4"/><path d="M20 6v8M24 6v8M28 6v8M20 34v8M24 34v8M28 34v8" opacity=".6"/>',
    fotonica: '<path d="M4 15h40M4 33h40" opacity=".55"/><path d="M4 24l7-8 10 16 10-16 10 16 3-4"/>',
    quantistica: '<circle cx="24" cy="24" r="18"/><ellipse cx="24" cy="24" rx="18" ry="6" opacity=".55"/><path d="M24 24 33 10"/><circle cx="33" cy="10" r="2.5" fill="currentColor"/>',
  };

  // f: frequenza tipica (Hz) per la mappa; min/max: banda del capitolo.
  const CAPITOLI = [
    {
      id: 'fourier', titolo: 'Il linguaggio delle frequenze', argomento: 'Segnali e spettro', periodo: '1807 – oggi',
      descrizione: 'Ogni segnale, anche un\'onda quadra, è una somma di sinusoidi. La scoperta di Fourier insegna a vedere suoni, onde radio e dati come uno spettro.',
      freq: { f: 1e3, min: 20, max: 2e4, label: 'udibile: 20 Hz – 20 kHz' }, tinta: '#3ee08f',
    },
    {
      id: 'linee', titolo: 'Quando un filo diventa un\'onda', argomento: 'Linee di trasmissione', periodo: '1855 – oggi',
      descrizione: 'Ad alta velocità un filo non è più un semplice collegamento: il segnale viaggia come un\'onda, rimbalza alle estremità e va adattato con l\'impedenza giusta.',
      freq: { f: 1e9, min: 1e8, max: 5e10, label: 'da 100 MHz a 50 GHz' }, tinta: '#5cc8ff',
    },
    {
      id: 'differenziale', titolo: 'Due fili contro il rumore', argomento: 'Segnali differenziali ed EMC', periodo: '1881 – oggi',
      descrizione: 'Coppie intrecciate, LVDS e diagramma a occhio: così i collegamenti da miliardi di bit al secondo resistono a disturbi e interferenze.',
      freq: { f: 1.6e10, min: 1e8, max: 6.4e10, label: 'collegamenti da Gbit/s' }, tinta: '#ff7aa8',
    },
    {
      id: 'radio', titolo: 'Onde nell\'etere', argomento: 'Radiofrequenza e modulazione', periodo: '1865 – oggi',
      descrizione: 'Da Maxwell e Marconi al 5G: come un\'antenna lancia onde elettromagnetiche e come AM, FM e QAM ci caricano sopra voce e dati.',
      freq: { f: 1e8, min: 3e3, max: 3e11, label: 'radio: 3 kHz – 300 GHz' }, tinta: '#ffc04d',
    },
    {
      id: 'conversione', titolo: 'Dal continuo ai numeri', argomento: 'Conversione analogico-digitale', periodo: '1928 – oggi',
      descrizione: 'Campionare, quantizzare, ricostruire: il teorema del campionamento e i convertitori ADC e DAC che portano il mondo reale dentro i computer.',
      freq: { f: 44100, min: 8e3, max: 1e10, label: 'da 8 kHz (telefono) a miliardi di campioni/s' }, tinta: '#b49cff',
    },
    {
      id: 'clock', titolo: 'Il battito del tempo', argomento: 'Quarzo, oscillatori e PLL', periodo: '1880 – oggi',
      descrizione: 'Un cristallo che vibra 32 768 volte al secondo e un anello ad aggancio di fase che lo moltiplica fino ai GHz: così nasce il clock di ogni circuito digitale.',
      freq: { f: 4e9, min: 32768, max: 6e9, label: 'da 32 768 Hz a 6 GHz' }, tinta: '#ff9f43',
    },
    {
      id: 'potenza', titolo: 'Energia che commuta', argomento: 'Elettronica di potenza', periodo: '1902 – oggi',
      descrizione: 'Interruttori che si aprono e si chiudono centinaia di migliaia di volte al secondo: alimentatori switching, inverter e i nuovi semiconduttori SiC e GaN.',
      freq: { f: 5e5, min: 50, max: 1e7, label: 'dai 50 Hz della rete ai MHz del GaN' }, tinta: '#ff6b6b',
    },
    {
      id: 'mems', titolo: 'Macchine sul silicio', argomento: 'MEMS e sensori', periodo: '1954 – oggi',
      descrizione: 'Molle, masse e specchi più sottili di un capello scolpiti nel silicio: accelerometri, giroscopi e microfoni che danno i sensi allo smartphone.',
      freq: { f: 2e4, min: 1, max: 1e5, label: 'da 1 Hz a 100 kHz' }, tinta: '#9be15d',
    },
    {
      id: 'fotonica', titolo: 'Luce che trasporta dati', argomento: 'Fotonica e fibra ottica', periodo: '1841 – oggi',
      descrizione: 'Laser, fibre di vetro purissimo e amplificatori ottici: la luce infrarossa che porta Internet sotto gli oceani.',
      freq: { f: 1.93e14, min: 1.5e14, max: 7.9e14, label: 'infrarosso e visibile: circa 193 THz a 1550 nm' }, tinta: '#dfe7ff',
    },
    {
      id: 'quantistica', titolo: 'La frontiera quantistica', argomento: 'Superconduttori, spintronica e qubit', periodo: '1911 – oggi',
      descrizione: 'Correnti senza resistenza, testine che leggono lo spin degli elettroni e qubit in sovrapposizione: l\'elettronica che usa direttamente la meccanica quantistica.',
      freq: { f: 5e9, min: 4e9, max: 8e9, label: 'qubit superconduttori: 4 – 8 GHz' }, tinta: '#7aa2ff',
    },
  ];

  const SEZIONE = {
    slug: 'elettronica-avanzata',
    numero: 3,
    titolo: 'Elettronica avanzata',
    sottotitolo: 'Alte frequenze, segnali veloci, conversione, potenza, luce e quanti: l\'elettronica che ha costruito il mondo connesso.',
    periodo: '1807 – oggi',
    colore: 'var(--c-avanzata, #a24d14)',
    capitoli: CAPITOLI.map((c, i) => Object.assign({}, c, {
      numero: i + 1,
      icona: ICONE[c.id],
      href: 'elettronica-avanzata/index.html#' + c.id,
    })),
  };

  root.EA_SEZIONE = SEZIONE;
  if (root.Enciclopedia && typeof root.Enciclopedia.register === 'function') root.Enciclopedia.register(SEZIONE);
})(typeof window !== 'undefined' ? window : globalThis);
