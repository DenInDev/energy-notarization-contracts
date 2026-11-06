# Fhenix euint128: esecuzione completata con fallimenti storici conservati

Completati i 50 round Fhenix, comprese **50 registrazioni del proprietario eaddress**. I 300 slot primari contengono **298 successi e due errori storici HTTP 429**: `mean` al round 10 e `max` al round 16.

Il `mean` è stato ripetuto con una nuova transazione autorizzata, nonce 748, registrata in `retrySamples`. Il `max` non è stato reinviato: plaintext e view sono stati recuperati solo in lettura, senza ricostruire la latenza originale. Baseline e Zama non hanno ricevuto nuove transazioni. La campagna globale a tre piattaforme resta incompleta.

Il segmento finale contiene **204/204 primari validi**, con nonce 786–989. La prima continuazione aveva prodotto 36 successi, un nuovo errore 429 e il retry separato di mean. Il controllo iniziale fallito della seconda cartella non ha prodotto transazioni.

## Latenze descrittive per segmento

Medie in ms con denominatori espliciti. Le receipt includono tutte le transazioni confermate, anche quelle la cui decryption è fallita. Completamento e post-receipt includono solo plaintext validati. I segmenti non sono aggregati per confronti statistici con le altre piattaforme. Nessun p-value inferenziale viene calcolato.

### initial_matched_segment

Original matched three-platform execution; requested SDK base 10 ms with observed server hints.

| Operazione | Successi/tentati | Receipt ms (n) | Plaintext validato ms (n) | Post-receipt ms (n) | Preparazione ms (n) | Client completo ms (n) |
|---|---:|---:|---:|---:|---:|---:|
| set_meter_owner | 10/10 | 12261.5 (10) | 12624.7 (10) | 363.2 (10) | 7517.6 (10) | 20142.2 (10) |
| notarize | 10/10 | 11704.3 (10) | 12046.5 (10) | 342.2 (10) | 7492.4 (10) | 19539.0 (10) |
| add | 10/10 | 7558.8 (10) | 7959.7 (10) | 400.9 (10) | 130.7 (10) | 8090.5 (10) |
| mul_scalar | 10/10 | 6866.4 (10) | 9009.4 (10) | 2143.1 (10) | 173.2 (10) | 9182.6 (10) |
| mean | 9/10 | 11009.2 (10) | 24028.5 (9) | 12566.2 (9) | 133.5 (9) | 24162.0 (9) |
| max | 9/9 | 14218.8 (9) | 14840.7 (9) | 621.9 (9) | 167.1 (9) | 15007.8 (9) |

Hint SDK osservati: `{'100': 743}`. Risposte HTTP osservate: `{'200': 78, '404': 21, '204': 722, '429': 1}`. Retry di lettura per HTTP 429: 0; attesa totale misurata 0.0 ms.

### fhenix_continuation1

Fhenix only; original polling policy; the separate authorized mean retry is excluded from primary timing rows.

| Operazione | Successi/tentati | Receipt ms (n) | Plaintext validato ms (n) | Post-receipt ms (n) | Preparazione ms (n) | Client completo ms (n) |
|---|---:|---:|---:|---:|---:|---:|
| set_meter_owner | 6/6 | 7197.0 (6) | 7446.4 (6) | 249.4 (6) | 7430.4 (6) | 14876.8 (6) |
| notarize | 6/6 | 3694.8 (6) | 3943.5 (6) | 248.7 (6) | 7363.2 (6) | 11306.7 (6) |
| add | 6/6 | 14306.4 (6) | 14615.1 (6) | 308.7 (6) | 108.1 (6) | 14723.2 (6) |
| mul_scalar | 6/6 | 10716.6 (6) | 12982.7 (6) | 2266.2 (6) | 108.0 (6) | 13090.7 (6) |
| mean | 6/6 | 8916.9 (6) | 21943.9 (6) | 13027.0 (6) | 105.5 (6) | 22049.4 (6) |
| max | 6/7 | 11692.3 (7) | 12688.3 (6) | 591.7 (6) | 172.2 (6) | 12860.5 (6) |

Hint SDK osservati: `{'100': 493}`. Risposte HTTP osservate: `{'200': 48, '204': 474, '404': 19, '429': 1}`. Retry di lettura per HTTP 429: 0; attesa totale misurata 0.0 ms.

### fhenix_continuation3

Fhenix only; client minimum 1000 ms, larger server hints respected; bounded HTTP 429 read retry within original deadline.

| Operazione | Successi/tentati | Receipt ms (n) | Plaintext validato ms (n) | Post-receipt ms (n) | Preparazione ms (n) | Client completo ms (n) |
|---|---:|---:|---:|---:|---:|---:|
| set_meter_owner | 34/34 | 7035.9 (34) | 7349.8 (34) | 313.9 (34) | 7495.0 (34) | 14844.8 (34) |
| notarize | 34/34 | 7762.2 (34) | 8103.0 (34) | 340.8 (34) | 7363.8 (34) | 15466.8 (34) |
| add | 34/34 | 12799.9 (34) | 13451.8 (34) | 651.9 (34) | 115.6 (34) | 13567.3 (34) |
| mul_scalar | 34/34 | 11976.4 (34) | 14646.8 (34) | 2670.5 (34) | 114.7 (34) | 14761.5 (34) |
| mean | 34/34 | 10173.9 (34) | 23642.5 (34) | 13468.7 (34) | 112.8 (34) | 23755.4 (34) |
| max | 34/34 | 10443.8 (34) | 11147.3 (34) | 703.5 (34) | 168.0 (34) | 11315.3 (34) |

Hint SDK osservati: `{'1000': 495}`. Risposte HTTP osservate: `{'200': 272, '204': 475, '404': 20}`. Retry di lettura per HTTP 429: 0; attesa totale misurata 0.0 ms.

## Retry e recupero separati

Nuovo mean: receipt 4130.8 ms; plaintext validato 4348.9 ms; post-receipt 218.1 ms. Hash: `0x4a3df21c8bbff1e4718251705a2d950c75de1f59f88617ea02a0089c56ffe174`. Il risultato usa lo stesso handle del tentativo originale, già verificato pronto in preflight. Questa misura non sostituisce il campione fallito.

View normali misurate: **49**, con media 177.4 ms. La view di recupero del round 16 è separata: **1 successo**, 127.3 ms. A queste si aggiunge la view Fhenix di warmup già presente nel report iniziale.

## Gas e controllo dello stato

Costo Fhenix complessivo: **0.000000001858180548 ETH**, calcolato come gasUsed × effectiveGasPrice su tutti i receipt, inclusi deployment originale, warmup, due transazioni con successiva decryption fallita e il nuovo mean.

Ultimo nonce Fhenix confermato: 989; latest e pending: 990. Baseline e Zama restano a 748. Gli hash dei report sorgente, i prefissi di campioni/view/retry/deployment/barriere e gli hash del codice del segmento e dei bundle SDK sono stati verificati.

Il polling finale ha un minimo client di 1 secondo e rispetta hint server maggiori. I 429 di decryption possono generare al massimo tre tentativi di lettura entro il timeout originario, con attese di almeno 5 e 10 secondi; nessuna mutazione on-chain viene ritentata automaticamente. I tempi includono attese e retry. Il totale client è preparazione + invio → validazione; la barriera intenzionale è separata. Il post-receipt non isola il calcolo FHE.

I nuovi dati Fhenix non sono contemporanei a baseline e Zama. I cambi di sessione e di politica di polling sono documentati e impediscono di trattare il risultato come una campagna ininterrotta o un nuovo confronto appaiato a tre piattaforme.

[Report grezzo](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128-fhenix-continuation3/report.json) · [Analisi JSON](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128-fhenix-continuation3/fhenix-analysis.json) · [Audit di completamento](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128-fhenix-continuation3/completion-audit.json)


## Blocchi e metadati supplementari

Restano 59/59 triplette appaiate nello stesso blocco del segmento iniziale. La prosecuzione Fhenix non aggiunge triplette a tre piattaforme. Sono stati recuperati solo metadati di blocco opzionali per 81 osservazioni su 73 blocchi con 74 chiamate RPC in sola lettura, verificando numero e hash. Il report grezzo, gli esiti, le latenze e gli hash canonici sono invariati.

[Inclusione grezza](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128-fhenix-continuation3/block-inclusion.json) · [Provenienza dei metadati](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128-fhenix-continuation3/supplementary/provenance.json) · [Inclusione supplementare](C:/Users/danie/Desktop/Dottorato/energy-notarization-contracts/logs/energy-uniform16-128-owner-50-2026-11-05-attempt2/measured-euint128-fhenix-continuation3/supplementary/block-inclusion.json).

Monitoraggio terminato perché le operazioni Fhenix autorizzate sono state tutte eseguite.
