// Test del laboratorio «Come nasce una pagina web» (capitolo 11): i messaggi HTTP, l'analizzatore
// HTML (gettoni e albero con le regole principali dei browser), i limiti, il disegno e il clic.
// node --test sections/programmazione/test/pagina-web.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lab/pagina-web.js');

// L'albero visibile in forma compatta: html(head(title("…")),body(…)); i testi senza spazi superflui.
function forma(n) {
  if (n.tipo === 'testo') return JSON.stringify(L.collassa(n.testo));
  if (n.tipo === 'commento') return '<!--' + n.testo + '-->';
  if (n.tipo === 'doctype') return '<!' + n.testo + '>';
  const figli = n.figli.filter((f) => !(f.tipo === 'testo' && f.spazio)).map(forma);
  const nome = n.tipo === 'documento' ? '#' : n.nome + (n.implicito ? '*' : '');
  return figli.length ? nome + '(' + figli.join(',') + ')' : nome;
}
const albero = (testo) => {
  const a = L.analizza(testo);
  assert.ok(a.ok, a.errore);
  return a;
};
const corpo = (testo) => forma(albero(testo).body);

test('l\'esempio diventa l\'albero atteso, senza correzioni', () => {
  const a = albero(L.ESEMPIO);
  assert.strictEqual(forma(a.documento),
    '#(html(head(title("Ciao, mondo!")),body(h1("Ciao, mondo!"),p("Il primo sito web:",a("info.cern.ch")),button("Cliccami"),p("Clic:",b("0")))))');
  assert.strictEqual(a.titolo, 'Ciao, mondo!');
  assert.deepStrictEqual(a.avvisi, []);
  assert.strictEqual(a.conteggio, 17);
  assert.strictEqual(a.profondita, 5); // html › body › p › a › testo
  assert.ok(L.ESEMPIO.length <= L.LIMITI.caratteri);
  // nessuna riga troppo lunga per il pannello del codice
  for (const r of L.ESEMPIO.split('\n')) assert.ok(r.length <= 52, r);
});

test('i gettoni coprono tutto il testo, uno dopo l\'altro', () => {
  const casi = [L.ESEMPIO, 'ciao', '<p class="x', 'a < b <3 </ >', '<!-- non chiuso', '<script>if (a<b) x()</script>dopo', '<title>a <b>x</b></title>', '<!DOCTYPE html><?xml?>', ''];
  for (const t of casi) {
    const tk = L.tokenizza(t);
    let pos = 0;
    for (const g of tk) {
      assert.strictEqual(g.inizio, pos, JSON.stringify(t));
      assert.ok(g.fine > g.inizio);
      pos = g.fine;
    }
    assert.strictEqual(pos, t.length, JSON.stringify(t));
  }
});

test('gettoni: attributi con e senza virgolette, maiuscole, doppioni, entità, barra finale', () => {
  const [a] = L.tokenizza('<A HREF="http://x/?a=1&amp;b=2" id=uno Disabled id=due title=\'l&egrave;\'>');
  assert.strictEqual(a.tipo, 'apre');
  assert.strictEqual(a.nome, 'a');
  assert.deepStrictEqual(a.attributi, [
    { nome: 'href', valore: 'http://x/?a=1&b=2' },
    { nome: 'id', valore: 'uno' },
    { nome: 'disabled', valore: '' },
    { nome: 'title', valore: 'lè' },
  ]);
  const [br] = L.tokenizza('<br/>');
  assert.strictEqual(br.autochiuso, true);
  const [ln] = L.tokenizza('<a href=foo/>');
  assert.strictEqual(ln.autochiuso, false);
  assert.deepStrictEqual(ln.attributi, [{ nome: 'href', valore: 'foo/' }]);
  assert.deepStrictEqual(L.tokenizza('a < b <3').map((g) => g.tipo), ['testo']);
});

test('entità: nomi, numeri, sconosciute', () => {
  assert.strictEqual(L.decodifica('perch&eacute; caff&egrave; &amp; t&egrave;'), 'perché caffè & tè');
  assert.strictEqual(L.decodifica('&#65;&#x42;&#67'), 'ABC');
  assert.strictEqual(L.decodifica('&pippo; AT&T &amp'), '&pippo; AT&T &');
  assert.strictEqual(L.decodifica('&#0;'), '�');
  assert.strictEqual(L.decodifica('&laquo;ciao&raquo;'), '«ciao»');
});

test('html, head e body mancanti: li aggiunge il browser', () => {
  const a = albero('<title>T</title>\n<p>ciao</p>');
  assert.strictEqual(forma(a.documento), '#(html*(head*(title("T")),body*(p("ciao"))))');
  assert.deepStrictEqual(a.avvisi, []);
  assert.strictEqual(a.titolo, 'T');
  assert.strictEqual(forma(albero('solo testo').documento), '#(html*(head*,body*("solo testo")))');
});

test('paragrafi e voci di elenco si chiudono da soli', () => {
  assert.strictEqual(corpo('<p>uno<p>due'), 'body*(p("uno"),p("due"))');
  assert.strictEqual(corpo('<p>a<h1>b</h1>'), 'body*(p("a"),h1("b"))');
  assert.strictEqual(corpo('<ul><li>a<li>b</ul>'), 'body*(ul(li("a"),li("b")))');
  assert.strictEqual(corpo('<dl><dt>x<dd>y</dl>'), 'body*(dl(dt("x"),dd("y")))');
  assert.deepStrictEqual(albero('<p>uno<p>due').avvisi, []);
});

test('errori corretti dal browser, con un avviso e la riga', () => {
  let a = albero('<p>x</p>\n</p>');
  assert.strictEqual(forma(a.body), 'body*(p("x"),p*)');
  assert.match(a.avvisi[0].testo, /paragrafo vuoto/);
  assert.strictEqual(a.avvisi[0].riga, 2);

  a = albero('<p>\n<b>mai chiuso</p>');
  assert.strictEqual(forma(a.body), 'body*(p(b("mai chiuso")))');
  assert.match(a.avvisi[0].testo, /<b> \(riga 2\) non era chiuso/);

  a = albero('<b>fino alla fine');
  assert.match(a.avvisi[0].testo, /<b> \(riga 1\) non viene mai chiuso/);

  a = albero('<b><i>x</b>y');
  assert.strictEqual(forma(a.body), 'body*(b(i("x")),"y")');
  assert.match(a.avvisi[0].testo, /<i>.*insieme a <b>/);

  a = albero('ciao </div> mondo');
  assert.strictEqual(forma(a.body), 'body*("ciao mondo")');
  assert.match(a.avvisi[0].testo, /<\/div> chiude qualcosa che non era aperto/);
  const unico = a.body.figli.find((f) => f.tipo === 'testo');
  assert.deepStrictEqual(unico.tokens, [0, 2]);
  assert.deepStrictEqual(a.passi[2].aggiorna, [unico.id]);

  a = albero('<h1>a<h2>b</h2>');
  assert.strictEqual(forma(a.body), 'body*(h1("a"),h2("b"))');
  assert.match(a.avvisi[0].testo, /titolo <h2> dentro <h1>/);

  a = albero('<a href=1>x<a href=2>y</a>');
  assert.strictEqual(forma(a.body), 'body*(a("x"),a("y"))');

  a = albero('<body><p>x</p></body><p>y</p>');
  assert.strictEqual(forma(a.body), 'body(p("x"),p("y"))');
  assert.match(a.avvisi[0].testo, /dopo <\/body>/);

  a = albero('uno</br>due');
  assert.strictEqual(forma(a.body), 'body*("uno",br,"due")');

  a = albero('<html><html><head><head></head><body><body>x');
  assert.strictEqual(a.avvisi.length, 3);
  assert.strictEqual(forma(a.documento), '#(html(head,body("x")))');
});

test('marcatore spezzato: il resto del testo viene ignorato', () => {
  const a = albero('<p>ciao</p>\n<p class="x');
  assert.strictEqual(L.tokenizza('<p>ciao</p>\n<p class="x').pop().tipo, 'rotto');
  assert.strictEqual(forma(a.body), 'body*(p("ciao"))');
  assert.match(a.avvisi[0].testo, /non finisce con «>»/);
  assert.strictEqual(a.avvisi[0].riga, 2);
});

test('elementi vuoti, testo grezzo, commenti e doctype', () => {
  let a = albero('<p>a<br>b<img src="x.png" alt="foto"></p>');
  assert.strictEqual(forma(a.body), 'body*(p("a",br,"b",img))');
  assert.strictEqual(L.trova(a.documento, (n) => n.nome === 'img').attributi.alt, 'foto');

  a = albero('<script>if (a<b) x("</p>")</script><p>ok</p>');
  const s = L.trova(a.documento, (n) => n.nome === 'script');
  assert.strictEqual(s.figli.length, 1);
  assert.strictEqual(s.figli[0].testo, 'if (a<b) x("</p>")');
  assert.ok(a.avvisi.some((v) => v.tipo === 'script'));

  a = albero('<title>a &amp; <b>x</b></title>');
  assert.strictEqual(a.titolo, 'a & <b>x</b>');

  a = albero('<!DOCTYPE html>\n<!-- nota --><p>x');
  assert.strictEqual(a.documento.figli[0].tipo, 'doctype');
  assert.strictEqual(forma(a.documento), '#(<!DOCTYPE html>,<!-- nota -->,html*(head*,body*(p("x"))))');
});

test('la pagina «1991» del capitolo si analizza senza intoppi', () => {
  const vecchia = '<HEADER>\n<TITLE>Ciao, mondo!</TITLE>\n</HEADER>\n<BODY>\n<H1>Ciao, mondo!</H1>\nQuesta pagina vive in un ipertesto\ngrande come il mondo: il\n<A HREF="http://info.cern.ch/">World\nWide Web</A>.<P>\n</BODY>';
  const a = albero(vecchia);
  assert.strictEqual(a.titolo, 'Ciao, mondo!');
  const link = L.trova(a.documento, (n) => n.nome === 'a');
  assert.strictEqual(link.attributi.href, 'http://info.cern.ch/');
  assert.strictEqual(L.collassa(L.testoDi(link)), 'World Wide Web');
});

test('i passi dell\'analisi creano ogni nodo una volta sola, nell\'ordine del testo', () => {
  for (const t of [L.ESEMPIO, '<p>uno<p>due', 'ciao </x> mondo', '', 'x']) {
    const tk = L.tokenizza(t);
    const a = L.costruisci(tk, t);
    assert.strictEqual(a.passi.length, tk.length + 1);
    assert.strictEqual(a.passi[a.passi.length - 1].token, -1);
    const creati = a.passi.flatMap((p) => p.crea);
    assert.deepStrictEqual(creati.slice().sort((x, y) => x - y), a.nodi.slice(1).map((n) => n.id));
    // un nodo nasce sempre dopo suo padre
    const quando = new Map(creati.map((id, i) => [id, i]));
    for (const n of a.nodi.slice(1)) if (n.padre.id !== 0) assert.ok(quando.get(n.padre.id) < quando.get(n.id));
    // alla fine non resta niente di aperto
    assert.deepStrictEqual(a.passi[a.passi.length - 1].aperti, []);
  }
  const a = albero(L.ESEMPIO);
  const pH1 = a.passi[a.token.findIndex((g) => g.tipo === 'apre' && g.nome === 'h1')];
  assert.deepStrictEqual(pH1.aperti, ['html', 'body', 'h1']);
  const h1 = L.trova(a.documento, (n) => n.nome === 'h1');
  assert.strictEqual(a.token[h1.token].nome, 'h1');
  assert.strictEqual(a.token[h1.tokenFine].tipo, 'chiude');
});

test('controlli: testo vuoto, troppo lungo, troppi nodi, troppo annidato', () => {
  for (const t of ['', '   \n  ', null]) {
    const r = L.valida(t);
    assert.strictEqual(r.ok, false);
    assert.match(r.errore, /vuota/);
  }
  const lungo = L.analizza('x'.repeat(L.LIMITI.caratteri + 1));
  assert.strictEqual(lungo.ok, false);
  assert.match(lungo.errore, /troppo lungo: 1201 caratteri su 1200/);
  assert.strictEqual(L.analizza('x'.repeat(L.LIMITI.caratteri)).ok, true);
  const nodi = L.analizza('<i></i>'.repeat(80));
  assert.strictEqual(nodi.ok, false);
  assert.match(nodi.errore, /83 nodi/);
  const fondo = L.analizza('<b>'.repeat(13) + 'x');
  assert.strictEqual(fondo.ok, false);
  assert.match(fondo.errore, /annidati troppo/);
  assert.strictEqual(L.analizza('<b>'.repeat(8) + 'x').ok, true);
});

test('messaggi HTTP/1.0 e HTTP/0.9', () => {
  assert.deepStrictEqual(L.richiesta('1.0').righe, ['GET /ciao.html HTTP/1.0', '']);
  assert.deepStrictEqual(L.richiesta('0.9').righe, ['GET /ciao.html']);
  const r = L.risposta('<p>è</p>', '1.0');
  assert.strictEqual(r.stato, 'HTTP/1.0 200 OK');
  assert.deepStrictEqual(r.intestazioni, [['Content-Type', 'text/html'], ['Content-Length', '9']]);
  const v = L.risposta('<p>è</p>', '0.9');
  assert.strictEqual(v.stato, null);
  assert.deepStrictEqual(v.intestazioni, []);
  assert.strictEqual(v.corpo, '<p>è</p>');
  assert.strictEqual(L.risposta(L.ESEMPIO, '1.0').byte, L.ESEMPIO.length);
});

test('byte in UTF-8', () => {
  assert.strictEqual(L.byteUtf8('abc'), 3);
  assert.strictEqual(L.byteUtf8('è'), 2);
  assert.strictEqual(L.byteUtf8('€'), 3);
  assert.strictEqual(L.byteUtf8('😀'), 4);
  assert.strictEqual(L.byteUtf8(''), 0);
});

test('il clic: il programma trova #tasto e #conta e cambia il nodo di testo', () => {
  const a = albero(L.ESEMPIO);
  const { tasto, conta } = L.ascolta(a);
  assert.strictEqual(tasto.nome, 'button');
  assert.strictEqual(conta.nome, 'b');
  const r1 = L.eseguiClic(a, 1);
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(r1.prima, '0');
  assert.strictEqual(r1.dopo, '1');
  assert.strictEqual(r1.nodo, conta.figli[0]);
  L.eseguiClic(a, 2);
  assert.strictEqual(L.testoDi(conta), '2');

  assert.strictEqual(L.eseguiClic(albero('<button id="tasto">x</button>'), 1).motivo, 'senza-conta');
  assert.strictEqual(L.eseguiClic(albero('<b id="conta"></b>'), 1).motivo, 'conta-vuoto');
  assert.strictEqual(L.eseguiClic(albero('<b id="conta"><i>0</i></b>'), 1).motivo, 'conta-non-testo');
  assert.strictEqual(L.ascolta(albero('<p>niente</p>')).tasto, null);
  for (const m of ['senza-tasto', 'altro-tasto', 'senza-conta', 'conta-vuoto', 'conta-non-testo']) assert.ok(L.MOTIVI[m], m);
});

test('il programma della pagina: le righe che si accendono', () => {
  assert.match(L.PROGRAMMA[L.RIGHE_PROGRAMMA.evento], /onclick/);
  assert.match(L.PROGRAMMA[L.RIGHE_PROGRAMMA.somma], /clic \+ 1/);
  assert.match(L.PROGRAMMA[L.RIGHE_PROGRAMMA.dom], /firstChild\.data/);
  for (const r of L.PROGRAMMA) assert.ok(r.length <= 46, r);
});

test('piano del disegno: titolo, poi i blocchi del corpo in ordine', () => {
  const a = albero(L.ESEMPIO);
  const piano = L.pianoDisegno(a);
  assert.deepStrictEqual(piano.map((u) => (u.tipo === 'titolo' ? 'titolo' : a.nodi[u.nodo].nome)), ['titolo', 'h1', 'p', 'button', 'p']);
  const p = piano[2];
  assert.strictEqual(p.ids.length, 4); // p, testo, a, testo del collegamento
  const senza = L.pianoDisegno(albero('<p>a</p>'));
  assert.deepStrictEqual(senza.map((u) => u.tipo), ['blocco']);
  assert.deepStrictEqual(L.pianoDisegno(albero('<title>x</title>')).map((u) => u.tipo), ['titolo']);
});

test('dove porta un collegamento', () => {
  assert.deepStrictEqual(L.destinazione('http://info.cern.ch'), { tipo: 'web', schema: 'http', host: 'info.cern.ch', percorso: '/' });
  assert.deepStrictEqual(L.destinazione('altra.html'), { tipo: 'web', schema: 'http', host: 'example.org', percorso: '/altra.html', relativo: true });
  assert.strictEqual(L.destinazione('/a/b.html?x=1').percorso, '/a/b.html');
  assert.deepStrictEqual(L.destinazione('#su'), { tipo: 'ancora', ancora: 'su' });
  assert.deepStrictEqual(L.destinazione('javascript:alert(1)'), { tipo: 'altro', schema: 'javascript' });
  assert.deepStrictEqual(L.destinazione('  '), { tipo: 'vuoto' });
});

test('i frammenti si aggiungono su una riga nuova prima di </body>', () => {
  const r = L.inserisciFrammento(L.ESEMPIO, L.FRAMMENTI.paragrafo);
  assert.strictEqual(r.testo.slice(r.inizio, r.fine), L.FRAMMENTI.paragrafo);
  assert.match(r.testo, /<\/p>\n<p>Un nuovo paragrafo, scritto da me\.<\/p>\n<\/body>/);
  const a = albero(r.testo);
  assert.strictEqual(a.body.figli.filter((f) => f.nome === 'p').length, 3);
  const senza = L.inserisciFrammento('<p>a</p>', L.FRAMMENTI.elenco);
  assert.strictEqual(senza.testo, '<p>a</p>\n' + L.FRAMMENTI.elenco);
  assert.strictEqual(L.inserisciFrammento('', 'x').testo, 'x');
  for (const k of Object.keys(L.FRAMMENTI)) assert.ok(L.analizza(L.inserisciFrammento(L.ESEMPIO, L.FRAMMENTI[k]).testo).ok, k);
});

test('descrizioni per i lettori di schermo', () => {
  const a = albero(L.ESEMPIO);
  assert.strictEqual(L.descrivi(a.documento), 'documento');
  assert.strictEqual(L.descrivi(L.trova(a.documento, (n) => n.nome === 'a')), 'elemento a, href http://info.cern.ch');
  assert.strictEqual(L.descrivi(albero('x').html), 'elemento html, aggiunto dal browser');
  assert.strictEqual(L.descrivi(L.trova(a.documento, (n) => n.tipo === 'testo')), 'testo: Ciao, mondo!');
});
