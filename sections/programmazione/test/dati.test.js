// Controlla i dati della sezione: capitoli, glossario, laboratori, figure e registrazione nell'hub.
// node --test sections/programmazione/test/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const BASE = path.join(__dirname, '..');
const SCHERMI = ['jacquard', 'nastro', 'williams', 'telescrivente', 'foglio', 'scheda', 'tabulato', 'terminale', 'home', 'mac', 'browser', 'editor', 'chat'];
const BLOCCHI = ['testo', 'elenco', 'citazione', 'sapevi', 'codice', 'tabella', 'figura', 'lab', 'ciao'];

// Carica i file nello stesso ordine di index.html, come farebbe il browser.
function carica() {
  delete globalThis.ProgStoria;
  const html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
  const script = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  for (const rel of script) {
    const f = path.join(BASE, rel);
    delete require.cache[require.resolve(f)];
    require(f);
  }
  return { script, dati: globalThis.ProgStoria.dati() };
}

const { script, dati } = carica();
const { capitoli, labs, figure } = dati;
const ids = new Set(capitoli.map((c) => c.id));

function testiDi(cap) {
  const out = [cap.intro, cap.sottotitolo];
  for (const b of cap.blocchi || []) {
    out.push(b.titolo, b.intro, b.testo, b.didascalia, b.autore, b.fonte);
    for (const p of [].concat(b.paragrafi || [])) out.push(p);
    for (const v of b.voci || []) out.push(v);
    for (const r of b.righe || []) for (const c of r) out.push(c);
    for (const c of b.intestazioni || []) out.push(c);
  }
  for (const p of cap.protagonisti || []) out.push(p.ruolo, p.testo);
  for (const t of cap.tappe || []) out.push(t.testo);
  for (const d of Object.values(cap.glossario || {})) out.push(d);
  if (cap.ciao) out.push(cap.ciao.nota, cap.ciao.linguaggio);
  return out.filter((x) => typeof x === 'string');
}

const glossario = new Map();
for (const c of capitoli) for (const t of Object.keys(c.glossario || {})) {
  const k = t.toLowerCase();
  if (!glossario.has(k)) glossario.set(k, []);
  glossario.get(k).push(c.id);
}

test('tutti i file caricati da index.html esistono', () => {
  for (const rel of script) assert.ok(fs.existsSync(path.join(BASE, rel)), rel);
});

test('14 capitoli con id e numeri unici', () => {
  assert.strictEqual(capitoli.length, 14);
  assert.strictEqual(ids.size, capitoli.length);
  assert.deepStrictEqual(capitoli.map((c) => c.numero), capitoli.map((_, i) => i + 1));
});

test('nessun termine del glossario è definito in due capitoli', () => {
  const doppi = [...glossario.entries()].filter(([, l]) => l.length > 1).map(([k, l]) => k + ' (' + l.join(', ') + ')');
  assert.deepStrictEqual(doppi, []);
});

for (const cap of capitoli) {
  test('capitolo ' + cap.numero + ' · ' + cap.id, () => {
    for (const k of ['titolo', 'anni', 'intro']) assert.ok(cap[k], 'manca ' + k);
    assert.match(cap.anni, /^\d{4}–\d{4}$/, 'anni nel formato 1804–1890 con il trattino lungo');
    assert.ok(Array.isArray(cap.blocchi), 'blocchi deve essere un array');
    for (const b of cap.blocchi) {
      assert.ok(BLOCCHI.includes(b.tipo), 'blocco sconosciuto: ' + b.tipo);
      if (b.tipo === 'lab') assert.ok(labs[b.id], 'laboratorio non registrato: ' + b.id);
      if (b.tipo === 'figura') assert.ok(figure[b.id], 'figura non registrata: ' + b.id);
      if (b.tipo === 'ciao') assert.ok(cap.ciao, 'blocco ciao senza i dati in cap.ciao');
      if (b.tipo === 'testo') assert.ok((b.paragrafi || []).length, 'blocco testo senza paragrafi');
    }
    if (cap.ciao) {
      const tipo = cap.ciao.schermo || cap.epoca;
      assert.ok(SCHERMI.includes(tipo), 'schermo d\'epoca sconosciuto: ' + tipo);
      if (tipo === 'scheda') assert.ok(String(cap.ciao.codice || '').length <= 80, 'una scheda ha 80 colonne');
    }
    for (const testo of testiDi(cap)) {
      for (const t of ProgStoria.terminiIn(testo)) assert.ok(glossario.has(t.toLowerCase()), 'termine non definito nel glossario: ' + t);
      for (const m of testo.matchAll(/\]\((#[\w-]+)\)/g)) {
        const anc = m[1].slice(1);
        assert.ok(ids.has(anc) || anc === 'glossario' || anc === 'inizio', 'ancora inesistente: ' + m[1]);
      }
      assert.ok(!/<\/?[a-z][^>]*>/i.test(testo), 'niente HTML nei testi: ' + testo.slice(0, 60));
    }
    for (const p of cap.protagonisti || []) assert.ok(p.nome, 'protagonista senza nome');
    for (const t of cap.tappe || []) assert.ok(Number.isInteger(t.anno) && t.testo, 'tappa senza anno o testo');
    for (const f of cap.fonti || []) assert.ok(typeof f === 'string' || f.testo, 'fonte senza testo');
  });
}

test('section.js registra gli stessi capitoli nell\'hub', () => {
  let registrato = null;
  globalThis.Enciclopedia = { register: (x) => { registrato = x; } };
  const f = path.join(BASE, 'section.js');
  delete require.cache[require.resolve(f)];
  require(f);
  delete globalThis.Enciclopedia;
  assert.ok(registrato, 'section.js non chiama Enciclopedia.register');
  assert.strictEqual(registrato.slug, 'programmazione');
  assert.strictEqual(registrato.numero, 7);
  assert.deepStrictEqual(registrato.capitoli.map((c) => c.id), capitoli.map((c) => c.id));
  for (const c of registrato.capitoli) {
    const cap = capitoli.find((x) => x.id === c.id);
    assert.strictEqual(c.titolo, cap.titolo, 'titolo diverso per ' + c.id);
    assert.strictEqual(c.periodo, cap.anni, 'periodo diverso per ' + c.id);
  }
});
