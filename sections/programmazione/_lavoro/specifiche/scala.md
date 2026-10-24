# Item: scala (hero lab, no chapter)

Your files: `js/lab/scala.js`, optional `test/scala.test.js`.
The lab is mounted in the page opening (hero, `#inizio`), in the right column on desktop (about 600–720 px wide) and full width on mobile. The core already gives it the title «La scala dell'astrazione: una somma, sette livelli» and an intro; register it with `titolo: 'La scala dell\'astrazione'`.

## Concept
The same computation, `x = a + b` with a = 2 and b = 3, shown at seven levels of abstraction, from the top (closest to humans) to the bottom (closest to electrons). It is the thesis of the whole section: every era added a language on top of the previous one, and every line of code still ends up as logic gates switching.

Levels (top → bottom), each with: name, the year that level of language appeared, the representation, one or two sentences of explanation, and who/what translates it to the next level down:
1. **Linguaggio naturale** (anni 2020): «Somma a e b e metti il risultato in x.» A person or a language model (IA) turns the sentence into code.
2. **Python** (1991): `x = a + b`. Honest transition: the Python interpreter (itself a program written in C) reads the line and performs the addition by running compiled C code. Do not claim that Python is compiled into the C shown below; say the levels are "languages ever closer to the machine".
3. **C** (1972): `int a = 2, b = 3, x;` and `x = a + b;`. The C compiler translates into assembly.
4. **Assembly x86-64** (the x86 family from 1978, 64-bit from 2003). What GCC -O2 produces for a function doing `x = a + b;` on globals, Intel syntax:
   ```
   mov eax, DWORD PTR a[rip]
   add eax, DWORD PTR b[rip]
   mov DWORD PTR x[rip], eax
   ```
   The assembler translates into machine code.
5. **Codice macchina** (hex bytes). With an example layout (code at 0x1000, variables a, b, x at 0x4010, 0x4014, 0x4018; RIP-relative displacement = target − address of the next instruction):
   `8B 05 0A 30 00 00` (mov eax, [a]) · `03 05 08 30 00 00` (add eax, [b]) · `89 05 06 30 00 00` (mov [x], eax). Mark the addresses as "indirizzi di esempio". Verify the encodings (8B /r = MOV r32, r/m32; 03 /r = ADD r32, r/m32; 89 /r = MOV r/m32, r32; ModRM 0x05 = mod 00, reg 000 = EAX, r/m 101 = RIP+disp32 in 64-bit mode; displacement little-endian). The CPU's decoder reads these bytes.
6. **Binario**: the ADD instruction as bits, `00000011 00000101 00001000 00110000 00000000 00000000`, with the fields coloured: opcode 0x03, ModRM (mod 00 | reg 000 | r/m 101), 32-bit displacement. The bits drive the ALU.
7. **Porte logiche**: inside the ALU, 2 + 3 is 0010 + 0011 = 0101, computed by a 4-bit ripple-carry adder of four full adders (each full adder: 2 XOR, 2 AND, 1 OR). Animate the carry propagating from bit 0 to bit 3 and the sum bits lighting up, ending with "0101 = 5". Close with one line: below the gates there are transistors, switches driven by a voltage (about 1 volt in today's processors), switching billions of times per second. Link to the other sections with the core mini-markup-like plain anchors: `../porte-logiche/index.html` (porte logiche) and `../elettronica-base/index.html` (elettronica di base).

## Interaction (premium)
- A vertical ladder: seven rungs stacked; the current rung is expanded (code in a period-appropriate monospace box, year badge, explanation, "tradotto da: …" label towards the next rung); the others are compact rows showing name + year + a one-line preview. Clicking a rung opens it. Keyboard: the rungs are buttons in a list; ArrowUp/ArrowDown move between them; the current one has `aria-current="step"`.
- Controls in a `.pg-strumenti` bar: «▲ Sali», «▼ Scendi», «▶ Scendi fino agli elettroni» (autoplay that walks down with a pause per level), «↺ Ricomincia».
- Between rungs, a rail on the left with a glowing pulse that travels down to the next rung when you descend, labelled with the translator (interprete, compilatore, assemblatore, decodificatore, ALU). Use transform/opacity; use `ctx.anima`/`ctx.attendi` so it pauses offscreen.
- Level 7 shows an SVG adder (four full-adder boxes in a row with A/B input bits, carry arrows between boxes and sum outputs); the carry animation plays when the level opens, with a «Rivedi la somma» button.
- `ctx.completa()` when the user reaches level 7.
- Reduced motion: no travelling pulse, instant state changes, the adder shows its final state with the carry chain highlighted statically.
- It must fit nicely in the hero: on desktop ideally ≤ 640 px tall when a middle rung is open; code boxes scroll horizontally inside themselves if needed, never the page. On a 390 px phone it must look intentional (rungs full width, comfortable 40+ px targets).
- Visual language: the dark instrument (`--lab-*`, `--trace-*`). Give each level a subtle distinct tint along a gradient from warm (natural language) to electric green (gates), so the descent feels like going deeper into the machine.

## Tests
If you implement logic (adder, hex → binary strings, encodings), export it and test it: the adder adds all pairs of 4-bit numbers correctly; the binary row matches the hex bytes; the displacements match the example layout.
