# Item: chapter 10 «oggetti» + lab «oggetti»

Your files: `js/capitoli/10-oggetti.js`, `js/lab/oggetti.js`, `js/figure/oggetti.js`, optional `test/oggetti.test.js`.
Keep: id 'oggetti', numero 10, anni '1979–1995', titolo 'Oggetti e finestre', sottotitolo 'La programmazione a oggetti e le interfacce grafiche', epoca 'mac'.

## Content to cover (verify)
- Roots: Simula 67 (Dahl and Nygaard) and Ivan Sutherland's Sketchpad (1963, master drawings and instances); Alan Kay and the term "object-oriented"; Smalltalk at Xerox PARC (1972–1980): everything is an object, objects exchange messages; Smalltalk-80 presented to the world (Byte, August 1981).
- Douglas Engelbart's «Mother of All Demos» (9 December 1968): mouse, hypertext, windows; the first mouse (wooden, 1964). Xerox Alto (1973): bitmapped GUI, mouse, Ethernet. MVC (Trygve Reenskaug, 1979).
- Apple Lisa (1983) and Macintosh (24 January 1984): the graphical interface for everyone; event-driven programming (the program waits for clicks and keys in an event loop); HyperCard (1987, Bill Atkinson) and HyperTalk: programming for non-programmers.
- C++ (Bjarne Stroustrup at Bell Labs: «C with Classes» from 1979, the name C++ in 1983, the commercial release and the book in 1985). Objective-C (Brad Cox and Tom Love) and NeXT (1988). Eiffel (Bertrand Meyer, 1986): design by contract.
- Windows (1.0 in 1985, 3.0 in 1990); Visual Basic (1991): draw the window, then write what happens on each event (Alan Cooper's prototype).
- «Design Patterns» (Gamma, Helm, Johnson, Vlissides, 1994): the "Gang of Four".
- Concepts: class, object, method, message, encapsulation, inheritance, polymorphism, event; a `tabella` comparing them with real-world analogies.
- Bridge to hardware: bitmapped displays and the mouse needed new hardware (link `../storia-pc/index.html`).

Suggested flow: testo (from instructions to objects), testo (Simula, Sketchpad, Kay, Smalltalk), citazione (verified Alan Kay), lab oggetti, tabella (concetti con analogie), testo (Engelbart and the Alto), figura primo-mouse, testo (Macintosh and events), figura desktop-anni-80, testo (C++, Objective-C, Windows, Visual Basic), sapevi, ciao.

`ciao`: { anno: 1987, linguaggio: 'HyperTalk', codice: 'on mouseUp\n  answer "Ciao, mondo!"\nend mouseUp', uscita: 'Ciao, mondo!', nota }.
Protagonisti: Alan Kay, Adele Goldberg, Douglas Engelbart, Bjarne Stroustrup, Bill Atkinson, Alan Cooper (or the Gang of Four).
Glossary terms you own: programmazione a oggetti, classe, oggetto, metodo, ereditarietà, incapsulamento, polimorfismo, interfaccia grafica, evento, design pattern.

## Lab «oggetti» (title: «Classi e oggetti»)
- A class blueprint card «classe Robot» with attributes (nome, colore, energia) and methods (saluta(), muovi(passi), ricarica()). A subclass card «classe RobotSaldatore estende Robot» adds salda() and overrides saluta().
- «Crea un oggetto»: a small factory animation stamps a new robot (SVG, with its own colour and name) onto a stage. Each object has its own state (an energy bar), visible on the stage.
- Select an object and call a method: a message envelope flies from a "chiamante" to the object, the robot reacts (moves along a track, speech bubble «Ciao, sono R2!», energy decreases; ricarica refills it).
- «Tutti salutano»: calls saluta() on every object; Robot and RobotSaldatore answer differently: polymorphism, explained.
- Encapsulation: a button «Scrivi energia = 1000 dall'esterno» is refused with an explanation (the field is private), only ricarica() can change it.
- A code panel shows the pseudo-code of every action as it happens (Italian pseudo-code in a Java-like style, e.g. `r1 = new Robot("R1", "verde")`, `r1.muovi(3)`).
- `ctx.completa()` after creating objects of both classes and calling «Tutti salutano».
- Keep it polished and playful; 390 px must work (the stage can scroll horizontally inside itself).

## Figures (`js/figure/oggetti.js`)
- `desktop-anni-80`: a 1-bit 1984-style desktop with menu bar, two overlapping windows, icons and a pointer that moves and opens a window (generic, no Apple logo).
- `primo-mouse`: Engelbart's 1964 wooden mouse with its two perpendicular wheels, as a technical drawing.
