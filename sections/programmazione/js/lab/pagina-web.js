/* Laboratorio «Come nasce una pagina web» (in preparazione) */
ProgStoria.lab('pagina-web', {
  titolo: 'Come nasce una pagina web',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
