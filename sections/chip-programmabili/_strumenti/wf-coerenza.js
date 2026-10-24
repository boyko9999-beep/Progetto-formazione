export const meta = {
  name: 'sezione5-coerenza',
  description: 'Revisione trasversale della sezione 5: fatti coerenti tra i capitoli, ripetizioni, stile e quiz',
  phases: [
    { title: 'Coerenza', detail: 'un revisore legge tutti gli 8 capitoli e allinea fatti, rimandi, stile e quiz' },
  ],
}

const SP = '/tmp/claude-0/-home-user-Progetto-formazione/ecd2140e-c403-5be0-bb62-1b31096a06a5/scratchpad'
const SEC = '/home/user/Progetto-formazione/sections/chip-programmabili'
const ORDER = 'idea, memorie, intel-4004, ciclo, otto-bit, microcontrollori, logica-programmabile, sedici-bit'

const PROMPT = `Sei il revisore finale della Sezione 5 "Primi chip programmabili" di un'enciclopedia interattiva in italiano (repo /home/user/Progetto-formazione, app statica senza build). Gli 8 capitoli sono stati scritti in parallelo da 8 autori diversi; ognuno ha già verificato i propri fatti e il proprio laboratorio nel browser. Il tuo lavoro è trasversale: far sembrare la sezione scritta da una sola mano, esatta e coerente.

LEGGI: ${SEC}/README.md; i frammenti ${SEC}/_parti/<id>.html nell'ordine ${ORDER}; i quiz ${SEC}/_parti/<id>.quiz.json; nei laboratori ${SEC}/js/<id>.js solo le stringhe che citano fatti storici (date, numeri, nomi, prezzi: schede, didascalie, spiegazioni).

1. FATTI COERENTI. Costruisci una tabella di ogni fatto che compare in più di un punto (chip, anno e mese, transistor, clock, piedini, larghezza in bit, memoria indirizzabile, prezzo, persone e ruoli, aziende, eventi). Dove due punti non concordano, stabilisci il valore con WebSearch (caricalo con ToolSearch) su fonti affidabili (Computer History Museum, ETHW, IEEE Spectrum, datasheet e manuali su bitsavers.org, siti dei produttori, Ken Shirriff su righto.com; Wikipedia solo come appoggio; WebFetch e curl potrebbero essere bloccati dal proxy) e allinea tutti i punti. Se le fonti stesse non concordano, usa ovunque la stessa formula (per esempio "circa 6.000, secondo altre fonti 4.500"). Controlla in particolare: 4004 (transistor, clock, data dell'annuncio, istruzioni, piedini), Busicom e i chip richiesti, l'ingresso di Faggin in Intel, 8008, 8080, 6800, 6502 (prezzo e fiera), Z80, 8048 e 8051, TMS1000, 1702 ed EPROM, PAL e XC2064, 8086, 8088, 68000, ARM1.
2. RIPETIZIONI E CONFINI. Lo stesso argomento non va spiegato per intero in due capitoli: la storia di Busicom e l'intuizione di Hoff stanno in #idea; il 4004 come chip in #intel-4004; il ciclo prendi-decodifica-esegui in #ciclo; i chip a 8 bit in #otto-bit; l'8051 e i microcontrollori in #microcontrollori; 8086, 68000 e ARM in #sedici-bit. Dove un capitolo ripete troppo, accorcia a una o due frasi e aggiungi un rimando <a href="#id">. Controlla anche che le frasi di passaggio tra un capitolo e l'altro (.cp-next, rimandi nel testo) siano coerenti con l'ordine dei capitoli.
3. STILE. Italiano corretto e scorrevole, stessa voce in tutti i capitoli: frasi brevi, termini tecnici spiegati la prima volta che compaiono nella sezione (non serve rispiegarli in ogni capitolo: basta un rimando), istruzioni al "tu", numeri all'italiana (2.300; 0,74 MHz; 15 novembre 1971), niente lineette lunghe come inciso, niente anglicismi inutili. Correggi refusi, ripetizioni di parole, frasi troppo lunghe. Non stravolgere i testi che funzionano: interventi mirati.
4. QUIZ. 40 domande (5 per capitolo): niente doppioni tra capitoli, risposta giusta (sempre la prima, answer 0) coerente con il testo del capitolo, opzioni sbagliate plausibili e di lunghezza simile, spiegazione ("why") corretta, livelli 1/2/3 distribuiti (almeno una domanda di livello 1 e una di livello 3 per capitolo se possibile).

FILE CHE PUOI MODIFICARE: ${SEC}/_parti/*.html, ${SEC}/_parti/*.quiz.json e, in ${SEC}/js/<id>.js, solo stringhe di testo (mai la logica). Dopo ogni modifica a un file js esegui node --check sul file; alla fine esegui node --test ${SEC}/test/ e node ${SP}/tools/check-parti.js (controlli meccanici dei frammenti: deve finire con "nessun problema"). Non toccare index.html, core.js, base.css, i file css, i test, né file fuori da sections/chip-programmabili. Non fare commit né push. Non avviare server.

Rispondi con il riepilogo strutturato: incoerenze trovate e valore scelto con la fonte, ripetizioni accorciate, correzioni di stile più importanti, modifiche ai quiz, dubbi rimasti.`

const SCHEMA = {
  type: 'object',
  properties: {
    incoerenze: { type: 'array', items: { type: 'object', properties: { fatto: { type: 'string' }, prima: { type: 'string' }, scelto: { type: 'string' }, fonte: { type: 'string' }, capitoli: { type: 'array', items: { type: 'string' } } }, required: ['fatto', 'scelto', 'fonte'] } },
    ripetizioni: { type: 'array', items: { type: 'string' } },
    stile: { type: 'array', items: { type: 'string' } },
    quiz: { type: 'array', items: { type: 'string' } },
    dubbi: { type: 'array', items: { type: 'string' } },
    verifiche: { type: 'array', items: { type: 'string' } },
  },
  required: ['incoerenze', 'ripetizioni', 'stile', 'quiz', 'dubbi', 'verifiche'],
}

phase('Coerenza')
const r = await agent(PROMPT, { label: 'coerenza:sezione-5', phase: 'Coerenza', schema: SCHEMA })
return r
