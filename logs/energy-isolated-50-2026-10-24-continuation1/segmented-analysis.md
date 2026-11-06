# Analisi finale descrittiva per segmenti

**Tutte le operazioni previste sono state tentate: 749/750 risultati primari validi, 15/15 warmup validi.**
Continuazione: 654/654 nuove osservazioni valide. Baseline 250/250, Zama 249/250, Fhenix 250/250. Resta il timeout storico Zama add, run 7: ricevuta non osservata entro 180 s. Ricevuta tardiva e plaintext 364 sono recuperi separati. `executionComplete=true`, `complete=false`.

Statistiche descrittive di una campagna interrotta e ripresa; nuovi processi/sessioni SDK, stesso protocollo isolato. Nessun p-value o pretesa di campagna ininterrotta tutta valida. I dettagli per segmento, singoli campioni e stadi sono nel JSON.

## Latenze medie in secondi — successi primari, esclusi warmup

| Operazione | Piattaforma | n | Preparazione | Ricevuta | Dopo ricevuta | Invio→plaintext | Totale client | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 50 | 0.260 | 6.342 | 0.154 | 6.495 | 6.756 | — (0) |
| notarize | zama | 50 | 10.583 | 6.326 | 4.592 | 10.919 | 21.502 | 2.350 (50) |
| notarize | fhenix | 50 | 9.396 | 6.313 | 0.290 | 6.603 | 15.998 | 0.158 (50) |
| add | baseline | 50 | 0.269 | 4.905 | 0.081 | 4.987 | 5.255 | — (0) |
| add | zama | 49 | 0.198 | 4.537 | 5.004 | 9.540 | 9.738 | 2.346 (49) |
| add | fhenix | 50 | 0.278 | 4.916 | 0.387 | 5.303 | 5.581 | 0.153 (50) |
| mul_scalar | baseline | 50 | 0.256 | 6.170 | 0.083 | 6.253 | 6.509 | — (0) |
| mul_scalar | zama | 50 | 0.193 | 6.175 | 4.921 | 11.096 | 11.289 | 2.363 (50) |
| mul_scalar | fhenix | 50 | 0.261 | 6.166 | 0.620 | 6.785 | 7.046 | 0.148 (50) |
| mean | baseline | 50 | 0.261 | 4.853 | 0.071 | 4.924 | 5.185 | — (0) |
| mean | zama | 50 | 0.192 | 4.850 | 4.776 | 9.626 | 9.818 | 2.354 (50) |
| mean | fhenix | 50 | 0.265 | 4.855 | 4.594 | 9.449 | 9.714 | 0.155 (50) |
| max | baseline | 50 | 0.275 | 4.722 | 0.101 | 4.822 | 5.097 | — (0) |
| max | zama | 50 | 0.207 | 4.719 | 4.956 | 9.675 | 9.882 | 2.347 (50) |
| max | fhenix | 50 | 0.217 | 4.729 | 0.350 | 5.080 | 5.296 | 0.153 (50) |

Ricevuta = invio → osservazione inclusione, non finalità. Dopo ricevuta include getter canonico, autorizzazione, SDK/servizi/polling e validazione; non è solo calcolo FHE. Totale client = preparazione + invio→plaintext, esclusa l’attesa intenzionale alla barriera. Worker-start→plaintext include la barriera; worker wall include anche la seconda decryption. Già pronto è una ripetizione success-only separata: Zama 249 successi, Fhenix 250, nessun errore. Il timeout storico non riceve una latenza ricostruita. Ricevute con latenza osservata: 749/750; ricevute effettive incluse nel costo: 750/750.

## Costi effettivi ETH — ricevute confermate

| Piattaforma | Ricevute | Deployment | Warmup | Misure (incluso fallimento storico) | Totale ETH |
|---|---:|---:|---:|---:|---:|
| baseline | 256 | 0.000000000161160736 | 0.000000000013530719 | 0.000009705636557565 | 0.000009705811249020 |
| zama | 256 | 0.000000000297396704 | 0.000000000056304684 | 0.000099607053016767 | 0.000099607406718155 |
| fhenix | 256 | 0.000000000176550507 | 0.000000000060139568 | 0.000101439171109124 | 0.000101439407799199 |

**Totale: 0.000210752625766374 ETH**, da gasUsed × effectiveGasPrice di 768 ricevute uniche. Tre deployment ricontrollati via RPC; la ricevuta storica tardiva è supplementare, senza modificarne l’esito sperimentale.

## Polling, retry e sincronizzazione

Le distribuzioni complete dei suggerimenti di polling sono nel JSON, suddivise per segmento/piattaforma/fase e warmup/misura. La base SDK è 100 ms; Zama può imporre Retry-After maggiore. Le distanze osservate tra callback includono rete e processamento; non sono sonno o puro calcolo backend. Sono separati i backoff applicativi effettivamente cronometrati. Nessun fallimento da rate limit registrato; copertura HTTP Zama parziale.

Dispersione avvio broadcast, misure: {"n": 250, "mean": 0.836, "median": 0.0, "min": 0, "max": 16} ms.

## Provenienza e controlli

Report grezzo SHA256: `1d2461641eb45460379ee8e7aeea1ce58c8f5700419b7659ded945e42b59b63d`. Fonte originale SHA256: `846aa7bca53ea2aea36398d878f6ae14a52a0a1908a4083db9e09ebdc18064aa`. Prefisso di 111 campioni, deployment/warmup originali, hash preparati, fee comuni, nonce e identità worker per segmento verificati. Il JSON contiene mediana/P95/min/max/DS, denominatori per metrica, coppie valide con n esplicito, stadi e inventario ricevute. I confronti sono descrittivi su rete pubblica; non mescolare con le precedenti campagne async.

## Blocchi

Il report grezzo ha 249 confronti con metadati completi. La copia supplementare aggiunge soltanto blockHash e blockNumber della ricevuta storica già verificata canonicamente: non aggiunge tempi, plaintext o successi. I risultati su 250 confronti sono in supplementary-block-inclusion/block-inclusion.json.

## Esito blocchi e telemetria osservata

**249/250 triple nello stesso blocco (99,6%).** I 249 confronti completi grezzi condividono tutti il blocco; il run 7 add, recuperato separatamente, presenta uno scarto di 23 blocchi per Zama.

Telemetria SDK (misure più warmup): Fhenix registra 1324 suggerimenti di polling da 100 ms; Zama decryption primaria registra 510 suggerimenti da 2000 ms e 3 da 1000 ms. Le 249 ripetizioni Zama già pronte registrano un suggerimento da 2000 ms ciascuna. Retry applicativi: Zama 17 ACL e 5 propagazione blocco; Fhenix 3 propagazione blocco; baseline 2 propagazione blocco. Tutti i backoff restano inclusi nelle latenze. Nessun fallimento da rate limit registrato e nessuna risposta HTTP429 nei tracciati disponibili; la telemetria HTTP di Zama non copre ogni risposta.

## Conteggi per segmento e piattaforma

| Segmento | Piattaforma | Warmup | Tentati | Primari validi | Falliti | Riletture riuscite | Riletture fallite |
|---|---|---|---:|---:|---:|---:|---:|
| 0 | baseline | False | 32 | 32 | 0 | 0 | 0 |
| 0 | baseline | True | 5 | 5 | 0 | 0 | 0 |
| 0 | zama | False | 32 | 31 | 1 | 31 | 0 |
| 0 | zama | True | 5 | 5 | 0 | 0 | 0 |
| 0 | fhenix | False | 32 | 32 | 0 | 32 | 0 |
| 0 | fhenix | True | 5 | 5 | 0 | 0 | 0 |
| 1 | baseline | False | 218 | 218 | 0 | 0 | 0 |
| 1 | baseline | True | 0 | 0 | 0 | 0 | 0 |
| 1 | zama | False | 218 | 218 | 0 | 218 | 0 |
| 1 | zama | True | 0 | 0 | 0 | 0 | 0 |
| 1 | fhenix | False | 218 | 218 | 0 | 218 | 0 |
| 1 | fhenix | True | 0 | 0 | 0 | 0 | 0 |

## Latenze per segmento 0 — medie in secondi, primari validi

| Operazione | Piattaforma | Validi/tentati | Falliti | Ricevuta (n) | Post-ricevuta (n) | Invio→plaintext (n) | Client totale | Worker→plaintext incl. barriera |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 7/7 | 0 | 11.937 (7) | 0.140 (7) | 12.077 (7) | 12.350 | 23.994 |
| notarize | zama | 7/7 | 0 | 11.951 (7) | 5.145 (7) | 17.096 (7) | 28.695 | 29.013 |
| notarize | fhenix | 7/7 | 0 | 11.864 (7) | 0.276 (7) | 12.141 (7) | 22.640 | 24.058 |
| add | baseline | 7/7 | 0 | 11.538 (7) | 0.104 (7) | 11.642 (7) | 11.916 | 12.245 |
| add | zama | 6/7 | 1 | 9.500 (6) | 6.174 (6) | 15.674 (6) | 15.869 | 16.275 |
| add | fhenix | 7/7 | 0 | 11.510 (7) | 0.309 (7) | 11.819 (7) | 12.132 | 12.422 |
| mul_scalar | baseline | 6/6 | 0 | 10.385 (6) | 0.097 (6) | 10.482 (6) | 10.740 | 11.038 |
| mul_scalar | zama | 6/6 | 0 | 10.413 (6) | 5.109 (6) | 15.522 (6) | 15.714 | 16.081 |
| mul_scalar | fhenix | 6/6 | 0 | 10.317 (6) | 0.645 (6) | 10.962 (6) | 11.222 | 11.517 |
| mean | baseline | 6/6 | 0 | 7.339 (6) | 0.087 (6) | 7.426 (6) | 7.709 | 7.999 |
| mean | zama | 6/6 | 0 | 7.340 (6) | 4.980 (6) | 12.319 (6) | 12.516 | 12.892 |
| mean | fhenix | 6/6 | 0 | 7.288 (6) | 4.569 (6) | 11.856 (6) | 12.125 | 12.429 |
| max | baseline | 6/6 | 0 | 12.409 (6) | 0.119 (6) | 12.529 (6) | 12.802 | 13.105 |
| max | zama | 6/6 | 0 | 12.469 (6) | 5.509 (6) | 17.978 (6) | 18.182 | 18.554 |
| max | fhenix | 6/6 | 0 | 12.328 (6) | 0.553 (6) | 12.881 (6) | 13.114 | 13.458 |

## Latenze per segmento 1 — medie in secondi, primari validi

| Operazione | Piattaforma | Validi/tentati | Falliti | Ricevuta (n) | Post-ricevuta (n) | Invio→plaintext (n) | Client totale | Worker→plaintext incl. barriera |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 43/43 | 0 | 5.431 (43) | 0.156 (43) | 5.587 (43) | 5.845 | 16.385 |
| notarize | zama | 43/43 | 0 | 5.411 (43) | 4.503 (43) | 9.913 (43) | 20.331 | 20.712 |
| notarize | fhenix | 43/43 | 0 | 5.409 (43) | 0.292 (43) | 5.701 (43) | 14.917 | 16.500 |
| add | baseline | 43/43 | 0 | 3.826 (43) | 0.078 (43) | 3.903 (43) | 4.171 | 4.609 |
| add | zama | 43/43 | 0 | 3.844 (43) | 4.840 (43) | 8.684 (43) | 8.883 | 9.390 |
| add | fhenix | 43/43 | 0 | 3.842 (43) | 0.400 (43) | 4.242 (43) | 4.515 | 4.948 |
| mul_scalar | baseline | 44/44 | 0 | 5.595 (44) | 0.081 (44) | 5.676 (44) | 5.932 | 6.375 |
| mul_scalar | zama | 44/44 | 0 | 5.597 (44) | 4.895 (44) | 10.492 (44) | 10.685 | 11.191 |
| mul_scalar | fhenix | 44/44 | 0 | 5.600 (44) | 0.616 (44) | 6.216 (44) | 6.477 | 6.915 |
| mean | baseline | 44/44 | 0 | 4.515 (44) | 0.069 (44) | 4.583 (44) | 4.841 | 5.283 |
| mean | zama | 44/44 | 0 | 4.511 (44) | 4.748 (44) | 9.259 (44) | 9.450 | 9.958 |
| mean | fhenix | 44/44 | 0 | 4.524 (44) | 4.597 (44) | 9.121 (44) | 9.385 | 9.821 |
| max | baseline | 44/44 | 0 | 3.673 (44) | 0.098 (44) | 3.771 (44) | 4.047 | 4.477 |
| max | zama | 44/44 | 0 | 3.662 (44) | 4.881 (44) | 8.543 (44) | 8.751 | 9.249 |
| max | fhenix | 44/44 | 0 | 3.693 (44) | 0.323 (44) | 4.016 (44) | 4.230 | 4.722 |

## Differenze appaiate — secondi, solo coppie con entrambi i primari validi

| Operazione | Differenza | n | Ricevuta | Post-ricevuta | Invio→plaintext | Client totale |
|---|---|---:|---:|---:|---:|---:|
| notarize | zama-baseline | 50 | -0.015 | 4.439 | 4.423 | 14.746 |
| notarize | fhenix-baseline | 50 | -0.029 | 0.136 | 0.107 | 9.243 |
| notarize | zama-fhenix | 50 | 0.014 | 4.303 | 4.316 | 5.503 |
| add | zama-baseline | 49 | 0.015 | 4.924 | 4.939 | 4.869 |
| add | fhenix-baseline | 50 | 0.010 | 0.306 | 0.316 | 0.326 |
| add | zama-fhenix | 49 | 0.004 | 4.615 | 4.619 | 4.540 |
| mul_scalar | zama-baseline | 50 | 0.005 | 4.838 | 4.843 | 4.780 |
| mul_scalar | fhenix-baseline | 50 | -0.004 | 0.536 | 0.532 | 0.538 |
| mul_scalar | zama-fhenix | 50 | 0.010 | 4.301 | 4.311 | 4.242 |
| mean | zama-baseline | 50 | -0.003 | 4.705 | 4.702 | 4.633 |
| mean | fhenix-baseline | 50 | 0.002 | 4.523 | 4.525 | 4.528 |
| mean | zama-fhenix | 50 | -0.005 | 0.182 | 0.177 | 0.105 |
| max | zama-baseline | 50 | -0.003 | 4.855 | 4.853 | 4.785 |
| max | fhenix-baseline | 50 | 0.008 | 0.250 | 0.257 | 0.199 |
| max | zama-fhenix | 50 | -0.010 | 4.606 | 4.595 | 4.586 |

La tabella appaiata Fhenix−baseline usa anche il run 7 add, perché entrambi i primari sono validi; i confronti con Zama add hanno n=49. Una differenza negativa indica una minore latenza osservata della prima piattaforma. Nessuna differenza è interpretata come calcolo isolato o effetto causale.
