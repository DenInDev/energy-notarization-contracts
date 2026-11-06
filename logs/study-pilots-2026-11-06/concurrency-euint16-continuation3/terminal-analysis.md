# Pilot concorrenza16: arresto per variazione della receipt canonica

Stato: incompleto; nessuna nuova campagna o transazione sostitutiva avviata.

| Osservazioni | Verificate | Confermate | Pianificate |
|---|---:|---:|---:|
| Misurate | 40 | 48 | 432 |
| Warmup/controlli | 200 originali + 16 audit tardivi | 216 | 216 |

La prima transazione Zama del batch misurato independent/C1/run1 è stata osservata inizialmente nel blocco12077259, indice85, e poi verificata nel blocco canonico12077260, indice118. Lo stesso hash risulta confermato con status1. Tutte le otto receipt attuali della finestra sono canoniche. La verifica originale del batch è rimasta incompleta.

Questo evento riguarda la storia canonica host-chain osservata tramite RPC. Non costituisce prova di errore nel calcolo FHE. Non sostituiamo blockHash, indice, latenza, gas o esito dei record originali. Non ricostruiamo una latenza canonica dai tempi del recupero. Gli otto risultati della finestra non sono inclusi nei40 misurati validati.

I16 risultati warmup recuperati in precedenza hanno audit separati e sono esclusi dalle statistiche di latenza originali. Tutti i prefissi storici e gli SHA sorgente sono stati ricontrollati.

Il pilot circuiti16 resta concluso con81/81compute misurati e27/27warmup validati, conservando due fallimenti di preparazione. Circuiti128 e concorrenza128 restano non avviati. Non è stata avviata la matrice completa da50 ripetizioni.

Per riprendere occorre una riconciliazione canonica esplicita, un audit tardivo distinto del batch misurato e un controllo dei nonce; il percorso di continuazione attuale rifiuta correttamente la sorgente. Non si devono ripetere le transazioni già confermate.

SHA256 report grezzo: 510aa431e29e5a35deb1065bf40ecaad03c6c47e4f2cd8ab0bca6836a4b87dac.
