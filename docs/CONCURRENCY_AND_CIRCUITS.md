# Due studi aggiuntivi: concorrenza e complessità dei circuiti



## Obiettivo e stato



Le suite classiche baseline/Zama/Fhenix, comprese le varianti uniformi e l'owner dello smart meter, restano disponibili. I nuovi studi usano contratti e report separati. La preparazione del 6 novembre 2026 comprende implementazione e controlli locali; non comprende una nuova campagna Sepolia. In particolare, la compilazione CoFHE non sostituisce un pilot reale del suo percorso SDK/rete.



Il piano è visibile con `npm run study:plan`. Il comando non legge chiavi o provider e non crea account o report. Serve `--live` per effettuare transazioni. Tutti i conteggi sono per piattaforma, larghezza e condizione: non si mescolano dati a 16/128 bit o protocolli classici e nuovi.



## 1. Concorrenza: distinguere ordine legittimo ed errore



La domanda non è se due transazioni modifichino contemporaneamente lo storage EVM: il riferimento del test è il loro ordine canonico. La domanda è se, in presenza di richieste concorrenti e lavoro FHE asincrono, ogni risultato e lo stato finale corrispondano a quell'ordine.



| Modalità | Aggiornamento modulo 2^w | Cosa controlla |

|---|---|---|

| `independent` | `S_utente = S_utente + x` | Isolamento fra writer e risultati associati alla richiesta giusta |

| `shared_sum` | `S = S + x` | Stato comune, assenza di aggiornamenti persi; somma finale indipendente dall'interleaving |

| `shared_ordered` | `S = 3*S + x` | Stato comune sensibile all'ordine; differenze legittime e violazioni del replay |



Si usano **C = 1, 2, 4, 8 writer**, ciascuno con un account distinto, e **32 transazioni per finestra** per tutti i valori di C. C cambia la concorrenza, non il numero totale di richieste. Un account operatore separato apre finestre nuove, autorizza i writer e verifica i risultati.



### Protocollo implementato



1. Aprire una finestra con stato zero e partecipanti espliciti, registrando il setup separatamente.

2. Preparare input, proof, gas estimate, nonce e transazioni firmate **prima** del periodo di invio, usando una fee quote comune alla finestra. I bytes firmati restano in memoria; nel report si salva soltanto l'hash.

3. Inviare ondate di C transazioni, una per writer. L'ondata successiva parte dopo le receipt della precedente. Il protocollo è quindi **a ondate sincronizzate sulle receipt**, non un generatore di carico continuo. Un solo coordinatore usa I/O asincrono; non ci sono C processi di generazione proof simultanei. Preparazione e spread effettivo di broadcast sono registrati.

4. Ogni transazione conserva uno snapshot immutabile sotto un request ID unico. Il contratto emette anche un contatore sequenziale della finestra.

5. Ricostruire l'ordine con `(blockNumber, transactionIndex)` e verificarlo contro il contatore del contratto. L'ordine di invio, ACK, ricezione delle receipt o completamento delle decrypt non sostituisce questo riferimento.

6. Dopo tutte le receipt, leggere e decifrare **ogni snapshot** e lo stato finale. Ogni lettura è riferita al block hash canonico della relativa receipt. L'audit usa l'operatore, in sequenza.



Le finestre delle piattaforme sono sequenziali e il loro ordine ruota; non si promette inclusione nello stesso blocco fra piattaforme. I nonce dello stesso sender impongono un ordine: la concorrenza fra writer non autorizza permutazioni impossibili del singolo account.



Con C=1 il warmup include controlli seriali **forward/reverse**, con gli stessi plaintext ma ciphertext e stato nuovi. Le somme devono conservare lo stesso risultato finale; `3*S+x` deve cambiarlo per i dati del controllo. I dati del controllo sono corretti in modo deterministico se i due ordini collidono modulo 2^w. Questo rende visibile l'effetto dell'ordine anche se la rete non riordina le richieste concorrenti.



### Classificazione e misure



- **Ordine diverso, risultato coerente con il replay:** comportamento valido, non inconsistenza.

- **Plaintext diverso dall'oracolo a parità di ordine e input:** finestra `inconsistent` da investigare, senza attribuirne automaticamente la causa alla crittografia.

- **Receipt, risultato o servizio non disponibili entro deadline:** finestra `incomplete`; un timeout non dimostra un aggiornamento perso.

- **Risultati di una richiesta non sovrascritti da scritture successive:** verificati attraverso gli snapshot, evitando il falso confronto con il getter dello stato più recente.



Si riportano n tentativi/validi/falliti, riordinamenti, snapshot e stati verificati, gas, costo ETH effettivo, ACK, spread, tempo fino all'ultima receipt e throughput osservato delle receipt. L'audit è differito: `auditCallMs` misura una lettura/decrypt eseguita successivamente e **non** la latenza originale transazione→completamento FHE. `fullWindowMs` include audit e letture finali; `preparationMs` resta separata. Questo esperimento non misura il throughput massimo della rete né la sua capacità con decrypt concorrenti.



### Numero di prove consigliato



- **Pilot:** 3 finestre per condizione, C=1/2 e 8 richieste, prima 16 bit, poi il pilot 128 bit. Verificare tutte le piattaforme prima della matrice principale.

- **Studio principale:** 50 finestre indipendenti per condizione × 32 richieste = **1.600 richieste per cella**. Distribuire idealmente le prove su almeno tre sessioni temporali, con seed e report distinti. La CLI seleziona il numero per singola sessione: ad esempio 17+17+16, non 50 ripetuto tre volte senza aggiornare il totale.

- **Approfondimento robustezza:** portare a **300 finestre totali** le celle critiche C=8, `shared_sum` e `shared_ordered`, dopo avere verificato costo e stabilità del pilot. Se ci sono già 50 finestre utilizzabili, ne servono altre 250, conservando i segmenti separati.



La numerosità non garantisce che emerga un'inconsistenza. Con zero finestre problematiche su N, e **solo assumendo finestre indipendenti e rappresentative**, il limite superiore unilaterale esatto al 95% per la probabilità di una finestra problematica è `1 - 0.05^(1/N)`: circa **5,82% con 50** e **0,994% con 300**. È un limite per singola cella, non una copertura simultanea di tutta la matrice. Non si devono trattare le 32 richieste della stessa finestra come 32 prove indipendenti. In presenza di dipendenza temporale, quel limite binomiale può essere inappropriato. Il report lo etichetta esplicitamente come condizionale. Riferimento: [NIST, intervalli binomiali esatti](https://itl.nist.gov/div898/software/dataplot/refman2/auxillar/exacbino.htm).



## 2. Circuiti: quantità di lavoro e dipendenze



Qui interessa la risposta osservata alla crescita di un circuito eseguito in **una singola transazione**, senza confonderla con una catena di transazioni o con più input da cifrare nel timer principale.



| Famiglia | Livelli | Operazioni FHE aritmetiche | Profondità teorica |

|---|---|---|---|

| `sum_linear` | N=2,4,8,16,32 input | N−1 addizioni | N−1 |

| `sum_tree` | Gli stessi N | N−1 addizioni | log2(N) |

| `affine_chain` | k=1,2,4,8,16,32 | k moltiplicazioni + k addizioni | 2k |



La coppia lineare/albero distingue la struttura delle dipendenze a parità di lavoro aritmetico. Non garantisce un vantaggio osservabile dell'albero: il risultato dipende anche da scheduler, batching, caching e rete. Il gas può differire per il diverso controllo di flusso Solidity, nonostante il numero uguale di addizioni.



La catena parte da `x=a` e ripete `x=x*b+a`. **a e b sono entrambi cifrati** in entrambe le piattaforme; non si confronta una moltiplicazione per scalare pubblico con una encrypted×encrypted. Con k aumentano sia lavoro sia profondità: questa famiglia da sola non isola il costo causale della profondità.



I contratti separati usano esclusivamente uint16/euint16 oppure uint128/euint128 per stato e aritmetica. Un oracolo BigInt applica lo stesso wrapping modulo 2^w del baseline, anche con valori alti e overflow. Contatori pubblici, indici e metadati non rappresentano i valori energetici e possono avere tipi diversi.



### Protocollo e metriche



Gli operandi sono deterministici e abbinati per round/larghezza, con input freschi cifrati per ogni caso e stato nuovo. Prima della compute transaction si caricano e si decifrano tutti gli operandi, controllandone l'uguaglianza: così la disponibilità degli input è un prerequisito verificato. Il SDK Zama installato limita input/decrypt a 2.048 bit per richiesta: i 32 operandi a 128 bit vengono caricati in due batch di 16, con la stessa suddivisione di setup per tutte le piattaforme. Dopo l'esecuzione il job non può più essere modificato o rieseguito. Il circuito rimane in una sola compute transaction; il suo timer esclude caricamento, decryption di readiness, gas estimate e firma.



Per ogni livello registrare:



- **Tx→receipt**: dal percorso di broadcast preparato all'osservazione della receipt.

- **Tx→plaintext validato** e **receipt→plaintext validato**: getter riferito al blocco della receipt, decrypt e confronto con l'oracolo, immediatamente dopo la compute.

- **Gas compute** e costo effettivo `gasUsed * effectiveGasPrice`; setup, deployment, autorizzazioni e warmup restano conteggiati separatamente nel costo complessivo.

- Preparazione/readiness, ACK, errori, retry e hint osservati nelle trace; ogni statistica deve dichiarare il proprio n. Il tempo di preparazione di questo studio comprende anche il setup degli operandi, quindi non va equiparato alla sola cifratura input delle vecchie tabelle.



Consiglio **3 prove pilot per livello**, poi **50 misure per livello/piattaforma/larghezza**, distribuite temporalmente. Cinquanta osservazioni non danno una stima precisa di percentili estremi come p99: usare mediana, media, dispersione e p95 descrittivo con prudenza. Conservare i fallimenti e i denominatori. I tempi post-receipt includono RPC, autorizzazione, polling, decrypt e validazione: non sono tempo di sola computazione FHE.



### Limiti dei circuiti osservati nei controlli locali



L'implementazione host Zama installata applica limiti di Homomorphic Compute Units (HCU), sia sul totale sia sulle dipendenze del circuito. I controlli locali incontrano `HCUTransactionDepthLimitExceeded()` con la somma lineare di 32 input a 128 bit e con la catena affine di 32 iterazioni a entrambe le larghezze. Sono risultati della configurazione locale, non soglie Sepolia già misurate. Non vengono disabilitati limiti o alterate le dipendenze per fare passare i test.



Il runner effettua una stima gas prima di prenotare il nonce della compute. Solo i due errori HCU esatti riconosciuti (`HCUTransactionLimitExceeded`, `HCUTransactionDepthLimitExceeded`) producono `capacity_rejected`: nessun invio compute, gas/latenza non disponibili, setup già effettuato mantenuto nei costi. Il resto della matrice pianificata prosegue; timeout, errori di rete e revert non riconosciuti continuano a fermare il run. La crescita viene quindi descritta anche con livelli accettati/rifiutati, senza assegnare zero gas o zero latenza a circuiti mai eseguiti.



`executionComplete=true` significa che tutti i tentativi programmati sono terminati; `complete=true` richiede anche che tutte le prove siano valide. Nella campagna principale conviene dedicare 50 misure ai livelli eseguibili verificati dal pilot e poche sonde al confine di capacità, senza ripetere 50 volte una preflight rejection deterministica. Il conteggio delle transazioni nel piano è un budget superiore, non una previsione del numero di circuiti accettati.



## Dimensione e avvio graduale



La matrice predefinita contiene 24 condizioni di concorrenza e 32 di circuiti, prima dell'espansione per le tre piattaforme:



| Categoria | Transazioni |

|---|---:|

| Concorrenza misurata | 115.200 |

| Circuiti misurati | 4.800 |

| Warmup e controlli | 2.976 |

| Setup, incluse 6 deployment e relative autorizzazioni | 8.904 |

| **Totale** | **131.880** |



Non lancerei tutta la matrice come primo passo. Prima il pilot, poi i livelli eseguibili dei circuiti e una matrice ridotta di concorrenza; estendere C=8 e 128 bit sulla base di costo e affidabilità osservati. Il piano stampa i conteggi massimi per qualunque sottoinsieme, prima di possibili rifiuti HCU e fallimenti. Non vengono proposti costi ETH o durate inventati prima del pilot.



## Comandi, report e riproducibilità



Vedere [START-NEW-EXPERIMENTS.txt](../START-NEW-EXPERIMENTS.txt). Per l'intera matrice servono **9 account salvati dedicati**: indice 0 operatore, indici 1–8 writer. I circuiti da soli richiedono il solo operatore. Gli account non vengono finanziati automaticamente. Non usare account classici attivi o account in quarantena; lasciare il lock storico della directory radice al suo posto.



Ogni esecuzione richiede una directory nuova e salva:



- `report.json`: osservazioni, input sintetici, oracolo, hash preparati, receipt, gas, eventi SDK/retry, configurazione e SHA256 del codice/bundle polling;

- `summary.json` e `summary.md`: conteggi e statistiche descrittive con denominatori, setup separato e finestre incomplete;

- `controls.json`: verifiche forward/reverse;

- `costs.json`: costo effettivo delle receipt, inclusi warmup/setup e numero di broadcast ancora senza receipt.

- `transactions.jsonl`: journal append-only degli invii misurati; mantiene gli aggiornamenti anche prima del checkpoint dell'ondata. Evita di riscrivere l'intero report fra i writer concorrenti. Lo spread usa i timestamp monotoni dell'effettiva chiamata al trasporto, non quelli di preparazione del journal.



Non sono introdotti p-value o affermazioni causali automatiche. Confronti inferenziali successivi devono rispettare pairing, segmenti temporali e dipendenza delle osservazioni. I risultati storici non si riscrivono e non si mescolano con questi nuovi protocolli.



Il broadcast live usa il trasporto single-send della suite classica: nessun retry automatico di una mutazione. I retry sono per letture, entro deadline, con attese incluse e rispetto degli hint del server; CoFHE applica il minimo polling e la policy 429 registrati nel report. Dopo un errore si drenano le richieste dell'ondata già rilasciata e ci si ferma. Un broadcast non riconciliato conserva il lock degli account: nessun replay o ripartenza automatica.



Una continuazione dei circuiti è ammessa solo per una preparazione fallita prima della firma/invio della compute, con tutti i warmup già validi e ogni transazione precedente confermata. `tasks/studies/continuation.ts` conserva i byte del report sorgente e il prefisso serializzato delle prove, verifica ogni receipt canonica, nonce esatti, bytecode, ultimi snapshot, input salvati e assenza dello snapshot della richiesta interrotta. Non ripete deployment, warmup o caricamenti già confermati. Il vecchio fallimento resta come tentativo di preparazione aggiuntivo: `executionComplete` può diventare true mentre `complete` resta false. La durata della preparazione ripresa non rappresenta il lavoro originario intero. I segmenti registrano sorgenti e processi separati: gli offset monotoni di processi diversi non vanno confrontati fra loro.



Il pilot iniziale del 6 novembre ha inoltre mostrato che il plugin FHEVM non inizializzato poteva mascherare un errore RPC durante `estimateGas`. L'inizializzazione del provider è ora esplicita anche su Sepolia; il suo percorso è stato verificato con sole letture e blocco degli invii. L'errore RPC originario non è stato recuperato retroattivamente; le simulazioni successive della richiesta valida riuscivano. L'audit e il report iniziale rimangono separati dalla continuazione.



Un successivo `Wrong input count`, ancora prima della firma/invio compute, ha motivato un'ulteriore correzione della preparazione: Hardhat usa `pending` per default nelle stime, mentre gli input erano letti al blocco canonico della receipt. La compute viene ora stimata con lo stesso `{blockHash, requireCanonical:true}` e il gas limit restituito viene passato alla firma, evitando una seconda stima implicita su `pending`. Le prove successive in sola lettura vedevano due input e stimavano correttamente su tutti i tag, quindi lo stato `pending` esatto al momento dell'errore non è stato ricostruito. Entrambi i tentativi falliti restano nel report; non sono classificati retroattivamente come errori FHE. Contratti, trasporto degli invii, timer primari e policy di decrypt restano invariati. La nuova policy riguarda soltanto la preparazione delle compute.



Lo stesso ancoraggio è usato per stimare i `submit` concorrenti sul blocco canonico che apre la finestra. Una finestra interrotta durante la preparazione è recuperabile soltanto se **nessuna richiesta del batch è stata inviata**: tutti i nonce devono coincidere esattamente, gli ID devono risultare inutilizzati e lo stato iniziale deve essere zero. Il batch viene ripreparato e firmato; gli hash delle precedenti firme inutilizzate sono conservati come scartati. Finestre già parzialmente trasmesse, revert o acknowledgement incerti non sono ammessi a questo percorso. Un writer senza storia né nonce iniziale registrato è ammesso solo con `latest=pending=0`; le nuove esecuzioni registrano sempre i nonce iniziali. Controlli seriali già completati, deployment e apertura della finestra non vengono ripetuti. Le piattaforme non ancora deployate seguono il piano originario. I report conservano ogni preparazione fallita; `controls.json` usa l'ultimo tentativo del controllo, dichiarando anche i precedenti fallimenti. Il throughput rimane quello osservato dal client, comprensivo del lavoro fra le ondate e dei checkpoint.



## Riferimenti di implementazione



- `tasks/studies/plan.ts`: matrice, dati deterministici, conteggi e gate/depth teorici.

- `tasks/studies/oracle.ts`: ordine canonico, snapshot attesi e bound condizionale.

- `tasks/studies/runner.ts`: ondate, controlli, audit e timer dei circuiti.

- `tasks/studies/transactions.ts`: preparazione/firma, singolo invio, receipt e costo gas.

- `contracts/studies/StudyPlain.sol`, `StudyZama.sol`, `StudyCoFHE.sol`: stato, operazioni e ACL.

- [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/): `blockNumber` e `transactionIndex` nelle receipt.

- [Zama, coprocessor architecture](https://github.com/zama-ai/fhevm/blob/main/docs/protocol/architecture/coprocessor.md): contesto delle dipendenze e dell'esecuzione off-chain; non una garanzia di prestazione di questi esperimenti.





## Recupero delle finestre confermate e reinclusioni



Una finestra di concorrenza con tutte le richieste confermate e status1 può ricevere un audit tardivo in sola lettura, anche se era una prova misurata. Non si invia nuovamente alcuna richiesta. `recoveredAudits` conserva i risultati separati; il prefisso originale resta invariato. Il completamento logico dello slot serve a evitare doppi invii, non a ricostruire la latenza mancante. I risultati tardivi hanno denominatori separati e non entrano nelle statistiche di latenza originali.



Se una receipt è stata reinclusa, `tasks/studies/canonical.ts` richiede lo stesso hash, mittente, nonce, chain ID e destinatario, status1, un nuovo blocco canonico, evidenza che il vecchio blocco non sia più canonico e una seconda lettura stabile della receipt. Ambiguità, receipt mancanti/revert o variazioni d'identità interrompono il preflight. Il recupero append-only `canonicalReceipts` fornisce una vista derivata per ordine, letture dei risultati e costo effettivo gas. Non sostituisce i campi originali. La latenza della receipt reinclusa e il throughput della relativa finestra sono esclusi dalle statistiche canoniche: il momento della prima osservazione non coincide necessariamente con la conferma canonica attuale.



Una discrepanza della storia host-chain non è automaticamente un'inconsistenza FHE. Snapshot immutabili e stato finale vengono verificati contro il replay del nuovo ordine canonico, mantenendo traccia dell'interruzione e delle modifiche al coordinatore. Trasporto degli invii, contratti, SDK e politica di decrypt rimangono invariati.



## Analisi offline dei pilot completati

`.venv/Scripts/python.exe scripts/analysis/analyze-study-pilots.py logs/study-pilots-2026-11-06` usa il manifest finale e il ledger in sola lettura `final-canonical-audit.json`. Non accede alla rete. Verifica SHA e prefissi storici, unicità degli hash, nonce contigui, prodotti gas, oracolo modulare e ordine canonico. Genera analisi descrittive per caso/piattaforma e per segmento, con denominatori espliciti e CSV. Le analisi precedenti alla riverifica sono conservate in ZIP; i report grezzi restano invariati.
