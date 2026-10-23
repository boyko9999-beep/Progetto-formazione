/* Laboratorio «Un BASIC dell'epoca» (in preparazione) */
ProgStoria.lab('basic', {
  titolo: 'Un BASIC dell\'epoca',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
