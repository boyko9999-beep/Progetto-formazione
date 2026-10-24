# Sezione 5 · Primi chip programmabili

Pagina autonoma dell'enciclopedia: storia e architettura dei primi chip programmabili,
dalle memorie che si scrivono una volta sola (1956) alle prime FPGA e all'ARM1 (1985).
Otto capitoli, ognuno con testo, illustrazioni SVG e un laboratorio interattivo.

Si apre con un doppio clic su `index.html`: niente build, niente dipendenze, niente rete.

## File

| Percorso | Contenuto |
| --- | --- |
| `index.html` | la pagina: testata, cassetto dei campioni, indice, gli 8 capitoli, chiusura |
| `section.js` | registrazione nell'hub (`Enciclopedia.register`) |
| `quiz.js` | domande extra per il quiz (`QuizBank.extend`) |
| `css/base.css` | stile comune della sezione (si appoggia a `../../css/style.css`) |
| `css/<capitolo>.css` | stile del laboratorio di un capitolo |
| `js/core.js` | motore comune: costruttori DOM/SVG, laboratori, animazioni, controlli, disegno dei chip |
| `js/hero.js` | animazione d'apertura e cassetto dei campioni |
| `js/<capitolo>.js` | laboratorio di un capitolo |
| `js/<capitolo>-core.js` | logica pura del laboratorio (senza DOM), provata dai test |
| `test/<capitolo>.test.js` | test con `node --test`, richiamati da `tests/chip-programmabili.test.js` |

## I capitoli

| # | id (ancora) | Titolo | Periodo |
| --- | --- | --- | --- |
| 1 | `idea` | Un chip, mille programmi | 1969 |
| 2 | `memorie` | Memorie che si programmano | 1956–1987 |
| 3 | `intel-4004` | Intel 4004, il primo microprocessore | 1969–1971 |
| 4 | `ciclo` | Dentro la CPU: prendi, decodifica, esegui | il ciclo di istruzione |
| 5 | `otto-bit` | La corsa agli 8 bit | 1972–1976 |
| 6 | `microcontrollori` | Il computer in un chip | 1971–1980 |
| 7 | `logica-programmabile` | Hardware che si riprogramma | 1970–1985 |
| 8 | `sedici-bit` | Verso i 16 bit e oltre | 1978–1985 |

Confini con le altre sezioni: porte logiche, flip-flop, sommatori, nascita del circuito integrato e
legge di Moore sono in `../porte-logiche/` (ancore `#calcolo`, `#moore`); i computer completi
(Altair, Apple II, IBM PC, schede madri) sono in `../storia-pc/` (ancore `#primi-pc`, `#ibm-pc`,
`#von-neumann`, `#scheda-madre`, `#prestazioni`); i linguaggi in `../programmazione/`;
i bus in BusLab (`../../index.html#/bus/uart` e simili).

## Struttura di un capitolo

```html
<section class="cp-chapter" id="intel-4004" aria-labelledby="intel-4004-titolo">
  <header class="cp-ch-head">
    <div>
      <p class="cp-ch-num"><b>03</b> 1969–1971</p>
      <h2 id="intel-4004-titolo">Intel 4004, il primo microprocessore</h2>
      <p class="cp-ch-lead">Una frase che dice perché il capitolo conta.</p>
    </div>
    <figure class="cp-specimen" data-dip='{"pins":16,"label":"C4004","top":"intel","body":"ceramic"}'>
      <figcaption class="cp-specimen-cap">Intel C4004 · 16 piedini</figcaption>
    </figure>
  </header>

  <div class="cp-prose cp-reveal"> <p>…</p> </div>

  <figure class="cp-fig cp-reveal"> <div class="cp-art"><svg …>…</svg></div> <figcaption>…</figcaption> </figure>

  <section class="cp-lab" data-lab="intel-4004" aria-labelledby="lab-intel-4004-titolo">
    <header class="cp-lab-head">
      <span class="cp-lab-tag">Laboratorio</span>
      <h3 id="lab-intel-4004-titolo">Il 4004 al microscopio</h3>
      <p>Che cosa fare, in una o due frasi.</p>
    </header>
    <div class="cp-lab-mount"><p class="cp-lab-fallback">Caricamento del laboratorio…</p></div>
  </section>

  <details class="cp-fonti"><summary>Fonti</summary><ol><li>…</li></ol></details>
  <nav class="cp-next"><a href="#ciclo"><small>Capitolo successivo →</small>Dentro la CPU</a></nav>
</section>
```

Componenti di testo disponibili in `css/base.css`: `cp-prose` (colonna di lettura), `cp-cols`
(due colonne, `wide-left` per allargare la prima), `cp-fig` (`dark` per lo sfondo da strumento) con
`cp-art`, `cp-fact` ("Lo sapevi?"), `cp-quote`, `cp-specs` (scheda tecnica `dl`), `cp-people` /
`cp-person` (persone con iniziali), `cp-steps` (mini linea del tempo), `cp-fonti`, `cp-next`,
`cp-reveal` (compare entrando nella vista). Dentro gli SVG su carta usa le classi `ink`, `muted`,
`accent`, `paper`, `stroke-ink`, `stroke-line`, `stroke-accent`, così si adattano al tema scuro.

## Laboratori

Un laboratorio è un file `js/<capitolo>.js` che si registra così:

```js
CP.lab('intel-4004', function (mount, ctx) {
  const { h, s, ui } = CP;
  const stage = s('svg', { viewBox: '0 0 800 420', role: 'img', 'aria-label': '…' });
  mount.append(ui.bar(ui.button({ label: 'Avvia', icon: '▶︎', primary: true, onClick: run })),
    h('div', { class: 'cp-lab-grid' }, h('div', { class: 'cp-stage' }, stage), h('div', { class: 'cp-explain' }, '…')));
  const stop = ctx.tick((dt) => { /* un fotogramma, solo se il laboratorio è in vista */ });
  // quando chi impara raggiunge l'obiettivo:
  ctx.done();
});
```

`core.js` monta il laboratorio quando si avvicina alla vista e mette in pausa `ctx.tick` e
`ctx.every` quando esce. Se il montaggio fallisce mostra un messaggio d'errore al posto del laboratorio.

| API | Uso |
| --- | --- |
| `CP.h(tag, attrs, ...figli)` / `CP.s(...)` | elementi HTML / SVG (`class`, `style` oggetto o stringa, `on…`, `text`, `html`) |
| `ctx.tick(fn)` | `fn(dt, t)` a ogni fotogramma mentre è visibile; restituisce la funzione per fermarlo |
| `ctx.every(ms, fn)` | ripete `fn` ogni `ms` di tempo visibile |
| `CP.tween({ from, to, duration, delay, ease, onUpdate, onDone })` | interpolazione; con movimento ridotto salta alla fine |
| `CP.wait(ms, { motion: true })` | attesa (nulla con movimento ridotto se `motion`) |
| `CP.dur`, `CP.ease` | durate (`instant` 80, `fast` 180, `normal` 350, `slow` 600, `crawl` 1000 ms) e curve (`smooth`, `sharp`, `bounce`, `inOut`) |
| `ctx.reduced` | `true` se l'utente preferisce meno movimento |
| `ctx.say(testo)` | annuncio per i lettori di schermo |
| `ctx.done()` | segna il capitolo come completato (indice, hub, memoria locale) |
| `CP.ui.button / seg / range / toggle / readout / bar / legend` | controlli coerenti in tutti i laboratori |
| `CP.art.dip({ pins, label, top, bottom, body, lid, window, pinNames, group })` | chip in package DIP |
| `CP.fmt.num / hex / bin` | numeri all'italiana (2.300), esadecimale, binario |
| `CP.store.get / set` | piccole preferenze locali (con try/catch) |

Colori dei segnali, uguali ovunque: `--sig-addr` indirizzi (ambra), `--sig-data` dati (azzurro),
`--sig-ctrl` controllo (rosa), `--sig-on` livello alto o blocco attivo (verde), `--sig-off`,
`--sig-idle`. Classi SVG pronte: `cp-blk` (blocco funzionale, `is-active`), `cp-bus`
(`addr`, `data`, `ctrl`, `on` + `is-active`).

Regole del movimento (dalle skill ECC `motion-foundations` e `frontend-design-direction`):
ogni animazione guida l'attenzione, comunica uno stato o mantiene la continuità spaziale; si animano
`transform` e `opacity`; con `prefers-reduced-motion` niente spostamenti né partenze automatiche;
sfalsamenti tra 50 e 100 ms; i cicli continui passano da `ctx.tick` così si fermano fuori vista.

## Test

```bash
node --test tests/*.test.js
```

`tests/chip-programmabili.test.js` carica i test in `test/`, che provano la logica pura dei laboratori.
