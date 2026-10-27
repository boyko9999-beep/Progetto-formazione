// Sezione 6 · capitolo 7 (avvio): settori di avvio, conversioni CHS/LBA, impronta di Secure Boot, fasi del laboratorio.
// node --test tests/storia-pc-07-avvio.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const M = require('../sections/storia-pc/js/modelli/07-avvio.js');

test('costanti del settore di avvio: 446 + 64 + 2 = 512 byte', () => {
  assert.strictEqual(M.SETTORE, 512);
  assert.strictEqual(M.TABELLA, 0x1BE);
  assert.strictEqual(M.FIRMA, 0x1FE);
  assert.strictEqual(M.TABELLA + M.VOCI * M.VOCE, M.FIRMA);
  assert.strictEqual(M.FIRMA + 2, M.SETTORE);
});

test('indirizzi: FFFF:0000 è FFFF0h, 16 byte sotto 1 MB; 7C00h è 32 KB meno 1 KB', () => {
  assert.strictEqual(M.fisico(0xFFFF, 0x0000), 0xFFFF0);
  assert.strictEqual(M.VETTORE_8088, 0xFFFF0);
  assert.strictEqual(0x100000 - M.VETTORE_8088, 16);
  assert.strictEqual(0x100000000 - M.VETTORE_386, 16);
  assert.strictEqual(M.fisico(0x0000, 0x7C00), M.CARICAMENTO);
  assert.strictEqual(M.CARICAMENTO, 32 * 1024 - 1024);
  assert.strictEqual(M.CARICAMENTO, 31744);
  assert.strictEqual(M.fisico(0x07C0, 0x0000), M.CARICAMENTO, 'stesso indirizzo con un altro segmento');
  assert.strictEqual(M.segOff(0xF000, 0xE05B), 'F000:E05B');
  assert.strictEqual(M.esa(0xAA), 'AA');
  assert.strictEqual(M.esa(5, 4), '0005');
});

test('CHS → LBA: formula, casi noti e conversione inversa', () => {
  const d = M.GEOMETRIE.disco;
  const f = M.GEOMETRIE.dischetto;
  assert.strictEqual(M.settoriTotali(f) * 512, 160 * 1024, 'il dischetto del 1981 contiene 160 KB');
  assert.strictEqual(M.chsInLba(0, 0, 1, d), 0, 'il primo settore del disco è il settore 1 di cilindro 0, testina 0');
  assert.strictEqual(M.chsInLba(0, 1, 1, d), 17);
  assert.strictEqual(M.chsInLba(1, 0, 1, d), 68);
  assert.strictEqual(M.chsInLba(614, 3, 17, d), M.settoriTotali(d) - 1);
  assert.strictEqual(M.chsInLba(39, 0, 8, f), 319);
  assert.throws(() => M.chsInLba(0, 0, 0, d), RangeError, 'i settori si contano da 1');
  assert.throws(() => M.chsInLba(0, 4, 1, d), RangeError);
  assert.throws(() => M.chsInLba(615, 0, 1, d), RangeError);
  for (const lba of [0, 1, 16, 17, 68, 1000, 20000, M.settoriTotali(d) - 1]) {
    const chs = M.lbaInChs(lba, d);
    assert.strictEqual(M.chsInLba(chs.c, chs.h, chs.s, d), lba, 'andata e ritorno per ' + lba);
  }
  assert.throws(() => M.lbaInChs(M.settoriTotali(d), d), RangeError);
});

test('codifica CHS nei 3 byte della tabella, con i 2 bit alti del cilindro nel byte del settore', () => {
  assert.deepStrictEqual(M.codificaChs({ c: 614, h: 3, s: 17 }), [0x03, 0x91, 0x66]);
  assert.deepStrictEqual(M.codificaChs({ c: 0, h: 1, s: 1 }), [0x01, 0x01, 0x00]);
  for (const chs of [{ c: 0, h: 0, s: 1 }, { c: 255, h: 15, s: 63 }, { c: 256, h: 1, s: 2 }, { c: 1023, h: 254, s: 63 }]) {
    const b = M.codificaChs(chs);
    assert.deepStrictEqual(M.decodificaChs(b[0], b[1], b[2]), chs);
  }
  assert.throws(() => M.codificaChs({ c: 1024, h: 0, s: 1 }), RangeError, 'oltre 1023 cilindri la tabella non basta');
});

test('il limite della tabella MBR: 2^32 settori da 512 byte, circa 2,2 TB', () => {
  assert.strictEqual(M.limiteMbr(), 2199023255552);
  assert.strictEqual(M.limiteMbr() / Math.pow(1024, 4), 2, 'cioè 2 TiB');
  assert.ok(Math.abs(M.limiteMbr() / 1e12 - 2.2) < 0.01);
  assert.strictEqual(M.limiteMbr(4096), 8 * M.limiteMbr() , 'con settori da 4096 byte il limite sale a 16 TiB');
});

test('MBR di esempio: firma, tabella delle partizioni coerente con la geometria, zone', () => {
  const mbr = M.settoreMbr();
  const b = mbr.byte;
  assert.strictEqual(b.length, 512);
  assert.strictEqual(b[510], 0x55);
  assert.strictEqual(b[511], 0xAA);
  assert.ok(M.avviabile(b));
  assert.strictEqual(b[0], 0xFA, 'comincia con CLI');
  assert.deepStrictEqual(Array.from(b.slice(5, 8)), [0xBC, 0x00, 0x7C], 'MOV SP,7C00h');
  // la voce 1 è attiva, FAT16, dal settore 17 alla fine del disco; le altre tre sono vuote
  const g = M.GEOMETRIE.disco;
  const v = M.leggiVoce(b, 0);
  assert.ok(v.attiva);
  assert.strictEqual(v.stato, 0x80);
  assert.strictEqual(v.tipo, 0x04);
  assert.deepStrictEqual(v.inizio, { c: 0, h: 1, s: 1 });
  assert.deepStrictEqual(v.fine, { c: 614, h: 3, s: 17 });
  assert.strictEqual(v.lba, M.chsInLba(0, 1, 1, g));
  assert.strictEqual(v.lba + v.settori - 1, M.chsInLba(614, 3, 17, g));
  assert.strictEqual(v.settori, 41803);
  assert.deepStrictEqual(Array.from(b.slice(446, 462)), [0x80, 0x01, 0x01, 0x00, 0x04, 0x03, 0x91, 0x66, 0x11, 0x00, 0x00, 0x00, 0x4B, 0xA3, 0x00, 0x00]);
  for (let i = 1; i < 4; i++) assert.ok(M.leggiVoce(b, i).vuota, 'voce ' + (i + 1) + ' vuota');
  const n = M.contaZone(mbr.zone);
  assert.strictEqual(n.tabella, 64);
  assert.strictEqual(n.firma, 2);
  assert.strictEqual((n.codice || 0) + (n.testo || 0) + (n.vuoto || 0), 446);
  // i messaggi d'errore dell'MBR sono nella zona del codice, terminati da zero
  const testo = String.fromCharCode(...b.slice(0x8B, 0x8B + 23));
  assert.strictEqual(testo, 'Invalid partition table');
  assert.strictEqual(b[0x8B + 23], 0);
});

test('senza firma il settore non è avviabile; il dischetto del 1981 non aveva firma', () => {
  const senza = M.settoreMbr({ senzaFirma: true });
  assert.ok(!M.avviabile(senza.byte));
  assert.strictEqual(M.contaZone(senza.zone).nofirma, 2);
  const d = M.settoreDischetto();
  assert.strictEqual(d.byte.length, 512);
  assert.ok(!M.avviabile(d.byte));
  assert.strictEqual(d.byte[0], 0xEB, 'comincia con un salto');
  assert.ok(!M.avviabile(new Uint8Array(511)), 'un settore deve avere 512 byte');
  const finto = new Uint8Array(512); finto[510] = 0xAA; finto[511] = 0x55;
  assert.ok(!M.avviabile(finto), 'conta l\'ordine dei due byte');
});

test('impronta FNV-1a e verifica della firma: un byte cambiato basta a bloccare l\'avvio', () => {
  assert.strictEqual(M.impronta([]), 0x811C9DC5);
  assert.strictEqual(M.impronta(M.daTesto('a')), 0xE40C292C);
  assert.strictEqual(M.impronta(M.daTesto('foobar')), 0xBF9CF968);
  const buono = M.caricatore(false);
  const cattivo = M.caricatore(true);
  assert.strictEqual(buono.length, 32);
  assert.deepStrictEqual(buono.slice(0, 2), [0x4D, 0x5A], 'i file .efi cominciano con MZ');
  assert.strictEqual(buono.filter((x, i) => x !== cattivo[i]).length, 1, 'cambia un solo byte');
  assert.notStrictEqual(buono[M.BYTE_MANOMESSO], cattivo[M.BYTE_MANOMESSO]);
  assert.ok(M.verificaFirma(buono));
  assert.ok(!M.verificaFirma(cattivo));
  assert.notStrictEqual(M.impronta(buono), M.impronta(cattivo));
});

test('scenari del laboratorio: fasi complete, nomi corti, ordine UEFI SEC → PEI → DXE → BDS', () => {
  const ids = Object.keys(M.SCENARI);
  assert.deepStrictEqual(ids.sort(), ['compatibile', 'ibm', 'ibm-ram', 'ibm-vuoto', 'uefi', 'uefi-ko']);
  for (const id of ids) {
    const s = M.SCENARI[id];
    assert.ok(s.fasi.length >= 4 && s.fasi.length <= 8, id + ': numero di fasi');
    assert.strictEqual(new Set(s.fasi.map((f) => f.id)).size, s.fasi.length, id + ': id delle fasi ripetuti');
    assert.ok(M.MODI[s.modo].scenari.includes(id), id + ': scenario fuori dal suo modo');
    assert.strictEqual(s.fasi[0].id, 'corrente', id + ': si parte dalla corrente');
    s.fasi.forEach((f) => {
      assert.ok(f.nome && f.nome.length <= 10, id + ': nome troppo lungo per la linea delle fasi: ' + f.nome);
      assert.ok(f.titolo && f.testo && f.testo.length > 60, id + ': fase senza spiegazione ' + f.id);
      assert.ok(Number.isFinite(f.durata) && f.durata >= 800 && f.durata <= 5000, id + ': durata ' + f.id);
      assert.ok(!/[`]/.test(f.testo));
    });
    assert.ok(M.durataTotale(id) < 20000, id + ': l\'avvio animato deve restare breve');
  }
  const fine = (id) => M.SCENARI[id].fasi[M.SCENARI[id].fasi.length - 1];
  assert.strictEqual(fine('ibm').id, 'dos');
  assert.strictEqual(fine('compatibile').id, 'dos');
  assert.strictEqual(fine('ibm-vuoto').id, 'basic');
  assert.strictEqual(fine('ibm-ram').esito, 'errore');
  assert.strictEqual(fine('uefi-ko').esito, 'errore');
  assert.strictEqual(fine('uefi').id, 'os');
  const uefi = M.SCENARI.uefi.fasi.map((f) => f.id);
  const ordine = ['sec', 'pei', 'dxe', 'bds', 'firma', 'caricatore', 'os'].map((x) => uefi.indexOf(x));
  assert.ok(ordine.every((x, i) => x > 0 && (i === 0 || x > ordine[i - 1])), 'ordine delle fasi UEFI');
  assert.ok(M.SCENARI.ibm.fasi.some((f) => /7C00/.test(f.testo)));
});

test('POST, codici di errore e schermate', () => {
  const ibm = M.POST_IBM.map((p) => p.id);
  ['cpu', 'rom', 'timer', 'ram16', 'video', 'ram', 'tastiera', 'dischetti'].forEach((id) => assert.ok(ibm.includes(id), 'manca ' + id));
  assert.ok(ibm.indexOf('cpu') < ibm.indexOf('rom') && ibm.indexOf('rom') < ibm.indexOf('ram16') && ibm.indexOf('video') < ibm.indexOf('ram'));
  assert.ok(M.POST_COMPATIBILE.some((p) => p.id === 'cmos'));
  assert.strictEqual(M.ERRORI_IBM['201'], 'memoria');
  assert.strictEqual(M.ERRORI_IBM['301'], 'tastiera');
  assert.strictEqual(M.ERRORI_IBM['601'], 'dischetti');
  assert.strictEqual(M.BIP_IBM[0].significato, 'tutto a posto');
  assert.ok(/ 201$/.test(M.SCHERMI.errore[0]));
  const righe = [].concat(M.SCHERMI.dos1, M.SCHERMI.basic, M.SCHERMI.dos3, M.SCHERMI.compatibileTesta, M.SCHERMI.secureBoot, [M.SCHERMI.dosData + M.SCHERMI.dataLancio, M.SCHERMI.tastiBasic, M.SCHERMI.setup]);
  righe.forEach((r) => assert.ok(r.length <= 40, 'riga troppo lunga per lo schermo da 40 colonne: ' + r));
  assert.ok(M.VOCI_AVVIO.every((v) => /\.efi$/i.test(v.file)));
  assert.strictEqual(M.DISCO_GPT[0].fs, 'FAT32');
});

test('il capitolo: schede in ordine di anno, laboratorio, collegamenti', () => {
  const P = require('../sections/storia-pc/js/core.js');
  require('../sections/storia-pc/js/capitoli/07-avvio.js');
  const cap = P.capitoli.find((c) => c.id === 'avvio');
  assert.ok(cap, 'capitolo registrato');
  const schede = cap.blocchi.find((b) => b.tipo === 'schede');
  assert.ok(schede.items.length >= 7 && schede.items.length <= 12);
  schede.items.forEach((it, i) => {
    if (i) assert.ok(it.anno >= schede.items[i - 1].anno, 'schede fuori ordine: ' + it.nome);
  });
  const testi = cap.blocchi.filter((b) => b.tipo === 'testo');
  const parole = testi.map((b) => b.paragrafi.join(' ')).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(parole >= 1400 && parole <= 2300, 'parole dei testi: ' + parole);
  assert.ok(cap.blocchi.filter((b) => b.tipo === 'figura').length >= 2);
  assert.ok(cap.blocchi.some((b) => b.tipo === 'numeri') && cap.blocchi.some((b) => b.tipo === 'nota'));
  assert.strictEqual(typeof cap.lab.crea, 'function');
  assert.ok(path.basename(__filename).includes(cap.id));
});
