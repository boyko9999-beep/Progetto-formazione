// Test del capitolo 5 della Storia del PC (scheda madre, chipset e bus):
// node --test tests/storia-pc-05-scheda-madre.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../sections/storia-pc/js/modelli/05-scheda-madre.js');

const vicino = (a, b, tolleranza) => Math.abs(a - b) <= (tolleranza == null ? 1e-6 : tolleranza) * Math.max(1, Math.abs(b));

/* ---------- bande calcolate con le formule ---------- */

test('bus dell\'IBM PC: 4,77 MHz diviso 4 cicli fa 1,19 MB/s al massimo', () => {
  assert.ok(vicino(M.banda.bus8088(4.77), 1.1925e6));
  const bus = M.collegamento('1981', 'bus');
  assert.ok(bus.stima, 'la banda del bus del 1981 è una stima');
  assert.ok(bus.banda < bus.massimo, 'la stima prudente sta sotto il massimo teorico');
  assert.ok(bus.banda >= 0.8e6 && bus.banda <= 1.2e6);
});

test('bus paralleli: PCI 133 MB/s, FSB e SDRAM PC100 800 MB/s, AGP 2x 533 MB/s, Ultra DMA/33', () => {
  assert.ok(vicino(M.banda.parallelo(32, 100 / 3), 133.33e6, 1e-4));
  assert.strictEqual(M.banda.parallelo(64, 100), 800e6);
  assert.ok(vicino(M.banda.parallelo(32, 200 / 3, 2), 533.33e6, 1e-4));
  assert.ok(vicino(M.collegamento('1998', 'disco').banda, 33.33e6, 1e-3));
  assert.strictEqual(M.collegamento('1998', 'cpu').banda, 800e6);
  assert.strictEqual(M.collegamento('1998', 'hub').condiviso, 'pci');
});

test('PCI Express: banda per direzione delle generazioni 1-5', () => {
  assert.strictEqual(M.banda.pcie(1, 1), 250e6);
  assert.strictEqual(M.banda.pcie(2, 16), 8e9);
  assert.ok(vicino(M.banda.pcie(3, 16), 15.754e9, 1e-3));
  assert.ok(vicino(M.banda.pcie(4, 16), 31.508e9, 1e-3));
  assert.ok(vicino(M.banda.pcie(5, 16), 63.015e9, 1e-3));
  assert.strictEqual(M.banda.pcie(1, 4), 1e9, 'il DMI del 2009 equivale a 4 corsie PCIe 1.0');
  assert.throws(() => M.banda.pcie(9, 1));
});

test('memorie: DDR3-1333, DDR4-3200 e DDR5-6400 a doppio canale, LPDDR4X dell\'M1', () => {
  assert.ok(vicino(M.banda.ddr(4000 / 3, 2), 21.333e9, 1e-4));
  assert.strictEqual(M.banda.ddr(3200, 2), 51.2e9);
  assert.strictEqual(M.banda.ddr(6400, 2), 102.4e9);
  const m1 = M.collegamento('2020', 'mem').banda;
  assert.ok(vicino(m1, 68.25e9, 1e-3), 'memoria unificata M1 circa 68 GB/s, trovato ' + m1);
});

test('linee seriali: SATA 3 Gbit/s con 8b/10b, USB, RS-232 con start e stop, floppy', () => {
  assert.strictEqual(M.banda.codificata(3, 0.8), 300e6);
  assert.strictEqual(M.banda.seriale(12e6, 8), 1.5e6);
  assert.strictEqual(M.banda.seriale(480e6, 8), 60e6);
  assert.strictEqual(M.collegamento('1981', 'usb').banda, 960);
  assert.strictEqual(M.collegamento('1981', 'disco').banda, 31250);
});

/* ---------- integrità delle epoche ---------- */

test('quattro epoche in ordine: 1981, 1998, 2010, 2020', () => {
  assert.deepStrictEqual(M.EPOCHE.map((e) => e.id), ['1981', '1998', '2010', '2020']);
  M.EPOCHE.forEach((e, i) => {
    assert.strictEqual(String(e.anno), e.id);
    if (i) assert.ok(e.anno > M.EPOCHE[i - 1].anno);
    assert.ok(e.titolo && e.esempio && e.racconto && e.breve);
  });
});

test('ogni collegamento parte e arriva su nodi che esistono nella sua epoca', () => {
  M.EPOCHE.forEach((e) => {
    const nodi = Object.keys(e.nodi);
    const ids = new Set();
    e.collegamenti.forEach((l) => {
      assert.ok(!ids.has(l.id), 'id ripetuto ' + l.id + ' nel ' + e.id);
      ids.add(l.id);
      if (l.bus) { assert.ok(e.nodi.bus && e.nodi.bus.linea, 'il bus è una linea'); return; }
      assert.ok(nodi.includes(l.da), e.id + ': ' + l.id + ' parte da ' + l.da + ' che non esiste');
      assert.ok(nodi.includes(l.a), e.id + ': ' + l.id + ' arriva a ' + l.a + ' che non esiste');
      assert.notStrictEqual(l.da, l.a);
      if (l.gruppo) assert.ok(e.collegamenti.some((g) => g.id === l.gruppo && g.bus), 'gruppo ' + l.gruppo + ' inesistente');
    });
  });
});

test('bande, anni e lezioni BusLab dei collegamenti sono sensati', () => {
  M.EPOCHE.forEach((e) => {
    e.collegamenti.forEach((x) => {
      const l = M.collegamento(e.id, x.id);
      if (l.interno && !l.zeroCopia) { assert.ok(!l.banda, 'i tratti interni non hanno banda'); return; }
      assert.ok(l.banda > 100 && l.banda < 1e12, e.id + ' ' + l.id + ': banda fuori scala ' + l.banda);
      assert.ok(Number.isInteger(l.anno) && l.anno >= 1981 && l.anno <= e.anno, e.id + ' ' + l.id + ': anno ' + l.anno);
      assert.ok(l.nome && l.sigla && l.formula && l.testo, e.id + ' ' + l.id + ': testi mancanti');
      if (l.buslab != null) assert.ok(M.BUSLAB.includes(l.buslab), 'lezione BusLab inesistente: ' + l.buslab);
    });
  });
  // I collegamenti principali puntano alle lezioni giuste.
  assert.strictEqual(M.collegamento('1981', 'bus').buslab, 'isa');
  assert.strictEqual(M.collegamento('1998', 'hub').buslab, 'pci');
  assert.strictEqual(M.collegamento('2010', 'gfx').buslab, 'pcie');
  assert.strictEqual(M.collegamento('2010', 'disco').buslab, 'sata');
  assert.strictEqual(M.collegamento('2010', 'usb').buslab, 'usb');
});

test('i percorsi partono dalla CPU, sono continui e arrivano al dispositivo giusto', () => {
  M.EPOCHE.forEach((e) => {
    M.FLUSSI.forEach((f) => {
      const passi = M.percorso(e.id, f.id);
      assert.ok(passi.length >= 1);
      assert.strictEqual(passi[0].daNodo, 'cpu');
      for (let i = 1; i < passi.length; i++) assert.strictEqual(passi[i].daNodo, passi[i - 1].aNodo, 'percorso spezzato');
      assert.strictEqual(passi[passi.length - 1].aNodo, f.destinazione, e.id + ' ' + f.id + ' non arriva a ' + f.destinazione);
    });
  });
  assert.throws(() => M.percorso('1998', 'stampante'));
  assert.throws(() => M.epoca('1975'));
});

test('la banda cresce di epoca in epoca su ogni percorso', () => {
  M.FLUSSI.forEach((f) => {
    const righe = M.confronto(f.id, 1e9);
    for (let i = 1; i < righe.length; i++) {
      const prima = righe[i - 1];
      const dopo = righe[i];
      assert.ok(dopo.zeroCopia || dopo.secondi < prima.secondi, f.id + ': il ' + dopo.epoca.id + ' non è più veloce del ' + prima.epoca.id);
    }
  });
  // Dal bus dell'IBM PC alla memoria unificata dell'M1: circa 57.000 volte (picco contro picco).
  const rapporto = M.collegamento('2020', 'mem').banda / M.collegamento('1981', 'bus').massimo;
  assert.ok(rapporto > 55000 && rapporto < 60000, 'rapporto ' + rapporto);
});

/* ---------- colli di bottiglia e tempi di trasferimento ---------- */

test('collo di bottiglia: il collegamento più lento decide', () => {
  assert.strictEqual(M.tempoPercorso('1981', 'memoria', 1e9).collo.id, 'mem');
  assert.ok(M.tempoPercorso('1981', 'memoria', 1e9).collo.stima);
  assert.strictEqual(M.tempoPercorso('1998', 'disco', 1e9).collo.sigla, 'IDE');
  assert.strictEqual(M.tempoPercorso('1998', 'grafica', 1e9).collo.sigla, 'AGP 2x');
  assert.strictEqual(M.tempoPercorso('2010', 'periferiche', 1e9).collo.sigla, 'USB 2.0');
  const gpu = M.tempoPercorso('2020', 'grafica', 1e9);
  assert.ok(gpu.zeroCopia, 'nel SoC la GPU non riceve copie');
  assert.strictEqual(gpu.secondi, 0);
});

test('tempo di trasferimento di 1 GB', () => {
  assert.strictEqual(M.tempo(1e9, 800e6), 1.25);
  assert.strictEqual(M.tempoPercorso('1998', 'memoria', 1e9).secondi, 1.25);
  assert.ok(vicino(M.tempoPercorso('2010', 'disco', 1e9).secondi, 10 / 3, 1e-9));
  assert.ok(vicino(M.tempoPercorso('1981', 'periferiche', 1e9).secondi, 1e9 / 960, 1e-9));
  assert.strictEqual(M.tempo(1, 0), Infinity);
});

test('formattazione all\'italiana di tempi, bande e dimensioni', () => {
  const T = M.formattaTempo;
  assert.strictEqual(T(1.25), '1,25 s');
  assert.strictEqual(T(30), '30 s');
  assert.strictEqual(T(16.6667), '16,7 s');
  assert.strictEqual(T(1000), '16 min 40 s');
  assert.strictEqual(T(0.125), '125 ms');
  assert.strictEqual(T(0.0047), '4,7 ms');
  assert.strictEqual(T(2e-5), '20 µs');
  assert.strictEqual(T(32000), '8 h 53 min');
  assert.strictEqual(T(1e9 / 960), '12 giorni 1 h');
  assert.strictEqual(T(86400), '1 giorno');
  assert.strictEqual(T(59.97), '1 min');
  assert.strictEqual(T(0), '0 s');
  assert.strictEqual(T(Infinity), 'mai');
  const Bw = M.formattaBanda;
  assert.strictEqual(Bw(960), '960 B/s');
  assert.strictEqual(Bw(31250), '31,3 kB/s');
  assert.strictEqual(Bw(1.1925e6), '1,19 MB/s');
  assert.strictEqual(Bw(100e6 / 3 * 4), '133 MB/s');
  assert.strictEqual(Bw(800e6), '800 MB/s');
  assert.strictEqual(Bw(1e9), '1 GB/s');
  assert.strictEqual(Bw(M.banda.ddr(4266, 2)), '68,3 GB/s');
  assert.strictEqual(Bw(999.9e6), '1 GB/s');
  assert.strictEqual(M.formattaByte(1e9), '1 GB');
  assert.strictEqual(M.formattaByte(5e6), '5 MB');
  assert.strictEqual(M.formattaByte(50e9), '50 GB');
});

/* ---------- scala logaritmica ---------- */

test('scala logaritmica: ogni fattore 10 vale lo stesso passo, con limiti', () => {
  const f = M.frazioneLog;
  assert.strictEqual(f(M.SCALA.min), 0);
  assert.strictEqual(f(M.SCALA.max), 1);
  assert.strictEqual(f(1), 0, 'sotto il minimo resta 0');
  assert.strictEqual(f(1e15), 1, 'sopra il massimo resta 1');
  assert.strictEqual(f(0), 0);
  const passo = f(1e7) - f(1e6);
  assert.ok(vicino(f(1e9) - f(1e8), passo, 1e-9));
  assert.ok(vicino(f(1e4) - f(1e3), passo, 1e-9));
  // Spessori e velocità crescono con la banda e restano nei limiti.
  let prima = 0;
  [960, 31250, 1e6, 133e6, 800e6, 8e9, 68e9].forEach((b) => {
    const s = M.spessore(b);
    assert.ok(s > prima && s >= M.SCALA.spessoreMin && s <= M.SCALA.spessoreMax);
    assert.ok(M.velocita(b) >= M.SCALA.velMin && M.velocita(b) <= M.SCALA.velMax);
    prima = s;
  });
});

/* ---------- disposizioni e geometria ---------- */

test('disposizioni: ogni nodo ha un posto dentro il disegno, ogni collegamento le sue ancore', () => {
  ['larga', 'stretta'].forEach((nome) => {
    M.EPOCHE.forEach((e) => {
      const d = M.disposizione(nome, e.id);
      M.NODI.forEach((id) => assert.ok(d.nodi[id], nome + ' ' + e.id + ': manca la posizione di ' + id));
      Object.keys(e.nodi).forEach((id) => {
        const b = d.nodi[id];
        assert.strictEqual(b.o, 1, nome + ' ' + e.id + ': ' + id + ' deve essere visibile');
        assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= d.w && b.y + b.h <= d.h, nome + ' ' + e.id + ': ' + id + ' esce dal disegno');
      });
      M.NODI.filter((id) => !e.nodi[id]).forEach((id) => assert.strictEqual(d.nodi[id].o, 0, nome + ' ' + e.id + ': ' + id + ' dovrebbe essere nascosto'));
      e.collegamenti.forEach((l) => {
        if (l.bus) return;
        const spec = d.link[l.id];
        assert.ok(spec && spec.da && spec.a, nome + ' ' + e.id + ': mancano le ancore di ' + l.id);
        // Il percorso è fatto di tratti orizzontali e verticali e resta nel disegno.
        const A = M.geometria.ancora(d.nodi[l.da], spec.da);
        const Bp = M.geometria.ancora(d.nodi[l.a], spec.a, A);
        const poly = M.geometria.instrada(A, Bp, spec.mid);
        for (let i = 1; i < poly.length; i++) {
          const dx = Math.abs(poly[i].x - poly[i - 1].x);
          const dy = Math.abs(poly[i].y - poly[i - 1].y);
          assert.ok(dx < 1e-6 || dy < 1e-6, nome + ' ' + e.id + ' ' + l.id + ': tratto obliquo');
        }
        poly.forEach((p) => assert.ok(p.x >= 0 && p.x <= d.w && p.y >= 0 && p.y <= d.h, nome + ' ' + e.id + ' ' + l.id + ': fuori dal disegno'));
      });
    });
  });
});

test('geometria: ancore, percorsi ad angolo retto, lunghezze e punti', () => {
  const G = M.geometria;
  const box = { x: 10, y: 20, w: 100, h: 40 };
  assert.deepStrictEqual(G.ancora(box, 'r'), { x: 110, y: 40, dir: 'r' });
  assert.deepStrictEqual(G.ancora(box, ['b', 0.25]), { x: 35, y: 60, dir: 'b' });
  assert.deepStrictEqual(G.ancora({ x: 20, y: 200, w: 600, h: 0 }, 'proj', { x: 119, y: 132 }), { x: 119, y: 200, dir: 't' });
  const poly = G.instrada({ x: 0, y: 0, dir: 'r' }, { x: 100, y: 50, dir: 'l' });
  assert.deepStrictEqual(poly, [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 50 }]);
  assert.strictEqual(G.lunghezza(poly), 150);
  assert.deepStrictEqual(G.puntoSu(poly, 75), { x: 50, y: 25 });
  assert.deepStrictEqual(G.puntoSu(poly, 999), { x: 100, y: 50 });
  assert.deepStrictEqual(G.puntoSu(poly, -10), { x: -10, y: 0 });
  assert.deepStrictEqual(G.instrada({ x: 5, y: 0, dir: 'b' }, { x: 5.5, y: 80, dir: 't' }), [{ x: 5, y: 0 }, { x: 5, y: 80 }]);
  assert.strictEqual(G.percorsoSvg([{ x: 0, y: 0 }, { x: 1.5, y: 2 }]), 'M0.00 0.00 L1.50 2.00');
  const meta = G.interpolaBox({ x: 0, y: 0, w: 10, h: 10, o: 0 }, { x: 10, y: 20, w: 30, h: 10, o: 1 }, 0.5);
  assert.deepStrictEqual(meta, { x: 5, y: 10, w: 20, h: 10, o: 0.5 });
});

test('flussi e dimensioni dei file', () => {
  assert.deepStrictEqual(M.FLUSSI.map((f) => f.id), ['memoria', 'grafica', 'disco', 'periferiche']);
  assert.deepStrictEqual(M.flussiDi('1981', 'bus'), ['memoria', 'grafica', 'disco', 'periferiche']);
  assert.deepStrictEqual(M.flussiDi('1998', 'hub'), ['disco', 'periferiche']);
  assert.deepStrictEqual(M.flussiDi('2010', 'mem'), ['memoria']);
  assert.ok(M.DIMENSIONI.some((d) => d.byte === 1e9), 'c\'è il file da 1 GB');
  Object.values(M.FLUSSO_DI_RUOLO).forEach((f) => assert.ok(M.FLUSSI.some((x) => x.id === f)));
});

/* ---------- il capitolo, caricato in Node senza DOM ---------- */

test('il capitolo si registra senza toccare il DOM e rispetta il contratto', () => {
  const P = require('../sections/storia-pc/js/core.js');
  require('../sections/storia-pc/js/capitoli/05-scheda-madre.js');
  const cap = P.capitoli.find((c) => c.id === 'scheda-madre');
  assert.ok(cap, 'capitolo registrato');
  assert.strictEqual(cap.numero, 5);
  assert.strictEqual(cap.breve, 'Scheda madre');
  assert.strictEqual(cap.periodo, '1981–oggi');
  assert.strictEqual(cap.colore, 'var(--era-5)');
  assert.ok(cap.sommario && cap.intro);
  assert.strictEqual(typeof cap.lab.crea, 'function');
  cap.blocchi.forEach((b) => assert.ok(P.TIPI_BLOCCO.includes(b.tipo), 'tipo di blocco sconosciuto: ' + b.tipo));

  const tipi = cap.blocchi.map((b) => b.tipo);
  const testi = cap.blocchi.filter((b) => b.tipo === 'testo');
  assert.ok(testi.length >= 4 && testi.length <= 7, 'blocchi di testo: ' + testi.length);
  const parole = testi.map((b) => [b.titolo || ''].concat(b.paragrafi).join(' ')).join(' ')
    .replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(parole >= 1400 && parole <= 2200, 'parole del testo: ' + parole);
  ['figura', 'schede', 'numeri', 'nota', 'italia', 'lab'].forEach((t) => assert.ok(tipi.includes(t), 'manca il blocco ' + t));

  const schede = cap.blocchi.find((b) => b.tipo === 'schede').items;
  assert.ok(schede.length >= 7 && schede.length <= 12, 'schede: ' + schede.length);
  schede.forEach((s, i) => {
    assert.ok(Number.isInteger(s.anno) && s.anno >= 1981 && s.anno <= 2025, 'anno ' + s.anno);
    assert.ok(s.nome && s.testo);
    if (i) assert.ok(s.anno >= schede[i - 1].anno, 'schede non in ordine: ' + s.anno);
  });
  assert.ok(schede.some((s) => s.italia), 'almeno una scheda italiana');

  const numeri = cap.blocchi.find((b) => b.tipo === 'numeri').items;
  assert.ok(numeri.length >= 3 && numeri.length <= 4);
  numeri.forEach((n) => assert.ok(n.etichetta && n.valore != null));

  cap.blocchi.filter((b) => b.tipo === 'figura').forEach((b) => {
    assert.strictEqual(typeof b.svg, 'function');
    assert.ok(b.alt && b.didascalia);
  });

  assert.ok(cap.punti.length >= 4 && cap.punti.length <= 6);
  cap.collegamenti.forEach((l) => {
    assert.ok(l.testo && l.href && (l.tipo === 'buslab' || l.tipo === 'sezione' || l.tipo === 'capitolo'));
    const m = /^\.\.\/\.\.\/index\.html#\/bus\/([a-z0-9]+)$/.exec(l.href);
    if (l.tipo === 'buslab') assert.ok(m && M.BUSLAB.includes(m[1]), 'link BusLab non valido: ' + l.href);
  });

  // Testi: apostrofi dritti, numeri all'italiana negli anni (niente 1.981).
  const tutto = JSON.stringify(cap.blocchi.filter((b) => b.tipo !== 'figura')) + cap.intro + cap.punti.join(' ');
  assert.ok(!/[‘’]/.test(tutto), 'apostrofi curvi nel testo');
  assert.ok(!/\b1\.9\d\d\b|\b2\.0[0-2]\d\b/.test(tutto), 'anno scritto con il punto');
});
