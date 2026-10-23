# Elettronica avanzata (sezione 3 dell'enciclopedia)

Pagina autonoma: si apre con `index.html` (anche con doppio clic) e riusa lo stile di BusLab
(`../../css/style.css`). Dieci capitoli, ciascuno con animazione principale, spiegazione passo per passo,
laboratorio interattivo, formule, storia, glossario e domande di verifica.

| Indirizzo | Pagina |
| --- | --- |
| `index.html` | indice con la mappa delle frequenze |
| `index.html#fourier` | un capitolo (così lo collega l'hub dell'enciclopedia) |
| `index.html#storia` | linea del tempo di tutta la sezione |

## File

| File | Contenuto |
| --- | --- |
| `section.js` | scheda della sezione per l'hub: ordine, titoli, bande di frequenza, colori e icone dei capitoli |
| `quiz.js` | domande di verifica nel formato della banca dei quiz (`QuizBank.extend`) |
| `js/engine.js` | motore comune: registro, canvas nitidi, animazioni, controlli, disegno da strumento |
| `js/app.js` | pagine e navigazione della sezione |
| `css/avanzata.css` | stile della sezione |
| `chapters/<id>.js` e `.css` | un capitolo: contenuti, animazione, laboratorio, modello fisico |
| `../../tests/elettronica-avanzata*.test.js` | test del contratto e dei modelli (`node --test tests/`) |

## Come è fatto un capitolo

Ogni file `chapters/<id>.js` è una funzione autoeseguita che chiama `EA.register({...})`.
Titolo, numero, periodo, colore (`tinta`) e banda di frequenza stanno in `section.js`, non nel capitolo.
Il capitolo `fourier.js` è il modello di riferimento.

```js
EA.register({
  id: 'fourier',
  intro: ['paragrafo', ...],                 // "In parole semplici", 2-4 paragrafi
  steps: [{ title, text, focus }, ...],      // "Come funziona", 3-7 passi sincronizzati con l'animazione
  formulas: [{ label, eq, text }, ...],      // almeno 2; eq in HTML con <var>, <sub>, <sup>
  timeline: [{ year, title, who, text }],    // almeno 5 tappe verificate
  fun: '...',                                // "Lo sapevi?"
  uses: ['...', ...],                        // "Dove lo trovi oggi", almeno 4
  glossary: [{ term, def }, ...],            // almeno 4 voci
  sources: [{ title, url }, ...],            // almeno 3 fonti https
  hero: { caption, label, aspect, aspectMobile, mount(view, api) },
  lab: { title, intro, layout, mount(parts, api) },
  model: { ... },                            // funzioni pure usate dall'animazione e dai test
});
```

Nei testi è ammesso solo questo HTML: `<strong> <em> <var> <sub> <sup> <br> <abbr> <span>`.

### Animazione principale (`hero`)

`mount(view, api)` riceve il riquadro scuro (`.ea-stage-view`, dimensioni dal CSS: `aspect` su schermi
larghi, `aspectMobile` sotto i 900 px) e restituisce facoltativamente `{ focus(key, i), destroy() }`.

- `api.canvas(view, { label })` crea un canvas nitido: si disegna in pixel CSS con `cv.ctx`, `cv.w`, `cv.h`.
- `api.loop(draw)` registra `draw(t, dt)`. Parte da sola, si ferma fuori schermo o con la scheda nascosta,
  e con "riduci movimento" resta ferma (viene chiamata una volta con `dt = 0`). Il pulsante avvia/pausa
  lo aggiunge la pagina.
- `api.setStep(i)` evidenzia il passo `i` di "Come funziona"; la pagina chiama `focus(step.focus, i)`
  quando si tocca un passo.
- `api.invalidate()` ridisegna anche in pausa dopo un cambio di stato.

### Laboratorio (`lab`)

`mount(parts, api)` riceve `parts.controls` (colonna dei comandi), `parts.display` (area di disegno),
`parts.readouts` (fila di display numerici) e `parts.tools` (accanto al titolo). `layout: 'stack'`
mette i comandi sotto il disegno.

Comandi pronti, tutti accessibili da tastiera: `EA.ui.slider`, `EA.ui.segmented`, `EA.ui.toggle`,
`EA.ui.button`, `EA.ui.readout`. Annunci per i lettori di schermo: `api.announce(testo)`.

### Disegno da strumento

I pannelli sono sempre scuri, in entrambi i temi. Colori in `EA.colors` (`green`, `amber`, `cyan`, `pink`,
`orange`, `violet`, `red`, `lime`, `blue`, testo `text`/`dim`/`ink`), aiuti in `EA.draw`:
`clear`, `grid` (reticolo da oscilloscopio), `line` e `fn` (tracce luminose), `dot`, `arrow`, `text`.
Numeri all'italiana con `EA.fmt(x, cifre)` e prefissi SI con `EA.si(2.4e9, 'Hz')` → `2,4 GHz`.

### Regole del movimento

Ogni animazione deve guidare l'attenzione, mostrare uno stato o spiegare un passaggio, altrimenti va tolta.
Si animano solo trasformazioni e opacità nel DOM; il resto nel canvas, sempre con `api.loop`.
Niente librerie esterne: la pagina deve funzionare offline.

## Domande

Stanno in `quiz.js`: `{ id, chapter, level, topic, q, options, answer: 0, why }`, risposta giusta per prima,
3-4 opzioni di lunghezza simile. La pagina mostra le prime quattro di ogni capitolo come verifica finale;
il quiz dell'enciclopedia (`../quiz/index.html#elettronica-avanzata`) le usa tutte.

## Test

```bash
node --test tests/
```
