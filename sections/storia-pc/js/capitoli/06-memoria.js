/*
 * Storia del PC · capitolo 6: La gerarchia della memoria.
 * Testi, due illustrazioni (la piramide della gerarchia disegnata con gli oggetti veri e un
 * piano di memoria a nuclei di ferrite) e il laboratorio «Quanto è lontano un dato?».
 * Latenze, tempo umano e simulatore di cache sono nel modello js/modelli/06-memoria.js.
 * Il file non tocca il DOM al caricamento: il DOM si usa solo dentro le funzioni svg()
 * delle figure e dentro lab.crea().
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {}).memoria;

  /* ======================================================================
   * Figura 1 · la piramide della gerarchia, disegnata con gli oggetti
   * ====================================================================== */

  const CX = 384; // asse della piramide (a sinistra resta la colonna delle etichette)
  const GRADINI = [
    { et: 'Registri', y: 12, h: 54, w: 168, det: '≈ 0,3 ns' },
    { et: 'Cache', y: 72, h: 54, w: 232, det: '1–15 ns' },
    { et: 'RAM', y: 132, h: 58, w: 296, det: '≈ 100 ns' },
    { et: 'SSD', y: 196, h: 58, w: 360, det: '≈ 50 µs' },
    { et: 'Disco', y: 260, h: 88, w: 436, det: '5–10 ms' },
    { et: 'Rete', y: 354, h: 74, w: 500, det: '100–150 ms' },
  ];

  function ripeti(n, fn) { let s = ''; for (let i = 0; i < n; i++) s += fn(i); return s; }

  // Le piccole animazioni delle figure (piatto che gira, correnti, nuclei) girano solo quando la
  // figura è sullo schermo: fuori vista si mettono in pausa e non consumano batteria.
  function soloInVista(markup) {
    const el = P.svgDaTesto(markup);
    if (el && typeof IntersectionObserver !== 'undefined') {
      el.classList.add('mem-fermo');
      const io = new IntersectionObserver((voci) => voci.forEach((v) => el.classList.toggle('mem-fermo', !v.isIntersecting)));
      io.observe(el);
    }
    return el;
  }

  function oggettoRegistri() {
    // Un frammento di processore con il banco dei registri (alcuni bit accesi).
    const accesi = [1, 0, 1, 1, 0, 1, 0, 0];
    return '<g>' +
      ripeti(7, (k) => '<rect class="mem-oro" x="' + (335 + k * 8) + '" y="17" width="4" height="4"/><rect class="mem-oro" x="' + (335 + k * 8) + '" y="57" width="4" height="4"/>') +
      '<rect class="mem-chip" x="330" y="21" width="62" height="36" rx="3"/>' +
      ripeti(8, (k) => {
        const c = k % 4, r = Math.floor(k / 4);
        return '<rect class="' + (accesi[k] ? 'mem-bit-on' : 'mem-bit') + '" x="' + (337 + c * 13) + '" y="' + (27 + r * 13) + '" width="10" height="10" rx="1.5"/>';
      }) +
      '</g>';
  }

  function oggettoCache() {
    // Il chip del processore visto dall'alto: le cache sono le grandi matrici regolari di SRAM.
    return '<g>' +
      '<rect class="mem-substrato" x="314" y="78" width="112" height="42" rx="3"/>' +
      '<rect class="mem-die" x="326" y="82" width="88" height="34" rx="2"/>' +
      '<rect class="mem-sram" x="330" y="86" width="24" height="26"/>' +
      '<rect class="mem-sram" x="386" y="86" width="24" height="26"/>' +
      ripeti(5, (k) => '<path class="mem-sram-riga" d="M330 ' + (90.5 + k * 4.4) + 'h24M386 ' + (90.5 + k * 4.4) + 'h24"/>') +
      '<rect class="mem-core" x="358" y="86" width="24" height="12"/>' +
      '<rect class="mem-core" x="358" y="100" width="24" height="12"/>' +
      '</g>';
  }

  function oggettoDimm() {
    // Un modulo DIMM: circuito stampato verde, chip di DRAM, contatti dorati e la tacca.
    return '<g>' +
      '<rect class="mem-pcb" x="265" y="143" width="190" height="35" rx="2"/>' +
      ripeti(8, (k) => '<rect class="mem-chip" x="' + (271 + k * 22.5) + '" y="147" width="17" height="17" rx="1"/>') +
      '<rect class="mem-chip" x="446" y="148" width="6" height="6"/>' +
      ripeti(36, (k) => '<rect class="mem-oro" x="' + (268.5 + k * 5.15) + '" y="170.5" width="3" height="6"/>') +
      '<rect class="mem-tacca" x="345" y="171" width="6" height="8"/>' +
      '</g>';
  }

  function oggettoM2() {
    // Un SSD M.2 NVMe: controller, due chip di memoria flash, contatti a pettine e mezzaluna della vite.
    return '<g>' +
      '<rect class="mem-pcb-nero" x="285" y="207" width="150" height="36" rx="3"/>' +
      ripeti(7, (k) => (k === 4 ? '' : '<rect class="mem-oro" x="287" y="' + (210 + k * 4.4) + '" width="7" height="2.6"/>')) +
      '<rect class="mem-chip" x="302" y="213" width="24" height="24" rx="1.5"/>' +
      '<rect class="mem-nand" x="334" y="212" width="38" height="26" rx="1.5"/>' +
      '<rect class="mem-nand" x="378" y="212" width="38" height="26" rx="1.5"/>' +
      '<circle class="mem-tacca" cx="435" cy="225" r="5"/>' +
      '</g>';
  }

  function oggettoDisco() {
    // Un disco rigido da 3,5 pollici aperto: piatto, perno, braccio con la testina, magnete.
    return '<g>' +
      '<rect class="mem-hdd" x="304" y="266" width="112" height="76" rx="5"/>' +
      '<rect class="mem-hdd-in" x="309" y="271" width="102" height="66" rx="4"/>' +
      '<circle class="mem-piatto" cx="348" cy="304" r="31"/>' +
      '<g class="mem-riflesso"><path d="M327 287a27 27 0 0 1 21-10" /><path d="M369 321a27 27 0 0 1-21 10"/></g>' +
      '<circle class="mem-perno" cx="348" cy="304" r="8"/>' +
      ripeti(6, (k) => {
        const a = k * Math.PI / 3;
        return '<circle class="mem-vite" cx="' + (348 + 4.6 * Math.cos(a)).toFixed(1) + '" cy="' + (304 + 4.6 * Math.sin(a)).toFixed(1) + '" r="1"/>';
      }) +
      '<path class="mem-magnete" d="M396 314h14v22h-14z"/>' +
      '<path class="mem-braccio" d="M400 321 L361 281 L355 286 L394 330 Z"/>' +
      '<rect class="mem-testina" x="352" y="279" width="7" height="6" rx="1" transform="rotate(-45 355.5 282)"/>' +
      '<circle class="mem-perno" cx="398" cy="325" r="6"/>' +
      ripeti(4, (k) => '<circle class="mem-vite" cx="' + (k % 2 ? 410 : 310) + '" cy="' + (k < 2 ? 272 : 336) + '" r="2"/>') +
      '</g>';
  }

  function oggettoRete() {
    // Il mondo e un armadio di server lontano, collegati da un cavo in fibra.
    return '<g>' +
      '<path class="mem-cavo" d="M343 391 C360 380 374 402 391 391"/>' +
      '<circle class="mem-globo" cx="318" cy="391" r="24"/>' +
      '<ellipse class="mem-meridiano" cx="318" cy="391" rx="10" ry="24"/>' +
      '<path class="mem-meridiano" d="M294 391h48M298 379h40M298 403h40M318 367v48"/>' +
      '<rect class="mem-rack" x="392" y="363" width="46" height="56" rx="3"/>' +
      ripeti(4, (k) => '<rect class="mem-unita" x="397" y="' + (368 + k * 12.5) + '" width="36" height="9" rx="1"/>' +
        '<circle class="' + (k % 2 ? 'mem-led-v' : 'mem-led-a') + '" cx="402" cy="' + (372.5 + k * 12.5) + '" r="1.8"/>') +
      '</g>';
  }

  const OGGETTI = [oggettoRegistri, oggettoCache, oggettoDimm, oggettoM2, oggettoDisco, oggettoRete];

  function figuraPiramide() {
    let g = '';
    GRADINI.forEach((s, i) => {
      const x = CX - s.w / 2;
      const cy = s.y + s.h / 2;
      g += '<rect class="mem-fronte" x="' + (x + 3) + '" y="' + (s.y + s.h - 4) + '" width="' + (s.w - 6) + '" height="9" rx="3"/>' +
        '<rect class="mem-gradino" x="' + x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="6"/>' +
        '<rect class="mem-striscia" x="' + (x + 1) + '" y="' + (s.y + 1) + '" width="7" height="' + (s.h - 2) + '" rx="3" style="opacity:' + (1 - i * 0.13).toFixed(2) + '"/>' +
        '<rect class="mem-gradino-bordo" x="' + x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="6"/>' +
        (x - 6 - 122 > 16 ? '<path class="mem-guida" d="M122 ' + cy + 'H' + (x - 6) + '"/>' : '') +
        '<text class="mem-fig-et" x="14" y="' + (cy + 5) + '">' + s.et + '</text>' +
        OGGETTI[i]() +
        '<text class="mem-fig-det mem-fig-lat" x="' + (x + s.w - 12) + '" y="' + (cy + 4.5) + '" text-anchor="end">' + s.det + '</text>';
    });
    const freccia = '<g class="mem-fig-det mem-fig-asse">' +
      '<text x="630" y="24" text-anchor="end">più veloce</text><text x="630" y="40" text-anchor="end">e più cara</text>' +
      '<path class="mem-asse" d="M612 52V150M606 60l6-9 6 9M606 142l6 9 6-9"/>' +
      '<text x="630" y="170" text-anchor="end">più capiente</text><text x="630" y="186" text-anchor="end">ed economica</text>' +
      '</g>';
    return soloInVista('<svg class="mem-ill mem-piramide" viewBox="0 0 640 438" xmlns="http://www.w3.org/2000/svg">' + g + freccia + '</svg>');
  }

  /* ======================================================================
   * Figura 2 · un piano di memoria a nuclei di ferrite
   * ====================================================================== */

  function figuraNuclei() {
    const N = 6;
    const pos = (j) => 92 + 44 * j;
    const SEL = { r: 2, c: 3 };
    let fili = '';
    for (let i = 0; i < N; i++) {
      fili += '<path class="mem-filo" d="M62 ' + pos(i) + 'H354"/>';
      fili += '<path class="mem-filo" d="M' + pos(i) + ' 62V354"/>';
    }
    // Filo di lettura: attraversa in diagonale tutti i nuclei.
    let lettura = '';
    for (let k = -(N - 1); k <= N - 1; k++) {
      const i0 = Math.max(0, k), j0 = i0 - k;
      const n = N - Math.abs(k);
      const x1 = pos(j0) - 14, y1 = pos(i0) - 14;
      const x2 = pos(j0 + n - 1) + 14, y2 = pos(i0 + n - 1) + 14;
      lettura += '<path class="mem-lettura" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/>';
    }
    const piazzole = ripeti(N, (i) => '<circle class="mem-oro" cx="54" cy="' + pos(i) + '" r="3.2"/><circle class="mem-oro" cx="362" cy="' + pos(i) + '" r="3.2"/>' +
      '<circle class="mem-oro" cx="' + pos(i) + '" cy="54" r="3.2"/><circle class="mem-oro" cx="' + pos(i) + '" cy="362" r="3.2"/>');
    let nuclei = '';
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const sel = i === SEL.r && j === SEL.c;
        const ang = (i + j) % 2 ? 45 : -45;
        nuclei += '<ellipse class="' + (sel ? 'mem-nucleo sel' : 'mem-nucleo') + '" cx="' + pos(j) + '" cy="' + pos(i) + '" rx="11.5" ry="5.2" transform="rotate(' + ang + ' ' + pos(j) + ' ' + pos(i) + ')"/>';
      }
    }
    const xs = pos(SEL.c), ys = pos(SEL.r);
    const selezione = '<path class="mem-filo-sel mem-corrente" d="M44 ' + ys + 'H354"/>' +
      '<path class="mem-filo-sel mem-corrente" d="M' + xs + ' 44V354"/>' +
      '<circle class="mem-alone" cx="' + xs + '" cy="' + ys + '" r="17"/>' +
      '<path class="mem-punta" d="M44 ' + (ys - 6) + 'l10 6-10 6z"/>' +
      '<path class="mem-punta" d="M' + (xs - 6) + ' 44l6 10 6-10z"/>' +
      '<text class="mem-fig-et mem-fig-corr" x="4" y="' + (ys - 12) + '">½ I</text>' +
      '<text class="mem-fig-et mem-fig-corr" x="' + (xs + 12) + ' " y="30">½ I</text>';

    // Due nuclei ingranditi: orario = 1, antiorario = 0 (le frecce girano piano).
    function anello(cx, cy, valore, orario) {
      const r = 38;
      const freccia = orario
        ? 'M' + cx + ' ' + (cy - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy
        : 'M' + cx + ' ' + (cy - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (cx - r) + ' ' + cy;
      const punta = orario
        ? 'M' + (cx + r - 7) + ' ' + (cy - 6) + 'L' + (cx + r) + ' ' + (cy + 3) + 'L' + (cx + r + 7) + ' ' + (cy - 6) + 'Z'
        : 'M' + (cx - r - 7) + ' ' + (cy - 6) + 'L' + (cx - r) + ' ' + (cy + 3) + 'L' + (cx - r + 7) + ' ' + (cy - 6) + 'Z';
      return '<g>' +
        '<path class="mem-filo" d="M' + (cx - 58) + ' ' + cy + 'H' + (cx + 58) + 'M' + cx + ' ' + (cy - 58) + 'V' + (cy + 58) + '"/>' +
        '<path class="mem-lettura" d="M' + (cx - 44) + ' ' + (cy - 44) + 'L' + (cx + 44) + ' ' + (cy + 44) + '"/>' +
        '<circle class="mem-anello-ombra" cx="' + cx + '" cy="' + (cy + 3) + '" r="' + r + '"/>' +
        '<circle class="mem-anello" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
        '<circle class="mem-anello-luce" cx="' + cx + '" cy="' + cy + '" r="' + (r + 5) + '"/>' +
        '<g class="mem-giro' + (orario ? '' : ' inverso') + '" style="transform-origin:' + cx + 'px ' + cy + 'px">' +
        '<path class="mem-magn" d="' + freccia + '"/><path class="mem-magn-punta" d="' + punta + '"/></g>' +
        '<text class="mem-fig-cifra" x="' + cx + '" y="' + (cy + 82) + '" text-anchor="middle">' + valore + '</text>' +
        '</g>';
    }

    // Le due mezze correnti: da sole restano sotto la soglia, insieme la superano.
    const SOGLIA = 17;
    function impulso(yb, h, et) {
      const sopra = h > SOGLIA
        ? '<rect class="mem-supera-area" x="508" y="' + (yb - h) + '" width="64" height="' + (h - SOGLIA) + '"/>' +
          '<path class="mem-supera" d="M508 ' + (yb - SOGLIA) + 'V' + (yb - h) + 'H572V' + (yb - SOGLIA) + '"/>'
        : '';
      return '<text class="mem-fig-et mem-fig-imp" x="402" y="' + (yb - 1) + '">' + et + '</text>' +
        '<path class="mem-base" d="M468 ' + yb + 'H632"/>' +
        '<path class="mem-soglia" d="M468 ' + (yb - SOGLIA) + 'H632"/>' +
        '<path class="mem-impulso" d="M468 ' + yb + 'H508V' + (yb - h) + 'H572V' + yb + 'H632"/>' + sopra;
    }
    const correnti = impulso(282, 12, 'X') + impulso(322, 12, 'Y') + impulso(366, 24, 'X+Y') +
      '<text class="mem-fig-det mem-fig-soglia" x="632" y="257" text-anchor="end">soglia</text>';

    return soloInVista('<svg class="mem-ill mem-nuclei" viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="mem-telaio" x="44" y="44" width="328" height="328" rx="8"/>' +
      '<rect class="mem-finestra" x="62" y="62" width="292" height="292" rx="4"/>' +
      fili + lettura + piazzole + selezione + nuclei +
      '<rect class="mem-lente" x="390" y="46" width="244" height="162" rx="12"/>' +
      anello(452, 112, '1', true) + anello(572, 112, '0', false) +
      correnti +
      '</svg>');
  }

  /* ======================================================================
   * Laboratorio · Quanto è lontano un dato?
   * Scheda 1: la scala della gerarchia in «tempo umano» (un ciclo = un secondo).
   * Scheda 2: una cache di 8 righe da 4 byte davanti a una RAM di 64 byte.
   * ====================================================================== */

  const ICONE = {
    core: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
    registro: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h2M11 10h2M15 10h2M7 14h2M11 14h2M15 14h2"/></svg>',
    l1: '<svg viewBox="0 0 24 24"><rect x="2" y="4.5" width="20" height="15" rx="3"/><text x="12" y="16.2" text-anchor="middle">L1</text></svg>',
    l2: '<svg viewBox="0 0 24 24"><rect x="2" y="4.5" width="20" height="15" rx="3"/><text x="12" y="16.2" text-anchor="middle">L2</text></svg>',
    l3: '<svg viewBox="0 0 24 24"><rect x="2" y="4.5" width="20" height="15" rx="3"/><text x="12" y="16.2" text-anchor="middle">L3</text></svg>',
    ram: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="9" rx="1"/><path d="M5 9.5h3v4H5zM10.5 9.5h3v4h-3zM16 9.5h3v4h-3zM4.5 16v2.5M8 16v2.5M11.5 16v2.5M15 16v2.5M19.5 16v2.5"/></svg>',
    ssd: '<svg viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M5 10.5h4v3H5zM11 10.5h5v3h-5z"/><circle cx="19.5" cy="12" r="1"/></svg>',
    disco: '<svg viewBox="0 0 24 24"><rect x="4" y="2.5" width="16" height="19" rx="2"/><circle cx="12" cy="10" r="5"/><circle cx="12" cy="10" r="1"/><path d="M17.5 19L13 11.5"/></svg>',
    rete: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/></svg>',
  };

  // Colore di ogni livello: verde le cache, ambra la RAM, arancio i dischi, rosa la rete.
  const TINTA = ['var(--trace-1)', 'var(--trace-1)', 'var(--trace-1)', 'var(--trace-1)', 'var(--trace-2)', 'var(--trace-stuff)', 'var(--trace-stuff)', 'var(--trace-4)'];

  // Piccolo gestore di animazioni annullabili, uno per scheda.
  function animatore(ctx) {
    const tweens = new Set();
    const timer = new Set();
    let gen = 0;
    return {
      get gen() { return gen; },
      tween(o) {
        const t = ctx.tween(o);
        tweens.add(t);
        return t.finito.then((ok) => { tweens.delete(t); return ok; });
      },
      // Pausa annullabile; con «sempre» resta anche con il movimento ridotto (cambi di stato senza moto).
      pausa(ms, sempre) {
        return new Promise((res) => {
          if (ms <= 0 || (!sempre && ctx.ridotto())) { res(true); return; }
          const rec = { res: res, id: 0 };
          rec.id = setTimeout(() => { timer.delete(rec); res(true); }, ms);
          timer.add(rec);
        });
      },
      taglia() {
        gen += 1;
        tweens.forEach((t) => t.cancel());
        tweens.clear();
        timer.forEach((r) => { clearTimeout(r.id); r.res(false); });
        timer.clear();
      },
    };
  }

  function scriviNota(nota, html) {
    if (nota.innerHTML === html) nota.innerHTML = '';
    nota.innerHTML = html;
  }

  /* ---------- scheda 1: se un ciclo durasse un secondo ---------- */

  function creaScala(pan, ctx) {
    const h = ctx.h;
    const L = M.LIVELLI;
    const A = animatore(ctx);
    let scelto = -1;
    let animando = false;
    let giro = false;

    const intro = h('p', { class: 'mem-intro' },
      'Un processore a circa 3,3 GHz compie un ciclo ogni 0,3 nanosecondi. Ingrandiamo il tempo: se un ciclo durasse ',
      h('strong', null, 'un secondo'), ', quanto dovremmo aspettare un dato che sta più in basso nella scala? Tocca un livello.');
    const btnGiro = h('button', { type: 'button', class: 'lab-btn primary', 'aria-pressed': 'false', onclick: () => (giro ? fermaGiro() : avviaGiro()) }, 'Percorri tutta la scala');

    const cpu = h('div', { class: 'mem-cpu' },
      h('span', { class: 'mem-liv-ico mem-ico-cpu', 'aria-hidden': 'true', html: ICONE.core }),
      h('span', { class: 'mem-liv-nome' }, 'Core del processore', h('small', null, 'qui parte la richiesta')));
    const righe = L.map((l, i) => {
      const umano = M.tempoUmano(l.ns).testo;
      return h('button', {
        type: 'button', class: 'mem-liv', style: '--tinta:' + TINTA[i],
        'aria-label': l.nome + ': tempo reale ' + M.formattaNs(l.ns) + ', a misura d\'uomo ' + umano,
        onclick: () => { fermaGiro(); esegui(i); },
        onkeydown: (ev) => naviga(ev, i),
      },
      h('span', { class: 'mem-liv-ico', 'aria-hidden': 'true', html: ICONE[l.id] }),
      h('span', { class: 'mem-liv-nome' }, l.nome, h('small', null, l.capacita)),
      h('span', { class: 'mem-liv-reale' }, M.formattaNs(l.ns)),
      h('span', { class: 'mem-liv-umano' }, umano),
      h('span', { class: 'mem-liv-barra', 'aria-hidden': 'true' }, h('i', { style: '--p:' + M.posizioneLog(M.secondiUmani(l.ns)).toFixed(3) })));
    });
    const binario = h('div', { class: 'mem-binario', 'aria-hidden': 'true' }, h('i', { class: 'mem-binario-luce' }));
    const pacchetto = h('div', { class: 'mem-pacchetto', 'aria-hidden': 'true' });
    const colonna = h('div', { class: 'mem-scala-col' }, binario, cpu, h('ol', { class: 'mem-livelli' }, righe.map((b) => h('li', null, b))), pacchetto);

    const oroNum = h('span', { class: 'mem-oro-num' }, '0');
    const oroUni = h('span', { class: 'mem-oro-uni' }, 'secondi');
    const oroReale = h('span', null, '0 ns');
    const oroFase = h('p', { class: 'mem-oro-fase' }, 'Tocca un livello per mandare una richiesta.');
    const riempi = h('i', { class: 'mem-oro-riempi' });
    const puntiScala = L.map((l, i) => h('span', { class: 'mem-oro-punto', style: 'left:' + (100 * M.posizioneLog(M.secondiUmani(l.ns))).toFixed(2) + '%;--tinta:' + TINTA[i] }));
    const tacche = M.TACCHE.map((t, k) => h('span', { class: 'mem-oro-tacca' + (k % 2 ? ' sotto' : ''), style: 'left:' + (100 * M.posizioneLog(t.s)).toFixed(2) + '%' }, t.et));
    const orologio = h('div', { class: 'lab-panel mem-orologio' },
      h('p', { class: 'mem-oro-tit' }, 'Tempo a misura d\'uomo'),
      h('p', { class: 'mem-oro-val' }, oroNum, oroUni),
      h('p', { class: 'mem-oro-sub' }, 'tempo reale: ', oroReale),
      h('div', { class: 'mem-oro-scala', 'aria-hidden': 'true' }, h('div', { class: 'mem-oro-binario' }, riempi, puntiScala), tacche),
      oroFase);
    const nota = h('p', { class: 'lab-note', 'aria-live': 'polite' },
      'La scala parte dai registri, dentro il processore, e scende fino a un server dall\'altra parte del mondo. Le barre e l\'orologio sono in scala logaritmica: ogni tacca vale molto più della precedente.');

    pan.append(intro, h('div', { class: 'lab-controls' }, btnGiro),
      h('div', { class: 'mem-scala-grid' }, colonna, h('div', { class: 'mem-scala-lato' }, orologio, nota)));

    /* misure: centri delle icone rispetto alla colonna */
    function icona(i) { return (i < 0 ? cpu : righe[i]).querySelector('.mem-liv-ico'); }
    function centro(elem) {
      const rc = colonna.getBoundingClientRect();
      const r = elem.getBoundingClientRect();
      return { x: r.left + r.width / 2 - rc.left, y: r.top + r.height / 2 - rc.top };
    }
    let y0 = 0;
    let altezza = 1;
    // Sui telefoni l'orologio resta in vista mentre si scorre la scala: si ferma sotto la
    // barra in alto e sotto l'indice dei capitoli, quando sono adesivi.
    function misuraCima() {
      let cima = 0;
      const barra = document.querySelector('.topbar');
      const rail = document.querySelector('.spc-rail');
      if (barra && getComputedStyle(barra).position === 'sticky') cima += barra.offsetHeight;
      if (rail) {
        const st = getComputedStyle(rail);
        if (st.position === 'sticky' && st.display === 'flex') cima += rail.offsetHeight;
      }
      pan.style.setProperty('--mem-cima', cima + 'px');
    }
    function misura() {
      if (!colonna.offsetParent) return;
      misuraCima();
      const c0 = centro(icona(-1));
      const c1 = centro(icona(L.length - 1));
      y0 = c0.y;
      altezza = Math.max(1, c1.y - c0.y);
      binario.style.left = (c0.x - 1) + 'px';
      binario.style.top = c0.y + 'px';
      binario.style.height = altezza + 'px';
      pacchetto.style.left = (c0.x - 7) + 'px';
      if (!animando) posa(y0);
    }
    function posa(y) {
      pacchetto.style.transform = 'translate3d(0,' + (y - 7).toFixed(1) + 'px,0)';
      binario.firstChild.style.transform = 'scaleY(' + ctx.clamp((y - y0) / altezza, 0, 1).toFixed(4) + ')';
    }

    function orologioA(sec) {
      const f = M.formattaDurata(sec);
      oroNum.textContent = f.valore;
      oroUni.textContent = f.unita;
      const c = Math.round(sec);
      oroReale.textContent = M.formattaNs(sec * M.CICLO_NS) + ' · ' + M.numeroIt(c) + (c === 1 ? ' ciclo' : ' cicli');
      riempi.style.transform = 'scaleX(' + M.posizioneLog(sec).toFixed(4) + ')';
    }

    function pulisci() {
      righe.forEach((b) => b.classList.remove('passa', 'cerca', 'trovato', 'scelto'));
      puntiScala.forEach((p) => p.classList.remove('on'));
    }

    function finale(i) {
      const l = L[i];
      const T = M.secondiUmani(l.ns);
      animando = false;
      pulisci();
      righe[i].classList.add('scelto', 'trovato');
      puntiScala[i].classList.add('on');
      for (let j = 0; j < i; j++) righe[j].classList.add('passato');
      orologioA(T);
      posa(y0);
      pacchetto.classList.remove('vis', 'dato');
      nota.classList.remove('mem-vecchia');
      oroFase.textContent = 'Dato arrivato: ' + M.tempoUmano(l.ns).testo + ' a misura d\'uomo.';
      scriviNota(nota, l.spiega + ' <span class="mem-nota-dati">Tempo reale ' + M.formattaNs(l.ns) + ' (' + M.numeroIt(Math.round(T)) + (Math.round(T) === 1 ? ' ciclo' : ' cicli') + '); a misura d\'uomo ' + M.tempoUmano(l.ns).testo + '.</span>');
    }

    async function esegui(i) {
      A.taglia();
      misura();
      const g = A.gen;
      const l = L[i];
      const T = M.secondiUmani(l.ns);
      scelto = i;
      animando = true;
      pulisci();
      righe.forEach((b) => b.classList.remove('passato'));
      righe[i].classList.add('scelto');
      puntiScala[i].classList.add('on');
      orologioA(0);
      const ys = righe.map((_, j) => centro(icona(j)).y);
      pacchetto.classList.remove('dato');
      pacchetto.classList.add('vis');
      nota.classList.add('mem-vecchia'); // la spiegazione precedente resta, attenuata, fino all'arrivo del dato
      oroFase.textContent = i === 0 ? 'Il dato è già nel core.' : 'La richiesta scende e cerca il dato livello per livello…';

      // 1. discesa: ogni livello attraversato è un mancato
      const durata = ctx.ridotto() ? 0 : 160 + 95 * i;
      const passati = new Set();
      await A.tween({
        from: y0, to: ys[i], dur: durata, ease: 'sharp',
        update: (y) => {
          posa(y);
          for (let j = 0; j < i; j++) {
            if (!passati.has(j) && y >= ys[j] - 1) {
              passati.add(j);
              righe[j].classList.add('passa');
              oroFase.textContent = L[j].nome + ': non c\'è, si scende.';
            }
          }
        },
      });
      if (g !== A.gen) return;

      // 2. attesa: l'orologio scorre in scala logaritmica
      righe[i].classList.add('cerca');
      oroFase.textContent = l.nome + ': il dato è qui, aspettiamo la risposta…';
      await A.tween({ from: 0, to: 1, dur: M.durataAttesa(l.ns), ease: 'linear', update: (k) => orologioA(M.orologio(T, k)) });
      if (g !== A.gen) return;
      righe[i].classList.remove('cerca');
      righe[i].classList.add('trovato');
      orologioA(T);

      // 3. risalita con il dato
      pacchetto.classList.add('dato');
      oroFase.textContent = 'Il dato risale verso il core…';
      await A.tween({ from: ys[i], to: y0, dur: durata, ease: 'smooth', update: posa });
      if (g !== A.gen) return;
      finale(i);
    }

    // Interrompe un'animazione in corso saltando allo stato finale.
    function completa() {
      if (!animando) return;
      A.taglia();
      if (scelto >= 0) finale(scelto);
    }

    async function avviaGiro() {
      giro = true;
      btnGiro.setAttribute('aria-pressed', 'true');
      btnGiro.textContent = 'Ferma il giro';
      for (let i = 0; i < L.length && giro; i++) {
        await esegui(i);
        if (!giro) return;
        await A.pausa(ctx.ridotto() ? 1800 : 650, true);
      }
      fermaGiro();
    }

    function fermaGiro() {
      if (!giro) return;
      giro = false;
      btnGiro.setAttribute('aria-pressed', 'false');
      btnGiro.textContent = 'Percorri tutta la scala';
    }

    function naviga(ev, i) {
      let j = null;
      if (ev.key === 'ArrowDown') j = Math.min(L.length - 1, i + 1);
      else if (ev.key === 'ArrowUp') j = Math.max(0, i - 1);
      else if (ev.key === 'Home') j = 0;
      else if (ev.key === 'End') j = L.length - 1;
      if (j !== null) { ev.preventDefault(); righe[j].focus(); }
    }

    let ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => misura()); ro.observe(colonna); }
    requestAnimationFrame(misura);

    return {
      entra() { misura(); },
      esce() { fermaGiro(); completa(); },
      sospendi() { fermaGiro(); completa(); },
      distruggi() { giro = false; A.taglia(); if (ro) ro.disconnect(); },
    };
  }

  /* ---------- scheda 2: la cache in azione ---------- */

  const DURATE = [1500, 1050, 720, 450, 250];
  const NOMI_VELOCITA = ['molto lenta', 'lenta', 'media', 'veloce', 'molto veloce'];
  const LEZIONI = {
    sequenziale: [
      'Ogni mancato porta in cache 4 byte, e i 3 accessi seguenti sono colpi: è la località spaziale. Con i blocchi da 64 byte delle cache vere, i colpi sarebbero 63 su 64.',
      'Ogni mancato porta in cache 4 byte, e i 3 accessi seguenti sono colpi: è la località spaziale. Qui le 2 vie non cambiano nulla.',
    ],
    casuale: [
      'Saltando a caso la località sparisce e i blocchi si scacciano a vicenda: la cache aiuta poco. Prova con 2 vie: i conflitti calano.',
      'Con 2 vie i conflitti calano, ma a caso la cache aiuta comunque poco: senza località non c\'è magia.',
    ],
    ciclo: [
      'Dopo il primo giro gli 8 byte restano in cache e sono tutti colpi: è la località temporale, quella dei cicli dei programmi.',
      'Dopo il primo giro gli 8 byte restano in cache e sono tutti colpi: è la località temporale, quella dei cicli dei programmi.',
    ],
    conflitto: [
      'a[i] e b[i] cadono sulla stessa riga e si scacciano a ogni accesso: zero colpi, anche se metà della cache resta vuota. Prova la cache a 2 vie.',
      'Con 2 vie i blocchi di a e di b convivono nello stesso insieme e tornano i colpi della località spaziale.',
    ],
  };

  function creaCacheLab(pan, ctx, stage) {
    const h = ctx.h;
    const s = ctx.s;
    const A = animatore(ctx);
    const stato = { schema: 'sequenziale', vie: 1, velocita: 3 };
    let cache = null;
    let accessi = [];
    let indice = 0;
    let esiti = [];
    let corre = false;
    let occupato = false;
    let eraInCorsa = false;
    let stretto = null;
    let G = null;
    let rif = null;

    /* controlli */
    const idProg = ctx.uid('mem-prog');
    const idTipo = ctx.uid('mem-tipo');
    const segSchema = h('div', { class: 'lab-seg', role: 'group', 'aria-labelledby': idProg },
      M.SCHEMI.map((sc) => h('button', { type: 'button', 'data-id': sc.id, 'aria-pressed': String(sc.id === stato.schema), onclick: () => scegliSchema(sc.id) }, sc.nome)));
    const segVie = h('div', { class: 'lab-seg', role: 'group', 'aria-labelledby': idTipo },
      [{ v: 1, n: 'Diretta' }, { v: 2, n: '2 vie · LRU' }].map((o) => h('button', { type: 'button', 'data-v': String(o.v), 'aria-pressed': String(o.v === stato.vie), onclick: () => scegliVie(o.v) }, o.n)));
    const descr = h('p', { class: 'mem-descr' });
    const btnEsegui = h('button', { type: 'button', class: 'lab-btn primary mem-esegui', onclick: () => (corre ? pausa() : esegui()) }, 'Esegui');
    const btnPasso = h('button', { type: 'button', class: 'lab-btn mem-passo', onclick: () => passoSingolo() }, 'Passo');
    const btnReset = h('button', { type: 'button', class: 'lab-btn mem-reset', onclick: () => ricomincia() }, 'Ricomincia');
    const leggiVel = h('span', { class: 'lab-readout' }, NOMI_VELOCITA[stato.velocita - 1]);
    const vel = h('input', {
      type: 'range', min: '1', max: '5', step: '1', value: String(stato.velocita), 'aria-valuetext': NOMI_VELOCITA[stato.velocita - 1],
      oninput: () => {
        stato.velocita = Number(vel.value);
        leggiVel.textContent = NOMI_VELOCITA[stato.velocita - 1];
        vel.setAttribute('aria-valuetext', NOMI_VELOCITA[stato.velocita - 1]);
      },
    });
    const kv = {};
    const lettura = h('dl', { class: 'lab-kv mem-kv' }, [
      ['accesso', 'Accesso'], ['colpi', 'Colpi'], ['mancati', 'Mancati'], ['perc', 'Colpi %'], ['tempo', 'Tempo stimato'], ['senza', 'Senza cache'],
    ].map((c) => { kv[c[0]] = h('dd', null, '—'); return h('div', { class: 'mem-kv-' + c[0] }, h('dt', null, c[1]), kv[c[0]]); }));
    const indDec = h('span', { class: 'mem-ind-dec' }, '—');
    const indEt = h('b', { class: 'et' });
    const indIx = h('b', { class: 'ix' });
    const indPo = h('b', { class: 'po' });
    const legIx = h('span', null, 'riga');
    const indirizzo = h('div', { class: 'mem-ind' },
      h('span', { class: 'mem-ind-tit' }, 'Indirizzo'), indDec,
      h('span', { class: 'mem-ind-bin', 'aria-hidden': 'true' }, indEt, indIx, indPo),
      h('span', { class: 'mem-ind-leg', 'aria-hidden': 'true' },
        h('span', null, h('i', { class: 'et' }), 'etichetta (tag)'), h('span', null, h('i', { class: 'ix' }), legIx), h('span', null, h('i', { class: 'po' }), 'posizione nel blocco')));
    const tela = h('div', { class: 'mem-tela' });
    const storia = h('div', { class: 'mem-storia', 'aria-hidden': 'true' });
    const nota = h('p', { class: 'lab-note', 'aria-live': 'polite' });

    pan.append(
      h('div', { class: 'lab-controls mem-scelte' },
        h('div', { class: 'mem-campo' }, h('span', { class: 'mem-campo-tit', id: idProg }, 'Programma'), segSchema),
        h('div', { class: 'mem-campo' }, h('span', { class: 'mem-campo-tit', id: idTipo }, 'Cache'), segVie)),
      descr,
      h('div', { class: 'lab-controls' }, btnEsegui, btnPasso, btnReset, h('label', { class: 'lab-range' }, 'Velocità', vel, leggiVel)),
      indirizzo, tela, storia, lettura, nota);

    /* geometria dello schema: largo (cache a sinistra, RAM a destra) o stretto (una sopra l'altra) */
    function geometria() {
      const due = stato.vie === 2;
      if (!stretto) {
        const c = { y: 56, rh: 34, gap: due ? 8 : 0, h: 30, lbl: { x: 30, w: 30 }, tag: { x: 66, w: 48 }, dati: { x: 120, passo: 48, w: 44 }, lru: 342, freccia: 14 };
        const r = { x: 470, y: 56, cw: 34, ch: 34, w: 30, h: 30 };
        return { w: 760, h: Math.max(c.y + 8 * c.rh + 3 * c.gap, r.y + 8 * r.ch) + 6, c: c, r: r, titC: { x: 30, y: 22 }, titR: { x: 470, y: 22 }, arco: { x: 0, y: -34 } };
      }
      const c = { y: 50, rh: 30, gap: due ? 6 : 0, h: 26, lbl: { x: 18, w: 26 }, tag: { x: 50, w: 40 }, dati: { x: 96, passo: 48, w: 44 }, lru: 314, freccia: 4 };
      const fineC = c.y + 8 * c.rh + 3 * c.gap;
      const r = { x: 18, y: fineC + 40, cw: 38, ch: 32, w: 34, h: 28 };
      return { w: 340, h: r.y + 8 * r.ch + 4, c: c, r: r, titC: { x: 18, y: 20 }, titR: { x: 18, y: fineC + 26 }, arco: { x: 26, y: 0 } };
    }
    function rigaY(r) { return G.c.y + r * G.c.rh + (stato.vie === 2 ? Math.floor(r / 2) * G.c.gap : 0); }
    function datoX(k) { return G.c.dati.x + k * G.c.dati.passo; }
    function ramX(a) { return G.r.x + (a % 8) * G.r.cw; }
    function ramY(a) { return G.r.y + Math.floor(a / 8) * G.r.ch; }
    function fineDati() { return datoX(3) + G.c.dati.w; }

    function costruisci() {
      G = geometria();
      const c = G.c;
      const r = G.r;
      const due = stato.vie === 2;
      const svg = s('svg', {
        class: 'lab-svg mem-svg' + (stretto ? ' stretto' : ''), viewBox: '0 0 ' + G.w + ' ' + G.h, role: 'img',
        'aria-label': 'Schema della cache (8 righe da 4 byte) e della RAM (64 byte). Lo stato è descritto nel testo sotto lo schema.',
      });
      svg.append(
        s('text', { class: 'mem-s-tit', x: G.titC.x, y: G.titC.y }, due ? 'CACHE · 4 insiemi × 2 vie' : 'CACHE · 8 righe da 4 byte'),
        s('text', { class: 'mem-s-tit', x: G.titR.x, y: G.titR.y }, 'RAM · 64 byte, 16 blocchi da 4'),
        s('text', { class: 'mem-s-int', x: c.lbl.x + c.lbl.w / 2, y: c.y - 9, 'text-anchor': 'middle' }, due ? 'ins.' : 'riga'),
        s('text', { class: 'mem-s-int et', x: c.tag.x + c.tag.w / 2, y: c.y - 9, 'text-anchor': 'middle' }, 'tag'),
        s('text', { class: 'mem-s-int', x: (c.dati.x + fineDati()) / 2, y: c.y - 9, 'text-anchor': 'middle' }, 'dati (4 byte)'));

      // RAM: blocchi, celle con l'indirizzo, contorni dei «rivali», lampi
      const gRam = s('g', { class: 'mem-ram' });
      const blocchi = [];
      for (let b = 0; b < 16; b++) {
        const x = ramX(b * 4) - 2;
        const y = ramY(b * 4) - 2;
        const w = 4 * r.cw;
        const hb = r.h + 4;
        const sfondo = s('rect', { class: 'mem-blocco' + (b % 2 ? ' dispari' : ''), x: x, y: y, width: w - 2, height: hb, rx: 6 });
        const lampo = s('rect', { class: 'mem-lampo manc', x: x, y: y, width: w - 2, height: hb, rx: 6, opacity: 0 });
        const rivale = s('rect', { class: 'mem-rivale', x: x - 1.5, y: y - 1.5, width: w + 1, height: hb + 3, rx: 7 });
        gRam.append(sfondo);
        for (let k = 0; k < 4; k++) {
          const a = b * 4 + k;
          gRam.append(s('text', { class: 'mem-s-ram', x: ramX(a) + r.w / 2 - 1, y: ramY(a) + r.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, String(a)));
          if (k) gRam.append(s('path', { class: 'mem-sep', d: 'M' + (ramX(a) - 2) + ' ' + (ramY(a) + 4) + 'v' + (r.h - 8) }));
        }
        gRam.append(lampo, rivale);
        blocchi.push({ sfondo: sfondo, lampo: lampo, rivale: rivale });
      }

      // Cache: 8 righe (4 insiemi da 2 vie nella versione associativa)
      const gCache = s('g', { class: 'mem-cache' });
      const righe = [];
      const sel = s('rect', { class: 'mem-sel', x: c.tag.x - 6, y: 0, width: fineDati() - c.tag.x + 12, height: 10, rx: 9 });
      gCache.append(sel);
      for (let q = 0; q < 8; q++) {
        const y = rigaY(q);
        const g = s('g', { class: 'mem-riga vuota' });
        if (!due || q % 2 === 0) {
          const yc = due ? (y + rigaY(q + 1) + c.h) / 2 : y + c.h / 2;
          g.append(s('text', { class: 'mem-s-lbl', x: c.lbl.x + c.lbl.w / 2, y: yc, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, String(due ? q / 2 : q)));
        }
        const tagBox = s('rect', { class: 'mem-cella', x: c.tag.x, y: y, width: c.tag.w, height: c.h, rx: 5 });
        const tag = s('text', { class: 'mem-s-tag', x: c.tag.x + c.tag.w / 2, y: y + c.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '');
        g.append(tagBox, tag);
        const dati = [];
        for (let k = 0; k < 4; k++) {
          const box = s('rect', { class: 'mem-cella', x: datoX(k), y: y, width: c.dati.w, height: c.h, rx: 5 });
          const t = s('text', { class: 'mem-s-dato', x: datoX(k) + c.dati.w / 2, y: y + c.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '');
          g.append(box, t);
          dati.push(t);
        }
        const vuota = s('text', { class: 'mem-s-vuota', x: (c.dati.x + fineDati()) / 2, y: y + c.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'vuota');
        const lampo = s('rect', { class: 'mem-lampo', x: c.tag.x - 4, y: y - 3, width: fineDati() - c.tag.x + 8, height: c.h + 6, rx: 7, opacity: 0 });
        g.append(vuota, lampo);
        let lru = null;
        if (due) {
          lru = s('g', { class: 'mem-lru', opacity: 0 },
            s('rect', { x: c.lru - 20, y: y + c.h / 2 - 10, width: 40, height: 20, rx: 10 }),
            s('text', { x: c.lru, y: y + c.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'LRU'));
          g.append(lru);
        }
        gCache.append(g);
        righe.push({ g: g, tag: tag, dati: dati, vuota: vuota, lampo: lampo, lru: lru });
      }

      // Indicatori mobili
      const freccia = s('path', { class: 'mem-freccia', d: 'M0 -7L10 0L0 7Z', opacity: 0 });
      const cursore = s('rect', { class: 'mem-cursore', x: 0, y: 0, width: r.w + 4, height: r.h + 4, rx: 6, opacity: 0 });
      const cursoreC = s('rect', { class: 'mem-cursore', x: 0, y: 0, width: c.dati.w + 4, height: c.h + 4, rx: 6, opacity: 0 });
      const popTesto = s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '');
      const popRett = s('rect', { x: -46, y: -13, width: 92, height: 26, rx: 13 });
      const pop = s('g', { class: 'mem-pop', opacity: 0 }, popRett, popTesto);
      const volo = s('g', { class: 'mem-volo' });
      svg.append(gRam, gCache, freccia, cursore, cursoreC, volo, pop);
      tela.replaceChildren(svg);
      rif = { svg: svg, blocchi: blocchi, righe: righe, sel: sel, freccia: freccia, cursore: cursore, cursoreC: cursoreC, pop: pop, popTesto: popTesto, volo: volo };
      legIx.textContent = due ? 'insieme' : 'riga';
    }

    /* disegno dello stato (dal modello) */
    function rigaModello(q) { return cache.linee[Math.floor(q / stato.vie)][q % stato.vie]; }
    function etichettaBin(e) { return e.toString(2).padStart(cache.bit.etichetta, '0'); }

    function disegnaRiga(q) {
      const l = rigaModello(q);
      const R = rif.righe[q];
      R.g.classList.toggle('vuota', !l.valida);
      R.tag.textContent = l.valida ? etichettaBin(l.etichetta) : '';
      R.tag.style.opacity = '';
      R.dati.forEach((t, k) => { t.textContent = l.valida ? String(l.blocco * 4 + k) : ''; t.style.opacity = ''; });
    }

    function disegna() {
      if (!rif) return;
      for (let q = 0; q < 8; q++) disegnaRiga(q);
      if (stato.vie === 2) {
        for (let st = 0; st < 4; st++) {
          const v = M.prossimaVittima(cache, st);
          rif.righe[st * 2].lru.setAttribute('opacity', v === 0 ? '1' : '0');
          rif.righe[st * 2 + 1].lru.setAttribute('opacity', v === 1 ? '1' : '0');
        }
      }
      for (let b = 0; b < 16; b++) {
        const dentro = cache.linee[b % cache.insiemi].some((l) => l.valida && l.blocco === b);
        rif.blocchi[b].sfondo.classList.toggle('in-cache', dentro);
      }
      const e = esiti[esiti.length - 1];
      if (e) {
        sposta(rif.cursore, ramX(e.indirizzo) - 2, ramY(e.indirizzo) - 2);
        rif.cursore.setAttribute('opacity', '1');
        sposta(rif.freccia, G.c.freccia, centroInsieme(e.insieme));
        rif.freccia.setAttribute('opacity', '1');
        sposta(rif.cursoreC, datoX(e.posizione) - 2, rigaY(e.riga) - 2);
        rif.cursoreC.setAttribute('opacity', '1');
        rivali(e.blocco);
        mostraIndirizzo(e.indirizzo);
      } else {
        ['cursore', 'freccia', 'cursoreC'].forEach((k) => rif[k].setAttribute('opacity', '0'));
        rivali(-1);
        mostraIndirizzo(null);
      }
      rif.sel.classList.remove('on');
      rif.pop.setAttribute('opacity', '0');
      rif.righe.forEach((R) => R.lampo.setAttribute('opacity', '0'));
      rif.blocchi.forEach((B) => B.lampo.setAttribute('opacity', '0'));
      rif.volo.replaceChildren();
    }

    function contatori() {
      const n = indice;
      const t = M.stimaTempo(cache.colpi, cache.mancati);
      kv.accesso.textContent = n + ' / ' + accessi.length;
      kv.colpi.textContent = String(cache.colpi);
      kv.mancati.textContent = String(cache.mancati);
      kv.perc.textContent = n ? Math.round((100 * cache.colpi) / n) + '%' : '—';
      kv.tempo.textContent = n ? M.formattaNs(t.conCache) : '—';
      kv.senza.textContent = n ? M.formattaNs(t.senzaCache) : '—';
    }

    function costruisciStoria() {
      storia.replaceChildren(...accessi.map(() => h('i')));
    }
    function segnaStoria() {
      const slot = storia.children;
      for (let i = 0; i < slot.length; i++) {
        const e = esiti[i];
        slot[i].className = e ? (e.colpo ? 'colpo' : 'manc') : '';
        if (i === indice - 1) slot[i].classList.add('ora');
      }
    }

    function sincronizza() { disegna(); contatori(); segnaStoria(); }

    function mostraIndirizzo(a) {
      if (a == null) { indDec.textContent = '—'; indEt.textContent = ''; indIx.textContent = ''; indPo.textContent = ''; indirizzo.classList.add('vuoto'); return; }
      const f = M.campiIndirizzo(cache, a);
      indirizzo.classList.remove('vuoto');
      indDec.textContent = String(a);
      indEt.textContent = f.etichetta;
      indIx.textContent = f.indice;
      indPo.textContent = f.posizione;
    }

    function rivali(blocco) {
      const lista = blocco < 0 ? [] : M.rivali(cache, blocco);
      rif.blocchi.forEach((B, b) => B.rivale.classList.toggle('on', lista.includes(b)));
    }

    function sposta(elem, x, y) { elem.__x = x; elem.__y = y; elem.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); }
    function centroInsieme(st) {
      if (stato.vie === 1) return rigaY(st) + G.c.h / 2;
      return (rigaY(st * 2) + rigaY(st * 2 + 1) + G.c.h) / 2;
    }

    function muovi(elem, x, y, dur) {
      const x0 = elem.__x == null ? x : elem.__x;
      const y0 = elem.__y == null ? y : elem.__y;
      elem.setAttribute('opacity', '1');
      return A.tween({ from: 0, to: 1, dur: dur, ease: 'smooth', update: (k) => sposta(elem, ctx.lerp(x0, x, k), ctx.lerp(y0, y, k)) });
    }

    function lampeggia(rect, tipo, dur) {
      rect.classList.toggle('colpo', tipo === 'colpo');
      rect.classList.toggle('manc', tipo !== 'colpo');
      return A.tween({ from: 0, to: 1, dur: dur, ease: 'linear', update: (k) => rect.setAttribute('opacity', (Math.sin(Math.PI * k) * 0.55).toFixed(3)), done: () => rect.setAttribute('opacity', '0') });
    }

    function mostraSel(st, on) {
      const y = stato.vie === 1 ? rigaY(st) : rigaY(st * 2);
      const fine = (stato.vie === 1 ? rigaY(st) : rigaY(st * 2 + 1)) + G.c.h;
      rif.sel.setAttribute('y', y - 6);
      rif.sel.setAttribute('height', fine - y + 12);
      rif.sel.classList.toggle('on', on);
    }

    function popUp(q, colpo, dur) {
      rif.popTesto.textContent = colpo ? 'COLPO' : 'MANCATO';
      rif.pop.classList.toggle('colpo', colpo);
      const x = (G.c.dati.x + fineDati()) / 2;
      const y = rigaY(q) + G.c.h / 2;
      return A.tween({
        from: 0, to: 1, dur: dur, ease: 'linear',
        update: (k) => {
          rif.pop.setAttribute('transform', 'translate(' + x + ' ' + (y + 8 - 14 * ctx.curve.smooth(k)).toFixed(1) + ')');
          rif.pop.setAttribute('opacity', Math.min(1, Math.sin(Math.PI * k) * 1.6).toFixed(3));
        },
        done: () => rif.pop.setAttribute('opacity', '0'),
      });
    }

    // Il blocco vola dalla RAM alla riga della cache; il vecchio contenuto sbiadisce.
    function vola(e, prima, dur) {
      const c = G.c;
      const r = G.r;
      const R = rif.righe[e.riga];
      const pezzi = [0, 1, 2, 3].map((k) => {
        const a = e.blocco * 4 + k;
        const rect = s('rect', { x: 0, y: 0, width: r.w, height: r.h, rx: 5 });
        const t = s('text', { x: r.w / 2, y: r.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, String(a));
        const g = s('g', { class: 'mem-volante' }, rect, t);
        rif.volo.append(g);
        return { g: g, rect: rect, t: t, x0: ramX(a) - 1, y0: ramY(a), x1: datoX(k), y1: rigaY(e.riga) };
      });
      const vecchi = prima[e.riga].valida ? R.dati.concat([R.tag]) : [];
      const sfasa = 0.08;
      return A.tween({
        from: 0, to: 1, dur: dur, ease: 'linear',
        update: (t) => {
          pezzi.forEach((p, k) => {
            const tk = ctx.clamp((t - k * sfasa) / (1 - 3 * sfasa), 0, 1);
            const q = ctx.curve.inOut(tk);
            const arco = Math.sin(Math.PI * q);
            const x = ctx.lerp(p.x0, p.x1, q) + G.arco.x * arco;
            const y = ctx.lerp(p.y0, p.y1, q) + G.arco.y * arco;
            const w = ctx.lerp(r.w, c.dati.w, q);
            const hh = ctx.lerp(r.h, c.h, q);
            p.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
            p.rect.setAttribute('width', w.toFixed(1));
            p.rect.setAttribute('height', hh.toFixed(1));
            p.t.setAttribute('x', (w / 2).toFixed(1));
            p.t.setAttribute('y', (hh / 2).toFixed(1));
          });
          const o = String(Math.max(0, 1 - t * 2.5));
          vecchi.forEach((v) => { v.style.opacity = o; });
        },
        done: () => pezzi.forEach((p) => p.g.remove()),
      });
    }

    async function animaAccesso(e, prima, g) {
      const T = DURATE[stato.velocita - 1];
      mostraIndirizzo(e.indirizzo);
      rivali(e.blocco);
      await Promise.all([
        muovi(rif.cursore, ramX(e.indirizzo) - 2, ramY(e.indirizzo) - 2, T * 0.26),
        muovi(rif.freccia, G.c.freccia, centroInsieme(e.insieme), T * 0.26),
      ]);
      if (g !== A.gen) return;
      mostraSel(e.insieme, true);
      rif.cursoreC.setAttribute('opacity', '0');
      await A.pausa(T * 0.12);
      if (g !== A.gen) return;
      if (e.colpo) {
        sposta(rif.cursoreC, datoX(e.posizione) - 2, rigaY(e.riga) - 2);
        rif.cursoreC.setAttribute('opacity', '1');
        await Promise.all([lampeggia(rif.righe[e.riga].lampo, 'colpo', T * 0.5), popUp(e.riga, true, T * 0.55)]);
      } else {
        await lampeggia(rif.blocchi[e.blocco].lampo, 'manc', T * 0.2);
        if (g !== A.gen) return;
        await vola(e, prima, T * 0.5);
        if (g !== A.gen) return;
        disegnaRiga(e.riga);
        sposta(rif.cursoreC, datoX(e.posizione) - 2, rigaY(e.riga) - 2);
        rif.cursoreC.setAttribute('opacity', '1');
        await Promise.all([lampeggia(rif.righe[e.riga].lampo, 'manc', T * 0.36), popUp(e.riga, false, T * 0.45)]);
      }
      if (g !== A.gen) return;
      mostraSel(e.insieme, false);
    }

    // Restituisce true se l'animazione arriva in fondo, false se viene interrotta.
    async function passo() {
      if (occupato || indice >= accessi.length) return false;
      occupato = true;
      const g = A.gen;
      const prima = cache.linee.flat().map((l) => ({ valida: l.valida, blocco: l.blocco }));
      const e = M.accedi(cache, accessi[indice]);
      indice += 1;
      esiti.push(e);
      try {
        await animaAccesso(e, prima, g);
      } finally {
        // Se è stata interrotta, chi ha interrotto ha già rimesso in ordine lo stato.
        if (g === A.gen) {
          occupato = false;
          sincronizza();
          scriviNota(nota, '<span class="mem-nota-passo">Accesso ' + indice + ' di ' + accessi.length + '.</span> ' + M.spiegaAccesso(cache, e));
        }
      }
      return g === A.gen;
    }

    function riepilogo() {
      const t = M.stimaTempo(cache.colpi, cache.mancati);
      const p = Math.round((100 * cache.colpi) / accessi.length);
      const f = t.senzaCache / t.conCache;
      let html = '<strong>Fine: ' + cache.colpi + ' colpi su ' + accessi.length + ' (' + p + '%).</strong> Tempo stimato ' + M.formattaNs(t.conCache) + ', contro ' + M.formattaNs(t.senzaCache) + ' senza cache';
      if (f >= 1.05) html += ': ' + M.numeroIt(f, 1) + ' volte più veloce. ';
      else html += ': con tutti mancati la cache fa perfino perdere un po\' di tempo. ';
      scriviNota(nota, html + LEZIONI[stato.schema][stato.vie - 1]);
    }

    function aggiornaBottoni() {
      const finito = indice >= accessi.length;
      btnEsegui.textContent = corre ? 'Pausa' : (finito ? 'Da capo' : (indice > 0 ? 'Riprendi' : 'Esegui'));
      btnEsegui.setAttribute('aria-pressed', String(corre));
      btnPasso.disabled = finito && !corre;
    }

    async function esegui() {
      if (corre) return;
      if (indice >= accessi.length) ricomincia();
      corre = true;
      nota.setAttribute('aria-live', 'off');
      aggiornaBottoni();
      while (corre && indice < accessi.length) {
        await passo();
        if (!corre) break;
        // Con il movimento ridotto niente moto, ma i passi restano distinti nel tempo.
        await A.pausa(ctx.ridotto() ? DURATE[stato.velocita - 1] : DURATE[stato.velocita - 1] * 0.22, true);
      }
      const finito = indice >= accessi.length;
      corre = false;
      nota.setAttribute('aria-live', 'polite');
      aggiornaBottoni();
      if (finito) riepilogo();
    }

    function pausa() {
      corre = false;
      aggiornaBottoni();
    }

    async function passoSingolo() {
      if (corre) { pausa(); return; }
      if (occupato) {
        // Un clic durante l'animazione la completa subito e passa all'accesso seguente.
        A.taglia();
        occupato = false;
        sincronizza();
      }
      const fatto = indice < accessi.length ? await passo() : true;
      aggiornaBottoni();
      if (fatto && indice >= accessi.length) riepilogo();
    }

    function ricomincia(ricostruisci) {
      A.taglia();
      corre = false;
      occupato = false;
      cache = M.creaCache({ righe: 8, blocco: 4, vie: stato.vie, ram: 64 });
      accessi = M.generaAccessi(stato.schema);
      indice = 0;
      esiti = [];
      descr.textContent = M.schema(stato.schema).descrizione;
      costruisciStoria();
      if (ricostruisci || !rif) costruisci();
      sincronizza();
      nota.setAttribute('aria-live', 'polite');
      scriviNota(nota, 'Qui la RAM ha 64 byte, numerati da 0 a 63, e la cache ne tiene 32: 8 righe da un blocco di 4 byte. Premi <strong>Passo</strong> per un accesso alla volta o <strong>Esegui</strong> per lasciarla andare. Un colpo costa 1 ns, un mancato 100 ns in più per andare in RAM.');
      aggiornaBottoni();
    }

    function scegliSchema(id) {
      stato.schema = id;
      segSchema.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      ricomincia();
    }

    function scegliVie(v) {
      if (stato.vie === v) return;
      stato.vie = v;
      segVie.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v)));
      ricomincia(true);
    }

    // Cambio di impaginazione: lo schema si ridisegna dallo stato del modello.
    function adatta() {
      const w = stage.clientWidth - 32;
      if (w <= 0) return;
      const nuovo = w < 700;
      if (nuovo === stretto) return;
      stretto = nuovo;
      if (!cache) return;
      const g = A.gen;
      A.taglia();
      occupato = false;
      costruisci();
      sincronizza();
      if (g !== A.gen && corre) { /* il ciclo di esecuzione prosegue con il prossimo passo */ }
    }

    stretto = (stage.clientWidth || 800) - 32 < 700;
    ricomincia(true);
    let ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(adatta); ro.observe(stage); }

    return {
      entra() { adatta(); },
      esce() { pausa(); },
      sospendi() {
        eraInCorsa = corre;
        pausa();
        if (occupato) { A.taglia(); occupato = false; sincronizza(); }
      },
      attiva() { if (eraInCorsa) { eraInCorsa = false; esegui(); } },
      distruggi() { corre = false; A.taglia(); if (ro) ro.disconnect(); },
    };
  }

  /* ---------- il laboratorio con le due schede ---------- */

  function creaLaboratorio(el, ctx) {
    const h = ctx.h;
    const radice = h('div', { class: 'mem-lab' });
    el.append(radice);
    const base = ctx.uid('mem');
    const nomi = ['Se un ciclo durasse un secondo', 'La cache in azione'];
    let corrente = 0;
    let visibile = false;

    const tab = nomi.map((n, i) => h('button', {
      type: 'button', role: 'tab', id: base + '-tab-' + i, 'aria-controls': base + '-pan-' + i,
      'aria-selected': String(i === 0), tabindex: i === 0 ? '0' : '-1',
      onclick: () => mostra(i),
      onkeydown: (ev) => {
        let j = null;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') j = (i + 1) % nomi.length;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') j = (i + nomi.length - 1) % nomi.length;
        else if (ev.key === 'Home') j = 0;
        else if (ev.key === 'End') j = nomi.length - 1;
        if (j !== null) { ev.preventDefault(); mostra(j); tab[j].focus(); }
      },
    }, n));
    const pannelli = nomi.map((n, i) => h('section', { class: 'mem-pan', id: base + '-pan-' + i, role: 'tabpanel', 'aria-labelledby': base + '-tab-' + i, hidden: i !== 0 }));
    radice.append(h('div', { class: 'lab-seg mem-tabs', role: 'tablist', 'aria-label': 'Esperimenti' }, tab), pannelli[0], pannelli[1]);

    const parti = [creaScala(pannelli[0], ctx), creaCacheLab(pannelli[1], ctx, el)];

    function mostra(i) {
      if (i === corrente) return;
      parti[corrente].esce();
      tab.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      pannelli.forEach((p, k) => { p.hidden = k !== i; });
      corrente = i;
      const p = pannelli[i];
      p.classList.remove('mem-entra');
      if (!ctx.ridotto()) { void p.offsetWidth; p.classList.add('mem-entra'); }
      parti[i].entra();
    }

    return {
      attiva() { visibile = true; if (parti[corrente].attiva) parti[corrente].attiva(); },
      sospendi() { visibile = false; parti.forEach((p) => p.sospendi()); },
      distruggi() { parti.forEach((p) => p.distruggi()); },
      get visibile() { return visibile; },
    };
  }

  /* ======================================================================
   * Capitolo
   * ====================================================================== */

  const G = M ? M.GENERAZIONI_RAM : [];
  const num = (v, d) => (M ? M.numeroIt(v, d) : String(v));

  P.registra({
    numero: 6,
    id: 'memoria',
    titolo: 'La gerarchia della memoria',
    breve: 'Memoria',
    periodo: '1947–oggi',
    colore: 'var(--era-6)',
    sommario: 'Registri, cache, RAM e dischi: perché un computer ha tante memorie diverse, come sono nate, dalle vasche di mercurio ai moduli DDR5, e quanto è lontano un dato.',
    intro: 'Un processore moderno esegue miliardi di istruzioni al secondo, ma senza dati da leggere e da scrivere resterebbe fermo. Il guaio è che nessuna memoria è insieme enorme, velocissima ed economica. Per questo, dagli anni Quaranta a oggi, ogni computer ha una <strong>gerarchia</strong> di memorie: poche celle rapidissime accanto al processore e, via via più lontano, magazzini più grandi, più lenti e meno costosi. In questo capitolo la percorriamo dall\'alto in basso e ne raccontiamo la storia, dalle vasche di mercurio ai moduli DDR5.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Perché un computer ha tante memorie',
        paragrafi: [
          'Ogni tecnologia di memoria è un compromesso fra tre qualità: velocità, capacità e costo per bit. Le celle più rapide, i <strong>registri</strong> e la SRAM (<em>Static RAM</em>, RAM statica) delle <strong>cache</strong>, usano diversi transistor per bit e stanno sul chip del processore: velocissime, ma care e poche. La DRAM (<em>Dynamic RAM</em>, RAM dinamica) dei moduli di <strong>RAM</strong> (<em>Random Access Memory</em>, memoria ad accesso casuale) è molto più densa ed economica, ma più lenta. Le memorie di massa, come le unità a stato solido (SSD) e i dischi rigidi, costano pochissimo e conservano i dati a computer spento, ma rispondono migliaia o milioni di volte più lentamente.',
          'Il trucco che rende utile una gerarchia si chiama <strong>località</strong>. I programmi non usano la memoria a caso: tendono a riusare presto gli stessi dati (<em>località temporale</em>: il contatore di un ciclo, le istruzioni del ciclo stesso) e a usare dati vicini a quelli appena letti (<em>località spaziale</em>: gli elementi di un array, le istruzioni una dopo l\'altra). Basta quindi tenere nel livello più veloce una copia dei dati usati di recente, e di quelli accanto: la gran parte delle richieste trova lì ciò che cerca.',
          'Funziona come una scrivania. I fogli su cui stai lavorando sono sul piano (registri e cache), i raccoglitori dell\'anno nello scaffale (la RAM), l\'archivio in cantina (il disco), e ciò che manca si chiede a un\'altra sede (la rete). Quando il dato cercato c\'è si parla di <em>colpo</em> (in inglese <em>hit</em>); quando non c\'è, di <em>mancato</em> (<em>miss</em>): bisogna prenderlo al livello di sotto, che insieme al dato manda anche i suoi vicini.',
          'L\'idea è antica quanto il computer: la proposero già nel 1946 Arthur Burks, Herman Goldstine e John von Neumann, progettando la macchina dell\'Institute for Advanced Study di Princeton. Da allora la distanza fra processore e memoria, il «collo di bottiglia di von Neumann» (vedi il <a href="#von-neumann">capitolo 2</a>), è uno dei problemi centrali dell\'architettura dei calcolatori.',
        ],
      },
      {
        tipo: 'citazione',
        testo: 'Siamo dunque costretti a riconoscere la possibilità di costruire una gerarchia di memorie, ciascuna delle quali ha una capacità maggiore della precedente ma è accessibile meno rapidamente.',
        autore: 'Arthur W. Burks, Herman H. Goldstine e John von Neumann',
        fonte: '<em>Preliminary Discussion of the Logical Design of an Electronic Computing Instrument</em>, 1946 (traduzione)',
      },
      {
        tipo: 'figura',
        svg: figuraPiramide,
        alt: 'Piramide a gradini della gerarchia della memoria, disegnata con gli oggetti: in cima un frammento di processore con i registri, poi il chip con le matrici di cache, un modulo di RAM, un SSD M.2, un disco rigido aperto con il braccio e la testina sul piatto e, alla base, il mondo collegato a un armadio di server.',
        didascalia: '<strong>La gerarchia della memoria di un PC di oggi.</strong> In cima i registri, dentro il core; poi le cache L1, L2 e L3 (matrici di SRAM sul chip del processore), la RAM (moduli DIMM di DRAM), l\'SSD (qui una schedina M.2 NVMe), il disco rigido (aperto: si vedono il piatto e il braccio con la testina) e, alla base, la rete. Salendo la memoria è più veloce e più cara per byte; scendendo è più capiente ed economica. Latenze tipiche: da 0,3 ns (miliardesimi di secondo) per un registro a 100 ns per la RAM, 50 µs (milionesimi di secondo) per un SSD, 5–10 ms (millesimi di secondo) per un disco e 100–150 ms per un server in un altro continente.',
      },
      {
        tipo: 'testo',
        titolo: 'Dalle vasche di mercurio ai nuclei di ferrite',
        paragrafi: [
          'L\'<strong>EDSAC</strong> (<em>Electronic Delay Storage Automatic Calculator</em>) di Cambridge, che eseguì il suo primo programma il 6 maggio 1949, usava <strong>linee di ritardo a mercurio</strong>, una tecnica nata per i radar e proposta da J. Presper Eckert. I bit diventavano impulsi sonori che viaggiavano in tubi d\'acciaio pieni di mercurio e, arrivati in fondo, venivano amplificati e rimandati all\'inizio. Ogni tubo (<em>tank</em>, vasca) conteneva 576 bit; con 32 vasche si arrivava a poco più di 2 kilobyte. Per leggere un dato bisognava aspettare che passasse, come un treno in stazione.',
          'A Manchester Frederic C. Williams e Tom Kilburn scelsero un\'altra strada: il <strong>tubo di Williams</strong> conservava i bit come puntini di carica sullo schermo di un normale tubo a raggi catodici, da rinfrescare di continuo prima che svanissero. Alla fine del 1947 un tubo da 6 pollici conservava 2.048 bit, e il 21 giugno 1948 la piccola Manchester Baby vi eseguì il primo programma memorizzato della storia. Il pregio decisivo: si poteva leggere qualsiasi bit in qualsiasi momento, senza aspettare il turno. È l\'<em>accesso casuale</em> che ancora oggi dà il nome alla RAM.',
          'Più economici e capienti erano i <strong>tamburi magnetici</strong>, cilindri magnetizzabili che giravano sotto file di testine fisse. L\'IBM 650 (1954) teneva programmi e dati su un tamburo da 12.500 giri al minuto, e i programmatori più abili disponevano le istruzioni in modo da non dover aspettare un giro intero.',
          'Nell\'agosto 1953, al MIT (<em>Massachusetts Institute of Technology</em>), il gruppo di Jay Forrester installò nel calcolatore Whirlwind la prima <strong>memoria a nuclei di ferrite</strong>: anellini magnetici di un paio di millimetri, infilati agli incroci di una griglia di fili. Ogni nucleo ricorda un bit nel verso in cui è magnetizzato e lo conserva anche senza corrente. Rispetto ai tubi usati prima, l\'accesso scese da circa 25 a circa 9 microsecondi e i guasti diminuirono di molto.',
          'Leggere un nucleo, però, lo cancella: la macchina deve riscrivere subito il bit appena letto. I piani di nuclei venivano spesso infilati a mano, e il prezzo scese da circa un dollaro a circa un centesimo per bit. Le memorie a nuclei restarono la memoria principale dei calcolatori fino agli anni Settanta, e hanno lasciato una parola: in inglese la copia della memoria salvata quando un programma si blocca si chiama ancora <em>core dump</em>, «scarico dei nuclei».',
        ],
      },
      {
        tipo: 'italia',
        titolo: 'Dall\'Elea alla Programma 101',
        paragrafi: [
          'L\'<strong>Olivetti Elea 9003</strong>, presentato alla Fiera di Milano nel 1959 e progettato dal gruppo di Mario Tchou, fu il primo grande calcolatore commerciale italiano interamente a transistor. La sua memoria centrale era a nuclei di ferrite, come quella dei grandi calcolatori americani, con un tempo di accesso di circa 10 microsecondi.',
          'Sei anni dopo la <strong>Programma 101</strong> (1965), la calcolatrice programmabile da tavolo progettata da Pier Giorgio Perotto, scelse una strada più economica: una <strong>linea di ritardo magnetostrittiva</strong>, cugina delle vasche di mercurio dell\'EDSAC. I bit viaggiavano come piccole onde di torsione lungo un filo metallico avvolto a spirale: 1.920 bit in tutto, cioè 240 byte. Per conservare i programmi a macchina spenta c\'era la cartolina magnetica (vedi il <a href="#primi-pc">capitolo 3</a>).',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraNuclei,
        alt: 'Piano di memoria a nuclei di ferrite: una griglia di sei per sei anellini scuri, ciascuno all\'incrocio di un filo orizzontale e di uno verticale, attraversati in diagonale dal filo di lettura; il nucleo all\'incrocio dei due fili percorsi da mezza corrente è evidenziato in rosso. A destra due nuclei ingranditi, magnetizzati in senso orario (1) e antiorario (0), e un grafico: le due mezze correnti da sole restano sotto la soglia, sommate la superano.',
        didascalia: '<strong>Un piano di memoria a nuclei di ferrite.</strong> Ogni anellino conserva un bit nel verso della sua magnetizzazione: orario per 1, antiorario per 0. Per scrivere, la macchina manda metà della corrente necessaria (½ I) su un filo X e metà su un filo Y: solo il nucleo all\'incrocio riceve la corrente piena, supera la soglia e si capovolge. Il filo di lettura (in blu) attraversa tutti i nuclei e raccoglie l\'impulso di quello che cambia verso; un quarto filo, di inibizione, qui non disegnato, impedisce la scrittura quando il bit deve restare 0. Più piani impilati, uno per ogni bit della parola, formano la memoria.',
      },
      {
        tipo: 'nota',
        testo: 'Il computer di guida delle missioni Apollo aveva 2.048 parole di memoria a nuclei per i dati e 36.864 parole di programma in una <em>core rope memory</em>, una memoria «a corda» che si poteva solo leggere. Lì un filo che passava dentro un nucleo valeva 1, uno che gli passava accanto valeva 0: il programma veniva letteralmente tessuto a mano, filo per filo, dalle operaie della Raytheon, e una volta tessuto non si poteva più cambiare.',
      },
      {
        tipo: 'testo',
        titolo: 'Il sorpasso del silicio: SRAM e DRAM',
        paragrafi: [
          'Negli anni Sessanta i circuiti integrati (vedi la <a href="../porte-logiche/index.html#integrato">sezione 4</a>) permisero di costruire le memorie con i transistor. Nel 1969 la neonata Intel mise in vendita il suo primo prodotto, il 3101: una SRAM da 64 bit. In una SRAM ogni bit è un piccolo circuito a due stati, un <em>flip-flop</em> (nelle SRAM di oggi di solito sei transistor), che conserva il valore finché c\'è alimentazione: è veloce e non richiede manutenzione, ma occupa spazio.',
          'Nel 1966 Robert Dennard, all\'IBM, ebbe l\'idea che avrebbe cambiato tutto: conservare un bit come carica elettrica in un minuscolo <a href="../elettronica-base/index.html#condensatore">condensatore</a>, comandato da un solo transistor. È la cella della <strong>DRAM</strong>, brevettata nel 1968. Il condensatore però si scarica lentamente, come un secchio bucato: ogni cella va letta e riscritta (<em>rinfrescata</em>) a intervalli regolari, di solito entro 64 millisecondi (32 nelle DDR5). Da qui l\'aggettivo «dinamica».',
          'Il primo grande successo fu l\'<strong>Intel 1103</strong>, in commercio dall\'ottobre 1970: 1.024 bit in un chip, con celle a tre transistor nate da un progetto con la Honeywell. Costava circa un centesimo per bit, come i nuclei, ma era molto più piccolo: nel 1972 era il chip di memoria più venduto al mondo, e in pochi anni i nuclei uscirono di scena. Le celle a un transistor di Dennard si imposero con la generazione successiva, quella da 4 kbit.',
          'Da allora la SRAM fa da cache dentro il processore e la DRAM è la memoria principale. La crescita è stata vertiginosa: un chip DDR5 da 16 gigabit contiene oltre 16 milioni di volte i bit dell\'Intel 1103.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Moduli, sincronia e doppia velocità',
        paragrafi: [
          'Nell\'IBM PC del 1981 la RAM era fatta di chip DRAM inseriti uno per uno negli zoccoli della scheda madre. Alla fine degli anni Ottanta si diffusero i moduli <strong>SIMM</strong> (<em>Single In-line Memory Module</em>): piccole schede con i chip già saldati, da infilare in uno slot. I primi avevano 30 contatti e portavano 8 bit alla volta; negli anni Novanta, con il 486 e il Pentium, si diffusero i SIMM a 72 contatti, da 32 bit.',
          'Con i moduli <strong>DIMM</strong> (<em>Dual In-line Memory Module</em>), da 168 contatti e 64 bit, si affermò la <strong>SDRAM</strong> (<em>Synchronous DRAM</em>), che dalla metà degli anni Novanta lavora al ritmo del clock del bus invece di rispondere quando è pronta. Intorno al 2000 la <strong>DDR</strong> (<em>Double Data Rate</em>) raddoppiò i trasferimenti sfruttando entrambi i fronti del clock, in salita e in discesa. Seguirono DDR2, DDR3, DDR4 e DDR5 (2020), con tensioni sempre più basse e trasferimenti sempre più rapidi (vedi la tabella).',
          'Ogni modulo porta anche un piccolo chip, lo SPD (<em>Serial Presence Detect</em>), che all\'accensione comunica alla scheda madre capacità e tempi di risposta attraverso il bus <a href="../../index.html#/bus/smbus">SMBus</a>. Per i portatili esistono moduli compatti (SO-DIMM, da <em>Small Outline</em>), e sempre più spesso la memoria è saldata sulla scheda madre o nello stesso contenitore del processore.',
          'C\'è però un numero cambiato poco: la <strong>latenza</strong>, cioè il tempo fra la richiesta e l\'arrivo del primo dato. Un chip DRAM di oggi impiega ancora 10–20 nanosecondi per rispondere a un comando di lettura, come venticinque anni fa, e il viaggio completo dal processore alla RAM e ritorno costa un centinaio di nanosecondi. Intanto i processori acceleravano: nel 1995 William Wulf e Sally McKee chiamarono questo divario «muro della memoria» (<em>memory wall</em>). Il rimedio sta dentro il processore: la cache.',
        ],
      },
      {
        tipo: 'confronto',
        titolo: 'Le generazioni della RAM nei PC',
        colonne: ['Tipo', 'Anno dello standard', 'Contatti del modulo', 'Tensione', 'Banda di picco di un modulo'],
        righe: G.map((g) => [g.nome, String(g.anno), String(g.contatti), num(g.volt, 1) + ' V', num(g.gbs, 1) + ' GB/s <small>(' + g.esempio + ')</small>']),
      },
      {
        tipo: 'testo',
        titolo: 'La cache, un magazzino accanto al processore',
        paragrafi: [
          'Una <strong>cache</strong> è una piccola memoria veloce che conserva da sola le copie dei dati usati più di recente. Il nome viene dal francese <em>cacher</em>, nascondere: i programmi non devono sapere che c\'è. L\'idea fu descritta nel 1965 da Maurice Wilkes, il costruttore dell\'EDSAC, con il nome di <em>slave memory</em> («memoria schiava»). Il primo calcolatore in commercio con una cache fu l\'<strong>IBM System/360 Model 85</strong>, annunciato nel 1968: 16 KB di memoria veloce (32 in opzione) davanti a una memoria a nuclei molto più lenta.',
          'La cache non lavora a byte singoli ma a <strong>blocchi</strong>, o <em>linee</em>, oggi di solito di 64 byte. Quando un dato manca, dalla RAM arriva tutto il blocco che lo contiene: i vicini sono già pronti, ed è la località spaziale messa a frutto. Ogni riga conserva, oltre ai dati, un\'<em>etichetta</em> (<em>tag</em>) che dice da quale indirizzo vengono. In una cache a <strong>corrispondenza diretta</strong> ogni blocco della RAM può stare in una sola riga, decisa da una parte del suo indirizzo; in una cache <strong>associativa a più vie</strong> può scegliere fra più righe, e quando sono tutte occupate si sostituisce di solito quella usata meno di recente (LRU, <em>Least Recently Used</em>).',
          'Alla fine degli anni Ottanta le schede madri per l\'Intel 386 più veloci montavano 32 o 64 KB di SRAM accanto al processore. Il 486 (1989) fu il primo processore x86 con la cache nel chip: 8 KB per istruzioni e dati. Il Pentium (1993) la divise in due, 8 KB per le istruzioni e 8 per i dati; il Pentium Pro (1995) mise la cache di secondo livello, la <strong>L2</strong>, nel suo stesso contenitore e alla sua stessa velocità; dalla fine degli anni Novanta la L2 è entrata nel chip.',
          'Con i processori a più core (nuclei di calcolo) è arrivata la <strong>L3</strong>, condivisa: ogni core ha la sua L1 (32–64 KB per i dati) e la sua L2 (da 1 a 3 MB), poi tutti attingono a una L3 da decine di megabyte. Alcuni processori AMD impilano perfino un secondo strato di SRAM (3D V-Cache) e arrivano a 96 o 128 MB di L3. In un programma ben scritto più del 90 per cento degli accessi trova il dato in L1. Il laboratorio qui sotto mostra perché.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'testo',
        titolo: 'Dischi, dischetti e memorie flash',
        paragrafi: [
          'Sotto la RAM c\'è la memoria di massa, che conserva i dati a computer spento. Il primo disco rigido fu l\'<strong>IBM 350</strong>, parte del sistema RAMAC (<em>Random Access Method of Accounting and Control</em>) annunciato nel 1956: cinquanta piatti da 24 pollici (61 cm) che giravano a 1.200 giri al minuto e contenevano circa 5 milioni di caratteri, cioè circa 3,75 MB. Con il suo compressore d\'aria pesava quasi una tonnellata, si noleggiava, e per trovare un dato impiegava in media meno di un secondo.',
          'I <strong>dischetti</strong> (<em>floppy disk</em>) misero i dati in tasca: IBM presentò quello da 8 pollici nel 1971 (circa 80 KB), Shugart Associates quello da 5,25 pollici nel 1976, Sony quello da 3,5 pollici, con il guscio rigido, nei primi anni Ottanta. Nel 1980 il Seagate ST-506 portò nei microcomputer il disco rigido da 5,25 pollici, con 5 MB, e nel 1983 il PC/XT dell\'IBM ebbe di serie un disco da 10 MB. A metà degli anni Ottanta arrivò il <strong>CD-ROM</strong> (<em>Compact Disc Read-Only Memory</em>, disco compatto a sola lettura): circa 650 MB letti da un laser.',
          'Un disco rigido resta però un oggetto meccanico: il braccio deve spostare la testina sulla traccia giusta e aspettare che il settore le passi sotto, e servono millisecondi. La svolta è venuta dalla <strong>memoria flash</strong>, inventata negli anni Ottanta da Fujio Masuoka alla Toshiba: transistor con un elettrodo isolato (<em>floating gate</em>) che intrappola gli elettroni e conserva i bit senza alimentazione. Intorno al 2000 sono nate le <strong>chiavette USB</strong> (dal nome della porta, <em>Universal Serial Bus</em>), le prime da 8 MB; poi gli <strong>SSD</strong>, senza parti in movimento.',
          'All\'inizio gli SSD usavano la stessa interfaccia dei dischi, il <a href="../../index.html#/bus/sata">SATA</a> (<em>Serial ATA</em>); dal 2011 lo standard <strong>NVMe</strong> (<em>Non-Volatile Memory Express</em>) li collega direttamente alle linee <a href="../../index.html#/bus/pcie">PCI Express</a>, spesso in una schedina M.2 grande come una gomma da masticare. Un SSD NVMe legge un dato in qualche decina di microsecondi, più di cento volte prima di un disco rigido. Oggi un SSD domestico contiene da 1 a 4 TB, quelli per i centri dati superano i 100 TB e i dischi rigidi più grandi i 30 TB: milioni di volte il disco del PC/XT.',
          'Il sistema operativo, infine, usa la RAM libera come cache del disco e, quando la RAM finisce, parcheggia su disco le parti di memoria usate meno di recente: è la <strong>memoria virtuale</strong>, nata nel 1962 con il calcolatore Atlas di Manchester. Ecco perché un computer con poca RAM rallenta tanto: ogni dato che torna dal disco costa al processore l\'equivalente di giorni, o di mesi se il disco è meccanico.',
        ],
      },
      {
        tipo: 'numeri',
        items: [
          { valore: 333, unita: 'cicli', etichetta: 'di attesa per un dato che arriva dalla RAM: 100 ns, con un ciclo ogni 0,3 ns (circa 3,3 GHz)' },
          { valore: 1024, unita: 'bit', etichetta: 'nell\'Intel 1103 del 1970, la prima DRAM di successo' },
          { valore: 3.75, decimali: 2, unita: 'MB', etichetta: 'nei 50 piatti da 24 pollici dell\'IBM 350, il primo disco rigido (1956)' },
          { valore: 64, unita: 'ms', etichetta: 'il tempo entro cui una DRAM deve rinfrescare ogni sua cella (32 ms nelle DDR5)' },
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Le tappe della memoria',
        items: [
          { anno: 1947, nome: 'Tubo di Williams', luogo: 'Università di Manchester, Regno Unito', testo: 'Frederic C. Williams e Tom Kilburn conservano 2.048 bit come puntini di carica sullo schermo di un tubo a raggi catodici. Nel 1948 la Manchester Baby vi esegue il primo programma memorizzato.' },
          { anno: 1949, nome: 'Le vasche di mercurio dell\'EDSAC', luogo: 'Università di Cambridge, Regno Unito', testo: 'I bit circolano come impulsi sonori in tubi pieni di mercurio, 576 per vasca. Per leggere un dato bisogna aspettare che passi.' },
          { anno: 1953, nome: 'Nuclei di ferrite nel Whirlwind', luogo: 'MIT, Cambridge (Massachusetts)', testo: 'Il gruppo di Jay Forrester installa la prima memoria a nuclei: accesso in circa 9 microsecondi, dati conservati anche senza corrente. Dominerà fino agli anni Settanta.' },
          { anno: 1956, nome: 'IBM 350, il primo disco rigido', luogo: 'IBM, San Jose (California)', testo: 'Il cuore del sistema RAMAC: 50 piatti da 24 pollici a 1.200 giri al minuto, circa 5 milioni di caratteri (3,75 MB). Con il compressore d\'aria pesava quasi una tonnellata.' },
          { anno: 1959, nome: 'La memoria a nuclei dell\'Elea 9003', luogo: 'Olivetti, Italia', italia: true, testo: 'Il primo grande calcolatore commerciale italiano interamente a transistor ha una memoria centrale a nuclei di ferrite, con accesso in circa 10 microsecondi.' },
          { anno: 1962, nome: 'Atlas e la memoria virtuale', luogo: 'Università di Manchester e Ferranti, Regno Unito', testo: 'Nuclei e tamburo magnetico appaiono ai programmi come un\'unica grande memoria: è il sistema a spostare le pagine fra i due livelli.' },
          { anno: 1968, nome: 'IBM System/360 Model 85', luogo: 'IBM, Stati Uniti', testo: 'Il primo calcolatore in commercio con una cache: 16 KB di memoria veloce (32 in opzione) davanti ai nuclei. Le consegne iniziano alla fine del 1969.' },
          { anno: 1970, nome: 'Intel 1103', luogo: 'Intel, Santa Clara (California)', testo: 'La prima DRAM di successo: 1.024 bit in un chip, celle a tre transistor, circa un centesimo per bit. Nel 1972 è il chip di memoria più venduto al mondo.' },
          { anno: 1971, nome: 'Il dischetto da 8 pollici', luogo: 'IBM, San Jose (California)', testo: 'Un disco flessibile da circa 80 KB, nato per caricare il microcodice dei grandi calcolatori IBM. Seguiranno il 5,25 pollici (1976) e il 3,5 pollici (primi anni Ottanta).' },
          { anno: 1980, nome: 'Seagate ST-506', luogo: 'Seagate, Scotts Valley (California)', testo: 'Il primo disco rigido da 5,25 pollici per microcomputer: 5 MB. La sua interfaccia diventa uno standard dei primi PC.' },
          { anno: 1989, nome: 'La cache entra nel processore: Intel 486', luogo: 'Intel, Santa Clara (California)', testo: 'Il primo processore x86 con la cache nel chip: 8 KB per istruzioni e dati. Da qui in poi la cache diventa parte del processore.' },
          { anno: 2000, nome: 'Le prime chiavette USB', luogo: 'M-Systems (Israele) e IBM', testo: 'Memoria flash e connettore USB in un oggetto da portachiavi: le prime contengono 8 MB. In pochi anni mandano in pensione il dischetto.' },
        ],
      },
    ],
    lab: {
      titolo: 'Quanto è lontano un dato?',
      sottotitolo: 'I tempi della gerarchia a misura d\'uomo, e una piccola cache da mettere alla prova',
      crea: creaLaboratorio,
    },
    punti: [
      'Nessuna memoria è insieme grande, veloce ed economica: per questo i computer usano una <strong>gerarchia</strong>, dai registri alla rete, in cui ogni livello è più capiente e più lento di quello sopra.',
      'La gerarchia funziona grazie alla <strong>località</strong>: i programmi riusano presto gli stessi dati (località temporale) e usano dati vicini fra loro (località spaziale).',
      'Dalle linee di ritardo e dai tubi di Williams si passò ai <strong>nuclei di ferrite</strong> (1953), che dominarono fino agli anni Settanta, e poi alla <strong>DRAM</strong> su chip (Intel 1103, 1970).',
      'La SRAM, veloce ma ingombrante, fa da cache; la DRAM, un transistor e un condensatore per bit da rinfrescare di continuo, è la memoria principale.',
      'La cache nasce con l\'IBM System/360 Model 85 (1968) ed entra nei processori x86 con il 486 (1989); oggi ogni core ha L1 e L2, e i core condividono una L3.',
      'Se un ciclo del processore durasse un secondo, la RAM risponderebbe in minuti, un SSD in giorni, un disco rigido in mesi e un server lontano in anni.',
    ],
    collegamenti: [
      { testo: 'SMBus, il bus dello SPD', href: '../../index.html#/bus/smbus', tipo: 'buslab' },
      { testo: 'SATA', href: '../../index.html#/bus/sata', tipo: 'buslab' },
      { testo: 'PCI Express', href: '../../index.html#/bus/pcie', tipo: 'buslab' },
      { testo: 'USB', href: '../../index.html#/bus/usb', tipo: 'buslab' },
      { testo: 'SCSI', href: '../../index.html#/bus/scsi', tipo: 'buslab' },
      { testo: 'Sezione 5 · Le memorie nei chip', href: '../chip-programmabili/index.html#memorie', tipo: 'sezione' },
      { testo: 'Sezione 4 · Il circuito integrato', href: '../porte-logiche/index.html#integrato', tipo: 'sezione' },
      { testo: 'Sezione 1 · Il condensatore', href: '../elettronica-base/index.html#condensatore', tipo: 'sezione' },
      { testo: 'Sezione 1 · Il magnetismo', href: '../elettronica-base/index.html#magnetismo', tipo: 'sezione' },
      { testo: 'Capitolo 2 · L\'architettura di von Neumann', href: '#von-neumann', tipo: 'sezione' },
      { testo: 'Capitolo 5 · La scheda madre', href: '#scheda-madre', tipo: 'sezione' },
      { testo: 'Capitolo 9 · La corsa alle prestazioni', href: '#prestazioni', tipo: 'sezione' },
      { testo: 'Quiz del capitolo', href: '../quiz/index.html#storia-pc/memoria', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
