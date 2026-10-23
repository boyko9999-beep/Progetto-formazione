/* Laboratorio «GOTO contro programmazione strutturata» (in preparazione) */
ProgStoria.lab('spaghetti', {
  titolo: 'GOTO contro programmazione strutturata',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
