/* Laboratorio «Il percettrone che impara» (in preparazione) */
ProgStoria.lab('percettrone', {
  titolo: 'Il percettrone che impara',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
