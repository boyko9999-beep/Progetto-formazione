/* Registrazione della sezione nell'indice dell'enciclopedia (sections/index.html). */
window.Enciclopedia && Enciclopedia.register({
  slug: 'porte-logiche',
  numero: 4,
  titolo: 'Porte logiche e chip',
  sottotitolo: 'Dall\'algebra di Boole ai chip con miliardi di transistor: come la logica è diventata silicio.',
  periodo: '1847 – oggi',
  colore: 'var(--c-chip)',
  capitoli: [
    { id: 'boole', titolo: 'La logica prima dei circuiti', periodo: '1847 – 1938', descrizione: 'Boole trasforma il ragionamento in algebra e Shannon scopre che gli interruttori sanno fare quei calcoli.' },
    { id: 'porte', titolo: 'Le porte logiche', periodo: '1913 – oggi', descrizione: 'NOT, AND, OR, NAND, NOR, XOR e XNOR: i sette mattoni di ogni circuito digitale, da accendere uno per uno.' },
    { id: 'calcolo', titolo: 'Porte che contano e ricordano', periodo: '1703 – 1970', descrizione: 'Con poche porte si somma in binario, con un anello di porte si ricorda un bit: nascono aritmetica e memoria.' },
    { id: 'interruttori', titolo: 'Relè, valvole, transistor', periodo: '1835 – 1960', descrizione: 'Gli interruttori dei primi calcolatori, dallo scatto dei relè dello Z3 alle 17.468 valvole dell\'ENIAC fino al transistor.' },
    { id: 'famiglie', titolo: 'Le famiglie logiche', periodo: '1956 – oggi', descrizione: 'Come si costruisce davvero una porta con i transistor: RTL, TTL, ECL e la CMOS che oggi usa il mondo intero.' },
    { id: 'integrato', titolo: 'Nasce il circuito integrato', periodo: '1952 – 1971', descrizione: 'La tirannia dei numeri, Kilby e Noyce, il processo planare e la nascita della Silicon Valley.' },
    { id: 'fabbrica', titolo: 'Come si fabbrica un chip', periodo: '1916 – oggi', descrizione: 'Dalla sabbia al wafer, la fotolitografia passo per passo, la camera bianca e la luce ultravioletta estrema.' },
    { id: 'struttura', titolo: 'Dentro il chip', periodo: '1959 – oggi', descrizione: 'Uno zoom dal contenitore agli atomi: transistor MOS, strati di rame, FinFET e transistor gate-all-around.' },
    { id: 'moore', titolo: 'La legge di Moore e il futuro', periodo: '1965 – oggi', descrizione: 'Il raddoppio dei transistor ogni due anni, quanto è piccolo un nanometro e come si va oltre i limiti.' },
  ],
});
