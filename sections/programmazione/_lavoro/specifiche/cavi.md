# Item: chapter 3 «cavi» + lab «programma-memorizzato»

Your files: `js/capitoli/03-cavi.js`, `js/lab/programma-memorizzato.js`, `js/figure/cavi.js`, `test/programma-memorizzato.test.js` (test your own helpers; the CPU itself is already tested).
Keep: id 'cavi', numero 3, anni '1943–1949', titolo 'Programmare con le mani', sottotitolo 'Cavi, interruttori e l\'idea del programma memorizzato', epoca 'williams'.

## Content to cover (verify)
- Colossus (Tommy Flowers, Bletchley Park, operational 1944): electronic, programmable with switches and plugs; secret until the 1970s.
- Harvard Mark I (Howard Aiken with IBM, 1944): program on punched paper tape; Grace Hopper worked on it. The Mark II and the moth: logbook entry of 9 September 1947 «First actual case of bug being found» (the word "bug" was already engineering slang, e.g. Edison in 1878: present it correctly). The logbook is at the Smithsonian.
- ENIAC (J. Presper Eckert and John Mauchly, Moore School, University of Pennsylvania; completed 1945, presented February 1946): about 18,000 vacuum tubes (check the exact figure), about 30 tons; programmed by setting switches and plugging cables between units (accumulators, multiplier, function tables, master programmer); setting up a new problem took days. The six programmers: Kathleen McNulty, Jean Jennings, Betty Snyder, Marlyn Wescoff, Frances Bilas, Ruth Lichterman; ignored for decades, rediscovered (Kathy Kleiman's ENIAC Programmers Project).
- The stored-program idea: John von Neumann's «First Draft of a Report on the EDVAC» (30 June 1945), circulated with only his name although it drew on Eckert and Mauchly's work; program and data in the same memory; the "von Neumann architecture". Also Turing's ACE design (1946).
- ENIAC converted in 1948 to run programs stored in its function tables (Klára Dán von Neumann and the Monte Carlo calculations): check what Haigh, Priestley and Rope («ENIAC in Action», 2016) say about the date and whether it preceded the Manchester Baby, and present it carefully.
- The Manchester Baby (SSEM, Frederic Williams, Tom Kilburn, Geoff Tootill): 21 June 1948, first program run from electronic memory (highest proper factor of 2^18, about 52 minutes), memory on a Williams–Kilburn cathode-ray tube.
- EDSAC (Maurice Wilkes, Cambridge): 6 May 1949, first practical stored-program computer in regular service (table of squares), mercury delay-line memory.
- Bridge to electronics: valves as switches, the Williams tube storing bits as charge on a screen, delay lines. Link to the electronics sections where natural (`../elettronica-intermedia/index.html` for valves, or `../storia-pc/index.html` for computer architecture).

Suggested flow: testo (Colossus and wartime), testo (ENIAC), figura eniac, testo (the six programmers), lab programma-memorizzato, testo (von Neumann and the stored program; a `tabella` «programmare l'ENIAC prima e dopo» is welcome), citazione (verified), testo (Manchester Baby and EDSAC), figura falena, sapevi (the bug), ciao.

`ciao`: { anno: 1948, linguaggio: 'Bit nella memoria della Manchester Baby', uscita: 'CIAO', nota: the Baby's memory was visible as dots of light on a CRT, so writing the right numbers drew letters }.
Protagonisti: Tommy Flowers, J. Presper Eckert, John Mauchly, Jean Jennings Bartik, Betty Snyder Holberton, Kathleen McNulty (or one card for the six), John von Neumann, Klára Dán von Neumann, Tom Kilburn, Maurice Wilkes.
Glossary terms you own: programma memorizzato, architettura di von Neumann, memoria, registro, accumulatore, contatore di programma, ciclo di istruzione, valvola termoionica, tubo di Williams, bug.

## Lab «programma-memorizzato» (title: «Dal pannello di cavi al programma memorizzato»)
Two modes in a segmented control:
A) «ENIAC: il programma è nei cavi»: a stylised plugboard with 4–5 units (accumulatore 1, accumulatore 2, moltiplicatore, tavola delle funzioni, programmatore principale) and patch cables. Pick a problem («Somma», «Quadrati»): the cables visibly unplug and replug (animated bezier cables), a counter shows the time a real re-wiring took ("giorni") versus here. Lighter, but memorable: the program IS the wiring.
B) «Von Neumann: il programma è nella memoria» (main): use `window.CpuGiocattolo` (read `js/lib/cpu-giocattolo.js`). Show the 32 memory cells (address, 8 bits, decoded instruction or number; cell 31 labelled USCITA), the CPU block with PC, IR and ACC (accumulatore), the bus between memory and CPU. «Fase» steps through fetch → decode → execute with a packet travelling along the bus (memory → IR, memory → ACC, ACC → memory) and the explanation from `CpuGiocattolo.fasi(ev)` (or better wording of your own); «Istruzione» runs a whole instruction; «▶ Esegui» runs with a speed slider; «↺». Programs: `CpuGiocattolo.ESEMPI.somma` and `.conto`. The output panel shows printed numbers. Clicking a memory cell lets you toggle its bits (e.g. change the data 5 into 7 and rerun): changing the program takes seconds instead of days. That insight is the punchline.
- `ctx.completa()` when a program reaches HALT in mode B.
- Must work at 390 px: the memory can become a 4×8 grid with compact cells; the bus diagram can stack vertically.

## Figures (`js/figure/cavi.js`)
- `eniac`: the U-shaped room of panels with patch cables and two stylised programmers (silhouettes, no faces) plugging cables; neon bulbs blinking subtly.
- `falena`: a logbook page with the moth taped and the handwritten-style note «First actual case of bug being found.» and the time 15:45 (check).
