# Item: chapter 14 «atlante» + lab «atlante»

Your files: `js/capitoli/14-atlante.js`, `js/lab/atlante.js`, `test/atlante.test.js`.
Keep: id 'atlante', numero 14, anni '1957–2026', anno: 2026, speciale: true, etichetta: 'Atlante', titolo 'Atlante dei linguaggi', sottotitolo 'L\'albero genealogico dei linguaggi di programmazione'. No `epoca`, no `ciao` block.

## Chapter text (short, 450–700 words)
- How to read the map; why languages borrow from each other; what a paradigm is (imperativo, procedurale/strutturato, a oggetti, funzionale, logico, dichiarativo, di scripting) with a `tabella` (paradigma, idea in una frase, linguaggi d'esempio); a closing thought: no language is the best for everything.
- Blocks: testo, lab atlante (wide: `largo: true`), tabella, testo, sapevi.
- Glossary terms you own: paradigma di programmazione, programmazione imperativa, programmazione funzionale, tipizzazione.
- Protagonisti: none or very few; tappe: optional; fonti: yes (Wikipedia language pages, HOPL proceedings, Lévénez's language chart, etc.).

## Lab «atlante» (title: «L'albero dei linguaggi»)
- Data: about 50 languages, each { id, nome, anno (first appearance, as commonly cited), autori, paradigmi: [...], famiglia, influenzatoDa: [ids], descrizione (1–2 sentences in Italian), ciao (a correct "hello world" in that language, short), capitolo (id of the chapter of this section that talks about it, if any) }. Include at least: Plankalkül (design 1945, mark as design), Short Code, Autocode, FORTRAN, FLOW-MATIC, LISP, ALGOL 58, COBOL, ALGOL 60, APL, Simula, BASIC, PL/I, BCPL, Logo, B, Pascal, C, Smalltalk, Prolog, ML, SQL, Scheme, Modula-2, Ada, C++, Objective-C, Common Lisp, Erlang, Eiffel, Perl, Haskell, Python, Visual Basic, Lua, R, Java, JavaScript, PHP, Ruby, OCaml, C#, Scala, F#, Clojure, Go, Rust, Kotlin, TypeScript, Swift. Use influence links from reliable sources (each language's "influenced by" as commonly documented), keep only significant ones; never an influence from a younger language to an older one.
- Layout: an SVG timeline graph: x = year (about 1945 → 2026, with decade gridlines), y = family lanes (e.g. FORTRAN/ALGOL, LISP/funzionali, business, C, oggetti, scripting, logica/dichiarativi, moderni). Edges are smooth curves from ancestor to descendant.
- Interaction: click/tap or Enter on a language highlights its ancestors and descendants (two colours) and dims the rest; a detail panel shows name, year, authors, paradigms, description, the hello world in a code box, and a link to the chapter (`#<capitolo>`). Paradigm filter chips; a search field; a «Vista elenco» toggle with an accessible, sortable list (keyboard friendly) as an alternative to the graph.
- Big graph, small screens: the SVG lives in a horizontally scrollable container with a fixed comfortable width (e.g. 1400 px) and a «centra» behaviour when selecting from the list; never horizontal scroll of the page.
- Entrance animation: edges draw in by decade (respect reduced motion).
- `ctx.completa()` after the user opens three languages.
- Export the data and helpers (ancestors/descendants); tests: unique ids, all influences exist, influencer year ≤ language year, no cycles, every chapter id is valid (telai, logica, cavi, assembly, fortran, schede, strutturata, unix, personal, oggetti, web, ovunque, ia), hello world present.
