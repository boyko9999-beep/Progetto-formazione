# Item: chapter 6 «schede» + lab «scheda-perforata»

Your files: `js/capitoli/06-schede.js`, `js/lab/scheda-perforata.js`, `js/figure/schede.js`, `test/scheda-perforata.test.js` (for your own helpers; Hollerith codes are already tested).
Keep: id 'schede', numero 6, anni '1956–1975', titolo 'Schede, lotti e terminali', sottotitolo 'Le schede perforate, i sistemi operativi e il time-sharing', epoca 'scheda'.

## Content to cover (verify)
- The IBM 80-column card (1928, rectangular holes), 12 rows, Hollerith code; keypunches IBM 026 (1949) and 029 (1964); one line of program per card; decks; sequence numbers in columns 73–80 and the diagonal line drawn on the deck to recover from a dropped deck; card sorters; «Do not fold, spindle or mutilate».
- Batch processing: programmers handed decks to operators; queues; printouts hours later; one typo cost a day. Turnaround time.
- Early operating systems: GM-NAA I/O (1956, General Motors and North American Aviation, IBM 704), often called the first operating system; batch monitors; job control language.
- IBM System/360 (announced 7 April 1964): a family of compatible computers sharing software; the 8-bit byte; OS/360 and Fred Brooks; «The Mythical Man-Month» (1975) and Brooks's law (quote verified).
- Time-sharing: John McCarthy's 1959 memo; CTSS (Fernando Corbató, MIT, demonstrated 1961); interactive terminals such as the Teletype ASR-33 (1963).
- BASIC: John Kemeny and Thomas Kurtz, Dartmouth, 1 May 1964, the Dartmouth Time-Sharing System; designed for every student; note that Dartmouth BASIC was compiled.
- Multics (1965–1969) and its role as the parent of Unix (link [capitolo 8](#unix)).
- IBM's 1969 "unbundling": software sold separately from hardware, birth of the software industry. The first printed use of the word "software" is usually credited to John W. Tukey (1958): present with care.
- Italian links: Olivetti Elea 9003 (1959, Mario Tchou's team, transistorized); the Olivetti Programma 101 (1965, Pier Giorgio Perotto), a desktop programmable computer with programs on magnetic cards; check the often-told story of P101 units used for Apollo-era calculations and report it carefully.

Suggested flow: testo (one line, one card), lab scheda-perforata, testo (the deck, the operator, the wait), figura sala-macchine, citazione (verified), testo (operating systems and System/360; a `tabella` of the IBM 360 family idea is welcome), testo (time-sharing and BASIC), figura time-sharing, testo (Olivetti: Elea and Programma 101), sapevi, ciao.

`ciao`: { anno: 1964, linguaggio: 'FORTRAN IV su scheda IBM' or 'COBOL', codice: ONE card, ≤ 80 characters, uppercase, punchable by the 029 (only characters in `Hollerith.fori`), e.g. '   10 FORMAT (12H CIAO, MONDO)', uscita: 'CIAO, MONDO', nota }.
Protagonisti: Fred Brooks, Gene Amdahl, Fernando Corbató, John Kemeny, Thomas Kurtz, Mario Tchou, Pier Giorgio Perotto.
Glossary terms you own: perforatrice, elaborazione a lotti, sistema operativo, job, time-sharing, terminale, compatibilità, byte, software.

## Lab «scheda-perforata» (title: «La perforatrice IBM 029»)
Built on `window.Hollerith` (read `js/lib/hollerith.js`).
- A faithful 80-column card in SVG: cream card stock, the cut corner, printed digits 0–9 in the rows, column numbers, FORTRAN field bands (1–5 numero, 6 continuazione, 7–72 istruzione, 73–80 identificazione) printed in a pale colour. No brand logos.
- Typing: a real `<input>` (uppercase, max 80) where every keystroke punches the next column: the punch die moves, the rectangular holes appear with a tiny falling "coriandolo" (chad), the character is printed on the top edge as the 029 did. Backspace un-punches the last column in this simulation (real cards could not be un-punched: say it with a wink in the explanation). Characters not supported by the 029 are refused with a friendly message.
- The explanation shows the code of the current column: «A = fori 12 e 1 (zona 12 + cifra 1)», with the punched rows highlighted on the card.
- Deck mode: a short FORTRAN program on 5–6 cards (with sequence numbers in 73–80). «Lascia cadere il mazzo» shuffles the cards with a falling animation; «Riordina con i numeri di sequenza» sorts them back (animated). «Leggi il mazzo» sends the cards into a reader and shows the printed listing.
- `ctx.completa()` when the user punches a full card or reorders the deck.
- Mobile: the card must scale to the width (it is wide: 7 3/8 × 3 1/4 inches, keep the ratio) and remain legible; allow horizontal panning inside the card container if needed, never the page.

## Figures (`js/figure/schede.js`)
- `sala-macchine`: the batch workflow: programmer with a deck → counter → operator → card reader → mainframe → printer → output in pigeonholes; a deck travels along the path (subtle animation).
- `time-sharing`: one central computer and several terminals around it; a rotating highlight shows the CPU giving a slice of time to each terminal.
