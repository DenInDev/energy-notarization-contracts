# circuits euint128: pilot descrittivo

Prove misurate: 78 originali + 0 audit tardivi separati; 3 rifiuti di capacità senza invio, su 81 tentativi pianificati.
Warmup/controlli: 26 originali + 0 tardivi; 1 rifiuti senza invio, su 27 pianificati.

| Caso | Piattaforma | Validi originali + tardivi | Limiti senza invio | Receipt ms (n) | Plaintext ms (n) | Audit differito ms (n) | Gas medio (n) |
|---|---|---:|---:|---:|---:|---:|---:|
| circuits-w128-sum_linear-n2 | baseline | 3 + 0 | 0 | 10886.8 (3) | 11057.6 (3) | -- | 465333.0 (3) |
| circuits-w128-sum_linear-n2 | zama | 3 + 0 | 0 | 6991.7 (3) | 11079.7 (3) | -- | 761558.0 (3) |
| circuits-w128-sum_linear-n2 | fhenix | 3 + 0 | 0 | 10004.0 (3) | 11024.2 (3) | -- | 751676.0 (3) |
| circuits-w128-sum_tree-n2 | baseline | 3 + 0 | 0 | 15334.1 (3) | 15456.1 (3) | -- | 465674.0 (3) |
| circuits-w128-sum_tree-n2 | zama | 3 + 0 | 0 | 10951.7 (3) | 14641.2 (3) | -- | 762322.0 (3) |
| circuits-w128-sum_tree-n2 | fhenix | 3 + 0 | 0 | 15590.7 (3) | 15885.4 (3) | -- | 752440.0 (3) |
| circuits-w128-sum_linear-n4 | baseline | 3 + 0 | 0 | 14527.0 (3) | 14634.8 (3) | -- | 468157.0 (3) |
| circuits-w128-sum_linear-n4 | zama | 3 + 0 | 0 | 5309.2 (3) | 10430.1 (3) | -- | 802024.7 (3) |
| circuits-w128-sum_linear-n4 | fhenix | 3 + 0 | 0 | 14844.0 (3) | 15497.7 (3) | -- | 815494.0 (3) |
| circuits-w128-sum_tree-n4 | baseline | 3 + 0 | 0 | 10771.3 (3) | 11248.0 (3) | -- | 468892.0 (3) |
| circuits-w128-sum_tree-n4 | zama | 3 + 0 | 0 | 7162.7 (3) | 11993.3 (3) | -- | 803888.0 (3) |
| circuits-w128-sum_tree-n4 | fhenix | 3 + 0 | 0 | 11550.5 (3) | 12586.2 (3) | -- | 817364.0 (3) |
| circuits-w128-sum_linear-n8 | baseline | 3 + 0 | 0 | 15418.6 (3) | 15537.9 (3) | -- | 473809.0 (3) |
| circuits-w128-sum_linear-n8 | zama | 3 + 0 | 0 | 8821.2 (3) | 15667.4 (3) | -- | 882963.0 (3) |
| circuits-w128-sum_linear-n8 | fhenix | 3 + 0 | 0 | 14373.1 (3) | 16498.5 (3) | -- | 943154.0 (3) |
| circuits-w128-sum_tree-n8 | baseline | 3 + 0 | 0 | 10651.8 (3) | 10792.0 (3) | -- | 475238.0 (3) |
| circuits-w128-sum_tree-n8 | zama | 3 + 0 | 0 | 4569.9 (3) | 10442.7 (3) | -- | 886763.7 (3) |
| circuits-w128-sum_tree-n8 | fhenix | 3 + 0 | 0 | 10395.4 (3) | 11782.8 (3) | -- | 946956.0 (3) |
| circuits-w128-affine_chain-k1 | baseline | 3 + 0 | 0 | 14983.9 (3) | 15457.9 (3) | -- | 465407.0 (3) |
| circuits-w128-affine_chain-k1 | zama | 3 + 0 | 0 | 10778.8 (3) | 18749.6 (3) | -- | 777557.7 (3) |
| circuits-w128-affine_chain-k1 | fhenix | 3 + 0 | 0 | 10588.4 (3) | 13539.5 (3) | -- | 780386.0 (3) |
| circuits-w128-affine_chain-k2 | baseline | 3 + 0 | 0 | 8927.1 (3) | 9073.1 (3) | -- | 465583.0 (3) |
| circuits-w128-affine_chain-k2 | zama | 3 + 0 | 0 | 11114.9 (3) | 22608.0 (3) | -- | 809635.0 (3) |
| circuits-w128-affine_chain-k2 | fhenix | 3 + 0 | 0 | 8422.9 (3) | 14010.2 (3) | -- | 836837.0 (3) |
| circuits-w128-affine_chain-k4 | baseline | 3 + 0 | 0 | 19495.0 (3) | 19622.9 (3) | -- | 465931.0 (3) |
| circuits-w128-affine_chain-k4 | zama | 0 + 0 | 3 | -- | -- | -- | -- |
| circuits-w128-affine_chain-k4 | fhenix | 3 + 0 | 0 | 10520.7 (3) | 20644.0 (3) | -- | 949752.0 (3) |

| Segmento | Misurate originali validate | Controlli originali validati | Audit tardivi misurati / warmup | Tentativi incompleti conservati |
|---|---:|---:|---:|---:|
| original | 54 | 26 | 0 / 0 | 1 |
| continuation1 | 24 | 0 | 0 / 0 | 0 |

Costo canonico incluse tutte le 218 receipt di deployment/autorizzazioni/input/setup/warmup/prove: 3889423955 wei = 0.000000003889423955 ETH.

Ogni denominatore è esplicito. Nessuna metrica rappresenta puro calcolo FHE. Le durate tardive non entrano nelle latenze originali; le receipt reincluse e il throughput delle relative finestre sono esclusi. Preparazioni riprese e caricamenti reinclusi non entrano nella preparazione fresca. I report grezzi e i fallimenti restano invariati.

Tre ripetizioni sono un pilot, non una garanzia di robustezza. Nessun p-value, pooling con i classici o confronto causale fra piattaforme/width. Eventi di polling/retry sono quelli strumentati dal client, non ogni richiesta interna del servizio.

Report grezzo SHA256: 1046dc71347a0708ace1c2a50d57be7628e9997254c039e5cccfc282a297edf9
