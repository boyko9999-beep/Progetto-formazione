// Test del capitolo 3 della Storia del PC (I primi personal computer):
// il piccolo Intel 8080, il pannello dell'Altair 8800, i programmi, le missioni e i contenuti.
// Da eseguire con: node --test tests/storia-pc-03-primi-pc.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../sections/storia-pc/js/modelli/03-primi-pc.js');

const SOMMA = M.PROGRAMMA_SOMMA;
const KILLBIT = M.PROGRAMMA_KILLBIT;

// Generatore pseudocasuale con seme, per test ripetibili.
function rngConSeme(seme) {
  let s = seme >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Carica il programma come farebbe una persona al pannello.
function carica(alt, prog) {
  M.sequenzaInserimento(prog).forEach((p) => {
    const ev = M.applica(alt, p);
    assert.ok(ev.ok, 'operazione ' + p.op + ' rifiutata');
  });
}

// Deposita i due numeri della somma: EXAMINE 200, DEPOSIT, DEPOSIT NEXT.
function numeri(alt, a, b) {
  alt.impostaInterruttori(0o200);
  assert.ok(alt.examine().ok);
  alt.impostaInterruttori(a);
  assert.ok(alt.deposit().scritto);
  alt.impostaInterruttori(b);
  assert.ok(alt.depositNext().scritto);
}

// Esegue finché la condizione non è vera (o finché non scade il tempo).
function eseguiFinche(alt, cond, massimo) {
  let tot = 0;
  while (!cond() && tot < (massimo || 5e6)) tot += alt.esegui(1000).stati || 1000;
  return tot;
}

/* ---------- formattazione ---------- */

test('ottale, binario e decimale', () => {
  assert.strictEqual(M.ottale(58), '072');
  assert.strictEqual(M.ottale(0), '000');
  assert.strictEqual(M.ottale(255), '377');
  assert.strictEqual(M.ottale(8, 3), '010');
  assert.strictEqual(M.binario(58), '00 111 010');
  assert.strictEqual(M.binario(0o107), '01 000 111');
  assert.strictEqual(M.binario(130, 16), '0 000 000 010 000 010');
  assert.strictEqual(M.daOttale('072'), 58);
  assert.strictEqual(M.daOttale('202'), 130);
  assert.ok(Number.isNaN(M.daOttale('089')), '8 e 9 non esistono in ottale');
  assert.strictEqual(M.ottaleIndirizzo(130), '202');
  assert.strictEqual(M.ottaleIndirizzo(256), '000400');
  for (let v = 0; v < 256; v++) assert.strictEqual(M.daOttale(M.ottale(v)), v);
});

/* ---------- programmi ---------- */

test('il programma del manuale: 14 byte, gli stessi del manuale MITS', () => {
  assert.deepStrictEqual(M.byteProgramma(SOMMA),
    [0o072, 0o200, 0o000, 0o107, 0o072, 0o201, 0o000, 0o200, 0o062, 0o202, 0o000, 0o303, 0o000, 0o000]);
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  const testi = SOMMA.istruzioni.map((i) => alt.istruzioneA(i.indirizzo).testo);
  assert.deepStrictEqual(testi, ['LDA 200', 'MOV B,A', 'LDA 201', 'ADD B', 'STA 202', 'JMP 000']);
  SOMMA.istruzioni.forEach((i) => assert.strictEqual(alt.istruzioneA(i.indirizzo).lunghezza, i.byte.length));
});

test('Kill the Bit: 24 byte, indirizzi consecutivi e listato coerente', () => {
  const b = M.byteProgramma(KILLBIT);
  assert.strictEqual(b.length, 24);
  let atteso = 0;
  KILLBIT.istruzioni.forEach((i) => { assert.strictEqual(i.indirizzo, atteso); atteso += i.byte.length; });
  const alt = M.creaAltair();
  carica(alt, KILLBIT);
  KILLBIT.istruzioni.forEach((i) => assert.strictEqual(alt.istruzioneA(i.indirizzo).testo, i.testo));
  const righe = M.elenco(KILLBIT);
  assert.strictEqual(righe.length, 24);
  assert.ok(righe.every((r, k) => r.indirizzo === k));
});

/* ---------- pannello: EXAMINE, DEPOSIT, NEXT, RESET ---------- */

test('EXAMINE carica l\'indirizzo degli interruttori e mostra il contenuto sui LED dati', () => {
  const alt = M.creaAltair();
  alt.mem[0o200] = 0o123;
  alt.impostaInterruttori(0o200);
  const ev = alt.examine();
  assert.ok(ev.ok);
  assert.strictEqual(ev.indirizzo, 0o200);
  const l = alt.luci();
  assert.strictEqual(l.indirizzo, 0o200);
  assert.strictEqual(l.dati, 0o123);
  // CPU ferma sul ciclo M1: accese MEMR, M1, WO (lettura) e WAIT.
  assert.deepStrictEqual([l.stato.MEMR, l.stato.M1, l.stato.WO, l.stato.WAIT, l.stato.HLTA], [1, 1, 1, 1, 0]);
  assert.strictEqual(alt.r.pc, 0o200, 'EXAMINE sposta davvero il contatore di programma');
});

test('EXAMINE NEXT passa alla cella successiva', () => {
  const alt = M.creaAltair();
  alt.mem[5] = 7;
  alt.mem[6] = 9;
  alt.impostaInterruttori(5);
  alt.examine();
  const ev = alt.examineNext();
  assert.strictEqual(ev.indirizzo, 6);
  assert.strictEqual(alt.luci().dati, 9);
  assert.strictEqual(alt.examineNext().indirizzo, 7);
});

test('DEPOSIT scrive gli interruttori 7-0 nella cella corrente; DEPOSIT NEXT avanza e scrive', () => {
  const alt = M.creaAltair();
  alt.impostaInterruttori(0o40);
  alt.examine();
  alt.impostaInterruttori(0o177400 | 0o072); // gli interruttori 15-8 non contano per i dati
  const d = alt.deposit();
  assert.ok(d.scritto);
  assert.strictEqual(alt.mem[0o40], 0o072);
  assert.strictEqual(alt.indirizzoMostrato(), 0o40, 'DEPOSIT non cambia indirizzo');
  assert.strictEqual(alt.luci().dati, 0o072);
  alt.impostaInterruttori(0o200);
  const n = alt.depositNext();
  assert.strictEqual(n.indirizzo, 0o41);
  assert.strictEqual(alt.mem[0o41], 0o200);
  assert.strictEqual(alt.mem[0o40], 0o072, 'la cella precedente resta com\'era');
});

test('RESET azzera il contatore di programma ma non la memoria', () => {
  const alt = M.creaAltair();
  alt.mem[0] = 0o111;
  alt.impostaInterruttori(0o150);
  alt.examine();
  const ev = alt.reset();
  assert.ok(ev.ok);
  assert.strictEqual(alt.r.pc, 0);
  assert.strictEqual(alt.luci().indirizzo, 0);
  assert.strictEqual(alt.luci().dati, 0o111);
});

test('oltre i 256 byte non c\'è memoria: si legge 377 e le scritture si perdono', () => {
  const alt = M.creaAltair();
  alt.impostaInterruttori(0o400);
  const ev = alt.examine();
  assert.strictEqual(ev.dato, 0o377);
  alt.impostaInterruttori(0o055);
  const d = alt.deposit();
  assert.strictEqual(d.scritto, false);
  assert.strictEqual(d.motivo, 'fuori-memoria');
});

test('PROTECT impedisce le scritture, UNPROTECT le permette di nuovo', () => {
  const alt = M.creaAltair();
  alt.protect();
  assert.strictEqual(alt.luci().stato.PROT, 1);
  alt.impostaInterruttori(0o033);
  const d = alt.deposit();
  assert.strictEqual(d.scritto, false);
  assert.strictEqual(d.motivo, 'protetta');
  assert.strictEqual(alt.mem[0], 0);
  alt.unprotect();
  assert.ok(alt.deposit().scritto);
  assert.strictEqual(alt.mem[0], 0o033);
});

test('mentre la CPU gira il pannello non tocca la memoria', () => {
  const alt = M.creaAltair();
  alt.run();
  for (const az of ['examine', 'examineNext', 'deposit', 'depositNext', 'singleStep']) {
    const ev = alt[az]();
    assert.strictEqual(ev.ok, false, az);
    assert.strictEqual(ev.motivo, 'in-esecuzione', az);
  }
  assert.ok(alt.stop().ok);
  assert.ok(alt.examine().ok);
});

test('spento non risponde; alla riaccensione la memoria contiene valori casuali', () => {
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  alt.spegni();
  assert.strictEqual(alt.examine().motivo, 'spento');
  assert.strictEqual(alt.run().ok, false);
  assert.strictEqual(alt.luci().stato.WAIT, 0);
  alt.accendi(rngConSeme(42));
  assert.strictEqual(alt.r.pc, 0);
  assert.strictEqual(alt.inEsecuzione, false);
  assert.ok(!M.programmaPresente(alt, SOMMA), 'il programma è andato perso');
  const diversi = new Set(Array.from(alt.mem)).size;
  assert.ok(diversi > 100, 'valori sparsi: ' + diversi);
});

/* ---------- il programma del manuale, eseguito davvero ---------- */

test('la procedura del manuale produce M[202] = M[200] + M[201] (modulo 256)', () => {
  const coppie = [[5, 8], [0, 0], [0o377, 1], [200, 100], [127, 128], [0o123, 0o45]];
  for (const [a, b] of coppie) {
    const alt = M.creaAltair();
    carica(alt, SOMMA);
    assert.ok(M.programmaPresente(alt, SOMMA));
    numeri(alt, a, b);
    alt.reset();
    alt.run();
    alt.esegui(10000);
    alt.stop();
    alt.impostaInterruttori(0o202);
    const ev = alt.examine();
    assert.strictEqual(ev.dato, (a + b) & 255, a + ' + ' + b);
    assert.strictEqual(alt.luci().dati, (a + b) & 255);
  }
});

test('un giro del programma dura 58 stati di clock: circa 34.000 somme al secondo', () => {
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  numeri(alt, 5, 8);
  alt.reset();
  let stati = 0;
  do {
    const prima = alt.istruzioni;
    while (alt.istruzioni === prima) {
      const ev = alt.singleStep();
      assert.ok(ev.ok);
      stati += ev.prima.stati;
    }
  } while (alt.r.pc !== 0);
  assert.strictEqual(stati, 58);
  assert.strictEqual(alt.mem[0o202], 13);
  assert.strictEqual(Math.round(M.FREQUENZA / 58), 34483);
});

test('SINGLE STEP avanza di un ciclo macchina: LDA ne fa quattro, STA scrive all\'ultimo', () => {
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  numeri(alt, 5, 8);
  alt.reset();
  const cicli = alt.cicliIstruzione();
  assert.deepStrictEqual(cicli.map((c) => c.tipo), ['codice', 'lettura', 'lettura', 'lettura']);
  assert.deepStrictEqual(cicli.map((c) => c.indirizzo), [0, 1, 2, 0o200]);
  assert.deepStrictEqual(cicli.map((c) => c.dato), [0o072, 0o200, 0, 5]);
  assert.deepStrictEqual(cicli.map((c) => c.stati), [4, 3, 3, 3]);
  alt.r.a = 0;
  for (let i = 1; i <= 3; i++) {
    const ev = alt.singleStep();
    assert.strictEqual(ev.completata, false);
    assert.strictEqual(alt.r.a, 0, 'A cambia solo alla fine dell\'istruzione');
    assert.strictEqual(alt.luci().stato.M1, 0, 'dopo il primo ciclo non è più M1');
  }
  assert.strictEqual(alt.luci().indirizzo, 0o200);
  const fine = alt.singleStep();
  assert.strictEqual(fine.completata, true);
  assert.strictEqual(alt.r.a, 5);
  assert.strictEqual(alt.luci().indirizzo, 3, 'ora aspetta il codice di MOV B,A');
  // MOV B,A (1 ciclo), LDA 201 (4), ADD B (1): poi STA 202.
  for (let i = 0; i < 6; i++) alt.singleStep();
  const sta = alt.cicliIstruzione();
  assert.deepStrictEqual(sta.map((c) => c.tipo), ['codice', 'lettura', 'lettura', 'scrittura']);
  alt.singleStep(); alt.singleStep(); alt.singleStep();
  const l = alt.luci();
  assert.strictEqual(l.indirizzo, 0o202);
  assert.strictEqual(l.dati, 13, 'sul bus dati c\'è il valore che sta per essere scritto');
  assert.deepStrictEqual([l.stato.MEMR, l.stato.WO, l.stato.M1], [0, 0, 0], 'ciclo di scrittura: MEMR e WO spenti');
  assert.strictEqual(alt.mem[0o202], 0, 'non ancora scritto');
  alt.singleStep();
  assert.strictEqual(alt.mem[0o202], 13);
});

test('RUN lasciato a metà istruzione finisce correttamente l\'istruzione', () => {
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  numeri(alt, 20, 22);
  alt.reset();
  alt.singleStep(); alt.singleStep(); // a metà di LDA 200
  alt.run();
  alt.esegui(200);
  alt.stop();
  assert.strictEqual(alt.mem[0o202], 42);
});

test('HLT ferma la CPU: spia HLTA, pannello bloccato fino a RESET', () => {
  const alt = M.creaAltair();
  alt.mem[0] = 0o000; // NOP
  alt.mem[1] = 0o166; // HLT
  alt.run();
  const ev = alt.esegui(1000);
  assert.strictEqual(ev.halt, true);
  assert.ok(ev.stati <= 11, 'NOP (4) + HLT (7)');
  const l = alt.luci();
  assert.strictEqual(l.stato.HLTA, 1);
  assert.strictEqual(l.stato.WAIT, 0, 'il pannello è ancora in RUN');
  assert.strictEqual(l.indirizzo, 2);
  alt.stop();
  assert.strictEqual(alt.luci().stato.WAIT, 1);
  assert.strictEqual(alt.examine().motivo, 'halt');
  assert.strictEqual(alt.singleStep().motivo, 'halt');
  const r = alt.reset();
  assert.ok(r.eraHalt);
  assert.strictEqual(alt.luci().stato.HLTA, 0);
  assert.ok(alt.examine().ok);
});

test('HLT anche al passo singolo: due cicli, poi arresto', () => {
  const alt = M.creaAltair();
  alt.mem[0] = 0o166;
  alt.prepara(); // la memoria è stata scritta senza passare dal pannello
  assert.deepStrictEqual(alt.cicliIstruzione().map((c) => c.tipo), ['codice', 'halt']);
  const ev = alt.singleStep();
  assert.strictEqual(ev.halt, true);
  assert.strictEqual(alt.luci().stato.HLTA, 1);
  assert.strictEqual(alt.singleStep().ok, false);
});

test('RESET durante RUN fa ripartire il programma da 000', () => {
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  numeri(alt, 1, 2);
  // Partenza sbagliata da 100: solo NOP, poi oltre la memoria; la somma non arriva mai.
  alt.impostaInterruttori(0o100);
  alt.examine();
  alt.run();
  alt.esegui(5000);
  assert.strictEqual(alt.mem[0o202], 0);
  const ev = alt.reset();
  assert.ok(ev.inEsecuzione);
  alt.esegui(500);
  assert.strictEqual(alt.mem[0o202], 3);
});

test('fuori dalla memoria il bus legge 377 (RST 7) e la CPU gira a vuoto', () => {
  const alt = M.creaAltair();
  alt.impostaInterruttori(0o370);
  alt.examine();
  alt.run();
  alt.esegui(400);
  assert.ok(alt.fuoriMemoria > 0);
  assert.strictEqual(alt.inEsecuzione, true);
});

/* ---------- LED durante RUN: la media nel tempo ---------- */

test('durante RUN i LED mostrano per quanto tempo ogni linea è accesa', () => {
  const alt = M.creaAltair();
  carica(alt, SOMMA);
  numeri(alt, 5, 8);
  alt.reset();
  alt.run();
  const acc = M.creaAccumulatore();
  alt.esegui(58 * 1000, acc);
  const r = acc.risolvi();
  const vicino = (x, y) => Math.abs(x - y) < 0.002;
  // A7 è acceso solo nei cicli che leggono o scrivono 200, 201 e 202: 9 stati su 58.
  assert.ok(vicino(r.indirizzo[7], 9 / 58), 'A7 ' + r.indirizzo[7]);
  // M1 dura 25 stati su 58 (MOV B,A ha un ciclo M1 di 5 stati).
  assert.ok(vicino(r.stato[5], 25 / 58), 'M1 ' + r.stato[5]);
  // MEMR: tutto tranne la scrittura di STA (3 stati).
  assert.ok(vicino(r.stato[7], 55 / 58), 'MEMR ' + r.stato[7]);
  assert.strictEqual(r.indirizzo[15], 0);
  assert.strictEqual(acc.risolvi().stati, 0, 'dopo risolvi l\'accumulatore riparte da zero');
});

/* ---------- Kill the Bit ---------- */

test('Kill the Bit: la luce si sposta ogni ~0,11 secondi e si spegne con l\'interruttore giusto', () => {
  const alt = M.creaAltair();
  carica(alt, KILLBIT);
  alt.run();
  const t1 = eseguiFinche(alt, () => alt.ingressi >= 1);
  assert.ok(t1 > 220000 && t1 < 230000, 'primo spostamento dopo ' + t1 + ' stati');
  assert.strictEqual(alt.r.d, 0o100, 'la luce passa da A15 ad A14');
  // Alza l'interruttore 14 mentre la luce è lì: al prossimo IN la luce si spegne.
  alt.interruttore(14, true);
  const t2 = eseguiFinche(alt, () => alt.ingressi >= 2);
  assert.ok(Math.abs(t2 / M.FREQUENZA - 0.112) < 0.003, 'periodo ' + (t2 / M.FREQUENZA));
  assert.strictEqual(alt.r.d, 0, 'bit ucciso');
  // Se l'interruttore resta su, nasce una nuova luce.
  eseguiFinche(alt, () => alt.ingressi >= 3);
  assert.strictEqual(alt.r.d, 0o040);
});

test('Kill the Bit: il byte 006 (velocità) è libero; con 004 la luce corre 3,5 volte più piano', () => {
  assert.ok(M.libero(KILLBIT, 0o006));
  assert.ok(!M.libero(KILLBIT, 0o005));
  assert.ok(!M.libero(SOMMA, 0o006), 'la somma non ha byte liberi');
  const b = M.byteProgramma(KILLBIT, { 6: 0o004, 7: 0o123 });
  assert.strictEqual(b[6], 0o004);
  assert.strictEqual(b[7], 0, 'un byte non libero non si sostituisce');
  const alt = M.creaAltair();
  carica(alt, { istruzioni: KILLBIT.istruzioni, liberi: KILLBIT.liberi }); // con il valore originale
  assert.ok(M.programmaPresente(alt, KILLBIT));
  const lenta = M.creaAltair();
  M.sequenzaInserimento(KILLBIT, { 6: 0o004 }).forEach((p) => assert.ok(M.applica(lenta, p).ok));
  assert.strictEqual(lenta.leggi(6), 0o004);
  assert.ok(M.programmaPresente(lenta, KILLBIT), 'il programma resta riconosciuto');
  const mis = M.creaMissione('killbit');
  M.sequenzaInserimento(KILLBIT, { 6: 0o004 }).forEach((p) => mis.aggiorna(M.applica(lenta, p), lenta));
  assert.strictEqual(mis.corrente(), 'avvia');
  assert.ok(mis.righe(lenta).every((r) => r.stato === 'ok'));
  assert.strictEqual(mis.righe(lenta)[6].libero, true);
  // la scelta della velocità nella missione decide il byte mostrato nel listato e il prossimo da inserire
  const vuota = M.creaAltair();
  const mis2 = M.creaMissione('killbit');
  assert.strictEqual(mis2.righe(vuota)[6].byte, 0o016, 'senza scelta vale il byte originale');
  mis2.sost[6] = 0o004;
  assert.strictEqual(mis2.righe(vuota)[6].byte, 0o004);
  assert.strictEqual(mis2.righe(lenta)[6].stato, 'ok');
  lenta.run();
  const t1 = eseguiFinche(lenta, () => lenta.ingressi >= 1, 2e6);
  assert.ok(t1 > 780000 && t1 < 795000, 'primo spostamento dopo ' + t1 + ' stati');
  assert.ok(Math.abs(t1 / M.FREQUENZA - 0.393) < 0.005);
});

test('Kill the Bit: il disegno di D compare sui LED A15-A8', () => {
  const alt = M.creaAltair();
  carica(alt, KILLBIT);
  alt.run();
  const acc = M.creaAccumulatore();
  alt.esegui(100000, acc);
  const r = acc.risolvi();
  assert.ok(r.indirizzo[15] > 0.2, 'A15 acceso per circa un quarto del tempo: ' + r.indirizzo[15]);
  for (let i = 8; i < 15; i++) assert.strictEqual(r.indirizzo[i], 0, 'A' + i);
});

/* ---------- l'8080: alcune istruzioni oltre al programma del manuale ---------- */

function esegui8080(codice, prepara) {
  const alt = M.creaAltair();
  codice.forEach((b, i) => { alt.mem[i] = b; });
  if (prepara) prepara(alt.r, alt);
  alt.prepara();
  alt.run();
  alt.esegui(5000);
  return alt;
}

test('8080: aritmetica e bandiere', () => {
  // MVI A,377; ADI 1; HLT -> A=0, Z=1, CY=1
  let a = esegui8080([0o076, 0o377, 0o306, 0o001, 0o166]);
  assert.deepStrictEqual([a.r.a, a.r.z, a.r.cy], [0, 1, 1]);
  // MVI A,3; SUI 5; HLT -> A=376 (−2), CY=1 (prestito), S=1
  a = esegui8080([0o076, 3, 0o326, 5, 0o166]);
  assert.deepStrictEqual([a.r.a, a.r.cy, a.r.s], [0o376, 1, 1]);
  // MVI A,7; CPI 7; HLT -> Z=1 e A invariato
  a = esegui8080([0o076, 7, 0o376, 7, 0o166]);
  assert.deepStrictEqual([a.r.a, a.r.z], [7, 1]);
  // STC; MVI B,377; INR B; HLT -> B=0, Z=1, CY resta 1
  a = esegui8080([0o067, 0o006, 0o377, 0o004, 0o166]);
  assert.deepStrictEqual([a.r.b, a.r.z, a.r.cy], [0, 1, 1]);
  // MVI A,25h; ADI 48h; DAA -> 73 in BCD
  a = esegui8080([0o076, 0x25, 0o306, 0x48, 0o047, 0o166]);
  assert.strictEqual(a.r.a, 0x73);
  // MVI A,201; RRC -> 300 e CY=1; RLC torna a 201
  a = esegui8080([0o076, 0o201, 0o017, 0o166]);
  assert.deepStrictEqual([a.r.a, a.r.cy], [0o300, 1]);
  // MVI A,360; ANI 017 -> 0 con parità pari
  a = esegui8080([0o076, 0o360, 0o346, 0o017, 0o166]);
  assert.deepStrictEqual([a.r.a, a.r.z, a.r.p], [0, 1, 1]);
});

test('8080: coppie, pila, salti e sottoprogrammi', () => {
  // LXI H,177777; LXI B,1; DAD B -> HL=0, CY=1
  let a = esegui8080([0o041, 0o377, 0o377, 0o001, 1, 0, 0o011, 0o166]);
  assert.deepStrictEqual([a.r.h, a.r.l, a.r.cy], [0, 0, 1]);
  // LXI SP,100; MVI A,52; PUSH PSW; MVI A,0; POP PSW; HLT -> A torna 52
  a = esegui8080([0o061, 0o100, 0, 0o076, 0o52, 0o365, 0o076, 0, 0o361, 0o166]);
  assert.strictEqual(a.r.a, 0o52);
  assert.strictEqual(a.r.sp, 0o100);
  // LXI SP,100; CALL 010; HLT; ... 010: MVI A,11; RET
  a = esegui8080([0o061, 0o100, 0, 0o315, 0o010, 0, 0o166, 0, 0o076, 0o11, 0o311]);
  assert.strictEqual(a.r.a, 0o11);
  assert.strictEqual(a.r.pc, 7, 'dopo RET esegue HLT all\'indirizzo 006');
  assert.strictEqual(a.mem[0o77], 0, 'byte alto dell\'indirizzo di ritorno');
  assert.strictEqual(a.mem[0o76], 6, 'byte basso dell\'indirizzo di ritorno');
  // MVI B,3; DCR B; JNZ 002; HLT -> conta alla rovescia fino a 0
  a = esegui8080([0o006, 3, 0o005, 0o302, 2, 0, 0o166]);
  assert.strictEqual(a.r.b, 0);
  // LXI D,1234h; LXI H,5678h; XCHG
  a = esegui8080([0o021, 0x34, 0x12, 0o041, 0x78, 0x56, 0o353, 0o166]);
  assert.deepStrictEqual([a.r.d, a.r.e, a.r.h, a.r.l], [0x56, 0x78, 0x12, 0x34]);
  // I codici 010...070 sono NOP non documentati; 313 si comporta come JMP.
  a = esegui8080([0o010, 0o020, 0o313, 0o007, 0, 0, 0, 0o166]);
  assert.strictEqual(a.r.pc, 8);
});

test('8080: IN 377 legge gli interruttori 15-8, la pila accende la spia STACK', () => {
  const alt = M.creaAltair();
  [0o333, 0o377, 0o166].forEach((b, i) => { alt.mem[i] = b; });
  alt.impostaInterruttori(0o125 << 8);
  alt.prepara();
  const cicli = alt.cicliIstruzione();
  assert.deepStrictEqual(cicli.map((c) => c.tipo), ['codice', 'lettura', 'ingresso']);
  assert.strictEqual(cicli[2].indirizzo, 0o377 * 257, 'la porta compare su entrambe le metà dell\'indirizzo');
  alt.run();
  alt.esegui(100);
  assert.strictEqual(alt.r.a, 0o125);
  const pila = M.creaAltair();
  [0o061, 0o100, 0, 0o305, 0o166].forEach((b, i) => { pila.mem[i] = b; });
  pila.prepara();
  pila.singleStep(); pila.singleStep(); pila.singleStep(); // LXI SP
  pila.singleStep(); // ciclo M1 di PUSH
  assert.strictEqual(pila.luci().stato.STACK, 1);
  assert.strictEqual(pila.luci().indirizzo, 0o77);
});

/* ---------- missioni guidate ---------- */

test('missione della somma: i passi si spuntano solo facendo le cose davvero', () => {
  const alt = M.creaAltair();
  const mis = M.creaMissione('somma');
  const fai = (ev) => mis.aggiorna(ev, alt);
  assert.strictEqual(mis.corrente(), 'reset');
  assert.ok(mis.suggerimento(alt).includes('RESET'));
  fai(alt.reset());
  assert.strictEqual(mis.corrente(), 'programma');
  // Il primo suggerimento dice proprio il byte da impostare.
  assert.ok(mis.suggerimento(alt).includes('072'));
  const seq = M.sequenzaInserimento(SOMMA);
  seq.slice(0, 6).forEach((p) => fai(M.applica(alt, p)));
  assert.strictEqual(mis.progresso(alt).giusti, 2);
  assert.ok(mis.suggerimento(alt).includes('DEPOSIT NEXT'));
  seq.slice(6).forEach((p) => fai(M.applica(alt, p)));
  assert.strictEqual(mis.corrente(), 'numeri');
  alt.impostaInterruttori(0o200); fai(alt.examine());
  alt.impostaInterruttori(5); fai(alt.deposit());
  assert.strictEqual(mis.corrente(), 'numeri');
  alt.impostaInterruttori(0o010); fai(alt.depositNext());
  assert.strictEqual(mis.corrente(), 'esegui');
  // RUN senza RESET: il programma parte da 201 e la somma non arriva.
  fai(alt.run());
  alt.esegui(2000);
  fai({ azione: 'tick', ok: true });
  assert.strictEqual(mis.corrente(), 'esegui');
  assert.ok(mis.suggerimento(alt).includes('RESET'));
  fai(alt.stop());
  fai(alt.reset());
  fai(alt.run());
  alt.esegui(2000);
  fai({ azione: 'tick', ok: true });
  assert.strictEqual(mis.corrente(), 'ferma');
  fai(alt.stop());
  assert.strictEqual(mis.corrente(), 'leggi');
  alt.impostaInterruttori(0o202); fai(alt.examine());
  assert.ok(mis.completata());
  const r = mis.risultato(alt);
  assert.deepStrictEqual([r.a, r.b, r.somma, r.giusta], [5, 8, 13, true]);
  assert.ok(mis.suggerimento(alt).includes('015'));
});

test('missione della somma: un risultato vecchio non basta', () => {
  const alt = M.creaAltair();
  const mis = M.creaMissione('somma');
  const fai = (ev) => mis.aggiorna(ev, alt);
  M.sequenzaInserimento(SOMMA).forEach((p) => fai(M.applica(alt, p)));
  alt.impostaInterruttori(0o200); fai(alt.examine());
  alt.impostaInterruttori(1); fai(alt.deposit());
  alt.impostaInterruttori(1); fai(alt.depositNext());
  fai(alt.reset()); fai(alt.run()); alt.esegui(1000); fai({ azione: 'tick', ok: true }); fai(alt.stop());
  // Cambia il primo numero dopo il RUN: in 202 resta 2.
  alt.impostaInterruttori(0o200); fai(alt.examine());
  alt.impostaInterruttori(9); fai(alt.deposit());
  alt.impostaInterruttori(0o202); fai(alt.examine());
  assert.strictEqual(mis.completata(), false);
  assert.ok(mis.suggerimento(alt).includes('vecchio'));
});

test('missione Kill the Bit: carica, avvia, spegni la luce', () => {
  const alt = M.creaAltair();
  const mis = M.creaMissione('killbit');
  const fai = (ev) => mis.aggiorna(ev, alt);
  assert.strictEqual(mis.corrente(), 'programma');
  M.sequenzaInserimento(KILLBIT).forEach((p) => fai(M.applica(alt, p)));
  assert.strictEqual(mis.corrente(), 'avvia');
  fai(alt.run());
  eseguiFinche(alt, () => alt.ingressi >= 1);
  fai({ azione: 'tick', ok: true });
  assert.strictEqual(mis.corrente(), 'uccidi');
  alt.interruttore(14, true);
  eseguiFinche(alt, () => alt.ingressi >= 2);
  fai({ azione: 'tick', ok: true });
  assert.ok(mis.completata());
});

test('i testi raccontano ogni comando del pannello', () => {
  const alt = M.creaAltair();
  alt.impostaInterruttori(0o072);
  const t = M.racconta(alt.deposit(), alt);
  assert.ok(t.includes('DEPOSIT') && t.includes('072') && t.includes('00 111 010'));
  assert.ok(M.racconta(alt.reset(), alt).includes('000'));
  const passo = M.racconta(alt.singleStep(), alt, { primoPasso: true });
  assert.ok(passo.includes('ciclo macchina'));
  alt.run();
  assert.ok(M.racconta(alt.examine(), alt).includes('STOP'));
  for (const az of ['clr', 'protect', 'unprotect', 'aux', 'stop', 'spegni']) {
    assert.ok(M.racconta(alt[az](), alt).length > 10, az);
  }
});

/* ---------- contenuti del capitolo ---------- */

test('il capitolo è registrato con dati completi e coerenti', () => {
  require('../sections/storia-pc/js/core.js');
  require('../sections/storia-pc/js/capitoli/03-primi-pc.js');
  const P = globalThis.StoriaPC;
  const cap = P.capitoli.find((c) => c.id === 'primi-pc');
  assert.ok(cap, 'capitolo registrato');
  assert.strictEqual(cap.numero, 3);
  assert.strictEqual(cap.breve, 'Primi personal');
  assert.strictEqual(cap.periodo, '1965–1980');
  assert.strictEqual(cap.colore, 'var(--era-3)');
  assert.ok(cap.sommario && cap.intro);
  cap.blocchi.forEach((b) => assert.ok(P.TIPI_BLOCCO.includes(b.tipo), 'tipo ' + b.tipo));

  const testi = cap.blocchi.filter((b) => b.tipo === 'testo');
  assert.ok(testi.length >= 4 && testi.length <= 6, testi.length + ' blocchi di testo');
  testi.forEach((b) => assert.ok(b.titolo, 'ogni blocco di testo ha un titoletto'));
  const parole = testi.map((b) => b.paragrafi.join(' ')).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(parole >= 1400 && parole <= 2200, parole + ' parole di testo');

  const schede = cap.blocchi.filter((b) => b.tipo === 'schede');
  assert.strictEqual(schede.length, 1);
  const items = schede[0].items;
  assert.ok(items.length >= 7 && items.length <= 12, items.length + ' schede');
  items.forEach((it, i) => {
    assert.ok(Number.isInteger(it.anno) && it.anno >= 1965 && it.anno <= 1980, it.nome);
    if (i) assert.ok(it.anno >= items[i - 1].anno, 'anni in ordine: ' + it.nome);
    assert.ok(it.nome && it.testo && it.luogo, it.nome);
  });
  assert.ok(items.some((it) => it.italia), 'almeno una scheda italiana');

  const figure = cap.blocchi.filter((b) => b.tipo === 'figura');
  assert.ok(figure.length >= 1 && figure.length <= 2);
  figure.forEach((f) => assert.ok(typeof f.svg === 'function' && f.alt && f.didascalia));
  const numeri = cap.blocchi.find((b) => b.tipo === 'numeri');
  assert.ok(numeri && numeri.items.length >= 3 && numeri.items.length <= 4);
  numeri.items.forEach((n) => assert.ok(n.etichetta && n.valore !== undefined));
  assert.ok(cap.blocchi.some((b) => b.tipo === 'nota'));
  assert.ok(cap.blocchi.some((b) => b.tipo === 'italia'));
  assert.ok(cap.blocchi.some((b) => b.tipo === 'lab'));

  assert.ok(cap.punti.length >= 4 && cap.punti.length <= 6);
  assert.ok(cap.collegamenti.some((l) => l.href === '../../index.html#/bus/s100'));
  // Le altre sezioni sempre con index.html esplicito: un "/" finale non funziona aprendo i file in locale.
  cap.collegamenti.forEach((l) => assert.ok(/^(\.\.\/\.\.\/index\.html#\/bus\/[a-z0-9]+|\.\.\/[a-z-]+\/index\.html(#[a-z0-9/-]+)?|#[a-z-]+)$/.test(l.href), l.href));
  cap.collegamenti.forEach((l) => assert.ok(l.tipo === 'buslab' || l.tipo === 'sezione', l.href + ': tipo ' + l.tipo));
  // Nessun anno con il punto delle migliaia, apostrofi dritti nei testi.
  const tutto = JSON.stringify(cap.blocchi.filter((b) => b.tipo !== 'figura')) + cap.intro + cap.punti.join(' ');
  assert.ok(!/\b1\.9[0-9]{2}\b/.test(tutto), 'anni scritti senza punto');
  assert.ok(!/[\u2018\u2019]/.test(tutto), 'apostrofi dritti');
  assert.ok(cap.lab && typeof cap.lab.crea === 'function' && cap.lab.titolo);
});
