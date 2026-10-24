/*
 * Registrazione della sezione 5 nell'hub dell'enciclopedia (../index.html).
 * L'hub collega ogni capitolo come chip-programmabili/index.html#<id>.
 */
(function (root) {
  'use strict';

  const sezione = {
    slug: 'chip-programmabili',
    numero: 5,
    titolo: 'Primi chip programmabili',
    sottotitolo: 'Dalle memorie che si scrivono una volta sola al primo microprocessore, fino ai chip che si ricablano da soli: storia e architettura, con un laboratorio per ogni capitolo.',
    periodo: '1956–1985',
    colore: 'var(--sez-5)',
    capitoli: [
      { id: 'idea', titolo: 'Un chip, mille programmi', periodo: '1969', descrizione: 'Busicom chiede dodici chip su misura, Ted Hoff propone un processore generico: lo stesso hardware cambia mestiere cambiando programma.' },
      { id: 'memorie', titolo: 'Memorie che si programmano', periodo: '1956–1987', descrizione: 'ROM, PROM a fusibili, EPROM cancellabili con la luce ultravioletta, EEPROM e Flash: dove abitano i programmi.' },
      { id: 'intel-4004', titolo: 'Intel 4004, il primo microprocessore', periodo: '1969–1971', descrizione: 'Federico Faggin, Ted Hoff, Stan Mazor e Masatoshi Shima: 2.300 transistor e un bus a 4 bit che ha cambiato la storia.' },
      { id: 'ciclo', titolo: 'Dentro la CPU: prendi, decodifica, esegui', periodo: 'Il ciclo di istruzione', descrizione: 'Contatore di programma, registri, ALU e bus al lavoro, passo dopo passo, su una CPU didattica da programmare.' },
      { id: 'otto-bit', titolo: 'La corsa agli 8 bit', periodo: '1972–1976', descrizione: '8008, 8080, 6800, 6502 e Z80: architetture a confronto e la guerra dei prezzi che portò il microprocessore a tutti.' },
      { id: 'microcontrollori', titolo: 'Il computer in un chip', periodo: '1971–1980', descrizione: 'Dal TMS1000 all\'8051: CPU, memoria e periferiche sullo stesso chip, dentro lavatrici, auto e frigoriferi.' },
      { id: 'logica-programmabile', titolo: 'Hardware che si riprogramma', periodo: '1970–1985', descrizione: 'PLA, PAL, GAL e la prima FPGA: quando a cambiare non è il programma ma il circuito stesso.' },
      { id: 'sedici-bit', titolo: 'Verso i 16 bit e oltre', periodo: '1978–1985', descrizione: '8086, 68000 e ARM1: i chip da cui discendono i processori dei PC e degli smartphone di oggi.' },
    ],
  };

  if (root.Enciclopedia && typeof root.Enciclopedia.register === 'function') root.Enciclopedia.register(sezione);
  if (typeof module !== 'undefined' && module.exports) module.exports = sezione;
})(typeof window !== 'undefined' ? window : globalThis);
