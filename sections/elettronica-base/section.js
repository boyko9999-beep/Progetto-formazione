/*
 * Sezione 1 dell'enciclopedia: registrazione per l'hub (sections/index.html).
 * L'ordine e i titoli dei capitoli qui sotto valgono anche per la pagina della sezione.
 */
window.Enciclopedia && window.Enciclopedia.register({
  slug: 'elettronica-base',
  numero: 1,
  titolo: 'Elettronica base',
  sottotitolo: 'Cariche, tensione e corrente: le leggi che fanno funzionare ogni circuito, dall\'ambra di Talete al trasformatore.',
  periodo: '600 a.C. – oggi',
  colore: 'var(--sez-1)',
  capitoli: [
    { id: 'carica', titolo: 'La carica elettrica', descrizione: 'Dall\'ambra di Talete alla legge di Coulomb: protoni, elettroni e forze invisibili.', periodo: '600 a.C. – 1909' },
    { id: 'corrente', titolo: 'La corrente elettrica', descrizione: 'La rana di Galvani, la pila di Volta e gli elettroni che scorrono in un filo.', periodo: '1791 – 1991' },
    { id: 'ohm', titolo: 'Tensione, resistenza e legge di Ohm', descrizione: 'La formula più usata dell\'elettronica e i colori dei resistori.', periodo: '1781 – 1924' },
    { id: 'potenza', titolo: 'Potenza ed effetto Joule', descrizione: 'Perché i fili si scaldano, come si accende una lampadina e quanto costa un kilowattora.', periodo: '1808 – 1910' },
    { id: 'circuiti', titolo: 'Serie, parallelo e Kirchhoff', descrizione: 'Come si dividono tensione e corrente quando i componenti sono più di uno.', periodo: '1833 – 1938' },
    { id: 'condensatore', titolo: 'Il condensatore', descrizione: 'La bottiglia di Leida, i piatti affacciati e l\'energia di un flash.', periodo: '1745 – oggi' },
    { id: 'magnetismo', titolo: 'Magnetismo e induzione', descrizione: 'L\'ago di Ørsted, gli esperimenti di Faraday e l\'induttore.', periodo: '1269 – 1865' },
    { id: 'rele', titolo: 'Elettromagnete e relè', descrizione: 'Un interruttore comandato dalla corrente: dal telegrafo ai primi calcolatori.', periodo: '1825 – 1941' },
    { id: 'alternata', titolo: 'Corrente alternata e trasformatore', descrizione: 'Edison contro Tesla, i 50 Hz della presa e l\'energia che viaggia ad alta tensione.', periodo: '1882 – 1896' },
    { id: 'misure', titolo: 'Strumenti di misura', descrizione: 'Multimetro e oscilloscopio: come si guarda dentro un circuito.', periodo: '1820 – 1977' },
  ],
});
