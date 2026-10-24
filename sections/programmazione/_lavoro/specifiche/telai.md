# Item: chapter 1 «telai» + lab «jacquard»

Your files: `js/capitoli/01-telai.js`, `js/lab/jacquard.js`, `js/figure/telai.js`, optional `test/jacquard.test.js`.
Keep: id 'telai', numero 1, anni '1725–1890', titolo 'Le schede che comandano', sottotitolo 'Telai, macchine analitiche e la prima programmatrice', epoca 'jacquard'.

## Content to cover (verify every date, number and quote)
- The precursors in Lyon: Basile Bouchon (1725, perforated paper roll for the draw loom), Jean-Baptiste Falcon (1728, chain of cards), Jacques de Vaucanson (1745, automatic loom).
- Joseph-Marie Jacquard: the loom (presented 1801, improved/patented around 1804), chained punched cards, one card per weft pick, needles and hooks; reactions of the silk weavers; how fast it spread; the famous portrait of Jacquard woven in silk (1839) from tens of thousands of cards, which Babbage owned. The key idea: the pattern is not in the machine, it is in the cards: change the cards, change the fabric.
- Charles Babbage: the Difference Engine (1822 proposal) and the Analytical Engine (designed from the 1830s): the "Mill" (processor) and the "Store" (memory), operation cards and variable cards borrowed from Jacquard, conditional branching and loops; never completed; the Science Museum built Difference Engine No. 2 in 1991 and it worked.
- Italian link: Babbage presented the Analytical Engine in Turin (1840); Luigi Federico Menabrea (later Prime Minister of Italy) wrote the 1842 paper in French that Ada Lovelace translated.
- Ada Lovelace: translation published 1843 with her Notes A–G, much longer than the paper; Note G and the method for Bernoulli numbers, often called the first published computer program (present the scholarly nuance honestly); her vision that the machine could manipulate symbols, not just numbers (music). Quote in Italian translation with source: «la macchina analitica tesse disegni algebrici proprio come il telaio Jacquard tesse fiori e foglie» (Note A; check the original wording "We may say most aptly that the Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves").
- Herman Hollerith: tabulating machine for the 1890 US census; cards read electrically (pins through the holes closing circuits in mercury cups: a direct bridge to electricity and to the rest of the encyclopedia); time saved compared with 1880; Tabulating Machine Company (1896) → CTR (1911) → IBM (1924). Forward link to [capitolo 6](#schede) for the 80-column card.
- Make at least one explicit connection to electronics (Hollerith's electrical reading) and one to the next chapter.

Suggested flow of `blocchi`: testo (Lione e i telai), figura telaio-jacquard, testo (come funziona: aghi, uncini, la scheda è il programma), lab jacquard, testo (Babbage), figura macchina-analitica, citazione (Lovelace), testo (Ada Lovelace e la Nota G; a small `tabella` is welcome, e.g. the first operations of the Note G table or "Babbage vs a modern computer": Store = memoria, Mill = processore, schede = programma), sapevi (Menabrea), testo (Hollerith), ciao.

`ciao`: { anno: 1804, linguaggio: 'Schede del telaio Jacquard', uscita: 'CIAO', nota: one sentence explaining that each row of fabric is one card }.
Protagonisti: Basile Bouchon, Joseph-Marie Jacquard, Charles Babbage, Ada Lovelace, Luigi Federico Menabrea, Herman Hollerith.
Tappe: 8–12 dated milestones.
Glossary terms you own: scheda perforata, telaio Jacquard, algoritmo, programma, macchina analitica, macchina differenziale, tabulatrice.

## Lab «jacquard» (title: «Il telaio Jacquard»)
- SVG scene in the dark panel lit like a museum vitrine: a chain of punched cards feeding into the loom head, a row of vertical warp threads, hooks above them, and the fabric growing below.
- A card has 16 hook positions (columns). Where the card has a hole, the needle passes, the hook lifts that warp thread, the shuttle passes under it and that cell of the fabric shows the warp colour (pattern pixel = 1); where there is no hole, the needle is blocked.
- Interaction: an editable "current card" grid (16 toggle buttons, real `<button>`s with `aria-pressed`) and presets for a whole deck: «CIAO» (pixel letters), «Rombo», «Scacchiera», «Onde». «Tessi una riga» advances one card with the full animation (card moves in, needles probe, hooks lift, shuttle crosses, new fabric row); «▶ Tessi tutto» weaves the whole deck; «↺ Nuovo tessuto».
- Show the mapping explicitly: highlight the card row being read and the fabric row being produced; a small counter "scheda 5 di 12".
- Explanation area (`.pg-spiega`) narrates each phase in plain Italian.
- `ctx.completa()` after a full pattern is woven.
- Reduced motion: skip in-between frames, update states immediately.

## Figures (`js/figure/telai.js`)
- `telaio-jacquard`: the loom seen from the side/front with the endless chain of cards on top (cards advance slowly; subtle animation).
- `macchina-analitica`: Babbage's Analytical Engine as an engineering drawing: Store (columns of number wheels), Mill, card readers for operation and variable cards; label the parts in Italian with leader lines.
