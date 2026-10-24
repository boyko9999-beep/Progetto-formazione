# Item: chapter 4 «assembly» + lab «assemblatore»

Your files: `js/capitoli/04-assembly.js`, `js/lab/assemblatore.js`, `js/figure/assembly.js`, `test/assemblatore.test.js`.
Keep: id 'assembly', numero 4, anni '1947–1956', titolo 'Dai numeri alle parole', sottotitolo 'Codice macchina, assembly, subroutine e i primi compilatori', epoca 'telescrivente'.

## Content to cover (verify)
- Programming in binary/octal: what machine code is, why it was slow and error-prone.
- Kathleen Booth (née Britten) and the "contracted notation" for the ARC at Birkbeck (1947, «Coding for A.R.C.» with Andrew Booth): often credited as the first assembly language; check and present the credit carefully.
- EDSAC: the "initial orders" written by David Wheeler (1949), a tiny loader that turned single-letter mnemonic orders and decimal addresses on paper tape into binary while loading: an early assembler. Subroutines and the "Wheeler jump"; the library of subroutines on paper tape; the first programming textbook, Wilkes, Wheeler and Gill, «The Preparation of Programs for an Electronic Digital Computer» (1951). Wilkes's realization (1949) that much of his life would be spent finding errors in his own programs: quote only with verified wording and source.
- Short Code (John Mauchly, proposed 1949; William Schmitt's implementation on BINAC/UNIVAC): an interpreter, much slower than machine code.
- Autocode (Alick Glennie, 1952, Manchester Mark 1), often considered the first compiled high-level language; Tony Brooker's Mark 1 Autocode (1954).
- Grace Hopper: UNIVAC I (1951), the A-0 system (1952) and the word "compiler"; A-2 shared with customers who sent improvements back; her paper «The Education of a Computer» (1952); her later nanosecond wires (about 30 cm). FLOW-MATIC belongs to the next chapter ([capitolo 5](#fortran)).
- Concepts: assembler, mnemonic, opcode, labels and the symbol table, two passes; interpreter versus compiler (with a `tabella`).
- Bridge to hardware: the instruction decoder inside the CPU decodes the very bits the assembler produces (link [capitolo 3](#cavi) and `../chip-programmabili/index.html`).

Suggested flow: testo (programming in numbers), codice (a few lines of binary/octal machine code vs mnemonic), testo (Booth, Wheeler), figura nastro-edsac, testo (subroutines and libraries), lab assemblatore, citazione (verified), testo (Short Code, Autocode, Hopper's A-0), tabella (interprete vs compilatore), sapevi, ciao.

`ciao`: { anno: 1949, linguaggio: 'Ordini dell\'EDSAC' (only if you can verify the order letters and teleprinter output) or 'Assembly', codice: a short listing, uscita: 'CIAO MONDO' (teleprinter caps), nota }. If you can't verify real EDSAC syntax, use the toy CPU assembly and say so in the nota.
Protagonisti: Kathleen Booth, David Wheeler, Maurice Wilkes, Stanley Gill, John Mauchly, Alick Glennie, Grace Hopper.
Glossary terms you own: codice macchina, linguaggio assembly, assemblatore, codice operativo, mnemonico, etichetta, subroutine, libreria, compilatore, interprete.

## Lab «assemblatore» (title: «L'assemblatore»)
Built on `window.CpuGiocattolo` (read `js/lib/cpu-giocattolo.js`: syntax, `assembla()`, errors, `ESEMPI`).
- Left: an editor (textarea with line numbers, `.pg-campo`) with the toy assembly; preset programs (somma, conto, formula). Right: the 32 memory cells.
- «Assembla» plays the two passes: pass 1 scans lines and fills the symbol table (label → address) with each entry appearing; pass 2 encodes each line: the mnemonic turns into the 3 opcode bits and the operand/label into the 5 address bits, then the word flies into its memory cell. Colour the fields (opcode one colour, address another) consistently everywhere.
- Hover/focus on a source line highlights its word and vice versa; show the ISA cheat sheet (8 instructions with Italian descriptions) in a compact table.
- Errors from `assembla().errori` appear inline next to the line, in friendly Italian, and stop the animation.
- «Esegui» runs the assembled program quickly with a compact readout (PC, ACC, output), not the full CPU animation (that is chapter 3).
- A small challenge «Traduci a mano»: three instructions to encode in binary by toggling bits, with feedback; it makes the reader feel why assemblers were invented.
- `ctx.completa()` after a successful assemble + run.
- Tests: whatever helpers you add (e.g. the challenge checker, line↔cell mapping).

## Figures (`js/figure/assembly.js`)
- `nastro-edsac`: a punched paper tape running through a photoelectric reader, and a cabinet of labelled subroutine tapes (seno, radice quadrata, stampa…).
- Optional `univac`: the UNIVAC I console with a stylised operator (no face).
