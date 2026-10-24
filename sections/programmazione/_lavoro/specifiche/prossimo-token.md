# Item: lab «prossimo-token» (no chapter)

Your files: `js/lab/prossimo-token.js`, `test/prossimo-token.test.js`.
The chapter `ia` (written by another agent in parallel) includes this lab with the block `{ tipo: 'lab', id: 'prossimo-token', titolo: 'Il prossimo token', intro: '…' }`. Register the lab with `titolo: 'Il prossimo token'`. Do not edit the chapter file.

## Concept
Show honestly how a language model writes: one token at a time, choosing among probabilities. Use a real (toy) language model built in the browser, not a fake script:
- A small corpus of short Python snippets that greet, count and print (about 30–60 lines you write, in Italian where there are strings or comments, e.g. `print("Ciao, mondo!")`, `def saluta(nome):`, `for i in range(3):`…).
- A tokenizer that splits text into tokens (words, symbols, indentation, newlines; optionally sub-words for longer identifiers) with numeric ids, shown as coloured chips.
- An n-gram model (context of 2–3 tokens, with backoff to shorter contexts) whose probabilities come from counts in the corpus.

## Interaction (premium)
- A prompt area (a few presets like «def saluta(nome):», «for i in range(», «print(»), a generation area where tokens appear one at a time as chips/cursor, and a «prossimo token» panel with the top 5 candidates and animated probability bars; the chosen one flies into the text.
- Controls: «Un token», «▶ Genera» (until a newline budget or end), «↺», a temperature slider (0 = always the most likely; higher = more variety; show the effect on the bars live), a seed («Nuovo seme») so runs are repeatable.
- A «Come è diviso il testo» toggle showing the tokenization of the prompt and output with ids.
- A clear note: this is a toy model millions of times smaller than a real one; real models use Transformer networks with billions of parameters, but the loop "guess the next token, add it, repeat" is the same. Mention that the probabilities come from what the model saw (the corpus), which is also why models can produce wrong things with confidence.
- `ctx.completa()` after generating at least one line.
- Reduced motion: no flying chips, instant updates.

## Tests
Export the tokenizer, the model and the sampler; test: tokenize/detokenize round-trip; probabilities sum to 1; temperature 0 is greedy; same seed gives the same text; backoff works for unseen contexts.
