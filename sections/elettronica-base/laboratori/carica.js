/*
 * Laboratorio "Il campo di Coulomb" (capitolo 1).
 * Due cariche puntiformi su un banco largo 50 cm: si trascinano con il dito, il mouse
 * o le frecce, e per ognuna si scelgono segno e intensità (da 1 a 5 µC).
 * La forza è quella vera di Coulomb. Le linee del campo sono integrate sulla tela
 * partendo dalle cariche; le frecce della forza hanno lunghezza in scala logaritmica.
 */
(function () {
  'use strict';

  const LARGHEZZA = 50; // cm di banco in orizzontale
  const LINEE_PER_UC = 7; // linee di campo per microcoulomb
  const PASSO_TASTO = 0.5; // cm per freccia (×4 con Maiusc)
  const D_MIN = 3;
  const D_MAX = 45;
  const CAMPIONE = 3; // px tra i punti ricampionati di una linea
  const SPAZIO = 26; // px tra i puntini che scorrono
  const VELOCITA = 24; // px/s: i puntini mostrano solo il verso del campo
  const NBSP = ' ';
  const PEDICI = ['₁', '₂'];


  function inverti(p) {
    const q = [];
    for (let k = p.length - 2; k >= 0; k -= 2) q.push(p[k], p[k + 1]);
    return q;
  }

  // Punti equidistanti lungo la linea: i puntini si posano senza ricerche.
  function ricampiona(p, daCarica, aCarica) {
    const xs = [p[0]];
    const ys = [p[1]];
    let manca = CAMPIONE;
    for (let k = 2; k < p.length; k += 2) {
      const x0 = p[k - 2];
      const y0 = p[k - 1];
      const dx = p[k] - x0;
      const dy = p[k + 1] - y0;
      const seg = Math.hypot(dx, dy);
      let fatto = 0;
      while (seg - fatto >= manca) {
        fatto += manca;
        xs.push(x0 + dx * fatto / seg);
        ys.push(y0 + dy * fatto / seg);
        manca = CAMPIONE;
      }
      manca -= seg - fatto;
    }
    return { xs: xs, ys: ys, n: xs.length, L: (xs.length - 1) * CAMPIONE, daCarica: daCarica, aCarica: aCarica };
  }

  // Linee del campo di due cariche {x, y, q, r} in px. Dalle positive si segue il campo,
  // dalle negative lo si risale; una linea che da una negativa arriva su una positiva
  // è già stata tracciata partendo dalla positiva, quindi si scarta.
  function tracciaLinee(cariche, w, h) {
    const linee = [];
    const fuori = 160;
    cariche.forEach((c, i) => {
      const verso = c.q > 0 ? 1 : -1;
      const altra = cariche[1 - i];
      const n = Math.round(LINEE_PER_UC * Math.abs(c.q));
      const base = Math.atan2(altra.y - c.y, altra.x - c.x) + Math.PI / n;
      for (let k = 0; k < n; k++) {
        const a = base + 2 * Math.PI * k / n;
        let x = c.x + Math.cos(a) * c.r * 0.6;
        let y = c.y + Math.sin(a) * c.r * 0.6;
        const punti = [x, y];
        let arrivata = false;
        for (let passi = 0; passi < 1500; passi++) {
          const vicino = Math.min(Math.hypot(x - c.x, y - c.y), Math.hypot(x - altra.x, y - altra.y));
          const ds = EB.clamp(vicino * 0.1, 1.2, 7) * verso;
          const e1 = EBFisica.campo(cariche, x, y);
          const m1 = Math.hypot(e1.x, e1.y) || 1;
          const e2 = EBFisica.campo(cariche, x + e1.x / m1 * ds / 2, y + e1.y / m1 * ds / 2);
          const m2 = Math.hypot(e2.x, e2.y);
          if (!(m2 > 1e-12)) break;
          x += e2.x / m2 * ds;
          y += e2.y / m2 * ds;
          punti.push(x, y);
          if (Math.hypot(x - altra.x, y - altra.y) < altra.r * 0.6) { arrivata = true; break; }
          if (x < -fuori || x > w + fuori || y < -fuori || y > h + fuori) break;
        }
        if (verso > 0) linee.push(ricampiona(punti, true, arrivata));
        else if (!arrivata) linee.push(ricampiona(inverti(punti), false, true));
      }
    });
    return linee;
  }

  function frecciaD(L) {
    const t = 2.3;
    const testa = Math.min(13, L * 0.55);
    const f = (v) => v.toFixed(1);
    return 'M0 ' + f(-t) + 'H' + f(L - testa) + 'V-6.5L' + f(L) + ' 0L' + f(L - testa) + ' 6.5V' + f(t) + 'H0Z';
  }

  EB.laboratorio('carica', {
    monta(ctx) {
      const { h, s, ui, num } = ctx;
      const ridotto = ctx.ridotto;
      let grandezzaSfere = 1; // le sfere crescono un po' sui banchi larghi
      const raggio = (q) => (12 + 1.6 * Math.abs(q)) * grandezzaSfere;
      const stato = { cariche: [{ x: 13, y: 14, q: 2 }, { x: 37, y: 14, q: 2 }] };
      const vista = stato.cariche.map((c) => ({ x: c.x, y: c.y, r: raggio(c.q) * (ridotto ? 1 : 0.5), vr: 0, pop: 0, vpop: 0, mix: 0, freccia: 0 }));
      let w = 0;
      let alto = 0;
      let scala = 1; // px per cm
      let altezza = 28; // cm di banco in verticale
      let posate = false;
      let linee = [];
      let percorso = null;
      let percorsoFino = 0;
      let firma = '';
      let vecchie = null;
      let crescita = ridotto ? 1 : 0;
      let storico = [];
      let dimezzata = null;
      let presa = null;
      let timerNota = 0;

      const CM = (r) => num(r, 1) + NBSP + 'cm';
      const N = (f) => { const a = Math.abs(f); return num(a, a >= 100 ? 0 : a >= 10 ? 1 : a >= 0.1 ? 2 : 3) + NBSP + 'N'; };
      const UC = (q) => num(Math.abs(q), 0) + NBSP + 'µC';
      const conSegno = (q) => (q > 0 ? '+' : '−') + UC(q);
      const distanza = () => Math.hypot(stato.cariche[1].x - stato.cariche[0].x, stato.cariche[1].y - stato.cariche[0].y);
      const coulomb = (q1, q2, r) => ctx.F.coulomb(q1 * 1e-6, q2 * 1e-6, r / 100);
      const forza = () => coulomb(stato.cariche[0].q, stato.cariche[1].q, distanza());
      const margine = (i) => (raggio(stato.cariche[i].q) + 8) / scala;
      const distMinima = () => Math.max(D_MIN, (raggio(stato.cariche[0].q) + raggio(stato.cariche[1].q) + 10) / scala);

      /* --- banco: la tela per il campo, l'SVG sopra per cariche, frecce e misure --- */
      const banco = h('div', { class: 'car-banco' });
      ctx.scena.append(banco);
      // EB.tela su un contenitore senza padding: la tela è larga quanto la misura.
      const tela = EB.tela(banco, { rapporto: 16 / 9, min: 300, max: 410, etichetta: 'Banco delle cariche' });
      ctx.pulizia(() => tela.distruggi());
      const g2 = tela.ctx;
      const sfondo = document.createElement('canvas');

      const uid = EB.uid('car');
      const defs = s('defs');
      ['pos', 'neg'].forEach((t) => defs.append(
        s('radialGradient', { id: uid + '-sfera-' + t, class: 'car-g-' + t, cx: '0.38', cy: '0.32', r: '0.72' },
          s('stop', { offset: '0', class: 'car-g1' }), s('stop', { offset: '0.5', class: 'car-g2' }), s('stop', { offset: '1', class: 'car-g3' })),
        s('radialGradient', { id: uid + '-alone-' + t, class: 'car-g-' + t },
          s('stop', { offset: '0', class: 'car-a1' }), s('stop', { offset: '0.45', class: 'car-a2' }), s('stop', { offset: '1', class: 'car-a3' }))));
      const svg = s('svg', { class: 'car-svg', role: 'group', 'aria-label': 'Banco delle cariche: trascina una carica o usa le frecce' }, defs);
      const aloni = s('g', { 'aria-hidden': 'true' });
      const righello = s('g', { 'aria-hidden': 'true', class: 'car-righello' });
      const misuraLinea = s('line', { class: 'car-misura' });
      const misuraFondo = s('rect', { class: 'car-pillola', height: 22, rx: 11 });
      const misuraTesto = s('text', { class: 'car-misura-t', 'text-anchor': 'middle' });
      const misura = s('g', { 'aria-hidden': 'true' }, misuraLinea, misuraFondo, misuraTesto);
      const frecce = s('g', { 'aria-hidden': 'true' });
      const etichette = s('g', { 'aria-hidden': 'true' });
      svg.append(aloni, righello, misura, frecce);

      const nodi = stato.cariche.map((c, i) => {
        const alone = ['pos', 'neg'].map((t) => s('circle', { fill: 'url(#' + uid + '-alone-' + t + ')' }));
        const sfere = ['pos', 'neg'].map((t) => s('circle', { r: 10, fill: 'url(#' + uid + '-sfera-' + t + ')' }));
        const segno = s('text', { class: 'car-segno', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '+');
        const corpo = s('g', null, sfere, segno);
        const anello = s('circle', { class: 'car-anello' });
        const g = s('g', { class: 'car-carica' }, anello, corpo, s('circle', { class: 'car-presa', r: 26 }));
        const freccia = s('path', { class: 'car-freccia' });
        const valore = s('tspan', { class: 'car-et-v', x: 0, dy: 15 });
        const et = s('text', { class: 'car-et', 'text-anchor': 'middle' }, s('tspan', { class: 'car-et-q', x: 0 }, 'q' + PEDICI[i]), valore);
        aloni.append(...alone);
        frecce.append(freccia);
        etichette.append(et);
        svg.append(g);
        return { alone: alone, sfere: sfere, segno: segno, corpo: corpo, anello: anello, g: g, freccia: freccia, et: et, valore: valore };
      });
      svg.append(etichette);
      banco.append(svg);

      const legenda = h('div', { class: 'car-legenda' },
        h('span', { class: 'car-leg' }, h('span', { class: 'car-leg-freccia', 'aria-hidden': 'true' }), 'Forza su ogni carica (frecce in scala compressa)'),
        h('span', { class: 'car-leg' }, h('span', { class: 'car-leg-campo', 'aria-hidden': 'true' }), 'Campo: esce dal +, entra nel −'),
        h('span', { class: 'car-leg' }, h('span', { class: 'car-leg-quadretto', 'aria-hidden': 'true' }), 'Quadretti da 5 cm'));
      ctx.scena.append(legenda);

      /* --- letture e comandi --- */
      const lR = ui.lettura({ etichetta: 'Distanza' });
      const lF = ui.lettura({ etichetta: 'Forza', grandezza: 'f' });
      const lTipo = ui.lettura({ etichetta: 'Le cariche si' });
      lTipo.el.classList.add('car-tipo');
      const formula = ui.formulaViva();
      formula.el.classList.add('car-formula');
      ctx.pannello.append(lR.el, lF.el, lTipo.el, formula.el, h('p', { class: 'car-k' }, 'k ≈ 8,99·10⁹ N·m²/C²', h('br'), 'F < 0: attrazione', h('br'), 'F > 0: repulsione'));

      const schede = h('div', { class: 'car-comandi' });
      const comandiCarica = stato.cariche.map((c, i) => {
        const pallino = h('span', { class: 'car-pallino', 'aria-hidden': 'true' }, '+');
        const segno = ui.scelta({
          etichetta: 'Segno di q' + PEDICI[i],
          opzioni: [{ valore: 1, etichetta: '+ positiva' }, { valore: -1, etichetta: '− negativa' }],
          valore: 1,
          cambia: (v) => cambiaCarica(i, v * Math.abs(c.q)),
        });
        const opzioni = segno.el.querySelectorAll('label');
        opzioni[0].classList.add('car-op-pos');
        opzioni[1].classList.add('car-op-neg');
        const intensita = ui.cursore({
          etichetta: 'Intensità di q' + PEDICI[i], min: 1, max: 5, passo: 1, valore: Math.abs(c.q), grandezza: 'q',
          formato: UC, cambia: (v) => cambiaCarica(i, Math.sign(c.q) * v),
        });
        schede.append(h('div', { class: 'car-scheda' },
          h('div', { class: 'car-scheda-testa' }, h('span', { class: 'car-nome' }, pallino, 'q' + PEDICI[i]), segno.el),
          intensita.el));
        return { pallino: pallino };
      });
      const curD = ui.cursore({
        etichetta: 'Distanza tra le cariche', min: D_MIN, max: D_MAX, passo: 0.5, valore: 24, formato: CM,
        cambia: (v) => { const r = impostaDistanza(v); if (Math.abs(r - v) > 1e-6) curD.imposta(r, true); aggiorna(); },
      });
      curD.el.classList.add('car-dist');
      schede.append(h('div', { class: 'car-scheda' },
        h('div', { class: 'car-scheda-testa' }, h('span', { class: 'car-nome dist' }, h('span', { class: 'car-pallino dist', 'aria-hidden': 'true' }, '↔'), 'r'),
          h('span', { class: 'car-suggerimento' }, 'o trascina le cariche')),
        curD.el));
      ctx.comandi.append(schede);
      ctx.su(curD.input, 'change', () => fineMovimento());

      /* --- geometria --- */
      function posa(i, x, y) {
        const c = stato.cariche[i];
        const o = stato.cariche[1 - i];
        const m = margine(i);
        x = EB.clamp(x, m, LARGHEZZA - m);
        y = EB.clamp(y, m, altezza - m);
        const dm = distMinima();
        let dx = x - o.x;
        let dy = y - o.y;
        let d = Math.hypot(dx, dy);
        if (d < dm) {
          if (d < 1e-6) { dx = c.x - o.x || 1; dy = c.y - o.y; d = Math.hypot(dx, dy); }
          x = EB.clamp(o.x + dx / d * dm, m, LARGHEZZA - m);
          y = EB.clamp(o.y + dy / d * dm, m, altezza - m);
          if (Math.hypot(x - o.x, y - o.y) < dm - 1e-6) return false;
        }
        c.x = x;
        c.y = y;
        return true;
      }

      // Porta le cariche alla distanza r lungo la loro congiungente, tenendo fermo il centro se c'è posto.
      function impostaDistanza(r) {
        const [a, b] = stato.cariche;
        const d = distanza() || 1;
        const ux = (b.x - a.x) / d;
        const uy = (b.y - a.y) / d;
        const m = Math.max(margine(0), margine(1));
        const rx = Math.abs(ux) > 1e-6 ? (LARGHEZZA - 2 * m) / Math.abs(ux) : Infinity;
        const ry = Math.abs(uy) > 1e-6 ? (altezza - 2 * m) / Math.abs(uy) : Infinity;
        r = EB.clamp(r, distMinima(), Math.min(rx, ry));
        const cx = EB.clamp((a.x + b.x) / 2, m + Math.abs(ux) * r / 2, LARGHEZZA - m - Math.abs(ux) * r / 2);
        const cy = EB.clamp((a.y + b.y) / 2, m + Math.abs(uy) * r / 2, altezza - m - Math.abs(uy) * r / 2);
        a.x = cx - ux * r / 2;
        a.y = cy - uy * r / 2;
        b.x = cx + ux * r / 2;
        b.y = cy + uy * r / 2;
        return r;
      }

      /* --- disegno --- */
      function preparaSfondo() {
        sfondo.width = tela.canvas.width;
        sfondo.height = tela.canvas.height;
        const g = sfondo.getContext('2d');
        g.setTransform(tela.dpr, 0, 0, tela.dpr, 0, 0);
        g.lineWidth = 1;
        const riga = (x0, y0, x1, y1, forte) => {
          g.strokeStyle = forte ? 'rgba(150, 200, 180, 0.085)' : 'rgba(150, 200, 180, 0.045)';
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.stroke();
        };
        for (let x = 5; x < LARGHEZZA; x += 5) riga(Math.round(x * scala) + 0.5, 0, Math.round(x * scala) + 0.5, alto, x % 10 === 0);
        const y0 = altezza / 2;
        for (let k = -Math.floor(y0 / 5); y0 + k * 5 < altezza; k++) {
          const y = Math.round((y0 + k * 5) * scala) + 0.5;
          riga(0, y, w, y, k % 2 === 0);
        }
      }

      function disegnaRighello() {
        const x0 = 5 * scala;
        const y = alto - 14;
        let d = 'M' + x0 + ' ' + y + 'h' + (10 * scala).toFixed(1);
        for (let k = 0; k <= 10; k++) d += 'M' + (x0 + k * scala).toFixed(1) + ' ' + y + 'v' + (k % 5 ? -3 : -7);
        righello.replaceChildren(s('path', { d: d }), s('text', { x: (x0 + 10 * scala + 8).toFixed(1), y: y + 4 }, '10 cm'));
      }

      function tracciato(lista, limite) {
        const p = new Path2D();
        lista.forEach((l) => {
          const n = Math.min(l.n, Math.floor(limite / CAMPIONE) + 1);
          if (n < 2) return;
          p.moveTo(l.xs[0], l.ys[0]);
          for (let k = 1; k < n; k++) p.lineTo(l.xs[k], l.ys[k]);
        });
        return p;
      }

      function puntini(t, limite, alfa) {
        g2.fillStyle = 'rgba(238, 247, 243, ' + (0.85 * alfa).toFixed(3) + ')';
        g2.beginPath();
        linee.forEach((l, j) => {
          const fine = Math.min(l.L, limite);
          for (let d = (((j * 0.618) % 1) * SPAZIO + t * VELOCITA) % SPAZIO; d < fine; d += SPAZIO) {
            const k = Math.round(d / CAMPIONE);
            const x = l.xs[k];
            const y = l.ys[k];
            if (x < -3 || y < -3 || x > w + 3 || y > alto + 3) continue;
            g2.moveTo(x + 1.6, y);
            g2.arc(x, y, 1.6, 0, 2 * Math.PI);
          }
        });
        g2.fill();
      }

      // Senza movimento: una punta di freccia ferma su ogni linea indica il verso.
      function versi() {
        g2.strokeStyle = 'rgba(228, 241, 236, 0.75)';
        g2.lineWidth = 1.5;
        g2.beginPath();
        linee.forEach((l) => {
          if (l.n < 4) return;
          let d = l.L / 2;
          if (l.daCarica && !l.aCarica) d = Math.min(d, 72);
          else if (!l.daCarica) d = Math.max(d, l.L - 72);
          const k = EB.clamp(Math.round(d / CAMPIONE), 1, l.n - 2);
          const dx = l.xs[k + 1] - l.xs[k - 1];
          const dy = l.ys[k + 1] - l.ys[k - 1];
          const m = Math.hypot(dx, dy) || 1;
          const ux = dx / m;
          const uy = dy / m;
          const x = l.xs[k];
          const y = l.ys[k];
          g2.moveTo(x - ux * 4.5 - uy * 4, y - uy * 4.5 + ux * 4);
          g2.lineTo(x + ux * 1.5, y + uy * 1.5);
          g2.lineTo(x - ux * 4.5 + uy * 4, y - uy * 4.5 - ux * 4);
        });
        g2.stroke();
      }

      function disegnaTela(t) {
        g2.clearRect(0, 0, w, alto);
        g2.drawImage(sfondo, 0, 0, w, alto);
        const limite = crescita >= 1 ? Infinity : (1 - Math.pow(1 - crescita, 3)) * 1100;
        g2.lineWidth = 1.15;
        if (vecchie) {
          g2.strokeStyle = 'rgba(205, 226, 218, ' + (0.32 * vecchie.alfa).toFixed(3) + ')';
          g2.stroke(vecchie.percorso);
        }
        const alfa = vecchie ? 1 - vecchie.alfa : 1;
        if (!percorso || limite !== percorsoFino) { percorso = tracciato(linee, limite); percorsoFino = limite; }
        g2.strokeStyle = 'rgba(205, 226, 218, ' + (0.32 * alfa).toFixed(3) + ')';
        g2.stroke(percorso);
        if (ridotto) versi();
        else puntini(t, limite, alfa);
      }

      function disegnaSvg() {
        const P = vista.map((v) => ({ x: v.x * scala, y: v.y * scala, r: v.r * (1 + v.pop) }));
        const d = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) || 1;
        const ux = (P[1].x - P[0].x) / d;
        const uy = (P[1].y - P[0].y) / d;
        // normale alla congiungente, rivolta in basso (o a destra se la coppia è quasi verticale)
        let nx = -uy;
        let ny = ux;
        if (ny < -0.2 || (Math.abs(ny) <= 0.2 && nx < 0)) { nx = -nx; ny = -ny; }
        vista.forEach((v, i) => {
          const n = nodi[i];
          const p = P[i];
          const q = stato.cariche[i].q;
          n.g.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');
          n.corpo.setAttribute('transform', 'scale(' + (p.r / 10).toFixed(4) + ')');
          n.sfere[0].setAttribute('opacity', (1 - v.mix).toFixed(3));
          n.sfere[1].setAttribute('opacity', v.mix.toFixed(3));
          n.anello.setAttribute('r', (p.r + 6).toFixed(2));
          const forzaAlone = 0.5 + 0.1 * Math.abs(q);
          n.alone.forEach((a, k) => {
            a.setAttribute('cx', p.x.toFixed(2));
            a.setAttribute('cy', p.y.toFixed(2));
            a.setAttribute('r', (p.r * 3.2).toFixed(2));
            a.setAttribute('opacity', ((k ? v.mix : 1 - v.mix) * forzaAlone).toFixed(3));
          });
          // freccia della forza, sempre sul lato esterno della coppia
          const ox = i ? ux : -ux;
          const oy = i ? uy : -uy;
          const ex = p.x + ox * (p.r + 5);
          const ey = p.y + oy * (p.r + 5);
          let posto = Infinity;
          if (ox > 1e-6) posto = Math.min(posto, (w - 3 - ex) / ox);
          if (ox < -1e-6) posto = Math.min(posto, (3 - ex) / ox);
          if (oy > 1e-6) posto = Math.min(posto, (alto - 3 - ey) / oy);
          if (oy < -1e-6) posto = Math.min(posto, (3 - ey) / oy);
          const L = Math.min(Math.abs(v.freccia), Math.max(posto, 12));
          if (L < 3) n.freccia.setAttribute('opacity', '0');
          else {
            const fuori = v.freccia >= 0;
            const tx = fuori ? ex : ex + ox * L;
            const ty = fuori ? ey : ey + oy * L;
            const ang = Math.atan2(fuori ? oy : -oy, fuori ? ox : -ox) * 180 / Math.PI;
            n.freccia.setAttribute('opacity', '1');
            n.freccia.setAttribute('d', frecciaD(L));
            n.freccia.setAttribute('transform', 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') rotate(' + ang.toFixed(2) + ')');
          }
          // etichetta sotto la carica; se esce dal banco va dall'altra parte
          const scosta = d < 58 ? (58 - d) / 2 * (i ? 1 : -1) : 0;
          const via = p.r + 10 + Math.abs(nx) * 24 + Math.abs(ny) * 15;
          let lx = p.x + nx * via + ux * scosta;
          let ly = p.y + ny * via + uy * scosta;
          if (ly + 16 > alto - 2 || ly - 14 < 2 || lx < 22 || lx > w - 22) {
            lx = 2 * p.x - lx + 2 * ux * scosta;
            ly = 2 * p.y - ly + 2 * uy * scosta;
          }
          n.et.setAttribute('transform', 'translate(' + EB.clamp(lx, 24, w - 24).toFixed(1) + ' ' + EB.clamp(ly - 2, 14, alto - 18).toFixed(1) + ')');
        });
        // misura della distanza: tratteggio tra i centri, valore sopra
        misuraLinea.setAttribute('x1', P[0].x.toFixed(2));
        misuraLinea.setAttribute('y1', P[0].y.toFixed(2));
        misuraLinea.setAttribute('x2', P[1].x.toFixed(2));
        misuraLinea.setAttribute('y2', P[1].y.toFixed(2));
        const testo = 'r = ' + CM(Math.hypot(vista[1].x - vista[0].x, vista[1].y - vista[0].y));
        if (misuraTesto.textContent !== testo) misuraTesto.textContent = testo;
        const larga = testo.length * 7.4 + 18;
        const off = Math.max(P[0].r, P[1].r) + 16;
        let mx = (P[0].x + P[1].x) / 2 - nx * off;
        let my = (P[0].y + P[1].y) / 2 - ny * off;
        if (my < 14 || mx < larga / 2 + 4 || mx > w - larga / 2 - 4) { mx += 2 * nx * off; my += 2 * ny * off; }
        mx = EB.clamp(mx, larga / 2 + 4, w - larga / 2 - 4);
        my = EB.clamp(my, 14, alto - 30);
        misuraFondo.setAttribute('x', (mx - larga / 2).toFixed(1));
        misuraFondo.setAttribute('y', (my - 11).toFixed(1));
        misuraFondo.setAttribute('width', larga.toFixed(1));
        misuraTesto.setAttribute('x', mx.toFixed(1));
        misuraTesto.setAttribute('y', (my + 4.5).toFixed(1));
      }

      function disegna(t) {
        const cariche = vista.map((v, i) => ({ x: v.x * scala, y: v.y * scala, q: stato.cariche[i].q, r: raggio(stato.cariche[i].q) }));
        const nuova = cariche.map((c) => c.x.toFixed(1) + ',' + c.y.toFixed(1) + ',' + c.q).join(';') + ';' + w + 'x' + alto;
        if (nuova !== firma) {
          firma = nuova;
          linee = tracciaLinee(cariche, w, alto);
          percorso = null;
        }
        disegnaTela(t || 0);
        disegnaSvg();
      }

      // Mostra subito lo stato vero (movimento ridotto, ridimensionamenti).
      function allinea() {
        vista.forEach((v, i) => {
          const c = stato.cariche[i];
          v.x = c.x;
          v.y = c.y;
          v.r = raggio(c.q);
          v.vr = 0;
          v.pop = 0;
          v.vpop = 0;
          v.mix = c.q > 0 ? 0 : 1;
          v.freccia = bersaglioFreccia();
        });
      }

      function bersaglioFreccia() {
        const f = forza();
        const L = 18 + 26 * Math.log10(Math.abs(f) / 0.03);
        const k = EB.clamp(w / 760, 0.62, 1);
        return Math.sign(f) * EB.clamp(L, 12, 125) * k;
      }

      const ciclo = ridotto ? null : ctx.ciclo((dt, t) => {
        const kPos = 1 - Math.exp(-dt * (presa ? 30 : 11));
        const kLento = 1 - Math.exp(-dt * 9);
        const fT = bersaglioFreccia();
        vista.forEach((v, i) => {
          const c = stato.cariche[i];
          v.x += (c.x - v.x) * kPos;
          v.y += (c.y - v.y) * kPos;
          if (Math.abs(c.x - v.x) + Math.abs(c.y - v.y) < 1e-3) { v.x = c.x; v.y = c.y; }
          v.vr += (-180 * (v.r - raggio(c.q)) - 16 * v.vr) * dt;
          v.r += v.vr * dt;
          v.vpop += (-260 * v.pop - 13 * v.vpop) * dt;
          v.pop += v.vpop * dt;
          v.mix += ((c.q > 0 ? 0 : 1) - v.mix) * kLento;
          v.freccia += (fT - v.freccia) * kLento;
        });
        if (crescita < 1) crescita = Math.min(1, crescita + dt / 1.3);
        if (vecchie) {
          vecchie.alfa *= Math.exp(-dt * 6);
          if (vecchie.alfa < 0.02) vecchie = null;
        }
        disegna(t);
      });

      /* --- stato, sfide e note --- */
      function aggiornaLetture() {
        const r = distanza();
        const f = forza();
        const [a, b] = stato.cariche;
        lR.imposta(CM(r));
        lF.imposta(N(f));
        lTipo.imposta(f > 0 ? 'respingono' : 'attirano');
        formula.imposta([
          ['F', 'f'], ' = ', ['k'], ' · ', ['q₁', 'q'], ' · ', ['q₂', 'q'], ' / ', ['r'], '²', h('br'),
          '= 8,99·10⁹ · ', ['(' + conSegno(a.q) + ')', 'q'], ' · ', ['(' + conSegno(b.q) + ')', 'q'], ' / (' + num(r / 100, 3) + NBSP + 'm)²', h('br'),
          '= ', [(f < 0 ? '−' : '') + N(f), 'f'],
        ]);
        curD.imposta(r, true);
      }

      function aggiorna() {
        aggiornaLetture();
        if (ridotto) { allinea(); disegna(); }
      }

      function etichettaCarica(i) {
        const q = stato.cariche[i].q;
        return 'Carica q' + PEDICI[i] + ': ' + (q > 0 ? 'positiva' : 'negativa') + ', ' + num(Math.abs(q), 0) + ' microcoulomb. Trascinala, oppure usa le frecce per spostarla (con Maiusc a passi lunghi).';
      }

      function descrizione() {
        const [a, b] = stato.cariche;
        const f = forza();
        const nome = (q) => (q > 0 ? 'positiva' : 'negativa') + ' da ' + UC(q);
        return 'Banco largo 50 cm con due cariche: q₁ ' + nome(a.q) + ' e q₂ ' + nome(b.q) + ', a ' + CM(distanza()) + ' di distanza. Si ' + (f > 0 ? 'respingono' : 'attirano') + ' con una forza di ' + N(f) + '. Le linee del campo escono dalle cariche positive ed entrano in quelle negative.';
      }

      let notato = null;
      let ultimaNota = '';
      function istantanea() {
        return { q: stato.cariche.map((c) => c.q), r: distanza(), f: forza() };
      }

      function nota() {
        const ora = istantanea();
        const prima = notato;
        const [qa, qb] = ora.q;
        let testo = null;
        const cambiate = [0, 1].filter((i) => prima.q[i] !== ora.q[i]);
        const stesseCariche = cambiate.length === 0;
        const segniCambiati = Math.sign(prima.q[0]) !== Math.sign(qa) || Math.sign(prima.q[1]) !== Math.sign(qb);
        const spostate = CM(ora.r) !== CM(prima.r);
        if (dimezzata) {
          const fPrima = coulomb(qa, qb, dimezzata.da);
          const fDopo = coulomb(qa, qb, dimezzata.a);
          testo = 'Hai **dimezzato la distanza**, da **' + CM(dimezzata.da) + '** a **' + CM(dimezzata.a) + '**: la forza è diventata circa **4 volte** più grande, da **' + N(fPrima) + '** a **' + N(fDopo) + '** (×' + num(fDopo / fPrima, 1) + '). È la legge dell\'inverso del quadrato: `F = k · q₁ · q₂ / r²`.';
        } else if (stesseCariche && spostate) {
          // rapporto tra le distanze come si leggono: il suo quadrato è il fattore della forza
          const r0 = Math.round(prima.r * 10) / 10;
          const r1 = Math.round(ora.r * 10) / 10;
          const vicine = r1 < r0;
          const fattore = Math.pow(Math.max(r0, r1) / Math.min(r0, r1), 2);
          testo = 'Distanza da **' + CM(prima.r) + '** a **' + CM(ora.r) + '**: la forza passa da **' + N(prima.f) + '** a **' + N(ora.f) + '**, cioè (' +
            num(Math.max(r0, r1), 1) + ' / ' + num(Math.min(r0, r1), 1) + ')² = ' + num(fattore, 2) + ' volte ' + (vicine ? 'più grande.' : 'più piccola.');
          if (fattore >= 1.1) testo += (vicine ? ' Più vicine, ' : ' Più lontane, ') + (fattore >= 1.5 ? 'molto ' : '') + (vicine ? 'più forte.' : 'più debole.');
        } else if (segniCambiati && !spostate) {
          if (qa * qb < 0) {
            testo = 'Segni **opposti**: le cariche si **attirano**, con **' + N(ora.f) + '**. ';
            testo += Math.abs(qa) === Math.abs(qb) ? 'Le linee del campo partono dalla carica positiva e finiscono su quella negativa.'
              : 'Molte linee del campo vanno dalla carica positiva a quella negativa; le altre, dovute alla carica più grande, si perdono lontano.';
          } else if (qa < 0) testo = 'Due cariche **negative** si respingono proprio come due positive, con **' + N(ora.f) + '**: conta solo se i segni sono uguali o diversi. Ora le linee arrivano da lontano ed entrano nelle cariche.';
          else testo = 'Due cariche **positive** si respingono, con **' + N(ora.f) + '**. Le linee del campo escono da entrambe e si allontanano.';
        } else if (cambiate.length === 1 && !spostate) {
          const i = cambiate[0];
          const k = Math.abs(ora.q[i] / prima.q[i]);
          testo = 'q' + PEDICI[i] + ' da **' + UC(prima.q[i]) + '** a **' + UC(ora.q[i]) + '** (×' + num(k, k % 1 ? 2 : 0) + '): la forza cambia dello stesso fattore, da **' + N(prima.f) + '** a **' + N(ora.f) + '**. Più carica, più linee di campo.';
          if (Math.abs(qa) !== Math.abs(qb)) testo += ' Le due frecce restano uguali: q₁ agisce su q₂ con la stessa forza con cui q₂ agisce su q₁.';
        } else if (!stesseCariche || spostate) {
          testo = 'Con q₁ = **' + conSegno(qa) + '** e q₂ = **' + conSegno(qb) + '** a **' + CM(ora.r) + '** le cariche si ' + (ora.f > 0 ? 'respingono' : 'attirano') + ' con **' + N(ora.f) + '**.';
        }
        dimezzata = null;
        if (!testo) return;
        const fa = Math.abs(ora.f);
        if (fa >= 0.95 && fa <= 1.05) testo += ' Circa **1 newton**: più o meno il peso di un oggetto da 100 g, come una mela piccola.';
        notato = ora;
        if (testo === ultimaNota) return;
        ultimaNota = testo;
        ctx.nota(testo);
        tela.canvas.setAttribute('aria-label', descrizione());
      }

      function programmaNota() {
        clearTimeout(timerNota);
        timerNota = setTimeout(nota, 350);
      }
      ctx.pulizia(() => clearTimeout(timerNota));

      function controllaNewton() {
        const f = Math.abs(forza());
        if (f >= 0.95 && f <= 1.05) ctx.completa('un-newton');
      }

      // Fine di un trascinamento, di un passo con le frecce o di un movimento del cursore.
      function fineMovimento() {
        const r = distanza();
        let migliore = null;
        storico.forEach((r0) => {
          const k = r / r0;
          if (k >= 0.475 && k <= 0.525 && (migliore === null || Math.abs(k - 0.5) < Math.abs(r / migliore - 0.5))) migliore = r0;
        });
        // vale solo l'ultimo movimento: un dimezzamento superato con altri passi non resta nella nota
        dimezzata = migliore === null ? null : { da: migliore, a: r };
        if (dimezzata) ctx.completa('quadruplo');
        storico.push(r);
        if (storico.length > 80) storico.shift();
        controllaNewton();
        programmaNota();
      }

      function cambiaCarica(i, q) {
        const c = stato.cariche[i];
        if (q === c.q) return;
        const giro = Math.sign(q) !== Math.sign(c.q);
        c.q = q;
        if (distanza() < distMinima()) impostaDistanza(distMinima());
        storico = [distanza()];
        dimezzata = null;
        nodi[i].segno.textContent = q > 0 ? '+' : '−';
        comandiCarica[i].pallino.textContent = q > 0 ? '+' : '−';
        comandiCarica[i].pallino.classList.toggle('neg', q < 0);
        nodi[i].g.setAttribute('aria-label', etichettaCarica(i));
        nodi[i].valore.textContent = conSegno(q);
        if (!ridotto) {
          vista[i].vpop += giro ? 3.2 : 1.6;
          vecchie = { percorso: tracciato(linee, Infinity), alfa: 1 };
        }
        if (Math.sign(stato.cariche[0].q) !== Math.sign(stato.cariche[1].q)) ctx.completa('opposte');
        controllaNewton();
        aggiorna();
        programmaNota();
      }

      /* --- trascinamento --- */
      nodi.forEach((n, i) => {
        const via = EB.trascina(n.g, {
          svg: svg,
          passo: 1,
          etichetta: etichettaCarica(i),
          inizio() {
            presa = { i: i, dx: null, dy: 0 };
            banco.classList.add('car-trascinando');
          },
          muovi(x, y) {
            const c = stato.cariche[i];
            if (!presa) presa = { i: i, dx: null, dy: 0 };
            if (presa.dx === null) { presa.dx = c.x - x / scala; presa.dy = c.y - y / scala; }
            if (posa(i, x / scala + presa.dx, y / scala + presa.dy)) aggiorna();
          },
          sposta(dx, dy) {
            const c = stato.cariche[i];
            if (posa(i, c.x + dx * PASSO_TASTO, c.y + dy * PASSO_TASTO)) aggiorna();
          },
          fine() {
            presa = null;
            banco.classList.remove('car-trascinando');
            fineMovimento();
          },
        });
        ctx.pulizia(via);
        n.valore.textContent = conSegno(stato.cariche[i].q);
      });

      /* --- dimensioni del banco --- */
      function ridimensiona(ww, hh) {
        const primo = !posate;
        w = ww;
        alto = hh;
        scala = w / LARGHEZZA;
        grandezzaSfere = EB.clamp(w / 620, 1, 1.25);
        altezza = alto / scala;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + alto);
        if (!posate) {
          stato.cariche.forEach((c) => { c.y = altezza / 2; });
          posate = true;
        } else {
          stato.cariche.forEach((c, i) => posa(i, c.x, c.y));
        }
        preparaSfondo();
        disegnaRighello();
        firma = '';
        aggiornaLetture();
        if (ridotto || !primo) allinea();
        else vista.forEach((v, i) => { v.x = stato.cariche[i].x; v.y = stato.cariche[i].y; });
        disegna();
      }
      tela.alRidimensiona = ridimensiona;
      ridimensiona(tela.w, tela.h);

      storico = [distanza()];
      notato = istantanea();
      tela.canvas.setAttribute('aria-label', descrizione());
      if (ciclo) ciclo.avvia();
      ctx.nota('Due cariche positive da **2 µC** a **' + CM(distanza()) + '**: si respingono con **' + N(forza()) + '**. Trascinane una con il dito o il mouse, oppure selezionala con Tab e usa le frecce.');
    },
  });
})();
