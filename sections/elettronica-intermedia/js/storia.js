/*
 * Storia della sezione: le epoche e le tappe che non appartengono a un solo capitolo
 * (soprattutto le valvole, antenate del transistor). Le tappe dei capitoli stanno nei file
 * chapters/*.js (history.events): la pagina #storia le unisce in un'unica linea del tempo.
 *
 * Qui c'è anche il "banco storico" della pagina (EI.historyDemo): una valvola termoionica
 * da accendere, prima come diodo di Fleming e poi come triodo di De Forest.
 * A livello del file non si tocca il DOM: Node carica questo file dopo core.js per i test
 * (tests/storia.test.js).
 */
(function (root) {
  'use strict';

  const EI = root.EI;

  /* ---------- testi della pagina ---------- */

  EI.historyLead = 'Dai cristalli e dalle valvole di vetro fino all\'amplificatore integrato: un secolo e mezzo di idee, in cui ogni invenzione nasce per superare i limiti di quella precedente. Qui sotto puoi accendere la valvola che ha aperto l\'era dell\'elettronica; le tappe con l\'etichetta di un capitolo ti portano al laboratorio dove le provi.';

  EI.eras = [
    {
      from: 1800, to: 1939, title: 'Cristalli e valvole',
      text: 'Nell\'Ottocento si scopre che certi cristalli conducono in un verso solo e che un filamento caldo, nel vuoto, lascia uscire elettricità. Da queste due stranezze nascono il rivelatore a cristallo, il diodo a vuoto di Fleming e il triodo di De Forest, il primo componente capace di amplificare. Con le valvole arrivano la radio, il telefono da costa a costa e i primi amplificatori; ma restano calde, fragili e assetate di energia.',
    },
    {
      from: 1940, to: 1959, title: 'Nasce il transistor',
      text: 'Il radar della guerra insegna a preparare germanio e silicio purissimi. Ai Bell Labs un gruppo nato per sostituire valvole e relè capisce la giunzione P-N e, tra il 1947 e il 1948, inventa il transistor: freddo, piccolo e robusto. In poco più di dieci anni arrivano il transistor al silicio, la radio tascabile e l\'idea di costruire un intero circuito su un solo pezzo di semiconduttore.',
    },
    {
      from: 1960, to: 1979, title: 'L\'analogico diventa integrato',
      text: 'Con il processo planare i transistor si fabbricano a decine, poi a migliaia, sulla stessa fetta di silicio. Arrivano il MOSFET, i LED visibili, l\'amplificatore operazionale µA741, il timer 555 e i regolatori di tensione a tre piedini: un amplificatore che prima chiedeva valvole, trasformatori e un telaio intero ora sta in un contenitore con otto piedini.',
    },
    {
      from: 1980, to: 9999, label: '1980–oggi', title: 'Ovunque e invisibile',
      text: 'I componenti di questa sezione sono in ogni oggetto elettronico: caricabatterie e alimentatori, sensori, lampadine a LED bianchi nati dal LED blu. Le valvole sopravvivono in poche nicchie, come gli amplificatori per chitarra e il magnetron dei forni a microonde; il resto del loro lavoro lo fanno, a freddo, miliardi di transistor.',
    },
  ];

  // Tappe di contesto: non appartengono a nessun capitolo (le valvole e i laboratori che le hanno superate).
  // Date, nomi e primati verificati con fonti affidabili; le fonti sono elencate nel resoconto del lavoro.
  EI.timeline = [
    {
      year: 1883, title: 'L\'effetto Edison', who: 'Thomas Alva Edison',
      text: 'Per capire perché le sue lampadine si anneriscono, Edison chiude nel bulbo una piastrina di metallo: se la collega al lato positivo del filamento, un galvanometro segna una corrente che attraversa il vuoto; dal lato negativo, niente. La brevetta come indicatore di tensione, senza saperla spiegare.',
    },
    {
      year: 1904, title: 'La valvola di Fleming', who: 'John Ambrose Fleming',
      text: 'Consulente della compagnia di Marconi, Fleming cerca un rivelatore migliore per la radio e riprende l\'effetto Edison: nel novembre 1904 brevetta la «valvola oscillatoria», un diodo a vuoto che lascia passare la corrente in un verso solo. Le oscillazioni radio, troppo rapide per un galvanometro, diventano una corrente in un solo verso che l\'ago riesce a seguire.',
    },
    {
      year: 1906, title: 'L\'Audion e la griglia', who: 'Lee De Forest',
      text: 'De Forest presenta l\'Audion, una valvola per ricevere la radio, e a fine anno aggiunge tra filamento e placca un filo piegato a zig-zag che chiama grid, «griglia»: è il triodo, protetto dai brevetti del 1906-1908. Non sa bene perché funzioni e lo crede merito del gas rimasto nel bulbo: le prime Audion sono a vuoto «morbido», capricciose, e se la tensione di placca sale troppo si accendono di luce azzurra.',
    },
    {
      year: 1913, title: 'Il vuoto spinto', who: 'Harold D. Arnold (Western Electric) e Irving Langmuir (General Electric)',
      text: 'Due laboratori capiscono, quasi insieme, che il gas non serve: anzi, disturba. Pompando via quasi tutta l\'aria, il triodo diventa un amplificatore stabile e prevedibile. Chi sia arrivato primo lo stabilirà nel 1931 la Corte suprema degli Stati Uniti, annullando il brevetto di Langmuir.',
    },
    {
      year: 1915, title: 'Il telefono da costa a costa', who: 'Alexander Graham Bell e Thomas Watson (AT&T)',
      text: 'Il 25 gennaio Bell, a New York, parla con il suo vecchio assistente Watson, a San Francisco. Lungo migliaia di chilometri di filo la voce si spegnerebbe: la tengono viva i ripetitori, amplificatori a triodi ad alto vuoto sistemati lungo la linea.',
    },
    {
      year: 1925, title: 'Nascono i Bell Labs', who: 'AT&T e Western Electric',
      text: 'Il 1° gennaio i ricercatori di AT&T e della Western Electric diventano un unico laboratorio, i Bell Telephone Laboratories. Da qui usciranno l\'amplificatore a retroazione, il transistor e buona parte dei componenti di questa sezione.',
    },
    {
      year: 1945, title: 'Un gruppo per sostituire la valvola', who: 'Mervin Kelly, William Shockley e Stanley Morgan (Bell Labs)',
      text: 'Mervin Kelly, che anni prima aveva diretto lo sviluppo delle valvole, crea ai Bell Labs un gruppo di fisica dello stato solido guidato da Shockley e dal chimico Stanley Morgan, con un obiettivo dichiarato: sostituire valvole e relè delle centrali telefoniche con dispositivi a semiconduttore. Due anni dopo nasce il transistor.',
    },
    {
      year: 1958, title: 'Verso il circuito integrato', who: 'Jack Kilby (Texas Instruments) e Robert Noyce (Fairchild)',
      text: 'Kilby nel 1958 e Noyce nel 1959 costruiscono più componenti su un solo pezzo di semiconduttore: la storia continua nella sezione <a href="../porte-logiche/index.html#integrato">Porte logiche e chip</a>.',
    },
  ];

  /* ---------- modello fisico della valvola (puro, testato in tests/storia.test.js) ---------- */

  /*
   * Triodo ideale tarato sul 6J5, un triodo per piccoli segnali degli anni Trenta (dati di catalogo:
   * μ = 20, 9 mA con 250 V di placca e −8 V di griglia, filamento 6,3 V · 0,3 A).
   * Con la legge dei 3/2 la pendenza in quel punto viene 3,0 mA/V (il catalogo dice 2,6 mA/V):
   * è un modello idealizzato, non la copia di una valvola vera.
   */
  const MU = 20;
  const K = 9e-3 / Math.pow(4.5, 1.5); // A/V^1,5 (perveanza del triodo)
  const KD = K / Math.pow(MU, 1.5); // diodo: stessa valvola, griglia unita al catodo
  const KG = 3e-4; // griglia positiva: Ig = KG · Vg^1,5
  const IS = 0.03; // emissione massima del catodo ben caldo, in ampere
  const T_COLD = 300; // K
  const T_HOT = 1100; // K, catodo a ossidi
  const WK = 12000; // lavoro di estrazione / k, in kelvin (circa 1 eV)

  const model = {
    MU: MU, K: K, KD: KD, KG: KG, IS: IS,
    RL_DIODE: 10000, RL_TRIODE: 22000,
    HEATER: { v: 6.3, i: 0.3 },

    // Legge di Child-Langmuir: corrente limitata dalla carica spaziale, I = k·V^1,5 (zero se V ≤ 0).
    childLangmuir: (v, k) => (v > 0 ? (k == null ? KD : k) * Math.pow(v, 1.5) : 0),

    // Corrente che lascia il catodo del triodo: conta la tensione "efficace" Vg + Vp/μ.
    cathode: (vg, vp, mu, k) => {
      const u = vg + vp / (mu || MU);
      return u > 0 ? (k == null ? K : k) * Math.pow(u, 1.5) : 0;
    },

    // Corrente di griglia (modello semplice): solo con la griglia positiva.
    gridCurrent: (vg) => (vg > 0 ? KG * Math.pow(vg, 1.5) : 0),

    // Emissione del catodo in funzione del riscaldamento (0 = freddo, 1 = a regime):
    // legge di Richardson, I ∝ T²·e^(−W/kT), normalizzata a IS quando il catodo è caldo.
    emission: (warm) => {
      const w = Math.min(1, Math.max(0, warm));
      if (w <= 0) return 0;
      const T = T_COLD + (T_HOT - T_COLD) * w;
      return IS * (T / T_HOT) * (T / T_HOT) * Math.exp(-WK * (1 / T - 1 / T_HOT));
    },

    // Minimo "morbido" fra la corrente della carica spaziale e l'emissione disponibile (saturazione).
    limit: (i, imax) => {
      if (!(i > 0) || !(imax > 0)) return 0;
      return i / Math.pow(1 + Math.pow(i / imax, 4), 0.25);
    },

    // Diodo: corrente di placca con il catodo riscaldato al livello warm.
    diode: (vp, warm) => model.limit(model.childLangmuir(vp, KD), model.emission(warm == null ? 1 : warm)),

    // Triodo: correnti di catodo, placca e griglia. La placca raccoglie solo se è positiva.
    triode: (vg, vp, warm) => {
      const ksc = model.cathode(vg, vp);
      const gsc = model.gridCurrent(vg);
      const tot = ksc + (vp > 0 ? 0 : gsc);
      if (!(tot > 0)) return { ik: 0, ip: 0, ig: 0, sc: 0 };
      const ik = model.limit(tot, model.emission(warm == null ? 1 : warm));
      const s = ik / tot;
      const ig = Math.min(ik, gsc * s);
      const ip = vp > 0 ? Math.max(0, ik - ig) : 0;
      return { ik: ik, ip: ip, ig: ig, sc: tot };
    },

    // Punto di lavoro con la resistenza di carico: Vp = B − RL·I(Vp), risolto per bisezione.
    // iOf(vp) deve crescere con vp. Con B ≤ 0 la placca non è positiva e la corrente è zero.
    operating: (B, RL, iOf) => {
      if (!(B > 0)) return { vp: B, ip: 0 };
      let lo = 0;
      let hi = B;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (mid + RL * iOf(mid) > B) hi = mid; else lo = mid;
      }
      const vp = (lo + hi) / 2;
      return { vp: vp, ip: Math.max(0, (B - vp) / RL) };
    },

    diodeOP: (vs, warm, RL) => model.operating(vs, RL || model.RL_DIODE, (v) => model.diode(v, warm)),

    triodeOP: (B, vg, warm, RL) => {
      const op = model.operating(B, RL || model.RL_TRIODE, (v) => model.triode(vg, v, warm).ip);
      const t = model.triode(vg, Math.max(op.vp, 1e-9), warm);
      return { vp: op.vp, ip: op.ip, ig: B > 0 ? t.ig : model.gridCurrent(vg), ik: op.ip + (B > 0 ? t.ig : 0) };
    },

    // Piccoli segnali: pendenza gm = dIk/dVg, resistenza interna rp = μ/gm, guadagno Av = −μ·RL/(RL + rp).
    gm: (vg, vp) => {
      const u = vg + vp / MU;
      return u > 0 ? 1.5 * K * Math.sqrt(u) : 0;
    },
    rp: (vg, vp) => {
      const g = model.gm(vg, vp);
      return g > 0 ? MU / g : Infinity;
    },
    gain: (vg, vp, RL) => {
      const r = model.rp(vg, vp);
      return isFinite(r) ? -MU * RL / (RL + r) : 0;
    },

    heaterPower: (v, i) => v * i,
  };

  EI.storia = { model: model };

  /* ---------- il banco storico ---------- */

  /*@@LAB@@*/

  EI.historyDemo = null;
})(typeof window !== 'undefined' ? window : globalThis);
