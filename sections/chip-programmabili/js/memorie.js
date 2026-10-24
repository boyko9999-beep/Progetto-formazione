/*
 * Capitolo 2 · Memorie che si programmano. Laboratorio «Scrivi e cancella la memoria».
 *
 * Una memoria didattica di 8 parole da 8 bit, in cinque tecnologie: ROM a maschera, PROM, EPROM, EEPROM, Flash.
 * Ogni clic su una cella chiede di cambiare quel bit; il modello puro (js/memorie-core.js) applica le regole
 * fisiche della tecnologia scelta e il palco le mostra: scintille dei fusibili, luce ultravioletta dalla finestra,
 * elettroni che entrano ed escono dai gate flottanti. La lente accanto ingrandisce la cella selezionata.
 *
 * Movimento: solo transform, opacity e poche coordinate SVG; con movimento ridotto gli stati cambiano subito.
 */
(function () {
  'use strict';
  if (!window.CP) return;

  CP.lab('memorie', function (mount, ctx) {
    const { h, s, ui, fmt } = CP;
    const M = window.MemorieCore;
    if (!M) throw new Error('Manca js/memorie-core.js');

    const FG = { eprom: true, eeprom: true, flash: true }; // tecnologie a gate flottante
    const hex2 = (n) => fmt.hex(n, 2);
    const lerp = (a, b, p) => a + (b - a) * p;
    const clamp01 = (p) => Math.max(0, Math.min(1, p));

    /* ---------- testi ---------- */

    const T = {
      rom: {
        seg: 'ROM', name: 'ROM a maschera', step: 'ROM a maschera', head: 'ROM a maschera · bit fissati in fabbrica',
        h: 'Bit disegnati in fabbrica',
        intro: 'Ogni 1 è un collegamento tracciato nella maschera con cui si fabbrica il chip. Per migliaia di copie identiche è la memoria più economica, ma non si corregge: un bit diverso richiede una maschera nuova.',
        rules: [['Stato iniziale', 'deciso dalla maschera'], ['Scrivere', 'solo in fabbrica'], ['Cancellare', 'impossibile']],
        task: 'Prova a cambiare un bit della ROM, poi fatti fare una maschera nuova.',
        steps: ['Prova a cambiare un bit', 'Ordina una maschera nuova'],
        counter: 'Maschere',
      },
      prom: {
        seg: 'PROM', name: 'PROM a fusibili', step: 'PROM · dal 1956', head: 'PROM bipolare · un fusibile per ogni bit',
        h: 'Un fusibile per ogni bit',
        intro: 'In molte PROM bipolari il chip esce dalla fabbrica con tutti i fusibili intatti e ogni bit si legge 0. Il programmatore brucia con un impulso di corrente i fusibili dove vuoi un 1, e un fusibile bruciato non si ripara.',
        rules: [['Stato vergine', '00, fusibili intatti'], ['Scrivere', '0 → 1, una volta sola'], ['Cancellare', 'impossibile']],
        task: 'Brucia i fusibili di un motivo, poi prova a riportare a 0 un bit già scritto.',
        steps: ['Brucia almeno 4 fusibili', 'Prova a riportare a 0 un bit scritto'],
        counter: 'Fusibili bruciati',
      },
      eprom: {
        seg: 'EPROM', name: 'EPROM', step: 'EPROM · 1971', head: '',
        h: 'Si cancella con la luce',
        intro: 'Scrivere un bit significa intrappolare elettroni sul suo gate flottante: la cella passa da 1 a 0. Per tornare a 1 c\'è un solo modo, la luce ultravioletta, che entra dalla finestra di quarzo e svuota tutte le celle insieme.',
        rules: [['Cancellata', 'FF, gate flottanti vuoti'], ['Scrivere', '1 → 0, bit per bit'], ['Cancellare', 'tutto il chip, circa 20 minuti di UV']],
        task: 'Scrivi un motivo, cancellalo con la lampada UV e scrivine un altro.',
        steps: ['Scrivi almeno 4 bit', 'Cancella con la lampada UV', 'Scrivi un nuovo motivo'],
        counter: 'Lampada UV',
      },
      eeprom: {
        seg: 'EEPROM', name: 'EEPROM', step: 'EEPROM · 1978', head: 'EEPROM · si cancella un byte alla volta',
        h: 'Un byte alla volta, con l\'elettricità',
        intro: 'Sotto il gate flottante l\'ossido è così sottile che gli elettroni lo attraversano per effetto tunnel, nei due sensi, comandati da una tensione. Così si cancella e si riscrive un solo byte, senza togliere il chip dalla scheda.',
        rules: [['Cancellata', 'FF'], ['Scrivere', '1 → 0'], ['Cancellare', 'un byte, con l\'elettricità']],
        task: 'Nel sorriso c\'è un bit di troppo, cerchiato all\'indirizzo 05: correggilo senza toccare gli altri byte.',
        steps: ['Cancella e riscrivi il byte 05', 'Il sorriso torna perfetto'],
        counter: 'Byte riscritti',
      },
      flash: {
        seg: 'Flash', name: 'Flash', step: 'Flash · 1984', head: 'Flash · 2 blocchi da 4 byte',
        h: 'Un blocco intero, in un lampo',
        intro: 'Ogni cella è un solo transistor, senza quello di selezione della EEPROM: più bit nello stesso spazio, ma niente cancellazione byte per byte. Si cancella un blocco intero in un colpo, come il lampo di un flash fotografico.',
        rules: [['Cancellata', 'FF'], ['Scrivere', '1 → 0'], ['Cancellare', 'un blocco intero, qui 4 byte']],
        task: 'Correggi lo stesso bit di troppo nella Flash: qui si cancella solo un blocco intero.',
        steps: ['Cancella il blocco 1', 'Riscrivi il sorriso'],
        counter: 'Blocchi cancellati',
      },
    };
    const MOTIF_ORDER = { rom: ['cuore', 'sorriso'], prom: ['freccia', 'cuore'], eprom: ['cuore', 'freccia'], eeprom: ['sorriso'], flash: ['sorriso'] };

    /* ---------- stato ---------- */

    const chips = {};
    M.TECHS.forEach((t) => { chips[t] = M.createChip(t); });
    const motifIdx = { rom: 0, prom: 0, eprom: 0, eeprom: 0, flash: 0 };
    let tech = 'rom';
    let sel = { a: 0, b: 5 };
    let progress = M.normalizeProgress(CP.store.get('memorie-prove', null));
    let uvRunning = false;
    const shown = Array.from({ length: M.WORDS }, () => new Array(M.BITS).fill(0));
    const pending = [];

    /* ---------- effetti annullabili ---------- */

    function fxSet() {
      const set = new Set();
      return {
        add(t) {
          set.add(t);
          if (t.finished) t.finished.then(() => set.delete(t));
          return t;
        },
        stop() { Array.from(set).forEach((t) => t.cancel()); set.clear(); },
      };
    }
    const fxG = fxSet(); // operazioni sul palco
    const fxL = fxSet(); // lente
    function tw(set, o) { return set.add(CP.tween(o)); }
    function later(set, ms, fn) { return set.add(CP.tween({ from: 0, to: 1, duration: 1, delay: Math.max(0, ms), onDone: fn })); }
    const finale = []; // dopo i messaggi dell'operazione: prova superata, laboratorio completato
    function whenDone(fn) { pending.push(fn); }
    function flushPending() {
      [pending, finale].forEach((q) => { while (q.length) { try { q.shift()(); } catch (e) { console.error(e); } } });
    }

    /* ---------- palco: la memoria ---------- */

    const G = { W: 440, H: 412, x0: 62, y0: 78, pitch: 40, cell: 36 };
    const cx = (b) => G.x0 + (7 - b) * G.pitch;
    const ry = (a) => G.y0 + a * G.pitch;

    const svg = s('svg', {
      class: 'mem-array', viewBox: '0 0 ' + G.W + ' ' + G.H, role: 'group',
      'aria-label': 'Memoria del laboratorio: 8 indirizzi da 8 bit', 'aria-describedby': 'memorie-aiuto',
    });
    svg.append(s('defs', null,
      s('linearGradient', { id: 'memorie-vetro', x1: 0, y1: 0, x2: 1, y2: 1 },
        s('stop', { offset: '0', 'stop-color': '#cfe3f2', 'stop-opacity': '.13' }),
        s('stop', { offset: '.5', 'stop-color': '#cfe3f2', 'stop-opacity': '.03' }),
        s('stop', { offset: '1', 'stop-color': '#cfe3f2', 'stop-opacity': '.09' })),
      s('linearGradient', { id: 'memorie-raggi', x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: '0', 'stop-color': '#c9b2ff', 'stop-opacity': '.42' }),
        s('stop', { offset: '1', 'stop-color': '#b18cff', 'stop-opacity': '.04' }))));

    // lampada UV (solo EPROM) e scritta in testa
    const headText = s('text', { x: 220, y: 33, 'text-anchor': 'middle', class: 'mem-head' });
    const lampHalo = s('rect', { x: 84, y: 0, width: 272, height: 30, rx: 15, class: 'mem-lamp-halo', opacity: 0 });
    const lampGlow = s('rect', { x: 104, y: 9, width: 232, height: 11, rx: 5.5, class: 'mem-lamp-on', opacity: 0 });
    const lamp = s('g', { class: 'mem-lamp' },
      lampHalo,
      s('rect', { x: 90, y: 2, width: 260, height: 42, rx: 10, class: 'mem-lamp-box' }),
      s('rect', { x: 104, y: 9, width: 232, height: 11, rx: 5.5, class: 'mem-lamp-tube' }),
      lampGlow,
      s('text', { x: 220, y: 37, 'text-anchor': 'middle', class: 'mem-lamp-t' }, 'lampada UV · 253,7 nm'));
    const rays = s('path', { d: 'M104 44 L336 44 L384 74 L56 74 Z', class: 'mem-rays', fill: 'url(#memorie-raggi)', opacity: 0 });

    const die = s('rect', { x: 4, y: 50, width: 432, height: 358, rx: 14, class: 'mem-die' });
    const bands = [0, 1].map((k) => s('rect', { x: 54, y: ry(k * 4) - 4, width: 332, height: 4 * G.pitch, rx: 10, class: 'mem-band b' + k }));
    const tags = [0, 1].map((k) => s('text', { class: 'mem-tag', 'text-anchor': 'middle', transform: 'translate(19 ' + (ry(k * 4) + 78) + ') rotate(-90)' }, 'BLOCCO ' + k));
    const sep = s('line', { x1: 54, x2: 386, y1: ry(4) - 2, y2: ry(4) - 2, class: 'mem-sep' });
    const rowBand = s('rect', { x: 26, y: 0, width: 406, height: 40, rx: 9, class: 'mem-rowband' });

    const glass = s('rect', { x: 54, y: 72, width: 332, height: 330, rx: 22, class: 'mem-glass', fill: 'url(#memorie-vetro)' });
    const tint = s('rect', { x: 54, y: 72, width: 332, height: 330, rx: 22, class: 'mem-tint', opacity: 0 });
    const rim = s('rect', { x: 54, y: 72, width: 332, height: 330, rx: 22, class: 'mem-rim' });
    const winBack = s('g', { class: 'mem-win' }, glass);
    const winFront = s('g', { class: 'mem-win' }, tint, rim);

    const colNums = s('g', { class: 'mem-colnums', 'aria-hidden': 'true' });
    for (let b = 7; b >= 0; b--) colNums.append(s('text', { x: cx(b) + 18, y: 66, 'text-anchor': 'middle' }, String(b)));
    colNums.append(s('text', { x: 40, y: 66, 'text-anchor': 'middle', class: 'k' }, 'ind.'), s('text', { x: 407, y: 66, 'text-anchor': 'middle', class: 'k' }, 'hex'));

    const addrText = [];
    const hexText = [];
    const labels = s('g', { 'aria-hidden': 'true' });
    for (let a = 0; a < M.WORDS; a++) {
      addrText[a] = s('text', { x: 40, y: ry(a) + 23, 'text-anchor': 'middle', class: 'mem-addr' }, hex2(a));
      hexText[a] = s('text', { x: 407, y: ry(a) + 24, 'text-anchor': 'middle', class: 'mem-hex' }, '00');
      labels.append(addrText[a], hexText[a]);
    }

    const cells = [];
    const cellsG = s('g', { class: 'mem-cells' });
    for (let a = 0; a < M.WORDS; a++) {
      cells[a] = [];
      for (let b = 7; b >= 0; b--) {
        const bg = s('rect', { width: G.cell, height: G.cell, rx: 7, class: 'mem-cell-bg' });
        const v = s('text', { x: 18, y: 24, 'text-anchor': 'middle', class: 'mem-cell-v' }, '0');
        const e = s('g', { class: 'mem-cell-e', opacity: 0 },
          s('circle', { cx: 10, cy: 31, r: 2.5 }), s('circle', { cx: 18, cy: 31, r: 2.5 }), s('circle', { cx: 26, cy: 31, r: 2.5 }));
        const inner = s('g', null, bg, v, e);
        const g = s('g', {
          class: 'mem-cell', transform: 'translate(' + cx(b) + ' ' + ry(a) + ')',
          tabindex: a === sel.a && b === sel.b ? 0 : -1, role: 'button', 'data-a': a, 'data-b': b,
        }, inner);
        cells[a][b] = { g: g, inner: inner, bg: bg, v: v, e: e };
        cellsG.append(g);
      }
    }
    const ring = s('rect', { x: -4, y: -4, width: 44, height: 44, rx: 10, class: 'mem-ring' });
    const target = s('rect', { x: -6, y: -6, width: 48, height: 48, rx: 12, class: 'mem-target' });
    const fxLayer = s('g', { class: 'mem-fx', 'aria-hidden': 'true' });
    const photonsG = s('g', { class: 'mem-photons', 'aria-hidden': 'true' });
    const photons = [];
    for (let i = 0; i < 16; i++) {
      const p = s('path', { d: 'M0 0 q3 4 0 8 q-3 4 0 8', class: 'mem-photon', opacity: 0 });
      photons.push({ el: p, x: 66 + ((i * 53) % 300), phase: (i * 0.137) % 1, speed: 0.55 + ((i * 7) % 5) * 0.08 });
      photonsG.append(p);
    }
    const flashes = [0, 1].map((k) => s('rect', { x: 54, y: ry(k * 4) - 4, width: 332, height: 4 * G.pitch, rx: 10, class: 'mem-flash', opacity: 0 }));
    const deco = s('g', { 'aria-hidden': 'true' }, die, bands[0], bands[1], tags[0], tags[1], sep, rowBand, winBack);
    svg.append(headText, lamp, deco, colNums, labels, cellsG, target, ring, winFront, rays, photonsG, flashes[0], flashes[1], fxLayer);

    /* ---------- lente sulla cella ---------- */

    const lens = makeLens();

    /* ---------- controlli ---------- */

    const segLabels = {};
    const seg = ui.seg({
      label: 'Tecnologia della memoria',
      value: tech,
      options: M.TECHS.map((t) => {
        const tick = h('span', { class: 'mem-tick', 'aria-hidden': 'true' }, '✓');
        const sr = h('span', { class: 'cp-sr' }, '');
        segLabels[t] = { tick: tick, sr: sr };
        return { value: t, title: T[t].name, label: h('span', { class: 'mem-seg-l' }, T[t].seg, tick, sr) };
      }),
      onChange: (v) => setTech(v),
    });

    function setLabel(btn, text) { const sp = btn.querySelector('span:last-child'); if (sp) sp.textContent = text; }
    const btnMask = ui.button({ label: 'Nuova maschera', icon: '✎', onClick: doMask });
    const btnWrite = ui.button({ label: 'Scrivi', icon: '▶︎', primary: true, onClick: doWrite });
    const btnUV = ui.button({ label: 'Lampada UV', icon: '☀︎', className: 'gold', onClick: doUV });
    const btnByte = ui.button({ label: 'Cancella byte', icon: '⌫', onClick: doEraseByte });
    const btnBlock = ui.button({ label: 'Cancella blocco', icon: '↯', onClick: doEraseBlock });
    const btnReset = ui.button({ label: 'Chip nuovo', icon: '↺', onClick: doReset });
    const actions = h('div', { class: 'cp-bar-group mem-actions', role: 'group', 'aria-label': 'Operazioni sulla memoria' }, btnMask, btnWrite, btnUV, btnByte, btnBlock, btnReset);

    const rCell = ui.readout('Cella', '00 · bit 7');
    const rData = ui.readout('Dato', '00');
    const rBlank = ui.readout('Vergine', '00');
    const rCount = ui.readout('Maschere', '0');
    const status = h('div', { class: 'mem-status' }, rCell, rData, rBlank, rCount);

    const taskK = h('span', { class: 'mem-task-k' }, '');
    const taskT = h('p', { class: 'mem-task-t' }, '');
    const taskSteps = h('ol', { class: 'mem-task-steps' });
    const task = h('div', { class: 'mem-task' }, taskK, taskT, taskSteps);

    const cardStep = h('span', { class: 'step' }, '');
    const cardH = h('h4', null, '');
    const cardIntro = h('p', { class: 'mem-card-intro' }, '');
    const cardRules = h('dl', { class: 'mem-rules' });
    const msgK = h('span', { class: 'mem-msg-k' }, 'Che cosa è successo');
    const msgP = h('p', { class: 'mem-msg-t' }, '');
    const msgOk = h('p', { class: 'mem-msg-ok', hidden: true }, '');
    const msgBox = h('div', { class: 'mem-msg' }, msgK, msgP, msgOk);

    const goal = h('p', { class: 'cp-goal' }, '');
    const help = h('p', { class: 'cp-hint', id: 'memorie-aiuto' },
      'Clicca una cella per scrivere quel bit; con il mouse puoi anche trascinare per disegnare. Da tastiera: Tab per entrare nella memoria, frecce per spostarti, Invio o Spazio per scrivere.');

    mount.append(
      ui.bar(seg, actions),
      h('div', { class: 'cp-lab-grid mem-grid' },
        h('div', { class: 'cp-stage mem-stage' }, svg, status, task),
        h('div', { class: 'cp-explain mem-explain' },
          h('div', { class: 'mem-explain-in' },
            lens.box,
            h('div', { class: 'mem-card' }, cardStep, cardH, cardIntro, cardRules, msgBox)))),
      ui.legend([
        ['bit a 1', 'var(--sig-on)'],
        ['bit a 0', '#2f453e'],
        ['elettrone intrappolato', 'var(--sig-data)'],
        ['luce ultravioletta', '#b18cff'],
        ['impulso di scrittura', 'var(--sig-ctrl)'],
      ]),
      help,
      goal);

    /* ---------- disegno dello stato ---------- */

    function cellLabel(a, b, v) {
      let what;
      if (tech === 'rom') what = v ? 'diodo presente' : 'nessun diodo';
      else if (tech === 'prom') what = v ? 'fusibile bruciato' : 'fusibile intatto';
      else what = v ? 'cella cancellata' : 'elettroni intrappolati';
      return 'Indirizzo ' + hex2(a) + ', bit ' + b + ': ' + v + ', ' + what;
    }

    function shownByte(a) {
      let n = 0;
      for (let b = 0; b < 8; b++) if (shown[a][b]) n |= 1 << b;
      return n;
    }

    function paintHex(a) {
      const t = hex2(shownByte(a));
      if (hexText[a].textContent === t) return;
      hexText[a].textContent = t;
      if (!ctx.reduced) {
        hexText[a].classList.add('is-changed');
        window.setTimeout(() => hexText[a].classList.remove('is-changed'), 520);
      }
      if (a === sel.a) rData.set(t);
    }

    function paintCell(a, b, v) {
      const c = cells[a][b];
      shown[a][b] = v;
      const charged = !!FG[tech] && v === 0;
      c.g.classList.toggle('is-one', v === 1);
      c.g.classList.toggle('is-zero', v === 0);
      c.g.classList.remove('is-denied');
      c.v.textContent = String(v);
      c.e.removeAttribute('transform');
      c.e.setAttribute('opacity', charged ? 1 : 0);
      c.inner.removeAttribute('transform');
      c.g.setAttribute('aria-label', cellLabel(a, b, v));
      paintHex(a);
      if (a === M.ERRORE.addr && b === M.ERRORE.bit) paintTarget();
    }

    function paintTarget() {
      const show = (tech === 'eeprom' || tech === 'flash') && shown[M.ERRORE.addr][M.ERRORE.bit] === 0 && !progress[tech].done;
      target.style.display = show ? '' : 'none';
      target.setAttribute('transform', 'translate(' + cx(M.ERRORE.bit) + ' ' + ry(M.ERRORE.addr) + ')');
    }

    function renderAll() {
      const chip = chips[tech];
      for (let a = 0; a < M.WORDS; a++) for (let b = 0; b < M.BITS; b++) paintCell(a, b, M.bit(chip.mem[a], b));
      paintSelection();
      paintTarget();
      paintCounter();
    }

    function paintSelection() {
      ring.style.transform = 'translate(' + cx(sel.b) + 'px, ' + ry(sel.a) + 'px)';
      rowBand.style.transform = 'translate(0px, ' + (ry(sel.a) - 2) + 'px)';
      bands.forEach((el, k) => el.classList.toggle('is-sel', M.blockOf(sel.a) === k));
      rCell.set(hex2(sel.a) + ' · bit ' + sel.b);
      rData.set(hex2(shownByte(sel.a)));
      setLabel(btnByte, 'Cancella byte ' + hex2(sel.a));
      setLabel(btnBlock, 'Cancella blocco ' + M.blockOf(sel.a));
    }

    function paintCounter() {
      const st = chips[tech].stats;
      let v;
      if (tech === 'rom') v = String(st.masks);
      else if (tech === 'prom') v = M.countProgrammed(chips.prom) + '/64';
      else if (tech === 'eprom') v = uvRunning ? rCount.querySelector('.v').textContent : 'spenta';
      else if (tech === 'eeprom') v = String(st.bytes);
      else v = String(st.blocks);
      rCount.set(v);
    }

    function setUVReadout(text) { rCount.querySelector('.v').textContent = text; }

    function motifName() {
      const list = MOTIF_ORDER[tech];
      return list[motifIdx[tech] % list.length];
    }

    function paintActions() {
      const t = tech;
      btnMask.hidden = t !== 'rom';
      btnWrite.hidden = t === 'rom';
      btnUV.hidden = t !== 'eprom';
      btnByte.hidden = t !== 'eeprom';
      btnBlock.hidden = t !== 'flash';
      btnReset.hidden = !(t === 'prom' || t === 'eeprom' || t === 'flash');
      if (t === 'rom') setLabel(btnMask, 'Nuova maschera «' + motifName() + '»');
      else setLabel(btnWrite, 'Scrivi «' + motifName() + '»');
      setLabel(btnReset, t === 'prom' ? 'PROM nuova' : 'Ricomincia la prova');
      setLabel(btnUV, uvRunning ? 'Salta l\'attesa' : 'Lampada UV');
    }

    function paintCard() {
      const t = T[tech];
      cardStep.textContent = t.step;
      cardH.textContent = t.h;
      cardIntro.textContent = t.intro;
      cardRules.textContent = '';
      t.rules.forEach(([k, v]) => cardRules.append(h('div', null, h('dt', null, k), h('dd', null, v))));
      rBlank.querySelector('.k').textContent = tech === 'prom' ? 'Vergine' : (FG[tech] ? 'Cancellata' : 'Vergine');
      rBlank.set(tech === 'rom' ? '—' : hex2(M.blankByte(tech)));
      rCount.querySelector('.k').textContent = t.counter;
      headText.textContent = t.head;
    }

    function paintTask() {
      const t = T[tech];
      const p = progress[tech];
      const i = M.TECHS.indexOf(tech) + 1;
      taskK.textContent = 'Prova ' + i + ' di 5 · ' + t.name + (p.done ? ' · superata' : '');
      taskT.textContent = t.task;
      taskSteps.textContent = '';
      t.steps.forEach((label, k) => {
        taskSteps.append(h('li', { class: p.steps[k] ? 'is-ok' : null }, label, h('span', { class: 'cp-sr' }, p.steps[k] ? ' (fatto)' : ' (da fare)')));
      });
      task.classList.toggle('is-done', p.done);
      M.TECHS.forEach((k) => {
        const d = progress[k].done;
        segLabels[k].tick.classList.toggle('on', d);
        segLabels[k].sr.textContent = d ? ' (prova superata)' : '';
      });
      const n = M.doneCount(progress);
      goal.textContent = n === 5
        ? 'Obiettivo raggiunto: hai messo alla prova tutte e cinque le memorie, dalla ROM che non cambia mai alla Flash che si cancella in un lampo.'
        : 'Obiettivo: supera la prova di tutte e cinque le memorie (' + n + ' su 5).';
    }

    function say(text, announce, kicker) {
      msgK.textContent = kicker || 'Che cosa è successo';
      msgP.textContent = text;
      msgOk.hidden = true;
      msgOk.textContent = '';
      if (announce !== false) ctx.say(text);
    }

    function showOk(text) {
      msgOk.textContent = text;
      msgOk.hidden = false;
      ctx.say(text);
    }

    function resetDecor() {
      uvRunning = false;
      lampGlow.setAttribute('opacity', 0);
      lampHalo.setAttribute('opacity', 0);
      rays.setAttribute('opacity', 0);
      tint.setAttribute('opacity', 0);
      photons.forEach((p) => p.el.setAttribute('opacity', 0));
      flashes.forEach((f) => f.setAttribute('opacity', 0));
      cellsG.removeAttribute('transform');
      cellsG.removeAttribute('opacity');
      rowBand.classList.remove('is-busy');
      svg.classList.remove('is-uv');
      fxLayer.textContent = '';
    }

    /** Porta subito a termine tutto ciò che si sta muovendo e ridisegna lo stato vero. */
    function settleAll() {
      fxG.stop();
      lens.stop();
      resetDecor();
      renderAll();
      paintActions();
      flushPending();
    }

    /* ---------- piccoli effetti sulle celle ---------- */

    function pulse(a, b, kind, delay) {
      const x = cx(b) + 18;
      const y = ry(a) + 18;
      const r = s('rect', { x: -20, y: -20, width: 40, height: 40, rx: 9, class: 'mem-pulse k-' + kind, transform: 'translate(' + x + ' ' + y + ')' });
      fxLayer.append(r);
      tw(fxG, {
        duration: CP.dur.slow, delay: delay || 0, ease: 'smooth',
        onUpdate: (v) => { r.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (1 + v * 0.32).toFixed(3) + ')'); r.setAttribute('opacity', (0.95 * (1 - v)).toFixed(3)); },
        onDone: () => r.remove(),
      });
    }

    function spark(a, b, delay) {
      const x = cx(b) + 18;
      const y = ry(a) + 18;
      const g = s('g', { class: 'mem-spark', transform: 'translate(' + x + ' ' + y + ') scale(.4)', opacity: 0 });
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + 0.3;
        g.append(s('line', { x1: Math.cos(ang) * 7, y1: Math.sin(ang) * 7, x2: Math.cos(ang) * (i % 2 ? 15 : 19), y2: Math.sin(ang) * (i % 2 ? 15 : 19) }));
      }
      g.append(s('circle', { r: 5, class: 'core' }));
      fxLayer.append(g);
      tw(fxG, {
        duration: 420, delay: delay || 0, ease: 'sharp',
        onUpdate: (v) => { g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (0.4 + v * 0.95).toFixed(3) + ')'); g.setAttribute('opacity', (v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85).toFixed(3)); },
        onDone: () => g.remove(),
      });
    }

    function electronsIn(a, b, delay) {
      const e = cells[a][b].e;
      tw(fxG, {
        duration: CP.dur.normal, delay: delay || 0, ease: 'smooth',
        onUpdate: (v) => { e.setAttribute('transform', 'translate(0 ' + ((1 - v) * 6).toFixed(2) + ')'); e.setAttribute('opacity', v.toFixed(3)); },
      });
    }

    /** Gli elettroni della cella se ne vanno (verso l'alto con la luce UV, verso il basso per effetto tunnel), poi il bit vale 1. */
    function electronsOut(a, b, dir, delay, dur) {
      const e = cells[a][b].e;
      const dy = dir === 'up' ? -12 : 9;
      tw(fxG, {
        duration: dur || CP.dur.normal, delay: delay || 0, ease: 'sharp',
        onUpdate: (v) => { e.setAttribute('transform', 'translate(0 ' + (v * dy).toFixed(2) + ')'); e.setAttribute('opacity', (1 - v).toFixed(3)); },
        onDone: () => { paintCell(a, b, 1); pulse(a, b, 'erase'); },
      });
    }

    function deny(a, b) {
      const c = cells[a][b];
      c.g.classList.add('is-denied');
      window.setTimeout(() => c.g.classList.remove('is-denied'), 900);
      tw(fxG, {
        duration: 420, ease: 'linear',
        onUpdate: (v, p) => { c.inner.setAttribute('transform', 'translate(' + (Math.sin(p * Math.PI * 6) * (1 - p) * 4).toFixed(2) + ' 0)'); },
        onDone: () => c.inner.removeAttribute('transform'),
      });
    }

    function flashBlock(k) {
      const f = flashes[k];
      tw(fxG, {
        duration: 520, ease: 'linear',
        onUpdate: (v, p) => { f.setAttribute('opacity', (p < 0.16 ? (p / 0.16) * 0.55 : 0.55 * (1 - (p - 0.16) / 0.84)).toFixed(3)); },
        onDone: () => f.setAttribute('opacity', 0),
      });
    }

    function hash01(a, b) {
      const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
      return x - Math.floor(x);
    }

    /* ---------- prove ---------- */

    function commit(res) {
      chips[tech] = res.chip;
      const r = M.track(progress, res);
      const changed = JSON.stringify(r.progress) !== JSON.stringify(progress);
      progress = r.progress;
      if (changed) {
        CP.store.set('memorie-prove', progress);
        paintTask();
      }
      if (r.completed) {
        const name = T[r.completed].name;
        finale.push(() => {
          const n = M.doneCount(progress);
          const rest = n === 5 ? 'Hai provato tutte e cinque le memorie!'
            : n === 4 ? 'Ne manca una sola: scegli l\'ultima tecnologia qui sopra.'
              : 'Ne mancano ' + (5 - n) + ': scegli un\'altra tecnologia qui sopra.';
          showOk('Prova superata: ' + name + '. ' + rest);
          task.classList.remove('is-cheer');
          if (!ctx.reduced) { void task.offsetWidth; task.classList.add('is-cheer'); }
          paintTarget();
        });
      }
      if (r.all) finale.push(() => ctx.done());
    }

    /* ---------- operazioni ---------- */

    function cellName(a, b) { return 'indirizzo ' + hex2(a) + ', bit ' + b; }

    function onCell(a, b) {
      settleAll();
      select(a, b, false);
      const before = chips[tech];
      const res = M.click(before, a, b);
      commit(res);
      const id = cellName(a, b);
      let wait = 520;
      switch (res.kind) {
        case 'locked':
          deny(a, b);
          lens.play('locked');
          say('Niente da fare: nella ROM a maschera il bit all\'' + id + ' è un collegamento disegnato nel silicio. Per cambiarlo serve una maschera nuova, cioè un nuovo lotto di chip.');
          break;
        case 'burn':
          paintCell(a, b, 1);
          spark(a, b, 0);
          lens.play('burn');
          say('Fusibile bruciato all\'' + id + ': ora quel bit vale 1, per sempre.');
          break;
        case 'fuse-blown':
          deny(a, b);
          lens.play('blown');
          say('Il fusibile all\'' + id + ' è già bruciato e nessun impulso può ricollegarlo. Per ripartire da zero serve una PROM nuova.');
          break;
        case 'program':
          paintCell(a, b, 0);
          electronsIn(a, b, 0);
          pulse(a, b, 'program');
          lens.play('program');
          say('Elettroni intrappolati sul gate flottante all\'' + id + ': la soglia sale e il bit si legge 0.');
          break;
        case 'needs-uv':
          deny(a, b);
          lens.play('denied');
          nudge(btnUV);
          say('Il bit all\'' + id + ' è 0 e torna a 1 solo con la luce ultravioletta, che però cancella tutto il chip. Premi «Lampada UV».');
          break;
        case 'needs-block-erase': {
          deny(a, b);
          lens.play('denied');
          nudge(btnBlock);
          const [f, t] = M.blockRange(res.block);
          say('Nella Flash il bit all\'' + id + ' torna a 1 solo cancellando il suo blocco intero, gli indirizzi da ' + hex2(f) + ' a ' + hex2(t) + '. Premi «Cancella blocco ' + res.block + '».');
          break;
        }
        case 'byte-rewrite': {
          wait = animRewrite(res.changes, 0);
          lens.play('erase');
          say('La EEPROM ha cancellato e riscritto solo il byte ' + hex2(a) + ': il bit ' + b + ' ora vale 1, gli altri byte non si sono mossi.');
          break;
        }
      }
      paintCounter();
      later(fxG, wait, settleQuiet);
    }

    // fine naturale di un'animazione: niente da annullare, si consegna solo ciò che era in attesa
    function settleQuiet() { rowBand.classList.remove('is-busy'); flushPending(); }

    function nudge(btn) {
      if (ctx.reduced || !btn.animate) return;
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: CP.dur.slow, easing: 'ease-out' });
    }

    /** Pittura con il mouse: scrive le celle vergini su cui passi, senza messaggi di rifiuto. */
    function paintOver(a, b) {
      const before = chips[tech];
      const res = M.click(before, a, b);
      if (res.kind !== 'program' && res.kind !== 'burn') return;
      select(a, b, false);
      commit(res);
      if (res.kind === 'burn') { paintCell(a, b, 1); spark(a, b, 0); } else { paintCell(a, b, 0); electronsIn(a, b, 0); pulse(a, b, 'program'); }
      lens.render();
      paintCounter();
      say(res.kind === 'burn' ? 'Fusibile bruciato all\'' + cellName(a, b) + '.' : 'Bit scritto all\'' + cellName(a, b) + ': elettroni sul gate flottante.', false);
    }

    /** EEPROM: per ogni byte, prima escono gli elettroni (tutto a 1), poi rientrano dove serve uno 0. */
    function animRewrite(changes, start) {
      const byAddr = new Map();
      changes.forEach((c) => {
        if (!byAddr.has(c.addr)) byAddr.set(c.addr, { erase: [], program: [] });
        byAddr.get(c.addr)[c.phase === 'erase' ? 'erase' : 'program'].push(c);
      });
      let t = start || 0;
      byAddr.forEach((row, addr) => {
        later(fxG, t, () => { rowBand.style.transform = 'translate(0px, ' + (ry(addr) - 2) + 'px)'; rowBand.classList.add('is-busy'); });
        row.erase.forEach((c, i) => electronsOut(c.addr, c.bit, 'down', t + 60 + i * 55));
        const tp = t + 60 + row.erase.length * 55 + (row.erase.length ? 380 : 0);
        row.program.forEach((c, i) => {
          later(fxG, tp + i * 55, () => { paintCell(c.addr, c.bit, 0); electronsIn(c.addr, c.bit, 0); pulse(c.addr, c.bit, 'program'); });
        });
        t = tp + row.program.length * 55 + 260;
      });
      later(fxG, t, () => { rowBand.classList.remove('is-busy'); paintSelection(); });
      return t;
    }

    function doWrite() {
      settleAll();
      const name = motifName();
      const res = M.writeMotif(chips[tech], M.MOTIFS[name]);
      commit(res);
      motifIdx[tech]++;
      paintActions();
      if (res.same) {
        say('Il motivo «' + name + '» è già scritto: non c\'è niente da cambiare.');
        return;
      }
      const first = res.changes.find((c) => c.phase !== 'erase') || res.changes[0];
      const lensCell = res.changes.find((c) => c.addr === sel.a && c.bit === sel.b);
      if (!lensCell && first) select(first.addr, first.bit, false);
      let total;
      if (tech === 'eeprom') {
        total = animRewrite(res.changes, 0);
        lens.play(M.bit(chips[tech].mem[sel.a], sel.b) ? 'erase' : 'program');
        say('La EEPROM ha riscritto solo i byte diversi (' + res.rewritten.map(hex2).join(', ') + '): ogni byte si cancella e si riscrive da solo, gli altri restano com\'erano.');
      } else {
        const rows = new Map();
        res.changes.forEach((c) => { if (!rows.has(c.addr)) rows.set(c.addr, []); rows.get(c.addr).push(c); });
        let t = 0;
        rows.forEach((list) => {
          list.forEach((c, i) => {
            const d = t + i * 28;
            if (tech === 'prom') later(fxG, d, () => { paintCell(c.addr, c.bit, 1); spark(c.addr, c.bit, 0); });
            else later(fxG, d, () => { paintCell(c.addr, c.bit, 0); electronsIn(c.addr, c.bit, 0); pulse(c.addr, c.bit, 'program'); });
          });
          t += 90 + list.length * 28;
        });
        res.blocked.forEach(({ addr, bit }, i) => later(fxG, t + 120 + i * 40, () => deny(addr, bit)));
        total = t + 400;
        if (res.changes.length) lens.play(tech === 'prom' ? 'burn' : 'program');
        const n = res.changes.length;
        if (!res.blocked.length) {
          say('Il programmatore ha scritto il motivo «' + name + '» riga per riga: ' + n + ' bit ' + (tech === 'prom' ? 'bruciati.' : 'portati a 0.'));
        } else if (tech === 'prom') {
          say('Il motivo «' + name + '» si è sommato al vecchio: ' + res.blocked.length + ' fusibili già bruciati restano a 1. In una PROM puoi solo aggiungere 1, mai toglierli.');
        } else if (tech === 'eprom') {
          say('Il motivo «' + name + '» si è mescolato al vecchio: senza cancellare si possono solo aggiungere 0, e ' + res.blocked.length + ' bit sono rimasti a 0. Usa la lampada UV e riscrivi.');
        } else {
          say(res.blocked.length + (res.blocked.length === 1 ? ' bit è rimasto' : ' bit sono rimasti') + ' a 0: nella Flash si può solo programmare, da 1 a 0. Prima cancella il blocco che li contiene, poi riscrivi.');
        }
      }
      paintCounter();
      later(fxG, total, settleQuiet);
    }

    function doUV() {
      if (uvRunning) { settleAll(); return; }
      settleAll();
      const before = chips.eprom;
      if (!M.isProgrammed('eprom', before.mem[sel.a], sel.b)) {
        const c = firstCharged(before, 0, 7);
        if (c) select(c.a, c.b, false);
      }
      const res = M.eraseAll(before);
      commit(res);
      const was = res.changes.length;
      const D = 3400;
      whenDone(() => {
        setUVReadout('spenta');
        say(was
          ? 'Dopo circa 20 minuti di luce ultravioletta (qui pochi secondi) tutti i gate flottanti sono vuoti: il chip vale FF ovunque ed è pronto per un nuovo programma.'
          : 'Il chip era già cancellato: la luce non ha trovato elettroni da liberare.');
      });
      if (ctx.reduced) {
        setUVReadout('20 min');
        lens.play('uv', { duration: 0 });
        settleAll();
        return;
      }
      uvRunning = true;
      paintActions();
      svg.classList.add('is-uv');
      say('Lampada accesa: la luce ultravioletta entra dalla finestra di quarzo e dà agli elettroni l\'energia per lasciare i gate flottanti.');
      tw(fxG, {
        duration: CP.dur.normal, ease: 'smooth',
        onUpdate: (v) => { lampGlow.setAttribute('opacity', v); lampHalo.setAttribute('opacity', v * 0.8); rays.setAttribute('opacity', v); tint.setAttribute('opacity', v * 0.16); },
      });
      const stopPhotons = ctx.tick((dt, now) => {
        const tt = now / 1000;
        photons.forEach((p) => {
          const k = (p.phase + tt * p.speed) % 1;
          p.el.setAttribute('transform', 'translate(' + p.x + ' ' + (44 + k * 340).toFixed(1) + ')');
          p.el.setAttribute('opacity', (k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1).toFixed(2));
        });
      });
      fxG.add({ cancel: stopPhotons });
      tw(fxG, { from: 0, to: 20, duration: D, ease: 'linear', onUpdate: (v) => setUVReadout(Math.round(v) + ' min') });
      res.changes.forEach((c) => electronsOut(c.addr, c.bit, 'up', (0.1 + 0.78 * hash01(c.addr, c.bit)) * D, 420));
      lens.play('uv', { duration: D });
      later(fxG, D, () => {
        stopPhotons();
        photons.forEach((p) => p.el.setAttribute('opacity', 0));
        tw(fxG, {
          duration: CP.dur.slow, ease: 'smooth',
          onUpdate: (v) => { const o = 1 - v; lampGlow.setAttribute('opacity', o); lampHalo.setAttribute('opacity', o * 0.8); rays.setAttribute('opacity', o); tint.setAttribute('opacity', o * 0.16); },
          onDone: () => { uvRunning = false; svg.classList.remove('is-uv'); paintActions(); flushPending(); },
        });
      });
    }

    function firstCharged(chip, from, to) {
      for (let a = from; a <= to; a++) for (let b = 7; b >= 0; b--) if (M.isProgrammed(chip.tech, chip.mem[a], b)) return { a: a, b: b };
      return null;
    }

    function doEraseByte() {
      settleAll();
      const a = sel.a;
      const res = M.eraseByte(chips.eeprom, a);
      commit(res);
      if (!res.changes.length) {
        say('Il byte ' + hex2(a) + ' è già cancellato: vale FF.');
        return;
      }
      const lensWas = !M.bit(shownByte(a), sel.b);
      const total = animRewrite(res.changes, 0);
      if (lensWas) lens.play('erase'); else lens.render();
      paintCounter();
      later(fxG, total, settleQuiet);
      say('Byte ' + hex2(a) + ' cancellato: ora vale FF. Gli altri byte sono rimasti come prima; per rimettere dei bit a 0 cliccali di nuovo.');
    }

    function doEraseBlock() {
      settleAll();
      const k = M.blockOf(sel.a);
      const before = chips.flash;
      const [f, t] = M.blockRange(k);
      if (!M.isProgrammed('flash', before.mem[sel.a], sel.b)) {
        const c = firstCharged(before, f, t);
        if (c) select(c.a, c.b, false);
      }
      const lensCharged = M.isProgrammed('flash', before.mem[sel.a], sel.b);
      const res = M.eraseBlock(before, k);
      commit(res);
      flashBlock(k);
      res.changes.forEach((c) => electronsOut(c.addr, c.bit, 'down', 60, 240));
      if (lensCharged) lens.play('flash'); else lens.render();
      paintCounter();
      later(fxG, 700, settleQuiet);
      say('Blocco ' + k + ' cancellato in un colpo: gli indirizzi da ' + hex2(f) + ' a ' + hex2(t) + ' valgono FF. ' + (res.changes.length ? 'Per rimettere a posto i dati devi riscriverli tutti.' : 'Era già vuoto.'));
    }

    function doMask() {
      settleAll();
      const name = motifName();
      const res = M.newMask(chips.rom, M.MOTIFS[name]);
      motifIdx.rom++;
      commit(res);
      paintActions();
      say('Maschera nuova: in fabbrica servono settimane e un nuovo lotto di chip. Ecco la ROM con il motivo «' + name + '».');
      if (ctx.reduced) { renderAll(); lens.render(); flushPending(); return; }
      tw(fxG, {
        duration: 240, ease: 'sharp',
        onUpdate: (v) => { cellsG.setAttribute('opacity', (1 - v).toFixed(3)); cellsG.setAttribute('transform', 'translate(0 ' + (-10 * v).toFixed(2) + ')'); },
        onDone: () => {
          renderAll();
          lens.render();
          tw(fxG, {
            duration: CP.dur.slow, ease: 'smooth',
            onUpdate: (v) => { cellsG.setAttribute('opacity', v.toFixed(3)); cellsG.setAttribute('transform', 'translate(0 ' + (10 * (1 - v)).toFixed(2) + ')'); },
            onDone: () => { cellsG.removeAttribute('transform'); cellsG.removeAttribute('opacity'); flushPending(); },
          });
        },
      });
    }

    function doReset() {
      settleAll();
      const res = M.resetChip(chips[tech]);
      chips[tech] = res.chip;
      motifIdx[tech] = 0;
      renderAll();
      lens.render();
      paintActions();
      say(tech === 'prom'
        ? 'Hai preso una PROM nuova, con tutti i fusibili intatti. Quella vecchia si butta: non si può riscrivere.'
        : 'Memoria riportata all\'inizio della prova, con il bit di troppo all\'indirizzo 05.');
      if (!ctx.reduced) chipIn();
    }

    function chipIn() {
      tw(fxG, {
        duration: CP.dur.normal, ease: 'smooth',
        onUpdate: (v) => { cellsG.setAttribute('opacity', (0.25 + 0.75 * v).toFixed(3)); cellsG.setAttribute('transform', 'translate(0 ' + (8 * (1 - v)).toFixed(2) + ')'); },
        onDone: () => { cellsG.removeAttribute('transform'); cellsG.removeAttribute('opacity'); },
      });
    }

    function setTech(t) {
      if (!T[t]) return;
      settleAll();
      tech = t;
      seg.set(t);
      mount.dataset.tech = t;
      lens.setTech(t);
      paintCard();
      paintTask();
      renderAll();
      paintActions();
      lens.render();
      say(T[t].name + '. ' + T[t].task, true, 'La prova');
      if (!ctx.reduced) chipIn();
    }

    /* ---------- selezione, tastiera, puntatore ---------- */

    function select(a, b, focus) {
      const prev = cells[sel.a][sel.b];
      sel = { a: a, b: b };
      const c = cells[a][b];
      if (prev !== c) prev.g.setAttribute('tabindex', -1);
      c.g.setAttribute('tabindex', 0);
      if (focus) c.g.focus();
      paintSelection();
      lens.render();
    }

    function cellOf(el) {
      const g = el && el.closest ? el.closest('.mem-cell') : null;
      return g ? { a: +g.dataset.a, b: +g.dataset.b } : null;
    }

    let painting = false;
    let dragged = false;
    let startCell = null;
    let suppressClick = false;

    svg.addEventListener('click', (ev) => {
      if (suppressClick) { suppressClick = false; return; }
      const c = cellOf(ev.target);
      if (c) onCell(c.a, c.b);
    });
    svg.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'mouse' || ev.button !== 0 || tech === 'rom') return;
      const c = cellOf(ev.target);
      if (!c) return;
      painting = true;
      dragged = false;
      startCell = c;
    });
    svg.addEventListener('pointerover', (ev) => {
      if (!painting) return;
      const c = cellOf(ev.target);
      if (!c || (startCell && c.a === startCell.a && c.b === startCell.b && !dragged)) return;
      if (!dragged) {
        dragged = true;
        settleAll();
        paintOver(startCell.a, startCell.b);
      }
      paintOver(c.a, c.b);
    });
    const endPaint = () => {
      if (painting && dragged) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 0);
        paintCounter();
      }
      painting = false;
      dragged = false;
      startCell = null;
    };
    window.addEventListener('pointerup', endPaint);
    window.addEventListener('pointercancel', endPaint);

    // focusin/focusout sul contenitore HTML: in Chrome un elemento SVG con ascoltatori di focus diventa una tappa del Tab
    mount.addEventListener('focusin', (ev) => {
      const c = cellOf(ev.target);
      if (!c) return;
      let kbd = true;
      try { kbd = ev.target.closest('.mem-cell').matches(':focus-visible'); } catch (e) { /* selettore non supportato */ }
      ring.classList.toggle('is-kbd', kbd);
      if (c.a !== sel.a || c.b !== sel.b) select(c.a, c.b, false);
    });
    mount.addEventListener('focusout', (ev) => { if (cellOf(ev.target)) ring.classList.remove('is-kbd'); });
    svg.addEventListener('keydown', (ev) => {
      const c = cellOf(ev.target);
      if (!c) return;
      let { a, b } = c;
      switch (ev.key) {
        case 'ArrowUp': a = Math.max(0, a - 1); break;
        case 'ArrowDown': a = Math.min(7, a + 1); break;
        case 'ArrowLeft': b = Math.min(7, b + 1); break;
        case 'ArrowRight': b = Math.max(0, b - 1); break;
        case 'Home': b = 7; break;
        case 'End': b = 0; break;
        case 'PageUp': a = 0; break;
        case 'PageDown': a = 7; break;
        case 'Enter':
        case ' ':
        case 'Spacebar':
          ev.preventDefault();
          if (!ev.repeat) onCell(a, b);
          return;
        default: return;
      }
      ev.preventDefault();
      if (a !== c.a || b !== c.b) select(a, b, true);
    });

    /* ---------- lente ---------- */

    function makeLens() {
      const L = {};
      const pill = h('span', { class: 'mem-pill' }, 'si legge 1');
      const idText = h('b', { class: 'mem-lens-id' }, '00 · bit 7');
      const readBtn = ui.button({ label: 'Leggi', icon: '◉', title: null, ariaLabel: 'Leggi la cella nella lente', onClick: () => { L.stop(); L.play('read'); } });
      readBtn.classList.add('mem-readbtn');
      const cap = h('p', { class: 'mem-lens-cap' }, '');
      const svgL = s('svg', { class: 'mem-lens', viewBox: '0 0 380 272', role: 'img', 'aria-label': 'Lente sulla cella' });
      L.box = h('div', { class: 'mem-lens-box' },
        h('div', { class: 'mem-lens-head' }, h('span', { class: 'mem-lens-k' }, 'Lente sulla cella'), idText, pill, readBtn),
        svgL, cap);

      const txt = (x, y, t, cls, anchor) => s('text', { x: x, y: y, 'text-anchor': anchor || 'middle', class: cls || 'mem-l-t' }, t);

      /* --- gate flottante --- */
      const fg = s('g', { class: 'mem-l-fg' });
      const term = {
        src: s('path', { d: 'M64 32 V150', class: 'mem-l-term' }),
        cg: s('path', { d: 'M190 32 V68', class: 'mem-l-term' }),
        dr: s('path', { d: 'M316 32 V150', class: 'mem-l-term' }),
      };
      const chan = s('rect', { x: 106, y: 150, width: 168, height: 6, class: 'mem-l-chan', opacity: 0 });
      const fgPath = s('path', { class: 'mem-l-fgate' });
      const thinLabel = s('g', { class: 'mem-l-thin' }, s('path', { class: 'mem-l-lead' }), s('text', { class: 'mem-l-t s' }));
      const slots = [];
      const slotX = (i) => 128 + i * 25;
      const SY = 110; // quota degli elettroni intrappolati sul gate flottante
      for (let i = 0; i < 6; i++) slots.push(s('circle', { cx: slotX(i), cy: SY, r: 5.2, class: 'mem-l-e', opacity: 0 }));
      const movers = [];
      for (let i = 0; i < 8; i++) movers.push(s('circle', { cx: 0, cy: 0, r: 4.4, class: 'mem-l-e', opacity: 0 }));
      const phot = [];
      for (let i = 0; i < 6; i++) phot.push(s('path', { d: 'M0 -18 q3.5 4.5 0 9 q-3.5 4.5 0 9', class: 'mem-l-ph', opacity: 0 }));
      const cross = s('g', { class: 'mem-l-cross', opacity: 0 }, s('path', { d: 'M182 186 L198 202 M198 186 L182 202' }));
      const flashL = s('rect', { x: 0, y: 0, width: 380, height: 272, class: 'mem-l-flash', opacity: 0 });
      const mark = s('g', { class: 'mem-l-mark', transform: 'translate(104 252)' }, s('circle', { r: 7 }), s('text', { y: -12, 'text-anchor': 'middle' }, 'soglia'));
      fg.append(
        txt(64, 22, 'massa'), txt(190, 22, 'riga'), txt(316, 22, 'colonna'),
        term.src, term.cg, term.dr,
        s('circle', { cx: 64, cy: 32, r: 3.4, class: 'mem-l-pin' }), s('circle', { cx: 190, cy: 32, r: 3.4, class: 'mem-l-pin' }), s('circle', { cx: 316, cy: 32, r: 3.4, class: 'mem-l-pin' }),
        s('rect', { x: 14, y: 150, width: 352, height: 84, rx: 7, class: 'mem-l-sub' }),
        s('path', { d: 'M30 150 H106 V168 A14 14 0 0 1 92 182 H44 A14 14 0 0 1 30 168 Z', class: 'mem-l-n' }),
        s('path', { d: 'M274 150 H350 V168 A14 14 0 0 1 336 182 H288 A14 14 0 0 1 274 168 Z', class: 'mem-l-n' }),
        txt(68, 172, 'source'), txt(312, 172, 'drain'), txt(356, 225, 'substrato', 'mem-l-t dim', 'end'),
        chan,
        s('rect', { x: 92, y: 62, width: 198, height: 88, rx: 4, class: 'mem-l-ox' }),
        s('rect', { x: 104, y: 68, width: 172, height: 26, rx: 3, class: 'mem-l-cgate' }),
        txt(190, 86, 'gate di controllo', 'mem-l-t s'),
        fgPath,
        thinLabel, cross,
        ...slots, ...movers, ...phot,
        txt(190, 131, 'gate flottante', 'mem-l-t s'), // sopra gli elettroni in movimento, così resta leggibile
        s('line', { x1: 60, y1: 252, x2: 320, y2: 252, class: 'mem-l-track' }),
        s('line', { x1: 60, y1: 252, x2: 190, y2: 252, class: 'mem-l-zone' }),
        s('line', { x1: 190, y1: 243, x2: 190, y2: 259, class: 'mem-l-readline' }),
        txt(190, 270, 'lettura', 'mem-l-t s dim'),
        txt(50, 257, '1', 'mem-l-t b one', 'end'), txt(330, 257, '0', 'mem-l-t b', 'start'),
        mark, flashL);

      /* --- PROM --- */
      const prom = s('g', { class: 'mem-l-prom' });
      const fuseWhole = s('path', { d: 'M141 122 H159 L152.5 152 L159 182 H141 L147.5 152 Z', class: 'mem-l-fuse' });
      const fuseTop = s('path', { d: 'M141 122 H159 L154 145 H146 Z', class: 'mem-l-fuse' });
      const fuseBot = s('path', { d: 'M146 159 H154 L159 182 H141 Z', class: 'mem-l-fuse' });
      const soot = s('ellipse', { cx: 150, cy: 152, rx: 12, ry: 5, class: 'mem-l-soot' });
      const fuseLabel = txt(168, 157, 'fusibile intatto', 'mem-l-t', 'start');
      const promOut = txt(300, 262, 'uscita: 0', 'mem-l-t b');
      const promPath = s('path', { d: 'M150 60 V82 M150 100 V122 M150 182 V204 H300', class: 'mem-l-wire' });
      const sparkL = s('g', { class: 'mem-l-spark', transform: 'translate(150 152) scale(.4)', opacity: 0 });
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + 0.2;
        sparkL.append(s('line', { x1: Math.cos(ang) * 8, y1: Math.sin(ang) * 8, x2: Math.cos(ang) * 22, y2: Math.sin(ang) * 22 }));
      }
      const curDots = [];
      for (let i = 0; i < 4; i++) curDots.push(s('circle', { r: 4, class: 'mem-l-cur', opacity: 0 }));
      prom.append(
        txt(24, 46, 'riga (parola)', 'mem-l-t', 'start'), txt(300, 22, 'colonna (bit)'),
        s('path', { d: 'M24 60 H356', class: 'mem-l-bus' }), s('path', { d: 'M300 32 V240', class: 'mem-l-bus' }),
        promPath,
        s('path', { d: 'M139 82 H161 L150 100 Z', class: 'mem-l-diode' }), s('path', { d: 'M139 100 H161', class: 'mem-l-wire' }),
        s('circle', { cx: 150, cy: 60, r: 3.6, class: 'mem-l-pin' }), s('circle', { cx: 300, cy: 204, r: 3.6, class: 'mem-l-pin' }),
        txt(168, 96, 'diodo', 'mem-l-t', 'start'),
        soot, fuseWhole, fuseTop, fuseBot, fuseLabel, sparkL, ...curDots, promOut);

      /* --- ROM --- */
      const rom = s('g', { class: 'mem-l-rom' });
      const diode = s('g', { class: 'mem-l-has' },
        s('path', { d: 'M180 60 V92 M180 110 V134 H300', class: 'mem-l-wire' }),
        s('path', { d: 'M169 92 H191 L180 110 Z', class: 'mem-l-diode' }), s('path', { d: 'M169 110 H191', class: 'mem-l-wire' }),
        s('circle', { cx: 180, cy: 60, r: 3.6, class: 'mem-l-pin' }), s('circle', { cx: 300, cy: 134, r: 3.6, class: 'mem-l-pin' }));
      const empty = s('rect', { x: 160, y: 80, width: 40, height: 42, rx: 8, class: 'mem-l-empty' });
      const romLabel = txt(180, 168, 'diodo fissato dalla maschera', 'mem-l-t');
      const romOut = txt(300, 262, 'uscita: 1', 'mem-l-t b');
      const lock = s('g', { class: 'mem-l-lock', opacity: 0, transform: 'translate(96 112)' },
        s('path', { d: 'M-9 -2 V-10 A9 9 0 0 1 9 -10 V-2', class: 'shackle' }), s('rect', { x: -14, y: -3, width: 28, height: 22, rx: 4 }), s('circle', { cx: 0, cy: 7, r: 3, class: 'hole' }));
      rom.append(
        txt(24, 46, 'riga (parola)', 'mem-l-t', 'start'), txt(300, 22, 'colonna (bit)'),
        s('path', { d: 'M24 60 H356', class: 'mem-l-bus' }), s('path', { d: 'M300 32 V240', class: 'mem-l-bus' }),
        empty, diode, romLabel, lock, romOut);

      svgL.append(fg, prom, rom);

      function variantPaths(t) {
        if (t === 'eeprom') {
          fgPath.setAttribute('d', 'M104 98 H286 V147 H262 V138 H104 Z');
          thinLabel.firstChild.setAttribute('d', 'M252 204 L272 150');
          thinLabel.lastChild.setAttribute('x', 248); thinLabel.lastChild.setAttribute('y', 212); thinLabel.lastChild.setAttribute('text-anchor', 'end');
          thinLabel.lastChild.textContent = 'ossido sottile: effetto tunnel';
          thinLabel.style.display = '';
        } else if (t === 'flash') {
          fgPath.setAttribute('d', 'M104 98 H276 V143 H104 Z');
          thinLabel.firstChild.setAttribute('d', 'M190 200 V149');
          thinLabel.lastChild.setAttribute('x', 190); thinLabel.lastChild.setAttribute('y', 214); thinLabel.lastChild.setAttribute('text-anchor', 'middle');
          thinLabel.lastChild.textContent = 'ossido sottile';
          thinLabel.style.display = '';
        } else {
          fgPath.setAttribute('d', 'M104 98 H276 V138 H104 Z');
          thinLabel.style.display = 'none';
        }
      }

      let lt = 'rom';
      L.setTech = (t) => {
        lt = t;
        fg.style.display = FG[t] ? '' : 'none';
        prom.style.display = t === 'prom' ? '' : 'none';
        rom.style.display = t === 'rom' ? '' : 'none';
        if (FG[t]) variantPaths(t);
      };

      function value() { return M.bit(chips[tech].mem[sel.a], sel.b); }
      function setPill(v) { pill.textContent = 'si legge ' + v; pill.classList.toggle('one', v === 1); }
      // la pillola segue la soglia: la cella si legge 1 finché la soglia resta sotto la tensione di lettura (x = 190)
      function setMark(x) { mark.setAttribute('transform', 'translate(' + x.toFixed(1) + ' 252)'); setPill(x < 190 ? 1 : 0); }
      function hot(names, cls) {
        Object.keys(term).forEach((k) => term[k].classList.remove('is-hot', 'is-read'));
        (names || []).forEach((k) => term[k].classList.add(cls || 'is-hot'));
      }
      function hide(list) { list.forEach((el) => el.setAttribute('opacity', 0)); }

      function staticCaption(v) {
        if (lt === 'rom') return v ? 'C\'è un diodo: quando la riga si accende, la corrente arriva alla colonna e la cella si legge\u00a01.' : 'Nessun diodo a questo incrocio: la colonna resta spenta e la cella si legge\u00a00.';
        if (lt === 'prom') return v ? 'Fusibile bruciato: il collegamento è aperto e la corrente non arriva alla colonna. Il circuito di lettura lo traduce in\u00a01.' : 'Fusibile intatto: la corrente passa dalla riga alla colonna. In queste PROM il circuito di lettura lo traduce in 0, al contrario della ROM.';
        return v ? 'Gate flottante vuoto: soglia bassa. In lettura il canale si apre e la cella si legge\u00a01.' : 'Elettroni intrappolati sul gate flottante: soglia alta. In lettura il canale resta chiuso e la cella si legge\u00a00.';
      }

      /** Stato fermo della cella selezionata. */
      L.render = () => {
        const v = value();
        idText.textContent = hex2(sel.a) + ' · bit ' + sel.b;
        setPill(v);
        cap.textContent = staticCaption(v);
        svgL.setAttribute('aria-label', 'Lente sulla cella all\'indirizzo ' + hex2(sel.a) + ', bit ' + sel.b + '. ' + staticCaption(v));
        if (FG[lt]) {
          const charged = v === 0;
          slots.forEach((el) => { el.setAttribute('opacity', charged ? 1 : 0); el.removeAttribute('transform'); });
          setMark(charged ? 286 : 104);
          hide(movers); hide(phot);
          chan.setAttribute('opacity', 0);
          cross.setAttribute('opacity', 0);
          flashL.setAttribute('opacity', 0);
          hot([]);
        } else if (lt === 'prom') {
          const blown = v === 1;
          fuseWhole.style.display = blown ? 'none' : '';
          fuseTop.style.display = fuseBot.style.display = blown ? '' : 'none';
          soot.style.display = blown ? '' : 'none';
          [fuseWhole, fuseTop, fuseBot].forEach((el) => el.classList.remove('is-hot', 'is-white'));
          fuseLabel.textContent = blown ? 'fusibile bruciato' : 'fusibile intatto';
          promOut.textContent = 'uscita: ' + v;
          promPath.classList.remove('is-hot', 'is-read');
          sparkL.setAttribute('opacity', 0);
          hide(curDots);
          soot.classList.remove('is-denied');
        } else {
          diode.style.display = v ? '' : 'none';
          empty.style.display = v ? 'none' : '';
          romLabel.textContent = v ? 'diodo fissato dalla maschera' : 'nessun diodo: lo ha deciso la maschera';
          romOut.textContent = 'uscita: ' + v;
          lock.setAttribute('opacity', 0);
          hide(curDots);
        }
      };

      L.stop = () => { fxL.stop(); L.render(); };

      // posizione lungo una curva quadratica
      function quad(p0, c, p1, t) {
        const u = 1 - t;
        return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
      }
      function place(el, xy, o) { el.setAttribute('cx', xy[0].toFixed(1)); el.setAttribute('cy', xy[1].toFixed(1)); el.setAttribute('opacity', o.toFixed(2)); }
      function fadeEnds(p) { return p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1; }
      function markTo(from, to, dur, delay) {
        tw(fxL, { from: from, to: to, duration: dur, delay: delay || 0, ease: 'inOut', onUpdate: (x) => setMark(x) });
      }

      function playProgramFG() {
        const tunnel = lt === 'eeprom';
        cap.textContent = tunnel
          ? 'Scrittura: con una tensione alta sul gate di controllo gli elettroni passano dal drain al gate flottante attraversando l\'ossido sottile, per effetto tunnel.'
          : 'Scrittura: alta tensione su riga e colonna. Gli elettroni corrono nel canale e alcuni, vicino al drain, saltano oltre l\'ossido e restano sul gate flottante.';
        hot(tunnel ? ['cg'] : ['cg', 'dr']);
        slots.forEach((el) => el.setAttribute('opacity', 0));
        setMark(104);
        const n = tunnel ? 6 : 8;
        for (let i = 0; i < n; i++) {
          const em = movers[i];
          const jumps = i < 6;
          const jx = 214 + (i % 3) * 14;
          const sx = slotX(i);
          const f = tunnel
            ? (p) => (p < 0.45 ? [lerp(304, 278, p / 0.45), lerp(172, 146, p / 0.45)] : quad([278, 146], [sx + 18, 130], [sx, SY], (p - 0.45) / 0.55))
            : (p) => {
              if (p < 0.55) return [lerp(72, jx, p / 0.55), 153];
              const q = (p - 0.55) / 0.45;
              return jumps ? quad([jx, 153], [jx + 8, 126], [sx, SY], q) : [lerp(jx, 314, q), lerp(153, 168, q)];
            };
          tw(fxL, {
            duration: 900, delay: i * 85, ease: 'linear',
            onUpdate: (v, p) => place(em, f(p), jumps ? Math.min(1, p / 0.1) : fadeEnds(p)),
            onDone: () => { em.setAttribute('opacity', 0); if (jumps) slots[i].setAttribute('opacity', 1); },
          });
        }
        markTo(104, 286, 1100, 300);
        later(fxL, 1700, () => L.render());
      }

      function playEraseFG(kind, D) {
        const v0 = slots.map((el) => +el.getAttribute('opacity') > 0.5);
        if (!v0.some(Boolean)) slots.forEach((el) => el.setAttribute('opacity', 1)); // la cella era carica prima dell'operazione
        setMark(286);
        if (kind === 'uv') {
          cap.textContent = 'Luce ultravioletta: ogni fotone dà a un elettrone l\'energia per superare l\'ossido e lasciare il gate flottante.';
          const step = Math.max(240, (D - 1000) / 6);
          for (let i = 0; i < 6; i++) {
            const ph = phot[i];
            const sx = slotX(i);
            const d0 = 120 + i * step;
            tw(fxL, {
              from: -20, to: 104, duration: 420, delay: d0, ease: 'linear',
              onUpdate: (y, p) => { ph.setAttribute('transform', 'translate(' + sx + ' ' + y.toFixed(1) + ')'); ph.setAttribute('opacity', Math.min(1, p * 4).toFixed(2)); },
              onDone: () => {
                ph.setAttribute('opacity', 0);
                slots[i].setAttribute('opacity', 0);
                const em = movers[i];
                tw(fxL, { duration: 520, ease: 'sharp', onUpdate: (v) => place(em, [sx + v * 6, lerp(SY, 206, v)], 1 - v), onDone: () => em.setAttribute('opacity', 0) });
              },
            });
          }
          markTo(286, 104, D, 200);
          later(fxL, D + 300, () => L.render());
          return;
        }
        if (kind === 'flash') {
          cap.textContent = 'Cancellazione del blocco: la tensione si inverte e gli elettroni di tutte le celle escono insieme attraverso l\'ossido sottile.';
          hot(['src']);
          tw(fxL, { duration: 520, ease: 'linear', onUpdate: (v, p) => flashL.setAttribute('opacity', (p < 0.15 ? (p / 0.15) * 0.22 : 0.22 * (1 - (p - 0.15) / 0.85)).toFixed(3)) });
          slots.forEach((el, i) => {
            const sx = slotX(i);
            tw(fxL, {
              duration: 420, delay: 70, ease: 'sharp',
              onUpdate: (v) => { el.setAttribute('cy', lerp(SY, 178, v).toFixed(1)); el.setAttribute('cx', lerp(sx, i < 3 ? 76 : 100, v * v).toFixed(1)); el.setAttribute('opacity', (1 - v).toFixed(2)); },
              onDone: () => { el.setAttribute('opacity', 0); el.setAttribute('cy', SY); el.setAttribute('cx', sx); },
            });
          });
          markTo(286, 104, 500, 80);
          later(fxL, 1100, () => L.render());
          return;
        }
        // EEPROM: per effetto tunnel, dal gate flottante al drain attraverso la finestra sottile
        cap.textContent = 'Cancellazione del byte: la tensione si inverte e gli elettroni tornano nel drain attraverso l\'ossido sottile, per effetto tunnel.';
        hot(['dr']);
        slots.forEach((el, i) => {
          const sx = slotX(i);
          tw(fxL, {
            duration: 640, delay: 60 + i * 70, ease: 'inOut',
            onUpdate: (v) => {
              const xy = v < 0.6 ? quad([sx, SY], [sx + 30, 140], [278, 146], v / 0.6) : [lerp(278, 304, (v - 0.6) / 0.4), lerp(146, 172, (v - 0.6) / 0.4)];
              place(el, xy, v < 0.75 ? 1 : (1 - v) / 0.25);
            },
            onDone: () => { el.setAttribute('opacity', 0); el.setAttribute('cx', sx); el.setAttribute('cy', SY); },
          });
        });
        markTo(286, 104, 700, 200);
        later(fxL, 1300, () => L.render());
      }

      function playRead() {
        const v = value();
        cap.textContent = (FG[lt] ? 'Lettura: sul gate di controllo arriva la tensione di lettura. ' : 'Lettura: il decodificatore accende la riga. ') + (FG[lt]
          ? (v ? 'La soglia è bassa, il canale si apre e passa corrente:\u00a01.' : 'La soglia è alta, il canale resta chiuso e non passa corrente:\u00a00.')
          : lt === 'prom'
            ? (v ? 'Il fusibile è aperto, la corrente non arriva alla colonna e il circuito di lettura dà\u00a01.' : 'La corrente passa dal fusibile alla colonna e il circuito di lettura dà\u00a00.')
            : (v ? 'La corrente attraversa il diodo e arriva alla colonna:\u00a01.' : 'Nessun diodo, nessuna corrente:\u00a00.'));
        if (FG[lt]) {
          hot(['cg'], 'is-read');
          if (v) {
            tw(fxL, { duration: 220, ease: 'smooth', onUpdate: (o) => chan.setAttribute('opacity', o) });
            for (let i = 0; i < 5; i++) {
              const em = movers[i];
              tw(fxL, { duration: 760, delay: 180 + i * 120, ease: 'linear', onUpdate: (x, p) => place(em, [lerp(72, 312, p), 153], fadeEnds(p)), onDone: () => em.setAttribute('opacity', 0) });
            }
            tw(fxL, { duration: 260, delay: 1500, ease: 'smooth', onUpdate: (o) => chan.setAttribute('opacity', 1 - o) });
          } else {
            tw(fxL, { duration: 900, delay: 150, ease: 'linear', onUpdate: (o, p) => cross.setAttribute('opacity', (p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1).toFixed(2)) });
          }
          later(fxL, 1900, () => L.render());
          return;
        }
        // PROM e ROM: la corrente scende dalla riga verso la colonna
        const pts = lt === 'prom'
          ? (v ? [[150, 60], [150, 145]] : [[150, 60], [150, 204], [300, 204], [300, 240]])
          : (v ? [[180, 60], [180, 134], [300, 134], [300, 240]] : [[180, 60], [180, 76]]);
        if (lt === 'prom') promPath.classList.add('is-read');
        runDots(pts, 'is-read');
        later(fxL, 1700, () => L.render());
      }

      function runDots(pts, cls) {
        const segs = [];
        let len = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); len += d; }
        const at = (p) => {
          let d = p * len;
          for (let i = 0; i < segs.length; i++) {
            if (d <= segs[i] || i === segs.length - 1) { const q = segs[i] ? Math.min(1, d / segs[i]) : 1; return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q)]; }
            d -= segs[i];
          }
          return pts[pts.length - 1];
        };
        curDots.forEach((dot, i) => {
          dot.setAttribute('class', 'mem-l-cur ' + (cls || ''));
          tw(fxL, { duration: 820, delay: i * 140, ease: 'linear', onUpdate: (x, p) => place(dot, at(p), fadeEnds(p)), onDone: () => dot.setAttribute('opacity', 0) });
        });
      }

      function playBurn() {
        cap.textContent = 'Scrittura: una corrente forte attraversa il diodo e scalda il fusibile metallico finché si fonde. Il collegamento si apre per sempre.';
        // si parte dal fusibile intatto
        fuseWhole.style.display = '';
        fuseTop.style.display = fuseBot.style.display = 'none';
        soot.style.display = 'none';
        fuseLabel.textContent = 'fusibile intatto';
        promOut.textContent = 'uscita: 0';
        setPill(0);
        promPath.classList.add('is-hot');
        runDots([[150, 60], [150, 150]], 'is-hot');
        later(fxL, 360, () => fuseWhole.classList.add('is-hot'));
        later(fxL, 640, () => fuseWhole.classList.add('is-white'));
        later(fxL, 820, () => {
          fuseWhole.style.display = 'none';
          fuseTop.style.display = fuseBot.style.display = '';
          soot.style.display = '';
          fuseLabel.textContent = 'fusibile bruciato';
          promOut.textContent = 'uscita: 1';
          setPill(1);
          tw(fxL, {
            duration: 460, ease: 'sharp',
            onUpdate: (v) => { sparkL.setAttribute('transform', 'translate(150 152) scale(' + (0.4 + v).toFixed(3) + ')'); sparkL.setAttribute('opacity', (v < 0.15 ? v / 0.15 : (1 - v) / 0.85).toFixed(2)); },
            onDone: () => sparkL.setAttribute('opacity', 0),
          });
        });
        later(fxL, 1500, () => L.render());
      }

      L.play = (kind, opts) => {
        fxL.stop();
        L.render();
        if (ctx.reduced) {
          if (kind === 'read' || kind === 'locked' || kind === 'blown' || kind === 'denied') {
            // nessun movimento: basta la spiegazione
            if (kind === 'read') playReadStatic();
          }
          return;
        }
        if (kind === 'read') return playRead();
        if (lt === 'rom') {
          if (kind === 'locked') {
            cap.textContent = 'Questo collegamento è stato disegnato nella maschera: nessun segnale elettrico può aggiungerlo o toglierlo.';
            tw(fxL, { duration: 1300, ease: 'linear', onUpdate: (v, p) => {
              const k = clamp01(p / 0.25);
              lock.setAttribute('opacity', (p < 0.8 ? k : (1 - p) / 0.2).toFixed(2));
              lock.setAttribute('transform', 'translate(96 112) scale(' + CP.ease.bounce(k).toFixed(3) + ')');
            }, onDone: () => lock.setAttribute('opacity', 0) });
            later(fxL, 2400, () => L.render());
          }
          return;
        }
        if (lt === 'prom') {
          if (kind === 'burn') return playBurn();
          if (kind === 'blown') {
            cap.textContent = 'Il fusibile è già fuso: il metallo non si ricompone. Questo bit resterà 1 per sempre.';
            soot.classList.add('is-denied');
            later(fxL, 900, () => soot.classList.remove('is-denied'));
            later(fxL, 2400, () => L.render());
          }
          return;
        }
        if (kind === 'program') return playProgramFG();
        if (kind === 'uv') return playEraseFG('uv', (opts && opts.duration) || 3000);
        if (kind === 'flash') return playEraseFG('flash');
        if (kind === 'erase') return playEraseFG('eeprom');
        if (kind === 'denied') {
          cap.textContent = lt === 'eprom'
            ? 'Il gate flottante è avvolto dall\'ossido isolante: nessun segnale elettrico può toglierne gli elettroni. Serve la luce ultravioletta, su tutto il chip.'
            : 'Nella Flash gli elettroni escono solo quando si cancella il blocco intero: le celle di un blocco condividono lo stesso source.';
          tw(fxL, { duration: 460, ease: 'linear', onUpdate: (v, p) => slots.forEach((el) => el.setAttribute('transform', 'translate(' + (Math.sin(p * Math.PI * 6) * (1 - p) * 2.5).toFixed(2) + ' 0)')), onDone: () => slots.forEach((el) => el.removeAttribute('transform')) });
          later(fxL, 2600, () => L.render());
        }
      };

      function playReadStatic() {
        const v = value();
        if (FG[lt]) chan.setAttribute('opacity', v ? 1 : 0);
        cap.textContent = 'Lettura: ' + (FG[lt]
          ? (v ? 'la soglia è bassa, il canale si apre e passa corrente, quindi\u00a01.' : 'la soglia è alta, il canale resta chiuso, quindi\u00a00.')
          : lt === 'prom' ? (v ? 'il fusibile è aperto e la colonna resta spenta, quindi\u00a01.' : 'la corrente passa dal fusibile alla colonna, quindi\u00a00.')
            : (v ? 'la corrente attraversa il diodo, quindi\u00a01.' : 'nessun diodo, nessuna corrente, quindi\u00a00.'));
      }

      return L;
    }

    /* ---------- avvio ---------- */

    mount.dataset.tech = tech;
    lens.setTech(tech);
    paintCard();
    paintTask();
    renderAll();
    paintActions();
    lens.render();
    say('Comincia dalla ROM a maschera: clicca una cella e prova a cambiare quel bit.', false, 'Per cominciare');
    if (M.doneCount(progress) === 5) ctx.done();
  });
})();
