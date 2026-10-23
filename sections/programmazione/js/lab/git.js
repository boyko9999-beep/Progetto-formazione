/* Laboratorio «Git, la macchina del tempo del codice» (in preparazione) */
ProgStoria.lab('git', {
  titolo: 'Git, la macchina del tempo del codice',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
