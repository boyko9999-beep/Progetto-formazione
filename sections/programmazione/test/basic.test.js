// Test del laboratorio «Un BASIC dell'epoca»: l'interprete BASIC (tokenizzatore, espressioni,
// istruzioni, schermo 40×25, esecuzione a fette) senza interfaccia.
// node --test sections/programmazione/test/basic.test.js
const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/lab/basic.js');

// Righe dello schermo dopo l'esecuzione, senza il «READY.» finale.
function uscita(sorgente, opzioni) {
  const r = B.esegui(sorgente, opzioni);
  const righe = r.righe.slice();
  if (righe[righe.length - 1] === 'READY.') righe.pop();
  return righe;
}

// Valore di un'espressione: la assegna a una variabile in modo diretto e la rilegge.
function valore(espressione, nome) {
  const v = nome || 'Z';
  const r = B.esegui(v + '=' + espressione);
  assert.strictEqual(r.errore, null, espressione + ': ' + (r.errore && r.errore.codice));
  return r.macchina.variabili.get(v);
}

function codiceErrore(sorgente, opzioni) {
  const r = B.esegui(sorgente, opzioni);
  return r.errore ? r.errore.codice : null;
}

test('il modulo si carica in Node senza DOM ed espone l\'interprete', () => {
  for (const k of ['tokenizza', 'formatta', 'stampaNumero', 'chr', 'asc', 'val', 'glifo', 'suggerisci', 'normalizza', 'creaSchermo', 'creaMacchina', 'esegui']) {
    assert.strictEqual(typeof B[k], 'function', 'manca ' + k);
  }
  assert.strictEqual(B.COLONNE, 40);
  assert.strictEqual(B.RIGHE, 25);
  assert.deepStrictEqual(Object.keys(B.ESEMPI), ['ciao', 'labirinto', 'tabellina', 'indovina']);
  assert.deepStrictEqual(Object.values(B.ESEMPI).map((e) => e.nome), ['Ciao', 'Labirinto', 'Tabellina', 'Indovina il numero']);
  assert.strictEqual(B.ESEMPI.ciao.sorgente, '10 PRINT "CIAO, MONDO"\n20 GOTO 10');
  assert.strictEqual(B.ESEMPI.labirinto.sorgente, '10 PRINT CHR$(205.5+RND(1)); : GOTO 10');
  for (const [codice, coppia] of Object.entries(B.ERRORI)) {
    assert.match(coppia[0], /^[A-Z' ]+$/, codice + ': il messaggio sullo schermo è in maiuscolo');
    assert.ok(coppia[1].length > 30, codice + ': manca la spiegazione in italiano');
    assert.ok(!/<\/?[a-z][^>]*>/i.test(coppia[1]), 'niente HTML nelle spiegazioni');
  }
});

test('tokenizzatore: parole chiave intere, numeri, testi, operatori e abbreviazioni', () => {
  const t = B.tokenizza('PRINT "CIAO";A$,2.5E3');
  assert.deepStrictEqual(t.map((k) => k.t), ['kw', 'str', ';', 'id', ',', 'num']);
  assert.strictEqual(t[1].v, 'CIAO');
  assert.strictEqual(t[3].v, 'A$');
  assert.strictEqual(t[5].v, 2500);
  // GOTO10 si legge GOTO 10, ma TOTALE e FORMA restano variabili
  assert.deepStrictEqual(B.tokenizza('GOTO10').map((k) => [k.t, k.v]), [['kw', 'GOTO'], ['num', 10]]);
  assert.deepStrictEqual(B.tokenizza('TOTALE=FORMA').map((k) => [k.t, k.v]), [['id', 'TOTALE'], ['op', '='], ['id', 'FORMA']]);
  assert.deepStrictEqual(B.tokenizza('CHR$(205.5+RND(1))').map((k) => k.v === undefined ? k.t : k.v), ['CHR$', '(', 205.5, '+', 'RND', '(', 1, ')', ')']);
  assert.deepStrictEqual(B.tokenizza('A<>B<=C>=D').filter((k) => k.t === 'op').map((k) => k.v), ['<>', '<=', '>=']);
  assert.deepStrictEqual(B.tokenizza('? 1')[0], { t: 'kw', v: 'PRINT' });
  const rem = B.tokenizza('REM NON SI ESEGUE : PRINT 1');
  assert.strictEqual(rem.length, 1);
  assert.strictEqual(rem[0].resto, ' NON SI ESEGUE : PRINT 1');
  assert.strictEqual(B.tokenizza('PRINT "SENZA FINE')[1].v, 'SENZA FINE', 'una stringa non chiusa finisce con la riga');
  assert.strictEqual(B.tokenizza('DIM A(3)')[0].assente, true, 'le parole che questo BASIC non conosce sono riconosciute');
  assert.throws(() => B.tokenizza("PRINT 'A'"), (e) => e.basic === 'SYNTAX' && /virgolette doppie/.test(e.dettaglio));
  assert.throws(() => B.tokenizza('PRINT 2 # 3'), (e) => e.basic === 'SYNTAX');
});

test('espressioni: precedenza e associatività come nei BASIC Microsoft', () => {
  const casi = [
    ['2+3*4', 14], ['(2+3)*4', 20], ['10-2-3', 5], ['7/2*2', 7], ['2*3^2', 18],
    ['-2^2', -4], ['2^3^2', 64], ['2^-1', 0.5], ['-3+5', 2], ['--3', 3], ['10/4', 2.5],
    ['1+2=3', -1], ['1+2<>3', 0], ['2<3', -1], ['3<=3', -1], ['4>=5', 0],
    ['3>2 AND 2>1', -1], ['3>2 AND 2>3', 0], ['1=2 OR 2=2', -1], ['NOT 1=2', -1], ['NOT 0', -1],
    ['5 OR 2', 7], ['12 AND 10', 8], ['1<2<3', -1], ['"B">"A"', -1], ['"ABC"="ABC"', -1],
  ];
  for (const [espr, atteso] of casi) assert.strictEqual(valore(espr), atteso, espr);
  assert.strictEqual(valore('"CIAO, "+"MONDO"', 'Z$'), 'CIAO, MONDO');
});

test('funzioni: RND, INT, ABS, LEN, CHR$ (205 e 206 sono le diagonali), ASC, STR$, LEFT$, RIGHT$, MID$', () => {
  assert.strictEqual(valore('INT(3.7)'), 3);
  assert.strictEqual(valore('INT(-3.5)'), -4, 'INT arrotonda verso il basso');
  assert.strictEqual(valore('ABS(-4)'), 4);
  assert.strictEqual(valore('SGN(-7)'), -1);
  assert.strictEqual(valore('SQR(16)'), 4);
  assert.strictEqual(valore('LEN("CIAO")'), 4);
  assert.strictEqual(valore('ASC("A")'), 65);
  assert.strictEqual(valore('VAL("12AB")'), 12);
  assert.strictEqual(valore('CHR$(65)', 'Z$'), 'A');
  assert.strictEqual(valore('CHR$(205)', 'Z$'), '╲');
  assert.strictEqual(valore('CHR$(206)', 'Z$'), '╱');
  assert.strictEqual(valore('CHR$(205.9)', 'Z$'), '╲', 'CHR$ perde i decimali');
  assert.strictEqual(valore('STR$(5)', 'Z$'), ' 5', 'STR$ tiene lo spazio del segno');
  assert.strictEqual(valore('STR$(-5)', 'Z$'), '-5');
  assert.strictEqual(valore('LEFT$("CIAO",2)', 'Z$'), 'CI');
  assert.strictEqual(valore('RIGHT$("CIAO",2)', 'Z$'), 'AO');
  assert.strictEqual(valore('MID$("CIAO",2,2)', 'Z$'), 'IA');
  assert.strictEqual(valore('MID$("CIAO",3)', 'Z$'), 'AO');
  assert.strictEqual(B.chr(205), '╲');
  assert.strictEqual(B.chr(206), '╱');
  assert.strictEqual(B.asc('╲'), 205);
  assert.strictEqual(B.asc('╱'), 206);
  // RND(1) usa il generatore della macchina; RND(0) ripete l'ultimo numero; RND(negativo) fissa il seme
  const r = B.esegui('A=RND(1):B=RND(0):C=RND(1)', { casuale: (() => { let k = 0; return () => [0.25, 0.75][k++ % 2]; })() });
  assert.deepStrictEqual(['A', 'B', 'C'].map((n) => r.macchina.variabili.get(n)), [0.25, 0.25, 0.75]);
  assert.strictEqual(valore('RND(-3)=RND(-3)'), -1, 'lo stesso seme dà lo stesso numero');
  for (let k = 0; k < 50; k++) {
    const x = valore('RND(1)');
    assert.ok(x >= 0 && x < 1, 'RND(1) sta tra 0 e 1');
  }
  assert.strictEqual(codiceErrore('PRINT LEN(5)'), 'TYPE');
  assert.strictEqual(codiceErrore('PRINT CHR$(256)'), 'QUANTITA');
  assert.strictEqual(codiceErrore('PRINT SQR(-1)'), 'QUANTITA');
  assert.strictEqual(codiceErrore('PRINT INT 5'), 'SYNTAX', 'le funzioni vogliono le parentesi');
});

test('formato dei numeri: spazio del segno, niente zero davanti alla virgola, esponenziale', () => {
  const casi = [
    [0, '0'], [7, '7'], [-5, '-5'], [2.5, '2.5'], [-0.5, '-.5'], [0.01, '.01'], [1 / 3, '.333333333'],
    [123456789, '123456789'], [1e9, '1E+09'], [1e10, '1E+10'], [0.001, '1E-03'], [2.5e20, '2.5E+20'],
    [3.14159265358979, '3.14159265'], [0.1 + 0.2, '.3'],
  ];
  for (const [n, atteso] of casi) assert.strictEqual(B.formatta(n), atteso, String(n));
  assert.strictEqual(B.stampaNumero(7), ' 7 ');
  assert.strictEqual(B.stampaNumero(-7), '-7 ');
});

test('PRINT: punto e virgola, virgola a zone di 10 colonne, punto e virgola finale, SPC e TAB', () => {
  assert.deepStrictEqual(uscita('PRINT "CIAO, MONDO"'), ['CIAO, MONDO']);
  assert.deepStrictEqual(uscita('PRINT 2+2'), [' 4']);
  assert.deepStrictEqual(uscita('PRINT "A";"B";1;-2'), ['AB 1 -2']);
  assert.deepStrictEqual(uscita('PRINT "A","B","C"'), ['A         B         C']);
  assert.deepStrictEqual(uscita('PRINT "A","B","C","D","E"'), ['A         B         C         D', 'E'], 'oltre la quarta zona si va a capo');
  assert.deepStrictEqual(uscita('10 PRINT "A";\n20 PRINT "B"'), ['AB'], 'il punto e virgola finale non va a capo');
  assert.deepStrictEqual(uscita('10 PRINT "A",\n20 PRINT "B"'), ['A         B']);
  assert.deepStrictEqual(uscita('10 PRINT\n20 PRINT "B"'), ['', 'B'], 'PRINT da solo lascia una riga vuota');
  assert.deepStrictEqual(uscita('X=5:PRINT "X=";X'), ['X= 5']);
  assert.deepStrictEqual(uscita('X=5:PRINT "X="X'), ['X= 5'], 'come allora, il separatore si può omettere');
  assert.deepStrictEqual(uscita('PRINT SPC(3);"X";TAB(10);"Y"'), ['   X      Y']);
  assert.deepStrictEqual(uscita('? "ABBREVIATO"'), ['ABBREVIATO'], '? vale PRINT');
  assert.deepStrictEqual(uscita('PRINT 1=1, 1=2'), ['-1         0'], 'vero vale -1, falso 0');
});

test('LET facoltativo, variabili numeriche e di testo, valori iniziali e tipi', () => {
  assert.deepStrictEqual(uscita('LET A=5:B=A*2:PRINT A;B'), [' 5  10']);
  assert.deepStrictEqual(uscita('A$="CIAO":B$=A$+" MONDO":PRINT B$'), ['CIAO MONDO']);
  assert.deepStrictEqual(uscita('PRINT Q;"[";Q$;"]"'), [' 0 []'], 'le variabili mai usate valgono 0 e il testo vuoto');
  assert.deepStrictEqual(uscita('TOTALE=3:TOT2=4:PRINT TOTALE+TOT2'), [' 7'], 'nomi lunghi e con cifre');
  assert.deepStrictEqual(uscita('PRINT "ciao"'), ['CIAO'], 'tutto in maiuscolo, come sugli home computer');
  const r = B.esegui('10 A$=5');
  assert.strictEqual(r.errore.codice, 'TYPE');
  assert.match(r.errore.dettaglio, /finisce con \$/);
  assert.strictEqual(codiceErrore('A="TESTO"'), 'TYPE');
  assert.strictEqual(codiceErrore('PRINT "A"+1'), 'TYPE');
  assert.strictEqual(codiceErrore('PRINT "A"*2'), 'TYPE');
  assert.strictEqual(codiceErrore('IF "A" THEN 10'), 'TYPE');
  assert.strictEqual(codiceErrore('PRINT 1<"A"'), 'TYPE');
});

test('GOTO: salti in avanti e indietro, GO TO, GOTO10, riga inesistente', () => {
  assert.deepStrictEqual(uscita('10 PRINT "A":GOTO 30\n20 PRINT "B"\n30 PRINT "C"'), ['A', 'C']);
  assert.deepStrictEqual(uscita('10 N=0\n20 N=N+1\n30 IF N<3 THEN GOTO 20\n40 PRINT N'), [' 3']);
  assert.deepStrictEqual(uscita('10 GO TO 30\n20 PRINT "NO"\n30 PRINT "SI"'), ['SI']);
  assert.deepStrictEqual(uscita('10 GOTO30\n20 PRINT "NO"\n30 PRINT "SI"'), ['SI']);
  const r = B.esegui('10 PRINT "A"\n20 GOTO 50');
  assert.deepStrictEqual(r.righe, ['A', '?UNDEF\'D STATEMENT ERROR IN 20', 'READY.']);
  assert.strictEqual(r.errore.riga, 20);
  assert.match(r.errore.dettaglio, /50/);
  assert.strictEqual(codiceErrore('10 GOTO A'), 'SYNTAX');
  assert.strictEqual(codiceErrore('10 GOTO 70000'), 'SYNTAX');
  assert.strictEqual(codiceErrore('10 GOTO 1.5'), 'SYNTAX');
});

test('IF…THEN: con un numero di riga, con un\'istruzione, con GOTO; se è falso salta il resto della riga', () => {
  assert.deepStrictEqual(uscita('10 A=1\n20 IF A=1 THEN 40\n30 PRINT "NO"\n40 PRINT "SALTO"'), ['SALTO']);
  assert.deepStrictEqual(uscita('10 IF 2>1 THEN PRINT "VERO"\n20 IF 2<1 THEN PRINT "FALSO"\n30 PRINT "FINE"'), ['VERO', 'FINE']);
  assert.deepStrictEqual(uscita('10 IF 1 GOTO 30\n20 PRINT "NO"\n30 PRINT "OK"'), ['OK']);
  assert.deepStrictEqual(uscita('10 IF 1 THEN GOTO 30\n20 PRINT "NO"\n30 PRINT "OK"'), ['OK']);
  assert.deepStrictEqual(uscita('10 A=0\n20 IF A=0 THEN PRINT "Z": PRINT "W"\n30 IF A=1 THEN PRINT "X": PRINT "Y"\n40 PRINT "E"'), ['Z', 'W', 'E'],
    'le istruzioni dopo THEN, anche dopo i due punti, valgono solo se la condizione è vera');
  assert.deepStrictEqual(uscita('10 A$="SI"\n20 IF A$="SI" THEN A=7\n30 PRINT A'), [' 7']);
  assert.deepStrictEqual(uscita('10 IF 5 THEN PRINT "UN NUMERO DIVERSO DA ZERO E\' VERO"'), ['UN NUMERO DIVERSO DA ZERO E\' VERO']);
  const r = B.esegui('10 IF 1 PRINT 1');
  assert.strictEqual(r.errore.codice, 'SYNTAX');
  assert.match(r.errore.dettaglio, /THEN/);
});

test('FOR…TO…STEP / NEXT: passi positivi, negativi e con la virgola, cicli annidati', () => {
  assert.deepStrictEqual(uscita('10 FOR I=1 TO 5\n20 PRINT I;\n30 NEXT I'), [' 1  2  3  4  5']);
  assert.deepStrictEqual(uscita('10 FOR I=10 TO 1 STEP -3\n20 PRINT I;\n30 NEXT'), [' 10  7  4  1']);
  assert.deepStrictEqual(uscita('FOR X=0 TO 1 STEP .25: PRINT X;: NEXT'), [' 0  .25  .5  .75  1'], 'anche in modo diretto, su una riga');
  assert.deepStrictEqual(uscita('10 FOR I=1 TO 2\n20 FOR J=1 TO 3\n30 PRINT I*J;\n40 NEXT J\n50 PRINT\n60 NEXT I'), [' 1  2  3', ' 2  4  6']);
  assert.deepStrictEqual(uscita('10 FOR I=1 TO 2: FOR J=1 TO 2: PRINT I;J;: NEXT J,I'), [' 1  1  1  2  2  1  2  2'], 'NEXT J,I chiude due cicli');
  assert.deepStrictEqual(uscita('FOR I=5 TO 1: PRINT I: NEXT'), [' 5'], 'come allora, il corpo si esegue almeno una volta');
  assert.deepStrictEqual(uscita('FOR I=1 TO 10: I=10: NEXT: PRINT I'), [' 11'], 'la variabile resta dopo il ciclo');
  assert.deepStrictEqual(uscita('10 FOR I=1 TO 3\n20 FOR I=1 TO 2\n30 PRINT I;\n40 NEXT I'), [' 1  2'], 'un FOR con la stessa variabile sostituisce il vecchio');
  assert.deepStrictEqual(uscita('10 FOR I=1 TO 3\n20 NEXT\n30 PRINT "FATTO";I'), ['FATTO 4']);
  const r = B.esegui('10 FOR I=1 TO 2\n20 NEXT J');
  assert.strictEqual(r.errore.codice, 'NEXT');
  assert.strictEqual(r.errore.riga, 20);
  assert.deepStrictEqual(r.righe, ['?NEXT WITHOUT FOR ERROR IN 20', 'READY.']);
  assert.strictEqual(codiceErrore('10 NEXT'), 'NEXT');
  assert.strictEqual(codiceErrore('10 FOR I=1 2'), 'SYNTAX');
  assert.strictEqual(codiceErrore('10 FOR A$=1 TO 2'), 'TYPE');
  assert.strictEqual(codiceErrore('10 FOR I=1 TO "A"'), 'TYPE');
});

test('GOSUB / RETURN: ritorno anche a metà riga, subroutine annidate, errori', () => {
  assert.deepStrictEqual(uscita('10 GOSUB 100\n20 PRINT "DOPO"\n30 END\n100 PRINT "SUB"\n110 RETURN'), ['SUB', 'DOPO']);
  assert.deepStrictEqual(uscita('10 GOSUB 100: PRINT "B"\n20 END\n100 PRINT "A";\n110 RETURN'), ['AB'], 'RETURN torna subito dopo il GOSUB');
  assert.deepStrictEqual(uscita('10 GOSUB 100\n20 END\n100 PRINT "1";\n110 GOSUB 200\n120 PRINT "3";\n130 RETURN\n200 PRINT "2";\n210 RETURN'), ['123']);
  assert.deepStrictEqual(uscita('10 FOR I=1 TO 3\n20 GOSUB 100\n30 NEXT\n40 END\n100 PRINT I;\n110 RETURN'), [' 1  2  3'], 'un GOSUB dentro un FOR');
  const r = B.esegui('10 RETURN');
  assert.deepStrictEqual(r.righe, ['?RETURN WITHOUT GOSUB ERROR IN 10', 'READY.']);
  const ricorsione = B.esegui('10 GOSUB 10');
  assert.strictEqual(ricorsione.errore.codice, 'MEMORIA', 'una subroutine che richiama se stessa esaurisce la pila');
  assert.ok(ricorsione.passi < 100, 'e si ferma presto');
  assert.strictEqual(codiceErrore('10 GOSUB 500'), 'UNDEF');
});

test('END, STOP e REM', () => {
  assert.deepStrictEqual(uscita('10 PRINT "A"\n20 END\n30 PRINT "NO"'), ['A']);
  assert.deepStrictEqual(B.esegui('10 STOP\n20 PRINT "NO"').righe, ['BREAK IN 10', 'READY.']);
  assert.deepStrictEqual(uscita('10 REM COMMENTO : PRINT "NO"\n20 PRINT "SI"'), ['SI'], 'REM ignora tutto il resto della riga');
  assert.deepStrictEqual(uscita('10 PRINT "A": REM DOPO I DUE PUNTI'), ['A']);
});

test('INPUT: punto interrogativo, risposta da una callback, ??, ?REDO FROM START, ?EXTRA IGNORED', () => {
  let chiesto = null;
  const r = B.esegui('10 INPUT "ETA";A\n20 PRINT A*2', { input: (prompt, voci) => { chiesto = [prompt, voci]; return '21'; } });
  assert.deepStrictEqual(chiesto, ['ETA', ['A']]);
  assert.deepStrictEqual(r.righe, ['ETA? 21', ' 42', 'READY.'], 'il messaggio è seguito da «? »');
  assert.deepStrictEqual(uscita('10 INPUT A\n20 PRINT A', { input: ['5'] }), ['? 5', ' 5']);
  assert.deepStrictEqual(uscita('10 INPUT "NOME";N$\n20 PRINT "CIAO ";N$', { input: ['martina'] }), ['NOME? MARTINA', 'CIAO MARTINA']);
  assert.deepStrictEqual(uscita('10 INPUT A,B\n20 PRINT A+B', { input: ['3,4'] }), ['? 3,4', ' 7']);
  assert.deepStrictEqual(uscita('10 INPUT A,B\n20 PRINT A+B', { input: ['3', '4'] }), ['? 3', '?? 4', ' 7'], '?? chiede i valori mancanti');
  assert.deepStrictEqual(uscita('10 INPUT A\n20 PRINT A', { input: ['CIAO', '7'] }), ['? CIAO', '?REDO FROM START', '? 7', ' 7']);
  assert.deepStrictEqual(uscita('10 INPUT A\n20 PRINT A', { input: ['1,2'] }), ['? 1,2', '?EXTRA IGNORED', ' 1']);
  assert.deepStrictEqual(uscita('10 INPUT A$\n20 PRINT A$', { input: ['"CIAO, MONDO"'] }), ['? "CIAO, MONDO"', 'CIAO, MONDO'], 'tra virgolette la virgola fa parte del testo');
  // senza risposta il programma resta in attesa
  const fermo = B.esegui('10 INPUT A\n20 PRINT A', { input: [] });
  assert.strictEqual(fermo.stato, 'attesa');
  assert.deepStrictEqual(fermo.macchina.attesa(), { prompt: '', voci: ['A'], raccolti: 0 });
  assert.strictEqual(fermo.eventi.filter((ev) => ev.tipo === 'input').length, 1);
  assert.strictEqual(fermo.macchina.rispondi('9'), true);
  assert.strictEqual(fermo.macchina.stato, 'esegue');
  fermo.macchina.passi(10);
  assert.strictEqual(fermo.macchina.stato, 'pronto');
  assert.strictEqual(fermo.macchina.variabili.get('A'), 9);
  // una risposta vuota ripete la domanda
  const m = B.creaMacchina();
  m.immetti('10 INPUT A');
  m.immetti('RUN');
  m.passi(5);
  assert.strictEqual(m.stato, 'attesa');
  m.rispondi('');
  assert.strictEqual(m.stato, 'attesa');
  assert.ok(m.eventi.some((ev) => ev.tipo === 'vuota'));
  assert.strictEqual(m.rispondi('1'), true);
  assert.strictEqual(m.rispondi('2'), false, 'fuori da un INPUT la risposta non conta');
  // INPUT solo dentro un programma
  const diretto = B.esegui('INPUT A');
  assert.strictEqual(diretto.errore.codice, 'DIRETTO');
  assert.deepStrictEqual(diretto.righe, ['?ILLEGAL DIRECT ERROR', 'READY.']);
});

test('errori nello stile dell\'epoca, con il numero di riga e una spiegazione in italiano', () => {
  const casi = [
    ['10 PRINT "A"\n20 PRNT "B"', 'SYNTAX', 20, '?SYNTAX ERROR IN 20', /Forse volevi scrivere PRINT/],
    ['10 PRINTA', 'SYNTAX', 10, '?SYNTAX ERROR IN 10', /Manca uno spazio dopo PRINT/],
    ['10 A=1/0', 'DIV0', 10, '?DIVISION BY ZERO ERROR IN 10', null],
    ['10 PRINT CHR$(300)', 'QUANTITA', 10, '?ILLEGAL QUANTITY ERROR IN 10', null],
    ['10 A=1E38*10', 'OVERFLOW', 10, '?OVERFLOW ERROR IN 10', null],
    ['10 PRINT (1+2', 'SYNTAX', 10, '?SYNTAX ERROR IN 10', /parentesi/],
    ['10 PRINT 1+', 'SYNTAX', 10, '?SYNTAX ERROR IN 10', /incompleta/],
    ['10 DIM A(10)', 'SYNTAX', 10, '?SYNTAX ERROR IN 10', /non lo conosce/],
    ['10 PRINT 1 THEN', 'SYNTAX', 10, '?SYNTAX ERROR IN 10', null],
    ['10 A$="X"\n20 FOR I=1 TO 300\n30 A$=A$+"X"\n40 NEXT', 'STRINGA', 30, '?STRING TOO LONG ERROR IN 30', null],
  ];
  for (const [sorgente, codice, riga, schermo, dettaglio] of casi) {
    const r = B.esegui(sorgente);
    assert.ok(r.errore, sorgente + ': manca l\'errore');
    assert.strictEqual(r.errore.codice, codice, sorgente);
    assert.strictEqual(r.errore.riga, riga, sorgente);
    assert.strictEqual(r.righe[r.righe.length - 2], schermo, sorgente);
    assert.strictEqual(r.righe[r.righe.length - 1], 'READY.', sorgente);
    if (dettaglio) assert.match(r.errore.dettaglio, dettaglio, sorgente);
    assert.ok(B.ERRORI[codice][1], 'spiegazione per ' + codice);
  }
  // in modo diretto il messaggio non ha il numero di riga
  assert.deepStrictEqual(B.esegui('PRINT 5/0').righe, ['?DIVISION BY ZERO ERROR', 'READY.']);
  // dopo un errore la macchina è di nuovo pronta e il programma resta in memoria
  const r = B.esegui('10 PRINT "A"\n20 GOTO 99', { comandi: ['RUN', 'LIST'] });
  assert.strictEqual(r.stato, 'pronto');
  assert.deepStrictEqual(r.righe.slice(-3), ['10 PRINT "A"', '20 GOTO 99', 'READY.']);
  assert.match(B.suggerisci('GOT'), /GOTO/);
  assert.match(B.suggerisci('XYZ'), /parola chiave/);
});

test('comandi: righe memorizzate in ordine, sostituite e cancellate; LIST, RUN n, NEW, CLS', () => {
  const m = B.creaMacchina({ schermo: B.creaSchermo(40, 25, { registra: true }) });
  assert.deepStrictEqual(m.immetti('30 PRINT "C"'), { tipo: 'memorizzata', numero: 30, nuova: true });
  m.immetti('10 PRINT "A"');
  m.immetti('20 print "b"');
  assert.deepStrictEqual(m.elenco(), ['10 PRINT "A"', '20 PRINT "B"', '30 PRINT "C"'], 'in ordine di numero, in maiuscolo');
  assert.deepStrictEqual(m.immetti('20 PRINT "Z"'), { tipo: 'memorizzata', numero: 20, nuova: false });
  assert.deepStrictEqual(m.immetti('20'), { tipo: 'cancellata', numero: 20, esisteva: true });
  assert.deepStrictEqual(m.immetti('25'), { tipo: 'cancellata', numero: 25, esisteva: false });
  assert.deepStrictEqual(m.elenco(), ['10 PRINT "A"', '30 PRINT "C"']);
  assert.strictEqual(m.righe, 2);
  assert.deepStrictEqual(m.immetti('   '), { tipo: 'vuota' });
  assert.strictEqual(m.immetti('70000 PRINT').codice, 'SYNTAX', 'numeri di riga fino a 63999');

  const lista = (cmd) => uscita('10 PRINT "A"\n20 PRINT "B"\n30 PRINT "C"', { comandi: [cmd] });
  assert.deepStrictEqual(lista('LIST'), ['10 PRINT "A"', '20 PRINT "B"', '30 PRINT "C"']);
  assert.deepStrictEqual(lista('LIST 20'), ['20 PRINT "B"']);
  assert.deepStrictEqual(lista('LIST 20-30'), ['20 PRINT "B"', '30 PRINT "C"']);
  assert.deepStrictEqual(lista('LIST -20'), ['10 PRINT "A"', '20 PRINT "B"']);
  assert.deepStrictEqual(lista('LIST 20-'), ['20 PRINT "B"', '30 PRINT "C"']);
  assert.deepStrictEqual(lista('RUN 20'), ['B', 'C']);
  assert.deepStrictEqual(uscita('10 PRINT "A"', { comandi: ['NEW', 'LIST'] }), ['READY.'], 'NEW svuota la memoria');
  assert.deepStrictEqual(uscita('10 PRINT X;:X=X+1', { comandi: ['X=5', 'RUN', 'RUN', 'PRINT X'] }), ['READY.', ' 0', 'READY.', ' 0', 'READY.', ' 1'],
    'RUN azzera le variabili; dopo la fine del programma restano leggibili in modo diretto');
  assert.deepStrictEqual(B.esegui('RUN').righe, ['READY.'], 'RUN senza programma');
  const cls = B.esegui('PRINT "A":CLS:PRINT "B"');
  assert.strictEqual(cls.schermo.testo().split('\n')[0], 'B', 'CLS pulisce lo schermo');
});

test('esecuzione a fette: passi(n) si ferma, un ciclo infinito non blocca, STOP dà BREAK IN n', () => {
  const m = B.creaMacchina();
  m.immetti('10 GOTO 10');
  assert.deepStrictEqual(m.immetti('RUN'), { tipo: 'diretta' });
  assert.strictEqual(m.stato, 'esegue');
  assert.strictEqual(m.passi(300), 300, 'esegue al massimo le istruzioni richieste');
  assert.strictEqual(m.stato, 'esegue', 'e poi restituisce il controllo');
  assert.deepStrictEqual(m.immetti('PRINT 1'), { tipo: 'occupato' }, 'mentre gira non accetta righe');
  assert.strictEqual(m.rigaCorrente(), 10);
  assert.strictEqual(m.ferma(), true);
  assert.strictEqual(m.stato, 'pronto');
  assert.deepStrictEqual(m.schermo.testo().split('\n').filter(Boolean), ['BREAK IN 10', 'READY.']);
  assert.strictEqual(m.ferma(), false, 'fermare una macchina già ferma non fa nulla');
  const ev = m.eventi.find((x) => x.tipo === 'break');
  assert.ok(ev && ev.riga === 10 && ev.programma);
  // il tetto di costo: far scorrere lo schermo costa più di un calcolo
  const c = B.creaMacchina();
  c.immetti('10 PRINT "RIGA"');
  c.immetti('20 GOTO 10');
  c.immetti('RUN');
  c.passi(100, 50);
  assert.ok(c.costo - 1 <= 50 + 9, 'non supera il tetto di più di un passo');
  assert.strictEqual(c.stato, 'esegue');
  // il limite di passi di esegui: un ciclo infinito resta in esecuzione, ma il test finisce
  const r = B.esegui('10 PRINT "CIAO, MONDO"\n20 GOTO 10', { passiMax: 500 });
  assert.strictEqual(r.stato, 'esegue');
  assert.strictEqual(r.passi, 500);
  assert.ok(r.righe.filter((x) => x === 'CIAO, MONDO').length > 100);
  assert.ok(r.macchina.contatore > 300 && r.macchina.contatore <= 500, 'i passi contano anche il passaggio alla riga successiva');
});

test('schermo 40×25: a capo automatico, scorrimento verso l\'alto, CHR$(147) pulisce', () => {
  const s = B.creaSchermo(40, 25, { registra: true });
  s.scrivi('X'.repeat(40));
  assert.deepStrictEqual([s.cx, s.cy], [40, 0], 'dopo il quarantesimo carattere il cursore resta in sospeso');
  s.scrivi('Y');
  assert.deepStrictEqual([s.cx, s.cy], [1, 1]);
  for (let k = 0; k < 30; k++) s.scrivi('\n');
  assert.strictEqual(s.cy, 24);
  assert.ok(s.scorrimenti > 0);
  assert.strictEqual(s.celle.length, 25);
  assert.ok(s.celle.every((r) => r.length === 40));
  s.scrivi('CIAO\f');
  assert.deepStrictEqual([s.cx, s.cy], [0, 0]);
  assert.strictEqual(s.testo().trim(), '');
  const lungo = B.esegui('PRINT "' + 'AB'.repeat(25) + '"');
  assert.deepStrictEqual(lungo.righe.slice(0, 2), ['AB'.repeat(20), 'AB'.repeat(5)]);
});

test('normalizza e memoria: maiuscole, righe di 80 caratteri, byte liberi, OUT OF MEMORY', () => {
  assert.strictEqual(B.normalizza('10 print "ciao"  '), '10 PRINT "CIAO"');
  assert.strictEqual(B.normalizza('a\tb'), 'A B');
  assert.strictEqual(B.normalizza('X'.repeat(200)).length, B.LUNGHEZZA_RIGA);
  const m = B.creaMacchina();
  assert.strictEqual(m.liberi(), B.MEMORIA);
  m.immetti('10 PRINT "CIAO"');
  assert.strictEqual(m.liberi(), B.MEMORIA - (12 + 5));
  let r = null;
  for (let n = 1; n < 2000 && !(r && r.codice); n++) r = m.immetti(n * 10 + ' REM ' + 'X'.repeat(60));
  assert.strictEqual(r.codice, 'MEMORIA', 'un programma troppo lungo riempie la memoria');
  assert.ok(m.liberi() >= 0);
});

test('gli esempi del laboratorio girano come promesso', () => {
  // Ciao: il saluto si ripete finché non si preme STOP
  const ciao = B.esegui(B.ESEMPI.ciao.sorgente, { passiMax: 400 });
  assert.strictEqual(ciao.stato, 'esegue');
  assert.ok(ciao.righe.filter((x) => x === 'CIAO, MONDO').length >= 100);
  assert.strictEqual(ciao.errore, null);
  // Labirinto: solo diagonali ╲ e ╱, 40 per riga, senza andare a capo da sole
  let k = 0;
  const lab = B.esegui(B.ESEMPI.labirinto.sorgente, { passiMax: 2000, casuale: () => [0.1, 0.7, 0.4, 0.9][k++ % 4] });
  assert.strictEqual(lab.errore, null);
  const testo = lab.schermo.testo().replace(/\n/g, '');
  assert.match(testo, /^[╲╱]+$/);
  assert.ok(testo.includes('╲') && testo.includes('╱'));
  assert.ok(lab.schermo.testo().split('\n').every((r) => r.length === 0 || r.length === 40));
  // Tabellina del 7
  assert.deepStrictEqual(uscita(B.ESEMPI.tabellina.sorgente), Array.from({ length: 10 }, (_, i) => ' 7 X ' + (i + 1) + ' = ' + 7 * (i + 1)));
  // Indovina il numero: con RND fisso il numero segreto è 43
  const gioco = B.esegui(B.ESEMPI.indovina.sorgente, { casuale: () => 0.42, input: ['50', '20', '43'] });
  assert.strictEqual(gioco.errore, null);
  assert.deepStrictEqual(gioco.righe, [
    'PENSO A UN NUMERO DA 1 A 100',
    'PROVA? 50', 'TROPPO ALTO',
    'PROVA? 20', 'TROPPO BASSO',
    'PROVA? 43',
    'BRAVO! IN 3 TENTATIVI',
    'READY.',
  ]);
  // ogni esempio è fatto di righe numerate che stanno nello schermo
  for (const es of Object.values(B.ESEMPI)) {
    for (const riga of es.sorgente.split('\n')) {
      assert.match(riga, /^\d+ /);
      assert.ok(riga.length <= B.LUNGHEZZA_RIGA);
    }
    assert.ok(es.nota && !/<\/?[a-z][^>]*>/i.test(es.nota));
  }
});

test('eventi per l\'interfaccia: run, input, fine con il conteggio delle istruzioni', () => {
  const r = B.esegui('10 INPUT A\n20 PRINT A', { input: ['3'] });
  const tipi = r.eventi.map((ev) => ev.tipo);
  assert.deepStrictEqual(tipi, ['run', 'input', 'fine']);
  assert.deepStrictEqual(r.eventi[0], { tipo: 'run', righe: 2, da: 10 });
  assert.strictEqual(r.eventi[2].istruzioni, 2);
  assert.strictEqual(r.eventi[2].programma, true);
  const d = B.esegui('PRINT 1');
  assert.deepStrictEqual(d.eventi.map((ev) => ev.tipo), ['diretta']);
});

test('carattere bitmap 8×8: un disegno per ogni carattere, accenti tolti, il resto è un rettangolino', () => {
  assert.strictEqual(B.BITMAP.length, Array.from(B.CARATTERI).length * 8);
  assert.ok(B.BITMAP.every((b) => Number.isInteger(b) && b >= 0 && b <= 255));
  const A = B.glifo('A');
  assert.ok(A >= 0 && B.CARATTERI[A] === 'A');
  assert.strictEqual(B.glifo('é'), B.glifo('E'), 'le lettere accentate perdono l\'accento');
  assert.strictEqual(B.glifo('“'), B.glifo('"'));
  assert.strictEqual(B.glifo('€'), Array.from(B.CARATTERI).length - 1);
  for (const ch of '╲╱') assert.notStrictEqual(B.glifo(ch), Array.from(B.CARATTERI).length - 1, ch + ' ha il suo disegno');
  // il disegno di una diagonale tocca davvero gli angoli opposti
  const g = B.glifo('╲');
  const righe = B.BITMAP.slice(g * 8, g * 8 + 8);
  assert.ok(righe[0] & 0x80, '╲ comincia in alto a sinistra');
  assert.ok(righe[7] & 0x01, '╲ finisce in basso a destra');
});
