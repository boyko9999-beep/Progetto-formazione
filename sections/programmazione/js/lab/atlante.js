/* Laboratorio «L'albero dei linguaggi» (in preparazione) */
ProgStoria.lab('atlante', {
  titolo: 'L\'albero dei linguaggi',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
