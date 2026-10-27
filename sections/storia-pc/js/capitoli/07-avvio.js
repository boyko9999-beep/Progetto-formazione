/*
 * Storia del PC · capitolo 7: Accendere un PC, dal BIOS all'UEFI.
 * Testi, due illustrazioni (la staffetta dell'avvio; dove abita il firmware) e il laboratorio
 * «Premi il tasto di accensione»: un PC con monitor a tubo catodico (o LCD, per l'UEFI) che si
 * avvia fase per fase: POST, bip, settore di avvio da 512 byte, catena di caricamento, fasi UEFI
 * e verifica di Secure Boot. Dati e logica pura sono in js/modelli/07-avvio.js.
 */
(function (root) {
  'use strict';
  const P = root.StoriaPC;
  const M = (root.StoriaPCModelli || {}).avvio;

  /* ======================= figure ======================= */

  // Fila di piedini come rettangolini (per chip DIP e simili).
  function piedini(x0, y, n, passo, w, hh, cls) {
    let o = '';
    for (let i = 0; i < n; i++) o += '<rect class="' + cls + '" x="' + (x0 + i * passo) + '" y="' + y + '" width="' + w + '" height="' + hh + '"/>';
    return o;
  }

  /*
   * Figura 1 · La staffetta dell'avvio: sei passi su un percorso a serpentina.
   * Alimentatore → processore → firmware (riga in alto), disco → caricatore → sistema operativo (in basso).
   */
  function figuraStaffetta() {
    const o = [];
    o.push('<svg viewBox="0 0 640 412" xmlns="http://www.w3.org/2000/svg" class="avvf">');
    o.push('<path class="avvf-via" d="M110 100 H530 V292 H110"/>');
    o.push('<path class="avvf-flusso" d="M110 100 H530 V292 H110"/>');

    // 1 · alimentatore con ventola, fasci di fili e LED del Power Good
    o.push('<g transform="translate(110 100)">' +
      '<path class="avvf-filo f1" d="M60 6 C78 6 80 24 92 26"/><path class="avvf-filo f2" d="M60 14 C74 14 76 32 90 36"/><path class="avvf-filo f3" d="M60 22 C70 22 72 40 84 44"/>' +
      '<rect class="avvf-metallo" x="-62" y="-44" width="124" height="88" rx="6"/>' +
      '<rect class="avvf-ombra" x="-60" y="30" width="120" height="12" rx="3"/>' +
      '<circle class="avvf-griglia" cx="-14" cy="-6" r="31"/>' +
      '<g class="avvf-pale"><path d="M-14 -6 C-6 -26 6 -22 2 -14 Z"/><path d="M-14 -6 C6 2 2 14 -6 10 Z"/><path d="M-14 -6 C-22 14 -34 10 -30 2 Z"/><path d="M-14 -6 C-34 -14 -30 -26 -22 -22 Z"/></g>' +
      '<circle class="avvf-mozzo" cx="-14" cy="-6" r="7"/>' +
      '<rect class="avvf-targa" x="26" y="-34" width="28" height="18" rx="2"/>' +
      '<circle class="avvf-alone" cx="40" cy="10" r="13"/><circle class="avvf-led" cx="40" cy="10" r="6"/>' +
      '</g>');

    // 2 · processore con piedini e freccia del reset
    let pins = '';
    for (let i = 0; i < 7; i++) {
      const p = -36 + i * 12;
      pins += '<rect class="avvf-oro" x="' + p + '" y="-54" width="6" height="12"/><rect class="avvf-oro" x="' + p + '" y="42" width="6" height="12"/>' +
        '<rect class="avvf-oro" x="-54" y="' + p + '" width="12" height="6"/><rect class="avvf-oro" x="42" y="' + p + '" width="12" height="6"/>';
    }
    o.push('<g transform="translate(320 100)">' + pins +
      '<rect class="avvf-chip" x="-46" y="-46" width="92" height="92" rx="6"/>' +
      '<rect class="avvf-ihs" x="-30" y="-30" width="60" height="60" rx="4"/>' +
      '<path class="avvf-reset" d="M12 -10 A16 16 0 1 0 14 8"/><path class="avvf-reset-p" d="M6 -18 L16 -9 L4 -4 Z"/>' +
      '</g>');

    // 3 · firmware: chip con etichetta su un pezzo di scheda
    o.push('<g transform="translate(530 100)">' +
      '<rect class="avvf-pcb" x="-68" y="-48" width="136" height="96" rx="6"/>' +
      '<path class="avvf-pista" d="M-68 -30 H-54 L-46 -22 M-68 30 H-50 M68 -30 H54 M68 30 H56 L48 22"/>' +
      piedini(-40, -32, 8, 11, 5, 10, 'avvf-argento') + piedini(-40, 22, 8, 11, 5, 10, 'avvf-argento') +
      '<rect class="avvf-chip" x="-48" y="-24" width="96" height="48" rx="3"/>' +
      '<circle class="avvf-tacca" cx="-40" cy="0" r="4"/>' +
      '<rect class="avvf-etichetta" x="-33" y="-16" width="68" height="32" rx="2" transform="rotate(-3)"/>' +
      '<text class="avvf-t-chip" x="1" y="8" transform="rotate(-3)">BIOS</text>' +
      '</g>');

    // 4 · disco rigido visto dall'alto
    o.push('<g transform="translate(530 292)">' +
      '<rect class="avvf-cassa" x="-60" y="-46" width="120" height="92" rx="8"/>' +
      '<circle class="avvf-piatto" cx="-10" cy="0" r="38"/><circle class="avvf-solco" cx="-10" cy="0" r="30"/><circle class="avvf-solco" cx="-10" cy="0" r="21"/>' +
      '<circle class="avvf-mozzo" cx="-10" cy="0" r="8"/>' +
      '<path class="avvf-braccio" d="M42 -30 L6 -4"/><circle class="avvf-perno" cx="42" cy="-30" r="9"/>' +
      '<circle class="avvf-vite" cx="-52" cy="-38" r="3"/><circle class="avvf-vite" cx="52" cy="38" r="3"/><circle class="avvf-vite" cx="-52" cy="38" r="3"/>' +
      '</g>');

    // 5 · caricatore: un file con righe di codice
    o.push('<g transform="translate(320 292)">' +
      '<path class="avvf-foglio" d="M-38 -48 H18 L40 -26 V48 H-38 Z"/><path class="avvf-piega" d="M18 -48 V-26 H40"/>' +
      '<rect class="avvf-riga r1" x="-28" y="-30" width="34" height="7" rx="3"/>' +
      '<rect class="avvf-riga r2" x="-20" y="-16" width="44" height="7" rx="3"/>' +
      '<rect class="avvf-riga r3" x="-20" y="-2" width="30" height="7" rx="3"/>' +
      '<rect class="avvf-riga r2" x="-20" y="12" width="40" height="7" rx="3"/>' +
      '<rect class="avvf-riga r1" x="-28" y="26" width="26" height="7" rx="3"/>' +
      '</g>');

    // 6 · sistema operativo: schermo piatto con finestre
    o.push('<g transform="translate(110 292)">' +
      '<path class="avvf-supporto" d="M-12 34 L-16 50 H16 L12 34 Z"/><rect class="avvf-supporto" x="-34" y="48" width="68" height="6" rx="3"/>' +
      '<rect class="avvf-cornice" x="-64" y="-48" width="128" height="84" rx="6"/>' +
      '<rect class="avvf-sfondo" x="-57" y="-41" width="114" height="68" rx="2"/>' +
      '<rect class="avvf-finestra" x="-46" y="-32" width="54" height="36" rx="2"/><rect class="avvf-barra" x="-46" y="-32" width="54" height="8" rx="2"/>' +
      '<rect class="avvf-finestra" x="-12" y="-18" width="58" height="34" rx="2"/><rect class="avvf-barra b2" x="-12" y="-18" width="58" height="8" rx="2"/>' +
      '<rect class="avvf-tasti" x="-57" y="19" width="114" height="8"/>' +
      '</g>');

    // numeri dei passi
    [[110, 100], [320, 100], [530, 100], [530, 292], [320, 292], [110, 292]].forEach((c, i) => {
      o.push('<circle class="avvf-num" cx="' + (c[0] - 72) + '" cy="' + (c[1] - 56) + '" r="19"/>' +
        '<text class="avvf-num-t" x="' + (c[0] - 72) + '" y="' + (c[1] - 48) + '">' + (i + 1) + '</text>');
    });
    // etichette
    o.push('<text class="avvf-t" x="110" y="184">Alimentatore</text>');
    o.push('<text class="avvf-t" x="320" y="184">Processore</text>');
    o.push('<text class="avvf-t" x="530" y="184">Firmware</text>');
    o.push('<text class="avvf-t" x="530" y="376">Disco</text>');
    o.push('<text class="avvf-t" x="320" y="376">Caricatore</text>');
    o.push('<text class="avvf-t" x="110" y="376">Sistema</text><text class="avvf-t" x="110" y="402">operativo</text>');
    o.push('</svg>');
    return o.join('');
  }

  /*
   * Figura 2 · Dove abita il firmware: a sinistra una scheda di fine anni Ottanta (EPROM con finestra,
   * orologio CMOS, batteria ricaricabile saldata), a destra una di oggi (flash SPI a otto piedini,
   * pila CR2032, ponticello per cancellare le impostazioni).
   */
  function figuraFirmware() {
    const o = [];
    o.push('<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" class="avvf">');
    // le due schede
    o.push('<rect class="avvf-pcb" x="10" y="10" width="304" height="360" rx="12"/>');
    o.push('<rect class="avvf-pcb" x="326" y="10" width="304" height="360" rx="12"/>');
    o.push('<path class="avvf-pista" d="M10 188 H28 L42 202 H282 L296 188 H314 M10 300 H28 M150 300 H180 M292 300 H314 M90 60 V70 M232 60 V70"/>');
    o.push('<path class="avvf-pista" d="M326 150 H350 M410 150 H436 L446 140 M326 210 H352 L364 222 V226 M484 232 H520 L530 242 M600 232 H630 M560 300 V340"/>');
    o.push('<text class="avvf-tit" x="162" y="46">Fine anni Ottanta</text>');
    o.push('<text class="avvf-tit" x="478" y="46">Oggi</text>');

    // EPROM DIP-28 con finestra di quarzo coperta dall'etichetta
    o.push(piedini(52, 70, 14, 15.4, 7, 12, 'avvf-argento') + piedini(52, 146, 14, 15.4, 7, 12, 'avvf-argento'));
    o.push('<rect class="avvf-ceramica" x="40" y="80" width="244" height="68" rx="4"/>');
    o.push('<circle class="avvf-tacca" cx="52" cy="114" r="5"/>');
    o.push('<circle class="avvf-quarzo" cx="162" cy="114" r="22"/><rect class="avvf-die" x="152" y="104" width="20" height="20"/>');
    o.push('<g transform="rotate(-4 168 114)"><rect class="avvf-etichetta" x="120" y="96" width="96" height="36" rx="2"/>' +
      '<text class="avvf-t-chip" x="168" y="121">BIOS</text></g>');
    o.push('<text class="avvf-t-scheda" x="162" y="186">EPROM del BIOS</text>');

    // orologio CMOS (DIP-24) e batteria cilindrica
    o.push(piedini(42, 214, 9, 11, 5, 9, 'avvf-argento') + piedini(42, 262, 9, 11, 5, 9, 'avvf-argento'));
    o.push('<rect class="avvf-chip" x="34" y="221" width="110" height="43" rx="3"/><circle class="avvf-tacca" cx="44" cy="242" r="4"/>');
    o.push('<text class="avvf-t-scheda" x="89" y="300">Orologio</text><text class="avvf-t-scheda" x="89" y="327">CMOS</text>');
    o.push('<rect class="avvf-argento" x="186" y="244" width="6" height="22"/><rect class="avvf-argento" x="276" y="244" width="6" height="22"/>');
    o.push('<rect class="avvf-batteria" x="178" y="214" width="112" height="44" rx="20"/>' +
      '<rect class="avvf-riflesso" x="190" y="220" width="88" height="7" rx="3"/>' +
      '<rect class="avvf-anello" x="268" y="214" width="8" height="44"/>' +
      '<text class="avvf-t-batt" x="226" y="244">3,6 V</text>');
    o.push('<text class="avvf-t-scheda" x="234" y="327">Batteria</text>');
    // macchia di liquido (le vecchie batterie al nichel-cadmio perdevano)
    o.push('<path class="avvf-macchia" d="M200 268 C188 282 206 296 222 288 C236 300 256 288 246 276 Z"/>');

    // oggi: flash SPI SOIC-8, con lente d'ingrandimento
    o.push(piedini(359, 92, 4, 9, 4, 7, 'avvf-argento') + piedini(359, 125, 4, 9, 4, 7, 'avvf-argento'));
    o.push('<rect class="avvf-chip" x="354" y="98" width="40" height="28" rx="2"/><circle class="avvf-tacca" cx="360" cy="104" r="2.5"/>');
    o.push('<path class="avvf-lente-filo" d="M396 112 L432 112"/>');
    o.push('<circle class="avvf-lente" cx="488" cy="112" r="54"/>');
    o.push(piedini(456, 66, 4, 18, 9, 16, 'avvf-argento') + piedini(456, 142, 4, 18, 9, 16, 'avvf-argento'));
    o.push('<rect class="avvf-chip" x="448" y="80" width="80" height="64" rx="3"/><circle class="avvf-tacca" cx="460" cy="92" r="5"/>');
    o.push('<text class="avvf-t-chip chiaro" x="488" y="120">SPI</text>');
    o.push('<text class="avvf-t-scheda" x="488" y="194">Flash SPI</text>');

    // pila a bottone nel portapila
    o.push('<circle class="avvf-portapila" cx="410" cy="262" r="48"/>');
    o.push('<circle class="avvf-pila" cx="410" cy="262" r="40"/><circle class="avvf-pila-in" cx="410" cy="262" r="31"/>');
    o.push('<path class="avvf-molla" d="M372 254 H448 V270 H372 Z"/>');
    o.push('<text class="avvf-t-pila" x="410" y="245">+</text>');
    o.push('<text class="avvf-t-scheda" x="410" y="342">Pila CR2032</text>');

    // ponticello CLR CMOS
    o.push('<rect class="avvf-chip" x="532" y="250" width="72" height="24" rx="2"/>');
    o.push('<rect class="avvf-oro" x="541" y="256" width="6" height="12"/><rect class="avvf-oro" x="565" y="256" width="6" height="12"/><rect class="avvf-oro" x="589" y="256" width="6" height="12"/>');
    o.push('<rect class="avvf-cappuccio" x="534" y="246" width="44" height="32" rx="4"/><rect class="avvf-riflesso" x="539" y="250" width="34" height="5" rx="2"/>');
    o.push('<text class="avvf-t-scheda" x="562" y="342">Ponticello</text>');
    o.push('</svg>');
    return o.join('');
  }

  /* ======================= laboratorio ======================= */

  function creaLab(el, ctx) {
    const h = ctx.h;
    const ridotto = () => ctx.ridotto();
    const esa = M.esa;
    const st = { modo: 'bios', scen: 'ibm', i: -1, acceso: false, auto: false, pausa: false, finito: false, suono: false, attivo: false };
    let corsa = null;      // fase in esecuzione: { fase, ev, t, durata, restanti }
    let pausaAuto = 0;     // millisecondi prima della fase successiva, in modalità automatica
    let spegnimento = null;
    let audio = null;
    let rumore = null;

    const scenario = () => M.SCENARI[st.scen];

    /* ----- comandi in alto: epoca e scenario ----- */

    const segModo = h('div', { class: 'lab-seg', role: 'group', 'aria-label': 'Epoca' },
      Object.keys(M.MODI).map((id) => h('button', { type: 'button', 'data-modo': id, 'aria-pressed': String(id === st.modo), onclick: () => scegliModo(id) }, M.MODI[id].etichetta)));
    const segScen = h('div', { class: 'lab-seg avv-seg-scen', role: 'group', 'aria-label': 'Scenario' });
    const comandiAlti = h('div', { class: 'avv-alto' },
      h('div', { class: 'avv-gruppo' }, h('span', { class: 'avv-etichetta', 'aria-hidden': 'true' }, 'Epoca'), segModo),
      h('div', { class: 'avv-gruppo' }, h('span', { class: 'avv-etichetta', 'aria-hidden': 'true' }, 'Scenario'), segScen));

    /* ----- il monitor ----- */

    const testo = h('pre', { class: 'avv-testo' });
    const tastiBasic = h('div', { class: 'avv-tasti', 'aria-hidden': 'true' }, M.SCHERMI.tastiBasic);
    const logo = h('div', { class: 'avv-logo', 'aria-hidden': 'true' },
      ctx.svgDaTesto('<svg viewBox="0 0 120 120" class="avv-logo-svg"><path class="avv-logo-a" d="M60 10 L103 35 V85 L60 110 L17 85 V35 Z"/><path class="avv-logo-b" d="M44 46 H76 M44 60 H76 M44 74 H64"/></svg>'),
      h('span', { class: 'avv-rotella' }, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => h('i', { style: '--i:' + i }))));
    const desk = h('div', { class: 'avv-desk', 'aria-hidden': 'true' },
      h('span', { class: 'avv-desk-icone' }, h('i'), h('i'), h('i')),
      h('span', { class: 'avv-desk-fin' }, h('b')),
      h('span', { class: 'avv-desk-barra' }, h('i'), h('i'), h('i'), h('i')));
    const avviso = h('div', { class: 'avv-avviso' },
      h('strong', null, M.SCHERMI.secureBoot[0]),
      h('span', null, M.SCHERMI.secureBoot[1]), h('span', null, M.SCHERMI.secureBoot[2]),
      h('em', { 'aria-hidden': 'true' }, 'OK'));
    const raster = h('div', { class: 'avv-raster' }, testo, tastiBasic, logo, desk, avviso);
    const fascio = h('div', { class: 'avv-fascio', 'aria-hidden': 'true' });
    const bagliore = h('div', { class: 'avv-bagliore', 'aria-hidden': 'true' });
    const vetro = h('div', { class: 'avv-vetro' }, raster,
      h('div', { class: 'avv-righe', 'aria-hidden': 'true' }), h('div', { class: 'avv-banda', 'aria-hidden': 'true' }),
      bagliore, fascio, h('div', { class: 'avv-riflesso', 'aria-hidden': 'true' }));
    const monitor = h('div', { class: 'avv-monitor' },
      h('div', { class: 'avv-cornice' }, vetro),
      h('div', { class: 'avv-mento', 'aria-hidden': 'true' }, h('span', { class: 'avv-marchio' }), h('span', { class: 'avv-griglia' }), h('span', { class: 'avv-led-mon' })));

    /* ----- l'unità di sistema con il tasto di accensione ----- */

    const cassa = ctx.svgDaTesto(svgCassa());
    const tasto = h('button', { type: 'button', class: 'avv-tasto', 'aria-label': 'Accendi il PC', onclick: () => { if (st.acceso) spegni(false); else accendi(true); } },
      ctx.svgDaTesto('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.6a8 8 0 1 0 11.4 0"/></svg>'));
    const unita = h('div', { class: 'avv-unita' }, cassa, tasto);
    const pc = h('div', { class: 'avv-pc' }, monitor, unita);

    /* ----- pannello laterale: letture e vista della fase ----- */

    const kv = {};
    const letture = h('dl', { class: 'lab-kv avv-kv' },
      [['fase', 'Fase'], ['dove', 'Dove'], ['ind', 'Indirizzo']].map((c) => {
        kv[c[0]] = h('dd', null, '—');
        return h('div', null, h('dt', null, c[1]), kv[c[0]]);
      }));
    const vista = h('div', { class: 'avv-vista-box' });
    const lato = h('div', { class: 'avv-lato' }, letture, vista);

    /* ----- linea delle fasi, pulsanti, spiegazione ----- */

    const linea = h('ol', { class: 'avv-fasi', 'aria-label': 'Fasi dell\'avvio' });
    const btnAccendi = h('button', { type: 'button', class: 'lab-btn primary avv-btn-acc', onclick: primario });
    const btnPasso = h('button', { type: 'button', class: 'lab-btn', onclick: passo }, 'Passo ›');
    const btnRicomincia = h('button', { type: 'button', class: 'lab-btn', onclick: () => spegni(false) }, 'Ricomincia');
    const btnSuono = h('button', { type: 'button', class: 'lab-btn avv-btn-suono', 'aria-pressed': 'false', onclick: cambiaSuono }, 'Suono: spento');
    const controlli = h('div', { class: 'lab-controls avv-controlli' }, btnAccendi, btnPasso, btnRicomincia, btnSuono);
    const nota = h('p', { class: 'lab-note avv-nota', 'aria-live': 'polite' });

    const box = h('div', { class: 'avv modo-bios scen-ibm' },
      comandiAlti,
      h('div', { class: 'avv-corpo' }, h('div', { class: 'avv-scena' }, pc), lato),
      linea, controlli, nota);
    el.append(box);

    /* ======================= suono (facoltativo, spento all'inizio) ======================= */

    function contestoAudio() {
      if (!st.suono) return null;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audio) { try { audio = new AC(); } catch (e) { return null; } }
      if (audio.state === 'suspended') audio.resume();
      return audio;
    }

    // L'altoparlante del PC: onda quadra a circa 896 Hz (timer 8253 con divisore 533h). durate in secondi.
    function bip(durate) {
      const a = contestoAudio();
      if (!a) return;
      let t = a.currentTime + 0.03;
      durate.forEach((d) => {
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.type = 'square';
        osc.frequency.value = 896;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
        g.gain.setValueAtTime(0.05, t + d - 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(g); g.connect(a.destination);
        osc.start(t); osc.stop(t + d + 0.03);
        t += d + 0.14;
      });
    }

    // Scatti della testina del disco: brevi colpi di rumore filtrato.
    function clic(n, ritmo) {
      const a = contestoAudio();
      if (!a) return;
      if (!rumore) {
        rumore = a.createBuffer(1, Math.floor(a.sampleRate * 0.025), a.sampleRate);
        const d = rumore.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      }
      let t = a.currentTime + 0.02;
      for (let i = 0; i < n; i++) {
        const src = a.createBufferSource();
        const f = a.createBiquadFilter();
        const g = a.createGain();
        src.buffer = rumore;
        f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 1200; f.Q.value = 2.5;
        g.gain.value = 0.35;
        src.connect(f); f.connect(g); g.connect(a.destination);
        src.start(t);
        t += (ritmo || 0.07) * (0.7 + Math.random() * 0.6);
      }
    }

    function cambiaSuono() {
      st.suono = !st.suono;
      btnSuono.setAttribute('aria-pressed', String(st.suono));
      btnSuono.textContent = st.suono ? 'Suono: acceso' : 'Suono: spento';
      if (st.suono) bip([0.06]);
    }

    /* ======================= schermo ======================= */

    const schermo = { righe: [], cursore: false };

    function disegnaSchermo() {
      testo.replaceChildren(document.createTextNode(schermo.righe.join('\n')));
      if (schermo.cursore) testo.append(h('span', { class: 'avv-cursore', 'aria-hidden': 'true' }, '_'));
      testo.scrollTop = testo.scrollHeight;
    }
    function scrivi(righe) { schermo.righe = righe.slice(); disegnaSchermo(); }
    function aggiungi(riga) { schermo.righe.push(riga); disegnaSchermo(); }
    function ultima(riga) { if (!schermo.righe.length) schermo.righe.push(''); schermo.righe[schermo.righe.length - 1] = riga; disegnaSchermo(); }
    function cursore(on) { schermo.cursore = on; disegnaSchermo(); }
    function mostra(cosa, on) { box.classList.toggle('mostra-' + cosa, !!on); }

    // Accensione del tubo catodico: un punto, poi una riga che si allarga, poi tutto il quadro. k da 0 a 1.
    function crtFase(k) {
      const c = ctx.curve.smooth;
      if (k < 0.16) {
        const a = k / 0.16;
        fascio.style.opacity = String(a);
        fascio.style.transform = 'scale(0.012, ' + (0.6 + a * 0.4) + ')';
        raster.style.transform = 'scaleY(0.004)';
        raster.style.opacity = '0';
        bagliore.style.opacity = '0';
      } else if (k < 0.5) {
        const a = c((k - 0.16) / 0.34);
        fascio.style.opacity = '1';
        fascio.style.transform = 'scale(' + ctx.lerp(0.012, 1, a) + ', 1)';
        bagliore.style.opacity = String(0.25 * a);
      } else {
        const a = c((k - 0.5) / 0.5);
        fascio.style.opacity = String(1 - a);
        fascio.style.transform = 'scale(1, ' + (1 + a * 6) + ')';
        raster.style.transform = 'scaleY(' + ctx.lerp(0.004, 1, a) + ')';
        raster.style.opacity = String(a);
        bagliore.style.opacity = String(ctx.lerp(0.9, 0.32, a));
      }
      if (k >= 1) { fascio.style.opacity = '0'; raster.style.transform = ''; raster.style.opacity = ''; box.classList.add('schermo-on'); }
    }

    // Monitor LCD di oggi: la retroilluminazione si accende piano.
    function lcdFase(k) {
      bagliore.style.opacity = String(0.6 * k);
      raster.style.opacity = String(k);
      raster.style.transform = '';
      if (k >= 1) { raster.style.opacity = ''; box.classList.add('schermo-on'); }
    }

    function schermoSpento() {
      if (spegnimento) { spegnimento.cancel(); spegnimento = null; }
      box.classList.remove('schermo-on');
      raster.style.transform = 'scaleY(0.004)';
      raster.style.opacity = '0';
      fascio.style.opacity = '0';
      bagliore.style.opacity = '0';
      scrivi([]); cursore(false);
      ['logo', 'rotella', 'desk', 'avviso', 'tasti'].forEach((c) => mostra(c, false));
    }

    // Spegnimento: il quadro collassa in una riga, poi in un punto che si spegne lentamente.
    function crtSpegni(immediato) {
      if (immediato || ridotto() || !box.classList.contains('schermo-on')) { schermoSpento(); return; }
      const lcd = st.modo === 'uefi';
      if (spegnimento) spegnimento.cancel();
      spegnimento = ctx.tween({
        from: 0, to: 1, dur: lcd ? ctx.motion.dur.normal : ctx.motion.dur.slow, ease: 'sharp',
        update: (v) => {
          if (lcd) { raster.style.opacity = String(1 - v); bagliore.style.opacity = String(0.6 * (1 - v)); return; }
          if (v < 0.45) {
            const a = v / 0.45;
            raster.style.transform = 'scaleY(' + ctx.lerp(1, 0.004, a) + ')';
            bagliore.style.opacity = String(0.32 + 0.4 * a);
          } else {
            const a = (v - 0.45) / 0.55;
            raster.style.opacity = '0';
            fascio.style.opacity = String(1 - a * 0.85);
            fascio.style.transform = 'scale(' + ctx.lerp(1, 0.01, Math.min(1, a * 1.6)) + ', 1)';
            bagliore.style.opacity = String(0.72 * (1 - a));
          }
        },
        done: () => { spegnimento = null; schermoSpento(); },
      });
    }

    /* ======================= unità di sistema: LED e tasto ======================= */

    function led(nome, on) { box.classList.toggle('led-' + nome, !!on); }
    function premi() {
      tasto.classList.remove('premuto');
      void tasto.offsetWidth;
      tasto.classList.add('premuto');
    }

    /* ======================= viste del pannello ======================= */

    function riquadro(titolo, figli, cls) {
      return h('div', { class: 'avv-vista' + (cls ? ' ' + cls : '') }, h('p', { class: 'avv-vista-tit' }, titolo), figli);
    }

    function vistaAttesa() {
      const sc = scenario();
      return { el: riquadro('Pronto ad accendere', [
        h('p', { class: 'avv-macchina' }, sc.macchina),
        h('p', { class: 'avv-suggerimento' }, 'Premi il tasto di accensione sull\'unità di sistema, oppure «Accendi». Con «Passo ›» vai avanti una fase alla volta.'),
        h('ol', { class: 'avv-anteprima' }, sc.fasi.map((f) => h('li', null, f.nome))),
      ]) };
    }

    // Oscillogramma delle tensioni all'accensione: le righe si disegnano da sinistra a destra.
    function vistaCorrente(oggi) {
      const tracce = oggi ? [
        ['5 V standby', 't1', [[0, 1], [1, 1]]],
        ['PS_ON#', 't3', [[0, 1], [0.08, 1], [0.1, 0], [1, 0]]],
        ['+12 V', 't1', [[0, 0], [0.14, 0], [0.3, 1], [1, 1]]],
        ['PWR_OK', 't2', [[0, 0], [0.6, 0], [0.62, 1], [1, 1]]],
        ['Reset CPU', 't4', [[0, 1], [0.7, 1], [0.72, 0], [1, 0]]],
      ] : [
        ['+5 V', 't1', [[0, 0], [0.1, 0], [0.24, 1], [1, 1]]],
        ['+12 V', 't1', [[0, 0], [0.1, 0], [0.28, 1], [1, 1]]],
        ['Power Good', 't2', [[0, 0], [0.6, 0], [0.62, 1], [1, 1]]],
        ['Reset CPU', 't4', [[0, 1], [0.68, 1], [0.7, 0], [1, 0]]],
      ];
      const x0 = 98, x1 = 292, rh = 27, top = 6;
      const H = top + tracce.length * rh + 24;
      const idc = ctx.uid('avv-clip');
      let svg = '<svg viewBox="0 0 300 ' + H + '" class="avv-osc" role="img" aria-label="Oscillogramma: le tensioni salgono, poi il segnale ' + (oggi ? 'PWR_OK' : 'Power Good') + ' passa ad alto e il processore esce dal reset.">' +
        '<defs><clipPath id="' + idc + '"><rect class="avv-osc-clip" x="0" y="0" width="' + x0 + '" height="' + H + '"/></clipPath></defs>';
      tracce.forEach((tr, r) => {
        const yb = top + r * rh + 21, ya = yb - 14;
        svg += '<line class="avv-osc-base" x1="' + x0 + '" x2="' + x1 + '" y1="' + yb + '" y2="' + yb + '"/>' +
          '<text class="avv-osc-et" x="4" y="' + (yb - 3) + '">' + tr[0] + '</text>';
      });
      svg += '<g clip-path="url(#' + idc + ')">';
      tracce.forEach((tr, r) => {
        const yb = top + r * rh + 21, ya = yb - 14;
        const d = tr[2].map((p, i) => (i ? 'L' : 'M') + (x0 + p[0] * (x1 - x0)).toFixed(1) + ' ' + (p[1] ? ya : yb)).join(' ');
        svg += '<path class="avv-osc-tr ' + tr[1] + '" d="' + d + '"/>';
      });
      svg += '</g><line class="avv-osc-scan" x1="' + x0 + '" x2="' + x0 + '" y1="' + top + '" y2="' + (H - 22) + '"/>' +
        '<text class="avv-osc-asse" x="' + x0 + '" y="' + (H - 6) + '">0</text>' +
        '<text class="avv-osc-asse fine" x="' + x1 + '" y="' + (H - 6) + '">0,5 s</text></svg>';
      const g = ctx.svgDaTesto(svg);
      const clip = g.querySelector('.avv-osc-clip');
      const scan = g.querySelector('.avv-osc-scan');
      const esito = h('p', { class: 'avv-esito' }, '');
      return {
        el: riquadro(oggi ? 'Il tasto, PS_ON e PWR_OK' : 'Le tensioni e il Power Good', [g, esito]),
        rivela(k) {
          const x = x0 + k * (x1 - x0);
          clip.setAttribute('width', String(x + 2));
          scan.setAttribute('x1', String(x)); scan.setAttribute('x2', String(x));
          scan.style.opacity = k >= 1 ? '0' : '1';
          if (k >= 1) esito.textContent = oggi ? 'PWR_OK è alto: tensioni stabili, il processore può partire.' : 'Power Good è alto: tensioni stabili, l\'8088 esce dal reset.';
        },
      };
    }

    // Lo spazio degli indirizzi, con la prima istruzione in cima.
    function vistaIndirizzi(tipo) {
      const seg = tipo === '1M' ? [
        { hh: 42, nome: 'RAM (fino a 640 KB)', cls: 'ram', da: '00000h' },
        { hh: 14, nome: '…', cls: 'vuoto', da: '' },
        { hh: 22, nome: 'Memoria video', cls: 'video', da: 'A0000h' },
        { hh: 22, nome: 'ROM delle schede', cls: 'opz', da: 'C0000h' },
        { hh: 26, nome: 'BASIC in ROM (32 KB)', cls: 'rom2', da: 'F6000h' },
        { hh: 30, nome: 'BIOS in ROM (8 KB)', cls: 'rom', da: 'FE000h' },
      ] : [
        { hh: 52, nome: 'RAM', cls: 'ram', da: '00000000h' },
        { hh: 14, nome: '…', cls: 'vuoto', da: '' },
        { hh: 26, nome: 'Periferiche PCI', cls: 'opz', da: '' },
        { hh: 34, nome: tipo === 'uefi' ? 'Flash del firmware' : 'Copia della ROM del BIOS', cls: 'rom', da: tipo === 'uefi' ? 'FF000000h' : 'FFFF0000h' },
      ];
      const fine = tipo === '1M' ? 'FFFFFh' : 'FFFFFFFFh';
      const primo = tipo === '1M' ? 'FFFF0h' : 'FFFFFFF0h';
      const tot = seg.reduce((t, x) => t + x.hh, 0);
      const W = 300, H = tot + 30;
      let y = H - 8;
      let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="avv-mappa" role="img" aria-label="Spazio degli indirizzi: in basso la RAM, in cima la ROM; la prima istruzione è all\'indirizzo ' + primo + '.">';
      seg.forEach((sg) => {
        y -= sg.hh;
        svg += '<rect class="avv-m-' + sg.cls + '" x="16" y="' + y + '" width="58" height="' + sg.hh + '"/>' +
          '<text class="avv-m-nome" x="86" y="' + (y + sg.hh / 2 + 4) + '">' + sg.nome + '</text>';
      });
      svg += '<text class="avv-m-cima" x="86" y="14">' + fine + '</text>' +
        '<g class="avv-m-freccia"><path d="M6 22 H14"/><path d="M10 18 L15 22 L10 26 Z"/></g>' +
        '<rect class="avv-m-primo" x="16" y="20" width="58" height="4"/></svg>';
      const g = ctx.svgDaTesto(svg);
      const reg = h('p', { class: 'avv-reg lab-mono' }, '');
      return {
        el: riquadro('Dove parte il processore', [g, reg]),
        freccia: g.querySelector('.avv-m-freccia'),
        primo: g.querySelector('.avv-m-primo'),
        reg(t) { reg.textContent = t; },
      };
    }

    function vistaPost(lista) {
      const voci = lista.map((p) => h('li', { class: 'avv-post-voce' },
        h('span', { class: 'avv-post-ico', 'aria-hidden': 'true' }),
        h('span', { class: 'avv-post-nome' }, p.nome),
        h('span', { class: 'avv-post-det' }, p.dettaglio),
        h('span', { class: 'spc-sr-only avv-post-sr' }, 'in attesa')));
      const ESITI = { corso: ['', 'in corso'], ok: ['✓', 'superato'], ko: ['✗', 'guasto'] };
      return {
        el: riquadro('Power-on self-test', h('ul', { class: 'avv-post' }, voci)),
        segna(i, stato) {
          const li = voci[i];
          li.dataset.stato = stato;
          li.querySelector('.avv-post-ico').textContent = ESITI[stato][0];
          li.querySelector('.avv-post-sr').textContent = ESITI[stato][1];
        },
      };
    }

    function vistaBip(chiave) {
      const righe = M.BIP_IBM.map((b) => h('li', { class: b.bip === chiave ? 'scelto' : '' }, h('span', { class: 'avv-bip-cod' }, b.bip), h('span', null, b.significato)));
      const onde = ctx.svgDaTesto('<svg viewBox="0 0 120 64" class="avv-cassa-sp" aria-hidden="true"><path class="avv-sp" d="M14 24 H30 L48 10 V54 L30 40 H14 Z"/><path class="avv-onda o1" d="M60 22 Q68 32 60 42"/><path class="avv-onda o2" d="M72 14 Q86 32 72 50"/><path class="avv-onda o3" d="M84 6 Q104 32 84 58"/></svg>');
      const schema = h('p', { class: 'avv-bip-schema', 'aria-hidden': 'true' }, chiave.split(' e ').map((p) => {
        const n = parseInt(p, 10) || 1;
        const lungo = /lung/.test(p);
        return Array.from({ length: n }, () => h('i', { class: lungo ? 'lungo' : '' }));
      }));
      const v = riquadro('Il codice dei bip (IBM PC)', [h('div', { class: 'avv-bip-testa' }, onde, schema), h('ul', { class: 'avv-bip-lista' }, righe)], 'avv-vista-bip');
      return { el: v, suona() { v.classList.remove('suona'); void v.offsetWidth; v.classList.add('suona'); } };
    }

    // Il settore da 512 byte: mappa dei byte, ingrandimento della fine, firma e (per l'MBR) la tabella decodificata.
    function vistaSettore(mbr) {
      const s = mbr ? M.settoreMbr() : M.settoreDischetto();
      const b = s.byte;
      const celle = [];
      const mappa = h('div', { class: 'avv-mappa-byte', role: 'img', 'aria-label': mbr
        ? 'Mappa dei 512 byte dell\'MBR: codice e messaggi fino al byte 445, tabella delle partizioni dal 446 al 509, firma 55h AAh nei byte 510 e 511.'
        : 'Mappa dei 512 byte del settore di avvio del dischetto: codice nella prima parte, poi zeri; negli ultimi due byte nessuna firma.' });
      for (let i = 0; i < 512; i++) { const c = h('i', { class: 'z-' + s.zone[i] }); celle.push(c); mappa.append(c); }
      // tutti i 512 byte in esadecimale, in un riquadro che scorre (si vedono cinque righe da 16 byte)
      const hx = [];
      const righe = [];
      const zoom = h('div', { class: 'avv-hex lab-mono', role: 'region', tabindex: '0', 'aria-label': 'I 512 byte del settore in esadecimale, 16 per riga: scorri per leggerli tutti' });
      for (let r = 0; r < 0x200; r += 16) {
        const meta = (da) => h('span', { class: 'avv-hex-meta' }, Array.from({ length: 8 }, (_, k) => {
          const i = da + k;
          const c = h('span', { class: 'avv-hx z-' + s.zone[i] }, esa(b[i]));
          hx[i] = c;
          return c;
        }));
        const riga = h('div', { class: 'avv-hex-riga' },
          h('span', { class: 'avv-hex-off' }, esa(r, 3)), meta(r),
          h('span', { class: 'avv-hex-off seconda' }, esa(r + 8, 3)), meta(r + 8));
        righe.push(riga);
        zoom.append(riga);
      }
      // porta la riga r in vista dentro il riquadro (senza far scorrere la pagina)
      let rigaVista = -1;
      function vediRiga(r, inCima) {
        if (r === rigaVista) return;
        rigaVista = r;
        const el = righe[r];
        zoom.scrollTop = inCima ? el.offsetTop - 8 : el.offsetTop + el.offsetHeight - zoom.clientHeight + 8;
      }
      // tocco sulla mappa: salta a quei byte
      let puntata = null;
      mappa.addEventListener('click', (e) => {
        const i = celle.indexOf(e.target);
        if (i < 0) return;
        const r = i >> 4;
        if (puntata) puntata.classList.remove('punta');
        puntata = righe[r];
        puntata.classList.add('punta');
        rigaVista = -1;
        vediRiga(r, true);
      });
      const legenda = h('ul', { class: 'avv-legenda', 'aria-hidden': 'true' },
        (mbr ? [['codice', 'codice'], ['testo', 'messaggi'], ['vuoto', 'zeri'], ['tabella', 'partizioni'], ['firma', 'firma 55 AA']]
          : [['codice', 'codice'], ['vuoto', 'zeri'], ['nofirma', 'byte 510–511']]).map((z) => h('li', null, h('i', { class: 'z-' + z[0] }), z[1])));
      const esito = h('p', { class: 'avv-esito' }, '');
      const dec = h('div', { class: 'avv-dec' });
      let mostrati = 0;
      const testa = mbr ? 'Disco C: · cilindro 0, testina 0, settore 1 → 0000:7C00' : 'Dischetto A: · traccia 0, testina 0, settore 1 → 0000:7C00';
      const aiuto = h('p', { class: 'avv-suggerimento avv-hex-aiuto' }, 'Scorri l\'esadecimale, o tocca la mappa per saltare a quei byte.');
      return {
        el: riquadro('Il settore di avvio: 512 byte', [h('p', { class: 'avv-sett-testa lab-mono' }, testa), mappa, legenda, zoom, aiuto, esito, dec]),
        rivela(k) {
          const n = Math.round(k * 512);
          for (let i = mostrati; i < n; i++) { celle[i].classList.add('letto'); hx[i].classList.add('letto'); }
          mostrati = Math.max(mostrati, n);
          if (n > 0) vediRiga(Math.max(4, (n - 1) >> 4), false);
        },
        firma() {
          vediRiga(31, false);
          if (mbr) {
            [510, 511].forEach((i) => { celle[i].classList.add('evidenzia'); hx[i].classList.add('evidenzia'); });
            esito.innerHTML = '<strong class="ok">✓ Firma 55h AAh presente</strong> nei byte 510 e 511: il disco è avviabile.';
          } else {
            [510, 511].forEach((i) => hx[i].classList.add('neutro'));
            esito.innerHTML = 'Byte 510 e 511: <strong>00 00</strong>, nessuna firma. Il BIOS del 1981 non la cerca: carica il settore e ci salta.';
          }
        },
        decodifica() {
          if (!mbr) return;
          const v = M.leggiVoce(b, 0);
          const g = M.GEOMETRIE.disco;
          const mb = v.settori * 512 / 1048576;
          [446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461].forEach((i) => hx[i] && hx[i].classList.add('voce1'));
          dec.replaceChildren(
            h('p', { class: 'avv-dec-tit' }, 'Voce 1 della tabella (byte 446–461)'),
            h('dl', { class: 'lab-kv' }, [
              ['Stato', esa(v.stato) + 'h · attiva'],
              ['Tipo', esa(v.tipo) + 'h · FAT16'],
              ['Inizio C/H/S', v.inizio.c + '/' + v.inizio.h + '/' + v.inizio.s],
              ['Primo settore', ctx.formato(v.lba)],
              ['Settori', ctx.formato(v.settori)],
              ['Dimensione', ctx.formato(mb, 1) + ' MB'],
            ].map((c) => h('div', null, h('dt', null, c[0]), h('dd', null, c[1])))),
            h('p', { class: 'avv-formula lab-mono' }, 'LBA = (C × ' + g.testine + ' + H) × ' + g.settori + ' + (S − 1) = (0 × 4 + 1) × 17 + 0 = ' + M.chsInLba(v.inizio.c, v.inizio.h, v.inizio.s, g)));
        },
      };
    }

    // Elenco di passi che si accendono uno dopo l'altro, con un registro facoltativo.
    function vistaCatena(titolo, passi, registro) {
      const voci = passi.map((p) => h('li', { html: p }));
      const reg = registro != null ? h('p', { class: 'avv-reg lab-mono' }, registro) : null;
      return {
        el: riquadro(titolo, [reg, h('ol', { class: 'avv-catena' }, voci)]),
        accendi(i) { voci.forEach((v, k) => { v.classList.toggle('fatto', k < i); v.classList.toggle('ora', k === i); }); },
        tutto() { voci.forEach((v) => { v.classList.add('fatto'); v.classList.remove('ora'); }); },
        reg(t) { if (reg) reg.textContent = t; },
      };
    }

    function vistaErrore() {
      const bipV = vistaBip('2 brevi');
      const codici = Object.keys(M.ERRORI_IBM).map((c) => h('li', { class: c === '201' ? 'scelto' : '' }, h('span', { class: 'avv-bip-cod lab-mono' }, c), h('span', null, M.ERRORI_IBM[c])));
      bipV.el.append(h('p', { class: 'avv-vista-tit avv-sub' }, 'Codici sullo schermo'), h('ul', { class: 'avv-bip-lista' }, codici));
      return bipV;
    }

    function vistaSec() {
      const v = vistaIndirizzi('uefi');
      const blocchi = Array.from({ length: 8 }, () => h('i'));
      const car = h('div', { class: 'avv-car' }, h('span', { class: 'avv-car-et' }, 'Cache usata come RAM'), h('span', { class: 'avv-car-bl', 'aria-hidden': 'true' }, blocchi));
      v.el.append(car);
      v.cache = (k) => { const n = Math.round(k * blocchi.length); blocchi.forEach((b, i) => b.classList.toggle('on', i < n)); };
      return v;
    }

    function vistaPei() {
      const barra = () => h('span', { class: 'avv-barra' }, h('i'));
      const a = barra(), b = barra();
      const spd = h('p', { class: 'avv-spd' }, 'Lettura dei dati dei moduli (SPD) via SMBus…');
      const fine = h('p', { class: 'avv-esito' }, '');
      const v = riquadro('Addestramento della memoria', [spd,
        h('div', { class: 'avv-dimm' }, h('span', { class: 'avv-dimm-et' }, 'Modulo A'), a),
        h('div', { class: 'avv-dimm' }, h('span', { class: 'avv-dimm-et' }, 'Modulo B'), b), fine]);
      return {
        el: v,
        spd() { spd.innerHTML = '<strong class="ok">✓</strong> SPD letto via SMBus: 2 moduli DDR5 da 16 GB'; },
        allena(k) {
          a.firstChild.style.transform = 'scaleX(' + Math.min(1, k * 1.15) + ')';
          b.firstChild.style.transform = 'scaleX(' + k + ')';
        },
        fine() { fine.innerHTML = '<strong class="ok">✓ Memoria pronta:</strong> 32 GB. Da qui il firmware lavora nella RAM.'; },
      };
    }

    function vistaDxe() {
      const nomi = ['Bus PCI Express', 'Controller USB', 'Disco NVMe', 'Scheda di rete', 'Video (GOP): compare il logo', 'File system FAT'];
      const voci = nomi.map((n) => h('li', null, n));
      const conta = h('strong', { class: 'avv-conta lab-mono' }, '0');
      return {
        el: riquadro('Driver caricati', [h('p', { class: 'avv-conta-riga' }, conta, ' driver in memoria'), h('ul', { class: 'avv-driver' }, voci)]),
        conta(k) { conta.textContent = String(Math.round(k * 214)); },
        voce(i) { voci[i].classList.add('fatto'); },
      };
    }

    function vistaBds() {
      const voci = M.VOCI_AVVIO.map((v) => h('li', null, h('span', { class: 'lab-mono avv-boot-id' }, v.id), h('span', null, v.nome)));
      const disco = h('div', { class: 'avv-gpt' }, M.DISCO_GPT.map((p, i) => h('span', { class: 'avv-gpt-p p' + i }, h('b', null, p.sigla), h('small', null, p.dim), h('small', null, p.fs))));
      const percorso = h('p', { class: 'avv-percorso lab-mono' }, '');
      return {
        el: riquadro('Il gestore di avvio', [
          h('p', { class: 'avv-reg lab-mono' }, 'BootOrder = 0001, 0002, 0003'),
          h('ul', { class: 'avv-boot' }, voci),
          h('p', { class: 'avv-vista-tit avv-sub' }, 'Disco GPT'), disco, percorso]),
        scegli(i) { voci.forEach((v, k) => v.classList.toggle('scelto', k === i)); },
        disco() { disco.classList.add('on'); },
        esp() { disco.classList.add('esp'); },
        percorso(k) { const p = M.VOCI_AVVIO[0].file; percorso.textContent = p.slice(0, Math.round(k * p.length)); },
      };
    }

    function vistaFirma(ok) {
      const byte = M.caricatore(!ok);
      const firmata = M.FIRMA_CARICATORE;
      const vera = M.impronta(byte);
      const celle = byte.map((x, i) => h('span', { class: 'avv-hx letto' + (!ok && i === M.BYTE_MANOMESSO ? ' manomesso' : '') }, esa(x)));
      const righe = [0, 16].map((r) => h('div', { class: 'avv-hex-riga' },
        h('span', { class: 'avv-hex-off' }, esa(r, 3)), h('span', { class: 'avv-hex-meta' }, celle.slice(r, r + 8)),
        h('span', { class: 'avv-hex-off seconda' }, esa(r + 8, 3)), h('span', { class: 'avv-hex-meta' }, celle.slice(r + 8, r + 16))));
      const calc = h('dd', { class: 'lab-mono' }, '········');
      const esito = h('p', { class: 'avv-timbro', 'aria-hidden': 'true' }, '');
      const frase = h('p', { class: 'avv-esito' }, '');
      const v = riquadro('Secure Boot: verifica della firma', [
        h('p', { class: 'avv-percorso lab-mono', html: M.VOCI_AVVIO[0].file.replace(/\\/g, '\\<wbr>') }),
        h('div', { class: 'avv-hex lab-mono avv-hex-efi' }, righe),
        h('dl', { class: 'lab-kv avv-impronte' },
          h('div', null, h('dt', null, 'Impronta calcolata'), calc),
          h('div', null, h('dt', null, 'Impronta firmata'), h('dd', { class: 'lab-mono' }, esa(firmata, 8))),
          h('div', null, h('dt', null, 'Certificato'), h('dd', null, 'in db, non revocato'))),
        esito, frase], 'avv-vista-firma');
      return {
        el: v,
        calcola(k) {
          if (k >= 1) { calc.textContent = esa(vera, 8); return; }
          let t = '';
          for (let i = 0; i < 8; i++) t += i < Math.floor(k * 8) ? esa(vera, 8)[i] : '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
          calc.textContent = t;
        },
        confronta() {
          v.classList.add(ok ? 'ok' : 'ko');
          esito.textContent = ok ? '✓' : '✗';
          frase.innerHTML = ok ? '<strong class="ok">Firma valida:</strong> le impronte coincidono, il caricatore parte.'
            : '<strong class="ko">Firma non valida:</strong> il byte ' + M.BYTE_MANOMESSO + ' è stato cambiato, l\'impronta non coincide. Avvio bloccato.';
        },
      };
    }

    /* ======================= le scene: eventi nel tempo di ogni fase ======================= */

    // ev(t, fa, d): a t millisecondi chiama fa(1); con d > 0 chiama fa(k) per k da 0 a 1 durante d millisecondi.
    function ev(t, fa, d) { return { t: t, fa: fa, d: d || 0 }; }

    function scena(f) {
      const sc = st.scen;
      const ibm = sc.indexOf('ibm') === 0;
      const oggi = st.modo === 'uefi';
      switch (f.id) {
        case 'corrente': {
          const v = vistaCorrente(oggi);
          return { v: v, ev: [
            ev(0, () => { premi(); led('pwr', true); }),
            ev(60, (k) => v.rivela(k), 1100),
            oggi ? ev(250, (k) => lcdFase(k), 700) : ev(420, (k) => crtFase(k), 950),
          ] };
        }
        case 'reset': {
          const v = vistaIndirizzi(ibm ? '1M' : '4G');
          const r0 = ibm ? 'CS:IP = FFFF:0000 → indirizzo FFFF0h' : 'Indirizzo fisico FFFFFFF0h';
          const r1 = ibm ? 'JMP F000:E05B · CS:IP = F000:E05B' : 'JMP verso l\'inizio del BIOS';
          return { v: v, ev: [
            ev(0, () => v.reg(r0)),
            ev(100, (k) => { v.freccia.style.opacity = String(k); v.freccia.style.transform = 'translateX(' + ((1 - k) * -8) + 'px)'; }, 500),
            ev(700, () => { v.primo.classList.add('on'); v.reg(r1); kv.ind.textContent = 'F000:E05B'; }),
          ] };
        }
        case 'post': {
          const lista = scenario().post === 'compatibile' ? M.POST_COMPATIBILE : M.POST_IBM;
          const v = vistaPost(lista);
          const out = [];
          const guasto = sc === 'ibm-ram';
          const passo = guasto ? 420 : (lista.length > 8 ? 400 : 440);
          let t = 80;
          for (let i = 0; i < lista.length; i++) {
            const id = lista[i].id;
            const t0 = t;
            out.push(ev(t0, () => v.segna(i, 'corso')));
            if (guasto && id === 'ram') {
              out.push(ev(t0 + 700, () => v.segna(i, 'ko')));
              break;
            }
            if (id === 'ram' && !ibm) {
              // il compatibile conta la memoria sullo schermo
              out.push(ev(t0 + 50, (k) => contaMemoria(k), 1500));
              t += 1600;
            } else t += passo;
            out.push(ev(t - 60, () => v.segna(i, 'ok')));
            if (id === 'video') out.push(ev(t - 40, () => { if (ibm) cursore(true); else scrivi(testaCompatibile()); }));
            if (id === 'dischetti' || id === 'dischi') {
              out.push(ev(t0, (k, salta) => { led(ibm ? 'a' : 'hdd', true); if (!salta) clic(3, 0.09); }));
              out.push(ev(t - 70, () => led(ibm ? 'a' : 'hdd', false)));
            }
          }
          return { v: v, ev: out };
        }
        case 'bip': {
          const v = vistaBip('1 breve');
          return { v: v, ev: [ev(200, (k, salta) => { v.suona(); if (!salta) bip([0.14]); })] };
        }
        case 'settore': {
          if (sc === 'ibm-vuoto') {
            const v = vistaCatena('Unità A: vuota', [
              'Legge il settore 1 della traccia 0…',
              'Errore: nessun dischetto. Riprova',
              'Ancora niente: l\'unità è vuota',
              'Chiama l\'interruzione <strong>18h</strong>',
            ], 'CS:IP = F000:E6F2 (INT 19h)');
            const out = [];
            [0, 1, 2].forEach((n) => {
              out.push(ev(120 + n * 520, (k, salta) => { v.accendi(n); led('a', true); if (!salta) clic(2, 0.1); }));
              out.push(ev(120 + n * 520 + 330, () => led('a', false)));
            });
            out.push(ev(1700, () => { v.accendi(3); v.reg('INT 18h → F600:0000'); }));
            return { v: v, ev: out };
          }
          const mbr = sc === 'compatibile';
          const v = vistaSettore(mbr);
          const lettore = mbr ? 'hdd' : 'a';
          return { v: v, ev: [
            ev(0, (k, salta) => { led(lettore, true); if (!salta) clic(mbr ? 3 : 5, 0.08); }),
            ev(160, (k) => v.rivela(k), 1450),
            ev(1700, () => v.firma()),
            ev(mbr ? 2250 : 1900, () => { v.decodifica(); led(lettore, false); }),
          ] };
        }
        case 'salto': {
          if (sc === 'compatibile') {
            const v = vistaCatena('La catena di avvio', [
              'L\'MBR parte a <span class="lab-mono">0000:7C00</span>',
              'Si copia a <span class="lab-mono">0000:0600</span> per fare posto',
              'Trova la voce 1 attiva (80h): cilindro 0, testina 1, settore 1',
              'Carica quel settore a <span class="lab-mono">0000:7C00</span> e ci salta',
              'Il settore della partizione carica IO.SYS e MSDOS.SYS',
            ], 'CS:IP = 0000:7C00');
            return { v: v, ev: [
              ev(0, () => v.accendi(0)),
              ev(380, () => { v.accendi(1); v.reg('CS:IP = 0000:061D'); kv.ind.textContent = '0000:061D'; }),
              ev(760, (k, salta) => { v.accendi(2); led('hdd', true); if (!salta) clic(2, 0.08); }),
              ev(1140, () => { v.accendi(3); v.reg('CS:IP = 0000:7C00'); kv.ind.textContent = '0000:7C00'; }),
              ev(1520, (k, salta) => { v.accendi(4); if (!salta) clic(4, 0.07); }),
              ev(1950, () => { led('hdd', false); v.tutto(); }),
            ] };
          }
          const v = vistaCatena('Il salto nel settore', [
            'Il BIOS (INT 19h, nella ROM a <span class="lab-mono">F000:E6F2</span>) ha copiato il settore',
            'Salto: ora il processore esegue il codice del dischetto',
            'Il settore carica IBMBIO.COM e IBMDOS.COM',
            'E passa il comando al DOS',
          ], 'CS:IP = F000:E6F2');
          return { v: v, ev: [
            ev(0, () => v.accendi(0)),
            ev(450, () => { v.accendi(1); v.reg('CS:IP = 0000:7C00'); }),
            ev(850, (k, salta) => { v.accendi(2); led('a', true); if (!salta) clic(6, 0.07); }),
            ev(1350, () => { led('a', false); v.accendi(3); }),
            ev(1480, () => v.tutto()),
          ] };
        }
        case 'dos': {
          if (sc === 'compatibile') {
            const v = vistaFinale();
            const r = M.SCHERMI.dos3;
            return { v: v.vista, ev: [
              ev(0, () => { v.anima(0); cursore(false); aggiungi(''); aggiungi(r[0]); aggiungi(r[1]); cursore(true); }),
              ev(700, () => { cursore(false); aggiungi(r[2]); aggiungi(r[3]); cursore(true); }),
              ev(1300, () => { cursore(false); aggiungi(r[4]); aggiungi(r[5]); aggiungi(r[6]); aggiungi(r[7]); aggiungi(r[8]); cursore(true); v.anima(1); }),
            ] };
          }
          const v = vistaFinale();
          const base = M.SCHERMI.dosData;
          return { v: v.vista, ev: [
            ev(0, () => { cursore(false); scrivi([base]); cursore(true); v.anima(0); }),
            ev(500, (k) => ultima(base + M.SCHERMI.dataLancio.slice(0, Math.round(k * M.SCHERMI.dataLancio.length))), 1000),
            ev(1700, () => { cursore(false); M.SCHERMI.dos1.forEach((r) => aggiungi(r)); cursore(true); v.anima(1); }),
          ] };
        }
        case 'basic': {
          const v = vistaCatena('La staffetta, senza disco', [
            'POST superato, un bip',
            'INT 19h: l\'unità A è vuota',
            'INT 18h: il BIOS salta al BASIC',
            'Il BASIC in ROM, a <span class="lab-mono">F600:0000</span>, è pronto',
          ]);
          const r = M.SCHERMI.basic;
          return { v: v, ev: [
            ev(0, () => { v.accendi(2); cursore(false); scrivi([]); }),
            ev(300, () => { scrivi([r[0], r[1], r[2]]); }),
            ev(700, () => { aggiungi(r[3]); cursore(true); mostra('tasti', true); v.tutto(); }),
          ] };
        }
        case 'errore': {
          const v = vistaErrore();
          return { v: v, ev: [
            ev(150, (k, salta) => { v.suona(); if (!salta) bip([0.12, 0.12]); }),
            ev(500, () => { cursore(false); scrivi(M.SCHERMI.errore.slice()); cursore(true); }),
          ] };
        }
        case 'sec': {
          const v = vistaSec();
          return { v: v, ev: [
            ev(0, () => v.reg('Indirizzo fisico FFFFFFF0h → flash SPI')),
            ev(100, (k) => { v.freccia.style.opacity = String(k); v.freccia.style.transform = 'translateX(' + ((1 - k) * -8) + 'px)'; }, 450),
            ev(500, () => v.primo.classList.add('on')),
            ev(650, (k) => v.cache(k), 900),
          ] };
        }
        case 'pei': {
          const v = vistaPei();
          return { v: v, ev: [
            ev(250, () => v.spd()),
            ev(450, (k) => v.allena(k), 1500),
            ev(2050, () => v.fine()),
          ] };
        }
        case 'dxe': {
          const v = vistaDxe();
          const out = [ev(80, (k) => v.conta(k), 2200)];
          [0, 1, 2, 3, 4, 5].forEach((i) => out.push(ev(200 + i * 360, () => {
            v.voce(i);
            if (i === 4) mostra('logo', true);
          })));
          return { v: v, ev: out };
        }
        case 'bds': {
          const v = vistaBds();
          return { v: v, ev: [
            ev(300, () => v.scegli(0)),
            ev(800, () => v.disco()),
            ev(1200, (k, salta) => { v.esp(); led('hdd', true); if (!salta) clic(2, 0.05); }),
            ev(1400, (k) => v.percorso(k), 600),
            ev(2100, () => led('hdd', false)),
          ] };
        }
        case 'firma': {
          const ok = sc === 'uefi';
          const v = vistaFirma(ok);
          return { v: v, ev: [
            ev(250, (k) => v.calcola(k), 1100),
            ev(1500, () => v.confronta()),
            ev(1800, () => { if (!ok) { mostra('logo', false); mostra('avviso', true); } }),
          ] };
        }
        case 'caricatore': {
          const v = vistaCatena('Dal caricatore al kernel', [
            'bootmgfw.efi parte: la sua firma è valida',
            'Legge dal disco il kernel e i driver essenziali, verificati anche loro',
            'Chiama ExitBootServices: il firmware si fa da parte',
            'Il kernel prende il comando della macchina',
          ]);
          return { v: v, ev: [
            ev(0, (k, salta) => { v.accendi(0); mostra('rotella', true); led('hdd', true); if (!salta) clic(5, 0.05); }),
            ev(550, () => v.accendi(1)),
            ev(1250, () => v.accendi(2)),
            ev(1800, () => { v.accendi(3); led('hdd', false); }),
            ev(2150, () => v.tutto()),
          ] };
        }
        case 'os': {
          const v = vistaFinale();
          return { v: v.vista, ev: [
            ev(0, () => v.anima(0)),
            ev(700, () => { mostra('rotella', false); mostra('logo', false); mostra('desk', true); }),
            ev(1500, () => v.anima(1)),
          ] };
        }
        default:
          return { v: { el: riquadro(f.titolo, null) }, ev: [] };
      }
    }

    // La schermata del compatibile: intestazione, conteggio della memoria, invito al setup.
    function testaCompatibile() { return M.SCHERMI.compatibileTesta.slice(); }

    function contaMemoria(k) {
      const m = M.SCHERMI.memoria;
      const kb = (n, w) => String(n).padStart(w, ' ') + 'K';
      const a = Math.min(1, k / 0.45);
      const b = ctx.clamp((k - 0.5) / 0.45, 0, 1);
      const base = Math.round(a * m.base / 16) * 16;
      const est = Math.round(b * m.estesa / 64) * 64;
      const righe = testaCompatibile();
      righe.push('Memory Test : ' + kb(base, 5) + (a >= 1 ? ' OK' : ''));
      if (k >= 0.5) righe.push('Extended    : ' + kb(est, 5) + (b >= 1 ? ' OK' : ''));
      if (k >= 1) righe.push('', M.SCHERMI.setup);
      schermo.righe = righe;
      schermo.cursore = false;
      disegnaSchermo();
    }

    // La staffetta completa, riassunta alla fine: ogni anello caricato dal precedente.
    function vistaFinale() {
      const sc = st.scen;
      const passi = sc === 'compatibile'
        ? ['Alimentatore: Power Good', '80386 da FFFFFFF0h', 'BIOS: POST e setup', 'INT 19h: MBR a 7C00h, firma ✓', 'MBR → settore della partizione', 'IO.SYS, MSDOS.SYS, COMMAND.COM: C&gt;']
        : st.modo === 'uefi'
          ? ['Alimentatore: PWR_OK', 'SEC da FFFFFFF0h, poi PEI', 'DXE: driver e logo', 'BDS: partizione di sistema EFI', 'Secure Boot: firma ✓', 'Caricatore e kernel: sistema avviato']
          : ['Alimentatore: Power Good', '8088 da FFFF0h', 'BIOS: POST e un bip', 'INT 19h: settore a 7C00h', 'IBMBIO.COM e IBMDOS.COM', 'COMMAND.COM: A&gt;'];
      const v = vistaCatena('La staffetta completa', passi);
      return {
        vista: v,
        anima(k) { if (k >= 1) v.tutto(); else v.accendi(passi.length - 1); },
      };
    }

    /* ======================= esecuzione delle fasi ======================= */

    const orologio = ctx.loop((dt) => {
      if (st.pausa) return false;
      const ms = dt * 1000;
      if (corsa) {
        corsa.t += ms;
        eseguiEventi(corsa, 'tempo');
        if (corsa && corsa.restanti === 0 && corsa.t >= corsa.durata) finisciFase();
        return true;
      }
      if (pausaAuto > 0) {
        pausaAuto -= ms;
        if (pausaAuto <= 0) { pausaAuto = 0; avviaFase(st.i + 1); }
        return true;
      }
      return false;
    });

    // modo: 'tempo' (secondo l'orologio), 'salta' (tutto subito, senza suoni), 'subito' (tutto subito, con i suoni).
    function eseguiEventi(c, modo) {
      let restanti = 0;
      c.ev.forEach((e) => {
        if (e.fatto) return;
        if (modo !== 'tempo') { e.fa(1, modo === 'salta'); e.fatto = true; return; }
        if (c.t < e.t) { restanti++; return; }
        if (e.d) {
          const k = Math.min(1, (c.t - e.t) / e.d);
          e.fa(k, false);
          if (k >= 1) e.fatto = true; else restanti++;
        } else { e.fa(1, false); e.fatto = true; }
      });
      c.restanti = restanti;
    }

    function avviaFase(i) {
      const fasi = scenario().fasi;
      if (i < 0 || i >= fasi.length) return;
      if (i === 0) preparaAccensione();
      st.i = i;
      st.acceso = true;
      const f = fasi[i];
      kv.fase.textContent = (i + 1) + '/' + fasi.length + ' · ' + f.nome;
      kv.dove.textContent = f.dove;
      kv.ind.textContent = f.indirizzo;
      nota.innerHTML = '<strong>' + f.titolo + '.</strong> ' + f.testo;
      const sc = scena(f);
      vista.replaceChildren(sc.v.el);
      corsa = { fase: f, ev: sc.ev, t: 0, durata: Math.max(f.durata, ...sc.ev.map((e) => e.t + e.d + 120)), restanti: sc.ev.length };
      aggiornaLinea();
      if (ridotto()) { eseguiEventi(corsa, 'subito'); finisciFase(); return; }
      if (st.attivo && !st.pausa) orologio.start();
      aggiornaComandi();
    }

    function finisciFase() {
      if (!corsa) return;
      const f = corsa.fase;
      corsa = null;
      const fasi = scenario().fasi;
      aggiornaLinea(f.esito === 'errore');
      if (st.i >= fasi.length - 1) {
        st.finito = true;
        st.auto = false;
        nota.innerHTML = '<strong>' + f.titolo + '.</strong> ' + f.testo + ' <em class="avv-fine">' +
          (f.esito === 'errore' ? 'L\'avvio si è fermato.' : 'Avvio completato.') + ' Prova un altro scenario, oppure premi Ricomincia.</em>';
      } else if (st.auto) {
        pausaAuto = ridotto() ? 2200 : 520;
        if (st.attivo && !st.pausa) orologio.start();
      }
      aggiornaComandi();
    }

    function preparaAccensione() {
      if (spegnimento) { spegnimento.cancel(); spegnimento = null; }
      schermoSpento();
      box.classList.add('acceso');
      tasto.setAttribute('aria-label', 'Spegni il PC');
    }

    function accendi(auto) {
      if (st.acceso) return;
      st.auto = auto;
      st.pausa = false;
      st.finito = false;
      avviaFase(0);
      aggiornaComandi();
    }

    function primario() {
      if (!st.acceso) { accendi(true); return; }
      if (st.finito) { spegni(true); accendi(true); return; }
      if (st.auto && !st.pausa) {
        st.pausa = true;
        orologio.stop();
      } else {
        st.pausa = false;
        st.auto = true;
        if (!corsa && pausaAuto <= 0) pausaAuto = 1;
        if (st.attivo) orologio.start();
      }
      aggiornaComandi();
    }

    // Un passo: se una fase è in corso la completa subito; altrimenti avvia la successiva e si ferma alla sua fine.
    function passo() {
      if (st.finito) return;
      st.auto = false;
      st.pausa = false;
      if (corsa) { eseguiEventi(corsa, 'salta'); finisciFase(); return; }
      pausaAuto = 0;
      if (!st.acceso) { accendi(false); return; }
      avviaFase(st.i + 1);
      aggiornaComandi();
    }

    function spegni(immediato) {
      const eraAcceso = st.acceso || corsa;
      corsa = null;
      pausaAuto = 0;
      orologio.stop();
      st.i = -1; st.acceso = false; st.auto = false; st.pausa = false; st.finito = false;
      box.classList.remove('acceso', 'led-pwr', 'led-a', 'led-hdd');
      tasto.setAttribute('aria-label', 'Accendi il PC');
      if (eraAcceso) crtSpegni(immediato); else schermoSpento();
      aggiornaLinea();
      ['fase', 'dove', 'ind'].forEach((k) => { kv[k].textContent = '—'; });
      vista.replaceChildren(vistaAttesa().el);
      nota.innerHTML = '<strong>' + scenario().macchina + '.</strong> ' + introScenario();
      aggiornaComandi();
    }

    function introScenario() {
      return {
        ibm: 'Il PC del 1981: POST con il solo cursore sullo schermo, un bip, il settore di avvio del dischetto, il DOS.',
        'ibm-vuoto': 'Stesso PC, ma l\'unità A è vuota: guarda che cosa fa il BIOS quando non trova un disco.',
        'ibm-ram': 'Un chip di memoria è guasto: il POST se ne accorge e lo dice con i bip e un codice.',
        compatibile: 'Un compatibile di fine anni Ottanta: il POST conta la memoria sullo schermo e l\'avvio passa dal master boot record del disco rigido.',
        uefi: 'Un PC di oggi: le fasi del firmware UEFI, la scelta del caricatore e la verifica di Secure Boot.',
        'uefi-ko': 'Come prima, ma qualcuno ha modificato il caricatore: Secure Boot se ne accorge?',
      }[st.scen];
    }

    /* ======================= linea delle fasi e comandi ======================= */

    function disegnaLinea() {
      const fasi = scenario().fasi;
      linea.style.setProperty('--n', String(fasi.length));
      linea.replaceChildren(...fasi.map((f, i) => h('li', { class: 'avv-fase', 'data-stato': 'futuro' },
        h('span', { class: 'avv-fase-filo', 'aria-hidden': 'true' }, h('i')),
        h('span', { class: 'avv-fase-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('span', { class: 'avv-fase-nome' }, f.nome),
        h('span', { class: 'spc-sr-only avv-fase-sr' }, ', da fare'))));
    }

    function aggiornaLinea(errore) {
      const STATI = { futuro: ', da fare', attivo: ', in corso', fatto: ', fatta', errore: ', errore' };
      [...linea.children].forEach((li, i) => {
        let s = 'futuro';
        if (i < st.i) s = 'fatto';
        else if (i === st.i) s = corsa ? 'attivo' : (errore ? 'errore' : 'fatto');
        li.dataset.stato = s;
        li.querySelector('.avv-fase-sr').textContent = STATI[s];
        if (i === st.i && corsa) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
    }

    function aggiornaComandi() {
      let t = '⏻ Accendi';
      if (st.acceso && st.finito) t = '↻ Riaccendi';
      else if (st.acceso && st.auto && !st.pausa) t = '❚❚ Pausa';
      else if (st.acceso) t = '▶ Continua';
      btnAccendi.textContent = t;
      btnPasso.disabled = st.finito;
      btnRicomincia.disabled = !st.acceso;
      box.classList.toggle('in-corsa', !!corsa && !st.pausa);
    }

    function scegliModo(id) {
      if (id === st.modo) return;
      st.modo = id;
      st.scen = M.MODI[id].scenari[0];
      applicaScenario();
    }

    function scegliScenario(id) {
      if (id === st.scen) return;
      st.scen = id;
      applicaScenario();
    }

    function applicaScenario() {
      segModo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === st.modo)));
      segScen.replaceChildren(...M.MODI[st.modo].scenari.map((id) => h('button', {
        type: 'button', 'data-scen': id, 'aria-pressed': String(id === st.scen), onclick: () => scegliScenario(id),
      }, M.SCENARI[id].etichetta)));
      box.className = box.className.replace(/\b(modo|scen|tipo)-[a-z-]+/g, '').replace(/\s+/g, ' ').trim() + ' modo-' + st.modo + ' scen-' + st.scen +
        (st.scen.indexOf('ibm') === 0 ? ' tipo-ibm' : '') + (st.scen === 'compatibile' ? ' tipo-vga' : '');
      disegnaLinea();
      spegni(true);
    }

    /* ======================= avvio del laboratorio ======================= */

    applicaScenario();

    return {
      attiva() {
        st.attivo = true;
        box.classList.add('attivo');
        if ((corsa || pausaAuto > 0) && !st.pausa) orologio.start();
      },
      sospendi() {
        st.attivo = false;
        box.classList.remove('attivo');
        orologio.stop();
      },
      distruggi() {
        orologio.stop();
        if (spegnimento) spegnimento.cancel();
        if (audio && audio.close) { try { audio.close(); } catch (e) { /* già chiuso */ } }
        audio = null;
      },
    };
  }

  // L'unità di sistema: una cassa beige con due unità per dischetti (BIOS) e una cassa scura di oggi (UEFI).
  function svgCassa() {
    let fessure = '';
    for (let x = 26; x <= 122; x += 8) fessure += '<rect class="avvc-fessura" x="' + x + '" y="34" width="3.5" height="40" rx="1.5"/>';
    let righe = '';
    for (let x = 30; x <= 210; x += 12) righe += '<rect class="avvc-righina" x="' + x + '" y="40" width="2" height="30" rx="1"/>';
    const unitaDischetto = (x, nome) => '<g transform="translate(' + x + ' 18)">' +
      '<rect class="avvc-frontale" width="112" height="66" rx="3"/>' +
      '<rect class="avvc-fessura-d" x="10" y="26" width="92" height="9" rx="2"/>' +
      '<rect class="avvc-leva" x="49" y="20" width="14" height="22" rx="3"/>' +
      '<rect class="avvc-led ' + nome + '" x="10" y="50" width="12" height="5" rx="1.5"/>' +
      '</g>';
    return '<svg viewBox="0 0 600 112" class="avv-cassa" aria-hidden="true">' +
      '<g class="avvc-bios">' +
        '<rect class="avvc-corpo" x="4" y="6" width="592" height="98" rx="7"/>' +
        '<rect class="avvc-luce" x="10" y="9" width="580" height="5" rx="2"/>' +
        '<rect class="avvc-base" x="4" y="90" width="592" height="14" rx="5"/>' +
        fessure +
        '<rect class="avvc-targa" x="146" y="40" width="64" height="16" rx="2"/>' +
        '<circle class="avvc-spia pwr" cx="236" cy="70" r="4.5"/><circle class="avvc-spia hdd" cx="256" cy="70" r="4.5"/>' +
        unitaDischetto(288, 'a') + unitaDischetto(408, 'b') +
        '<circle class="avvc-incavo" cx="566" cy="52" r="23"/>' +
      '</g>' +
      '<g class="avvc-uefi">' +
        '<rect class="avvc-corpo-o" x="4" y="10" width="592" height="92" rx="10"/>' +
        '<rect class="avvc-luce-o" x="10" y="13" width="580" height="4" rx="2"/>' +
        righe +
        '<rect class="avvc-striscia" x="240" y="54" width="230" height="3" rx="1.5"/>' +
        '<rect class="avvc-usb" x="480" y="40" width="22" height="9" rx="1.5"/><rect class="avvc-usb" x="480" y="58" width="22" height="9" rx="1.5"/>' +
        '<circle class="avvc-jack" cx="514" cy="54" r="4"/>' +
        '<circle class="avvc-incavo-o" cx="566" cy="52" r="23"/>' +
        '<circle class="avvc-spia hdd-o" cx="514" cy="74" r="3"/>' +
      '</g>' +
      '</svg>';
  }

  /* ======================= registrazione del capitolo ======================= */

  P.registra({
    numero: 7,
    id: 'avvio',
    titolo: 'Accendere un PC: dal BIOS all\'UEFI',
    breve: 'Avvio',
    periodo: '1975–oggi',
    colore: 'var(--era-7)',
    sommario: 'Cosa succede tra il tasto di accensione e il sistema operativo: bootstrap, BIOS e POST, settore di avvio da 512 byte, MBR, UEFI e Secure Boot.',
    intro: 'Premere un tasto e vedere comparire, pochi secondi dopo, il sistema operativo sembra la cosa più naturale del mondo. In mezzo c\'è una staffetta di programmi sempre più grandi, ognuno caricato dal precedente: dal caricatore inserito a mano con le levette al BIOS dell\'IBM PC, dai 512 byte del settore di avvio all\'UEFI con le sue firme digitali. È anche una delle parti del PC rimaste più a lungo fedeli al 1981.',
    blocchi: [
      {
        tipo: 'testo',
        titolo: 'Tirarsi su per le stringhe degli stivali',
        paragrafi: [
          'Appena acceso, un computer non sa fare niente. La memoria di lavoro, la RAM (<em>random access memory</em>), si svuota a ogni spegnimento, e il processore sa fare una cosa sola: eseguire le istruzioni che trova in memoria. Ma per mettere un programma in memoria serve un programma. Questo circolo vizioso si chiama <strong>bootstrap</strong>, dall\'espressione inglese «tirarsi su per le stringhe degli stivali» (i <em>bootstraps</em> sono le linguette sul retro degli stivali), cioè riuscire da soli in un\'impresa impossibile. Da lì vengono il verbo <em>to boot</em> e il nostro «fare il boot»; l\'immagine viene spesso legata al barone di Münchhausen, che però, nei racconti, si tira fuori da una palude per il codino, non per gli stivali.',
          'Sui primi calcolatori il problema si risolveva a mano. Nei minicomputer degli anni Sessanta e nei primi personal, come l\'Altair 8800 del 1975 (lo trovi nel <a href="#primi-pc">capitolo 3</a>), l\'operatore inseriva con le levette del pannello frontale, un byte alla volta, un minuscolo caricatore: poche decine di byte il cui unico compito era leggere un programma più lungo da un nastro di carta perforata. Paul Allen raccontò di aver scritto quello per il BASIC dell\'Altair sull\'aereo per Albuquerque, quando si accorse che mancava. I grandi calcolatori avevano invece un tasto di caricamento che leggeva ed eseguiva la prima scheda perforata o il primo blocco di un nastro; IBM chiamava l\'operazione IPL (<em>initial program load</em>, caricamento iniziale del programma).',
          'La soluzione definitiva arrivò con le ROM (<em>read-only memory</em>, memorie a sola lettura), che conservano i dati anche senza corrente e negli anni Settanta diventarono economiche (le racconta la <a href="../chip-programmabili/index.html#memorie">sezione 5</a>). Basta registrare il primo programma in una ROM e costruire il computer in modo che il processore, all\'accensione, cominci sempre da lì: il caricatore diventa parte della macchina. L\'Apple II del 1977, per esempio, aveva in ROM un programma di controllo, il Monitor, e il linguaggio BASIC.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraStaffetta,
        larga: true,
        alt: 'Schema della sequenza di avvio di un PC in sei passi numerati, collegati da un percorso a serpentina: l\'alimentatore con il LED del segnale Power Good, il processore che esce dal reset, il chip del firmware con l\'etichetta BIOS, il disco rigido, un file che rappresenta il caricatore e uno schermo con le finestre del sistema operativo.',
        didascalia: '<strong>La staffetta dell\'avvio.</strong> 1) L\'alimentatore stabilizza le tensioni e alza il segnale Power Good. 2) Il processore esce dal reset e legge la prima istruzione a un indirizzo fisso. 3) Lì risponde il chip del firmware, BIOS o UEFI, che controlla e prepara la macchina. 4) Il firmware legge dal disco il settore di avvio o, con l\'UEFI, un file della partizione di sistema EFI. 5) Il caricatore porta in memoria il sistema operativo. 6) Il sistema operativo prende il comando. Ogni anello carica il successivo.',
      },
      {
        tipo: 'testo',
        titolo: 'Il BIOS, dal CP/M all\'IBM PC',
        paragrafi: [
          'La sigla BIOS (<em>basic input/output system</em>, sistema di base per l\'ingresso e l\'uscita) nasce con il CP/M, il sistema operativo che Gary Kildall aveva scritto per i computer con processore Intel 8080. Quando Glenn Ewing gli chiese di adattarlo ai dischi della IMSAI, nel 1976 secondo i ricordi di Kildall (altre fonti indicano il 1975), Kildall separò la parte che dipendeva dall\'hardware: un piccolo modulo con le routine per leggere la tastiera, scrivere sullo schermo e muovere le testine del disco. Il resto del sistema chiedeva tutto a quel modulo e dei chip non sapeva niente: per portare il CP/M su un computer nuovo bastava riscrivere il BIOS.',
          'L\'IBM PC del 1981 riprese nome e idea, ma registrò il suo BIOS in una ROM da 8 KB sulla scheda madre (come faccia da «sportello» per i programmi lo racconta il <a href="#ibm-pc">capitolo 4</a>). Quando si aziona la grande levetta rossa sul fianco, l\'alimentatore impiega una frazione di secondo a stabilizzare le tensioni, e finché non sono pronte tiene basso un segnale chiamato <strong>Power Good</strong>: il processore resta bloccato in reset. Poi il segnale sale, l\'Intel 8088 si sveglia e va a prendere la prima istruzione sempre allo stesso indirizzo, <strong>FFFF0h</strong> (la «h» indica un numero esadecimale), 16 byte prima della fine del megabyte che può indirizzare. Lì c\'è la ROM del BIOS, e in 16 byte c\'è posto solo per un salto all\'inizio del programma vero.',
          'Il programma comincia con il <strong>POST</strong> (<em>power-on self-test</em>, autodiagnosi all\'accensione). Il BIOS prova i registri del processore, controlla con una somma di controllo che la propria ROM sia integra, verifica il timer e il controllore DMA (<em>direct memory access</em>, l\'accesso diretto alla memoria), scrive e rilegge tutta la memoria, prepara la scheda video, interroga la tastiera e le unità a dischetti. Se tutto va bene, l\'altoparlante emette un <strong>bip breve</strong>. Altrimenti il PC si esprime con bip e numeri: un bip lungo e due brevi indicano un guasto della scheda video, che non può mostrare messaggi; due bip brevi, un errore il cui codice compare sullo schermo, come 201 per la memoria, 301 per la tastiera, 601 per i dischetti.',
        ],
      },
      {
        tipo: 'nota',
        paragrafi: [
          'Ctrl+Alt+Canc nacque durante il progetto dell\'IBM PC, come scorciatoia per chi lo costruiva. Il test della memoria era lento e i programmatori dovevano riavviare la macchina in continuazione: David Bradley, uno degli autori del BIOS, scelse tre tasti lontani fra loro, che nessuno avrebbe premuto insieme per sbaglio. La combinazione fa ripartire il PC senza spegnerlo, un riavvio «a caldo»: il BIOS scrive il valore 1234h in una cella di memoria e, quando lo ritrova, salta il test della memoria.',
          'Non era pensata per il pubblico, ma la voce si sparse in fretta. Anni dopo Windows NT la usò per aprire la schermata di accesso, e così diventò famosa nel mondo.',
        ],
      },
      {
        tipo: 'citazione',
        testo: 'Forse l\'ho inventata io, ma è stato Bill a renderla famosa.',
        autore: 'David Bradley, ingegnere IBM, a una tavola rotonda con Bill Gates',
        fonte: 'festa per i vent\'anni del PC IBM, Tech Museum di San Jose, 8 agosto 2001',
      },
      {
        tipo: 'testo',
        titolo: '512 byte per cominciare',
        paragrafi: [
          'Finito il POST, il BIOS esegue l\'interruzione <strong>19h</strong>, la routine di avvio. Legge il primo settore del dischetto nell\'unità A (traccia 0, testina 0, settore 1), cioè 512 byte, lo copia in memoria all\'indirizzo <strong>0000:7C00</strong> (in notazione segmento:offset) e ci salta. Da quel momento il BIOS non decide più niente: quei 512 byte, scritti dal sistema operativo quando prepara il disco, devono bastare a caricare il resto. Perché proprio 7C00h? La spiegazione più citata è che il DOS doveva funzionare anche con 32 KB di memoria: il settore e il suo spazio di lavoro finivano nell\'ultimo kilobyte, lasciando libero tutto quello che c\'era sotto.',
          'Senza un dischetto nell\'unità l\'IBM PC non si arrendeva: chiamava l\'interruzione 18h e avviava il BASIC registrato in quattro ROM della scheda madre, 32 KB in tutto. Sullo schermo compariva «The IBM Personal Computer Basic», e si poteva programmare subito e salvare il lavoro su cassetta. I compatibili non avevano il BASIC di IBM, protetto dal diritto d\'autore, e al suo posto mostravano un messaggio d\'errore: nei BIOS della AMI era il celebre «NO ROM BASIC - SYSTEM HALTED».',
          'Il BIOS del 1981 non controllava il settore: lo caricava e basta. Con il PC/XT e il PC DOS 2.0, nel 1983, arrivarono i dischi rigidi e un settore di avvio più ricco, il <strong>master boot record</strong> (MBR, record di avvio principale). I suoi 512 byte hanno tre zone: fino a 446 byte di codice; dal byte 446 al 509 la <strong>tabella delle partizioni</strong>, quattro voci da 16 byte che dividono il disco al massimo in quattro parti (per ognuna: se è attiva, il tipo, dove comincia e quanto è lunga); negli ultimi due byte, il 510 e il 511, la firma <strong>55h AAh</strong>. Da allora, prima di saltare, il BIOS controlla la firma del disco rigido: se manca, il disco non è avviabile.',
          'Il codice dell\'MBR fa una cosa sola: si sposta più in basso nella memoria, cerca nella tabella la partizione segnata come attiva e ne carica il primo settore, di nuovo all\'indirizzo 7C00h. Quel secondo settore carica i file del sistema operativo, che caricano tutto il resto. In binario 55h e AAh sono 01010101 e 10101010, bit alternati che difficilmente compaiono per caso; la stessa coppia apre anche le ROM delle schede di espansione, come i BIOS delle schede video, che il BIOS principale cerca e avvia durante il POST.',
        ],
      },
      { tipo: 'lab' },
      {
        tipo: 'testo',
        titolo: 'Setup, batteria e Plug and Play',
        paragrafi: [
          'Ogni PC è diverso: quanta memoria, quali dischi, quale scheda video. L\'IBM PC lo scopriva leggendo la posizione di piccoli interruttori sulla scheda madre, i <em>DIP switch</em>. Il PC/AT del 1984 introdusse un chip CMOS (<em>complementary metal-oxide-semiconductor</em>, una tecnologia che consuma pochissimo) con l\'orologio e una memoria di appena 64 byte, in gran parte dedicata alle impostazioni, alimentato da una batteria a computer spento. Il programma per modificarle, il <strong>setup</strong>, sull\'AT stava su un dischetto di diagnostica; i BIOS dei compatibili lo portarono nella ROM, da richiamare con un tasto come Canc, F1 o F2 durante il POST.',
          'Negli anni Novanta il BIOS imparò a configurare il PC da solo. Prima, per ogni scheda di espansione bisognava scegliere a mano, con ponticelli e interruttori, una linea di interruzione (IRQ, <em>interrupt request</em>) e un canale DMA, e due schede sulla stessa linea si bloccavano a vicenda. Nel 1994 Compaq, Phoenix e Intel pubblicarono la specifica del <strong>BIOS Plug and Play</strong> («collega e usa»): all\'avvio il BIOS riconosce le schede compatibili e assegna le risorse senza conflitti, d\'accordo con il sistema operativo. Windows 95 la rese popolare, anche se per anni i più scettici la chiamarono <em>Plug and Pray</em>, «collega e prega».',
          'Nel 1996 Intel, Microsoft e Toshiba pubblicarono l\'<strong>ACPI</strong> (<em>advanced configuration and power interface</em>): il firmware descrive al sistema operativo, con tabelle standard, l\'hardware della macchina e il modo di accenderne e spegnerne i pezzi, dalle ventole alla sospensione. Ma i limiti restavano quelli del 1981. Il BIOS girava nella modalità a 16 bit dell\'8088, con un solo megabyte di indirizzi; le ROM delle schede dovevano stare tutte in 128 KB; la tabella MBR, con numeri di settore a 32 bit, non poteva descrivere dischi più grandi di 2,2 TB. E il codice, scritto in assembly e rattoppato per vent\'anni, era sempre più difficile da mantenere.',
        ],
      },
      {
        tipo: 'figura',
        svg: figuraFirmware,
        alt: 'Due porzioni di scheda madre affiancate. A sinistra, fine anni Ottanta: una EPROM del BIOS con la finestrella di quarzo coperta da un\'etichetta, il chip dell\'orologio CMOS e una batteria cilindrica saldata sulla scheda, con una macchia di liquido. A destra, oggi: un minuscolo chip di memoria flash a otto piedini, ingrandito da una lente, la pila a bottone CR2032 nel portapila e un ponticello.',
        didascalia: '<strong>Dove abita il firmware.</strong> Fino a metà degli anni Novanta il BIOS stava di solito in una EPROM (<em>erasable programmable ROM</em>), che si cancellava con la luce ultravioletta attraverso la finestrella di quarzo: per questo un\'etichetta la copriva. Le impostazioni stavano nella memoria CMOS, tenuta in vita da una batteria, spesso un cilindretto ricaricabile al nichel-cadmio che dopo molti anni poteva perdere liquido corrosivo sulla scheda. Oggi il firmware sta in una memoria flash di 16 o 32 MB, riscrivibile per gli aggiornamenti; una pila a bottone CR2032 alimenta l\'orologio, e un ponticello (o un tasto) cancella le impostazioni. Disegno schematico.',
      },
      {
        tipo: 'testo',
        titolo: 'UEFI: un sistema operativo prima del sistema operativo',
        paragrafi: [
          'Il firmware nuovo nacque per un processore che non era quello dei PC. Nel 1998 Intel avviò un progetto, chiamato prima Intel Boot Initiative e poi <strong>EFI</strong> (<em>extensible firmware interface</em>), per i server con Itanium, il suo processore a 64 bit, a cui il vecchio BIOS a 16 bit non si adattava. Nel 2005 Intel affidò la specifica, arrivata alla versione 1.10, a un consorzio di aziende, lo Unified EFI Forum, che nel gennaio 2006 pubblicò la versione 2.0 con il nuovo nome <strong>UEFI</strong> (<em>unified extensible firmware interface</em>). Nello stesso anno i Mac con processore Intel partirono con EFI; i PC con Windows passarono in massa a UEFI intorno al 2010–2012.',
          'UEFI è una specifica: dice come il firmware deve comportarsi con il sistema operativo, non come va scritto. In pratica i firmware UEFI sono piccoli sistemi operativi, scritti per lo più in linguaggio C, che lavorano a 32 o 64 bit, caricano driver, leggono i file system FAT e sanno usare la rete. Quasi tutti dividono l\'avvio in quattro fasi. <strong>SEC</strong> (<em>security</em>, sicurezza) prende il controllo al reset, quando la memoria non funziona ancora, e usa come memoria provvisoria la cache del processore; <strong>PEI</strong> (<em>pre-EFI initialization</em>) prepara la memoria e i componenti essenziali; <strong>DXE</strong> (<em>driver execution environment</em>) carica i driver di tutto il resto, dalla scheda video all\'USB; <strong>BDS</strong> (<em>boot device selection</em>) sceglie da dove avviare.',
          'Cambia anche il disco. La tabella delle partizioni <strong>GPT</strong> (<em>GUID partition table</em>; un GUID è un identificativo unico di 128 bit) usa numeri di settore a 64 bit, abbastanza per dischi di miliardi di terabyte, e ammette di norma fino a 128 partizioni, con una copia di riserva alla fine del disco. Nel settore 0 resta un MBR «protettivo», che mostra ai vecchi programmi un disco già tutto occupato. E il codice nel settore di avvio non serve più: il firmware legge una partizione speciale, la <strong>partizione di sistema EFI</strong> (ESP), formattata FAT, e lì trova i caricatori come normali file .efi. Windows usa \\EFI\\Microsoft\\Boot\\bootmgfw.efi, molte distribuzioni Linux il caricatore GRUB; l\'elenco delle voci di avvio e il loro ordine stanno in variabili salvate nella memoria flash della scheda madre.',
          'Per anni i firmware UEFI hanno avuto anche un modulo che imitava il vecchio BIOS, il CSM (<em>compatibility support module</em>), per avviare dischi e sistemi operativi di prima. Nel 2017 Intel annunciò che entro il 2020 lo avrebbe tolto dalle sue piattaforme: dopo quasi quarant\'anni, il BIOS dell\'IBM PC andava in pensione.',
        ],
      },
      {
        tipo: 'testo',
        titolo: 'Un avvio di oggi, passo per passo',
        paragrafi: [
          'Premi il tasto. Non è più un interruttore che stacca la corrente, come la levetta rossa dell\'IBM PC: dal formato ATX del 1995 (lo racconta il <a href="#scheda-madre">capitolo 5</a>) l\'alimentatore tiene sempre accesa una piccola tensione di riposo, i 5 V di <em>standby</em>, e il tasto è solo un segnale per la scheda madre, che chiede all\'alimentatore di partire. Quando tutte le tensioni sono stabili, fra 0,1 e 0,5 secondi dopo, l\'alimentatore alza il segnale PWR_OK, il Power Good di sempre. Sui PC recenti, prima ancora del processore principale, si sveglia un piccolo processore di servizio (il Management Engine di Intel, il Platform Security Processor di AMD), che può verificare che il firmware non sia stato manomesso.',
          'Il processore esce dal reset e comincia ancora da un indirizzo fisso: FFFFFFF0h, 16 byte sotto i 4 GB, dove il chipset fa comparire il contenuto del chip di memoria flash del firmware, collegato con il <a href="../../index.html#/bus/spi">bus SPI</a>. Seguono SEC; PEI, con l\'«addestramento» della memoria, in cui il firmware regola i tempi dei segnali dei moduli (la prima volta può volerci più di un minuto); DXE, con centinaia di driver e il logo del produttore; BDS, con la scelta del disco. Il firmware avvia il caricatore, che porta in memoria il nucleo del sistema operativo, il <em>kernel</em>, e chiama la funzione ExitBootServices: da lì il sistema operativo è padrone della macchina. Del firmware restano solo alcuni servizi, come l\'orologio e le variabili, e le tabelle ACPI.',
          'Con <strong>Secure Boot</strong>, introdotto nella versione 2.3.1 della specifica UEFI (aprile 2011), ogni anello della catena è firmato. Prima di eseguire un driver o un caricatore, il firmware ne calcola l\'impronta digitale, ne verifica la firma con i certificati conservati in una banca dati (db) e rifiuta tutto ciò che compare nella lista delle firme revocate (dbx). Un programma modificato anche di un solo byte non parte: è la difesa contro i <em>bootkit</em>, virus che si annidano prima del sistema operativo, dove gli antivirus non arrivano. Windows 8, nel 2012, lo rese obbligatorio sui PC certificati, e Windows 11 (2021) richiede un firmware UEFI che lo supporti. Molte distribuzioni Linux usano un piccolo caricatore firmato, shim, che a sua volta verifica GRUB e il kernel.',
        ],
      },
      {
        tipo: 'numeri',
        items: [
          { valore: 512, unita: 'byte', etichetta: 'il settore di avvio: fino a 446 di codice, 64 di tabella delle partizioni e 2 di firma' },
          { valore: 16, unita: 'byte', etichetta: 'fra la prima istruzione dell\'8088, a FFFF0h, e la fine del megabyte: c\'è posto solo per un salto' },
          { valore: 31744, etichetta: 'l\'indirizzo 7C00h in decimale: 32 KB meno 1 KB, dove il BIOS copia il settore di avvio' },
          { valore: 2.2, decimali: 1, unita: 'TB', etichetta: 'il disco più grande per la tabella MBR: 2<sup>32</sup> settori da 512 byte' },
        ],
      },
      {
        tipo: 'schede',
        titolo: 'Le tappe dell\'avvio, 1976–2021',
        items: [
          { anno: 1976, nome: 'Il BIOS del CP/M', luogo: 'Digital Research, Pacific Grove (California)', testo: 'Per adattare il CP/M ai dischi dell\'IMSAI, Gary Kildall e Glenn Ewing ne separano le routine che dipendono dall\'hardware: nasce il BIOS. L\'anno è quello ricordato da Kildall; alcune fonti indicano il 1975.' },
          { anno: 1981, nome: 'Il settore di avvio a 7C00h', luogo: 'IBM, Boca Raton (Florida)', testo: 'Dopo il POST, il BIOS dell\'IBM PC copia il primo settore del dischetto all\'indirizzo 0000:7C00 e ci salta. Senza dischetto parte il BASIC registrato in ROM.' },
          { anno: 1983, nome: 'MBR e tabella delle partizioni', luogo: 'IBM, Boca Raton (Florida)', testo: 'Con il PC/XT e il PC DOS 2.0 arriva il disco rigido, e con lui il master boot record: codice, quattro voci da 16 byte per le partizioni e la firma 55h AAh. Il disco si prepara con il programma FDISK.' },
          { anno: 1994, nome: 'BIOS Plug and Play', luogo: 'Compaq, Phoenix e Intel', testo: 'La specifica permette al BIOS di riconoscere le schede di espansione e di assegnare interruzioni e canali DMA senza ponticelli né conflitti.' },
          { anno: 1996, nome: 'ACPI 1.0', luogo: 'Intel, Microsoft e Toshiba', testo: 'Il firmware descrive l\'hardware al sistema operativo con tabelle standard e gli affida la gestione dell\'energia: sospensione, ventole, batterie.' },
          { anno: 1998, nome: 'Intel Boot Initiative, poi EFI', luogo: 'Intel (Stati Uniti)', testo: 'Comincia il progetto di un firmware nuovo per i server con Itanium a 64 bit, scritto in C, con driver e file system. Diventerà EFI.' },
          { anno: 1999, nome: 'LinuxBIOS, poi coreboot', luogo: 'Los Alamos National Laboratory (Nuovo Messico)', testo: 'Ron Minnich avvia un firmware libero che prepara l\'hardware e passa subito il comando al sistema operativo. Dal 2008 si chiama coreboot e avvia, fra l\'altro, molti Chromebook.' },
          { anno: 2005, nome: 'Unified EFI Forum', luogo: 'Consorzio di aziende', testo: 'Intel affida la specifica EFI 1.10 a un consorzio di costruttori e produttori di software, che la ribattezza UEFI e nel gennaio 2006 pubblica la versione 2.0.' },
          { anno: 2006, nome: 'I Mac con processore Intel', luogo: 'Apple, Cupertino (California)', testo: 'Presentati a gennaio, avviano con EFI invece che con il BIOS: è uno dei primi usi su larga scala del nuovo firmware in un personal computer.' },
          { anno: 2011, nome: 'Secure Boot', luogo: 'Unified EFI Forum', testo: 'La specifica UEFI 2.3.1, pubblicata in aprile, introduce l\'avvio sicuro: il firmware esegue solo driver e caricatori con una firma digitale valida. Windows 8 lo renderà obbligatorio sui PC certificati nel 2012.' },
          { anno: 2017, nome: 'Intel annuncia la fine del CSM', luogo: 'Intel (Stati Uniti)', testo: 'Entro il 2020 le piattaforme Intel abbandoneranno il modulo che imita il vecchio BIOS: i PC si avvieranno solo in modalità UEFI.' },
          { anno: 2021, nome: 'Windows 11', luogo: 'Microsoft, Redmond (Washington)', testo: 'Richiede un firmware UEFI capace di Secure Boot e un modulo di sicurezza TPM 2.0, anche integrato nel processore: il vecchio avvio con il BIOS non è più ammesso.' },
        ],
      },
    ],
    lab: {
      titolo: 'Premi il tasto di accensione',
      sottotitolo: 'Accendi un IBM PC del 1981, un compatibile del 1989 o un PC di oggi e segui l\'avvio fase per fase',
      crea: creaLab,
    },
    punti: [
      'Accendere un computer è un problema di <strong>bootstrap</strong>: serve un programma per caricare i programmi. Il primo caricatore si inseriva a mano o da nastro, poi è finito in una ROM.',
      'La sigla BIOS nasce con il CP/M (1975–1976). Nell\'IBM PC (1981) il BIOS sta in ROM: l\'8088 parte da FFFF0h, il POST controlla la macchina e un bip breve vuol dire «tutto a posto».',
      'L\'interruzione 19h copia il primo settore del disco (512 byte) a 0000:7C00 e ci salta. Dal 1983 l\'MBR contiene anche la tabella delle quattro partizioni e la firma 55h AAh.',
      'Setup e memoria CMOS (1984), Plug and Play (1994) e ACPI (1996) hanno allungato la vita al BIOS, ma non ne hanno tolto i limiti: 16 bit, 1 MB di indirizzi, dischi fino a 2,2 TB.',
      'UEFI (2006), nato come EFI di Intel per Itanium, è un piccolo sistema operativo: fasi SEC, PEI, DXE e BDS, tabella GPT, caricatori .efi nella partizione di sistema EFI.',
      'Secure Boot (UEFI 2.3.1, 2011) esegue solo driver e caricatori con una firma digitale valida: un byte cambiato basta a bloccare l\'avvio.',
    ],
    collegamenti: [
      { testo: 'Bus SPI', href: '../../index.html#/bus/spi', tipo: 'buslab' },
      { testo: 'Bus SMBus', href: '../../index.html#/bus/smbus', tipo: 'buslab' },
      { testo: 'Bus ISA', href: '../../index.html#/bus/isa', tipo: 'buslab' },
      { testo: 'Sezione 5 · Le memorie: ROM, EPROM, flash', href: '../chip-programmabili/index.html#memorie', tipo: 'sezione' },
      { testo: 'Sezione 5 · L\'8086 e l\'8088', href: '../chip-programmabili/index.html#sedici-bit', tipo: 'sezione' },
      { testo: 'Sezione 2 · L\'alimentatore', href: '../elettronica-intermedia/index.html#alimentatore', tipo: 'sezione' },
      { testo: 'Sezione 7 · Il linguaggio assembly', href: '../programmazione/index.html#assembly', tipo: 'sezione' },
      { testo: 'Capitolo 3 · Il pannello dell\'Altair', href: '#primi-pc', tipo: 'sezione' },
      { testo: 'Capitolo 4 · Il BIOS e la mappa della memoria', href: '#ibm-pc', tipo: 'sezione' },
      { testo: 'Capitolo 5 · La scheda madre', href: '#scheda-madre', tipo: 'sezione' },
      { testo: 'Quiz del capitolo', href: '../quiz/index.html#storia-pc/avvio', tipo: 'sezione' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
