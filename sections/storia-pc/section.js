/*
 * Sezione 6 dell'enciclopedia: registrazione nell'hub (sections/index.html).
 * Generato dai dati dei capitoli: se cambi un titolo o un periodo, aggiornalo anche qui
 * (il test tests/storia-pc.test.js controlla che coincidano).
 */
(function (root) {
  'use strict';
  const E = root.Enciclopedia;
  if (!E || typeof E.register !== 'function') return;
  E.register({
    slug: 'storia-pc',
    numero: 6,
    titolo: 'Architettura e storia dei PC',
    sottotitolo: 'Dai giganti a valvole al chip unico: come è fatto un personal computer e come ci siamo arrivati, con un laboratorio animato per ogni capitolo.',
    periodo: '1937 – oggi',
    colore: 'var(--sez-6)',
    capitoli: [
      { id: 'giganti', titolo: 'I giganti: dai relè ai transistor', periodo: '1937–1965',
        descrizione: 'Dai calcolatori umani alle macchine a relè, a valvole e a transistor: Zuse Z3, Colossus, ENIAC, UNIVAC I, IBM 1401, System/360, PDP-8, e il filo italiano della CEP e dell\'Elea 9003.',
        href: 'storia-pc/index.html#giganti' },
      { id: 'von-neumann', titolo: 'Il programma memorizzato: l\'architettura di von Neumann', periodo: '1945–oggi',
        descrizione: 'L\'idea che regge quasi tutti i computer: programma e dati nella stessa memoria, come numeri, e una CPU che ripete il ciclo prendi-decodifica-esegui.',
        href: 'storia-pc/index.html#von-neumann' },
      { id: 'primi-pc', titolo: 'I primi personal computer', periodo: '1965–1980',
        descrizione: 'Dalla Programma 101 all\'Altair 8800, dall\'Apple II a VisiCalc: come il computer arriva sulla scrivania di una persona sola, fra il 1965 e il 1980.',
        href: 'storia-pc/index.html#primi-pc' },
      { id: 'ibm-pc', titolo: 'IBM PC e l\'architettura aperta', periodo: '1981–1987',
        descrizione: 'Il PC IBM 5150, il BIOS, il DOS e i cloni: come nasce lo standard «IBM compatibile» e come IBM ne perde il controllo.',
        href: 'storia-pc/index.html#ibm-pc' },
      { id: 'scheda-madre', titolo: 'Com\'è fatto un PC: scheda madre, chipset e bus', periodo: '1981–oggi',
        descrizione: 'La scheda madre e i suoi bus: dal bus unico dell\'IBM PC al northbridge, al PCH, fino al chip unico.',
        href: 'storia-pc/index.html#scheda-madre' },
      { id: 'memoria', titolo: 'La gerarchia della memoria', periodo: '1947–oggi',
        descrizione: 'Registri, cache, RAM e dischi: perché un computer ha tante memorie diverse, come sono nate, dalle vasche di mercurio ai moduli DDR5, e quanto è lontano un dato.',
        href: 'storia-pc/index.html#memoria' },
      { id: 'avvio', titolo: 'Accendere un PC: dal BIOS all\'UEFI', periodo: '1975–oggi',
        descrizione: 'Cosa succede tra il tasto di accensione e il sistema operativo: bootstrap, BIOS e POST, settore di avvio da 512 byte, MBR, UEFI e Secure Boot.',
        href: 'storia-pc/index.html#avvio' },
      { id: 'grafica', titolo: 'Pixel, finestre e multimedia', periodo: '1968–oggi',
        descrizione: 'Dal terminale a caratteri allo schermo a pixel, dal mouse di Engelbart alle finestre, dalle schede CGA, EGA e VGA alla GPU, dall\'altoparlante del PC alla Sound Blaster.',
        href: 'storia-pc/index.html#grafica' },
      { id: 'prestazioni', titolo: 'La corsa alle prestazioni: MHz, transistor e core', periodo: '1982–oggi',
        descrizione: 'Dal 286 ai processori con decine di core: frequenza, pipeline e cache, la legge di Moore, il muro della potenza e la legge di Amdahl.',
        href: 'storia-pc/index.html#prestazioni' },
      { id: 'oggi', titolo: 'Portatili, ARM e chip unico: il PC di oggi', periodo: '1981–oggi',
        descrizione: 'Dall\'Osborne 1 da 11 kg allo smartphone: i portatili, i processori ARM, il chip unico che ha inghiottito la scheda madre, l\'efficienza come nuova misura e Arduino, nato a Ivrea.',
        href: 'storia-pc/index.html#oggi' },
      { id: 'linea-del-tempo', titolo: 'La linea del tempo', periodo: '',
        descrizione: 'Tutte le macchine, le persone e le idee della sezione in ordine, con il filo italiano.',
        href: 'storia-pc/index.html#linea-del-tempo' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
