# concurrency euint128: pilot descrittivo

Prove misurate: 424 originali + 8 audit tardivi separati; 0 rifiuti di capacità senza invio, su 432 tentativi pianificati.
Warmup/controlli: 216 originali + 0 tardivi; 0 rifiuti senza invio, su 216 pianificati.

| Caso | Piattaforma | Validi originali + tardivi | Limiti senza invio | Receipt ms (n) | Plaintext ms (n) | Audit differito ms (n) | Gas medio (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| concurrency-w128-c1-independent | baseline | 24 + 0 | 0 | 12984.9 (24) | -- | 87.1 (24) | 407921.5 (24) |
| concurrency-w128-c1-independent | zama | 24 + 0 | 0 | 15493.4 (24) | -- | 2448.0 (24) | 989825.7 (24) |
| concurrency-w128-c1-independent | fhenix | 24 + 0 | 0 | 13414.5 (24) | -- | 149.3 (24) | 813408.0 (24) |
| concurrency-w128-c1-shared_sum | baseline | 24 + 0 | 0 | 12217.7 (24) | -- | 56.9 (24) | 407667.0 (24) |
| concurrency-w128-c1-shared_sum | zama | 24 + 0 | 0 | 14067.2 (24) | -- | 2429.6 (24) | 989564.8 (24) |
| concurrency-w128-c1-shared_sum | fhenix | 24 + 0 | 0 | 13806.7 (24) | -- | 149.7 (24) | 813148.0 (24) |
| concurrency-w128-c1-shared_ordered | baseline | 24 + 0 | 0 | 12517.7 (24) | -- | 53.1 (24) | 395627.5 (24) |
| concurrency-w128-c1-shared_ordered | zama | 16 + 8 | 0 | 15634.6 (23) | -- | 2464.5 (16) | 1009603.2 (24) |
| concurrency-w128-c1-shared_ordered | fhenix | 24 + 0 | 0 | 12270.0 (24) | -- | 254.6 (24) | 845884.5 (24) |
| concurrency-w128-c2-independent | baseline | 24 + 0 | 0 | 11511.8 (24) | -- | 61.1 (24) | 420166.5 (24) |
| concurrency-w128-c2-independent | zama | 24 + 0 | 0 | 14227.6 (24) | -- | 2400.2 (24) | 989827.2 (24) |
| concurrency-w128-c2-independent | fhenix | 24 + 0 | 0 | 15515.4 (24) | -- | 164.2 (24) | 813402.0 (24) |
| concurrency-w128-c2-shared_sum | baseline | 24 + 0 | 0 | 14212.2 (24) | -- | 52.9 (24) | 407657.0 (24) |
| concurrency-w128-c2-shared_sum | zama | 24 + 0 | 0 | 11343.9 (24) | -- | 2435.8 (24) | 989566.3 (24) |
| concurrency-w128-c2-shared_sum | fhenix | 24 + 0 | 0 | 14720.7 (24) | -- | 197.0 (24) | 813147.5 (24) |
| concurrency-w128-c2-shared_ordered | baseline | 24 + 0 | 0 | 13762.5 (24) | -- | 56.2 (24) | 395626.5 (24) |
| concurrency-w128-c2-shared_ordered | zama | 24 + 0 | 0 | 11317.9 (24) | -- | 2423.6 (24) | 1009599.2 (24) |
| concurrency-w128-c2-shared_ordered | fhenix | 24 + 0 | 0 | 13419.3 (24) | -- | 429.5 (24) | 845883.0 (24) |

| Segmento | Misurate originali validate | Controlli originali validati | Audit tardivi misurati / warmup | Tentativi incompleti conservati |
|---|---:|---:|---:|---:|
| original | 216 | 216 | 0 / 0 | 1 |
| continuation1 | 208 | 0 | 8 / 0 | 0 |

Costo canonico incluse tutte le 735 receipt di deployment/autorizzazioni/input/setup/warmup/prove: 10947972204 wei = 0.000000010947972204 ETH.

Ogni denominatore è esplicito. Nessuna metrica rappresenta puro calcolo FHE. Le durate tardive non entrano nelle latenze originali; le receipt reincluse e il throughput delle relative finestre sono esclusi. Preparazioni riprese e caricamenti reinclusi non entrano nella preparazione fresca. I report grezzi e i fallimenti restano invariati.

Tre ripetizioni sono un pilot, non una garanzia di robustezza. Nessun p-value, pooling con i classici o confronto causale fra piattaforme/width. Eventi di polling/retry sono quelli strumentati dal client, non ogni richiesta interna del servizio.

Report grezzo SHA256: 42b1194d1601dcbecfeaf1cf388fed7cafa2397c71ee43d6bb4f48897b687dde
