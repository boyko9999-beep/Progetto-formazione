/* Laboratorio «Il prossimo token» (in preparazione) */
ProgStoria.lab('prossimo-token', {
  titolo: 'Il prossimo token',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
