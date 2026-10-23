# Progetto-formazione

**BusLab**: software di formazione animato sulla comunicazione hardware.
31 bus e protocolli (UART, RS-232, RS-485, I²C, SPI, CAN, LIN, USB, PCI Express, Ethernet e molti altri),
ciascuno con la sua storia, come funziona, una simulazione animata dei segnali e un quiz.

## Come avviarlo

Non serve installare niente: apri `index.html` con un browser (doppio clic).

In alternativa, da terminale:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Cosa contiene

- **Lezioni**: per ogni bus scheda tecnica, storia, funzionamento, curiosità e quiz.
- **Simulatore**: scrivi un messaggio, premi ▶︎ e guarda i bit viaggiare sui fili
  e comparire sull'analizzatore logico, campo per campo (start, indirizzo, ACK, CRC...).
- **Storia**: linea del tempo dal telegrafo del 1837 a oggi.
- **Confronto**: tabella ordinabile e filtrabile di tutti i bus.
- **Quiz finale**: 10 domande a caso da tutte le lezioni.

Le forme d'onda sono calcolate con i veri algoritmi di codifica (CRC di CAN, USB, Modbus ed Ethernet,
bit stuffing, NRZI, Manchester, 8b/10b), con tempi semplificati per renderle leggibili.

## Struttura

| File | Contenuto |
| --- | --- |
| `js/encoders.js` | generatori di segnale per ogni bus |
| `js/buses.js` | contenuti didattici in italiano |
| `js/simulator.js` | animazione (schema dei fili + analizzatore logico) |
| `js/app.js` | pagine e navigazione |
| `css/style.css` | stile, tema chiaro e scuro |

Per aggiungere un bus basta aggiungere un oggetto in `js/buses.js` scegliendo un generatore esistente.

## Test

```bash
node --test tests/*.test.js
```
