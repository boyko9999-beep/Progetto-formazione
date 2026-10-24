# Item: chapter 7 «strutturata» + lab «spaghetti»

Your files: `js/capitoli/07-strutturata.js`, `js/lab/spaghetti.js`, `js/figure/strutturata.js`, `test/spaghetti.test.js`.
Keep: id 'strutturata', numero 7, anni '1966–1980', titolo 'La crisi del software', sottotitolo 'Ingegneria del software, programmazione strutturata e il codice che portò l\'uomo sulla Luna', epoca 'tabulato'.

## Content to cover (verify)
- The software crisis: hardware grows faster than our ability to write reliable programs; projects late, over budget, full of bugs. Dijkstra's 1972 Turing lecture «The Humble Programmer» (quote only with verified wording).
- The NATO Software Engineering conference, Garmisch, 7–11 October 1968: the provocative term "software engineering"; the second conference in Rome (1969): Italian link.
- Margaret Hamilton and the Apollo Guidance Computer software at the MIT Instrumentation Laboratory; she pushed the term "software engineering"; Apollo 11 landing (20 July 1969): the 1202 and 1201 alarms (the rendezvous radar stealing computer time), the executive that restarted and kept only the high-priority tasks, so the landing continued; the famous photo next to the listings (reconstructed as illustration). Core rope memory, literally woven by hand (link back to the loom of [capitolo 1](#telai)). Presidential Medal of Freedom 2016.
- Corrado Böhm and Giuseppe Jacopini (1966, CACM): any flow chart can be written with sequence, selection and iteration: the structured program theorem. Italian link: stress it.
- Edsger Dijkstra, «Go To Statement Considered Harmful» (CACM, March 1968; the title was chosen by the editor, Niklaus Wirth); structured programming (the 1972 book with Dahl and Hoare).
- Niklaus Wirth's Pascal (1970), designed for teaching structured programming.
- Simula 67 (Ole-Johan Dahl and Kristen Nygaard, Oslo): classes, objects and inheritance are born here (link [capitolo 10](#oggetti)).
- Tony Hoare: Quicksort (1959–1961), Hoare logic (1969), the null reference he later called his «billion-dollar mistake» (2009 talk).
- David Parnas and information hiding (1972): modules.

Suggested flow: testo (the crisis), citazione (verified), testo (Garmisch 1968 and Rome 1969), testo (Apollo and Margaret Hamilton), figura apollo-dsky, figura listati-hamilton (or memoria-a-fili), testo (Böhm–Jacopini and Dijkstra), lab spaghetti, testo (Pascal, Simula, Hoare, Parnas; an `elenco` of the principles of structured programming), sapevi, ciao.

`ciao`: { anno: 1970, linguaggio: 'Pascal', codice: e.g. "program Ciao(output);\nbegin\n  writeln('Ciao, mondo')\nend." (period line printers were often uppercase-only: consider uppercase), uscita, nota }.
Protagonisti: Margaret Hamilton, Edsger Dijkstra, Corrado Böhm, Giuseppe Jacopini, Niklaus Wirth, Ole-Johan Dahl, Kristen Nygaard, Tony Hoare.
Glossary terms you own: crisi del software, ingegneria del software, programmazione strutturata, GOTO, codice spaghetti, diagramma di flusso, ciclo, teorema di Böhm-Jacopini, modulo, memoria a fili intrecciati.

## Lab «spaghetti» (title: «GOTO contro programmazione strutturata»)
- The same algorithm in two versions side by side: Euclid's greatest common divisor by subtraction.
  - BASIC with line numbers and GOTO, e.g.
    10 IF A = B THEN GOTO 60 / 20 IF A > B THEN GOTO 50 / 30 B = B - A / 40 GOTO 10 / 50 A = A - B: GOTO 10 / 60 PRINT A
  - Pascal-like structured: while a <> b do if a > b then a := a - b else b := b - a; writeln(a)
- For each version, a flow diagram: GOTO version as a flow chart whose jump arrows cross and loop around; structured version as nested blocks (Nassi–Shneiderman style or indented boxes).
- Run both (in sync or one at a time): a glowing token follows the execution; for the GOTO version, every jump leaves a fading trail so the path piles up like spaghetti; the current line is highlighted in the code; counters: istruzioni eseguite, salti. Inputs A and B editable (1–99), presets (A=48, B=18).
- Show the three Böhm–Jacopini building blocks (sequenza, selezione, iterazione) as small icons and highlight which one is active in the structured version.
- `ctx.completa()` after both versions finish.
- Export a tiny interpreter/trace generator for both versions; tests: gcd(48,18)=6, gcd(7,7)=7, traces end on PRINT, jumps counted correctly.

## Figures (`js/figure/strutturata.js`)
- `apollo-dsky`: the Apollo DSKY (display and keyboard) with the PROG warning light lit and 1202 on the display, blinking subtly.
- `listati-hamilton`: a stack of printed listings as tall as a stylised standing person (silhouette, no face), with a ruler showing the height; or `memoria-a-fili`: core rope memory with wires threaded through or around ferrite cores (1 or 0). Choose what you can draw best; both is better.
