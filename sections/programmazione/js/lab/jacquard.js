/* Laboratorio «Il telaio Jacquard» (in preparazione) */
ProgStoria.lab('jacquard', {
  titolo: 'Il telaio Jacquard',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
