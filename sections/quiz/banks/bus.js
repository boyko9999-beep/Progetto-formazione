/*
 * Banca domande del quiz: i bus di BusLab.
 * Riusa le domande delle 31 lezioni (js/buses.js) e ne ricava altre dai dati:
 * linee del tempo da riordinare e sigle da abbinare. Le domande in più scritte
 * a mano, e i ritocchi di qualunque domanda di questo file (QuizBusFixes, per id),
 * sono in bus-extra.js, che va caricato prima di questo file.
 */
(function (root) {
  'use strict';

  const data = root.BusData;
  if (!data || !root.QuizBank) return;
  const byId = Object.fromEntries(data.BUSES.map((b) => [b.id, b]));
  const catById = Object.fromEntries(data.CATEGORIES.map((c) => [c.id, c]));
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
  const timelines = [
    { level: 1, ids: ['rs232', 'uart', 'i2c', 'usb'], q: 'Metti questi bus in ordine di nascita, dal più antico.' },
    { level: 1, ids: ['isa', 'pci', 'pcie', 'thunderbolt'], q: 'Dentro e fuori dal PC: ordina questi bus dal più antico al più recente.' },
    { level: 2, ids: ['gpib', 'ethernet', 'can', 'pcie'], q: 'Ordina questi bus dal più antico al più recente.' },
    { level: 2, ids: ['modbus', 'can', 'lin', 'flexray'], q: 'Fabbriche e automobili: ordina questi bus dal più antico al più recente.' },
    { level: 3, ids: ['unibus', 's100', 'isa', 'scsi'], q: 'I bus dei primi computer: ordinali dal più antico al più recente.' },
    { level: 3, ids: ['i2c', 'spi', 'onewire', 'smbus', 'i3c'], q: 'I bus tra i chip: ordinali dal più antico al più recente.' },
  ];
  timelines.forEach((t, i) => {
    const list = t.ids.map((id) => byId[id]).sort((a, b) => a.year - b.year);
    questions.push({
      id: 'bus-ordine-' + (i + 1),
      type: 'order',
      level: t.level,
      topic: 'Linea del tempo',
      chapter: list[0].category,
      q: t.q,
      items: list.map((b) => b.name),
      ends: ['Più antico', 'Più recente'],
      why: list.map((b) => b.name + ' (' + b.year + ')').join(', ') + '.',
    });
  });

  // Sigle da sciogliere.
  const acronyms = [
    { level: 1, ids: ['uart', 'spi', 'i2c', 'usb'] },
    { level: 2, ids: ['can', 'lin', 'sata', 'pci'] },
    { level: 3, ids: ['scsi', 'isa', 'gpib', 'jtag'] },
  ];
  acronyms.forEach((a, i) => {
    const list = a.ids.map((id) => byId[id]);
    questions.push({
      id: 'bus-sigle-' + (i + 1),
      type: 'match',
      level: a.level,
      topic: 'Sigle',
      chapter: list[0].category,
      q: 'Abbina ogni sigla al suo nome completo.',
      pairs: list.map((b) => [b.name, b.full]),
      why: list.map((b) => b.name + ' = ' + b.full).join('; ') + '.',
    });
  });

  // Ogni bus nel suo mondo.
  const homes = ['midi', 'i2c', 'pcie', 'can', 'ethernet'].map((id) => byId[id]);
  questions.push({
    id: 'bus-mondi-1',
    type: 'match',
    level: 1,
    topic: 'Dove si usano',
    chapter: 'reti',
    q: 'Abbina ogni bus al mondo in cui lavora.',
    pairs: homes.map((b) => [b.name, catById[b.category].name]),
    why: homes.map((b) => b.name + ': ' + catById[b.category].name.toLowerCase()).join('; ') + '.',
  });

  // I ritocchi di bus-extra.js valgono per tutte le domande, anche per quelle ricavate dai dati.
  questions.forEach((q, i) => { if (fixes[q.id]) questions[i] = Object.assign({}, q, fixes[q.id]); });

  root.QuizBank.register({
    slug: 'bus',
    number: 9,
    title: 'Bus e protocolli',
    subtitle: 'Le ' + data.BUSES.length + ' lezioni di BusLab, dal telegrafo al PCI Express',
    chapters: data.CATEGORIES.map((c) => ({ id: c.id, title: c.name })),
    questions: questions,
  });
})(typeof window !== 'undefined' ? window : globalThis);
