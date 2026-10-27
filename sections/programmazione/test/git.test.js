// Test del laboratorio «Git, la macchina del tempo del codice» (capitolo 12): il piccolo Git
// simulato (commit, branch, switch, merge, annulla) e, se git è installato, il confronto con il
// vero git, che rifà le stesse operazioni e deve dare lo stesso file dopo ogni passo.
// node --test sections/programmazione/test/git.test.js
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const L = require('../js/lab/git.js');

const testoDi = (repo, id) => L.testo(repo.commit[id || L.tip(repo)].snapshot);

function fai(repo, azione) {
  const es = L.esegui(repo, azione);
  assert.ok(!es.errore, JSON.stringify(azione) + ': ' + es.errore);
  return es;
}

// Generatore pseudo-casuale con seme (mulberry32): le sequenze sono sempre le stesse.
function casuale(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function azioneCasuale(repo, rnd) {
  const x = rnd();
  const altri = repo.ordineBranch.filter((b) => b !== repo.head);
  if (x < 0.5) return { tipo: 'commit' };
  if (x < 0.62 && repo.ordineBranch.length < L.MAX_BRANCH) return { tipo: 'branch', nome: L.nomeSuggerito(repo) };
  if (!altri.length) return { tipo: 'commit' };
  const altro = altri[Math.floor(rnd() * altri.length)];
  return x < 0.8 ? { tipo: 'switch', nome: altro } : { tipo: 'merge', nome: altro };
}

test('il repository di partenza: due commit in fila su main', () => {
  const repo = L.crea();
  assert.strictEqual(repo.ordine.length, 2);
  const [primo, secondo] = repo.ordine;
  assert.strictEqual(repo.head, 'main');
  assert.strictEqual(repo.branch.main, secondo);
  assert.deepStrictEqual(repo.commit[primo].genitori, []);
  assert.deepStrictEqual(repo.commit[secondo].genitori, [primo]);
  for (const id of repo.ordine) assert.match(id, /^[0-9a-f]{7}$/);
  const righe = testoDi(repo).split('\n');
  assert.strictEqual(righe[0], 'PIZZA MARGHERITA');
  assert.strictEqual(righe.pop(), '', 'il file finisce con un a capo');
  assert.strictEqual(righe.length, 13);
  assert.strictEqual(L.crea().branch.main, secondo, 'stesso contenuto, stesse impronte');
});

test('differenze riga per riga e il riassunto come lo stampa git', () => {
  const repo = L.crea();
  const [primo, secondo] = repo.ordine.map((id) => repo.commit[id].snapshot);
  const d = L.differenze(primo, secondo);
  assert.deepStrictEqual(d.filter((x) => x.segno !== ' ').map((x) => x.segno + x.id), ['+basilico', '+h-cottura', '+forno']);
  assert.deepStrictEqual(L.conta(d), { piu: 3, meno: 0 });
  assert.strictEqual(L.descriviConta(L.conta(d)), 'ricetta.txt: 3 righe aggiunte');
  assert.strictEqual(L.descriviConta({ piu: 1, meno: 1 }), 'ricetta.txt: 1 riga aggiunta, 1 tolta');
  assert.strictEqual(L.descriviConta({ piu: 0, meno: 2 }), 'ricetta.txt: 2 righe tolte');
  assert.strictEqual(L.descriviConta({ piu: 0, meno: 0 }), 'ricetta.txt: nessuna differenza');
  const cambio = L.differenze(secondo, Object.assign({}, secondo, { forno: { t: 'altro', v: 9 } })).filter((x) => x.segno !== ' ');
  assert.deepStrictEqual(cambio.map((x) => x.segno + x.t), ['-10 minuti nel forno a 250 °C', '+altro']);
});

test('la storia guidata finisce con un merge a due genitori dalla base giusta', () => {
  let sess = L.nuovaSessione();
  const base = sess.repo.branch.main;
  let ultimo = null;
  for (const passo of L.STORIA) {
    if (!passo.azione) continue;
    const r = L.applica(sess, passo.azione);
    assert.ok(!r.esito.errore, r.esito.errore);
    sess = r.sess;
    ultimo = r.esito;
  }
  const repo = sess.repo;
  assert.strictEqual(ultimo.tipo, 'merge');
  assert.strictEqual(ultimo.base, base, 'l\'antenato comune è il commit da cui è nato nuova-salsa');
  assert.strictEqual(repo.head, 'main');
  const m = repo.commit[L.tip(repo)];
  assert.strictEqual(m.genitori.length, 2);
  assert.strictEqual(m.messaggio, 'Merge branch \'nuova-salsa\'');
  const t = testoDi(repo);
  for (const id of ['s-pomodoro', 's-origano', 'i-acqua']) assert.ok(t.includes(L.MODIFICHE.find((x) => x.id === id).t + '\n'), id);
  assert.deepStrictEqual(L.conflitti(repo, m.genitori[0], m.genitori[1]), []);
  assert.deepStrictEqual(sess.log.map((l) => l.cmd), [
    'git log --oneline', 'git switch -c nuova-salsa',
    'git add ricetta.txt', 'git commit -m "Salsa con pelati San Marzano"',
    'git add ricetta.txt', 'git commit -m "Aggiunge l\'origano"',
    'git switch main', 'git add ricetta.txt', 'git commit -m "Impasto più idratato"', 'git merge nuova-salsa',
  ]);
});

test('fast-forward senza commit nuovi, poi «già aggiornato»', () => {
  let repo = L.crea();
  repo = fai(repo, { tipo: 'branch', nome: 'prova' }).repo;
  const c = fai(repo, { tipo: 'commit' });
  repo = fai(c.repo, { tipo: 'switch', nome: 'main' }).repo;
  assert.strictEqual(testoDi(repo), testoDi(L.crea()), 'su main il file è quello di prima');
  const ff = fai(repo, { tipo: 'merge', nome: 'prova' });
  assert.strictEqual(ff.tipo, 'ff');
  assert.strictEqual(ff.repo.ordine.length, repo.ordine.length, 'nessun commit nuovo');
  assert.strictEqual(ff.repo.branch.main, c.commit.id);
  assert.strictEqual(fai(ff.repo, { tipo: 'merge', nome: 'prova' }).tipo, 'aggiornato');
  const su = fai(ff.repo, { tipo: 'switch', nome: 'prova' }).repo;
  assert.strictEqual(fai(su, { tipo: 'merge', nome: 'main' }).tipo, 'aggiornato');
  assert.match(L.esegui(su, { tipo: 'merge', nome: 'prova' }).errore, /con se stesso/);
  assert.match(L.esegui(su, { tipo: 'merge', nome: 'nessuno' }).errore, /non esiste/);
  assert.ok(L.esegui(su, { tipo: 'switch', nome: 'prova' }).nulla, 'switch sul branch dove sei già');
});

test('una parte della ricetta cambiata su un branch non unito è bloccata sugli altri', () => {
  let repo = L.crea();
  repo = fai(repo, { tipo: 'branch', nome: 'salsa' }).repo;
  repo = fai(repo, { tipo: 'commit', modifica: 's-pomodoro' }).repo;
  repo = fai(repo, { tipo: 'switch', nome: 'main' }).repo;
  assert.match(L.esegui(repo, { tipo: 'commit', modifica: 's-olio' }).errore, /prima fai un merge/);
  assert.match(L.esegui(repo, { tipo: 'commit', modifica: 's-pomodoro' }).errore, /già nella storia/);
  assert.match(L.esegui(repo, { tipo: 'commit', modifica: 'zzz' }).errore, /sconosciuta/);
  assert.notStrictEqual(L.zonaDi(L.prossimaModifica(repo).riga), 'S', 'il commit automatico sceglie un\'altra parte');
  repo = fai(repo, { tipo: 'merge', nome: 'salsa' }).repo;
  fai(repo, { tipo: 'commit', modifica: 's-olio' });
});

test('se ogni parte è bloccata, il commit chiede prima un merge', () => {
  let repo = L.crea();
  repo = fai(repo, { tipo: 'branch', nome: 'tutto' }).repo;
  for (const m of ['k-pietra', 't-dosi', 'i-acqua', 's-pomodoro', 'c-fiordilatte']) repo = fai(repo, { tipo: 'commit', modifica: m }).repo;
  repo = fai(repo, { tipo: 'switch', nome: 'main' }).repo;
  assert.strictEqual(L.prossimaModifica(repo), null);
  assert.match(L.esegui(repo, { tipo: 'commit' }).errore, /fai prima un merge/);
});

test('gli appunti generati quando le modifiche di una parte finiscono', () => {
  let repo = L.crea();
  for (let i = 0; i < 6; i++) repo = fai(repo, { tipo: 'commit', modifica: L.MODIFICHE[i].id }).repo;
  let es = null;
  for (let i = 0; i < 14; i++) { es = fai(repo, { tipo: 'commit' }); repo = es.repo; }
  assert.strictEqual(repo.usate.length, L.MODIFICHE.length, 'prima si usano tutte le modifiche scritte');
  assert.strictEqual(repo.note, 1);
  assert.match(es.commit.messaggio, /^Appunto 1 /);
  const appunto = L.righe(es.commit.snapshot).find((r) => /^nota-[A-Z]-\d+$/.test(r.id));
  assert.match(appunto.t, /^appunto 1: /);
});

test('i nomi dei branch seguono le regole di git', () => {
  const repo = L.crea();
  const casi = {
    'salsa-piccante': null,
    'v2.1': null,
    'idee/forno': null,
    '': /Scrivi un nome/,
    'salsa piccante': /spazi/,
    '-salsa': /cominciano/,
    '.salsa': /cominciano/,
    'a..b': /due punti/,
    'a//b': /due punti/,
    'salsa.': /finiscono/,
    'salsa.lock': /finiscono/,
    'Salsa': /minuscole/,
    'più-sale': /minuscole/,
    'main': /Esiste già/,
    ['x'.repeat(25)]: /troppo lungo/,
  };
  for (const [nome, atteso] of Object.entries(casi)) {
    const err = L.validaNomeBranch(repo, nome);
    if (atteso) assert.match(String(err), atteso, nome);
    else assert.strictEqual(err, null, nome);
  }
  let r = repo;
  for (let i = 1; i < L.MAX_BRANCH; i++) r = fai(r, { tipo: 'branch', nome: L.nomeSuggerito(r) }).repo;
  assert.deepStrictEqual(r.ordineBranch, ['main'].concat(L.NOMI_SUGGERITI.slice(0, L.MAX_BRANCH - 1)));
  assert.match(L.validaNomeBranch(r, 'altro'), /al massimo/);
});

test('annulla torna esattamente allo stato di prima', () => {
  let sess = L.nuovaSessione();
  const storia = [];
  for (const passo of L.STORIA) {
    if (!passo.azione) continue;
    storia.push(sess);
    sess = L.applica(sess, passo.azione).sess;
  }
  while (storia.length) {
    const prima = storia.pop();
    const r = L.annulla(sess);
    assert.strictEqual(r.sess.repo, prima.repo);
    assert.strictEqual(r.sess.log, prima.log);
    sess = r.sess;
  }
  assert.strictEqual(L.annulla(sess).esito, null, 'niente più da annullare');
});

test('il limite di commit del laboratorio', () => {
  let repo = L.crea();
  let errore = null;
  for (let i = 0; i < 40 && !errore; i++) {
    const es = L.esegui(repo, { tipo: 'commit' });
    if (es.errore) errore = es.errore; else repo = es.repo;
  }
  assert.strictEqual(repo.ordine.length, L.MAX_COMMIT);
  assert.match(errore, /limite di 24 commit/);
});

test('mille azioni a caso: un merge non trova mai righe in conflitto', () => {
  let merge = 0;
  for (let seme = 1; seme <= 40; seme++) {
    const rnd = casuale(seme);
    let repo = L.crea();
    for (let k = 0; k < 60; k++) {
      const a = azioneCasuale(repo, rnd);
      if (a.tipo === 'merge' && L.analizzaMerge(repo, a.nome).tipo === 'merge') {
        assert.deepStrictEqual(L.conflitti(repo, L.tip(repo), repo.branch[a.nome]), [], 'seme ' + seme);
        merge++;
      }
      const es = L.esegui(repo, a);
      if (!es.errore) repo = es.repo;
    }
  }
  assert.ok(merge > 40, 'abbastanza merge veri: ' + merge);
});

/* ---------- il confronto con il vero git ---------- */

const GIT = spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0;

function nuovoGit(dir) {
  // Configurazione dell'utente e del sistema ignorata: niente firme, hook o branch predefiniti diversi.
  const env = Object.assign({}, process.env, {
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull,
    GIT_AUTHOR_NAME: 'Prova', GIT_AUTHOR_EMAIL: 'prova@example.org',
    GIT_COMMITTER_NAME: 'Prova', GIT_COMMITTER_EMAIL: 'prova@example.org',
  });
  return (...args) => {
    const r = spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false'].concat(args), { cwd: dir, env: env, encoding: 'utf8' });
    if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' è fallito:\n' + r.stdout + r.stderr);
    return r.stdout.trim();
  };
}

// Rifà con il vero git le azioni accettate dal laboratorio e confronta il file dopo ogni passo.
function confronta(prossima) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-git-'));
  try {
    const git = nuovoGit(dir);
    const file = path.join(dir, 'ricetta.txt');
    const leggi = () => fs.readFileSync(file, 'utf8');
    const sha = {};
    git('init', '-q');
    git('symbolic-ref', 'HEAD', 'refs/heads/main');
    let repo = L.crea();
    for (const id of repo.ordine) {
      fs.writeFileSync(file, testoDi(repo, id));
      git('add', 'ricetta.txt');
      git('commit', '-q', '-m', repo.commit[id].messaggio);
      sha[id] = git('rev-parse', 'HEAD');
    }
    const conti = { commit: 0, branch: 0, switch: 0, ff: 0, merge: 0, aggiornato: 0 };
    for (let k = 0; ; k++) {
      const a = prossima(repo, k);
      if (!a) break;
      const es = L.esegui(repo, a);
      if (es.errore || es.nulla) continue;
      if (es.tipo === 'commit') {
        fs.writeFileSync(file, testoDi(es.repo));
        git('commit', '-q', '-a', '-m', es.commit.messaggio);
      } else if (es.tipo === 'branch') {
        git('checkout', '-q', '-b', a.nome);
      } else if (es.tipo === 'switch') {
        git('checkout', '-q', a.nome);
      } else {
        if (es.tipo === 'merge') assert.strictEqual(git('merge-base', 'HEAD', a.nome), sha[es.base], 'la stessa base del merge');
        git('merge', '-q', '--no-edit', a.nome);
      }
      repo = es.repo;
      const id = L.tip(repo);
      if (!sha[id]) sha[id] = git('rev-parse', 'HEAD');
      assert.strictEqual(git('rev-parse', 'HEAD'), sha[id], 'HEAD sullo stesso commit dopo ' + es.tipo);
      assert.strictEqual(leggi(), testoDi(repo), 'lo stesso file dopo ' + es.tipo + ' (' + k + ')');
      assert.strictEqual(Number(git('rev-list', '--count', 'HEAD')), L.antenati(repo, id).size, 'la stessa storia');
      conti[es.tipo]++;
    }
    return conti;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('il vero git rifà la storia guidata e ottiene lo stesso file', { skip: !GIT && 'git non è installato' }, () => {
  const azioni = L.STORIA.map((p) => p.azione).filter((a) => a && a.tipo !== 'reset');
  const conti = confronta((repo, k) => azioni[k] || null);
  assert.strictEqual(conti.merge, 1);
  assert.strictEqual(conti.commit, 3);
});

test('il vero git unisce senza conflitti le sequenze a caso del laboratorio', { skip: !GIT && 'git non è installato' }, () => {
  const totale = { commit: 0, branch: 0, switch: 0, ff: 0, merge: 0, aggiornato: 0 };
  for (const seme of [3, 7, 11, 19, 23, 42]) {
    const rnd = casuale(seme);
    const conti = confronta((repo, k) => (k < 45 ? azioneCasuale(repo, rnd) : null));
    for (const t of Object.keys(totale)) totale[t] += conti[t];
  }
  assert.ok(totale.merge >= 6 && totale.ff >= 2 && totale.commit >= 40, JSON.stringify(totale));
});
