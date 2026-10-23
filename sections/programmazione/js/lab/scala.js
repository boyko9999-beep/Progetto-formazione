/* Laboratorio «La scala dell'astrazione» (in preparazione) */
ProgStoria.lab('scala', {
  titolo: 'La scala dell\'astrazione',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
