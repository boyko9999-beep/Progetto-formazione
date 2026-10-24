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
    colore: 'var(--c-pc)',
    capitoli: [
      { id: 'giganti', titolo: 'I giganti: dai relè ai transistor', periodo: '1937–1965',
        descrizione: 'Prima dei personal computer: macchine grandi come stanze, a relè, a valvole e poi a transistor.',
        href: 'storia-pc/index.html#giganti' },
      { id: 'von-neumann', titolo: 'Il programma memorizzato: l\'architettura di von Neumann', periodo: '1945–oggi',
        descrizione: 'L\'idea che regge tutti i computer: programma e dati nella stessa memoria, e il ciclo prendi-decodifica-esegui.',
        href: 'storia-pc/index.html#von-neumann' },
      { id: 'primi-pc', titolo: 'I primi personal computer', periodo: '1965–1980',
        descrizione: 'Dalla Programma 101 all\'Altair 8800 e all\'Apple II: il computer arriva sulla scrivania.',
        href: 'storia-pc/index.html#primi-pc' },
      { id: 'ibm-pc', titolo: 'IBM PC e l\'architettura aperta', periodo: '1981–1987',
        descrizione: 'Il PC IBM 5150, il BIOS, il DOS e i cloni: come nasce lo standard "IBM compatibile".',
        href: 'storia-pc/index.html#ibm-pc' },
      { id: 'scheda-madre', titolo: 'Com\'è fatto un PC: scheda madre, chipset e bus', periodo: '1981–oggi',
        descrizione: 'La scheda madre e i suoi bus: dal bus unico dell\'IBM PC al northbridge, al PCH, fino al chip unico.',
        href: 'storia-pc/index.html#scheda-madre' },
      { id: 'memoria', titolo: 'La gerarchia della memoria', periodo: '1947–oggi',
        descrizione: 'Registri, cache, RAM e dischi: perché un computer ha tante memorie diverse e quanto è lontano un dato.',
        href: 'storia-pc/index.html#memoria' },
      { id: 'avvio', titolo: 'Accendere un PC: dal BIOS all\'UEFI', periodo: '1975–oggi',
        descrizione: 'Cosa succede tra il tasto di accensione e il sistema operativo: POST, settore di avvio, UEFI.',
        href: 'storia-pc/index.html#avvio' },
      { id: 'grafica', titolo: 'Pixel, finestre e multimedia', periodo: '1968–oggi',
        descrizione: 'Dalle schede video a caratteri alla GPU, dall\'interfaccia grafica alle schede audio.',
        href: 'storia-pc/index.html#grafica' },
      { id: 'prestazioni', titolo: 'La corsa alle prestazioni: MHz, transistor e core', periodo: '1982–oggi',
        descrizione: 'Dal 286 ai processori multicore: frequenza, legge di Moore, il muro della potenza.',
        href: 'storia-pc/index.html#prestazioni' },
      { id: 'oggi', titolo: 'Portatili, ARM e chip unico: il PC di oggi', periodo: '1981–oggi',
        descrizione: 'Dal portatile da 11 kg allo smartphone: integrazione, efficienza e il ritorno di Ivrea con Arduino.',
        href: 'storia-pc/index.html#oggi' },
      { id: 'linea-del-tempo', titolo: 'La linea del tempo', periodo: '',
        descrizione: 'Tutte le macchine, le persone e le idee della sezione in ordine, con il filo italiano.',
        href: 'storia-pc/index.html#linea-del-tempo' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
