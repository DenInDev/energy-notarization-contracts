# Seconda ripresa del pilot euint16

- Fonte immutabile: `circuits-euint16-continuation1/report.json`.
- Alla fonte: 27 warmup e 8 compute misurate validi, due preparazioni fallite conservate, nessuna compute fallita o incerta da reinviare.
- Ultimo input load al nonce 76; la compute interrotta non è stata firmata/inviata.
- La causa originaria completa non è ricostruibile: il primo errore era mascherato dal plugin; il secondo è `Wrong input count`. I getter ancorati alla receipt avevano già validato i due input; successive prove in sola lettura su pending/latest/receipt riuscivano.
- Hardhat usa `pending` come default per le stime. Ora `tasks/studies/preparation.ts` richiede la stima con il medesimo hash canonico della receipt del caricamento, senza fallback a pending/latest. Il limite stimato viene passato esplicitamente alla firma, impedendo una seconda stima implicita.
- La RPC Sepolia e i test locali hanno accettato l'ancoraggio per hash. Nessuna modifica ai contratti, al modulo di broadcast, agli SDK o alla policy di decrypt.
- Preflight della ripresa: verifica di tutte le receipt canoniche, nonce esatti, bytecode, snapshot e input salvati; prova che la richiesta interrotta non sia stata eseguita.
- Operazioni residue del primo pilot: 73 compute e 72 caricamenti nuovi; nessuna nuova deployment o ripetizione warmup, nessun nuovo finanziamento.
- I prefissi serializzati dei report precedenti sono controllati a ogni salvataggio e i file fonte non vengono modificati. Le preparazioni fallite rimangono tentativi aggiuntivi; i segmenti non formano una campagna ininterrotta senza errori.
- Manifest: `campaign-continuation2.json`. Output: `circuits-euint16-continuation2/`.
- Gli altri tre pilot conservano la matrice originaria. Budget residuo dell'intera sequenza: massimo 1.837 transazioni.

Audit: `pending-vs-canonical-estimate-audit.json`, `canonical-hash-gas-estimate-audit.json`.
Snapshot del codice precedente: `source-before-continuation2.zip`.
Verifica locale: 13 test delle suite superati, compresi ancoraggio della stima e ripresa senza replay.
