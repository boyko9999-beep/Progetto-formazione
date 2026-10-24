# Item: chapter 11 «web» + lab «pagina-web»

Your files: `js/capitoli/11-web.js`, `js/lab/pagina-web.js`, `js/figure/web.js`, optional `test/pagina-web.test.js`.
Keep: id 'web', numero 11, anni '1989–2005', titolo 'Il web e l\'open source', sottotitolo 'Ipertesti, Linux, Java, JavaScript e il codice condiviso con il mondo', epoca 'browser'.

## Content to cover (verify)
- Internet roots in two sentences (ARPANET 1969, TCP/IP on 1 January 1983); BusLab already explains Ethernet: link `../../index.html#/bus/ethernet`.
- Tim Berners-Lee at CERN: «Information Management: A Proposal» (March 1989; Mike Sendall's «vague but exciting»), with Robert Cailliau; the first server and browser-editor WorldWideWeb on a NeXT computer (end of 1990); HTML, HTTP, URL; info.cern.ch; the web released into the public domain by CERN on 30 April 1993.
- Italy: the first Italian website (CRS4, Sardinia, 1993): verify.
- Mosaic (NCSA, 1993) with inline images; Netscape (1994); the browser wars.
- Linux: Linus Torvalds's message of 25 August 1991 («just a hobby, won't be big and professional like gnu»), version 0.01 in September 1991, GPL licence; GNU/Linux; Apache (1995) and the LAMP stack.
- Python (Guido van Rossum, CWI, first release February 1991, named after Monty Python).
- Java (James Gosling, Sun; released 23 May 1995): bytecode, the virtual machine, «write once, run anywhere», applets.
- JavaScript (Brendan Eich, Netscape, May 1995 prototype in about ten days; Mocha, LiveScript, JavaScript), ECMAScript (1997); the DOM; Ajax (2005) with Gmail (2004) and Google Maps (2005).
- PHP (Rasmus Lerdorf, 1995), Ruby (Yukihiro Matsumoto, 1995), Perl (Larry Wall, 1987).
- Open source: «The Cathedral and the Bazaar» (Eric Raymond, 1997); Netscape publishes its source code (1998); Christine Peterson coins "open source" (February 1998) and the OSI is founded; Wikipedia (2001).
- The millennium bug: two-digit years in decades-old programs; the worldwide repair effort; why so little broke.
- The dot-com bubble (2000).

Suggested flow: testo (CERN and the proposal), figura primo-server, testo (HTML, HTTP, URL), lab pagina-web, testo (Mosaic, Netscape), testo (Linux and the bazaar), citazione (verified Torvalds 1991), testo (Python, Java, JavaScript, PHP: a `tabella` with year, author, idea), figura ragnatela, testo (open source), testo (Y2K), sapevi, ciao.

`ciao`: { anno: 1991, linguaggio: 'HTML', codice: a tiny 1991-style page (title, h1 «Ciao, mondo!», a paragraph with a link), nota }.
Protagonisti: Tim Berners-Lee, Robert Cailliau, Linus Torvalds, Guido van Rossum, James Gosling, Brendan Eich, Christine Peterson.
Glossary terms you own: World Wide Web, ipertesto, HTML, HTTP, URL, browser, server, DOM, open source, macchina virtuale, bytecode, linguaggio di scripting, millennium bug.

## Lab «pagina-web» (title: «Come nasce una pagina web»)
A five-step story you can play, step through, and edit:
1. **Richiesta**: a 1991-style browser window on the left, a server box on the right, a network between them; `GET /ciao.html HTTP/1.0` travels as a packet.
2. **Risposta**: `HTTP/1.0 200 OK` + headers + the HTML travel back.
3. **Analisi**: the HTML text is parsed into a DOM tree that grows node by node (use `DOMParser` on the text, never insert it into the live page).
4. **Disegno**: the page appears in the browser window (render your own simplified drawing from the DOM, or a sandboxed iframe `srcdoc` with `sandbox=""`, no scripts).
5. **JavaScript (1995)**: the page has a button; clicking it fires an event, a JS handler (implemented by you, not user code) changes a DOM node (e.g. a click counter), the node flashes in the tree and the page redraws.
- An editable HTML textarea (limited, with a reset) so the reader can change the text, add a paragraph or a link and re-run steps 3–4.
- `ctx.completa()` after all five steps.
- Must be clear at 390 px (stack browser above server; tree scrolls inside its panel).

## Figures (`js/figure/web.js`)
- `primo-server`: a cube-shaped workstation with a handwritten-style label «Questa macchina è un server: NON SPEGNERLA!» (the famous label, translated), the first browser window on the screen; no NeXT logo.
- `ragnatela`: pages connected by hyperlinks forming a web; a highlight travels from link to link.
