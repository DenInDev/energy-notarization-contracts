# Risultati dei quattro pilot

Raccolta autorizzata completata. Tre ripetizioni misurate per configurazione; la matrice completa da 50 non è stata avviata. Fallimenti storici, segmenti e recuperi restano distinti.

| Pilot | Validi originali | Audit tardivi separati | Limiti senza invio | Pianificati | Receipt totali | Costo canonico ETH |
|---|---:|---:|---:|---:|---:|---:|
| circuits 16 | 81 | 0 | 0 | 81 | 222 | 0.000000004463092524 |
| concurrency 16 | 424 | 8 | 0 | 432 | 735 | 0.000000010602020178 |
| circuits 128 | 78 | 0 | 3 | 81 | 218 | 0.000000003889423955 |
| concurrency 128 | 424 | 8 | 0 | 432 | 735 | 0.000000010947972204 |

Zama affine_chain k4 a 128 bit ha raggiunto HCUTransactionDepthLimitExceeded in tutti e tre i tentativi misurati e nel warmup. Non sono state inviate compute per questi rifiuti.

Le finestre concorrenti sono verificate contro il replay canonico con aritmetica modulare. Differenze di ordine e risultati delle operazioni non commutative sono separate dalle inconsistenze. Nessuna discrepanza di risultato osservata rispetto al replay nelle finestre verificate. Questo non dimostra robustezza generale.

Latenze receipt, completion dei circuiti, audit già-pronto, preparazione e throughput sono in tabelle con denominatori espliciti. Esclusioni per reinclusioni e recuperi tardivi sono documentate. Nessun pooling con gli esperimenti classici o affermazione di puro tempo FHE.

## File

- circuits 16: [report](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint16-continuation2/report.json) · [analisi](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint16-continuation2/pilot-analysis.md) · [CSV](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint16-continuation2/pilot-metrics.csv) · [audit](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint16-continuation2/completion-audit.json) · [receipt supplementari](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint16-continuation2/final-canonical-receipts.json)
- concurrency 16: [report](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint16-continuation4/report.json) · [analisi](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint16-continuation4/pilot-analysis.md) · [CSV](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint16-continuation4/pilot-metrics.csv) · [audit](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint16-continuation4/completion-audit.json) · [receipt supplementari](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint16-continuation4/final-canonical-receipts.json)
- circuits 128: [report](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint128-continuation1/report.json) · [analisi](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint128-continuation1/pilot-analysis.md) · [CSV](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint128-continuation1/pilot-metrics.csv) · [audit](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint128-continuation1/completion-audit.json) · [receipt supplementari](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/circuits-euint128-continuation1/final-canonical-receipts.json)
- concurrency 128: [report](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint128-continuation1/report.json) · [analisi](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint128-continuation1/pilot-analysis.md) · [CSV](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint128-continuation1/pilot-metrics.csv) · [audit](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint128-continuation1/completion-audit.json) · [receipt supplementari](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/concurrency-euint128-continuation1/final-canonical-receipts.json)

[Audit canonico finale](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/study-pilots-2026-11-06/final-canonical-audit.json)

Ricevute al di sotto del blocco finalized alla riverifica: True.
