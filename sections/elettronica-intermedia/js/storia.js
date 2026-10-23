/*
 * Storia della sezione: le epoche e le tappe che non appartengono a un solo capitolo
 * (soprattutto le valvole, antenate del transistor). Le tappe dei capitoli stanno nei file
 * chapters/*.js (history.events): la pagina #storia le unisce in un'unica linea del tempo.
 */
(function (root) {
  'use strict';

  const EI = root.EI;

  EI.historyLead = 'Un secolo di idee, dal raddrizzatore a cristallo all\'amplificatore integrato: ogni scoperta nasce per superare un limite di quella precedente. Le tappe con l\'etichetta del capitolo ti portano al laboratorio dove puoi provarle.';

  EI.eras = [
    { from: 1800, to: 1939, title: 'Cristalli e valvole', text: 'Prima del transistor l\'elettronica è fatta di cristalli capricciosi e di valvole: tubi di vetro sotto vuoto, caldi e fragili, che però permettono la radio, il telefono a lunga distanza e i primi calcolatori.' },
    { from: 1940, to: 1959, title: 'Nasce il transistor', text: 'Nei laboratori della Bell il silicio e il germanio rivelano la giunzione P-N: in pochi anni arrivano il transistor, il transistor al silicio e la radiolina tascabile.' },
    { from: 1960, to: 1979, title: 'L\'analogico diventa integrato', text: 'Il MOSFET, il LED visibile e gli amplificatori operazionali su un solo chip: componenti che costavano come un televisore diventano oggetti da pochi centesimi.' },
    { from: 1980, to: 9999, label: '1980–oggi', title: 'Ovunque e invisibile', text: 'I componenti di questa sezione sono in ogni oggetto elettronico: alimentatori, caricabatterie, sensori, luci a LED.' },
  ];

  // Tappe di contesto (le valvole). Le date e i fatti vanno verificati con fonti affidabili.
  EI.timeline = [
    { year: 1883, title: 'L\'effetto Edison', who: 'Thomas Edison', text: 'Cercando di capire perché le sue lampadine si anneriscono, Edison nota una corrente che attraversa il vuoto da un filamento caldo a una piastrina vicina. Non la sa spiegare, ma la brevetta.' },
    { year: 1904, title: 'La valvola di Fleming', who: 'John Ambrose Fleming', text: 'Fleming sfrutta l\'effetto Edison per costruire il primo diodo a vuoto: la corrente passa solo dal filamento alla placca. Serve a rivelare i segnali radio.' },
    { year: 1906, title: 'Il triodo: la prima amplificazione', who: 'Lee De Forest', text: 'De Forest aggiunge una griglia tra filamento e placca: piccole tensioni sulla griglia comandano una corrente grande. È il primo componente capace di amplificare, l\'antenato diretto del transistor.' },
  ];

  EI.historyDemo = null;
})(window);
