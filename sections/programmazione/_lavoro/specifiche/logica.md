# Item: chapter 2 «logica» + lab «turing»

Your files: `js/capitoli/02-logica.js`, `js/lab/turing.js`, `js/figure/logica.js`, `test/turing.test.js`.
Keep: id 'logica', numero 2, anni '1847–1945', titolo 'La logica diventa macchina', sottotitolo 'Boole, Turing, Shannon e la domanda: che cosa si può calcolare?', epoca 'nastro'.

## Content to cover (verify)
- George Boole: The Mathematical Analysis of Logic (1847), An Investigation of the Laws of Thought (1854): logic as algebra of 0 and 1.
- Brief: Gottlob Frege (Begriffsschrift, 1879) and the Italian Giuseppe Peano (axioms of arithmetic 1889 and a notation still in use).
- David Hilbert's program and the Entscheidungsproblem (1928, with Ackermann); Kurt Gödel's incompleteness theorems (1931).
- Alonzo Church and the lambda calculus (1936), future root of LISP and of functional programming (link [capitolo 5](#fortran)).
- Alan Turing, «On Computable Numbers, with an Application to the Entscheidungsproblem» (written 1936, published 1936–37): the machine with tape, head and table of rules; the universal machine (a machine that reads another machine's description: the idea of software); the halting problem; the Church–Turing thesis.
- Claude Shannon's 1937 MIT master's thesis «A Symbolic Analysis of Relay and Switching Circuits» (published 1938): Boolean algebra designs relay circuits. This is the bridge to the electronics sections: link to [la sezione sulle porte logiche](../porte-logiche/index.html).
- Konrad Zuse: Z1 (1938), Z3 (12 May 1941, relays, program on punched 35 mm film), Plankalkül (1942–1945, first design of a high-level language, published 1972).
- Brief: Turing at Bletchley Park; Colossus is in the next chapter ([capitolo 3](#cavi)).

Suggested flow: testo (Boole), testo (Hilbert, Gödel, the question), testo (Turing's machine), lab turing, citazione (a verified short quote, e.g. from Turing 1936 or Hilbert's «Wir müssen wissen, wir werden wissen» 1930, with source), testo (universal machine and halting problem; an `elenco` can help), figura rele-shannon, testo (Shannon: relays think in Boole), testo (Zuse and Plankalkül), sapevi, ciao.

`ciao`: { anno: 1936, linguaggio: 'Tavola delle regole di una macchina di Turing', uscita: 'CIAO', codice: optional 3–5 line rule table in plain text, nota }.
Protagonisti: George Boole, David Hilbert, Kurt Gödel, Alonzo Church, Alan Turing, Claude Shannon, Konrad Zuse.
Glossary terms you own: algebra di Boole, bit, macchina di Turing, macchina universale, problema della fermata, tesi di Church-Turing, relè, lambda calcolo, Turing-completo, linguaggio di programmazione.

## Lab «turing» (title: «La macchina di Turing»)
- A tape of cells (about 15 visible, the tape scrolls smoothly to keep the head centred), a head with the current state, and the rule table (stato, legge → scrive, muove, nuovo stato) with the active rule highlighted.
- Programs (select or segmented control): «Somma 1» (binary increment, editable input such as 1011), «Scrivi CIAO» (writes C, I, A, O and halts), «Castoro indaffarato» (the 2-state, 2-symbol busy beaver: 4 ones in 6 steps), «Inverti i bit» (editable input).
- Controls: «Passo», «▶ Esegui» / «⏸», «↺», speed slider; step counter; a halt banner when the machine stops.
- Animations: head glides between cells, the written symbol flips, the active rule row pulses. Use `ctx.attendi`/`ctx.anima`.
- Explanation narrates each step: «Nello stato q0 leggo 1: scrivo 0, vado a sinistra, resto in q0».
- `ctx.completa()` when a program halts.
- Export the engine and the programs; test: increment 1011 → 1100, 111 → 1000; busy beaver writes 4 ones in 6 steps; CIAO program writes CIAO.

## Figures (`js/figure/logica.js`)
- `rele-shannon`: two relay circuits side by side, switches in series (AND) and in parallel (OR) with a lamp; animate the contacts closing in sequence and the lamp lighting according to the truth table; label A, B, lampada.
- Optional `z3`: Zuse's relay computer as a technical drawing with the punched film reader.
