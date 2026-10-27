/*
 * Laboratorio "Il banco delle lampadine" (capitolo 5).
 * Una pila da 6 V e tre lampadine uguali da 12 Ω, collegate in serie o in parallelo:
 * quando cambi collegamento i fili si staccano e si ricollegano. Ogni lampadina si svita
 * toccandola. Gli elettroni corrono con una velocità proporzionale alla corrente del
 * tratto (esagerata, non in scala) e ai nodi si dividono tra i rami.
 */
(function () {
  'use strict';

  const V = 6;
  const R = 12;
  const NB = ' ';
  const XL = [261, 401, 541];
  const SU = 36;
  const GIU = 300;
  const MORS = 229;
  const PASSO = 34;
  const VEL = 72;
  const VETRO = 'M-12 -20 C-12 -31 -30 -40 -30 -56 A30 30 0 1 1 30 -56 C30 -40 12 -31 12 -20 Z';

  // Tratti di filo nel verso degli elettroni (dal − della pila al +).
  // in: 'sp' sempre, 's' solo in serie, 'p' solo in parallelo; da e ordine guidano il ricablaggio.
  const TRATTI = [
    { id: 'B0', in: 'sp', p: [[85, 236], [85, GIU], [301, GIU]] },
    { id: 'B1', in: 'sp', p: [[301, GIU], [441, GIU]] },
    { id: 'B2', in: 'sp', p: [[441, GIU], [581, GIU], [581, MORS]] },
    { id: 'S23', in: 's', p: [[501, MORS], [441, MORS]], da: 'fine', ordine: 1 },
    { id: 'S12', in: 's', p: [[361, MORS], [301, MORS]], da: 'fine', ordine: 0 },
    { id: 'R1', in: 'p', p: [[301, GIU], [301, MORS]], da: 'inizio', ordine: 0 },
    { id: 'R2', in: 'p', p: [[441, GIU], [441, MORS]], da: 'inizio', ordine: 1 },
    { id: 'D1', in: 'sp', p: [[221, MORS], [221, SU]] },
    { id: 'D2', in: 'p', p: [[361, MORS], [361, SU]], da: 'fine', ordine: 1 },
    { id: 'D3', in: 'p', p: [[501, MORS], [501, SU]], da: 'fine', ordine: 2 },
    { id: 'T2', in: 'p', p: [[501, SU], [361, SU]], da: 'fine', ordine: 1 },
    { id: 'T1', in: 'p', p: [[361, SU], [221, SU]], da: 'fine', ordine: 0 },
    { id: 'T0', in: 'sp', p: [[221, SU], [85, SU], [85, 100]] },
  ];
  // Nodi del parallelo, con il ritardo con cui compaiono durante il ricablaggio.
  const NODI = [[221, SU, 0.22], [301, GIU, 0.22], [361, SU, 0.36], [441, GIU, 0.36]];
  // Tratti consecutivi senza nodo in mezzo: gli elettroni passano dall'uno all'altro senza salti.
  const CATENE = { serie: [['B0', 'B1'], ['B1', 'B2'], ['D1', 'T0']], parallelo: [['D3', 'T2']] };

  // Colore del filamento in funzione della luminosità (0 freddo, 1 piena potenza).
  const TINTE = [[0, [74, 58, 51]], [0.12, [140, 40, 18]], [0.3, [226, 84, 28]], [0.55, [255, 150, 60]], [0.8, [255, 206, 120]], [1, [255, 244, 214]]];
  function tinta(b) {
    const x = Math.min(1, Math.max(0, b));
    let k = 1;
    while (k < TINTE.length - 1 && TINTE[k][0] < x) k++;
    const [a0, c0] = TINTE[k - 1];
    const [a1, c1] = TINTE[k];
    const t = (x - a0) / (a1 - a0);
    return 'rgb(' + c0.map((c, j) => Math.round(c + (c1[j] - c) * t)).join(' ') + ')';
  }

  const morbido = (f) => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(2 - 2 * f, 3) / 2);

  // Correnti in ampere: "0,5 A", "1,5 A", ma "167 mA" sotto i 0,3 A.
  function amp(i) {
    if (i === 0) return '0' + NB + 'A';
    if (i < 0.3) return EB.fmt(i, 'A');
    return (Math.round(i * 100) / 100).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + NB + 'A';
  }

  function correntiTratti(sol, topo) {
    const [i1, i2, i3] = sol.rami.map((r) => r.corrente);
    if (topo === 'serie') {
      const i = sol.corrente;
      return { B0: i, B1: i, B2: i, S23: i, S12: i, D1: i, T0: i };
    }
    return { B0: i1 + i2 + i3, B1: i2 + i3, B2: i3, R1: i1, R2: i2, D1: i1, D2: i2, D3: i3, T2: i3, T1: i2 + i3, T0: i1 + i2 + i3 };
  }

  function prepara(t) {
    t.cum = [0];
    for (let k = 1; k < t.p.length; k++) t.cum.push(t.cum[k - 1] + Math.hypot(t.p[k][0] - t.p[k - 1][0], t.p[k][1] - t.p[k - 1][1]));
    t.L = t.cum[t.cum.length - 1];
    t.n = Math.ceil(t.L / PASSO - 0.01);
    t.Lc = t.n * PASSO;
  }

  function punto(t, d) {
    let k = 1;
    while (k < t.cum.length - 1 && t.cum[k] < d) k++;
    const f = (d - t.cum[k - 1]) / (t.cum[k] - t.cum[k - 1]);
    return [t.p[k - 1][0] + (t.p[k][0] - t.p[k - 1][0]) * f, t.p[k - 1][1] + (t.p[k][1] - t.p[k - 1][1]) * f];
  }

  const nb = (t) => t.replace(/(\d) (m?[VAW]\b|Ω)/g, '$1' + NB + '$2');

  EB.laboratorio('circuiti', {
    monta(ctx) {
      const { h, s, fmt } = ctx;
      const stato = { topo: 'serie', presenti: [true, true, true] };
      let sol = null;
      const uid = EB.uid('cir');
      const tratti = TRATTI.map((d) => Object.assign({ o: 0, vis: d.in === 'p' ? 0 : 1, iMeta: 0, iVista: 0, anim: null, mostra: null }, d));
      tratti.forEach(prepara);
      const perId = {};
      tratti.forEach((t) => { perId[t.id] = t; });

      /* --- scena --- */
      const svg = s('svg', { viewBox: '0 0 640 352', class: 'cir-svg', role: 'group' });
      const luce = (o) => s('stop', { offset: o[0], class: 'cir-luce', 'stop-opacity': o[1] });
      svg.append(s('defs', null,
        s('radialGradient', { id: uid + '-alone' }, [['0', '.5'], ['.35', '.2'], ['1', '0']].map(luce)),
        s('radialGradient', { id: uid + '-vetro', cx: '.5', cy: '.42', r: '.62' }, [['0', '.9'], ['.55', '.35'], ['1', '.08']].map(luce))));
      const strati = {};
      ['aloni', 'zoccoli', 'fili', 'elettroni', 'frecce', 'viti', 'nodi', 'pila'].forEach((n) => { strati[n] = s('g', { 'aria-hidden': 'true' }); });
      const gLampade = s('g');
      const gLetture = s('g', { 'aria-hidden': 'true' });

      tratti.forEach((t) => {
        const d = 'M' + t.p.map((q) => q.join(' ')).join(' L');
        t.filo = s('path', { d: d, class: 'cir-filo' });
        t.rame = s('path', { d: d, class: 'cir-filo-rame' });
        strati.fili.append(t.filo, t.rame);
        if (ctx.ridotto) {
          // Al posto degli elettroni in moto, punte di freccia: una ogni 0,5 A.
          let k = 1;
          for (let j = 2; j < t.p.length; j++) if (t.cum[j] - t.cum[j - 1] > t.cum[k] - t.cum[k - 1]) k = j;
          const a = t.p[k - 1];
          const b = t.p[k];
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
          t.frecce = [0, 1, 2].map(() => s('path', { d: 'M-4 -5 L2 0 L-4 5', class: 'cir-freccia' }));
          strati.frecce.append(s('g', { transform: 'translate(' + (a[0] + b[0]) / 2 + ' ' + (a[1] + b[1]) / 2 + ') rotate(' + ang + ')' }, t.frecce));
        } else {
          t.gruppo = s('g', { class: 'cir-tratto-e' });
          t.punti = [];
          for (let j = 0; j < t.n; j++) {
            const g = s('g', { class: 'cir-elettrone', transform: 'translate(-40 -40)' }, s('circle', { r: 5 }), s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '−'));
            t.gruppo.append(g);
            t.punti.push(g);
          }
          strati.elettroni.append(t.gruppo);
        }
      });

      strati.pila.append(
        s('rect', { x: 75, y: 100, width: 20, height: 10, rx: 2, class: 'cir-pila-polo' }),
        s('rect', { x: 75, y: 226, width: 20, height: 10, rx: 2, class: 'cir-pila-polo' }),
        s('rect', { x: 59, y: 108, width: 52, height: 120, rx: 10, class: 'cir-pila-corpo' }),
        s('rect', { x: 65, y: 114, width: 40, height: 108, rx: 6, class: 'cir-pila-carica' }),
        s('text', { x: 85, y: 172, 'text-anchor': 'middle', class: 'cir-pila-v' }, '6' + NB + 'V'),
        s('text', { x: 85, y: 194, 'text-anchor': 'middle', class: 'cir-pila-t' }, 'pila'),
        s('text', { x: 118, y: 127, class: 'cir-segno pos' }, '+'),
        s('text', { x: 118, y: 224, class: 'cir-segno neg' }, '−'));

      const nodi = NODI.map(([x, y, rit]) => {
        const el = s('circle', { r: 5.5, class: 'cir-nodo', transform: 'translate(' + x + ' ' + y + ') scale(0)' });
        strati.nodi.append(el);
        return { el: el, x: x, y: y, rit: rit, sc: 0, v: 0, attesa: 0 };
      });
      const nodoT = s('text', { x: 229, y: 24, class: 'cir-nodo-t', opacity: 0 }, 'nodo');
      strati.nodi.append(nodoT);

      const lampade = XL.map((x, k) => {
        strati.zoccoli.append(
          s('rect', { x: x - 48, y: 216, width: 96, height: 26, rx: 7, class: 'cir-zoccolo' }),
          s('ellipse', { cx: x, cy: 217, rx: 14, ry: 3.5, class: 'cir-foro' }));
        [-40, 40].forEach((dx) => strati.viti.append(
          s('circle', { cx: x + dx, cy: MORS, r: 5, class: 'cir-vite' }),
          s('path', { d: 'M' + (x + dx - 3) + ' ' + (MORS - 3) + ' l6 6', class: 'cir-vite-taglio' })));
        const alone = s('circle', { cx: x, cy: 160, r: 84, fill: 'url(#' + uid + '-alone)', opacity: 0 });
        strati.aloni.append(alone);
        const bagliore = s('path', { d: VETRO, fill: 'url(#' + uid + '-vetro)', opacity: 0 });
        const filamento = s('path', { d: 'M-9 -52 q2.25 -6 4.5 0 t4.5 0 t4.5 0 t4.5 0', class: 'cir-filamento' });
        const bulbo = s('g', null,
          bagliore,
          s('path', { d: VETRO, class: 'cir-vetro' }),
          s('path', { d: 'M-5 -21 L-9 -52 M5 -21 L9 -52', class: 'cir-supporto' }),
          filamento,
          s('path', { d: 'M-21 -72 Q-25 -62 -22 -50', class: 'cir-riflesso' }),
          s('rect', { x: -13, y: -21, width: 26, height: 21, rx: 3, class: 'cir-attacco' }),
          s('path', { d: 'M-13 -16 L13 -13 M-13 -10 L13 -7 M-13 -4 L13 -1', class: 'cir-attacco-riga' }));
        const presa = s('rect', { x: -52, y: -100, width: 104, height: 132, rx: 14, class: 'cir-presa' });
        const g = s('g', { class: 'cir-lampada', transform: 'translate(' + x + ' 216)', role: 'button', tabindex: '0' },
          presa,
          s('g', { class: 'cir-sollevo' }, bulbo),
          s('text', { x: 0, y: 18, 'text-anchor': 'middle', class: 'cir-nome' }, 'L' + '₁₂₃'[k]));
        gLampade.append(g);
        const letture = ['v', 'i', 'p'].map((q, j) => s('text', { x: x, y: 66 + j * 21, 'text-anchor': 'middle', class: 'cir-val ' + q }));
        gLetture.append(...letture);
        ctx.su(g, 'click', () => svita(k));
        ctx.su(g, 'keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          if (!e.repeat) svita(k);
        });
        return { g: g, presa: presa, bulbo: bulbo, filamento: filamento, bagliore: bagliore, alone: alone, letture: letture, alza: 0, vAlza: 0, alzaMeta: 0, lum: 0, lumMeta: 0, disegnata: null };
      });

      const didascalie = [
        s('text', { x: 44, y: 340, class: 'cir-cap' }, ctx.ridotto ? 'frecce: verso degli elettroni' : 'elettroni: velocità non in scala'),
        s('text', { x: 596, y: 340, 'text-anchor': 'end', class: 'cir-cap' }, 'lampadine uguali da 12' + NB + 'Ω')];
      svg.append(strati.aloni, strati.zoccoli, strati.fili, strati.elettroni, strati.frecce, strati.viti, strati.nodi, strati.pila, gLampade, gLetture, ...didascalie);
      ctx.scena.append(svg);
      // Sugli schermi stretti si tagliano i margini vuoti e le lampadine crescono del 10%
      // (non di più: a sinistra di ognuna sale un filo); le letture salgono per far posto.
      let stretto = false;
      function adatta(st) {
        stretto = st;
        svg.setAttribute('viewBox', st ? '50 4 546 344' : '0 0 640 352');
        didascalie[0].setAttribute('x', st ? 59 : 44);
        didascalie[1].setAttribute('x', st ? 589 : 596);
        lampade.forEach((L) => {
          L.letture.forEach((el, j) => el.setAttribute('y', (st ? 62 : 66) + j * 21));
          L.presa.setAttribute('y', st ? -104 : -100);
          L.presa.setAttribute('height', st ? 136 : 132);
          L.alone.setAttribute('cy', st ? 156 : 160);
          L.disegnata = null;
          disegnaLampada(L);
        });
      }
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => { if ((ctx.scena.clientWidth < 560) !== stretto) adatta(!stretto); });
        ro.observe(ctx.scena);
        ctx.pulizia(() => ro.disconnect());
      }

      /* --- pannello: letture e Kirchhoff --- */
      ctx.pannello.classList.add('cir-pannello');
      const lI = ctx.ui.lettura({ etichetta: 'Corrente della pila', grandezza: 'i' });
      const lR = ctx.ui.lettura({ etichetta: 'Resistenza equivalente', grandezza: 'r' });
      const lP = ctx.ui.lettura({ etichetta: 'Potenza totale', grandezza: 'p' });
      const kirT = h('p', { class: 'cir-kir-t' });
      const kirF = h('div', { class: 'cir-kir-f' });
      const righe = [0, 1, 2, 3].map((j) => {
        const x = { op: h('span', { class: 'cir-kir-op' }, j === 0 ? '' : j === 3 ? '=' : '+'), sim: h('var'), val: h('span', { class: 'cir-kir-val' }), tag: h('span', { class: 'cir-kir-tag' }) };
        x.r = h('div', { class: 'cir-kir-riga' }, x.op, x.sim, x.val, x.tag);
        return x;
      });
      const kir = h('div', { class: 'cir-kir' }, kirT, kirF, h('div', { class: 'cir-kir-righe' }, righe.slice(0, 3).map((x) => x.r), h('div', { class: 'cir-kir-linea' }), righe[3].r));
      ctx.pannello.append(lI.el, lR.el, lP.el, kir);

      /* --- comandi --- */
      const scelta = ctx.ui.scelta({
        etichetta: 'Collegamento',
        valore: stato.topo,
        opzioni: [
          { valore: 'serie', etichetta: ['In serie', h('small', null, 'una sola strada')] },
          { valore: 'parallelo', etichetta: ['In parallelo', h('small', null, 'una strada per lampadina')] },
        ],
        cambia: (v) => impostaTopo(v),
      });
      scelta.el.classList.add('cir-scelta');
      const tutte = ctx.ui.bottone({ etichetta: 'Avvita tutte', icona: '↻', click: () => avvitaTutte() });
      ctx.comandi.append(scelta.el, h('div', { class: 'cir-azioni' }, tutte, h('p', { class: 'cir-aiuto' }, 'Tocca una lampadina per svitarla o riavvitarla.')));

      /* --- disegno --- */
      function disegnaFilo(t) {
        const nascosto = t.vis <= 0.002;
        [t.filo, t.rame].forEach((p) => {
          p.style.display = nascosto ? 'none' : '';
          if (t.vis >= 0.998 || nascosto) {
            p.style.strokeDasharray = '';
            p.style.strokeDashoffset = '';
          } else {
            p.style.strokeDasharray = t.L + ' ' + t.L;
            p.style.strokeDashoffset = (t.da === 'inizio' ? 1 : -1) * t.L * (1 - t.vis);
          }
        });
      }

      function disponiElettroni(t) {
        const mostra = t.vis >= 0.998 && !t.anim;
        if (mostra !== t.mostra) {
          t.mostra = mostra;
          t.gruppo.classList.toggle('spento', !mostra);
        }
        if (t.vis <= 0.002) return;
        t.punti.forEach((g, j) => {
          const d = ((t.o + j * PASSO) % t.Lc + t.Lc) % t.Lc;
          if (d > t.L) { g.setAttribute('transform', 'translate(-40 -40)'); return; }
          const q = punto(t, d);
          g.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
        });
      }

      function disegnaLampada(L) {
        if (L.disegnata === L.lum + ':' + L.alza) return;
        L.disegnata = L.lum + ':' + L.alza;
        const alzo = stretto ? 'scale(1.1) translate(0 ' + (-10 * L.alza).toFixed(2) : 'translate(0 ' + (-16 * L.alza).toFixed(2);
        L.bulbo.setAttribute('transform', alzo + ') rotate(' + (8 * L.alza).toFixed(2) + ')');
        const b = Math.min(1, L.lum);
        L.alone.setAttribute('opacity', (0.95 * b).toFixed(3));
        L.bagliore.setAttribute('opacity', (0.85 * b).toFixed(3));
        const c = tinta(L.lum);
        L.filamento.style.stroke = c;
        L.filamento.style.filter = L.lum > 0.04 ? 'drop-shadow(0 0 ' + (1.5 + 4 * b).toFixed(1) + 'px ' + c + ')' : 'none';
      }

      function disegnaNodo(n) {
        n.el.setAttribute('transform', 'translate(' + n.x + ' ' + n.y + ') scale(' + Math.max(0, n.sc).toFixed(3) + ')');
        if (n === nodi[0]) nodoT.setAttribute('opacity', EB.clamp(n.sc, 0, 1).toFixed(2));
      }

      // Movimento ridotto: stati istantanei e frecce ferme.
      function disegnaStatico() {
        const par = stato.topo === 'parallelo';
        tratti.forEach((t) => {
          t.vis = t.in === 'sp' || (t.in === 'p') === par ? 1 : 0;
          disegnaFilo(t);
          const u = t.vis ? t.iMeta / (V / R) : 0;
          const n = u > 0 ? Math.max(1, Math.round(u)) : 0;
          t.frecce.forEach((f, j) => {
            f.setAttribute('display', j < n ? 'inline' : 'none');
            f.setAttribute('transform', 'translate(' + (j - (n - 1) / 2) * 7 + ' 0)');
            f.setAttribute('opacity', u < 0.99 ? '.6' : '1');
          });
        });
        nodi.forEach((n) => { n.sc = par ? 1 : 0; disegnaNodo(n); });
        lampade.forEach((L) => { L.alza = L.alzaMeta; L.lum = L.lumMeta; disegnaLampada(L); });
      }

      /* --- animazione --- */
      let orologio = 0;
      function allinea(dt) {
        CATENE[stato.topo].forEach(([a, b]) => {
          const A = perId[a];
          const B = perId[b];
          if (A.anim || B.anim) return;
          let d = (((A.o - A.L - B.o) % PASSO) + PASSO) % PASSO;
          if (d > PASSO / 2) d -= PASSO;
          const max = 0.5 * VEL * B.iVista * dt;
          B.o += EB.clamp(d * (1 - Math.exp(-dt * 3)), -max, max);
        });
      }

      const ciclo = ctx.ciclo((dt, t) => {
        orologio = t;
        let attivo = false;
        tratti.forEach((tr) => {
          if (!tr.anim) return;
          const f = EB.clamp((t - tr.anim.t0) / tr.anim.dur, 0, 1);
          tr.vis = tr.anim.da + (tr.anim.a - tr.anim.da) * morbido(f);
          if (f >= 1) tr.anim = null;
          disegnaFilo(tr);
          attivo = true;
        });
        const par = stato.topo === 'parallelo' ? 1 : 0;
        nodi.forEach((n) => {
          if (n.attesa > 0) { n.attesa -= dt; attivo = true; return; }
          n.v += (260 * (par - n.sc) - 16 * n.v) * dt;
          n.sc += n.v * dt;
          if (Math.abs(par - n.sc) < 1e-3 && Math.abs(n.v) < 1e-2) { n.sc = par; n.v = 0; } else attivo = true;
          disegnaNodo(n);
        });
        lampade.forEach((L) => {
          L.vAlza += (170 * (L.alzaMeta - L.alza) - 15 * L.vAlza) * dt;
          L.alza = Math.max(-0.15, L.alza + L.vAlza * dt);
          if (Math.abs(L.alzaMeta - L.alza) < 5e-4 && Math.abs(L.vAlza) < 5e-3) { L.alza = L.alzaMeta; L.vAlza = 0; } else attivo = true;
          L.lum += (L.lumMeta - L.lum) * (1 - Math.exp(-dt * (L.lumMeta > L.lum ? 7 : 12)));
          if (Math.abs(L.lumMeta - L.lum) < 2e-3) L.lum = L.lumMeta; else attivo = true;
          disegnaLampada(L);
        });
        let corre = false;
        tratti.forEach((tr) => {
          tr.iVista += (tr.iMeta - tr.iVista) * (1 - Math.exp(-dt * 5));
          if (Math.abs(tr.iMeta - tr.iVista) < 1e-4) tr.iVista = tr.iMeta;
          if (tr.iVista > 0) corre = true;
          tr.o = (tr.o + VEL * tr.iVista * dt) % tr.Lc;
        });
        allinea(dt);
        tratti.forEach(disponiElettroni);
        if (!attivo && !corre) ciclo.ferma();
      });

      /* --- stato, letture, note e sfide --- */
      function scrivi(el, testo, zero) {
        el.textContent = testo;
        el.classList.toggle('zero', zero);
      }

      function etichettaLampada(j) {
        const r = sol.rami[j];
        if (!stato.presenti[j]) return 'Lampadina ' + (j + 1) + ', svitata. Premi per avvitarla.';
        return 'Lampadina ' + (j + 1) + ', ' + (r.accesa ? 'accesa' : 'spenta') + ': ' + fmt(r.tensione, 'V') + ', ' + amp(r.corrente) + ', ' + fmt(r.potenza, 'W') + '. Premi per svitarla.';
      }

      function descrizione() {
        const accese = [1, 2, 3].filter((n) => sol.rami[n - 1].accesa);
        const svitate = [1, 2, 3].filter((n) => !stato.presenti[n - 1]);
        return 'Banco con una pila da 6 V e tre lampadine uguali da 12 Ω collegate in ' + stato.topo + '. ' +
          (accese.length === 3 ? 'Tutte accese.' : accese.length ? 'Accese: ' + accese.join(' e ') + '.' : 'Tutte spente.') +
          (svitate.length === 3 ? ' Tutte svitate.' : svitate.length ? ' Svitate: ' + svitate.join(' e ') + '.' : '');
      }

      function disegnaKirchhoff(indet) {
        const serie = stato.topo === 'serie';
        const q = serie ? 'v' : 'i';
        kirT.textContent = serie ? 'Legge delle maglie' : 'Legge dei nodi';
        kirF.replaceChildren(EB.formula(serie ? 'V = V₁ + V₂ + V₃' : 'I = I₁ + I₂ + I₃'));
        righe.forEach((x, j) => {
          const r = sol.rami[j];
          let val;
          if (j === 3) val = serie ? fmt(V, 'V') : amp(sol.corrente);
          else if (serie) val = indet && !stato.presenti[j] ? '?' : fmt(r.tensione, 'V');
          else val = amp(r.corrente);
          x.sim.className = 'q-' + q;
          x.sim.textContent = (serie ? 'V' : 'I') + (j < 3 ? '₁₂₃'[j] : '');
          x.val.className = 'cir-kir-val q-' + q;
          x.val.textContent = val;
          x.tag.textContent = j === 3 ? 'pila' : stato.presenti[j] ? '' : 'svitata';
          x.r.classList.toggle('zero', j < 3 && (serie ? r.tensione === 0 && val !== '?' : r.corrente === 0));
        });
      }

      function aggiorna(origine, k) {
        sol = ctx.F.risolviLampade(V, [R, R, R], stato.topo, stato.presenti);
        const serie = stato.topo === 'serie';
        const nAv = stato.presenti.filter(Boolean).length;
        const indet = serie && nAv <= 1;
        const c = correntiTratti(sol, stato.topo);
        tratti.forEach((t) => { t.iMeta = c[t.id] || 0; });
        lampade.forEach((L, j) => {
          const r = sol.rami[j];
          const vt = indet && !stato.presenti[j] ? '–' : fmt(r.tensione, 'V');
          scrivi(L.letture[0], vt, r.tensione === 0 || vt === '–');
          scrivi(L.letture[1], amp(r.corrente), r.corrente === 0);
          scrivi(L.letture[2], fmt(r.potenza, 'W'), r.potenza === 0);
          L.lumMeta = Math.sqrt(r.potenza / (V * V / R));
          L.alzaMeta = stato.presenti[j] ? 0 : 1;
          L.g.setAttribute('aria-label', etichettaLampada(j));
        });
        lI.imposta(amp(sol.corrente));
        lI.nota(sol.corrente === 0 ? 'circuito aperto' : serie ? 'la stessa in ogni lampadina' : 'somma delle correnti dei rami');
        const aperto = !Number.isFinite(sol.req);
        lR.imposta(aperto ? '∞' : fmt(sol.req, 'Ω'));
        lR.nota(aperto ? 'nessuna strada chiusa' : serie ? '12 + 12 + 12' + NB + 'Ω' : nAv === 1 ? 'una lampadina sola' : '12' + NB + 'Ω ÷ ' + nAv + ' rami');
        lP.imposta(fmt(V * sol.corrente, 'W'));
        disegnaKirchhoff(indet);
        svg.setAttribute('aria-label', descrizione());
        tutte.disabled = nAv === 3;
        if (origine) {
          sfide();
          clearTimeout(timerNota);
          timerNota = setTimeout(() => nota(origine, k), 300);
        }
        if (ctx.ridotto) disegnaStatico();
        else ciclo.avvia();
      }

      function svita(k) {
        stato.presenti[k] = !stato.presenti[k];
        aggiorna('lampada', k);
      }

      function avvitaTutte() {
        if (stato.presenti.every(Boolean)) return;
        stato.presenti = [true, true, true];
        aggiorna('tutte');
      }

      function impostaTopo(v) {
        if (v === stato.topo) return;
        stato.topo = v;
        const par = v === 'parallelo';
        tratti.forEach((t) => {
          if (t.in === 'sp') return;
          const entra = (t.in === 'p') === par;
          const ritardo = entra ? (par ? 0.22 : 0.36) + t.ordine * 0.14 : (par ? t.ordine : 2 - t.ordine) * 0.08;
          t.anim = { t0: orologio + ritardo, dur: entra ? 0.36 : 0.28, da: t.vis, a: entra ? 1 : 0 };
        });
        // I due tratti dell'angolo in alto a destra ripartono già allineati.
        if (par) perId.T2.o = perId.D3.o - perId.D3.L;
        nodi.forEach((n) => { n.attesa = par ? n.rit : 0; });
        aggiorna('topo');
      }

      let timerNota = 0;
      let ultimaNota = '';
      ctx.pulizia(() => clearTimeout(timerNota));

      function testoNota(origine, k) {
        const serie = stato.topo === 'serie';
        const nAv = stato.presenti.filter(Boolean).length;
        const nome = 'lampadina ' + (k + 1);
        const itot = amp(sol.corrente);
        if (origine === 'lampada') {
          const via = !stato.presenti[k];
          if (serie) {
            if (via) {
              return nAv === 2
                ? 'Hai svitato la ' + nome + ': l\'unica strada si è **interrotta**, la corrente si ferma ovunque e si spengono **tutte**. Tra i morsetti del portalampada vuoto ora c\'è l\'intera tensione della pila, **6 V**.'
                : 'Il circuito era già aperto: svitare anche la ' + nome + ' non cambia nulla, la corrente resta **zero**.';
            }
            return nAv === 3
              ? 'Con la ' + nome + ' di nuovo al suo posto la strada si richiude: le tre lampadine si riaccendono **insieme**, ognuna con **2 V** e **167 mA**.'
              : 'Hai riavvitato la ' + nome + ', ma ' + (nAv === 2 ? 'ne manca ancora una' : 'ne mancano ancora due') + ': in serie basta un\'interruzione per fermare la corrente in tutto il circuito.';
          }
          if (via) {
            if (nAv === 0) return 'Hai svitato anche la ' + nome + ': tutti i rami sono aperti e la pila non dà più corrente.';
            if (nAv === 1) return 'Resta accesa una sola lampadina: dalla pila escono **0,5 A**, la corrente del suo ramo. Con tre lampadine erano **1,5 A**: ogni ramo aggiunge la sua corrente.';
            return 'Hai svitato la ' + nome + ': il suo ramo si apre, ma le altre restano **accese come prima**, con **6 V** e **0,5 A** ciascuna. Dalla pila ora escono **' + itot + '**.';
          }
          return nAv === 3
            ? 'Tutti e tre i rami sono di nuovo chiusi: dalla pila escono **1,5 A**, cioè 0,5 A per ogni lampadina. Quelle già accese non sono cambiate.'
            : 'Hai riavvitato la ' + nome + ': un ramo in più, e la corrente della pila sale a **' + itot + '**. Le lampadine già accese non cambiano.';
        }
        if (serie) {
          return nAv === 3
            ? 'In **serie** la corrente ha una sola strada e attraversa le lampadine una dopo l\'altra: i **6 V** della pila si dividono in parti uguali, **2 V** a lampadina, e passano **167 mA**. Ogni lampadina riceve **333 mW**, un nono dei 3 W che avrebbe in parallelo: per questo è fioca.'
            : 'In **serie** basta una lampadina svitata per interrompere l\'unica strada: non passa corrente e restano **tutte spente**.';
        }
        if (nAv === 3) return 'In **parallelo** ogni lampadina ha la sua strada e riceve tutti i **6 V** della pila: in ciascuna passano **0,5 A** e la potenza sale a **3 W**, nove volte quella in serie. A ogni [[nodo]] la corrente si divide: dalla pila escono **1,5 A**, la somma dei tre rami.';
        if (nAv === 0) return 'In **parallelo**, ma con tutte le lampadine svitate: ogni ramo è aperto e la pila non dà corrente.';
        return 'In **parallelo** le lampadine avvitate si accendono anche se ne manca qualcuna: ognuna riceve **6 V** e porta **0,5 A**, e dalla pila escono **' + itot + '**.';
      }

      function nota(origine, k) {
        const t = nb(testoNota(origine, k));
        if (t === ultimaNota) return;
        ultimaNota = t;
        ctx.nota(t);
      }

      // In parallelo si ricordano i numeri di lampadine avvitate già visti.
      const visti = new Set();
      function sfide() {
        const nAv = stato.presenti.filter(Boolean).length;
        if (nAv >= 1 && nAv < 3) ctx.completa(stato.topo === 'serie' ? 'svita-serie' : 'svita-parallelo');
        if (stato.topo === 'parallelo') {
          visti.add(nAv);
          if (visti.has(1) && visti.has(3)) ctx.completa('somma-correnti');
        }
      }

      tratti.forEach((t) => { if (!ctx.ridotto) disegnaFilo(t); });
      aggiorna();
      if (!ctx.ridotto) {
        // Elettroni dei tratti in fila già allineati alla partenza.
        CATENE.serie.forEach(([a, b]) => { perId[b].o = perId[a].o - perId[a].L; });
        tratti.forEach((t) => { t.iVista = t.iMeta; disponiElettroni(t); });
      }
      ultimaNota = nb('Tre lampadine uguali in **serie** su una pila da **6 V**: la corrente ha una sola strada, ogni lampadina riceve **2 V** e passano **167 mA**. Tocca una lampadina per svitarla, oppure prova il collegamento **in parallelo**.');
      ctx.nota(ultimaNota);
    },
  });
})();
