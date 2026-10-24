// Laboratorio «Il percettrone che impara»: regola di apprendimento, convergenza, XOR e rete a due strati.
// node --test sections/programmazione/test/percettrone.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const P = require(path.join(__dirname, '..', 'js', 'lab', 'percettrone.js'));
const { INGRESSI, FUNZIONI } = P;

function valutaTutti(pesi) { return INGRESSI.map((x) => P.predici(pesi, x)); }

test('il modulo si carica in Node senza DOM ed esporta la logica', () => {
  for (const k of ['nuovo', 'passo', 'epoca', 'addestra', 'regola', 'predici', 'dueStrati', 'pesiCasuali', 'retta', 'zonaUno']) {
    assert.strictEqual(typeof P[k], 'function', 'manca ' + k);
  }
  assert.deepStrictEqual(FUNZIONI.AND.uscite, [0, 0, 0, 1]);
  assert.deepStrictEqual(FUNZIONI.OR.uscite, [0, 1, 1, 1]);
  assert.deepStrictEqual(FUNZIONI.XOR.uscite, [0, 1, 1, 0]);
});

test('soglia a gradino: risponde 1 quando la somma pesata è almeno zero', () => {
  assert.strictEqual(P.gradino(0), 1);
  assert.strictEqual(P.gradino(0.01), 1);
  assert.strictEqual(P.gradino(-0.01), 0);
  const pesi = { w1: 0.4, w2: -0.12, b: 0.3 };
  assert.strictEqual(P.somma(pesi, [1, 0]), 0.7);
  assert.strictEqual(P.predici(pesi, [1, 0]), 1);
  assert.strictEqual(P.predici(pesi, [0, 0]), 1);
  assert.strictEqual(P.predici({ w1: 0.4, w2: -0.5, b: 0 }, [0, 1]), 0);
});

test('regola del percettrone: w ← w + η (t − y) x', () => {
  const pesi = { w1: 0.4, w2: -0.12, b: 0.3 };
  // Risposta giusta: nessuna correzione.
  const giusta = P.regola(pesi, [1, 1], 1, 0.25);
  assert.strictEqual(giusta.errore, 0);
  assert.deepStrictEqual(giusta.dopo, pesi);
  // Risponde 1 ma doveva rispondere 0: scendono il peso dell'ingresso acceso e il bias, non quello spento.
  const sbagliata = P.regola(pesi, [1, 0], 0, 0.25);
  assert.strictEqual(sbagliata.y, 1);
  assert.strictEqual(sbagliata.errore, -1);
  assert.deepStrictEqual(sbagliata.dopo, { w1: 0.15, w2: -0.12, b: 0.05 });
  // Risponde 0 ma doveva rispondere 1: salgono.
  const sale = P.regola({ w1: -0.2, w2: -0.3, b: -0.1 }, [0, 1], 1, 0.5);
  assert.strictEqual(sale.errore, 1);
  assert.deepStrictEqual(sale.dopo, { w1: -0.2, w2: 0.2, b: 0.4 });
});

test('un passo avanza di un esempio e chiude l\'epoca dopo il quarto', () => {
  let s = P.nuovo({ w1: 0, w2: 0, b: -0.1 }, 'OR', 0.5);
  assert.strictEqual(s.epoca, 0);
  for (let i = 0; i < 3; i++) {
    const r = P.passo(s);
    assert.strictEqual(r.esempio.indice, i);
    assert.strictEqual(r.fineEpoca, false);
    s = r.stato;
  }
  const r = P.passo(s);
  assert.strictEqual(r.fineEpoca, true);
  assert.strictEqual(r.stato.epoca, 1);
  assert.strictEqual(r.stato.indice, 0);
  const e = P.epoca(r.stato);
  assert.strictEqual(e.passi.length, 4);
  assert.strictEqual(e.stato.epoca, 2);
});

test('AND e OR convergono: dai pesi iniziali del laboratorio e da mille semi diversi', () => {
  for (const funzione of ['AND', 'OR']) {
    const iniziale = P.addestra(P.nuovo(P.pesiCasuali(P.SEME_INIZIALE), funzione, P.ETA_INIZIALE));
    assert.ok(iniziale.imparato, funzione + ' dal seme iniziale');
    assert.ok(iniziale.epoca <= 10, funzione + ' in poche epoche (' + iniziale.epoca + ')');
    assert.deepStrictEqual(valutaTutti(iniziale.pesi), FUNZIONI[funzione].uscite);
    for (const eta of [0.05, 0.1, 0.25, 0.5, 1]) {
      for (let seme = 1; seme <= 1000; seme++) {
        const s = P.addestra(P.nuovo(P.pesiCasuali(seme), funzione, eta));
        assert.ok(s.imparato, funzione + ' non converge con seme ' + seme + ' ed η = ' + eta);
        assert.ok(s.epoca < P.EPOCHE_MAX, 'troppe epoche');
        assert.strictEqual(P.contaErrori(s.pesi, funzione), 0);
      }
    }
  }
});

test('XOR non converge: dopo N epoche il percettrone sbaglia ancora', () => {
  for (const eta of [0.05, 0.25, 1]) {
    for (let seme = 1; seme <= 200; seme++) {
      const s = P.addestra(P.nuovo(P.pesiCasuali(seme), 'XOR', eta), 100);
      assert.strictEqual(s.imparato, false, 'XOR imparato con seme ' + seme);
      assert.strictEqual(s.epoca, 100);
      assert.ok(P.contaErrori(s.pesi, 'XOR') >= 1);
      assert.ok(s.erroriUltimaEpoca >= 1, 'ogni epoca contiene almeno un errore');
    }
  }
  // E non esiste nessuna retta che lo separi: nessuna combinazione di pesi su una griglia fitta risponde bene ai quattro casi.
  for (let a = -2; a <= 2; a += 0.1) {
    for (let b = -2; b <= 2; b += 0.1) {
      for (let c = -2; c <= 2; c += 0.1) {
        assert.ok(P.contaErrori({ w1: a, w2: b, b: c }, 'XOR') >= 1);
      }
    }
  }
  assert.ok(P.EPOCHE_XOR >= 5, 'la spiegazione sullo XOR arriva dopo alcune epoche');
});

test('la rete a due strati (OR e NAND che alimentano un AND) calcola lo XOR', () => {
  const D = P.DUE_STRATI;
  assert.deepStrictEqual(valutaTutti(D.h1), FUNZIONI.OR.uscite, 'il primo neurone nascosto è un OR');
  assert.deepStrictEqual(valutaTutti(D.h2), [1, 1, 1, 0], 'il secondo neurone nascosto è un NAND');
  assert.deepStrictEqual(valutaTutti(D.y), FUNZIONI.AND.uscite, 'il neurone di uscita è un AND');
  INGRESSI.forEach((x, i) => {
    const r = P.dueStrati(x);
    assert.strictEqual(r.y, FUNZIONI.XOR.uscite[i], 'XOR(' + x + ')');
    assert.strictEqual(r.y, x[0] ^ x[1]);
  });
});

test('pesi casuali con seme: ripetibili, diversi da seme a seme, tra −1 e 1', () => {
  assert.deepStrictEqual(P.pesiCasuali(7), P.pesiCasuali(7));
  assert.notDeepStrictEqual(P.pesiCasuali(7), P.pesiCasuali(8));
  for (let seme = 1; seme <= 500; seme++) {
    const p = P.pesiCasuali(seme);
    for (const v of [p.w1, p.w2, p.b]) {
      assert.ok(v >= -1 && v <= 1, 'fuori intervallo: ' + v);
      assert.strictEqual(Math.round(v * 100) / 100, v, 'due decimali');
    }
  }
  assert.deepStrictEqual(P.pesiCasuali(P.SEME_INIZIALE), { w1: 0.47, w2: -0.35, b: -0.43 });
});

test('geometria: la retta di decisione e la zona in cui il neurone risponde 1', () => {
  const pesi = { w1: 1, w2: 1, b: -1.5 };   // AND: retta x1 + x2 = 1,5
  const seg = P.retta(pesi, -0.6, 1.6);
  assert.ok(seg, 'la retta attraversa il riquadro');
  for (const q of seg) assert.ok(Math.abs(q[0] + q[1] - 1.5) < 1e-9, 'gli estremi stanno sulla retta');
  const zona = P.zonaUno(pesi, -0.6, 1.6);
  assert.ok(zona.length >= 3);
  for (const q of zona) assert.ok(q[0] + q[1] - 1.5 >= -1e-9, 'la zona sta dalla parte del sì');
  assert.strictEqual(P.retta({ w1: 0, w2: 0, b: 0.3 }, -0.6, 1.6), null, 'senza pesi non c\'è retta');
  assert.strictEqual(P.zonaUno({ w1: 0, w2: 0, b: -0.3 }, -0.6, 1.6).length, 0, 'b < 0: risponde sempre 0');
  assert.strictEqual(P.zonaUno({ w1: 0, w2: 0, b: 0.3 }, -0.6, 1.6).length, 4, 'b ≥ 0: risponde sempre 1');
  // La striscia dello XOR: tra la retta di OR e quella di NAND.
  const striscia = P.ritaglia(P.zonaUno(P.DUE_STRATI.h1, -0.6, 1.6), P.DUE_STRATI.h2);
  for (const q of striscia) {
    assert.ok(q[0] + q[1] >= 0.5 - 1e-9 && q[0] + q[1] <= 1.5 + 1e-9);
  }
});
