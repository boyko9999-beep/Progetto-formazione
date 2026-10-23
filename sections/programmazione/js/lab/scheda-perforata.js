/* Laboratorio «La perforatrice IBM 029» (in preparazione) */
ProgStoria.lab('scheda-perforata', {
  titolo: 'La perforatrice IBM 029',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
