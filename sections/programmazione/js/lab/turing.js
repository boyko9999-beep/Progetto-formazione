/* Laboratorio «La macchina di Turing» (in preparazione) */
ProgStoria.lab('turing', {
  titolo: 'La macchina di Turing',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
