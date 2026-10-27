// Contratto della sezione Elettronica avanzata: node --test tests/elettronica-avanzata*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./elettronica-avanzata.load.js');

const { EA, SEZIONE, QUIZ } = load();
const ALLOWED_TAGS = /^(strong|em|var|sub|sup|br|abbr|span)$/;

function checkHtml(text, where) {
  assert.strictEqual(typeof text, 'string', where + ': deve essere testo');
  assert.ok(text.trim().length > 0, where + ': vuoto');
  assert.ok(!/<script|javascript:|\son\w+=/i.test(text), where + ': HTML non ammesso');
  for (const m of text.matchAll(/<\/?([a-z0-9]+)/gi)) {
    assert.ok(ALLOWED_TAGS.test(m[1].toLowerCase()), where + ': tag <' + m[1] + '> non ammesso');
  }
}

test('la scheda della sezione rispetta il contratto dell\'hub', () => {
  assert.strictEqual(SEZIONE.slug, 'elettronica-avanzata');
  assert.strictEqual(SEZIONE.numero, 3);
  assert.ok(SEZIONE.titolo && SEZIONE.sottotitolo && SEZIONE.colore);
  assert.strictEqual(SEZIONE.capitoli.length, 10);
  const ids = new Set();
  SEZIONE.capitoli.forEach((c, i) => {
    assert.match(c.id, /^[a-z]+$/);
    assert.ok(!ids.has(c.id), 'id ripetuto: ' + c.id);
    ids.add(c.id);
    assert.strictEqual(c.numero, i + 1);
    assert.ok(c.titolo && c.descrizione && c.periodo && c.argomento, c.id + ': testi mancanti');
    assert.ok(c.href.endsWith('index.html#' + c.id), c.id + ': href');
    assert.ok(c.freq.min > 0 && c.freq.min <= c.freq.f && c.freq.f <= c.freq.max && c.freq.max <= 1e15, c.id + ': banda');
    assert.match(c.tinta, /^#[0-9a-f]{6}$/i);
    assert.ok(c.icona.includes('<path') || c.icona.includes('<circle') || c.icona.includes('<rect'), c.id + ': icona');
  });
});

test('il motore formatta i numeri all\'italiana', () => {
  assert.strictEqual(EA.fmt(3.14159, 2), '3,14');
  assert.strictEqual(EA.fmt(-0.5, 1), '−0,5');
  assert.strictEqual(EA.si(2.4e9, 'Hz'), '2,4 GHz');
  assert.strictEqual(EA.si(32768, 'Hz'), '32,8 kHz');
  assert.strictEqual(EA.si(0.0047, 'F', 2), '4,7 mF');
  assert.strictEqual(EA.si(1e-9, 's'), '1 ns');
});

for (const meta of SEZIONE.capitoli) {
  const ch = EA.chapter(meta.id);
  const run = ch && !ch.stub ? test : test.skip;
  run('capitolo ' + meta.numero + ' (' + meta.id + '): contenuti completi', () => {
    assert.ok(Array.isArray(ch.intro) && ch.intro.length >= 2, 'intro: almeno 2 paragrafi');
    ch.intro.forEach((p, i) => checkHtml(p, 'intro ' + i));
    assert.ok(ch.steps.length >= 3 && ch.steps.length <= 7, 'steps: da 3 a 7 passi');
    ch.steps.forEach((s, i) => { checkHtml(s.title, 'step ' + i); checkHtml(s.text, 'step ' + i); });
    assert.ok(ch.formulas.length >= 2, 'formulas: almeno 2');
    ch.formulas.forEach((f, i) => { checkHtml(f.label, 'formula ' + i); checkHtml(f.eq, 'formula ' + i); checkHtml(f.text, 'formula ' + i); });
    assert.ok(ch.timeline.length >= 5, 'timeline: almeno 5 tappe');
    ch.timeline.forEach((e, i) => {
      assert.ok(Number.isInteger(e.year) && e.year >= 1600 && e.year <= 2026, 'timeline ' + i + ': anno');
      checkHtml(e.title, 'timeline ' + i);
      checkHtml(e.text, 'timeline ' + i);
    });
    checkHtml(ch.fun, 'fun');
    assert.ok(ch.uses.length >= 4, 'uses: almeno 4');
    assert.ok(ch.glossary.length >= 4, 'glossary: almeno 4 voci');
    ch.glossary.forEach((g, i) => { checkHtml(g.term, 'glossary ' + i); checkHtml(g.def, 'glossary ' + i); });
    assert.ok(ch.sources.length >= 3, 'sources: almeno 3 fonti');
    ch.sources.forEach((s) => { assert.ok(s.title); assert.match(s.url, /^https:\/\//); });
    assert.strictEqual(typeof ch.hero.mount, 'function');
    checkHtml(ch.hero.caption, 'hero.caption');
    assert.strictEqual(typeof ch.lab.mount, 'function');
    checkHtml(ch.lab.title, 'lab.title');
    checkHtml(ch.lab.intro, 'lab.intro');
    assert.ok(ch.model && typeof ch.model === 'object', 'model: funzioni pure per i test');
  });

  run('capitolo ' + meta.numero + ' (' + meta.id + '): domande nel formato della banca dei quiz', () => {
    const qs = QUIZ.filter((q) => q.chapter === meta.id).concat(Array.from(ch.quiz || []));
    assert.ok(qs.length >= 3, 'almeno 3 domande');
    qs.forEach((q) => {
      assert.strictEqual(q.answer, 0, q.id + ': la risposta giusta va per prima');
      assert.ok(q.options.length >= 3 && q.options.length <= 4, q.id + ': 3 o 4 opzioni');
      assert.ok(new Set(q.options).size === q.options.length, q.id + ': opzioni ripetute');
      assert.ok(q.q && q.why, q.id + ': testo e spiegazione');
      assert.ok(!q.topic || q.topic.length <= 30, q.id + ': topic oltre 30 caratteri');
      assert.ok(!/tutte le precedenti|nessuna delle precedenti/i.test(q.options.join(' ')), q.id + ': opzioni vietate');
    });
  });
}

test('gli id delle domande sono unici', () => {
  const all = QUIZ.concat(...SEZIONE.capitoli.map((c) => Array.from((EA.chapter(c.id) || {}).quiz || [])));
  const ids = all.map((q) => q.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  all.forEach((q) => assert.ok(SEZIONE.capitoli.some((c) => c.id === q.chapter), q.id + ': capitolo inesistente'));
});
