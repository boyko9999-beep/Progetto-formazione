export const meta = {
  name: 'programmazione-seconda-tornata',
  description: 'Completa e verifica capitoli, laboratori e figure della sezione Storia della programmazione',
  whenToUse: 'Seconda tornata della sezione 7: costruisce le parti mancanti e fa verificare tutto da revisori indipendenti',
  phases: [
    { title: 'Costruzione', detail: 'capitoli, laboratori e figure mancanti o incompleti' },
    { title: 'Verifica', detail: 'controllo avversariale dei fatti, prova dei laboratori e correzioni' },
  ],
}

const SEC = '/home/user/Progetto-formazione/sections/programmazione'
const SCRATCH = '/tmp/claude-0/-home-user-Progetto-formazione/d1b42bc3-39ef-5883-b866-91652689087a/scratchpad'
const SPEC = (x) => SCRATCH + '/gen/specifiche/' + x + '.md'

const NUM = { telai: '01', logica: '02', cavi: '03', assembly: '04', fortran: '05', schede: '06', strutturata: '07', unix: '08', personal: '09', oggetti: '10', web: '11', ovunque: '12', ia: '13', atlante: '14' }
const CAP_FILE = (c) => 'js/capitoli/' + NUM[c] + '-' + c + '.js'
const LAB_CAP = { jacquard: 'telai', turing: 'logica', 'programma-memorizzato': 'cavi', assemblatore: 'assembly', compilatore: 'fortran', 'scheda-perforata': 'schede', spaghetti: 'strutturata', pipe: 'unix', basic: 'personal', oggetti: 'oggetti', 'pagina-web': 'web', git: 'ovunque', percettrone: 'ia', 'prossimo-token': 'ia', atlante: 'atlante', scala: 'inizio' }
const LAB_SPEC = (l) => (l === 'prossimo-token' || l === 'scala') ? SPEC(l) : SPEC(LAB_CAP[l])

const GLOSSARIO = [
  'telai: scheda perforata, telaio Jacquard, algoritmo, programma, macchina analitica, macchina differenziale, tabulatrice',
  'logica: algebra di Boole, bit, macchina di Turing, macchina universale, problema della fermata, tesi di Church-Turing, relè, lambda calcolo, Turing-completo, linguaggio di programmazione',
  'cavi: programma memorizzato, architettura di von Neumann, memoria, registro, accumulatore, contatore di programma, ciclo di istruzione, valvola termoionica, tubo di Williams, bug',
  'assembly: codice macchina, linguaggio assembly, assemblatore, codice operativo, mnemonico, etichetta, subroutine, libreria, compilatore, interprete',
  'fortran: linguaggio ad alto livello, analisi lessicale, token, parser, albero sintattico, BNF, ricorsione, garbage collection, variabile, precedenza degli operatori',
  'schede: perforatrice, elaborazione a lotti, sistema operativo, job, time-sharing, terminale, compatibilità, byte, software',
  'strutturata: crisi del software, ingegneria del software, programmazione strutturata, GOTO, codice spaghetti, diagramma di flusso, ciclo, teorema di Böhm-Jacopini, modulo, memoria a fili intrecciati',
  'unix: kernel, shell, pipe, processo, file, portabilità, linguaggio C, puntatore, database relazionale, SQL, programmazione dichiarativa, programmazione logica',
  'personal: microprocessore, BASIC, home computer, foglio di calcolo, killer application, IDE, software libero, GPL, listato',
  'oggetti: programmazione a oggetti, classe, oggetto, metodo, ereditarietà, incapsulamento, polimorfismo, interfaccia grafica, evento, design pattern',
  'web: World Wide Web, ipertesto, HTML, HTTP, URL, browser, server, DOM, open source, macchina virtuale, bytecode, linguaggio di scripting, millennium bug',
  'ovunque: sviluppo agile, controllo di versione, commit, branch, merge, repository, app, cloud, container, API, integrazione continua, sicurezza della memoria',
  'ia: intelligenza artificiale, neurone artificiale, percettrone, rete neurale, apprendimento automatico, addestramento, peso, deep learning, GPU, Transformer, modello linguistico, token di un modello linguistico, prompt, allucinazione, agente',
  'atlante: paradigma di programmazione, programmazione imperativa, programmazione funzionale, tipizzazione',
].join('\n')

// Termini già usati da altri capitoli e ancora senza definizione (il proprietario deve definirli).
const MANCANTI = {
  cavi: 'memoria, programma memorizzato, accumulatore, ciclo di istruzione, bug',
  logica: 'bit, relè, algebra di Boole, macchina di Turing',
  fortran: 'ricorsione, variabile, garbage collection, token',
  schede: 'sistema operativo',
  web: 'ipertesto, server, open source',
  unix: 'linguaggio C, puntatore',
}

const LIMITE_RICERCHE = { capitolo: 35, 'verifica-capitolo': 22, lab: 8, 'verifica-lab': 6, 'rivedi-lab': 6, figure: 6, rivedi: 22 }

function intro(task, files) {
  const limite = LIMITE_RICERCHE[task.split(':')[0]] || 8
  return `You are one of several agents completing, in parallel and in the SAME working tree, the section «Storia della programmazione» (section 7 of 8) of an Italian interactive encyclopedia for Martina's training project («Enciclopedia BusLab»: from electronics to today, with text, images and premium animations; every word of the UI is in Italian).

Repository: /home/user/Progetto-formazione (static site, no build step, vanilla JS; index.html must work from file://). Section folder (SEC): ${SEC}. The contract is ${SEC}/README.md.

YOUR FILES (the only ones you may edit or create, plus scratch files under ${SCRATCH}/qa/${task.replace(/[^a-z0-9-]+/gi, '_')}/): ${files.map((f) => SEC + '/' + f).join(', ')}

LATER ROUND. Earlier rounds were interrupted by a usage limit, so files may already contain partial or finished work. Read your files first: keep what is good, complete what is missing, fix what is wrong; never throw away good work. If your part is already complete, verify it and finish quickly.
SAVE OFTEN: write to your files early and improve them in place, so that another interruption loses little.
BUDGET: the whole project shares one usage allowance, so be efficient: do not re-read big files, at most about 10 screenshots (look at each one), no long detours. WEB: WebSearch calls are limited and shared by all agents running now: use at most ${limite} searches, one precise claim per search, riskiest claims first. WebFetch and curl did not work in this environment (DNS errors, proxy 403): try WebFetch at most once; if it fails, rely on the WebSearch result snippets.
RULES: never edit core.js, the CSS files, index.html, section.js, README.md, js/schermi.js, js/lib/*, or files of other agents (they are working right now). If you need something from the core, work around it in your files and write the request in your report. No git commands that change anything (no add, commit, checkout, stash, reset, clean, restore). No packages, no external libraries, fonts or CDNs.
`
}

const SCRITTURA = `
WRITING (Italian):
- Audience: curious adults and students in a technical training context, no programming background assumed. Voice: clear, warm, precise and concrete, like a very good museum guide; short paragraphs; no hype; real names, dates, numbers and anecdotes. Explain jargon through glossary terms ({{termine}} or {{termine|testo visibile}}).
- Correct Italian typography: accents (perché, più, è), apostrophes, «caporali» for quotations, en dash for ranges (1947–1956), Italian number format (18.000; 3,5). Prefer commas and colons to long dashes.
- Accuracy is non-negotiable: verify every date, number, name and quote with WebSearch (mode "standard"; WebFetch to read a page when needed). Never invent quotes: only quotes found in a reliable source, translated into Italian, with author and source. Where sources disagree, or a famous story is a myth, say so briefly. fonti lists the sources actually used (books, papers, museum and university pages, official documentation; Wikipedia only as a starting point), with URLs.
- Tie the story to electronics and hardware at least once (the thread of the encyclopedia is «from electronics to today») and to neighbouring chapters with [testo](#id). Other sections of the encyclopedia (link to their index.html): ../elettronica-base/, ../elettronica-intermedia/, ../elettronica-avanzata/, ../porte-logiche/, ../chip-programmabili/, ../storia-pc/.
- GLOSSARY OWNERSHIP: a chapter defines only the terms it owns (plus at most 1–3 specific terms owned by nobody); it may use any term of the master list with {{termine}}. Master list (chapter: terms):
${GLOSSARIO}
`

const INTERFACCIA = `
LABS AND FIGURES (premium quality):
- Lab API exactly as in README «Laboratorio»: an IIFE that exports its pure logic with module.exports and registers with ProgStoria.lab(id, { titolo, css, monta }) only if root.ProgStoria exists; no DOM access at load time; CSS classes start with lab-<id>-, figure classes with fig-<id>-.
- Motion must explain: guide attention, show a change of state, keep spatial continuity. Animate transform and opacity (or small SVG attributes). Use ctx.attendi, ctx.anima and ctx.ciclo so everything pauses offscreen; durations from ctx.DURATA, curves from ctx.EASING. With reduced motion (ctx.riduci) skip the movement and update states instantly; everything stays usable step by step.
- The lab lives in a dark instrument panel (--lab-*, --trace-*). Clear hierarchy, the same colour for the same concept everywhere, Italian labels, text at least 13 px, touch targets at least 40 px, visible focus, fully keyboard operable, narration through ctx.annuncia or an aria-live .pg-spiega, sensible empty and error states (invalid input explains how to fix it).
- Responsive from 320 px to 1300 px: never horizontal scrolling of the page; wide content scrolls inside its own container.
- Performance: no work while idle, no unbounded loops, time-slice heavy work, nothing running offscreen.
- Figures: 800×500 technical line illustrations as in README «Figura»: palette --fig-* and --cap so the dark theme works; no logos or trademarks; people only as silhouettes or stylised figures without realistic faces; subtle CSS animations that stop with reduced motion.
`

const STRUMENTI = `
TOOLS:
- Tests: node --test ${SEC}/test/<file>.test.js (Node 22: pass files, not a directory). dati.test.js checks every chapter's data: failures in other agents' chapters are not yours, and «figura non registrata» for a figure that another agent is still drawing is expected. schermi.test.js checks each chapter's «ciao» data against its era screen.
- Browser: node ${SCRATCH}/qa/scatta.js (read its header for the options): --hash <id> --sel '<css>' --larg 390 --alt 844 --scuro --ridotto --clic '<css>' (repeatable) --eval '<js>' --url <page> --out <png>. Labs: --sel '[data-lab="<lab-id>"]'; figures used by a chapter: --sel '[data-fig="<figure-id>"]'; a figure that no chapter uses yet: --url 'file://${SEC}/_prova-figure.html?file=<chapter-id>' --sel '[data-fig="<figure-id>"]'. The JSON must show no errori, no risorseMancanti and overflowOrizzontale false (the 404 of enciclopedia.js is expected and listed under «attesi»). Look at every screenshot with the Read tool.
`

const REPORT_BUILD = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    riepilogo: { type: 'string' },
    fatti: { type: 'array', items: { type: 'object', properties: { affermazione: { type: 'string' }, fonte: { type: 'string' } }, required: ['affermazione'] } },
    verifiche: { type: 'string' },
    limiti: { type: 'string' },
    richiesteIntegratore: { type: 'string' },
  },
  required: ['files', 'riepilogo', 'fatti', 'verifiche'],
}

const REPORT_VERIFICA = {
  type: 'object',
  properties: {
    esito: { type: 'string', enum: ['pronto', 'pronto-con-riserve', 'non-pronto'] },
    correzioni: { type: 'array', items: { type: 'string' } },
    fattiControllati: { type: 'integer' },
    erroriFattuali: { type: 'array', items: { type: 'string' } },
    problemiAperti: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
    richiesteIntegratore: { type: 'string' },
  },
  required: ['esito', 'correzioni', 'problemiAperti'],
}

const NOTE_LAB = {
  'programma-memorizzato': `The first round wrote most of this file: the pure logic (object Logica), the css string, monta() and mode A (ENIAC, function creaEniac), never QA-tested. Mode B (von Neumann) is a temporary placeholder at the end of the file (function creaVonNeumann, marked SEGNAPOSTO): write the complete mode B in its place as the spec describes, using the toy CPU (${SEC}/js/lib/cpu-giocattolo.js: read its header and API) and the helpers already in Logica (racconta, fasiIstruzione, ruoliCelle, attivaBit, percorsoBus, puntoSuPercorso, durataVolo, pausaFasi, formattaSecondi). The css string probably already styles the mode B classes (search it for -vn, -mem, -bus, -cpu): reuse them and add what is missing. monta() calls creaVonNeumann(ctx, { esclusivo }) and expects { el, misura, mostra, nascondi }; el starts hidden. Then QA mode A as well, and write test/programma-memorizzato.test.js for the pure helpers (the CPU itself is already tested in test/librerie.test.js). The chapter text (js/capitoli/03-cavi.js) is being written right now by another agent: do not touch it.`,
  assemblatore: `The first round left a draft of the pure logic (about 300 lines: the two-pass plan, error hints, line-to-cell map, the «Traduci a mano» challenge) in ${SCRATCH}/qa/assembly/parte-a.js: review it and reuse what is good in js/lab/assemblatore.js (now a stub). The chapter text ${SEC}/js/capitoli/04-assembly.js is finished: keep the lab consistent with it (read the paragraphs around the lab block). Use the toy CPU and its assembler (${SEC}/js/lib/cpu-giocattolo.js).`,
  turing: 'The chapter text (js/capitoli/02-logica.js) is being written right now by another agent: do not touch it. The chapter\'s «Ciao, mondo» uses a separate era screen, not your lab.',
  compilatore: 'The chapter text (js/capitoli/05-fortran.js) is being written right now by another agent: do not touch it.',
  pipe: 'The chapter text (js/capitoli/08-unix.js) is being written right now by another agent: do not touch it.',
  'pagina-web': 'The chapter text (js/capitoli/11-web.js) is being written right now by another agent: do not touch it. Never inject the reader\'s HTML into the page itself: render it in a sandboxed iframe (srcdoc with a sandbox attribute that does not allow scripts) or through your own safe renderer.',
}

const RIVEDI = {
  telai: { files: [CAP_FILE('telai'), 'js/lab/jacquard.js', 'test/jacquard.test.js'], labs: ['jacquard'], nota: 'The figures of this chapter (js/figure/telai.js) are being drawn right now by another agent: keep the figure ids telaio-jacquard and macchina-analitica. test/jacquard.test.js is optional: write a short one if the lab exports pure logic worth testing.' },
  assembly: { files: [CAP_FILE('assembly')], labs: [], nota: 'Chapter only: the lab assemblatore and the figures of this chapter are being built right now by other agents (keep the ids assemblatore and nastro-edsac).' },
  strutturata: { files: [CAP_FILE('strutturata'), 'js/lab/spaghetti.js', 'js/figure/strutturata.js', 'test/spaghetti.test.js'], labs: ['spaghetti'], nota: 'Known problem: in the figure memoria-a-fili the label «parola letta» is clipped at the top right.' },
  oggetti: { files: [CAP_FILE('oggetti'), 'js/lab/oggetti.js', 'js/figure/oggetti.js', 'test/oggetti.test.js'], labs: ['oggetti'], nota: '' },
  ovunque: { files: [CAP_FILE('ovunque'), 'js/lab/git.js', 'test/git.test.js'], labs: ['git'], nota: 'The spec requires test/git.test.js, which is missing: write it for the lab\'s exported pure logic. The figures of this chapter (js/figure/ovunque.js) are being drawn right now by another agent: keep the ids smartphone-app and cloud.' },
  ia: { files: [CAP_FILE('ia'), 'js/lab/percettrone.js', 'js/figure/ia.js', 'test/percettrone.test.js'], labs: ['percettrone'], nota: 'The chapter writes {{token}}, which opens the glossary entry of the lexical token of chapter 5 (FORTRAN): where a language-model token is meant, write {{token di un modello linguistico|token}}. The other lab of this chapter, prossimo-token, is reviewed by another agent: do not touch it. Be neutral and precise, not promotional.' },
}

const RIVEDI_LAB = {
  jacquard: { files: ['test/jacquard.test.js'], nota: 'Chapter 1 (telai): its text is reviewed by another agent, do not touch js/capitoli/01-telai.js. test/jacquard.test.js is optional: write a short one if the lab exports pure logic worth testing.' },
  spaghetti: { files: ['js/figure/strutturata.js'], nota: 'Chapter 7 (strutturata): its text is reviewed by another agent, do not touch js/capitoli/07-strutturata.js. Also review the chapter\'s figures in js/figure/strutturata.js (known problem: in memoria-a-fili the label «parola letta» is clipped at the top right; a previous reviewer may have started fixing it).' },
  oggetti: { files: ['js/figure/oggetti.js'], nota: 'Chapter 10 (oggetti): its text is reviewed by another agent, do not touch js/capitoli/10-oggetti.js. Also review the chapter\'s figures in js/figure/oggetti.js.' },
  git: { files: [], nota: 'Chapter 12 (ovunque): its text is reviewed by another agent, do not touch js/capitoli/12-ovunque.js. The spec requires test/git.test.js, which is missing: write it for the lab\'s exported pure logic.' },
  percettrone: { files: ['js/figure/ia.js'], nota: 'Chapter 13 (ia): its text is reviewed by another agent, do not touch js/capitoli/13-ia.js. Also review the chapter\'s figures in js/figure/ia.js. Be neutral and precise about AI, not promotional.' },
  'scheda-perforata': { files: [], nota: 'Chapter 6 (schede): its text is reviewed by another agent, do not touch js/capitoli/06-schede.js. The spec requires test/scheda-perforata.test.js for the lab\'s own helpers (the Hollerith codes are already tested in test/librerie.test.js).' },
  basic: { files: [], nota: 'Chapter 9 (personal): its text is reviewed by another agent, do not touch js/capitoli/09-personal.js. The spec requires test/basic.test.js: the interpreter is the heart of this lab, so test PRINT, LET, GOTO, IF, FOR/NEXT, INPUT if present, errors and the step limit.' },
  'prossimo-token': { files: [], nota: 'This lab belongs to chapter 13 (ia), whose text is reviewed by another agent: do not touch js/capitoli/13-ia.js. Be neutral and precise about language models, not promotional.' },
  atlante: { files: [], nota: 'Chapter 14 (atlante): its text and the facts of the lab data (years, authors, influences) are checked by another agent; you focus on the interaction, accessibility and visual quality. test/atlante.test.js exists: keep it passing.' },
  scala: { files: [], nota: 'This is the hero lab of the page opening (#inizio): use --hash inizio --sel \'[data-lab="scala"]\'.' },
}

const QA_LAB = (l) => `browser QA with scatta.js (--hash ${LAB_CAP[l]} --sel '[data-lab="${l}"]') at 1440×900 light, 390×844 light, 1440 dark, reduced motion and 320 wide. Click through every control (--clic, --eval), including edge cases: empty or invalid input, rapid repeated clicks, reset or mode change during an animation. Check keyboard access (Tab order, Enter and Space on custom controls, visible focus), aria labels and narration, no console errors, no page-level horizontal overflow, pause when scrolled away and resume, text at least 13 px, targets at least 40 px, and the visual polish against README «Direzione visiva». Look at every screenshot and fix what looks wrong (overlaps, clipped text, poor contrast, misalignment, cramped spacing, tiny text).`

const FATTI_CAPITOLO = (c) => `list every factual claim (dates, numbers, names, attributions, quotes, «il primo…» claims) in the text, protagonisti, tappe, glossary and ciao of chapter «${c}». Check at least the 20 riskiest with WebSearch/WebFetch as if each might be wrong; quotes must be found in a reliable source (an Italian translation of a verified quote is fine). Fix errors in place; soften or remove what you cannot verify. Check with WebSearch that 3–4 of the fonti exist and support what the chapter says (search their titles); replace broken or irrelevant ones. Then the Italian: grammar, typos, accents, punctuation (caporali, en dash for ranges, Italian number format), consistent terminology, the warm and precise voice; cut hype and filler. Run dati.test.js and schermi.test.js (this chapter's subtests must pass, apart from figures not yet registered); check that every owned glossary term is defined and that links point to existing anchors.`

function prompt(task, prev) {
  const [tipo, arg] = task.split(':')
  const fileRapporto = (t) => SCRATCH + '/qa/rapporti/' + t.replace(':', '_').replace(/,/g, '-') + '.json'
  const rapporto = prev ? JSON.stringify(prev, null, 2) : '(not attached: if the file ' + fileRapporto(task.replace(/^verifica-capitolo/, 'capitolo').replace(/^verifica-lab/, 'lab')) + ' exists, read it: it is the builder\'s report, with the facts it checked and its limits. Chapters and labs of the first round have no report.)'

  if (tipo === 'capitolo' && arg === 'atlante') {
    const files = [CAP_FILE('atlante'), 'js/lab/atlante.js', 'test/atlante.test.js']
    return intro(task, files) + SCRITTURA + INTERFACCIA + STRUMENTI + `
YOUR TASK, item «atlante» (spec ${SPEC('atlante')}):
1. Write chapter 14, file ${SEC}/${CAP_FILE('atlante')} (now a stub), as the spec says: short text (450–700 words), blocks testo, lab atlante (with largo: true), tabella of the paradigms, testo, sapevi; glossary terms paradigma di programmazione, programmazione imperativa, programmazione funzionale, tipizzazione; fonti. Keep the fields of the spec's «Keep» line; no epoca and no ciao. Read README «Capitolo» and, as a model of tone and data format, skim ${SEC}/${CAP_FILE('strutturata')}.
2. The lab js/lab/atlante.js was built in the first round (about 100 KB, never fully checked): write test/atlante.test.js with the tests listed in the spec (unique ids, every influence exists, influencer year not later than the language year, no cycles, valid chapter ids, hello world present), fix the lab data where a test reveals an error, then take a quick look at the lab in the browser (1440 and 390 wide: open a language, try the list view and a paradigm filter) and fix obvious problems. A separate reviewer will check facts and polish afterwards.
Final answer: the structured report (files, summary, key facts with the source you checked, what you verified, limits, requests for the integrator).`
  }

  if (tipo === 'capitolo') {
    const c = arg
    return intro(task, [CAP_FILE(c)]) + SCRITTURA + STRUMENTI + `
YOUR TASK: write chapter «${c}», file ${SEC}/${CAP_FILE(c)} (now a stub), following its spec ${SPEC(c)}: the «Keep» line (id, numero, anni, titolo, sottotitolo, epoca must stay exactly as written there), «Content to cover», «Suggested flow», ciao, protagonisti and glossary terms. Only the chapter file: this chapter's lab and figures are being built by other agents right now. Reference them with the ids given in the spec ({ tipo: 'lab', id: '…' } and { tipo: 'figura', id: '…', didascalia: '…' }; the figure ids must match the spec exactly) and do not open or edit their files.
Read first: README sections «Capitolo» and «Campi di ciao per ogni schermo»; the spec; one finished chapter as a model of tone, depth and data format: ${SEC}/${CAP_FILE('strutturata')} (read it once, entirely). Skim the intro of the previous and next chapters if they are written, to avoid repeating what they already tell at length. You do not need core.js or the CSS.
Size: 1.300–2.000 words of prose across the text blocks, plus the blocks of the suggested flow, a verified quote, a «Lo sapevi?», 5–8 protagonisti, 8–14 tappe, the glossary terms you own, 5–10 fonti and the ciao block.
Glossary: define EVERY term your chapter owns in the master list, because other chapters already link to them${MANCANTI[c] ? ' (already used elsewhere and still undefined: ' + MANCANTI[c] + ')' : ''}. Do not define terms owned by others.
Work order: research the risky facts first (dates, numbers, quotes), write the whole file, run the tests, then polish.
Verify: node --test ${SEC}/test/dati.test.js (your chapter's subtest passes, apart from figures not yet registered) and node --test ${SEC}/test/schermi.test.js (your ciao data); then two whole-chapter screenshots (--hash ${c} --sel '#${c}' at 1440 wide and at 390×844) to check that tables, code blocks and the ciao screen render well. Re-read your Italian once.
Final answer: the structured report (files, summary, key facts each with the source you checked, what you verified, limits, requests for the integrator).`
  }

  if (tipo === 'verifica-capitolo') {
    const c = arg
    const files = c === 'atlante' ? [CAP_FILE(c), 'js/lab/atlante.js', 'test/atlante.test.js'] : [CAP_FILE(c)]
    const extra = c === 'atlante'
      ? '\nAlso check the lab data of js/lab/atlante.js: the first-appearance year and the authors of at least 25 of the riskiest languages, a sample of the influence links, and the correctness of a sample of the hello worlds (syntax of that language). Fix the data and keep test/atlante.test.js passing.'
      : ''
    return intro(task, files) + SCRITTURA + STRUMENTI + `
YOUR TASK: you are the independent, skeptical fact-checker and editor of chapter «${c}» (${SEC}/${CAP_FILE(c)}), written by another agent (report below). Assume there are errors until you have checked: some facts may have been written from memory, without any online check, because the search allowance ran out in earlier rounds. Its spec is ${SPEC(c)}. Where the chapter's lab block or text describes the lab (button names, examples, programs), check that the lab really has them by reading the lab file (read only, do not edit it).
Steps: ${FATTI_CAPITOLO(c)} Also check coherence with the neighbouring chapters (skim their intro and last paragraph) and take one screenshot of the chapter at 390×844 to check that it renders well.${extra}
Builder report:
${rapporto}
Final answer: the structured verification report (esito, corrections, number of facts checked, factual errors found and fixed, open problems, notes for the integrator).`
  }

  if (tipo === 'lab') {
    const l = arg
    return intro(task, ['js/lab/' + l + '.js', 'test/' + l + '.test.js']) + INTERFACCIA + STRUMENTI + `
YOUR TASK: build lab «${l}» (file ${SEC}/js/lab/${l}.js and its test ${SEC}/test/${l}.test.js) as described in the «Lab» section of ${LAB_SPEC(l)}, then make it excellent: a reader should understand the idea by playing with it and remember the animation.
Read first: README sections «Direzione visiva» and «Laboratorio»; ${SEC}/js/core.js (ctx helpers and the lab lifecycle); ${SEC}/css/programmazione.css (shared classes such as .pg-strumenti, .pg-btn, .pg-btn--primario, .pg-gruppo, .pg-campo, .pg-etichetta, .pg-cursore, .pg-lettura, .pg-pannello, .pg-spiega, .pg-flash, and the --lab-* and --trace-* tokens); the spec. As a reference for structure and quality, skim one finished lab: ${SEC}/js/lab/spaghetti.js.
${NOTE_LAB[l] || ''}
Historical or technical facts shown in the lab (dates, names, numbers) must be verified with WebSearch.
Work order: pure logic and tests first (saved), then the interface, then polish and QA.
Verify: node --test ${SEC}/test/${l}.test.js and node --test ${SEC}/test/dati.test.js (no load errors); ${QA_LAB(l)}
Final answer: the structured report (files, summary, key facts with sources, what you verified and how, limits, requests for the integrator).`
  }

  if (tipo === 'verifica-lab') {
    const l = arg
    return intro(task, ['js/lab/' + l + '.js', 'test/' + l + '.test.js']) + INTERFACCIA + STRUMENTI + `
YOUR TASK: you are the independent, skeptical reviewer of lab «${l}» (${SEC}/js/lab/${l}.js, test ${SEC}/test/${l}.test.js), built by another agent (report below). Find and FIX problems.
1. Run its tests and dati.test.js.
2. ${QA_LAB(l)}
3. Facts in the lab's texts (dates, numbers, historical claims) and the technical correctness of what it simulates: check the riskiest with WebSearch.
4. Make sure every requirement of the «Lab» section of ${LAB_SPEC(l)} is met.
Builder report:
${rapporto}
Final answer: the structured verification report.`
  }

  if (tipo === 'figure') {
    const caps = arg.split(',')
    const files = caps.map((c) => 'js/figure/' + c + '.js')
    return intro(task, files) + INTERFACCIA + STRUMENTI + `
YOUR TASK: draw the figures of chapters ${caps.join(', ')}. For each chapter, the figures listed in the «Figures» section of its spec (${caps.map(SPEC).join(', ')}) go in ${SEC}/js/figure/<chapter>.js (now stubs). Use the figure ids exactly as in the spec; if the chapter file already references a figure (block { tipo: 'figura', id }), that id wins.
Read first: README sections «Direzione visiva» and «Figura»; one finished figure file as a model of format and quality: ${SEC}/js/figure/oggetti.js (read it once). For each figure, read the chapter text around it if the chapter is already written, so that drawing and caption agree (the chapters logica, cavi, fortran, schede, unix, personal and web are being written right now by other agents: for those, rely on the spec).
Quality bar: precise, readable technical line illustrations, labelled in Italian with leader lines where useful; historically plausible shapes and proportions (check what the real object looked like with a quick web search, e.g. the front panel layout of an Altair 8800 or the console of an IBM 704); colours only from the --fig-* palette and --cap, so that the dark theme works; no logos or trademarks; people only as silhouettes. One subtle, meaningful CSS animation per figure (lights, cards advancing, a signal travelling), stopped with reduced motion. Text in the SVG at least 14 px at 800 px width and never clipped: the figure shrinks to about 360 px on phones, so keep labels few and large.
Verify: node --test ${SEC}/test/dati.test.js (no load errors, your figures registered); for each figure, screenshots in light, dark and 390 wide with the preview page (--url 'file://${SEC}/_prova-figure.html?file=<chapter>' --sel '[data-fig="<id>"]') or with the chapter page if the chapter already uses it; look at each one and fix what is off.
Final answer: the structured report (files, summary, facts about the depicted objects with the source you checked, what you verified, limits, requests for the integrator).`
  }

  if (tipo === 'rivedi') {
    const c = arg
    const r = RIVEDI[c]
    return intro(task, r.files) + SCRITTURA + INTERFACCIA + STRUMENTI + `
YOUR TASK: final review of chapter «${c}»${r.labs.length ? ' and its lab ' + r.labs.join(', ') : ''}, built in the first round (the builder was interrupted, so its own checks may be incomplete). Spec: ${SPEC(c)}. Find and FIX problems.
A. Chapter, as a skeptical fact-checker and editor: ${FATTI_CAPITOLO(c)}
${r.labs.length ? 'B. Lab ' + r.labs.join(', ') + ': run its tests; ' + r.labs.map(QA_LAB).join(' ') + ' Check the facts shown in the lab texts too, and that the spec\'s lab requirements are met.' : ''}
${r.files.some((f) => f.startsWith('js/figure/')) ? 'C. Figures: check each one in light, dark and 390 wide; fix clipped labels, contrast problems and anything that is historically wrong.' : ''}
${r.nota}
Final answer: the structured verification report.`
  }

  if (tipo === 'rivedi-lab') {
    const l = arg
    const rl = RIVEDI_LAB[l] || { files: [], nota: '' }
    return intro(task, ['js/lab/' + l + '.js', 'test/' + l + '.test.js'].concat(rl.files.filter((f) => !f.startsWith('test/')))) + INTERFACCIA + STRUMENTI + `
YOUR TASK: final review of the finished lab «${l}» (${SEC}/js/lab/${l}.js), built in the first round (the builder was interrupted, so its own checks may be incomplete). Spec: ${LAB_SPEC(l)}. Find and FIX problems.
${rl.nota}${rl.files.some((f) => f.startsWith('js/figure/')) ? ' Check each figure in light, dark and 390 wide; fix clipped labels, contrast problems and anything historically wrong.' : ''}
1. If test/${l}.test.js is missing or thin, write it for the lab's exported pure logic; run it and dati.test.js.
2. ${QA_LAB(l)}
3. Facts in the lab's texts (dates, numbers, historical claims) and the technical correctness of what it simulates: check the riskiest with WebSearch.
4. Make sure every requirement of the spec for this lab is met.
Final answer: the structured verification report.`
  }

  throw new Error('compito sconosciuto: ' + task)
}

const fase = (t) => (/^(verifica|rivedi)/.test(t) ? 'Verifica' : 'Costruzione')
const schema = (t) => (/^(verifica|rivedi)/.test(t) ? REPORT_VERIFICA : REPORT_BUILD)

const catene = Array.isArray(args) ? args : (args && args.catene) || []
log('Catene: ' + catene.map((c) => c.join(' → ')).join(' · '))

const risultati = await pipeline(catene,
  (cat) => agent(prompt(cat[0], null), { label: cat[0], phase: fase(cat[0]), schema: schema(cat[0]) }),
  (r, cat) => {
    if (!cat[1]) return { catena: cat, primo: r }
    if (!r) return { catena: cat, primo: null, errore: cat[0] + ' non è finito: verifica saltata' }
    return agent(prompt(cat[1], r), { label: cat[1], phase: fase(cat[1]), schema: schema(cat[1]) })
      .then((v) => ({ catena: cat, primo: r, secondo: v }))
  },
)

return risultati.map((r, i) => r || { catena: catene[i], errore: 'catena interrotta' })
