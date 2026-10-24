// Test della logica pura del laboratorio "Il frigorifero intelligente": node --test test/microcontrollori.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/microcontrollori-core.js');

function runFast(s, seconds, onEvent) {
  for (let i = 0; i < seconds; i++) {
    const ev = M.advance(s, 1, { control: true });
    if (onEvent) ev.forEach((e) => onEvent(e, s));
  }
}

test('sonda NTC 10 kΩ: a 25 °C il partitore dà metà tensione e l\'ADC a 10 bit legge circa 512', () => {
  assert.ok(Math.abs(M.ntcResistance(25) - 10000) < 1e-6);
  assert.ok(Math.abs(M.adcVolts(25) - 2.5) < 1e-9);
  assert.strictEqual(M.adcCode(25), 512);
  // più freddo: resistenza più alta, tensione e numero più bassi
  assert.ok(M.ntcResistance(4) > M.ntcResistance(25));
  assert.strictEqual(M.adcCode(4), 301);
  assert.strictEqual(M.codeToTemp(301), 4);
});

test('la tabella della ROM ritrova la temperatura con un errore sotto 0,15 °C, e l\'ADC cresce con la temperatura', () => {
  let prev = -1;
  for (let t = -30; t <= 50; t += 0.5) {
    const code = M.adcCode(t);
    assert.ok(code >= prev, 'monotono a ' + t);
    prev = code;
    assert.ok(Math.abs(M.codeToTemp(code) - t) < 0.15, 'conversione a ' + t + ' °C');
  }
  assert.ok(M.adcCode(-200) >= 1 && M.adcCode(200) <= 1022, 'il numero resta nei 10 bit');
});

test('il programma: righe uniche, indirizzi coerenti, salti verso righe esistenti', () => {
  const ids = [];
  M.PROGRAM.forEach((sec) => {
    let last = -1;
    sec.lines.forEach((l) => {
      ids.push(l.id);
      assert.match(l.id, /^[0-9A-F]{4}$/);
      assert.ok(l.addr > last, 'indirizzi crescenti in ' + sec.sec);
      last = l.addr;
      assert.ok(l.code.length > 3 && l.code.length <= 30, 'riga leggibile: ' + l.code);
      assert.ok(Array.isArray(l.bytes) && l.bytes.length >= 1);
    });
  });
  assert.strictEqual(new Set(ids).size, ids.length);
  const s = M.create();
  ids.forEach((id) => {
    const r = M.exec(M.create(), id, { ret: '0106' });
    if (r.next) assert.ok(M.LINES[r.next], id + ' salta a ' + r.next);
    r.moves.forEach((m) => assert.ok(m.from && m.to && m.kind && m.label != null));
  });
  assert.ok(s);
});

test('Harvard contro von Neumann: 11 cicli di bus per giro contro 17', () => {
  assert.strictEqual(M.busCycles('harvard'), 11);
  assert.strictEqual(M.busCycles('vn'), 17);
  assert.strictEqual(M.lineCycles('harvard', '0100'), 1);
  assert.strictEqual(M.lineCycles('vn', '0100'), 2);
  assert.strictEqual(M.lineCycles('vn', '0110'), 1);
});

test('a frigo caldo il primo giro del programma accende compressore e ventola', () => {
  const s = M.create();
  const seen = [];
  let id = '0100';
  for (let i = 0; i < 9; i++) {
    const r = M.exec(s, id);
    seen.push(id);
    if (id === '010C') {
      assert.strictEqual(r.commit, true);
      assert.strictEqual(s.out.comp, 1);
      assert.strictEqual(s.out.vent, 1);
    }
    id = r.next;
  }
  assert.deepStrictEqual(seen, ['0100', '0102', '0104', '0106', '0108', '010A', '010C', '010E', '0110']);
  assert.strictEqual(id, '0100');
  assert.strictEqual(s.display.T, M.codeToTemp(M.adcCode(25)));
});

test('senza il ciclo del programma le uscite non cambiano: decide la CPU, non la fisica', () => {
  const s = M.create();
  M.advance(s, 30);
  assert.deepStrictEqual(s.out, { luce: 0, vent: 0, res: 0, comp: 0 });
  M.control(s);
  assert.strictEqual(s.out.comp, 1);
});

test('messa a regime: da 25 °C la cella arriva al SET in meno di 3 ore', () => {
  const s = M.create();
  let reachedAt = null;
  runFast(s, 3 * 3600, (e, st) => { if (e === 'set-reached') reachedAt = st.t; });
  assert.ok(reachedAt != null, 'set raggiunto');
  assert.ok(reachedAt > 30 * 60 && reachedAt < 150 * 60, 'tempo plausibile: ' + Math.round(reachedAt / 60) + ' min');
  assert.strictEqual(s.stats.reachedSet, true);
});

test('isteresi: a regime la cella resta fra SET e SET + DIFF e il compressore lavora a cicli', () => {
  const s = M.create();
  runFast(s, 2 * 3600);
  let min = 99, max = -99, on = 0, starts = 0;
  runFast(s, 3 * 3600, (e) => { if (e === 'comp-on') starts++; });
  // seconda passata per misurare
  const s2 = M.create();
  runFast(s2, 2 * 3600);
  for (let i = 0; i < 3 * 3600; i++) {
    M.advance(s2, 1, { control: true });
    min = Math.min(min, s2.tc);
    max = Math.max(max, s2.tc);
    if (s2.out.comp) on++;
  }
  const p = s2.p;
  assert.ok(min > p.set - 0.6 && max < p.set + p.diff + 0.6, 'escursione ' + min.toFixed(2) + '…' + max.toFixed(2));
  const duty = on / (3 * 3600);
  assert.ok(duty > 0.15 && duty < 0.6, 'percentuale di funzionamento ' + duty.toFixed(2));
  assert.ok(starts >= 2, 'più avviamenti in 3 ore');
});

test('antipendolazione: il compressore non riparte mai prima di 3 minuti da fermo', () => {
  const s = M.create({ diff: 0.3 }); // differenziale strettissimo: senza protezione ripartirebbe subito
  let lastOff = null;
  runFast(s, 4 * 3600, (e, st) => {
    if (e === 'comp-off') lastOff = st.t;
    if (e === 'comp-on' && lastOff != null) assert.ok(st.t - lastOff >= st.p.ac, 'ripartito dopo ' + (st.t - lastOff) + ' s');
  });
  // e la riga 0106 lo dice
  const w = M.create();
  w.offSince = 0; w.t = 60; w.reg.T = 9;
  const r = M.exec(w, '0106');
  assert.strictEqual(r.wait, true);
  assert.strictEqual(w.want.comp, 0);
  assert.match(r.res, /aspetta 2:00/);
});

test('interruzione della porta: luce accesa e ventola ferma subito, allarme dopo 60 s', () => {
  const s = M.create();
  runFast(s, 2 * 3600);
  const ev = M.setDoor(s, true, true);
  assert.ok(ev.includes('door-open'));
  assert.strictEqual(s.out.luce, 1);
  assert.strictEqual(s.out.vent, 0);
  assert.strictEqual(s.stats.doorIrq, 1);
  const before = s.tc;
  let alarmAt = null;
  runFast(s, 59, (e, st) => { if (e === 'alarm') alarmAt = st.t; });
  assert.strictEqual(s.alarm, false);
  assert.strictEqual(s.out.vent, 0, 'a porta aperta il ciclo principale tiene ferma la ventola');
  runFast(s, 2, (e, st) => { if (e === 'alarm') alarmAt = st.t; });
  assert.strictEqual(s.alarm, true);
  assert.ok(alarmAt != null);
  assert.ok(s.tc > before + 1, 'l\'aria calda entra');
  M.setDoor(s, false, true);
  assert.strictEqual(s.out.luce, 0);
  assert.strictEqual(s.alarm, false);
  assert.deepStrictEqual(M.setDoor(s, false, true), [], 'già chiusa: nessuna interruzione');
});

test('nella vista al rallentatore la routine della porta agisce solo quando viene eseguita', () => {
  const s = M.create();
  M.setDoor(s, true, false);
  assert.strictEqual(s.out.luce, 0);
  M.exec(s, '0200');
  assert.strictEqual(s.out.luce, 0, 'deciso ma non ancora scritto');
  const r = M.exec(s, '0204');
  assert.strictEqual(r.commit, true);
  assert.strictEqual(s.out.luce, 1);
  const ret = M.exec(s, '0206', { ret: '0106' });
  assert.strictEqual(ret.next, null);
  assert.match(ret.res, /0106/);
});

test('sbrinamento a tempo: dopo 6 ore resistenza accesa, evaporatore fermo a 0 °C finché c\'è brina, poi fine a 8 °C', () => {
  const s = M.create();
  let start = null, end = null, plateau = 0;
  runFast(s, 6 * 3600 + 3600, (e, st) => {
    if (e === 'defrost-start') start = st.t;
    if (e === 'defrost-end') end = st.t;
  });
  assert.ok(start != null && Math.abs(start - 6 * 3600) <= 1, 'parte dopo 6 ore');
  assert.ok(end != null && end > start, 'finisce');
  assert.ok(end - start < s.p.defrostMax, 'entro la durata massima');
  assert.strictEqual(s.stats.defrosts, 1);
  assert.ok(s.frost < 0.05, 'brina sciolta');
  // rifacciamo lo sbrinamento guardando dentro
  const d = M.create();
  runFast(d, 6 * 3600 - 5);
  const frost0 = d.frost;
  assert.ok(frost0 > 0.3, 'brina accumulata: ' + frost0.toFixed(2));
  for (let i = 0; i < 40 * 60 && d.stats.defrosts === 0; i++) {
    M.advance(d, 1, { control: true });
    if (d.defrost && d.t > 6 * 3600 + 2) {
      assert.strictEqual(d.out.res, 1);
      assert.strictEqual(d.out.comp, 0);
      assert.strictEqual(d.out.vent, 0);
      if (d.te === 0 && d.frost > 0) plateau++;
    }
  }
  assert.ok(plateau > 60, 'sosta a 0 °C mentre il ghiaccio fonde: ' + plateau + ' s');
  assert.strictEqual(d.out.res, 0);
  assert.strictEqual(d.secCounter < 60, true, 'il timer ricomincia a contare');
});

test('sbrinamento a mano e durata massima di sicurezza', () => {
  const s = M.create();
  runFast(s, 2 * 3600);
  assert.strictEqual(M.startDefrost(s, 'manual'), true);
  assert.strictEqual(M.startDefrost(s, 'manual'), false, 'già in corso');
  let ended = false;
  runFast(s, 40 * 60, (e) => { if (e === 'defrost-end') ended = true; });
  assert.ok(ended);
  // resistenza «guasta»: l'evaporatore non scalda, interviene il tempo massimo
  const g = M.create();
  runFast(g, 2 * 3600);
  M.startDefrost(g, 'manual');
  const p = g.p;
  for (let i = 0; i < p.defrostMax + 120; i++) {
    g.te = -5; // non sale mai
    M.advance(g, 1, { control: true });
  }
  assert.strictEqual(g.defrost, false, 'chiuso dal tempo massimo');
});

test('formati all\'italiana', () => {
  const f = M.fmt;
  assert.strictEqual(f.num1(4), '4,0');
  assert.strictEqual(f.num1(-11.84), '−11,8');
  assert.strictEqual(f.num1(-0.04), '0,0');
  assert.strictEqual(f.temp(5.25), '5,3 °C');
  assert.strictEqual(f.mmss(135), '2:15');
  assert.strictEqual(f.clock(8100), '02:15');
  assert.strictEqual(f.hm(18720), '5 h 12 min');
  assert.strictEqual(f.hm(300), '5 min');
});

test('la copia dello stato è indipendente: la vista può «provare» una riga senza toccare il frigo', () => {
  const s = M.create();
  const c = M.clone(s);
  M.exec(c, '0100'); M.exec(c, '0102'); M.exec(c, '0104'); M.exec(c, '0106'); M.exec(c, '0108'); M.exec(c, '010A'); M.exec(c, '010C');
  assert.strictEqual(c.out.comp, 1);
  assert.strictEqual(s.out.comp, 0);
  assert.strictEqual(s.want.comp, 0);
  c.p.set = 7;
  assert.strictEqual(s.p.set, 4);
});

test('le righe dello sbrinamento non riaccendono la resistenza se lo sbrinamento è già finito', () => {
  const s = M.create();
  s.want.res = 0;
  const r = M.exec(s, '0122');
  assert.strictEqual(s.want.res, 0);
  assert.match(r.res, /già finito/);
  const r2 = M.exec(s, '0124');
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(s.stats.defrosts, 0);
});

test('i risultati delle righe sono brevi (stanno nella colonna del listato) in ogni situazione', () => {
  const states = [];
  const cold = M.create(); cold.tc = 2; cold.te = -25; cold.reg.T = 2; states.push(cold);
  const hot = M.create(); hot.door = true; hot.doorOpenFor = 45; states.push(hot);
  const warm = M.create(); warm.want.comp = 1; warm.reg.T = 3.5; states.push(warm);
  const wait = M.create(); wait.offSince = 0; wait.t = 30; wait.reg.T = 25; states.push(wait);
  const def = M.create(); M.startDefrost(def, 'timer'); def.reg.Tev = -24.9; def.alarm = true; states.push(def);
  const end = M.create(); M.startDefrost(end, 'manual'); end.te = 9; end.reg.Tev = 9; states.push(end);
  states.forEach((st, k) => {
    Object.keys(M.LINES).forEach((id) => {
      const r = M.exec(M.clone(st), id, { ret: '010A' });
      assert.ok(r.res.length <= 12, 'stato ' + k + ', riga ' + id + ': «' + r.res + '»');
    });
  });
});

test('la routine della porta scrive solo la porta P1: il compressore aspetta il ciclo principale', () => {
  const s = M.create();
  M.exec(s, '0100'); M.exec(s, '0102'); M.exec(s, '0104'); M.exec(s, '0106');
  assert.strictEqual(s.want.comp, 1);
  M.setDoor(s, true, false);
  M.exec(s, '0200'); M.exec(s, '0202'); M.exec(s, '0204');
  assert.strictEqual(s.out.luce, 1);
  assert.strictEqual(s.out.comp, 0, 'P2 non è stata ancora scritta');
  M.exec(s, '0108'); M.exec(s, '010A'); M.exec(s, '010C');
  assert.strictEqual(s.out.comp, 1);
  assert.strictEqual(s.out.vent, 0, 'porta aperta: ventola ferma');
});

test('lo sbrinamento ricorda quanta brina c\'era all\'inizio: a frigo caldo finisce subito, senza ghiaccio da sciogliere', () => {
  const warm = M.create();
  M.startDefrost(warm, 'manual');
  assert.strictEqual(warm.defrostFrost, 0);
  let ended = null;
  runFast(warm, 5, (e, st) => { if (e === 'defrost-end') ended = st.t; });
  assert.ok(ended != null && ended <= 2, 'evaporatore già sopra 8 °C: finisce al primo giro');
  const cold = M.create();
  runFast(cold, 2 * 3600);
  M.startDefrost(cold, 'manual');
  assert.ok(cold.defrostFrost > 0.2, 'dopo la messa a regime c\'è brina: ' + cold.defrostFrost.toFixed(2));
  assert.strictEqual(M.clone(cold).defrostFrost, cold.defrostFrost);
});
