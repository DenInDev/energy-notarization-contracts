# Ripresa della preparazione del pilot di concorrenza euint16

- Fonte immutabile: `concurrency-euint16/report.json`, SHA256 `b5b85f760c43e06e7f166ae50d4f08f8af07ad74c4e8e9c53695732bfc3ac748`.
- Primo controllo seriale forward Zama: 8/8 snapshot e stato finale validati. Nessuna misura principale ancora eseguita.
- Controllo reverse: finestra aperta e confermata, un hash preparato e un successivo errore `Bad request`; nessun invio del batch avvenuto.
- Nonce verificati prima della ripresa: operatore 226, writer1 8, writer2 0; latest e pending coincidono.
- Le stime dei submit vengono ancorate al blocco canonico di apertura della finestra, con caller esplicito e un input per richiesta. Il gas limit restituito viene passato alla firma, evitando stime implicite su pending.
- Preflight: tutte le receipt canoniche, codice del contratto, snapshot e stato finale del controllo forward, modalità e partecipanti della finestra reverse, stato zero, nonce esatti e tutti gli ID ancora inutilizzati.
- Il batch reverse viene ripreparato. L'hash firmato precedentemente e mai pubblicato è conservato come scartato; non si ripete alcuna transazione già inviata.
- Il report sorgente, i suoi trial e le sue setup restano immutabili. Il controllo forward e la finestra già aperta non sono ripetuti. Le due piattaforme non ancora avviate ricevono soltanto le deployment/autorizzazioni originariamente previste.
- Residuo di questo pilot: 640 invii writer e 83 setup, incluse due deployment; nessun nuovo finanziamento.
- Il pilot circuiti16 già completato viene verificato per SHA256 e saltato integralmente. Rimangono poi circuiti128 e concorrenza128, ancora non avviati.
- Manifest: `campaign-continuation3.json`. Output: `concurrency-euint16-continuation1/`. Budget residuo complessivo: massimo 1.680 transazioni.

Il fallimento di preparazione resta esplicito; non è un risultato FHE incoerente. La fonte esatta del revert storico non viene ricostruita o riclassificata retroattivamente.
