/*
 * Capitolo 6 · Il computer in un chip: logica pura del laboratorio «Il frigorifero intelligente».
 * Nessun accesso al DOM: la usano js/microcontrollori.js e i test (test/microcontrollori.test.js).
 *
 * Il modello è un frigorifero ventilato («no frost») comandato da un microcontrollore didattico:
 *   - fisica a parametri concentrati (cella, evaporatore, brina), integrata a passi di 1 secondo simulato;
 *   - sonda NTC 10 kΩ (B 3435 K) in un partitore con 10 kΩ, letta da un ADC a 10 bit con riferimento 5 V;
 *   - il programma del chip, riga per riga: ciclo principale, sbrinamento, interruzione della porta
 *     e interruzione del timer. La stessa funzione exec() serve al ciclo veloce (control) e alla vista
 *     al rallentatore, così quello che si vede nel listato è esattamente quello che decide il chip.
 * I parametri sono valori di esempio, simili a quelli dei regolatori per la refrigerazione:
 * il compressore si ferma al SET e riparte a SET + differenziale, dopo un ritardo di antipendolazione.
 */
(function (root) {
  'use strict';

  const DEFAULTS = {
    ambient: 25,            // °C nella cucina
    set: 4,                 // SET: temperatura impostata
    diff: 2,                // differenziale: il compressore riparte a SET + DIFF
    ac: 180,                // s, antipendolazione: tempo minimo da fermo prima di ripartire
    defrostEvery: 6 * 3600, // s tra due sbrinamenti (contati dal timer)
    defrostEnd: 8,          // °C sull'evaporatore che chiudono lo sbrinamento
    defrostMax: 30 * 60,    // s, durata massima di sicurezza dello sbrinamento
    doorAlarm: 60,          // s di porta aperta prima dell'allarme
  };

  // Sonda NTC sul ramo alto del partitore, resistenza fissa verso massa: più caldo, più tensione.
  const NTC = { r25: 10000, beta: 3435, rFix: 10000, vref: 5 };
  const ADC_MAX = 1023;
  const K0 = 273.15;

  // Costanti del modello termico (unità: frazioni di grado al secondo, cella = massa 1).
  const PHYS = {
    uaWall: 6.5e-5,   // scambio con la cucina attraverso le pareti
    uaDoor: 2.2e-3,   // in più con la porta aperta
    hFan: 3.0e-4,     // aria della cella ↔ evaporatore, ventola accesa
    natural: 0.12,    // frazione dello scambio quando la ventola è ferma
    cEvap: 0.08,      // massa termica dell'evaporatore rispetto alla cella
    kRef: 3.2e-4,     // resa frigorifera del compressore
    tFloor: -28,      // temperatura verso cui il compressore spinge l'evaporatore
    qHeat: 0.012,     // resistenza di sbrinamento
    latent: 7.2,      // calore che serve a sciogliere tutta la brina (brina = 1)
    frostRun: 7e-5,   // brina che si deposita ogni secondo con il compressore acceso
    frostDoor: 1.2e-3, // brina in più ogni secondo di porta aperta (aria umida)
    frostLoss: 0.5,   // con brina = 1 lo scambio cala del 50 %
  };

  const OUTS = ['luce', 'vent', 'res', 'comp'];

  /* ---------- formati all'italiana ---------- */

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function num1(x) {
    const r = Math.round(x * 10) / 10;
    return (Object.is(r, -0) ? 0 : r).toFixed(1).replace('.', ',').replace('-', '−');
  }
  function num2(x) { return x.toFixed(2).replace('.', ',').replace('-', '−'); }
  function temp(x) { return num1(x) + ' °C'; }
  function two(n) { return String(n).padStart(2, '0'); }
  /** 135 → "2:15" (minuti:secondi) */
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + two(sec % 60); }
  /** 8100 → "02:15" (ore:minuti) */
  function clock(sec) { sec = Math.max(0, Math.floor(sec)); return two(Math.floor(sec / 3600)) + ':' + two(Math.floor(sec / 60) % 60); }
  /** 18720 → "5 h 12 min", 300 → "5 min" */
  function hm(sec) {
    const m = Math.max(0, Math.ceil(sec / 60));
    const hh = Math.floor(m / 60);
    return hh ? hh + ' h ' + two(m % 60) + ' min' : m + ' min';
  }

  /* ---------- sonda NTC e convertitore analogico-digitale ---------- */

  function ntcResistance(tC) { return NTC.r25 * Math.exp(NTC.beta * (1 / (tC + K0) - 1 / (25 + K0))); }
  /** Tensione all'ingresso dell'ADC, in volt. */
  function adcVolts(tC) { const r = ntcResistance(tC); return NTC.vref * NTC.rFix / (NTC.rFix + r); }
  /** Numero a 10 bit (0–1023) che l'ADC legge alla temperatura tC. */
  function adcCode(tC) { return clamp(Math.round(adcVolts(tC) / NTC.vref * ADC_MAX), 1, ADC_MAX - 1); }
  /** Il contrario, come fa la tabella nella ROM: dal numero ai gradi, arrotondati al decimo. */
  function codeToTemp(code) {
    const c = clamp(code, 1, ADC_MAX - 1);
    const r = NTC.rFix * (ADC_MAX / c - 1);
    const t = 1 / (1 / (25 + K0) + Math.log(r / NTC.r25) / NTC.beta) - K0;
    return Math.round(t * 10) / 10;
  }

  /* ---------- il programma nella ROM ---------- */

  // data: trasferimenti sul bus dei dati; prog: letture di costanti dalla memoria del programma.
  // bytes: codice macchina di un chip immaginario (serve solo a mostrare che nella ROM ci sono numeri).
  const PROGRAM = [
    {
      sec: 'main', title: 'Ciclo principale', note: 'si ripete all\'infinito', lines: [
        { id: '0100', code: 'codice ← ADC canale 0', bytes: [0xE5, 0xA0], data: 1, phase: 'leggi' },
        { id: '0102', code: 'T ← tabella NTC [codice]', bytes: [0x93, 0x0F], prog: 1, phase: 'leggi' },
        { id: '0104', code: 'se SBRINA = 1: vai a 0120', bytes: [0x20, 0x10, 0x1A], data: 1, phase: 'decidi' },
        { id: '0106', code: 'se T ≥ SET + DIFF: COMP ← 1', bytes: [0xB4, 0x3C, 0x02], data: 1, phase: 'decidi' },
        { id: '0108', code: 'se T ≤ SET: COMP ← 0', bytes: [0xB5, 0x28, 0x02], phase: 'decidi' },
        { id: '010A', code: 'VENT ← COMP e porta chiusa', bytes: [0xA2, 0xB2], data: 1, phase: 'decidi' },
        { id: '010C', code: 'P1, P2 ← uscite (relè)', bytes: [0xF5, 0x90], data: 2, phase: 'scrivi' },
        { id: '010E', code: 'UART ← T (al display)', bytes: [0xF5, 0x99], data: 1, phase: 'scrivi' },
        { id: '0110', code: 'vai a 0100', bytes: [0x80, 0xEE], phase: 'scrivi' },
      ],
    },
    {
      sec: 'sbrina', title: 'Sbrinamento', note: 'quando SBRINA = 1', lines: [
        { id: '0120', code: 'Tev ← ADC canale 1', bytes: [0xE5, 0xA1], data: 1, phase: 'sbrina' },
        { id: '0122', code: 'COMP ← 0 · VENT ← 0 · RES ← 1', bytes: [0x75, 0xA0, 0x04], phase: 'sbrina' },
        { id: '0124', code: 'se Tev ≥ 8 °C: RES, SBRINA ← 0', bytes: [0xB4, 0x08, 0x05], data: 1, phase: 'sbrina' },
        { id: '0126', code: 'vai a 010C', bytes: [0x80, 0xE4], phase: 'sbrina' },
      ],
    },
    {
      sec: 'porta', title: 'Interruzione della porta', note: 'piedino INT0', isr: true, lines: [
        { id: '0200', code: 'se aperta: LUCE ← 1, VENT ← 0', bytes: [0x30, 0xB2, 0x06], data: 1, phase: 'porta' },
        { id: '0202', code: 'se chiusa: LUCE, ALLARME ← 0', bytes: [0xC2, 0x90], phase: 'porta' },
        { id: '0204', code: 'P1 ← uscite', bytes: [0xF5, 0x90], data: 1, phase: 'porta' },
        { id: '0206', code: 'RETI: torna dove eri', bytes: [0x32], data: 1, phase: 'porta' },
      ],
    },
    {
      sec: 'timer', title: 'Interruzione del timer', note: 'ogni secondo', isr: true, lines: [
        { id: '0300', code: 'secondi ← secondi + 1', bytes: [0x05, 0x30], data: 1, phase: 'timer' },
        { id: '0302', code: 'se secondi ≥ 6 h: SBRINA ← 1', bytes: [0xB4, 0x54, 0x02], data: 1, phase: 'timer' },
        { id: '0304', code: 'se aperta da 60 s: ALLARME ← 1', bytes: [0x20, 0xB2, 0x03], data: 1, phase: 'timer' },
        { id: '0306', code: 'RETI', bytes: [0x32], data: 1, phase: 'timer' },
      ],
    },
  ];

  const LINES = {};
  PROGRAM.forEach((sec) => sec.lines.forEach((l, i) => {
    l.sec = sec.sec;
    l.index = i;
    l.addr = parseInt(l.id, 16);
    l.data = l.data || 0;
    l.prog = l.prog || 0;
    LINES[l.id] = l;
  }));

  /** Cicli di bus per un giro del ciclo principale: 'harvard' (prelievo e dati in parallelo) o 'vn' (a turno). */
  function busCycles(arch, sec) {
    const s = PROGRAM.find((x) => x.sec === (sec || 'main'));
    return s.lines.reduce((sum, l) => sum + (arch === 'vn' ? 1 + l.data + l.prog : Math.max(1, l.data) + l.prog), 0);
  }

  /** Durata relativa di una riga: quante «mosse» di bus servono (1 = un ciclo). */
  function lineCycles(arch, id) {
    const l = LINES[id];
    if (!l) return 1;
    return arch === 'vn' ? 1 + l.data + l.prog : Math.max(1, l.data) + l.prog;
  }

  /* ---------- stato ---------- */

  function create(params, opts) {
    const p = Object.assign({}, DEFAULTS, params || {});
    const t0 = opts && opts.start != null ? opts.start : p.ambient;
    const c0 = adcCode(t0);
    return {
      p: p,
      t: 0,             // secondi simulati dall'accensione
      acc: 0,           // frazione di secondo non ancora integrata
      tc: t0,           // temperatura vera della cella
      te: t0,           // temperatura vera dell'evaporatore
      frost: opts && opts.frost != null ? opts.frost : 0, // brina sull'evaporatore, da 0 a 1
      door: false,
      defrost: false,   // il flag SBRINA nella RAM
      defrostStart: 0,
      defrostFrost: 0,  // brina sulle alette quando lo sbrinamento è cominciato
      defrostSource: null,
      alarm: false,
      want: { luce: 0, vent: 0, res: 0, comp: 0 }, // uscite decise dal programma (registri)
      out: { luce: 0, vent: 0, res: 0, comp: 0 },  // uscite scritte sui piedini (relè)
      offSince: -p.ac,  // istante dell'ultimo arresto del compressore
      onSince: null,
      secCounter: 0,    // secondi contati dal timer dall'ultimo sbrinamento
      doorOpenFor: 0,
      reg: { code: c0, T: codeToTemp(c0), codeE: c0, Tev: codeToTemp(c0) },
      display: { T: codeToTemp(c0), alarm: false, sent: false },
      stats: { reachedSet: false, reachedAt: null, defrosts: 0, doorIrq: 0, compStarts: 0 },
    };
  }

  /** Scrive sui piedini le uscite decise (tutte, o solo quelle di keys). Restituisce quelle cambiate. */
  function commit(s, keys) {
    const changed = [];
    (keys || OUTS).forEach((k) => {
      if (s.out[k] !== s.want[k]) { s.out[k] = s.want[k]; changed.push(k); }
    });
    return changed;
  }

  function mv(from, to, kind, label) { return { from: from, to: to, kind: kind, label: label }; }
  function bitsP1(o) { return 'L' + o.luce + ' V' + o.vent; }
  function bitsP2(o) { return 'R' + o.res + ' C' + o.comp; }

  /**
   * Esegue una riga del programma sullo stato s e restituisce che cosa è successo:
   * { id, res (testo breve), ok (condizione vera/falsa o null), moves (trasferimenti da mostrare),
   *   next (riga seguente o null per RETI), events, commit, wait }.
   * extra.ret: indirizzo di ritorno, per RETI.
   */
  function exec(s, id, extra) {
    const p = s.p;
    const r = { id: id, res: '', ok: null, moves: [], next: null, events: [], commit: false, wait: false };
    switch (id) {
      case '0100': {
        const code = adcCode(s.tc);
        s.reg.code = code;
        r.res = '→ ' + code;
        r.moves = [mv('probeC', 'adc', 'analog', num2(adcVolts(s.tc)) + ' V'), mv('adc', 'cpu', 'data', String(code))];
        r.next = '0102';
        break;
      }
      case '0102': {
        s.reg.T = codeToTemp(s.reg.code);
        r.res = '→ ' + temp(s.reg.T);
        r.moves = [mv('rom', 'cpu', 'prog', temp(s.reg.T))];
        r.next = '0104';
        break;
      }
      case '0104': {
        r.ok = s.defrost;
        r.res = s.defrost ? 'sì: salta' : 'no';
        r.moves = [mv('ram', 'cpu', 'data', 'SBRINA ' + (s.defrost ? 1 : 0))];
        r.next = s.defrost ? '0120' : '0106';
        break;
      }
      case '0106': {
        const T = s.reg.T;
        const lim = p.set + p.diff;
        r.moves = [mv('ram', 'cpu', 'data', 'SET ' + num1(p.set))];
        if (T < lim) { r.ok = false; r.res = num1(T) + ' < ' + num1(lim); }
        else if (s.want.comp) { r.ok = true; r.res = 'già acceso'; }
        else if (s.t - s.offSince < p.ac) {
          r.ok = false; r.wait = true;
          r.res = 'aspetta ' + mmss(p.ac - (s.t - s.offSince));
        } else {
          r.ok = true;
          s.want.comp = 1;
          s.onSince = s.t;
          s.stats.compStarts++;
          r.res = 'COMP ← 1';
          r.events.push('comp-on');
        }
        r.next = '0108';
        break;
      }
      case '0108': {
        const T = s.reg.T;
        if (T > p.set) { r.ok = false; r.res = num1(T) + ' > ' + num1(p.set); }
        else if (!s.want.comp) { r.ok = true; r.res = 'già spento'; }
        else {
          r.ok = true;
          s.want.comp = 0;
          s.offSince = s.t;
          r.res = 'COMP ← 0';
          r.events.push('comp-off');
          if (!s.stats.reachedSet) {
            s.stats.reachedSet = true;
            s.stats.reachedAt = s.t;
            r.events.push('set-reached');
          }
        }
        r.next = '010A';
        break;
      }
      case '010A': {
        const v = s.want.comp && !s.door ? 1 : 0;
        s.want.vent = v;
        r.res = 'VENT ← ' + v;
        r.moves = [mv('int', 'cpu', 'data', 'porta ' + (s.door ? 1 : 0))];
        r.next = '010C';
        break;
      }
      case '010C': {
        r.events.push.apply(r.events, commit(s).map((k) => 'out-' + k));
        r.commit = true;
        r.res = bitsP1(s.out) + ' ' + bitsP2(s.out);
        r.moves = [mv('cpu', 'p1', 'data', bitsP1(s.out)), mv('cpu', 'p2', 'data', bitsP2(s.out))];
        r.next = '010E';
        break;
      }
      case '010E': {
        s.display = { T: s.reg.T, alarm: s.alarm, sent: true };
        r.res = '→ ' + temp(s.reg.T) + (s.alarm ? ' !' : '');
        r.moves = [mv('cpu', 'uart', 'data', num1(s.reg.T)), mv('uart', 'display', 'serial', s.alarm ? num1(s.reg.T) + ' !' : num1(s.reg.T))];
        r.next = '0110';
        break;
      }
      case '0110': {
        r.res = '↺';
        r.next = '0100';
        break;
      }
      case '0120': {
        const code = adcCode(s.te);
        s.reg.codeE = code;
        s.reg.Tev = codeToTemp(code);
        r.res = '→ ' + temp(s.reg.Tev);
        r.moves = [mv('probeE', 'adc', 'analog', num2(adcVolts(s.te)) + ' V'), mv('adc', 'cpu', 'data', String(code))];
        r.next = '0122';
        break;
      }
      case '0122': {
        if (!s.defrost) { r.res = 'già finito'; r.next = '0124'; break; }
        if (s.want.comp) { s.want.comp = 0; s.offSince = s.t; r.events.push('comp-off'); }
        s.want.vent = 0;
        if (!s.want.res) r.events.push('heater-on');
        s.want.res = 1;
        r.res = 'RES ← 1';
        r.next = '0124';
        break;
      }
      case '0124': {
        const end = s.reg.Tev >= p.defrostEnd || s.t - s.defrostStart >= p.defrostMax;
        r.ok = end || !s.defrost;
        if (!s.defrost) {
          r.res = 'già finito';
        } else if (end) {
          s.want.res = 0;
          s.defrost = false;
          s.secCounter = 0;
          s.stats.defrosts++;
          r.res = 'RES ← 0';
          r.moves = [mv('cpu', 'ram', 'data', 'SBRINA 0')];
          r.events.push('defrost-end');
        } else {
          r.res = num1(s.reg.Tev) + ' < ' + num1(p.defrostEnd);
        }
        r.next = '0126';
        break;
      }
      case '0126': {
        r.res = '→ 010C';
        r.next = '010C';
        break;
      }
      case '0200': {
        r.ok = s.door;
        r.moves = [mv('int', 'cpu', 'data', 'porta ' + (s.door ? 1 : 0))];
        if (s.door) { s.want.luce = 1; s.want.vent = 0; r.res = 'L1 V0'; }
        else r.res = 'chiusa';
        r.next = '0202';
        break;
      }
      case '0202': {
        r.ok = !s.door;
        if (!s.door) { s.want.luce = 0; s.alarm = false; r.res = 'L0 · ALL. 0'; }
        else r.res = '—';
        r.next = '0204';
        break;
      }
      case '0204': {
        // la routine scrive soltanto la porta P1 (luce e ventola); P2 resta al ciclo principale
        r.events.push.apply(r.events, commit(s, ['luce', 'vent']).map((k) => 'out-' + k));
        r.commit = true;
        r.res = bitsP1(s.out);
        r.moves = [mv('cpu', 'p1', 'data', bitsP1(s.out))];
        r.next = '0206';
        break;
      }
      case '0206':
      case '0306': {
        const ret = extra && extra.ret ? extra.ret : '0100';
        r.res = 'torna a ' + ret;
        r.moves = [mv('ram', 'cpu', 'addr', 'PC ' + ret)];
        r.next = null;
        break;
      }
      // Interruzione del timer: il conteggio avviene in timerTick(); qui la si rivede riga per riga.
      case '0300': {
        r.res = 'conta ' + clock(s.secCounter);
        r.moves = [mv('timer', 'cpu', 'data', '+1 s')];
        r.next = '0302';
        break;
      }
      case '0302': {
        r.ok = s.defrost;
        r.res = s.defrost ? 'SBRINA ← 1' : 'non ancora';
        if (s.defrost) r.moves = [mv('cpu', 'ram', 'data', 'SBRINA 1')];
        r.next = '0304';
        break;
      }
      case '0304': {
        r.ok = s.alarm;
        r.res = s.alarm ? 'ALLARME ← 1' : (s.door ? 'aperta ' + mmss(s.doorOpenFor) : 'chiusa');
        if (s.alarm) r.moves = [mv('cpu', 'ram', 'data', 'ALLARME 1')];
        r.next = '0306';
        break;
      }
      default:
        r.res = '?';
    }
    return r;
  }

  /** Un giro completo del ciclo principale, senza rallentatore (come fa il chip vero). */
  function control(s) {
    const events = [];
    let id = '0100';
    for (let guard = 0; id && guard < 24; guard++) {
      const r = exec(s, id);
      events.push.apply(events, r.events);
      if (id === '0110') break;
      id = r.next;
    }
    return events;
  }

  /** Avvia lo sbrinamento (dal timer o dal tasto manuale). Le uscite cambiano al giro seguente. */
  function startDefrost(s, source) {
    if (s.defrost) return false;
    s.defrost = true;
    s.defrostStart = s.t;
    s.defrostFrost = s.frost;
    s.defrostSource = source || 'manual';
    return true;
  }

  /** Interruzione del timer, una volta al secondo. */
  function timerTick(s) {
    const p = s.p;
    const events = [];
    if (!s.defrost) {
      s.secCounter += 1;
      if (s.secCounter >= p.defrostEvery && startDefrost(s, 'timer')) events.push('defrost-start');
    }
    if (s.door) {
      s.doorOpenFor += 1;
      if (s.doorOpenFor >= p.doorAlarm && !s.alarm) { s.alarm = true; events.push('alarm'); }
    }
    return events;
  }

  /**
   * Il microinterruttore della porta: cambia lo stato e chiede l'interruzione.
   * Con immediate la routine viene eseguita subito (modo veloce); altrimenti la esegue la vista, riga per riga.
   */
  function setDoor(s, open, immediate) {
    open = !!open;
    if (s.door === open) return [];
    s.door = open;
    s.doorOpenFor = 0;
    if (open) s.stats.doorIrq++;
    const events = [open ? 'door-open' : 'door-close'];
    if (immediate) ['0200', '0202', '0204'].forEach((id) => { events.push.apply(events, exec(s, id).events); });
    return events;
  }

  /** Fisica del frigorifero per dt secondi (dt ≤ 1). */
  function physics(s, dt) {
    const p = s.p;
    const o = s.out;
    const K = PHYS;
    const fan = o.vent ? 1 : K.natural;
    const frostF = 1 - K.frostLoss * s.frost;
    const qEx = K.hFan * fan * frostF * (s.tc - s.te);
    const qAmb = K.uaWall * (p.ambient - s.tc) + (s.door ? K.uaDoor * (p.ambient - s.tc) : 0);
    const qRef = o.comp ? K.kRef * (s.te - K.tFloor) : 0;
    const qHeat = o.res ? K.qHeat : 0;
    s.tc += (qAmb - qEx) * dt;
    const dTe = (qEx - qRef + qHeat) / K.cEvap;
    if (s.frost > 0 && s.te >= 0 && dTe > 0) {
      // il calore scioglie la brina: finché c'è ghiaccio l'evaporatore resta a 0 °C
      s.frost = Math.max(0, s.frost - dTe * K.cEvap * dt / K.latent);
      s.te = 0;
    } else {
      const next = s.te + dTe * dt;
      s.te = s.frost > 0 && s.te < 0 && next > 0 ? 0 : next;
    }
    if (o.comp && s.te < -2) s.frost += K.frostRun * dt;
    if (s.door) s.frost += K.frostDoor * dt;
    s.frost = Math.min(1, s.frost);
  }

  /**
   * Fa avanzare il tempo di dt secondi simulati, a passi di 1 s.
   * opts.control: esegue anche il ciclo principale a ogni secondo (modo veloce).
   * Restituisce gli eventi accaduti, in ordine.
   */
  function advance(s, dt, opts) {
    const events = [];
    s.acc += Math.max(0, dt);
    while (s.acc >= 1) {
      s.acc -= 1;
      physics(s, 1);
      s.t += 1;
      events.push.apply(events, timerTick(s));
      if (opts && opts.control) events.push.apply(events, control(s));
    }
    return events;
  }

  /** Copia indipendente dello stato: la vista la usa per mostrare una riga senza cambiare nulla. */
  function clone(s) {
    return {
      p: Object.assign({}, s.p),
      t: s.t, acc: s.acc, tc: s.tc, te: s.te, frost: s.frost, door: s.door,
      defrost: s.defrost, defrostStart: s.defrostStart, defrostFrost: s.defrostFrost, defrostSource: s.defrostSource, alarm: s.alarm,
      want: Object.assign({}, s.want), out: Object.assign({}, s.out),
      offSince: s.offSince, onSince: s.onSince, secCounter: s.secCounter, doorOpenFor: s.doorOpenFor,
      reg: Object.assign({}, s.reg), display: Object.assign({}, s.display), stats: Object.assign({}, s.stats),
    };
  }

  /** Temperatura misurata dalla sonda della cella (quella che vede il chip). */
  function measuredCell(s) { return codeToTemp(adcCode(s.tc)); }
  function measuredEvap(s) { return codeToTemp(adcCode(s.te)); }

  const api = {
    DEFAULTS: DEFAULTS,
    NTC: NTC,
    ADC_MAX: ADC_MAX,
    PHYS: PHYS,
    OUTS: OUTS,
    PROGRAM: PROGRAM,
    LINES: LINES,
    busCycles: busCycles,
    lineCycles: lineCycles,
    ntcResistance: ntcResistance,
    adcVolts: adcVolts,
    adcCode: adcCode,
    codeToTemp: codeToTemp,
    create: create,
    clone: clone,
    exec: exec,
    control: control,
    commit: commit,
    startDefrost: startDefrost,
    timerTick: timerTick,
    setDoor: setDoor,
    physics: physics,
    advance: advance,
    measuredCell: measuredCell,
    measuredEvap: measuredEvap,
    fmt: { num1: num1, num2: num2, temp: temp, mmss: mmss, clock: clock, hm: hm },
  };
  root.MicrocontrolloriCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
