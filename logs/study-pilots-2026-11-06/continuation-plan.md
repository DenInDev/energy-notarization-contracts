# Ripresa del pilot circuiti euint16

- Report originale immutabile: `circuits-euint16/report.json`.
- SHA256: `f08036a0b4152af83762aeddd7054b440f9e1aa6fa72aa8b83c93599c6b47020`.
- Originale: 27 warmup validi, 4 compute misurate valide, 1 preparazione interrotta prima di firma/invio della compute.
- Ultimo caricamento input confermato al nonce 68; nonce successivo verificato latest=pending=69.
- Errore registrato: `The Hardhat Fhevm plugin is not initialized.` L'errore RPC sottostante originale non è ricostruibile.
- Le successive simulazioni dirette della richiesta hanno avuto successo. L'inizializzazione esplicita del plugin è stata verificata con letture soltanto; una stima volutamente errata restituisce ora `Wrong input count` invece di mascherarne la causa.
- Contratti, SDK, trasporto delle compute e policy di decryption invariati. Nuovo codice: inizializzazione e controllo/ripresa del checkpoint, con provenienza separata.
- Invii ancora pianificati nel primo stadio: 77 compute e 76 nuovi caricamenti input, nessuna nuova deployment, autorizzazione o ripetizione warmup.
- Il caricamento già confermato del caso interrotto viene verificato e riutilizzato; il relativo gas resta conteggiato una sola volta.
- Prima di inviare: verifica completa delle receipt canoniche e dei nonce, bytecode, snapshot precedenti, input salvati e richiesta ancora non eseguita. Un esito incerto blocca la continuazione.
- Il tentativo di preparazione fallito rimane nel prefisso del nuovo report. Al successo di tutte le compute previste ci saranno 81 risultati misurati validi e 1 preparazione fallita conservata; non si tratta di una campagna ininterrotta senza errori.
- Gli altri tre pilot rimangono quelli originariamente pianificati e ancora non avviati. Budget massimo residuo dell'intera sequenza: 1.845 transazioni, senza ulteriori finanziamenti.

Manifest della ripresa: `campaign-continuation1.json`. Output: `circuits-euint16-continuation1/`.
Snapshot del codice precedente: `source-before-continuation1.zip`.
Audit in sola lettura: `plugin-estimate-readonly-audit.json`, `plugin-initialization-audit.json`, `plugin-error-decoding-audit.json`.
