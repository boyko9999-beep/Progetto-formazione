# Lavori in corso (da togliere prima del merge)

Materiale di lavoro della sezione, salvato quando il progetto è stato messo in pausa il 24 ottobre 2026.
La pagina non lo carica: serve solo per riprendere il lavoro.

| File | Contenuto |
| --- | --- |
| `ricerca.json` | base di fatti verificata per i capitoli 2-10 (tappe storiche con fonti, numeri, formule, correzioni e dubbi dei ricercatori) |
| `strumenti/brief-capitoli.json` | brief di ogni capitolo (perimetro, confini, animazione, laboratorio, formule) e regole comuni date ai costruttori |
| `strumenti/workflow-capitoli.js` | corpo dello script dei workflow (costruzione, completamento, revisione a due lenti); va preceduto da `meta` e da `const DATA = { paths, common, chapters, research }` |
| `strumenti/migrate-quiz.cjs` | sposta le domande temporanee (`quiz` nei capitoli) in `quiz.js` e controlla i limiti del motore del quiz |
| `qa/shoot.cjs`, `qa/all.cjs` | controllo in browser con Playwright: errori, overflow, testo tagliato, fps, movimento, interazione, screenshot |

## Stato alla pausa

| Capitolo | Stato |
| --- | --- |
| fourier | completo e verificato |
| linee, radio, differenziale | prima versione completa, senza errori in browser; manca la revisione finale (radio: circa 30 fps su desktop, da alleggerire; differenziale: manca il test del modello) |
| conversione, fotonica | completati dopo l'interruzione (CSS, test, errore corretto); revisione a due lenti interrotta a metà |
| clock, mems | costruiti, senza errori in browser; da rivedere (clock: un test del modello fallisce, «campana di risonanza») |
| potenza, quantistica | ancora segnaposto: da costruire |

Poi restano: domande in `quiz.js`, allineamento a colori e logo dell'hub (`--sez-3`, `../enciclopedia.css`, `../enciclopedia.js`), controllo finale in browser, pull request.
