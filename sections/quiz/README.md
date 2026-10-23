# Sezione 8 · Quiz

Il laboratorio di verifica dell'enciclopedia: un quiz animato per ogni sezione,
più l'esame finale misto, la sfida a tempo e il ripasso degli errori.
Si apre con `sections/quiz/index.html`, senza installare niente.

## Link

| Link | Cosa apre |
| --- | --- |
| `quiz/index.html` | la pagina con tutte le sezioni |
| `quiz/index.html#elettronica-base` | il quiz di una sezione |
| `quiz/index.html#elettronica-base/ohm` | solo le domande di un capitolo (se non ce ne sono, tutta la sezione) |
| `quiz/index.html#esame` | l'esame finale con domande da tutte le sezioni |
| `quiz/index.html#tempo` | la sfida a tempo |
| `quiz/index.html#errori` | il ripasso delle domande sbagliate |

Dalla pagina di una sezione il percorso è `../quiz/index.html#<slug>`.

## File

| File | Contenuto |
| --- | --- |
| `core.js` | logica pura: registro delle banche (`QuizBank`), verifica delle risposte, scelta delle domande, validazione |
| `figures.js` | figure SVG: simboli elettrici, porte e circuiti logici, resistori, forme d'onda, chip, codice, schede perforate, schemi a blocchi |
| `engine.js` | motore del quiz: domande interattive, animazioni, strumento del punteggio, suoni |
| `app.js` | pagina del quiz: scelta della sezione, modalità, progressi |
| `quiz.css` | stile (riusa i colori di `css/style.css`) |
| `section.js` | registrazione della sezione 8 nell'hub dell'enciclopedia |
| `banks/<slug>.js` | una banca di domande per ogni sezione; `bus.js` ricava la sua dalle lezioni di BusLab (`js/buses.js`) e `bus-extra.js` la completa |
| `tools/check-banks.js` | controlla tutte le banche (`node sections/quiz/tools/check-banks.js --hints`) |
| `tools/browser-check.js` | prova la pagina in Chromium: tre larghezze, chiaro e scuro, e ogni domanda risolta dall'interfaccia |
| `../../tests/quiz.test.js` | test automatici (`node --test`) |

## Formato di una banca

```js
(function (root) {
  'use strict';
  root.QuizBank.register({
    slug: 'elettronica-base',
    number: 1,
    title: 'Elettronica base',
    subtitle: 'Carica, corrente, tensione e i primi circuiti',
    chapters: [{ id: 'ohm', title: 'La legge di Ohm' }],
    questions: [ /* domande */ ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
```

Una sezione può aggiungere domande alla propria banca con un suo file
`sections/<slug>/quiz.js` (va poi incluso in `quiz/index.html`, come già
`elettronica-avanzata/quiz.js`):

```js
(function (root) {
  root.QuizBank && root.QuizBank.extend('elettronica-base', [ /* domande */ ]);
})(typeof window !== 'undefined' ? window : globalThis);
```

Funziona sia prima sia dopo la banca. Una domanda della sezione con lo stesso `id`
di una della banca la sostituisce: così una sezione può correggere o riscrivere
le domande sui propri capitoli. Le domande non valide vengono scartate con un
avviso in console, senza fermare la pagina.

## Usare il motore in un'altra pagina

Una sezione può anche mostrare un mini quiz dentro le sue pagine. Servono
`core.js`, `figures.js`, `engine.js`, `quiz.css` e la banca della sezione:

```js
// 5 domande del capitolo "ohm", con il pulsante per riprovare
QuizEngine.embed(document.getElementById('verifica'), { section: 'elettronica-base', chapter: 'ohm', count: 5 });

// controllo completo
QuizEngine.mount(el, {
  questions,               // domande già scelte, per esempio con QuizCore.pick(...)
  title, subtitle, color,  // intestazione e colore della sezione
  seconds,                 // secondi per domanda (0 = senza tempo)
  learn(q),                // facoltativo: { href, text } del capitolo da rileggere dopo un errore
  onAnswer(q, ok), onFinish(result), onRetry(), onExit(),
});
```

`onFinish` riceve `{ total, correct, pct, points, bestStreak, seconds, medal, wrongIds, rightIds }`
e può restituire `{ note, actions }` da mostrare nella schermata del risultato.

## Risultati salvati

La pagina tiene record, medaglie, domande già viste ed errori da ripassare in
`localStorage` (chiave `enciclopedia-quiz-v1`), solo in quel browser. Nel quiz
di una sezione escono prima le domande mai viste. Il numero di medaglie va
anche all'hub con `Enciclopedia.progresso('quiz', medaglie, banche)`.

## Formato di una domanda

Campi comuni:

| Campo | Obbligatorio | Significato |
| --- | --- | --- |
| `id` | nelle banche | identificatore unico, es. `eb-07` |
| `type` | no (predefinito `choice`) | uno degli 8 tipi qui sotto |
| `level` | nelle banche | 1 base, 2 medio, 3 esperto |
| `topic` | nelle banche | etichetta breve (max 32 caratteri), es. `Legge di Ohm` |
| `chapter` | consigliato | id del capitolo della sezione, es. `ohm` |
| `q` | sì | testo della domanda (max 320 caratteri) |
| `why` | sì | spiegazione mostrata dopo la risposta (max 600 caratteri) |
| `figure` | no | figura da mostrare sopra le risposte (vedi sotto) |

I tipi:

```js
// scelta multipla (compatibile con le domande di BusLab): la giusta per prima, il motore mescola
{ type: 'choice', q: 'Che cosa misura l\'ohm?', options: ['La resistenza', 'La tensione', 'La corrente'], answer: 0, why: '...' }

// vero o falso
{ type: 'truefalse', q: 'Un amperometro si collega in serie al carico.', answer: true, why: '...' }

// riordina (items nell'ordine giusto; ends sono le etichette dei due estremi)
{ type: 'order', q: 'Metti in ordine cronologico', items: ['Pila di Volta', 'Telegrafo', 'Transistor'], ends: ['Prima', 'Dopo'], why: '...' }

// abbina (3-5 coppie; la colonna di destra viene mescolata)
{ type: 'match', q: 'Abbina la grandezza alla sua unità', pairs: [['Tensione', 'volt'], ['Corrente', 'ampere'], ['Resistenza', 'ohm']], why: '...' }

// risposta numerica (value sotto 1000: usa i prefissi nell'unità; tolerance assoluta, predefinita 2%)
{ type: 'number', q: 'Con 9 V su 450 Ω, quanta corrente scorre?', value: 20, unit: 'mA', tolerance: 0.5, why: '...' }

// accendi i bit (4 o 8 bit) per scrivere un numero
{ type: 'bits', q: 'Scrivi 13 in binario', width: 4, value: 13, why: '...' }

// completa la tabella di verità di un'espressione (1-3 ingressi)
{ type: 'truth', q: 'Completa la tabella della porta XOR', expr: 'XOR(A,B)', why: '...' }

// imposta gli ingressi del circuito per ottenere l'uscita target (1-4 ingressi)
{ type: 'logic', q: 'Accendi il LED', expr: 'AND(A,NOT(B))', target: 1, why: '...' }
```

Le espressioni logiche usano le porte `AND OR NAND NOR XOR XNOR NOT BUF` e gli ingressi `A B C D`,
per esempio `NAND(NAND(A,B),C)`.

## Figure

Ogni figura è un oggetto `figure: { kind, ... }` con una `caption` facoltativa.

| kind | Parametri | Esempio |
| --- | --- | --- |
| `symbol` | `name`: resistor, potentiometer, capacitor, electrolytic, inductor, diode, led, zener, photodiode, battery, ac-source, ground, switch, pushbutton, lamp, fuse, npn, pnp, nmos, pmos, opamp, transformer, crystal, speaker, motor, voltmeter, ammeter, relay, antenna | `{ kind: 'symbol', name: 'zener' }` |
| `resistor` | `bands`: 4 o 5 colori tra nero, marrone, rosso, arancione, giallo, verde, blu, viola, grigio, bianco, oro, argento | `{ kind: 'resistor', bands: ['giallo', 'viola', 'rosso', 'oro'] }` |
| `gate` | `gate`: AND, OR, NOT, NAND, NOR, XOR, XNOR, BUF | `{ kind: 'gate', gate: 'NOR' }` |
| `logic` | `expr`: espressione logica | `{ kind: 'logic', expr: 'OR(AND(A,B),C)' }` |
| `wave` | `shape`: sine, square, triangle, sawtooth, pwm, dc, half-wave, full-wave, sampled, am, fm, clock-data, differential; `cycles` 1-8; `duty` 0.05-0.95 (pwm); `label` | `{ kind: 'wave', shape: 'pwm', duty: 0.25, label: '5 V · 1 kHz' }` |
| `circuit` | `topo`: series / parallel (`values`), divider (`vin`, `r1`, `r2`), led (`v`, `r`), rc (`v`, `r`, `c`), switches-series, switches-parallel | `{ kind: 'circuit', topo: 'divider', vin: '12 V', r1: '10 kΩ', r2: '10 kΩ' }` |
| `chip` | `pins` pari 8-64, `label`, `note`, `package` dip o qfp | `{ kind: 'chip', pins: 16, label: 'Intel 4004', note: '1971' }` |
| `code` | `lang`, `text` (max 14 righe da 56 caratteri) | `{ kind: 'code', lang: 'BASIC', text: '10 PRINT "CIAO"\n20 GOTO 10' }` |
| `bits` | `value`, `width` 4, 8 o 16 | `{ kind: 'bits', value: 65, width: 8 }` |
| `card` | `text`: 1-24 caratteri A-Z, 0-9 e spazio (scheda perforata IBM) | `{ kind: 'card', text: 'HELLO 1964' }` |
| `block` | `name`: von-neumann, harvard, fetch-cycle, memory-pyramid, cpu | `{ kind: 'block', name: 'harvard' }` |

## Regole per scrivere le domande

- Italiano semplice e corretto; una sola risposta difendibile, senza trabocchetti.
- Distrattori plausibili, della stessa forma e lunghezza della risposta giusta;
  niente "tutte le precedenti" o "nessuna delle precedenti".
- Date, nomi e numeri solo se consolidati; i calcoli si verificano due volte.
- La spiegazione insegna qualcosa: la formula, la data, il perché.
- Le domande interattive e le figure servono a far *usare* l'argomento, non a decorare.

Prima di aprire una PR: `node sections/quiz/tools/check-banks.js` e `node --test`.
Per la prova in browser serve Playwright:
`NODE_PATH=$(npm root -g) node sections/quiz/tools/browser-check.js --shots /tmp/quiz-shots`.
