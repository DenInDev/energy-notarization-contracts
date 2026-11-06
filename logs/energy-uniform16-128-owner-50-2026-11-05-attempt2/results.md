# Esito delle campagne con proprietario dello smart meter

**16 bit: completata. 128 bit: interrotta; risultati parziali.**

La funzione `setSmartMeterOwner` associa un `eaddress` a un ID pubblico di smart meter. La baseline usa `address`. Lo stato energetico utilizza lo stesso ID. Il proprietario sintetico resta costante e ogni importazione FHE prepara un nuovo input cifrato. Il chiamante/decryptor autorizzato rimane l’operatore del contratto: questa associazione non implementa autenticazione privata del proprietario.

Il fallimento a 128 bit riguarda Fhenix, round 10, `mean`: **HTTP 429, `sealOutput request failed: Too Many Requests`**. La transazione risulta confermata con stato 1; è fallita la successiva richiesta di decryption. La latenza primaria del campione resta fallita. Nessuna transazione è stata ritrasmessa e nessuna campagna sostitutiva è stata avviata dopo questo errore.

| Larghezza | Primari validi/tentati | Previsti | Owner validi (per piattaforma) | View+decrypt valide/previste | Triplette nello stesso blocco | Gas ETH, deployment e warmup inclusi |
|---|---:|---:|---:|---:|---:|---:|
| 16 | 900/900 | 900 | 50 / 50 / 50 | 150/150 | 300/300 osservate, 300 previste | 0.000000004916703501 |
| 128 | 176/177 | 900 | 10 / 10 / 10 | 27/150 | 59/59 osservate, 300 previste | 0.000000001267692612 |

Ogni larghezza ha inoltre 18 primari di warmup validi, tre view di warmup valide e tre deployment. I pilot sono separati: ciascuno ha 18 primari misurati e 18 di warmup validi, tre view misurate e tre di warmup valide, 6/6 triplette nello stesso blocco. I risultati dei pilot non sono aggiunti alle medie delle campagne misurate.

## Latenze per operazione

Le celle indicano **invocazione broadcast → receipt / invocazione broadcast → plaintext validato**, in millisecondi medi, seguite da **(n receipt / n validati)**. Il campione Fhenix fallito a 128 bit contribuisce alla receipt e al gas, ma non alle latenze di completamento validate.

### 16 bit

| Operazione | Baseline | Zama | Fhenix |
|---|---:|---:|---:|
| set_meter_owner | 9683.6 / 9810.5 (50/50) | 9688.1 / 13649.1 (50/50) | 9701.5 / 10050.5 (50/50) |
| notarize | 12799.1 / 12930.3 (50/50) | 12753.9 / 16625.5 (50/50) | 12749.4 / 13030.9 (50/50) |
| add | 8961.7 / 9099.5 (50/50) | 8928.2 / 13107.4 (50/50) | 8923.6 / 9357.3 (50/50) |
| mul_scalar | 7333.8 / 7465.8 (50/50) | 7300.1 / 11616.1 (50/50) | 7308.0 / 7658.4 (50/50) |
| mean | 9088.7 / 9219.5 (50/50) | 9056.5 / 13293.9 (50/50) | 9088.8 / 9805.4 (50/50) |
| max | 9227.3 / 9356.5 (50/50) | 9257.4 / 13114.0 (50/50) | 9270.8 / 9627.8 (50/50) |

| Piattaforma | View+decrypt già pronto, media ms (n) | Gas ETH inclusi deployment/warmup |
|---|---:|---:|
| baseline | 78.1 (50) | 0.000000000304517262 |
| zama | 2385.1 (50) | 0.000000002458884529 |
| fhenix | 168.9 (50) | 0.000000002153301710 |

### Preparazione e ciclo completo del client

| Piattaforma | Operazione | Preparazione ms (n) | Attesa barriera ms (n) | Receipt → validazione ms (n) | Lavoro client completo ms (n) |
|---|---|---:|---:|---:|---:|
| baseline | set_meter_owner | 166.3 (50) | 10250.9 (50) | 126.8 (50) | 9976.7 (50) |
| baseline | notarize | 168.3 (50) | 10236.2 (50) | 131.2 (50) | 13098.6 (50) |
| baseline | add | 162.4 (50) | 453.0 (50) | 137.8 (50) | 9261.9 (50) |
| baseline | mul_scalar | 186.0 (50) | 441.3 (50) | 132.0 (50) | 7651.8 (50) |
| baseline | mean | 180.5 (50) | 449.1 (50) | 130.8 (50) | 9400.0 (50) |
| baseline | max | 174.5 (50) | 441.4 (50) | 129.1 (50) | 9530.9 (50) |
| zama | set_meter_owner | 10052.4 (50) | 365.0 (50) | 3961.1 (50) | 23701.6 (50) |
| zama | notarize | 10038.1 (50) | 366.8 (50) | 3871.6 (50) | 26663.6 (50) |
| zama | add | 142.7 (50) | 473.0 (50) | 4179.1 (50) | 13250.1 (50) |
| zama | mul_scalar | 151.0 (50) | 476.4 (50) | 4315.9 (50) | 11767.0 (50) |
| zama | mean | 151.5 (50) | 478.2 (50) | 4237.4 (50) | 13445.3 (50) |
| zama | max | 147.7 (50) | 468.2 (50) | 3856.6 (50) | 13261.7 (50) |
| fhenix | set_meter_owner | 9378.1 (50) | 1039.1 (50) | 349.0 (50) | 19428.5 (50) |
| fhenix | notarize | 8971.3 (50) | 1433.3 (50) | 281.5 (50) | 22002.1 (50) |
| fhenix | add | 167.1 (50) | 448.6 (50) | 433.8 (50) | 9524.5 (50) |
| fhenix | mul_scalar | 176.4 (50) | 450.6 (50) | 350.4 (50) | 7834.8 (50) |
| fhenix | mean | 176.3 (50) | 453.3 (50) | 716.6 (50) | 9981.7 (50) |
| fhenix | max | 160.4 (50) | 455.5 (50) | 357.1 (50) | 9788.2 (50) |

Scarto effettivo degli inizi broadcast: media 0.79 ms, massimo 16 ms, n=300 triplette. ACK broadcast: media 110.9 ms, massimo 398.7 ms, n=900 transazioni.

Report grezzo: [report.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint16/report.json). Analisi: [uniform-analysis.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint16/uniform-analysis.json). Blocchi: [block-inclusion.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint16/block-inclusion.json). Audit: [execution-audit.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint16/execution-audit.json).

### 128 bit — PARZIALE

| Operazione | Baseline | Zama | Fhenix |
|---|---:|---:|---:|
| set_meter_owner | 12332.5 / 12457.7 (10/10) | 12316.4 / 15777.0 (10/10) | 12261.5 / 12624.7 (10/10) |
| notarize | 11765.4 / 11896.3 (10/10) | 11805.1 / 15271.3 (10/10) | 11704.3 / 12046.5 (10/10) |
| add | 7519.1 / 7629.9 (10/10) | 7592.3 / 12095.5 (10/10) | 7558.8 / 7959.7 (10/10) |
| mul_scalar | 6752.0 / 6892.6 (10/10) | 6811.6 / 10801.1 (10/10) | 6866.4 / 9009.4 (10/10) |
| mean | 10967.3 / 11094.9 (10/10) | 11011.4 / 15195.9 (10/10) | 11009.2 / 24028.5 (10/9) |
| max | 14210.0 / 14322.3 (9/9) | 14252.5 / 18138.6 (9/9) | 14218.8 / 14840.7 (9/9) |

| Piattaforma | View+decrypt già pronto, media ms (n) | Gas ETH inclusi deployment/warmup |
|---|---:|---:|
| baseline | 57.5 (9) | 0.000000000149157295 |
| zama | 2372.6 (9) | 0.000000000588294863 |
| fhenix | 204.7 (9) | 0.000000000530240454 |

### Preparazione e ciclo completo del client

| Piattaforma | Operazione | Preparazione ms (n) | Attesa barriera ms (n) | Receipt → validazione ms (n) | Lavoro client completo ms (n) |
|---|---|---:|---:|---:|---:|
| baseline | set_meter_owner | 161.0 (10) | 8247.8 (10) | 125.2 (10) | 12618.7 (10) |
| baseline | notarize | 134.8 (10) | 8249.7 (10) | 131.0 (10) | 12031.1 (10) |
| baseline | add | 139.9 (10) | 320.2 (10) | 110.8 (10) | 7769.8 (10) |
| baseline | mul_scalar | 198.6 (10) | 307.9 (10) | 140.6 (10) | 7091.1 (10) |
| baseline | mean | 161.7 (10) | 309.6 (10) | 127.6 (10) | 11256.5 (10) |
| baseline | max | 229.4 (9) | 302.7 (9) | 112.3 (9) | 14551.6 (9) |
| zama | set_meter_owner | 8117.9 (10) | 290.9 (10) | 3460.7 (10) | 23894.9 (10) |
| zama | notarize | 8095.0 (10) | 289.5 (10) | 3466.2 (10) | 23366.3 (10) |
| zama | add | 125.2 (10) | 334.9 (10) | 4503.2 (10) | 12220.7 (10) |
| zama | mul_scalar | 148.3 (10) | 358.1 (10) | 3989.4 (10) | 10949.4 (10) |
| zama | mean | 138.0 (10) | 333.3 (10) | 4184.5 (10) | 15333.9 (10) |
| zama | max | 224.6 (9) | 307.5 (9) | 3886.1 (9) | 18363.2 (9) |
| fhenix | set_meter_owner | 7517.6 (10) | 891.2 (10) | 363.2 (10) | 20142.2 (10) |
| fhenix | notarize | 7492.4 (10) | 892.0 (10) | 342.2 (10) | 19539.0 (10) |
| fhenix | add | 130.7 (10) | 329.3 (10) | 400.9 (10) | 8090.5 (10) |
| fhenix | mul_scalar | 173.2 (10) | 333.2 (10) | 2143.1 (10) | 9182.6 (10) |
| fhenix | mean | 133.5 (9) | 337.1 (9) | 12566.2 (9) | 24162.0 (9) |
| fhenix | max | 167.1 (9) | 365.1 (9) | 621.9 (9) | 15007.8 (9) |

Scarto effettivo degli inizi broadcast: media 0.22 ms, massimo 1 ms, n=59 triplette. ACK broadcast: media 111.4 ms, massimo 200.0 ms, n=177 transazioni.

Report grezzo: [report.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128/report.json). Analisi: [uniform-analysis.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128/uniform-analysis.json). Blocchi: [block-inclusion.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128/block-inclusion.json). Audit: [execution-audit.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128/execution-audit.json).

## Polling, retry e interpretazione

La base configurata di decryption è 10 ms. Nei log misurati sono presenti hint CoFHE da 100 ms e hint Zama da 2000 ms, con un evento da 5000 ms nella campagna a 16 bit. Le letture receipt usano attese da 500 ms dopo risposte pending. Questi hint non sono misure dell’effettiva durata del sonno né del calcolo FHE.

A 16 bit non sono registrati HTTP 429 nei trace HTTP CoFHE; a 128 bit ne è registrato uno, coincidente con il fallimento. Le risposte 404/204 di attesa non equivalgono a fallimenti primari. Gli audit di polling separano primari misurati, warmup e view (queste ultime includono anche la view di warmup nel riepilogo degli eventi). L’osservazione HTTP copre le richieste CoFHE intercettate; Zama espone eventi di progresso del SDK.

Tutti i retry di lettura e le loro attese restano nelle latenze osservate. Per la campagna a 16 bit sono registrati 53 retry di propagazione del blocco e 77 retry ACL Zama nei primari misurati; a 128 bit, rispettivamente 11 e 16. Nessun retry di mutazione on-chain. Le view leggono il risultato max già validato e non rappresentano completamenti primari nuovi.

Il ciclo completo del client è `preparationMs + transactionToValidatedPlaintextMs`; l’attesa intenzionale alla barriera resta separata. Il ritardo post-receipt comprende getter, autorizzazione, servizi, polling e validazione e non isola il solo calcolo FHE. Le latenze di inclusione non dimostrano che il calcolo della baseline sia più lento. Non vengono aggregati statisticamente i precedenti esperimenti con processo condiviso né le campagne interrotte.

## Integrità e metadati supplementari

Gli hash dei 40 file sorgente e dei bundle SDK corrispondono a quelli registrati. I tre worker hanno PID distinti. Hash preparati e hash trasmessi, prezzi effettivi e gas usato, identità delle durate e associazioni del proprietario sono stati verificati. Le ultime tre transazioni risultano canoniche e confermate; latest e pending nonce coincidono a 748.

171 campioni a 16 bit e 36 a 128 bit non avevano metadati di blocco opzionali disponibili al momento della misura. Sono stati recuperati con 158 chiamate RPC complessive in sola lettura, verificando numero e hash canonico. Le copie supplementari aggiungono solo timestamp, gas del blocco, limite gas e utilizzo. Gli originali, le latenze, gli esiti e gli hash registrati restano invariati. Le triplette risultano 300/300 a 16 bit e 59/59 tra quelle tentate a 128 bit sia sui report grezzi sia sulle copie supplementari.

| Larghezza | SHA256 report grezzo | Provenienza metadati |
|---|---|---|
| 16 | `ea71bf7e2a4503fa82ab48fa6deee9e1a97392bd857720da44f85573dc3e1d73` | [provenance.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint16/supplementary/provenance.json) |
| 128 | `a156c28e4815ab3314726ff7ae800c581db40c2d8ec7bdfea51b47872bb4cebb` | [provenance.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128/supplementary/provenance.json) |

Audit terminale: [terminal-failure-audit.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/terminal-failure-audit.json). Manifest: [campaign.json](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/campaign.json).

Il monitoraggio è terminato per il fallimento della campagna a 128 bit. Non viene dichiarato il completamento dei due esperimenti.
