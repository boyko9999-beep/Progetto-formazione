/*
 * Generatori di segnale: trasformano un messaggio (array di byte) nella
 * sequenza di livelli elettrici che ogni bus metterebbe sui suoi fili.
 *
 * Ogni generatore restituisce una "traccia":
 *   lines:    [{ id, name, kind: 'digital' | 'bus' }]
 *   devices:  ['Master', 'Slave']           nomi dei due estremi del disegno
 *   segments: [{ label, from, desc }]       campi del frame (from: 0 = sinistra, 1 = destra)
 *   steps:    [{ seg, levels: {id: valore}, mark, stuff }]
 * I livelli digitali valgono 0, 1 oppure 0.5 (bus a riposo / recessivo);
 * le linee 'bus' contengono una stringa (per esempio un valore esadecimale).
 */
(function (root) {
  'use strict';

  function hex(n, digits) {
    return '0x' + n.toString(16).toUpperCase().padStart(digits || 2, '0');
  }

  function printable(b) {
    return b >= 32 && b < 127 ? " '" + String.fromCharCode(b) + "'" : '';
  }

  function bitsLSB(byte, n) {
    const out = [];
    for (let i = 0; i < (n || 8); i++) out.push((byte >> i) & 1);
    return out;
  }

  function bitsMSB(value, n) {
    const out = [];
    for (let i = (n || 8) - 1; i >= 0; i--) out.push((value >> i) & 1);
    return out;
  }

  function Trace(lines, devices) {
    this.lines = lines;
    this.devices = devices || ['Master', 'Slave'];
    this.segments = [];
    this.steps = [];
    this.cur = {};
    for (const l of lines) this.cur[l.id] = l.idle !== undefined ? l.idle : 1;
  }
  Trace.prototype.seg = function (label, from, desc) {
    this.segments.push({ label: label, from: from || 0, desc: desc || '' });
    return this;
  };
  Trace.prototype.set = function (levels) {
    Object.assign(this.cur, levels);
    return this;
  };
  Trace.prototype.push = function (n, mark, extra) {
    for (let i = 0; i < (n || 1); i++) {
      const step = { seg: Math.max(0, this.segments.length - 1), levels: Object.assign({}, this.cur) };
      if (mark !== undefined && i === 0) step.mark = String(mark);
      if (extra) Object.assign(step, extra);
      this.steps.push(step);
    }
    return this;
  };
  Trace.prototype.done = function () {
    return { lines: this.lines, devices: this.devices, segments: this.segments, steps: this.steps };
  };

  /* ---------- CRC e checksum ---------- */

  function crcCan15(bits) {
    let crc = 0;
    for (const b of bits) {
      const next = b ^ ((crc >> 14) & 1);
      crc = (crc << 1) & 0x7fff;
      if (next) crc ^= 0x4599;
    }
    return crc;
  }

  function crcModbus(bytes) {
    let crc = 0xffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
    return crc;
  }

  function crcUsb16(bytes) {
    return ~crcModbus(bytes) & 0xffff;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function linProtectedId(id) {
    const b = (i) => (id >> i) & 1;
    const p0 = b(0) ^ b(1) ^ b(2) ^ b(4);
    const p1 = 1 ^ (b(1) ^ b(3) ^ b(4) ^ b(5));
    return (id & 0x3f) | (p0 << 6) | (p1 << 7);
  }

  function linChecksum(bytes) {
    let sum = 0;
    for (const b of bytes) {
      sum += b;
      if (sum > 0xff) sum -= 0xff;
    }
    return ~sum & 0xff;
  }

  /* ---------- 8b/10b ---------- */

  const T6 = ['100111', '011101', '101101', '110001', '110101', '101001', '011001', '111000',
    '111001', '100101', '010101', '110100', '001101', '101100', '011100', '010111',
    '011011', '100011', '010011', '110010', '001011', '101010', '011010', '111010',
    '110011', '100110', '010110', '110110', '001110', '101110', '011110', '101011'];
  const T4 = ['1011', '1001', '0101', '1100', '1101', '1010', '0110', '1110'];

  const ones = (s) => s.split('').filter((c) => c === '1').length;
  const flip = (s) => s.replace(/[01]/g, (c) => (c === '1' ? '0' : '1'));

  // rd: disparità corrente (-1 o +1). Restituisce { code: 'abcdeifghj', rd }.
  function enc8b10b(byte, rd) {
    const x = byte & 31;
    const y = byte >> 5;
    let six = T6[x];
    if (ones(six) !== 3) {
      if (rd > 0) six = flip(six);
      rd = -rd;
    } else if (x === 7 && rd > 0) {
      six = '000111';
    }
    let four = T4[y];
    if (y === 7 && ((rd < 0 && (x === 17 || x === 18 || x === 20)) || (rd > 0 && (x === 11 || x === 13 || x === 14)))) {
      four = '0111';
    }
    if (ones(four) !== 2) {
      if (rd > 0) four = flip(four);
      rd = -rd;
    } else if (y === 3 && rd > 0) {
      four = '0011';
    }
    return { code: six + four, rd: rd };
  }

  function encK285(rd) {
    return rd < 0 ? { code: '0011111010', rd: 1 } : { code: '1100000101', rd: -1 };
  }

  /* ---------- Generatori ---------- */

  const G = {};

  // UART / RS-232 / RS-485 / MIDI: un frame start-stop per byte.
  function uartFrame(t, byte, o, label) {
    const hi = o.diff ? { [o.a]: 1, [o.b]: 0 } : { [o.a]: o.inverted ? 0 : 1 };
    const lo = o.diff ? { [o.a]: 0, [o.b]: 1 } : { [o.a]: o.inverted ? 1 : 0 };
    const lvl = (bit) => (bit ? hi : lo);
    t.seg('Start', o.from || 0, 'Il bit di start (0) rompe lo stato di riposo e avvisa il ricevitore che sta arrivando un carattere: da qui parte il suo orologio interno.');
    t.set(lvl(0)).push(1, 'S');
    t.seg(label || 'Dato ' + hex(byte) + printable(byte), o.from || 0, '8 bit di dati, spediti dal meno significativo (LSB) al più significativo. Il ricevitore campiona ogni bit a metà della sua durata.');
    bitsLSB(byte).forEach((b, i) => t.set(lvl(b)).push(1, b, { bit: 'D' + i }));
    if (o.parity) {
      const p = bitsLSB(byte).reduce((a, b) => a ^ b, 0) ^ (o.parity === 'odd' ? 1 : 0);
      t.seg('Parità', o.from || 0, 'Bit di parità ' + (o.parity === 'even' ? 'pari' : 'dispari') + ': rende il numero di 1 ' + (o.parity === 'even' ? 'pari' : 'dispari') + ' e permette di scoprire un singolo bit sbagliato.');
      t.set(lvl(p)).push(1, p);
    }
    t.seg('Stop', o.from || 0, 'Il bit di stop (1) riporta la linea a riposo: il ricevitore controlla che sia davvero 1, altrimenti segnala un "framing error".');
    t.set(lvl(1)).push(o.stopBits || 1, 'P');
  }

  G.uart = function (bytes, o) {
    o = Object.assign({ a: 'TX', name: 'TX' }, o);
    const lines = o.diff
      ? [{ id: o.a, name: o.a, idle: 1 }, { id: o.b, name: o.b, idle: 0 }]
      : [{ id: o.a, name: o.name, idle: o.inverted ? 0 : 1 }];
    const t = new Trace(lines, o.devices || ['Trasmettitore', 'Ricevitore']);
    t.seg('Riposo', 0, o.inverted
      ? 'Linea a riposo: in RS-232 l\'1 logico ("mark") è una tensione NEGATIVA, tra -3 e -15 V.'
      : 'Linea a riposo: il trasmettitore tiene la linea al livello 1 ("mark").');
    t.push(2);
    for (const b of bytes) {
      uartFrame(t, b, o);
      t.seg('Riposo', 0, 'Pausa tra due caratteri: può durare quanto vuole, perché ogni carattere si risincronizza da solo con il suo bit di start.');
      t.push(1);
    }
    return t.done();
  };

  G.modbus = function (bytes, o) {
    const value = ((bytes[0] || 0) << 8) | (bytes[1] || 0);
    const pdu = [0x01, 0x06, 0x00, 0x01, value >> 8, value & 0xff];
    const crc = crcModbus(pdu);
    const frame = pdu.concat([crc & 0xff, crc >> 8]);
    const names = ['Indirizzo slave', 'Funzione 06 (scrivi registro)', 'Registro (alto)', 'Registro (basso)', 'Valore (alto)', 'Valore (basso)', 'CRC basso', 'CRC alto'];
    const opts = Object.assign({ a: 'A', b: 'B', diff: true, parity: 'even' }, o);
    const t = new Trace([{ id: 'A', name: 'A (D+)', idle: 1 }, { id: 'B', name: 'B (D-)', idle: 0 }], ['Master (PLC)', 'Slave 1']);
    t.seg('Silenzio 3,5 caratteri', 0, 'In Modbus RTU un messaggio inizia dopo un silenzio di almeno 3,5 caratteri: è così che il ricevitore capisce dove comincia il frame.');
    t.push(3);
    frame.forEach((b, i) => uartFrame(t, b, opts, names[i] + ' ' + hex(b)));
    t.seg('Silenzio', 0, 'Altro silenzio: il frame è finito. Lo slave controlla il CRC-16 e, se è corretto, esegue il comando e risponde.');
    t.push(3);
    return t.done();
  };

  G.midi = function (bytes) {
    const notes = (bytes.length ? bytes : [60]).slice(0, 3).map((b) => 36 + (b % 48));
    const t = new Trace([{ id: 'MIDI', name: 'MIDI OUT', idle: 1 }], ['Tastiera', 'Sintetizzatore']);
    const nomi = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
    t.seg('Riposo', 0, 'Corrente spenta nel loop optoisolato = 1 logico. MIDI è un UART a 31 250 baud.').push(2);
    for (const n of notes) {
      uartFrame(t, 0x90, {}, 'Status 0x90: Note On, canale 1');
      uartFrame(t, n, {}, 'Nota ' + n + ' (' + nomi[n % 12] + (Math.floor(n / 12) - 1) + ')');
      uartFrame(t, 100, {}, 'Velocity 100');
      t.seg('Pausa', 0, '').push(1);
    }
    return t.done();
  };

  G.i2c = function (bytes, o) {
    o = Object.assign({ scl: 'SCL', sda: 'SDA', addr: 0x50, rw: 0 }, o);
    const C = o.scl;
    const D = o.sda;
    const t = new Trace([{ id: C, name: C, idle: 1 }, { id: D, name: D, idle: 1 }], ['Master', 'Slave ' + hex(o.addr)]);
    const sendBits = (bits, from) => bits.forEach((b) => { t.set({ [C]: 0, [D]: b }).push(1, b); t.set({ [C]: 1 }).push(1); });
    const ack = () => {
      t.seg('ACK', 1, 'Nono impulso di clock: il master rilascia SDA e il RICEVITORE la tira a 0 per dire "ricevuto". Se resta a 1 è un NACK.');
      t.set({ [C]: 0, [D]: 0 }).push(1, 'A');
      t.set({ [C]: 1 }).push(1);
    };
    t.seg('Riposo', 0, 'Bus libero: entrambe le linee sono tenute a 1 dalle resistenze di pull-up. Nessuno le pilota alte: i chip possono solo tirarle a 0 (open-drain).').push(2);
    t.seg('START', 0, 'Condizione di START: SDA scende mentre SCL è alto. È l\'unico momento (oltre allo STOP) in cui SDA può cambiare con il clock alto.');
    t.set({ [D]: 0 }).push(1);
    t.seg('Indirizzo ' + hex(o.addr) + (o.rw ? ' + Lettura' : ' + Scrittura'), 0, '7 bit di indirizzo (MSB prima) e il bit R/W: tutti gli slave ascoltano, ma risponde solo quello con questo indirizzo. SDA cambia solo quando SCL è basso.');
    sendBits(bitsMSB((o.addr << 1) | o.rw, 8));
    ack();
    for (const b of bytes) {
      t.seg('Dato ' + hex(b) + printable(b), 0, 'Byte di dati, dal bit più significativo. Lo slave legge SDA sul fronte di salita di SCL.');
      sendBits(bitsMSB(b, 8));
      ack();
    }
    t.seg('STOP', 0, 'Condizione di STOP: SDA sale mentre SCL è alto. Il bus torna libero per qualunque master.');
    t.set({ [C]: 0, [D]: 0 }).push(1);
    t.set({ [C]: 1 }).push(1);
    t.set({ [D]: 1 }).push(2);
    return t.done();
  };

  G.spi = function (bytes) {
    const reply = [0x4f, 0x4b];
    const t = new Trace([
      { id: 'CS', name: 'CS (SS)', idle: 1 },
      { id: 'SCLK', name: 'SCLK', idle: 0 },
      { id: 'MOSI', name: 'MOSI', idle: 0 },
      { id: 'MISO', name: 'MISO', idle: 0.5 },
    ], ['Master', 'Slave']);
    t.seg('Riposo', 0, 'Chip Select alto: lo slave ignora il bus e lascia MISO in alta impedenza (né 0 né 1).').push(2);
    t.seg('Selezione', 0, 'Il master abbassa CS: da questo momento lo slave scelto ascolta. Ogni slave ha il suo filo CS.');
    t.set({ CS: 0 }).push(1);
    bytes.forEach((b, i) => {
      const r = reply[i % reply.length];
      t.seg('Scambio ' + hex(b) + printable(b) + ' ⇄ ' + hex(r) + printable(r), 0, 'Full-duplex: a ogni colpo di clock il master spinge un bit su MOSI e contemporaneamente riceve un bit dallo slave su MISO. Modo 0: i dati cambiano sul fronte di discesa e si leggono su quello di salita.');
      const mo = bitsMSB(b, 8);
      const mi = bitsMSB(r, 8);
      for (let k = 0; k < 8; k++) {
        t.set({ SCLK: 0, MOSI: mo[k], MISO: mi[k] }).push(1, mo[k] + '/' + mi[k]);
        t.set({ SCLK: 1 }).push(1);
      }
    });
    t.seg('Fine', 0, 'Il master rialza CS: la transazione è chiusa. SPI non ha indirizzi né ACK: è semplice e velocissimo.');
    t.set({ SCLK: 0, CS: 1, MISO: 0.5 }).push(2);
    return t.done();
  };

  G.onewire = function (bytes) {
    const t = new Trace([{ id: 'DQ', name: 'DQ (dati + alimentazione)', idle: 1 }], ['Master', 'Sensore']);
    t.seg('Riposo', 0, 'Un solo filo (più la massa). A riposo è alto grazie al pull-up, e i sensori più piccoli si alimentano proprio da qui (alimentazione "parassita").').push(2);
    t.seg('Reset', 0, 'Il master tiene la linea bassa per almeno 480 µs: tutti i dispositivi si azzerano.');
    t.set({ DQ: 0 }).push(8);
    t.set({ DQ: 1 }).push(2);
    t.seg('Presenza', 1, 'Ogni dispositivo collegato risponde tirando giù la linea per 60-240 µs: "ci sono!".');
    t.set({ DQ: 0 }).push(4, 'P');
    t.set({ DQ: 1 }).push(2);
    const cmds = [[0xcc, 'Comando 0xCC: Skip ROM'], [0x44, 'Comando 0x44: Avvia misura']];
    const all = cmds.concat(bytes.map((b) => [b, 'Dato ' + hex(b) + printable(b)]));
    for (const [b, label] of all) {
      t.seg(label, 0, 'Ogni bit è una "finestra" di circa 60 µs. Per scrivere 1 il master abbassa la linea per un attimo; per scrivere 0 la tiene bassa per quasi tutta la finestra. Bit meno significativo per primo.');
      bitsLSB(b).forEach((bit) => {
        if (bit) t.set({ DQ: 0 }).push(1, 1).set({ DQ: 1 }).push(4);
        else t.set({ DQ: 0 }).push(4, 0).set({ DQ: 1 }).push(1);
      });
    }
    return t.done();
  };

  G.can = function (bytes, o) {
    o = Object.assign({ id: 0x123 }, o);
    const data = bytes.slice(0, 8);
    const fields = [
      ['SOF', [0], 'Start Of Frame: un bit dominante (0) sveglia tutti i nodi e sincronizza i loro orologi.'],
      ['Identificatore ' + hex(o.id, 3), bitsMSB(o.id, 11), '11 bit di identificatore: dicono COSA contiene il messaggio (non chi lo manda) e ne stabiliscono la priorità. Se due nodi trasmettono insieme vince l\'ID più basso: lo 0 dominante "copre" l\'1.'],
      ['RTR', [0], 'Remote Transmission Request: 0 = frame di dati.'],
      ['IDE + r0', [0, 0], 'IDE = 0: identificatore standard a 11 bit (1 significherebbe esteso a 29 bit). r0 è riservato.'],
      ['DLC = ' + data.length, bitsMSB(data.length, 4), 'Data Length Code: quanti byte di dati seguono (da 0 a 8 nel CAN classico).'],
    ];
    data.forEach((b) => fields.push(['Dato ' + hex(b) + printable(b), bitsMSB(b, 8), 'Un byte di dati, bit più significativo per primo.']));
    const crcBits = [].concat.apply([], fields.map((f) => f[1]));
    const crc = crcCan15(crcBits);
    fields.push(['CRC ' + hex(crc, 4), bitsMSB(crc, 15), 'CRC a 15 bit calcolato su tutto il frame precedente: ogni ricevitore lo ricalcola per scoprire errori.']);

    const t = new Trace([{ id: 'CANH', name: 'CAN_H', idle: 0.5 }, { id: 'CANL', name: 'CAN_L', idle: 0.5 }], ['Nodo motore', 'Nodo cruscotto']);
    const lvl = (b) => (b ? { CANH: 0.5, CANL: 0.5 } : { CANH: 1, CANL: 0 });
    t.seg('Bus libero', 0, 'Recessivo (1): CAN_H e CAN_L sono entrambi a 2,5 V. Il ricevitore guarda la DIFFERENZA tra i due fili, quindi i disturbi che colpiscono entrambi si annullano.').push(2);
    let run = 0;
    let last = -1;
    for (const [label, bits, desc] of fields) {
      t.seg(label, 0, desc);
      for (const b of bits) {
        t.set(lvl(b)).push(1, b);
        run = b === last ? run + 1 : 1;
        last = b;
        if (run === 5) {
          const s = 1 - b;
          t.set(lvl(s)).push(1, s, { stuff: true });
          last = s;
          run = 1;
        }
      }
    }
    t.seg('Delimitatore CRC', 0, 'Un bit recessivo che separa il CRC dallo slot di ACK. Da qui in poi niente più bit stuffing.');
    t.set(lvl(1)).push(1, 1);
    t.seg('ACK', 1, 'Slot di ACK: il trasmettitore manda 1, ma OGNI nodo che ha ricevuto il frame senza errori lo sovrascrive con uno 0 dominante.');
    t.set(lvl(0)).push(1, 0);
    t.set(lvl(1)).push(1, 1);
    t.seg('Fine frame', 0, '7 bit recessivi di End Of Frame più 3 di intervallo: poi il bus è di nuovo libero.');
    t.set(lvl(1)).push(10);
    return t.done();
  };

  G.lin = function (bytes, o) {
    o = Object.assign({ id: 0x10 }, o);
    const data = bytes.slice(0, 8);
    const pid = linProtectedId(o.id);
    const t = new Trace([{ id: 'LIN', name: 'LIN (12 V)', idle: 1 }], ['Master (centralina)', 'Slave (specchietto)']);
    t.seg('Riposo', 0, 'Un solo filo a 12 V con pull-up: è un UART a basso costo pensato per sostituire i cavi di specchietti, sedili, finestrini.').push(2);
    t.seg('Break', 0, 'Il master tiene la linea a 0 per almeno 13 bit: nessun carattere normale può durare così tanto, quindi tutti capiscono che inizia un nuovo frame.');
    t.set({ LIN: 0 }).push(13);
    t.set({ LIN: 1 }).push(1);
    const opts = { a: 'LIN' };
    uartFrame(t, 0x55, opts, 'Sync 0x55');
    t.segments[t.segments.length - 2].desc = '0x55 = 01010101: una fila di fronti regolari che permette agli slave (senza quarzo preciso) di misurare la velocità esatta.';
    uartFrame(t, pid, opts, 'ID ' + hex(o.id) + ' + parità = ' + hex(pid));
    data.forEach((b) => uartFrame(t, b, Object.assign({ from: 1 }, opts)));
    const cs = linChecksum([pid].concat(data));
    uartFrame(t, cs, Object.assign({ from: 1 }, opts), 'Checksum ' + hex(cs));
    t.seg('Riposo', 0, 'Il master decide sempre chi parla: nessuna collisione possibile.').push(2);
    return t.done();
  };

  G.usb = function (bytes) {
    const data = bytes.slice(0, 6);
    const crc = crcUsb16(data);
    const fields = [
      ['SYNC', 0x80, 8, 'Campo SYNC (00000001 trasmesso LSB per primo): una raffica di transizioni per agganciare l\'orologio del ricevitore.'],
      ['PID DATA0', 0xc3, 8, 'Packet ID: 4 bit di tipo più gli stessi 4 bit invertiti, per controllo. DATA0 indica un pacchetto di dati.'],
    ];
    data.forEach((b) => fields.push(['Dato ' + hex(b) + printable(b), b, 8, 'Byte di dati, bit meno significativo per primo.']));
    fields.push(['CRC16 basso', crc & 0xff, 8, 'CRC a 16 bit sui dati.'], ['CRC16 alto', crc >> 8, 8, 'Seconda metà del CRC.']);

    const t = new Trace([{ id: 'DP', name: 'D+', idle: 1 }, { id: 'DM', name: 'D-', idle: 0 }], ['Host (PC)', 'Dispositivo']);
    const J = { DP: 1, DM: 0 };
    const K = { DP: 0, DM: 1 };
    let state = 'J';
    t.seg('Riposo (J)', 0, 'Full Speed: a riposo D+ è alto e D- basso (stato "J"). I due fili sono sempre opposti: segnale differenziale.').push(2);
    let run = 0;
    for (const [label, value, n, desc] of fields) {
      t.seg(label, 0, desc + ' Codifica NRZI: uno 0 fa CAMBIARE lo stato (J↔K), un 1 lo lascia uguale.');
      for (const b of bitsLSB(value, n)) {
        if (b === 0) state = state === 'J' ? 'K' : 'J';
        t.set(state === 'J' ? J : K).push(1, b + state);
        run = b ? run + 1 : 0;
        if (run === 6) {
          state = state === 'J' ? 'K' : 'J';
          t.set(state === 'J' ? J : K).push(1, '0' + state, { stuff: true });
          run = 0;
        }
      }
    }
    t.seg('EOP', 0, 'End Of Packet: per due bit ENTRAMBI i fili vanno a 0 (stato SE0, impossibile durante i dati), poi si torna a J.');
    t.set({ DP: 0, DM: 0 }).push(2, 'SE0');
    t.set(J).push(2, 'J');
    return t.done();
  };

  G.ethernet = function (bytes) {
    const data = bytes.slice(0, 6);
    const fcs = crc32(data);
    const t = new Trace([{ id: 'TDP', name: 'TD+', idle: 0.5 }, { id: 'TDM', name: 'TD-', idle: 0.5 }], ['Scheda di rete A', 'Scheda di rete B']);
    const manchester = (b) => {
      const first = b ? 0 : 1;
      t.set({ TDP: first, TDM: 1 - first }).push(1, b);
      t.set({ TDP: 1 - first, TDM: first }).push(1);
    };
    const field = (label, byteList, desc) => {
      t.seg(label, 0, desc);
      byteList.forEach((b) => bitsLSB(b).forEach(manchester));
    };
    t.seg('Silenzio', 0, '10BASE-T su doppino: a riposo la linea non trasmette.').push(2);
    field('Preambolo (2 di 7 byte)', [0x55, 0x55], 'Il preambolo vero è lungo 7 byte di 10101010: qui ne mostriamo 2. Codifica Manchester: ogni bit ha una transizione a metà (1 = sale, 0 = scende), così il clock viaggia insieme ai dati.');
    field('SFD 0xD5', [0xd5], 'Start Frame Delimiter: finisce con "11" e rompe la regolarità del preambolo: "il frame comincia ORA".');
    field('Dati: ' + data.map((b) => hex(b)).join(' '), data, 'Il carico utile, un byte alla volta, bit meno significativo per primo. In un frame reale prima dei dati ci sono 6 byte di indirizzo MAC di destinazione, 6 di sorgente e 2 di tipo: qui li omettiamo.');
    field('FCS ' + hex(fcs, 8), [fcs & 0xff, (fcs >>> 8) & 0xff, (fcs >>> 16) & 0xff, fcs >>> 24], 'Frame Check Sequence: un CRC-32 che il ricevitore ricalcola. Se non coincide, il frame viene scartato in silenzio.');
    t.seg('Fine', 0, 'Fine trasmissione, poi un intervallo minimo (Inter Frame Gap) di 96 bit.');
    t.set({ TDP: 0.5, TDM: 0.5 }).push(3);
    return t.done();
  };

  function serial8b10b(bytes, o) {
    const t = new Trace([{ id: 'TXP', name: o.p, idle: 0.5 }, { id: 'TXN', name: o.n, idle: 0.5 }], o.devices);
    let rd = -1;
    const emit = (code) => code.split('').forEach((c, i) => t.set({ TXP: +c, TXN: 1 - +c }).push(1, i === 0 || i === 6 ? c + '·' : c));
    t.seg('Linea elettrica a riposo', 0, 'Collegamento punto-punto: una coppia differenziale per direzione.').push(2);
    t.seg('K28.5 (COMMA)', 0, 'Simbolo speciale di allineamento: contiene la sequenza 0011111 o 1100000, che nessun dato può produrre. Il ricevitore lo usa per capire dove inizia ogni simbolo.');
    let k = encK285(rd);
    rd = k.rd;
    emit(k.code);
    for (const b of bytes) {
      const e = enc8b10b(b, rd);
      t.seg('D.' + (b & 31) + '.' + (b >> 5) + ' = ' + hex(b) + ' → ' + e.code.slice(0, 6) + ' ' + e.code.slice(6), 0, 'Codifica 8b/10b: ogni byte diventa 10 bit scelti per avere quasi lo stesso numero di 0 e di 1 (disparità ora ' + (e.rd > 0 ? '+' : '−') + '). Così il segnale non ha componente continua e ha abbastanza fronti per ricostruire il clock.');
      rd = e.rd;
      emit(e.code);
    }
    t.seg(o.endLabel, 0, o.endDesc);
    k = encK285(rd);
    emit(k.code);
    return t.done();
  }

  G.pcie = function (bytes) {
    return serial8b10b(bytes.slice(0, 6), { p: 'Lane 0 TX+', n: 'Lane 0 TX-', devices: ['CPU (Root Complex)', 'Scheda (Endpoint)'], endLabel: 'K28.5', endDesc: 'Un altro simbolo di controllo. PCIe 1.x e 2.x usano 8b/10b; dalla 3.0 si passa a 128b/130b (molto meno spreco) e dalla 6.0 a PAM4 con 4 livelli di tensione.' });
  };

  G.sata = function (bytes) {
    return serial8b10b(bytes.slice(0, 6), { p: 'TX+', n: 'TX-', devices: ['Controller', 'Disco'], endLabel: 'K28.5 (primitiva ALIGN)', endDesc: 'SATA inserisce periodicamente primitive ALIGN che iniziano con K28.5 per tenere agganciati i due lati.' });
  };

  G.parallel = function (bytes) {
    const lines = [];
    for (let i = 0; i < 8; i++) lines.push({ id: 'D' + i, name: 'D' + i, idle: 0 });
    lines.push({ id: 'STB', name: 'nSTROBE', idle: 1 }, { id: 'BUSY', name: 'BUSY', idle: 0 }, { id: 'ACK', name: 'nACK', idle: 1 });
    const t = new Trace(lines, ['PC', 'Stampante']);
    t.seg('Riposo', 0, 'Otto fili di dati: un intero byte viaggia in un colpo solo, ogni bit sul suo filo.').push(1);
    for (const b of bytes) {
      const lv = {};
      bitsLSB(b).forEach((bit, i) => { lv['D' + i] = bit; });
      t.seg('Dati ' + hex(b) + printable(b), 0, 'Il PC mette il byte sugli 8 fili D0-D7 e aspetta un attimo che si stabilizzino.');
      t.set(lv).push(1, hex(b));
      t.seg('Strobe', 0, 'Impulso su nSTROBE (attivo basso): "il dato è pronto, leggilo!".');
      t.set({ STB: 0 }).push(1);
      t.set({ STB: 1, BUSY: 1 }).push(1);
      t.seg('Busy + ACK', 1, 'La stampante alza BUSY mentre lavora, poi manda un impulso su nACK: "fatto, mandami il prossimo".');
      t.push(1);
      t.set({ ACK: 0, BUSY: 0 }).push(1);
      t.set({ ACK: 1 }).push(1);
    }
    return t.done();
  };

  G.gpib = function (bytes) {
    const lines = [{ id: 'DIO', name: 'DIO1-8', kind: 'bus', idle: '' }, { id: 'DAV', name: 'DAV', idle: 1 }, { id: 'NRFD', name: 'NRFD', idle: 0 }, { id: 'NDAC', name: 'NDAC', idle: 0 }];
    const t = new Trace(lines, ['Computer (talker)', 'Strumenti (listener)']);
    t.seg('Riposo', 0, 'GPIB usa logica negativa: il nome NRFD significa "Not Ready For Data". Qui disegniamo il livello elettrico (basso = condizione vera).').push(1);
    for (const b of bytes) {
      t.seg('Ascoltatori pronti', 1, 'Tutti i listener rilasciano NRFD: la linea sale solo quando l\'ULTIMO è pronto (wired-OR), quindi il più lento detta il passo.');
      t.set({ NRFD: 1 }).push(1);
      t.seg('Dato ' + hex(b) + printable(b), 0, 'Il talker mette il byte sulle 8 linee DIO e abbassa DAV: "Data Valid".');
      t.set({ DIO: hex(b) }).push(1);
      t.set({ DAV: 0 }).push(1);
      t.seg('Accettato', 1, 'I listener abbassano NRFD (sono occupati) e, quando hanno letto tutti, NDAC sale: "Data Accepted".');
      t.set({ NRFD: 0 }).push(1);
      t.set({ NDAC: 1 }).push(1);
      t.seg('Rilascio', 0, 'Il talker rialza DAV e libera le linee; i listener riabbassano NDAC. Pronti per il prossimo byte.');
      t.set({ DAV: 1, DIO: '' }).push(1);
      t.set({ NDAC: 0 }).push(1);
    }
    return t.done();
  };

  // Ciclo di scrittura su un bus parallelo con indirizzi e dati (ISA, S-100, Unibus, PCI...).
  G.parbus = function (bytes, o) {
    const lines = [];
    if (o.clk) lines.push({ id: 'CLK', name: o.clk, idle: 0 });
    if (o.ale) lines.push({ id: 'ALE', name: o.ale, idle: 0 });
    lines.push({ id: 'ADDR', name: o.addr, kind: 'bus', idle: '' }, { id: 'DATA', name: o.data, kind: 'bus', idle: '' }, { id: 'WR', name: o.wr, idle: 1 });
    if (o.ack) lines.push({ id: 'ACK', name: o.ack, idle: 1 });
    const t = new Trace(lines, o.devices);
    const tick = (n, mark) => {
      for (let i = 0; i < n; i++) {
        if (o.clk) t.set({ CLK: 1 }).push(1, i === 0 ? mark : undefined).set({ CLK: 0 }).push(1);
        else t.push(1, i === 0 ? mark : undefined);
      }
    };
    t.seg('Riposo', 0, o.idleDesc).push(1);
    bytes.slice(0, 6).forEach((b, i) => {
      const addr = o.base + i * (o.width === undefined ? 1 : o.width);
      t.seg((o.addrLabel || 'Indirizzo') + ' ' + hex(addr, o.addrDigits || 4), 0, o.addrDesc);
      t.set({ ADDR: hex(addr, o.addrDigits || 4) });
      if (o.ale) t.set({ ALE: 1 });
      tick(1, 'A');
      if (o.ale) t.set({ ALE: 0 });
      t.seg('Dato ' + hex(b) + printable(b), 0, o.dataDesc);
      t.set({ DATA: hex(b), WR: 0 });
      tick(1, 'D');
      if (o.ack) {
        t.seg(o.ack, 1, o.ackDesc);
        t.set({ ACK: 0 });
        tick(1);
        t.set({ WR: 1 });
        tick(1);
        t.set({ ACK: 1, ADDR: '', DATA: '' });
      } else {
        tick(1);
        t.set({ WR: 1 });
        tick(1);
        t.set({ ADDR: '', DATA: '' });
      }
    });
    t.seg('Riposo', 0, 'Bus libero.');
    tick(1);
    return t.done();
  };

  G.pci = function (bytes) {
    const words = [];
    for (let i = 0; i < Math.min(bytes.length, 12); i += 4) {
      let w = 0;
      for (let k = 0; k < 4; k++) w |= (bytes[i + k] || 0) << (8 * k);
      words.push(w >>> 0);
    }
    const t = new Trace([
      { id: 'CLK', name: 'CLK 33 MHz', idle: 0 },
      { id: 'FRAME', name: 'FRAME#', idle: 1 },
      { id: 'AD', name: 'AD[31:0]', kind: 'bus', idle: '' },
      { id: 'CBE', name: 'C/BE#[3:0]', kind: 'bus', idle: '' },
      { id: 'IRDY', name: 'IRDY#', idle: 1 },
      { id: 'TRDY', name: 'TRDY#', idle: 1 },
      { id: 'DEVSEL', name: 'DEVSEL#', idle: 1 },
    ], ['CPU / bridge (initiator)', 'Scheda (target)']);
    const clk = (mark) => t.set({ CLK: 1 }).push(1, mark).set({ CLK: 0 }).push(1);
    t.seg('Bus libero', 0, 'Tutti i segnali con # sono attivi BASSI. Nessuno sta usando il bus.');
    clk();
    t.seg('Fase indirizzo', 0, 'L\'initiator abbassa FRAME# e mette l\'indirizzo sulle 32 linee AD. Le STESSE linee porteranno poi i dati: si chiama bus multiplexato. C/BE# = 0111 indica "scrittura in memoria".');
    t.set({ FRAME: 0, AD: '0xFEB00000', CBE: '0111' });
    clk('A');
    t.seg('Turnaround', 1, 'La scheda riconosce il proprio indirizzo e risponde abbassando DEVSEL#.');
    t.set({ AD: words.length ? hex(words[0], 8) : '', CBE: '0000', IRDY: 0, DEVSEL: 0 });
    clk();
    words.forEach((w, i) => {
      const last = i === words.length - 1;
      t.seg('Dato ' + (i + 1) + ': ' + hex(w, 8), 0, 'Burst: quando IRDY# (initiator pronto) e TRDY# (target pronto) sono entrambi bassi, una parola di 32 bit passa a ogni colpo di clock.' + (last ? ' FRAME# rialzato = questa è l\'ultima.' : ''));
      t.set({ AD: hex(w, 8), TRDY: 0, FRAME: last ? 1 : 0 });
      clk('D' + (i + 1));
    });
    t.seg('Fine', 0, 'IRDY#, TRDY# e DEVSEL# tornano alti: bus di nuovo libero.');
    t.set({ AD: '', CBE: '', IRDY: 1, TRDY: 1, DEVSEL: 1 });
    clk();
    return t.done();
  };

  G.i2s = function (bytes) {
    const b = bytes.concat([0, 0, 0, 0]);
    const left = (b[0] << 8) | b[1];
    const right = (b[2] << 8) | b[3];
    const t = new Trace([{ id: 'SCK', name: 'SCK (bit clock)', idle: 0 }, { id: 'WS', name: 'WS (L/R)', idle: 1 }, { id: 'SD', name: 'SD (dati)', idle: 0 }], ['Lettore audio', 'DAC']);
    t.seg('Fine canale destro precedente', 0, '').set({ WS: 0 }).push(1).set({ SCK: 1 }).push(1);
    t.set({ SCK: 0 });
    const chan = (val, ws, label) => {
      t.seg(label + ' = ' + val, 0, 'WS dice di quale canale è il campione (0 = sinistro, 1 = destro). Il dato parte UN colpo di clock dopo il cambio di WS, dal bit più significativo, in complemento a due.');
      const bits = bitsMSB(val, 16);
      bits.forEach((bit, i) => {
        if (i === 15) t.set({ WS: 1 - ws });
        t.set({ SCK: 0, SD: bit }).push(1, bit).set({ SCK: 1 }).push(1);
      });
    };
    t.set({ WS: 0 });
    chan(left, 0, 'Campione sinistro');
    chan(right, 1, 'Campione destro');
    t.seg('…', 0, 'E così via, 44 100 o 48 000 volte al secondo per canale.').set({ SCK: 0, SD: 0 }).push(1);
    return t.done();
  };

  G.jtag = function (bytes) {
    const t = new Trace([{ id: 'TCK', name: 'TCK', idle: 0 }, { id: 'TMS', name: 'TMS', idle: 0 }, { id: 'TDI', name: 'TDI', idle: 0 }, { id: 'TDO', name: 'TDO', idle: 0.5 }], ['Debugger', 'Chip (TAP)']);
    const clk = (tms, tdi, tdo, mark) => {
      t.set({ TCK: 0, TMS: tms, TDI: tdi === undefined ? 0 : tdi, TDO: tdo === undefined ? 0.5 : tdo }).push(1, mark);
      t.set({ TCK: 1 }).push(1);
    };
    t.seg('Run-Test/Idle', 0, 'Ogni chip compatibile ha una piccola macchina a stati (TAP) pilotata dal solo filo TMS.');
    clk(0);
    const path = [[1, 'Select-DR'], [0, 'Capture-DR'], [0, 'Shift-DR']];
    for (const [tms, name] of path) {
      t.seg('TMS=' + tms + ' → ' + name, 0, 'A ogni fronte di TCK il valore di TMS sposta la macchina a stati: con la sequenza 1-0-0 si arriva a Shift-DR, dove i dati scorrono.');
      clk(tms);
    }
    const b = bytes[0] || 0;
    t.seg('Shift-DR: ' + hex(b) + ' dentro, dati fuori', 0, 'In Shift-DR il registro del chip diventa un nastro trasportatore: un bit entra da TDI e un bit esce da TDO a ogni colpo di clock. L\'ultimo bit si spedisce con TMS=1.');
    bitsLSB(b).forEach((bit, i) => clk(i === 7 ? 1 : 0, bit, (b >> ((i + 3) % 8)) & 1, bit));
    t.seg('Update-DR → Idle', 0, 'Exit1-DR, poi Update-DR applica il valore, e si torna in Idle.');
    clk(1);
    clk(0);
    return t.done();
  };

  G.mil1553 = function (bytes) {
    const t = new Trace([{ id: 'BP', name: 'Bus A +', idle: 0.5 }, { id: 'BN', name: 'Bus A −', idle: 0.5 }], ['Bus Controller', 'Terminale remoto 5']);
    const hl = (h) => t.set({ BP: h, BN: 1 - h });
    const word = (label, sync, value, desc) => {
      t.seg(label + ' (sync)', 0, 'Sincronismo lungo 3 bit con una sola transizione al centro: impossibile da confondere con i dati Manchester. ' + (sync ? 'Alto→basso = parola di COMANDO.' : 'Basso→alto = parola di DATI.'));
      hl(sync ? 1 : 0).push(3, 'SYNC');
      hl(sync ? 0 : 1).push(3);
      t.seg(label, 0, desc);
      const bits = bitsMSB(value, 16);
      bits.forEach((b) => { hl(b).push(1, b); hl(1 - b).push(1); });
      const p = 1 ^ bits.reduce((a, c) => a ^ c, 0);
      t.seg('Parità dispari', 0, 'Un bit di parità dispari per ogni parola.');
      hl(p).push(1, p);
      hl(1 - p).push(1);
    };
    t.seg('Bus a riposo', 0, 'Bus ridondato (A e B) su cavo twinax schermato, accoppiato a trasformatore: pensato per resistere a vibrazioni e disturbi in volo.').push(2);
    const words = [];
    for (let i = 0; i < Math.min(bytes.length, 4); i += 2) words.push(((bytes[i] || 0) << 8) | (bytes[i + 1] || 0));
    const cmd = (5 << 11) | (0 << 10) | (2 << 5) | words.length;
    word('Comando ' + hex(cmd, 4), 1, cmd, 'Parola di comando: indirizzo terminale (5 bit) = 5, T/R = 0 (ricevi), sottoindirizzo = 2, numero di parole = ' + words.length + '. Codifica Manchester II: 1 = alto→basso.');
    words.forEach((w, i) => word('Dato ' + (i + 1) + ' ' + hex(w, 4), 0, w, 'Parola di dati da 16 bit.'));
    t.seg('Silenzio', 0, 'Ora il terminale remoto risponde con una parola di stato.');
    t.set({ BP: 0.5, BN: 0.5 }).push(3);
    return t.done();
  };

  G.flexray = function (bytes) {
    const t = new Trace([{ id: 'BP', name: 'BP', idle: 0.5 }, { id: 'BM', name: 'BM', idle: 0.5 }], ['Nodo freni', 'Nodo sterzo']);
    const lv = (b) => t.set({ BP: b, BM: 1 - b });
    t.seg('Idle', 0, 'Bus a riposo: entrambe le linee a 2,5 V.').push(2);
    t.seg('TSS', 0, 'Transmission Start Sequence: linea bassa per 3-15 bit, dà tempo alle stelle attive di accendersi.');
    lv(0).push(5);
    t.seg('FSS', 0, 'Frame Start Sequence: un bit alto.');
    lv(1).push(1);
    bytes.slice(0, 6).forEach((b) => {
      t.seg('BSS + ' + hex(b) + printable(b), 0, 'Ogni byte è preceduto da un Byte Start Sequence (1-0) che aiuta a restare sincronizzati, poi 8 bit dal più significativo. Il frame parte in uno slot di tempo prefissato: FlexRay è deterministico.');
      lv(1).push(1, 'B');
      lv(0).push(1);
      bitsMSB(b, 8).forEach((bit) => lv(bit).push(1, bit));
    });
    t.seg('FES', 0, 'Frame End Sequence (0-1), poi il bus torna a riposo fino al prossimo slot.');
    lv(0).push(1);
    lv(1).push(1);
    t.set({ BP: 0.5, BM: 0.5 }).push(2);
    return t.done();
  };

  G.firewire = function (bytes) {
    const t = new Trace([{ id: 'D', name: 'Data (TPB)', idle: 0 }, { id: 'S', name: 'Strobe (TPA)', idle: 0 }], ['Videocamera', 'Computer']);
    t.seg('Riposo', 0, '').push(2);
    let d = 0;
    let s = 0;
    bytes.slice(0, 6).forEach((b) => {
      t.seg('Dato ' + hex(b) + printable(b), 0, 'Codifica Data-Strobe: Data porta il bit; Strobe cambia stato SOLO quando Data non cambia. Così a ogni bit esattamente UNA delle due linee commuta, e lo XOR delle due ricostruisce il clock.');
      bitsMSB(b, 8).forEach((bit) => {
        if (bit === d) s = 1 - s;
        d = bit;
        t.set({ D: d, S: s }).push(1, bit);
      });
    });
    t.seg('Fine', 0, '').set({ D: 0, S: 0 }).push(2);
    return t.done();
  };

  G.axi = function (bytes) {
    const t = new Trace([
      { id: 'CLK', name: 'ACLK', idle: 0 },
      { id: 'AWV', name: 'AWVALID', idle: 0 }, { id: 'AWR', name: 'AWREADY', idle: 0 }, { id: 'AW', name: 'AWADDR', kind: 'bus', idle: '' },
      { id: 'WV', name: 'WVALID', idle: 0 }, { id: 'WR', name: 'WREADY', idle: 0 }, { id: 'W', name: 'WDATA', kind: 'bus', idle: '' },
      { id: 'BV', name: 'BVALID', idle: 0 }, { id: 'BR', name: 'BREADY', idle: 0 },
    ], ['Core CPU (manager)', 'Memoria (subordinate)']);
    const clk = (m) => t.set({ CLK: 1 }).push(1, m).set({ CLK: 0 }).push(1);
    t.seg('Riposo', 0, 'AXI collega i blocchi DENTRO un chip. Ha 5 canali indipendenti; qui vediamo i 3 della scrittura.');
    clk();
    t.seg('Canale indirizzo (AW)', 0, 'Regola d\'oro di AXI: un dato passa solo nel ciclo in cui VALID (chi manda) e READY (chi riceve) sono entrambi a 1.');
    t.set({ AWV: 1, AW: '0x40001000' });
    clk();
    t.set({ AWR: 1 });
    clk('✓');
    t.set({ AWV: 0, AWR: 0, AW: '' });
    bytes.slice(0, 4).forEach((b, i) => {
      t.seg('Canale dati (W): ' + hex(b) + printable(b), 0, 'Il canale dati è indipendente: in un burst passa una parola per ogni ciclo con VALID e READY alti.');
      t.set({ WV: 1, WR: 1, W: hex(b) });
      clk('✓');
      if (i === 1) {
        t.seg('Pausa (WREADY=0)', 1, 'La memoria è occupata e abbassa READY: il dato resta fermo sul bus finché non torna pronta (backpressure).');
        t.set({ WR: 0 });
        clk();
      }
    });
    t.set({ WV: 0, WR: 0, W: '' });
    t.seg('Risposta (B)', 1, 'Canale di risposta: la memoria conferma "OKAY" con BVALID, il manager la accetta con BREADY.');
    t.set({ BV: 1, BR: 1 });
    clk('✓');
    t.set({ BV: 0, BR: 0 });
    clk();
    return t.done();
  };

  G.nrz = function (bytes, o) {
    const t = new Trace([{ id: 'P', name: o.p || 'TX+', idle: 0.5 }, { id: 'N', name: o.n || 'TX-', idle: 0.5 }], o.devices);
    t.seg('Riposo', 0, '').push(2);
    bytes.slice(0, 6).forEach((b) => {
      t.seg('Bit ' + hex(b) + printable(b), 0, o.desc);
      bitsMSB(b, 8).forEach((bit) => t.set({ P: bit, N: 1 - bit }).push(1, bit));
    });
    t.seg('Fine', 0, '').set({ P: 0.5, N: 0.5 }).push(2);
    return t.done();
  };

  function generate(gen, bytes, opts) {
    if (!G[gen]) throw new Error('Generatore sconosciuto: ' + gen);
    return G[gen](bytes, opts || {});
  }

  const api = {
    generate: generate,
    generators: G,
    crcCan15: crcCan15,
    crcModbus: crcModbus,
    crcUsb16: crcUsb16,
    crc32: crc32,
    enc8b10b: enc8b10b,
    linProtectedId: linProtectedId,
    linChecksum: linChecksum,
    hex: hex,
  };
  root.Encoders = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
