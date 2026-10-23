/* Laboratorio «L'assemblatore» (in preparazione) */
ProgStoria.lab('assemblatore', {
  titolo: 'L\'assemblatore',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
