/*
 * Storia della programmazione: gli schermi d'epoca del «Ciao, mondo».
 *
 * Ogni capitolo mostra il suo «Ciao, mondo» sul supporto del tempo: le schede del telaio,
 * il nastro di Turing, il tubo di Williams, la telescrivente, il foglio di codifica FORTRAN,
 * la scheda IBM, il tabulato, il terminale, l'home computer, il Macintosh, il browser,
 * l'editor e la chat con un modello linguistico.
 *
 * L'animazione parte quando lo schermo entra in vista e si sospende quando esce (usa
 * l'orologio del motore). Con il movimento ridotto si vede subito il risultato.
 * La scena animata è nascosta ai lettori di schermo, che ricevono lo stesso contenuto come testo.
 * Le parti pure (carattere 5×7, codice telegrafico, colorazione del codice, controllo dei dati)
 * sono esportate per i test.
 */
(function (root) {
  'use strict';

  /* ---------- carattere bitmap 5×7: lo usano telaio, tubo di Williams e home computer ---------- */

  const FONT = {
    ' ': '00000 00000 00000 00000 00000 00000 00000',
    A: '01110 10001 10001 11111 10001 10001 10001',
    B: '11110 10001 10001 11110 10001 10001 11110',
    C: '01110 10001 10000 10000 10000 10001 01110',
    D: '11100 10010 10001 10001 10001 10010 11100',
    E: '11111 10000 10000 11110 10000 10000 11111',
    F: '11111 10000 10000 11110 10000 10000 10000',
    G: '01110 10001 10000 10111 10001 10001 01111',
    H: '10001 10001 10001 11111 10001 10001 10001',
    I: '01110 00100 00100 00100 00100 00100 01110',
    J: '00111 00010 00010 00010 00010 10010 01100',
    K: '10001 10010 10100 11000 10100 10010 10001',
    L: '10000 10000 10000 10000 10000 10000 11111',
    M: '10001 11011 10101 10101 10001 10001 10001',
    N: '10001 10001 11001 10101 10011 10001 10001',
    O: '01110 10001 10001 10001 10001 10001 01110',
    P: '11110 10001 10001 11110 10000 10000 10000',
    Q: '01110 10001 10001 10001 10101 10010 01101',
    R: '11110 10001 10001 11110 10100 10010 10001',
    S: '01111 10000 10000 01110 00001 00001 11110',
    T: '11111 00100 00100 00100 00100 00100 00100',
    U: '10001 10001 10001 10001 10001 10001 01110',
    V: '10001 10001 10001 10001 10001 01010 00100',
    W: '10001 10001 10001 10101 10101 10101 01010',
    X: '10001 10001 01010 00100 01010 10001 10001',
    Y: '10001 10001 10001 01010 00100 00100 00100',
    Z: '11111 00001 00010 00100 01000 10000 11111',
    0: '01110 10001 10011 10101 11001 10001 01110',
    1: '00100 01100 00100 00100 00100 00100 01110',
    2: '01110 10001 00001 00010 00100 01000 11111',
    3: '11111 00010 00100 00010 00001 10001 01110',
    4: '00010 00110 01010 10010 11111 00010 00010',
    5: '11111 10000 11110 00001 00001 10001 01110',
    6: '00110 01000 10000 11110 10001 10001 01110',
    7: '11111 00001 00010 00100 01000 01000 01000',
    8: '01110 10001 10001 01110 10001 10001 01110',
    9: '01110 10001 10001 01111 00001 00010 01100',
    '.': '00000 00000 00000 00000 00000 01100 01100',
    ',': '00000 00000 00000 00000 01100 00100 01000',
    '!': '00100 00100 00100 00100 00100 00000 00100',
    '?': '01110 10001 00001 00010 00100 00000 00100',
    '"': '01010 01010 01010 00000 00000 00000 00000',
    "'": '00100 00100 01000 00000 00000 00000 00000',
    ':': '00000 01100 01100 00000 01100 01100 00000',
    ';': '00000 01100 01100 00000 01100 00100 01000',
    '-': '00000 00000 00000 11111 00000 00000 00000',
    '+': '00000 00100 00100 11111 00100 00100 00000',
    '*': '00000 00100 10101 01110 10101 00100 00000',
    '/': '00000 00001 00010 00100 01000 10000 00000',
    '=': '00000 00000 11111 00000 11111 00000 00000',
    '(': '00010 00100 01000 01000 01000 00100 00010',
    ')': '01000 00100 00010 00010 00010 00100 01000',
    '<': '00010 00100 01000 10000 01000 00100 00010',
    '>': '01000 00100 00010 00001 00010 00100 01000',
    '$': '00100 01111 10100 01110 00101 11110 00100',
    '#': '01010 01010 11111 01010 11111 01010 01010',
    '%': '11000 11001 00010 00100 01000 10011 00011',
    '&': '01100 10010 10100 01000 10101 10010 01101',
    '@': '01110 10001 00001 01101 10101 10101 01110',
    _: '00000 00000 00000 00000 00000 00000 11111',
  };

  // Le righe di ogni lettera come numeri a 5 bit (il bit 16 è la colonna di sinistra).
  const GLIFI = {};
  for (const c of Object.keys(FONT)) GLIFI[c] = FONT[c].split(' ').map((r) => parseInt(r, 2));

  function normalizza(testo) {
    return String(testo == null ? '' : testo).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  }

  // Solo i caratteri che il carattere 5×7 sa disegnare; gli altri diventano spazi.
  function perFont(testo) {
    return [...normalizza(testo)].map((c) => (c === '\n' || FONT[c] ? c : ' ')).join('');
  }

  // Una riga di testo come matrice di bit: 7 righe, 6 colonne per lettera (una è lo spazio).
  function bitmap(testo) {
    const lettere = [...perFont(testo).replace(/\n/g, ' ')];
    const larga = Math.max(0, lettere.length * 6 - 1);
    const righe = Array.from({ length: 7 }, () => new Array(larga).fill(0));
    lettere.forEach((c, i) => {
      GLIFI[c].forEach((r, y) => {
        for (let x = 0; x < 5; x++) if (r & (16 >> x)) righe[y][i * 6 + x] = 1;
      });
    });
    return righe;
  }

  // Divide un testo in righe di al massimo `max` caratteri, senza spezzare le parole se si può.
  function aCapo(testo, max) {
    const out = [];
    let riga = '';
    for (let p of String(testo).trim().split(/\s+/).filter(Boolean)) {
      while (p.length > max) {
        if (riga) { out.push(riga); riga = ''; }
        out.push(p.slice(0, max));
        p = p.slice(max);
      }
      if (!p) continue;
      if (!riga) riga = p;
      else if (riga.length + 1 + p.length <= max) riga += ' ' + p;
      else { out.push(riga); riga = p; }
    }
    if (riga) out.push(riga);
    return out;
  }

  /* ---------- codice telegrafico a 5 fori (ITA2) per il nastro della telescrivente ---------- */

  const ITA2_LETTERE = {
    A: '11000', B: '10011', C: '01110', D: '10010', E: '10000', F: '10110', G: '01011', H: '00101', I: '01100',
    J: '11010', K: '11110', L: '01001', M: '00111', N: '00110', O: '00011', P: '01101', Q: '11101', R: '01010',
    S: '10100', T: '00001', U: '11100', V: '01111', W: '11001', X: '10111', Y: '10101', Z: '10001',
  };
  const ITA2_CIFRE = {
    '-': '11000', '?': '10011', ':': '01110', 3: '10000', 8: '01100', '(': '11110', ')': '01001', '.': '00111',
    ',': '00110', 9: '00011', 0: '01101', 1: '11101', 4: '01010', "'": '10100', 5: '00001', 7: '11100',
    '=': '01111', 2: '11001', '/': '10111', 6: '10101', '+': '10001',
  };
  const ITA2 = { spazio: '00100', ritorno: '00010', avanza: '01000', cifre: '11011', lettere: '11111', vuoto: '00000' };

  // Restituisce i gruppi di fori (bit 1 per primo) e, per ognuno, la riga del testo da cui viene.
  function ita2(testo) {
    const codici = [ITA2.lettere];
    const righe = [0];
    let modo = 'lettere';
    let riga = 0;
    const metti = (c) => { codici.push(c); righe.push(riga); };
    for (const c of normalizza(testo)) {
      if (c === '\n') { metti(ITA2.ritorno); metti(ITA2.avanza); riga++; continue; }
      if (c === ' ') { metti(ITA2.spazio); continue; }
      if (ITA2_LETTERE[c]) {
        if (modo !== 'lettere') { metti(ITA2.lettere); modo = 'lettere'; }
        metti(ITA2_LETTERE[c]);
      } else if (ITA2_CIFRE[c]) {
        if (modo !== 'cifre') { metti(ITA2.cifre); modo = 'cifre'; }
        metti(ITA2_CIFRE[c]);
      } else metti(ITA2.vuoto);
    }
    return { codici: codici, righe: righe };
  }

  /* ---------- colorazione essenziale del codice (editor e chat) ---------- */

  const CHIAVI = new Set(('fn let mut pub use mod impl struct enum match if else for while loop return in as const static ' +
    'func package import var def class print printf int void char new function true false nil null None True False self ' +
    'async await type go defer range interface extends public private protected try catch finally throw raise elif ' +
    'from lambda with yield break continue do switch case default where').split(' '));

  // Divide una riga in pezzi [tipo, testo]: kw, str, com, num, fn, mac, tipo o '' (testo normale).
  function colora(riga, lingua) {
    const out = [];
    const re = /(\/\/.*$)|(#.*$)|("(?:[^"\\]|\\.)*"?)|('(?:[^'\\\n]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*!?)|(\s+)|([\s\S])/g;
    const resto = String(riga);
    let m;
    while ((m = re.exec(resto))) {
      if (m[1]) out.push(['com', m[1]]);
      else if (m[2]) out.push([lingua === 'python' || lingua === 'shell' ? 'com' : 'kw', m[2]]);
      else if (m[3] || m[4]) out.push(['str', m[3] || m[4]]);
      else if (m[5]) out.push(['num', m[5]]);
      else if (m[6]) {
        const w = m[6];
        if (w.endsWith('!')) out.push(['mac', w]);
        else if (CHIAVI.has(w)) out.push(['kw', w]);
        else if (/^\s*\(/.test(resto.slice(re.lastIndex))) out.push(['fn', w]);
        else if (/^[A-Z]/.test(w)) out.push(['tipo', w]);
        else out.push(['', w]);
      } else out.push(['', m[7] || m[8]]);
    }
    return out;
  }

  function linguaDi(file, codice) {
    const est = (String(file || '').match(/\.(\w+)$/) || [])[1];
    const nomi = { rs: 'Rust', go: 'Go', swift: 'Swift', py: 'Python', js: 'JavaScript', ts: 'TypeScript', kt: 'Kotlin', c: 'C', java: 'Java', rb: 'Ruby' };
    if (est && nomi[est]) return nomi[est];
    if (/print\(/.test(codice || '')) return 'Python';
    return '';
  }

  // Comandi del terminale: mostra il file (se c'è), poi i comandi, poi l'uscita.
  function passiTerminale(ciao, conFile) {
    const passi = [];
    const codice = String(ciao.codice || '').replace(/\s+$/, '');
    if (codice && conFile !== false) passi.push({ tipo: 'cmd', testo: 'cat ' + (ciao.file || 'programma') }, { tipo: 'out', testo: codice });
    for (const c of [].concat(ciao.comandi || [])) passi.push({ tipo: 'cmd', testo: String(c).replace(/^\s*[$%>]\s?/, '') });
    const uscita = String(ciao.uscita || '').replace(/\s+$/, '');
    if (uscita) passi.push({ tipo: 'out', testo: uscita });
    return passi;
  }

  // Ritmo di battitura «umano» ma ripetibile: dipende dal carattere e dalla posizione.
  function ritmo(c, i) {
    const base = 46 + ((i * 37) % 7) * 9;
    if (c === ' ') return base + 30;
    if (/[.,;:()"{}<>]/.test(c)) return base + 22;
    return base;
  }

  /* ---------- controllo dei dati di ogni schermo (lo usano i test) ---------- */

  function controlla(tipo, ciao) {
    const err = [];
    const c = ciao || {};
    const codice = String(c.codice || '');
    const serve = (k) => { if (!c[k] || !String(c[k]).trim()) err.push('manca ' + k); };
    switch (tipo) {
      case 'jacquard': {
        serve('uscita');
        const p = normalizza(c.uscita || '').trim();
        if (p.length > 8) err.push('uscita: al massimo 8 caratteri sul telaio');
        if ([...p].some((x) => !FONT[x])) err.push('uscita: carattere che il telaio non sa tessere');
        break;
      }
      case 'nastro':
        serve('uscita');
        if (String(c.uscita || '').trim().length > 12) err.push('uscita: al massimo 12 simboli sul nastro');
        break;
      case 'williams': {
        serve('uscita');
        const righe = aCapo(perFont(c.uscita || ''), 5);
        if (righe.length > 3) err.push('uscita: al massimo 3 righe da 5 lettere nel tubo');
        break;
      }
      case 'telescrivente': case 'foglio': case 'tabulato':
        serve('codice'); serve('uscita');
        break;
      case 'scheda': {
        serve('codice');
        if (/\n/.test(codice.trim())) err.push('codice: una scheda contiene una sola riga');
        if (codice.length > 80) err.push('codice: una scheda ha 80 colonne');
        const H = root.Hollerith;
        if (H && [...H.normalizza(codice)].some((x) => H.fori(x) === null)) err.push('codice: carattere che la perforatrice 029 non ha');
        break;
      }
      case 'terminale': case 'editor':
        serve('codice'); serve('uscita');
        if (c.comandi != null && !Array.isArray(c.comandi)) err.push('comandi deve essere un elenco di righe');
        break;
      case 'home':
        serve('codice'); serve('uscita');
        if (codice.split('\n').some((r) => r.trim() && !/^\s*\d+\s/.test(r))) err.push('codice: ogni riga BASIC inizia con il suo numero');
        break;
      case 'mac':
        serve('codice'); serve('uscita');
        break;
      case 'browser':
        serve('codice');
        if (!/<\w/.test(codice)) err.push('codice: serve una pagina HTML');
        break;
      case 'chat':
        serve('prompt'); serve('risposta'); serve('codice');
        break;
      default:
        err.push('schermo sconosciuto: ' + tipo);
    }
    return err;
  }

  const Schermi = { FONT: FONT, normalizza: normalizza, perFont: perFont, bitmap: bitmap, aCapo: aCapo, ita2: ita2, colora: colora, passiTerminale: passiTerminale, controlla: controlla };
  if (typeof module !== 'undefined' && module.exports) module.exports = Schermi;

  const P = root.ProgStoria;
  if (!P) return;

  /* ---------- regia comune: avvio in vista, «Salta», «Rivedi», movimento ridotto ---------- */

  function regista(corpo, ctx, opz) {
    const { h } = ctx;
    const scena = h('div', { class: 'pg-sc pg-sc-' + opz.tipo, 'aria-hidden': 'true' });
    corpo.replaceChildren(scena, h('div', { class: 'pg-sr' }, opz.descrizione));
    const film = opz.costruisci(scena);
    const btn = h('button', { type: 'button', class: 'pg-sc-btn' });
    const head = corpo.parentNode && corpo.parentNode.querySelector('.pg-ciao-head');
    if (head) head.append(btn); else corpo.prepend(btn);
    const testi = {
      pronto: ['▶ Avvia', 'Avvia l\'animazione'],
      gioca: ['Salta ⏭', 'Salta alla fine dell\'animazione'],
      fine: ['↻ Rivedi', 'Rivedi l\'animazione'],
    };
    let stato = 'pronto';
    let giro = 0;

    function imposta(nuovo) {
      stato = nuovo;
      btn.textContent = testi[stato][0];
      btn.setAttribute('aria-label', testi[stato][1]);
      scena.setAttribute('data-stato', stato);
    }

    async function avvia() {
      const mio = ++giro;
      ctx.annulla();
      film.azzera();
      if (ctx.riduci) { film.fine(); imposta('fine'); return; }
      imposta('gioca');
      try {
        await film.gioca();
      } catch (err) {
        if (ctx.annullato(err)) return;
        console.error(err);
      }
      if (mio !== giro) return;
      film.fine();
      imposta('fine');
    }

    function salta() {
      giro++;
      ctx.annulla();
      film.fine();
      imposta('fine');
    }

    btn.addEventListener('click', () => (stato === 'gioca' ? salta() : avvia()));
    film.azzera();
    imposta('pronto');

    if (ctx.riduci || !('IntersectionObserver' in root)) avvia();
    else {
      const io = new IntersectionObserver((voci) => {
        if (!voci.some((v) => v.isIntersecting)) return;
        io.disconnect();
        if (stato === 'pronto') avvia();
      }, { threshold: 0.35 });
      io.observe(scena);
    }
    return {};
  }

  // Scrive un testo carattere per carattere, a velocità costante (caratteri al secondo).
  function scorri(ctx, nodo, testo, cps) {
    const base = nodo.data;
    const n = testo.length;
    if (!n) return Promise.resolve();
    return ctx.anima({ durata: (n / cps) * 1000, easing: 'linear', aggiorna: (t) => { nodo.data = base + testo.slice(0, Math.round(t * n)); } });
  }

  // Batte un testo come una persona alla tastiera.
  async function batti(ctx, nodo, testo, scala) {
    for (let i = 0; i < testo.length; i++) {
      nodo.data += testo[i];
      await ctx.attendi(ritmo(testo[i], i) * (scala || 1));
    }
  }

  // Un contenitore che occupa già lo spazio del testo finale, così la pagina non salta.
  function strato(h, classe, finale) {
    const testo = document.createTextNode('');
    const cursore = h('span', { class: 'pg-sc-cursore' });
    const vivo = h('pre', { class: classe }, testo, cursore);
    const box = h('div', { class: 'pg-sc-strato' }, h('pre', { class: classe + ' pg-sc-fantasma' }, finale + ' '), vivo);
    return { box: box, testo: testo, cursore: cursore, vivo: vivo };
  }

  /* ---------- 1804 · le schede del telaio Jacquard ---------- */

  function jacquard(corpo, ciao, ctx) {
    const { h, s } = ctx;
    const parola = perFont(ciao.uscita || 'CIAO').replace(/\n/g, ' ').trim().slice(0, 8) || 'CIAO';
    const bm = bitmap(parola);
    const C = bm[0].length + 2;
    const vuota = () => new Array(C).fill(0);
    const righe = bm.map((r) => [0].concat(r, [0])).concat([vuota()]);
    const R = righe.length;
    const SCORTA = 2; // schede vuote in fondo alla catena, come sul telaio vero

    const cs = Math.max(6, Math.min(14, Math.floor(330 / C)));
    const mx = 26;
    const W = C * cs + mx * 2;
    const ch = Math.round(cs * 1.8);
    const passo = ch + 8;
    const yL = passo * 2 + 6;
    const yA = yL + ch + 5;
    const yT = yA + 26;
    const H = yT + R * cs + 12;
    const clip = ctx.uid('pg-sc-jq');
    const forato = (r, x) => righe[r][x] === 1;

    return regista(corpo, ctx, {
      tipo: 'jacquard',
      descrizione: 'Animazione: una catena di ' + R + ' schede perforate passa nel telaio. Dove la scheda ha un foro, ' +
        'l\'ago passa e alza un filo dell\'ordito; riga dopo riga, nel tessuto compare la scritta ' + parola + '.',
      costruisci(scena) {
        const catena = s('g', null);
        righe.concat(Array.from({ length: SCORTA }, vuota)).forEach((riga, i) => {
          const y = yL - i * passo;
          catena.append(s('g', null,
            i > 0 ? [
              s('line', { x1: 13, y1: y + ch, x2: 13, y2: y + passo, class: 'pg-sc-jq-laccio' }),
              s('line', { x1: W - 13, y1: y + ch, x2: W - 13, y2: y + passo, class: 'pg-sc-jq-laccio' }),
            ] : null,
            s('rect', { x: 5, y: y, width: W - 10, height: ch, rx: 2.5, class: 'pg-sc-jq-cartone' }),
            s('circle', { cx: 13, cy: y + ch / 2, r: 2.8, class: 'pg-sc-jq-occhiello' }),
            s('circle', { cx: W - 13, cy: y + ch / 2, r: 2.8, class: 'pg-sc-jq-occhiello' }),
            riga.map((b, x) => (b ? s('circle', { cx: mx + x * cs + cs / 2, cy: y + ch / 2, r: Math.max(1.6, cs * 0.3), class: 'pg-sc-jq-foro' }) : null))));
        });

        const aghi = [];
        const orditi = [];
        const file = [];
        const gAghi = s('g', null);
        const tessuto = s('g', null, s('rect', { x: mx, y: yT, width: C * cs, height: R * cs, class: 'pg-sc-jq-telaio' }));
        for (let x = 0; x < C; x++) {
          const cx = mx + x * cs + cs / 2;
          const ago = s('line', { x1: cx, y1: yA, x2: cx, y2: yA + 15, class: 'pg-sc-jq-ago' });
          aghi.push(ago);
          gAghi.append(ago);
          const filo = s('line', { x1: cx, y1: yT - 6, x2: cx, y2: yT + R * cs, class: 'pg-sc-jq-ordito' });
          orditi.push(filo);
          tessuto.append(filo);
        }
        for (let r = 0; r < R; r++) {
          const y = yT + r * cs;
          file.push(righe[r].map((b, x) => {
            const x0 = mx + x * cs;
            const g = s('g', { opacity: 0 },
              s('rect', { x: x0, y: y, width: cs, height: cs, class: b ? 'pg-sc-jq-su' : 'pg-sc-jq-giu' }),
              b ? s('line', { x1: x0 + cs / 2, y1: y + 1.5, x2: x0 + cs / 2, y2: y + cs - 1.5, class: 'pg-sc-jq-filo' })
                : s('line', { x1: x0 + 1.5, y1: y + cs / 2, x2: x0 + cs - 1.5, y2: y + cs / 2, class: 'pg-sc-jq-trama' }));
            tessuto.append(g);
            return g;
          }));
        }
        const navetta = s('path', { d: 'M0 0 l11 -4.5 h18 l11 4.5 l-11 4.5 h-18 z', class: 'pg-sc-jq-navetta', opacity: 0 });
        tessuto.append(navetta);

        const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'pg-sc-jq-svg' },
          s('defs', null, s('clipPath', { id: clip }, s('rect', { x: 0, y: 0, width: W, height: yL + ch + 2 }))),
          s('g', { 'clip-path': 'url(#' + clip + ')' }, catena),
          s('rect', { x: 1, y: yL - 4, width: W - 2, height: ch + 8, rx: 5, class: 'pg-sc-jq-lettore' }),
          gAghi, tessuto);

        const num = h('strong', null, '0');
        const nota = h('p', { class: 'pg-sc-jq-nota' });
        scena.append(h('div', { class: 'pg-sc-jq-quadro' }, svg),
          h('div', { class: 'pg-sc-jq-pannello' },
            h('p', { class: 'pg-sc-eti' }, 'Scheda'),
            h('p', { class: 'pg-sc-jq-conta' }, num, h('span', null, ' / ' + R)),
            nota,
            h('ul', { class: 'pg-sc-leg' },
              h('li', null, h('i', { class: 'pg-sc-jq-sw-foro' }), 'foro: l\'ago passa'),
              h('li', null, h('i', { class: 'pg-sc-jq-sw-su' }), 'filo dell\'ordito alzato'),
              h('li', null, h('i', { class: 'pg-sc-jq-sw-giu' }), 'filo della trama sopra'))));

        const catenaA = (v) => catena.setAttribute('transform', 'translate(0 ' + (v * passo).toFixed(2) + ')');
        const mostra = (r, fino) => file[r].forEach((g, x) => { if (x <= fino) g.setAttribute('opacity', 1); });
        const aghiSu = (r) => {
          aghi.forEach((a, x) => a.classList.toggle('passa', r >= 0 && forato(r, x)));
          orditi.forEach((o, x) => o.classList.toggle('alzato', r >= 0 && forato(r, x)));
        };
        const conta = (n, testo) => { num.textContent = String(n); nota.textContent = testo; };

        return {
          azzera() {
            catenaA(-1);
            aghiSu(-1);
            navetta.setAttribute('opacity', 0);
            file.forEach((riga) => riga.forEach((g) => g.setAttribute('opacity', 0)));
            conta(0, 'Ogni scheda comanda una riga del tessuto.');
          },
          fine() {
            catenaA(R - 1);
            aghiSu(-1);
            navetta.setAttribute('opacity', 0);
            file.forEach((riga) => riga.forEach((g) => g.setAttribute('opacity', 1)));
            conta(R, R + ' schede, ' + R + ' righe: nel tessuto è apparso ' + parola + '.');
          },
          async gioca() {
            await ctx.attendi(350);
            for (let r = 0; r < R; r++) {
              const k = r < 2 ? 1 : 0.62;
              await ctx.anima({ durata: 340 * k, easing: 'smooth', aggiorna: (t) => catenaA(r - 1 + t) });
              const fori = righe[r].filter(Boolean).length;
              conta(r + 1, fori ? fori + (fori === 1 ? ' foro: si alza 1 filo.' : ' fori: si alzano ' + fori + ' fili.') : 'Nessun foro: la trama copre la riga.');
              aghiSu(r);
              await ctx.attendi(260 * k);
              navetta.setAttribute('opacity', 1);
              const yN = yT + r * cs + cs / 2;
              await ctx.anima({
                durata: 560 * k,
                easing: 'linear',
                aggiorna: (t) => {
                  const xN = mx - 44 + t * (C * cs + 48);
                  navetta.setAttribute('transform', 'translate(' + xN.toFixed(1) + ' ' + yN + ')');
                  mostra(r, Math.floor((xN + 40 - mx) / cs));
                },
              });
              mostra(r, C);
              navetta.setAttribute('opacity', 0);
              aghiSu(-1);
              await ctx.attendi(90 * k);
            }
          },
        };
      },
    });
  }

  /* ---------- 1936 · il nastro della macchina di Turing ---------- */

  function nastro(corpo, ciao, ctx) {
    const { h, s } = ctx;
    const simboli = [...String(ciao.uscita || 'CIAO').replace(/\s+/g, ' ').trim()].slice(0, 12);
    const n = simboli.length;
    const prima = 2;
    const celle = n + prima + 2;
    const cw = 54;
    const W = celle * cw + cw;
    const yN = 96;
    const hN = 58;
    const H = yN + hN + 22;
    const x0 = cw / 2;
    const cx = (i) => x0 + i * cw + cw / 2;
    const idMask = ctx.uid('pg-sc-tm');
    const idGrad = ctx.uid('pg-sc-tmg');
    const vuoto = '□';
    const regole = simboli.map((c, k) => ({ stato: 'q' + k, scrive: c === ' ' ? vuoto : c, poi: k < n - 1 ? 'q' + (k + 1) : 'ALT' }));

    return regista(corpo, ctx, {
      tipo: 'nastro',
      descrizione: 'Animazione: la testina di una macchina di Turing parte dallo stato q0, scrive un simbolo per casella ' +
        'e si sposta a destra, finché arriva allo stato ALT. Sul nastro resta scritto ' + simboli.join('') + '.' +
        (ciao.codice ? ' Tavola delle regole: ' + ciao.codice : ''),
      costruisci(scena) {
        const separatori = [];
        for (let i = -1; i <= celle + 1; i++) separatori.push(s('line', { x1: x0 + i * cw, y1: yN, x2: x0 + i * cw, y2: yN + hN, class: 'pg-sc-tm-sep' }));
        const scritte = simboli.map((c, k) => s('text', {
          class: 'pg-sc-tm-simbolo', 'text-anchor': 'middle', 'dominant-baseline': 'central', opacity: 0,
          transform: 'translate(' + cx(prima + k) + ' ' + (yN + hN / 2) + ')',
        }, c === ' ' ? '' : c));
        const statoT = s('text', { x: 0, y: 47, 'text-anchor': 'middle', class: 'pg-sc-tm-stato' }, 'q0');
        const testa = s('g', { class: 'pg-sc-tm-testa' },
          s('rect', { x: -cw / 2 + 3, y: yN + 3, width: cw - 6, height: hN - 6, rx: 6, class: 'pg-sc-tm-fuoco' }),
          s('rect', { x: -38, y: 10, width: 76, height: 52, rx: 11, class: 'pg-sc-tm-corpo' }),
          s('text', { x: 0, y: 27, 'text-anchor': 'middle', class: 'pg-sc-tm-eti' }, 'STATO'),
          statoT,
          s('path', { d: 'M -10 61 L 10 61 L 0 82 Z', class: 'pg-sc-tm-corpo' }));
        const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'pg-sc-tm-svg' },
          s('defs', null,
            s('linearGradient', { id: idGrad, x1: 0, x2: 1, y1: 0, y2: 0 },
              s('stop', { offset: 0, 'stop-color': '#000' }), s('stop', { offset: 0.09, 'stop-color': '#fff' }),
              s('stop', { offset: 0.91, 'stop-color': '#fff' }), s('stop', { offset: 1, 'stop-color': '#000' })),
            s('mask', { id: idMask, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H },
              s('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#' + idGrad + ')' }))),
          s('g', { mask: 'url(#' + idMask + ')' },
            s('rect', { x: -2, y: yN, width: W + 4, height: hN, class: 'pg-sc-tm-carta' }),
            separatori, scritte),
          testa);

        let righeRegole = [];
        let tavola;
        const testoCodice = String(ciao.codice || '').replace(/\s+$/, '');
        if (testoCodice) {
          const linee = testoCodice.split('\n');
          const spans = linee.map((l) => h('span', null, l + '\n'));
          const candidati = spans.filter((sp, i) => /→|->/.test(linee[i]));
          righeRegole = candidati.length >= n ? candidati : [];
          tavola = h('pre', { class: 'pg-sc-tm-codice' }, spans);
        } else {
          righeRegole = regole.map((r) => h('tr', null, h('td', null, r.stato), h('td', null, vuoto), h('td', null, r.scrive), h('td', null, '→'), h('td', null, r.poi)));
          tavola = h('table', { class: 'pg-sc-tm-tab' },
            h('thead', null, h('tr', null, ['stato', 'legge', 'scrive', 'va', 'poi'].map((t) => h('th', null, t)))),
            h('tbody', null, righeRegole));
        }
        const msg = h('p', { class: 'pg-sc-tm-msg' });
        scena.append(svg,
          h('div', { class: 'pg-sc-tm-sotto' },
            h('div', { class: 'pg-sc-tm-tavola' }, h('p', { class: 'pg-sc-eti' }, 'Tavola delle regole'), tavola,
              h('p', { class: 'pg-sc-tm-leg' }, vuoto + ' casella vuota · → un passo a destra · ALT la macchina si ferma')),
            msg));

        const testaA = (v) => testa.setAttribute('transform', 'translate(' + cx(prima + v).toFixed(2) + ' 0)');
        const evidenzia = (k) => righeRegole.forEach((r, i) => r.classList.toggle('attiva', i === k));
        const simbolo = (k, p) => {
          scritte[k].setAttribute('opacity', Math.min(1, p * 1.6).toFixed(3));
          scritte[k].setAttribute('transform', 'translate(' + cx(prima + k) + ' ' + (yN + hN / 2) + ') scale(' + (1.7 - 0.7 * p).toFixed(3) + ')');
        };

        return {
          azzera() {
            testaA(0);
            statoT.textContent = 'q0';
            testa.classList.remove('ferma', 'legge');
            scritte.forEach((t, k) => simbolo(k, 0));
            evidenzia(-1);
            msg.textContent = 'La testina parte dallo stato q0, sulla prima casella vuota.';
          },
          fine() {
            testaA(n);
            statoT.textContent = 'ALT';
            testa.classList.remove('legge');
            testa.classList.add('ferma');
            scritte.forEach((t, k) => simbolo(k, 1));
            evidenzia(-1);
            msg.textContent = 'Stato ALT: la macchina si ferma. Sul nastro c\'è «' + simboli.join('') + '».';
          },
          async gioca() {
            await ctx.attendi(400);
            for (let k = 0; k < n; k++) {
              statoT.textContent = 'q' + k;
              evidenzia(k);
              msg.textContent = 'Stato q' + k + ': legge una casella vuota, scrive ' + regole[k].scrive + ' e va a destra.';
              testa.classList.add('legge');
              await ctx.attendi(300);
              testa.classList.remove('legge');
              await ctx.anima({ durata: 320, easing: 'bounce', aggiorna: (p) => simbolo(k, p) });
              await ctx.anima({ durata: 380, easing: 'smooth', aggiorna: (p) => testaA(k + p) });
              await ctx.attendi(110);
            }
          },
        };
      },
    });
  }

  /* ---------- 1948 · i punti di luce del tubo di Williams ---------- */

  function williams(corpo, ciao, ctx) {
    const { h, s } = ctx;
    const N = 32;
    const cs = 12;
    const pad = 22;
    const S = N * cs + pad * 2;
    const linee = aCapo(perFont(ciao.uscita || 'CIAO').trim() || 'CIAO', 5).slice(0, 3);
    const bits = Array.from({ length: N }, () => new Array(N).fill(0));
    // Le prime righe contengono istruzioni: indirizzo nei bit 0-4, operazione nei bit 13-15, come sulla Baby.
    const PROGRAMMA = [[24, 2], [25, 4], [26, 3], [26, 2], [27, 3], [0, 7]];
    PROGRAMMA.forEach(([ind, op], i) => {
      for (let b = 0; b < 5; b++) bits[1 + i][b] = (ind >> b) & 1;
      for (let b = 0; b < 3; b++) bits[1 + i][13 + b] = (op >> b) & 1;
    });
    const programma = new Set(PROGRAMMA.map((_, i) => 1 + i));
    const alto = linee.length * 8 - 1;
    const y0 = Math.min(N - alto, Math.max(10, Math.floor((N - alto) / 2) + 3));
    linee.forEach((l, li) => {
      const bm = bitmap(l);
      const x0 = Math.floor((N - bm[0].length) / 2);
      bm.forEach((r, y) => r.forEach((b, x) => { if (b) bits[y0 + li * 8 + y][x0 + x] = 1; }));
    });
    const dati = [];
    for (let r = y0; r < y0 + alto; r++) dati.push(r);
    const valore = (r) => {
      let v = 0;
      for (let c = 0; c < N; c++) if (bits[r][c]) v += Math.pow(2, c);
      return bits[r][N - 1] ? v - Math.pow(2, N) : v;
    };
    const gruppi = (r) => bits[r].join('').replace(/(.{4})(?=.)/g, '$1 ');

    return regista(corpo, ctx, {
      tipo: 'williams',
      descrizione: 'Animazione: lo schermo del tubo di Williams mostra 32 righe di memoria da 32 bit; un punto vale 0, ' +
        'un trattino vale 1. In alto ci sono le istruzioni del programma, poi riga dopo riga vengono scritti i numeri ' +
        'che disegnano la scritta ' + linee.join(' ') + '.',
      costruisci(scena) {
        const punti = bits.map((riga, r) => riga.map(() => s('rect', { class: 'pg-sc-wt-bit', y: (pad + r * cs + cs / 2 - 1.6).toFixed(2), height: 3.2, rx: 1.6 })));
        const banda = s('rect', { x: pad - 6, width: N * cs + 12, height: cs, rx: 3, class: 'pg-sc-wt-banda', opacity: 0 });
        const raggio = s('circle', { r: 4.5, class: 'pg-sc-wt-raggio', opacity: 0 });
        const svg = s('svg', { viewBox: '0 0 ' + S + ' ' + S, class: 'pg-sc-wt-svg' }, banda, s('g', null, punti), raggio);
        const rRiga = h('p', { class: 'pg-sc-wt-riga' });
        const rBit = h('p', { class: 'pg-sc-wt-bits' });
        const rVal = h('p', { class: 'pg-sc-wt-val' });
        const rMsg = h('p', { class: 'pg-sc-wt-msg' });
        scena.append(
          h('div', { class: 'pg-sc-wt-tubo' }, h('div', { class: 'pg-sc-wt-vetro' }, svg)),
          h('div', { class: 'pg-sc-wt-pannello' },
            h('p', { class: 'pg-sc-eti' }, 'Memoria'), rRiga, rBit, rVal, rMsg,
            h('ul', { class: 'pg-sc-leg' },
              h('li', null, h('i', { class: 'pg-sc-wt-sw0' }), 'punto = 0'),
              h('li', null, h('i', { class: 'pg-sc-wt-sw1' }), 'trattino = 1'),
              h('li', null, h('i', { class: 'pg-sc-wt-swp' }), 'righe ' + (1) + '–' + PROGRAMMA.length + ': il programma'))));

        const imposta = (r, c, uno) => {
          const el = punti[r][c];
          const w = uno ? 9 : 3.2;
          el.setAttribute('width', w);
          el.setAttribute('x', (pad + c * cs + cs / 2 - w / 2).toFixed(2));
          el.classList.toggle('uno', !!uno);
          el.classList.toggle('prog', !!uno && programma.has(r));
        };
        const leggi = (r) => {
          rRiga.textContent = 'Riga ' + r;
          rBit.textContent = gruppi(r);
          rVal.textContent = '= ' + valore(r).toLocaleString('it-IT');
        };

        return {
          azzera() {
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) imposta(r, c, programma.has(r) ? bits[r][c] : 0);
            banda.setAttribute('opacity', 0);
            raggio.setAttribute('opacity', 0);
            rRiga.textContent = 'Riga —';
            rBit.textContent = '0000 0000 0000 0000 0000 0000 0000 0000';
            rVal.textContent = '= 0';
            rMsg.textContent = 'In memoria c\'è già il programma. Ora si scrivono i dati.';
          },
          fine() {
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) imposta(r, c, bits[r][c]);
            banda.setAttribute('opacity', 0);
            raggio.setAttribute('opacity', 0);
            leggi(dati[Math.floor(dati.length / 2)]);
            rMsg.textContent = dati.length + ' righe di numeri, letti come punti e trattini, disegnano «' + linee.join(' ') + '».';
          },
          async gioca() {
            await ctx.attendi(450);
            for (const r of dati) {
              leggi(r);
              rMsg.textContent = 'Il fascio di elettroni riscrive la riga ' + r + ', un bit dopo l\'altro.';
              const y = pad + r * cs + cs / 2;
              banda.setAttribute('y', (y - cs / 2).toFixed(2));
              banda.setAttribute('opacity', 1);
              raggio.setAttribute('opacity', 1);
              let fatti = 0;
              await ctx.anima({
                durata: 230,
                easing: 'linear',
                aggiorna: (t) => {
                  const fino = Math.floor(t * N);
                  raggio.setAttribute('cx', (pad + t * N * cs).toFixed(2));
                  raggio.setAttribute('cy', y.toFixed(2));
                  for (; fatti < fino; fatti++) imposta(r, fatti, bits[r][fatti]);
                },
              });
              for (; fatti < N; fatti++) imposta(r, fatti, bits[r][fatti]);
              await ctx.attendi(60);
            }
            banda.setAttribute('opacity', 0);
            raggio.setAttribute('opacity', 0);
          },
        };
      },
    });
  }

  /* ---------- 1949 · nastro perforato e telescrivente ---------- */

  function telescrivente(corpo, ciao, ctx) {
    const { h, s } = ctx;
    const codice = String(ciao.codice || '').replace(/\s+$/, '');
    const uscita = String(ciao.uscita || '').toUpperCase().replace(/\s+$/, '');
    const linee = codice ? codice.split('\n') : [];
    const { codici, righe } = ita2(codice);
    const passo = 11;
    const W = 760;
    const lettore = W / 2;
    const lungo = codici.length * passo;
    const traccia = [21, 33, 51, 63, 75];
    const guida = 42;

    return regista(corpo, ctx, {
      tipo: 'telescrivente',
      descrizione: 'Animazione: il nastro perforato con il programma passa nel lettore, poi la telescrivente stampa il risultato. ' +
        'Programma: ' + codice + '. Stampa: ' + uscita + '.',
      costruisci(scena) {
        const nastroG = s('g', null, s('rect', { x: lettore - 20 - lungo - 60, y: 8, width: lungo + 140, height: 76, class: 'pg-sc-tp-striscia' }));
        codici.forEach((cod, k) => {
          const x = lettore - 20 - k * passo;
          nastroG.append(s('circle', { cx: x, cy: guida, r: 1.7, class: 'pg-sc-tp-foro' }));
          for (let b = 0; b < 5; b++) if (cod[b] === '1') nastroG.append(s('circle', { cx: x, cy: traccia[b], r: 3.6, class: 'pg-sc-tp-foro' }));
        });
        const lampada = s('circle', { cx: lettore, cy: 4, r: 3.5, class: 'pg-sc-tp-lampada' });
        const svg = s('svg', { viewBox: '0 0 ' + W + ' 92', class: 'pg-sc-tp-svg' }, nastroG,
          s('rect', { x: lettore - 15, y: 0, width: 30, height: 92, rx: 4, class: 'pg-sc-tp-lettore' }),
          s('line', { x1: lettore, y1: 10, x2: lettore, y2: 82, class: 'pg-sc-tp-fessura' }), lampada);

        const spans = linee.map((l) => h('span', null, l + '\n'));
        const carta = strato(h, 'pg-sc-tp-stampa', uscita);
        carta.cursore.className = 'pg-sc-tp-testina';
        scena.append(
          h('div', { class: 'pg-sc-tp-alto' }, h('p', { class: 'pg-sc-eti' }, 'Nastro perforato · 5 fori per carattere'), h('div', { class: 'pg-sc-tp-nastro' }, svg)),
          h('div', { class: 'pg-sc-tp-sotto' },
            h('div', { class: 'pg-sc-tp-listato' }, h('p', { class: 'pg-sc-eti' }, 'Il programma'), h('pre', null, spans)),
            h('div', { class: 'pg-sc-tp-macchina' }, h('p', { class: 'pg-sc-eti' }, 'Telescrivente'), h('div', { class: 'pg-sc-tp-carta' }, carta.box))));

        const nastroA = (tx) => nastroG.setAttribute('transform', 'translate(' + tx.toFixed(1) + ' 0)');
        const evidenzia = (riga) => spans.forEach((sp, i) => {
          sp.classList.toggle('letta', i < riga);
          sp.classList.toggle('ora', i === riga);
        });

        return {
          azzera() {
            nastroA(0);
            evidenzia(-1);
            lampada.classList.remove('accesa');
            carta.testo.data = '';
          },
          fine() {
            nastroA(lungo + 40);
            evidenzia(linee.length);
            lampada.classList.remove('accesa');
            carta.testo.data = uscita;
          },
          async gioca() {
            await ctx.attendi(350);
            lampada.classList.add('accesa');
            await ctx.anima({
              durata: Math.max(1400, Math.min(3400, codici.length * 15)),
              easing: 'linear',
              aggiorna: (t) => {
                const tx = t * (lungo + 40);
                nastroA(tx);
                const k = Math.floor((tx - 20) / passo);
                if (k >= 0) evidenzia(righe[Math.min(k, righe.length - 1)]);
              },
            });
            evidenzia(linee.length);
            lampada.classList.remove('accesa');
            await ctx.attendi(350);
            for (const c of uscita) {
              carta.testo.data += c;
              await ctx.attendi(c === ' ' ? 70 : 95);
            }
          },
        };
      },
    });
  }

  /* ---------- 1957 · il foglio di codifica FORTRAN ---------- */

  function foglio(corpo, ciao, ctx) {
    const { h, s } = ctx;
    const linee = String(ciao.codice || '').replace(/\s+$/, '').split('\n').map((l) => l.replace(/\t/g, '      ').slice(0, 72));
    const lmax = Math.max(12, ...linee.map((l) => l.length));
    const N = Math.min(72, Math.max(36, lmax + 4));
    const cw = 15;
    const rh = 26;
    const mx = 16;
    const top = 80;
    const nr = Math.max(linee.length + 1, 5);
    const W = mx * 2 + N * cw;
    const H = top + nr * rh + 14;
    const uscita = String(ciao.uscita || '').replace(/\s+$/, '');
    const colX = (c) => mx + c * cw;

    return regista(corpo, ctx, {
      tipo: 'foglio',
      descrizione: 'Animazione: il programma viene scritto a matita sul foglio di codifica FORTRAN, un carattere per casella: ' +
        'colonne da 1 a 5 per il numero dell\'istruzione, 6 per la continuazione, dalla 7 in poi l\'istruzione. ' +
        'Programma: ' + linee.join(' / ') + '. Uscita: ' + uscita + '.',
      costruisci(scena) {
        const griglia = [];
        for (let c = 0; c <= N; c++) {
          const spessa = c === 5 || c === 6 || c === 0 || c === N;
          griglia.push(s('line', { x1: colX(c), y1: top, x2: colX(c), y2: top + nr * rh, class: spessa ? 'pg-sc-fg-spessa' : 'pg-sc-fg-sottile' }));
        }
        for (let r = 0; r <= nr; r++) griglia.push(s('line', { x1: colX(0), y1: top + r * rh, x2: colX(N), y2: top + r * rh, class: 'pg-sc-fg-riga' }));
        const numeri = [1, 5, 6, 7];
        for (let c = 10; c <= N; c += 5) numeri.push(c);
        const caratteri = [];
        linee.forEach((l, i) => {
          [...l].forEach((c, j) => {
            if (c === ' ') return;
            const x = colX(j) + cw / 2;
            const y = top + i * rh + rh * 0.7;
            const giro = (((i * 7 + j * 13) % 9) - 4) * 1.1;
            const el = s('text', { class: 'pg-sc-fg-car', 'text-anchor': 'middle', transform: 'translate(' + x + ' ' + y + ') rotate(' + giro.toFixed(1) + ')', opacity: 0 }, c === '0' ? 'Ø' : c);
            caratteri.push({ el: el, x: x, y: y, giro: giro });
          });
        });
        const matita = s('g', { class: 'pg-sc-fg-matita', opacity: 0 },
          s('path', { d: 'M0 0 L10 -4 L10 4 Z', class: 'pg-sc-fg-punta' }),
          s('path', { d: 'M0 0 L3.4 -1.4 L3.4 1.4 Z', class: 'pg-sc-fg-mina' }),
          s('rect', { x: 10, y: -4, width: 46, height: 8, class: 'pg-sc-fg-legno' }),
          s('rect', { x: 56, y: -4, width: 6, height: 8, class: 'pg-sc-fg-ghiera' }),
          s('rect', { x: 62, y: -4, width: 8, height: 8, rx: 2, class: 'pg-sc-fg-gomma' }));
        const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'pg-sc-fg-svg' },
          s('text', { x: mx, y: 24, class: 'pg-sc-fg-titolo' }, 'FORTRAN · MODULO DI CODIFICA'),
          s('text', { x: W - mx, y: 24, 'text-anchor': 'end', class: 'pg-sc-fg-campo' }, 'PAGINA 1 DI 1'),
          s('text', { x: mx, y: 42, class: 'pg-sc-fg-campo' }, 'PROGRAMMA'),
          s('text', { x: mx + 62, y: 43, class: 'pg-sc-fg-mano' }, 'CIAO MONDO'),
          s('rect', { x: colX(0), y: 52, width: N * cw, height: top - 52, class: 'pg-sc-fg-banda' }),
          s('text', { x: colX(2.5), y: 63, 'text-anchor': 'middle', class: 'pg-sc-fg-campo' }, 'N. ISTR.'),
          s('text', { x: colX(5.5), y: 63, 'text-anchor': 'middle', class: 'pg-sc-fg-campo' }, 'C'),
          s('text', { x: colX(7) + 4, y: 63, class: 'pg-sc-fg-campo' }, 'ISTRUZIONE FORTRAN'),
          s('text', { x: colX(N) - 4, y: 63, 'text-anchor': 'end', class: 'pg-sc-fg-campo' }, N < 72 ? '… FINO ALLA COLONNA 72' : ''),
          numeri.map((c) => s('text', { x: colX(c - 1) + cw / 2, y: top - 5, 'text-anchor': 'middle', class: 'pg-sc-fg-col' }, String(c))),
          griglia, caratteri.map((c) => c.el), matita);

        const stampa = h('p', { class: 'pg-sc-fg-uscita' }, h('span', { class: 'pg-sc-eti' }, 'Uscita della stampante'), h('code', null, uscita));
        scena.append(h('div', { class: 'pg-sc-fg-carta' }, svg),
          h('div', { class: 'pg-sc-fg-sotto' },
            h('p', { class: 'pg-sc-fg-nota' }, 'Colonne 1–5: numero dell\'istruzione · 6: continuazione · 7–72: istruzione · Ø: lo zero barrato, per non confonderlo con la lettera O'),
            stampa));

        const mostra = (c, p) => {
          c.el.setAttribute('opacity', p.toFixed(3));
          c.el.setAttribute('transform', 'translate(' + c.x + ' ' + c.y + ') rotate(' + c.giro.toFixed(1) + ') scale(' + (1.3 - 0.3 * p).toFixed(3) + ')');
        };
        return {
          azzera() {
            caratteri.forEach((c) => mostra(c, 0));
            matita.setAttribute('opacity', 0);
            stampa.classList.remove('visibile');
          },
          fine() {
            caratteri.forEach((c) => mostra(c, 1));
            matita.setAttribute('opacity', 0);
            stampa.classList.add('visibile');
          },
          async gioca() {
            await ctx.attendi(350);
            matita.setAttribute('opacity', 1);
            for (const c of caratteri) {
              matita.setAttribute('transform', 'translate(' + (c.x + 4) + ' ' + (c.y - 4) + ') rotate(-38)');
              await ctx.anima({ durata: 60, easing: 'sharp', aggiorna: (p) => mostra(c, p) });
              await ctx.attendi(22);
            }
            matita.setAttribute('opacity', 0);
            await ctx.attendi(300);
            stampa.classList.add('visibile');
            await ctx.attendi(400);
          },
        };
      },
    });
  }

  /* ---------- 1964 · una scheda perforata IBM a 80 colonne ---------- */

  function scheda(corpo, ciao, ctx) {
    const { h, s } = ctx;
    const Ho = root.Hollerith;
    const riga = String(ciao.codice || '').split('\n')[0];
    const card = Ho.scheda(riga);
    let lung = 0;
    card.forEach((c, i) => { if (c.carattere !== ' ') lung = i + 1; });
    const RIGHE = Ho.RIGHE;
    const X = (c) => 25.1 + c * 8.7;
    const Y = (i) => 25 + i * 25;
    const uscita = String(ciao.uscita || '').replace(/\s+$/, '');

    return regista(corpo, ctx, {
      tipo: 'scheda',
      descrizione: 'Animazione: una scheda IBM a 80 colonne viene perforata colonna per colonna; ogni carattere è una ' +
        'combinazione di fori nelle 12 righe e viene stampato sul bordo in alto. Scheda: ' + Ho.normalizza(riga).trim() + '. Uscita: ' + uscita + '.',
      costruisci(scena) {
        const cifre = [];
        for (let c = 0; c < 80; c++) for (let i = 2; i < 12; i++) cifre.push(s('text', { x: X(c), y: Y(i) + 2.5, 'text-anchor': 'middle', class: 'pg-sc-ibm-cifra' }, String(RIGHE[i])));
        const colonne = card.map((cel, c) => ({
          fori: (cel.fori || []).map((v) => s('rect', { x: X(c) - 2.75, y: Y(RIGHE.indexOf(v)) - 6.25, width: 5.5, height: 12.5, class: 'pg-sc-ibm-foro', opacity: 0 })),
          stampa: s('text', { x: X(c), y: 12, 'text-anchor': 'middle', class: 'pg-sc-ibm-stampa', opacity: 0 }, cel.carattere === ' ' ? '' : cel.carattere),
        }));
        const testina = s('rect', { y: 1, width: 8.7, height: 323, rx: 2, class: 'pg-sc-ibm-testina', opacity: 0 });
        const svg = s('svg', { viewBox: '-8 -8 754 341', class: 'pg-sc-ibm-svg' },
          s('path', { d: 'M18 0 H732 Q738 0 738 6 V319 Q738 325 732 325 H6 Q0 325 0 319 V18 Z', class: 'pg-sc-ibm-carta' }),
          cifre, colonne.map((c) => [c.fori, c.stampa]), testina);

        const colN = h('strong', null, '—');
        const grande = h('p', { class: 'pg-sc-ibm-car' }, ' ');
        const posti = RIGHE.map((v) => h('li', null, h('span', null, String(v))));
        const spiega = h('p', { class: 'pg-sc-ibm-fori' });
        const fuori = h('p', { class: 'pg-sc-ibm-uscita' }, h('span', { class: 'pg-sc-eti' }, 'Il calcolatore stampa'), h('code', null, uscita));
        scena.append(
          h('div', { class: 'pg-sc-ibm-tavolo' }, svg, uscita ? fuori : null),
          h('div', { class: 'pg-sc-ibm-lente' },
            h('p', { class: 'pg-sc-eti' }, 'Colonna ', colN),
            grande,
            h('ol', { class: 'pg-sc-ibm-pos' }, posti),
            spiega));

        const lente = (c) => {
          const cel = card[c];
          colN.textContent = String(c + 1);
          grande.textContent = cel.carattere === ' ' ? '␣' : cel.carattere;
          posti.forEach((li, i) => li.classList.toggle('forato', cel.fori.includes(RIGHE[i])));
          spiega.textContent = cel.fori.length ? 'Fori nelle righe ' + cel.fori.join(', ') + '.' : 'Nessun foro: è uno spazio.';
        };
        const ultima = () => { for (let c = lung - 1; c >= 0; c--) if (card[c].fori.length) return c; return 0; };
        const punzona = (c, on) => {
          colonne[c].fori.forEach((f) => { f.setAttribute('opacity', on ? 1 : 0); f.classList.toggle('nuovo', false); });
          colonne[c].stampa.setAttribute('opacity', on ? 1 : 0);
        };

        return {
          azzera() {
            for (let c = 0; c < 80; c++) punzona(c, false);
            testina.setAttribute('opacity', 0);
            fuori.classList.remove('visibile');
            lente(0);
          },
          fine() {
            for (let c = 0; c < 80; c++) punzona(c, true);
            testina.setAttribute('opacity', 0);
            fuori.classList.add('visibile');
            lente(ultima());
          },
          async gioca() {
            await ctx.attendi(350);
            testina.setAttribute('opacity', 1);
            for (let c = 0; c < lung; c++) {
              testina.setAttribute('x', (X(c) - 4.35).toFixed(2));
              lente(c);
              if (card[c].fori.length) {
                punzona(c, true);
                colonne[c].fori.forEach((f) => f.classList.add('nuovo'));
                await ctx.attendi(105);
              } else await ctx.attendi(30);
            }
            testina.setAttribute('opacity', 0);
            await ctx.attendi(300);
            fuori.classList.add('visibile');
          },
        };
      },
    });
  }

  /* ---------- 1970 · il tabulato a modulo continuo ---------- */

  function tabulato(corpo, ciao, ctx) {
    const { h } = ctx;
    const listato = String(ciao.codice || '').replace(/\s+$/, '').split('\n');
    const uscita = String(ciao.uscita || '').replace(/\s+$/, '').split('\n');
    const righe = listato.map((r, i) => String(i + 1).padStart(4, ' ') + '   ' + r).concat(['', ''], uscita);
    const VIS = 13;
    const STAMPA = VIS - 4;
    const LEAD = VIS;

    return regista(corpo, ctx, {
      tipo: 'tabulato',
      descrizione: 'Animazione: la stampante a righe stampa sul modulo continuo il listato del programma, una riga alla volta, ' +
        'e poi il risultato. Listato: ' + listato.join(' / ') + '. Uscita: ' + uscita.join(' / ') + '.',
      costruisci(scena) {
        const carta = h('div', { class: 'pg-sc-lp-carta' });
        const slot = [];
        for (let i = 0; i < LEAD + righe.length + 3; i++) {
          const d = h('div', { class: 'pg-sc-lp-riga' });
          slot.push(d);
          carta.append(d);
        }
        scena.append(h('div', { class: 'pg-sc-lp-finestra' }, carta, h('div', { class: 'pg-sc-lp-meccanica' }, h('span', null))));
        const cartaA = (v) => { carta.style.transform = 'translateY(calc(var(--pg-sc-lh) * ' + (STAMPA - (LEAD + v)).toFixed(3) + '))'; };
        const scrivi = (i, nuova) => {
          const d = slot[LEAD + i];
          d.textContent = righe[i];
          d.classList.toggle('uscita', i >= listato.length + 2);
          if (nuova) { d.classList.remove('nuova'); void d.offsetWidth; d.classList.add('nuova'); }
        };
        return {
          azzera() {
            slot.forEach((d) => { d.textContent = ''; d.classList.remove('nuova', 'uscita'); });
            cartaA(-1);
          },
          fine() {
            righe.forEach((_, i) => scrivi(i, false));
            cartaA(righe.length - 1);
          },
          async gioca() {
            await ctx.attendi(350);
            for (let i = 0; i < righe.length; i++) {
              await ctx.anima({ durata: 120, easing: 'sharp', aggiorna: (t) => cartaA(i - 1 + t) });
              if (righe[i]) scrivi(i, true);
              await ctx.attendi(righe[i] ? 170 : 60);
            }
          },
        };
      },
    });
  }

  /* ---------- 1978 · il terminale a fosfori verdi ---------- */

  function testoTerminale(passi) {
    return passi.map((p) => (p.tipo === 'cmd' ? '$ ' + p.testo : p.testo)).join('\n') + '\n$ ';
  }

  async function giocaTerminale(ctx, nodo, passi) {
    for (const p of passi) {
      if (p.tipo === 'cmd') {
        nodo.data += '$ ';
        await ctx.attendi(380);
        await batti(ctx, nodo, p.testo);
        await ctx.attendi(260);
        nodo.data += '\n';
      } else {
        await ctx.attendi(140);
        await scorri(ctx, nodo, p.testo + '\n', 500);
      }
    }
    nodo.data += '$ ';
  }

  function terminale(corpo, ciao, ctx) {
    const { h } = ctx;
    const passi = passiTerminale(ciao);
    const finale = testoTerminale(passi);

    return regista(corpo, ctx, {
      tipo: 'terminale',
      descrizione: 'Animazione: su un terminale a fosfori verdi si mostra il file e si danno i comandi. ' + finale.replace(/\n/g, ' · '),
      costruisci(scena) {
        const vetro = strato(h, 'pg-sc-term-testo', finale);
        scena.append(h('div', { class: 'pg-sc-term-cornice' },
          h('div', { class: 'pg-sc-term-vetro' }, vetro.box),
          h('span', { class: 'pg-sc-term-marca' }, 'TERMINALE VIDEO'),
          h('span', { class: 'pg-sc-term-led' })));
        return {
          azzera() { vetro.testo.data = ''; },
          fine() { vetro.testo.data = finale; },
          gioca: () => giocaTerminale(ctx, vetro.testo, passi),
        };
      },
    });
  }

  /* ---------- 1982 · l'home computer collegato al televisore ---------- */

  function home(corpo, ciao, ctx) {
    const { h } = ctx;
    const COL = 40;
    const RIG = 25;
    const SFONDO = '#352879';
    const TESTO = '#8478e0';
    const linee = String(ciao.codice || '').replace(/\s+$/, '').split('\n').map((l) => l.trim()).filter(Boolean);
    const uscita = String(ciao.uscita || '').replace(/\s+$/, '');
    const ciclico = /\bGOTO\s*\d+/i.test(ciao.codice || '');
    const numero = ((linee[0] || '').match(/^\d+/) || ['10'])[0];

    const ops = [{ t: '\n    **** HOME COMPUTER BASIC ****\n\nREADY.\n', a: 650 }];
    for (const l of linee) ops.push({ t: l, batti: true }, { t: '\n', a: 280 });
    ops.push({ t: 'RUN', batti: true }, { t: '\n', a: 320 });
    if (ciclico) {
      for (let i = 0; i < 44; i++) ops.push({ t: uscita + '\n', a: 55 });
      ops.push({ t: '\nBREAK IN ' + numero + '\n', a: 220 });
    } else ops.push({ t: uscita + '\n', a: 260 });
    ops.push({ t: 'READY.\n', a: 0 });

    return regista(corpo, ctx, {
      tipo: 'home',
      descrizione: 'Animazione: sullo schermo blu di un home computer si scrive il programma BASIC ' + linee.join(' / ') +
        ', poi RUN. ' + (ciclico ? 'Il programma ripete all\'infinito la scritta ' + uscita + ' finché lo si interrompe.' : 'Il programma stampa ' + uscita + '.'),
      costruisci(scena) {
        const canvas = h('canvas', { width: COL * 8, height: RIG * 8, class: 'pg-sc-hc-video' });
        const g = canvas.getContext('2d');
        let buf;
        let cx = 0;
        let cy = 0;
        let acceso = true;
        let fermo = 0;

        const pulisci = () => { buf = Array.from({ length: RIG }, () => new Array(COL).fill(' ')); cx = 0; cy = 0; };
        const aCapoHC = () => {
          cx = 0;
          cy++;
          if (cy >= RIG) { buf.shift(); buf.push(new Array(COL).fill(' ')); cy = RIG - 1; }
        };
        const metti = (testo) => {
          for (const c of normalizza(testo)) {
            if (c === '\n') { aCapoHC(); continue; }
            buf[cy][cx] = GLIFI[c] ? c : '?';
            cx++;
            if (cx >= COL) aCapoHC();
          }
        };
        const disegna = () => {
          g.fillStyle = SFONDO;
          g.fillRect(0, 0, canvas.width, canvas.height);
          g.fillStyle = TESTO;
          for (let r = 0; r < RIG; r++) {
            for (let c = 0; c < COL; c++) {
              const glifo = GLIFI[buf[r][c]];
              if (buf[r][c] === ' ' || !glifo) continue;
              // tratti larghi due punti, come i caratteri degli home computer
              for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (glifo[y] & (16 >> x)) g.fillRect(c * 8 + 1 + x, r * 8 + y, 2, 1);
            }
          }
          if (acceso) g.fillRect(cx * 8, cy * 8, 8, 8);
        };
        const scrivi = (testo) => { metti(testo); acceso = true; fermo = 0; disegna(); };

        let acc = 0;
        ctx.ciclo((dt) => {
          acc += dt;
          fermo += dt;
          if (acc >= 330 && fermo > 400) { acc = 0; acceso = !acceso; disegna(); }
        });

        scena.append(h('div', { class: 'pg-sc-hc-tv' }, h('div', { class: 'pg-sc-hc-bordo' }, canvas), h('span', { class: 'pg-sc-hc-led' })));
        return {
          azzera() { pulisci(); disegna(); },
          fine() { pulisci(); for (const op of ops) metti(op.t); disegna(); },
          async gioca() {
            pulisci();
            disegna();
            await ctx.attendi(400);
            for (const op of ops) {
              if (op.batti) {
                for (let i = 0; i < op.t.length; i++) {
                  scrivi(op.t[i]);
                  await ctx.attendi(ritmo(op.t[i], i) * 1.15);
                }
              } else scrivi(op.t);
              if (op.a) await ctx.attendi(op.a);
            }
          },
        };
      },
    });
  }

  /* ---------- 1987 · un pulsante sul Macintosh ---------- */

  function mac(corpo, ciao, ctx) {
    const { h } = ctx;
    const script = String(ciao.codice || '').replace(/\s+$/, '');
    const messaggio = String(ciao.uscita || 'Ciao, mondo!');
    const FIN = { x: 226, y: 122, w: 272, h: 194 };
    const BOT = { x: FIN.x + 92, y: FIN.y + 20 + 96, w: 92, h: 26 };
    const DLG = { x: 112, y: 100, w: 288, h: 112 };
    const OK = { x: DLG.x + DLG.w - 20 - 66, y: DLG.y + DLG.h - 16 - 24, w: 66, h: 24 };
    const centro = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    const PARTENZA = { x: 96, y: 300 };
    const px = (r) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    const stile = (o) => Object.keys(o).map((k) => k + ':' + o[k]).join(';');

    return regista(corpo, ctx, {
      tipo: 'mac',
      descrizione: 'Animazione: sullo schermo in bianco e nero di un Macintosh c\'è lo script del pulsante «Saluta»: ' + script.replace(/\n/g, ' / ') +
        '. Il puntatore clicca il pulsante e compare una finestra con il messaggio «' + messaggio + '».',
      costruisci(scena) {
        const testo = document.createTextNode('');
        const bottone = h('span', { class: 'pg-sc-mac-bottone', style: stile(px({ x: BOT.x - FIN.x, y: BOT.y - FIN.y - 20, w: BOT.w, h: BOT.h })) }, 'Saluta');
        const zoom = [1, 2, 3, 4].map(() => h('span', { class: 'pg-sc-mac-zoom' }));
        const dialogo = h('div', { class: 'pg-sc-mac-dialogo', style: stile(px(DLG)) },
          h('span', { class: 'pg-sc-mac-icona' }, '!'),
          h('p', null, messaggio),
          h('span', { class: 'pg-sc-mac-ok', style: stile(px({ x: OK.x - DLG.x, y: OK.y - DLG.y, w: OK.w, h: OK.h })) }, 'OK'));
        const freccia = h('span', { class: 'pg-sc-mac-freccia', html: '<svg viewBox="0 0 13 21" width="13" height="21"><path d="M1 1 L1 16 L4.6 12.6 L7.2 18.8 L9.8 17.7 L7.3 11.7 L12 11.7 Z" fill="#000" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>' });
        const schermo = h('div', { class: 'pg-sc-mac-schermo' },
          h('div', { class: 'pg-sc-mac-menu' }, h('span', { class: 'pg-sc-mac-mela' }, '✱'), ['Archivio', 'Composizione', 'Vai', 'Strumenti', 'Oggetti'].map((m) => h('span', null, m))),
          h('div', { class: 'pg-sc-mac-fin', style: stile(px({ x: 14, y: 34, w: 280, h: 150 })) },
            h('div', { class: 'pg-sc-mac-titolo' }, h('i'), h('span', null, 'Script del pulsante «Saluta»')),
            h('pre', { class: 'pg-sc-mac-script' }, testo)),
          h('div', { class: 'pg-sc-mac-fin', style: stile(px(FIN)) },
            h('div', { class: 'pg-sc-mac-titolo' }, h('i'), h('span', null, 'Ciao')),
            h('div', { class: 'pg-sc-mac-carta' }, h('p', null, 'Premi il pulsante:'), bottone)),
          zoom, dialogo, freccia);
        const vetro = h('div', { class: 'pg-sc-mac-vetro' }, schermo);
        scena.append(h('div', { class: 'pg-sc-mac-cornice' }, vetro, h('span', { class: 'pg-sc-mac-fessura' })));

        const scala = () => { const w = vetro.clientWidth; if (w) schermo.style.transform = 'scale(' + (w / 512).toFixed(4) + ')'; };
        if ('ResizeObserver' in root) new ResizeObserver(scala).observe(vetro);
        requestAnimationFrame(scala);

        const puntatore = (p) => { freccia.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)'; };
        const tra = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        const nascondiZoom = () => zoom.forEach((z) => { z.style.display = 'none'; });

        return {
          azzera() {
            testo.data = '';
            dialogo.classList.remove('visibile');
            bottone.classList.remove('premuto');
            nascondiZoom();
            puntatore(PARTENZA);
          },
          fine() {
            testo.data = script;
            dialogo.classList.add('visibile');
            bottone.classList.remove('premuto');
            nascondiZoom();
            puntatore(centro(OK));
          },
          async gioca() {
            await ctx.attendi(350);
            await scorri(ctx, testo, script, 34);
            await ctx.attendi(350);
            await ctx.anima({ durata: 820, easing: 'smooth', aggiorna: (t) => puntatore(tra(PARTENZA, centro(BOT), t)) });
            await ctx.attendi(150);
            bottone.classList.add('premuto');
            await ctx.attendi(180);
            bottone.classList.remove('premuto');
            for (let i = 0; i < zoom.length; i++) {
              const t = (i + 1) / zoom.length;
              const r = { x: BOT.x + (DLG.x - BOT.x) * t, y: BOT.y + (DLG.y - BOT.y) * t, w: BOT.w + (DLG.w - BOT.w) * t, h: BOT.h + (DLG.h - BOT.h) * t };
              Object.assign(zoom[i].style, px(r), { display: 'block' });
              await ctx.attendi(55);
            }
            nascondiZoom();
            dialogo.classList.add('visibile');
            await ctx.attendi(500);
            await ctx.anima({ durata: 620, easing: 'smooth', aggiorna: (t) => puntatore(tra(centro(BOT), centro(OK), t)) });
          },
        };
      },
    });
  }

  /* ---------- 1991 · la prima pagina web ---------- */

  function browser(corpo, ciao, ctx) {
    const { h } = ctx;
    const html = String(ciao.codice || '').replace(/\s+$/, '');
    const indirizzo = ciao.file || 'ciao.html';
    const STILE = '<style>html{background:#c0c0c0}body{margin:14px 18px;color:#000;font:16px/1.35 Times,"Times New Roman",serif}' +
      'h1{font-size:1.65em;margin:.15em 0 .5em}a{color:#0000ee;pointer-events:none}p{margin:.6em 0}</style>';

    return regista(corpo, ctx, {
      tipo: 'browser',
      descrizione: 'Animazione: in un browser dei primi anni Novanta si scrive il sorgente HTML ' + html.replace(/\s+/g, ' ') +
        ' e il browser lo mostra come pagina.' + (ciao.uscita ? ' Si vede: ' + ciao.uscita + '.' : ''),
      costruisci(scena) {
        const src = strato(h, 'pg-sc-www-codice', html);
        const pagina = h('iframe', { class: 'pg-sc-www-pagina', sandbox: '', title: 'Anteprima della pagina', tabindex: '-1' });
        const barraCarica = h('span', null);
        const carica = h('div', { class: 'pg-sc-www-carica' }, barraCarica);
        const stato = h('p', { class: 'pg-sc-www-stato' }, 'Pronto.');
        scena.append(h('div', { class: 'pg-sc-www-finestra' },
          h('div', { class: 'pg-sc-www-barra' }, h('i'), h('span', null, 'Navigatore WWW — ' + indirizzo)),
          h('div', { class: 'pg-sc-www-menu' }, ['Documento', 'Modifica', 'Trova', 'Collegamenti', 'Aiuto'].map((m) => h('span', null, m))),
          h('div', { class: 'pg-sc-www-url' }, h('span', null, 'Indirizzo:'), h('code', null, indirizzo)),
          h('div', { class: 'pg-sc-www-corpo' },
            h('div', { class: 'pg-sc-www-src' }, h('p', { class: 'pg-sc-eti' }, 'Sorgente HTML'), h('div', { class: 'pg-sc-www-incavo' }, src.box)),
            h('div', { class: 'pg-sc-www-vista' }, h('p', { class: 'pg-sc-eti' }, 'Pagina'), h('div', { class: 'pg-sc-www-incavo pg-sc-www-schermo' }, pagina, carica))),
          stato));

        let caricata = false;
        const mostra = () => {
          if (!caricata) { pagina.srcdoc = '<!doctype html><meta charset="utf-8">' + STILE + html; caricata = true; }
          pagina.classList.add('visibile');
        };
        return {
          azzera() {
            src.testo.data = '';
            src.cursore.hidden = false;
            pagina.classList.remove('visibile');
            carica.classList.remove('attivo');
            stato.textContent = 'Pronto.';
          },
          fine() {
            src.testo.data = html;
            src.cursore.hidden = true;
            carica.classList.remove('attivo');
            mostra();
            stato.textContent = 'Fatto.';
          },
          async gioca() {
            await ctx.attendi(350);
            stato.textContent = 'Scrivo la pagina…';
            await scorri(ctx, src.testo, html, 80);
            src.cursore.hidden = true;
            await ctx.attendi(250);
            stato.textContent = 'Apro ' + indirizzo + '…';
            carica.classList.add('attivo');
            await ctx.anima({ durata: 700, easing: 'sharp', aggiorna: (t) => { barraCarica.style.transform = 'scaleX(' + t.toFixed(3) + ')'; } });
            carica.classList.remove('attivo');
            mostra();
            stato.textContent = 'Fatto.';
            await ctx.attendi(300);
          },
        };
      },
    });
  }

  /* ---------- 2015 · l'editor moderno con il terminale integrato ---------- */

  function editor(corpo, ciao, ctx) {
    const { h } = ctx;
    const file = ciao.file || 'main';
    const codice = String(ciao.codice || '').replace(/\s+$/, '');
    const linee = codice.split('\n');
    const nomeLingua = linguaDi(file, codice) || String(ciao.linguaggio || '');
    const lingua = nomeLingua.toLowerCase();
    const passi = passiTerminale(ciao, false);
    const finaleTerm = testoTerminale(passi);

    function pezzi(riga) {
      return colora(riga, lingua).map(([tipo, t]) => (tipo ? h('span', { class: 'pg-sc-k-' + tipo }, t) : t));
    }

    return regista(corpo, ctx, {
      tipo: 'editor',
      descrizione: 'Animazione: in un editor moderno si scrive il file ' + file + ': ' + codice.replace(/\n/g, ' / ') +
        '. Poi, nel terminale integrato: ' + finaleTerm.replace(/\n/g, ' · '),
      costruisci(scena) {
        const righe = linee.map((l) => h('li', null, h('code', null, pezzi(l))));
        const fantasma = h('ol', { class: 'pg-sc-ed-righe pg-sc-fantasma' }, linee.map((l) => h('li', null, h('code', null, l + ' '))));
        const lista = h('ol', { class: 'pg-sc-ed-righe' }, righe);
        const term = strato(h, 'pg-sc-ed-term-testo', finaleTerm);
        const posizione = h('span', null, 'Ln 1, Col 1');
        const cartella = String(ciao.cartella || 'ciao');
        scena.append(h('div', { class: 'pg-sc-ed-finestra' },
          h('div', { class: 'pg-sc-ed-barra' }, h('i'), h('i'), h('i'), h('span', null, cartella + ' — ' + file)),
          h('div', { class: 'pg-sc-ed-corpo' },
            h('nav', { class: 'pg-sc-ed-file' }, h('p', { class: 'pg-sc-eti' }, 'Esplora'),
              h('ul', null, h('li', { class: 'pg-sc-ed-dir' }, '▾ ' + cartella), h('li', { class: 'pg-sc-ed-att' }, file))),
            h('div', { class: 'pg-sc-ed-main' },
              h('div', { class: 'pg-sc-ed-schede' }, h('span', { class: 'pg-sc-ed-att' }, file)),
              h('div', { class: 'pg-sc-ed-codice pg-sc-strato' }, fantasma, lista),
              h('div', { class: 'pg-sc-ed-term' }, h('div', { class: 'pg-sc-ed-schede' }, h('span', { class: 'pg-sc-ed-att' }, 'Terminale'), h('span', null, 'Problemi')), term.box))),
          h('div', { class: 'pg-sc-ed-stato' }, h('span', null, '⎇ main'), nomeLingua ? h('span', null, nomeLingua) : null, posizione, h('span', null, 'UTF-8'))));

        const cursore = h('span', { class: 'pg-sc-cursore pg-sc-ed-caret' });
        const attiva = (i) => righe.forEach((li, k) => li.classList.toggle('pg-sc-ed-att', k === i));
        const pos = (i, c) => { posizione.textContent = 'Ln ' + (i + 1) + ', Col ' + (c + 1); };

        return {
          azzera() {
            righe.forEach((li) => li.firstChild.replaceChildren());
            attiva(0);
            righe[0].firstChild.append(cursore);
            term.testo.data = '';
            term.cursore.hidden = true;
            pos(0, 0);
          },
          fine() {
            righe.forEach((li, i) => li.firstChild.replaceChildren(...pezzi(linee[i])));
            attiva(-1);
            term.testo.data = finaleTerm;
            term.cursore.hidden = false;
            pos(linee.length - 1, linee[linee.length - 1].length);
          },
          async gioca() {
            await ctx.attendi(400);
            for (let i = 0; i < linee.length; i++) {
              const code = righe[i].firstChild;
              attiva(i);
              let scritto = '';
              const aggiorna = () => { code.replaceChildren(...pezzi(scritto), cursore); pos(i, scritto.length); };
              aggiorna();
              const parti = linee[i].match(/[A-Za-z_]\w*!?|\s+|[\s\S]/g) || [];
              for (const parte of parti) {
                // Le parole lunghe si completano da sole, come fa il completamento automatico.
                if (/^[A-Za-z_]\w{5,}!?$/.test(parte)) {
                  for (let k = 0; k < 3; k++) { scritto += parte[k]; aggiorna(); await ctx.attendi(ritmo(parte[k], k)); }
                  await ctx.attendi(160);
                  scritto += parte.slice(3);
                  aggiorna();
                  await ctx.attendi(120);
                } else if (/^\s+$/.test(parte) && !scritto.trim()) {
                  scritto += parte;
                  aggiorna();
                } else {
                  for (let k = 0; k < parte.length; k++) { scritto += parte[k]; aggiorna(); await ctx.attendi(ritmo(parte[k], k) * 0.9); }
                }
              }
              await ctx.attendi(150);
            }
            cursore.remove();
            attiva(-1);
            term.cursore.hidden = false;
            await ctx.attendi(350);
            await giocaTerminale(ctx, term.testo, passi);
          },
        };
      },
    });
  }

  /* ---------- 2023 · una conversazione con un modello linguistico ---------- */

  function chat(corpo, ciao, ctx) {
    const { h } = ctx;
    const domanda = String(ciao.prompt || '');
    const risposta = String(ciao.risposta || '');
    const codice = String(ciao.codice || '').replace(/\s+$/, '');
    const uscita = String(ciao.uscita || '').replace(/\s+$/, '');
    const nomeLingua = linguaDi(ciao.file, codice);
    const lingua = nomeLingua.toLowerCase();

    return regista(corpo, ctx, {
      tipo: 'chat',
      descrizione: 'Animazione: una conversazione con un modello linguistico. Domanda: ' + domanda + ' Risposta, scritta un token alla volta: ' +
        risposta + ' Codice: ' + codice + (uscita ? '. Eseguito, stampa: ' + uscita + '.' : '.'),
      costruisci(scena) {
        const input = strato(h, 'pg-sc-chat-input', domanda);
        input.cursore.className = 'pg-sc-cursore pg-sc-chat-caret';
        const invia = h('span', { class: 'pg-sc-chat-invia' }, '↑');
        const mio = h('div', { class: 'pg-sc-chat-msg pg-sc-chat-msg--io' }, domanda);
        const pensa = h('p', { class: 'pg-sc-chat-pensa' }, h('i'), h('i'), h('i'));
        const token = (risposta.match(/\s*\S+/g) || []).map((t) => h('span', { class: 'pg-sc-tok' }, t));
        const pezziCodice = [];
        const pre = h('pre', null, h('code', null, codice.split('\n').map((riga, i, tutte) => {
          const out = colora(riga, lingua).map(([tipo, t]) => {
            const el = h('span', { class: 'pg-sc-tok' + (tipo ? ' pg-sc-k-' + tipo : '') }, t);
            pezziCodice.push(el);
            return el;
          });
          return i < tutte.length - 1 ? out.concat('\n') : out;
        })));
        const play = h('span', { class: 'pg-sc-chat-play' }, '▶ Esegui');
        const out = h('pre', { class: 'pg-sc-chat-out' }, uscita);
        const blocco = h('figure', { class: 'pg-sc-chat-codice' }, h('figcaption', null, h('span', null, nomeLingua || 'codice'), h('span', null, 'Copia')), pre);
        const esegui = h('div', { class: 'pg-sc-chat-esegui' }, play, uscita ? out : null);
        const ia = h('div', { class: 'pg-sc-chat-msg pg-sc-chat-msg--ia' }, pensa, h('p', { class: 'pg-sc-chat-testo' }, token), codice ? blocco : null, codice ? esegui : null);
        scena.append(h('div', { class: 'pg-sc-chat-app' },
          h('div', { class: 'pg-sc-chat-testa' }, h('span', { class: 'pg-sc-chat-logo' }), h('span', null, 'Assistente'), h('span', { class: 'pg-sc-chat-mod' }, 'modello linguistico')),
          h('div', { class: 'pg-sc-chat-flusso' }, mio, ia),
          h('div', { class: 'pg-sc-chat-scrivi' }, input.box, invia)));

        const tutti = token.concat(pezziCodice);
        const vedi = (el, si) => el.classList.toggle('pg-sc-nascosto', !si);
        return {
          azzera() {
            input.testo.data = '';
            [mio, ia, pensa, blocco, esegui, out].forEach((el) => vedi(el, false));
            tutti.forEach((el) => { vedi(el, false); el.classList.remove('nuovo'); });
            play.classList.remove('premuto');
            invia.classList.remove('premuto');
          },
          fine() {
            input.testo.data = '';
            [mio, ia, blocco, esegui, out].forEach((el) => vedi(el, true));
            vedi(pensa, false);
            tutti.forEach((el) => { vedi(el, true); el.classList.remove('nuovo'); });
            play.classList.remove('premuto');
            invia.classList.remove('premuto');
          },
          async gioca() {
            await ctx.attendi(350);
            await batti(ctx, input.testo, domanda, 0.55);
            await ctx.attendi(300);
            invia.classList.add('premuto');
            await ctx.attendi(160);
            invia.classList.remove('premuto');
            input.testo.data = '';
            vedi(mio, true);
            mio.classList.add('pg-sc-entra');
            await ctx.attendi(420);
            vedi(ia, true);
            vedi(pensa, true);
            await ctx.attendi(1000);
            vedi(pensa, false);
            for (let i = 0; i < token.length; i++) {
              vedi(token[i], true);
              token[i].classList.add('nuovo');
              await ctx.attendi(48 + (i % 3) * 22);
            }
            if (!codice) return;
            await ctx.attendi(200);
            vedi(blocco, true);
            for (let i = 0; i < pezziCodice.length; i++) {
              vedi(pezziCodice[i], true);
              pezziCodice[i].classList.add('nuovo');
              await ctx.attendi(34);
            }
            await ctx.attendi(350);
            vedi(esegui, true);
            await ctx.attendi(450);
            play.classList.add('premuto');
            await ctx.attendi(380);
            vedi(out, true);
            out.classList.add('pg-sc-entra');
          },
        };
      },
    });
  }

  P.schermo('jacquard', jacquard);
  P.schermo('nastro', nastro);
  P.schermo('williams', williams);
  P.schermo('telescrivente', telescrivente);
  P.schermo('foglio', foglio);
  P.schermo('scheda', scheda);
  P.schermo('tabulato', tabulato);
  P.schermo('terminale', terminale);
  P.schermo('home', home);
  P.schermo('mac', mac);
  P.schermo('browser', browser);
  P.schermo('editor', editor);
  P.schermo('chat', chat);
})(typeof window !== 'undefined' ? window : globalThis);
