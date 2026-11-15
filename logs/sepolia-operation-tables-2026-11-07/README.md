# Tabelle di provenienza per operazione

Le tabelle mantengono lo stile a cinque colonne richiesto. Il label originale compare una sola volta nella panoramica classica16; ogni altra tabella ha un label univoco.

**Intervalli delle transazioni:** timestamp UTC dei blocchi canonici contenenti le misure, non tempi completi del client. Calcolo: media, pesata per transazione, di100 × blockGasUsed/(blockGasLimit/2). Non è il gas medio della funzione. Le percentuali possono superare100%.

**Conteggi:** n è il numero di transazioni primarie confermate. Nei classici16,50 per operazione/piattaforma. Nei classici128, baseline e Zama hanno10 prove per operazione,9 per max; Fhenix50. I fallimenti di validazione restano tali: la presenza di una receipt non implica una latenza valida. Retry e recuperi view sono separati.

**Nuovi pilot:** tre round per configurazione; nei circuiti n è normalmente3, nella concorrenza n=24transazioni per cella. I tre rifiuti Zama affine_chain k4 a128bit non sono transazioni inviate (n=0). Finestre di piattaforma sequenziali con ordine ruotato, non tre piattaforme simultanee.

**View/decrypt:** tempi client, blocchi di riferimento del risultato e gas/target non applicabile. I recuperi tardivi hanno una tabella distinta.

## File

- `overview-tables.tex`: panoramiche delle sei campagne recenti.
- `all-operation-tables.tex`: include le tabelle per tutte le operazioni recenti.
- `all-tables.tex`: note, panoramiche e operazioni.
- `deployment-intervals.csv`: dati tabellari, n, esiti originali e scope degli intervalli.
- `table-values-and-provenance.json`: valori non arrotondati, SHA e provenienza per ogni transazione.
- `block-metadata.json`:1661 blocchi interrogati in sola lettura; tutti finalized.
- `reference-mixed-oct24-operations.tex` e `reference-oct24-overview.tex`: precedente campagna mista del24ottobre, separata dai dati recenti.

La modifica di canonicità osservata per la registrazione owner Fhenix128 run20 è registrata come evidenza supplementare. Nessun report grezzo, timing o outcome è stato modificato.

## Intervalli client come nella tabella di esempio

I file `classic-euint16-client-observed-intervals.tex`, `classic-euint128-client-observed-intervals.tex` e `reference-mixed-oct24-client-observed-intervals.tex` riportano invece gli estremi startedAt/completedAt registrati dal client, inclusa la preparazione. Blocchi e percentuali restano gli stessi. Per i nuovi pilot non sono inventati timestamp client di completamento assenti dal report: si usano gli intervalli dei blocchi canonici.

## Riproduzione offline

```powershell
.venv/Scripts/python.exe scripts/analysis/generate-operation-deployment-tables.py logs/sepolia-operation-tables-2026-11-07
```

## Accesso rapido

| Esperimenti | 16 bit | 128 bit |
|---|---|---|
| Classici, intervalli client | [LaTeX](classic-euint16-client-observed-intervals.tex) | [LaTeX](classic-euint128-client-observed-intervals.tex) |
| Circuiti, blocchi canonici | [LaTeX](circuits-euint16-operations.tex) | [LaTeX](circuits-euint128-operations.tex) |
| Concorrenza, blocchi canonici | [LaTeX](concurrency-euint16-operations.tex) | [LaTeX](concurrency-euint128-operations.tex) |

[CSV completo](deployment-intervals.csv) · [Provenienza dei valori](table-values-and-provenance.json).

Verifica: 78 tabelle compilate con successo, label univoci e sette report sorgente invariati. Il documento del paper già aperto non è stato modificato.
