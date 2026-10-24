# Strumenti di sviluppo della sezione 5 (temporanei)

Da cancellare prima della PR, insieme a `_parti/` e `_anteprima.html`.

- `assemble.js`: inserisce `_parti/<id>.html` in `index.html` tra i segnaposto `@parte`, aggiorna i tag css/js e genera `quiz.js` dai `_parti/<id>.quiz.json`. `--finale` toglie i segnaposto; `--out NOME.html` scrive una copia di prova.
- `check-parti.js`: controlli meccanici dei frammenti (struttura, figure, fonti, link, quiz, selettori CSS).
- `shot.js`: screenshot ed errori con Playwright di una pagina (anteprima di un capitolo: `_anteprima.html?c=<id>`).
- `qa-pagina.js`: scorre la pagina completa e fotografa testata e laboratorio di ogni capitolo.
- `wf-capitoli.js`, `wf-coerenza.js`: script dei workflow usati (autori dei capitoli, revisione trasversale).

I percorsi assoluti puntano alla scratchpad della sessione originale: aggiornali prima di usarli.
Serve un server sulla radice del repo: `python3 -m http.server 8765 --bind 127.0.0.1`.
