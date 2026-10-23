// Test degli schermi d'epoca: parti pure (carattere 5×7, nastro telegrafico, colorazione)
// e controllo dei dati «ciao» di ogni capitolo rispetto allo schermo che li mostra.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const BASE = path.join(__dirname, '..');

// Carica i file come fa index.html, così i capitoli sono registrati.
delete globalThis.ProgStoria;
const html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
for (const rel of [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1])) {
  const f = path.join(BASE, rel);
  delete require.cache[require.resolve(f)];
  require(f);
}
const S = require('../js/schermi.js');
const { capitoli, schermi } = globalThis.ProgStoria.dati();
const TIPI = ['jacquard', 'nastro', 'williams', 'telescrivente', 'foglio', 'scheda', 'tabulato', 'terminale', 'home', 'mac', 'browser', 'editor', 'chat'];

test('ci sono tutti e 13 gli schermi d\'epoca', () => {
  assert.deepStrictEqual(Object.keys(schermi).sort(), TIPI.slice().sort());
});

test('il carattere 5×7 ha 7 righe da 5 punti per ogni segno', () => {
  for (const [c, g] of Object.entries(S.FONT)) assert.match(g, /^([01]{5} ){6}[01]{5}$/, 'glifo ' + c);
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?"\'-+*/=()<>:;') assert.ok(S.FONT[c], 'manca ' + c);
});

test('bitmap: 6 colonne per lettera, senza accenti', () => {
  const b = S.bitmap('Ciao');
  assert.strictEqual(b.length, 7);
  assert.strictEqual(b[0].length, 23);
  assert.deepStrictEqual(b[0].slice(0, 5), [0, 1, 1, 1, 0]);
  assert.deepStrictEqual(S.bitmap('è'), S.bitmap('E'));
  assert.strictEqual(S.perFont('a~b'), 'A B');
});

test('aCapo: righe corte senza spezzare le parole', () => {
  assert.deepStrictEqual(S.aCapo('CIAO MONDO', 5), ['CIAO', 'MONDO']);
  assert.deepStrictEqual(S.aCapo('CIAO A TE', 5), ['CIAO', 'A TE']);
  assert.deepStrictEqual(S.aCapo('ABCDEFGH', 5), ['ABCDE', 'FGH']);
});

test('nastro a 5 fori: lettere, cifre e cambi di registro', () => {
  const { codici, righe } = S.ita2('Ciao 10\nOK');
  assert.deepStrictEqual(codici, ['11111', '01110', '01100', '11000', '00011', '00100', '11011', '11101', '01101', '00010', '01000', '11111', '00011', '11110']);
  assert.strictEqual(codici.length, righe.length);
  assert.deepStrictEqual(righe.slice(-3), [1, 1, 1]);
});

test('colorazione del codice', () => {
  const tipi = (r, l) => S.colora(r, l).filter(([t]) => t).map(([t, v]) => t + ':' + v);
  assert.deepStrictEqual(tipi('fn main() {'), ['kw:fn', 'fn:main']);
  assert.deepStrictEqual(tipi('    println!("Ciao, mondo!"); // saluto'), ['mac:println!', 'str:"Ciao, mondo!"', 'com:// saluto']);
  assert.deepStrictEqual(tipi('print("x")  # commento', 'python'), ['kw:print', 'str:"x"', 'com:# commento']);
  assert.strictEqual(S.colora('let x = 42;').map(([, v]) => v).join(''), 'let x = 42;');
});

test('terminale: file, comandi e uscita in ordine', () => {
  const p = S.passiTerminale({ file: 'ciao.c', codice: 'main(){}\n', comandi: ['$ cc ciao.c', 'a.out'], uscita: 'ciao' });
  assert.deepStrictEqual(p, [
    { tipo: 'cmd', testo: 'cat ciao.c' }, { tipo: 'out', testo: 'main(){}' },
    { tipo: 'cmd', testo: 'cc ciao.c' }, { tipo: 'cmd', testo: 'a.out' }, { tipo: 'out', testo: 'ciao' },
  ]);
  assert.strictEqual(S.passiTerminale({ codice: 'x', uscita: 'y' }, false)[0].tipo, 'out');
});

test('il controllo dei dati segnala gli errori tipici', () => {
  assert.deepStrictEqual(S.controlla('jacquard', { uscita: 'CIAO' }), []);
  assert.ok(S.controlla('jacquard', { uscita: 'CIAO A TUTTO IL MONDO' }).length);
  assert.ok(S.controlla('scheda', { codice: 'X'.repeat(81) }).some((e) => /80 colonne/.test(e)));
  assert.ok(S.controlla('scheda', { codice: 'PRINT ~' }).some((e) => /029/.test(e)));
  assert.ok(S.controlla('home', { codice: 'PRINT "CIAO"', uscita: 'CIAO' }).some((e) => /numero/.test(e)));
  assert.ok(S.controlla('browser', { codice: 'solo testo' }).length);
  assert.ok(S.controlla('chat', { prompt: 'x' }).length);
});

for (const cap of capitoli.filter((c) => c.ciao)) {
  const tipo = cap.ciao.schermo || cap.epoca;
  test('i dati «ciao» del capitolo ' + cap.numero + ' vanno bene per lo schermo ' + tipo, () => {
    assert.deepStrictEqual(S.controlla(tipo, cap.ciao), []);
  });
}
