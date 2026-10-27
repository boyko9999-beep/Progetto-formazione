# Sezione 2 · Elettronica intermedia

Semiconduttori, transistor e circuiti analogici: dal cristallo di silicio all'alimentatore da 5 volt.
Pagina autonoma dell'enciclopedia BusLab, senza build: si apre `index.html` con un doppio clic.

## Struttura

| File | Contenuto |
| --- | --- |
| `index.html` | pagina della sezione; riusa `../../css/style.css` di BusLab |
| `section.js` | registrazione nell'hub (`Enciclopedia.register`) ed elenco ordinato dei capitoli |
| `style.css` | colori della sezione, banco del laboratorio, pagine |
| `js/core.js` | strumenti condivisi: DOM, numeri all'italiana, grafici, simboli dei circuiti, cariche animate, laboratorio |
| `js/storia.js` | epoche e tappe della linea del tempo che non appartengono a un solo capitolo; banco della valvola nella pagina Storia (`EI.storia.model`, `EI.historyDemo`) |
| `js/app.js` | pagine (panoramica, capitolo, storia, glossario) e navigazione con l'hash |
| `chapters/<id>.js` | un file per capitolo: testi, figure, storia, glossario, modello fisico e laboratorio |
| `tests/` | test dei modelli fisici, del banco della valvola e del contratto dei capitoli (`node --test tests/*.test.js` dalla radice) |

Indirizzi: `index.html` (panoramica), `index.html#diodo` (un capitolo), `#storia`, `#glossario`, `#glossario/lacuna`.

## Come è fatto un capitolo

Ogni file `chapters/<id>.js` è uno script classico (niente moduli ES, così funziona anche aperto da disco)
che chiama `EI.chapter({...})`. A livello del file non si tocca il DOM: tutto il disegno sta dentro
`lab.mount` o nelle figure, così i test possono caricare il file in Node.

```js
(function () {
  'use strict';
  const { s, sym, wire, dot, si, num, clamp } = EI;

  const model = { /* funzioni pure, testate in tests/<id>.test.js */ };

  function mount(lab) { /* il laboratorio, vedi sotto */ }

  EI.chapter({
    id: 'diodo',                      // uguale all'id in section.js e al nome del file
    icon: 'diode',                    // lattice | diode | led | bjt | mosfet | capacitor | opamp | wave | supply
    minutes: 12,                      // tempo di lettura e gioco
    summary: '...',                   // "In breve": 2-3 frasi, può usare [[termini]]
    keywords: ['giunzione', ...],     // id del glossario (almeno 3)
    model: model,
    css: '...',                       // stili propri, con classi che iniziano con l'id del capitolo
    lab: { title, intro, layout: 'side' | 'stack', viewBox: [w, h], mount },
    how: ['passo 1', ...],            // "Come funziona": 4-7 passi
    formulas: [{ name, expr (HTML), legend: [[simbolo, significato]], note }],
    figures: [{ title, svg: '<svg viewBox=...>...</svg>', caption, alt }],
    history: { text: ['paragrafo', ...], events: [{ year, title, who, text }] },
    fun: '...',                       // "Lo sapevi?"
    uses: '...',                      // "Dove lo trovi"
    links: [{ href: '../elettronica-base/index.html#ohm', section: 'Elettronica base', title: '...' }],
    glossary: { 'id-termine': { term: 'Termine', def: 'Definizione in una o due frasi.' } },
  });
})();
```

Titolo, sottotitolo e periodo del capitolo vengono da `section.js`.

### Testi

- Italiano semplice e preciso, frasi brevi, tono da buon libro di divulgazione. Numeri con la virgola (`4,7 kΩ`).
  Nel codice: `EI.si(0.0047, 'A')` → `4,70 mA` (prefissi da G a f, sotto 0,5 fA scrive 0; opzioni `sig`, `trim`,
  `prefix`, `signed`) e `EI.num(x, cifre)`.
- `[[id]]` o `[[id|testo]]` diventa un termine del glossario con la definizione al passaggio del mouse.
  Ogni id usato deve esistere nel glossario di un capitolo (lo controllano i test).
- Collegamenti ad altre sezioni sempre con `index.html` esplicito: `../porte-logiche/index.html#famiglie`.
  Dentro la sezione: `#bjt`.
- Date, nomi e primati vanno verificati con fonti affidabili. Nel dubbio si scrive "intorno al" o si toglie.

### Il laboratorio

`mount(lab)` riceve un banco già pronto (`EI.Lab`, in `js/core.js`):

| Metodo | A cosa serve |
| --- | --- |
| `lab.svg`, `lab.view(w, h)` | il disegno del circuito o del cristallo |
| `lab.readout({ label, unit, color, max, fmt })` | strumento digitale; `.set(v)`, `.state('warn' \| 'danger' \| 'ok')`. L'etichetta appare come è scritta, senza maiuscolo automatico (`τ`, `ms`, `Rds(on)` restano intatti) |
| `lab.explain(html)` | "Cosa succede": spiegazione che cambia con lo stato |
| `lab.plot({ title, height, x, y, y2, legend })` | grafico da oscilloscopio (`EI.Plot`): `clear()`, `line()`, `point()`, `hline()`, `vline()`, `band()`. Anche il titolo resta com'è scritto; le etichette dell'asse x che si sovrapporrebbero vengono saltate |
| `lab.slider({ label, min, max, value, unit, log, series: 'E12', onInput })` | cursore; `series` usa i valori commerciali |
| `lab.choice({ label, options, value, onChange })` | pulsanti a scelta |
| `lab.toggle({ label, on, off, value, onChange })` | interruttore |
| `lab.group(titolo)` | gruppo di comandi (`into: gruppo` nei comandi) |
| `lab.challenges([{ id, text, check(stato) }])`, `lab.check(stato)` | sfide che si spuntano da sole |
| `lab.loop((dt, t) => ...)` | animazione; si ferma fuori schermo, con la scheda nascosta o in pausa |
| `lab.onReset(fn)`, `lab.onDestroy(fn)` | pulsante ↺ e pulizia |

Simboli dei circuiti (norma IEC, la resistenza è un rettangolo): `sym.resistor`, `capacitor`, `inductor`,
`diode` (`kind: 'led' | 'zener'`, `setGlow`), `bjt`, `nmos` (`setChannel`), `opamp`, `source` (`'dc' | 'ac' | 'square'`),
`ground`, `lamp`, `switch`, `spdt`, `transformer`, `meter`, `ic`, `probe`. Fili con `EI.wire(svg, punti)`,
nodi con `EI.dot`. Le cariche che scorrono: `new EI.Flow(gruppo, path)` con `.set(EI.speedFor(i, imax))` e `.step(dt)`.

Regole del banco:

- Colore dei fili = tensione del nodo (`EI.vcolor(v, vmax)`): grigio a 0 V, verde se positiva, rosa se negativa.
- Corrente = cariche che scorrono, con velocità proporzionale (verso convenzionale).
- Semiconduttori, sempre con le classi di `style.css`: elettroni `.ei-e` (pallini azzurri), lacune `.ei-h`
  (cerchietti ambra), ioni `.ei-ion-n` / `.ei-ion-p`, zone `.ei-zone-n` / `.ei-zone-p` / `.ei-zone-dep`.
- Movimento ridotto (`lab.reduced`): niente animazione continua; il laboratorio mostra subito lo stato finale.
- Telefono (390 px): lo schema deve restare leggibile; usa tutto il `viewBox`, senza margini vuoti.
- Nessuna libreria esterna, nessuna richiesta di rete.

### Figure

Le figure sono SVG in stringa, con le classi di `style.css` che si adattano al tema chiaro e scuro:
`f-line`, `f-thin`, `f-dash`, `f-accent`, `f-fill`, `f-paper`, `f-soft`, `f-accent-soft`, `f-n`, `f-p`,
`f-n-dot`, `f-p-dot`, `f-text`, `f-small`, `f-mono`, `f-title`, `f-n-text`, `f-p-text`, `f-accent-text`.
Le animazioni nelle figure usano classi con il prefisso del capitolo nel campo `css` e si fermano con
`@media (prefers-reduced-motion: reduce)`.

## Test

```bash
node --test tests/*.test.js      # dalla radice del repository
```

`tests/elettronica-intermedia.test.js` carica i test di questa cartella: il contratto di ogni capitolo
(campi, glossario, collegamenti) e i modelli fisici (`tests/<id>.test.js`).
