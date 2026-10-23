/*
 * Registrazione della sezione nell'enciclopedia (hub in sections/index.html).
 * Lo stesso elenco dei capitoli guida anche la pagina della sezione.
 */
(function (root) {
  'use strict';

  const sezione = {
    slug: 'elettronica-intermedia',
    numero: 2,
    titolo: 'Elettronica intermedia',
    sottotitolo: 'Semiconduttori, transistor e circuiti analogici: dal cristallo di silicio all\'alimentatore da 5 volt.',
    colore: '#b7791f',
    capitoli: [
      { id: 'semiconduttori', titolo: 'Semiconduttori e drogaggio', descrizione: 'Il silicio, gli elettroni liberi e le lacune: pochi atomi estranei rendono il cristallo di tipo N o P.', periodo: '1874–1940' },
      { id: 'diodo', titolo: 'La giunzione P-N e il diodo', descrizione: 'Un pezzo P e uno N a contatto creano una barriera: la corrente passa in un solo verso.', periodo: '1904–1949' },
      { id: 'led-zener', titolo: 'LED e diodo Zener', descrizione: 'Diodi speciali: uno trasforma la corrente in luce colorata, l\'altro tiene ferma la tensione.', periodo: '1907–1993' },
      { id: 'bjt', titolo: 'Il transistor bipolare', descrizione: 'Una piccola corrente di base comanda una corrente cento volte più grande: interruttore e amplificatore.', periodo: '1947–1954' },
      { id: 'mosfet', titolo: 'Il MOSFET', descrizione: 'Una tensione sul gate apre un canale: il transistor che si comanda senza assorbire corrente.', periodo: '1925–1980' },
      { id: 'rc-filtri', titolo: 'Circuiti RC e filtri', descrizione: 'Resistenza e condensatore misurano il tempo e separano le frequenze alte da quelle basse.', periodo: '1890–oggi' },
      { id: 'operazionale', titolo: 'L\'amplificatore operazionale', descrizione: 'Un amplificatore quasi perfetto il cui guadagno si sceglie con due resistenze.', periodo: '1927–1968' },
      { id: 'oscillatori', titolo: 'Oscillatori e timer 555', descrizione: 'Un condensatore che si carica e si scarica senza fine: così un circuito crea il proprio ritmo.', periodo: '1912–1972' },
      { id: 'alimentatore', titolo: 'L\'alimentatore: dalla presa ai 5 volt', descrizione: 'Trasformatore, ponte di diodi, condensatore e regolatore: il progetto che mette insieme tutta la sezione.', periodo: '1895–oggi' },
    ],
  };

  root.EI_SEZIONE = sezione;
  if (root.Enciclopedia) root.Enciclopedia.register(sezione);
})(window);
