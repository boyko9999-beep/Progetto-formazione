# Item: chapter 9 «personal» + lab «basic»

Your files: `js/capitoli/09-personal.js`, `js/lab/basic.js`, `js/figure/personal.js`, `test/basic.test.js`.
Keep: id 'personal', numero 9, anni '1975–1990', titolo 'Il software per tutti', sottotitolo 'Home computer, BASIC, fogli di calcolo e sistemi operativi da scrivania', epoca 'home'.

## Content to cover (verify)
- The microprocessor (Intel 4004, 1971; 8080, 1974; link `../chip-programmabili/index.html`).
- The Altair 8800 (MITS, Popular Electronics, January 1975), programmed with front-panel switches; Altair BASIC by Bill Gates and Paul Allen with Monte Davidoff, developed on a simulator before seeing the machine; Microsoft founded in 1975; Gates's «Open Letter to Hobbyists» (1976).
- Homebrew Computer Club; Apple I (1976) and Apple II (1977, Integer BASIC by Steve Wozniak, then Applesoft); Commodore PET and TRS-80 (1977); Commodore 64 (1982, BASIC V2) and ZX Spectrum (1982), hugely popular in Italy and the UK; magazines with program listings to type in (Italian magazines too: verify names before citing).
- The famous one-liner `10 PRINT CHR$(205.5+RND(1)); : GOTO 10` on the Commodore 64 and the 2012 book about it.
- VisiCalc (1979, Dan Bricklin and Bob Frankston) for the Apple II: the first spreadsheet and the first "killer application".
- CP/M (Gary Kildall, 1974); the IBM PC (12 August 1981) and MS-DOS (from Tim Paterson's 86-DOS); Lotus 1-2-3 (1983).
- Turbo Pascal (Anders Hejlsberg, Borland, 1983): editor + fast compiler at a low price (verify the price).
- Free software: Richard Stallman announces GNU (27 September 1983), the Free Software Foundation (1985), the GNU GPL (1989); "free as in freedom".
- Italian link: Olivetti M24 (1984), if verified; Italian type-in magazines.

Suggested flow: testo (the microprocessor changes everything), figura altair-8800, testo (Altair BASIC), citazione (verified, e.g. from the Open Letter), testo (home computers and BASIC everywhere), lab basic, figura home-computer, testo (VisiCalc), testo (IBM PC and MS-DOS; Turbo Pascal), testo (GNU and free software), sapevi (10 PRINT), ciao.

`ciao`: { anno: 1982, linguaggio: 'BASIC', codice: '10 PRINT "CIAO, MONDO"\n20 GOTO 10', uscita: 'CIAO, MONDO', nota }.
Protagonisti: Bill Gates, Paul Allen, Steve Wozniak, Dan Bricklin, Bob Frankston, Gary Kildall, Anders Hejlsberg, Richard Stallman (6–8 cards).
Glossary terms you own: microprocessore, BASIC, home computer, foglio di calcolo, killer application, IDE, software libero, GPL, listato. ("interprete" is defined by chapter 4: just reference it with {{interprete}}.)

## Lab «basic» (title: «Un BASIC dell'epoca»)
A tiny but robust BASIC interpreter running on a period screen.
- The screen: a generic 1980s home computer look: light-blue text on dark blue with a lighter border, 40×25 characters, uppercase blocky monospace, blinking block cursor, boot text like «**** BASIC DIDATTICO ****» and «READY.» (do not copy Commodore trademarks literally). Subtle CRT glow/scanlines (CSS), off with reduced motion.
- Input: a real text input under the screen (works on phones), plus typing directly when the screen is focused. Lines with a number are stored in the program; commands RUN, LIST, NEW, CLS; immediate statements (PRINT 2+2).
- Language subset: PRINT (strings, numbers, expressions, `;` and `,`, trailing `;`), LET (optional), INPUT (prompt «? », waits for the input field), GOTO, IF … THEN (line number or statement), FOR … TO … STEP / NEXT, GOSUB / RETURN, END, REM, multiple statements per line with `:`, numeric variables and string variables (A$), functions RND(1), INT, ABS, LEN, CHR$ (map 205 and 206 to the diagonals ╲ and ╱ so the 10 PRINT maze works), comparison and arithmetic operators with correct precedence. Clear error messages in the style «?SYNTAX ERROR IN 20».
- Execution is time-sliced (a few hundred statements per frame via `ctx.ciclo`) so infinite loops never freeze the page; a big «STOP» button (RUN/STOP) interrupts; the run pauses automatically offscreen.
- Example buttons that load and list a program: «Ciao» (10 PRINT "CIAO, MONDO" / 20 GOTO 10), «Labirinto» (the 10 PRINT one-liner), «Tabellina» (FOR loop), «Indovina il numero» (INPUT + IF + RND).
- `ctx.completa()` after the first RUN of a program.
- Export the interpreter core (tokenizer, expression evaluator, statements) independent of the screen; test it thoroughly: precedence, FOR/NEXT with STEP, GOSUB/RETURN, IF/THEN forms, string variables, PRINT formatting, errors, INPUT handling via a callback, the step budget.

## Figures (`js/figure/personal.js`)
- `altair-8800`: the front panel with rows of toggle switches and red LEDs showing binary values (blinking slowly), without logos.
- `home-computer`: a generic 8-bit home computer keyboard wedge connected to a TV showing READY. and a cassette recorder.
