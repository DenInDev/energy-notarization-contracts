# circuits euint16: pilot descrittivo

Prove misurate: 81 originali + 0 audit tardivi separati; 0 rifiuti di capacità senza invio, su 81 tentativi pianificati.
Warmup/controlli: 27 originali + 0 tardivi; 0 rifiuti senza invio, su 27 pianificati.

| Caso | Piattaforma | Validi originali + tardivi | Limiti senza invio | Receipt ms (n) | Plaintext ms (n) | Audit differito ms (n) | Gas medio (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| circuits-w16-sum_linear-n2 | baseline | 3 + 0 | 0 | 9373.1 (3) | 9500.5 (3) | -- | 465283.0 (3) |
| circuits-w16-sum_linear-n2 | zama | 3 + 0 | 0 | 6274.5 (3) | 9726.3 (3) | -- | 761411.0 (3) |
| circuits-w16-sum_linear-n2 | fhenix | 3 + 0 | 0 | 10414.9 (3) | 12135.4 (3) | -- | 751590.0 (3) |
| circuits-w16-sum_tree-n2 | baseline | 3 + 0 | 0 | 9912.3 (3) | 10416.2 (3) | -- | 465616.0 (3) |
| circuits-w16-sum_tree-n2 | zama | 3 + 0 | 0 | 9647.5 (3) | 14239.3 (3) | -- | 762169.7 (3) |
| circuits-w16-sum_tree-n2 | fhenix | 3 + 0 | 0 | 9040.0 (3) | 9748.1 (3) | -- | 752354.0 (3) |
| circuits-w16-sum_linear-n4 | baseline | 3 + 0 | 0 | 10287.7 (3) | 10785.0 (3) | -- | 466113.0 (3) |
| circuits-w16-sum_linear-n4 | zama | 3 + 0 | 0 | 6788.3 (3) | 13323.5 (3) | -- | 801583.7 (3) |
| circuits-w16-sum_linear-n4 | fhenix | 3 + 0 | 0 | 10591.6 (3) | 17081.3 (3) | -- | 815268.0 (3) |
| circuits-w16-sum_tree-n4 | baseline | 3 + 0 | 0 | 13634.7 (3) | 13750.4 (3) | -- | 466808.0 (3) |
| circuits-w16-sum_tree-n4 | zama | 3 + 0 | 0 | 12046.0 (3) | 17623.9 (3) | -- | 803441.7 (3) |
| circuits-w16-sum_tree-n4 | fhenix | 3 + 0 | 0 | 8135.8 (3) | 8435.5 (3) | -- | 817126.0 (3) |
| circuits-w16-sum_linear-n8 | baseline | 3 + 0 | 0 | 15000.1 (3) | 15490.7 (3) | -- | 467761.0 (3) |
| circuits-w16-sum_linear-n8 | zama | 3 + 0 | 0 | 10227.1 (3) | 13719.5 (3) | -- | 881928.7 (3) |
| circuits-w16-sum_linear-n8 | fhenix | 3 + 0 | 0 | 9870.8 (3) | 10861.4 (3) | -- | 942600.0 (3) |
| circuits-w16-sum_tree-n8 | baseline | 3 + 0 | 0 | 16061.7 (3) | 16190.3 (3) | -- | 469102.0 (3) |
| circuits-w16-sum_tree-n8 | zama | 3 + 0 | 0 | 6679.1 (3) | 11816.3 (3) | -- | 885734.7 (3) |
| circuits-w16-sum_tree-n8 | fhenix | 3 + 0 | 0 | 24326.5 (3) | 25709.0 (3) | -- | 946410.0 (3) |
| circuits-w16-affine_chain-k1 | baseline | 3 + 0 | 0 | 8609.1 (3) | 8718.0 (3) | -- | 465353.0 (3) |
| circuits-w16-affine_chain-k1 | zama | 3 + 0 | 0 | 4866.3 (3) | 9611.8 (3) | -- | 777263.7 (3) |
| circuits-w16-affine_chain-k1 | fhenix | 3 + 0 | 0 | 10491.9 (3) | 11256.0 (3) | -- | 780214.0 (3) |
| circuits-w16-affine_chain-k2 | baseline | 3 + 0 | 0 | 14208.7 (3) | 14325.5 (3) | -- | 465533.0 (3) |
| circuits-w16-affine_chain-k2 | zama | 3 + 0 | 0 | 7931.6 (3) | 12167.6 (3) | -- | 809043.0 (3) |
| circuits-w16-affine_chain-k2 | fhenix | 3 + 0 | 0 | 9056.2 (3) | 10081.1 (3) | -- | 836521.0 (3) |
| circuits-w16-affine_chain-k4 | baseline | 3 + 0 | 0 | 18184.1 (3) | 18664.7 (3) | -- | 465885.0 (3) |
| circuits-w16-affine_chain-k4 | zama | 3 + 0 | 0 | 6551.8 (3) | 12374.2 (3) | -- | 872601.7 (3) |
| circuits-w16-affine_chain-k4 | fhenix | 3 + 0 | 0 | 12570.4 (3) | 13546.1 (3) | -- | 949116.0 (3) |

| Segmento | Misurate originali validate | Controlli originali validati | Audit tardivi misurati / warmup | Tentativi incompleti conservati |
|---|---:|---:|---:|---:|
| original | 4 | 27 | 0 / 0 | 1 |
| continuation1 | 4 | 0 | 0 / 0 | 1 |
| continuation2 | 73 | 0 | 0 / 0 | 0 |

Costo canonico incluse tutte le 222 receipt di deployment/autorizzazioni/input/setup/warmup/prove: 4463092524 wei = 0.000000004463092524 ETH.

Ogni denominatore è esplicito. Nessuna metrica rappresenta puro calcolo FHE. Le durate tardive non entrano nelle latenze originali; le receipt reincluse e il throughput delle relative finestre sono esclusi. Preparazioni riprese e caricamenti reinclusi non entrano nella preparazione fresca. I report grezzi e i fallimenti restano invariati.

Tre ripetizioni sono un pilot, non una garanzia di robustezza. Nessun p-value, pooling con i classici o confronto causale fra piattaforme/width. Eventi di polling/retry sono quelli strumentati dal client, non ogni richiesta interna del servizio.

Report grezzo SHA256: bd5f0336dd9d1b808ccf8fc270692b96368a26d647236b95dc37212a6d12c698
