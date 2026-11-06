# concurrency euint16: pilot descrittivo

Prove misurate: 424 originali + 8 audit tardivi separati; 0 rifiuti di capacità senza invio, su 432 tentativi pianificati.
Warmup/controlli: 200 originali + 16 tardivi; 0 rifiuti senza invio, su 216 pianificati.

| Caso | Piattaforma | Validi originali + tardivi | Limiti senza invio | Receipt ms (n) | Plaintext ms (n) | Audit differito ms (n) | Gas medio (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| concurrency-w16-c1-independent | baseline | 24 + 0 | 0 | 11374.6 (24) | -- | 115.1 (24) | 407653.0 (24) |
| concurrency-w16-c1-independent | zama | 16 + 8 | 0 | 14929.8 (23) | -- | 2503.4 (16) | 989680.7 (24) |
| concurrency-w16-c1-independent | fhenix | 24 + 0 | 0 | 12742.0 (24) | -- | 202.9 (24) | 813325.0 (24) |
| concurrency-w16-c1-shared_sum | baseline | 24 + 0 | 0 | 15026.1 (24) | -- | 75.9 (24) | 407394.5 (24) |
| concurrency-w16-c1-shared_sum | zama | 24 + 0 | 0 | 14537.1 (24) | -- | 2481.3 (24) | 989413.8 (24) |
| concurrency-w16-c1-shared_sum | fhenix | 24 + 0 | 0 | 13794.1 (24) | -- | 166.6 (24) | 813069.0 (24) |
| concurrency-w16-c1-shared_ordered | baseline | 24 + 0 | 0 | 15675.6 (24) | -- | 144.6 (24) | 395342.5 (24) |
| concurrency-w16-c1-shared_ordered | zama | 24 + 0 | 0 | 12119.4 (24) | -- | 2604.0 (24) | 1009304.8 (24) |
| concurrency-w16-c1-shared_ordered | fhenix | 24 + 0 | 0 | 12146.9 (24) | -- | 203.5 (24) | 845737.0 (24) |
| concurrency-w16-c2-independent | baseline | 24 + 0 | 0 | 14786.3 (24) | -- | 91.6 (24) | 419896.5 (24) |
| concurrency-w16-c2-independent | zama | 24 + 0 | 0 | 10257.1 (24) | -- | 2450.3 (24) | 989677.2 (24) |
| concurrency-w16-c2-independent | fhenix | 24 + 0 | 0 | 17849.2 (24) | -- | 198.3 (24) | 813325.0 (24) |
| concurrency-w16-c2-shared_sum | baseline | 24 + 0 | 0 | 12965.7 (24) | -- | 122.6 (24) | 407396.5 (24) |
| concurrency-w16-c2-shared_sum | zama | 24 + 0 | 0 | 11274.3 (24) | -- | 2548.0 (24) | 989414.3 (24) |
| concurrency-w16-c2-shared_sum | fhenix | 24 + 0 | 0 | 14512.8 (24) | -- | 226.5 (24) | 813070.5 (24) |
| concurrency-w16-c2-shared_ordered | baseline | 24 + 0 | 0 | 17431.4 (24) | -- | 104.6 (24) | 395347.0 (24) |
| concurrency-w16-c2-shared_ordered | zama | 24 + 0 | 0 | 12140.0 (24) | -- | 2635.1 (24) | 1009297.5 (24) |
| concurrency-w16-c2-shared_ordered | fhenix | 24 + 0 | 0 | 12801.9 (24) | -- | 176.2 (24) | 845733.0 (24) |

| Segmento | Misurate originali validate | Controlli originali validati | Audit tardivi misurati / warmup | Tentativi incompleti conservati |
|---|---:|---:|---:|---:|
| original | 0 | 8 | 0 / 0 | 1 |
| continuation1 | 0 | 16 | 0 / 0 | 1 |
| continuation2 | 0 | 64 | 0 / 8 | 1 |
| continuation3 | 40 | 112 | 0 / 8 | 1 |
| continuation4 | 384 | 0 | 8 / 0 | 0 |

Costo canonico incluse tutte le 735 receipt di deployment/autorizzazioni/input/setup/warmup/prove: 10602020178 wei = 0.000000010602020178 ETH.

Ogni denominatore è esplicito. Nessuna metrica rappresenta puro calcolo FHE. Le durate tardive non entrano nelle latenze originali; le receipt reincluse e il throughput delle relative finestre sono esclusi. Preparazioni riprese e caricamenti reinclusi non entrano nella preparazione fresca. I report grezzi e i fallimenti restano invariati.

Tre ripetizioni sono un pilot, non una garanzia di robustezza. Nessun p-value, pooling con i classici o confronto causale fra piattaforme/width. Eventi di polling/retry sono quelli strumentati dal client, non ogni richiesta interna del servizio.

Report grezzo SHA256: 215315ec2df02dd93ce3e1e0ec395d36c209e409e6c95a13f4f0fc3cec3b3e05
