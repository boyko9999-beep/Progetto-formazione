/*
 * Laboratorio «Come nasce una pagina web» (capitolo 11, il web e l'open source).
 *
 * Una pagina fa il suo viaggio in cinque passi: la richiesta HTTP del browser, la risposta del
 * server, l'analisi che trasforma il testo HTML nell'albero del DOM, il disegno della pagina e,
 * come dal 1995, un piccolo programma JavaScript che cambia un nodo quando si preme un pulsante.
 *
 * La logica pura (i messaggi HTTP/0.9 e HTTP/1.0, un analizzatore HTML semplificato che segue le
 * regole principali dei browser, il clic sul contatore) è esportata per i test in Node.
 * Nel browser l'albero mostrato è quello di DOMParser (daDom): il nostro analizzatore dà le posizioni
 * nel testo, il ritmo della crescita e gli avvisi; i nodi in più del parser vero diventano «aggiunti».
 * Sicurezza: l'HTML scritto dal lettore non entra mai nella pagina. DOMParser lo legge in un documento
 * a parte e inerte (i suoi script non partono) e lo disegna un renderer che crea solo elementi noti e
 * nodi di testo: niente innerHTML, nessun attributo del lettore sugli elementi veri, nessuno script eseguito.
 */
(function (root) {
  'use strict';

  /* ======================= logica pura: niente DOM ======================= */

  const HOST = 'example.org';
  const PERCORSO = '/ciao.html';
  const INDIRIZZO = 'http://' + HOST + PERCORSO;
  const LIMITI = { caratteri: 1200, nodi: 80, profondita: 12 };

  const ESEMPIO = [
    '<html>',
    '<head>',
    '<title>Ciao, mondo!</title>',
    '</head>',
    '<body>',
    '<h1>Ciao, mondo!</h1>',
    '<p>Il primo sito web:',
    '<a href="http://info.cern.ch">info.cern.ch</a></p>',
    '<button id="tasto">Cliccami</button>',
    '<p>Clic: <b id="conta">0</b></p>',
    '</body>',
    '</html>',
  ].join('\n');

  const PASSI = [
    { n: 1, nome: 'Richiesta', breve: 'GET' },
    { n: 2, nome: 'Risposta', breve: '200 OK' },
    { n: 3, nome: 'Analisi', breve: 'albero' },
    { n: 4, nome: 'Disegno', breve: 'pagina' },
    { n: 5, nome: 'JavaScript', breve: 'evento' },
  ];

  // Il programma della pagina (scritto dal laboratorio, mai dal lettore): solo metodi del DOM del 1998.
  const PROGRAMMA = [
    'var clic = 0;',
    "var tasto = document.getElementById('tasto');",
    "var conta = document.getElementById('conta');",
    '',
    'tasto.onclick = function () {',
    '  clic = clic + 1;',
    '  conta.firstChild.data = clic;',
    '};',
  ];
  const RIGHE_PROGRAMMA = { evento: 4, somma: 5, dom: 6 };

  const FRAMMENTI = {
    paragrafo: '<p>Un nuovo paragrafo, scritto da me.</p>',
    collegamento: '<p>Un <a href="altra.html">collegamento</a> a un\'altra pagina.</p>',
    elenco: '<ul>\n<li>primo punto</li>\n<li>secondo punto</li>\n</ul>',
  };

  const MOTIVI = {
    'senza-tasto': 'Nella pagina non c\'è più un elemento con `id="tasto"`: il programma non ha niente da ascoltare. Rimetti `<button id="tasto">Cliccami</button>` o premi «Ripristina».',
    'altro-tasto': 'Questo pulsante non ha `id="tasto"`: il programma ascolta solo quello, quindi il clic non fa niente.',
    'senza-conta': 'Il programma cerca l\'elemento con `id="conta"` e non lo trova: `conta` vale `null` e in un browser vero la console mostrerebbe un errore. Rimetti `<b id="conta">0</b>` o premi «Ripristina».',
    'conta-vuoto': '`#conta` non ha figli: `conta.firstChild` vale `null` e il programma si ferma con un errore. Scrivi un numero dentro il marcatore, per esempio `<b id="conta">0</b>`.',
    'conta-non-testo': 'Il primo figlio di `#conta` non è un nodo di testo: cambiare il suo `.data` non cambia niente sullo schermo. Metti il numero subito dentro `#conta`.',
  };

  /* ---------- testo e byte ---------- */

  function byteUtf8(s) {
    let n = 0;
    for (const ch of String(s == null ? '' : s)) {
      const c = ch.codePointAt(0);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    return n;
  }

  function riga(testo, pos) {
    let r = 1;
    const t = String(testo);
    const fine = Math.min(pos, t.length);
    for (let i = 0; i < fine; i++) if (t.charCodeAt(i) === 10) r++;
    return r;
  }

  const SPAZI = /^[ \t\n\r\f]*$/;
  const collassa = (s) => String(s).replace(/[ \t\n\r\f]+/g, ' ').trim();
  function abbrevia(s, max) {
    const t = collassa(s);
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  }

  /* ---------- i messaggi HTTP ---------- */

  // HTTP/0.9 (1991): una riga sola, niente versione. HTTP/1.0 (RFC 1945, 1996): versione e riga vuota finale.
  function richiesta(versione, percorso) {
    const p = percorso || PERCORSO;
    const prima = versione === '0.9' ? 'GET ' + p : 'GET ' + p + ' HTTP/1.0';
    return { versione: versione === '0.9' ? '0.9' : '1.0', riga: prima, righe: versione === '0.9' ? [prima] : [prima, ''], etichetta: 'GET' };
  }

  // HTTP/0.9: solo il testo della pagina, poi il server chiude. HTTP/1.0: riga di stato, intestazioni, riga vuota, corpo.
  // Content-Length conta i byte del corpo; se ci sono lettere fuori dall'ASCII (è, €) il server dice anche che
  // il testo è in UTF-8, altrimenti HTTP/1.0 lo leggerebbe come ISO-8859-1.
  function risposta(html, versione) {
    const corpo = String(html == null ? '' : html);
    const byte = byteUtf8(corpo);
    if (versione === '0.9') return { versione: '0.9', stato: null, codice: null, intestazioni: [], corpo: corpo, byte: byte, etichetta: 'HTML' };
    const tipo = /[^\x00-\x7f]/.test(corpo) ? 'text/html; charset=utf-8' : 'text/html';
    return {
      versione: '1.0', stato: 'HTTP/1.0 200 OK', codice: 200,
      intestazioni: [['Content-Type', tipo], ['Content-Length', String(byte)]],
      corpo: corpo, byte: byte, etichetta: '200 OK',
    };
  }

  /* ---------- l'analizzatore: dal testo ai gettoni ---------- */

  const VUOTI = new Set(['area', 'base', 'basefont', 'bgsound', 'br', 'col', 'embed', 'frame', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const GREZZI = new Set(['script', 'style']);   // il contenuto resta testo così com'è
  const RCDATA = new Set(['title', 'textarea']); // il contenuto è testo, con le entità decodificate

  const ENTITA = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ',
    agrave: 'à', aacute: 'á', egrave: 'è', eacute: 'é', igrave: 'ì', iacute: 'í', ograve: 'ò', oacute: 'ó', ugrave: 'ù', uacute: 'ú',
    Agrave: 'À', Egrave: 'È', Eacute: 'É', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
    copy: '©', reg: '®', deg: '°', euro: '€', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', middot: '·', times: '×',
  };
  const ENTITA_SENZA_PUNTO = new Set(['amp', 'lt', 'gt', 'quot', 'nbsp']);

  function decodifica(s) {
    return String(s).replace(/&(?:#[xX]([0-9a-fA-F]{1,6})|#(\d{1,7})|([a-zA-Z][a-zA-Z0-9]{1,31}));?/g, (m, hex, dec, nome) => {
      if (nome) {
        if (!m.endsWith(';') && !ENTITA_SENZA_PUNTO.has(nome)) return m;
        return Object.prototype.hasOwnProperty.call(ENTITA, nome) ? ENTITA[nome] : m;
      }
      const c = hex ? parseInt(hex, 16) : parseInt(dec, 10);
      if (!c || c > 0x10ffff || (c >= 0xd800 && c <= 0xdfff)) return '�';
      return String.fromCodePoint(c);
    });
  }

  const lettera = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  const spazio = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';

  // Divide il testo in gettoni contigui (testo, apre, chiude, commento, doctype, rotto) con le loro posizioni.
  function tokenizza(testo) {
    const t = String(testo == null ? '' : testo);
    const n = t.length;
    const out = [];
    let i = 0;
    let inizioTesto = 0;

    function testoFinoA(fine, grezzo) {
      if (fine > inizioTesto) {
        const g = t.slice(inizioTesto, fine);
        out.push({ tipo: 'testo', testo: grezzo ? g : decodifica(g), inizio: inizioTesto, fine: fine });
      }
      inizioTesto = fine;
    }

    while (i < n) {
      if (t[i] !== '<') { i++; continue; }
      const c1 = t[i + 1] || '';
      if (t.startsWith('<!--', i)) {
        testoFinoA(i);
        const f = t.indexOf('-->', i + 4);
        const fine = f < 0 ? n : f + 3;
        out.push({ tipo: 'commento', testo: t.slice(i + 4, f < 0 ? n : f), inizio: i, fine: fine, rotto: f < 0 });
        i = inizioTesto = fine;
        continue;
      }
      if (c1 === '!' || c1 === '?') {
        testoFinoA(i);
        const f = t.indexOf('>', i + 2);
        const fine = f < 0 ? n : f + 1;
        const corpo = t.slice(i + 2, f < 0 ? n : f);
        out.push({ tipo: c1 === '!' && /^doctype/i.test(corpo) ? 'doctype' : 'commento', testo: corpo, inizio: i, fine: fine });
        i = inizioTesto = fine;
        continue;
      }
      const chiude = c1 === '/';
      if (!(chiude ? lettera(t[i + 2] || '') : lettera(c1))) { i++; continue; } // «<» da solo è testo
      testoFinoA(i);
      let j = i + (chiude ? 2 : 1);
      const s0 = j;
      while (j < n && !spazio(t[j]) && t[j] !== '/' && t[j] !== '>') j++;
      const nome = t.slice(s0, j).toLowerCase();
      const attributi = [];
      let autochiuso = false;
      let rotto = false;
      for (;;) {
        while (j < n && (spazio(t[j]) || t[j] === '/')) {
          if (t[j] === '/' && t[j + 1] === '>') autochiuso = true;
          j++;
        }
        if (j >= n) { rotto = true; break; }
        if (t[j] === '>') { j++; break; }
        const a0 = j;
        j++;
        while (j < n && !spazio(t[j]) && t[j] !== '/' && t[j] !== '>' && t[j] !== '=') j++;
        const an = t.slice(a0, j).toLowerCase();
        let k = j;
        while (k < n && spazio(t[k])) k++;
        let valore = '';
        if (t[k] === '=') {
          k++;
          while (k < n && spazio(t[k])) k++;
          const q = t[k];
          if (q === '"' || q === '\'') {
            const f = t.indexOf(q, k + 1);
            if (f < 0) { rotto = true; break; }
            valore = decodifica(t.slice(k + 1, f));
            j = f + 1;
          } else {
            const v0 = k;
            while (k < n && !spazio(t[k]) && t[k] !== '>') k++;
            valore = decodifica(t.slice(v0, k));
            j = k;
          }
        }
        if (!chiude && !attributi.some((a) => a.nome === an)) attributi.push({ nome: an, valore: valore });
      }
      if (rotto) {
        out.push({ tipo: 'rotto', nome: nome, inizio: i, fine: n });
        i = inizioTesto = n;
        break;
      }
      if (chiude) out.push({ tipo: 'chiude', nome: nome, inizio: i, fine: j });
      else out.push({ tipo: 'apre', nome: nome, attributi: attributi, autochiuso: autochiuso, inizio: i, fine: j });
      i = inizioTesto = j;
      if (!chiude && (GREZZI.has(nome) || RCDATA.has(nome))) {
        const re = new RegExp('</' + nome + '(?=[\\s/>]|$)', 'ig');
        re.lastIndex = j;
        const m = re.exec(t);
        const f = m ? m.index : n;
        testoFinoA(f, GREZZI.has(nome));
        i = f;
      }
    }
    testoFinoA(n);
    return out;
  }

  /* ---------- l'analizzatore: dai gettoni all'albero ---------- */

  // Una versione ridotta dell'algoritmo dei browser (HTML5): html, head e body impliciti, elementi vuoti,
  // paragrafi e voci di elenco chiusi da soli, errori corretti invece che rifiutati.
  // Semplificazione dichiarata: i marcatori di formato annidati male (<b><i></b></i>) vengono chiusi
  // insieme invece di essere riaperti come farebbe l'«adoption agency» dei browser.
  const TESTA = new Set(['title', 'meta', 'link', 'style', 'script', 'base', 'noscript']);
  const DOPO_TESTA = new Set(['title', 'meta', 'link', 'style', 'script', 'base']); // dopo </head> tornano nella testa
  const CHIUDE_P = new Set(['address', 'article', 'aside', 'blockquote', 'center', 'details', 'dialog', 'dir', 'div', 'dl', 'dd', 'dt',
    'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'listing',
    'main', 'menu', 'nav', 'ol', 'p', 'plaintext', 'pre', 'section', 'summary', 'table', 'ul', 'xmp']);
  const TITOLI = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const OPZIONALI = new Set(['p', 'li', 'dt', 'dd', 'option', 'optgroup', 'html', 'head', 'body', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'caption', 'rb', 'rt', 'rp', 'rtc']);
  const BARRIERE = new Set(['button', 'table', 'td', 'th', 'caption', 'html', 'marquee', 'object', 'applet', 'template']);
  const STRUTTURA = ['head', 'body', 'html', 'br'];

  function costruisci(token, sorgente) {
    const src = String(sorgente == null ? '' : sorgente);
    const nodi = [];
    const passi = [];
    const avvisi = [];
    const pila = [];
    let passo = null;
    let modo = 'inizio';
    let html = null;
    let head = null;
    let body = null;
    let dopoBody = false;
    let avvisatoDopo = false;

    const nuovoNodo = (tipo, campi) => {
      const nodo = Object.assign({ id: nodi.length, tipo: tipo, nome: '', attributi: {}, figli: [], padre: null, implicito: false, token: -1, tokenFine: -1 }, campi);
      nodi.push(nodo);
      return nodo;
    };
    const documento = nuovoNodo('documento', { nome: '#documento' });
    const corrente = () => pila[pila.length - 1] || documento;
    const rigaDi = (k) => (k >= 0 && token[k] ? riga(src, token[k].inizio) : null);
    const vuoto = (tk) => tk.tipo === 'testo' && SPAZI.test(tk.testo);
    const avvisa = (k, testo) => avvisi.push({ riga: rigaDi(k), testo: testo, tipo: 'correzione', token: k });

    function inserisci(nodo, padre) {
      const p = padre || corrente();
      nodo.padre = p;
      p.figli.push(nodo);
      if (passo) passo.crea.push(nodo.id);
      return nodo;
    }
    function elemento(nome, attributi, k, implicito) {
      const att = {};
      for (const a of attributi || []) att[a.nome] = a.valore;
      const el = inserisci(nuovoNodo('elemento', { nome: nome, attributi: att, implicito: !!implicito, token: implicito ? -1 : k }));
      if (!VUOTI.has(nome)) pila.push(el);
      return el;
    }
    function testo(tk, k, padre) {
      const ultimo = padre.figli[padre.figli.length - 1];
      if (ultimo && ultimo.tipo === 'testo') { // due pezzi di testo vicini diventano un solo nodo, come nel DOM
        ultimo.testo += tk.testo;
        ultimo.spazio = SPAZI.test(ultimo.testo);
        ultimo.tokens.push(k);
        if (passo) passo.aggiorna.push(ultimo.id);
        return;
      }
      inserisci(nuovoNodo('testo', { testo: tk.testo, spazio: SPAZI.test(tk.testo), token: k, tokens: [k] }), padre);
    }
    function commento(tk, k, padre) {
      inserisci(nuovoNodo('commento', { testo: tk.testo, token: k }), padre);
    }
    function chiudi(el, k) {
      while (pila.length) {
        const x = pila.pop();
        if (passo) passo.chiude.push(x.id);
        if (x === el) { if (k >= 0) x.tokenFine = k; return; }
        if (!OPZIONALI.has(x.nome) && !x.implicito) avvisa(k, 'Il marcatore <' + x.nome + '> (riga ' + rigaDi(x.token) + ') non era chiuso: il browser lo chiude insieme a <' + el.nome + '>.');
      }
    }
    function cerca(nome, barriere) {
      for (let i = pila.length - 1; i >= 0; i--) {
        if (pila[i].nome === nome) return pila[i];
        if (barriere && barriere.has(pila[i].nome)) return null;
      }
      return null;
    }
    function ignora(k, tk, motivo) {
      if (passo) passo.ignorato = true;
      avvisa(k, motivo || ('Il marcatore </' + tk.nome + '> chiude qualcosa che non era aperto: il browser lo ignora.'));
    }
    const doppio = (k, tk) => ignora(k, tk, 'C\'è già un <' + tk.nome + '>: il browser ignora questo.');
    const fuoriPosto = (k, tk) => ignora(k, tk, 'Il <!DOCTYPE> va all\'inizio del testo: qui il browser lo ignora.');

    function assicuraHtml(k) {
      if (!html) { html = elemento('html', null, k, true); modo = 'prima-head'; }
    }
    function assicuraHead(k) {
      assicuraHtml(k);
      if (!head) { head = elemento('head', null, k, true); modo = 'in-head'; }
    }
    function chiudiHead() {
      if (head && pila.includes(head)) chiudi(head, -1);
      modo = 'dopo-head';
    }
    function assicuraBody(k) {
      assicuraHead(k);
      if (pila.includes(head)) chiudiHead();
      if (!body) body = elemento('body', null, k, true);
      modo = 'in-body';
    }
    function chiudiVoce(nomi, contenitori) {
      for (let i = pila.length - 1; i >= 0; i--) {
        const x = pila[i];
        if (nomi.includes(x.nome)) { chiudi(x, -1); return; }
        if (contenitori.includes(x.nome) || BARRIERE.has(x.nome) || x === body) return;
      }
    }

    function inizio(tk, k) {
      if (vuoto(tk)) return;
      if (tk.tipo === 'doctype') { inserisci(nuovoNodo('doctype', { nome: '!DOCTYPE', testo: tk.testo, token: k }), documento); return; }
      if (tk.tipo === 'commento') { commento(tk, k, documento); return; }
      if (tk.tipo === 'apre' && tk.nome === 'html') { html = elemento('html', tk.attributi, k, false); modo = 'prima-head'; return; }
      if (tk.tipo === 'chiude' && !STRUTTURA.includes(tk.nome)) { ignora(k, tk); return; }
      assicuraHtml(k);
      primaHead(tk, k);
    }
    function primaHead(tk, k) {
      if (vuoto(tk)) return;
      if (tk.tipo === 'commento') { commento(tk, k); return; }
      if (tk.tipo === 'doctype') { fuoriPosto(k, tk); return; }
      if (tk.tipo === 'apre' && tk.nome === 'html') { doppio(k, tk); return; }
      if (tk.tipo === 'apre' && tk.nome === 'head') { head = elemento('head', tk.attributi, k, false); modo = 'in-head'; return; }
      if (tk.tipo === 'chiude' && !STRUTTURA.includes(tk.nome)) { ignora(k, tk); return; }
      assicuraHead(k);
      inHead(tk, k);
    }
    function inHead(tk, k) {
      if (vuoto(tk)) return;
      if (tk.tipo === 'commento') { commento(tk, k); return; }
      if (tk.tipo === 'doctype') { fuoriPosto(k, tk); return; }
      if (tk.tipo === 'apre' && (tk.nome === 'html' || tk.nome === 'head')) { doppio(k, tk); return; }
      if (tk.tipo === 'apre' && TESTA.has(tk.nome)) { elemento(tk.nome, tk.attributi, k, false); return; }
      if (tk.tipo === 'chiude' && tk.nome === 'head') { chiudi(head, k); modo = 'dopo-head'; return; }
      if (tk.tipo === 'chiude' && TESTA.has(tk.nome)) {
        const el = cerca(tk.nome);
        if (el) chiudi(el, k); else ignora(k, tk);
        return;
      }
      if (tk.tipo === 'chiude' && !STRUTTURA.includes(tk.nome)) { ignora(k, tk); return; }
      chiudiHead();
      dopoHead(tk, k);
    }
    function dopoHead(tk, k) {
      if (vuoto(tk)) return;
      if (tk.tipo === 'commento') { commento(tk, k); return; }
      if (tk.tipo === 'doctype') { fuoriPosto(k, tk); return; }
      if (tk.tipo === 'apre' && (tk.nome === 'html' || tk.nome === 'head')) { doppio(k, tk); return; }
      if (tk.tipo === 'apre' && tk.nome === 'body') { body = elemento('body', tk.attributi, k, false); modo = 'in-body'; return; }
      if (tk.tipo === 'apre' && DOPO_TESTA.has(tk.nome) && head) {
        avvisa(k, 'Il marcatore <' + tk.nome + '> sta dopo </head>: il browser lo rimette dentro <head>.');
        pila.push(head);
        elemento(tk.nome, tk.attributi, k, false);
        pila.splice(pila.indexOf(head), 1);
        return;
      }
      if (tk.tipo === 'chiude' && !STRUTTURA.includes(tk.nome)) { ignora(k, tk); return; }
      assicuraBody(k);
      inBody(tk, k);
    }
    function dopoLaFine(k, cosa) {
      if (dopoBody && !avvisatoDopo) {
        avvisatoDopo = true;
        avvisa(k, cosa + ' dopo </body>: il browser lo rimette dentro il corpo della pagina.');
      }
    }
    function inBody(tk, k) {
      if (tk.tipo === 'testo') {
        if (!vuoto(tk)) dopoLaFine(k, 'C\'è del testo');
        testo(tk, k, corrente());
        return;
      }
      if (tk.tipo === 'commento') { commento(tk, k); return; }
      if (tk.tipo === 'doctype') { fuoriPosto(k, tk); return; }
      const n = tk.nome;
      if (tk.tipo === 'apre') {
        if (n === 'html' || n === 'body' || n === 'head') { doppio(k, tk); return; }
        dopoLaFine(k, 'C\'è un <' + n + '>');
        if (CHIUDE_P.has(n)) {
          const p = cerca('p', BARRIERE);
          if (p) chiudi(p, -1);
        }
        if (TITOLI.has(n) && TITOLI.has(corrente().nome)) {
          const t = corrente();
          avvisa(k, 'Un titolo <' + n + '> dentro <' + t.nome + '>: il browser chiude prima <' + t.nome + '>.');
          chiudi(t, -1);
        }
        if (n === 'li') chiudiVoce(['li'], ['ul', 'ol']);
        if (n === 'dt' || n === 'dd') chiudiVoce(['dt', 'dd'], ['dl']);
        if (n === 'a' || n === 'button') {
          const gia = cerca(n);
          if (gia) {
            avvisa(k, (n === 'a' ? 'Un collegamento dentro un altro' : 'Un pulsante dentro un altro') + ': il browser chiude prima il primo <' + n + '>.');
            chiudi(gia, -1);
          }
        }
        const el = elemento(n, tk.attributi, k, false);
        // dentro <svg> e <math> la barra di «/>» chiude davvero il marcatore; nell'HTML non conta
        if (tk.autochiuso && !VUOTI.has(n) && pila.some((x) => x.nome === 'svg' || x.nome === 'math')) chiudi(el, k);
        return;
      }
      // marcatori di chiusura
      if (n === 'body' || n === 'html') {
        dopoBody = true;
        if (n === 'body' && body) body.tokenFine = k;
        if (n === 'html' && html) html.tokenFine = k;
        return;
      }
      if (n === 'p') {
        const p = cerca('p', BARRIERE);
        if (p) { chiudi(p, k); return; }
        avvisa(k, 'C\'è un </p> senza un <p> aperto: il browser crea un paragrafo vuoto.');
        const nuovo = elemento('p', null, k, true);
        chiudi(nuovo, k);
        return;
      }
      if (n === 'br') {
        avvisa(k, '</br> non esiste: il browser lo legge come <br>.');
        elemento('br', null, k, false);
        return;
      }
      if (TITOLI.has(n)) {
        for (let i = pila.length - 1; i >= 0; i--) {
          const x = pila[i];
          if (TITOLI.has(x.nome)) {
            if (x.nome !== n) avvisa(k, '</' + n + '> chiude un <' + x.nome + '>: il browser chiude comunque il titolo aperto.');
            chiudi(x, k);
            return;
          }
          if (BARRIERE.has(x.nome)) break;
        }
        ignora(k, tk);
        return;
      }
      const el = cerca(n);
      if (el && el !== html && el !== body && el !== head) { chiudi(el, k); return; }
      ignora(k, tk);
    }

    function elabora(tk, k) {
      const cur = corrente();
      const grezzo = GREZZI.has(cur.nome) || RCDATA.has(cur.nome);
      if (tk.tipo === 'testo' && grezzo) { testo(tk, k, cur); return; }
      if (tk.tipo === 'chiude' && grezzo && tk.nome === cur.nome) { chiudi(cur, k); return; } // </title>, </script>…
      if (tk.tipo === 'rotto') {
        passo.ignorato = true;
        avvisa(k, 'Il marcatore <' + (tk.nome || '') + '… non finisce con «>»: il browser lo ignora, insieme a tutto il testo che segue.');
        return;
      }
      if (modo === 'inizio') inizio(tk, k);
      else if (modo === 'prima-head') primaHead(tk, k);
      else if (modo === 'in-head') inHead(tk, k);
      else if (modo === 'dopo-head') dopoHead(tk, k);
      else inBody(tk, k);
    }

    for (let k = 0; k < token.length; k++) {
      passo = { token: k, crea: [], chiude: [], aggiorna: [], ignorato: false, aperti: [], apertiId: [] };
      elabora(token[k], k);
      passo.aperti = pila.map((x) => x.nome);
      passo.apertiId = pila.map((x) => x.id);
      passi.push(passo);
    }
    // fine del testo: completa la struttura e chiude tutto quello che è rimasto aperto
    passo = { token: -1, crea: [], chiude: [], aggiorna: [], ignorato: false, aperti: [], apertiId: [] };
    assicuraBody(-1);
    for (let i = pila.length - 1; i >= 0; i--) {
      const x = pila[i];
      if (!OPZIONALI.has(x.nome) && !x.implicito) avvisa(-1, 'Il marcatore <' + x.nome + '> (riga ' + rigaDi(x.token) + ') non viene mai chiuso: il browser lo chiude alla fine.');
    }
    while (pila.length) passo.chiude.push(pila.pop().id);
    passi.push(passo);

    const titolo = trova(documento, (x) => x.tipo === 'elemento' && x.nome === 'title');
    return {
      documento: documento, html: html, head: head, body: body, nodi: nodi, passi: passi, avvisi: avvisi,
      titolo: titolo ? collassa(testoDi(titolo)) : '',
    };
  }

  /* ---------- l'albero: visite e ricerche ---------- */

  const visibili = (nodo) => nodo.figli.filter((f) => !(f.tipo === 'testo' && f.spazio));

  // Le righe dell'albero come le mostra il laboratorio: senza i nodi fatti solo di spazi.
  function righeAlbero(documento) {
    const out = [];
    (function giro(n, livello) {
      out.push({ nodo: n, livello: livello });
      for (const f of visibili(n)) giro(f, livello + 1);
    })(documento, 1);
    return out;
  }

  function trova(nodo, pred) {
    if (pred(nodo)) return nodo;
    for (const f of nodo.figli) {
      const r = trova(f, pred);
      if (r) return r;
    }
    return null;
  }

  const perId = (documento, id) => trova(documento, (n) => n.tipo === 'elemento' && n.attributi.id === id);
  const testoDi = (n) => (n.tipo === 'testo' ? n.testo : n.figli.map(testoDi).join(''));

  function descrivi(n) {
    if (n.tipo === 'documento') return 'documento';
    if (n.tipo === 'testo') return 'testo: ' + abbrevia(n.testo, 60);
    if (n.tipo === 'commento') return 'commento: ' + abbrevia(n.testo, 40);
    if (n.tipo === 'doctype') return 'dichiarazione DOCTYPE';
    const att = Object.keys(n.attributi).map((k) => k + ' ' + abbrevia(n.attributi[k], 40)).join(', ');
    return 'elemento ' + n.nome + (att ? ', ' + att : '') + (n.implicito ? ', aggiunto dal browser' : '');
  }

  /* ---------- controlli, disegno, clic ---------- */

  function valida(testo) {
    const t = String(testo == null ? '' : testo);
    if (!t.trim()) return { ok: false, errore: 'La pagina è vuota: scrivi almeno un titolo o un paragrafo, per esempio `<p>Ciao!</p>`, oppure premi «Ripristina».' };
    if (t.length > LIMITI.caratteri) return { ok: false, errore: 'Il testo è troppo lungo: ' + t.length + ' caratteri su ' + LIMITI.caratteri + '. Accorcialo un po\' e riprova.' };
    return { ok: true };
  }

  // Quanti nodi e quanti livelli ha l'albero visibile (il documento escluso), e se stanno nei limiti.
  function misura(documento) {
    const righe = righeAlbero(documento);
    const conteggio = righe.length - 1;
    const profondita = righe.reduce((m, r) => Math.max(m, r.livello), 1) - 1;
    if (conteggio > LIMITI.nodi) {
      return { ok: false, errore: 'La pagina ha ' + conteggio + ' nodi: in questo laboratorio l\'albero ne tiene al massimo ' + LIMITI.nodi + '. Togli qualche paragrafo o qualche marcatore.' };
    }
    if (profondita > LIMITI.profondita) {
      return { ok: false, errore: 'I marcatori sono annidati troppo (' + profondita + ' livelli, al massimo ' + LIMITI.profondita + '): chiudi qualche marcatore prima di aprirne un altro.' };
    }
    return { ok: true, conteggio: conteggio, profondita: profondita };
  }

  function analizza(testo) {
    const v = valida(testo);
    if (!v.ok) return v;
    const t = String(testo);
    const token = tokenizza(t);
    const a = costruisci(token, t);
    const m = misura(a.documento);
    if (!m.ok) return m;
    const script = a.nodi.find((n) => n.tipo === 'elemento' && n.nome === 'script');
    if (script) a.avvisi.push({ riga: riga(t, token[script.token].inizio), testo: 'Gli script scritti da te restano testo: per sicurezza questo laboratorio non li esegue.', tipo: 'script', token: script.token });
    return Object.assign({ ok: true, testo: t, token: token, conteggio: m.conteggio, profondita: m.profondita }, a);
  }

  /* ---------- l'albero del browser vero (DOMParser) ---------- */

  // Il nostro analizzatore semplifica alcune regole; nel browser l'ultima parola spetta al suo parser.
  // daDom riceve l'albero di DOMParser (un documento a parte e inerte: non entra mai nella pagina e i suoi
  // script non partono) e lo riscrive con i nostri nodi. Dal nostro analizzatore prende solo le posizioni
  // nel testo e il passo in cui ogni nodo nasce. I nodi che il browser aggiunge e noi no (un <b> riaperto,
  // un <tbody>) diventano «aggiunti dal browser», con un avviso. Basta un oggetto con nodeType, localName,
  // attributes, childNodes e data: i test in Node gli passano un albero finto.
  const FORMATO = new Set(['a', 'b', 'big', 'code', 'em', 'font', 'i', 'nobr', 's', 'small', 'strike', 'strong', 'tt', 'u']);

  function daDom(doc, a) {
    const nodi = [];
    const nuovoNodo = (tipo, campi, padre) => {
      const n = Object.assign({ id: nodi.length, tipo: tipo, nome: '', attributi: {}, figli: [], padre: padre, implicito: false, token: -1, tokenFine: -1 }, campi);
      nodi.push(n);
      if (padre) padre.figli.push(n);
      return n;
    };
    (function copia(x, padre) {
      let n = null;
      if (x.nodeType === 9) n = nuovoNodo('documento', { nome: '#documento' }, null);
      else if (x.nodeType === 10) n = nuovoNodo('doctype', { nome: '!DOCTYPE', testo: 'DOCTYPE ' + (x.name || 'html') }, padre);
      else if (x.nodeType === 3) n = nuovoNodo('testo', { testo: String(x.data), spazio: SPAZI.test(x.data), tokens: [] }, padre);
      else if (x.nodeType === 8) n = nuovoNodo('commento', { testo: String(x.data) }, padre);
      else if (x.nodeType === 1) {
        const att = {};
        for (const at of Array.from(x.attributes || [])) if (!Object.prototype.hasOwnProperty.call(att, at.name)) att[at.name] = at.value;
        n = nuovoNodo('elemento', { nome: String(x.localName || x.nodeName || '').toLowerCase(), attributi: att }, padre);
      }
      if (!n) return;
      const figli = x.nodeType === 1 && x.content && x.content.childNodes ? x.content.childNodes : x.childNodes; // <template>
      for (const f of Array.from(figli || [])) copia(f, n);
    })(doc, null);
    const radice = nodi[0];
    if (!radice || radice.tipo !== 'documento') return a;
    const m = misura(radice);
    if (!m.ok) return m;

    // Le due liste in ordine di documento, senza i nodi fatti solo di spazi, si allineano come due testi
    // (la sottosequenza comune più pesante): lo stesso elemento con gli stessi attributi pesa di più,
    // lo stesso testo più di un testo letto in modo diverso (per esempio un'entità che non conosciamo).
    const inOrdine = (r) => {
      const out = [];
      (function giro(n) { for (const f of n.figli) { if (!(f.tipo === 'testo' && f.spazio)) out.push(f); giro(f); } })(r);
      return out;
    };
    const firma = (n) => {
      const k = Object.keys(n.attributi).sort();
      return { chiavi: k.join(' '), tutto: k.map((x) => x + '=' + n.attributi[x]).join('\n'), testo: n.tipo === 'testo' ? collassa(n.testo) : '' };
    };
    const D = inOrdine(radice);
    const O = inOrdine(a.documento);
    const fD = D.map(firma);
    const fO = O.map(firma);
    const peso = (i, j) => {
      const d = D[i];
      const o = O[j];
      if (d.tipo !== o.tipo) return 0;
      if (d.tipo === 'testo') return fD[i].testo === fO[j].testo ? 3 : 1;
      if (d.tipo !== 'elemento') return 1;
      if (d.nome !== o.nome) return 0;
      return 1 + (fD[i].chiavi === fO[j].chiavi ? 1 : 0) + (fD[i].tutto === fO[j].tutto ? 2 : 0);
    };
    const nO = O.length + 1;
    const W = new Int32Array((D.length + 1) * nO);
    for (let i = D.length - 1; i >= 0; i--) {
      for (let j = O.length - 1; j >= 0; j--) {
        const w = peso(i, j);
        W[i * nO + j] = Math.max(W[(i + 1) * nO + j], W[i * nO + j + 1], w > 0 ? w + W[(i + 1) * nO + j + 1] : 0);
      }
    }
    const usato = O.map(() => false);
    const pari = new Map();
    for (let i = 0, j = 0; i < D.length && j < O.length;) {
      const w = peso(i, j);
      if (w > 0 && W[i * nO + j] === w + W[(i + 1) * nO + j + 1]) { pari.set(D[i], O[j]); usato[j] = true; i++; j++; } else if (W[(i + 1) * nO + j] >= W[i * nO + j + 1]) i++;
      else j++;
    }
    // I nodi che il browser sposta (il testo dentro <table> finisce prima della tabella) escono dall'ordine:
    // si accoppiano solo se sono identici.
    D.forEach((d, i) => {
      if (pari.has(d)) return;
      const j = O.findIndex((o, k) => !usato[k] && o.tipo === d.tipo && o.nome === d.nome && fO[k].tutto === fD[i].tutto && fO[k].testo === fD[i].testo);
      if (j >= 0) { pari.set(d, O[j]); usato[j] = true; }
    });
    const nostro = new Map();
    for (const [d, o] of pari) {
      d.token = o.token;
      d.tokenFine = o.tokenFine;
      d.implicito = o.implicito;
      if (d.tipo === 'testo') d.tokens = (o.tokens || [o.token]).slice();
      nostro.set(o.id, d);
    }
    const aggiunti = D.filter((d) => d.tipo === 'elemento' && !pari.has(d));
    for (const d of aggiunti) d.implicito = true;

    // Quando nasce ogni nodo: come il suo gemello nostro; un nodo aggiunto, con il primo dei suoi discendenti;
    // mai prima di suo padre.
    const quando = new Map();
    a.passi.forEach((ps, s) => { for (const id of ps.crea) quando.set(id, s); });
    const passoDi = new Map();
    (function giu(n) {
      let min = Infinity;
      for (const f of n.figli) min = Math.min(min, giu(f));
      const o = pari.get(n);
      const s = o && quando.has(o.id) ? quando.get(o.id) : min;
      if (s !== Infinity && n !== radice) passoDi.set(n, s);
      return Math.min(s, min);
    })(radice);
    let ultimo = 0;
    (function su(n, minimo) {
      for (const f of n.figli) {
        const s = Math.max(passoDi.has(f) ? passoDi.get(f) : ultimo, minimo);
        passoDi.set(f, s);
        ultimo = s;
        su(f, s);
      }
    })(radice, 0);
    const mappa = (ids) => ids.map((id) => nostro.get(id)).filter(Boolean).map((d) => d.id);
    const passi = a.passi.map((ps) => ({
      token: ps.token, crea: [], chiude: mappa(ps.chiude), aggiorna: mappa(ps.aggiorna), ignorato: ps.ignorato,
      aperti: ps.aperti.slice(), apertiId: mappa(ps.apertiId),
    }));
    for (const n of nodi) if (n !== radice) passi[Math.min(passi.length - 1, passoDi.get(n) || 0)].crea.push(n.id);

    // Gli avvisi: i nostri, tranne quelli che il browser smentisce, più uno per ogni nodo che aggiunge lui.
    const primoToken = (n) => {
      let k = -1;
      (function giro(x) { for (const f of x.figli) { if (f.token >= 0 && (k < 0 || f.token < k)) k = f.token; giro(f); } })(n);
      return k;
    };
    const conti = new Map();
    for (const d of aggiunti) {
      const c = conti.get(d.nome) || { volte: 0, token: -1 };
      c.volte += 1;
      const k = primoToken(d);
      if (k >= 0 && (c.token < 0 || k < c.token)) c.token = k;
      conti.set(d.nome, c);
    }
    // smentiti: un </b> «ignorato» che in realtà chiude il <b> riaperto, e le correzioni che creano
    // un elemento che nel browser vero non c'è (per esempio il paragrafo vuoto di un </p> spaiato)
    const smentiti = new Set();
    O.forEach((o, j) => {
      if (usato[j] || o.tipo !== 'elemento' || !quando.has(o.id)) return;
      const t = a.passi[quando.get(o.id)].token;
      if (t >= 0) smentiti.add(t);
    });
    const avvisi = a.avvisi.filter((v) => {
      const g = v.token >= 0 ? a.token[v.token] : null;
      if (g && g.tipo === 'chiude' && FORMATO.has(g.nome) && conti.has(g.nome) && v.testo.indexOf('</' + g.nome + '> chiude qualcosa') >= 0) return false;
      return !(v.tipo === 'correzione' && v.token >= 0 && smentiti.has(v.token));
    });
    for (const [nome, c] of conti) {
      const volte = c.volte > 1 ? ' (' + c.volte + ' volte)' : '';
      const testo = FORMATO.has(nome)
        ? 'Il browser riapre <' + nome + '>' + volte + ', rimasto aperto: ne mette una copia attorno al testo che segue.'
        : nome === 'tbody'
          ? 'Il browser aggiunge <tbody>' + volte + ': in una tabella le righe stanno sempre dentro un corpo.'
          : 'Il browser aggiunge <' + nome + '>' + volte + ', che nel testo non c\'è.';
      avvisi.push({ riga: c.token >= 0 ? riga(a.testo, a.token[c.token].inizio) : null, testo: testo, tipo: 'correzione', token: c.token });
    }
    avvisi.sort((x, y) => (x.riga == null ? Infinity : x.riga) - (y.riga == null ? Infinity : y.riga));

    const html =radice.figli.find((n) => n.tipo === 'elemento' && n.nome === 'html') || null;
    const head = html ? html.figli.find((n) => n.nome === 'head') || null : null;
    const body = html ? html.figli.find((n) => n.nome === 'body' || n.nome === 'frameset') || null : null;
    const titolo = trova(radice, (x) => x.tipo === 'elemento' && x.nome === 'title');
    return Object.assign({}, a, {
      documento: radice, html: html, head: head, body: body, nodi: nodi, passi: passi, avvisi: avvisi,
      conteggio: m.conteggio, profondita: m.profondita, titolo: titolo ? collassa(testoDi(titolo)) : '',
      browser: true, diverso: aggiunti.length > 0 || pari.size < O.length,
    });
  }

  const NON_DISEGNATI = new Set(['head', 'title', 'meta', 'link', 'style', 'script', 'base', 'noscript', 'template']);
  function disegnabile(n) {
    if (n.tipo === 'testo') return !n.spazio;
    return n.tipo === 'elemento' && !NON_DISEGNATI.has(n.nome);
  }
  function idsVisibili(n) {
    const out = [n.id];
    for (const f of visibili(n)) out.push(...idsVisibili(f));
    return out;
  }

  // L'ordine del disegno: prima il titolo nella barra della finestra, poi i figli del corpo dall'alto in basso.
  function pianoDisegno(analisi) {
    const unita = [];
    const t = trova(analisi.documento, (x) => x.tipo === 'elemento' && x.nome === 'title');
    if (t) unita.push({ tipo: 'titolo', nodo: t.id, ids: idsVisibili(t) });
    if (analisi.body) {
      for (const f of analisi.body.figli) if (disegnabile(f)) unita.push({ tipo: 'blocco', nodo: f.id, ids: idsVisibili(f) });
    }
    return unita;
  }

  // Che cosa trova il programma della pagina quando parte.
  function ascolta(analisi) {
    return { tasto: perId(analisi.documento, 'tasto'), conta: perId(analisi.documento, 'conta') };
  }

  // Il gestore del clic, come `conta.firstChild.data = clic`: cambia il valore del nodo di testo, se c'è.
  function eseguiClic(analisi, n) {
    const conta = perId(analisi.documento, 'conta');
    if (!conta) return { ok: false, motivo: 'senza-conta', clic: n };
    const primo = conta.figli[0];
    if (!primo) return { ok: false, motivo: 'conta-vuoto', clic: n };
    if (primo.tipo !== 'testo') return { ok: false, motivo: 'conta-non-testo', clic: n };
    const prima = primo.testo;
    primo.testo = String(n);
    primo.spazio = false;
    return { ok: true, nodo: primo, elemento: conta, prima: prima, dopo: primo.testo, clic: n };
  }

  // Dove porterebbe un collegamento della pagina (non lo seguiamo mai davvero).
  function destinazione(href) {
    const h = String(href == null ? '' : href).trim();
    if (!h) return { tipo: 'vuoto' };
    if (h[0] === '#') return { tipo: 'ancora', ancora: h.slice(1) };
    const m = h.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):(?:\/\/([^/?#]*))?([^?#]*)/);
    if (m) {
      const schema = m[1].toLowerCase();
      if (schema !== 'http' && schema !== 'https') return { tipo: 'altro', schema: schema };
      return { tipo: 'web', schema: schema, host: m[2] || '', percorso: m[3] || '/' };
    }
    const p = h.split(/[?#]/)[0];
    return { tipo: 'web', schema: 'http', host: HOST, percorso: p[0] === '/' ? p : '/' + p, relativo: true };
  }

  // Aggiunge un frammento su una riga nuova prima di </body> (o in fondo): non spezza mai un marcatore.
  function inserisciFrammento(testo, frammento) {
    const t = String(testo == null ? '' : testo);
    const re = /<\/body\s*>/gi;
    let ultimo = -1;
    let m;
    while ((m = re.exec(t))) ultimo = m.index;
    const pos = ultimo >= 0 ? ultimo : t.length;
    const prima = t.slice(0, pos);
    const dopo = t.slice(pos);
    const pre = prima && !prima.endsWith('\n') ? '\n' : '';
    const post = dopo ? '\n' : '';
    const inizio = prima.length + pre.length;
    return { testo: prima + pre + frammento + post + dopo, inizio: inizio, fine: inizio + frammento.length };
  }

  const Logica = {
    HOST: HOST, PERCORSO: PERCORSO, INDIRIZZO: INDIRIZZO, LIMITI: LIMITI, ESEMPIO: ESEMPIO, PASSI: PASSI,
    PROGRAMMA: PROGRAMMA, RIGHE_PROGRAMMA: RIGHE_PROGRAMMA, FRAMMENTI: FRAMMENTI, MOTIVI: MOTIVI,
    byteUtf8: byteUtf8, riga: riga, collassa: collassa, abbrevia: abbrevia,
    richiesta: richiesta, risposta: risposta,
    decodifica: decodifica, tokenizza: tokenizza, costruisci: costruisci, analizza: analizza, valida: valida, daDom: daDom,
    righeAlbero: righeAlbero, trova: trova, perId: perId, testoDi: testoDi, descrivi: descrivi,
    disegnabile: disegnabile, pianoDisegno: pianoDisegno, ascolta: ascolta, eseguiClic: eseguiClic,
    destinazione: destinazione, inserisciFrammento: inserisciFrammento,
  };

  /* ======================= interfaccia ======================= */

  // Come il renderer disegna i marcatori: blocchi a capo, alcuni con il margine sotto; tutto il resto in riga.
  const BLOCCHI = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'div', 'blockquote', 'pre', 'hr', 'address', 'center',
    'dl', 'dt', 'dd', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'caption', 'form', 'fieldset', 'legend', 'section', 'article',
    'header', 'footer', 'nav', 'main', 'aside', 'figure', 'figcaption', 'details', 'summary', 'menu', 'dir', 'hgroup', 'listing', 'xmp', 'plaintext']);
  const CON_MARGINE = new Set(['p', 'ul', 'ol', 'dl', 'blockquote', 'pre', 'table', 'address', 'figure', 'form', 'fieldset', 'menu', 'dir', 'listing', 'xmp', 'details']);
  const SENZA_FIGLI = new Set(['br', 'hr', 'img', 'input', 'textarea', 'select', 'iframe', 'object', 'embed', 'video', 'audio', 'canvas', 'svg', 'math']);
  const NOMI_FRAMMENTI = { paragrafo: 'paragrafo', collegamento: 'collegamento', elenco: 'elenco' };

  const css = `
    .lab-pagina-web {
      --pw-muto: color-mix(in srgb, var(--lab-text) 74%, transparent);
      --pw-ramo: color-mix(in srgb, var(--lab-text) 40%, transparent);
      --pw-riga: 30px;
      --pw-carta: #fbfaf6;
      --pw-blu: #1d5fd0;
      --pw-nero: #050908;
      position: relative; container: lab-pagina-web / inline-size;
    }
    .lab-pagina-web [hidden] { display: none !important; }
    .lab-pagina-web-comandi .pg-btn[aria-disabled="true"] { opacity: .42; cursor: not-allowed; }
    .lab-pagina-web-gruppo { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .lab-pagina-web-gruppo > span:first-child { font-size: 13px; color: var(--lab-text); }
    .lab-pagina-web-avvia { min-width: 7.6em; }

    /* i cinque passi */
    .lab-pagina-web-passi-box { position: relative; padding: 10px 14px 10px; border-bottom: 1px solid var(--lab-line); }
    .lab-pagina-web-passi { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
    .lab-pagina-web-binario { position: absolute; top: 31px; left: calc(14px + (100% - 28px) / 10); right: calc(14px + (100% - 28px) / 10); height: 2px; background: var(--lab-line); pointer-events: none; }
    .lab-pagina-web-binario > span { position: absolute; inset: 0; background: var(--trace-1); transform-origin: 0 50%; transform: scaleX(0); transition: transform var(--pg-dur-lenta) var(--pg-ease-smooth); }
    .lab-pagina-web-passo { position: relative; z-index: 1; width: 100%; min-height: 44px; display: grid; justify-items: center; align-content: start; gap: 3px; padding: 4px 2px 4px; border: 0; border-radius: 10px; background: transparent; color: var(--lab-text); font: inherit; cursor: pointer; }
    .lab-pagina-web-passo .lab-pagina-web-num { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; border: 2px solid var(--lab-line); background: var(--lab-bg); font: 800 14px var(--mono); color: var(--lab-text); transition: background-color var(--pg-dur-veloce) ease, border-color var(--pg-dur-veloce) ease, color var(--pg-dur-veloce) ease; }
    .lab-pagina-web-passo .lab-pagina-web-nome { font: 700 13px/1.25 var(--font); color: var(--lab-bright); }
    .lab-pagina-web-passo .lab-pagina-web-breve { font: 600 13px/1.2 var(--mono); color: var(--pw-muto); }
    .lab-pagina-web-passo:hover .lab-pagina-web-num { border-color: var(--trace-1); color: #fff; }
    .lab-pagina-web-passo.is-fatto .lab-pagina-web-num { border-color: var(--trace-1); color: var(--trace-1); }
    .lab-pagina-web-passo[aria-current="step"] .lab-pagina-web-num { background: var(--trace-1); border-color: var(--trace-1); color: #04150d; box-shadow: 0 0 0 4px color-mix(in srgb, var(--trace-1) 22%, transparent); }
    .lab-pagina-web-passo[aria-current="step"] .lab-pagina-web-nome { color: var(--trace-1); }
    .lab-pagina-web-ora { display: none; margin: 0; padding: 0 14px 10px; border-bottom: 1px solid var(--lab-line); font: 700 13px var(--font); color: var(--lab-bright); text-align: center; }

    /* la scena: browser, rete, server */
    .lab-pagina-web-scena { display: grid; grid-template-columns: minmax(0, 1fr); padding: 16px 16px 14px; }
    .lab-pagina-web-finestra { min-width: 0; display: flex; flex-direction: column; background: #d6d2c9; color: #151515; border: 1px solid #050505; border-radius: 6px; overflow: hidden; box-shadow: 0 18px 34px -22px #000; }
    .lab-pagina-web-barra { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 9px; background: #202326; color: #f3f3f3; }
    .lab-pagina-web-barra i { flex: none; width: 13px; height: 13px; border: 1.5px solid #8e949a; border-radius: 2px; }
    .lab-pagina-web-titolo { flex: 1; min-width: 0; text-align: center; font: 600 13px/1.2 var(--font); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lab-pagina-web-titolo.is-vuoto { color: #aab1b7; font-weight: 500; }
    .lab-pagina-web-titolo.is-nuovo { animation: lab-pagina-web-giu var(--pg-dur-lenta) var(--pg-ease-smooth); }
    .lab-pagina-web-indirizzo { display: flex; align-items: center; gap: 8px; padding: 6px 9px; background: #cbc7be; border-bottom: 1px solid #8d897f; font: 13px var(--font); color: #2a2a2a; }
    .lab-pagina-web-url { flex: 1; min-width: 0; padding: 3px 8px; background: #fff; border: 1px solid #77736a; box-shadow: inset 1px 1px 0 #a39f95; font: 13px var(--mono); color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lab-pagina-web-vista { position: relative; height: 210px; overflow: auto; background: var(--pw-carta); scrollbar-width: thin; }
    .lab-pagina-web-vuota { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; padding: 18px; text-align: center; font: italic 15px/1.45 Georgia, "Times New Roman", serif; color: #625d54; }
    .lab-pagina-web-stato { min-height: 28px; display: flex; align-items: center; padding: 0 10px; background: #cbc7be; border-top: 1px solid #8d897f; font: 13px var(--font); color: #2a2a2a; }
    .lab-pagina-web-stato span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* la pagina disegnata dal nostro renderer: solo elementi noti, testo semplice */
    .lab-pagina-web-pagina { position: relative; min-height: 100%; padding: 16px 16px 14px; font: 15px/1.5 Georgia, "Times New Roman", serif; color: #161616; overflow-wrap: anywhere; }
    .lab-pagina-web-pagina [data-n] { position: relative; }
    .lab-pagina-web-blocco { display: block; }
    .lab-pagina-web-m { margin: 0 0 .7em; }
    .lab-pagina-web-x-h1 { font-size: 1.6em; font-weight: 700; line-height: 1.2; margin: 0 0 .4em; }
    .lab-pagina-web-x-h2 { font-size: 1.32em; font-weight: 700; line-height: 1.25; margin: .2em 0 .4em; }
    .lab-pagina-web-x-h3 { font-size: 1.15em; font-weight: 700; margin: .2em 0 .35em; }
    .lab-pagina-web-x-h4, .lab-pagina-web-x-h5, .lab-pagina-web-x-h6 { font-weight: 700; margin: .2em 0 .3em; }
    .lab-pagina-web-x-ul, .lab-pagina-web-x-ol, .lab-pagina-web-x-menu, .lab-pagina-web-x-dir { padding-left: 1.5em; }
    .lab-pagina-web-x-li { display: list-item; list-style: disc; }
    .lab-pagina-web-x-ol > .lab-pagina-web-x-li { list-style: decimal; }
    .lab-pagina-web-x-dt { font-weight: 700; }
    .lab-pagina-web-x-dd { margin-left: 1.5em; }
    .lab-pagina-web-x-blockquote { margin-left: 1.2em; padding-left: .8em; border-left: 3px solid #cfcabf; color: #333; }
    .lab-pagina-web-x-pre, .lab-pagina-web-x-listing, .lab-pagina-web-x-xmp { white-space: pre; overflow-x: auto; overflow-wrap: normal; font: 13px/1.45 var(--mono); }
    .lab-pagina-web-x-center { text-align: center; }
    .lab-pagina-web-x-address { font-style: italic; }
    .lab-pagina-web-x-hr { height: 0; border-top: 2px groove #c9c4b9; margin: .6em 0; }
    .lab-pagina-web-x-a { color: var(--pw-blu); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; border-radius: 2px; }
    .lab-pagina-web-x-a:hover { color: #0a3a96; }
    .lab-pagina-web-pagina :focus-visible { outline: 3px solid var(--pw-blu) !important; outline-offset: 2px; }
    .lab-pagina-web-x-b, .lab-pagina-web-x-strong { font-weight: 700; }
    .lab-pagina-web-x-i, .lab-pagina-web-x-em, .lab-pagina-web-x-cite, .lab-pagina-web-x-var { font-style: italic; }
    .lab-pagina-web-x-u, .lab-pagina-web-x-ins { text-decoration: underline; }
    .lab-pagina-web-x-s, .lab-pagina-web-x-strike, .lab-pagina-web-x-del { text-decoration: line-through; }
    .lab-pagina-web-x-code, .lab-pagina-web-x-tt, .lab-pagina-web-x-kbd, .lab-pagina-web-x-samp { font: .9em var(--mono); }
    .lab-pagina-web-x-small { font-size: .87em; }
    .lab-pagina-web-x-big { font-size: 1.15em; }
    .lab-pagina-web-x-sub { vertical-align: sub; font-size: .8em; }
    .lab-pagina-web-x-sup { vertical-align: super; font-size: .8em; }
    .lab-pagina-web-x-mark { background: #fff1a6; }
    .lab-pagina-web-x-button { display: inline-flex; align-items: center; min-height: 40px; margin: 0 0 .7em; padding: 4px 16px; font: 600 14px var(--font); color: #111; background: linear-gradient(#f3f1eb, #d9d5cc); border: 1px solid #6d695f; border-radius: 4px; box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #a7a296, 0 1px 0 rgba(0, 0, 0, .15); cursor: pointer; }
    .lab-pagina-web-x-button:hover { background: linear-gradient(#f8f6f1, #e3dfd7); }
    .lab-pagina-web-x-button:active, .lab-pagina-web-x-button.is-premuto { background: #cfcac0; box-shadow: inset 1px 1px 3px #8f8a7f; transform: translateY(1px); }
    .lab-pagina-web-x-button.is-invito { animation: lab-pagina-web-invito 1.4s var(--pg-ease-smooth) 3; }
    .lab-pagina-web-x-img { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 4px 10px; border: 1.5px dashed #8d897f; background: #f1eee7; color: #514d45; font: 13px var(--font); vertical-align: middle; }
    .lab-pagina-web-x-img::before { content: ""; flex: none; width: 18px; height: 14px; border: 1.5px solid currentColor; border-radius: 2px; background: linear-gradient(135deg, transparent 52%, currentColor 52% 60%, transparent 60%); }
    .lab-pagina-web-x-input, .lab-pagina-web-x-textarea, .lab-pagina-web-x-select { display: inline-block; min-width: 9em; min-height: 30px; padding: 3px 7px; background: #fff; border: 1px solid #77736a; box-shadow: inset 1px 1px 0 #a39f95; font: 13px var(--font); vertical-align: middle; }
    .lab-pagina-web-x-table { display: table; border-collapse: collapse; }
    .lab-pagina-web-x-tr { display: table-row; }
    .lab-pagina-web-x-td, .lab-pagina-web-x-th { display: table-cell; padding: 3px 8px; border: 1px solid #c3beb3; }
    .lab-pagina-web-x-th { font-weight: 700; }
    .lab-pagina-web-x-thead { display: table-header-group; }
    .lab-pagina-web-x-tbody { display: table-row-group; }
    .lab-pagina-web-x-tfoot { display: table-footer-group; }
    .lab-pagina-web-x-caption { display: table-caption; font-style: italic; }
    .lab-pagina-web-pagina .is-indicato { outline: 2px solid var(--pw-blu); outline-offset: 2px; background-color: rgba(29, 95, 208, .1); border-radius: 2px; }
    .lab-pagina-web-pagina .is-cambiato::after { content: ""; position: absolute; inset: -3px -5px; border-radius: 4px; background: var(--trace-4); opacity: 0; pointer-events: none; animation: lab-pagina-web-lampo 1.1s ease-out; }
    .lab-pagina-web-scatola { position: absolute; z-index: 2; pointer-events: none; border: 2px dashed var(--pw-blu); background: rgba(29, 95, 208, .08); border-radius: 3px; transform-origin: 50% 0; opacity: 0; }
    .lab-pagina-web-scatola > span { position: absolute; left: 6px; top: -11px; padding: 0 6px; background: var(--pw-blu); color: #fff; font: 700 13px/18px var(--mono); border-radius: 4px; }

    /* la rete */
    .lab-pagina-web-rete { min-width: 0; display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 0 10px; }
    .lab-pagina-web-filo { position: relative; min-height: 120px; }
    .lab-pagina-web-filo::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; border-left: 3px dotted color-mix(in srgb, var(--lab-text) 50%, transparent); transform: translateX(-50%); }
    .lab-pagina-web-filo.is-aperto::before { border-left-style: solid; border-left-color: var(--trace-1); }
    .lab-pagina-web-presa { position: absolute; left: 50%; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: var(--lab-bg); border: 2px solid color-mix(in srgb, var(--lab-text) 60%, transparent); }
    .lab-pagina-web-presa.is-a { top: -6px; }
    .lab-pagina-web-presa.is-b { bottom: -6px; }
    .lab-pagina-web-filo.is-aperto .lab-pagina-web-presa { border-color: var(--trace-1); }
    .lab-pagina-web-pacchetto { position: absolute; left: 50%; top: 0; z-index: 2; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 7px; background: var(--trace-1); color: #04150d; font: 800 13px/18px var(--mono); white-space: nowrap; box-shadow: 0 0 0 4px color-mix(in srgb, var(--trace-1) 25%, transparent), 0 8px 16px -8px #000; opacity: 0; transform: translate(-50%, 0); will-change: transform, opacity; pointer-events: none; }
    .lab-pagina-web-pacchetto::before { content: ""; flex: none; width: 13px; height: 9px; border: 1.5px solid #04150d; border-radius: 1px; background: linear-gradient(160deg, transparent 44%, #04150d 46% 54%, transparent 56%), linear-gradient(20deg, transparent 44%, #04150d 46% 54%, transparent 56%); }
    .lab-pagina-web-registro { min-width: 0; min-height: 196px; display: grid; align-content: center; gap: 7px; padding: 12px 0; }
    .lab-pagina-web-registro-titolo { margin: 0; font: 800 13px var(--font); letter-spacing: .1em; text-transform: uppercase; color: var(--pw-muto); }
    .lab-pagina-web-registro-vuoto { margin: 0; font-size: 13px; color: var(--pw-muto); }
    .lab-pagina-web-msg { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 0 6px; margin: 0; padding: 6px 9px; border-radius: 8px; background: var(--lab-panel); border: 1px solid var(--lab-line); font: 13px/1.45 var(--mono); }
    .lab-pagina-web-msg > b { color: var(--trace-1); font-weight: 800; }
    .lab-pagina-web-msg > b .lab-pagina-web-w { display: none; }
    .lab-pagina-web-msg > div { min-width: 0; overflow-wrap: anywhere; }
    .lab-pagina-web-msg .lab-pagina-web-l { display: block; color: var(--lab-bright); }
    .lab-pagina-web-msg .lab-pagina-web-l.is-h { color: var(--lab-text); }
    .lab-pagina-web-msg .lab-pagina-web-l.is-h span { color: var(--lab-bright); }
    .lab-pagina-web-msg .lab-pagina-web-ok { color: var(--trace-1); font-weight: 800; }
    .lab-pagina-web-msg .lab-pagina-web-nota { display: block; font: 13px/1.4 var(--font); color: var(--pw-muto); }
    .lab-pagina-web-msg.is-nuovo, .lab-pagina-web-msg.is-nuovo .lab-pagina-web-l, .lab-pagina-web-msg.is-nuovo .lab-pagina-web-nota { animation: lab-pagina-web-entra var(--pg-dur-normale) var(--pg-ease-smooth) both; animation-delay: calc(var(--i, 0) * 150ms); }

    /* il server */
    .lab-pagina-web-server { min-width: 0; display: grid; align-content: start; gap: 10px; padding: 12px 14px 14px; background: linear-gradient(180deg, #1a2420, #111916); border: 1px solid var(--lab-line); border-radius: 10px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05), 0 16px 30px -24px #000; }
    .lab-pagina-web-server-testa { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
    .lab-pagina-web-server-testa strong { font: 800 13px var(--font); letter-spacing: .12em; text-transform: uppercase; color: var(--lab-bright); }
    .lab-pagina-web-server-testa > span:not(.lab-pagina-web-luci) { font: 13px var(--mono); color: var(--lab-text); }
    .lab-pagina-web-luci { display: inline-flex; gap: 6px; margin-left: auto; }
    .lab-pagina-web-led { display: block; width: 9px; height: 9px; border-radius: 50%; background: #2a3833; }
    .lab-pagina-web-led.is-acceso { background: var(--trace-1); box-shadow: 0 0 7px var(--trace-1); }
    .lab-pagina-web-led.is-lavora { animation: lab-pagina-web-led 160ms steps(1) 8; }
    .lab-pagina-web-feritoie { height: 8px; border-radius: 2px; background: repeating-linear-gradient(90deg, #26332e 0 16px, transparent 16px 20px); }
    .lab-pagina-web-file { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 10px; border-radius: 8px; background: var(--pw-nero); border: 1px solid var(--lab-line); font: 13px var(--mono); color: var(--lab-bright); transition: border-color var(--pg-dur-normale) ease, box-shadow var(--pg-dur-normale) ease; }
    .lab-pagina-web-file::before { content: ""; flex: none; width: 12px; height: 15px; background: var(--lab-text); clip-path: polygon(0 0, 66% 0, 100% 30%, 100% 100%, 0 100%); opacity: .85; }
    .lab-pagina-web-file .lab-pagina-web-peso { margin-left: auto; color: var(--pw-muto); white-space: nowrap; }
    .lab-pagina-web-file.is-scelto { border-color: var(--trace-1); box-shadow: inset 0 0 0 1px var(--trace-1); }
    .lab-pagina-web-server p { margin: 0; font-size: 13px; line-height: 1.4; color: var(--pw-muto); }

    /* il banco: codice, albero, programma */
    .lab-pagina-web-banco { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 0 16px 16px; }
    .lab-pagina-web-pannello { position: relative; min-width: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--lab-panel); border: 1px solid var(--lab-line); border-radius: 12px; }
    .lab-pagina-web-testa { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-height: 54px; padding: 6px 8px 6px 14px; border-bottom: 1px solid var(--lab-line); }
    .lab-pagina-web-testa h4 { margin: 0; font: 700 14px var(--font); color: var(--lab-bright); }
    .lab-pagina-web-etichetta { font: 700 13px/1 var(--mono); padding: 5px 9px; border-radius: 999px; border: 1px solid var(--lab-line); color: var(--pw-muto); white-space: nowrap; }
    .lab-pagina-web-etichetta.is-browser { color: var(--trace-3); border-color: color-mix(in srgb, var(--trace-3) 45%, transparent); }
    .lab-pagina-web-etichetta.is-js { color: var(--trace-4); border-color: color-mix(in srgb, var(--trace-4) 45%, transparent); }
    .lab-pagina-web-piccolo { padding: 0 12px; font-size: 13px; }

    .lab-pagina-web-codice-wrap { position: relative; overflow: hidden; }
    .lab-pagina-web-codice-box { display: flex; max-height: 272px; overflow: auto; background: var(--pw-nero); scrollbar-width: thin; }
    .lab-pagina-web-gutter { position: sticky; left: 0; z-index: 1; flex: none; margin: 0; padding: 10px 8px 10px 10px; min-width: 34px; text-align: right; background: var(--pw-nero); border-right: 1px solid var(--lab-line); color: var(--pw-muto); font: 13px/20px var(--mono); white-space: pre; user-select: none; }
    .lab-pagina-web-codice { flex: 1 0 auto; margin: 0; padding: 10px 14px 10px 12px; font: 13px/20px var(--mono); color: var(--lab-bright); white-space: pre; transition: opacity var(--pg-dur-narrativa) linear; }
    .lab-pagina-web-codice-wrap.is-lontano .lab-pagina-web-codice { opacity: .7; }
    .lab-pagina-web-banda { position: absolute; left: 0; right: 0; top: 0; height: 46px; pointer-events: none; opacity: 0; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--trace-1) 16%, transparent) 70%, color-mix(in srgb, var(--trace-1) 34%, transparent)); border-bottom: 2px solid var(--trace-1); will-change: transform, opacity; }
    .lab-pagina-web-tk { border-radius: 3px; transition: opacity var(--pg-dur-veloce) ease, background-color var(--pg-dur-veloce) ease; }
    .lab-pagina-web-k-p { color: color-mix(in srgb, var(--trace-3) 62%, var(--lab-text)); }
    .lab-pagina-web-k-n { color: var(--trace-3); font-weight: 700; }
    .lab-pagina-web-k-a { color: var(--trace-2); }
    .lab-pagina-web-k-v { color: #ffd98a; }
    .lab-pagina-web-k-c { color: var(--pw-muto); font-style: italic; }
    .lab-pagina-web-k-r { text-decoration: underline wavy var(--trace-2); text-underline-offset: 3px; }
    .lab-pagina-web-codice.is-scansione .lab-pagina-web-tk { opacity: .32; }
    .lab-pagina-web-codice.is-scansione .lab-pagina-web-tk.is-letto { opacity: 1; }
    .lab-pagina-web-tk.is-ora { opacity: 1 !important; background: color-mix(in srgb, var(--trace-3) 26%, transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--trace-3) 60%, transparent); }
    .lab-pagina-web-tk.is-ignorato { text-decoration: underline wavy var(--trace-2); text-underline-offset: 3px; }
    .lab-pagina-web-tk.is-indicato { background: color-mix(in srgb, var(--trace-3) 24%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--trace-3) 55%, transparent); }

    .lab-pagina-web-editor { display: grid; gap: 10px; padding: 12px; }
    .lab-pagina-web-editor label { font-size: 13px; color: var(--lab-text); }
    .lab-pagina-web-area { display: block; width: 100%; min-height: 252px; font: 500 13px/20px var(--mono); background: var(--pw-nero); }
    .lab-pagina-web-area[aria-invalid="true"] { border-color: #ff8a7a; }
    .lab-pagina-web-rapidi, .lab-pagina-web-azioni { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .lab-pagina-web-rapidi > span { font-size: 13px; color: var(--pw-muto); }
    .lab-pagina-web-contatore { margin-left: auto; font: 600 13px var(--mono); color: var(--pw-muto); }
    .lab-pagina-web-contatore.is-quasi { color: var(--trace-2); }
    .lab-pagina-web-contatore.is-oltre { color: #ffb4a8; }
    .lab-pagina-web-errore { margin: 0; padding: 10px 12px; border-radius: 8px; background: rgba(255, 120, 100, .1); border: 1px solid rgba(255, 138, 122, .5); color: #ffc9c0; font-size: 14px; line-height: 1.5; }
    .lab-pagina-web-avvisi { list-style: none; margin: 0; padding: 10px 12px 12px; display: grid; gap: 7px; border-top: 1px solid var(--lab-line); }
    .lab-pagina-web-avvisi li { position: relative; padding-left: 24px; font-size: 13px; line-height: 1.45; color: #ffe2a8; }
    .lab-pagina-web-avvisi li::before { content: "!"; position: absolute; left: 0; top: 0; width: 17px; height: 17px; border-radius: 50%; background: var(--trace-2); color: #221500; font: 800 13px/17px var(--font); text-align: center; }
    .lab-pagina-web-avvisi li.is-script { color: #c8ecff; }
    .lab-pagina-web-avvisi li.is-script::before { content: "i"; background: var(--trace-3); color: #04121b; }

    .lab-pagina-web-albero-scroll { position: relative; flex: 1 1 auto; min-height: 220px; max-height: 460px; overflow: auto; padding: 10px 10px 12px 12px; scrollbar-width: thin; }
    .lab-pagina-web-albero-vuoto { margin: 0; padding: 30px 12px; text-align: center; font-size: 14px; line-height: 1.5; color: var(--pw-muto); }
    .lab-pagina-web-albero, .lab-pagina-web-albero ul { list-style: none; margin: 0; padding: 0; }
    .lab-pagina-web-albero ul { padding-left: 15px; }
    .lab-pagina-web-albero li { position: relative; }
    .lab-pagina-web-albero li:focus { outline: none; }
    .lab-pagina-web-albero ul > li { padding-left: 14px; }
    .lab-pagina-web-albero ul > li::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; border-left: 1.5px solid var(--pw-ramo); }
    .lab-pagina-web-albero ul > li:last-child::before { bottom: auto; height: calc(var(--pw-riga) / 2); }
    .lab-pagina-web-albero ul > li::after { content: ""; position: absolute; left: 0; top: calc(var(--pw-riga) / 2); width: 11px; border-top: 1.5px solid var(--pw-ramo); }
    .lab-pagina-web-riga { display: flex; align-items: center; gap: 8px; min-height: var(--pw-riga); }
    .lab-pagina-web-chip { position: relative; display: inline-block; max-width: 100%; padding: 2px 8px; border-radius: 7px; border: 1px solid transparent; font: 13px/1.4 var(--mono); white-space: nowrap; cursor: default; }
    .lab-pagina-web-chip::after { content: ""; position: absolute; inset: -2px; border-radius: 9px; opacity: 0; pointer-events: none; }
    .lab-pagina-web-chip .lab-pagina-web-p, .lab-pagina-web-chip .lab-pagina-web-q { color: var(--pw-muto); }
    .lab-pagina-web-chip .lab-pagina-web-n { font-weight: 700; }
    .lab-pagina-web-chip .lab-pagina-web-a { color: var(--trace-2); }
    .lab-pagina-web-chip .lab-pagina-web-v { color: #ffd98a; }
    .lab-pagina-web-chip .lab-pagina-web-t { display: inline-block; }
    .is-elemento > .lab-pagina-web-riga .lab-pagina-web-chip { color: var(--trace-3); background: color-mix(in srgb, var(--trace-3) 11%, transparent); border-color: color-mix(in srgb, var(--trace-3) 32%, transparent); }
    .is-testo > .lab-pagina-web-riga .lab-pagina-web-chip { color: var(--lab-bright); background: rgba(255, 255, 255, .045); border-color: rgba(255, 255, 255, .13); }
    .is-commento > .lab-pagina-web-riga .lab-pagina-web-chip, .is-doctype > .lab-pagina-web-riga .lab-pagina-web-chip { color: var(--pw-muto); font-style: italic; border-color: var(--lab-line); }
    .is-documento > .lab-pagina-web-riga .lab-pagina-web-chip { color: var(--lab-bright); font-family: var(--font); font-weight: 700; border-color: var(--lab-line); }
    .is-implicito > .lab-pagina-web-riga .lab-pagina-web-chip { border-style: dashed; border-color: color-mix(in srgb, var(--trace-3) 70%, transparent); background: transparent; }
    .lab-pagina-web-agg { font: 13px var(--font); color: var(--pw-muto); white-space: nowrap; }
    .lab-pagina-web-nodo.is-nuovo > .lab-pagina-web-riga { animation: lab-pagina-web-nasce var(--pg-dur-normale) var(--pg-ease-smooth) both; }
    .lab-pagina-web-nodo.is-corrente > .lab-pagina-web-riga .lab-pagina-web-chip { box-shadow: 0 0 0 2px color-mix(in srgb, var(--lab-bright) 45%, transparent); }
    .lab-pagina-web-nodo.is-indicato > .lab-pagina-web-riga .lab-pagina-web-chip { box-shadow: 0 0 0 2px var(--trace-3); }
    .lab-pagina-web-nodo:focus-visible > .lab-pagina-web-riga .lab-pagina-web-chip { outline: 3px solid var(--trace-1); outline-offset: 2px; }
    .lab-pagina-web-nodo.is-disegna > .lab-pagina-web-riga .lab-pagina-web-chip::after { background: var(--trace-3); animation: lab-pagina-web-lampo 800ms ease-out; }
    .lab-pagina-web-nodo.is-cambia > .lab-pagina-web-riga .lab-pagina-web-chip::after { background: var(--trace-4); animation: lab-pagina-web-lampo 1.1s ease-out; }
    .lab-pagina-web-nodo.is-cambia > .lab-pagina-web-riga .lab-pagina-web-chip .lab-pagina-web-t { animation: lab-pagina-web-tic var(--pg-dur-normale) var(--pg-ease-smooth); }
    .lab-pagina-web-lettura { min-height: 40px; margin: 0; padding: 9px 12px; border-top: 1px solid var(--lab-line); font-size: 13px; line-height: 1.45; color: var(--pw-muto); }
    .lab-pagina-web-lettura .lab-pagina-web-n { font: 700 13px var(--mono); color: var(--trace-3); }
    .lab-pagina-web-lettura .lab-pagina-web-t { font: 13px var(--mono); color: var(--lab-bright); }
    .lab-pagina-web-legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 8px 12px 10px; border-top: 1px solid var(--lab-line); font-size: 13px; color: var(--pw-muto); }
    .lab-pagina-web-legenda span::before { content: ""; display: inline-block; width: 11px; height: 11px; margin-right: 6px; border-radius: 3px; vertical-align: -1px; }
    .lab-pagina-web-legenda .lab-pagina-web-l-el::before { background: var(--trace-3); }
    .lab-pagina-web-legenda .lab-pagina-web-l-te::before { background: var(--lab-bright); }
    .lab-pagina-web-legenda .lab-pagina-web-l-at::before { background: var(--trace-2); }
    .lab-pagina-web-legenda .lab-pagina-web-l-im::before { border: 1.5px dashed var(--trace-3); }

    .lab-pagina-web-js::after { content: ""; position: absolute; inset: 0; border-radius: 12px; box-shadow: inset 0 0 0 2px var(--trace-4); opacity: 0; pointer-events: none; }
    .lab-pagina-web-js.is-arriva::after { animation: lab-pagina-web-lampo 1.3s ease-out; }
    .lab-pagina-web-programma { list-style: none; margin: 0; padding: 8px 0; overflow-x: auto; background: var(--pw-nero); font: 13px/22px var(--mono); counter-reset: lab-pagina-web-r; scrollbar-width: thin; }
    .lab-pagina-web-programma li { position: relative; min-height: 22px; padding: 0 14px 0 42px; white-space: pre; color: var(--pw-muto); counter-increment: lab-pagina-web-r; transition: background-color var(--pg-dur-veloce) ease; }
    .lab-pagina-web-programma li::before { content: counter(lab-pagina-web-r); position: absolute; left: 0; width: 30px; text-align: right; color: var(--pw-muto); }
    .lab-pagina-web-js.is-attivo .lab-pagina-web-programma li { color: var(--lab-bright); }
    .lab-pagina-web-js.is-attivo .lab-pagina-web-j-k { font-weight: 700; }
    .lab-pagina-web-js.is-attivo .lab-pagina-web-j-s { color: #ffd98a; }
    .lab-pagina-web-js.is-attivo .lab-pagina-web-j-d { color: var(--trace-3); }
    .lab-pagina-web-js.is-attivo .lab-pagina-web-j-e { color: var(--trace-4); font-weight: 700; }
    .lab-pagina-web-programma li.is-ora { background: color-mix(in srgb, var(--trace-4) 22%, transparent); box-shadow: inset 3px 0 0 var(--trace-4); }
    .lab-pagina-web-js-lettura { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; margin: 0; padding: 9px 12px; border-top: 1px solid var(--lab-line); font-size: 13px; color: var(--pw-muto); }
    .lab-pagina-web-js-lettura .lab-pagina-web-m { font: 13px var(--mono); color: var(--lab-bright); }
    .lab-pagina-web-js-lettura b { display: inline-block; min-width: 1.2em; font: 800 14px var(--mono); color: var(--trace-4); }
    .lab-pagina-web-js-lettura b.is-cambia { animation: lab-pagina-web-tic var(--pg-dur-normale) var(--pg-ease-smooth); }

    .lab-pagina-web-spiega { min-height: 6.6em; }
    .lab-pagina-web-volo { position: absolute; inset: 0; z-index: 5; overflow: hidden; pointer-events: none; }
    .lab-pagina-web-evento { position: absolute; left: 0; top: 0; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 6px; border-radius: 999px; background: var(--trace-4); color: #2b0716; font: 800 13px/18px var(--mono); white-space: nowrap; box-shadow: 0 0 0 4px color-mix(in srgb, var(--trace-4) 28%, transparent), 0 8px 18px -8px #000; opacity: 0; will-change: transform, opacity; }
    .lab-pagina-web-evento::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: #2b0716; }

    @keyframes lab-pagina-web-entra { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes lab-pagina-web-giu { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    @keyframes lab-pagina-web-nasce { from { opacity: 0; transform: translateX(-10px) scale(.92); } to { opacity: 1; transform: none; } }
    @keyframes lab-pagina-web-lampo { from { opacity: .6; } to { opacity: 0; } }
    @keyframes lab-pagina-web-tic { from { opacity: .15; transform: translateY(-65%); } to { opacity: 1; transform: none; } }
    @keyframes lab-pagina-web-led { 0% { background: var(--trace-2); box-shadow: 0 0 7px var(--trace-2); } 50% { background: #2a3833; box-shadow: none; } }
    @keyframes lab-pagina-web-invito { 0%, 100% { transform: none; } 45% { transform: translateY(-3px); } 60% { transform: translateY(0); } }

    @container lab-pagina-web (min-width: 720px) {
      .lab-pagina-web-scena { grid-template-columns: minmax(0, 1.55fr) minmax(190px, .95fr) minmax(0, .9fr); align-items: start; padding: 18px 18px 16px; }
      .lab-pagina-web-rete { grid-template-columns: minmax(0, 1fr); gap: 10px; padding-top: 46px; }
      .lab-pagina-web-filo { min-height: 56px; }
      .lab-pagina-web-filo::before { left: 0; right: 0; top: 50%; bottom: auto; border-left: 0; border-top: 3px dotted color-mix(in srgb, var(--lab-text) 50%, transparent); transform: translateY(-50%); }
      .lab-pagina-web-filo.is-aperto::before { border-top-style: solid; border-top-color: var(--trace-1); }
      .lab-pagina-web-presa { top: 50%; left: auto; margin: -6px 0 0; }
      .lab-pagina-web-presa.is-a { left: -6px; top: 50%; }
      .lab-pagina-web-presa.is-b { right: -6px; top: 50%; bottom: auto; }
      .lab-pagina-web-pacchetto { left: 0; top: 50%; transform: translate(0, -50%); }
      .lab-pagina-web-registro { min-height: 0; align-content: start; padding: 0 12px; }
      .lab-pagina-web-msg > b .lab-pagina-web-w { display: inline; }
      .lab-pagina-web-msg > b .lab-pagina-web-n { display: none; }
      .lab-pagina-web-server { margin-top: 18px; }
      .lab-pagina-web-vista { height: 220px; }
    }
    @container lab-pagina-web (min-width: 760px) {
      .lab-pagina-web-banco { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); grid-template-areas: "sorgente albero" "js albero"; align-items: stretch; }
      .lab-pagina-web-sorgente { grid-area: sorgente; }
      .lab-pagina-web-albero-box { grid-area: albero; }
      .lab-pagina-web-js { grid-area: js; }
      .lab-pagina-web-albero-scroll { max-height: none; }
      .lab-pagina-web-codice-wrap { flex: 1 1 auto; display: flex; flex-direction: column; }
      .lab-pagina-web-codice-box { flex: 1 1 auto; max-height: 420px; }
      .lab-pagina-web-programma { flex: 1 1 auto; }
    }
    @container lab-pagina-web (max-width: 520px) {
      .lab-pagina-web-passo .lab-pagina-web-nome { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .lab-pagina-web-passo .lab-pagina-web-breve { display: none; }
      .lab-pagina-web-passi-box { border-bottom: 0; padding-bottom: 6px; }
      .lab-pagina-web-ora { display: block; }
      .lab-pagina-web-gutter { display: none; }
      .lab-pagina-web-codice { flex: 1 1 auto; min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
      .lab-pagina-web-programma li { white-space: pre-wrap; overflow-wrap: anywhere; }
      .lab-pagina-web-scena { padding: 12px 12px 10px; }
      .lab-pagina-web-banco { padding: 0 12px 12px; gap: 10px; }
    }
    @media (pointer: coarse) {
      .lab-pagina-web { --pw-riga: 40px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-pagina-web-binario > span, .lab-pagina-web-passo .lab-pagina-web-num, .lab-pagina-web-codice, .lab-pagina-web-tk, .lab-pagina-web-file, .lab-pagina-web-programma li { transition: none; }
      .lab-pagina-web-titolo.is-nuovo, .lab-pagina-web-msg.is-nuovo, .lab-pagina-web-msg.is-nuovo .lab-pagina-web-l, .lab-pagina-web-msg.is-nuovo .lab-pagina-web-nota,
      .lab-pagina-web-nodo.is-nuovo > .lab-pagina-web-riga, .lab-pagina-web-nodo.is-cambia > .lab-pagina-web-riga .lab-pagina-web-chip .lab-pagina-web-t,
      .lab-pagina-web-js-lettura b.is-cambia, .lab-pagina-web-led.is-lavora, .lab-pagina-web-x-button.is-invito { animation: none; }
      .lab-pagina-web-nodo.is-disegna > .lab-pagina-web-riga .lab-pagina-web-chip::after, .lab-pagina-web-nodo.is-cambia > .lab-pagina-web-riga .lab-pagina-web-chip::after,
      .lab-pagina-web-pagina .is-cambiato::after, .lab-pagina-web-js.is-arriva::after { animation: none; }
      .lab-pagina-web-nodo.is-cambia > .lab-pagina-web-riga .lab-pagina-web-chip { box-shadow: 0 0 0 2px var(--trace-4); }
      .lab-pagina-web-pagina .is-cambiato { box-shadow: 0 0 0 2px var(--trace-4); border-radius: 2px; }
    }
  `;

  function monta(el, ctx) {
    const { h } = ctx;
    const D = ctx.DURATA;
    const R = RIGHE_PROGRAMMA;
    const FERMO = { annullato: true };
    const stato = {
      passo: 0, animando: false, inCorsa: false, epoca: 0, protocollo: '1.0', testo: ESEMPIO, analisi: null,
      clic: 0, visto5: false, completato: false, modifica: false, indicato: null, focoAlbero: null,
    };
    let spanToken = [];
    let nodoDiToken = new Map();
    const mappaAlbero = new Map();
    const mappaPagina = new Map();
    let unitaPagina = new Map();
    let barraFissa = '';

    /* ---------- piccoli aiuti ---------- */

    const vivo = (ep) => ep === stato.epoca;
    async function aspetta(ms, ep) { await ctx.attendi(ms); if (!vivo(ep)) throw FERMO; }
    async function muovi(opz, ep) { await ctx.anima(opz); if (!vivo(ep)) throw FERMO; }
    function interrompi() { stato.epoca += 1; ctx.annulla(); stato.animando = false; }
    function silenzia(err) { if (!ctx.annullato(err)) throw err; }
    function riavvia(nodo, classe) {
      if (!nodo) return;
      nodo.classList.remove(classe);
      void nodo.offsetWidth; // riparte l'animazione CSS
      nodo.classList.add(classe);
    }
    const simbolo = (s, t) => [h('span', { 'aria-hidden': 'true' }, s), ' ' + t];
    function etichetta(btn, s, t) {
      if (btn.dataset.et === s + t) return;
      btn.dataset.et = s + t;
      btn.replaceChildren(...simbolo(s, t));
    }
    function inattivo(btn, si) { if (si) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled'); }
    // Le frasi fisse usano il mini-markup; quelle con parti scritte dal lettore arrivano già come nodi.
    function narra(...parti) {
      spiega.replaceChildren(...parti.filter(Boolean).map((p) => h('p', null, typeof p === 'string' ? ctx.inline(p) : p)));
    }
    const codiceH = (t) => h('code', null, t);
    function scorriDentro(box, x) {
      if (!box || !x) return;
      const b = box.getBoundingClientRect();
      const r = x.getBoundingClientRect();
      if (r.top < b.top + 4) box.scrollTop -= b.top - r.top + 12;
      else if (r.bottom > b.bottom - 4) box.scrollTop += r.bottom - b.bottom + 12;
    }

    /* ---------- barra dei comandi ---------- */

    const btnAvvia = h('button', { type: 'button', class: 'pg-btn pg-btn--primario lab-pagina-web-avvia', onclick: () => avvia() });
    const btnIndietro = h('button', { type: 'button', class: 'pg-btn', onclick: () => indietro() }, simbolo('‹', 'Indietro'));
    const btnAvanti = h('button', { type: 'button', class: 'pg-btn', onclick: () => avanti() }, simbolo('', 'Avanti ›'));
    btnAvanti.replaceChildren('Avanti ', h('span', { 'aria-hidden': 'true' }, '›'));
    const btnDaCapo = h('button', { type: 'button', class: 'pg-btn', onclick: () => daCapo() }, simbolo('↺', 'Da capo'));
    const idProt = ctx.uid('lab-pagina-web-prot');
    const btnProt = [['1.0', 'HTTP/1.0'], ['0.9', 'HTTP/0.9']].map(([v, t]) => h('button', {
      type: 'button', class: 'pg-btn', 'aria-pressed': String(v === stato.protocollo), 'data-v': v, onclick: () => scegliProtocollo(v),
    }, t));
    const comandi = h('div', { class: 'pg-strumenti lab-pagina-web-comandi' },
      btnAvvia, btnIndietro, btnAvanti, btnDaCapo, h('span', { class: 'pg-spazio' }),
      h('span', { class: 'lab-pagina-web-gruppo' }, h('span', { id: idProt }, 'Protocollo'),
        h('span', { class: 'pg-gruppo', role: 'group', 'aria-labelledby': idProt }, btnProt)));

    /* ---------- i cinque passi ---------- */

    const binario = h('span');
    const btnPassi = PASSI.map((p) => h('button', { type: 'button', class: 'lab-pagina-web-passo', 'data-n': String(p.n), onclick: () => vaiA(p.n, true) },
      h('span', { class: 'lab-pagina-web-num' }, h('span', { class: 'pg-sr' }, 'Passo '), String(p.n)),
      h('span', { class: 'lab-pagina-web-nome' }, p.nome),
      h('span', { class: 'lab-pagina-web-breve', 'aria-hidden': 'true' }, p.breve)));
    const passiBox = h('div', { class: 'lab-pagina-web-passi-box' },
      h('span', { class: 'lab-pagina-web-binario', 'aria-hidden': 'true' }, binario),
      h('ol', { class: 'lab-pagina-web-passi', 'aria-label': 'I cinque passi' }, btnPassi.map((b) => h('li', null, b))));
    const ora = h('p', { class: 'lab-pagina-web-ora', 'aria-hidden': 'true' });

    /* ---------- la scena ---------- */

    const titolo = h('span', { class: 'lab-pagina-web-titolo is-vuoto' }, INDIRIZZO);
    const pagina = h('div', { class: 'lab-pagina-web-pagina' });
    const vuota = h('p', { class: 'lab-pagina-web-vuota' });
    const vista = h('div', { class: 'lab-pagina-web-vista', role: 'region', 'aria-label': 'La pagina disegnata dal browser' }, pagina, vuota);
    const testoBarraEl = h('span');
    const finestra = h('div', { class: 'lab-pagina-web-finestra', role: 'group', 'aria-label': 'Il browser' },
      h('div', { class: 'lab-pagina-web-barra' }, h('i', { 'aria-hidden': 'true' }), titolo, h('i', { 'aria-hidden': 'true' })),
      h('div', { class: 'lab-pagina-web-indirizzo' }, h('span', null, 'Indirizzo'), h('span', { class: 'lab-pagina-web-url' }, INDIRIZZO)),
      vista,
      h('div', { class: 'lab-pagina-web-stato' }, testoBarraEl));

    const pacchetto = h('span', { class: 'lab-pagina-web-pacchetto' });
    const filo = h('div', { class: 'lab-pagina-web-filo', 'aria-hidden': 'true' },
      h('span', { class: 'lab-pagina-web-presa is-a' }), h('span', { class: 'lab-pagina-web-presa is-b' }), pacchetto);
    const registro = h('div', { class: 'lab-pagina-web-registro' });
    const rete = h('div', { class: 'lab-pagina-web-rete', role: 'group', 'aria-label': 'La rete' }, filo, registro);

    const ledLavoro = h('i', { class: 'lab-pagina-web-led' });
    const peso = h('span', { class: 'lab-pagina-web-peso' });
    const fileRiga = h('div', { class: 'lab-pagina-web-file' }, h('span', null, 'ciao.html'), peso);
    const server = h('div', { class: 'lab-pagina-web-server', role: 'group', 'aria-label': 'Il server' },
      h('div', { class: 'lab-pagina-web-server-testa' }, h('strong', null, 'Server'), h('span', null, HOST),
        h('span', { class: 'lab-pagina-web-luci', 'aria-hidden': 'true' }, h('i', { class: 'lab-pagina-web-led is-acceso' }), ledLavoro)),
      h('div', { class: 'lab-pagina-web-feritoie', 'aria-hidden': 'true' }),
      fileRiga,
      h('p', null, 'Conserva i file e li spedisce a chi li chiede.'));
    const scena = h('div', { class: 'lab-pagina-web-scena' }, finestra, rete, server);

    /* ---------- il banco: il codice ---------- */

    const idS = ctx.uid('lab-pagina-web-s');
    const idA = ctx.uid('lab-pagina-web-a');
    const idJ = ctx.uid('lab-pagina-web-j');
    const luogo = h('span', { class: 'lab-pagina-web-etichetta' }, 'sul server');
    const btnModifica = h('button', { type: 'button', class: 'pg-btn lab-pagina-web-piccolo', onclick: () => entraModifica() }, simbolo('✎', 'Modifica'));
    const btnRipristinaL = h('button', { type: 'button', class: 'pg-btn lab-pagina-web-piccolo', hidden: true, onclick: () => ripristinaSubito() }, simbolo('↺', 'Ripristina'));
    const gutter = h('pre', { class: 'lab-pagina-web-gutter', 'aria-hidden': 'true' });
    const codice = h('pre', { class: 'lab-pagina-web-codice' });
    const codiceBox = h('div', { class: 'lab-pagina-web-codice-box', tabindex: '0', role: 'region', 'aria-label': 'Il codice HTML di ciao.html' }, gutter, codice);
    const banda = h('div', { class: 'lab-pagina-web-banda', 'aria-hidden': 'true' });
    const codiceWrap = h('div', { class: 'lab-pagina-web-codice-wrap' }, codiceBox, banda);

    const idArea = ctx.uid('lab-pagina-web-area');
    const idConta = ctx.uid('lab-pagina-web-conta');
    const idErr = ctx.uid('lab-pagina-web-err');
    const area = h('textarea', {
      class: 'pg-campo lab-pagina-web-area', id: idArea, rows: '12', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off',
      'aria-describedby': idConta + ' ' + idErr,
    });
    const contatore = h('span', { class: 'lab-pagina-web-contatore', id: idConta });
    const erroreEd = h('p', { class: 'lab-pagina-web-errore', id: idErr, role: 'alert', hidden: true });
    const rapidi = Object.keys(FRAMMENTI).map((k) => h('button', { type: 'button', class: 'pg-btn lab-pagina-web-piccolo', onclick: () => aggiungi(k) }, '+ ' + NOMI_FRAMMENTI[k]));
    const editor = h('div', { class: 'lab-pagina-web-editor', hidden: true },
      h('label', { for: idArea }, 'Il testo di ciao.html (Ctrl+Invio per ricostruire la pagina)'),
      area,
      h('div', { class: 'lab-pagina-web-rapidi' }, h('span', null, 'Aggiungi'), rapidi),
      erroreEd,
      h('div', { class: 'lab-pagina-web-azioni' },
        h('button', { type: 'button', class: 'pg-btn pg-btn--primario', onclick: () => ricostruisci() }, 'Ricostruisci la pagina'),
        h('button', { type: 'button', class: 'pg-btn', onclick: () => annullaModifica() }, 'Annulla'),
        h('button', { type: 'button', class: 'pg-btn', onclick: () => ripristinaBozza() }, simbolo('↺', 'Ripristina')),
        contatore));
    const avvisi = h('ul', { class: 'lab-pagina-web-avvisi', hidden: true, 'aria-label': 'Correzioni del browser' });
    const sorgente = h('section', { class: 'lab-pagina-web-pannello lab-pagina-web-sorgente', 'aria-labelledby': idS },
      h('header', { class: 'lab-pagina-web-testa' }, h('h4', { id: idS }, 'ciao.html'), luogo, h('span', { class: 'pg-spazio' }), btnRipristinaL, btnModifica),
      codiceWrap, editor, avvisi);

    /* ---------- il banco: l'albero ---------- */

    const alberoUl = h('ul', { class: 'lab-pagina-web-albero', role: 'tree', 'aria-label': 'L\'albero del DOM' });
    const alberoVuoto = h('p', { class: 'lab-pagina-web-albero-vuoto' }, 'L\'albero nasce al passo 3, quando il browser legge l\'HTML.');
    const alberoScroll = h('div', { class: 'lab-pagina-web-albero-scroll' }, alberoVuoto, alberoUl);
    const nNodi = h('span', { class: 'lab-pagina-web-etichetta' }, '0 nodi');
    const lettura = h('p', { class: 'lab-pagina-web-lettura' });
    const alberoBox = h('section', { class: 'lab-pagina-web-pannello lab-pagina-web-albero-box', 'aria-labelledby': idA },
      h('header', { class: 'lab-pagina-web-testa' }, h('h4', { id: idA }, 'L\'albero del DOM'), nNodi),
      alberoScroll, lettura,
      h('p', { class: 'lab-pagina-web-legenda', 'aria-hidden': 'true' },
        h('span', { class: 'lab-pagina-web-l-el' }, 'elemento'), h('span', { class: 'lab-pagina-web-l-te' }, 'testo'), h('span', { class: 'lab-pagina-web-l-at' }, 'attributo'), h('span', { class: 'lab-pagina-web-l-im' }, 'aggiunto dal browser')));

    /* ---------- il banco: il programma ---------- */

    function coloraJs(r) {
      const parti = [];
      const re = /('[^']*')|(document\.getElementById|firstChild\.data)|(onclick)|\b(var|function)\b/g;
      let u = 0;
      let m;
      while ((m = re.exec(r))) {
        if (m.index > u) parti.push(r.slice(u, m.index));
        parti.push(h('span', { class: 'lab-pagina-web-' + (m[1] ? 'j-s' : m[2] ? 'j-d' : m[3] ? 'j-e' : 'j-k') }, m[0]));
        u = m.index + m[0].length;
      }
      if (u < r.length) parti.push(r.slice(u));
      return parti;
    }
    const righeJs = PROGRAMMA.map((r) => h('li', null, coloraJs(r)));
    const valClic = h('b', null, '0');
    const esitoJs = h('span');
    const notaJs = h('span', { class: 'lab-pagina-web-etichetta' }, 'dal passo 5');
    const js = h('section', { class: 'lab-pagina-web-pannello lab-pagina-web-js', 'aria-labelledby': idJ },
      h('header', { class: 'lab-pagina-web-testa' }, h('h4', { id: idJ }, 'Il programma JavaScript'), notaJs),
      h('ol', { class: 'lab-pagina-web-programma', 'aria-label': 'Il codice del programma' }, righeJs),
      h('p', { class: 'lab-pagina-web-js-lettura' }, h('span', null, 'variabile ', h('span', { class: 'lab-pagina-web-m' }, 'clic'), ' = ', valClic), esitoJs));

    const banco = h('div', { class: 'lab-pagina-web-banco' }, sorgente, alberoBox, js);
    const spiega = h('div', { class: 'pg-spiega lab-pagina-web-spiega', 'aria-live': 'polite' });
    const evento = h('span', { class: 'lab-pagina-web-evento' });
    const volo = h('div', { class: 'lab-pagina-web-volo', 'aria-hidden': 'true' }, evento);
    const radice = h('div', { class: 'lab-pagina-web' }, comandi, passiBox, ora, scena, banco, spiega, volo);
    el.append(radice);

    /* ---------- testi ---------- */

    function testoPasso(n) {
      const v09 = stato.protocollo === '0.9';
      const r = risposta(stato.testo, stato.protocollo);
      if (n === 0) return ['Premi **▶ Avvia** e segui `ciao.html` dal server fino allo schermo, oppure vai un passo alla volta con **Avanti ›**. Con **✎ Modifica** puoi cambiare l\'HTML della pagina.'];
      if (n === 1) {
        return [v09
          ? '**1 · Richiesta.** Nel 1991 bastava una riga: `GET /ciao.html`. Niente versione, niente altro: il browser chiede il file al server `example.org` e aspetta.'
          : '**1 · Richiesta.** Il browser si collega al server `example.org` e gli scrive una riga di testo, `GET /ciao.html HTTP/1.0`, cioè «dammi il file ciao.html». Una riga vuota chiude la richiesta.'];
      }
      if (n === 2) {
        return [v09
          ? '**2 · Risposta.** Il server manda soltanto il testo della pagina, ' + r.byte + ' byte, e chiude la connessione: niente codice di stato, niente intestazioni. Anche un errore arrivava così, come una pagina da leggere.'
          : '**2 · Risposta.** Il server trova il file e risponde con la riga di stato `HTTP/1.0 200 OK` («tutto bene»), poi con le intestazioni, che annunciano un testo HTML di ' + r.byte + ' byte, infine con la pagina stessa. Poi chiude la connessione.'];
      }
      if (n === 3) {
        const a = stato.analisi;
        if (!a) return ['**3 · Analisi.** Il browser legge il testo e costruisce l\'albero del **DOM**.'];
        const t = ['**3 · Analisi.** Il browser legge il testo da sinistra a destra: ogni marcatore di apertura crea un nodo, il testo dentro diventa una foglia, ogni marcatore di chiusura risale di un livello. Il testo diventa un albero di ' + a.conteggio + ' nodi appesi al documento: il **DOM**.'];
        const imp = Array.from(new Set(a.nodi.filter((x) => x.implicito).map((x) => x.nome)));
        if (imp.length) t.push('I nodi tratteggiati (' + imp.map((x) => '`' + x + '`').join(', ') + ') non erano nel testo: li ha aggiunti il browser, come fanno tutti.');
        const corr = a.avvisi.filter((v) => v.tipo === 'correzione').length;
        if (corr) t.push('Il browser ha anche corretto ' + (corr === 1 ? 'un errore' : corr + ' errori') + ' senza fermarsi: li trovi sotto il codice.');
        return t;
      }
      if (n === 4) return ['**4 · Disegno.** Il browser percorre l\'albero dall\'alto in basso: il titolo va nella barra della finestra; per ogni nodo del corpo calcola un riquadro (è l\'impaginazione) e poi ci disegna dentro testi, collegamenti e pulsanti.'];
      return [
        '**5 · JavaScript (1995).** Insieme alla pagina arriva un programma. Un clic sul pulsante è un **evento**: il browser chiama la funzione `onclick`, che aumenta `clic` e cambia il primo figlio di `#conta` nell\'albero. Appena l\'albero cambia, il browser ridisegna quel pezzo di pagina.',
        'All\'inizio gli script arrivavano solo a moduli, collegamenti e immagini; dal 1998 il DOM standard del W3C apre ogni nodo dell\'albero, come fa qui `getElementById`.',
      ];
    }
    function testoBarra(n) {
      const r = risposta(stato.testo, stato.protocollo);
      return ['Pronto.', 'Richiesta inviata. Il server cerca ciao.html…', 'Pagina ricevuta: ' + r.byte + ' byte. Connessione chiusa.',
        'Albero pronto: ' + (stato.analisi ? stato.analisi.conteggio : 0) + ' nodi.', 'Documento disegnato.', 'Programma JavaScript caricato.'][n] || '';
    }
    function barraStato(t) { barraFissa = t; testoBarraEl.textContent = t; }
    function barraLink(t) { testoBarraEl.textContent = t || barraFissa; }

    /* ---------- disegno: la rete ---------- */

    function freccia(andata) {
      return h('b', { 'aria-hidden': 'true' }, h('span', { class: 'lab-pagina-web-w' }, andata ? '→' : '←'), h('span', { class: 'lab-pagina-web-n' }, andata ? '↓' : '↑'));
    }
    function disegnaRegistro(n, nuovo) {
      const parti = [h('p', { class: 'lab-pagina-web-registro-titolo' }, 'Sulla rete')];
      if (n < 1) parti.push(h('p', { class: 'lab-pagina-web-registro-vuoto' }, 'Ancora nessun messaggio.'));
      if (n >= 1) {
        const q = richiesta(stato.protocollo);
        const righe = [h('span', { class: 'lab-pagina-web-l', style: '--i:0' }, q.riga)];
        righe.push(h('span', { class: 'lab-pagina-web-nota', style: '--i:1' }, q.versione === '1.0' ? 'e una riga vuota · dal browser al server' : 'una riga sola · dal browser al server'));
        parti.push(h('div', { class: 'lab-pagina-web-msg' + (nuovo === 1 ? ' is-nuovo' : ''), role: 'group', 'aria-label': 'Richiesta' }, freccia(true), h('div', null, righe)));
      }
      if (n >= 2) {
        const r = risposta(stato.testo, stato.protocollo);
        const righe = [];
        let i = 0;
        if (r.stato) {
          righe.push(h('span', { class: 'lab-pagina-web-l', style: '--i:' + i++ }, 'HTTP/1.0 ', h('span', { class: 'lab-pagina-web-ok' }, '200 OK')));
          for (const [k, v] of r.intestazioni) righe.push(h('span', { class: 'lab-pagina-web-l is-h', style: '--i:' + i++ }, k + ': ', h('span', null, v)));
          righe.push(h('span', { class: 'lab-pagina-web-nota', style: '--i:' + i }, 'una riga vuota, poi ' + r.byte + ' byte di HTML'));
        } else {
          righe.push(h('span', { class: 'lab-pagina-web-l', style: '--i:0' }, r.byte + ' byte di HTML'));
          righe.push(h('span', { class: 'lab-pagina-web-nota', style: '--i:1' }, 'niente stato, niente intestazioni; poi il server chiude'));
        }
        parti.push(h('div', { class: 'lab-pagina-web-msg' + (nuovo === 2 ? ' is-nuovo' : ''), role: 'group', 'aria-label': 'Risposta' }, freccia(false), h('div', null, righe)));
      }
      registro.replaceChildren(...parti);
    }

    /* ---------- disegno: il codice ---------- */

    function colora(g, raw) {
      if (g.tipo === 'testo') return raw;
      if (g.tipo === 'commento' || g.tipo === 'doctype') return h('span', { class: 'lab-pagina-web-k-c' }, raw);
      if (g.tipo === 'rotto') return h('span', { class: 'lab-pagina-web-k-r' }, raw);
      const m = raw.match(/^(<\/?)([^\s/>]+)([\s\S]*?)(\/?>)$/);
      if (!m) return raw;
      const parti = [h('span', { class: 'lab-pagina-web-k-p' }, m[1]), h('span', { class: 'lab-pagina-web-k-n' }, m[2])];
      const re = /(\s+)|([^\s=/>]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s>]+)?|([\s\S])/g;
      let x;
      while ((x = re.exec(m[3])) && x[0]) {
        if (x[1]) parti.push(x[1]);
        else if (x[2]) {
          parti.push(h('span', { class: 'lab-pagina-web-k-a' }, x[2]));
          if (x[3]) parti.push(x[3]);
          if (x[4]) parti.push(h('span', { class: 'lab-pagina-web-k-v' }, x[4]));
        } else parti.push(x[0]);
      }
      parti.push(h('span', { class: 'lab-pagina-web-k-p' }, m[4]));
      return parti;
    }
    function disegnaSorgente() {
      const t = stato.testo;
      const a = stato.analisi && stato.analisi.testo === t ? stato.analisi : null;
      const tk = a ? a.token : tokenizza(t);
      spanToken = tk.map((g, k) => h('span', { class: 'lab-pagina-web-tk', 'data-t': String(k) }, colora(g, t.slice(g.inizio, g.fine))));
      codice.classList.remove('is-scansione');
      codice.replaceChildren(...spanToken);
      gutter.textContent = t.split('\n').map((_, i) => i + 1).join('\n');
      nodoDiToken = new Map();
      if (a) {
        for (const n of a.nodi) {
          if (n.token >= 0 && !nodoDiToken.has(n.token)) nodoDiToken.set(n.token, n.id);
          if (n.tokenFine >= 0 && !nodoDiToken.has(n.tokenFine)) nodoDiToken.set(n.tokenFine, n.id);
          for (const k of n.tokens || []) if (!nodoDiToken.has(k)) nodoDiToken.set(k, n.id);
        }
      }
    }
    function mostraAvvisi(a) {
      const lista = a ? a.avvisi : [];
      avvisi.hidden = !lista.length;
      const voci = lista.slice(0, 3).map((v) => h('li', { class: v.tipo === 'script' ? 'is-script' : null }, (v.riga ? 'Riga ' + v.riga + ' · ' : '') + v.testo));
      if (lista.length > 3) voci.push(h('li', null, 'E altre ' + (lista.length - 3) + ' correzioni.'));
      avvisi.replaceChildren(...voci);
    }

    /* ---------- disegno: l'albero ---------- */

    function chipDi(n) {
      if (n.tipo === 'documento') return ['documento'];
      if (n.tipo === 'testo') return [h('span', { class: 'lab-pagina-web-q' }, '"'), h('span', { class: 'lab-pagina-web-t' }, abbrevia(n.testo, 28)), h('span', { class: 'lab-pagina-web-q' }, '"')];
      if (n.tipo === 'commento') return ['<!-- ' + abbrevia(n.testo, 18) + ' -->'];
      if (n.tipo === 'doctype') return ['<!' + abbrevia(n.testo, 18) + '>'];
      const parti = [h('span', { class: 'lab-pagina-web-p' }, '<'), h('span', { class: 'lab-pagina-web-n' }, n.nome)];
      for (const k of Object.keys(n.attributi)) {
        parti.push(' ', h('span', { class: 'lab-pagina-web-a' }, k));
        if (n.attributi[k] !== '') parti.push(h('span', { class: 'lab-pagina-web-p' }, '="'), h('span', { class: 'lab-pagina-web-v' }, abbrevia(n.attributi[k], 20)), h('span', { class: 'lab-pagina-web-p' }, '"'));
      }
      parti.push(h('span', { class: 'lab-pagina-web-p' }, '>'));
      return parti;
    }
    function voceAlbero(n) {
      const li = h('li', {
        role: 'treeitem', class: 'lab-pagina-web-nodo is-' + n.tipo + (n.implicito ? ' is-implicito' : ''), 'data-n': String(n.id), tabindex: '-1', 'aria-label': descrivi(n),
      }, h('span', { class: 'lab-pagina-web-riga' }, h('span', { class: 'lab-pagina-web-chip' }, chipDi(n)),
        n.implicito ? h('span', { class: 'lab-pagina-web-agg', 'aria-hidden': 'true' }, 'aggiunto') : null));
      mappaAlbero.set(n.id, li);
      return li;
    }
    function aggiungiAlbero(n, nuovo) {
      if (n.tipo === 'testo' && n.spazio) return null;
      if (mappaAlbero.has(n.id)) return mappaAlbero.get(n.id);
      const li = voceAlbero(n);
      const pl = n.padre ? mappaAlbero.get(n.padre.id) : null;
      if (!pl) alberoUl.append(li);
      else {
        let gruppo = pl.querySelector(':scope > ul');
        if (!gruppo) { gruppo = h('ul', { role: 'group' }); pl.append(gruppo); pl.setAttribute('aria-expanded', 'true'); }
        // al suo posto tra i fratelli, anche quando nasce dopo un fratello che nel documento viene dopo di lui
        const fratelli = n.padre.figli;
        let prima = null;
        for (let i = fratelli.indexOf(n) + 1; i < fratelli.length && !prima; i++) prima = mappaAlbero.get(fratelli[i].id) || null;
        gruppo.insertBefore(li, prima);
      }
      if (nuovo && !ctx.riduci) li.classList.add('is-nuovo');
      return li;
    }
    function aggiornaVoce(n) {
      const li = mappaAlbero.get(n.id);
      if (!li) { aggiungiAlbero(n, false); return; }
      li.querySelector('.lab-pagina-web-chip').replaceChildren(...chipDi(n));
      li.setAttribute('aria-label', descrivi(n));
    }
    function svuotaAlbero() {
      mappaAlbero.clear();
      alberoUl.replaceChildren();
    }
    function disegnaAlbero(a) {
      svuotaAlbero();
      for (const r of righeAlbero(a.documento)) aggiungiAlbero(r.nodo, false);
      aggiornaRoving();
    }
    function aggiornaRoving() {
      const voci = alberoUl.querySelectorAll('[role="treeitem"]');
      const scelto = (stato.focoAlbero != null && mappaAlbero.get(stato.focoAlbero)) || voci[0];
      voci.forEach((v) => v.setAttribute('tabindex', v === scelto ? '0' : '-1'));
    }
    function segnaCorrente(ids) {
      alberoUl.querySelectorAll('.is-corrente').forEach((x) => x.classList.remove('is-corrente'));
      const top = ids && ids.length ? mappaAlbero.get(ids[ids.length - 1]) : null;
      if (top) top.classList.add('is-corrente');
    }

    /* ---------- disegno: la pagina (solo elementi noti e testo, niente HTML del lettore) ---------- */

    function nodoPagina(n) {
      if (n.tipo === 'testo') {
        if (n.spazio) return document.createTextNode(n.testo);
        const sp = h('span', { class: 'lab-pagina-web-t', 'data-n': String(n.id) }, n.testo);
        mappaPagina.set(n.id, sp);
        return sp;
      }
      if (n.tipo !== 'elemento' || !disegnabile(n)) return null;
      const nome = n.nome;
      const cls = 'lab-pagina-web-x' + (/^[a-z][a-z0-9]{0,15}$/.test(nome) ? ' lab-pagina-web-x-' + nome : '') +
        (BLOCCHI.has(nome) ? ' lab-pagina-web-blocco' : '') + (CON_MARGINE.has(nome) ? ' lab-pagina-web-m' : '');
      const id = String(n.id);
      let e;
      if (nome === 'br') e = h('br', { 'data-n': id });
      else if (nome === 'button') e = h('button', { type: 'button', class: cls, 'data-n': id });
      else if (nome === 'a') e = h('span', { class: cls, role: 'link', tabindex: '0', 'data-n': id });
      else if (nome === 'img') {
        const alt = collassa(n.attributi.alt || '');
        e = h('span', { class: cls, 'data-n': id, role: 'img', 'aria-label': 'Immagine: ' + (alt || 'senza descrizione') }, alt || 'immagine');
      } else if (SENZA_FIGLI.has(nome)) e = h('span', { class: cls + ' lab-pagina-web-x-input', 'data-n': id }, abbrevia(n.attributi.value || n.attributi.placeholder || '', 30));
      else e = h(BLOCCHI.has(nome) ? 'div' : 'span', { class: cls, 'data-n': id });
      if (!SENZA_FIGLI.has(nome) && nome !== 'img') {
        for (const f of n.figli) {
          const c = nodoPagina(f);
          if (c) e.append(c);
        }
      }
      mappaPagina.set(n.id, e);
      return e;
    }
    function disegnaPagina(a, nascosta) {
      mappaPagina.clear();
      unitaPagina = new Map();
      pagina.replaceChildren();
      let qualcosa = false;
      if (a && a.body) {
        for (const f of a.body.figli) {
          const e = nodoPagina(f);
          if (!e) continue;
          pagina.append(e);
          if (disegnabile(f)) {
            unitaPagina.set(f.id, e);
            qualcosa = true;
            if (nascosta) e.style.opacity = '0';
          }
        }
      }
      mostraVuota(qualcosa ? null : 'Il corpo della pagina è vuoto: non c\'è niente da disegnare. Aggiungi un paragrafo con «✎ Modifica».');
    }
    function mostraVuota(t) {
      vuota.hidden = !t;
      vuota.textContent = t || '';
    }
    function mettiTitolo(a) {
      const t = a && a.titolo;
      titolo.textContent = t || INDIRIZZO;
      titolo.classList.toggle('is-vuoto', !t);
    }

    /* ---------- il programma ---------- */

    function luci(i) { righeJs.forEach((r, k) => r.classList.toggle('is-ora', k === i)); }
    function mostraJs(attivo) {
      js.classList.toggle('is-attivo', attivo);
      notaJs.textContent = attivo ? '1995' : 'dal passo 5';
      notaJs.classList.toggle('is-js', attivo);
      valClic.textContent = String(stato.clic);
      if (!attivo) { luci(-1); esitoJs.textContent = ''; }
    }
    function tastoInfo() {
      if (!stato.analisi) return { nodo: null, el: null };
      const t = ascolta(stato.analisi).tasto;
      return { nodo: t, el: t ? mappaPagina.get(t.id) || null : null };
    }
    function sincronizzaJs() {
      luci(-1);
      evento.style.opacity = '0';
      valClic.textContent = String(stato.clic);
      if (!stato.analisi) return;
      const conta = perId(stato.analisi.documento, 'conta');
      const primo = conta && conta.figli[0];
      if (primo && primo.tipo === 'testo' && !primo.spazio) {
        aggiornaVoce(primo);
        const pe = mappaPagina.get(primo.id);
        if (pe) pe.textContent = primo.testo;
        else if (stato.passo >= 4) disegnaPagina(stato.analisi, false);
      }
    }

    /* ---------- lo stato completo di un passo, senza animazioni ---------- */

    // L'albero vero lo costruisce il parser del browser, DOMParser, in un documento a parte che non entra mai
    // nella pagina (i suoi script non partono). Il nostro analizzatore dà le posizioni nel testo e il ritmo
    // della crescita; se DOMParser manca, resta lui.
    function analizzaVera(testo) {
      const a = analizza(testo);
      if (!a.ok || typeof DOMParser !== 'function') return a;
      try {
        return daDom(new DOMParser().parseFromString(a.testo, 'text/html'), a);
      } catch (err) {
        return a;
      }
    }
    function assicuraAnalisi() {
      if (stato.analisi) return;
      let a = analizzaVera(stato.testo);
      if (!a.ok) { stato.testo = ESEMPIO; a = analizzaVera(ESEMPIO); }
      stato.analisi = a;
      stato.clic = 0;
    }
    function nuovaAnalisi() {
      stato.analisi = null;
      assicuraAnalisi();
    }
    function pulisciTransitori() {
      pacchetto.style.opacity = '0';
      evento.style.opacity = '0';
      banda.style.opacity = '0';
      luci(-1);
      pulisciIndica();
    }
    function applicaFino(n) {
      pulisciTransitori();
      stato.passo = n;
      if (n < 3) { stato.analisi = null; stato.clic = 0; } else assicuraAnalisi();
      const a = stato.analisi;
      peso.textContent = byteUtf8(stato.testo) + ' byte';
      filo.classList.toggle('is-aperto', n === 1);
      fileRiga.classList.toggle('is-scelto', n === 1);
      disegnaRegistro(n);
      luogo.textContent = n >= 2 ? 'nel browser' : 'sul server';
      luogo.classList.toggle('is-browser', n >= 2);
      codiceWrap.classList.toggle('is-lontano', n < 2);
      if (!stato.modifica) disegnaSorgente();
      mostraAvvisi(n >= 3 ? a : null);
      if (n >= 3) {
        disegnaAlbero(a);
        alberoVuoto.hidden = true;
        nNodi.textContent = a.conteggio + ' nodi';
        letturaBase();
      } else {
        svuotaAlbero();
        alberoVuoto.hidden = false;
        nNodi.textContent = '0 nodi';
        lettura.hidden = true;
      }
      if (n >= 4) {
        disegnaPagina(a, false);
        mettiTitolo(a);
      } else {
        pagina.replaceChildren();
        mappaPagina.clear();
        mettiTitolo(null);
        mostraVuota(n < 2 ? 'Nessuna pagina, per ora.' : n === 2 ? 'Il testo è arrivato: prima di disegnarlo, il browser deve capirlo.' : 'L\'albero è pronto: al passo 4 diventa una pagina.');
      }
      mostraJs(n >= 5);
      barraStato(testoBarra(n));
      aggiornaComandi();
    }

    /* ---------- le animazioni dei cinque passi ---------- */

    async function viaggio(andata, testo, ep) {
      pacchetto.textContent = testo;
      const vert = filo.clientHeight > filo.clientWidth;
      const L = Math.max(0, vert ? filo.clientHeight - pacchetto.offsetHeight : filo.clientWidth - pacchetto.offsetWidth);
      const pos = (p) => (vert ? 'translate(-50%,' + (p * L).toFixed(1) + 'px)' : 'translate(' + (p * L).toFixed(1) + 'px,-50%)');
      try {
        await muovi({
          durata: D.narrativa * 1.3, easing: 'sharp',
          aggiorna(t) {
            const p = andata ? t : 1 - t;
            pacchetto.style.transform = pos(p);
            pacchetto.style.opacity = String(Math.max(0, Math.min(1, t * 7, (1 - t) * 7)));
          },
        }, ep);
      } finally { pacchetto.style.opacity = '0'; }
    }
    async function animaRichiesta(ep) {
      narra(...testoPasso(1));
      filo.classList.add('is-aperto');
      barraStato('Connessione a ' + HOST + '…');
      await aspetta(D.lenta, ep);
      disegnaRegistro(1, 1);
      await aspetta(D.normale, ep);
      await viaggio(true, richiesta(stato.protocollo).etichetta, ep);
      fileRiga.classList.add('is-scelto');
      riavvia(ledLavoro, 'is-lavora');
      barraStato(testoBarra(1));
      await aspetta(D.lenta, ep);
    }
    async function animaRisposta(ep) {
      const r = risposta(stato.testo, stato.protocollo);
      narra(...testoPasso(2));
      filo.classList.add('is-aperto');
      fileRiga.classList.add('is-scelto');
      riavvia(ledLavoro, 'is-lavora');
      barraStato('Il server spedisce ciao.html…');
      await aspetta(D.normale, ep);
      disegnaRegistro(2, 2);
      await aspetta(D.lenta, ep);
      await viaggio(false, r.etichetta, ep);
      // il testo arriva nel browser: una banda luminosa scorre sul codice, riga dopo riga
      luogo.textContent = 'nel browser';
      luogo.classList.add('is-browser');
      codiceWrap.classList.remove('is-lontano');
      const altezza = Math.min(codiceWrap.clientHeight, codiceBox.scrollHeight) || 1;
      try {
        await muovi({
          durata: D.narrativa, easing: 'linear',
          aggiorna(t) {
            banda.style.transform = 'translateY(' + (t * (altezza + 46) - 46).toFixed(1) + 'px)';
            banda.style.opacity = String(Math.min(1, t * 8, (1 - t) * 8));
          },
        }, ep);
      } finally { banda.style.opacity = '0'; }
      filo.classList.remove('is-aperto');
      fileRiga.classList.remove('is-scelto');
      barraStato(testoBarra(2));
      await aspetta(D.normale, ep);
    }
    function effetto(a, p) {
      if (p.token < 0) return p.crea.length > 0;
      const g = a.token[p.token];
      return !(g.tipo === 'testo' && SPAZI.test(g.testo));
    }
    function letturaAperti(a, p) {
      const nomi = p.aperti;
      lettura.hidden = false;
      lettura.replaceChildren('Aperti: ', ...(nomi.length ? nomi.flatMap((x, i) => [i ? ' › ' : '', h('span', { class: 'lab-pagina-web-n' }, x)]) : ['nessuno']));
    }
    function letturaBase() {
      lettura.hidden = false;
      lettura.replaceChildren('Tocca o punta un nodo, oppure usa le frecce: lo ritrovi nella pagina e nel codice.');
    }
    async function animaAnalisi(ep) {
      nuovaAnalisi();
      const a = stato.analisi;
      narra(...testoPasso(3));
      disegnaSorgente();
      codice.classList.add('is-scansione');
      svuotaAlbero();
      alberoVuoto.hidden = true;
      nNodi.textContent = '0 nodi';
      barraStato('Analisi dell\'HTML…');
      const li0 = aggiungiAlbero(a.documento, true);
      if (li0) li0.setAttribute('tabindex', '0');
      const n = a.passi.filter((p) => effetto(a, p)).length;
      const ritmo = Math.max(80, Math.min(320, 5600 / Math.max(1, n)));
      let precedente = null;
      let contati = 0;
      for (const p of a.passi) {
        if (p.token >= 0) {
          const sp = spanToken[p.token];
          if (precedente) precedente.classList.remove('is-ora');
          if (sp) {
            sp.classList.add('is-letto', 'is-ora');
            if (p.ignorato) sp.classList.add('is-ignorato');
            scorriDentro(codiceBox, sp);
          }
          precedente = sp;
        }
        for (const id of p.crea) {
          const li = aggiungiAlbero(a.nodi[id], true);
          if (li) { contati += 1; scorriDentro(alberoScroll, li); }
        }
        for (const id of p.aggiorna) aggiornaVoce(a.nodi[id]);
        nNodi.textContent = contati + ' nodi';
        segnaCorrente(p.apertiId);
        letturaAperti(a, p);
        if (effetto(a, p)) await aspetta(ritmo, ep);
      }
      if (precedente) precedente.classList.remove('is-ora');
      codice.classList.remove('is-scansione');
      segnaCorrente(null);
      nNodi.textContent = a.conteggio + ' nodi';
      mostraAvvisi(a);
      aggiornaRoving();
      letturaBase();
      barraStato(testoBarra(3));
      await aspetta(D.normale, ep);
    }
    function illumina(ids, classe) {
      for (const id of ids) riavvia(mappaAlbero.get(id), classe);
    }
    function scatola(elU, n) {
      const b = pagina.getBoundingClientRect();
      const r = elU.getBoundingClientRect();
      const box = h('span', { class: 'lab-pagina-web-scatola', 'aria-hidden': 'true' }, h('span', null, n.tipo === 'testo' ? 'testo' : n.nome));
      box.style.left = (r.left - b.left - 4).toFixed(1) + 'px';
      box.style.top = (r.top - b.top - 4).toFixed(1) + 'px';
      box.style.width = (r.width + 8).toFixed(1) + 'px';
      box.style.height = (Math.max(r.height, 20) + 8).toFixed(1) + 'px';
      pagina.append(box);
      return box;
    }
    async function animaDisegno(ep) {
      assicuraAnalisi();
      const a = stato.analisi;
      narra(...testoPasso(4));
      barraStato('Disegno della pagina…');
      disegnaPagina(a, true);
      mettiTitolo(null);
      vista.scrollTop = 0;
      for (const u of pianoDisegno(a)) {
        illumina(u.ids, 'is-disegna');
        if (u.tipo === 'titolo') {
          mettiTitolo(a);
          riavvia(titolo, 'is-nuovo');
          await aspetta(D.lenta, ep);
          continue;
        }
        const elU = unitaPagina.get(u.nodo);
        if (!elU) continue;
        scorriDentro(vista, elU);
        const box = scatola(elU, a.nodi[u.nodo]);
        await muovi({ durata: D.normale, easing: 'smooth', aggiorna(t) { box.style.opacity = String(t); box.style.transform = 'scaleY(' + (0.35 + 0.65 * t).toFixed(3) + ')'; } }, ep);
        await muovi({
          durata: D.lenta, easing: 'smooth',
          aggiorna(t) {
            elU.style.opacity = String(t);
            elU.style.transform = 'translateY(' + ((1 - t) * 6).toFixed(2) + 'px)';
            box.style.opacity = String(1 - t * 0.9);
          },
        }, ep);
        box.remove();
        elU.style.opacity = '';
        elU.style.transform = '';
        await aspetta(D.veloce, ep);
      }
      mettiTitolo(a);
      barraStato(testoBarra(4));
      await aspetta(D.normale, ep);
    }
    async function vola(da, a, testo, ep) {
      if (!da || !a) return;
      const base = radice.getBoundingClientRect();
      const r1 = da.getBoundingClientRect();
      const r2 = a.getBoundingClientRect();
      if (!r1.width || !r2.width) return;
      evento.textContent = testo;
      const w = evento.offsetWidth;
      const hh = evento.offsetHeight;
      const x1 = r1.left + r1.width / 2 - base.left - w / 2;
      const y1 = r1.top + r1.height / 2 - base.top - hh / 2;
      const x2 = r2.left + Math.min(r2.width / 2, 60) - base.left - w / 2;
      const y2 = r2.top + r2.height / 2 - base.top - hh / 2;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const arco = Math.min(60, dist * 0.18);
      try {
        await muovi({
          durata: Math.max(D.lenta, Math.min(1100, dist * 1.1)), easing: 'sharp',
          aggiorna(t) {
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t - Math.sin(Math.PI * t) * arco;
            evento.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
            evento.style.opacity = String(Math.max(0, Math.min(1, t * 6, (1 - t) * 6 + 0.2)));
          },
        }, ep);
      } finally { evento.style.opacity = '0'; }
    }
    function segnaCompleto() {
      if (stato.completato) return;
      stato.completato = true;
      ctx.completa();
    }
    async function catena(esito, ep, dimostrazione) {
      const fermo = ctx.riduci;
      const t = tastoInfo();
      const n = esito.clic;
      luci(-1);
      if (!fermo && t.el) await vola(t.el, righeJs[R.evento], 'click', ep);
      luci(R.evento);
      if (!fermo) await aspetta(D.normale, ep);
      luci(R.somma);
      valClic.textContent = String(n);
      riavvia(valClic, 'is-cambia');
      if (!fermo) await aspetta(D.normale, ep);
      luci(R.dom);
      if (!esito.ok) {
        esitoJs.textContent = 'errore: la pagina non cambia';
        barraStato('Errore nel programma: la pagina non cambia.');
        narra(MOTIVI[esito.motivo]);
        segnaCompleto();
        return;
      }
      const li = mappaAlbero.get(esito.nodo.id);
      if (li) scorriDentro(alberoScroll, li);
      const chip = li ? li.querySelector('.lab-pagina-web-chip') : null;
      if (!fermo && chip) await vola(righeJs[R.dom], chip, '"' + n + '"', ep);
      aggiornaVoce(esito.nodo);
      riavvia(li, 'is-cambia');
      esitoJs.textContent = '#conta ora contiene «' + esito.dopo + '»';
      if (!fermo) await aspetta(D.normale, ep);
      let pe = mappaPagina.get(esito.nodo.id);
      if (!fermo && chip && pe) await vola(chip, pe, 'ridisegna', ep);
      if (!pe) { disegnaPagina(stato.analisi, false); pe = mappaPagina.get(esito.nodo.id); } // prima era solo uno spazio
      if (pe) { pe.textContent = esito.dopo; riavvia(pe, 'is-cambiato'); }
      barraStato('Evento click: pagina aggiornata.');
      const nomeTasto = t.nodo ? abbrevia(testoDi(t.nodo), 24) : '';
      if (dimostrazione) {
        narra('**Clic!** L\'evento `click` arriva alla funzione `onclick`: `clic` diventa ' + n + ', `conta.firstChild.data` cambia il nodo di testo dentro `#conta` e il browser ridisegna solo quel numero.',
          h('span', null, h('strong', null, 'Ora tocca a te: '), 'premi ', nomeTasto ? h('strong', null, '«' + nomeTasto + '»') : 'il pulsante', ' nella pagina, anche più volte.'));
      } else {
        narra(h('span', null, h('strong', null, 'Clic n. ' + n + '. '), 'Evento ', codiceH('click'), ' → funzione ', codiceH('onclick'), ' → ', codiceH('clic = ' + n),
          ' → il nodo di testo di ', codiceH('#conta'), ' vale «' + esito.dopo + '» → il browser ridisegna. Il resto della pagina non si tocca.'));
      }
      segnaCompleto();
      if (!fermo) await aspetta(D.lenta, ep);
      luci(-1);
    }
    async function clicDimostrativo(ep) {
      const t = tastoInfo();
      if (!t.el) { narra(MOTIVI['senza-tasto']); segnaCompleto(); return; }
      scorriDentro(vista, t.el);
      if (!ctx.riduci) {
        t.el.classList.add('is-premuto');
        await aspetta(D.normale, ep);
        t.el.classList.remove('is-premuto');
      }
      stato.clic += 1;
      await catena(eseguiClic(stato.analisi, stato.clic), ep, true);
      const dopo = tastoInfo();
      if (dopo.el && !ctx.riduci) riavvia(dopo.el, 'is-invito');
    }
    async function animaJs(ep) {
      assicuraAnalisi();
      narra(...testoPasso(5));
      mostraJs(true);
      riavvia(js, 'is-arriva');
      stato.visto5 = true;
      barraStato(testoBarra(5));
      await aspetta(D.narrativa * 1.6, ep);
      await clicDimostrativo(ep);
    }
    async function animaPasso(n, ep) {
      if (ctx.riduci) {
        if (n === 3) nuovaAnalisi();
        applicaFino(n);
        narra(...testoPasso(n));
        if (n === 5) { stato.visto5 = true; await clicDimostrativo(ep); }
        return;
      }
      if (n === 1) await animaRichiesta(ep);
      else if (n === 2) await animaRisposta(ep);
      else if (n === 3) await animaAnalisi(ep);
      else if (n === 4) await animaDisegno(ep);
      else await animaJs(ep);
    }

    /* ---------- comandi ---------- */

    function aggiornaComandi() {
      const n = stato.passo;
      if (stato.inCorsa) etichetta(btnAvvia, '❚❚', 'Pausa');
      else if (n === 0) etichetta(btnAvvia, '▶', 'Avvia');
      else if (n >= 5) etichetta(btnAvvia, '↺', 'Rivedi');
      else etichetta(btnAvvia, '▶', 'Continua');
      inattivo(btnIndietro, n === 0);
      inattivo(btnAvanti, n >= 5 && !stato.animando);
      btnPassi.forEach((b, i) => {
        const k = i + 1;
        if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('is-fatto', k < n);
      });
      binario.style.transform = 'scaleX(' + Math.max(0, (n - 1) / 4) + ')';
      ora.textContent = n === 0 ? 'Cinque passi, dal server allo schermo' : 'Passo ' + n + ' di 5 · ' + PASSI[n - 1].nome;
      btnRipristinaL.hidden = stato.modifica || stato.testo === ESEMPIO;
    }
    // Se il lettore sta scrivendo, prima di muoversi applica il testo nuovo (o spiega che cosa non va).
    function applicaBozza() {
      if (!stato.modifica) return true;
      if (area.value === stato.testo) { esciModifica(); return true; }
      const r = analizzaVera(area.value);
      if (!r.ok) { mostraErrore(r.errore); area.focus(); return false; }
      stato.testo = area.value;
      stato.analisi = null;
      esciModifica();
      if (stato.passo >= 2) { interrompi(); stato.inCorsa = false; applicaFino(stato.passo); }
      return true;
    }
    async function eseguiPasso(n, ep) {
      stato.passo = n;
      stato.animando = true;
      aggiornaComandi();
      try {
        await animaPasso(n, ep);
      } catch (err) { silenzia(err); } finally {
        if (vivo(ep)) { stato.animando = false; aggiornaComandi(); }
      }
    }
    async function vaiA(n, anima) {
      if (!applicaBozza()) return;
      interrompi();
      stato.inCorsa = false;
      const ep = stato.epoca;
      if (!anima || n <= 0) {
        applicaFino(Math.max(0, n));
        narra(...testoPasso(Math.max(0, n)));
        return;
      }
      applicaFino(n - 1);
      await eseguiPasso(n, ep);
    }
    async function avvia() {
      if (stato.inCorsa) { pausa(); return; }
      if (!applicaBozza()) return;
      const da = stato.passo >= 5 ? 1 : stato.passo + 1;
      interrompi();
      const ep = stato.epoca;
      stato.inCorsa = true;
      applicaFino(da - 1);
      ctx.annuncia('Si parte dal passo ' + da + '.');
      try {
        for (let n = da; n <= 5; n++) {
          stato.passo = n;
          stato.animando = true;
          aggiornaComandi();
          await animaPasso(n, ep);
          stato.animando = false;
          aggiornaComandi();
          if (n < 5) await aspetta(ctx.riduci ? D.narrativa * 2.2 : D.narrativa * 1.4, ep);
        }
      } catch (err) { silenzia(err); } finally {
        if (vivo(ep)) { stato.inCorsa = false; stato.animando = false; aggiornaComandi(); }
      }
    }
    function pausa() {
      const n = stato.passo;
      interrompi();
      stato.inCorsa = false;
      applicaFino(n);
      narra(...testoPasso(n));
      ctx.annuncia('In pausa al passo ' + n + '. Premi Continua o Avanti.');
    }
    function avanti() {
      if (!applicaBozza()) return;
      if (stato.animando) { pausa(); return; } // il primo tocco completa il passo in corso
      if (stato.passo >= 5) { ctx.annuncia('Sei all\'ultimo passo: premi il pulsante nella pagina, o Rivedi per ricominciare.'); return; }
      vaiA(stato.passo + 1, true);
    }
    function indietro() {
      if (stato.passo <= 0 && !stato.animando) { ctx.annuncia('Sei all\'inizio.'); return; }
      vaiA(Math.max(0, stato.passo - 1), false);
    }
    function daCapo() {
      vaiA(0, false);
      ctx.annuncia('Si ricomincia da capo.');
    }
    function scegliProtocollo(v) {
      if (v === stato.protocollo) return;
      stato.protocollo = v;
      btnProt.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      if (stato.animando || stato.inCorsa) { interrompi(); stato.inCorsa = false; applicaFino(stato.passo); } else disegnaRegistro(stato.passo);
      narra(v === '0.9'
        ? '**HTTP/0.9, il protocollo del 1991.** La richiesta è una riga sola, `GET /ciao.html`, e la risposta è soltanto l\'HTML: quando il server chiude la connessione, la pagina è finita. Non ci sono codici di stato, quindi anche un errore arriva come una pagina da leggere.'
        : '**HTTP/1.0.** Messo per iscritto nel 1996, nella RFC 1945, dopo anni di uso: la risposta comincia con una riga di stato, come `HTTP/1.0 200 OK`, e con le intestazioni, che dicono che cosa sta arrivando e quanto è lungo.',
      stato.passo < 1 ? 'Premi **▶ Avvia** per vedere la differenza sul filo.' : null);
    }

    /* ---------- la pagina risponde ai clic ---------- */

    async function premiTasto() {
      interrompi();
      stato.inCorsa = false;
      const ep = stato.epoca;
      sincronizzaJs();
      stato.clic += 1;
      const esito = eseguiClic(stato.analisi, stato.clic);
      stato.animando = true;
      aggiornaComandi();
      try {
        await catena(esito, ep, false);
      } catch (err) { silenzia(err); } finally {
        if (vivo(ep)) { stato.animando = false; aggiornaComandi(); }
        else sincronizzaJs();
      }
    }
    function seguiLink(link) {
      const nodo = stato.analisi && stato.analisi.nodi[Number(link.dataset.n)];
      const d = destinazione(nodo ? nodo.attributi.href : '');
      if (d.tipo === 'web') {
        narra(h('span', null, 'Questo collegamento porta a ', codiceH(d.host + d.percorso), '. In un browser vero partirebbe subito una nuova richiesta, ',
          codiceH('GET ' + d.percorso), d.host !== HOST ? ' al server ' + d.host : '', ', e la storia ricomincerebbe dal passo 1. È l\'idea dell\'ipertesto: ogni collegamento è una nuova richiesta.'));
      } else if (d.tipo === 'ancora') {
        narra(h('span', null, 'Questo collegamento porta a un punto della stessa pagina (', codiceH('#' + d.ancora), '): il browser scorre fin lì, senza nuove richieste.'));
      } else if (d.tipo === 'altro') {
        narra(h('span', null, 'Questo collegamento usa ', codiceH(d.schema + ':'), ', che il laboratorio non segue: qui si seguono solo indirizzi web.'));
      } else narra('Questo collegamento non ha un indirizzo (`href`): non porta da nessuna parte.');
    }
    function premi(target) {
      if (!(target instanceof Element)) return;
      const link = target.closest('.lab-pagina-web-x-a');
      if (link && pagina.contains(link)) { seguiLink(link); return; }
      const t = tastoInfo();
      if (t.el && t.el.contains(target)) {
        if (stato.passo < 5) { narra('Il pulsante c\'è, ma il suo programma entra in scena al passo **5 · JavaScript**: premi **Avanti ›** o il passo 5.'); return; }
        premiTasto();
        return;
      }
      if (target.closest('.lab-pagina-web-x-button')) narra(MOTIVI[t.nodo ? 'altro-tasto' : 'senza-tasto']);
    }
    pagina.addEventListener('click', (e) => premi(e.target));
    pagina.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('lab-pagina-web-x-a')) { e.preventDefault(); seguiLink(e.target); }
    });

    /* ---------- l'ispettore: albero, pagina e codice si indicano a vicenda ---------- */

    function pulisciIndica() {
      radice.querySelectorAll('.is-indicato').forEach((x) => x.classList.remove('is-indicato'));
      stato.indicato = null;
    }
    function indica(id) {
      if (stato.indicato === id) return;
      pulisciIndica();
      const a = stato.analisi;
      if (id == null || !a || stato.passo < 3) { if (a && stato.passo >= 3 && !stato.animando) letturaBase(); return; }
      const n = a.nodi[id];
      if (!n) return;
      stato.indicato = id;
      const li = mappaAlbero.get(id);
      if (li) li.classList.add('is-indicato');
      const pe = mappaPagina.get(id);
      if (pe && stato.passo >= 4) pe.classList.add('is-indicato');
      const tk = n.tipo === 'testo' ? (n.tokens || []) : [n.token, n.tokenFine].filter((k) => k >= 0);
      if (!stato.modifica && a.testo === stato.testo) {
        for (const k of tk) if (spanToken[k]) spanToken[k].classList.add('is-indicato');
        if (tk.length && spanToken[tk[0]]) scorriDentro(codiceBox, spanToken[tk[0]]);
      }
      if (stato.animando && stato.passo === 3) return;
      lettura.hidden = false;
      const rigaN = tk.length ? riga(a.testo, a.token[tk[0]].inizio) : null;
      const figli = n.figli.filter((f) => !(f.tipo === 'testo' && f.spazio)).length;
      if (n.tipo === 'documento') lettura.replaceChildren(h('span', { class: 'lab-pagina-web-n' }, 'documento'), ': la radice dell\'albero, da cui parte tutto.');
      else if (n.tipo === 'testo') lettura.replaceChildren('Testo ', h('span', { class: 'lab-pagina-web-t' }, '«' + abbrevia(n.testo, 40) + '»'), rigaN ? ', riga ' + rigaN : '', ': una foglia, non ha figli.');
      else if (n.tipo !== 'elemento') lettura.replaceChildren(descrivi(n) + (rigaN ? ', riga ' + rigaN : '') + '.');
      else {
        lettura.replaceChildren(h('span', { class: 'lab-pagina-web-n' }, '<' + n.nome + '>'),
          n.implicito ? ' non è scritto nel testo: l\'ha aggiunto il browser' : ', riga ' + rigaN,
          ' · ' + (figli === 1 ? '1 figlio' : figli + ' figli') + (pe && stato.passo >= 4 ? ' · evidenziato nella pagina' : '') + '.');
      }
    }
    alberoUl.addEventListener('keydown', (e) => {
      const voci = Array.from(alberoUl.querySelectorAll('[role="treeitem"]'));
      const i = voci.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowDown') j = Math.min(voci.length - 1, i + 1);
      else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = voci.length - 1;
      else if (e.key === 'ArrowLeft') { const p = voci[i].parentElement.closest('[role="treeitem"]'); if (p) j = voci.indexOf(p); }
      else if (e.key === 'ArrowRight') { const c = voci[i].querySelector(':scope > ul > [role="treeitem"]'); if (c) j = voci.indexOf(c); }
      else return;
      e.preventDefault();
      if (j != null && voci[j]) voci[j].focus();
    });
    alberoUl.addEventListener('focusin', (e) => {
      const li = e.target.closest('[role="treeitem"]');
      if (!li) return;
      stato.focoAlbero = Number(li.dataset.n);
      alberoUl.querySelectorAll('[role="treeitem"]').forEach((v) => v.setAttribute('tabindex', v === li ? '0' : '-1'));
      scorriDentro(alberoScroll, li.querySelector('.lab-pagina-web-riga'));
      indica(stato.focoAlbero);
    });
    alberoUl.addEventListener('focusout', (e) => {
      if (e.relatedTarget && alberoUl.contains(e.relatedTarget)) return;
      stato.focoAlbero = null;
      indica(null);
    });
    alberoUl.addEventListener('mouseover', (e) => {
      const li = e.target.closest('[role="treeitem"]');
      if (li) indica(Number(li.dataset.n));
    });
    alberoUl.addEventListener('mouseleave', () => indica(stato.focoAlbero));
    alberoUl.addEventListener('click', (e) => {
      const li = e.target.closest('[role="treeitem"]');
      if (li) li.focus();
    });
    pagina.addEventListener('mouseover', (e) => {
      const x = e.target instanceof Element ? e.target.closest('[data-n]') : null;
      const link = e.target instanceof Element ? e.target.closest('.lab-pagina-web-x-a') : null;
      if (link && stato.analisi) {
        const n = stato.analisi.nodi[Number(link.dataset.n)];
        const href = n ? n.attributi.href : '';
        barraLink(href ? 'Collegamento a ' + href : 'Collegamento senza indirizzo');
      } else barraLink(null);
      if (!x || !pagina.contains(x)) return;
      const id = Number(x.dataset.n);
      indica(id);
      scorriDentro(alberoScroll, mappaAlbero.get(id));
    });
    pagina.addEventListener('mouseleave', () => { barraLink(null); indica(stato.focoAlbero); });
    pagina.addEventListener('focusin', (e) => {
      const x = e.target.closest('[data-n]');
      if (x) indica(Number(x.dataset.n));
    });
    pagina.addEventListener('focusout', () => indica(stato.focoAlbero));
    codice.addEventListener('mouseover', (e) => {
      const sp = e.target instanceof Element ? e.target.closest('[data-t]') : null;
      if (!sp || stato.passo < 3 || stato.animando) return;
      const id = nodoDiToken.get(Number(sp.dataset.t));
      if (id != null) indica(id);
    });
    codice.addEventListener('mouseleave', () => indica(stato.focoAlbero));

    /* ---------- modificare l'HTML ---------- */

    function aggiornaContatore() {
      const n = area.value.length;
      contatore.textContent = n + ' / ' + LIMITI.caratteri + ' caratteri';
      contatore.classList.toggle('is-quasi', n > LIMITI.caratteri * 0.9 && n <= LIMITI.caratteri);
      contatore.classList.toggle('is-oltre', n > LIMITI.caratteri);
    }
    function mostraErrore(t) {
      erroreEd.hidden = false;
      erroreEd.replaceChildren(ctx.inline(t));
      area.setAttribute('aria-invalid', 'true');
    }
    function nascondiErrore() {
      erroreEd.hidden = true;
      erroreEd.textContent = '';
      area.removeAttribute('aria-invalid');
    }
    function entraModifica() {
      if (stato.modifica) return;
      stato.modifica = true;
      pulisciIndica();
      area.value = stato.testo;
      nascondiErrore();
      aggiornaContatore();
      codiceWrap.hidden = true;
      editor.hidden = false;
      btnModifica.hidden = true;
      aggiornaComandi();
      area.focus();
      narra('Cambia il testo di `ciao.html`: aggiungi un paragrafo con `<p>…</p>`, un collegamento con `<a href="…">…</a>`, o togli `<html>`, `<head>` e `<body>` per vedere il browser rimetterli da solo. Poi premi **Ricostruisci la pagina**.');
    }
    function esciModifica() {
      stato.modifica = false;
      editor.hidden = true;
      codiceWrap.hidden = false;
      btnModifica.hidden = false;
      nascondiErrore();
      aggiornaComandi();
    }
    function annullaModifica() {
      esciModifica();
      if (!stato.animando) disegnaSorgente();
      btnModifica.focus();
      ctx.annuncia('Modifiche annullate.');
    }
    function aggiungi(k) {
      const r = inserisciFrammento(area.value, FRAMMENTI[k]);
      area.value = r.testo;
      aggiornaContatore();
      nascondiErrore();
      area.focus();
      area.setSelectionRange(r.inizio, r.fine);
      ctx.annuncia('Aggiunto un ' + NOMI_FRAMMENTI[k] + ' prima di </body>. Premi Ricostruisci la pagina.');
    }
    function ripristinaBozza() {
      area.value = ESEMPIO;
      aggiornaContatore();
      nascondiErrore();
      area.focus();
      ctx.annuncia('Rimesso il testo originale. Premi Ricostruisci la pagina.');
    }
    function ricostruisci() {
      const r = analizzaVera(area.value);
      if (!r.ok) { mostraErrore(r.errore); area.focus(); return; }
      stato.testo = area.value;
      esciModifica();
      btnModifica.focus();
      rifai();
    }
    function ripristinaSubito() {
      stato.testo = ESEMPIO;
      btnModifica.focus();
      rifai();
    }
    async function rifai() {
      interrompi();
      const ep = stato.epoca;
      stato.analisi = null;
      stato.clic = 0;
      applicaFino(2);
      stato.inCorsa = true;
      try {
        for (const n of [3, 4]) {
          stato.passo = n;
          stato.animando = true;
          aggiornaComandi();
          await animaPasso(n, ep);
          stato.animando = false;
          if (n === 3) await aspetta(ctx.riduci ? 0 : D.lenta, ep);
        }
        if (stato.visto5) { stato.passo = 5; mostraJs(true); barraStato(testoBarra(5)); }
        const corr = stato.analisi.avvisi.filter((v) => v.tipo === 'correzione').length;
        narra('**Pagina ricostruita.** Il browser ha riletto il testo (passo 3) e ha ridisegnato la pagina (passo 4). In un browser vero salveresti il file sul server e ricaricheresti la pagina: richiesta e risposta ripartirebbero da capo.',
          corr ? 'Il browser ha corretto ' + (corr === 1 ? 'un errore' : corr + ' errori') + ' senza fermarsi: leggi gli avvisi sotto il codice.' : null,
          !stato.visto5 ? null : tastoInfo().el ? 'Anche il programma è ripartito: `clic` torna a zero.' : MOTIVI['senza-tasto']);
      } catch (err) { silenzia(err); } finally {
        if (vivo(ep)) { stato.inCorsa = false; stato.animando = false; aggiornaComandi(); }
      }
    }
    area.addEventListener('input', () => { aggiornaContatore(); if (!erroreEd.hidden) nascondiErrore(); });
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ricostruisci(); }
    });

    /* ---------- si parte ---------- */

    applicaFino(0);
    narra(...testoPasso(0));
    return {};
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
  if (root.ProgStoria) root.ProgStoria.lab('pagina-web', { titolo: 'Come nasce una pagina web', css: css, monta: monta });
})(typeof window !== 'undefined' ? window : globalThis);
