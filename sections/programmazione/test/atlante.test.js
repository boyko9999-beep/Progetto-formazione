// Test del laboratorio «L'albero dei linguaggi» (capitolo 14): dati, influenze, ricerca e impaginazione.
// node --test sections/programmazione/test/atlante.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('../js/lab/atlante.js');

const L = A.LINGUAGGI;
const PER_ID = new Map(L.map((l) => [l.id, l]));
const CAPITOLI_VALIDI = ['telai', 'logica', 'cavi', 'assembly', 'fortran', 'schede', 'strutturata', 'unix', 'personal', 'oggetti', 'web', 'ovunque', 'ia'];
const OBBLIGATORI = ['Plankalkül', 'Short Code', 'Autocode', 'FORTRAN', 'FLOW-MATIC', 'LISP', 'ALGOL 58', 'COBOL', 'ALGOL 60',
  'APL', 'Simula', 'BASIC', 'PL/I', 'BCPL', 'Logo', 'B', 'Pascal', 'C', 'Smalltalk', 'Prolog', 'ML', 'SQL', 'Scheme', 'Modula-2',
  'Ada', 'C++', 'Objective-C', 'Common Lisp', 'Erlang', 'Eiffel', 'Perl', 'Haskell', 'Python', 'Visual Basic', 'Lua', 'R', 'Java',
  'JavaScript', 'PHP', 'Ruby', 'OCaml', 'C#', 'Scala', 'F#', 'Clojure', 'Go', 'Rust', 'Kotlin', 'TypeScript', 'Swift'];
const ids = (mappa) => [...mappa.keys()].sort();

test('circa cinquanta linguaggi, con tutti quelli richiesti', () => {
  assert.ok(L.length >= 50 && L.length <= 70, 'linguaggi: ' + L.length);
  const nomi = new Set(L.map((l) => l.nome));
  const mancanti = OBBLIGATORI.filter((n) => !nomi.has(n));
  assert.deepStrictEqual(mancanti, []);
});

test('id e nomi unici', () => {
  assert.strictEqual(new Set(L.map((l) => l.id)).size, L.length, 'id ripetuti');
  assert.strictEqual(new Set(L.map((l) => l.nome.toLowerCase())).size, L.length, 'nomi ripetuti');
  for (const l of L) assert.match(l.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'id non valido: ' + l.id);
});

test('ogni influenza esiste, non si ripete e non punta a se stessa', () => {
  for (const l of L) {
    assert.ok(Array.isArray(l.influenzatoDa), l.id + ': influenzatoDa deve essere un array');
    assert.strictEqual(new Set(l.influenzatoDa).size, l.influenzatoDa.length, l.id + ': influenza ripetuta');
    for (const p of l.influenzatoDa) {
      assert.ok(PER_ID.has(p), l.id + ': influenza sconosciuta «' + p + '»');
      assert.notStrictEqual(p, l.id, l.id + ' non può influenzare se stesso');
    }
    assert.ok(l.influenzatoDa.length <= 4, l.id + ': tieni solo le influenze principali');
  }
});

test('chi influenza non è più giovane di chi è influenzato', () => {
  for (const l of L) {
    for (const p of l.influenzatoDa) {
      const a = PER_ID.get(p);
      assert.ok(a.anno <= l.anno, a.nome + ' (' + a.anno + ') non può influenzare ' + l.nome + ' (' + l.anno + ')');
    }
  }
});

test('nessun ciclo nelle influenze, e il controllo li sa trovare', () => {
  assert.strictEqual(A.trovaCiclo(), null);
  const finto = [
    { id: 'x', influenzatoDa: ['z'] },
    { id: 'y', influenzatoDa: ['x'] },
    { id: 'z', influenzatoDa: ['y'] },
    { id: 'w', influenzatoDa: [] },
  ];
  const ciclo = A.trovaCiclo(finto);
  assert.ok(ciclo, 'il ciclo x → z → y → x va trovato');
  assert.strictEqual(ciclo[0], ciclo[ciclo.length - 1]);
  assert.deepStrictEqual(new Set(ciclo), new Set(['x', 'y', 'z']));
  assert.strictEqual(A.trovaCiclo([{ id: 'a', influenzatoDa: [] }, { id: 'b', influenzatoDa: ['a'] }]), null);
});

test('ogni capitolo citato esiste nella sezione', () => {
  assert.deepStrictEqual(Object.keys(A.CAPITOLI), CAPITOLI_VALIDI);
  for (const l of L) {
    if (l.capitolo === undefined) continue;
    assert.ok(CAPITOLI_VALIDI.includes(l.capitolo), l.id + ': capitolo sconosciuto «' + l.capitolo + '»');
  }
  assert.ok(L.filter((l) => l.capitolo).length >= 30, 'la maggior parte dei linguaggi rimanda a un capitolo');
});

test('i titoli di riserva dei capitoli sono quelli dei file dei capitoli', () => {
  const dir = path.join(__dirname, '..', 'js', 'capitoli');
  const trovati = {};
  const ctx = { ProgStoria: { capitolo(c) { trovati[c.id] = c; } } };
  for (const f of fs.readdirSync(dir).filter((x) => /^\d\d-.+\.js$/.test(x))) {
    vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  }
  for (const [id, [numero, titolo]] of Object.entries(A.CAPITOLI)) {
    assert.ok(trovati[id], 'capitolo mancante: ' + id);
    assert.strictEqual(trovati[id].numero, numero, id + ': numero');
    assert.strictEqual(trovati[id].titolo, titolo, id + ': titolo');
  }
});

test('ogni linguaggio ha il suo «Ciao, mondo» (o spiega perché non c\'è)', () => {
  const assenti = [];
  for (const l of L) {
    assert.ok([undefined, 'assaggio', 'assente'].includes(l.ciaoTipo), l.id + ': ciaoTipo non valido');
    assert.strictEqual(typeof l.ciao, 'string', l.id + ': ciao deve essere un testo');
    if (l.ciaoTipo === 'assente') {
      assert.strictEqual(l.ciao, '', l.id + ': ciao vuoto se assente');
      assert.ok(l.ciaoNota && l.ciaoNota.length > 30, l.id + ': spiega in ciaoNota perché manca');
      assenti.push(l.id);
      continue;
    }
    assert.ok(l.ciao.trim().length > 0, l.id + ': manca il «Ciao, mondo»');
    if (l.ciaoTipo === 'assaggio') assert.ok(l.ciaoNota, l.id + ': un assaggio va spiegato in ciaoNota');
    else assert.match(l.ciao, /ciao,? mondo|'hell'/i, l.id + ': il programma deve salutare');
    assert.ok(l.ciao.split('\n').length <= 12, l.id + ': «Ciao, mondo» breve');
    assert.ok(!/\t {2}|\s+$/.test(l.ciao), l.id + ': niente spazi in coda');
  }
  assert.ok(assenti.length <= 6, 'troppi linguaggi senza saluto: ' + assenti.join(', '));
  for (const id of assenti) assert.ok(PER_ID.get(id).anno < 1965, id + ': solo i linguaggi più antichi possono non avere il saluto');
});

test('campi completi, paradigmi e famiglie validi, testi senza HTML', () => {
  const paradigmi = new Set(A.PARADIGMI.map((p) => p.id));
  const corsie = new Set(A.CORSIE.map((c) => c.id));
  for (const l of L) {
    assert.ok(l.nome && l.autori && l.descrizione, l.id + ': nome, autori e descrizione');
    assert.ok(Number.isInteger(l.anno) && l.anno >= A.ANNO_MIN && l.anno <= A.ANNO_MAX, l.id + ': anno fuori scala');
    assert.ok(l.paradigmi.length >= 1, l.id + ': almeno un paradigma');
    assert.strictEqual(new Set(l.paradigmi).size, l.paradigmi.length, l.id + ': paradigma ripetuto');
    for (const p of l.paradigmi) assert.ok(paradigmi.has(p), l.id + ': paradigma sconosciuto «' + p + '»');
    assert.ok(corsie.has(l.famiglia), l.id + ': famiglia sconosciuta «' + l.famiglia + '»');
    for (const t of [l.descrizione, l.ciaoNota, l.notaAnno, l.autori].filter(Boolean)) {
      assert.ok(!/<\/?[a-z][^>]*>/i.test(t), l.id + ': niente HTML nei testi');
      assert.ok(!/"/.test(t), l.id + ': nei testi italiani le virgolette sono «caporali»');
      assert.ok(!/ - |--/.test(t), l.id + ': niente trattini al posto della punteggiatura');
    }
    const frasi = l.descrizione.split(/[.!?](?:\s|$)/).filter((f) => f.trim()).length;
    assert.ok(frasi >= 1 && frasi <= 3, l.id + ': descrizione di una o tre frasi (' + frasi + ')');
    assert.ok(l.descrizione.length <= 360, l.id + ': descrizione breve (' + l.descrizione.length + ' caratteri)');
  }
  const plankalkul = PER_ID.get('plankalkul');
  assert.strictEqual(plankalkul.progetto, true, 'Plankalkül è segnato come progetto');
  assert.strictEqual(plankalkul.anno, 1945);
  for (const p of A.PARADIGMI) assert.ok(L.some((l) => l.paradigmi.includes(p.id)), 'paradigma senza linguaggi: ' + p.id);
  for (const c of A.CORSIE) assert.ok(L.some((l) => l.famiglia === c.id), 'corsia vuota: ' + c.id);
});

test('antenati e discendenti, con la distanza in generazioni', () => {
  const anc = A.antenati('java');
  assert.strictEqual(anc.get('cpp'), 1);
  assert.strictEqual(anc.get('c'), 2);
  assert.ok(anc.has('simula') && anc.has('algol-60') && anc.has('fortran'), 'Java discende da Simula, ALGOL 60 e FORTRAN');
  assert.ok(!anc.has('java'), 'un linguaggio non è antenato di se stesso');
  assert.strictEqual(A.antenati('fortran').size, 0);
  assert.strictEqual(A.discendenti('zig').size, 0);
  const disc = A.discendenti('algol-60');
  for (const id of ['pascal', 'c', 'cpp', 'java', 'go', 'rust']) assert.ok(disc.has(id), 'ALGOL 60 → ' + id);
  assert.strictEqual(A.trova('nessuno'), null);
  assert.deepStrictEqual(A.antenatiDiretti('nessuno'), []);
  assert.deepStrictEqual(A.discendentiDiretti('nessuno'), []);
  // Coerenza: ogni antenato ha il linguaggio tra i suoi discendenti, e viceversa.
  for (const l of L) {
    assert.deepStrictEqual(A.antenatiDiretti(l.id), l.influenzatoDa);
    for (const p of l.influenzatoDa) assert.ok(A.discendentiDiretti(p).includes(l.id), p + ' → ' + l.id);
    for (const [a, d] of A.antenati(l.id)) {
      assert.ok(A.discendenti(a).has(l.id), a + ' dovrebbe avere ' + l.id + ' tra i discendenti');
      assert.ok(d >= 1 && PER_ID.get(a).anno <= l.anno);
    }
  }
  const top = A.piuProlifico();
  assert.ok(top && PER_ID.has(top.id) && top.n >= 20, 'il capostipite più prolifico ha molti discendenti');
});

test('ricerca per nome, alias e autore', () => {
  const c = A.cerca('c');
  for (const id of ['c', 'cpp', 'csharp', 'cobol']) assert.ok(c.includes(id), '«c» trova ' + id);
  assert.ok(!A.cerca('go').includes('algol-60'), '«go» non trova ALGOL');
  assert.ok(A.cerca('go').includes('go'));
  assert.deepStrictEqual(A.cerca('wirth').sort(), ['modula-2', 'pascal']);
  assert.ok(A.cerca('hopper').includes('flow-matic') && A.cerca('hopper').includes('cobol'));
  assert.deepStrictEqual(A.cerca('plankalkul'), ['plankalkul'], 'senza dieresi');
  assert.deepStrictEqual(A.cerca('  GOLANG '), ['go'], 'alias, maiuscole e spazi');
  assert.strictEqual(A.cerca('').length, L.length);
  assert.deepStrictEqual(A.cerca('zzzz'), []);
  assert.deepStrictEqual(A.filtra('logico', ''), ['prolog']);
  assert.ok(A.filtra('funzionale', 'lisp').includes('common-lisp'));
  assert.strictEqual(A.filtra('tutti', '').length, L.length);
  assert.strictEqual(A.filtra(null, '').length, L.length);
});

test('ordinamento per nome, anno e famiglia, nei due versi', () => {
  const perAnno = A.ordina(L, 'anno', 1);
  assert.strictEqual(perAnno[0].id, 'plankalkul');
  for (let i = 1; i < perAnno.length; i++) assert.ok(perAnno[i - 1].anno <= perAnno[i].anno);
  const giu = A.ordina(L, 'anno', -1);
  assert.strictEqual(giu[0].anno, Math.max(...L.map((l) => l.anno)));
  const perNome = A.ordina(L, 'nome', 1);
  for (let i = 1; i < perNome.length; i++) assert.ok(perNome[i - 1].nome.localeCompare(perNome[i].nome, 'it', { sensitivity: 'base' }) <= 0);
  const ordineCorsie = A.CORSIE.map((x) => x.id);
  const perFam = A.ordina(L, 'famiglia', 1).map((l) => ordineCorsie.indexOf(l.famiglia));
  for (let i = 1; i < perFam.length; i++) assert.ok(perFam[i - 1] <= perFam[i]);
  assert.strictEqual(A.ordina(L, 'anno', 1).length, L.length);
  assert.notStrictEqual(A.ordina(L, 'anno', 1), L, 'non modifica l\'elenco originale');
});

test('impaginazione: ogni linguaggio ha un posto, le etichette non si sovrappongono', () => {
  const M = A.impagina();
  assert.deepStrictEqual(ids(M.nodi), L.map((l) => l.id).sort());
  assert.ok(M.larghezza >= 1300 && M.larghezza <= 1800, 'larghezza comoda: ' + M.larghezza);
  for (const n of M.nodi.values()) {
    assert.ok(n.x0 >= 0 && n.x1 <= M.larghezza, n.id + ': etichetta dentro la mappa');
    assert.ok(n.y > 0 && n.y < M.altezza, n.id + ': y dentro la mappa');
    const corsia = M.corsie.find((c) => c.id === n.corsia);
    assert.ok(n.y > corsia.y && n.y < corsia.y + corsia.altezza, n.id + ': dentro la sua corsia');
  }
  // Nella stessa riga di una corsia, le etichette restano separate.
  const righe = new Map();
  for (const n of M.nodi.values()) {
    const k = n.corsia + ':' + n.riga;
    if (!righe.has(k)) righe.set(k, []);
    righe.get(k).push(n);
  }
  for (const [k, nodi] of righe) {
    nodi.sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < nodi.length; i++) {
      assert.ok(nodi[i - 1].x1 + M.geo.spazio <= nodi[i].x0, k + ': ' + nodi[i - 1].id + ' tocca ' + nodi[i].id);
    }
  }
  // Le corsie si impilano senza sovrapporsi.
  for (let i = 1; i < M.corsie.length; i++) assert.strictEqual(M.corsie[i].y, M.corsie[i - 1].y + M.corsie[i - 1].altezza);
  const totale = L.reduce((s, l) => s + l.influenzatoDa.length, 0);
  assert.strictEqual(M.archi.length, totale, 'un arco per ogni influenza');
  for (const a of M.archi) assert.match(a.d, /^M[\d.]+ [\d.]+C/);
  assert.ok(A.xAnno(1960) < A.xAnno(1970));
  assert.strictEqual(A.xAnno(1970) - A.xAnno(1960), 10 * A.GEO.pxAnno);
});

test('curve e cursore del tempo', () => {
  assert.strictEqual(A.curva(0, 10, 100, 50), 'M0 10C50 10 50 50 100 50');
  assert.match(A.curva(100, 10, 102, 60), /^M100 10C126 10 128 60 102 60$/, 'coetanei: un\'ansa verso destra');
  assert.strictEqual(A.frazioneArco(1950, 1960, 1970), 0);
  assert.strictEqual(A.frazioneArco(1965, 1960, 1970), 0.5);
  assert.strictEqual(A.frazioneArco(1990, 1960, 1970), 1);
  assert.strictEqual(A.frazioneArco(1971, 1972, 1972), 0);
  assert.strictEqual(A.frazioneArco(1972, 1972, 1972), 1);
  assert.strictEqual(A.normalizza('  Plankalkül  Zuse '), 'plankalkul zuse');
  assert.strictEqual(A.nomeParadigma('funzionale'), 'Funzionale');
  assert.strictEqual(A.nomeCorsia('c'), 'Famiglia del C');
  assert.ok(A.stimaLarghezza('JavaScript') > A.stimaLarghezza('C'));
});
