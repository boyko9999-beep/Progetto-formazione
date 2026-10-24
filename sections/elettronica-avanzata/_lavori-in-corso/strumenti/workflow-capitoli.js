
const P = DATA.paths
const COMMON = DATA.common
const J = (x) => JSON.stringify(x, null, 1)

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    hero: { type: 'string' },
    lab: { type: 'string' },
    tests: { type: 'string' },
    qa: { type: 'string' },
    screenshotsReviewed: { type: 'array', items: { type: 'string' } },
    knownIssues: { type: 'array', items: { type: 'string' } },
    quizCount: { type: 'integer' },
  },
  required: ['files', 'hero', 'lab', 'tests', 'qa', 'knownIssues', 'quizCount'],
}

const REVIEWFIX_SCHEMA = {
  type: 'object',
  properties: {
    verdictBefore: { type: 'string', enum: ['ottimo', 'buono', 'da-migliorare', 'insufficiente'] },
    verdictAfter: { type: 'string', enum: ['ottimo', 'buono', 'da-migliorare', 'insufficiente'] },
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      area: { type: 'string' }, problem: { type: 'string' }, fixed: { type: 'boolean' }, note: { type: 'string' } },
      required: ['severity', 'area', 'problem', 'fixed'] } },
    factsChecked: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string' },
    qa: { type: 'string' },
    screenshotsReviewed: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['verdictBefore', 'verdictAfter', 'issues', 'tests', 'qa'],
}

function brief(c) {
  return `Capitolo ${c.numero} · "${c.titolo}" (${c.argomento}), id ${c.id}, tinta ${c.tinta}, periodo ${c.periodo}, banda: ${c.freqLabel}.
Perimetro: ${c.scope}
Confini con altri capitoli e sezioni: ${c.boundaries}
Animazione principale (brief): ${c.hero}
Laboratorio (brief): ${c.lab}
Formule suggerite: ${c.formulas}`
}

function files(c) {
  return `File che puoi creare o modificare (SOLO questi tre):
- ${P.sec}/chapters/${c.id}.js
- ${P.sec}/chapters/${c.id}.css
- ${P.repo}/tests/elettronica-avanzata-${c.id}.test.js`
}

function shoot(c, dir, extra) {
  return `cd ${P.repo} && node ${P.qa} --route ${c.id} --out ${P.shots}/${c.id}/${dir} --viewports ${extra || '1440x900,390x844'} --themes light,dark --reduced --interact`
}

function quick(c, dir) {
  return `cd ${P.repo} && node ${P.qa} --route ${c.id} --out ${P.shots}/${c.id}/${dir} --viewports 1440x900,390x844 --themes dark --interact`
}

function tests(c) {
  return `cd ${P.repo} && node --test tests/elettronica-avanzata.test.js tests/elettronica-avanzata-${c.id}.test.js`
}

const RESILIENCE = `Lavoro interrompibile: un tentativo precedente è stato interrotto da un limite di utilizzo e potrebbe succedere di nuovo. Salva presto una versione completa e funzionante dei file e poi migliorala per passi successivi, così che in ogni momento resti un capitolo usabile. Le ricerche web (WebSearch, caricato con ToolSearch) sono contingentate: usale solo per dubbi importanti; dove un fatto non è verificabile, usa una formulazione prudente o omettilo, senza mai inventare date, nomi o numeri. Gli fps misurati possono risultare bassi perché altri agenti usano la macchina in parallelo: preoccupati solo se il disegno è davvero pesante.`

const LENSES = `Lente A, interaction design e qualità visiva: guarda con Read gli screenshot (stage, colonne, laboratorio, laboratorio dopo l'interazione, ultimo passo, formule, storia, verifica) su desktop e mobile, in tema chiaro e scuro, e quelli con movimento ridotto; confrontali con il capitolo modello in ${P.shots}/fourier/. Se serve scrivi un piccolo script Playwright tuo in ${P.scratch}/review-<id>/ (puoi copiare l'impostazione di ${P.qa}) per catturare fotogrammi a istanti diversi, a ogni passo o con i cursori agli estremi. Valuta: l'animazione spiega davvero il concetto ed è all'altezza del modello? Fasi e passi sono sincronizzati e il clic su un passo mostra la cosa giusta? Il laboratorio risponde in modo chiaro e i display hanno senso fisico anche agli estremi? Testo nel canvas leggibile (almeno 10,5 px), niente sovrapposizioni o tagli, buon uso dello spazio, mobile 390 px, tema scuro, primo fotogramma completo con movimento ridotto, focus visibile, etichette accessibili.
Lente B, correttezza scientifica, storia, lingua e didattica: leggi per intero il capitolo e il test. Verifica formule e modello (unità, ordini di grandezza, segni, casi limite) e che animazione e laboratorio mostrino comportamenti fisicamente corretti, non solo plausibili; esegui i test e, se utile, piccoli script Node tuoi. Controlla ogni tappa storica e ogni affermazione fattuale confrontandola con la base di fatti e le sue correzioni. Controlla l'italiano (grammatica, scorrevolezza, termini tecnici, tono chiaro per studenti), la progressione didattica, le sovrapposizioni con le altre sezioni e le domande "quiz" (una sola risposta giusta e inequivocabile, distrattori plausibili, spiegazione corretta; limiti: q max 320 caratteri, why max 600, opzioni max 140).`

const QUIZ_RULES = (c) => `4 domande TEMPORANEE nella proprietà "quiz" dell'oggetto del capitolo, nel formato { id: 'ea-${c.id}-01' (poi -02, -03, -04), chapter: '${c.id}', level: 1|2|3, topic: 'max 30 caratteri', q, options: [giusta, sbagliata, sbagliata, (sbagliata)], answer: 0, why } (le sposterò io in quiz.js). Limiti del motore del quiz: q al massimo 320 caratteri, why al massimo 600, ogni opzione al massimo 140; opzioni di lunghezza simile, una sola risposta giusta e inequivocabile, niente "tutte le precedenti".`

const TEST_RULES = (c) => `Test: nel file di test usa const { load } = require('./elettronica-avanzata.load.js'); const M = load().chapter('${c.id}').model; e verifica la fisica del modello con valori noti (almeno 5 test significativi, non banali). Gli array del modello arrivano da un altro realm: confronta con Array.from(...) o con valori semplici. Esempi: tests/elettronica-avanzata-fourier.test.js e, se esistono, tests/elettronica-avanzata-linee.test.js e -radio.test.js.`

function buildPrompt(c, research, partial) {
  return `Sei uno sviluppatore front-end e divulgatore scientifico di altissimo livello. Costruisci un capitolo completo della sezione "Elettronica avanzata".

${COMMON}

${brief(c)}

${files(c)}
${partial ? `\nIn ${partial} trovi un tentativo precedente, interrotto e troncato a metà file: puoi riusarne idee e codice, ma il capitolo va completato e verificato da te. Se ${P.sec}/chapters/${c.id}.js contiene già più di un segnaposto, è lavoro tuo interrotto: riprendilo da lì.\n` : `\nSe ${P.sec}/chapters/${c.id}.js contiene già più di un segnaposto, è un tuo tentativo interrotto: riprendilo da lì invece di ricominciare.\n`}
Base di fatti preparata dal ricercatore (usala per storia, numeri e fonti; leggi con attenzione "corrections": contiene precisazioni su date e primati che devi rispettare):
${J(research)}

${RESILIENCE}

Requisiti di contenuto: intro di 3 paragrafi; 4-6 passi con "focus"; 3-4 formule; 7-9 tappe storiche; "fun"; almeno 6 usi; almeno 5 voci di glossario; almeno 4 fonti https (solo URL presenti nella base di fatti o che hai aperto tu); ${QUIZ_RULES(c)}
${TEST_RULES(c)}
Codice compatto e leggibile: punta a 35-55 KB per il file JS (fourier.js ne ha 26), senza ripetizioni inutili.

Procedura:
1. Leggi i file di riferimento indicati sopra; studia fourier.js e il suo CSS a fondo: il tuo capitolo deve sembrare scritto dalla stessa mano, con lo stesso livello di cura.
2. Progetta prima: fasi dell'animazione principale (cosa si vede, cosa si muove e perché, cosa dice ogni etichetta), disposizione desktop e mobile, comandi e display del laboratorio con i loro valori estremi. Poi scrivi modello, animazione, laboratorio, contenuti, CSS e test.
3. Esegui: ${tests(c)} (devono passare; gli "skipped" dei capitoli ancora segnaposto sono normali; se un capitolo di un collega fa fallire un test che non riguarda ${c.id}, ignoralo e segnalalo).
4. Controllo rapido durante le iterazioni: ${quick(c, 'build')}
   Guarda con Read gli screenshot di stage, laboratorio, laboratorio dopo l'interazione e ultimo passo (desktop e mobile) e confrontali con quelli del capitolo modello in ${P.shots}/fourier/. Correggi errori, sovrapposizioni, testo tagliato, spazi vuoti, scarsa leggibilità e ripeti i punti 3-4 finché il risultato è impeccabile (di solito 3-4 giri).
5. Controllo finale completo: ${shoot(c, 'build-final')}
   Guarda almeno stage e laboratorio in tema chiaro e quelli con movimento ridotto (il primo fotogramma statico deve essere completo).
6. Restituisci il riepilogo richiesto (in italiano). L'obiettivo è un'animazione premium: fluida, chiara, bella e fedele alla fisica, che faccia dire "ah, ecco come funziona".`
}

function completePrompt(c, research, state) {
  return `Sei insieme lo sviluppatore che completa un capitolo e il suo revisore più severo. Il capitolo della sezione "Elettronica avanzata" qui sotto è stato costruito da un collega che è stato interrotto da un limite di utilizzo prima del controllo finale.

${COMMON}

${brief(c)}

${files(c)}

Stato attuale rilevato dal coordinatore: ${state}

Base di fatti del ricercatore (con le sue correzioni e i suoi dubbi): ${J({ timeline: research.timeline, corrections: research.corrections, numbers: research.numbers, formulas: research.formulas, sources: research.sources })}

${RESILIENCE}

Procedura:
1. Leggi i file di riferimento indicati sopra (in particolare fourier.js, engine.js e app.js) e poi per intero ${c.id}.js, .css e l'eventuale test. Non riscrivere da zero ciò che funziona; se trovi codice morto o duplicato, semplificalo.
2. Completa ciò che manca: il file di test del modello se non esiste (${TEST_RULES(c)}), il CSS del capitolo, gli errori segnalati sopra. Esegui: ${tests(c)}
3. Esegui: ${shoot(c, 'review')}
4. ${LENSES.replace('<id>', c.id)}
5. Scrivi l'elenco dei problemi (blocker per cose rotte o fuorvianti, major per difetti evidenti, minor per rifiniture) e CORREGGILI direttamente nei file: tutti i blocker e i major, e i minor che migliorano davvero il risultato.
6. Rilancia i test e il controllo: ${tests(c)} e poi ${shoot(c, 'final')}
   Guarda di nuovo stage e laboratorio (desktop e mobile, chiaro e scuro, dopo l'interazione) e verifica che ogni correzione si veda e che non ci siano regressioni; ripeti se serve.
7. Restituisci il riepilogo richiesto (in italiano), con il giudizio prima e dopo il tuo intervento.`
}

function reviewFixPrompt(c, research, build) {
  return `Sei insieme un revisore severo e lo sviluppatore che applica le correzioni, per un capitolo appena costruito della sezione "Elettronica avanzata".

${COMMON}

${brief(c)}

${files(c)}

Base di fatti del ricercatore (con le sue correzioni e i suoi dubbi): ${J({ timeline: research.timeline, corrections: research.corrections, numbers: research.numbers, sources: research.sources })}
Riepilogo del costruttore: ${J(build)}

${RESILIENCE}

Procedura:
1. Esegui: ${shoot(c, 'review')}
2. ${LENSES.replace('<id>', c.id)}
3. Scrivi l'elenco dei problemi (blocker per cose rotte o fuorvianti, major per difetti evidenti, minor per rifiniture) e CORREGGILI direttamente nei file: tutti i blocker e i major, e i minor che migliorano davvero il risultato.
4. Rilancia i test e il controllo: ${tests(c)} e poi ${shoot(c, 'final')}
   Guarda di nuovo stage e laboratorio (desktop e mobile, chiaro e scuro, dopo l'interazione) e verifica che ogni correzione si veda e che non ci siano regressioni; ripeti se serve.
5. Restituisci il riepilogo richiesto (in italiano), con il giudizio prima e dopo le correzioni.`
}

// args.items: [{ id, mode: 'build' | 'complete', state?, partial? }] nell'ordine di priorità.
const results = await pipeline(
  args.items,
  (it) => {
    const c = DATA.chapters[it.id]
    const research = DATA.research[it.id]
    if (it.mode === 'complete') {
      return agent(completePrompt(c, research, it.state), { label: 'completa-e-rivedi:' + it.id, phase: 'Completamento e revisione', schema: REVIEWFIX_SCHEMA })
        .then((review) => ({ id: it.id, mode: it.mode, review, done: true }))
    }
    return agent(buildPrompt(c, research, it.partial), { label: 'costruzione:' + it.id, phase: 'Costruzione', schema: BUILD_SCHEMA })
      .then((build) => ({ id: it.id, mode: it.mode, build }))
  },
  (prev, it) => {
    if (prev.done) return prev
    if (!prev.build) {
      log('costruzione non riuscita per ' + it.id + ': salto la revisione')
      return prev
    }
    const c = DATA.chapters[it.id]
    return agent(reviewFixPrompt(c, DATA.research[it.id], prev.build), { label: 'revisione:' + it.id, phase: 'Completamento e revisione', schema: REVIEWFIX_SCHEMA })
      .then((review) => Object.assign({}, prev, { review }))
  },
)

return results.map((r) => r && {
  id: r.id,
  mode: r.mode,
  build: r.build ? { files: r.build.files, tests: r.build.tests, qa: r.build.qa, knownIssues: r.build.knownIssues, quizCount: r.build.quizCount } : null,
  review: r.review ? { verdictBefore: r.review.verdictBefore, verdictAfter: r.review.verdictAfter, issues: r.review.issues, tests: r.review.tests, qa: r.review.qa, notes: r.review.notes } : null,
})
