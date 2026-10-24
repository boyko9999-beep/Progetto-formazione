# Item: chapter 5 «fortran» + lab «compilatore»

Your files: `js/capitoli/05-fortran.js`, `js/lab/compilatore.js`, `js/figure/fortran.js`, `test/compilatore.test.js`.
Keep: id 'fortran', numero 5, anni '1954–1962', titolo 'I primi linguaggi ad alto livello', sottotitolo 'FORTRAN, LISP, COBOL e ALGOL: scrivere formule invece di istruzioni', epoca 'foglio'.

## Content to cover (verify)
- FORTRAN: John Backus at IBM, the 1954 preliminary report, the first compiler delivered in April 1957 for the IBM 704; the optimizing compiler producing code nearly as good as hand-written; the effort it took (the often-cited "18 person-years": verify); FORTRAN II (1958), FORTRAN IV (1962), FORTRAN 66 (first standard); Fortran still used in scientific computing.
- FLOW-MATIC (Grace Hopper's team at Remington Rand, 1955–1959): English-like commands for business data.
- LISP: John McCarthy (MIT, 1958; 1960 paper «Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I»); Steve Russell implements eval on the IBM 704; recursion, garbage collection, conditional expressions, code as data; car and cdr named after IBM 704 register fields.
- COBOL: the CODASYL meeting at the Pentagon (May 1959), Mary Hawes, Jean Sammet, Grace Hopper as adviser; COBOL-60; the December 1960 demonstration of the same program on two different computers (check: RCA 501 and UNIVAC II); still in banks today.
- ALGOL 58 and ALGOL 60 (the 1960 report edited by Peter Naur): blocks, lexical scope, recursion; BNF (Backus 1959, Naur 1960) to describe syntax; ancestor of Pascal, C and Java. Tony Hoare's line that ALGOL 60 was an improvement not only on its predecessors but on nearly all its successors (1973, «Hints on Programming Language Design»): verify the wording.
- Italian link: Corrado Böhm's doctoral thesis at ETH Zurich (1951–1954) described a compiler written in its own language; verify and present it.
- How a compiler works: lexical analysis, parsing into a syntax tree, code generation, optimization: the lab shows it.
- Brief: APL (Kenneth Iverson, 1962) as a different road.

Suggested flow: testo (the problem: programming was expensive, Backus's «laziness»), testo (FORTRAN), lab compilatore, citazione (verified), testo (LISP), codice (a short LISP example), testo (COBOL and the business world), codice (a short COBOL fragment), testo (ALGOL and BNF), figura ibm-704, sapevi (Böhm), ciao.

`ciao`: { anno: 1957, linguaggio: 'FORTRAN', codice: a FORTRAN II/IV program in fixed columns (comment with C in column 1, statement numbers in columns 1–5, statements from column 7), e.g. PRINT 10 / 10 FORMAT (12H CIAO, MONDO) / STOP / END (verify the FORMAT with the H edit descriptor, count the characters), uscita: 'CIAO, MONDO', nota: written in pencil on a coding form, then punched on cards (link [capitolo 6](#schede)) }.
Protagonisti: John Backus, Grace Hopper, John McCarthy, Jean Sammet, Peter Naur, Corrado Böhm.
Glossary terms you own: linguaggio ad alto livello, analisi lessicale, token, parser, albero sintattico, BNF, ricorsione, garbage collection, variabile, precedenza degli operatori.

## Lab «compilatore» (title: «Il compilatore al lavoro»)
- Input: an assignment in FORTRAN style, editable: `Y = A + B * C` (single-letter variables, integers 0–255, operators + − *, parentheses; `/` is not supported because the toy CPU has no division: say so). A small table with the values of the variables (A = 2, B = 3, C = 4…), editable.
- Four stages as a stepper with animated transitions:
  1. **Analisi lessicale**: characters become tokens (chips coloured by kind: variabile, numero, operatore, uguale, parentesi).
  2. **Analisi sintattica**: tokens become a syntax tree that grows node by node; precedence is visible (* below +); parentheses change the tree.
  3. **Generazione del codice**: a post-order walk of the tree highlights nodes while it emits toy assembly for `window.CpuGiocattolo` (LOAD/ADD/SUB/MUL/STORE, temporaries T1, T2…, DATA lines for variables and constants).
  4. **Esecuzione**: assemble with `CpuGiocattolo.assembla` and run with `CpuGiocattolo.esegui`; show the result written into Y and printed (STORE OUT).
- Friendly Italian errors for invalid input (missing parenthesis, unknown symbol, too many cells for the 31-cell memory).
- Presets: `Y = A + B * C`, `Y = (A + B) * C`, `Y = A * A - B`.
- `ctx.completa()` after a full run.
- Export lexer, parser and code generator; test precedence and associativity (A − B − C), parentheses, errors, and that the generated program prints the correct value.

## Figures (`js/figure/fortran.js`)
- `ibm-704`: the IBM 704 room as a technical illustration: console, tape drives, card reader, printer (no logos).
- Optional `compilatore-schema`: a static diagram of the compilation pipeline if it helps the text (the lab already animates it, so only if it adds something).
