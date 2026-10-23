/* Laboratorio «Dal pannello di cavi al programma memorizzato» (in preparazione) */
ProgStoria.lab('programma-memorizzato', {
  titolo: 'Dal pannello di cavi al programma memorizzato',
  monta(el, ctx) {
    el.append(ctx.h('div', { class: 'pg-stato pg-stato--vuoto' }, ctx.h('p', null, 'Laboratorio in costruzione.')));
    return {};
  },
});
