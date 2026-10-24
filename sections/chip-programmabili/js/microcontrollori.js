/*
 * Capitolo 6 · Laboratorio «Il frigorifero intelligente».
 *
 * Sul palco: a sinistra un frigorifero ventilato in sezione (sonde, ventola, evaporatore, resistenza,
 * compressore, porta con interruttore e lampadina), a destra lo schema a blocchi del microcontrollore
 * (CPU, ROM, RAM, timer, porte, ADC, interruzioni, UART), collegati dai fili. Il programma gira riga per riga:
 * i pacchetti mostrano i trasferimenti (programma in ambra, dati in azzurro, interruzioni in rosa) e il listato
 * segue la riga in esecuzione. Un grafico registra la temperatura della cella nel tempo.
 *
 * A 1× la vista al rallentatore è il controllore: un'uscita cambia quando la riga che la scrive arriva alla porta.
 * A 60× il chip lavora nel nucleo (js/microcontrollori-core.js) e la vista mostra ogni tanto un giro, eseguito su
 * una copia dello stato; a 600× restano solo i lampi delle righe che cambiano qualcosa.
 * Obiettivo: portare la cella al SET, seguire l'interruzione della porta, vedere uno sbrinamento.
 */
(function (root) {
  'use strict';

  const CP = root.CP;
  const M = root.MicrocontrolloriCore;
  if (!CP || !M) return;

  const h = CP.h;
  const s = CP.s;
  const ui = CP.ui;
  const F = M.fmt;
  const P = 'microcontrollori-';

  /* ---------- tempi della vista, in millisecondi ---------- */

  const T_HOP = 460;      // un trasferimento su un bus del chip
  const T_GAP = 80;       // respiro fra due cicli di bus
  const T_EXT = 640;      // un segnale lungo i fili del frigorifero
  const T_IRQ = 400;      // i passi dell'ingresso in interruzione
  const T_DWELL = 650;    // sosta fra due righe: il tempo di leggere il titolo della spiegazione
  const T_REDUCED = 1150; // movimento ridotto: una riga ogni tanto, cambi di stato istantanei

  const SPEED_INFO = {
    1: { title: 'Tempo reale: un secondo al secondo', win: 15 * 60, winLabel: 'ultimi 15 minuti' },
    60: { title: 'Un minuto ogni secondo', win: 3 * 3600, winLabel: 'ultime 3 ore' },
    600: { title: 'Dieci minuti ogni secondo', win: 12 * 3600, winLabel: 'ultime 12 ore' },
  };

  /* ---------- geometria del chip (coordinate locali, 360 × 410) ---------- */

  const XB = 116; // bordo destro dei blocchi di sinistra
  const SP = 130; // dorsale del bus dei dati
  const BLK = {
    uart: { x: 12, y: 30, w: 104, h: 48 },
    int: { x: 12, y: 86, w: 104, h: 50 },
    timer: { x: 12, y: 144, w: 104, h: 50 },
    p1: { x: 12, y: 202, w: 104, h: 60 },
    adc: { x: 12, y: 270, w: 104, h: 58 },
    p2: { x: 12, y: 336, w: 104, h: 60 },
    rom: { x: 172, y: 30, w: 176, h: 94 },
    cpu: { x: 172, y: 170, w: 176, h: 110 },
    ram: { x: 144, y: 304, w: 204, h: 92 },
  };
  const PIN = { uart: 54, int: 111, luce: 222, vent: 244, adc1: 288, adc0: 310, res: 356, comp: 378 };
  const CROUTES = {
    'adc>cpu': [[XB, 299], [SP, 299], [SP, 226], [172, 226]],
    'ram>cpu': [[144, 350], [SP, 350], [SP, 226], [172, 226]],
    'int>cpu': [[XB, 100], [SP, 100], [SP, 226], [172, 226]],
    'timer>cpu': [[XB, 169], [SP, 169], [SP, 226], [172, 226]],
    'cpu>p1': [[172, 226], [SP, 226], [SP, 232], [XB, 232]],
    'cpu>p2': [[172, 226], [SP, 226], [SP, 366], [XB, 366]],
    'cpu>uart': [[172, 226], [SP, 226], [SP, 54], [XB, 54]],
    'rom>cpu:h': [[330, 124], [330, 170]],
    'rom>cpu:vn': [[172, 78], [SP, 78], [SP, 226], [172, 226]],
    'int>cpu:irq': [[XB, 124], [125, 124], [126.5, 120.5], [130, 119], [133.5, 120.5], [135, 124], [158, 124], [158, 192], [172, 192]],
    'timer>int': [[12, 180], [6, 180], [6, 128], [12, 128]],
  };

  /* ---------- geometria del frigorifero (coordinate locali, 220 × 424, porta fino a x = −64) ---------- */

  // altezza a cui ogni filo esce dalla parete di fondo (x = 220)
  const FR_EXIT = { display: 29, sw: 38, luce: 43, vent: 146, adc1: 210, adc0: 232, res: 260, comp: 382 };
  // percorso interno: ingressi dal pezzo alla parete, uscite dalla parete al pezzo
  const FR_INNER = {
    display: [[220, 29], [116, 29], [116, 16], [110, 16]],
    sw: [[24, 48], [24, 38], [220, 38]],
    luce: [[220, 43], [64, 43], [64, 51.5]],
    vent: [[220, 146], [199, 146]],
    adc1: [[203, 210], [220, 210]],
    adc0: [[164, 232], [220, 232]],
    res: [[220, 260], [200, 260]],
    comp: [[220, 382], [194, 382]],
  };
  // fili fra il frigo e i piedini, nella disposizione larga: canale verticale (x) di ciascuno
  const WIRES = {
    display: { pin: 'uart', ch: 380 },
    sw: { pin: 'int', ch: 372 },
    luce: { pin: 'luce', ch: 364 },
    vent: { pin: 'vent', ch: 356 },
    adc1: { pin: 'adc1', ch: 348 },
    adc0: { pin: 'adc0', ch: 340 },
    res: { pin: 'res', ch: 332 },
    comp: { pin: 'comp', ch: null },
  };
  // ordine dei fili, dall'alto in basso: uscita dal frigo e piedino del chip seguono lo stesso ordine, così non si incrociano
  const HARNESS = ['display', 'sw', 'luce', 'vent', 'adc1', 'adc0', 'res', 'comp'];
  const LAYOUTS = {
    wide: { name: 'wide', vb: [810, 452], fridge: { x: 80, y: 22, k: 1 }, chip: { x: 440, y: 26 }, wires: true },
    // sul telefono il frigo sta sopra il chip: i fili scendono a destra, passano sotto il frigo e risalgono ai piedini
    narrow: { name: 'narrow', vb: [392, 826], fridge: { x: 132, y: 8, k: 0.84 }, chip: { x: 30, y: 412 }, wires: true, harness: { xr: 384, yg: 406, xl: 19.8 } },
  };

  const OUT_NAME = { luce: 'la luce', vent: 'la ventola', res: 'la resistenza', comp: 'il compressore' };
  const CELL_LABEL = { luce: 'LUCE', vent: 'VENT', res: 'RES', comp: 'COMP' };

  const BLK_LABEL = {
    cpu: 'CPU', rom: 'ROM del programma', ram: 'RAM dei dati', timer: 'Timer', int: 'Controllo delle interruzioni',
    uart: 'UART, la porta seriale', adc: 'Convertitore analogico-digitale', p1: 'Porta P1', p2: 'Porta P2',
  };
  const INFO = {
    cpu: 'Esegue il programma un\'istruzione alla volta. Il PC, contatore di programma, indica la riga in esecuzione; il registro A tiene il dato su cui la CPU sta lavorando.',
    rom: 'Qui sta il programma, scritto una volta per tutte: nel TMS1000 lo incideva la fabbrica, nell\'8748 lo si scriveva in una EPROM. Ogni riga è fatta di byte: il chip legge numeri, non parole. Accanto al programma c\'è la tabella che trasforma i numeri della sonda in gradi.',
    ram: 'Pochi byte per i valori che cambiano: le soglie SET e DIFF, l\'ultima temperatura, i flag SBRINA e ALLARME e la pila, dove la CPU salva l\'indirizzo di ritorno quando arriva un\'interruzione.',
    timer: 'Un contatore che avanza con il clock, da solo, mentre la CPU fa altro. Ogni secondo chiede un\'interruzione: così il programma tiene il conto del tempo fino al prossimo sbrinamento.',
    int: 'Raccoglie le richieste del timer e dei piedini e avvisa la CPU. Sul piedino INT0 arriva l\'interruttore della porta: appena la apri, la CPU lascia il ciclo principale e corre alla routine 0200.',
    uart: 'Il trasmettitore seriale: spedisce un byte un bit alla volta, su un filo solo. Qui manda la temperatura e l\'allarme alla scheda del display.',
    adc: 'Trasforma una tensione fra 0 e 5 V in un numero fra 0 e 1.023, cioè 10 bit. La sonda NTC cambia resistenza con la temperatura, e con lei cambia la tensione che arriva qui. Canale 0: sonda della cella; canale 1: sonda dell\'evaporatore.',
    p1: 'Piedini di uscita che il programma scrive tutti insieme, come un byte. Il bit LUCE accende la lampadina, il bit VENT la ventola, ciascuno attraverso un relè.',
    p2: 'Il bit COMP comanda il relè del compressore, il bit RES quello della resistenza di sbrinamento. Un piedino del chip regge poca corrente: per un motore serve il relè, che chiude un contatto più robusto.',
  };

  const FLAT = [];
  M.PROGRAM.forEach((sec) => sec.lines.forEach((l) => FLAT.push(l)));

  /* ---------- piccoli aiuti ---------- */

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function hex(bytes) { return bytes.map((b) => CP.fmt.hex(b, 2)).join(' '); }
  function two(n) { return String(n).padStart(2, '0'); }
  /** 765 → "0:12:45" */
  function hms(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 3600) + ':' + two(Math.floor(sec / 60) % 60) + ':' + two(sec % 60);
  }
  /** 4140 → "1:09" (ore:minuti dall'accensione) */
  function hmm(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 3600) + ':' + two(Math.floor(sec / 60) % 60); }
  /** tempo trascorso a minuti interi, per difetto come l'ora del registro: «1 h 08 min» insieme a «1:08» */
  function since(sec) { return F.hm(Math.floor(Math.max(0, sec) / 60) * 60); }
  /** "SET 4,0" → "4,0"; "L1 V0" resta com'è */
  function valueOf(label) {
    // nei registri ci sono numeri, non unità di misura: "25,1 °C" → "25,1"
    const t = String(label).replace(/ °C$/, '');
    const m = /^[A-Za-zÀ-ÿ.]+ (\S+)$/.exec(t);
    return m ? m[1] : t;
  }
  function ptsD(pts) { return 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L'); }
  function cumLens(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }
  function pointAt(pts, cum, p) {
    const L = cum[cum.length - 1] * clamp(p, 0, 1);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < L) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const f = (L - cum[i - 1]) / seg;
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  }
  /** Spezza un testo in righe da n caratteri al massimo. */
  function wrap(text, n) {
    const out = [];
    let cur = '';
    String(text).split(' ').forEach((w) => {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= n) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function hexRgb(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const A = hexRgb(a);
    const B = hexRgb(b);
    return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
  }
  function listIt(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1];
  }
  function lbl(x, y, text, anchor) {
    return s('text', { x: x, y: y, 'text-anchor': anchor || 'start', class: P + 'f-lbl' }, text);
  }

  /** Percorsi dei pacchetti nel palco, per una disposizione. */
  function buildRoutes(L) {
    const R = {};
    const cp = (p) => [L.chip.x + p[0], L.chip.y + p[1]];
    const fp = (p) => [L.fridge.x + p[0] * L.fridge.k, L.fridge.y + p[1] * L.fridge.k];
    Object.keys(CROUTES).forEach((k) => { R[k] = CROUTES[k].map(cp); });
    R['cpu>ram'] = R['ram>cpu'].slice().reverse();
    const wire = {};
    Object.keys(WIRES).forEach((k) => {
      const w = WIRES[k];
      const x0 = L.fridge.x + 220 * L.fridge.k;
      const y0 = L.fridge.y + FR_EXIT[k] * L.fridge.k;
      const x1 = L.chip.x - 8;
      const y1 = L.chip.y + PIN[w.pin];
      if (L.harness) {
        // fascio di fili: canale a destra del frigo, corsia sotto il frigo, piattina a sinistra del chip
        const i = HARNESS.indexOf(k);
        const xr = L.harness.xr - i * 7;
        const yg = L.harness.yg - i * 4;
        const xl = L.harness.xl - i * 2.4;
        wire[k] = [[x0, y0], [xr, y0], [xr, yg], [xl, yg], [xl, y1], [x1, y1]];
      } else wire[k] = w.ch == null ? [[x0, y0], [x1, y1]] : [[x0, y0], [w.ch, y0], [w.ch, y1], [x1, y1]];
    });
    const into = (pin) => [L.chip.x + 34, L.chip.y + PIN[pin]];
    const pinPt = (pin) => [L.chip.x - 8, L.chip.y + PIN[pin]];
    const input = (key, w) => {
      const pin = WIRES[w].pin;
      R[key] = L.wires ? FR_INNER[w].map(fp).concat(wire[w].slice(1), [into(pin)]) : [pinPt(pin), into(pin)];
    };
    const output = (key, w) => {
      const pin = WIRES[w].pin;
      R[key] = L.wires ? [into(pin)].concat(wire[w].slice().reverse(), FR_INNER[w].slice(1).map(fp)) : [into(pin), pinPt(pin)];
    };
    input('probeC>adc', 'adc0');
    input('probeE>adc', 'adc1');
    input('sw>int', 'sw');
    output('uart>display', 'display');
    ['luce', 'vent', 'res', 'comp'].forEach((k) => output('out:' + k, k));
    return { routes: R, wire: wire };
  }

  CP.lab('microcontrollori', function (mount, ctx) {
    /* ---------- stato ---------- */

    let sim = M.create();
    let speed = 1;
    let running = false;
    let arch = 'harvard';
    let size = '';
    let layout = null;
    let refs = null;
    let lcd = { T: sim.display.T, alarm: false };
    let stackShown = null;
    let adcVolts = '';
    let picked = null;
    const goal = { set: false, irq: false, def: false, done: false };
    // vista al rallentatore: riga da eseguire, interruzione in corso, richieste in attesa
    const tr = { pc: '0100', cur: null, isr: null, irq: [], prefetched: false, loop: false, steps: 0, pendingOut: null, gen: 0, minute: 0 };
    let drawn = null;

    /* ---------- animazioni legate al laboratorio (si fermano fuori vista) ---------- */

    const live = new Set();
    function anim(ms, fn, easeFn) {
      return new Promise((resolve) => {
        if (ctx.reduced || ms <= 0) { fn(1); resolve(true); return; }
        const E = easeFn || CP.ease.inOut;
        let el = 0;
        const rec = {};
        const stop = ctx.tick((dt) => {
          el += dt;
          const p = Math.min(1, el / ms);
          fn(E(p));
          if (p >= 1) { stop(); live.delete(rec); resolve(true); }
        });
        rec.cancel = () => { stop(); live.delete(rec); resolve(false); };
        live.add(rec);
      });
    }
    function sleep(ms) {
      return new Promise((resolve) => {
        if (ms <= 0) { resolve(true); return; }
        let el = 0;
        const rec = {};
        const stop = ctx.tick((dt) => {
          el += dt;
          if (el >= ms) { stop(); live.delete(rec); resolve(true); }
        });
        rec.cancel = () => { stop(); live.delete(rec); resolve(false); };
        live.add(rec);
      });
    }
    function cancelAnims() { Array.from(live).forEach((r) => r.cancel()); }

    /* ---------- controlli ---------- */

    const btnRun = ui.button({ label: 'Avvia', icon: '▶︎', primary: true, onClick: () => setRunning(!running, true) });
    const btnStep = ui.button({ label: 'Un passo', icon: '⏭︎', title: 'Esegui una riga del programma, poi fermati', onClick: stepOnce });
    const segSpeed = ui.seg({
      label: 'Velocità del tempo',
      options: [1, 60, 600].map((v) => ({ value: v, label: v + '×', title: SPEED_INFO[v].title })),
      value: 1,
      onChange: (v) => setSpeed(v, 'user'),
    });
    const btnReset = ui.button({ label: 'Ricomincia', icon: '↺', title: 'Frigorifero appena acceso, con 25 °C dentro', onClick: resetAll });
    const rngSet = ui.range({ label: 'SET', min: 2, max: 8, step: 0.5, value: sim.p.set, format: (v) => F.num1(v) + ' °C', onInput: setSET });
    rngSet.input.setAttribute('aria-label', 'Temperatura impostata, SET');
    rngSet.classList.add(P + 'set');
    const btnDoor = ui.button({ label: 'Apri la porta', className: P + 'door-btn', onClick: () => toggleDoor() });
    btnDoor.setAttribute('aria-pressed', 'false');
    const btnDefrost = ui.button({ label: 'Sbrina ora', icon: '❄︎', title: 'Avvia subito uno sbrinamento', onClick: manualDefrost });
    const segArch = ui.seg({
      label: 'Architettura delle memorie',
      options: [
        { value: 'harvard', label: 'Harvard', title: 'Due bus: uno per il programma, uno per i dati' },
        { value: 'vn', label: 'von Neumann', title: 'Un bus solo, a turno, per programma e dati' },
      ],
      value: arch,
      onChange: (v) => setArch(v),
    });

    const bar1 = ui.bar(
      h('div', { class: 'cp-bar-group' }, btnRun, btnStep),
      h('div', { class: 'cp-bar-group' }, h('span', { class: P + 'k', 'aria-hidden': 'true' }, 'Tempo'), segSpeed),
      h('span', { class: 'grow' }),
      btnReset);
    const bar2 = ui.bar(
      rngSet,
      h('div', { class: 'cp-bar-group' }, btnDoor, btnDefrost),
      h('span', { class: 'grow' }),
      h('div', { class: 'cp-bar-group' }, h('span', { class: P + 'k', 'aria-hidden': 'true' }, 'Memorie'), segArch));
    bar2.classList.add(P + 'bar2');

    /* ---------- pannelli ---------- */

    const stage = h('div', { class: 'cp-stage ' + P + 'stage' });

    const ex = {
      step: h('span', { class: 'step' }),
      title: h('h4', null),
      text: h('p', null),
      note: h('p', { class: P + 'note' }),
      infoTitle: h('h4', null),
      infoText: h('p', null),
      log: h('ol', { class: P + 'log' }),
    };
    const infoClose = h('button', { type: 'button', class: 'cp-btn ' + P + 'info-x', onclick: hideInfo }, 'Chiudi');
    ex.info = h('div', { class: P + 'info', hidden: true }, h('span', { class: 'step' }, 'Nel chip'), ex.infoTitle, ex.infoText, infoClose);
    const logEmpty = h('li', { class: P + 'log-empty' }, 'Ancora niente: il frigorifero si sta raffreddando.');
    ex.log.append(logEmpty);
    const explain = h('div', { class: 'cp-explain ' + P + 'explain' },
      h('div', { class: P + 'now' }, ex.step, ex.title, ex.text, ex.note),
      h('div', { class: P + 'side' }, ex.info, h('div', { class: P + 'events' }, h('h5', null, 'Che cosa è successo'), ex.log)));

    // listato del programma
    const lineEls = {};
    const codeTitleId = P + 'listato-titolo';
    const code = h('section', { class: P + 'code', 'aria-labelledby': codeTitleId },
      h('h4', { id: codeTitleId }, 'Il programma nella ROM'),
      h('div', { class: P + 'secs' }, M.PROGRAM.map((sec) => h('div', { class: P + 'sec' + (sec.isr ? ' is-isr' : ''), 'data-sec': sec.sec },
        h('h5', null, sec.title, ' ', h('small', null, sec.note)),
        h('ol', null, sec.lines.map((l) => {
          const li = h('li', { class: P + 'ln', 'data-id': l.id },
            h('span', { class: P + 'ln-a' }, l.id),
            // «COMP ← 1» resta su una riga: sui telefoni si va a capo prima, non dentro l'assegnazione
            h('span', { class: P + 'ln-c' }, l.code.replace(/(\S+) ← (\S+)/g, '$1 ← $2')),
            h('span', { class: P + 'ln-r' }, h('span', { class: P + 'ln-m', 'aria-hidden': 'true' }), h('span', { class: P + 'ln-v' })),
            h('span', { class: P + 'ln-ret' }, 'ritorno'));
          li.mark = li.querySelector('.' + P + 'ln-m');
          li.val = li.querySelector('.' + P + 'ln-v');
          lineEls[l.id] = li;
          return li;
        }))))));

    // indicatori
    const rd = {
      on: ui.readout('Acceso da', '0 min'),
      cell: ui.readout('Cella', F.temp(25)),
      evap: ui.readout('Evaporatore', F.temp(25)),
      frost: ui.readout('Brina', '0 %'),
      next: ui.readout('Sbrinamento', ''),
      bus: ui.readout('Cicli di bus per giro', String(M.busCycles(arch))),
    };
    const reads = h('div', { class: P + 'reads' }, Object.keys(rd).map((k) => rd[k]));
    function setV(el, text) { const v = el.querySelector('.v'); if (v.textContent !== text) v.textContent = text; }

    // grafico
    const chartWin = h('span', { class: P + 'chart-win' }, SPEED_INFO[1].winLabel);
    const chartBox = h('div', { class: P + 'chart' },
      h('div', { class: P + 'chart-head' }, h('h4', null, 'Temperatura della cella'), chartWin),
      h('p', { class: P + 'chart-key' },
        h('span', { class: P + 'key-set' }, h('i', { 'aria-hidden': 'true' }), 'SET: il compressore si ferma'),
        h('span', { class: P + 'key-hi' }, h('i', { 'aria-hidden': 'true' }), 'SET + DIFF: riparte'),
        h('span', { class: P + 'key-def' }, h('i', { 'aria-hidden': 'true' }), 'sbrinamento')));

    // obiettivo
    const goalEls = {
      set: h('span', { class: P + 'g' }, 'porta la cella al SET'),
      irq: h('span', { class: P + 'g' }, 'apri la porta e segui l\'interruzione'),
      def: h('span', { class: P + 'g' }, 'guarda uno sbrinamento'),
    };
    const goalEl = h('p', { class: 'cp-goal ' + P + 'goal' },
      h('span', null, 'Obiettivo: ', goalEls.set, ', ', goalEls.irq, ', ', goalEls.def, '.'));

    const grid = h('div', { class: P + 'grid' }, stage, explain, code, reads, chartBox);
    const wrapEl = h('div', { class: P + 'lab' },
      bar1, bar2, grid,
      ui.legend([
        ['Programma: istruzioni e indirizzi', 'var(--sig-addr)'],
        ['Dati', 'var(--sig-data)'],
        ['Interruzioni', 'var(--sig-ctrl)'],
        ['Tensione della sonda', '#dfe9e4'],
        ['Uscita accesa', 'var(--sig-on)'],
      ]),
      h('p', { class: 'cp-hint' }, 'Valori di esempio: chip, programma e frigorifero sono semplificati, ma si comportano come un regolatore vero. Tocca un blocco del chip per sapere che cosa fa; tocca la porta del frigo per aprirla.'),
      goalEl);
    mount.append(wrapEl);

    /* ---------- palco: frigorifero ---------- */

    function buildFridge(L) {
      const R = refs.parts;
      const k = L.fridge.k;
      const g = s('g', { class: P + 'fridge', transform: 'translate(' + L.fridge.x + ' ' + L.fridge.y + ')' + (k === 1 ? '' : ' scale(' + k + ')') });
      const body = s('g', { 'aria-hidden': 'true' });
      body.append(
        s('rect', { x: 10, y: 422, width: 16, height: 7, rx: 2, class: P + 'f-foot' }),
        s('rect', { x: 194, y: 422, width: 16, height: 7, rx: 2, class: P + 'f-foot' }),
        s('rect', { x: 0, y: 34, width: 220, height: 390, rx: 10, class: P + 'f-shell' }),
        s('rect', { x: 0, y: 0, width: 220, height: 32, rx: 7, class: P + 'f-panel' }));
      R.lcd = s('rect', { x: 10, y: 5, width: 100, height: 22, rx: 3, class: P + 'f-lcd' });
      R.lcdText = s('text', { x: 60, y: 21.5, 'text-anchor': 'middle', class: 'mono ' + P + 'f-lcdtxt' }, '');
      R.alarm = s('g', { class: P + 'f-alarm' },
        s('path', { d: 'M126 12.5 h5 l6 -5 v17 l-6 -5 h-5 z', class: P + 'f-spk' }),
        s('path', { d: 'M141 11.5 a6 6 0 0 1 0 9 M145 8 a11 11 0 0 1 0 16', class: P + 'f-waves' }),
        s('text', { x: 154, y: 20.5, class: P + 'f-alarmtxt' }, 'allarme'));
      body.append(R.lcd, R.lcdText, R.alarm);

      // cella, luce, ripiani e cibo
      R.cavity = s('rect', { x: 14, y: 46, width: 154, height: 276, rx: 4, class: P + 'f-cavity' });
      R.cone = s('path', { d: 'M58 62 L16 220 L112 220 L70 62 Z', class: P + 'f-cone', fill: 'url(#' + P + 'cone)' });
      body.append(R.cavity, R.cone,
        s('path', { d: 'M14 128 H168 M14 212 H168', class: P + 'f-shelf' }),
        s('path', { d: 'M28 128 V101 q0 -5 4 -7 V86 h6 v8 q4 2 4 7 V128 Z', class: P + 'f-food a' }),
        s('rect', { x: 50, y: 106, width: 22, height: 22, rx: 4, class: P + 'f-food b' }),
        s('rect', { x: 48.5, y: 101, width: 25, height: 6, rx: 2, class: P + 'f-food c' }),
        s('rect', { x: 22, y: 184, width: 44, height: 28, rx: 3, class: P + 'f-food c' }),
        s('rect', { x: 18, y: 284, width: 92, height: 36, rx: 5, class: P + 'f-drawer' }),
        s('circle', { cx: 38, cy: 305, r: 10, class: P + 'f-food a' }),
        s('circle', { cx: 60, cy: 303, r: 11, class: P + 'f-food b' }),
        s('circle', { cx: 84, cy: 307, r: 8, class: P + 'f-food a' }));

      // condotto dell'evaporatore
      body.append(s('rect', { x: 168, y: 46, width: 36, height: 276, class: P + 'f-duct' }),
        s('path', { d: 'M168 76 V294', class: P + 'f-back' }));
      R.fins = s('path', {
        d: Array.from({ length: 11 }, (_, i) => 'M173 ' + (168 + i * 8) + ' H199').join(' ') + ' M177 164 V252 M195 164 V252',
        class: P + 'f-fins',
      });
      R.frost = s('rect', { x: 170, y: 160, width: 32, height: 96, rx: 5, class: P + 'f-frost', opacity: 0 });
      R.heater = s('path', { d: 'M172 260 l3.5 -5 l3.5 10 l3.5 -10 l3.5 10 l3.5 -10 l3.5 10 l3.5 -10 l3.5 5', class: P + 'f-heater' });
      R.drops = s('g', { class: P + 'f-drops' }, [178, 186, 194].map((x) => s('circle', { cx: x, cy: 270, r: 2.2 })));
      R.blades = s('g', null,
        [0, 120, 240].map((a) => s('path', { d: 'M0 -2 C4 -6 5 -11 0 -12 C-4 -11 -3 -6 0 -2 Z', transform: 'rotate(' + a + ')' })));
      R.fan = s('g', { class: P + 'f-fan', transform: 'translate(186 146)' },
        s('circle', { r: 14, class: P + 'f-fanring' }), R.blades, s('circle', { r: 2.6, class: P + 'f-fanhub' }));
      R.airFan = s('g', { class: P + 'f-air' },
        s('path', { d: 'M160 60 H100 M100 60 l8 -4.5 v9 z M100 306 H160 M160 306 l-8 -4.5 v9 z' }));
      R.probeE = s('rect', { x: 197, y: 203, width: 6, height: 14, rx: 2, class: P + 'f-probe' });
      R.probeC = s('rect', { x: 156, y: 224, width: 8, height: 16, rx: 2, class: P + 'f-probe' });
      body.append(R.fins, R.frost, R.heater, R.drops, R.fan, R.airFan, R.probeE, R.probeC);

      // vano del compressore
      R.pipe = s('path', { d: 'M190 256 V350 H176 V362', class: P + 'f-pipe' });
      R.comp = s('g', { class: P + 'f-comp' },
        s('path', { d: 'M142 404 V384 Q142 362 168 362 Q194 362 194 384 V404 Z', class: P + 'f-dome' }),
        s('path', { d: 'M201 372 q4 6 0 12 M206 367 q7 11 0 22 M135 372 q-4 6 0 12', class: P + 'f-vib' }));
      body.append(s('rect', { x: 120, y: 334, width: 96, height: 86, rx: 4, class: P + 'f-room' }), R.pipe, R.comp,
        s('rect', { x: 136, y: 404, width: 64, height: 6, rx: 2, class: P + 'f-base' }));

      // lampadina e interruttore della porta
      R.bulb = s('circle', { cx: 64, cy: 58, r: 6.5, class: P + 'f-bulb' });
      R.plunger = s('rect', { x: 13, y: 51, width: 6, height: 6, rx: 1.5, class: P + 'f-plunger' });
      R.sw = s('rect', { x: 16, y: 48, width: 16, height: 12, rx: 2.5, class: P + 'f-switch' });
      body.append(s('rect', { x: 57, y: 46, width: 14, height: 6, rx: 1.5, class: P + 'f-socket' }), R.bulb, R.plunger, R.sw);
      R.airDoor = s('g', { class: P + 'f-airdoor', opacity: 0 },
        s('path', { d: 'M-2 70 H44 M44 70 l-8 -4.5 v9 z', class: 'warm' }),
        s('path', { d: 'M44 300 H-2 M-2 300 l8 -4.5 v9 z', class: 'cold' }));

      const labels = s('g', { class: P + 'f-lbls', 'aria-hidden': 'true' },
        lbl(76, 62.5, 'luce'),
        lbl(16, 80, 'interruttore'),
        lbl(164, 150.5, 'ventola', 'end'),
        lbl(164, 200, 'evaporatore', 'end'),
        lbl(152, 236.5, 'sonda', 'end'),
        lbl(164, 264.5, 'resistenza', 'end'),
        lbl(168, 418.5, 'compressore', 'middle'));

      // porta: chiusa è una lastra a sinistra, aperta ruota verso chi guarda
      R.doorClosed = s('g', null,
        s('rect', { x: -6, y: 36, width: 18, height: 288, rx: 3, class: P + 'f-slab' }),
        s('rect', { x: -12, y: 128, width: 6, height: 60, rx: 3, class: P + 'f-handle' }));
      R.doorFace = s('g', { class: P + 'f-face', transform: 'translate(-6 0) scale(0.001 1) translate(6 0)' },
        s('rect', { x: -64, y: 36, width: 58, height: 288, rx: 4, class: P + 'f-faceplate' }),
        s('rect', { x: -58, y: 84, width: 46, height: 28, rx: 3, class: P + 'f-bin' }),
        s('rect', { x: -58, y: 164, width: 46, height: 28, rx: 3, class: P + 'f-bin' }),
        s('rect', { x: -58, y: 244, width: 46, height: 28, rx: 3, class: P + 'f-bin' }),
        s('path', { d: 'M-52 84 V70 h6 v14 M-40 84 V74 h7 v10 M-50 244 V232 h8 v12', class: P + 'f-binstuff' }));
      R.door = s('g', { class: P + 'f-door', role: 'button', tabindex: '0', 'aria-pressed': 'false' },
        s('rect', { x: -70, y: 30, width: 90, height: 300, rx: 9, class: P + 'focus' }),
        s('rect', { x: -66, y: 34, width: 82, height: 292, class: P + 'f-hit' }),
        R.doorClosed, R.doorFace);
      R.door.addEventListener('click', () => toggleDoor());
      R.door.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDoor(); }
      });

      g.append(body, R.airDoor, labels, R.door);
      return g;
    }

    /* ---------- palco: chip ---------- */

    function buildChip(L) {
      const g = s('g', { class: P + 'chip', transform: 'translate(' + L.chip.x + ' ' + L.chip.y + ')' });
      const base = s('g', { 'aria-hidden': 'true' },
        s('rect', { x: 0, y: 0, width: 360, height: 410, rx: 14, class: P + 'die' }),
        Object.keys(PIN).map((k) => s('rect', { x: -8, y: PIN[k] - 3, width: 8, height: 6, rx: 1, class: P + 'pin' })),
        s('text', { x: 16, y: 19, class: P + 'die-title' }, 'MICROCONTROLLORE'));

      // bus (sotto i blocchi)
      const buses = s('g', { 'aria-hidden': 'true' });
      refs.dbus = ['M130 40 V366', 'M116 54 H130', 'M116 100 H130', 'M116 169 H130', 'M116 232 H130', 'M116 299 H130', 'M116 366 H130', 'M130 226 H172', 'M130 350 H144']
        .map((d) => s('path', { d: d, class: 'cp-bus data ' + P + 'dbus' }));
      refs.vnStub = s('path', { d: 'M130 78 H172', class: 'cp-bus data ' + P + 'dbus ' + P + 'vnstub', 'stroke-dasharray': '42 42', 'stroke-dashoffset': '42', opacity: 0 });
      refs.pbus = s('path', { d: 'M330 124 V170', class: 'cp-bus addr ' + P + 'pbus', 'stroke-dasharray': '46 46', 'stroke-dashoffset': '0' });
      refs.irqLine = s('path', { d: 'M116 124 H125 A5 5 0 0 1 135 124 H158 V192 H172', class: 'cp-bus ctrl ' + P + 'irqline' });
      refs.tintLine = s('path', { d: 'M12 180 H6 V128 H12', class: 'cp-bus ctrl ' + P + 'tint' });
      buses.append.apply(buses, refs.dbus.concat([refs.vnStub, refs.pbus, refs.irqLine, refs.tintLine]));
      refs.lblData = s('text', { x: 151, y: 50, 'text-anchor': 'middle', class: P + 'buslbl' },
        s('tspan', { x: 151 }, 'bus'), s('tspan', { x: 151, dy: 13 }, 'dati'));
      refs.lblProg = s('g', { class: P + 'buslbl-prog' },
        s('text', { x: 292, y: 151, 'text-anchor': 'end', class: P + 'buslbl' }, 'bus del programma'),
        s('path', { d: 'M297 147 H322', class: P + 'leader' }));
      buses.append(refs.lblData, refs.lblProg);

      function block(key, title) {
        const b = BLK[key];
        const grp = s('g', { class: 'cp-blk ' + P + 'blk', role: 'button', tabindex: '0', 'data-blk': key, 'aria-label': BLK_LABEL[key] + ': che cosa fa' },
          s('rect', { x: b.x - 4, y: b.y - 4, width: b.w + 8, height: b.h + 8, rx: 10, class: P + 'focus' }),
          s('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 7, class: P + 'box' }),
          s('text', { x: b.x + 8, y: b.y + 18, class: P + 'bt' }, title));
        grp.addEventListener('click', () => showInfo(key));
        grp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showInfo(key); }
        });
        refs.blk[key] = grp;
        return grp;
      }
      function sub(key, x, y, text) {
        const t = s('text', { x: x, y: y, class: P + 'bs' }, text);
        refs.txt[key] = t;
        return t;
      }
      function cell(key, x, y) {
        const r = s('rect', { x: x, y: y, width: 44, height: 21, rx: 4, class: P + 'cell' });
        const t = s('text', { x: x + 22, y: y + 14.5, 'text-anchor': 'middle', class: 'mono ' + P + 'cellt' }, CELL_LABEL[key] + ' 0');
        refs.cells[key] = { r: r, t: t };
        return [r, t];
      }

      const blocks = s('g', null);
      blocks.append(
        block('uart', 'UART').appendChild(sub('uart', 20, 66, '→ display')).parentNode,
        block('int', 'Interruzioni').appendChild(sub('int', 20, 122, 'porta · timer')).parentNode,
        block('timer', 'Timer').appendChild(sub('timer', 20, 180, 'conta 0:00:00')).parentNode);
      const p1 = block('p1', 'Porta P1');
      p1.append.apply(p1, cell('luce', 18, 229).concat(cell('vent', 66, 229)));
      const adc = block('adc', 'ADC 10 bit');
      adc.append(sub('adc1', 20, 305, 'canale 0'), sub('adc2', 20, 320, '—'));
      const p2 = block('p2', 'Porta P2');
      p2.append.apply(p2, cell('res', 18, 363).concat(cell('comp', 66, 363)));
      blocks.append(p1, adc, p2);

      const rom = block('rom', 'ROM · programma');
      refs.romRows = [70, 89, 108].map((y) => {
        const bg = s('rect', { x: 180, y: y - 13.5, width: 160, height: 18, rx: 4, class: P + 'romhi' });
        const a = s('text', { x: 188, y: y, class: 'mono ' + P + 'roma' }, '');
        const b = s('text', { x: 232, y: y, class: 'mono ' + P + 'romb' }, '');
        rom.append(bg, a, b);
        return { bg: bg, a: a, b: b };
      });
      const cpu = block('cpu', 'CPU');
      refs.irqBadge = s('g', { class: P + 'irqbadge' },
        s('rect', { x: 298, y: 177, width: 42, height: 18, rx: 9 }),
        s('text', { x: 319, y: 190, 'text-anchor': 'middle' }, 'IRQ'));
      refs.txt.pc = s('text', { x: 251, y: 216.5, 'text-anchor': 'end', class: 'mono ' + P + 'regv' }, '0100');
      refs.txt.a = s('text', { x: 333, y: 216.5, 'text-anchor': 'end', class: 'mono ' + P + 'regv' }, '—');
      refs.ins = [s('tspan', { x: 190, y: 247 }, ''), s('tspan', { x: 190, y: 263 }, '')];
      cpu.append(refs.irqBadge,
        s('rect', { x: 182, y: 198, width: 76, height: 26, rx: 5, class: P + 'reg' }),
        s('text', { x: 189, y: 215.5, class: P + 'regk' }, 'PC'), refs.txt.pc,
        s('rect', { x: 264, y: 198, width: 76, height: 26, rx: 5, class: P + 'reg' }),
        s('text', { x: 271, y: 215.5, class: P + 'regk' }, 'A'), refs.txt.a,
        s('rect', { x: 182, y: 230, width: 158, height: 42, rx: 5, class: P + 'reg' }),
        s('text', { class: 'mono ' + P + 'instr' }, refs.ins));
      const ram = block('ram', 'RAM · dati');
      refs.ram = {};
      [['set', 'SET', 154, 342], ['diff', 'DIFF', 154, 361], ['T', 'T', 154, 380], ['sbrina', 'SBRINA', 250, 342], ['all', 'ALL.', 250, 361], ['pila', 'PILA', 250, 380]].forEach((v) => {
        const val = s('text', { x: v[2] === 154 ? 236 : 338, y: v[3], 'text-anchor': 'end', class: 'mono ' + P + 'ramv' }, '');
        ram.append(s('text', { x: v[2], y: v[3], class: 'mono ' + P + 'ramk' }, v[1]), val);
        refs.ram[v[0]] = val;
      });
      blocks.append(rom, cpu, ram);

      g.append(base, buses, blocks);
      return g;
    }

    /* ---------- palco: fili e relè (solo disposizione larga) ---------- */

    function buildWires(L) {
      const g = s('g', { class: P + 'wires', 'aria-hidden': 'true' });
      Object.keys(WIRES).forEach((k) => {
        const p = s('path', { d: ptsD(refs.wire[k]), class: P + 'wire' });
        refs.wires[k] = p;
        g.append(p);
      });
      if (L.harness) return g; // sul telefono niente relè disegnati: bastano i bit delle porte
      ['luce', 'vent', 'res', 'comp'].forEach((k) => {
        const y = L.chip.y + PIN[k];
        const arm = s('path', { d: 'M5 9.5 L15 3.5', class: P + 'relay-arm' });
        const r = s('g', { class: P + 'relay', transform: 'translate(396 ' + (y - 7) + ')' },
          s('rect', { x: 0, y: 0, width: 20, height: 14, rx: 3, class: P + 'relay-box' }),
          s('circle', { cx: 5, cy: 9.5, r: 1.6, class: P + 'relay-pt' }),
          s('circle', { cx: 15, cy: 9.5, r: 1.6, class: P + 'relay-pt' }),
          arm);
        refs.relays[k] = { g: r, arm: arm };
        g.append(r);
      });
      g.append(s('text', { x: 406, y: L.chip.y + PIN.luce - 13, 'text-anchor': 'middle', class: P + 'relay-lbl' }, 'relè'));
      return g;
    }

    function buildStage(L) {
      if (refs && refs.svg) refs.svg.remove();
      const rt = buildRoutes(L);
      refs = { L: L, routes: rt.routes, wire: rt.wire, parts: {}, blk: {}, txt: {}, cells: {}, wires: {}, relays: {} };
      const svg = s('svg', {
        viewBox: '0 0 ' + L.vb[0] + ' ' + L.vb[1],
        class: P + 'svg ' + P + L.name,
        role: 'group',
        'aria-label': 'Il frigorifero e il suo microcontrollore. La porta e i blocchi del chip sono pulsanti.',
      });
      svg.append(s('defs', null,
        s('linearGradient', { id: P + 'cone', x1: 0, y1: 0, x2: 0, y2: 1 },
          s('stop', { offset: '0', 'stop-color': '#ffe7a3', 'stop-opacity': '.55' }),
          s('stop', { offset: '1', 'stop-color': '#ffe7a3', 'stop-opacity': '0' }))));
      if (L.wires) svg.append(buildWires(L));
      svg.append(buildFridge(L), buildChip(L));
      refs.trails = s('g', { class: P + 'trails', 'aria-hidden': 'true' });
      refs.pkts = s('g', { class: P + 'pkts', 'aria-hidden': 'true' });
      svg.append(refs.trails, refs.pkts);
      refs.svg = svg;
      stage.append(svg);
      drawn = { out: {}, door: null, alarm: null, lcd: null, frost: -1, tint: null, fin: null, irq: null, pc: null, ins: null, a: null, rom: null, ram: {}, txt: {} };
    }

    /* ---------- disegno dello stato ---------- */

    function setTxt(key, text) {
      const el = refs.txt[key];
      if (el && el.textContent !== text) el.textContent = text;
    }
    function showPC(id) { setTxt('pc', id || '····'); }
    function showA(v) { setTxt('a', v == null || v === '' ? '—' : String(v)); }
    function showIns(text) {
      const rows = wrap(text, 21);
      let second = rows.slice(1).join(' ');
      if (second.length > 21) second = second.slice(0, 20) + '…';
      refs.ins[0].textContent = rows[0] || '';
      refs.ins[1].textContent = second;
    }
    function showROM(id) {
      let i = FLAT.findIndex((l) => l.id === id);
      const hi = i;
      if (i < 0) i = 0;
      const start = clamp(i - 1, 0, FLAT.length - 3);
      refs.romRows.forEach((row, k) => {
        const l = FLAT[start + k];
        row.a.textContent = l.id;
        row.b.textContent = hex(l.bytes);
        row.bg.classList.toggle('is-on', start + k === hi);
      });
    }
    function setIrqBadge(on) { if (refs.irqBadge) refs.irqBadge.classList.toggle('is-on', !!on); }

    function renderArch(animate) {
      const vn = arch === 'vn';
      const tspans = refs.lblData.querySelectorAll('tspan');
      tspans[1].textContent = vn ? 'unico' : 'dati';
      const apply = (p) => {
        // p = 0: Harvard, p = 1: von Neumann
        refs.pbus.setAttribute('stroke-dashoffset', r1(46 * p));
        refs.pbus.setAttribute('opacity', p >= 0.999 ? 0 : 1);
        refs.lblProg.setAttribute('opacity', r1(1 - p));
        refs.vnStub.setAttribute('stroke-dashoffset', r1(42 * (1 - p)));
        refs.vnStub.setAttribute('opacity', p <= 0.001 ? 0 : 1);
      };
      if (refs.archTween) refs.archTween.cancel();
      const to = vn ? 1 : 0;
      if (!animate || ctx.reduced) { apply(to); return; }
      const from = 1 - to;
      refs.archTween = CP.tween({ from: from, to: to, duration: CP.dur.slow, ease: 'smooth', onUpdate: apply });
    }

    function renderDoor(animate) {
      const R = refs.parts;
      const open = sim.door;
      R.door.setAttribute('aria-pressed', String(open));
      R.door.setAttribute('aria-label', open ? 'Porta del frigorifero: aperta. Premi per chiuderla.' : 'Porta del frigorifero: chiusa. Premi per aprirla.');
      btnDoor.setAttribute('aria-pressed', String(open));
      btnDoor.lastChild.textContent = open ? 'Chiudi la porta' : 'Apri la porta';
      const apply = (p) => {
        R.doorFace.setAttribute('transform', 'translate(-6 0) scale(' + Math.max(0.001, p).toFixed(3) + ' 1) translate(6 0)');
        R.doorClosed.setAttribute('opacity', (1 - p).toFixed(3));
        R.airDoor.setAttribute('opacity', p.toFixed(3));
        R.plunger.setAttribute('transform', 'translate(' + (-5 * p).toFixed(2) + ' 0)');
      };
      if (R.doorTween) R.doorTween.cancel();
      const to = open ? 1 : 0;
      const from = drawn.doorP == null ? to : drawn.doorP;
      if (!animate || ctx.reduced || from === to) { apply(to); drawn.doorP = to; return; }
      R.doorTween = CP.tween({
        from: from, to: to, duration: CP.dur.slow, ease: open ? 'bounce' : 'smooth',
        onUpdate: (v) => { drawn.doorP = clamp(v, 0, 1.1); apply(clamp(v, 0, 1.06)); },
      });
    }

    function pulseWire(k) {
      if (!refs.L.wires || ctx.reduced) return;
      const pts = refs.routes['out:' + k];
      const cum = cumLens(pts);
      const len = cum[cum.length - 1];
      const p = s('path', { d: ptsD(pts), class: P + 'trail k-on', 'stroke-dasharray': '18 ' + Math.ceil(len + 20), 'stroke-dashoffset': '18' });
      refs.trails.append(p);
      anim(520, (q) => p.setAttribute('stroke-dashoffset', r1(18 - (len + 18) * q)), CP.ease.sharp).then(() => p.remove());
    }

    function applyOut(k, v, first) {
      const R = refs.parts;
      const on = !!v;
      if (k === 'luce') { R.bulb.classList.toggle('is-on', on); R.cone.classList.toggle('is-on', on); }
      if (k === 'vent') { R.fan.classList.toggle('is-on', on); R.airFan.classList.toggle('is-on', on); }
      if (k === 'res') R.heater.classList.toggle('is-on', on);
      if (k === 'comp') { R.comp.classList.toggle('is-on', on); R.pipe.classList.toggle('is-on', on); }
      const c = refs.cells[k];
      c.r.classList.toggle('is-on', on);
      c.t.classList.toggle('is-on', on);
      c.t.textContent = CELL_LABEL[k] + ' ' + (on ? 1 : 0);
      if (refs.wires[k]) refs.wires[k].classList.toggle('is-on', on);
      if (refs.relays[k]) {
        refs.relays[k].g.classList.toggle('is-on', on);
        refs.relays[k].arm.setAttribute('d', on ? 'M5 9.5 L15 9.5' : 'M5 9.5 L15 3.5');
      }
      if (on && !first) {
        pulseWire(k);
        // breve bagliore sul bit che passa a 1: il piedino ha appena cambiato stato
        if (!ctx.reduced && c.r.animate) {
          c.r.animate([{ filter: 'drop-shadow(0 0 5px rgba(62,224,143,.95))' }, { filter: 'drop-shadow(0 0 0 rgba(62,224,143,0))' }], { duration: CP.dur.slow, easing: 'ease-out' });
        }
      }
    }

    function renderDevices() {
      const o = sim.out;
      const first = drawn.out.luce == null;
      M.OUTS.forEach((k) => {
        if (drawn.out[k] !== o[k]) { drawn.out[k] = o[k]; applyOut(k, o[k], first); }
      });
      if (drawn.door !== sim.door) {
        const firstDoor = drawn.door == null;
        drawn.door = sim.door;
        renderDoor(!firstDoor);
      }
      if (running && speed > 1) lcd = { T: sim.display.T, alarm: sim.display.alarm };
      const lt = F.num1(lcd.T) + ' °C';
      if (drawn.lcd !== lt) {
        const fresh = drawn.lcd != null;
        drawn.lcd = lt;
        refs.parts.lcdText.textContent = lt;
        // il display si aggiorna quando arriva un byte dalla UART: un lampo breve lo fa notare
        if (fresh && !ctx.reduced && !(running && speed > 1) && refs.parts.lcdText.animate) {
          refs.parts.lcdText.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: CP.dur.fast, easing: 'ease-out' });
        }
      }
      if (drawn.alarm !== lcd.alarm) {
        drawn.alarm = lcd.alarm;
        refs.parts.alarm.classList.toggle('is-on', !!lcd.alarm);
        refs.parts.lcd.classList.toggle('is-alarm', !!lcd.alarm);
      }
      const irq = !!tr.isr;
      if (drawn.irq !== irq) { drawn.irq = irq; setIrqBadge(irq); }
    }

    // valori che cambiano piano: aggiornati qualche volta al secondo
    function renderSlow() {
      const R = refs.parts;
      const tint = mix('#0d3346', '#3f3220', clamp(sim.tc / 25, 0, 1));
      if (drawn.tint !== tint) { drawn.tint = tint; R.cavity.style.fill = tint; }
      const fin = mix('#7f938c', '#bfe9ff', clamp(-sim.te / 22, 0, 1));
      if (drawn.fin !== fin) { drawn.fin = fin; R.fins.style.stroke = fin; }
      const fo = Math.round(clamp(sim.frost * 1.15, 0, 0.9) * 50) / 50;
      if (drawn.frost !== fo) { drawn.frost = fo; R.frost.setAttribute('opacity', fo); }
      setTxt('timer', 'conta ' + hms(sim.secCounter));
      const ram = refs.ram;
      const vals = {
        set: F.num1(sim.p.set), diff: F.num1(sim.p.diff), T: F.num1(sim.reg.T),
        sbrina: sim.defrost ? '1' : '0', all: sim.alarm ? '1' : '0', pila: stackShown || '—',
      };
      Object.keys(vals).forEach((k) => { if (drawn.ram[k] !== vals[k]) { drawn.ram[k] = vals[k]; ram[k].textContent = vals[k]; } });
      if (running && speed === 600) {
        setTxt('uart', '→ ' + F.num1(sim.display.T) + ' °C');
        setTxt('adc1', 'canale 0');
        setTxt('adc2', F.num2(M.adcVolts(sim.tc)) + ' V → ' + M.adcCode(sim.tc));
      }
      setV(rd.on, since(sim.t));
      setV(rd.cell, F.temp(M.measuredCell(sim)));
      setV(rd.evap, F.temp(M.measuredEvap(sim)));
      setV(rd.frost, Math.round(sim.frost * 100) + ' %');
      setV(rd.next, sim.defrost ? 'in corso' : 'tra ' + F.hm(sim.p.defrostEvery - sim.secCounter));
      btnDefrost.disabled = sim.defrost;
    }

    /* ---------- listato ---------- */

    let curLi = null;
    function setCurrent(id, r) {
      if (curLi) { curLi.classList.remove('is-current'); curLi.removeAttribute('aria-current'); }
      curLi = id ? lineEls[id] : null;
      if (!curLi) return;
      curLi.classList.add('is-current');
      curLi.setAttribute('aria-current', 'step');
      if (r) setResult(curLi, r);
    }
    function setResult(li, r) {
      li.val.textContent = r.res;
      li.mark.textContent = r.ok === true ? '✓' : r.ok === false ? '✗' : '';
      li.dataset.ok = r.ok === true ? 'si' : r.ok === false ? 'no' : '';
    }
    function markSuspended(id) {
      Object.keys(lineEls).forEach((k) => lineEls[k].classList.toggle('is-ret', k === id));
    }
    function resetListing() {
      Object.keys(lineEls).forEach((k) => {
        const li = lineEls[k];
        li.classList.remove('is-ret', 'is-current');
        li.removeAttribute('aria-current');
        li.val.textContent = '';
        li.mark.textContent = '';
        li.dataset.ok = '';
      });
      curLi = null;
    }
    const lastFlash = {};
    function flashLine(id, res, ok) {
      const li = lineEls[id];
      if (!li) return;
      setResult(li, { res: res, ok: ok == null ? null : ok });
      const now = root.performance.now();
      if (ctx.reduced || !li.animate || now - (lastFlash[id] || 0) < 400) return;
      lastFlash[id] = now;
      li.animate([{ backgroundColor: 'rgba(240,176,74,.42)' }, { backgroundColor: 'rgba(240,176,74,0)' }], { duration: CP.dur.crawl, easing: 'ease-out' });
    }

    /* ---------- spiegazione ---------- */

    function say(step, title, text) {
      ex.step.textContent = step;
      ex.title.textContent = title;
      ex.text.textContent = text;
    }
    function updateNote() {
      let t;
      if (!running) t = 'In pausa. «Un passo» esegue la riga ' + (tr.isr || !tr.irq.length ? tr.pc : 'dell\'interruzione') + '.';
      else if (speed === 1) t = 'Tempo reale, programma al rallentatore: un chip vero ripete questo giro migliaia di volte al secondo.';
      else if (speed === 60) t = 'Un minuto al secondo: il chip fa migliaia di giri, tu ne vedi uno ogni tanto.';
      else t = 'Dieci minuti al secondo: nel listato lampeggiano solo le righe che cambiano qualcosa.';
      ex.note.textContent = t;
    }
    function log(text, kind) {
      if (logEmpty.parentNode) logEmpty.remove();
      const li = h('li', { class: kind ? P + 'log-' + kind : null }, h('time', null, hmm(sim.t)), ' ', text);
      ex.log.prepend(li);
      while (ex.log.children.length > 4) ex.log.lastChild.remove();
      if (!ctx.reduced && li.animate) {
        li.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    function showInfo(key) {
      if (picked && refs.blk[picked]) refs.blk[picked].classList.remove('is-picked');
      picked = key;
      refs.blk[key].classList.add('is-picked');
      ex.infoTitle.textContent = BLK_LABEL[key];
      ex.infoText.textContent = INFO[key];
      ex.info.hidden = false;
      ctx.say(BLK_LABEL[key] + '. ' + INFO[key]);
      if (!ctx.reduced && ex.info.animate) {
        ex.info.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    function hideInfo() {
      if (picked && refs.blk[picked]) {
        refs.blk[picked].classList.remove('is-picked');
        refs.blk[picked].focus();
      }
      picked = null;
      ex.info.hidden = true;
    }

    function describe(id, r, st, isr) {
      const p = st.p;
      const T = F.temp(st.reg.T);
      const set = F.temp(p.set);
      const lim = F.temp(p.set + p.diff);
      const ret = isr ? isr.ret : '0100';
      switch (id) {
        case '0100': return ['leggere', 'L\'ADC legge la sonda della cella', 'All\'ingresso dell\'ADC arrivano ' + F.num2(M.adcVolts(st.tc)) + ' V: la sonda NTC cambia resistenza con la temperatura, e con lei cambia la tensione. Il convertitore la trasforma in un numero a 10 bit, ' + st.reg.code + ', su una scala da 0 a 1.023.'];
        case '0102': return ['leggere', 'Dal numero ai gradi', 'Il numero da solo non dice quanti gradi ci sono. La CPU lo usa come indice in una tabella scritta nella ROM, accanto al programma, e trova ' + T + '.' + (arch === 'harvard' ? ' In un chip Harvard la tabella si legge dal bus del programma.' : '')];
        case '0104': return ['decidere', 'C\'è uno sbrinamento in corso?', st.defrost ? 'Il flag SBRINA in RAM vale 1: la CPU salta alla routine di sbrinamento, all\'indirizzo 0120.' : 'Il flag SBRINA in RAM vale 0: si prosegue con la regolazione della temperatura.'];
        case '0106':
          if (r.wait) return ['decidere', 'Fa troppo caldo?', T + ' è sopra ' + lim + ', ma il compressore si è fermato da poco. Il programma aspetta ancora ' + F.mmss(p.ac - (st.t - st.offSince)) + ' prima di riavviarlo: ripartenze troppo ravvicinate lo rovinerebbero.'];
          if (r.ok === false) return ['decidere', 'Fa troppo caldo?', T + ' è sotto ' + lim + ', la soglia di ripartenza (SET + DIFF): niente da accendere.'];
          if (r.res === 'già acceso') return ['decidere', 'Fa troppo caldo?', 'Sopra ' + lim + ': il compressore è già acceso e continua a lavorare.'];
          return ['decidere', 'Fa troppo caldo?', T + ' è sopra ' + lim + ': la CPU decide COMP ← 1. Il compressore partirà quando il programma scriverà la porta P2, alla riga 010C.'];
        case '0108':
          if (r.ok === false) return ['decidere', 'Fa abbastanza freddo?', st.want.comp ? T + ' è ancora sopra il SET, ' + set + ': COMP resta a 1, c\'è ancora da raffreddare.' : 'Il compressore è fermo e ' + T + ' è sopra il SET: ripartirà solo sopra ' + lim + '. È l\'isteresi, che evita di accenderlo e spegnerlo di continuo.'];
          if (r.res === 'già spento') return ['decidere', 'Fa abbastanza freddo?', T + ' è al SET o sotto: il compressore è già fermo.'];
          return ['decidere', 'Fa abbastanza freddo?', T + ' ha raggiunto il SET, ' + set + ': la CPU decide COMP ← 0. Ripartirà solo sopra ' + lim + ': fra le due soglie c\'è l\'isteresi.'];
        case '010A': return ['decidere', 'La ventola segue il compressore', 'La ventola spinge l\'aria della cella sull\'evaporatore, ma solo con il compressore acceso e la porta chiusa. La CPU legge lo stato dell\'interruttore della porta e decide VENT ← ' + st.want.vent + '.'];
        case '010C': {
          const on = [];
          const off = [];
          // le uscite nuove aspettano il pacchetto che arriva alla porta: qui si guardano quelle
          const out = st === sim && tr.pendingOut ? tr.pendingOut : st.out;
          r.events.forEach((e) => {
            const k = e.slice(4);
            if (e.indexOf('out-') === 0) (out[k] ? on : off).push(OUT_NAME[k]);
          });
          let t = '';
          if (on.length) t += (on.length > 1 ? 'Si accendono ' : 'Si accende ') + listIt(on) + '. ';
          if (off.length) t += (off.length > 1 ? 'Si spengono ' : 'Si spegne ') + listIt(off) + '. ';
          if (!t) t = 'Nessuna uscita cambia: i relè restano come sono.';
          return ['comandare', 'Le decisioni vanno sui piedini', 'La CPU scrive le porte P1 e P2. Ogni bit è un piedino: con 1 il piedino va a 5 V e il suo relè chiude il contatto. ' + t.trim()];
        }
        case '010E': return ['comandare', 'La temperatura al display', 'La UART spedisce ' + T + ' alla scheda del display, un bit alla volta su un filo solo.' + (st.alarm ? ' Con il numero parte anche il segnale di allarme.' : '')];
        case '0110': return ['comandare', 'Da capo', 'Il ciclo ricomincia dalla riga 0100. Un chip vero lo ripete migliaia di volte al secondo: qui lo vedi al rallentatore.'];
        case '0120': return ['sbrinare', 'La sonda dell\'evaporatore', 'Durante lo sbrinamento la CPU legge la seconda sonda, sulle alette dell\'evaporatore, dal canale 1 dell\'ADC: ' + F.temp(st.reg.Tev) + '.'];
        case '0122': return ['sbrinare', 'Resistenza accesa', st.defrost ? 'Compressore e ventola fermi, resistenza accesa: il ghiaccio sulle alette si scioglie. Finché c\'è ghiaccio, l\'evaporatore resta vicino a 0 °C.' : 'Lo sbrinamento è appena finito: questa riga non cambia niente.'];
        case '0124':
          if (r.res === 'RES ← 0') return ['sbrinare', 'Il ghiaccio è sciolto?', 'L\'evaporatore è arrivato a ' + F.temp(st.reg.Tev) + ': la CPU spegne la resistenza e rimette SBRINA a 0. Il timer ricomincia a contare 6 ore.'];
          if (r.res === 'già finito') return ['sbrinare', 'Il ghiaccio è sciolto?', 'Lo sbrinamento è già finito.'];
          return ['sbrinare', 'Il ghiaccio è sciolto?', F.temp(st.reg.Tev) + ' è ancora sotto ' + F.temp(p.defrostEnd) + ': la resistenza resta accesa.' + (speed === 1 && running ? ' Per non aspettare minuti veri, porta il tempo a 60×.' : '')];
        case '0126': return ['sbrinare', 'Alle uscite', 'Salto alla riga 010C: le uscite dello sbrinamento vanno sulle porte come nel ciclo normale.'];
        case '0200': return ['interruzione', 'Routine della porta', st.door ? 'La porta è aperta: la CPU decide LUCE ← 1 e ferma la ventola, così l\'aria fredda non viene spinta fuori.' : 'La porta è già chiusa: questa riga non fa niente.'];
        case '0202': return ['interruzione', 'La porta è chiusa?', !st.door ? 'Sì: luce spenta e allarme azzerato.' : 'No, è aperta: questa riga non fa niente.'];
        case '0204': return ['interruzione', 'Subito alla porta P1', 'La routine scrive la porta P1 senza aspettare il ciclo principale: la luce risponde appena apri, non dopo un giro intero.'];
        case '0206':
        case '0306': return ['interruzione', 'RETI: si torna indietro', 'La CPU riprende dalla pila l\'indirizzo ' + ret + ' e continua il ciclo principale esattamente da dove l\'aveva lasciato.'];
        case '0300': return ['interruzione', 'Il timer ha contato un secondo', 'Il timer chiede un\'interruzione ogni secondo, mentre la CPU fa altro. La routine aggiorna il conteggio: ' + hms(st.secCounter) + ' dall\'ultimo sbrinamento.' + (speed === 1 && running ? ' Qui la vedi una volta al minuto.' : '')];
        case '0302': return ['interruzione', 'Sono passate 6 ore?', st.defrost ? 'Sì: la routine mette SBRINA a 1. Al prossimo giro la riga 0104 farà saltare il programma allo sbrinamento.' : 'Non ancora: mancano ' + F.hm(p.defrostEvery - st.secCounter) + '.'];
        case '0304': return ['interruzione', 'Porta aperta da troppo?', st.alarm ? 'La porta è aperta da più di un minuto: ALLARME ← 1. La UART lo manderà al display al prossimo giro.' : st.door ? 'La porta è aperta da ' + F.mmss(st.doorOpenFor) + ': l\'allarme scatta a ' + F.mmss(p.doorAlarm) + '.' : 'Porta chiusa: nessun allarme.'];
        default: return ['', '', ''];
      }
    }

    function showLine(id, r, st, isr) {
      const d = describe(id, r, st, isr);
      say('Riga ' + id + ' · ' + d[0], d[1], d[2]);
      setCurrent(id, r);
      showPC(id);
      showIns(M.LINES[id].code);
      showROM(id);
      updateNote();
    }

    /* ---------- pacchetti, scie e luci dei blocchi ---------- */

    const hlCount = new Map();
    function hlAdd(el, cls) {
      if (!el) return;
      let m = hlCount.get(el);
      if (!m) { m = new Map(); hlCount.set(el, m); }
      cls.forEach((c) => { const n = (m.get(c) || 0) + 1; m.set(c, n); if (n === 1) el.classList.add(c); });
    }
    function hlRemove(el, cls) {
      const m = el && hlCount.get(el);
      if (!m) return;
      cls.forEach((c) => {
        const n = (m.get(c) || 0) - 1;
        if (n <= 0) { m.delete(c); el.classList.remove(c); } else m.set(c, n);
      });
    }
    function hlClear() {
      hlCount.forEach((m, el) => m.forEach((n, c) => el.classList.remove(c)));
      hlCount.clear();
    }
    function clearLayers() {
      if (!refs) return;
      refs.trails.textContent = '';
      refs.pkts.textContent = '';
    }

    function moveTargets(m) {
      const out = [];
      const add = (el, cls) => { if (el) out.push([el, cls]); };
      add(refs.blk[m.from], ['is-active', 'k-' + m.kind]);
      add(refs.blk[m.to], ['is-active', 'k-' + m.kind]);
      if (m.kind === 'data' || m.kind === 'addr') refs.dbus.forEach((p) => add(p, ['is-active', 'k-' + m.kind]));
      else if (m.kind === 'prog') {
        if (arch === 'harvard') add(refs.pbus, ['is-active']);
        else refs.dbus.concat([refs.vnStub]).forEach((p) => add(p, ['is-active', 'k-prog']));
      } else if (m.route === 'int>cpu:irq') add(refs.irqLine, ['is-active']);
      else if (m.route === 'timer>int') add(refs.tintLine, ['is-active']);
      if (m.part) add(refs.parts[m.part], ['is-sig', 'k-' + m.kind]);
      if (m.wire) add(refs.wires[m.wire], ['is-sig', 'k-' + m.kind]);
      return out;
    }

    function packet(kind, label, at) {
      const w = Math.max(28, String(label).length * 6.7 + 14);
      const g = s('g', { class: P + 'pkt k-' + kind, transform: 'translate(' + r1(at[0]) + ' ' + r1(at[1]) + ')' },
        s('rect', { x: r1(-w / 2), y: -9, width: r1(w), height: 18, rx: 9 }),
        s('text', { x: 0, y: 3.9, 'text-anchor': 'middle', class: 'mono' }, label));
      refs.pkts.append(g);
      return g;
    }
    function trail(kind, pts, len) {
      const p = s('path', { d: ptsD(pts), class: P + 'trail k-' + kind, 'stroke-dasharray': Math.ceil(len) + ' ' + Math.ceil(len + 4), 'stroke-dashoffset': Math.ceil(len) });
      refs.trails.append(p);
      return p;
    }
    function fade(el) {
      anim(300, (q) => el.setAttribute('opacity', (1 - q).toFixed(2)), CP.ease.linear).then(() => el.remove());
    }

    function departure(m) {
      if (m.from === 'cpu' && m.kind === 'data') showA(valueOf(m.label));
      if (m.from === 'adc' && m.to === 'cpu') setTxt('adc2', (adcVolts ? adcVolts + ' → ' : '') + m.label);
      if (m.kind === 'irq' && m.to === 'cpu') showIns('interruzione: salva il PC');
    }
    function arrival(m) {
      if (m.to === 'cpu') {
        if (m.kind === 'addr') showPC(valueOf(m.label));
        else if (m.kind === 'irq') setIrqBadge(true);
        else if (!m.fetch) showA(valueOf(m.label));
      }
      if (m.kind === 'analog') {
        adcVolts = m.label;
        setTxt('adc1', m.from === 'probeC' ? 'canale 0' : 'canale 1');
        setTxt('adc2', m.label);
      }
      if (tr.pendingOut && m.to === 'p1') { sim.out.luce = tr.pendingOut.luce; sim.out.vent = tr.pendingOut.vent; }
      if (tr.pendingOut && m.to === 'p2') { sim.out.res = tr.pendingOut.res; sim.out.comp = tr.pendingOut.comp; }
      if (m.to === 'uart') setTxt('uart', '→ ' + m.label + ' °C');
      if (m.to === 'display' && m.lcd) lcd = m.lcd;
      if (m.to === 'int') setTxt('int', m.from === 'sw' ? '← porta' : '← timer');
      if (m.push) stackShown = m.push;
      if (m.kind === 'addr' && m.to === 'cpu') { stackShown = null; setTxt('int', 'porta · timer'); }
    }

    let statics = [];
    function playMove(m, dur) {
      const pts = refs.routes[m.route];
      const targets = moveTargets(m);
      targets.forEach((t) => hlAdd(t[0], t[1]));
      departure(m);
      if (!pts) { arrival(m); return Promise.resolve(); }
      const cum = cumLens(pts);
      const len = cum[cum.length - 1];
      const path = trail(m.kind, pts, len);
      if (ctx.reduced) {
        // nessun movimento: la scia compare intera e resta fino alla riga seguente
        path.setAttribute('stroke-dashoffset', '0');
        statics.push(path);
        arrival(m);
        return Promise.resolve();
      }
      const pk = packet(m.kind, m.label, pts[0]);
      return anim(dur, (q) => {
        const pt = pointAt(pts, cum, q);
        pk.setAttribute('transform', 'translate(' + r1(pt[0]) + ' ' + r1(pt[1]) + ')');
        path.setAttribute('stroke-dashoffset', r1(len * (1 - q)));
      }).then((ok) => {
        pk.remove();
        targets.forEach((t) => hlRemove(t[0], t[1]));
        if (ok) { arrival(m); fade(path); } else path.remove();
      });
    }

    async function runStage(st, g) {
      const dur = st.ext ? T_EXT : st.fast ? T_IRQ : T_HOP;
      if (!st.moves.length) {
        // un ciclo in cui la CPU lavora da sola (confronti, salti)
        hlAdd(refs.blk.cpu, ['is-active']);
        if (!ctx.reduced) { await sleep(dur); hlRemove(refs.blk.cpu, ['is-active']); }
        return;
      }
      await Promise.all(st.moves.map((m) => playMove(m, dur)));
      if (g === tr.gen && !ctx.reduced) await sleep(T_GAP);
    }

    /* ---------- la vista al rallentatore ---------- */

    function fetchMove(id) {
      const l = M.LINES[id];
      return { kind: 'prog', fetch: true, route: arch === 'harvard' ? 'rom>cpu:h' : 'rom>cpu:vn', from: 'rom', to: 'cpu', label: hex(l.bytes) };
    }
    function toMove(m0, st) {
      const m = { kind: m0.kind, from: m0.from, to: m0.to, label: m0.label, route: m0.from + '>' + m0.to };
      if (m.kind === 'prog') m.route = arch === 'harvard' ? 'rom>cpu:h' : 'rom>cpu:vn';
      if (m.kind === 'analog') { m.part = m0.from; m.wire = m0.from === 'probeC' ? 'adc0' : 'adc1'; m.ext = true; }
      if (m.kind === 'serial') { m.part = 'lcd'; m.wire = 'display'; m.ext = true; m.lcd = { T: st.display.T, alarm: st.display.alarm }; }
      return m;
    }
    function planLine(line, r, next, fetchNext, st) {
      const pre = [];
      const bus = [];
      const prog = [];
      const post = [];
      r.moves.forEach((m0) => {
        const m = toMove(m0, st);
        if (m.kind === 'analog') pre.push(m);
        else if (m.kind === 'serial') post.push(m);
        else if (m.kind === 'prog') prog.push(m);
        else bus.push(m);
      });
      const stages = [];
      if (pre.length) stages.push({ moves: pre, ext: true });
      if (arch === 'vn') {
        // un bus solo: prima l'istruzione, poi i dati, a turno
        stages.push({ moves: [fetchMove(line.id)] });
        for (let i = 0; i < Math.max(line.data, bus.length); i++) stages.push({ moves: bus[i] ? [bus[i]] : [] });
        prog.forEach((m) => stages.push({ moves: [m] }));
      } else {
        // Harvard: mentre i dati viaggiano, la CPU preleva già l'istruzione seguente
        if (!tr.prefetched) stages.push({ moves: [fetchMove(line.id)] });
        if (prog.length) {
          prog.forEach((m) => stages.push({ moves: [m] }));
          if (fetchNext && next) stages.push({ moves: [fetchMove(next)] });
        } else {
          const n = Math.max(1, line.data, bus.length);
          for (let i = 0; i < n; i++) {
            const ms = bus[i] ? [bus[i]] : [];
            if (i === 0 && fetchNext && next) ms.push(fetchMove(next));
            stages.push({ moves: ms });
          }
        }
      }
      if (post.length) stages.push({ moves: post, ext: true });
      return stages;
    }

    function flushPending() {
      if (tr.pendingOut) { Object.assign(sim.out, tr.pendingOut); tr.pendingOut = null; }
    }

    async function irqEntry(g) {
      const kind = tr.irq.shift();
      const ret = tr.pc;
      tr.isr = { kind: kind, ret: ret };
      tr.pc = kind === 'porta' ? '0200' : '0300';
      tr.prefetched = false;
      tr.cur = null;
      setCurrent(null);
      markSuspended(ret);
      say(kind === 'porta' ? 'Interruzione · piedino INT0' : 'Interruzione · timer',
        kind === 'porta' ? 'La porta chiede attenzione' : 'Il timer chiede attenzione',
        kind === 'porta'
          ? 'L\'interruttore della porta ha cambiato stato sul piedino INT0. La CPU finisce l\'istruzione in corso, salva nella pila in RAM l\'indirizzo ' + ret + ' e salta alla routine 0200.'
          : 'È passato un secondo: il timer chiede un\'interruzione. La CPU salva nella pila in RAM l\'indirizzo ' + ret + ' e salta alla routine 0300.');
      updateNote();
      const src = kind === 'porta'
        ? { kind: 'irq', route: 'sw>int', from: 'sw', to: 'int', label: 'INT0', part: 'sw', wire: 'sw', ext: true }
        : { kind: 'irq', route: 'timer>int', from: 'timer', to: 'int', label: '1 s' };
      const stages = [
        { moves: [src], ext: src.ext, fast: true },
        { moves: [{ kind: 'irq', route: 'int>cpu:irq', from: 'int', to: 'cpu', label: 'IRQ' }], fast: true },
        { moves: [{ kind: 'addr', route: 'cpu>ram', from: 'cpu', to: 'ram', label: 'PC ' + ret, push: ret }], fast: true },
      ];
      for (let i = 0; i < stages.length; i++) {
        if (g !== tr.gen) return;
        await runStage(stages[i], g);
      }
    }

    async function traceStep() {
      const g = tr.gen;
      hlClear();
      statics.forEach((p) => p.remove());
      statics = [];
      if (!tr.isr && tr.irq.length) { await irqEntry(g); return; }
      const id = tr.pc;
      const line = M.LINES[id];
      const mutate = speed === 1 || !running;
      const st = mutate ? sim : M.clone(sim);
      const before = mutate ? Object.assign({}, sim.out) : null;
      const isr = tr.isr;
      const r = M.exec(st, id, { ret: isr ? isr.ret : null });
      if (mutate && r.commit) {
        // le uscite cambiano quando il pacchetto arriva alla porta, non prima
        tr.pendingOut = Object.assign({}, sim.out);
        Object.assign(sim.out, before);
      }
      let next = r.next;
      const reti = next === null;
      if (reti) next = isr ? isr.ret : '0100';
      const fetchNext = !tr.irq.length || (!!isr && !reti);
      const stages = planLine(line, r, next, fetchNext, st);
      tr.cur = id;
      tr.pc = next;
      tr.prefetched = arch === 'harvard' && fetchNext;
      if (reti) tr.isr = null;
      showLine(id, r, st, isr);
      for (let i = 0; i < stages.length; i++) {
        if (g !== tr.gen) return;
        await runStage(stages[i], g);
      }
      if (g !== tr.gen) return;
      flushPending();
      if (reti) {
        markSuspended(null);
        setIrqBadge(false);
        if (isr && isr.kind === 'porta') markGoal('irq');
      }
      if (mutate) handleEvents(r.events, 'trace');
    }

    async function traceLoop() {
      tr.loop = true;
      const g = tr.gen;
      while (g === tr.gen) {
        const auto = running && speed < 600;
        if (!auto) {
          if (tr.steps <= 0) break;
          tr.steps--;
        }
        await traceStep();
        if (g !== tr.gen) return;
        if (running && speed < 600) {
          await sleep(ctx.reduced ? T_REDUCED : T_DWELL);
          if (g !== tr.gen) return;
        }
      }
      if (g === tr.gen) tr.loop = false;
      updateNote();
    }
    function kick() {
      if (tr.loop) return;
      if (!(running && speed < 600) && tr.steps <= 0) return;
      traceLoop();
    }
    function cancelTrace() {
      tr.gen++;
      tr.loop = false;
      cancelAnims();
      flushPending();
      hlClear();
      statics = [];
      clearLayers();
    }
    function queueIrq(kind) {
      if (tr.irq.indexOf(kind) < 0) tr.irq.push(kind);
      kick();
    }
    // la routine della porta eseguita subito, quando il chip lavora da solo (60× e 600×)
    function syncDoor() { ['0200', '0202', '0204'].forEach((id) => M.exec(sim, id)); }

    /* ---------- eventi del frigorifero ---------- */

    function handleEvents(ev, src) {
      ev.forEach((e) => {
        if (e === 'set-reached') {
          log('Cella a ' + F.temp(sim.p.set) + ' dopo ' + since(sim.t) + ': il compressore si ferma. Ripartirà sopra ' + F.temp(sim.p.set + sim.p.diff) + '.', 'ok');
          ctx.say('La cella è arrivata al SET, ' + F.temp(sim.p.set) + ', dopo ' + since(sim.t) + '. Il compressore si ferma.');
          markGoal('set');
        } else if (e === 'defrost-start') {
          log('Il timer ha contato 6 ore: SBRINA ← 1, comincia lo sbrinamento.');
          ctx.say('Sono passate 6 ore: comincia lo sbrinamento.');
          startedDefrost();
        } else if (e === 'defrost-end') {
          const min = Math.max(1, Math.round((sim.t - sim.defrostStart) / 60));
          if (sim.defrostFrost < 0.05) {
            // evaporatore già sopra la soglia di fine sbrinamento: niente ghiaccio da sciogliere
            log('Sbrinamento finito subito: sulle alette non c\'era ghiaccio. Riprova quando il frigo è freddo da un po\'.');
            ctx.say('Sbrinamento finito subito: non c\'era ghiaccio da sciogliere.');
          } else {
            log('Sbrinamento finito in ' + min + ' min: ghiaccio sciolto, si riparte.', 'ok');
            ctx.say('Sbrinamento finito in ' + min + ' minuti.');
            markGoal('def');
          }
        } else if (e === 'alarm') {
          log('Porta aperta da un minuto: scatta l\'allarme. Chiudila!', 'warn');
          ctx.say('Allarme: la porta è aperta da un minuto.');
          if (running && speed === 600) flashLine('0304', 'ALLARME ← 1', true);
          else queueIrq('timer');
        }
        if (src === 'core' && running && speed === 600) {
          if (e === 'comp-on') flashLine('0106', 'COMP ← 1', true);
          if (e === 'comp-off') flashLine('0108', 'COMP ← 0', true);
          if (e === 'defrost-end') flashLine('0124', 'RES ← 0', true);
          if (e === 'heater-on') flashLine('0122', 'RES ← 1');
        }
      });
    }
    function startedDefrost() {
      if (running && speed === 600) {
        setSpeed(60, 'auto');
        log('Il tempo rallenta a 60× per mostrarti lo sbrinamento.');
      }
      if (speed < 600 || !running) queueIrq('timer');
    }

    /* ---------- obiettivo ---------- */

    const GOAL_TEXT = { set: 'Cella al SET', irq: 'Interruzione della porta seguita', def: 'Sbrinamento visto' };
    function markGoal(k) {
      if (goal[k]) return;
      goal[k] = true;
      goalEls[k].classList.add('is-ok');
      goalEls[k].append(h('span', { class: 'cp-sr' }, ' (fatto)'));
      if (goal.set && goal.irq && goal.def && !goal.done) {
        goal.done = true;
        ctx.done();
        log('Obiettivo raggiunto: hai visto il chip regolare, rispondere a un\'interruzione e sbrinare.', 'ok');
        ctx.say('Obiettivo raggiunto: cella al SET, interruzione della porta e sbrinamento.');
      } else {
        log('✓ ' + GOAL_TEXT[k] + '.', 'ok');
      }
    }

    /* ---------- azioni ---------- */

    function updateRunBtn() {
      btnRun.querySelector('.cp-ico').textContent = running ? '❚❚' : '▶︎';
      btnRun.lastChild.textContent = running ? 'Pausa' : 'Avvia';
    }
    function setRunning(v, user) {
      if (running === v) return;
      running = v;
      updateRunBtn();
      if (v && speed > 1) syncDoor();
      if (v && speed === 600) { tr.irq = []; showFast(); }
      if (v) kick();
      updateNote();
      if (user) ctx.say(v ? 'Avviato, tempo a ' + speed + '×.' : 'In pausa.');
    }
    function stepOnce() {
      if (running) setRunning(false);
      tr.steps = Math.min(tr.steps + 1, 3);
      kick();
    }
    function showFast() {
      setCurrent(null);
      showPC(null);
      showIns('ciclo principale a tutta velocità');
      showA('');
      say('Tempo veloce · 600×', 'Il chip corre da solo', 'A questa velocità il ciclo principale gira migliaia di volte per ogni secondo che vedi: impossibile seguirlo riga per riga. Torna a 1× o a 60× per il rallentatore.');
    }
    function setSpeed(v, why) {
      const prev = speed;
      if (v === prev) return;
      speed = v;
      segSpeed.set(v);
      if (v === 600) {
        cancelTrace();
        resetListing(); // i risultati del rallentatore sarebbero vecchi: a 600× lampeggiano solo le righe che cambiano qualcosa
        tr.pc = '0100';
        tr.isr = null;
        tr.irq = [];
        tr.prefetched = false;
        stackShown = null;
        markSuspended(null);
        setIrqBadge(false);
        setTxt('int', 'porta · timer');
        if (running) showFast();
      } else if (prev === 600) {
        tr.pc = '0100';
        tr.isr = null;
        tr.prefetched = false;
      }
      if (running && v > 1) syncDoor();
      chart.target = SPEED_INFO[v].win;
      chartWin.textContent = SPEED_INFO[v].winLabel;
      updateNote();
      if (why === 'user') ctx.say('Tempo a ' + v + '×: ' + SPEED_INFO[v].title.toLowerCase() + '.');
      kick();
    }
    function toggleDoor() {
      const open = !sim.door;
      if (open && running && speed > 1) {
        setSpeed(1, 'door');
        log('Porta aperta: il tempo torna a 1× per farti vedere l\'interruzione.');
      }
      const coreHandles = running && speed > 1;
      const ev = M.setDoor(sim, open, coreHandles);
      if (!ev.length) return;
      if (coreHandles && speed === 600) flashLine('0202', 'L0 · ALL. 0', true);
      else queueIrq('porta');
      let msg = open ? 'Porta aperta.' : 'Porta chiusa.';
      if (!running) msg += ' Il chip è in pausa: premi «Un passo» per vederlo rispondere.';
      ctx.say(msg);
      updateNote();
    }
    function manualDefrost() {
      if (!M.startDefrost(sim, 'manual')) return;
      log('Sbrinamento chiesto a mano: SBRINA ← 1. Al prossimo giro la riga 0104 fa il salto.');
      ctx.say('Sbrinamento avviato: SBRINA vale 1.');
      btnDefrost.disabled = true;
      if (running && speed === 600) {
        setSpeed(60, 'auto');
        log('Il tempo rallenta a 60× per mostrarti lo sbrinamento.');
      }
    }
    function setSET(v) {
      sim.p.set = v;
      chart.dirty = true;
    }
    function setArch(v) {
      if (v === arch) return;
      arch = v;
      tr.prefetched = false;
      renderArch(true);
      rd.bus.set(String(M.busCycles(v)));
      const msg = v === 'vn'
        ? 'von Neumann: un bus solo per programma e dati. Prima l\'istruzione, poi il dato, a turno: ' + M.busCycles('vn') + ' cicli di bus per lo stesso giro.'
        : 'Harvard: il programma ha un bus tutto suo. Mentre un dato viaggia, la CPU preleva già l\'istruzione seguente: ' + M.busCycles('harvard') + ' cicli di bus per giro.';
      log(msg);
      ctx.say(msg);
    }
    function resetAll() {
      cancelTrace();
      sim = M.create({ set: sim.p.set });
      tr.pc = '0100';
      tr.cur = null;
      tr.isr = null;
      tr.irq = [];
      tr.prefetched = false;
      tr.steps = 0;
      tr.minute = 0;
      stackShown = null;
      adcVolts = '';
      lcd = { T: sim.display.T, alarm: false };
      chart.samples = [];
      chart.lastT = -1e9;
      chart.last = null;
      chart.dirty = true;
      sample(true);
      resetListing();
      markSuspended(null);
      setIrqBadge(false);
      showPC('0100');
      showA('');
      showIns(M.LINES['0100'].code);
      showROM('0100');
      setTxt('uart', '→ display');
      setTxt('int', 'porta · timer');
      setTxt('adc1', 'canale 0');
      setTxt('adc2', '—');
      if (speed !== 1) setSpeed(1, 'reset');
      intro();
      ctx.say('Si ricomincia: frigorifero appena acceso, con 25 °C dentro.');
      log('Frigorifero acceso: dentro ci sono 25 °C.');
      kick();
    }
    function intro() {
      say('Pronto', 'Un frigorifero appena acceso', 'Dentro ci sono 25 °C, come in cucina. Il microcontrollore ripete sempre lo stesso programma: legge la sonda, decide, comanda i relè. ' +
        (running ? 'Segui la riga evidenziata e i pacchetti che viaggiano nel chip.' : 'Premi «Avvia» o «Un passo» per farlo partire.'));
      updateNote();
    }

    /* ---------- grafico della temperatura ---------- */

    const chart = { svg: null, W: 1000, H: 214, ml: 104, mr: 54, pt: 12, ph: 116, lo: 0, hi: 26, win: SPEED_INFO[1].win, target: SPEED_INFO[1].win, samples: [], lastT: -1e9, last: null, dirty: true, lastDraw: 0, lastAria: 0 };
    const TRACKS = [['c', 'compressore', 140], ['d', 'porta aperta', 158], ['f', 'sbrinamento', 176]];

    function sample(force) {
      const v = { t: sim.t, T: sim.tc, c: sim.out.comp, d: sim.door ? 1 : 0, f: sim.defrost ? 1 : 0 };
      const l = chart.last;
      const changed = !l || l.c !== v.c || l.d !== v.d || l.f !== v.f;
      if (!force && !changed && sim.t - chart.lastT < 10) return;
      chart.samples.push(v);
      chart.last = v;
      chart.lastT = sim.t;
      chart.dirty = true;
      if (chart.samples.length > 7000) chart.samples.splice(0, 1500);
    }

    function buildChart() {
      if (chart.svg) chart.svg.remove();
      const W = size === 'sm' ? 360 : size === 'md' ? 760 : 1000;
      chart.W = W;
      chart.ml = size === 'sm' ? 90 : 104;
      chart.mr = size === 'sm' ? 48 : 54;
      const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + chart.H, class: P + 'chart-svg', role: 'img', 'aria-label': 'Grafico della temperatura della cella' });
      const pw = W - chart.ml - chart.mr;
      chart.gGrid = s('g', { class: P + 'ch-grid' });
      chart.gTime = s('g', { class: P + 'ch-time' });
      chart.band = s('rect', { x: chart.ml, width: pw, class: P + 'ch-band' });
      chart.setLine = s('line', { x1: chart.ml, x2: W - chart.mr, class: P + 'ch-set' });
      chart.hiLine = s('line', { x1: chart.ml, x2: W - chart.mr, class: P + 'ch-hi' });
      // le soglie hanno un cartellino nel margine destro, fuori dal grafico: niente sovrapposizioni con la curva
      chart.setLbl = s('text', { x: W - chart.mr + 6, class: 'mono ' + P + 'ch-lbl set' });
      chart.hiLbl = s('text', { x: W - chart.mr + 6, class: 'mono ' + P + 'ch-lbl' });
      chart.defBand = s('path', { class: P + 'ch-defband' });
      chart.path = s('path', { class: P + 'ch-temp' });
      chart.dot = s('circle', { r: 4.5, class: P + 'ch-dot' });
      chart.dotLbl = s('text', { class: 'mono ' + P + 'ch-dotlbl', 'text-anchor': 'start' });
      chart.tracks = TRACKS.map((t) => ({
        k: t[0], y: t[2],
        path: s('path', { class: P + 'ch-trk k-' + t[0] }),
        lbl: s('text', { x: chart.ml - 8, y: t[2] + 10, 'text-anchor': 'end', class: P + 'ch-tlbl' }, t[1]),
        base: s('line', { x1: chart.ml, x2: W - chart.mr, y1: t[2] + 12, y2: t[2] + 12, class: P + 'ch-tbase' }),
      }));
      const clip = s('clipPath', { id: P + 'chclip' }, s('rect', { x: chart.ml, y: 0, width: pw, height: chart.H }));
      const plot = s('g', { 'clip-path': 'url(#' + P + 'chclip)' }, chart.defBand, chart.band, chart.hiLine, chart.setLine, chart.path,
        chart.tracks.map((t) => t.path));
      const trk = [];
      chart.tracks.forEach((t) => trk.push(t.base, t.lbl));
      svg.append.apply(svg, [s('defs', null, clip), chart.gGrid, chart.gTime, plot].concat(trk, [chart.setLbl, chart.hiLbl, chart.dot, chart.dotLbl]));
      chart.svg = svg;
      chartBox.append(svg);
      chart.dirty = true;
    }

    function lowerBound(arr, t) {
      let lo = 0;
      let hi = arr.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < t) lo = m + 1; else hi = m; }
      return lo;
    }

    function renderChart(now) {
      const c = chart;
      if (!c.svg) return;
      const easing = Math.abs(c.win - c.target) > 0.5;
      if (!c.dirty && !easing && !(running && now - c.lastDraw > 250)) return;
      if (now - c.lastDraw < 110 && !c.force) return;
      c.force = false;
      c.lastDraw = now;
      c.dirty = false;
      if (ctx.reduced) c.win = c.target;
      else if (easing) { const lw = Math.log(c.win); const lt = Math.log(c.target); c.win = Math.abs(lt - lw) < 0.004 ? c.target : Math.exp(lw + (lt - lw) * 0.3); }
      const tNow = sim.t + sim.acc;
      const t1 = Math.max(tNow, c.win);
      const t0 = t1 - c.win;
      const pw = c.W - c.ml - c.mr;
      const X = (t) => c.ml + (t - t0) / c.win * pw;
      const S = c.samples;
      const i0 = Math.max(0, lowerBound(S, t0) - 1);
      let tmin = sim.tc;
      let tmax = sim.tc;
      for (let i = i0; i < S.length; i++) { if (S[i].T < tmin) tmin = S[i].T; if (S[i].T > tmax) tmax = S[i].T; }
      const set = sim.p.set;
      const top = set + sim.p.diff;
      let lo = Math.min(tmin, set) - 1.2;
      let hi = Math.max(tmax, top) + 1.2;
      if (hi - lo < 7) { const mid = (hi + lo) / 2; lo = mid - 3.5; hi = mid + 3.5; }
      if (ctx.reduced || !isFinite(c.lo)) { c.lo = lo; c.hi = hi; }
      else {
        c.lo += (lo - c.lo) * 0.3;
        c.hi += (hi - c.hi) * 0.3;
        if (Math.abs(lo - c.lo) > 0.02 || Math.abs(hi - c.hi) > 0.02) c.dirty = true;
      }
      if (easing) c.dirty = true;
      const Y = (T) => c.pt + (c.hi - T) / (c.hi - c.lo) * c.ph;

      // griglia: gradi
      const span = c.hi - c.lo;
      const stepT = span > 16 ? 5 : 2;
      let g = '';
      for (let T = Math.ceil(c.lo / stepT) * stepT; T <= c.hi; T += stepT) {
        const y = r1(Y(T));
        g += '<line x1="' + c.ml + '" x2="' + (c.W - c.mr) + '" y1="' + y + '" y2="' + y + '"/>' +
          '<text x="' + (c.ml - 8) + '" y="' + r1(y + 4) + '" text-anchor="end">' + String(T).replace('-', '−') + ' °C</text>';
      }
      c.gGrid.innerHTML = g;
      // griglia: tempo
      const stepX = c.win <= 1500 ? 300 : c.win <= 5 * 3600 ? 1800 : 7200;
      let gt = '';
      for (let t = Math.ceil(t0 / stepX) * stepX; t <= t1 + 1; t += stepX) {
        const x = r1(X(t));
        if (x < c.ml - 0.5 || x > c.W - c.mr + 0.5) continue;
        gt += '<line x1="' + x + '" x2="' + x + '" y1="' + c.pt + '" y2="190"/>' +
          '<text x="' + x + '" y="207" text-anchor="middle">' + hmm(t) + '</text>';
      }
      c.gTime.innerHTML = gt;

      // soglie
      const ySet = Y(set);
      const yTop = Y(top);
      c.band.setAttribute('y', r1(yTop));
      c.band.setAttribute('height', r1(Math.max(0, ySet - yTop)));
      c.setLine.setAttribute('y1', r1(ySet));
      c.setLine.setAttribute('y2', r1(ySet));
      c.hiLine.setAttribute('y1', r1(yTop));
      c.hiLine.setAttribute('y2', r1(yTop));
      let ya = yTop + 4;
      let yb = ySet + 4;
      if (yb - ya < 13) { const mid = (ya + yb) / 2; ya = mid - 6.5; yb = mid + 6.5; }
      c.hiLbl.setAttribute('y', r1(ya));
      c.hiLbl.textContent = F.num1(top) + ' °C';
      c.setLbl.setAttribute('y', r1(yb));
      c.setLbl.textContent = F.num1(set) + ' °C';

      // curva, con un minimo e un massimo per ogni pixel
      let d = '';
      let col = null;
      let bmin = null;
      let bmax = null;
      const pts = [];
      const flush = () => {
        if (!bmin) return;
        if (bmin === bmax) pts.push(bmin);
        else if (bmin.t < bmax.t) pts.push(bmin, bmax);
        else pts.push(bmax, bmin);
      };
      for (let i = i0; i < S.length; i++) {
        const v = S[i];
        const cx = Math.floor(X(v.t));
        if (cx !== col) { flush(); col = cx; bmin = v; bmax = v; }
        else { if (v.T < bmin.T) bmin = v; if (v.T > bmax.T) bmax = v; }
      }
      flush();
      pts.push({ t: tNow, T: sim.tc });
      pts.forEach((v, i) => { d += (i ? 'L' : 'M') + r1(X(v.t)) + ' ' + r1(Y(v.T)); });
      c.path.setAttribute('d', d);
      const xn = X(tNow);
      const yn = Y(sim.tc);
      c.dot.setAttribute('cx', r1(xn));
      c.dot.setAttribute('cy', r1(yn));
      // l'etichetta del punto sta a sinistra, ma non sopra le scale dei gradi
      const toLeft = xn - c.ml > 96;
      c.dotLbl.setAttribute('text-anchor', toLeft ? 'end' : 'start');
      c.dotLbl.setAttribute('x', r1(toLeft ? xn - 9 : xn + 9));
      c.dotLbl.setAttribute('y', r1(yn < c.pt + 18 ? yn + 18 : yn - 9));
      // lo stesso numero del display e dell'indicatore «Cella»: quello misurato dal chip
      c.dotLbl.textContent = F.temp(M.measuredCell(sim));

      // tracce digitali e bande dello sbrinamento
      const runs = (key) => {
        const out = [];
        let start = null;
        for (let i = i0; i < S.length; i++) {
          const v = S[i];
          if (v[key] && start == null) start = Math.max(v.t, t0);
          else if (!v[key] && start != null) { out.push([start, v.t]); start = null; }
        }
        if (start != null) out.push([start, tNow]);
        return out;
      };
      c.tracks.forEach((t) => {
        const y = t.y;
        t.path.setAttribute('d', runs(t.k).map((ru) => {
          const a = r1(X(ru[0]));
          const b = r1(Math.max(X(ru[1]), X(ru[0]) + 1.5));
          return 'M' + a + ' ' + y + 'H' + b + 'V' + (y + 12) + 'H' + a + 'Z';
        }).join(''));
      });
      c.defBand.setAttribute('d', runs('f').map((ru) => {
        const a = r1(X(ru[0]));
        const b = r1(Math.max(X(ru[1]), X(ru[0]) + 1.5));
        return 'M' + a + ' ' + c.pt + 'H' + b + 'V' + (c.pt + c.ph) + 'H' + a + 'Z';
      }).join(''));

      if (now - c.lastAria > 3000) {
        c.lastAria = now;
        c.svg.setAttribute('aria-label', 'Grafico della temperatura della cella, ' + SPEED_INFO[speed].winLabel + ': adesso ' + F.temp(sim.tc) +
          '. Il compressore si ferma a ' + F.temp(set) + ' e riparte sopra ' + F.temp(top) + '; ora è ' + (sim.out.comp ? 'acceso' : 'spento') + '.');
      }
    }

    /* ---------- ciclo dei fotogrammi ---------- */

    let fanAngle = 0;
    let fanSpeed = 0;
    let slowAcc = 1e9;
    let dropT = 0;
    ctx.tick((dt, t) => {
      if (running) {
        const ev = M.advance(sim, (dt / 1000) * speed, { control: speed > 1 });
        if (ev.length) handleEvents(ev, 'core');
        if (speed === 1) {
          // a 1× mostriamo l'interruzione del timer una volta al minuto
          const minute = Math.floor(sim.t / 60);
          if (minute > tr.minute) { tr.minute = minute; if (!tr.isr) queueIrq('timer'); }
        } else tr.minute = Math.floor(sim.t / 60);
        sample(false);
      }
      renderDevices();
      const R = refs.parts;
      // ventola: accelera e rallenta come un motore vero
      if (!ctx.reduced) {
        fanSpeed += ((sim.out.vent ? 760 : 0) - fanSpeed) * Math.min(1, dt / 450);
        if (fanSpeed > 0.5) {
          fanAngle = (fanAngle + fanSpeed * dt / 1000) % 360;
          R.blades.setAttribute('transform', 'rotate(' + r1(fanAngle) + ')');
        }
      }
      // gocce durante lo sbrinamento, mentre il ghiaccio fonde
      const melting = sim.out.res && sim.frost > 0.005 && sim.te > -1.5;
      R.drops.classList.toggle('is-on', !!melting);
      if (melting && !ctx.reduced) {
        dropT += dt;
        Array.prototype.forEach.call(R.drops.children, (c, i) => {
          const q = ((dropT / 900) + i / 3) % 1;
          c.setAttribute('cy', r1(258 + q * 46));
          c.setAttribute('opacity', (1 - q).toFixed(2));
        });
      }
      slowAcc += dt;
      if (slowAcc > 120) { slowAcc = 0; renderSlow(); }
      renderChart(t);
    });

    /* ---------- dimensioni e disposizione ---------- */

    function renderAll() {
      renderArch(false);
      renderDevices();
      renderSlow();
      if (tr.cur) { showPC(tr.cur); showIns(M.LINES[tr.cur].code); showROM(tr.cur); }
      else if (running && speed === 600) showFast();
      else { showPC(tr.pc); showIns(M.LINES[tr.pc].code); showROM(tr.pc); }
      setIrqBadge(!!tr.isr);
      if (picked && refs.blk[picked]) refs.blk[picked].classList.add('is-picked');
    }
    function applySize(w) {
      const sz = w >= 1040 ? 'xl' : w >= 700 ? 'md' : 'sm';
      if (sz === size) return;
      size = sz;
      wrapEl.dataset.size = sz;
      const L = sz === 'sm' ? LAYOUTS.narrow : LAYOUTS.wide;
      if (L !== layout) {
        const was = tr.loop;
        cancelTrace();
        layout = L;
        buildStage(L);
        renderAll();
        if (was || running) kick();
      }
      buildChart();
      chart.force = true;
    }

    applySize(mount.clientWidth || 1000);
    if ('ResizeObserver' in root) {
      new ResizeObserver((entries) => {
        const w = Math.round(entries[0].contentRect.width);
        if (w) applySize(w);
      }).observe(mount);
    }

    sample(true);
    showROM('0100');
    showIns(M.LINES['0100'].code);
    rd.bus.querySelector('.v').textContent = String(M.busCycles(arch));
    renderSlow();
    intro();
    log('Frigorifero acceso: dentro ci sono 25 °C.');
    if (!ctx.reduced) setRunning(true);
    else updateRunBtn();
  });
})(window);
