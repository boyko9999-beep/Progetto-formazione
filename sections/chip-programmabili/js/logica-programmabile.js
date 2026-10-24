/*
 * Capitolo 7 · Hardware che si riprogramma
 * Laboratorio «Disegna un circuito, poi cambialo», in tre passi:
 *   1 · PAL: bruci (o ripristini) i fusibili della griglia AND, la OR è fissa; quattro sfide con verifica automatica.
 *   2 · LUT: 16 bit di SRAM e un albero di multiplexer che porta all'uscita il bit scelto dagli ingressi.
 *   3 · Bitstream: una piccola FPGA che all'accensione riceve 64 bit da una EPROM e diventa un circuito.
 * La logica pura (valutazione, verifiche, simulazione) è in logica-programmabile-core.js.
 */
(function () {
  'use strict';
  if (!window.CP) return;

  CP.lab('logica-programmabile', function (mount, ctx) {
    const LP = window.LogicaProgrammabile;
    if (!LP) throw new Error('Manca js/logica-programmabile-core.js');
    const h = CP.h;
    const s = CP.s;
    const ui = CP.ui;
    const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
    const compact = () => !!(mq && mq.matches);
    const reduced = () => ctx.reduced;
    const EASE = 'cubic-bezier(.22, 1, .36, 1)';
    const POP = 'cubic-bezier(.34, 1.56, .64, 1)';
    const MODES = ['pal', 'lut', 'bit'];

    /* ---------- piccoli attrezzi ---------- */

    function onActivate(el, fn) {
      el.addEventListener('click', fn);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          fn(e);
        }
      });
    }

    function play(el, frames, opts) {
      if (reduced() || !el || !el.animate) return null;
      try { return el.animate(frames, opts); } catch (e) { return null; }
    }

    function later(fn, ms) {
      if (!ms || reduced()) fn();
      else window.setTimeout(fn, ms);
    }

    function delay(el, ms) {
      el.style.setProperty('--d', (reduced() ? 0 : Math.round(ms || 0)) + 'ms');
    }

    function pts(list) {
      return list.map((p) => (+p[0].toFixed(1)) + ',' + (+p[1].toFixed(1))).join(' ');
    }

    function lengthOf(list) {
      let d = 0;
      for (let i = 1; i < list.length; i++) d += Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1]);
      return d;
    }

    function pointAt(list, dist) {
      let rest = dist;
      for (let i = 1; i < list.length; i++) {
        const seg = Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1]);
        if (rest <= seg || i === list.length - 1) {
          const t = seg ? Math.max(0, Math.min(1, rest / seg)) : 1;
          return [list[i - 1][0] + (list[i][0] - list[i - 1][0]) * t, list[i - 1][1] + (list[i][1] - list[i - 1][1]) * t];
        }
        rest -= seg;
      }
      return list[list.length - 1];
    }

    function bezier(a, c, b, t) {
      const u = 1 - t;
      return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
    }

    /** Filo con una base e una copia accesa sopra (classe is-on sul gruppo). */
    function wire(parent, list, cls) {
      const p = pts(list);
      const g = s('g', { class: 'lp-w' + (cls ? ' ' + cls : '') },
        s('polyline', { class: 'lp-w-base', points: p }),
        s('polyline', { class: 'lp-w-hi', points: p }));
      parent.append(g);
      return g;
    }

    /** Lettera con la barra sopra se negata (la barra è disegnata: niente caratteri combinati). */
    function letter(parent, x, y, name, neg, size, cls) {
      const g = s('g', { class: cls || null });
      g.append(s('text', { x: x, y: y, 'font-size': size, 'text-anchor': 'middle' }, name));
      if (neg) g.append(s('line', { class: 'lp-bar', x1: x - size * 0.34, x2: x + size * 0.34, y1: y - size * 0.88, y2: y - size * 0.88 }));
      parent.append(g);
      return g;
    }

    /** Termine prodotto allineato a destra in xr: A·B̄…, oppure 0 / 1. */
    function drawTerm(g, xr, y, info, size) {
      g.textContent = '';
      if (info.kind !== 'product') {
        g.append(s('text', { x: xr, y: y, 'font-size': size, 'text-anchor': 'end', class: info.kind === 'zero' ? 'lp-term-zero' : 'lp-term-one' }, info.kind === 'zero' ? '0' : '1'));
        return;
      }
      const LW = size * 0.8;
      const DW = size * 0.44;
      const n = info.literals.length;
      let x = xr - (n * LW + (n - 1) * DW);
      info.literals.forEach((l, i) => {
        if (i) {
          g.append(s('text', { class: 'lp-term-dot', x: x + DW / 2, y: y, 'font-size': size, 'text-anchor': 'middle' }, '·'));
          x += DW;
        }
        letter(g, x + LW / 2, y, l.name, l.neg, size, 'lp-term-lit');
        x += LW;
      });
    }

    function termNodes(info) {
      if (info.kind === 'zero') return ['0'];
      if (info.kind === 'one') return ['1'];
      const out = [];
      info.literals.forEach((l, i) => {
        if (i) out.push('·');
        out.push(l.neg ? h('span', { class: 'lp-neg' }, l.name) : l.name);
      });
      return out;
    }

    function exprNodes(fuses) {
      const terms = [];
      for (const row of fuses) {
        const t = LP.termInfo(row);
        if (t.kind === 'one') return ['1'];
        if (t.kind === 'product') terms.push(t);
      }
      if (!terms.length) return ['0'];
      const out = [];
      terms.forEach((t, i) => {
        if (i) out.push(' + ');
        termNodes(t).forEach((n) => out.push(n));
      });
      return out;
    }

    /** La stessa espressione in parole, per gli annunci ai lettori di schermo. */
    function exprSpoken(fuses) {
      const terms = [];
      for (const row of fuses) {
        const t = LP.termInfo(row);
        if (t.kind === 'one') return 'sempre 1';
        if (t.kind === 'product') terms.push(t.literals.map((l) => (l.neg ? 'non ' : '') + l.name).join(' e '));
      }
      return terms.length ? terms.join(', oppure ') : 'sempre 0';
    }

    /** Interruttore disegnato: [ A | 1 ]. */
    function svgToggle(parent, o) {
      const g = s('g', { class: 'lp-tog lp-focus', tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': 'Ingresso ' + o.name, transform: 'translate(' + o.x + ' ' + o.y + ')' });
      const split = o.w * 0.46;
      const val = s('rect', { class: 'lp-tog-val', x: split, y: 3, width: o.w - split - 3, height: o.h - 6, rx: 5 });
      const vt = s('text', { class: 'lp-tog-vt', x: split + (o.w - split - 3) / 2, y: o.h / 2 + o.font * 0.36, 'text-anchor': 'middle', 'font-size': o.font }, '0');
      g.append(
        s('rect', { class: 'lp-hit', x: -4, y: -6, width: o.w + 8, height: o.h + 12, rx: 10 }),
        s('rect', { class: 'lp-ring', x: -3.5, y: -3.5, width: o.w + 7, height: o.h + 7, rx: 10 }),
        s('rect', { class: 'lp-tog-body', x: 0, y: 0, width: o.w, height: o.h, rx: 7 }),
        s('text', { class: 'lp-tog-name', x: split / 2 + 1, y: o.h / 2 + o.font * 0.36, 'text-anchor': 'middle', 'font-size': o.font }, o.name),
        val, vt);
      parent.append(g);
      return { g: g, val: val, vt: vt };
    }

    function setToggle(t, v) {
      const on = !!v;
      if (t.g.classList.contains('is-on') !== on) play(t.val, [{ transform: 'scaleY(.3)' }, { transform: 'scaleY(1)' }], { duration: CP.dur.fast + 40, easing: POP });
      t.g.classList.toggle('is-on', on);
      t.g.setAttribute('aria-pressed', String(on));
      t.vt.textContent = on ? '1' : '0';
    }

    function makeLed(parent, cx, cy, r, font) {
      const g = s('g', { class: 'lp-led' });
      const core = s('circle', { class: 'lp-led-core', cx: cx, cy: cy, r: r });
      const txt = s('text', { class: 'lp-led-t', x: cx, y: cy + font * 0.36, 'text-anchor': 'middle', 'font-size': font }, '0');
      g.append(s('circle', { class: 'lp-led-halo', cx: cx, cy: cy, r: r * 1.85 }), core, txt);
      parent.append(g);
      return { g: g, core: core, txt: txt, seq: 0 };
    }

    function setLed(led, on, d, label) {
      const v = !!on;
      const seq = ++led.seq;
      delay(led.g, d);
      const was = led.g.classList.contains('is-on');
      led.g.classList.toggle('is-on', v);
      later(() => { if (seq === led.seq) led.txt.textContent = label != null ? label : (v ? '1' : '0'); }, d);
      if (v && !was) play(led.core, [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: CP.dur.normal + 50, delay: d || 0, easing: POP });
    }

    function setBtn(b, icon, label) {
      const sp = b.querySelectorAll('span');
      if (sp[0]) sp[0].textContent = icon;
      if (sp[1]) sp[1].textContent = label;
    }

    /* ---------- struttura del laboratorio ---------- */

    const state = { mode: 'pal', goalDone: ctx.root.classList.contains('is-done') };

    const tabs = ui.seg({
      label: 'Passo del laboratorio',
      value: 'pal',
      options: [{ value: 'pal', label: '1 · PAL' }, { value: 'lut', label: '2 · LUT' }, { value: 'bit', label: '3 · Bitstream' }],
      onChange: setMode,
    });
    tabs.classList.add('lp-tabs');
    const solvedRead = ui.readout('Sfide PAL', '0/4');
    const lutDoneRead = ui.readout('LUT', '0/1');
    const topBar = ui.bar(tabs, h('span', { class: 'grow' }), solvedRead, lutDoneRead);
    topBar.classList.add('lp-top');
    const toolsWrap = h('div', { class: 'lp-tools' });
    const stage = h('div', { class: 'cp-stage lp-stage' });
    const explain = h('div', { class: 'cp-explain lp-explain' });
    const legendWrap = h('div', { class: 'lp-legends' });
    const goalText = h('span', null);
    const goal = h('p', { class: 'cp-goal lp-goal' }, goalText);

    /* =================== 1 · PAL =================== */

    const PAL_TEXT = {
      allarme: {
        label: 'Allarme',
        title: 'Sfida: l\'antifurto',
        desc: 'A è la porta aperta, B il sistema armato; C non conta. La sirena deve suonare solo se la porta è aperta e il sistema è armato.',
        hints: [
          'Ti basta una riga: deve valere 1 solo quando A e B valgono 1.',
          'Nella riga 1 lascia intatti i fusibili di A e di B. Brucia gli altri quattro: non A, non B, C e non C.',
        ],
        win: 'La PAL ora è un antifurto: Uscita = A·B.',
      },
      xor: {
        label: 'XOR',
        title: 'Sfida: la luce delle scale',
        desc: 'A e B sono due interruttori, C non conta. La luce si accende quando sono in posizioni diverse: è lo XOR.',
        hints: [
          'XOR = (A e non B) oppure (non A e B): una riga per ogni prodotto.',
          'Riga 1: lascia intatti A e non B. Riga 2: lascia intatti non A e B. Brucia tutti gli altri fusibili di quelle due righe.',
        ],
        win: 'Due righe di prodotti e la OR fissa: ecco lo XOR.',
      },
      maggioranza: {
        label: 'Maggioranza',
        title: 'Sfida: la maggioranza',
        desc: 'Tre giudici, A, B e C, votano sì (1) o no (0). La proposta passa con almeno due sì.',
        hints: [
          'Basta che una coppia dica sì: (A e B) oppure (A e C) oppure (B e C).',
          'Tre righe, ognuna con due soli fusibili intatti: riga 1 A e B, riga 2 A e C, riga 3 B e C.',
        ],
        win: 'Tre righe, tre coppie: la PAL ora vota a maggioranza.',
      },
      parita: {
        label: 'Parità',
        title: 'Sfida da esperti: la parità',
        desc: 'L\'uscita vale 1 quando gli ingressi a 1 sono dispari, cioè uno o tre. Ti serviranno tutte e quattro le righe.',
        hints: [
          'Una riga per ogni combinazione con un numero dispari di 1: 100, 010, 001 e 111 (nell\'ordine A B C).',
          'In ogni riga lascia intatto un solo fusibile per ingresso. Per 100: A, non B e non C.',
        ],
        win: 'Quattro righe piene: è il massimo che questa PAL può fare.',
      },
    };

    const pal = { fuses: LP.blankPal(), inputs: [0, 0, 0], ch: 0, solved: new Set(), hint: 0, sweep: null };
    const pu = {};

    // Geometria del palco della PAL: larga (computer) e stretta (telefono).
    const PW = { W: 640, H: 372, x0: 140, pc: 46, togY: 26, togW: 64, togH: 30, row0: 150, pr: 52, termX: 104, andX: 400, andW: 30, andH: 26, orX: 470, orW: 60, ledX: 590, ledR: 15, inv: 12, font: 13, termFont: 15, fuseW: 22, fuseH: 12, hitW: 40, hitH: 42 };
    const PC = { W: 360, H: 350, x0: 84, pc: 30, togY: 24, togW: 52, togH: 28, row0: 134, pr: 48, termX: 56, andX: 254, andW: 22, andH: 20, orX: 286, orW: 26, ledX: 334, ledR: 10, inv: 11, font: 12, termFont: 13, fuseW: 17, fuseH: 10, hitW: 28, hitH: 36 };

    const sweepBtn = ui.button(reduced()
      ? { label: 'Prossima combinazione', icon: '→', primary: true, onClick: sweepPal }
      : { label: 'Prova le 8 combinazioni', icon: '▶︎', primary: true, onClick: sweepPal });
    const hintBtn = ui.button({ label: 'Suggerimento', icon: '?', onClick: showHint });
    const resetBtn = ui.button({ label: 'Chip vergine', icon: '↺', title: 'Ripristina tutti i fusibili (si può solo in simulazione)', onClick: resetPal });
    const rightRead = ui.readout('Giuste', '0/8');
    const palTools = ui.bar(sweepBtn, hintBtn, resetBtn, h('span', { class: 'grow' }), rightRead);

    const chSeg = ui.seg({
      label: 'Sfida della PAL',
      value: LP.challenges[0].id,
      options: LP.challenges.map((c) => ({ value: c.id, label: PAL_TEXT[c.id].label })),
      onChange: (v) => {
        pal.ch = LP.challenges.findIndex((c) => c.id === v);
        pal.hint = 0;
        palHint.hidden = true;
        renderPalPanel(true);
        checkPal();
        play(palTitle, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, easing: EASE });
      },
    });
    const palTitle = h('h4', null);
    const palDesc = h('p', { class: 'lp-desc' });
    const palExpr = h('b', { class: 'lp-expr', 'aria-hidden': 'true' });
    const palExprSr = h('span', { class: 'cp-sr' });
    const palAsm = h('code', null);
    const palEq = h('p', { class: 'lp-eq' },
      h('span', { class: 'lp-eq-line' }, 'Il tuo circuito: Uscita = ', palExpr, palExprSr),
      h('span', { class: 'lp-eq-line' }, 'In PALASM: ', palAsm));
    const palStatus = h('p', { class: 'lp-status' });
    const palHint = h('p', { class: 'lp-hint', hidden: true });
    const tt = buildTable();
    const palPanel = h('div', { class: 'lp-panel' },
      h('span', { class: 'step' }, 'Passo 1 · La PAL'),
      h('p', { class: 'lp-intro' }, 'Clicca un fusibile per bruciarlo; cliccalo di nuovo per ripristinarlo (si può solo in simulazione). Ogni riga fa l\'AND dei fusibili intatti, la OR fissa riunisce le righe.'),
      h('div', { class: 'lp-pick' }, h('span', { class: 'lp-k' }, 'Sfida'), chSeg),
      palTitle, palDesc, palEq, tt.table, palStatus, palHint);

    // Tabella di verità in orizzontale: una colonna per combinazione, così la prova scorre da sinistra a destra.
    function buildTable() {
      const cols = [];
      const head = h('tr', null, h('th', { scope: 'row' }, 'A B C'));
      const rGot = h('tr', null, h('th', { scope: 'row' }, 'Uscita'));
      const rWant = h('tr', null, h('th', { scope: 'row' }, 'Obiettivo'));
      const rRes = h('tr', null, h('th', { scope: 'row' }, 'Esito'));
      for (let i = 0; i < 8; i++) {
        const ins = LP.comboInputs(i, 3);
        const btn = h('button', { type: 'button', class: 'lp-combo', 'aria-label': 'Prova la combinazione A ' + ins[0] + ', B ' + ins[1] + ', C ' + ins[2] }, ins.join(''));
        btn.addEventListener('click', () => { stopSweep(); setPalInputs(ins.slice()); });
        const th = h('th', { scope: 'col', class: 'lp-c' }, btn);
        const got = h('td', { class: 'lp-c lp-v' });
        const want = h('td', { class: 'lp-c lp-v lp-want' });
        const res = h('td', { class: 'lp-c lp-res' });
        head.append(th);
        rGot.append(got);
        rWant.append(want);
        rRes.append(res);
        cols.push({ cells: [th, got, want, res], got: got, want: want, res: res });
      }
      const table = h('table', { class: 'lp-tt' },
        h('caption', { class: 'cp-sr' }, 'Tabella di verità: per ogni combinazione di A, B e C, l\'uscita del tuo circuito e quella richiesta dalla sfida.'),
        h('thead', null, head),
        h('tbody', null, rGot, rWant, rRes));
      return { table: table, rows: cols };
    }

    function andPath(x, y, w, hh) {
      const r = hh / 2;
      return 'M' + x + ' ' + (y - r) + 'h' + (w - r) + 'a' + r + ' ' + r + ' 0 0 1 0 ' + hh + 'h' + (-(w - r)) + 'z';
    }

    function buildPal() {
      const P = compact() ? PC : PW;
      pu.P = P;
      const colX = (c) => P.x0 + c * P.pc;
      const rowY = (r) => P.row0 + r * P.pr;
      pu.rowY = rowY;
      const svg = s('svg', { viewBox: '0 0 ' + P.W + ' ' + P.H, class: 'lp-svg', role: 'group', 'aria-label': 'PAL simulata: tre ingressi con le loro negazioni, quattro righe di prodotti con i fusibili, una porta OR fissa e l\'uscita' });
      const gWires = s('g');
      const gTogs = s('g');
      const gFuses = s('g');
      const gTop = s('g');
      svg.append(gWires, gTogs, gFuses, gTop);
      const lastRow = rowY(LP.PAL_ROWS - 1);
      const colBot = lastRow + P.pr * 0.42;
      const rowX0 = P.x0 - P.pc * 0.62;

      pu.cols = [[], [], [], [], [], []];
      pu.toggles = [];
      for (let i = 0; i < 3; i++) {
        const xt = colX(2 * i);
        const xn = colX(2 * i + 1);
        const xm = (xt + xn) / 2;
        const split = P.togY + P.togH + 9;
        const invTop = split + 7;
        const invBot = invTop + P.inv;
        pu.cols[2 * i].push(wire(gWires, [[xm, P.togY + P.togH], [xm, split], [xt, split], [xt, colBot]], 'lp-col'));
        pu.cols[2 * i].push(wire(gWires, [[xm, split], [xn, split], [xn, invTop]], 'lp-col'));
        pu.cols[2 * i + 1].push(wire(gWires, [[xn, invBot + 6.4], [xn, colBot]], 'lp-col'));
        gWires.append(
          s('path', { class: 'lp-inv', d: 'M' + (xn - P.inv * 0.62) + ' ' + invTop + 'L' + (xn + P.inv * 0.62) + ' ' + invTop + 'L' + xn + ' ' + invBot + 'Z' }),
          s('circle', { class: 'lp-inv', cx: xn, cy: invBot + 3.2, r: 3.2 }));
        const tg = svgToggle(gTogs, { x: xm - P.togW / 2, y: P.togY, w: P.togW, h: P.togH, name: LP.PAL_INPUTS[i], font: P.font + 2 });
        onActivate(tg.g, () => {
          stopSweep();
          const ins = pal.inputs.slice();
          ins[i] = ins[i] ? 0 : 1;
          setPalInputs(ins);
        });
        pu.toggles.push(tg);
      }

      const headY = P.row0 - P.pr * 0.6;
      pu.heads = [];
      for (let c = 0; c < 6; c++) {
        const info = LP.colInfo(c);
        const g = s('g', { class: 'lp-head' });
        g.append(s('rect', { x: colX(c) - P.pc * 0.36, y: headY - P.font * 0.98, width: P.pc * 0.72, height: P.font * 1.56, rx: 5 }));
        letter(g, colX(c), headY + P.font * 0.34, info.name, info.neg, P.font + 1, 'lp-head-t');
        gTop.append(g);
        pu.heads.push(g);
      }

      const orTop = P.row0 - P.pr * 0.42;
      const orBot = lastRow + P.pr * 0.42;
      const orCy = (orTop + orBot) / 2;
      const bd = P.orW * 0.16;
      const backX = (y) => {
        const t = (y - orTop) / (orBot - orTop);
        return P.orX + 4 * bd * t * (1 - t);
      };
      pu.rows = [];
      pu.ands = [];
      pu.andOut = [];
      pu.terms = [];
      pu.fuses = [];
      for (let r = 0; r < LP.PAL_ROWS; r++) {
        const y = rowY(r);
        pu.rows.push(wire(gWires, [[rowX0, y], [P.andX, y]], 'lp-row'));
        pu.andOut.push(wire(gWires, [[P.andX + P.andW, y], [backX(y) + 1.5, y]], 'lp-row'));
        const and = s('path', { class: 'lp-gate', d: andPath(P.andX, y, P.andW, P.andH) });
        gTop.append(and);
        pu.ands.push(and);
        const term = s('g', { class: 'lp-term' });
        gTop.append(term);
        pu.terms.push(term);
        const list = [];
        for (let c = 0; c < 6; c++) list.push(makeFuse(gFuses, colX(c), y, r, c, P));
        pu.fuses.push(list);
      }
      pu.or = s('path', {
        class: 'lp-gate lp-gate-or',
        d: 'M' + P.orX + ' ' + orTop + 'Q' + (P.orX + P.orW * 0.62) + ' ' + orTop + ' ' + (P.orX + P.orW) + ' ' + orCy +
          'Q' + (P.orX + P.orW * 0.62) + ' ' + orBot + ' ' + P.orX + ' ' + orBot + 'Q' + (P.orX + 2 * bd) + ' ' + orCy + ' ' + P.orX + ' ' + orTop + 'Z',
      });
      gTop.append(pu.or);
      pu.outWire = wire(gWires, [[P.orX + P.orW, orCy], [P.ledX - P.ledR, orCy]], 'lp-row lp-out');
      pu.led = makeLed(gTop, P.ledX, orCy, P.ledR, P.font + 1);
      gTop.append(
        s('text', { class: 'lp-cap', x: P.ledX, y: orCy + P.ledR + P.font + 7, 'text-anchor': 'middle', 'font-size': P.font - 1 }, 'USCITA'),
        s('text', { class: 'lp-cap', x: P.orX + P.orW / 2, y: orBot + P.font + 8, 'text-anchor': 'middle', 'font-size': P.font - 1 }, 'OR fissa'),
        s('text', { class: 'lp-cap', x: (colX(0) + colX(5)) / 2, y: P.H - 10, 'text-anchor': 'middle', 'font-size': P.font - 1 }, 'griglia AND programmabile'));
      return svg;
    }

    function makeFuse(parent, cx, cy, r, c, P) {
      const fw = P.fuseW;
      const fh = P.fuseH;
      const g = s('g', { class: 'lp-fuse lp-focus', tabindex: '0', role: 'button', transform: 'translate(' + cx + ' ' + cy + ')' });
      const body = s('rect', { class: 'lp-fbody', x: -fw / 2, y: -fh / 2, width: fw, height: fh, rx: 3 });
      const spark = s('circle', { class: 'lp-spark', r: fw * 0.45 });
      g.append(
        s('rect', { class: 'lp-hit', x: -P.hitW / 2, y: -P.hitH / 2, width: P.hitW, height: P.hitH, rx: 6 }),
        s('rect', { class: 'lp-ring', x: -fw / 2 - 4, y: -fh / 2 - 4, width: fw + 8, height: fh + 8, rx: 6 }),
        body,
        s('line', { class: 'lp-fl', x1: -fw / 2 + 2.6, y1: 0, x2: 0.6, y2: 0 }),
        s('line', { class: 'lp-fr', x1: -0.6, y1: 0, x2: fw / 2 - 2.6, y2: 0 }),
        s('circle', { class: 'lp-ember', r: 2.4 }),
        spark);
      onActivate(g, () => toggleFuse(r, c));
      g.addEventListener('keydown', (e) => {
        const map = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
        const d = map[e.key];
        if (!d) return;
        const nr = r + d[0];
        const nc = c + d[1];
        if (nr < 0 || nr >= LP.PAL_ROWS || nc < 0 || nc >= LP.PAL_COLS) return;
        e.preventDefault();
        pu.fuses[nr][nc].g.focus();
      });
      parent.append(g);
      return { g: g, body: body, spark: spark };
    }

    function toggleFuse(r, c) {
      const intact = !pal.fuses[r][c];
      pal.fuses[r][c] = intact;
      const f = pu.fuses[r][c];
      if (!intact) {
        // il fusibile si brucia: un lampo breve sul corpo e una scintilla che si allarga
        play(f.spark, [{ opacity: 0.95, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.9)' }], { duration: CP.dur.normal + 80, easing: EASE });
        play(f.body, [{ fill: 'rgba(255, 214, 120, .9)', stroke: '#ffd678' }, { fill: 'rgba(107, 82, 70, .12)', stroke: '#6b5246' }], { duration: CP.dur.normal, easing: 'ease-out' });
      } else {
        play(f.body, [{ stroke: '#f0b04a' }, { stroke: '#2b4139' }], { duration: CP.dur.slow, easing: 'ease-out' });
      }
      renderPal('fuse');
      const info = LP.colInfo(c);
      const res = LP.checkPal(pal.fuses, LP.challenges[pal.ch]);
      ctx.say('Riga ' + (r + 1) + ': fusibile ' + (info.neg ? 'non ' : '') + info.name + (intact ? ' ripristinato' : ' bruciato') +
        '. Uscita: ' + exprSpoken(pal.fuses) + '. Combinazioni giuste: ' + res.right + ' su 8.');
      checkPal();
    }

    function setPalInputs(ins) {
      pal.inputs = ins.map((v) => (v ? 1 : 0));
      renderPal('input');
    }

    function renderPal(from) {
      const P = pu.P;
      const ev = LP.palEval(pal.fuses, pal.inputs);
      const stag = from === 'input';
      for (let c = 0; c < 6; c++) {
        const v = LP.literal(c, pal.inputs);
        pu.cols[c].forEach((w) => { delay(w, 0); w.classList.toggle('is-on', !!v); });
        pu.heads[c].classList.toggle('is-on', !!v);
      }
      pal.inputs.forEach((v, i) => setToggle(pu.toggles[i], v));
      for (let r = 0; r < LP.PAL_ROWS; r++) {
        for (let c = 0; c < 6; c++) {
          const intact = pal.fuses[r][c];
          const f = pu.fuses[r][c];
          const info = LP.colInfo(c);
          f.g.classList.toggle('is-burnt', !intact);
          f.g.classList.toggle('is-hot', intact && !!LP.literal(c, pal.inputs));
          f.g.setAttribute('aria-label', 'Riga ' + (r + 1) + ', colonna ' + (info.neg ? 'non ' : '') + info.name + ': fusibile ' +
            (intact ? 'intatto' : 'bruciato') + '. Premi per ' + (intact ? 'bruciarlo' : 'ripristinarlo') + '.');
        }
        const d = stag ? 80 + r * 60 : 0;
        const on = !!ev.products[r];
        delay(pu.rows[r], d);
        pu.rows[r].classList.toggle('is-on', on);
        delay(pu.ands[r], d + 40);
        pu.ands[r].classList.toggle('is-on', on);
        delay(pu.andOut[r], d + 70);
        pu.andOut[r].classList.toggle('is-on', on);
        drawTerm(pu.terms[r], P.termX, pu.rowY(r) + P.termFont * 0.36, LP.termInfo(pal.fuses[r]), P.termFont);
        pu.terms[r].classList.toggle('is-on', on);
      }
      const dOut = stag ? 80 + 3 * 60 + 150 : 0;
      delay(pu.or, dOut);
      pu.or.classList.toggle('is-on', !!ev.out);
      delay(pu.outWire, dOut + 40);
      pu.outWire.classList.toggle('is-on', !!ev.out);
      setLed(pu.led, ev.out, dOut + 90);
      renderPalPanel(false);
    }

    function setV(td, v) {
      td.textContent = String(v);
      td.classList.toggle('is-one', !!v);
    }

    function renderPalPanel(chChanged) {
      const ch = LP.challenges[pal.ch];
      const T = PAL_TEXT[ch.id];
      if (chChanged || !palTitle.textContent) {
        palTitle.textContent = T.title;
        palDesc.textContent = T.desc;
      }
      const res = LP.checkPal(pal.fuses, ch);
      palExpr.textContent = '';
      exprNodes(pal.fuses).forEach((n) => palExpr.append(n));
      palExprSr.textContent = exprSpoken(pal.fuses);
      palAsm.textContent = LP.palasm(pal.fuses);
      const cur = LP.comboIndex(pal.inputs);
      tt.rows.forEach((row, i) => {
        row.cells.forEach((c) => c.classList.toggle('is-cur', i === cur));
        setV(row.got, res.got[i]);
        setV(row.want, res.want[i]);
        const ok = res.got[i] === res.want[i];
        row.res.className = 'lp-res ' + (ok ? 'is-ok' : 'is-ko');
        row.res.textContent = '';
        row.res.append(ok ? '✓' : '✗', h('span', { class: 'cp-sr' }, ok ? ' giusta' : ' da correggere'));
      });
      rightRead.set(res.right + '/8');
      palStatus.classList.toggle('is-ok', res.ok);
      palStatus.textContent = res.ok
        ? '✓ Sfida risolta: tutte le 8 combinazioni sono giuste. ' + T.win
        : 'Combinazioni giuste: ' + res.right + ' su 8. Correggi quelle segnate con ✗.';
    }

    function checkPal() {
      const ch = LP.challenges[pal.ch];
      const res = LP.checkPal(pal.fuses, ch);
      if (!res.ok || pal.solved.has(ch.id)) return;
      pal.solved.add(ch.id);
      const T = PAL_TEXT[ch.id];
      const b = chSeg.querySelectorAll('button')[pal.ch];
      if (b) b.textContent = '✓ ' + T.label;
      tt.rows.forEach((row, i) => play(row.got, [{ backgroundColor: 'rgba(62, 224, 143, .4)' }, { backgroundColor: 'rgba(62, 224, 143, 0)' }], { duration: CP.dur.slow, delay: i * 60, easing: 'ease-out' }));
      play(palStatus, [{ transform: 'translateY(6px)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: CP.dur.normal, easing: EASE });
      ctx.say('Sfida ' + T.label + ' risolta. ' + T.win);
      updateGoal();
    }

    function sweepPal() {
      if (reduced()) {
        const i = (LP.comboIndex(pal.inputs) + 1) % 8;
        setPalInputs(LP.comboInputs(i, 3));
        const ev = LP.palEval(pal.fuses, pal.inputs);
        ctx.say('A ' + pal.inputs[0] + ', B ' + pal.inputs[1] + ', C ' + pal.inputs[2] + ': uscita ' + ev.out + '.');
        return;
      }
      if (pal.sweep) { stopSweep(false); return; }
      let i = 0;
      setPalInputs(LP.comboInputs(0, 3));
      setBtn(sweepBtn, '■', 'Ferma la prova');
      pal.sweep = ctx.every(640, () => {
        i++;
        if (i >= 8) { stopSweep(true); return; }
        setPalInputs(LP.comboInputs(i, 3));
      });
    }

    function stopSweep(finished) {
      if (!pal.sweep) return;
      pal.sweep();
      pal.sweep = null;
      setBtn(sweepBtn, '▶︎', 'Prova le 8 combinazioni');
      if (finished) {
        const r = LP.checkPal(pal.fuses, LP.challenges[pal.ch]);
        ctx.say('Prova finita: ' + r.right + ' combinazioni giuste su 8.');
      }
    }

    function showHint() {
      const T = PAL_TEXT[LP.challenges[pal.ch].id];
      palHint.textContent = 'Suggerimento: ' + T.hints[Math.min(pal.hint, T.hints.length - 1)];
      palHint.hidden = false;
      pal.hint = (pal.hint + 1) % T.hints.length;
      play(palHint, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, easing: EASE });
      ctx.say(palHint.textContent);
    }

    function resetPal() {
      stopSweep(false);
      pal.fuses = LP.blankPal();
      renderPal('reset');
      checkPal();
      pu.fuses.forEach((row, r) => row.forEach((f) => play(f.body, [{ stroke: '#f0b04a' }, { stroke: '#2b4139' }], { duration: CP.dur.slow, delay: r * 60, easing: 'ease-out' })));
      ctx.say('PAL vergine: tutti i fusibili sono di nuovo intatti. Nella realtà non si potrebbe.');
    }

    /* =================== 2 · LUT =================== */

    const LUT_TEXT = {
      chiavi: {
        label: 'Due chiavi',
        desc: 'La cassaforte si apre solo con le chiavi A e B girate insieme; C e D non contano. Leggi gli indirizzi sopra i bit e accendi quelli giusti.',
        win: 'La LUT ora è una porta AND fra A e B.',
      },
      maggioranza3: {
        label: 'Maggioranza di 3',
        desc: 'Come nella PAL: 1 con almeno due sì fra A, B e C, qualunque sia D. Se nel passo 1 hai risolto la maggioranza, prova «Copia dalla PAL».',
        win: 'Stessa funzione della PAL, scritta come tabella.',
      },
      parita4: {
        label: 'Parità di 4',
        desc: 'Uscita 1 quando gli ingressi a 1 sono dispari. Alla PAL del passo 1 servirebbero 8 righe di prodotti, e ne ha 4; alla LUT bastano i soliti 16 bit (prova i preset).',
        win: 'Con una LUT la complessità della funzione non conta: sono sempre 16 bit.',
      },
    };
    const PRESET_NAME = { and: 'AND', or: 'OR', xor: 'XOR', maggioranza: 'Maggioranza' };

    const lut = { bits: new Array(16).fill(0), inputs: [0, 0, 0, 0], target: 0, solved: new Set(), tween: null, cellSeq: new Array(16).fill(0) };
    const lu = {};
    const LW = { W: 660, H: 452, left: 104, pitch: 34, cellW: 28, cellH: 30, addrY0: 30, addrDy: 17, cellY: 100, lvY0: 168, lvDy: 64, muxH: 20, ledY: 424, ledR: 13, font: 13, capFont: 12, bitFont: 15, togW: 64, togH: 28, togX: 12, tok: 18 };
    const LC = { W: 372, H: 468, left: 50, pitch: 20, cellW: 17, cellH: 24, addrY0: 24, addrDy: 15, cellY: 86, lvY0: 150, lvDy: 66, muxH: 18, ledY: 438, ledR: 11, font: 11, capFont: 11, bitFont: 13, togW: 42, togH: 26, togX: 3, tok: 15 };

    const presetBtns = Object.keys(LP.lutPresets).map((k) => {
      const b = ui.button({ label: PRESET_NAME[k], onClick: () => { loadLut(LP.lutPresets[k]); ctx.say('Caricata la funzione ' + PRESET_NAME[k] + '.'); } });
      b.setAttribute('aria-pressed', 'false');
      b.dataset.preset = k;
      return b;
    });
    const clearBtn = ui.button({ label: 'Azzera', icon: '↺', onClick: () => { loadLut(new Array(16).fill(0)); ctx.say('Tutti i bit a 0.'); } });
    const copyBtn = ui.button({ label: 'Copia dalla PAL', icon: '⇠', title: 'Scrive nella LUT la tabella di verità della PAL del passo 1 (D non conta)', onClick: copyFromPal });
    const lutRight = ui.readout('Bit giusti', '0/16');
    const lutTools = ui.bar(
      h('div', { class: 'cp-bar-group', role: 'group', 'aria-label': 'Carica una funzione pronta' }, h('span', { class: 'lp-k', 'aria-hidden': 'true' }, 'Carica'), presetBtns),
      clearBtn, copyBtn, h('span', { class: 'grow' }), lutRight);

    const lutSeg = ui.seg({
      label: 'Sfida della LUT',
      value: LP.lutTargets[0].id,
      options: LP.lutTargets.map((t) => ({ value: t.id, label: LUT_TEXT[t.id].label })),
      onChange: (v) => {
        lut.target = LP.lutTargets.findIndex((t) => t.id === v);
        checkLut();
        play(lutDesc, [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.normal, easing: EASE });
      },
    });
    const lutLive = h('p', { class: 'lp-live' });
    const lutFn = h('p', { class: 'lp-fnline' });
    const lutDesc = h('p', { class: 'lp-desc' });
    const lutStatus = h('p', { class: 'lp-status' });
    const lutPanel = h('div', { class: 'lp-panel' },
      h('span', { class: 'step' }, 'Passo 2 · La LUT di una FPGA'),
      h('h4', null, 'Una tabella al posto delle porte'),
      h('p', { class: 'lp-intro' }, 'Qui non ci sono porte: i quattro ingressi formano un indirizzo. La LUT conserva 16 bit, uno per ogni combinazione, e un albero di multiplexer porta all\'uscita quello scelto. Clicca un bit per cambiarlo, o un ingresso per cambiare indirizzo.'),
      lutLive, lutFn,
      h('div', { class: 'lp-pick' }, h('span', { class: 'lp-k' }, 'Sfida'), lutSeg),
      lutDesc, lutStatus);

    function buildLut() {
      const P = compact() ? LC : LW;
      lu.P = P;
      const cellX = (i) => P.left + i * P.pitch + P.pitch / 2;
      const lvY = (l) => P.lvY0 + (l - 1) * P.lvDy;
      const mx = [[]];
      for (let i = 0; i < 16; i++) mx[0].push(cellX(i));
      for (let l = 1; l <= 4; l++) {
        mx[l] = [];
        for (let k = 0; k < (16 >> l); k++) mx[l].push((mx[l - 1][2 * k] + mx[l - 1][2 * k + 1]) / 2);
      }
      const tw = (l) => Math.min(P.pitch * Math.pow(2, l - 1) * 0.68, 46);
      lu.cellX = cellX;
      lu.lvY = lvY;
      lu.mx = mx;
      lu.tw = tw;

      const svg = s('svg', { viewBox: '0 0 ' + P.W + ' ' + P.H, class: 'lp-svg', role: 'group', 'aria-label': 'LUT a quattro ingressi: sedici bit di memoria e un albero di multiplexer che porta all\'uscita il bit scelto da A, B, C e D' });
      const gBack = s('g');
      const gWires = s('g');
      const gMux = s('g');
      const gTogs = s('g');
      const gTop = s('g');
      svg.append(gBack, gWires, gMux, gTogs, gTop);

      const bandTop = P.addrY0 - P.font - 5;
      lu.band = s('rect', { class: 'lp-band', x: P.left + 1, y: bandTop, width: P.pitch - 2, height: P.cellY + P.cellH + 6 - bandTop, rx: 6 });
      gBack.append(lu.band);

      lu.addr = [];
      ['D', 'C', 'B', 'A'].forEach((nm, k) => {
        const y = P.addrY0 + k * P.addrDy;
        gTop.append(s('text', { class: 'lp-addr-k', x: P.left - 10, y: y, 'text-anchor': 'end', 'font-size': P.font }, nm));
        const row = [];
        for (let i = 0; i < 16; i++) {
          const t = s('text', { class: 'lp-addr-d', x: cellX(i), y: y, 'text-anchor': 'middle', 'font-size': P.font }, String((i >> (3 - k)) & 1));
          gTop.append(t);
          row.push(t);
        }
        lu.addr.push(row);
      });
      gTop.append(s('text', { class: 'lp-addr-k', x: P.left - 10, y: P.cellY + P.cellH / 2 + P.font * 0.36, 'text-anchor': 'end', 'font-size': P.font }, 'bit'));

      // albero di multiplexer: livello 1 scelto da A, … livello 4 da D
      lu.wires = [null];
      lu.mux = [null];
      lu.sel = [];
      lu.togs = [];
      for (let l = 1; l <= 4; l++) {
        const y = lvY(l);
        const w = tw(l);
        const bw = w * 0.5;
        const selY = y + P.muxH / 2;
        const sel = s('line', { class: 'lp-sel', x1: P.togX + P.togW + 4, y1: selY, x2: P.W - 4, y2: selY });
        gBack.append(sel);
        lu.sel.push(sel);
        const wl = [];
        const ml = [];
        for (let k = 0; k < (16 >> l); k++) {
          const cx = mx[l][k];
          for (let side = 0; side < 2; side++) {
            const child = 2 * k + side;
            const fx = mx[l - 1][child];
            const fy = l === 1 ? P.cellY + P.cellH : lvY(l - 1) + P.muxH;
            const ix = cx + (side ? 1 : -1) * w * 0.3;
            const pl = s('polyline', { class: 'lp-tw', points: pts([[fx, fy], [fx, y - 9], [ix, y - 9], [ix, y + 2]]) });
            gWires.append(pl);
            wl[child] = pl;
          }
          const g = s('g', { class: 'lp-mux' });
          g.append(s('path', { d: 'M' + (cx - w / 2) + ' ' + y + 'H' + (cx + w / 2) + 'L' + (cx + bw / 2) + ' ' + (y + P.muxH) + 'H' + (cx - bw / 2) + 'Z' }));
          const sw = s('line', { class: 'lp-mux-sw', x1: cx, y1: y + P.muxH - 3, x2: cx, y2: y + 3.5 });
          sw.style.transformOrigin = cx + 'px ' + (y + P.muxH - 3) + 'px';
          g.append(sw);
          gMux.append(g);
          ml.push({ g: g, sw: sw, ang: Math.atan2(w * 0.3, P.muxH - 6.5) * 180 / Math.PI });
        }
        lu.wires.push(wl);
        lu.mux.push(ml);
        const tg = svgToggle(gTogs, { x: P.togX, y: selY - P.togH / 2, w: P.togW, h: P.togH, name: LP.LUT_INPUTS[l - 1], font: P.font + 1 });
        tg.g.setAttribute('aria-label', 'Ingresso ' + LP.LUT_INPUTS[l - 1] + ': sceglie al livello ' + l + ' dell\'albero');
        onActivate(tg.g, () => {
          const ins = lut.inputs.slice();
          ins[l - 1] = ins[l - 1] ? 0 : 1;
          setLutInputs(ins, l);
        });
        lu.togs.push(tg);
      }

      const rootX = mx[4][0];
      lu.outW = s('polyline', { class: 'lp-tw', points: pts([[rootX, lvY(4) + P.muxH], [rootX, P.ledY - P.ledR]]) });
      gWires.append(lu.outW);
      lu.path = s('polyline', { class: 'lp-path', points: '' });
      gWires.append(lu.path);
      lu.led = makeLed(gTop, rootX, P.ledY, P.ledR, P.font + 1);
      gTop.append(
        s('text', { class: 'lp-cap', x: rootX - P.ledR - 10, y: P.ledY + P.font * 0.36, 'text-anchor': 'end', 'font-size': P.font }, 'USCITA'),
        s('text', { class: 'lp-cap', x: P.W - 6, y: P.ledY + P.font * 0.36, 'text-anchor': 'end', 'font-size': P.capFont }, 'multiplexer 16 → 1'));

      lu.cells = [];
      for (let i = 0; i < 16; i++) {
        const x = cellX(i);
        const g = s('g', { class: 'lp-cell lp-focus', tabindex: '0', role: 'button' });
        const box = s('rect', { class: 'lp-cell-box', x: x - P.cellW / 2, y: P.cellY, width: P.cellW, height: P.cellH, rx: 4 });
        const txt = s('text', { class: 'lp-cell-t', x: x, y: P.cellY + P.cellH / 2 + P.bitFont * 0.36, 'text-anchor': 'middle', 'font-size': P.bitFont }, '0');
        g.append(
          s('rect', { class: 'lp-hit', x: x - P.pitch / 2, y: P.cellY - 5, width: P.pitch, height: P.cellH + 10 }),
          s('rect', { class: 'lp-ring', x: x - P.cellW / 2 - 3, y: P.cellY - 3, width: P.cellW + 6, height: P.cellH + 6, rx: 6 }),
          box, txt);
        onActivate(g, () => flipBit(i));
        g.addEventListener('keydown', (e) => {
          const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (d && lu.cells[i + d]) { e.preventDefault(); lu.cells[i + d].g.focus(); }
        });
        gTop.append(g);
        lu.cells.push({ g: g, box: box, txt: txt });
      }

      lu.tokT = s('text', { y: P.tok * 0.3, 'text-anchor': 'middle', 'font-size': P.tok * 0.74 }, '0');
      lu.token = s('g', { class: 'lp-token' }, s('rect', { x: -P.tok / 2, y: -P.tok / 2, width: P.tok, height: P.tok, rx: 4 }), lu.tokT);
      gTop.append(lu.token);
      return svg;
    }

    function lutPathPoints(idx) {
      const P = lu.P;
      const out = [[lu.cellX(idx), P.cellY + P.cellH]];
      let fx = lu.cellX(idx);
      for (let l = 1; l <= 4; l++) {
        const y = lu.lvY(l);
        const k = idx >> l;
        const side = (idx >> (l - 1)) & 1;
        const cx = lu.mx[l][k];
        const ix = cx + (side ? 1 : -1) * lu.tw(l) * 0.3;
        out.push([fx, y - 9], [ix, y - 9], [ix, y + 2], [cx, y + P.muxH]);
        fx = cx;
      }
      out.push([fx, P.ledY - P.ledR]);
      return out;
    }

    function setPath(list, full) {
      lu.path.setAttribute('points', pts(list));
      const len = lengthOf(list);
      lu.path.style.strokeDasharray = len.toFixed(1) + ' ' + len.toFixed(1);
      lu.path.style.strokeDashoffset = full ? '0' : len.toFixed(1);
      return len;
    }

    // il bit scelto scende lungo il percorso fino all'uscita
    function travel(list, v, wait) {
      if (lut.tween) { lut.tween.cancel(); lut.tween = null; }
      lu.token.classList.remove('is-go');
      if (reduced()) {
        setPath(list, true);
        setLed(lu.led, v, 0);
        return;
      }
      const len = setPath(list, false);
      lu.tokT.textContent = String(v);
      lu.token.classList.toggle('is-one', !!v);
      lu.token.setAttribute('transform', 'translate(' + list[0][0] + ' ' + list[0][1] + ')');
      lut.tween = CP.tween({
        from: 0, to: 1, duration: 780, delay: wait || 0, ease: 'inOut',
        onUpdate: (p) => {
          if (!lu.token.classList.contains('is-go')) lu.token.classList.add('is-go');
          lu.path.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
          const q = pointAt(list, len * p);
          lu.token.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
        },
        onDone: () => {
          lut.tween = null;
          lu.token.classList.remove('is-go');
          setLed(lu.led, v, 0);
        },
      });
    }

    function renderLut(o) {
      const opt = o || {};
      const P = lu.P;
      const idx = LP.lutIndex(lut.inputs);
      const lv = LP.muxLevels(lut.bits, lut.inputs);
      lu.band.style.transform = 'translateX(' + (idx * P.pitch) + 'px)';
      lu.addr.forEach((row) => row.forEach((t, i) => t.classList.toggle('is-cur', i === idx)));
      lu.cells.forEach((c, i) => {
        const v = lut.bits[i] ? 1 : 0;
        const d = opt.cellDelays ? opt.cellDelays[i] : 0;
        const seq = ++lut.cellSeq[i];
        c.g.classList.toggle('is-sel', i === idx);
        c.g.setAttribute('aria-label', 'Bit ' + i + ', indirizzo D C B A ' + CP.fmt.bin(i, 4).split('').join(' ') + ': vale ' + v + '. Premi per cambiarlo.');
        later(() => {
          if (seq !== lut.cellSeq[i]) return;
          c.g.classList.toggle('is-one', !!v);
          c.txt.textContent = String(v);
        }, d);
        if (d != null && opt.cellDelays && opt.cellDelays[i] != null && opt.flip && opt.flip[i]) {
          play(c.box, [{ transform: 'scaleY(.15)' }, { transform: 'scaleY(1)' }], { duration: 260, delay: d, easing: POP });
        }
      });
      for (let l = 1; l <= 4; l++) {
        const sel = lut.inputs[l - 1] ? 1 : 0;
        lu.sel[l - 1].classList.toggle('is-on', !!sel);
        setToggle(lu.togs[l - 1], sel);
        lu.wires[l].forEach((w, child) => w.classList.toggle('is-one', !!lv[l - 1][child]));
        lu.mux[l].forEach((m, k) => {
          delay(m.sw, opt.level === l ? k * 50 : 0);
          m.sw.style.transform = 'rotate(' + (sel ? m.ang : -m.ang).toFixed(2) + 'deg)';
          m.g.classList.toggle('is-path', k === (idx >> l));
        });
      }
      lu.outW.classList.toggle('is-one', !!lv[4][0]);
      const list = lutPathPoints(idx);
      if (opt.travel) travel(list, lv[4][0], opt.travelDelay);
      else {
        if (lut.tween) { lut.tween.cancel(); lut.tween = null; }
        lu.token.classList.remove('is-go');
        setPath(list, true);
        setLed(lu.led, lv[4][0], 0);
      }
      renderLutPanel();
    }

    function flipBit(i) {
      lut.bits[i] = lut.bits[i] ? 0 : 1;
      play(lu.cells[i].box, [{ transform: 'scaleY(.15)' }, { transform: 'scaleY(1)' }], { duration: 260, easing: POP });
      renderLut({ travel: i === LP.lutIndex(lut.inputs) });
      checkLut();
    }

    function setLutInputs(ins, level) {
      lut.inputs = ins.map((v) => (v ? 1 : 0));
      renderLut({ travel: true, level: level, travelDelay: level ? (16 >> level) * 25 : 0 });
    }

    function loadLut(bits) {
      const delays = {};
      const flip = {};
      let k = 0;
      for (let i = 0; i < 16; i++) {
        if ((lut.bits[i] ? 1 : 0) !== (bits[i] ? 1 : 0)) { delays[i] = k * 50; flip[i] = true; k++; } else delays[i] = 0;
      }
      lut.bits = bits.map((b) => (b ? 1 : 0));
      const idx = LP.lutIndex(lut.inputs);
      renderLut({ travel: true, cellDelays: delays, flip: flip, travelDelay: (flip[idx] ? delays[idx] : 0) + 120 });
      checkLut();
    }

    function copyFromPal() {
      loadLut(LP.palToLut(pal.fuses));
      ctx.say('Copiata nella LUT la funzione della PAL: ' + exprSpoken(pal.fuses) + '. D non conta.');
    }

    function renderLutPanel() {
      const idx = LP.lutIndex(lut.inputs);
      const v = lut.bits[idx] ? 1 : 0;
      lutLive.textContent = '';
      lutLive.append('Ingressi D C B A = ', h('b', null, CP.fmt.bin(idx, 4)), ': è l\'indirizzo ', h('b', null, String(idx)),
        '. Esce il bit ' + idx + ', che vale ', h('b', { class: v ? 'is-one' : null }, String(v)), '.');
      const name = LP.lutPresetName(lut.bits);
      presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
      const any = lut.bits.some((b) => b);
      lutFn.textContent = 'Nella LUT: ' + (name ? 'la funzione ' + PRESET_NAME[name] : any ? 'una funzione scritta da te' : 'niente, tutti i bit a 0') +
        '. Con 16 bit si possono scrivere 65.536 funzioni diverse.';
      const t = LP.lutTargets[lut.target];
      const T = LUT_TEXT[t.id];
      const r = LP.checkLut(lut.bits, t);
      lutDesc.textContent = T.desc;
      lutStatus.classList.toggle('is-ok', r.ok);
      lutStatus.textContent = r.ok ? '✓ LUT configurata: tutti i 16 bit sono giusti. ' + T.win : 'Bit giusti: ' + r.right + ' su 16.';
      lutRight.set(r.right + '/16');
    }

    function checkLut() {
      const t = LP.lutTargets[lut.target];
      const r = LP.checkLut(lut.bits, t);
      renderLutPanel();
      if (!r.ok || lut.solved.has(t.id)) return;
      lut.solved.add(t.id);
      const T = LUT_TEXT[t.id];
      const b = lutSeg.querySelectorAll('button')[lut.target];
      if (b) b.textContent = '✓ ' + T.label;
      lu.cells.forEach((c, i) => play(c.box, [{ stroke: '#5cc8ff', strokeWidth: 3 }, { stroke: '#29403a', strokeWidth: 1 }], { duration: CP.dur.slow, delay: 300 + i * 50, easing: 'ease-out' }));
      play(lutStatus, [{ transform: 'translateY(6px)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: CP.dur.normal, easing: EASE });
      ctx.say('LUT configurata: sfida ' + T.label + ' risolta. ' + T.win);
      updateGoal();
    }

    /* =================== 3 · Bitstream =================== */

    const DESIGN_TEXT = {
      sommatore: {
        label: 'Sommatore',
        title: 'Ora è un sommatore',
        inputs: 'A, B e C sono i tre bit da sommare (C è il riporto che arriva dalla cifra precedente).',
        text: 'Il blocco 1 calcola la somma, A XOR B XOR C, e la manda a O1. Il blocco 4 calcola il riporto, cioè la maggioranza di A, B e C, e lo manda a O2. Prova A = 1 e B = 1: somma 0, riporto 1.',
        out: ['somma', 'riporto'],
        say: 'un sommatore completo a 1 bit',
      },
      allarme: {
        label: 'Allarme',
        title: 'Ora è un allarme',
        inputs: 'A è la porta aperta, B il sistema armato, C il pulsante di panico.',
        text: 'Stessi blocchi, collegamenti diversi. Il blocco 2 fa A AND B, il blocco 3 aggiunge C con un OR: O1 è la sirena. Il blocco 5 fa NOT B: O2 è la spia del sistema disinserito.',
        out: ['sirena', 'spia'],
        say: 'un allarme',
      },
    };
    const FN_NAME = { xor3: 'XOR', maj3: 'MAG', and2: 'AND', or2: 'OR', not1: 'NOT', custom: '?' };

    const bit = { design: 'sommatore', phase: 'off', shown: null, target: LP.buildBitstream('sommatore'), named: new Array(6).fill(false), inputs: { A: 0, B: 0, C: 0 }, stop: null, seq: 0 };
    const bu = { spans: [] };
    // Geometria della FPGA didattica. Ogni collegamento è una spezzata: sorgente → corsia verticale → destinazione.
    const BW = {
      W: 660, H: 400, chip: { x: 190, y: 14, w: 440, h: 372 }, title: [204, 34],
      cw: 92, ch: 96, cx0: 252, cpx: 128, cy0: 62, cpy: 176, pinIn: [26, 48, 70], pinOut: 60,
      tA: 186, tB: 215, tC: 244, h0: 36, h2: 362,
      v0: [208, 222, 236], v1o: 352, v1a: 362, v1b: 372, v2o: 482, v2c: 492, v2d: 500, v3: 614,
      ledX: 646, ledR: 8, eprom: { x: 16, y: 40, sc: 1 }, epLabel: [79, 134], epAnchor: 'middle',
      din: [[142, 74], [190, 74]], dinLabel: [166, 67, 'middle'], stat: [30, 300], statDy: 26,
      cellW: 14, cellH: 11, cellGap: 3, cellY: 28, fnY: 80, fnFont: 16, font: 13, pipR: 3.6, tokR: 4.6, arc: 46,
    };
    const BC = {
      W: 380, H: 480, chip: { x: 34, y: 108, w: 318, h: 352 }, title: [42, 124],
      cw: 60, ch: 84, cx0: 82, cpx: 92, cy0: 152, cpy: 160, pinIn: [20, 40, 60], pinOut: 52,
      tA: 252, tB: 274, tC: 296, h0: 130, h2: 428,
      v0: [50, 61, 72], v1o: 150, v1a: 158, v1b: 166, v2o: 242, v2c: 250, v2d: 258, v3: 340,
      ledX: 366, ledR: 8, eprom: { x: 12, y: 18, sc: 0.85 }, epLabel: [128, 44], epAnchor: 'start',
      din: [[119, 46], [200, 46], [200, 108]], dinLabel: [207, 91, 'start'], stat: [262, 40], statDy: 24,
      cellW: 10, cellH: 8, cellGap: 2, cellY: 22, fnY: 68, fnFont: 14, font: 12, pipR: 3, tokR: 4, arc: 40,
    };

    const powerBtn = ui.button({ label: 'Accendi', icon: '⏻', primary: true, onClick: () => { if (bit.phase === 'off') powerOn(); else powerOff(true); } });
    powerBtn.setAttribute('aria-pressed', 'false');
    const designSeg = ui.seg({
      label: 'Bitstream da caricare',
      value: 'sommatore',
      options: [{ value: 'sommatore', label: 'Sommatore' }, { value: 'allarme', label: 'Allarme' }],
      onChange: switchDesign,
    });
    const inToggles = {};
    ['A', 'B', 'C'].forEach((n) => {
      inToggles[n] = ui.toggle({ label: n, checked: false, onChange: (v) => { bit.inputs[n] = v ? 1 : 0; renderBit(); } });
    });
    const bitTools = ui.bar(powerBtn,
      h('div', { class: 'cp-bar-group' }, h('span', { class: 'lp-k', 'aria-hidden': 'true' }, 'Bitstream'), designSeg),
      h('span', { class: 'grow' }),
      h('div', { class: 'cp-bar-group lp-ins', role: 'group', 'aria-label': 'Ingressi della FPGA' }, h('span', { class: 'lp-k', 'aria-hidden': 'true' }, 'Ingressi'), inToggles.A, inToggles.B, inToggles.C));

    const bitTitle = h('h4', null);
    const bitText = h('p', null);
    const bitIO = h('p', { class: 'lp-status lp-io' });
    const bitsBox = h('div', { class: 'lp-bits', 'aria-hidden': 'true' });
    const bitsSr = h('p', { class: 'cp-sr' });
    const bitPanel = h('div', { class: 'lp-panel' },
      h('span', { class: 'step' }, 'Passo 3 · Il bitstream'),
      bitTitle, bitText, bitIO,
      h('div', { class: 'lp-pick' }, h('span', { class: 'lp-k' }, 'Il bitstream nella EPROM'), bitsBox, bitsSr),
      h('p', { class: 'lp-note' }, 'Modello semplificato: 6 blocchi con LUT a 3 ingressi e 16 collegamenti, 64 bit in tutto. La XC2064 ne usava 12.038.'));

    function fillBits() {
      bit.target = LP.buildBitstream(bit.design);
      bitsBox.textContent = '';
      bu.spans = [];
      const group = (label, from, to) => {
        const g = h('span', { class: 'grp' }, h('span', { class: 'k' }, label));
        for (let i = from; i < to; i++) {
          const sp = h('i', { class: bit.target[i] ? 'one' : null }, String(bit.target[i]));
          g.append(sp);
          bu.spans.push(sp);
        }
        bitsBox.append(g, ' ');
      };
      for (let k = 0; k < 6; k++) group('CLB ' + (k + 1), k * 8, k * 8 + 8);
      group('collegamenti', 48, 64);
      bitsSr.textContent = 'Il bitstream «' + DESIGN_TEXT[bit.design].label + '»: 64 bit, 8 per ognuno dei 6 blocchi logici e 16 per i collegamenti.';
      if (bit.shown) bit.shown.forEach((v, i) => { if (v != null && bu.spans[i]) bu.spans[i].classList.add('is-in'); });
    }

    function linkPoints(G, i) {
      const clb = (k) => [G.cx0 + (k % 3) * G.cpx, G.cy0 + Math.floor(k / 3) * G.cpy];
      const pin = (k, n) => { const c = clb(k); return [c[0], c[1] + G.pinIn[n]]; };
      const out = (k) => { const c = clb(k); return [c[0] + G.cw, c[1] + G.pinOut]; };
      const pad = { A: [G.chip.x, G.tA], B: [G.chip.x, G.tB], C: [G.chip.x, G.tC] };
      const R = G.chip.x + G.chip.w;
      const via = (a, lane, b) => [a, [lane, a[1]], [lane, b[1]], b];
      switch (i) {
        case 0: return via(pad.A, G.v0[0], pin(0, 0));
        case 1: return via(pad.B, G.v0[1], pin(0, 1));
        case 2: return via(pad.C, G.v0[2], pin(0, 2));
        case 3: return via(pad.A, G.v0[0], pin(3, 0));
        case 4: return via(pad.B, G.v0[1], pin(3, 1));
        case 5: return via(pad.C, G.v0[2], pin(3, 2));
        case 6: return via(out(0), G.v1o, [R, G.h0]);
        case 7: return via(out(3), G.v1o, [R, G.h2]);
        case 8: return via(pad.A, G.v1a, pin(1, 0));
        case 9: return via(pad.B, G.v1b, pin(1, 1));
        case 10: return via(pad.C, G.v2c, pin(2, 1));
        case 11: return via(out(1), G.v2o, pin(2, 0));
        case 12: return via(out(2), G.v3, [R, G.h0]);
        case 13: return via(pad.B, G.v1b, pin(4, 0));
        case 14: return via(out(4), G.v2o, [R, G.h2]);
        default: return via(pad.C, G.v2d, pin(5, 0));
      }
    }

    function statLed(parent, x, y, label, cls) {
      const g = s('g', { class: 'lp-stat' + (cls ? ' ' + cls : '') });
      g.append(s('circle', { cx: x, cy: y, r: 5.5 }), s('text', { class: 'lp-cap', x: x + 12, y: y + 4.4, 'font-size': bu.G.font - 1 }, label));
      parent.append(g);
      return g;
    }

    function buildBit() {
      const G = compact() ? BC : BW;
      bu.G = G;
      const svg = s('svg', { viewBox: '0 0 ' + G.W + ' ' + G.H, class: 'lp-svg', role: 'img', 'aria-label': 'FPGA didattica: sei blocchi logici in due righe, collegamenti programmabili, tre ingressi A, B e C, due uscite O1 e O2 e una EPROM che contiene il bitstream' });
      const gBack = s('g');
      const gRoute = s('g');
      const gBlk = s('g');
      const gTop = s('g');
      svg.append(gBack, gRoute, gBlk, gTop);

      gBack.append(
        s('rect', { class: 'lp-chip', x: G.chip.x, y: G.chip.y, width: G.chip.w, height: G.chip.h, rx: 12 }),
        s('text', { class: 'lp-cap', x: G.title[0], y: G.title[1], 'font-size': G.font - 1 }, 'FPGA didattica'));
      const ep = CP.art.dip({ pins: 24, body: 'ceramic', window: true, group: true, title: 'EPROM' });
      ep.setAttribute('transform', 'translate(' + G.eprom.x + ' ' + G.eprom.y + ') scale(' + G.eprom.sc + ')');
      gBack.append(ep);
      gBack.append(
        s('text', { class: 'lp-ep', x: G.epLabel[0], y: G.epLabel[1], 'font-size': G.font, 'text-anchor': G.epAnchor }, 'EPROM'),
        s('text', { class: 'lp-cap', x: G.epLabel[0], y: G.epLabel[1] + G.font + 3, 'font-size': G.font - 1, 'text-anchor': G.epAnchor }, 'con il bitstream'));
      bu.din = wire(gRoute, G.din, 'lp-din');
      const port = G.din[G.din.length - 1];
      gTop.append(s('rect', { class: 'lp-port', x: port[0] - 4, y: port[1] - 4, width: 8, height: 8, rx: 1.5 }));
      gTop.append(s('text', { class: 'lp-cap', x: G.dinLabel[0], y: G.dinLabel[1], 'text-anchor': G.dinLabel[2], 'font-size': G.font - 1 }, 'DIN'));
      bu.on = statLed(gTop, G.stat[0], G.stat[1], 'ON');
      bu.done = statLed(gTop, G.stat[0], G.stat[1] + G.statDy, 'DONE', 'is-ctrl');

      bu.routes = [];
      bu.pips = [];
      LP.FABRIC.links.forEach((lk, i) => {
        const list = linkPoints(G, i);
        bu.routes.push(wire(gRoute, list, 'lp-route'));
        bu.pips.push({ x: list[2][0], y: list[2][1] });
      });
      bu.pips.forEach((p) => {
        p.el = s('circle', { class: 'lp-pip', cx: p.x, cy: p.y, r: G.pipR });
        gRoute.append(p.el);
      });

      bu.clb = [];
      for (let k = 0; k < 6; k++) {
        const x = G.cx0 + (k % 3) * G.cpx;
        const y = G.cy0 + Math.floor(k / 3) * G.cpy;
        const g = s('g', { class: 'lp-clb' });
        g.append(
          s('rect', { class: 'lp-clb-box', x: x, y: y, width: G.cw, height: G.ch, rx: 8 }),
          s('text', { class: 'lp-clb-name', x: x + 7, y: y + G.font + 2, 'font-size': G.font - 1 }, (compact() ? '' : 'CLB ') + (k + 1)));
        const cells = [];
        const gridW = 4 * G.cellW + 3 * G.cellGap;
        const x0 = x + (G.cw - gridW) / 2;
        for (let b = 0; b < 8; b++) {
          const cx = x0 + (b & 3) * (G.cellW + G.cellGap);
          const cy = y + G.cellY + (b >> 2) * (G.cellH + G.cellGap);
          const r = s('rect', { class: 'lp-mc', x: cx, y: cy, width: G.cellW, height: G.cellH, rx: 2 });
          g.append(r);
          cells.push({ r: r, x: cx + G.cellW / 2, y: cy + G.cellH / 2 });
        }
        const fn = s('text', { class: 'lp-fn', x: x + G.cw / 2, y: y + G.fnY, 'text-anchor': 'middle', 'font-size': G.fnFont }, '');
        g.append(fn);
        const pins = G.pinIn.map((py) => {
          const p = s('rect', { class: 'lp-pin', x: x - 3, y: y + py - 3, width: 6, height: 6, rx: 1 });
          g.append(p);
          return p;
        });
        const pout = s('rect', { class: 'lp-pin', x: x + G.cw - 3, y: y + G.pinOut - 3, width: 6, height: 6, rx: 1 });
        g.append(pout);
        gBlk.append(g);
        bu.clb.push({ g: g, cells: cells, fn: fn, pins: pins, pout: pout });
      }

      bu.padIn = {};
      [['A', G.tA], ['B', G.tB], ['C', G.tC]].forEach((p) => {
        const g = s('g', { class: 'lp-pad' });
        const t = s('text', { class: 'lp-pad-t', x: G.chip.x - 10, y: p[1] + G.font * 0.36, 'text-anchor': 'end', 'font-size': G.font }, p[0]);
        g.append(s('rect', { x: G.chip.x - 5, y: p[1] - 5, width: 10, height: 10, rx: 2 }), t);
        gTop.append(g);
        bu.padIn[p[0]] = { g: g, t: t };
      });
      bu.padOut = {};
      [['O1', G.h0, -1], ['O2', G.h2, 1]].forEach((p) => {
        const R = G.chip.x + G.chip.w;
        const g = s('g', { class: 'lp-pad lp-pad-out' });
        g.append(s('rect', { x: R - 5, y: p[1] - 5, width: 10, height: 10, rx: 2 }), s('line', { class: 'lp-pad-lead', x1: R + 5, y1: p[1], x2: G.ledX - G.ledR, y2: p[1] }));
        const led = makeLed(g, G.ledX, p[1], G.ledR, G.font - 1);
        g.append(s('text', { class: 'lp-cap', x: G.ledX, y: p[2] < 0 ? p[1] - G.ledR - 6 : p[1] + G.ledR + G.font + 2, 'text-anchor': 'middle', 'font-size': G.font - 1 }, p[0]));
        gTop.append(g);
        bu.padOut[p[0]] = { g: g, led: led };
      });

      bu.pool = [];
      bu.used = [];
      for (let i = 0; i < 12; i++) {
        const g = s('g', { class: 'lp-tok' }, s('circle', { r: G.tokR }));
        gTop.append(g);
        bu.pool.push(g);
        bu.used.push(false);
      }
      return svg;
    }

    function targetOf(i) {
      const t = LP.bitTarget(i);
      if (t.kind === 'lut') {
        const c = bu.clb[t.clb].cells[t.bit];
        return [c.x, c.y];
      }
      const p = bu.pips[t.link];
      return [p.x, p.y];
    }

    function renderBit(o) {
      const opt = o || {};
      const on = bit.phase !== 'off';
      const done = bit.phase === 'done';
      const cfg = LP.parseBitstream(bit.shown);
      const sim = done ? LP.simulate(cfg, bit.inputs) : null;
      const sep = compact() ? '=' : ' = ';
      ['A', 'B', 'C'].forEach((n) => {
        const v = bit.inputs[n] ? 1 : 0;
        bu.padIn[n].g.classList.toggle('is-on', !!v);
        bu.padIn[n].t.textContent = n + sep + v;
      });
      bu.clb.forEach((c, k) => {
        c.cells.forEach((cell, b) => {
          const v = bit.shown ? bit.shown[k * 8 + b] : null;
          cell.r.classList.toggle('is-set', v != null);
          cell.r.classList.toggle('is-one', v === 1);
        });
        const nm = bit.named[k] && bit.shown ? LP.lut3Name(cfg.luts[k]) : null;
        c.fn.textContent = nm ? FN_NAME[nm] : '';
        c.g.classList.toggle('is-named', !!nm);
        c.g.classList.toggle('is-used', !!(done && sim.used[k]));
        c.pout.classList.toggle('is-on', !!(done && sim.used[k] && sim.clbOut[k]));
        c.pins.forEach((p) => p.classList.remove('is-on'));
      });
      // ordine della cascata: prima i fili dagli ingressi, poi quelli fra blocchi, infine le uscite
      let order = 0;
      const rank = (lk) => (lk.from.length === 1 ? 0 : (lk.to.charAt(0) === 'O' ? 2 : 1));
      const active = [];
      LP.FABRIC.links.forEach((lk, i) => { if (done && cfg.links[i]) active.push(i); });
      active.sort((a, b) => rank(LP.FABRIC.links[a]) - rank(LP.FABRIC.links[b]) || a - b);
      const dmap = {};
      active.forEach((i) => { dmap[i] = opt.cascade ? (order++) * 70 : 0; });
      LP.FABRIC.links.forEach((lk, i) => {
        const w = bu.routes[i];
        const c = done && cfg.links[i];
        delay(w, dmap[i] || 0);
        w.classList.toggle('is-cfg', !!c);
        w.classList.toggle('is-on', !!(c && sim.links[i]));
        bu.pips[i].el.classList.toggle('is-cfg', !!(bit.shown && bit.shown[48 + i] === 1));
        if (c) {
          const m = /^clb(\d+)\.(\d)$/.exec(lk.to);
          if (m && sim.links[i]) bu.clb[+m[1]].pins[+m[2]].classList.add('is-on');
        }
      });
        ['O1', 'O2'].forEach((n) => {
        const v = sim ? sim.outputs[n] : null;
        const o2 = bu.padOut[n];
        o2.g.classList.toggle('is-on', v === 1);
        setLed(o2.led, v === 1, opt.cascade ? order * 70 : 0, v == null ? '–' : String(v));
        o2.g.classList.toggle('is-driven', v != null);
      });
      bu.on.classList.toggle('is-on', on);
      bu.done.classList.toggle('is-on', done);
      bu.din.classList.toggle('is-on', bit.phase === 'loading');
      renderBitIO(sim);
    }

    function renderBitIO(sim) {
      const T = DESIGN_TEXT[bit.design];
      bitIO.classList.toggle('is-ok', !!sim);
      if (!sim) {
        bitIO.textContent = bit.phase === 'loading' ? 'Uscite O1 e O2 ancora scollegate: la configurazione non è finita.' : 'Uscite O1 e O2 scollegate: senza configurazione il chip non fa niente.';
        return;
      }
      bitIO.textContent = '';
      const eq = (k, v) => k + '\u00a0=\u00a0' + v;
      bitIO.append('O1 (' + T.out[0] + ')\u00a0=\u00a0', h('b', { class: sim.outputs.O1 ? 'is-one' : null }, String(sim.outputs.O1)),
        ' · O2 (' + T.out[1] + ')\u00a0=\u00a0', h('b', { class: sim.outputs.O2 ? 'is-one' : null }, String(sim.outputs.O2)),
        ' con ' + eq('A', bit.inputs.A) + ', ' + eq('B', bit.inputs.B) + ', ' + eq('C', bit.inputs.C) + '.');
    }

    function renderBitPanel() {
      const T = DESIGN_TEXT[bit.design];
      if (bit.phase === 'off') {
        bitTitle.textContent = 'Spenta';
        bitText.textContent = 'La configurazione di questa FPGA sta in celle SRAM: senza corrente sono vuote e il chip non fa niente. Scegli un bitstream e premi Accendi.';
      } else if (bit.phase === 'loading') {
        bitTitle.textContent = 'Configurazione in corso';
        bitText.textContent = 'Il bitstream esce dalla EPROM un bit alla volta, sul filo DIN: prima 8 bit per la LUT di ogni blocco, poi 16 bit per gli incroci dei collegamenti.';
      } else {
        bitTitle.textContent = T.title;
        bitText.textContent = 'DONE acceso: i 64 bit sono al loro posto. ' + T.inputs + ' ' + T.text;
      }
    }

    function setPower(on) {
      setBtn(powerBtn, '⏻', on ? 'Spegni' : 'Accendi');
      powerBtn.setAttribute('aria-pressed', String(on));
    }

    function stopLoad() {
      if (bit.stop) { bit.stop(); bit.stop = null; }
    }

    function markSpan(i) {
      if (bu.cur != null && bu.spans[bu.cur]) bu.spans[bu.cur].classList.remove('is-cur');
      if (bu.spans[i]) { bu.spans[i].classList.add('is-in', 'is-cur'); bu.cur = i; }
    }

    function land(i, quiet) {
      const v = bit.target[i];
      bit.shown[i] = v;
      const t = LP.bitTarget(i);
      if (t.kind === 'lut') {
        const c = bu.clb[t.clb];
        const cell = c.cells[t.bit].r;
        cell.classList.add('is-set');
        cell.classList.toggle('is-one', v === 1);
        if (!quiet) play(cell, [{ opacity: 0.2 }, { opacity: 1 }], { duration: CP.dur.fast, easing: 'ease-out' });
        if (t.bit === 0) c.g.classList.add('is-writing');
        if (t.bit === 7) {
          c.g.classList.remove('is-writing');
          bit.named[t.clb] = true;
          const nm = LP.lut3Name(bit.target.slice(t.clb * 8, t.clb * 8 + 8));
          if (nm) {
            c.fn.textContent = FN_NAME[nm];
            c.g.classList.add('is-named');
            if (!quiet) play(c.fn, [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: CP.dur.normal, easing: POP });
          }
        }
      } else {
        const p = bu.pips[t.link];
        p.el.classList.toggle('is-cfg', v === 1);
        if (!quiet && v === 1) play(p.el, [{ transform: 'scale(2.4)' }, { transform: 'scale(1)' }], { duration: CP.dur.normal, easing: POP });
      }
      if (!quiet) markSpan(i);
      else if (bu.spans[i]) bu.spans[i].classList.add('is-in');
    }

    function powerOn() {
      if (bit.phase !== 'off') return;
      const seq = ++bit.seq;
      bit.phase = 'loading';
      bit.target = LP.buildBitstream(bit.design);
      bit.shown = new Array(bit.target.length).fill(null);
      bit.named = new Array(6).fill(false);
      setPower(true);
      renderBit();
      renderBitPanel();
      ctx.say('FPGA accesa: arriva il bitstream «' + DESIGN_TEXT[bit.design].label + '», un bit alla volta.');
      if (reduced()) {
        for (let i = 0; i < bit.target.length; i++) land(i, true);
        finishLoad();
        return;
      }
      const ST = 50;
      const SLIDE = 200;
      const FLY = 440;
      const LIFE = SLIDE + FLY;
      const N = bit.target.length;
      const POOL = bu.pool.length;
      const din = bu.G.din;
      const dinLen = lengthOf(din);
      const port = din[din.length - 1];
      let t = 0;
      let next = 0;
      bit.stop = ctx.tick((dt) => {
        if (seq !== bit.seq) return;
        t += dt;
        while (next < N && t >= next * ST + LIFE) { land(next, false); next++; }
        for (let k = 0; k < POOL; k++) bu.used[k] = false;
        const last = Math.min(N - 1, Math.floor(t / ST));
        for (let i = next; i <= last; i++) {
          const age = t - i * ST;
          const slot = i % POOL;
          const g = bu.pool[slot];
          let q;
          if (age < SLIDE) q = pointAt(din, dinLen * (age / SLIDE));
          else {
            const p = CP.ease.smooth(Math.min(1, (age - SLIDE) / FLY));
            const tg = targetOf(i);
            const c = [(port[0] + tg[0]) / 2, Math.min(port[1], tg[1]) - bu.G.arc];
            q = bezier(port, c, tg, p);
          }
          bu.used[slot] = true;
          g.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
          g.classList.toggle('is-one', bit.target[i] === 1);
        }
        for (let k = 0; k < POOL; k++) bu.pool[k].classList.toggle('is-go', bu.used[k]);
        if (next >= N) {
          stopLoad();
          finishLoad();
        }
      });
    }

    function finishLoad() {
      bit.phase = 'done';
      bit.named = bit.named.map(() => true);
      bu.pool.forEach((g) => g.classList.remove('is-go'));
      bu.clb.forEach((c) => c.g.classList.remove('is-writing'));
      if (bu.cur != null && bu.spans[bu.cur]) bu.spans[bu.cur].classList.remove('is-cur');
      bu.cur = null;
      renderBit({ cascade: true });
      renderBitPanel();
      play(bu.done.querySelector('circle'), [{ transform: 'scale(1.8)' }, { transform: 'scale(1)' }], { duration: CP.dur.normal, easing: POP });
      ctx.say('Configurazione completata: la FPGA ora è ' + DESIGN_TEXT[bit.design].say + '.');
    }

    function powerOff(announce) {
      ++bit.seq;
      stopLoad();
      bit.phase = 'off';
      bit.shown = null;
      bit.named = new Array(6).fill(false);
      bu.pool.forEach((g) => g.classList.remove('is-go'));
      bu.clb.forEach((c) => c.g.classList.remove('is-writing', 'is-named'));
      bu.spans.forEach((sp) => sp.classList.remove('is-in', 'is-cur'));
      bu.cur = null;
      setPower(false);
      renderBit();
      renderBitPanel();
      if (announce) ctx.say('FPGA spenta: le celle SRAM hanno perso la configurazione.');
    }

    function switchDesign(v) {
      const wasOn = bit.phase !== 'off';
      if (wasOn) powerOff(false);
      bit.design = v;
      fillBits();
      renderBitPanel();
      renderBit();
      if (!wasOn) return;
      ctx.say('Nuovo bitstream: la FPGA si spegne e si riaccende.');
      const seq = bit.seq;
      if (reduced()) { powerOn(); return; }
      window.setTimeout(() => { if (seq === bit.seq && bit.phase === 'off') powerOn(); }, 520);
    }

    /* =================== montaggio =================== */

    const toolbars = { pal: palTools, lut: lutTools, bit: bitTools };
    const panels = { pal: palPanel, lut: lutPanel, bit: bitPanel };
    const panes = { pal: h('div', { class: 'lp-pane' }), lut: h('div', { class: 'lp-pane' }), bit: h('div', { class: 'lp-pane lp-pane-bit' }) };
    const legends = {
      pal: ui.legend([['livello 1', 'var(--sig-on)'], ['livello 0', 'var(--sig-off)'], ['fusibile intatto: collega', '#cdb67a'], ['fusibile bruciato: scollega', '#6b5246']]),
      lut: ui.legend([['bit a 1, livello 1', 'var(--sig-on)'], ['ingressi = indirizzo', 'var(--sig-addr)'], ['bit letto', 'var(--sig-data)']]),
      bit: ui.legend([['bit di configurazione', 'var(--sig-ctrl)'], ['livello 1', 'var(--sig-on)'], ['livello 0', 'var(--sig-off)'], ['non configurato', 'var(--sig-idle)']]),
    };
    MODES.forEach((m) => {
      toolsWrap.append(toolbars[m]);
      stage.append(panes[m]);
      explain.append(panels[m]);
      legendWrap.append(legends[m]);
    });
    mount.append(topBar, toolsWrap, h('div', { class: 'cp-lab-grid' }, stage, explain), legendWrap, goal);

    function setMode(m) {
      state.mode = m;
      MODES.forEach((k) => {
        const on = k === m;
        toolbars[k].hidden = !on;
        panes[k].hidden = !on;
        panels[k].hidden = !on;
        legends[k].hidden = !on;
      });
      if (m !== 'pal') stopSweep(false);
      if (tabs.value !== m) tabs.set(m);
      play(panes[m], [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: CP.dur.normal, easing: EASE });
      play(panels[m], [{ opacity: 0 }, { opacity: 1 }], { duration: CP.dur.normal, easing: EASE });
    }

    function buildAll() {
      stopSweep(false);
      if (bit.phase === 'loading') {
        // cambio di impaginazione durante il caricamento: si completa subito
        stopLoad();
        ++bit.seq;
        bit.shown = bit.target.slice();
        bit.named = new Array(6).fill(true);
        bit.phase = 'done';
      }
      panes.pal.textContent = '';
      panes.pal.append(buildPal());
      renderPal();
      panes.lut.textContent = '';
      panes.lut.append(buildLut());
      renderLut();
      panes.bit.textContent = '';
      panes.bit.append(buildBit());
      bu.spans.forEach((sp) => sp.classList.remove('is-cur'));
      bu.cur = null;
      renderBit();
      renderBitPanel();
    }

    function updateGoal() {
      const n = pal.solved.size;
      const l = lut.solved.size ? 1 : 0;
      solvedRead.set(n + '/4');
      lutDoneRead.set(l + '/1');
      if (!state.goalDone && n >= 2 && l) {
        state.goalDone = true;
        ctx.done();
        ctx.say('Obiettivo del laboratorio raggiunto: hai programmato due PAL e una LUT.');
        play(goal, [{ backgroundColor: 'rgba(62, 224, 143, .18)' }, { backgroundColor: 'rgba(62, 224, 143, 0)' }], { duration: CP.dur.crawl, easing: 'ease-out' });
        state.justDone = true;
      }
      goalText.textContent = '';
      if (state.goalDone) {
        goalText.append(h('strong', null, state.justDone ? 'Obiettivo raggiunto. ' : 'Obiettivo già raggiunto. '),
          'Hai programmato PAL e LUT: nel passo 3 guarda lo stesso chip diventare due circuiti diversi (sfide PAL ' + Math.min(n, 4) + '/4, LUT ' + l + '/1).');
      } else {
        goalText.append(h('strong', null, 'Obiettivo: '), 'risolvi almeno due sfide della PAL (' + Math.min(n, 2) + '/2) e una sfida della LUT (' + l + '/1).');
      }
    }

    fillBits();
    buildAll();
    renderPalPanel(true);
    setMode('pal');
    updateGoal();

    if (mq) {
      const onChange = () => buildAll();
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  });
})();
