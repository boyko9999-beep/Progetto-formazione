// Test del capitolo 2 della Storia del PC (il programma memorizzato).
// node --test tests/storia-pc-02-von-neumann.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../sections/storia-pc/js/modelli/02-von-neumann.js');

function esegui(id, modo) {
  return M.esegui(M.programma(id).memoria, modo || 'vn');
}

/* ---------- insieme di istruzioni, assemblatore, disassemblatore ---------- */

test('insieme di istruzioni: 11 istruzioni con codici e nomi unici', () => {
  assert.strictEqual(M.ISTRUZIONI.length, 11);
  const codici = new Set(M.ISTRUZIONI.map((i) => i.codice));
  const nomi = new Set(M.ISTRUZIONI.map((i) => i.nome));
  assert.strictEqual(codici.size, 11);
  assert.strictEqual(nomi.size, 11);
  M.ISTRUZIONI.forEach((i) => {
    assert.ok(i.codice >= 0 && i.codice <= 15, i.nome);
    assert.ok(i.breve.length > 5 && i.rtl.length > 0, i.nome);
  });
  assert.deepStrictEqual(['NOP', 'LDA', 'ADD', 'SUB', 'STA', 'LDI', 'JMP', 'JZ', 'JC', 'OUT', 'HLT'].map((n) => M.PER_NOME[n].codice),
    [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0xE, 0xF]);
});

test('decodifica: 4 bit di codice e 4 bit di operando per tutti i 256 valori', () => {
  for (let v = 0; v < 256; v++) {
    const d = M.decodifica(v);
    assert.strictEqual(d.codice, v >> 4);
    assert.strictEqual(d.operando, v & 15);
    assert.strictEqual(d.definita, !!M.PER_CODICE[v >> 4]);
  }
  assert.strictEqual(M.disassembla(0x1E), 'LDA 14');
  assert.strictEqual(M.disassembla(0x55), 'LDI 5');
  assert.strictEqual(M.disassembla(0xE0), 'OUT');
  assert.strictEqual(M.disassembla(0xF0), 'HLT');
  assert.strictEqual(M.disassembla(0x07), 'NOP');
  assert.strictEqual(M.disassembla(0x9A), '—');
});

test('assemblatore e disassemblatore sono uno l\'inverso dell\'altro', () => {
  M.ISTRUZIONI.forEach((istr) => {
    const operandi = istr.operando ? [...Array(16).keys()] : [0];
    operandi.forEach((op) => {
      const v = M.codifica(istr.nome, op);
      assert.strictEqual(v, (istr.codice << 4) | op);
      const r = M.assembla([M.disassembla(v)]);
      assert.deepStrictEqual(r.errori, []);
      assert.strictEqual(r.memoria[0], v, istr.nome + ' ' + op);
    });
  });
});

test('assemblatore: numeri in tre basi, indirizzi espliciti, commenti ed errori', () => {
  const r = M.assembla(['LDA 14 ; commento', '0x1E', '0b00011110', '30', '14: 7', '5']);
  assert.deepStrictEqual(r.errori, []);
  assert.deepStrictEqual(r.memoria.slice(0, 4), [0x1E, 0x1E, 0x1E, 30]);
  assert.strictEqual(r.memoria[14], 7);
  assert.strictEqual(r.memoria[15], 5);
  assert.strictEqual(r.commenti[0], 'commento');
  assert.strictEqual(M.assembla(['XYZ 3']).errori.length, 1);
  assert.strictEqual(M.assembla(['LDA']).errori.length, 1);
  assert.strictEqual(M.assembla(['LDA 16']).errori.length, 1);
  assert.strictEqual(M.assembla(['OUT 3']).errori.length, 1);
  assert.strictEqual(M.assembla(['256']).errori.length, 1);
  assert.strictEqual(M.assembla(['16: 1']).errori.length, 1);
  assert.strictEqual(M.assembla(['15: 1', '2']).errori.length, 1);
});

test('formati: binario con i due gruppi di 4 bit, esadecimale, decimale', () => {
  assert.strictEqual(M.formatta(30, 'bin'), '0001 1110');
  assert.strictEqual(M.formatta(14, 'bin', 4), '1110');
  assert.strictEqual(M.formatta(30, 'hex'), '1E');
  assert.strictEqual(M.formatta(14, 'hex', 4), 'E');
  assert.strictEqual(M.formatta(30, 'dec'), '30');
  assert.strictEqual(M.nelTesto(30, 'hex'), '0x1E (30)');
});

/* ---------- i programmi pronti ---------- */

test('i programmi pronti si assemblano senza errori nelle 16 celle', () => {
  assert.ok(M.PROGRAMMI.length >= 3);
  M.PROGRAMMI.forEach((p) => {
    assert.deepStrictEqual(p.errori, [], p.id);
    assert.strictEqual(p.memoria.length, 16);
    p.memoria.forEach((v) => assert.ok(Number.isInteger(v) && v >= 0 && v <= 255));
    assert.ok(p.descrizione.length > 40, p.id);
  });
  assert.deepStrictEqual(M.programma('somma').memoria,
    [0x1E, 0x2F, 0xE0, 0x4D, 0xF0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 5]);
});

test('Somma 7 + 5: il display mostra 12 e la cella 13 contiene 12', () => {
  const r = esegui('somma');
  assert.ok(r.fermo);
  assert.deepStrictEqual(r.uscite, [12]);
  assert.strictEqual(r.stato.mem[13], 12);
  assert.strictEqual(r.stato.a, 12);
  assert.strictEqual(r.istruzioni, 5);
});

test('Conto alla rovescia: uscite 5, 4, 3, 2, 1, 0', () => {
  const r = esegui('conto');
  assert.ok(r.fermo);
  assert.deepStrictEqual(r.uscite, [5, 4, 3, 2, 1, 0]);
  assert.strictEqual(r.stato.z, 1);
});

test('Moltiplica 3 × 4: somme ripetute fino a 12, contatore a zero', () => {
  const r = esegui('molt');
  assert.ok(r.fermo);
  assert.deepStrictEqual(r.uscite, [3, 6, 9, 12]);
  assert.strictEqual(r.stato.mem[13], 12);
  assert.strictEqual(r.stato.mem[12], 0);
});

test('ogni programma pronto produce il risultato atteso in von Neumann', () => {
  M.PROGRAMMI.forEach((p) => {
    const r = M.esegui(p.memoria, 'vn');
    assert.ok(r.fermo, p.id);
    assert.deepStrictEqual(r.uscite, p.atteso.uscite, p.id);
    Object.keys(p.atteso.celle || {}).forEach((k) => assert.strictEqual(r.stato.mem[k], p.atteso.celle[k], p.id + ' cella ' + k));
  });
});

test('il programma che si modifica riscrive la propria prima istruzione', () => {
  const p = M.programma('auto');
  assert.strictEqual(M.disassembla(p.memoria[0]), 'LDA 12');
  const r = M.esegui(p.memoria, 'vn');
  assert.deepStrictEqual(r.uscite, [7, 12, 21]);
  assert.strictEqual(M.disassembla(r.stato.mem[0]), 'LDA 15');
  // La cella 0 è stata sia eseguita sia scritta come dato.
  const uso = M.usoCelle(p.memoria, 'vn').uso;
  assert.strictEqual(uso[0], 'entrambi');
  assert.strictEqual(uso[12], 'dato');
  assert.strictEqual(uso[3], 'istruzione');
});

test('in Harvard il programma non può modificarsi: la memoria istruzioni resta intatta e il ciclo non finisce', () => {
  const p = M.programma('auto');
  const r = M.esegui(p.memoria, 'harvard', { maxIstruzioni: 200 });
  assert.strictEqual(r.fermo, false);
  assert.deepStrictEqual(r.uscite.slice(0, 4), [7, 14, 21, 28]);
  assert.strictEqual(r.stato.memI[0], p.memoria[0]);
  assert.notStrictEqual(r.stato.mem[0], p.memoria[0]);
});

/* ---------- aritmetica, flag, salti, HLT, PC ---------- */

test('aritmetica a 8 bit modulo 256 con i flag Z e C', () => {
  // 200 + 100 = 300 → 44 con riporto
  let r = M.esegui(M.assembla(['LDA 14', 'ADD 15', 'HLT', '14: 200', '15: 100']).memoria, 'vn');
  assert.strictEqual(r.stato.a, 44);
  assert.strictEqual(r.stato.c, 1);
  assert.strictEqual(r.stato.z, 0);
  // 128 + 128 = 256 → 0: zero e riporto insieme
  r = M.esegui(M.assembla(['LDA 15', 'ADD 15', 'HLT', '15: 128']).memoria, 'vn');
  assert.strictEqual(r.stato.a, 0);
  assert.strictEqual(r.stato.z, 1);
  assert.strictEqual(r.stato.c, 1);
  // 3 − 5 = −2 → 254 con prestito
  r = M.esegui(M.assembla(['LDI 3', 'SUB 15', 'HLT', '15: 5']).memoria, 'vn');
  assert.strictEqual(r.stato.a, 254);
  assert.strictEqual(r.stato.c, 1);
  // 9 − 9 = 0: Z acceso, nessun prestito
  r = M.esegui(M.assembla(['LDI 9', 'SUB 15', 'HLT', '15: 9']).memoria, 'vn');
  assert.strictEqual(r.stato.a, 0);
  assert.strictEqual(r.stato.z, 1);
  assert.strictEqual(r.stato.c, 0);
  // 250 + 10 = 260 → 4: JC salta
  r = M.esegui(M.assembla(['LDA 14', 'ADD 15', 'JC 5', 'LDI 1', 'OUT', 'OUT', 'HLT', '14: 250', '15: 10']).memoria, 'vn');
  assert.deepStrictEqual(r.uscite, [4]);
});

test('HLT ferma il clock: altri micro-passi non cambiano niente', () => {
  const r = esegui('somma');
  assert.ok(r.stato.fermo);
  const dopo = M.microPasso(r.stato);
  assert.strictEqual(dopo.passo.id, 'FERMO');
  assert.strictEqual(dopo.passo.cicli, 0);
  assert.strictEqual(dopo.stato.cicli, r.stato.cicli);
  assert.strictEqual(dopo.stato.pc, r.stato.pc);
  assert.match(dopo.passo.testo, /ferma/);
});

test('il PC ha 4 bit: dopo la cella 15 torna a 0', () => {
  let s = M.nuovoStato(new Array(16).fill(0), 'vn'); // 16 NOP
  for (let i = 0; i < 16; i++) s = M.istruzione(s).stato;
  assert.strictEqual(s.pc, 0);
  assert.strictEqual(s.istruzioni, 16);
  s = M.istruzione(s).stato;
  assert.strictEqual(s.pc, 1);
  // Un programma che attraversa il confine: 13 LDI 0, 14 OUT, 15 NOP, poi la cella 0 salta alla 2.
  const prog = M.assembla(['JZ 2', 'JMP 13', 'HLT', '13: LDI 0', 'OUT', 'NOP']).memoria;
  const r = M.esegui(prog, 'vn');
  assert.ok(r.fermo);
  assert.deepStrictEqual(r.uscite, [0]);
  // Il testo del prelievo dalla cella 15 spiega il giro.
  let t = M.nuovoStato(prog, 'vn');
  let trovato = false;
  for (let i = 0; i < 40 && !t.fermo; i++) {
    const p = M.microPasso(t);
    if (p.passo.id === 'P2' && p.passo.eventi[0].indirizzo === 15) { trovato = /ricomincia da 0/.test(p.passo.testo); assert.strictEqual(p.stato.pc, 0); }
    t = p.stato;
  }
  assert.ok(trovato);
});

test('un codice non definito si comporta come NOP', () => {
  const r = M.esegui([0x9A, 0xE0, 0xF0], 'vn');
  assert.ok(r.fermo);
  assert.deepStrictEqual(r.uscite, [0]);
  assert.strictEqual(r.istruzioni, 3);
});

/* ---------- micro-passi e regola dei cicli ---------- */

test('micro-passi della prima istruzione (von Neumann): P1, P2, D, E1, E2 in 2 cicli', () => {
  const r = M.istruzione(M.nuovoStato(M.programma('somma').memoria, 'vn'), { base: 'bin' });
  assert.deepStrictEqual(r.passi.map((p) => p.id), ['P1', 'P2', 'D', 'E1', 'E2']);
  assert.deepStrictEqual(r.passi.map((p) => p.fase), ['prelievo', 'prelievo', 'decodifica', 'esecuzione', 'esecuzione']);
  assert.strictEqual(r.passi.reduce((t, p) => t + p.cicli, 0), 2);
  const ind = r.passi[0].eventi.find((e) => e.tipo === 'indirizzo');
  assert.deepStrictEqual([ind.bus, ind.da, ind.valore], ['U', 'pc', 0]);
  const lettura = r.passi[1].eventi.find((e) => e.tipo === 'leggi');
  assert.deepStrictEqual([lettura.valore, lettura.verso, lettura.genere], [0x1E, 'ir', 'istruzione']);
  assert.ok(r.passi[4].eventi.some((e) => e.tipo === 'leggi' && e.verso === 'a' && e.valore === 7));
  r.passi.forEach((p) => {
    assert.ok(typeof p.testo === 'string' && p.testo.length > 30, p.id);
    assert.ok(p.dopo && Array.isArray(p.dopo.mem));
  });
  assert.strictEqual(r.stato.cicli, 2);
  assert.strictEqual(r.stato.a, 7);
});

test('in Harvard il prelievo successivo si sovrappone all\'accesso ai dati', () => {
  let s = M.nuovoStato(M.programma('somma').memoria, 'harvard');
  const prima = M.istruzione(s);
  assert.deepStrictEqual(prima.passi.map((p) => p.id), ['P1', 'P2', 'D', 'E1', 'E2']);
  const e2 = prima.passi[4];
  assert.ok(e2.eventi.some((e) => e.tipo === 'leggi' && e.bus === 'D' && e.verso === 'a'));
  assert.ok(e2.eventi.some((e) => e.tipo === 'leggi' && e.bus === 'I' && e.verso === 'ir' && e.anticipo));
  s = prima.stato;
  assert.strictEqual(s.fase, 'D');
  const seconda = M.istruzione(s);
  assert.strictEqual(seconda.passi[0].id, 'D');
  assert.strictEqual(seconda.stato.cicli, 3);
});

test('regola dei cicli: von Neumann 2 per istruzione, Harvard meno i prelievi sovrapposti', () => {
  const attesi = { somma: [10, 7], conto: [48, 43], molt: [72, 48] };
  Object.keys(attesi).forEach((id) => {
    const p = M.programma(id);
    const c = M.confronta(p.memoria);
    assert.ok(c.vn.fermo && c.harvard.fermo, id);
    assert.strictEqual(c.vn.cicli, 2 * c.vn.istruzioni, id);
    assert.strictEqual(c.harvard.cicli, 2 * c.harvard.istruzioni - c.harvard.sovrapposti, id);
    assert.strictEqual(c.harvard.sovrapposti, c.harvard.accessiDati, id);
    assert.deepStrictEqual([c.vn.cicli, c.harvard.cicli], attesi[id], id);
    assert.ok(c.harvard.cicli <= c.vn.cicli, id);
    assert.strictEqual(c.risparmio, c.vn.accessiDati, id);
    // Stesso programma, stesso risultato.
    assert.deepStrictEqual(c.harvard.uscite, c.vn.uscite, id);
  });
});

test('Harvard non supera mai von Neumann anche su programmi casuali', () => {
  let seme = 12345;
  const caso = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme; };
  for (let k = 0; k < 300; k++) {
    const mem = [];
    for (let i = 0; i < 16; i++) mem.push(caso() & 255);
    const vn = M.esegui(mem, 'vn', { maxIstruzioni: 200 });
    const h = M.esegui(mem, 'harvard', { maxIstruzioni: 200 });
    // In generale: cicli = istruzioni eseguite + prelievi non sovrapposti.
    assert.strictEqual(vn.cicli, vn.istruzioni + vn.prelievi);
    assert.strictEqual(vn.cicli, 2 * vn.istruzioni);
    assert.strictEqual(h.cicli, h.istruzioni + h.prelievi - h.sovrapposti);
    // Se il programma si ferma con HLT non resta nessuna istruzione prelevata in anticipo.
    if (h.fermo) assert.strictEqual(h.cicli, 2 * h.istruzioni - h.sovrapposti);
    // Se le due architetture eseguono lo stesso lavoro, Harvard non è mai più lenta.
    if (vn.fermo && h.fermo && vn.istruzioni === h.istruzioni) assert.ok(h.cicli <= vn.cicli);
  }
});

/* ---------- traffico sui bus, descrizioni brevi, ruoli delle celle ---------- */

test('traffico: un elemento per ciclo; in von Neumann istruzioni e dati si alternano sullo stesso bus', () => {
  ['somma', 'conto', 'molt'].forEach((id) => {
    const p = M.programma(id);
    const vn = M.traffico(p.memoria, 'vn');
    const h = M.traffico(p.memoria, 'harvard');
    const c = M.confronta(p.memoria);
    assert.ok(vn.fermo && h.fermo, id);
    // Un elemento per ciclo, e gli stessi cicli dell'esecuzione completa.
    assert.strictEqual(vn.bus.U.length, c.vn.cicli, id);
    assert.strictEqual(h.bus.I.length, c.harvard.cicli, id);
    assert.strictEqual(h.bus.D.length, c.harvard.cicli, id);
    // Von Neumann: un prelievo per istruzione e un ciclo di bus per ogni accesso ai dati.
    assert.strictEqual(vn.bus.U.filter((v) => v === 'istruzione').length, c.vn.istruzioni, id);
    assert.strictEqual(vn.bus.U.filter((v) => v === 'dato').length, c.vn.accessiDati, id);
    // Harvard: stessi prelievi e stessi accessi, ma su due bus; nei cicli dei dati il bus istruzioni lavora in parallelo.
    assert.strictEqual(h.bus.I.filter(Boolean).length, c.harvard.prelievi, id);
    assert.strictEqual(h.bus.D.filter(Boolean).length, c.harvard.accessiDati, id);
    const paralleli = h.bus.D.filter((v, i) => v && h.bus.I[i]).length;
    assert.strictEqual(paralleli, c.harvard.sovrapposti, id);
    assert.ok(paralleli > 0, id);
  });
  // Un programma senza HLT si ferma al limite di cicli.
  const giro = M.traffico(M.programma('auto').memoria, 'harvard', { maxCicli: 50 });
  assert.strictEqual(giro.fermo, false);
  assert.strictEqual(giro.bus.I.length, giro.cicli);
  assert.ok(giro.cicli >= 50 && giro.cicli <= 51);
});

test('rtl: l\'istruzione con l\'operando vero', () => {
  assert.strictEqual(M.rtl(M.codifica('ADD', 15)), 'A ← A + M[15]');
  assert.strictEqual(M.rtl(M.codifica('LDI', 5)), 'A ← 5');
  assert.strictEqual(M.rtl(M.codifica('STA', 13)), 'M[13] ← A');
  assert.strictEqual(M.rtl(M.codifica('JZ', 6)), 'se Z = 1: PC ← 6');
  assert.strictEqual(M.rtl(M.codifica('OUT')), 'uscita ← A');
  assert.match(M.rtl(0x9A), /sconosciuto/);
});

test('riassunto: una riga per ogni micro-passo, che nomina la fase', () => {
  let s = M.nuovoStato(M.programma('molt').memoria, 'vn');
  const fasi = { P1: /^Prelievo/, P2: /^Prelievo/, D: /^Decodifica · /, E1: /^Esecuzione/, E2: /^Esecuzione/, E: /^Esecuzione/ };
  for (let i = 0; i < 400 && !s.fermo; i++) {
    const r = M.microPasso(s, { testi: false });
    const t = M.riassunto(r.passo);
    assert.match(t, fasi[r.passo.id], r.passo.id);
    assert.ok(t.length < 90, t);
    s = r.stato;
  }
  assert.ok(s.fermo);
  assert.strictEqual(M.riassunto(M.microPasso(s).passo), 'CPU ferma');
});

test('ruoli delle celle: istruzioni e dati come scritti nel sorgente', () => {
  const p = M.programma('somma');
  assert.deepStrictEqual(p.ruoli.slice(0, 5), ['istruzione', 'istruzione', 'istruzione', 'istruzione', 'istruzione']);
  assert.deepStrictEqual(p.ruoli.slice(13), ['dato', 'dato', 'dato']);
  assert.strictEqual(p.ruoli[7], null);
  M.PROGRAMMI.forEach((q) => assert.strictEqual(q.ruoli.length, 16, q.id));
});

test('HLT come unica istruzione: la spiegazione usa il singolare', () => {
  const r = M.esegui([M.codifica('HLT')], 'vn', { testi: true, passi: true });
  assert.ok(r.fermo);
  assert.match(r.passi[r.passi.length - 1].testo, /dopo una sola istruzione e 2 cicli di clock/);
  const r2 = M.esegui(M.programma('somma').memoria, 'vn', { testi: true, passi: true });
  assert.match(r2.passi[r2.passi.length - 1].testo, /dopo 5 istruzioni e 10 cicli di clock/);
});

/* ---------- integrità dei contenuti del capitolo ---------- */

test('capitolo: blocchi, schede in ordine, numeri, collegamenti e lunghezza del testo', () => {
  const P = require('../sections/storia-pc/js/core.js');
  require('../sections/storia-pc/js/capitoli/02-von-neumann.js');
  const cap = P.capitoli.find((c) => c.id === 'von-neumann');
  assert.ok(cap, 'capitolo registrato');
  assert.strictEqual(cap.numero, 2);
  assert.strictEqual(cap.colore, 'var(--era-2)');
  assert.strictEqual(typeof cap.lab.crea, 'function');
  cap.blocchi.forEach((b) => assert.ok(P.TIPI_BLOCCO.includes(b.tipo), b.tipo));

  const testi = cap.blocchi.filter((b) => b.tipo === 'testo');
  assert.ok(testi.length >= 4 && testi.length <= 6);
  testi.forEach((b) => assert.ok(b.titolo, 'ogni blocco di testo ha un titolo'));
  const parole = testi.flatMap((b) => b.paragrafi).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(parole >= 1400 && parole <= 2200, 'parole del testo: ' + parole);

  const schede = cap.blocchi.filter((b) => b.tipo === 'schede');
  assert.strictEqual(schede.length, 1);
  const items = schede[0].items;
  assert.ok(items.length >= 7 && items.length <= 12);
  for (let i = 0; i < items.length; i++) {
    assert.ok(Number.isInteger(items[i].anno) && items[i].anno >= 1930 && items[i].anno <= 2026, items[i].nome);
    if (i) assert.ok(items[i].anno >= items[i - 1].anno, 'anni in ordine: ' + items[i].nome);
    assert.ok(items[i].testo.length > 30);
  }
  assert.ok(items.some((it) => it.italia));
  const date = Object.fromEntries(items.map((it) => [it.nome.replace(/<[^>]+>/g, ''), it.anno]));
  assert.strictEqual(date['First Draft of a Report on the EDVAC'], 1945);
  assert.strictEqual(date['Manchester Baby'], 1948);
  assert.strictEqual(date['EDSAC'], 1949);

  const figure = cap.blocchi.filter((b) => b.tipo === 'figura');
  assert.ok(figure.length >= 1 && figure.length <= 2);
  figure.forEach((f) => { assert.ok(f.alt && f.didascalia); assert.strictEqual(typeof f.svg, 'function'); });

  const numeri = cap.blocchi.find((b) => b.tipo === 'numeri');
  assert.ok(numeri.items.length >= 3 && numeri.items.length <= 4);
  numeri.items.forEach((n) => assert.ok(typeof n.valore === 'number' && n.valore > 0 && n.etichetta));

  assert.ok(cap.blocchi.some((b) => b.tipo === 'nota'));
  assert.ok(cap.blocchi.some((b) => b.tipo === 'lab'));
  assert.ok(cap.punti.length >= 4 && cap.punti.length <= 6);

  const busValidi = ['uart', 'rs232', 'rs485', 'midi', 'i2c', 'smbus', 'i3c', 'spi', 'onewire', 'i2s', 'jtag', 'axi', 'unibus', 's100', 'isa', 'scsi', 'pci', 'pcie', 'sata', 'gpib', 'centronics', 'usb', 'firewire', 'thunderbolt', 'mil1553', 'modbus', 'can', 'lin', 'profibus', 'flexray', 'ethernet'];
  const capitoli = ['giganti', 'von-neumann', 'primi-pc', 'ibm-pc', 'scheda-madre', 'memoria', 'avvio', 'grafica', 'prestazioni', 'oggi'];
  cap.collegamenti.forEach((l) => {
    const bus = l.href.match(/^\.\.\/\.\.\/index\.html#\/bus\/([a-z0-9]+)$/);
    // Sempre con index.html esplicito: un «/» finale non funziona aprendo i file in locale.
    const sezione = /^\.\.\/(elettronica-base|elettronica-intermedia|elettronica-avanzata|porte-logiche|chip-programmabili|programmazione)\/index\.html(#[a-z0-9-]+)?$/.test(l.href) ||
      l.href === '../quiz/index.html#storia-pc/von-neumann';
    const interno = l.href.startsWith('#') && capitoli.includes(l.href.slice(1));
    assert.ok((bus && busValidi.includes(bus[1])) || sezione || interno, 'collegamento valido: ' + l.href);
  });
});
