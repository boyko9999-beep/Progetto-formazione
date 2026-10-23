/*
 * Storia del PC · apertura: una scheda madre moderna disegnata in SVG.
 * Le piste di rame si accendono, i dati viaggiano sui bus e ogni componente
 * porta al capitolo che lo racconta. Il ciclo si ferma quando la scheda
 * esce dallo schermo o la scheda del browser è nascosta.
 */
(function () {
  'use strict';

  const P = window.StoriaPC;
  const contenitore = document.getElementById('spc-mappa');
  if (!P || !contenitore) return;
  const { s, h } = P;

  // Componenti: posizione sulla scheda (viewBox 640x480) e capitolo collegato.
  const COMPONENTI = [
    { id: 'cpu', cap: 'von-neumann', nome: 'Processore (CPU)', testo: 'esegue le istruzioni una dopo l\'altra, prendendole dalla stessa memoria dei dati.' },
    { id: 'ram', cap: 'memoria', nome: 'Memoria RAM', testo: 'velocissima ma dimentica tutto allo spegnimento: un gradino della gerarchia della memoria.' },
    { id: 'gpu', cap: 'grafica', nome: 'Slot PCIe x16 per la scheda video', testo: 'qui si collega la GPU, erede delle schede CGA, EGA e VGA.' },
    { id: 'ssd', cap: 'memoria', nome: 'Unità SSD M.2', testo: 'archivio permanente su memoria flash, migliaia di volte più veloce di un dischetto.' },
    { id: 'pch', cap: 'scheda-madre', nome: 'Chipset (PCH)', testo: 'smista il traffico verso dischi, USB e rete: ciò che resta del northbridge e del southbridge.' },
    { id: 'bios', cap: 'avvio', nome: 'Chip del firmware (BIOS/UEFI)', testo: 'il primo programma che il processore esegue quando premi il tasto di accensione.' },
    { id: 'cmos', cap: 'avvio', nome: 'Batteria CMOS', testo: 'tiene acceso l\'orologio e conserva le impostazioni anche a computer spento.' },
    { id: 'slot', cap: 'ibm-pc', nome: 'Slot di espansione PCIe x1', testo: 'l\'idea dell\'IBM PC del 1981: un\'architettura aperta che chiunque può ampliare.' },
    { id: 'vrm', cap: 'prestazioni', nome: 'Regolatori di tensione (VRM)', testo: 'portano al processore oltre cento ampere: il calore è il vero limite delle prestazioni.' },
    { id: 'atx', cap: 'giganti', nome: 'Connettore di alimentazione ATX', testo: 'un PC consuma qualche centinaio di watt; l\'ENIAC del 1946 ne voleva circa 150.000.' },
    { id: 'pannello', cap: 'primi-pc', nome: 'Connettore del pannello frontale', testo: 'tasto di accensione e LED: gli eredi degli interruttori e delle lucine dell\'Altair 8800.' },
    { id: 'wifi', cap: 'oggi', nome: 'Modulo Wi-Fi', testo: 'il PC senza fili, come nei portatili e negli smartphone di oggi.' },
    { id: 'audio', cap: 'grafica', nome: 'Chip audio', testo: 'dal bip dell\'altoparlante del PC alla Sound Blaster, fino all\'audio integrato.' },
    { id: 'io', href: '../../index.html#/bus/usb', nome: 'Pannello posteriore: USB, video, rete', testo: 'le porte verso il mondo esterno. L\'USB ha sostituito seriale, parallela e PS/2.', dove: 'Lezione USB in BusLab' },
  ];

  // Piste di rame: tipo di bus (colore e velocità dei pacchetti) e componenti collegati.
  const TIPI = {
    ram: { colore: 'var(--trace-1)', velocita: 0.55, pacchetti: 2 },
    pcie: { colore: 'var(--trace-3)', velocita: 0.42, pacchetti: 2 },
    dmi: { colore: 'var(--trace-2)', velocita: 0.32, pacchetti: 2 },
    io: { colore: 'var(--trace-4)', velocita: 0.22, pacchetti: 1 },
    potenza: { colore: 'var(--trace-stuff)', velocita: 0.3, pacchetti: 1 },
  };

  const PISTE = [];
  for (let i = 0; i < 8; i++) {
    const y = 104 + i * 12;
    PISTE.push({ tipo: 'ram', comp: ['cpu', 'ram'], d: 'M370 ' + y + ' H398 L406 ' + (y + 4) + ' H430' });
  }
  [244, 254, 264, 274].forEach((x, i) => {
    PISTE.push({ tipo: 'pcie', comp: ['cpu', 'gpu'], d: 'M' + x + ' 228 V' + (262 + i * 3) + ' L' + (x - 30) + ' ' + (276 + i * 3) + ' V300' });
  });
  [316, 326, 336].forEach((x) => {
    PISTE.push({ tipo: 'pcie', comp: ['cpu', 'ssd'], d: 'M' + x + ' 228 V346' });
  });
  [0, 6, 12].forEach((o) => {
    PISTE.push({ tipo: 'dmi', comp: ['cpu', 'pch'], d: 'M' + (352 + o) + ' 228 V' + (246 + o) + ' H' + (470 + o) + ' V330' });
  });
  [0, 1, 2, 3].forEach((i) => {
    PISTE.push({ tipo: 'io', comp: ['pch', 'io'], d: 'M526 ' + (342 + i * 8) + ' H548 V' + (306 + i * 24) + ' H572', fine: 'sata' });
  });
  PISTE.push({ tipo: 'io', comp: ['pch', 'io'], d: 'M452 330 V266 H140 V198 H68' });
  PISTE.push({ tipo: 'io', comp: ['pch', 'wifi'], d: 'M446 330 V272 H134 V214 H122' });
  PISTE.push({ tipo: 'pcie', comp: ['pch', 'slot'], d: 'M440 392 H172 V359 H156' });
  PISTE.push({ tipo: 'io', comp: ['pch', 'bios'], d: 'M456 416 V440 H215 V432' });
  PISTE.push({ tipo: 'io', comp: ['pch', 'audio'], d: 'M470 416 V454 H74 V448' });
  PISTE.push({ tipo: 'io', comp: ['pch', 'pannello'], d: 'M566 428 H520 V416' });
  PISTE.push({ tipo: 'potenza', comp: ['atx', 'vrm'], d: 'M587 90 V26 H392 V36' });
  PISTE.push({ tipo: 'potenza', comp: ['vrm', 'cpu'], d: 'M181 200 V226 H220' });
  [222, 252, 282, 312, 342, 372].forEach((x) => PISTE.push({ tipo: 'potenza', comp: ['vrm', 'cpu'], d: 'M' + (x + 11) + ' 58 V78', corta: true }));
  [92, 122, 152].forEach((y) => PISTE.push({ tipo: 'potenza', comp: ['vrm', 'cpu'], d: 'M192 ' + (y + 11) + ' H220', corta: true }));

  /* ---------- disegno ---------- */

  function chip(x, y, w, hh, testo, extra) {
    return s('g', null,
      s('rect', { x: x, y: y, width: w, height: hh, rx: 2, class: 'hm-chip' }),
      testo ? s('text', { x: x + w / 2, y: y + hh / 2 + 3.5, class: 'hm-scritta', 'text-anchor': 'middle' }, testo) : null,
      extra || null);
  }

  function disegnaComponente(id) {
    switch (id) {
      case 'cpu': {
        const pin = [];
        for (let i = 0; i < 12; i++) {
          pin.push(s('rect', { x: 226 + i * 12, y: 82, width: 6, height: 3, class: 'hm-pin' }));
          pin.push(s('rect', { x: 226 + i * 12, y: 221, width: 6, height: 3, class: 'hm-pin' }));
        }
        return [
          s('rect', { x: 220, y: 78, width: 150, height: 150, rx: 6, class: 'hm-zoccolo' }),
          pin,
          s('rect', { x: 240, y: 98, width: 110, height: 110, rx: 8, class: 'hm-ihs' }),
          s('rect', { x: 250, y: 108, width: 90, height: 90, rx: 4, class: 'hm-ihs-in' }),
          s('text', { x: 295, y: 158, class: 'hm-scritta grande', 'text-anchor': 'middle' }, 'CPU'),
        ];
      }
      case 'ram': {
        const out = [];
        [430, 446, 462, 478].forEach((x, i) => {
          out.push(s('rect', { x: x, y: 52, width: 10, height: 228, rx: 2, class: 'hm-slot' }));
          out.push(s('rect', { x: x - 1, y: 46, width: 12, height: 8, rx: 1.5, class: 'hm-gancio' }));
          out.push(s('rect', { x: x - 1, y: 278, width: 12, height: 8, rx: 1.5, class: 'hm-gancio' }));
          if (i === 1 || i === 3) {
            out.push(s('rect', { x: x + 1.5, y: 60, width: 7, height: 212, rx: 1, class: 'hm-modulo' }));
            for (let k = 0; k < 8; k++) out.push(s('rect', { x: x + 2.5, y: 68 + k * 25, width: 5, height: 16, class: 'hm-chip' }));
          }
        });
        out.push(s('text', { x: 459, y: 300, class: 'hm-scritta etichetta', 'text-anchor': 'middle' }, 'DDR5'));
        return out;
      }
      case 'gpu':
        return [
          s('rect', { x: 60, y: 300, width: 362, height: 16, rx: 3, class: 'hm-slot' }),
          s('rect', { x: 64, y: 305, width: 354, height: 6, rx: 1, class: 'hm-contatti' }),
          s('rect', { x: 418, y: 296, width: 10, height: 24, rx: 2, class: 'hm-gancio' }),
          s('text', { x: 64, y: 293, class: 'hm-scritta etichetta' }, 'PCIe x16'),
        ];
      case 'ssd':
        return [
          s('rect', { x: 190, y: 346, width: 204, height: 26, rx: 3, class: 'hm-m2' }),
          chip(204, 351, 40, 16),
          chip(256, 351, 54, 16, 'NVMe'),
          chip(322, 351, 54, 16),
          s('circle', { cx: 402, cy: 359, r: 5, class: 'hm-vite' }),
          s('text', { x: 190, y: 386, class: 'hm-scritta etichetta' }, 'M.2'),
        ];
      case 'pch': {
        const alette = [];
        for (let i = 0; i < 7; i++) alette.push(s('rect', { x: 446 + i * 11, y: 336, width: 6, height: 74, rx: 2, class: 'hm-aletta' }));
        return [s('rect', { x: 440, y: 330, width: 86, height: 86, rx: 6, class: 'hm-dissipatore' }), alette,
          s('text', { x: 483, y: 377, class: 'hm-scritta grande ombra', 'text-anchor': 'middle' }, 'PCH')];
      }
      case 'bios':
        return [chip(200, 412, 30, 20, 'BIOS'),
          [0, 1, 2, 3].map((i) => s('rect', { x: 203 + i * 7, y: 408, width: 3, height: 4, class: 'hm-pin' }))];
      case 'cmos':
        return [s('circle', { cx: 290, cy: 424, r: 18, class: 'hm-batteria' }), s('circle', { cx: 290, cy: 424, r: 13, class: 'hm-batteria-in' }),
          s('text', { x: 290, y: 428, class: 'hm-scritta', 'text-anchor': 'middle' }, 'CR2032')];
      case 'slot':
        return [s('rect', { x: 60, y: 352, width: 96, height: 14, rx: 3, class: 'hm-slot' }),
          s('rect', { x: 64, y: 356, width: 88, height: 6, rx: 1, class: 'hm-contatti' })];
      case 'vrm': {
        const out = [];
        [222, 252, 282, 312, 342, 372].forEach((x) => out.push(s('rect', { x: x, y: 36, width: 22, height: 22, rx: 3, class: 'hm-induttore' })));
        [92, 122, 152].forEach((y) => out.push(s('rect', { x: 170, y: y, width: 22, height: 22, rx: 3, class: 'hm-induttore' })));
        out.push(s('rect', { x: 170, y: 182, width: 22, height: 18, rx: 2, class: 'hm-chip' }));
        return out;
      }
      case 'atx': {
        const pin = [];
        for (let r = 0; r < 12; r++) for (let c = 0; c < 2; c++) pin.push(s('rect', { x: 579 + c * 9, y: 96 + r * 8.6, width: 6, height: 5.5, rx: 1, class: 'hm-foro' }));
        return [s('rect', { x: 574, y: 90, width: 26, height: 112, rx: 3, class: 'hm-connettore' }), pin,
          s('text', { x: 587, y: 216, class: 'hm-scritta etichetta', 'text-anchor': 'middle' }, 'ATX')];
      }
      case 'pannello': {
        const pin = [];
        for (let c = 0; c < 5; c++) for (let r = 0; r < 2; r++) pin.push(s('circle', { cx: 572 + c * 7, cy: 424 + r * 7, r: 2, class: 'hm-oro' }));
        return [s('rect', { x: 566, y: 418, width: 40, height: 20, rx: 2, class: 'hm-connettore' }), pin];
      }
      case 'wifi':
        return [s('rect', { x: 80, y: 150, width: 42, height: 62, rx: 3, class: 'hm-m2' }),
          chip(88, 160, 26, 22, 'Wi-Fi'),
          s('circle', { cx: 92, cy: 198, r: 4, class: 'hm-oro' }), s('circle', { cx: 110, cy: 198, r: 4, class: 'hm-oro' })];
      case 'audio':
        return [chip(52, 418, 30, 30, null),
          s('rect', { x: 88, y: 420, width: 8, height: 12, rx: 2, class: 'hm-condensatore' }),
          s('rect', { x: 88, y: 436, width: 8, height: 12, rx: 2, class: 'hm-condensatore' })];
      case 'io': {
        const out = [s('rect', { x: 22, y: 36, width: 46, height: 176, rx: 3, class: 'hm-schermo-io' })];
        [44, 62].forEach((y) => out.push(s('rect', { x: 30, y: y, width: 30, height: 12, rx: 2, class: 'hm-porta usb' })));
        out.push(s('rect', { x: 30, y: 84, width: 30, height: 18, rx: 2, class: 'hm-porta' }));
        out.push(s('rect', { x: 30, y: 110, width: 30, height: 22, rx: 2, class: 'hm-porta rete' }));
        [144, 160, 176].forEach((y, i) => out.push(s('circle', { cx: 45, cy: y + 6, r: 5, class: 'hm-jack j' + i })));
        return out;
      }
      default: return [];
    }
  }

  /* ---------- costruzione ---------- */

  const svg = s('svg', { class: 'spc-mappa-svg', viewBox: '0 0 640 480', role: 'group', 'aria-label': 'Scheda madre di un PC di oggi: scegli un componente per aprire il suo capitolo' });
  const defs = s('defs', null,
    s('pattern', { id: 'hm-griglia', width: 12, height: 12, patternUnits: 'userSpaceOnUse' }, s('circle', { cx: 1, cy: 1, r: 0.8, class: 'hm-punto' })),
    s('radialGradient', { id: 'hm-alone' }, s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.9' }), s('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' })));
  svg.append(defs,
    s('rect', { x: 14, y: 14, width: 612, height: 452, rx: 14, class: 'hm-scheda' }),
    s('rect', { x: 14, y: 14, width: 612, height: 452, rx: 14, fill: 'url(#hm-griglia)', class: 'hm-trama' }),
    [[30, 228], [604, 30], [604, 452], [168, 452], [520, 228]].map(([x, y]) => s('circle', { cx: x, cy: y, r: 6, class: 'hm-foro-fissaggio' })));

  const gPiste = s('g', { class: 'hm-piste', 'aria-hidden': 'true' });
  const gPacchetti = s('g', { class: 'hm-pacchetti', 'aria-hidden': 'true' });
  const gComp = s('g', { class: 'hm-componenti' });
  svg.append(gPiste, gComp, gPacchetti);

  const piste = PISTE.map((p) => {
    const path = s('path', { d: p.d, class: 'hm-pista t-' + p.tipo + (p.corta ? ' corta' : '') });
    gPiste.append(path);
    return Object.assign({ el: path, len: 0, pacchetti: [] }, p);
  });

  const perComp = new Map();
  const voci = COMPONENTI.map((c, i) => {
    const capitolo = c.cap ? P.capitoli.find((x) => x.id === c.cap) : null;
    const href = c.href || '#' + c.cap;
    const dove = c.dove || (capitolo ? 'Capitolo ' + capitolo.numero + ': ' + capitolo.titolo.replace(/<[^>]+>/g, '') : 'Capitolo');
    const a = s('a', { href: href, class: 'hm-comp c-' + c.id, 'data-comp': c.id, 'aria-label': c.nome + '. ' + dove, style: '--i:' + i },
      s('title', null, c.nome), disegnaComponente(c.id));
    gComp.append(a);
    const voce = Object.assign({ el: a, dove: dove, href: href }, c);
    perComp.set(c.id, voce);
    return voce;
  });

  // La didascalia parla agli screen reader solo per le scelte dell'utente, non per il giro automatico.
  const dida = h('figcaption', { class: 'spc-mappa-dida', 'aria-live': 'off' });
  contenitore.append(svg, dida);
  const tocco = window.matchMedia && window.matchMedia('(hover: none)').matches;

  function didaBase() {
    dida.replaceChildren(h('span', null, h('strong', null, 'Una scheda madre di oggi. '),
      tocco ? 'Tocca un componente per aprire il capitolo che lo racconta.' : 'Passa sopra un componente, oppure usa Tab, per scoprire a quale capitolo porta.'));
  }
  didaBase();

  /* ---------- evidenziazione ---------- */

  let scelto = null;
  function evidenzia(id, daUtente) {
    if (scelto === id) return;
    scelto = id;
    svg.classList.toggle('hm-scelta', !!id);
    voci.forEach((v) => v.el.classList.toggle('on', v.id === id));
    piste.forEach((p) => p.el.classList.toggle('on', !!id && p.comp.includes(id)));
    if (daUtente) dida.setAttribute('aria-live', 'polite');
    if (!id) { didaBase(); return; }
    const v = perComp.get(id);
    dida.replaceChildren(
      h('span', null, h('strong', null, v.nome + ': '), v.testo),
      h('a', { href: v.href }, v.dove + ' →'));
  }

  voci.forEach((v) => {
    v.el.addEventListener('pointerenter', () => { fermaGiro(); evidenzia(v.id, true); });
    v.el.addEventListener('focus', () => { fermaGiro(); evidenzia(v.id, true); });
  });
  svg.addEventListener('pointerleave', () => { if (!giroAttivo) evidenzia(null); });
  svg.addEventListener('focusout', (e) => { if (!svg.contains(e.relatedTarget) && !giroAttivo) evidenzia(null); });

  /* ---------- pacchetti di dati ---------- */

  const NS = 'http://www.w3.org/2000/svg';
  piste.forEach((p, i) => {
    const tipo = TIPI[p.tipo];
    p.len = p.el.getTotalLength();
    const n = p.corta ? 1 : tipo.pacchetti;
    for (let k = 0; k < n; k++) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'hm-pacchetto t-' + p.tipo);
      g.style.setProperty('--colore', tipo.colore);
      const alone = document.createElementNS(NS, 'circle');
      alone.setAttribute('r', p.corta ? 4 : 6);
      alone.setAttribute('class', 'hm-alone');
      const punto = document.createElementNS(NS, 'circle');
      punto.setAttribute('r', p.corta ? 1.6 : 2.2);
      punto.setAttribute('class', 'hm-luce');
      g.append(alone, punto);
      gPacchetti.append(g);
      p.pacchetti.push({ el: g, fase: (k / n + (i * 0.137) % 1) % 1 });
    }
  });

  function muovi(dt) {
    for (const p of piste) {
      const tipo = TIPI[p.tipo];
      const acceso = scelto && p.comp.includes(scelto);
      const spento = scelto && !acceso;
      // velocità in "lunghezze al secondo", normalizzata sulla lunghezza della pista
      const v = tipo.velocita * (acceso ? 2.2 : 1) * (160 / Math.max(60, p.len)) * (p.corta ? 0.5 : 1);
      for (const k of p.pacchetti) {
        k.fase = (k.fase + dt * v) % 1;
        const pt = p.el.getPointAtLength(k.fase * p.len);
        k.el.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
        const bordo = Math.min(k.fase, 1 - k.fase) * 8;
        k.el.style.opacity = String(Math.min(1, bordo) * (spento ? 0.25 : 1));
      }
    }
  }

  /* ---------- giro automatico (si ferma al primo gesto) ---------- */

  let giroAttivo = false;
  let giroTimer = 0;
  let giroIndice = 0;
  let giroUsato = false;
  const GIRO = ['cpu', 'ram', 'gpu', 'pch', 'bios', 'ssd', 'vrm', 'pannello'];

  function passoGiro() {
    evidenzia(GIRO[giroIndice % GIRO.length], false);
    giroIndice += 1;
    giroTimer = window.setTimeout(passoGiro, 3200);
  }
  function avviaGiro() {
    if (giroUsato || giroAttivo || P.ridotto()) return;
    giroAttivo = true;
    giroTimer = window.setTimeout(passoGiro, 2600);
  }
  function sospendiGiro() {
    window.clearTimeout(giroTimer);
    giroAttivo = false;
  }
  function fermaGiro() {
    if (giroUsato) return;
    giroUsato = true;
    sospendiGiro();
  }
  ['pointerdown', 'keydown', 'touchstart', 'focusin'].forEach((ev) => contenitore.addEventListener(ev, fermaGiro, { passive: true }));

  /* ---------- accensione e ciclo ---------- */

  const ciclo = P.loop((dt) => { muovi(dt); });

  function accendi() {
    if (P.ridotto() || typeof svg.animate !== 'function') {
      svg.classList.add('hm-acceso');
      return;
    }
    const cx = 295;
    const cy = 153;
    piste.forEach((p) => {
      const b = p.el.getBBox();
      const dist = Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy);
      p.el.style.strokeDasharray = p.len + ' ' + p.len;
      p.el.animate([{ strokeDashoffset: p.len }, { strokeDashoffset: 0 }], {
        duration: 700 + p.len * 1.2, delay: 200 + dist * 1.6, easing: P.motion.ease.smooth, fill: 'backwards',
      }).finished.then(() => { p.el.style.strokeDasharray = ''; }).catch(() => {});
    });
    voci.forEach((v, i) => {
      v.el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], {
        duration: P.motion.dur.slow, delay: 120 + i * 55, easing: P.motion.ease.smooth, fill: 'backwards',
      });
    });
    gPacchetti.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: 900, fill: 'backwards' });
    svg.classList.add('hm-acceso');
  }

  let acceso = false;
  let visibile = false;
  function aggiornaStato() {
    const attivo = visibile && !document.hidden;
    if (attivo && !acceso) { acceso = true; accendi(); }
    if (attivo && !P.ridotto()) { ciclo.start(); avviaGiro(); } else { ciclo.stop(); sospendiGiro(); }
    if (P.ridotto()) muovi(0);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visibile = entries[0].isIntersecting;
      aggiornaStato();
    }, { threshold: 0.15 }).observe(contenitore);
  } else {
    visibile = true;
    aggiornaStato();
  }
  document.addEventListener('visibilitychange', aggiornaStato);
})();
