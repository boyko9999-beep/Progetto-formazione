/*
 * Banca domande del quiz: i bus di BusLab.
 * Riusa le domande delle 31 lezioni (js/buses.js) e ne ricava altre dai dati:
 * le linee del tempo da riordinare. Le domande in più scritte a mano, e i
 * ritocchi di qualunque domanda di questo file (QuizBusFixes, per id), sono in
 * bus-extra.js, che va caricato prima di questo file.
 */
(function (root) {
  'use strict';

  const data = root.BusData;
  if (!data || !root.QuizBank) return;
  const byId = Object.fromEntries(data.BUSES.map((b) => [b.id, b]));
  const fixes = root.QuizBusFixes || {};

  const questions = [];
  data.BUSES.forEach((b) => {
    b.quiz.forEach((q, i) => {
      const id = 'bus-' + b.id + '-' + (i + 1);
      questions.push(Object.assign({
        id: id,
        type: 'choice',
        level: i === 0 && b.quiz.length > 1 ? 1 : 2,
        topic: b.name,
        chapter: b.category,
        q: q.q,
        options: q.options,
        answer: q.answer,
        why: q.why,
      }));
    });
  });

  // Linee del tempo: gli anni vengono dai dati di BusLab, così restano sempre coerenti.
  // Fa eccezione il why quando una data dei dati va spiegata (il GPIB, lo SCSI nato come SASI, AMBA e AXI).
  // Le linee che mescolano categorie diverse stanno nel capitolo «confronti».
  const timelines = [
    { level: 1, chapter: 'confronti', ids: ['rs232', 'i2c', 'usb', 'i3c'], q: 'Metti questi bus in ordine di nascita, dal più antico.' },
    { level: 1, chapter: 'confronti', ids: ['isa', 'pci', 'pcie', 'thunderbolt'], q: 'Dentro e fuori dal PC: ordina questi bus dal più antico al più recente.' },
    {
      level: 2, chapter: 'confronti', ids: ['gpib', 'ethernet', 'can', 'pcie'], q: 'Ordina questi bus dal più antico al più recente.',
      why: 'GPIB (HP-IB, fine anni \'60; standard IEEE-488 nel 1975), Ethernet (1973), CAN (1986), PCI Express (2003).',
    },
    { level: 2, ids: ['modbus', 'can', 'lin', 'flexray'], q: 'Fabbriche e automobili: ordina questi bus dal più antico al più recente.' },
    {
      level: 3, ids: ['unibus', 's100', 'scsi', 'pci'], q: 'Dai minicomputer al PC: ordina questi bus dal più antico al più recente.',
      why: 'Unibus (1970), S-100 (1974), SCSI (1986, nato come SASI nel 1981), PCI (1992).',
    },
    {
      level: 3, ids: ['i2c', 'smbus', 'axi', 'i3c'], q: 'I bus tra i chip: ordinali dal più antico al più recente.',
      why: 'I²C (Philips, 1982), SMBus (Intel, 1995), AMBA (ARM, 1996; il suo bus AXI è del 2003), I3C (MIPI, 2017).',
    },
  ];
  timelines.forEach((t, i) => {
    const list = t.ids.map((id) => byId[id]).sort((a, b) => a.year - b.year);
    questions.push({
      id: 'bus-ordine-' + (i + 1),
      type: 'order',
      level: t.level,
      topic: 'Linea del tempo',
      chapter: t.chapter || list[0].category,
      q: t.q,
      items: list.map((b) => b.name),
      ends: ['Più antico', 'Più recente'],
      why: t.why || list.map((b) => b.name + ' (' + b.year + ')').join(', ') + '.',
    });
  });

  // I ritocchi di bus-extra.js valgono per tutte le domande, anche per quelle ricavate dai dati.
  questions.forEach((q, i) => { if (fixes[q.id]) questions[i] = Object.assign({}, q, fixes[q.id]); });

  root.QuizBank.register({
    slug: 'bus',
    number: 9,
    title: 'Bus e protocolli',
    subtitle: 'Le ' + data.BUSES.length + ' lezioni di BusLab, dal telegrafo al PCI Express',
    chapters: data.CATEGORIES.map((c) => ({ id: c.id, title: c.name })).concat({ id: 'confronti', title: 'Tutti i bus a confronto' }),
    questions: questions,
  });
})(typeof window !== 'undefined' ? window : globalThis);
