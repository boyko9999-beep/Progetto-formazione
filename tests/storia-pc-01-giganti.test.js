// Sezione 6, capitolo 1 (I giganti): dati e logica del laboratorio «Il computer che si rimpicciolisce».
// node --test tests/storia-pc-01-giganti.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../sections/storia-pc/js/modelli/01-giganti.js');

const vicino = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);

test('sette macchine, dalla più vecchia alla più nuova, con id unici', () => {
  assert.strictEqual(M.MACCHINE.length, 7);
  const id = M.MACCHINE.map((m) => m.id);
  assert.strictEqual(new Set(id).size, id.length);
  assert.deepStrictEqual(id, ['eniac', 'univac', 'ibm1401', 'pdp8', 'ibmpc', 'portatile', 'smartphone']);
  for (let i = 1; i < M.MACCHINE.length; i++) {
    assert.ok(M.MACCHINE[i].anno >= M.MACCHINE[i - 1].anno, 'anni fuori ordine a ' + id[i]);
  }
  assert.strictEqual(M.RIFERIMENTO.id, 'eniac');
  assert.strictEqual(M.trova('pdp8').nome, 'PDP-8');
  assert.strictEqual(M.trova('zx81'), null);
});

test('i dati sono plausibili: valori positivi, intervalli ordinati, testi con le cautele', () => {
  for (const m of M.MACCHINE) {
    ['nome', 'epoca', 'luogo', 'tecnologia', 'prezzo', 'diffusione', 'racconto'].forEach((k) => assert.ok(typeof m[k] === 'string' && m[k].length > 2, m.id + ': manca ' + k));
    for (const k of M.CHIAVI) {
      const v = m[k];
      if (v === null) continue;
      assert.ok(typeof v.testo === 'string' && v.testo.length > 2, m.id + '.' + k + ' senza testo');
      if (v.min != null) {
        assert.ok(v.min > 0 && v.max > v.min, m.id + '.' + k + ' intervallo non valido');
        assert.ok(v.val == null, m.id + '.' + k + ': o valore o intervallo');
      } else {
        assert.ok(v.val > 0, m.id + '.' + k + ' non positivo');
      }
      // il valore deve stare dentro la scala della barra, senza essere tagliato
      const sc = M.GRANDEZZE[k].scala;
      const lo = v.min != null ? v.min : v.val;
      const hi = v.max != null ? v.max : v.val;
      assert.ok(lo > sc[0] && hi < sc[1], m.id + '.' + k + ' fuori scala');
    }
    const sc = m.scena;
    assert.ok(sc.scatola.w > 0 && sc.scatola.h > 0 && sc.vicino.w > 0 && sc.vicino.h > 0, m.id + ': scena senza misure');
    assert.ok(sc.personaX + M.LARGHEZZA_PERSONA / 2 < Math.min(sc.scatola.x, sc.scrivania ? M.SCRIVANIA.x : Infinity), m.id + ': la persona si sovrappone alla macchina');
    if (sc.scrivania) assert.ok(vicino(sc.scatola.y, M.SCRIVANIA.altezza), m.id + ': deve stare sopra la scrivania');
    // la quota sul pavimento misura un pezzo della macchina, solo per le macchine a terra
    if (sc.quota) {
      assert.ok(!sc.scrivania && sc.quota.w > 0, m.id + ': quota non valida');
      assert.ok(sc.quota.x >= sc.scatola.x - 1e-9 && sc.quota.x + sc.quota.w <= sc.scatola.x + sc.scatola.w + 1e-9, m.id + ': la quota esce dalla macchina');
      assert.ok(sc.quota.testo.includes(M.testoLunghezza(sc.quota.w)), m.id + ': testo della quota diverso dalla misura');
    }
  }
  // le cifre dei testi coincidono con i valori
  const eniac = M.trova('eniac');
  assert.strictEqual(eniac.massa.val, 27000);
  assert.match(eniac.tecnologia, /17\.468 valvole/);
  assert.strictEqual(M.trova('ibmpc').potenza.val, 63.5);
  // la massa del PDP-8 non ha una fonte affidabile: manca invece di essere inventata
  assert.strictEqual(M.trova('pdp8').massa, null);
  // le macchine moderne sono dichiarate come stime
  ['portatile', 'smartphone'].forEach((id) => assert.match(M.trova(id).ops.testo, /stima/));
});

test('il PDP-8 fa un\'addizione ogni due cicli di memoria da 1,5 µs', () => {
  const pdp8 = M.trova('pdp8');
  assert.ok(vicino(pdp8.ops.val, 1 / (2 * 1.5e-6), 1e-6));
  assert.strictEqual(M.formatoOps(pdp8.ops.val), '330.000');
});

test('numeri all\'italiana, arrotondamenti e parole per i numeri grandi', () => {
  assert.strictEqual(M.numero(17468), '17.468');
  assert.strictEqual(M.numero(5000), '5.000');
  assert.strictEqual(M.numero(4.77, 2), '4,77');
  assert.strictEqual(M.numero(1234567.891, 1), '1.234.567,9');
  assert.strictEqual(M.arrotonda(142105, 2), 140000);
  assert.strictEqual(M.arrotonda(0.0191, 2), 0.019);
  assert.strictEqual(M.grande(5000), '5.000');
  assert.strictEqual(M.grande(2e7), '20 milioni');
  assert.strictEqual(M.grande(1e9), '1 miliardo');
  assert.strictEqual(M.grande(1.5e6), '1,5 milioni');
  assert.strictEqual(M.volte(2e7), '20 milioni di volte');
  assert.strictEqual(M.volte(142105), '140.000 volte');
  assert.strictEqual(M.volte(2.6247), '2,6 volte');
  assert.strictEqual(M.volte(66.67), '67 volte');
});

test('valori con i prefissi giusti', () => {
  assert.strictEqual(M.formatoMassa(27000), '27 t');
  assert.strictEqual(M.formatoMassa(7600), '7,6 t');
  assert.strictEqual(M.formatoMassa(20.4), '20,4 kg');
  assert.strictEqual(M.formatoMassa(1.3), '1,3 kg');
  assert.strictEqual(M.formatoMassa(0.19), '190 g');
  assert.strictEqual(M.formatoPotenza(150000), '150 kW');
  assert.strictEqual(M.formatoPotenza(125000), '125 kW');
  assert.strictEqual(M.formatoPotenza(2900), '2,9 kW');
  assert.strictEqual(M.formatoPotenza(63.5), '63,5 W');
  assert.strictEqual(M.formatoPotenza(5), '5 W');
  assert.strictEqual(M.formatoSuperficie(167), '167 m²');
  assert.strictEqual(M.formatoSuperficie(0.4), '0,4 m²');
  assert.strictEqual(M.formatoSuperficie(0.063), '630 cm²');
  assert.strictEqual(M.formatoOps(1905), '1.900');
  assert.strictEqual(M.formatoOps(2e11), '200 miliardi');
  assert.strictEqual(M.formato('massa', { min: 2000, max: 4000 }), '2–4 t');
  assert.strictEqual(M.formato('potenza', { min: 2900, max: 13000 }), '2,9–13 kW');
  assert.strictEqual(M.formato('massa', null), null);
});

test('confronti con l\'ENIAC: rapporti e frasi', () => {
  const tel = M.trova('smartphone');
  const univac = M.trova('univac');
  assert.ok(vicino(M.rapporto(tel.ops, M.RIFERIMENTO.ops), 2e7, 1e-3));
  assert.strictEqual(M.fraseRapporto('ops', tel.ops, M.RIFERIMENTO.ops), '20 milioni di volte più veloce');
  assert.strictEqual(M.fraseRapporto('massa', tel.massa, M.RIFERIMENTO.massa), '140.000 volte più leggero');
  assert.strictEqual(M.fraseRapporto('potenza', tel.potenza, M.RIFERIMENTO.potenza), 'consuma 30.000 volte meno');
  // la sala dell'ENIAC è un intervallo (140-167 m²): il confronto usa la media geometrica, circa 153 m²
  assert.strictEqual(M.fraseRapporto('superficie', tel.superficie, M.RIFERIMENTO.superficie), 'occupa 14.000 volte meno spazio');
  assert.ok(vicino(M.rappresentativo(M.RIFERIMENTO.superficie), Math.sqrt(140 * 167)));
  // l'UNIVAC I era più lento dell'ENIAC nelle somme semplici
  assert.strictEqual(M.fraseRapporto('ops', univac.ops, M.RIFERIMENTO.ops), '2,6 volte più lento');
  // differenze piccole a parole, niente "1,2 volte meno"
  assert.strictEqual(M.fraseRapporto('potenza', univac.potenza, M.RIFERIMENTO.potenza), 'consuma un po\' meno');
  assert.strictEqual(M.fraseRapporto('ops', { val: 6500 }, M.RIFERIMENTO.ops), 'un po\' più veloce');
  // per gli intervalli la frase dà entrambi gli estremi
  assert.strictEqual(M.fraseRapporto('massa', univac.massa, M.RIFERIMENTO.massa), 'da 2,1 a 3,6 volte più leggero');
  assert.strictEqual(M.fraseRapporto('ops', M.RIFERIMENTO.ops, M.RIFERIMENTO.ops), 'è il termine di paragone');
  assert.strictEqual(M.fraseRapporto('ops', { val: 5050 }, M.RIFERIMENTO.ops), 'circa come l\'ENIAC');
  assert.strictEqual(M.fraseRapporto('massa', null, M.RIFERIMENTO.massa), null);
  assert.ok(vicino(M.rappresentativo({ min: 2, max: 8 }), 4));
});

test('barre logaritmiche: ogni potenza di dieci occupa lo stesso spazio', () => {
  const sc = [1e2, 1e12];
  assert.strictEqual(M.frazioneLog(1e2, sc), 0);
  assert.strictEqual(M.frazioneLog(1e12, sc), 1);
  assert.ok(vicino(M.frazioneLog(1e7, sc), 0.5));
  assert.ok(vicino(M.frazioneLog(1e4, sc) - M.frazioneLog(1e3, sc), M.frazioneLog(1e11, sc) - M.frazioneLog(1e10, sc)));
  assert.strictEqual(M.frazioneLog(1e15, sc), 1);
  for (const m of M.MACCHINE) {
    for (const k of M.CHIAVI) {
      const c = M.confronto(m, k);
      assert.ok(c.rif > 0 && c.rif < 1, 'marcatore ENIAC fuori barra');
      if (c.manca) { assert.strictEqual(m[k], null); continue; }
      assert.ok(c.da <= c.frazione + 1e-12 && c.frazione <= c.a + 1e-12, m.id + '.' + k + ' barra incoerente');
      assert.ok(typeof c.frase === 'string' && c.valore, m.id + '.' + k + ' senza frase');
    }
  }
  // le macchine moderne sono le più veloci, l'ENIAC la più pesante
  const ops = M.MACCHINE.map((m) => M.rappresentativo(m.ops));
  assert.strictEqual(Math.max(...ops), M.trova('portatile').ops.val);
  const masse = M.MACCHINE.filter((m) => m.massa).map((m) => M.rappresentativo(m.massa));
  assert.strictEqual(Math.max(...masse), 27000);
});

test('inquadrature: rispettano il formato dello schermo e contengono la scena', () => {
  for (const aspetto of [1.4, 2.35]) {
    for (const m of M.MACCHINE) {
      const box = M.scatolaLarga(m);
      const q = M.inquadraturaLarga(m, aspetto);
      const h = q.larghezza / aspetto;
      assert.ok(q.cx - q.larghezza / 2 <= box.x && q.cx + q.larghezza / 2 >= box.x + box.w, m.id + ': la scena esce ai lati');
      assert.ok(q.cy - h / 2 <= 0 && q.cy + h / 2 >= box.y + box.h, m.id + ': la scena esce in alto o in basso');
      // il pavimento sta in basso: sotto i piedi solo il 10% dell'inquadratura
      assert.ok(vicino((0 - (q.cy - h / 2)) / h, 0.1, 1e-9), m.id + ': troppa terra sotto i piedi');
    }
  }
  const box = { x: 1, y: 2, w: 4, h: 1 };
  const q = M.inquadratura(box, 2, { margine: 0 });
  assert.deepStrictEqual(q, { cx: 3, cy: 2.5, larghezza: 4 });
  assert.strictEqual(M.inquadratura(box, 8, { margine: 0 }).larghezza, 8);
});

test('percorsi della telecamera: l\'ENIAC si percorre, le macchine piccole si avvicinano', () => {
  const eniac = M.percorso(M.trova('eniac'), 2);
  assert.strictEqual(eniac.length, 3);
  assert.ok(eniac[1].cam.cx > eniac[0].cam.cx + 15, 'la panoramica deve percorrere la parete');
  assert.deepStrictEqual(eniac[2].cam, M.inquadraturaLarga(M.trova('eniac'), 2));
  const tel = M.percorso(M.trova('smartphone'), 2);
  assert.strictEqual(tel.length, 2);
  assert.strictEqual(tel[1].modo, 'vicino');
  assert.ok(tel[1].cam.larghezza < tel[0].cam.larghezza / 5, 'lo zoom sul telefono deve essere forte');
  assert.strictEqual(M.percorso(M.trova('pdp8'), 2).length, 1);
});

test('telecamera: zoom intorno a un punto fisso, estremi esatti, panoramica senza zoom', () => {
  const a = { cx: 15, cy: 6, larghezza: 34 };
  const b = { cx: 0.64, cy: 0.83, larghezza: 0.3 };
  assert.deepStrictEqual(M.telecamera(a, b, 0), a);
  assert.deepStrictEqual(M.telecamera(a, b, 1), b);
  const meta = M.telecamera(a, b, 0.5);
  assert.ok(vicino(meta.larghezza, Math.sqrt(a.larghezza * b.larghezza), 1e-9), 'lo zoom deve avanzare in modo geometrico');
  // il punto fisso F resta nello stesso punto dello schermo durante tutto il movimento
  const z0 = 1 / a.larghezza;
  const z1 = 1 / b.larghezza;
  const fx = (a.cx * z0 - b.cx * z1) / (z0 - z1);
  const schermo = (c) => (fx - c.cx) / c.larghezza;
  [0.1, 0.35, 0.8].forEach((k) => assert.ok(vicino(schermo(M.telecamera(a, b, k)), schermo(a), 1e-9)));
  const p = M.telecamera({ cx: 0, cy: 1, larghezza: 9 }, { cx: 20, cy: 1, larghezza: 9 }, 0.25);
  assert.ok(vicino(p.cx, 5) && vicino(p.larghezza, 9));
  const d = M.durataMovimento(a, b, 800);
  assert.ok(d >= 520 && d <= 2800);
  assert.strictEqual(M.durataMovimento(a, a, 800), 520);
});

test('barra della scala e griglia a potenze di dieci', () => {
  assert.deepStrictEqual(M.barraScala(24), { metri: 5, px: 120, testo: '5 m' });
  assert.strictEqual(M.barraScala(2600).testo, '5 cm');
  assert.strictEqual(M.barraScala(100).testo, '1 m');
  assert.strictEqual(M.barraScala(300).testo, '20 cm');
  for (const pxm of [3, 9.4, 24, 85, 310, 1200, 2600, 9000]) {
    const b = M.barraScala(pxm);
    assert.ok(b.px >= 56 && b.px <= 140, 'barra di ' + b.px + ' px a ' + pxm + ' px/m');
    const g = M.griglia(pxm);
    assert.ok(g.fine * pxm >= 8 - 1e-9 && g.fine * pxm < 80 + 1e-9, 'passo fine sbagliato a ' + pxm);
    assert.ok(g.alfaFine >= 0 && g.alfaFine <= 1);
    assert.ok(vicino(g.grossa, g.fine * 10, 1e-12));
  }
  assert.deepStrictEqual(M.griglia(24), { fine: 1, grossa: 10, alfaFine: 0.4 });
  assert.strictEqual(M.testoLunghezza(0.5), '50 cm');
  assert.strictEqual(M.testoLunghezza(0.005), '5 mm');
  assert.strictEqual(M.testoLunghezza(2), '2 m');
});
