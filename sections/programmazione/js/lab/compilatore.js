/* Laboratorio «Il compilatore al lavoro» (in preparazione) */
ProgStoria.lab('compilatore', {
  titolo: 'Il compilatore al lavoro',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
