/* Laboratorio «Classi e oggetti» (in preparazione) */
ProgStoria.lab('oggetti', {
  titolo: 'Classi e oggetti',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
