# Item: chapter 13 «ia» + lab «percettrone»

Your files: `js/capitoli/13-ia.js`, `js/lab/percettrone.js`, `js/figure/ia.js`, `test/percettrone.test.js`.
Another agent builds the lab `prossimo-token` (file `js/lab/prossimo-token.js`) in parallel: you include its block in the chapter (`{ tipo: 'lab', id: 'prossimo-token', titolo: 'Il prossimo token', intro: '…' }`) at the right point of the story, but you do not edit its file.
Keep: id 'ia', numero 13, anni '1943–2026', anno: 2012, titolo 'Quando il software impara', sottotitolo 'Dal percettrone ai modelli linguistici: programmare con gli esempi e con le parole', epoca 'chat'.

## Content to cover (verify; be neutral, precise, not promotional)
- Warren McCulloch and Walter Pitts (1943): the artificial neuron as a threshold logic unit: a neuron is a logic gate (link `../porte-logiche/index.html`).
- Turing's «Computing Machinery and Intelligence» (1950); the Dartmouth workshop (1956; the 1955 proposal by McCarthy, Minsky, Rochester and Shannon coins "artificial intelligence"); symbolic AI, LISP (link [capitolo 5](#fortran)), ELIZA (Joseph Weizenbaum, 1966).
- Frank Rosenblatt's perceptron (1957–1958; the Mark I Perceptron with 400 photocells): a machine that learns from examples.
- Minsky and Papert's «Perceptrons» (1969) and the limits of a single layer (XOR); the AI winters.
- Expert systems in the 1980s (rules written by hand); backpropagation popularized by Rumelhart, Hinton and Williams (1986); Yann LeCun's networks reading handwritten digits (late 1980s–1990s); Deep Blue beats Kasparov (1997) by search, not learning.
- Data and GPUs: ImageNet (Fei-Fei Li), AlexNet wins in 2012 using GPUs; "Software 2.0" (Andrej Karpathy, 2017): programs as learned weights. Link to GPUs/hardware (`../storia-pc/index.html`).
- AlphaGo beats Lee Sedol (March 2016).
- The Transformer: «Attention Is All You Need» (Vaswani et al., 2017).
- Language models: GPT-2 (2019), GPT-3 (2020); GitHub Copilot (2021), ChatGPT (30 November 2022); since then many models and coding assistants, up to agents that edit code and run tests (2024–2026); "vibe coding" (Karpathy, February 2025). Name products sparingly and neutrally.
- What changes for programmers: from writing every instruction to describing intent, reviewing, testing; limits: hallucinations, security, responsibility; why understanding the fundamentals (this whole encyclopedia) still matters. Close the circle: even a sentence in Italian ends up as transistors switching: link [la scala dell'astrazione](#inizio).

Suggested flow: testo (1943: a neuron is a logic gate), testo (Dartmouth and symbolic AI), testo (the perceptron), lab percettrone, testo (winters and expert systems), testo (backpropagation, data, GPUs, 2012), figura rete-neurale, citazione (verified), testo (Transformers and language models), figura attenzione, lab prossimo-token (block with titolo «Il prossimo token» and an intro of your own), testo (programming with words: what changes, what doesn't), sapevi, ciao.

`ciao`: { anno: 2023, linguaggio: 'Italiano, rivolto a un modello linguistico', prompt: 'Scrivi un programma che saluti il mondo in italiano.', risposta: 'Ecco un programma in Python che stampa il saluto:', codice: 'print("Ciao, mondo!")', uscita: 'Ciao, mondo!', nota: the program is asked for in words, but the code still has to be read, tested and understood }.
Protagonisti: Warren McCulloch, Walter Pitts, Frank Rosenblatt, Marvin Minsky, Geoffrey Hinton, Fei-Fei Li, Yann LeCun (6–8 cards).
Glossary terms you own: intelligenza artificiale, neurone artificiale, percettrone, rete neurale, apprendimento automatico, addestramento, peso, deep learning, GPU, Transformer, modello linguistico, token di un modello linguistico, prompt, allucinazione, agente. (Use `{{token di un modello linguistico|token}}`: the plain term "token" belongs to chapter 5, where it means a lexical unit.)

## Lab «percettrone» (title: «Il percettrone che impara»)
- A single perceptron with two inputs x1, x2 ∈ {0, 1}, weights w1, w2, bias b and a step activation. Training sets: the truth tables of AND, OR and XOR (segmented control).
- Left: the neuron diagram (inputs → weighted edges whose thickness/colour follow the weights → sum → step → output), with live numbers. Right: a 2-D plot with the four points (filled/empty by target) and the decision line w1·x1 + w2·x2 + b = 0 that moves smoothly at every update; regions shaded by the predicted class.
- Controls: «Un esempio» (one perceptron-rule update: w ← w + η (t − y) x), «Un'epoca», «▶ Addestra» (until no errors or a max number of epochs), «↺ Pesi casuali» (seeded), learning-rate slider. Epoch and error counters; the current example highlighted in the truth table.
- AND and OR converge; XOR never does: after N epochs show a message on Minsky and Papert and the AI winter, and a button «La soluzione: due strati» that reveals a tiny two-layer network with hand-set weights computing XOR (OR and NAND feeding an AND).
- Bridge: «un percettrone con i pesi giusti è una porta logica».
- `ctx.completa()` after AND or OR has been learnt and XOR attempted.
- Export the model and training functions; test that AND and OR converge, XOR does not within N epochs, and the two-layer network computes XOR.

## Figures (`js/figure/ia.js`)
- `rete-neurale`: a feed-forward network (3–4 layers) with activations flowing through it (subtle pulses along the edges).
- `attenzione`: the words of an Italian sentence with attention arcs between them whose thickness shows the weights (e.g. «Il gatto non ha attraversato la strada perché era troppo stanco»: «era» attends to «gatto»).
