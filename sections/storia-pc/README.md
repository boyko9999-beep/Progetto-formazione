# Sezione 6 · Architettura e storia dei PC

Pagina autonoma dell'enciclopedia (nessuna build): apri `index.html` con un browser.
Riusa i token e la barra di BusLab (`../../css/style.css`) e si registra nell'hub con `section.js`.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `index.html` | pagina: apertura, indice dei capitoli, capitoli, linea del tempo |
| `section.js` | registrazione nell'hub dell'enciclopedia (`Enciclopedia.register`) |
| `css/storia-pc.css` | stile comune: colori delle epoche, illustrazioni, laboratori, linea del tempo |
| `css/capitoli/NN-id.css` | stile di un solo capitolo e del suo laboratorio |
| `js/core.js` | `window.StoriaPC`: registro dei capitoli e strumenti (DOM, SVG, animazioni) |
| `js/modelli/NN-id.js` | dati e logica pura di un capitolo, senza DOM, testati in Node |
| `js/capitoli/NN-id.js` | testi, illustrazioni e laboratorio di un capitolo |
| `js/hero.js` | scheda madre animata dell'apertura |
| `js/app.js` | disegna i capitoli, l'indice, la linea del tempo; accende i laboratori |
| `../../tests/storia-pc*.test.js` | test (`node --test tests/*.test.js` dalla radice) |

## Come si scrive un capitolo

Un file `js/capitoli/NN-id.js` chiama `StoriaPC.registra` una volta. Il file non deve toccare il DOM
al caricamento (i test lo caricano in Node): il DOM si usa solo dentro `svg()` delle figure e dentro `lab.crea()`.

```js
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {}).altair;   // il proprio modello, se serve

  P.registra({
    numero: 3,                       // ordine nella pagina
    id: 'primi-pc',                  // ancora: index.html#primi-pc
    titolo: 'I primi personal computer',
    breve: 'Primi personal',         // nome corto per l'indice laterale
    periodo: '1965–1980',
    colore: 'var(--era-3)',
    sommario: 'Una frase per l\'hub e per i motori di ricerca.',
    intro: 'Paragrafo di apertura (HTML semplice ammesso).',
    blocchi: [ /* vedi sotto */ ],
    lab: { titolo: 'Il pannello dell\'Altair 8800', sottotitolo: 'Istruzioni in una riga', crea: function (el, ctx) { /* ... */ } },
    punti: ['Punto chiave 1', 'Punto chiave 2'],
    collegamenti: [
      { testo: 'Bus S-100', href: '../../index.html#/bus/s100', tipo: 'buslab' },
      { testo: 'Sezione 5 · La corsa agli 8 bit', href: '../chip-programmabili/#otto-bit', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
```

### Blocchi

| `tipo` | Campi | Resa |
| --- | --- | --- |
| `testo` | `titolo?`, `paragrafi: [html]` | testo dell'enciclopedia, colonna di lettura |
| `figura` | `svg: (P) => SVGElement \| stringa`, `alt`, `didascalia`, `larga?` | illustrazione su tela chiara |
| `schede` | `titolo?`, `items: [{ anno, nome, luogo?, testo, italia? }]` | schede di macchine e persone; finiscono anche nella linea del tempo |
| `citazione` | `testo`, `autore`, `fonte?` | citazione |
| `numeri` | `items: [{ valore, unita?, prefisso?, decimali?, etichetta }]` | numeri grandi che contano fino al valore |
| `nota` | `titolo?` (default "Lo sapevi?"), `testo` o `paragrafi` | curiosità |
| `italia` | `titolo?`, `testo` o `paragrafi` | "Il filo italiano" |
| `confronto` | `titolo?`, `colonne`, `righe` | tabella |
| `lab` | nessuno | posizione del laboratorio (se manca va in fondo) |

### Laboratorio

`crea(el, ctx)` riceve il contenitore (`.lab-stage`, già dentro la cornice scura con titolo) e `ctx`, cioè
`StoriaPC` più `ctx.capitolo`. Può restituire `{ attiva(), sospendi(), distruggi() }`: la pagina chiama
`attiva` quando il laboratorio entra nello schermo e `sospendi` quando esce, così le animazioni continue
(cicli `requestAnimationFrame`) non consumano batteria fuori vista. Il laboratorio viene creato solo quando
si avvicina allo schermo; un errore dentro `crea` mostra un messaggio senza rompere la pagina.

Classi pronte per i controlli (tema scuro da strumento): `.lab-controls`, `.lab-btn`, `.lab-btn.primary`,
`.lab-seg` (pulsanti con `aria-pressed`), `.lab-range`, `.lab-readout`, `.lab-kv` (`dl` di letture),
`.lab-note` (spiegazione, usala con `aria-live="polite"`), `.lab-panel`, `.lab-grid`, `.lab-svg`, `.lab-mono`.
Dentro un laboratorio `[hidden]` nasconde sempre, anche un `.lab-btn`; `.spc-sr-only` è il testo per i soli
lettori di schermo. Gli elementi adesivi usano `top: calc(var(--spc-cima) + 12px)`: `--spc-cima` è l'altezza
di ciò che resta fisso in cima (la barra sul desktop, l'indice dei capitoli sul telefono). Le animazioni CSS
delle figure si fermano da sole quando la figura è lontana dallo schermo (classe `.fuori`).

Strumenti in `ctx`: `h()` e `s()` per creare elementi HTML e SVG, `svgDaTesto()`, `loop()`, `tween()`,
`curve`, `motion` (durate e curve), `ridotto()` (movimento ridotto), `puntoSu(path, t)`, `formato(n, dec)`,
`uid()`, `cssVar()`, `annuncia(el, testo)`, `clamp()`, `lerp()`.

### Regole

- Testi in italiano, chiari per chi impara, con date e numeri verificati; nomi propri e sigle come nelle fonti.
- Animazioni solo su `transform` e `opacity` (o attributi SVG); niente `transition: all`.
- Con `prefers-reduced-motion` niente movimento: stati finali, passo-passo sempre disponibile.
- Ogni controllo è un `button` o un `input` con etichetta, raggiungibile da tastiera, almeno 40×40 px.
- Colori dalle variabili (`--cap`, `--era-N`, `--ill-*`, `--trace-*`), che hanno già il tema scuro.
- Classi del capitolo con un prefisso proprio (per esempio `.altair-…`) per non pestare gli altri capitoli.
