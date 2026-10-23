# Sezione 7 · Storia della programmazione

Pagina autonoma dell'enciclopedia BusLab: `sections/programmazione/index.html`.
Niente build: si apre con un doppio clic (anche da `file://`) o da GitHub Pages.
Riusa `../../css/style.css` (token, barra superiore, bottoni) e si registra nell'hub con `section.js`.

## Direzione visiva

- **Scopo**: un museo interattivo della programmazione. Si legge come un'enciclopedia, si gioca come un laboratorio.
- **Tono**: carta chiara per leggere (testo lungo in serif), strumenti scuri per sperimentare (i laboratori riprendono l'oscilloscopio di BusLab: `--scope-bg`, `--trace-1..4`).
- **Dettaglio memorabile**: ogni epoca ha il suo schermo. Il «Ciao, mondo» di ogni capitolo appare su un supporto d'epoca: schede del telaio, nastro di Turing, tubo di Williams, telescrivente, foglio FORTRAN, scheda IBM, tabulato a modulo continuo, terminale a fosfori verdi, home computer, Macintosh, browser anni '90, editor moderno, chat con un'IA. A sinistra un contatore meccanico mostra l'anno del capitolo che stai leggendo.
- **Colori**: ogni capitolo ha un accento (`--cap`, classi `.pg-c-<id>` in `css/programmazione.css`), con variante per il tema scuro.
- **Movimento** (dalle skill ECC motion-foundations): l'animazione deve guidare l'attenzione, comunicare uno stato o mantenere la continuità spaziale, altrimenti si toglie. Si anima solo `transform` e `opacity` (o attributi SVG di piccoli elementi). Durate e curve dai token `--pg-dur-*` / `--pg-ease-*` (in JS `ctx.DURATA`, `ctx.EASING`). Con `prefers-reduced-motion` niente spostamenti: gli stati cambiano subito e tutto resta usabile con i bottoni passo-passo. Le animazioni infinite si fermano quando escono dalla vista (lo fa il motore).

## File

| Percorso | Contenuto |
| --- | --- |
| `index.html` | pagina; carica core, librerie, figure, laboratori e capitoli in quest'ordine |
| `section.js` | registrazione nell'hub (`Enciclopedia.register`) |
| `js/core.js` | motore: registra e disegna capitoli, laboratori, figure, glossario, indice |
| `js/schermi.js`, `css/schermi.css` | gli schermi d'epoca del «Ciao, mondo» |
| `js/capitoli/NN-<id>.js` | i contenuti di un capitolo (solo dati) |
| `js/lab/<id>.js` | un laboratorio interattivo (interfaccia + logica pura esportata per i test) |
| `js/figure/<capitolo>.js` | le illustrazioni SVG di un capitolo |
| `js/lib/cpu-giocattolo.js` | CPU didattica a 8 bit condivisa da tre laboratori |
| `js/lib/hollerith.js` | codici delle schede perforate IBM 029 |
| `test/*.test.js` | test in Node (`node --test sections/programmazione/test/*.test.js`) |

Regole: un file non tocca il DOM quando viene caricato (solo dentro `monta` o `disegna`), così i test in Node possono caricarlo. Le classi CSS di un laboratorio iniziano con `lab-<id>-`, quelle di una figura con `fig-<id>-`, quelle degli schermi d'epoca con `pg-sc-`.

## Capitolo

```js
ProgStoria.capitolo({
  id: 'telai',                      // ancora della pagina: index.html#telai (non cambiarlo)
  numero: 1,
  anni: '1725–1890',                // trattino lungo – per gli intervalli
  titolo: 'Le schede che comandano',
  sottotitolo: 'Telai, macchine analitiche e la prima programmatrice',
  epoca: 'jacquard',                // schermo d'epoca del «Ciao, mondo»
  intro: 'Una o due frasi che aprono il capitolo.',
  blocchi: [
    { tipo: 'testo', titolo: 'Un telaio che legge', paragrafi: ['…', '…'] },
    { tipo: 'figura', id: 'telaio-jacquard', didascalia: 'Il telaio Jacquard…' },
    { tipo: 'lab', id: 'jacquard', titolo: 'Prova tu: …', intro: 'Che cosa fare e che cosa osservare.' },
    { tipo: 'citazione', testo: '…', autore: 'Ada Lovelace', fonte: 'Note G, 1843' },
    { tipo: 'sapevi', testo: '…' },                 // riquadro «Lo sapevi?» (titolo facoltativo)
    { tipo: 'codice', linguaggio: 'FORTRAN', anno: 1957, codice: '…', didascalia: '…' },
    { tipo: 'tabella', intestazioni: ['…'], righe: [['…', '…']], didascalia: '…' },
    { tipo: 'elenco', titolo: '…', voci: ['…'] },
    { tipo: 'ciao' },                                // lo schermo d'epoca con i dati di `ciao`
  ],
  ciao: { anno: 1804, linguaggio: '…', codice: '…', uscita: '…', nota: '…' },
  protagonisti: [{ nome: 'Ada Lovelace', anni: '1815–1852', ruolo: 'Matematica', testo: 'Una frase.' }],
  tappe: [{ anno: 1804, testo: 'Joseph-Marie Jacquard brevetta il telaio a schede.' }],
  glossario: { 'scheda perforata': 'Definizione breve, autonoma.' },
  fonti: [{ testo: 'Autore, *Titolo*, editore, anno.', url: 'https://…' }],
});
```

Mini-markup nei testi: `**grassetto**`, `*corsivo*`, `` `codice` ``, `{{termine}}` o `{{termine|testo visibile}}` (apre la definizione del glossario; il termine deve esistere nel `glossario` di un capitolo), `[testo](#ancora)` per i collegamenti interni, `[testo](../porte-logiche/index.html)` per le altre sezioni, `[testo](https://…)` per i siti esterni. Niente HTML.

### Campi di `ciao` per ogni schermo

| `epoca` / `schermo` | Che cosa si vede | Campi usati |
| --- | --- | --- |
| `jacquard` | la catena di schede guida il telaio, riga dopo riga il tessuto mostra la parola | `uscita` (massimo 8 caratteri) |
| `nastro` | la testina della macchina di Turing scrive un simbolo per casella e si ferma in ALT | `uscita` (massimo 12 simboli), `codice` facoltativo: la tavola delle regole; se ha una riga con `→` per simbolo, le righe si accendono in ordine |
| `williams` | 32 righe da 32 bit, punti e trattini: il programma in alto, i dati disegnano la parola | `uscita` (al massimo 3 righe da 5 lettere) |
| `telescrivente` | il nastro perforato passa nel lettore, poi la telescrivente stampa | `codice` (listato), `uscita` (in maiuscolo) |
| `foglio` | il programma scritto a matita sul modulo di codifica, una casella per carattere | `codice` (FORTRAN a colonne fisse), `uscita` |
| `scheda` | la scheda IBM perforata colonna per colonna, con la lente sui 12 fori | `codice` (una riga, massimo 80 caratteri della perforatrice 029), `uscita` |
| `tabulato` | la stampante a righe stampa il listato numerato e il risultato | `codice`, `uscita` |
| `terminale` | `cat` del file, i comandi battuti a mano, l'uscita | `file`, `codice`, `comandi` (righe che iniziano con `$ `), `uscita` |
| `home` | il televisore blu: si batte il programma, `RUN`; con un `GOTO` gira finché arriva `BREAK` | `codice` (righe BASIC numerate), `uscita` |
| `mac` | lo script del pulsante «Saluta», il clic, la finestra di dialogo | `codice` (script), `uscita` (testo del messaggio) |
| `browser` | il sorgente HTML e la pagina disegnata (in un riquadro isolato, senza script) | `codice` (HTML), `file` facoltativo (indirizzo) |
| `editor` | editor moderno con completamento automatico e terminale integrato | `file`, `codice`, `comandi`, `uscita`, `cartella` facoltativa |
| `chat` | la domanda, la risposta un token alla volta, il codice e la sua esecuzione | `prompt`, `risposta`, `codice`, `uscita` |

Tutti accettano `anno`, `linguaggio` e `nota` (didascalia). L'animazione parte quando lo schermo entra in vista; il bottone in alto a destra la salta o la rivede; con il movimento ridotto si vede subito il risultato. `test/schermi.test.js` controlla che i dati di ogni capitolo vadano bene per il suo schermo.

## Laboratorio

```js
(function (root) {
  'use strict';

  // Logica pura: niente DOM, si prova in Node.
  const Logica = {
    passo(stato) { /* … */ },
  };

  const css = `
    .lab-esempio-griglia { display: grid; gap: 12px; padding: 18px; }
  `;

  function monta(el, ctx) {
    const { h } = ctx;
    const spiega = h('div', { class: 'pg-spiega', 'aria-live': 'polite' }, h('p', null, 'Premi ▶ per iniziare.'));
    const avvia = h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: esegui }, '▶ Esegui');
    const passo = h('button', { type: 'button', class: 'pg-btn', onclick: () => avanza() }, 'Passo');
    el.append(h('div', { class: 'pg-strumenti' }, avvia, passo), h('div', { class: 'lab-esempio-griglia' }), spiega);

    async function esegui() {
      try {
        for (let i = 0; i < 10; i++) {
          avanza();
          await ctx.attendi(400);            // si sospende da solo quando il laboratorio esce dalla vista
        }
        ctx.completa();                      // segna il laboratorio come esplorato
      } catch (err) {
        if (!ctx.annullato(err)) throw err;  // ctx.annulla() interrompe le attese in corso
      }
    }
    function avanza() { /* aggiorna lo stato e il disegno, poi ctx.annuncia('…') per i lettori di schermo */ }

    return {
      pausa() {},       // facoltativi: il motore ferma già attese, cicli e animazioni CSS
      riprendi() {},
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('esempio', { titolo: 'Esempio', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
```

`ctx` offre: `h(tag, attributi, ...figli)` e `s(...)` per creare elementi HTML e SVG; `inline(testo)` per il mini-markup; `uid()`;
`attendi(ms)`, `anima({ durata, easing, aggiorna(t) })`, `ciclo(fn(dt))` (tutti legati all'orologio del laboratorio, che si ferma fuori vista);
`annulla()` e `annullato(err)`; `riduci` (movimento ridotto); `DURATA`, `EASING`; `annuncia(testo)` (regione aria-live); `completa()`.

Controlli già pronti (in `css/programmazione.css`): `.pg-strumenti` (barra), `.pg-btn`, `.pg-btn--primario`, `.pg-gruppo` (bottoni affiancati, con `aria-pressed`), `.pg-campo` (input, select, textarea), `.pg-etichetta`, `.pg-cursore` (range), `.pg-lettura` (valori), `.pg-pannello`, `.pg-spiega` (spiegazione sotto lo strumento), `.pg-flash`.
Colori dello strumento: `--lab-bg`, `--lab-panel`, `--lab-raised`, `--lab-line`, `--lab-text`, `--lab-bright`, `--trace-1` (verde), `--trace-2` (ambra), `--trace-3` (azzurro), `--trace-4` (rosa).

Requisiti: funziona da 320 px a 1300 px di larghezza senza scorrimento orizzontale della pagina; tutto si usa da tastiera; bersagli di almeno 40 px; testo leggibile (almeno 13 px); niente errori in console; si capisce cosa fare senza leggere istruzioni lunghe.

## Figura

```js
ProgStoria.figura('telaio-jacquard', {
  alt: 'Descrizione per chi non vede l\'immagine.',
  css: '.fig-telaio-jacquard-scheda { animation: fig-telaio-jacquard-avanza 6s linear infinite; } …',
  disegna() {
    return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">…</svg>`;
  },
});
```

Illustrazione tecnica a tratto: contorni `var(--fig-ink)` da 2 px, campiture piatte dalla tavolozza `--fig-paper`, `--fig-1..4` (carta e legno), `--fig-metal`, `--fig-metal-2`, `--fig-glow`, `--fig-warm`, `--fig-cool`, `--fig-red`, `--cap` (accento del capitolo). Così si adatta da sola al tema scuro. Formato 800×500. Niente marchi o loghi registrati, niente volti realistici di persone reali: silhouette o figure stilizzate. Le animazioni sono discrete (luci, schede che avanzano, ingranaggi) e si fermano con il movimento ridotto.

## Prova

```bash
node --test sections/programmazione/test/*.test.js
python3 -m http.server 8000   # poi http://localhost:8000/sections/programmazione/
```
