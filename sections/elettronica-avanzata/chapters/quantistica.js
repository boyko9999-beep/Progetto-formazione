/*
 * Capitolo 10 · La frontiera quantistica (superconduttori, spintronica e qubit).
 * Animazione in tre atti: la resistenza del mercurio che crolla a zero, le coppie
 * di Cooper e lo SQUID; una valvola di spin che legge i bit di un disco; un qubit
 * sulla sfera di Bloch fra porte, misura e decoerenza.
 * Laboratorio: un qubit da pilotare con porte, attese e misure ripetute.
 */
(function (root) {
  'use strict';

  const EA = root.EA;
  const TAU = Math.PI * 2;
  const TINT = '#7aa2ff';

  /* ---------- modello ---------- */

  // Costanti esatte del SI (dal 2019).
  const H = 6.62607015e-34; // costante di Planck, J·s
  const QE = 1.602176634e-19; // carica elementare, C
  const KB = 1.380649e-23; // costante di Boltzmann, J/K
  const PHI0 = H / (2 * QE); // quanto di flusso magnetico, Wb
  const TC_HG = 4.15; // temperatura critica del mercurio, K

  // Resistenza del mercurio in unità di quella normale appena sopra la transizione.
  // Sopra Tc cresce piano con T, la transizione è larga pochi centesimi di kelvin,
  // sotto Tc la resistenza in corrente continua è esattamente zero.
  function resistance(T, Tc, width) {
    const tc = Tc == null ? TC_HG : Tc;
    const w = width || 0.012;
    if (T <= tc - 8 * w) return 0;
    return (1 + 0.06 * (T - tc)) / (1 + Math.exp(-(T - tc) / w));
  }

  // Gap della teoria BCS (J) e frequenza dei fotoni che spezzano una coppia (2Δ/h).
  const gap = (Tc) => 1.764 * KB * Tc;
  const pairBreakFreq = (Tc) => (2 * gap(Tc)) / H;

  // Quanti di flusso in una spira di area A (m²) nel campo B (T).
  const fluxQuanta = (B, A) => (B * A) / PHI0;
  // Effetto Josephson in alternata: con una tensione V la supercorrente oscilla a f = 2eV/h.
  const josephsonFreq = (V) => (2 * QE * V) / H;
  // SQUID in continua simmetrico (induttanza trascurabile): corrente critica relativa
  // in funzione del flusso misurato in quanti Φ0; si ripete con periodo 1.
  const squidIc = (phi) => Math.abs(Math.cos(Math.PI * phi));

  // Valvola di spin, modello a due canali di spin in parallelo. Ogni strato magnetico
  // vale 1 per gli elettroni con spin parallelo alla sua magnetizzazione e alpha (> 1)
  // per gli altri; i due strati di ogni canale sono in serie.
  function valve(alpha, parallel) {
    const up = parallel ? 2 : 1 + alpha;
    const down = parallel ? 2 * alpha : 1 + alpha;
    return (up * down) / (up + down);
  }
  // Magnetoresistenza (R_AP − R_P)/R_P, che vale (α − 1)²/(4α).
  const gmr = (alpha) => valve(alpha, false) / valve(alpha, true) - 1;
  // Resistenza con un angolo θ fra le due magnetizzazioni.
  const valveR = (theta, alpha) => {
    const rp = valve(alpha, true);
    return rp + (valve(alpha, false) - rp) * (1 - Math.cos(theta)) / 2;
  };

  // Energia di un quanto (J), temperatura equivalente (K) e probabilità che il calore
  // trovi il qubit in |1⟩ all'equilibrio termico (sistema a due livelli).
  const quantumEnergy = (f) => H * f;
  const equivTemp = (f) => (H * f) / KB;
  const thermalP1 = (f, T) => 1 / (1 + Math.exp((H * f) / (KB * T)));

  // Qubit: vettore di Bloch [x, y, z], lungo 1 per uno stato puro, meno per uno misto.
  const bloch = (theta, phi) => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
  const len = (v) => Math.hypot(v[0], v[1], v[2]);

  // Angoli della direzione del vettore: θ dal polo nord (0…π), φ attorno a z (0…2π).
  // Ai poli φ non è definita; al centro della sfera nessuno dei due.
  function angles(v) {
    const r = len(v);
    if (r < 1e-9) return { theta: NaN, phi: NaN };
    const theta = Math.acos(Math.min(1, Math.max(-1, v[2] / r)));
    const phi = Math.hypot(v[0], v[1]) < 1e-7 * r ? NaN : (Math.atan2(v[1], v[0]) + TAU) % TAU;
    return { theta, phi };
  }

  // Rotazione di v attorno all'asse unitario n di un angolo a (formula di Rodrigues).
  function rotate(v, n, a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const d = (n[0] * v[0] + n[1] * v[1] + n[2] * v[2]) * (1 - c);
    return [
      v[0] * c + (n[1] * v[2] - n[2] * v[1]) * s + n[0] * d,
      v[1] * c + (n[2] * v[0] - n[0] * v[2]) * s + n[1] * d,
      v[2] * c + (n[0] * v[1] - n[1] * v[0]) * s + n[2] * d,
    ];
  }

  // Le porte a un qubit sono rotazioni della sfera (a meno di una fase globale).
  const R2 = Math.SQRT1_2;
  const GATES = {
    X: { axis: [1, 0, 0], angle: Math.PI },
    Y: { axis: [0, 1, 0], angle: Math.PI },
    Z: { axis: [0, 0, 1], angle: Math.PI },
    H: { axis: [R2, 0, R2], angle: Math.PI },
    S: { axis: [0, 0, 1], angle: Math.PI / 2 },
    T: { axis: [0, 0, 1], angle: Math.PI / 4 },
    Rx: { axis: [1, 0, 0] },
    Ry: { axis: [0, 1, 0] },
  };
  // Porta come { axis, angle }: Rx e Ry usano l'angolo dato, in radianti.
  function gate(name, angle) {
    const g = GATES[name];
    return { axis: g.axis, angle: g.angle != null ? g.angle : angle };
  }
  const applyGate = (v, name, angle) => { const g = gate(name, angle); return rotate(v, g.axis, g.angle); };

  // Perdita di fase (T2): la parte orizzontale del vettore si accorcia come e^(−t/T2),
  // la componente z resta uguale. Il rilassamento T1 qui è trascurato.
  function dephase(v, t, T2) {
    const k = Math.exp(-t / T2);
    return [v[0] * k, v[1] * k, v[2]];
  }

  // Esegue un circuito a partire da |0⟩ (o da |1⟩ dopo una misura):
  // porte { g, a } e attese { wait } in secondi.
  function run(ops, T2, start) {
    let v = [0, 0, start === 1 ? -1 : 1];
    for (const op of ops) v = op.wait != null ? dephase(v, op.wait, T2) : applyGate(v, op.g, op.a);
    return v;
  }

  // P(0) = (1 + z)/2: vale anche per gli stati misti, con il vettore più corto di 1.
  const prob0 = (v) => Math.min(1, Math.max(0, (1 + v[2]) / 2));

  // Ampiezze, definite solo per uno stato puro e a meno di una fase globale:
  // α = cos(θ/2) reale e non negativa, β = e^(iφ)·sin(θ/2). Stato misto: null.
  function amplitudes(v) {
    if (Math.abs(len(v) - 1) > 1e-6) return null;
    const a = angles(v);
    return { alpha: Math.cos(a.theta / 2), betaAbs: Math.sin(a.theta / 2), betaPhase: Number.isNaN(a.phi) ? 0 : a.phi };
  }

  // Purezza Tr ρ² = (1 + r²)/2: 1 sulla superficie della sfera, 1/2 al centro.
  const purity = (v) => { const r = Math.min(1, len(v)); return (1 + r * r) / 2; };

  // Generatore pseudocasuale con seme (mulberry32): la stessa sequenza a ogni avvio.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Una misura dà 0 con probabilità P(0). Molte misure: ognuna su una nuova copia
  // preparata nello stesso stato, quindi i risultati sono indipendenti.
  const measure = (v, rand) => (rand() < prob0(v) ? 0 : 1);
  function measureMany(v, n, rand) {
    const counts = [0, 0];
    for (let i = 0; i < n; i++) counts[measure(v, rand)]++;
    return counts;
  }

  const model = {
    H, QE, KB, PHI0, TC_HG, resistance, gap, pairBreakFreq, fluxQuanta, josephsonFreq, squidIc,
    valve, gmr, valveR, quantumEnergy, equivTemp, thermalP1,
    bloch, len, angles, rotate, GATES, gate, applyGate, dephase, run, prob0, amplitudes, purity,
    rng, measure, measureMany,
  };

  /* ---------- aiuti di disegno ---------- */

  const C = EA.colors;
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const NB = '\u00a0'; // spazio che non va a capo
  const deg = (a) => (a * 180) / Math.PI;
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  // Notazione scientifica all'italiana: 2,07·10⁻¹⁵.
  function sci(x, d) {
    const e = Math.floor(Math.log10(Math.abs(x)));
    return EA.fmt(x / Math.pow(10, e), d) + '·10' + String(e).split('').map((c) => SUP[c]).join('');
  }

  // Mescola due colori '#rrggbb' (k = 0 → a, k = 1 → b) e restituisce '#rrggbb'.
  function mix(a, b, k) {
    let out = '#';
    for (let i = 1; i < 7; i += 2) {
      const x = parseInt(a.slice(i, i + 2), 16);
      const y = parseInt(b.slice(i, i + 2), 16);
      out += Math.round(x + (y - x) * EA.clamp(k, 0, 1)).toString(16).padStart(2, '0');
    }
    return out;
  }

  // Riquadro scuro con i bordi arrotondati.
  function box(ctx, x, y, w, h, stroke) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 11, 10, 0.72)';
    ctx.strokeStyle = stroke || C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Testo che va a capo entro maxW pixel; restituisce la y della riga successiva.
  function para(ctx, str, x, y, maxW, o) {
    const size = o.size || 11;
    ctx.save();
    ctx.font = (o.weight || 600) + ' ' + size + 'px ' + MONO;
    const lines = [];
    let line = '';
    for (const word of str.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    ctx.restore();
    const lh = Math.round(size * 1.45);
    lines.forEach((l, i) => EA.draw.text(ctx, l, x, y + i * lh, o));
    return y + lines.length * lh;
  }

  // Legenda: pallino colorato e nome, uno dopo l'altro.
  function legend(ctx, x, y, items, size) {
    ctx.save();
    ctx.font = '600 ' + size + 'px ' + MONO;
    for (const [col, label] of items) {
      EA.draw.dot(ctx, x + 4, y - 4, 3.5, col, false);
      EA.draw.text(ctx, label, x + 12, y, { color: C.text, size });
      x += 28 + ctx.measureText(label).width;
    }
    ctx.restore();
  }

  // Barre delle probabilità di misura P(0) e P(1).
  function probBars(ctx, x, y, w, p0, fs, gap) {
    [['P(0)', p0, TINT], ['P(1)', 1 - p0, C.violet]].forEach(([lab, p, col], i) => {
      const yy = y + i * gap;
      const bx = x + fs * 3.6;
      const bw = w - fs * 3.6 - fs * 5;
      EA.draw.text(ctx, lab, x, yy + 4, { color: C.text, size: fs });
      ctx.fillStyle = '#16231f';
      ctx.fillRect(bx, yy - 6, bw, 11);
      ctx.fillStyle = col;
      ctx.fillRect(bx, yy - 6, bw * p, 11);
      EA.draw.text(ctx, EA.fmt(p * 100, p > 0.001 && p < 0.999 ? 1 : 0) + ' %', x + w, yy + 4, { color: C.ink, size: fs, align: 'right' });
    });
  }

  /* ---------- sfera di Bloch (animazione e laboratorio) ---------- */

  // Camera: azimut e inclinazione della vista. p(v) restituisce [x, y, profondità],
  // con profondità positiva per i punti rivolti verso chi guarda.
  function camera(cx, cy, R, az, el) {
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const ce = Math.cos(el);
    const se = Math.sin(el);
    return {
      cx, cy, R,
      p(v) {
        const right = -v[0] * sa + v[1] * ca;
        const up = -v[0] * se * ca - v[1] * se * sa + v[2] * ce;
        const depth = (v[0] * ca + v[1] * sa) * ce + v[2] * se;
        return [cx + R * right, cy - R * up, depth];
      },
    };
  }

  // o: { v, trail, ghost, ghostAlpha, flash, small }
  function drawSphere(ctx, cam, o) {
    const { cx, cy, R } = cam;
    const fs = o.small ? 10.5 : 12;
    ctx.save();
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, EA.alpha(TINT, 0.12));
    g.addColorStop(1, EA.alpha(TINT, 0.03));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = EA.alpha(TINT, 0.45);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Cerchi massimi: la metà davanti piena, quella dietro tratteggiata.
    const ring = (f, a) => {
      for (const front of [false, true]) {
        ctx.beginPath();
        let open = false;
        for (let i = 0; i <= 72; i++) {
          const q = cam.p(f((i / 72) * TAU));
          if ((q[2] >= 0) === front) {
            if (open) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); open = true; }
          } else open = false;
        }
        ctx.setLineDash(front ? [] : [3, 4]);
        ctx.strokeStyle = EA.alpha(TINT, front ? a : a * 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };
    ring((u) => [Math.cos(u), Math.sin(u), 0], 0.5);
    ring((u) => [Math.cos(u), 0, Math.sin(u)], 0.2);
    ring((u) => [0, Math.cos(u), Math.sin(u)], 0.2);

    // Assi x, y, z.
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = EA.alpha(C.text, 0.4);
    ctx.beginPath();
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((a) => {
      const p = cam.p(a);
      const q = cam.p([-a[0], -a[1], -a[2]]);
      ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const px = cam.p([1.22, 0, 0]);
    const py = cam.p([0, 1.18, 0]);
    EA.draw.text(ctx, 'x', px[0], px[1] + 4, { color: C.dim, size: fs, align: 'center' });
    EA.draw.text(ctx, 'y', py[0] + 4, py[1] + 4, { color: C.dim, size: fs });

    const v = o.v;
    const r = len(v);
    const tip = cam.p(v);

    // Scia: le posizioni recenti della punta, più chiare verso il passato.
    const tr = o.trail || [];
    if (tr.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = o.small ? 2 : 2.6;
      for (let i = 1; i < tr.length; i++) {
        const a = cam.p(tr[i - 1]);
        const b = cam.p(tr[i]);
        ctx.strokeStyle = EA.alpha(TINT, 0.12 + 0.5 * (i / tr.length) * (b[2] < 0 ? 0.6 : 1));
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      ctx.restore();
    }

    // Il vettore prima della misura, che svanisce.
    if (o.ghost && o.ghostAlpha > 0) {
      const gp = cam.p(o.ghost);
      ctx.save();
      ctx.globalAlpha = o.ghostAlpha;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(gp[0], gp[1]); ctx.stroke();
      ctx.restore();
    }

    // Proiezione sull'asse z: P(0) dipende solo dall'altezza della punta.
    const foot = cam.p([0, 0, v[2]]);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = EA.alpha(C.ink, 0.45);
    ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
    ctx.restore();
    EA.draw.dot(ctx, foot[0], foot[1], 2.5, C.ink, false);

    // Il vettore di stato.
    if (r > 0.04) {
      ctx.save();
      ctx.globalAlpha = tip[2] < -0.2 ? 0.75 : 1;
      EA.draw.arrow(ctx, cx, cy, tip[0], tip[1], TINT, o.small ? 2.4 : 3, o.small ? 9 : 12);
      ctx.restore();
    }
    EA.draw.dot(ctx, tip[0], tip[1], o.small ? 3 : 3.8, C.ink);
    if (o.flash > 0) {
      ctx.save();
      ctx.strokeStyle = EA.alpha(C.ink, 0.8 * o.flash);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tip[0], tip[1], 6 + (1 - o.flash) * 26, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // Poli: |0⟩ in alto, |1⟩ in basso.
    const n = cam.p([0, 0, 1]);
    const s = cam.p([0, 0, -1]);
    EA.draw.text(ctx, '|0⟩', n[0], cy - R - 8, { color: C.ink, size: fs + 1, weight: 700, align: 'center' });
    EA.draw.text(ctx, '|1⟩', s[0], cy + R + fs + 6, { color: C.ink, size: fs + 1, weight: 700, align: 'center' });
  }

  /* ---------- animazione principale: tre atti ---------- */

  const BITS = [0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0];
  const ALPHA = 2; // contrasto di spin della valvola: ΔR/R = 12,5 %
  const OUT = [0, 0, 1, 0]; // esiti illustrativi delle quattro misure dell'atto 3
  const PREP = Math.PI / 3; // θ = 60°: P(0) = 75 %
  const Z0 = [0, 0, 1];
  const YAX = [0, 1, 0];
  const T2_ANIM = 2.2; // secondi di animazione per un tempo T2
  const US_PER_S = 45; // microsecondi simulati per secondo: T2 ≈ 100 µs
  const BIT_T = 1.6; // secondi per bit sotto la testina
  const bitAt = (j) => BITS[((j % BITS.length) + BITS.length) % BITS.length];

  // Temperatura del mercurio nel primo passo: da 5 K a 3,4 K, 0,22 K al secondo.
  const tempAt = (k) => (k < 1 ? 5 : Math.max(3.4, 5 - (k - 1) * 0.22));

  // Angolo fra strato libero e strato bloccato mentre i bit scorrono (k in bit passati):
  // lo strato libero si gira nel primo quarto di ogni bit.
  function freeAngle(k) {
    const n = Math.round(k);
    return EA.lerp(bitAt(n - 1) * Math.PI, bitAt(n) * Math.PI, EA.smooth((k - n + 0.5) / 0.25));
  }

  // Passo "sovrapposizione": |0⟩, porta H, poi quattro porte S (un quarto di giro attorno a z).
  function qubitAt(k) {
    if (k < 1.2) return Z0;
    if (k < 3.4) return rotate(Z0, GATES.H.axis, Math.PI * EA.ease.inOut((k - 1.2) / 2.2));
    let phi = 0;
    for (let i = 0; i < 4; i++) phi += (Math.PI / 2) * EA.ease.inOut((k - 4.2 - i * 1.1) / 0.7);
    return [Math.cos(phi), Math.sin(phi), 0];
  }
  // n: versione breve per lo schermo stretto (una sola riga).
  function qubitLabel(k, n) {
    if (k < 1.2) return 'Stato iniziale |0⟩: P(0) = 100 %';
    if (k < 3.4) return n ? 'Porta H: mezzo giro sull\'asse fra x e z' : 'Porta H: mezzo giro attorno all\'asse fra x e z';
    if (k < 4.2) return 'Sovrapposizione: metà 0 e metà 1';
    const i = Math.floor((k - 4.2) / 1.1);
    if (i < 4 && k - 4.2 - i * 1.1 < 0.7) return n ? 'Porta S: un quarto di giro attorno a z' : 'Porta S: un quarto di giro attorno all\'asse z';
    return 'La fase φ cambia, le probabilità no';
  }

  // Passo "misura": quattro copie preparate a θ = 60° e misurate; poi un qubit in |+⟩
  // che perde la fase (T2) mentre gira piano attorno a z.
  function measureAt(k) {
    if (k < 6) {
      const i = Math.floor(k / 1.5);
      const u = k - i * 1.5;
      const prep = rotate(Z0, YAX, PREP * EA.ease.inOut(u / 0.55));
      if (u < 0.8) return { v: prep, t0: i * 1.5 };
      return { v: OUT[i] ? [0, 0, -1] : Z0, t0: i * 1.5 + 0.8, ghost: prep, ghostAlpha: 1 - (u - 0.8) / 0.6, flash: 1 - (u - 0.8) / 0.5 };
    }
    const u = k - 6;
    if (u < 0.6) return { v: rotate(Z0, YAX, (Math.PI / 2) * EA.ease.inOut(u / 0.6)), t0: 6, us: 0 };
    const s = u - 0.6;
    const r = Math.exp(-s / T2_ANIM);
    return { v: [r * Math.cos(TAU * 0.42 * s), r * Math.sin(TAU * 0.42 * s), 0], t0: 6, us: s * US_PER_S };
  }
  function measureLabel(k, n) {
    if (k < 6) {
      const i = Math.floor(k / 1.5);
      if (k - i * 1.5 < 0.8) return 'Copia ' + (i + 1) + ': rotazione di 60°, P(0) = 75 %';
      return 'Misura: esce ' + OUT[i] + ', il qubit ora è |' + OUT[i] + '⟩';
    }
    if (k < 6.6) return 'Nuovo qubit in |+⟩, sull\'equatore';
    return n ? 'Decoerenza (T₂): la freccia si accorcia' : 'La fase gira e si disperde (T₂): la freccia si accorcia';
  }

  function mountHero(view, api) {
    view.classList.add('qb-stage');
    const cv = api.canvas(view, { label: 'Animazione in tre atti. Primo: raffreddando il mercurio la resistenza crolla a zero sotto 4,2 kelvin; gli elettroni, che prima urtavano il reticolo, scorrono in coppie di Cooper, attraversano una giunzione Josephson e in uno SQUID danno una corrente che si ripete a ogni quanto di flusso. Secondo: una valvola di spin legge i bit di un disco, con resistenza bassa se gli strati magnetici sono paralleli e alta se sono antiparalleli. Terzo: un qubit sulla sfera di Bloch, ruotato dalle porte H e S, misurato e accorciato dalla decoerenza.' });
    const STAGES = [
      { key: 'zero', dur: 11, still: 9.5 },
      { key: 'cooper', dur: 11, still: 7 },
      { key: 'spin', dur: 13, still: 9.6 },
      { key: 'qubit', dur: 10, still: 6.2 },
      { key: 'misura', dur: 13, still: 9.6 },
    ];
    const HEAD = [
      ['Atto 1 · Superconduttività', 'La resistenza del mercurio crolla a zero'],
      ['Atto 1 · Superconduttività', 'Coppie di Cooper e giunzione Josephson'],
      ['Atto 2 · Spintronica', 'Lo spin come bit: la valvola di spin'],
      ['Atto 3 · Qubit', 'Un qubit in sovrapposizione'],
      ['Atto 3 · Qubit', 'Misura e decoerenza'],
    ];
    const rand = rng(11);
    let stage = 0;
    let stageT = api.reduced ? STAGES[0].still : 0;
    let els = [];
    let elKey = '';
    let paired = false;
    let scVis = 0;
    let lanes = [];
    let laneKey = '';

    function geo() {
      const w = cv.w;
      const h = cv.h;
      const narrow = w < 560;
      const stack = narrow || h > w * 0.8;
      const pad = narrow ? 12 : 18;
      const top = narrow ? 54 : 62;
      let A;
      let B;
      if (stack) {
        const mid = top + (h - top - pad) * 0.5;
        A = { x: pad, y: top, w: w - 2 * pad, h: mid - top - 5 };
        B = { x: pad, y: mid + 5, w: w - 2 * pad, h: h - pad - mid - 5 };
      } else {
        const split = Math.round(w * 0.55);
        A = { x: pad, y: top, w: split - pad - 8, h: h - top - pad };
        B = { x: split + 8, y: top, w: w - split - 8 - pad, h: h - top - pad };
      }
      return { w, h, narrow, stack, pad, top, fs: narrow ? 10.5 : 11, A, B };
    }

    function header(ctx, g) {
      const hd = HEAD[stage];
      EA.draw.text(ctx, hd[0].toUpperCase(), g.pad, 24, { color: TINT, size: 11, weight: 700 });
      // Sui telefoni più stretti il titolo si rimpicciolisce fino a stare nella riga.
      let ts = g.narrow ? 12 : 13;
      ctx.save();
      ctx.font = '700 ' + ts + 'px ' + MONO;
      const tw = ctx.measureText(hd[1]).width;
      ctx.restore();
      if (tw > g.w - 2 * g.pad) ts = Math.max(10.5, ts * (g.w - 2 * g.pad) / tw);
      EA.draw.text(ctx, hd[1], g.pad, 43, { color: C.ink, size: ts, weight: 700 });
      for (let i = 0; i < STAGES.length; i++) {
        const x = g.w - g.pad - 4 - (STAGES.length - 1 - i) * 14;
        ctx.beginPath();
        ctx.arc(x, 20, 4, 0, TAU);
        if (i === stage) { ctx.fillStyle = TINT; ctx.fill(); } else { ctx.strokeStyle = EA.alpha(C.text, 0.55); ctx.lineWidth = 1.2; ctx.stroke(); }
      }
    }

    /* atto 1: elettroni che urtano, coppie che scorrono */

    function seedEls(A, n, sc) {
      const r = rng(5);
      els = [];
      for (let i = 0; i < n; i++) {
        const a = r() * TAU;
        els.push({
          x: A.x + 8 + r() * (A.w - 16), y: A.y + 34 + r() * (A.h - 68),
          vx: sc >= 0.5 ? 48 : Math.cos(a) * 75 + 22, vy: sc >= 0.5 ? 0 : Math.sin(a) * 75, flash: 0, mate: -1,
        });
      }
      paired = false;
    }

    // Ogni elettrone libero si lega al più vicino ancora libero.
    function pairUp() {
      els.forEach((e) => { e.mate = -1; });
      els.forEach((e, i) => {
        if (e.mate >= 0) return;
        let best = -1;
        let bd = Infinity;
        els.forEach((f, j) => {
          const d = Math.hypot(e.x - f.x, e.y - f.y);
          if (j !== i && f.mate < 0 && d < bd) { bd = d; best = j; }
        });
        if (best >= 0) { e.mate = best; els[best].mate = i; }
      });
      paired = true;
    }

    // Sopra Tc: moto disordinato con urti casuali e una piccola deriva (la corrente).
    // Sotto Tc: tutte le coppie si allineano sulla stessa velocità, senza urti.
    function stepEls(dt, sc, A, k) {
      const relax = 1 - Math.exp(-dt * 4);
      const y0 = A.y + 34;
      const y1 = A.y + A.h - 34;
      for (const e of els) {
        if (sc < 0.5) {
          if (rand() < 1.8 * dt) {
            const a = rand() * TAU;
            e.vx = (Math.cos(a) * 75 + 22) * k;
            e.vy = Math.sin(a) * 75 * k;
            e.flash = 1;
          }
        } else {
          e.vx += (48 * k - e.vx) * relax;
          e.vy -= e.vy * relax;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.flash = Math.max(0, e.flash - dt * 2.5);
        if (e.x > A.x + A.w) e.x -= A.w; else if (e.x < A.x) e.x += A.w;
        if (e.y < y0) { e.y = y0; e.vy = Math.abs(e.vy); } else if (e.y > y1) { e.y = y1; e.vy = -Math.abs(e.vy); }
      }
    }

    function drawLattice(ctx, g, A, T, sc, t, junction) {
      const fs = g.fs;
      const y0 = A.y + 30;
      const y1 = A.y + A.h - 30;
      const xb = A.x + A.w / 2;
      box(ctx, A.x, A.y, A.w, A.h);
      ctx.save();
      ctx.beginPath(); ctx.rect(A.x + 1, A.y + 1, A.w - 2, A.h - 2); ctx.clip();
      // Fronti dell'onda collettiva: le coppie si muovono tutte insieme.
      if (sc > 0.02) {
        const lam = 54;
        ctx.strokeStyle = EA.alpha(TINT, 0.08 * sc);
        ctx.lineWidth = 14;
        ctx.beginPath();
        for (let x = A.x - lam + ((t * 48) % lam); x < A.x + A.w + lam; x += lam) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
        ctx.stroke();
      }
      // Ioni del reticolo: vibrano di più a temperatura più alta.
      const s = g.narrow ? 30 : 36;
      const amp = 0.4 + 0.45 * T;
      ctx.fillStyle = '#22322c';
      ctx.strokeStyle = '#4a6359';
      ctx.lineWidth = 1;
      let i = 0;
      for (let y = y0 + s * 0.35; y < y1; y += s) {
        for (let x = A.x + s * 0.5; x < A.x + A.w; x += s) {
          i++;
          ctx.beginPath();
          ctx.arc(x + amp * Math.sin(t * 9 + i * 1.7), y + amp * Math.cos(t * 7.3 + i * 2.3), 4.5, 0, TAU);
          ctx.fill(); ctx.stroke();
        }
      }
      // Giunzione Josephson: una barriera isolante sottile al centro del filo.
      if (junction) {
        ctx.fillStyle = 'rgba(169, 195, 185, 0.2)';
        ctx.fillRect(xb - 7, y0 - 4, 14, y1 - y0 + 8);
        ctx.strokeStyle = 'rgba(169, 195, 185, 0.5)';
        ctx.strokeRect(xb - 7.5, y0 - 4.5, 15, y1 - y0 + 9);
      }
      // Legami delle coppie: lunghi, perché una coppia è molto più grande della distanza fra ioni.
      if (paired && sc > 0.05) {
        ctx.strokeStyle = EA.alpha(TINT, 0.42 * sc);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        els.forEach((e, j) => {
          const m = els[e.mate];
          if (!m || e.mate < j || Math.abs(m.x - e.x) > A.w / 2) return;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.quadraticCurveTo((e.x + m.x) / 2, (e.y + m.y) / 2 - 12, m.x, m.y);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      const col = mix(C.amber, TINT, sc);
      els.forEach((e) => {
        if (e.flash > 0) {
          ctx.strokeStyle = EA.alpha(C.amber, 0.75 * e.flash);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(e.x, e.y, 4 + (1 - e.flash) * 10, 0, TAU); ctx.stroke();
        }
        const tunnel = junction && Math.abs(e.x - xb) < 9;
        if (tunnel) {
          ctx.strokeStyle = EA.alpha(TINT, 0.6);
          ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, TAU); ctx.stroke();
        }
        EA.draw.dot(ctx, e.x, e.y, 3.4, col, !tunnel);
      });
      ctx.restore();

      legend(ctx, A.x + 12, A.y + 19, junction ? [['#5d7a6f', 'ione'], [TINT, 'coppia di Cooper']] : [['#5d7a6f', 'ione'], [C.amber, 'elettrone'], [TINT, 'coppia di Cooper']], fs);
      if (junction) {
        const lab = 'isolante 1–2 nm';
        const ly = g.narrow ? y1 + 3 : A.y + 19;
        ctx.save();
        ctx.font = '600 ' + fs + 'px ' + MONO;
        const tw = ctx.measureText(lab).width;
        ctx.fillStyle = 'rgba(6, 11, 10, 0.9)';
        ctx.fillRect(xb - tw / 2 - 5, ly - fs, tw + 10, fs + 5);
        ctx.restore();
        EA.draw.text(ctx, lab, xb, ly, { color: C.ink, size: fs, align: 'center' });
      }
      const normal = sc < 0.5 && !junction;
      const cap = junction
        ? (g.narrow ? 'le coppie passano per effetto tunnel' : 'le coppie attraversano l\'isolante per effetto tunnel')
        : normal
          ? (g.narrow ? 'sopra Tc: gli elettroni urtano' : 'sopra Tc: gli elettroni urtano impurezze e ioni che vibrano')
          : (g.narrow ? 'sotto Tc: coppie senza urti' : 'sotto Tc: le coppie di Cooper scorrono insieme, senza urti');
      EA.draw.text(ctx, cap, A.x + 12, A.y + A.h - 11, { color: normal ? C.amber : TINT, size: fs, weight: 700 });
    }

    // Curva resistenza-temperatura: si disegna man mano che il mercurio si raffredda.
    function drawRT(ctx, g, B, T) {
      const fs = g.fs;
      const L = B.x + (g.narrow ? 36 : 46);
      const R = B.x + B.w - 16;
      const top = B.y + (g.narrow ? 32 : 40);
      const bot = B.y + B.h - (g.narrow ? 28 : 34);
      const X = (x) => L + ((x - 3) / 2) * (R - L);
      const Y = (r) => bot - (r / 1.25) * (bot - top);
      box(ctx, B.x, B.y, B.w, B.h);
      EA.draw.grid(ctx, L, top, R - L, bot - top, { cols: 4, rows: 5, ticks: false });
      [3, 3.5, 4, 4.5, 5].forEach((x, i) => EA.draw.text(ctx, x.toFixed(1).replace('.', ',') + (i === 4 ? ' K' : ''), X(x), bot + 16, { color: C.dim, size: fs, align: i === 4 ? 'right' : 'center' }));
      [0, 0.5, 1].forEach((r) => EA.draw.text(ctx, r.toFixed(1).replace('.', ','), L - 7, Y(r) + 4, { color: C.dim, size: fs, align: 'right' }));
      EA.draw.text(ctx, 'R / R normale', L, top - 12, { color: C.text, size: fs });
      const xc = X(TC_HG);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = EA.alpha(TINT, 0.55);
      ctx.beginPath(); ctx.moveTo(xc, top); ctx.lineTo(xc, bot); ctx.stroke();
      ctx.restore();
      EA.draw.text(ctx, 'Tc ≈ 4,2 K', xc + 6, top + 14, { color: TINT, size: fs, weight: 700 });
      const pts = [];
      for (let x = 5; x > T; x -= 0.005) pts.push([X(x), Y(resistance(x))]);
      const r = resistance(T);
      pts.push([X(T), Y(r)]);
      EA.draw.line(ctx, pts, TINT, 2.4);
      EA.draw.dot(ctx, X(T), Y(r), 4, C.ink);
      EA.draw.text(ctx, 'T = ' + EA.fmt(T, 2) + ' K', R - 6, bot - 28, { color: C.ink, size: fs + 1, weight: 700, align: 'right' });
      EA.draw.text(ctx, r === 0 ? 'R = 0' : 'R = ' + EA.fmt(r, 2) + ' · R normale', R - 6, bot - 10, { color: r === 0 ? TINT : C.amber, size: fs + 1, weight: 700, align: 'right' });
    }

    // SQUID: anello con due giunzioni; la corrente massima si ripete a ogni quanto di flusso.
    function drawSquid(ctx, g, B, k) {
      const fs = g.fs;
      const phi = EA.clamp((k - 0.8) * 0.33, 0, 3);
      const rx = g.narrow ? 30 : 46;
      const ry = rx * 0.4;
      const cx = B.x + 18 + rx;
      const cy = B.y + (g.narrow ? 30 : 36) + ry;
      box(ctx, B.x, B.y, B.w, B.h);
      const ring = (a0, a1, col) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1); ctx.stroke();
      };
      const fcol = mix(C.dim, C.cyan, phi / 3);
      ring(Math.PI, TAU, EA.alpha(TINT, 0.55));
      EA.draw.arrow(ctx, cx, cy + ry + 16, cx, cy - ry - 16, fcol, 2.2, 8);
      ring(0, Math.PI, TINT);
      ctx.fillStyle = '#30443d';
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 1;
      [cx - rx, cx + rx].forEach((x) => { ctx.fillRect(x - 4, cy - 6, 8, 12); ctx.strokeRect(x - 4, cy - 6, 8, 12); });
      EA.draw.text(ctx, 'Φ', cx + 9, cy - ry - 7, { color: fcol, size: fs + 1, weight: 700 });
      const tx = cx + rx + 22;
      EA.draw.text(ctx, 'SQUID', tx, cy - 5, { color: C.ink, size: fs + 1, weight: 700 });
      EA.draw.text(ctx, g.narrow ? 'anello con due giunzioni' : 'anello superconduttore con due giunzioni', tx, cy + 12, { color: C.text, size: fs });

      const L = B.x + (g.narrow ? 30 : 40);
      const R = B.x + B.w - 18;
      const top = cy + ry + (g.narrow ? 38 : 50);
      const bot = B.y + B.h - (g.narrow ? 44 : 52);
      const X = (p) => L + (p / 3) * (R - L);
      const Y = (v) => bot - v * (bot - top);
      EA.draw.grid(ctx, L, top, R - L, bot - top, { cols: 6, rows: 2, ticks: false });
      ['0', 'Φ₀', '2Φ₀', '3Φ₀'].forEach((lab, i) => EA.draw.text(ctx, lab, X(i), bot + 15, { color: C.dim, size: fs, align: 'center' }));
      EA.draw.text(ctx, 'corrente massima', L, top - 10, { color: C.text, size: fs });
      EA.draw.text(ctx, 'Φ = ' + EA.fmt(phi, 2) + ' Φ₀', R, top - 10, { color: C.cyan, size: fs, weight: 700, align: 'right' });
      const pts = [];
      for (let p = 0; p < phi; p += 0.02) pts.push([X(p), Y(squidIc(p))]);
      pts.push([X(phi), Y(squidIc(phi))]);
      EA.draw.line(ctx, pts, TINT, 2.2);
      EA.draw.dot(ctx, X(phi), Y(squidIc(phi)), 3.5, C.ink);
      EA.draw.text(ctx, (B.w < 300 ? 'periodo Φ₀ = h/2e ≈ ' : 'un periodo ogni Φ₀ = h/2e ≈ ') + sci(PHI0, 2) + ' Wb', B.x + 14, B.y + B.h - 14, { color: C.text, size: fs });
    }

    function act1(ctx, g, t, dt) {
      const T = stage === 0 ? tempAt(stageT) : 2;
      const sc = 1 - EA.clamp(resistance(T), 0, 1);
      const key = g.A.w + 'x' + g.A.h;
      if (key !== elKey) { elKey = key; seedEls(g.A, g.narrow ? 16 : 26, sc); }
      if (sc >= 0.5 && !paired) pairUp(); else if (sc < 0.5 && paired) paired = false;
      if (dt > 0) stepEls(dt, sc, g.A, g.narrow ? 0.7 : 1);
      scVis = dt > 0 ? scVis + (sc - scVis) * (1 - Math.exp(-dt * 6)) : sc;
      drawLattice(ctx, g, g.A, T, scVis, t, stage === 1);
      if (stage === 0) drawRT(ctx, g, g.B, T); else drawSquid(ctx, g, g.B, stageT);
    }

    /* atto 2: la valvola di spin dentro la testina */

    function valveGeo(g, A) {
      const x0 = A.x + (g.narrow ? 56 : 80);
      const x1 = A.x + A.w - (g.narrow ? 12 : 18);
      const span = x1 - x0;
      const sw = span * (g.narrow ? 0.21 : 0.18);
      const cw = sw * 0.45;
      const sx = x0 + (span - 2 * sw - cw) / 2;
      // Sul computer sotto gli strati resta posto per il circuito equivalente.
      const lanes = g.narrow ? [A.y + A.h * 0.36, A.y + A.h * 0.64] : [A.y + A.h * 0.3, A.y + A.h * 0.52];
      const band = g.narrow ? 11 : 16;
      return {
        x0, x1, span, lanes, band,
        slabs: [[sx, sx + sw], [sx + sw, sx + sw + cw], [sx + sw + cw, sx + 2 * sw + cw]],
        yTop: A.y + 42, yBot: g.narrow ? A.y + A.h - 44 : lanes[1] + band + 26,
      };
    }

    // Quanto un elettrone con spin s (+1 ↑, −1 ↓) è "parallelo" al punto in cui si trova:
    // 1 nei contatti e nel rame, (1 + s·m)/2 dentro uno strato magnetico di magnetizzazione m.
    function parallelAt(vg, x, s, m) {
      const [a, , c] = vg.slabs;
      if (x >= a[0] && x <= a[1]) return (1 + s) / 2;
      if (x >= c[0] && x <= c[1]) return (1 + s * m) / 2;
      return 1;
    }

    function seedLanes(n) {
      lanes = [];
      [1, -1].forEach((s) => {
        for (let i = 0; i < n; i++) lanes.push({ s, x: (i + (s < 0 ? 0.5 : 0)) / n, ph: i * 2.4 + (s < 0 ? 1.3 : 0), dy: ((i * 7) % 5) / 2 - 1 });
      });
    }

    // Gli elettroni con spin antiparallelo allo strato vengono diffusi e rallentano.
    function stepLanes(dt, vg, m, vFree) {
      for (const e of lanes) {
        const par = parallelAt(vg, vg.x0 + e.x * vg.span, e.s, m);
        e.x += ((16 + (vFree - 16) * par) * (1 + 0.28 * Math.sin(e.ph * 1.7)) / vg.span) * dt;
        if (e.x > 1) e.x -= 1;
      }
    }

    function drawValve(ctx, g, A, ang, t, vg) {
      const fs = g.fs;
      const m = Math.cos(ang);
      box(ctx, A.x, A.y, A.w, A.h);
      const names = g.narrow ? ['bloccato', 'rame', 'libero'] : ['strato bloccato', 'rame, 2–3 nm', 'strato libero'];
      vg.slabs.forEach(([a, b], i) => {
        const col = i === 1 ? C.orange : i === 0 ? C.cyan : mix(C.pink, C.cyan, (1 + m) / 2);
        ctx.fillStyle = EA.alpha(col, 0.13);
        ctx.fillRect(a, vg.yTop, b - a, vg.yBot - vg.yTop);
        ctx.strokeStyle = EA.alpha(col, 0.45);
        ctx.lineWidth = 1;
        ctx.strokeRect(a + 0.5, vg.yTop + 0.5, b - a - 1, vg.yBot - vg.yTop - 1);
        EA.draw.text(ctx, names[i], (a + b) / 2, i === 1 ? vg.yBot + 15 : vg.yTop - 9, { color: i === 1 ? C.orange : C.text, size: fs, align: 'center' });
        if (i === 1) return;
        // Magnetizzazione dello strato: una freccia grande e tenue.
        const cx = (a + b) / 2;
        const cy = (vg.yTop + vg.yBot) / 2;
        const an = i === 0 ? 0 : ang;
        const L = Math.min((vg.yBot - vg.yTop) * 0.36 / Math.max(1e-3, Math.abs(Math.cos(an))), ((b - a) / 2 - 8) / Math.max(1e-3, Math.abs(Math.sin(an))));
        ctx.save();
        ctx.globalAlpha = 0.45;
        EA.draw.arrow(ctx, cx - Math.sin(an) * L, cy + Math.cos(an) * L, cx + Math.sin(an) * L, cy - Math.cos(an) * L, col, 4, 14);
        ctx.restore();
      });
      const lane = [['spin ↑', C.cyan], ['spin ↓', C.pink]];
      vg.lanes.forEach((ly, li) => {
        // Il canale di ogni spin: una corsia in cui gli elettroni viaggiano da sinistra a destra.
        ctx.fillStyle = EA.alpha(lane[li][1], 0.07);
        ctx.fillRect(vg.x0 - 6, ly - vg.band, vg.x1 - vg.x0 + 6, vg.band * 2);
        ctx.strokeStyle = EA.alpha(lane[li][1], 0.22);
        ctx.lineWidth = 1;
        ctx.strokeRect(vg.x0 - 5.5, ly - vg.band + 0.5, vg.x1 - vg.x0 + 5, vg.band * 2 - 1);
        EA.draw.text(ctx, lane[li][0], A.x + 12, ly + 4, { color: lane[li][1], size: fs, weight: 700 });
        // Un canale passa solo se lo spin è parallelo a entrambi gli strati.
        const free = li === 0 && m > 0;
        EA.draw.text(ctx, free ? 'passa' : 'frenato', vg.x1, ly - vg.band - 6, { color: free ? lane[li][1] : C.dim, size: fs, weight: 700, align: 'right' });
      });
      lanes.forEach((e) => {
        const li = e.s > 0 ? 0 : 1;
        const x = vg.x0 + e.x * vg.span;
        const jam = 1 - parallelAt(vg, x, e.s, m);
        const y = vg.lanes[li] + e.dy * vg.band * 0.45 + jam * 4 * Math.sin(t * 23 + e.ph);
        const col = lane[li][1];
        if (jam > 0.5 && Math.sin(t * 5 + e.ph * 3) > 0.85) {
          ctx.strokeStyle = EA.alpha(C.amber, 0.7);
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.stroke();
        }
        EA.draw.dot(ctx, x, y, g.narrow ? 3 : 3.6, col, false);
        EA.draw.arrow(ctx, x + 7, y + 5 * e.s, x + 7, y - 6 * e.s, col, 1.4, 5);
      });
      if (!g.narrow) circuit(ctx, g, A, vg, m, ang);
      const P = m >= 0;
      const cap = g.narrow ? (P ? 'parallele: R bassa' : 'antiparallele: R alta')
        : (P ? 'magnetizzazioni parallele: il canale ↑ passa, R bassa' : 'antiparallele: entrambi i canali sono frenati, R alta');
      EA.draw.text(ctx, cap, A.x + 12, A.y + A.h - 11, { color: P ? C.cyan : C.pink, size: fs, weight: 700 });
    }

    // Circuito equivalente: ogni strato è una resistenza, piccola (r) per gli elettroni con lo
    // spin parallelo alla sua magnetizzazione e grande (α·r) per gli altri; i due canali sono in parallelo.
    function circuit(ctx, g, A, vg, m, ang) {
      const fs = g.fs;
      const y1 = vg.yBot + 56;
      const y2 = y1 + 34;
      const ym = (y1 + y2) / 2;
      const xl = vg.x0 + 10;
      const xr = vg.x1 - 120;
      EA.draw.text(ctx, 'circuito equivalente: i due canali sono in parallelo', A.x + 12, vg.yBot + 32, { color: C.dim, size: fs });
      ctx.strokeStyle = EA.alpha(C.text, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xl - 24, ym); ctx.lineTo(xl, ym); ctx.moveTo(xl, y1); ctx.lineTo(xl, y2);
      ctx.moveTo(xr, y1); ctx.lineTo(xr, y2); ctx.moveTo(xr, ym); ctx.lineTo(xr + 18, ym);
      [y1, y2].forEach((y) => { ctx.moveTo(xl, y); ctx.lineTo(xr, y); });
      ctx.stroke();
      [[0, 1], [0, -1], [2, 1], [2, -1]].forEach(([si, sp]) => {
        const [a, b] = vg.slabs[si];
        const hi = sp * (si === 0 ? 1 : m) < 0;
        const col = sp > 0 ? C.cyan : C.pink;
        const y = sp > 0 ? y1 : y2;
        const bw = (b - a) * 0.72;
        const bh = hi ? 18 : 12;
        ctx.fillStyle = C.bg;
        ctx.fillRect((a + b) / 2 - bw / 2, y - bh / 2, bw, bh);
        ctx.strokeStyle = col;
        ctx.lineWidth = hi ? 2 : 1.2;
        ctx.strokeRect((a + b) / 2 - bw / 2, y - bh / 2, bw, bh);
        EA.draw.text(ctx, hi ? ALPHA + 'r' : 'r', (a + b) / 2, y + 4, { color: col, size: fs, weight: 700, align: 'center' });
      });
      EA.draw.text(ctx, '↑', A.x + 40, y1 + 4, { color: C.cyan, size: fs + 1, weight: 700 });
      EA.draw.text(ctx, '↓', A.x + 40, y2 + 4, { color: C.pink, size: fs + 1, weight: 700 });
      EA.draw.text(ctx, 'R = ' + EA.fmt(valveR(ang, ALPHA), 2) + ' r', xr + 26, ym + 5, { color: m >= 0 ? C.cyan : C.pink, size: 13, weight: 700 });
    }

    // Testina sopra la traccia del disco; sotto, la resistenza letta, allineata ai bit.
    function drawDisk(ctx, g, B, k) {
      const fs = g.fs;
      const n = g.narrow;
      const bw = n ? 34 : 48;
      const sh = n ? 22 : 30;
      const xh = B.x + B.w * 0.6;
      const yS = B.y + B.h * (g.stack ? 0.36 : 0.3);
      const ty0 = yS + sh + (n ? 18 : 26);
      const ty1 = B.y + B.h - (n ? 26 : 32);
      const tx0 = B.x + (n ? 60 : 66);
      const rp = valve(ALPHA, true);
      const rap = valve(ALPHA, false);
      const Yr = (r) => ty1 - 0.12 * (ty1 - ty0) - ((r - rp) / (rap - rp)) * 0.76 * (ty1 - ty0);
      box(ctx, B.x, B.y, B.w, B.h);
      EA.draw.text(ctx, n ? 'testina e bit del disco' : 'Testina di lettura di un disco rigido', B.x + 12, B.y + 20, { color: C.ink, size: fs + 1, weight: 700 });
      if (!n) para(ctx, 'Il campo di ogni bit orienta lo strato libero. Qui ΔR/R' + NB + '=' + NB + EA.fmt(gmr(ALPHA) * 100, 1) + NB + '%.', B.x + 12, B.y + 38, B.w - 24, { color: C.text, size: fs });
      ctx.save();
      ctx.beginPath(); ctx.rect(B.x + 1, B.y + 1, B.w - 2, B.h - 2); ctx.clip();
      for (let j = Math.floor(k - (xh - B.x) / bw) - 1; j <= Math.ceil(k + (B.x + B.w - xh) / bw) + 1; j++) {
        const b = bitAt(j);
        const xc = xh + (j - k) * bw;
        const col = b ? C.pink : C.cyan;
        ctx.fillStyle = EA.alpha(col, 0.22);
        ctx.fillRect(xc - bw / 2 + 1, yS, bw - 2, sh);
        EA.draw.arrow(ctx, xc, b ? yS + 5 : yS + sh - 5, xc, b ? yS + sh - 5 : yS + 5, col, 1.6, 6);
        if (j >= 0 && xc < xh - bw / 2) EA.draw.text(ctx, String(b), xc, ty1 + (n ? 17 : 21), { color: col, size: fs + 1, weight: 700, align: 'center' });
      }
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = EA.alpha(C.text, 0.3);
      ctx.beginPath();
      [rp, rap].forEach((r) => { ctx.moveTo(tx0, Yr(r)); ctx.lineTo(B.x + B.w - 10, Yr(r)); });
      ctx.stroke();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = EA.alpha(C.ink, 0.35);
      ctx.beginPath(); ctx.moveTo(xh, yS + sh); ctx.lineTo(xh, ty1 + 4); ctx.stroke();
      ctx.restore();
      const pts = [];
      for (let x = tx0; x < xh; x += 2) {
        const kk = k - (xh - x) / bw;
        if (kk >= 0) pts.push([x, Yr(valveR(freeAngle(kk), ALPHA))]);
      }
      const yNow = Yr(valveR(freeAngle(k), ALPHA));
      pts.push([xh, yNow]);
      EA.draw.line(ctx, pts, TINT, 2);
      EA.draw.dot(ctx, xh, yNow, 3.2, TINT);
      // Braccio e testina; il sensore ha gli stessi tre strati del disegno a sinistra.
      const hy = yS - (n ? 20 : 26);
      ctx.strokeStyle = '#4b6159';
      ctx.lineWidth = n ? 4 : 6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xh + 10, hy - 4); ctx.lineTo(B.x + B.w + 4, hy - (n ? 22 : 40)); ctx.stroke();
      ctx.fillStyle = '#33463f';
      ctx.fillRect(xh - 18, hy - 10, 36, 18);
      [[C.cyan, 0], [C.orange, 3], [mix(C.pink, C.cyan, (1 + Math.cos(freeAngle(k))) / 2), 6]].forEach(([c, dy]) => {
        ctx.fillStyle = c;
        ctx.fillRect(xh - 7, hy + 9 + dy, 14, 2);
      });
      ctx.restore();
      EA.draw.text(ctx, 'testina', xh - 24, hy + 3, { color: C.ink, size: fs, align: 'right' });
      if (B.w >= 300) EA.draw.text(ctx, 'bit sul disco', B.x + 10, yS - 8, { color: C.dim, size: fs });
      EA.draw.text(ctx, 'R alta', B.x + 10, Yr(rap) + 4, { color: C.text, size: fs });
      EA.draw.text(ctx, 'R bassa', B.x + 10, Yr(rp) + 4, { color: C.text, size: fs });
    }

    function act2(ctx, g, t, dt) {
      const vg = valveGeo(g, g.A);
      const ang = freeAngle(stageT / BIT_T);
      const vFree = g.narrow ? 80 : 110;
      const key = Math.round(vg.span) + (g.narrow ? 'n' : 'w');
      if (key !== laneKey) {
        laneKey = key;
        seedLanes(g.narrow ? 9 : 14);
        for (let i = 0; i < 360; i++) stepLanes(1 / 60, vg, Math.cos(ang), vFree);
      }
      if (dt > 0) stepLanes(dt, vg, Math.cos(ang), vFree);
      drawValve(ctx, g, g.A, ang, t, vg);
      drawDisk(ctx, g, g.B, stageT / BIT_T);
    }

    /* atto 3: il qubit sulla sfera di Bloch */

    // Scala dei livelli del transmon e scala delle energie.
    function transmon(ctx, g, L) {
      const fs = g.fs;
      const f = 5e9;
      const Teq = equivTemp(f);
      const e = EA.fmt(quantumEnergy(f) / QE * 1e6, 1) + NB + 'µeV';
      if (g.narrow || L.h < 150) {
        const y = para(ctx, 'Transmon a 5' + NB + 'GHz: E = h·f ≈ ' + e + ', come il calore a ' + EA.fmt(Teq, 2) + NB + 'K.', L.x, L.y + 12, L.w, { color: C.text, size: fs });
        para(ctx, 'A 10' + NB + 'mK l\'eccitazione termica scende a ' + sci(thermalP1(f, 0.01), 0) + '.', L.x, y, L.w, { color: TINT, size: fs, weight: 700 });
        return;
      }
      EA.draw.text(ctx, 'Il qubit è un circuito: il transmon', L.x, L.y + 14, { color: C.ink, size: 12, weight: 700 });
      const lx = L.x + 4;
      const lw = 96;
      const yb = L.y + L.h - 16;
      const k = Math.min(13, (L.h - 64) / 10); // pixel per GHz
      const lev = [0, 5, 9.75]; // GHz: 0→1 a 5 GHz, 1→2 a 4,75 GHz (anarmonicità −250 MHz)
      lev.forEach((E, i) => {
        const y = yb - E * k;
        ctx.strokeStyle = i < 2 ? TINT : C.dim;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
        EA.draw.text(ctx, '|' + i + '⟩', lx + lw + 8, y + 4, { color: i < 2 ? C.ink : C.dim, size: fs + 1, weight: 700 });
      });
      EA.draw.arrow(ctx, lx + 18, yb - 2, lx + 18, yb - 5 * k + 3, TINT, 2, 7);
      EA.draw.text(ctx, '5 GHz', lx + 26, yb - 2.5 * k + 4, { color: TINT, size: fs });
      EA.draw.arrow(ctx, lx + 60, yb - 5 * k - 2, lx + 60, yb - 9.75 * k + 3, C.dim, 1.6, 6);
      EA.draw.text(ctx, '4,75 GHz', lx + 66, yb - 7.4 * k + 4, { color: C.dim, size: fs });
      const tx = L.x + 150;
      const tw = L.w - 150;
      let y = L.y + 46;
      y = para(ctx, 'Livelli non equidistanti: un impulso a 5' + NB + 'GHz pilota solo 0' + NB + '↔' + NB + '1.', tx, y, tw, { color: C.text, size: fs }) + 8;
      y = para(ctx, 'E = h·f ≈ ' + e + ', come l\'energia termica a ' + EA.fmt(Teq, 2) + NB + 'K: lì il calore ecciterebbe il qubit ' + EA.fmt(thermalP1(f, Teq) * 100, 0) + ' volte su 100.', tx, y, tw, { color: C.text, size: fs }) + 8;
      para(ctx, 'A 10' + NB + 'mK la probabilità scende a ' + sci(thermalP1(f, 0.01), 0) + ': per questo il chip sta in un frigorifero a diluizione.', tx, y, tw, { color: TINT, size: fs, weight: 700 });
    }

    // Esiti delle quattro misure e accorciamento del vettore nel tempo.
    function measPanel(ctx, g, L, k, st) {
      const fs = g.fs;
      const done = OUT.filter((o, i) => k >= i * 1.5 + 0.8);
      ctx.save();
      ctx.font = '600 ' + fs + 'px ' + MONO;
      const lab = 'Misure di copie a θ = 60°:';
      let x = L.x + ctx.measureText(lab).width + 10;
      ctx.restore();
      EA.draw.text(ctx, lab, L.x, L.y + 14, { color: C.text, size: fs });
      done.forEach((o) => {
        EA.draw.text(ctx, String(o), x, L.y + 15, { color: o ? C.violet : TINT, size: fs + 4, weight: 800 });
        x += fs + 8;
      });
      const n0 = done.filter((o) => o === 0).length;
      // Riquadro basso (telefoni piccoli): si salta la riga di riepilogo.
      const small = g.narrow || L.h < 150;
      const tight = small && L.h < 48;
      if (done.length === 4 && !tight) EA.draw.text(ctx, n0 + ' volte 0 e ' + (4 - n0) + ' volta 1: in media 3 su 4', L.x, L.y + (small ? 30 : 32), { color: C.dim, size: fs });
      const us = st.us == null ? null : st.us;
      const rNow = us == null ? 1 : Math.exp(-us / 100);
      if (small) {
        EA.draw.text(ctx, 'lunghezza r = ' + EA.fmt(rNow, 2) + ' · T₂ = 100 µs', L.x, L.y + (tight ? 30 : 46), { color: us == null ? C.dim : TINT, size: fs, weight: 700 });
        return;
      }
      const X0 = L.x + 32;
      const X1 = L.x + L.w - 8;
      const top = L.y + 82;
      const bot = L.y + L.h - 22;
      const X = (u) => X0 + (u / 300) * (X1 - X0);
      const Y = (r) => bot - r * (bot - top);
      EA.draw.text(ctx, 'lunghezza r = e^(−t/T₂), con T₂ = 100 µs', L.x, top - 14, { color: C.text, size: fs });
      EA.draw.grid(ctx, X0, top, X1 - X0, bot - top, { cols: 6, rows: 2, ticks: false });
      [0, 100, 200, 300].forEach((u, i) => EA.draw.text(ctx, u + (i === 3 ? ' µs' : ''), X(u), bot + 15, { color: C.dim, size: fs, align: i === 3 ? 'right' : 'center' }));
      ['1', '0,5', '0'].forEach((s, i) => EA.draw.text(ctx, s, X0 - 6, top + i * (bot - top) / 2 + 4, { color: C.dim, size: fs, align: 'right' }));
      const curve = (u0, u1) => { const p = []; for (let u = u0; u <= u1; u += 3) p.push([X(u), Y(Math.exp(-u / 100))]); return p; };
      ctx.save();
      ctx.setLineDash([3, 4]);
      EA.draw.line(ctx, curve(0, 300), EA.alpha(TINT, 0.4), 1.2, false);
      ctx.restore();
      if (us != null) {
        const u = Math.min(300, us);
        EA.draw.line(ctx, curve(0, u).concat([[X(u), Y(Math.exp(-u / 100))]]), TINT, 2.2);
        EA.draw.dot(ctx, X(u), Y(Math.exp(-u / 100)), 3.5, C.ink);
        EA.draw.text(ctx, 'r = ' + EA.fmt(rNow, 2), Math.min(X1, X(u) + 10), Y(rNow) - 8, { color: C.ink, size: fs, weight: 700, align: X(u) > X1 - 60 ? 'right' : 'left' });
      }
    }

    function info(ctx, g, B, st, k, meas) {
      const fs = g.fs;
      const x = B.x + 14;
      const w = B.w - 28;
      const v = st.v;
      box(ctx, B.x, B.y, B.w, B.h);
      let y = para(ctx, meas ? measureLabel(k, g.narrow) : qubitLabel(k, g.narrow), x, B.y + 22, w, { color: TINT, size: g.narrow ? 11 : 12, weight: 700 });
      if (!g.narrow) { EA.draw.text(ctx, '|ψ⟩ = α|0⟩ + β|1⟩', x, y + 6, { color: C.ink, size: 13, weight: 700 }); y += 26; }
      const amp = amplitudes(v);
      const an = angles(v);
      const ab = amp
        ? 'α = ' + EA.fmt(amp.alpha, 2) + '   β = ' + (amp.betaAbs < 0.005 ? '0' : EA.fmt(amp.betaAbs, 2) + ' ∠ ' + EA.fmt(deg(amp.betaPhase), 0) + '°')
        : (w < 260 ? 'stato misto: α, β non definite' : 'stato misto: α e β non sono definite');
      EA.draw.text(ctx, ab, x, y + 2, { color: C.text, size: fs + 1 });
      const th = Number.isNaN(an.theta) ? '—' : EA.fmt(deg(an.theta), 0) + '°';
      const ph = Number.isNaN(an.phi) ? '—' : EA.fmt(deg(an.phi), 0) + '°';
      EA.draw.text(ctx, 'θ = ' + th + '   φ = ' + ph + '   r = ' + EA.fmt(len(v), 2), x, y + 20, { color: C.dim, size: fs });
      y += 40;
      probBars(ctx, x, y, w, prob0(v), fs, g.narrow ? 18 : 22);
      y += g.narrow ? 32 : 46;
      const low = { x, y, w, h: B.y + B.h - 8 - y };
      if (meas) measPanel(ctx, g, low, k, st); else transmon(ctx, g, low);
    }

    function act3(ctx, g) {
      const k = stageT;
      const meas = stage === 4;
      const st = meas ? measureAt(k) : { v: qubitAt(k), t0: 0 };
      const vAt = meas ? (x) => measureAt(x).v : qubitAt;
      const trail = [];
      for (let x = Math.max(st.t0, k - 2.6); x < k; x += 0.04) trail.push(vAt(x));
      trail.push(st.v);
      let cx;
      let cy;
      let R;
      let B;
      if (g.stack) {
        const hs = (g.h - g.top) * 0.54;
        R = Math.max(40, Math.min(g.w / 2 - 44, hs / 2 - 26));
        cx = g.w / 2;
        cy = g.top + hs / 2 + 2;
        B = { x: g.pad, y: g.top + hs + 2, w: g.w - 2 * g.pad, h: g.h - g.pad - g.top - hs - 2 };
      } else {
        R = Math.min(g.A.w / 2 - 50, g.A.h / 2 - 30);
        cx = g.A.x + g.A.w / 2;
        cy = g.A.y + g.A.h / 2 + 2;
        B = g.B;
      }
      drawSphere(ctx, camera(cx, cy, R, 0.52, 0.32), { v: st.v, trail, ghost: st.ghost, ghostAlpha: st.ghostAlpha, flash: st.flash, small: g.narrow });
      info(ctx, g, B, st, k, meas);
    }

    function draw(t, dt) {
      if (!cv.w) return;
      if (dt > 0) {
        stageT += dt;
        if (stageT > STAGES[stage].dur) {
          stageT = 0;
          stage = (stage + 1) % STAGES.length;
          api.setStep(stage);
        }
      }
      const g = geo();
      const ctx = cv.ctx;
      EA.draw.clear(cv);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75 * EA.smooth(stageT / 0.45);
      if (stage < 2) act1(ctx, g, t, dt);
      else if (stage === 2) act2(ctx, g, t, dt);
      else act3(ctx, g);
      ctx.restore();
      header(ctx, g);
    }

    api.loop(draw);
    api.setStep(0);
    return {
      focus(key, i) {
        stage = EA.clamp(i, 0, STAGES.length - 1);
        stageT = api.playing ? 0 : STAGES[stage].still;
        elKey = '';
        laneKey = '';
        api.setStep(stage);
        api.invalidate();
      },
    };
  }

  /* ---------- laboratorio: un qubit da pilotare ---------- */

  const GATE_INFO = {
    X: 'mezzo giro attorno all\'asse x, scambia |0⟩ e |1⟩',
    Y: 'mezzo giro attorno all\'asse y',
    Z: 'mezzo giro attorno all\'asse z, cambia solo la fase',
    H: 'mezzo giro attorno all\'asse fra x e z, porta |0⟩ in |+⟩',
    S: 'un quarto di giro attorno all\'asse z',
    T: 'un ottavo di giro attorno all\'asse z',
  };

  function mountLab(parts, api) {
    const h = EA.h;
    parts.root.classList.add('qb-lab');
    const rand = rng(20251027);
    const st = { start: 0, ops: [], angle: 90, T2: 100e-6, wait: 50e-6, counts: null, countsP0: 1, stale: false, last: null };
    let anim = null;
    let trail = [];
    let ghost = null;
    let flash = 0;
    const state = () => run(st.ops, st.T2, st.start);
    const opName = (op) => (op.wait != null ? 'attesa ' + EA.fmt(op.wait * 1e6, 0) + ' µs' : op.a != null ? op.g + '(' + EA.fmt(deg(op.a), 0) + '°)' : op.g);

    const cv = api.canvas(parts.display, { class: 'ea-canvas qb-lab-canvas', label: 'Sfera di Bloch con il vettore di stato del qubit e la scia dell\'ultima operazione. In alto il circuito eseguito; accanto le probabilità di misurare 0 e 1, l\'istogramma delle ultime cento misure con il valore atteso e il risultato dell\'ultima misura singola.' });

    const gates = h('div', { class: 'qb-gates' }, ['X', 'Y', 'Z', 'H', 'S', 'T'].map((name) => EA.ui.button({
      label: name, aria: 'Porta ' + name + ': ' + GATE_INFO[name], title: GATE_INFO[name], onclick: () => apply({ g: name }),
    })));
    const bRx = EA.ui.button({ label: 'Rx', onclick: () => apply({ g: 'Rx', a: (st.angle * Math.PI) / 180 }) });
    const bRy = EA.ui.button({ label: 'Ry', onclick: () => apply({ g: 'Ry', a: (st.angle * Math.PI) / 180 }) });
    function syncRot() {
      [[bRx, 'x'], [bRy, 'y']].forEach(([b, ax]) => {
        b.lastChild.textContent = 'R' + ax + '(' + st.angle + '°)';
        b.setAttribute('aria-label', 'Ruota di ' + st.angle + ' gradi attorno all\'asse ' + ax);
      });
    }
    const angle = EA.ui.slider({
      label: 'Angolo di Rx e Ry', min: 0, max: 360, step: 5, value: st.angle, color: TINT,
      format: (x) => x + '°', oninput: (x) => { st.angle = x; syncRot(); },
    });
    const bWait = EA.ui.button({ label: 'Attendi 50 µs', onclick: () => apply({ wait: st.wait }) });
    const wait = EA.ui.slider({
      label: 'Durata dell\'attesa', min: 0, max: 300, step: 5, value: 50, color: TINT,
      format: (x) => x + ' µs',
      oninput: (x) => { st.wait = x * 1e-6; bWait.lastChild.textContent = 'Attendi ' + x + ' µs'; },
    });
    const t2 = EA.ui.slider({
      label: 'Tempo di coerenza T₂', min: 10e-6, max: 1e-3, log: true, value: st.T2, color: TINT,
      format: (x) => EA.si(x, 's', 2),
      oninput: (x) => { st.T2 = x; anim = null; refresh(); },
    });
    const bMeasure = EA.ui.button({ label: 'Misura', primary: true, onclick: measureOnce });
    const bReset = EA.ui.button({ label: 'Reset a |0⟩', aria: 'Riporta il qubit nello stato zero', onclick: reset });
    const bMany = EA.ui.button({ label: 'Ripeti 100 misure', onclick: measureHundred });
    syncRot();
    parts.controls.append(
      h('div', { class: 'ea-ctl', role: 'group', 'aria-label': 'Porte logiche quantistiche' }, h('span', { class: 'ea-ctl-label' }, 'Porte: rotazioni della sfera'), gates),
      h('div', { class: 'ea-ctl' }, angle.el, h('div', { class: 'qb-row' }, bRx, bRy)),
      h('div', { class: 'ea-ctl' }, wait.el, bWait),
      t2.el,
      h('div', { class: 'ea-ctl', role: 'group', 'aria-label': 'Misure' },
        h('div', { class: 'qb-row' }, bMeasure, bReset), bMany,
        h('small', { class: 'ea-ctl-hint' }, 'Le 100 misure si fanno su cento copie preparate nello stesso stato.')));

    const ro = {};
    [['p0', 'P(0)'], ['p1', 'P(1)'], ['th', 'θ dal polo nord'], ['ph', 'φ attorno a z'], ['a', 'Ampiezza α'], ['b', 'Ampiezza β (modulo ∠ fase)'], ['r', 'Lunghezza r'], ['pu', 'Purezza (1 + r²)/2']].forEach(([key, label]) => {
      ro[key] = EA.ui.readout({ label });
      parts.readouts.append(ro[key].el);
    });

    // La scia è il percorso dell'ultima operazione; con l'animazione attiva la punta lo percorre.
    function setPath(path, dur) {
      trail = [];
      for (let i = 0; i <= 40; i++) trail.push(path(i / 40));
      anim = api.playing ? { path, dur, t: 0 } : null;
    }

    function apply(op) {
      if (op.wait != null && op.wait <= 0) { api.announce('Attesa nulla: lo stato non cambia.'); return; }
      const from = state();
      st.ops.push(op);
      st.stale = !!st.counts;
      ghost = null;
      if (op.wait != null) setPath((u) => dephase(from, op.wait * u, st.T2), 0.9);
      else {
        const gg = gate(op.g, op.a);
        setPath((u) => rotate(from, gg.axis, gg.angle * u), 0.35 + (0.35 * Math.abs(gg.angle)) / Math.PI);
      }
      refresh();
      const s = state();
      api.announce(opName(op) + ': probabilità di 0 ' + EA.fmt(prob0(s) * 100, 0) + ' per cento, lunghezza del vettore ' + EA.fmt(len(s), 2) + '.');
    }

    function measureOnce() {
      const v0 = state();
      const out = measure(v0, rand);
      st.start = out;
      st.ops = [];
      st.last = { out, p: out ? 1 - prob0(v0) : prob0(v0) };
      ghost = { v: v0, a: 1 };
      flash = 1;
      trail = [];
      anim = null;
      refresh();
      api.announce('Misura: è uscito ' + out + ', che aveva probabilità ' + EA.fmt(st.last.p * 100, 0) + ' per cento. Ora il qubit è nello stato ' + out + ': misurandolo di nuovo uscirebbe sempre ' + out + '.');
    }

    function measureHundred() {
      const v0 = state();
      st.counts = measureMany(v0, 100, rand);
      st.countsP0 = prob0(v0);
      st.stale = false;
      refresh();
      api.announce('Cento copie misurate: ' + st.counts[0] + ' volte 0 e ' + st.counts[1] + ' volte 1. In media ci si aspettano ' + EA.fmt(100 * st.countsP0, 0) + ' zeri, con fluttuazioni di circa ' + EA.fmt(Math.sqrt(100 * st.countsP0 * (1 - st.countsP0)), 0) + '.');
    }

    function reset() {
      st.start = 0;
      st.ops = [];
      st.last = null;
      st.counts = null;
      ghost = null;
      flash = 0;
      trail = [];
      anim = null;
      refresh();
      api.announce('Qubit riportato nello stato 0.');
    }

    function refresh() {
      const s = state();
      const p0 = prob0(s);
      const an = angles(s);
      const amp = amplitudes(s);
      const r = len(s);
      ro.p0.set(EA.fmt(p0 * 100, 1) + ' %');
      ro.p1.set(EA.fmt((1 - p0) * 100, 1) + ' %');
      ro.th.set(Number.isNaN(an.theta) ? 'non definito' : EA.fmt(deg(an.theta), 1) + '°');
      ro.ph.set(Number.isNaN(an.phi) ? 'non definito' : EA.fmt(deg(an.phi), 1) + '°');
      ro.a.set(amp ? EA.fmt(amp.alpha, 3) : 'non definita', amp ? null : 'warn');
      ro.b.set(amp ? (amp.betaAbs < 5e-4 ? '0' : EA.fmt(amp.betaAbs, 3) + ' ∠ ' + EA.fmt(deg(amp.betaPhase), 0) + '°') : 'non definita', amp ? null : 'warn');
      ro.r.set(EA.fmt(r, 3), r > 0.999 ? 'good' : r < 0.5 ? 'warn' : null);
      ro.pu.set(EA.fmt(purity(s), 3), r > 0.999 ? 'good' : null);
      api.invalidate();
    }

    // Il circuito eseguito; se è troppo lungo si tolgono le prime operazioni.
    function circuit(ctx, x, y, maxW, fs) {
      const head = st.start ? '|1⟩ (dopo la misura)' : '|0⟩';
      const ops = st.ops.map(opName);
      ctx.save();
      ctx.font = '600 ' + fs + 'px ' + MONO;
      let skip = 0;
      let s = '';
      for (;;) {
        s = 'Circuito: ' + [head].concat(skip ? ['…'] : [], ops.slice(skip)).join(' → ');
        if (ctx.measureText(s).width <= maxW || skip >= ops.length) break;
        skip++;
      }
      ctx.restore();
      EA.draw.text(ctx, s, x, y, { color: C.text, size: fs });
    }

    function histogram(ctx, x, y, w, hgt, fs, narrow) {
      const title = st.stale ? (narrow ? '100 misure, stato prima' : 'Ultime 100 misure (stato precedente)') : 'Ultime 100 misure';
      EA.draw.text(ctx, title, x, y, { color: C.ink, size: fs + 1, weight: 700 });
      const top = y + 22;
      const base = y + hgt - 36;
      const Hb = base - top;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, base + 0.5); ctx.lineTo(x + w, base + 0.5); ctx.stroke();
      if (!st.counts) {
        para(ctx, narrow ? 'Premi «Ripeti 100 misure».' : 'Premi «Ripeti 100 misure»: cento copie preparate nello stesso stato, misurate una per una.', x, top + Hb / 2 - 8, w, { color: C.dim, size: fs });
        return;
      }
      const bwid = Math.min(64, w * 0.22);
      const p0 = st.countsP0;
      [0, 1].forEach((o) => {
        const cx = x + w * (o ? 0.72 : 0.28);
        const col = o ? C.violet : TINT;
        const p = o ? 1 - p0 : p0;
        const c = st.counts[o];
        const bh = (c / 100) * Hb;
        ctx.save();
        ctx.globalAlpha = st.stale ? 0.35 : 0.9;
        ctx.fillStyle = col;
        ctx.fillRect(cx - bwid / 2, base - bh, bwid, bh);
        ctx.restore();
        // Valore atteso N·p (tratteggio) e barra d'errore di ± una deviazione standard.
        const sd = Math.sqrt(100 * p * (1 - p));
        const xe = cx + bwid / 2 + 9;
        const ya = base - ((100 * p + sd) / 100) * Hb;
        const yb = base - ((100 * p - sd) / 100) * Hb;
        ctx.save();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(xe, ya); ctx.lineTo(xe, yb); ctx.moveTo(xe - 4, ya); ctx.lineTo(xe + 4, ya); ctx.moveTo(xe - 4, yb); ctx.lineTo(xe + 4, yb);
        ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(cx - bwid / 2 - 6, base - p * Hb); ctx.lineTo(xe, base - p * Hb); ctx.stroke();
        ctx.restore();
        EA.draw.text(ctx, o + ': ' + c + ' volte', cx, base + 16, { color: col, size: fs, weight: 700, align: 'center' });
      });
      const sd0 = Math.sqrt(100 * p0 * (1 - p0));
      EA.draw.text(ctx, (narrow ? 'attesi ' : 'tratteggio: attesi ') + EA.fmt(100 * p0, 0) + ' ± ' + EA.fmt(sd0, 0) + ' zeri', x, base + 33, { color: C.dim, size: fs });
    }

    function lastResult(ctx, x, y, fs, narrow) {
      EA.draw.text(ctx, narrow ? 'Ultima misura' : 'Ultima misura singola', x, y, { color: C.ink, size: fs + 1, weight: 700 });
      if (!st.last) { EA.draw.text(ctx, 'premi «Misura»', x, y + 22, { color: C.dim, size: fs }); return; }
      const col = st.last.out ? C.violet : TINT;
      const p = EA.fmt(st.last.p * 100, 0) + ' %';
      EA.draw.text(ctx, String(st.last.out), x, y + 38, { color: col, size: 30, weight: 800 });
      EA.draw.text(ctx, narrow ? 'p = ' + p : 'probabilità ' + p, x + 30, y + 26, { color: C.text, size: fs });
      EA.draw.text(ctx, narrow ? 'ora |' + st.last.out + '⟩' : 'ora il qubit è |' + st.last.out + '⟩', x + 30, y + 41, { color: C.text, size: fs });
    }

    function draw(t, dt) {
      if (!cv.w) return;
      const ctx = cv.ctx;
      const w = cv.w;
      const hh = cv.h;
      const narrow = w < 560;
      // Canvas più alto che largo (telefono): sfera sopra, grafici sotto.
      const stack = narrow || hh > w;
      const fs = narrow ? 10.5 : 11.5;
      let v = state();
      let shown = trail.length;
      if (anim) {
        anim.t += dt;
        const u = EA.ease.inOut(Math.min(1, anim.t / anim.dur));
        v = anim.path(u);
        shown = Math.round(u * 40) + 1;
        if (anim.t >= anim.dur) anim = null;
      }
      if (dt > 0) {
        flash = Math.max(0, flash - dt * 1.4);
        if (ghost && (ghost.a -= dt * 0.8) <= 0) ghost = null;
      }
      EA.draw.clear(cv);
      circuit(ctx, 14, 22, w - 28, fs);
      const R = stack ? Math.min(w / 2 - 40, hh * 0.25 - 18) : Math.min(w * 0.29 - 36, (hh - 40) / 2 - 34);
      const cam = stack ? camera(w / 2, 40 + hh * 0.25, R, 0.52, 0.32) : camera(w * 0.3, 40 + (hh - 40) / 2, R, 0.52, 0.32);
      drawSphere(ctx, cam, { v, trail: trail.slice(0, shown), ghost: ghost && ghost.v, ghostAlpha: ghost ? ghost.a : 0, flash, small: narrow });
      if (stack) {
        const y0 = 40 + hh * 0.5 + 22;
        probBars(ctx, 14, y0, w - 28, prob0(v), fs, 17);
        histogram(ctx, 14, y0 + 46, w * 0.6 - 14, hh - y0 - 50, fs, narrow);
        lastResult(ctx, w * 0.66, y0 + 46, fs, narrow);
      } else {
        const x0 = w * 0.6;
        const pw = w - x0 - 18;
        EA.draw.text(ctx, 'Probabilità di misura', x0, 62, { color: C.ink, size: fs + 1, weight: 700 });
        probBars(ctx, x0, 88, pw, prob0(v), fs, 24);
        histogram(ctx, x0, 150, pw, hh - 150 - 96, fs);
        lastResult(ctx, x0, hh - 66, fs);
      }
    }

    api.onchange((playing) => { if (!playing && anim) { anim = null; api.invalidate(); } });
    api.loop(draw);
    refresh();
    return {};
  }

  /* ---------- contenuti ---------- */

  EA.register({
    id: 'quantistica',
    intro: [
      'Nel 1911, a Leida, il gruppo di Heike Kamerlingh Onnes raffreddò del mercurio con l\'elio liquido e vide la sua resistenza elettrica sparire: sotto circa 4,2 K, cioè −269 °C, non era piccola, era <strong>zero</strong>. Era la scoperta della <em>superconduttività</em>: un effetto quantistico che riguarda un intero filo e non un singolo atomo, tanto che per spiegarlo servirono quasi cinquant\'anni.',
      'Da allora l\'elettronica ha imparato a usare il mondo quantistico in modo diretto. Nei superconduttori gli elettroni viaggiano a coppie, le <em>coppie di Cooper</em>, che attraversano per effetto tunnel barriere isolanti spesse un paio di nanometri: sono le giunzioni Josephson. Lo <em>spin</em>, la minuscola calamita che ogni elettrone porta con sé, permette invece alle testine dei dischi rigidi di leggere bit larghi poche decine di nanometri.',
      'L\'ultima frontiera è il <strong>qubit</strong>: un circuito superconduttore che, raffreddato a circa 10 mK, si comporta come un atomo artificiale e può stare in una sovrapposizione di 0 e 1. I processori di oggi ne riuniscono da circa cento a circa mille, ma sbagliano ancora troppo spesso: proteggerli dagli errori è la sfida di questi anni, e finora nessun problema di utilità pratica è stato risolto, in modo dimostrato, meglio che con i computer classici.',
    ],
    steps: [
      { title: 'Resistenza zero', text: 'Raffreddando il mercurio la resistenza cala piano, poi a circa 4,2 K crolla a zero in pochi centesimi di kelvin. Sopra la temperatura critica <var>T</var><sub>c</sub> gli elettroni (in ambra) urtano impurezze e ioni che vibrano e perdono energia; sotto <var>T</var><sub>c</sub> la corrente continua scorre senza perdite.', focus: 'zero' },
      { title: 'Coppie di Cooper e giunzione Josephson', text: 'Sotto <var>T</var><sub>c</sub> gli elettroni si legano a coppie (in blu) che si muovono tutte insieme, come un\'unica onda. Fra due superconduttori separati da 1-2 nm di isolante le coppie passano per effetto tunnel: è la giunzione Josephson. In un anello con due giunzioni, lo SQUID, la corrente massima si ripete a ogni quanto di flusso <var>Φ</var><sub>0</sub>.', focus: 'cooper' },
      { title: 'Lo spin come bit', text: 'Ogni elettrone ha uno spin, cioè si comporta come una minuscola calamita. In una valvola di spin due strati magnetici sono separati da pochi nanometri di rame. Se le magnetizzazioni sono parallele, gli elettroni con lo spin concorde passano quasi senza urti e la resistenza è bassa; se sono antiparallele, tutti vengono frenati e la resistenza sale. Così la testina legge i bit del disco.', focus: 'spin' },
      { title: 'Un qubit in sovrapposizione', text: 'Lo stato di un qubit è una freccia sulla sfera di Bloch: in alto |0⟩ (si legge «ket zero» ed è solo un nome per lo stato di energia più bassa), in basso |1⟩. Le porte logiche quantistiche sono rotazioni: la porta H porta la freccia sull\'equatore, dove 0 e 1 sono ugualmente probabili; la porta S la fa girare attorno all\'asse verticale e cambia la fase, non le probabilità.', focus: 'qubit' },
      { title: 'Misura e decoerenza', text: 'Una misura dà soltanto 0 o 1, a caso, con probabilità fissate dall\'altezza della freccia, e lascia il qubit nello stato trovato. Intanto l\'ambiente disturba: in un tempo <var>T</var><sub>2</sub> la fase si disperde e la parte orizzontale della freccia si accorcia. Per limitare i disturbi i qubit lavorano a circa 10 mK, e per gli errori che restano servono codici di correzione.', focus: 'misura' },
    ],
    formulas: [
      { label: 'Superconduttività', eq: '<var>R</var> = 0 e <var>B</var><sub>interno</sub> = 0 sotto <var>T</var><sub>c</sub>', text: 'Resistenza nulla in corrente continua ed espulsione del campo magnetico (effetto Meissner, 1933), finché temperatura, campo e corrente restano sotto i loro valori critici; nei superconduttori di tipo II il campo può entrare in vortici quantizzati. Per il mercurio <var>T</var><sub>c</sub> ≈ 4,15 K, per il niobio 9,2 K, per l\'YBCO circa 93 K.' },
      { label: 'Quanto di flusso', eq: '<var>Φ</var><sub>0</sub> = <var>h</var> ⁄ 2<var>e</var> ≈ 2,07·10<sup>−15</sup> Wb', text: 'Il flusso magnetico intrappolato in un anello superconduttore è un multiplo intero di <var>Φ</var><sub>0</sub>: il 2 ricorda che i portatori sono coppie, con carica 2<var>e</var>. In una giunzione Josephson con tensione <var>V</var> la supercorrente oscilla a <var>f</var> = 2<var>eV</var>/<var>h</var>, circa 483,6 GHz per millivolt.' },
      { label: 'Stato di un qubit', eq: '|<var>ψ</var>⟩ = <var>α</var>|0⟩ + <var>β</var>|1⟩', text: 'Le ampiezze <var>α</var> e <var>β</var> sono numeri complessi con |<var>α</var>|<sup>2</sup> + |<var>β</var>|<sup>2</sup> = 1. Sulla sfera di Bloch <var>α</var> = cos(<var>θ</var>/2) e |<var>β</var>| = sin(<var>θ</var>/2), quindi <var>P</var>(0) = cos<sup>2</sup>(<var>θ</var>/2): conta l\'altezza della freccia, non la fase <var>φ</var>.' },
      { label: 'Energia di un quanto', eq: '<var>E</var> = <var>h</var>·<var>f</var>', text: 'A 5 GHz un quanto vale circa 20,7 µeV, come l\'energia termica a 0,24 K: a quella temperatura il calore ecciterebbe il qubit circa una volta su quattro. A 10 mK la probabilità scende a circa 4·10<sup>−11</sup>, per questo i chip lavorano in un frigorifero a diluizione.' },
    ],
    timeline: [
      { year: 1911, title: 'Resistenza zero nel mercurio', who: 'Heike Kamerlingh Onnes con Gilles Holst, Cornelis Dorsman e Gerrit Flim, Università di Leida', text: 'L\'8 aprile il quaderno di laboratorio annota «Kwik nagenoeg nul», mercurio praticamente zero: la resistenza era già sparita in una misura fatta sotto la transizione. Le misure successive dello stesso anno mostrano che il crollo è improvviso e avviene a circa 4,2 K. È la scoperta della superconduttività.' },
      { year: 1957, title: 'Le coppie di Cooper', who: 'John Bardeen, Leon N. Cooper e J. Robert Schrieffer, Università dell\'Illinois', text: 'La teoria BCS spiega il fenomeno: grazie alle vibrazioni del reticolo gli elettroni si legano a coppie che si muovono come un\'unica onda. Per disperdere energia bisognerebbe spezzare una coppia, e a bassa temperatura l\'energia necessaria non è disponibile. Nobel 1972: per Bardeen è il secondo, dopo quello del 1956 per il transistor.' },
      { year: 1962, title: 'L\'effetto Josephson', who: 'Brian D. Josephson, Università di Cambridge', text: 'A 22 anni, ancora dottorando, prevede che le coppie di Cooper attraversino per effetto tunnel una barriera isolante fra due superconduttori. Anderson e Rowell lo osservano nel 1963; Nobel 1973. Nel 1964, ai laboratori Ford, un anello con due giunzioni mostra l\'interferenza quantistica: è il primo dispositivo superconduttore a interferenza quantistica, il futuro SQUID.' },
      { year: 1985, title: 'Un circuito che si comporta come un atomo', who: 'John Clarke, Michel H. Devoret e John M. Martinis, Università della California, Berkeley', text: 'Negli esperimenti del 1984-85 una giunzione Josephson su un chip mostra che una grandezza collettiva di un circuito con miliardi di elettroni attraversa una barriera per effetto tunnel e ha livelli di energia quantizzati, come un atomo. È la base fisica dei qubit superconduttori: Nobel per la Fisica 2025.' },
      { year: 1986, title: 'Superconduttori ad alta temperatura critica', who: 'J. Georg Bednorz e K. Alex Müller, IBM Zurigo; poi M. K. Wu, C. W. Chu e colleghi', text: 'In un ossido ceramico di lantanio, bario e rame la superconduttività compare intorno a 30-35 K, oltre il record di 23 K che resisteva dal 1973: Nobel nel 1987, a tempo di record. All\'inizio del 1987 l\'YBCO arriva a circa 93 K e per la prima volta basta l\'azoto liquido, che bolle a 77 K.' },
      { year: 1988, title: 'La magnetoresistenza gigante', who: 'Albert Fert, Université Paris-Sud (Orsay), e Peter Grünberg, Centro di ricerca di Jülich', text: 'In strati alternati di ferro e cromo spessi pochi nanometri scoprono, in modo indipendente, che la resistenza cambia molto con l\'orientamento delle magnetizzazioni. Nel 1997 IBM porta la GMR nelle testine dei dischi rigidi; Nobel 2007. Dalla metà degli anni 2000 le testine usano la magnetoresistenza tunnel, che segue lo stesso principio.' },
      { year: 1999, title: 'Il primo qubit superconduttore', who: 'Yasunobu Nakamura, Yuri A. Pashkin e Jaw-Shen Tsai, laboratori NEC di Tsukuba', text: 'In una «scatola a singola coppia di Cooper» preparano, con impulsi di tensione brevissimi, la sovrapposizione di due stati di carica e ne seguono le oscillazioni nel tempo. La coerenza dura appena un nanosecondo circa.' },
      { year: 2007, title: 'Nasce il transmon', who: 'Jens Koch, Robert J. Schoelkopf, Steven M. Girvin, Michel H. Devoret e colleghi, Università di Yale', text: 'Un grande condensatore in parallelo alla giunzione rende il qubit quasi insensibile al rumore di carica, ma lascia i livelli abbastanza diversi da isolare |0⟩ e |1⟩. Dimostrato nel 2008, è oggi il qubit superconduttore più usato, con frequenze di qualche gigahertz.' },
      { year: 2024, title: 'Willow: errori sotto la soglia', who: 'Google Quantum AI, Santa Barbara', text: 'Cinque anni dopo Sycamore (2019: 53 qubit e un calcolo senza utilità pratica, con un vantaggio contestato da IBM), il chip Willow da 105 qubit mostra che ingrandendo il codice di correzione (griglie di 3×3, 5×5 e 7×7 qubit di dati) l\'errore del qubit logico si riduce di oltre la metà a ogni passo. È una memoria protetta, non ancora un calcolo utile. Nel 2025 lo stesso chip ha eseguito una misura di fisica («Quantum Echoes») circa 13 000 volte più in fretta della migliore simulazione classica stimata: un risultato che attende conferme indipendenti.' },
    ],
    fun: 'Il risultato del 1911 è annotato nel quaderno di laboratorio con tre parole: «Kwik nagenoeg nul», mercurio praticamente zero. La data esatta, l\'8 aprile, è stata ricostruita solo nel 2010 da Dirk van Delft e Peter Kes. Secondo la loro analisi, quello stesso giorno a Leida si osservò anche, senza riconoscerla, la transizione dell\'elio liquido allo stato superfluido, intorno a 2,2 K.',
    uses: [
      'Risonanza magnetica: bobine in niobio-titanio a 4,2 K per campi di 1,5-3 tesla',
      'Acceleratori e fusione: i 1232 dipoli superconduttori dell\'LHC e i magneti di ITER',
      'Sensori SQUID per la magnetoencefalografia, sensibili a pochi femtotesla',
      'Campione di tensione Josephson: il volt riprodotto da migliaia di giunzioni',
      'Testine dei dischi rigidi: GMR dal 1997, oggi magnetoresistenza tunnel',
      'MRAM: memorie non volatili per auto, industria, avionica e satelliti',
      'Rivelatori superconduttori di singolo fotone e ricevitori dei radiotelescopi',
      'Computer quantistici superconduttori accessibili in cloud per la ricerca',
    ],
    glossary: [
      { term: 'Superconduttività ed effetto Meissner', def: 'Sotto la temperatura critica <var>T</var><sub>c</sub> alcuni materiali conducono la corrente continua senza resistenza ed espellono il campo magnetico dal proprio interno (effetto Meissner, 1933). È l\'espulsione del campo a distinguerli da un ipotetico «conduttore perfetto».' },
      { term: 'Coppia di Cooper', def: 'Due elettroni con spin e quantità di moto opposti, legati debolmente grazie alle vibrazioni del reticolo. Non è una molecola compatta: si estende da decine di nanometri a circa un micrometro, e milioni di coppie sovrapposte formano un unico stato quantistico con carica 2<var>e</var>.' },
      { term: 'Giunzione Josephson e SQUID', def: 'Due superconduttori separati da 1-2 nm di isolante, che le coppie attraversano per effetto tunnel. Lo SQUID è un anello con una o due giunzioni: la sua risposta si ripete a ogni quanto di flusso <var>Φ</var><sub>0</sub>, e per questo misura campi di pochi femtotesla.' },
      { term: 'Valvola di spin', def: 'Due strati magnetici separati da pochi nanometri di metallo non magnetico: uno ha la magnetizzazione bloccata, l\'altro la orienta secondo il campo esterno. La resistenza è bassa con magnetizzazioni parallele e alta con magnetizzazioni antiparallele (magnetoresistenza gigante, GMR).' },
      { term: 'Qubit e notazione |0⟩, |1⟩', def: 'Sistema quantistico a due livelli. |0⟩ e |1⟩ (si leggono «ket zero» e «ket uno») sono etichette per lo stato di energia più bassa e per il primo stato eccitato; uno stato qualunque si scrive <var>α</var>|0⟩ + <var>β</var>|1⟩.' },
      { term: 'Transmon', def: 'Qubit superconduttore fatto da una giunzione Josephson in parallelo a un grande condensatore. I primi due livelli, separati da qualche gigahertz, fanno da |0⟩ e |1⟩; il successivo è spostato di circa 200-300 MHz, così gli impulsi a microonde pilotano solo la transizione fra 0 e 1.' },
      { term: 'Decoerenza (T1 e T2)', def: '<var>T</var><sub>1</sub> misura quanto rapidamente |1⟩ decade in |0⟩ cedendo energia; <var>T</var><sub>2</sub> quanto rapidamente si perde la fase fra |0⟩ e |1⟩, cioè quanto si accorcia la parte orizzontale del vettore di Bloch. Vale sempre <var>T</var><sub>2</sub> ≤ 2<var>T</var><sub>1</sub>.' },
      { term: 'Qubit logico', def: 'Un qubit protetto, codificato in molti qubit fisici che vengono controllati di continuo per scoprire e correggere gli errori. Ingrandendo il codice l\'errore logico scende, purché ogni qubit fisico sbagli meno di una certa soglia.' },
    ],
    sources: [
      { title: 'D. van Delft, P. Kes, The discovery of superconductivity, Physics Today (2010)', url: 'https://doi.org/10.1063/1.3490499' },
      { title: 'Premio Nobel per la Fisica 2007: la magnetoresistenza gigante (NobelPrize.org)', url: 'https://www.nobelprize.org/prizes/physics/2007/press-release/' },
      { title: 'Premio Nobel per la Fisica 2025: effetto tunnel macroscopico in un circuito (NobelPrize.org)', url: 'https://www.nobelprize.org/prizes/physics/2025/press-release/' },
      { title: 'Nakamura, Pashkin, Tsai, Coherent control of macroscopic quantum states in a single-Cooper-pair box, Nature (1999)', url: 'https://www.nature.com/articles/19718' },
      { title: 'Koch e colleghi, Charge-insensitive qubit design derived from the Cooper pair box: il transmon (2007)', url: 'https://arxiv.org/abs/cond-mat/0703002' },
      { title: 'Google Quantum AI, Quantum error correction below the surface code threshold, Nature (2024)', url: 'https://www.nature.com/articles/s41586-024-08449-y' },
      { title: 'Il quanto di flusso magnetico h/2e (NIST, costanti fondamentali)', url: 'https://physics.nist.gov/cgi-bin/cuu/Value?flxquhs2e' },
    ],
    quiz: [
      { id: 'ea-quantistica-01', chapter: 'quantistica', level: 1, topic: 'Valvola di spin', q: 'In una valvola di spin, come quelle delle testine dei dischi rigidi, quando la resistenza elettrica è più bassa?', options: ['Quando le magnetizzazioni dei due strati sono parallele', 'Quando le magnetizzazioni dei due strati sono antiparallele', 'Quando lo strato libero perde del tutto la magnetizzazione', 'Quando lo strato di rame diventa superconduttore'], answer: 0, why: 'Con magnetizzazioni parallele gli elettroni con lo spin concorde attraversano entrambi gli strati quasi senza urti e formano un canale veloce. Con magnetizzazioni antiparallele ogni elettrone viene frenato in uno dei due strati e la resistenza sale.' },
      { id: 'ea-quantistica-02', chapter: 'quantistica', level: 2, topic: 'Probabilità di misura', q: 'Un qubit è preparato con θ = 60° sulla sfera di Bloch. Si preparano e si misurano 100 copie identiche: quanti 0 ti aspetti, circa?', options: ['Circa 75, con fluttuazioni di qualche unità', 'Esattamente 50, perché è una sovrapposizione', 'Circa 60, perché l\'angolo vale 60 gradi', 'Tutti e 100, perché lo stato è vicino a |0⟩'], answer: 0, why: 'P(0) = cos²(θ/2) = cos²(30°) = 0,75. Su 100 copie ci si aspettano circa 75 zeri, con una deviazione standard √(100 · 0,75 · 0,25) ≈ 4: risultati fra 70 e 80 sono del tutto normali.' },
      { id: 'ea-quantistica-03', chapter: 'quantistica', level: 3, topic: 'Perché 10 mK', q: 'Un transmon lavora a 5 GHz, con quanti di energia di circa 20,7 µeV. Perché il chip si tiene intorno a 10 mK e non, per esempio, a 0,24 K?', options: ['A 0,24 K il calore ecciterebbe il qubit circa una volta su quattro', 'A 0,24 K l\'alluminio della giunzione non è ancora superconduttore', 'Solo sotto 10 mK la frequenza del qubit arriva a 5 GHz', 'Solo a 10 mK gli atomi del reticolo smettono del tutto di vibrare'], answer: 0, why: 'A 5 GHz il quanto h·f equivale all\'energia termica a circa 0,24 K: a quella temperatura il livello |1⟩ sarebbe popolato dal calore circa una volta su quattro. A 10 mK il rapporto h·f/(k_B·T) vale circa 24 e l\'eccitazione termica scende a circa 4·10⁻¹¹. L\'alluminio, invece, è superconduttore già sotto 1,2 K.' },
      { id: 'ea-quantistica-04', chapter: 'quantistica', level: 2, topic: 'Willow e i suoi limiti', q: 'Che cosa ha dimostrato Google nel 2024 con il chip superconduttore Willow da 105 qubit?', options: ['Che ingrandendo il codice di correzione l\'errore del qubit logico cala', 'Che un computer quantistico può già violare la crittografia RSA-2048', 'Che i qubit superconduttori funzionano anche a temperatura ambiente', 'Che risolve problemi industriali meglio di qualunque supercomputer'], answer: 0, why: 'Passando da griglie di 3×3 a 5×5 e 7×7 qubit di dati, l\'errore del qubit logico si è ridotto di oltre la metà a ogni passo: è una memoria quantistica protetta, non ancora un calcolo utile. Per violare RSA-2048 servirebbe, secondo una stima del 2025, poco meno di un milione di qubit fisici.' },
    ],
    hero: {
      caption: 'In ambra gli elettroni normali, in blu le coppie di Cooper e il qubit.',
      label: 'Animazione: superconduttività, valvola di spin e qubit sulla sfera di Bloch',
      aspect: '16 / 7',
      aspectMobile: '3 / 4',
      mount: mountHero,
    },
    lab: {
      title: 'Pilota un qubit',
      intro: 'Applica le porte e guarda la freccia ruotare sulla sfera di Bloch. <strong>Misura</strong> fa collassare lo stato su 0 o su 1, a caso; <strong>Ripeti 100 misure</strong> prepara cento copie identiche e conta i risultati. Con <strong>Attendi</strong> il qubit perde la fase in un tempo <var>T</var><sub>2</sub>: prova H, attesa, H e poi cento misure.',
      mount: mountLab,
    },
    model,
  });
})(typeof window !== 'undefined' ? window : globalThis);
