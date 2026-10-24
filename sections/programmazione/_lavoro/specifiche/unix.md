# Item: chapter 8 «unix» + lab «pipe»

Your files: `js/capitoli/08-unix.js`, `js/lab/pipe.js`, `js/figure/unix.js`, `test/pipe.test.js`.
Keep: id 'unix', numero 8, anni '1969–1985', titolo 'Unix, C e i piccoli strumenti', sottotitolo 'Un sistema operativo portabile, un linguaggio per scriverlo e l\'arte di comporre programmi', epoca 'terminale'.

## Content to cover (verify)
- Bell Labs leaves Multics (1969); Ken Thompson writes the first Unix on a PDP-7 (1969), with Dennis Ritchie; the name; first edition 1971 on the PDP-11 (the patent department's text processing).
- From BCPL (Martin Richards, 1967) to B (Thompson, 1969) to C (Ritchie, 1972); the kernel rewritten in C (1973): portability, a revolution; Version 6 (1975) at universities; Lions' Commentary.
- Pipes: Doug McIlroy's 1964 memo about coupling programs «like garden hose» (verify the wording), implemented by Thompson in 1973; the `|` symbol; the Unix philosophy (attribute correctly: McIlroy's 1978 foreword and the later summary by Peter Salus).
- «hello, world»: Brian Kernighan's B tutorial (1972), the C tutorial (1974), K&R «The C Programming Language» (1978).
- BSD at Berkeley (Bill Joy), vi (1976), TCP/IP in BSD (1983) and the Internet.
- Xerox PARC and Smalltalk (Alan Kay, Dan Ingalls, Adele Goldberg) in two sentences, linking [capitolo 10](#oggetti).
- Edgar F. Codd's relational model (1970) and SQL (Donald Chamberlin and Raymond Boyce, IBM, 1974): declarative programming, «say what, not how».
- Prolog (Alain Colmerauer and Philippe Roussel, Marseille, 1972; Robert Kowalski): logic programming. ML (Robin Milner, 1973). Scheme (1975).
- Thompson and Ritchie receive the Turing Award (1983).
- Bridge to hardware: Unix ran on minicomputers like the PDP-11 (link `../storia-pc/index.html`).

Suggested flow: testo (Bell Labs and Multics), figura pdp-11, testo (Unix), testo (C and portability), codice (a short C example), testo (pipes and the philosophy), lab pipe, citazione (verified McIlroy), sapevi (Knuth vs McIlroy word count, 1986, verify), testo (SQL and declarative programming), codice (a short SQL query), testo (Prolog and ML), ciao.

`ciao`: { anno: 1978, linguaggio: 'C', file: 'ciao.c', codice: the K&R style program with `printf("ciao, mondo\n");` (verify the 1978 form: `main()` without int), comandi: ['$ cc ciao.c', '$ a.out'], uscita: 'ciao, mondo', nota }.
Protagonisti: Ken Thompson, Dennis Ritchie, Doug McIlroy, Brian Kernighan, Edgar F. Codd, Alain Colmerauer.
Glossary terms you own: kernel, shell, pipe, processo, file, portabilità, linguaggio C, puntatore, database relazionale, SQL, programmazione dichiarativa, programmazione logica.

## Lab «pipe» (title: «Le pipe di Unix»)
- A file `inferno.txt` with the first three tercets of Dante's Inferno (public domain; verify the text).
- A pipeline builder: stage blocks connected by pipes. Palette of commands implemented in JS: `cat inferno.txt`, `tr` to split into words (one word per line; handle Italian letters, accents and apostrophes sensibly), `tr A-Z a-z` (lowercase), `sort`, `uniq -c`, `sort -rn`, `head -n 5`, `grep <parola>`, `wc -l`. Add, remove and reorder stages (buttons, keyboard-accessible; drag is optional).
- The full command line is shown and updates (e.g. `cat inferno.txt | tr -cs 'A-Za-z' '\n' | tr A-Z a-z | sort | uniq -c | sort -rn | head -5`).
- «▶ Esegui»: data flows as small packets/lines through the pipes between process boxes (each box shows the first lines of its output when clicked or hovered); the final output appears in a green-phosphor terminal.
- Presets: «Parole più frequenti», «Quante righe?», «Cerca "selva"».
- `ctx.completa()` after the first full pipeline run.
- Export the tools as pure functions over arrays of lines; test each tool and the classic word-frequency pipeline on the text.

## Figures (`js/figure/unix.js`)
- `pdp-11`: a PDP-11 with its front panel (switches and lights blinking binary) and a Teletype ASR-33 with paper; two stylised people (silhouettes, no faces), one standing, one sitting.
- Optional `filosofia-unix`: small boxes each doing one thing, connected by pipes.
