// Sezione 6, capitolo 4 (IBM PC): mappa della memoria, segmento:offset, porta A20, pezzi del 5150.
// node --test tests/storia-pc-04-ibm-pc.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const M = require('../sections/storia-pc/js/modelli/04-ibm-pc.js');

test('segmento × 16 + offset: gli esempi classici', () => {
  assert.strictEqual(M.indirizzoFisico(0xB800, 0x0000).fisico, 0xB8000, 'B800:0000 è lo schermo CGA');
  assert.strictEqual(M.indirizzoFisico(0xB000, 0x0000).fisico, 0xB0000, 'B000:0000 è lo schermo MDA');
  assert.strictEqual(M.indirizzoFisico(0xFFFF, 0x0000).fisico, 0xFFFF0, 'FFFF:0000 è il punto di partenza dopo il reset');
  assert.strictEqual(M.indirizzoFisico(0xF000, 0xE05B).fisico, 0xFE05B, 'F000:E05B è l\'inizio del POST');
  assert.strictEqual(M.indirizzoFisico(0x0000, 0x0000).fisico, 0x00000);
  assert.strictEqual(M.indirizzoFisico(0x1234, 0x5678).fisico, 0x179B8);
});

test('oltre 1 MB: giro senza A20, HMA con A20', () => {
  const senza = M.indirizzoFisico(0xFFFF, 0x0010, false);
  assert.strictEqual(senza.lineare, 0x100000);
  assert.strictEqual(senza.fisico, 0x00000, 'FFFF:0010 senza A20 torna a 00000');
  assert.strictEqual(senza.giro, true);
  const con = M.indirizzoFisico(0xFFFF, 0x0010, true);
  assert.strictEqual(con.fisico, 0x100000, 'FFFF:0010 con A20 è 100000');
  assert.strictEqual(con.giro, false);
  assert.strictEqual(con.oltre, true);
  // Il massimo raggiungibile: FFFF:FFFF = 10FFEF (64 KB meno 16 byte sopra il megabyte).
  assert.strictEqual(M.indirizzoFisico(0xFFFF, 0xFFFF, true).fisico, 0x10FFEF);
  assert.strictEqual(M.indirizzoFisico(0xFFFF, 0xFFFF, false).fisico, 0x0FFEF);
  assert.strictEqual(M.MAX_SEG_OFF - M.MAX_20_BIT, 0x10000 - 16, 'la HMA è grande 64 KB meno 16 byte');
  // Sotto il megabyte A20 non cambia nulla.
  for (const [s, o] of [[0, 0], [0xB800, 0x07D0], [0xF000, 0xFFFF], [0xFFFF, 0x000F]]) {
    assert.strictEqual(M.indirizzoFisico(s, o, true).fisico, M.indirizzoFisico(s, o, false).fisico);
  }
});

test('i segmenti si sovrappongono ogni 16 byte', () => {
  assert.strictEqual(M.indirizzoFisico(0xB801, 0).fisico, M.indirizzoFisico(0xB800, 0x10).fisico);
  assert.strictEqual(M.quanteCoppie(0x00000), 1, 'il byte 0 si raggiunge solo con 0000:0000');
  assert.strictEqual(M.quanteCoppie(0xB8000), 4096, 'un byte in mezzo alla memoria ha 4096 nomi diversi');
  assert.strictEqual(M.quanteCoppie(0xFFFFF), 4096, 'FFFFF si raggiunge da F000:FFFF a FFFF:000F');
  assert.strictEqual(M.quanteCoppie(0x00010), 2, '0000:0010 e 0001:0000');
  assert.throws(() => M.indirizzoFisico(0x10000, 0), RangeError);
  assert.throws(() => M.indirizzoFisico(0, -1), RangeError);
});

test('addizione in colonna per il laboratorio', () => {
  assert.deepStrictEqual(M.colonne(0xB800, 0x0000, false), { base: 'B8000', offset: '0000', somma: 'B8000', fisico: 'B8000', giro: false, oltre: false });
  const g = M.colonne(0xFFFF, 0x0010, false);
  assert.strictEqual(g.base, 'FFFF0');
  assert.strictEqual(g.somma, '100000');
  assert.strictEqual(g.fisico, '00000');
  assert.strictEqual(g.giro, true);
  assert.strictEqual(M.colonne(0xFFFF, 0x0010, true).fisico, '100000');
});

test('formattazione e lettura dell\'esadecimale', () => {
  assert.strictEqual(M.esa(0xB8000, 5), 'B8000');
  assert.strictEqual(M.esa(0x10, 4), '0010');
  assert.strictEqual(M.esa(255), 'FF');
  assert.strictEqual(M.coppia(0xB800, 0), 'B800:0000');
  assert.strictEqual(M.leggiEsa('B800'), 0xB800);
  assert.strictEqual(M.leggiEsa(' b800h '), 0xB800);
  assert.strictEqual(M.leggiEsa('0xFFFF'), 0xFFFF);
  assert.strictEqual(M.leggiEsa('10'), 0x10);
  assert.ok(Number.isNaN(M.leggiEsa('')));
  assert.ok(Number.isNaN(M.leggiEsa('G00D')));
  assert.ok(Number.isNaN(M.leggiEsa('10000')), 'oltre FFFF non è un segmento valido');
  assert.strictEqual(M.leggiEsa('10000', 0xFFFFF), 0x10000);
});

test('la mappa della memoria copre 1 MB senza buchi e con le zone giuste', () => {
  assert.strictEqual(M.UN_MEGA, Math.pow(2, 20), '20 linee di indirizzo = 2^20 byte');
  assert.strictEqual(M.MAPPA[0].da, 0);
  for (let i = 1; i < M.MAPPA.length; i++) assert.strictEqual(M.MAPPA[i].da, M.MAPPA[i - 1].a + 1, 'zone contigue: ' + M.MAPPA[i].id);
  assert.strictEqual(M.MAPPA[M.MAPPA.length - 1].a, 0xFFFFF);
  const kb = Object.fromEntries(M.MAPPA.map((z) => [z.id, M.dimensioneKB(z)]));
  assert.deepStrictEqual(kb, { convenzionale: 640, video: 128, 'rom-schede': 192, 'rom-sistema': 64 });
  assert.strictEqual(M.MAPPA.reduce((t, z) => t + M.dimensioneKB(z), 0), 1024);
  assert.strictEqual(M.regione(0x9FFFF).id, 'convenzionale');
  assert.strictEqual(M.regione(0xA0000).id, 'video');
  assert.strictEqual(M.regione(0xB8000).id, 'video');
  assert.strictEqual(M.regione(0xC8000).id, 'rom-schede');
  assert.strictEqual(M.regione(0xFFFF0).id, 'rom-sistema');
  assert.strictEqual(M.regione(0x100000).id, 'oltre');
  assert.strictEqual(M.regione(0x110000), null);
});

test('i dettagli dividono il megabyte in pezzi contigui, ognuno dentro la sua zona', () => {
  const D = M.DETTAGLI;
  assert.strictEqual(D[0].da, 0);
  assert.strictEqual(D[D.length - 1].a, 0xFFFFF);
  const ids = new Set();
  D.forEach((d, i) => {
    assert.ok(d.a >= d.da, d.id + ': intervallo rovesciato');
    if (i) assert.strictEqual(d.da, D[i - 1].a + 1, 'buco o sovrapposizione prima di ' + d.id);
    const z = M.MAPPA.find((r) => r.id === d.regione);
    assert.ok(z && d.da >= z.da && d.a <= z.a, d.id + ' esce dalla zona ' + d.regione);
    assert.ok(!ids.has(d.id), 'id ripetuto ' + d.id);
    ids.add(d.id);
    assert.ok(d.nome && d.breve && d.testo.length > 20, d.id + ': testi mancanti');
  });
  assert.strictEqual(M.dettaglio(0xB8000).id, 'cga');
  assert.strictEqual(M.dettaglio(0xB0000).id, 'mda');
  assert.strictEqual(M.dettaglio(0xFFFF0).id, 'reset');
  assert.strictEqual(M.dettaglio(0xFE05B).id, 'bios');
  assert.strictEqual(M.dettaglio(0xF6000).id, 'basic');
  assert.strictEqual(M.dettaglio(0x003FF).id, 'ivt');
  // Dimensioni note: vettori 1 KB, MDA 4 KB, CGA 16 KB, BASIC 32 KB, BIOS 8 KB (16 byte di reset compresi).
  const kb = (id) => M.dimensioneKB(D.find((d) => d.id === id));
  assert.strictEqual(kb('ivt'), 1);
  assert.strictEqual(kb('mda'), 4);
  assert.strictEqual(kb('cga'), 16);
  assert.strictEqual(kb('basic'), 32);
  assert.strictEqual(kb('bios') + kb('reset'), 8);
});

test('gli esempi del calcolatore sono coerenti con la mappa', () => {
  const dove = (id) => { const e = M.esempio(id); return M.dettaglio(M.indirizzoFisico(e.seg, e.off, false).fisico).id; };
  assert.strictEqual(dove('cga'), 'cga');
  assert.strictEqual(dove('mda'), 'mda');
  assert.strictEqual(dove('reset'), 'reset');
  assert.strictEqual(dove('vettori'), 'ivt');
  assert.strictEqual(dove('oltre'), 'ivt', 'FFFF:0010 senza A20 cade sui vettori di interruzione');
  const ids = M.ESEMPI.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  M.ESEMPI.forEach((e) => assert.ok(e.seg <= 0xFFFF && e.off <= 0xFFFF && e.testo.length > 30, e.id));
});

test('i pezzi del 5150 hanno testi, dati e collegamenti validi', () => {
  const C = M.COMPONENTI;
  assert.ok(C.length >= 12 && C.length <= 20);
  const ids = C.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'id ripetuti');
  ['cpu', 'fpu', 'bios', 'basic', 'ram', 'slot', 'video', 'fdc', 'psu', 'floppy', 'speaker', 'pit', 'pic', 'dma', 'ppi', 'din']
    .forEach((id) => assert.ok(M.componente(id), 'manca il pezzo ' + id));
  C.forEach((c) => {
    assert.ok(c.nome && c.gruppo, c.id);
    assert.ok(c.testo.replace(/<[^>]+>/g, '').length > 80, c.id + ': testo troppo corto');
    assert.ok(Array.isArray(c.dati) && c.dati.length >= 2 && c.dati.every((d) => d.length === 2 && d[0] && d[1]), c.id + ': dati');
    if (c.mappa) assert.ok(M.esempio(c.mappa), c.id + ': esempio di mappa inesistente ' + c.mappa);
  });
  // Numeri che compaiono anche nel testo del capitolo.
  assert.ok(M.componente('cpu').dati.some((d) => d[1] === '4,77 MHz'));
  assert.ok(M.componente('psu').dati.some((d) => d[1] === '63,5 W'));
  assert.ok(/160 KB/.test(M.componente('floppy').testo));
});

test('il capitolo si carica in Node e rispetta il contratto', () => {
  const SEC = path.join(__dirname, '..', 'sections', 'storia-pc');
  const P = require(path.join(SEC, 'js', 'core.js'));
  require(path.join(SEC, 'js', 'capitoli', '04-ibm-pc.js'));
  const c = P.capitoli.find((x) => x.id === 'ibm-pc');
  assert.ok(c, 'capitolo non registrato');
  assert.strictEqual(c.numero, 4);
  assert.strictEqual(c.periodo, '1981–1987');
  const testi = c.blocchi.filter((b) => b.tipo === 'testo');
  assert.ok(testi.length >= 4 && testi.length <= 6);
  const parole = testi.flatMap((b) => b.paragrafi).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(parole >= 1400 && parole <= 2200, 'parole nei testi: ' + parole);
  const schede = c.blocchi.find((b) => b.tipo === 'schede').items;
  assert.ok(schede.length >= 7 && schede.length <= 12);
  for (let i = 1; i < schede.length; i++) assert.ok(schede[i].anno >= schede[i - 1].anno, 'schede in ordine di anno');
  assert.ok(schede.some((s) => s.italia), 'manca una scheda italiana');
  assert.ok(c.blocchi.some((b) => b.tipo === 'italia'));
  assert.ok(c.blocchi.some((b) => b.tipo === 'nota'));
  assert.ok(c.blocchi.some((b) => b.tipo === 'numeri' && b.items.length >= 3 && b.items.length <= 4));
  assert.ok(c.blocchi.filter((b) => b.tipo === 'figura').every((b) => typeof b.svg === 'function' && b.alt.length > 30));
  assert.ok(c.punti.length >= 4 && c.punti.length <= 6);
  assert.ok(c.collegamenti.some((l) => l.href === '../../index.html#/bus/isa'));
});
