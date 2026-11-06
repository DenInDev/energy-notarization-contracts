# Latenze: snapshot descrittivo provvisorio

Acquisito: 2026-10-24T12:42:47.912709+02:00 (Europe/Rome, UTC+02:00).
Misure primarie: 749 valide, 1 fallite, 0 pendenti; 750 previste.
Warmup esclusi: 15. Triple interamente valide: 249.

Tutte le durate nelle tabelle sono **secondi**. Le tabelle principali riportano medie; n e statistiche complete sono nel JSON.

Ricevuta = avvio invio → osservazione ricevuta; post-ricevuta = ricevuta osservata → plaintext validato; plaintext = somma delle due. Client totale = preparazione + plaintext, esclusa barriera intenzionale. ACK è già incluso nella latenza di inclusione. Già pronto è una seconda decryption success-only, separata. — significa non misurato.

## Confronto bilanciato: solo triple con successo primario per tutte le piattaforme

| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 50/50 | 0 | 0 | 0.260 | 0.128 | 6.342 | 0.154 | 6.495 | 6.756 | 10.695 | — (0) |
| notarize | zama | 50/50 | 0 | 0 | 10.583 | 0.130 | 6.326 | 4.592 | 10.919 | 21.502 | 0.373 | 2.350 (50) |
| notarize | fhenix | 50/50 | 0 | 0 | 9.396 | 0.136 | 6.313 | 0.290 | 6.603 | 15.998 | 1.559 | 0.158 (50) |
| add | baseline | 49/49 | 0 | 0 | 0.268 | 0.127 | 4.522 | 0.080 | 4.601 | 4.869 | 0.425 | — (0) |
| add | zama | 49/49 | 0 | 0 | 0.198 | 0.130 | 4.537 | 5.004 | 9.540 | 9.738 | 0.495 | 2.346 (49) |
| add | fhenix | 49/49 | 0 | 0 | 0.277 | 0.126 | 4.533 | 0.388 | 4.921 | 5.198 | 0.415 | 0.152 (49) |
| mul_scalar | baseline | 50/50 | 0 | 0 | 0.256 | 0.130 | 6.170 | 0.083 | 6.253 | 6.509 | 0.426 | — (0) |
| mul_scalar | zama | 50/50 | 0 | 0 | 0.193 | 0.132 | 6.175 | 4.921 | 11.096 | 11.289 | 0.489 | 2.363 (50) |
| mul_scalar | fhenix | 50/50 | 0 | 0 | 0.261 | 0.134 | 6.166 | 0.620 | 6.785 | 7.046 | 0.421 | 0.148 (50) |
| mean | baseline | 50/50 | 0 | 0 | 0.261 | 0.134 | 4.853 | 0.071 | 4.924 | 5.185 | 0.423 | — (0) |
| mean | zama | 50/50 | 0 | 0 | 0.192 | 0.132 | 4.850 | 4.776 | 9.626 | 9.818 | 0.492 | 2.354 (50) |
| mean | fhenix | 50/50 | 0 | 0 | 0.265 | 0.139 | 4.855 | 4.594 | 9.449 | 9.714 | 0.420 | 0.155 (50) |
| max | baseline | 50/50 | 0 | 0 | 0.275 | 0.138 | 4.722 | 0.101 | 4.822 | 5.097 | 0.415 | — (0) |
| max | zama | 50/50 | 0 | 0 | 0.207 | 0.132 | 4.719 | 4.956 | 9.675 | 9.882 | 0.483 | 2.347 (50) |
| max | fhenix | 50/50 | 0 | 0 | 0.217 | 0.139 | 4.729 | 0.350 | 5.080 | 5.296 | 0.474 | 0.153 (50) |

## Tutte le osservazioni: medie dei successi, fallimenti e pendenti conservati nei conteggi

| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 50/50 | 0 | 0 | 0.260 | 0.128 | 6.342 | 0.154 | 6.495 | 6.756 | 10.695 | — (0) |
| notarize | zama | 50/50 | 0 | 0 | 10.583 | 0.130 | 6.326 | 4.592 | 10.919 | 21.502 | 0.373 | 2.350 (50) |
| notarize | fhenix | 50/50 | 0 | 0 | 9.396 | 0.136 | 6.313 | 0.290 | 6.603 | 15.998 | 1.559 | 0.158 (50) |
| add | baseline | 50/50 | 0 | 0 | 0.269 | 0.127 | 4.905 | 0.081 | 4.987 | 5.255 | 0.423 | — (0) |
| add | zama | 49/50 | 1 | 0 | 0.198 | 0.130 | 4.537 | 5.004 | 9.540 | 9.738 | 0.495 | 2.346 (49) |
| add | fhenix | 50/50 | 0 | 0 | 0.278 | 0.126 | 4.916 | 0.387 | 5.303 | 5.581 | 0.413 | 0.153 (50) |
| mul_scalar | baseline | 50/50 | 0 | 0 | 0.256 | 0.130 | 6.170 | 0.083 | 6.253 | 6.509 | 0.426 | — (0) |
| mul_scalar | zama | 50/50 | 0 | 0 | 0.193 | 0.132 | 6.175 | 4.921 | 11.096 | 11.289 | 0.489 | 2.363 (50) |
| mul_scalar | fhenix | 50/50 | 0 | 0 | 0.261 | 0.134 | 6.166 | 0.620 | 6.785 | 7.046 | 0.421 | 0.148 (50) |
| mean | baseline | 50/50 | 0 | 0 | 0.261 | 0.134 | 4.853 | 0.071 | 4.924 | 5.185 | 0.423 | — (0) |
| mean | zama | 50/50 | 0 | 0 | 0.192 | 0.132 | 4.850 | 4.776 | 9.626 | 9.818 | 0.492 | 2.354 (50) |
| mean | fhenix | 50/50 | 0 | 0 | 0.265 | 0.139 | 4.855 | 4.594 | 9.449 | 9.714 | 0.420 | 0.155 (50) |
| max | baseline | 50/50 | 0 | 0 | 0.275 | 0.138 | 4.722 | 0.101 | 4.822 | 5.097 | 0.415 | — (0) |
| max | zama | 50/50 | 0 | 0 | 0.207 | 0.132 | 4.719 | 4.956 | 9.675 | 9.882 | 0.483 | 2.347 (50) |
| max | fhenix | 50/50 | 0 | 0 | 0.217 | 0.139 | 4.729 | 0.350 | 5.080 | 5.296 | 0.474 | 0.153 (50) |

## Segmento 0 — prima interruzione

| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 7/7 | 0 | 0 | 0.274 | 0.127 | 11.937 | 0.140 | 12.077 | 12.350 | 11.643 | — (0) |
| notarize | zama | 7/7 | 0 | 0 | 11.599 | 0.141 | 11.951 | 5.145 | 17.096 | 28.695 | 0.319 | 2.413 (7) |
| notarize | fhenix | 7/7 | 0 | 0 | 10.500 | 0.169 | 11.864 | 0.276 | 12.141 | 22.640 | 1.418 | 0.175 (7) |
| add | baseline | 7/7 | 0 | 0 | 0.274 | 0.129 | 11.538 | 0.104 | 11.642 | 11.916 | 0.329 | — (0) |
| add | zama | 6/7 | 1 | 0 | 0.195 | 0.126 | 9.500 | 6.174 | 15.674 | 15.869 | 0.406 | 2.383 (6) |
| add | fhenix | 7/7 | 0 | 0 | 0.313 | 0.127 | 11.510 | 0.309 | 11.819 | 12.132 | 0.290 | 0.149 (7) |
| mul_scalar | baseline | 6/6 | 0 | 0 | 0.258 | 0.123 | 10.385 | 0.097 | 10.482 | 10.740 | 0.298 | — (0) |
| mul_scalar | zama | 6/6 | 0 | 0 | 0.191 | 0.129 | 10.413 | 5.109 | 15.522 | 15.714 | 0.367 | 2.425 (6) |
| mul_scalar | fhenix | 6/6 | 0 | 0 | 0.260 | 0.124 | 10.317 | 0.645 | 10.962 | 11.222 | 0.295 | 0.154 (6) |
| mean | baseline | 6/6 | 0 | 0 | 0.283 | 0.137 | 7.339 | 0.087 | 7.426 | 7.709 | 0.289 | — (0) |
| mean | zama | 6/6 | 0 | 0 | 0.196 | 0.135 | 7.340 | 4.980 | 12.319 | 12.516 | 0.376 | 2.370 (6) |
| mean | fhenix | 6/6 | 0 | 0 | 0.268 | 0.132 | 7.288 | 4.569 | 11.856 | 12.125 | 0.304 | 0.156 (6) |
| max | baseline | 6/6 | 0 | 0 | 0.273 | 0.138 | 12.409 | 0.119 | 12.529 | 12.802 | 0.304 | — (0) |
| max | zama | 6/6 | 0 | 0 | 0.204 | 0.124 | 12.469 | 5.509 | 17.978 | 18.182 | 0.373 | 2.355 (6) |
| max | fhenix | 6/6 | 0 | 0 | 0.233 | 0.141 | 12.328 | 0.553 | 12.881 | 13.114 | 0.344 | 0.172 (6) |

## Segmento 1 — continuazione

| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 43/43 | 0 | 0 | 0.258 | 0.128 | 5.431 | 0.156 | 5.587 | 5.845 | 10.541 | — (0) |
| notarize | zama | 43/43 | 0 | 0 | 10.417 | 0.128 | 5.411 | 4.503 | 9.913 | 20.331 | 0.382 | 2.340 (43) |
| notarize | fhenix | 43/43 | 0 | 0 | 9.216 | 0.130 | 5.409 | 0.292 | 5.701 | 14.917 | 1.582 | 0.155 (43) |
| add | baseline | 43/43 | 0 | 0 | 0.268 | 0.127 | 3.826 | 0.078 | 3.903 | 4.171 | 0.438 | — (0) |
| add | zama | 43/43 | 0 | 0 | 0.198 | 0.130 | 3.844 | 4.840 | 8.684 | 8.883 | 0.507 | 2.341 (43) |
| add | fhenix | 43/43 | 0 | 0 | 0.273 | 0.126 | 3.842 | 0.400 | 4.242 | 4.515 | 0.433 | 0.153 (43) |
| mul_scalar | baseline | 44/44 | 0 | 0 | 0.255 | 0.131 | 5.595 | 0.081 | 5.676 | 5.932 | 0.444 | — (0) |
| mul_scalar | zama | 44/44 | 0 | 0 | 0.193 | 0.133 | 5.597 | 4.895 | 10.492 | 10.685 | 0.506 | 2.355 (44) |
| mul_scalar | fhenix | 44/44 | 0 | 0 | 0.261 | 0.135 | 5.600 | 0.616 | 6.216 | 6.477 | 0.438 | 0.147 (44) |
| mean | baseline | 44/44 | 0 | 0 | 0.258 | 0.134 | 4.515 | 0.069 | 4.583 | 4.841 | 0.442 | — (0) |
| mean | zama | 44/44 | 0 | 0 | 0.191 | 0.131 | 4.511 | 4.748 | 9.259 | 9.450 | 0.508 | 2.352 (44) |
| mean | fhenix | 44/44 | 0 | 0 | 0.264 | 0.140 | 4.524 | 4.597 | 9.121 | 9.385 | 0.436 | 0.155 (44) |
| max | baseline | 44/44 | 0 | 0 | 0.275 | 0.139 | 3.673 | 0.098 | 3.771 | 4.047 | 0.431 | — (0) |
| max | zama | 44/44 | 0 | 0 | 0.208 | 0.133 | 3.662 | 4.881 | 8.543 | 8.751 | 0.498 | 2.346 (44) |
| max | fhenix | 44/44 | 0 | 0 | 0.214 | 0.139 | 3.693 | 0.323 | 4.016 | 4.230 | 0.492 | 0.151 (44) |

## Distribuzione completa per metrica — tutte le osservazioni valide

| Operazione | Piattaforma | Metrica | n | Media | Mediana | P95 | Min | Max | DS campionaria |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| notarize | baseline | transactionPreparationMs | 50 | 0.260 | 0.256 | 0.297 | 0.235 | 0.316 | 0.020 |
| notarize | baseline | preparationMs | 50 | 0.260 | 0.256 | 0.297 | 0.235 | 0.316 | 0.020 |
| notarize | baseline | barrierWaitMs | 50 | 10.695 | 10.628 | 12.353 | 9.160 | 12.413 | 0.948 |
| notarize | baseline | broadcastAckMs | 50 | 0.128 | 0.127 | 0.149 | 0.112 | 0.167 | 0.011 |
| notarize | baseline | broadcastToReceiptMs | 50 | 6.341 | 5.833 | 10.894 | 1.377 | 28.758 | 3.962 |
| notarize | baseline | confirmationMs | 50 | 6.342 | 5.834 | 10.894 | 1.377 | 28.758 | 3.962 |
| notarize | baseline | postReceiptToValidatedPlaintextMs | 50 | 0.154 | 0.129 | 0.163 | 0.112 | 1.252 | 0.159 |
| notarize | baseline | transactionToValidatedPlaintextMs | 50 | 6.495 | 5.953 | 11.054 | 1.530 | 28.917 | 3.966 |
| notarize | baseline | clientWorkMs | 50 | 6.756 | 6.213 | 11.343 | 1.798 | 29.190 | 3.974 |
| notarize | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| notarize | baseline | workerStartToPlaintextMs | 50 | 17.450 | 16.841 | 23.090 | 13.464 | 40.653 | 4.194 |
| notarize | baseline | workerWallIncludingReadyRepeatMs | 50 | 17.451 | 16.841 | 23.090 | 13.464 | 40.654 | 4.194 |
| notarize | zama | inputPreparationMs | 50 | 10.359 | 10.333 | 11.873 | 8.866 | 12.015 | 0.922 |
| notarize | zama | transactionPreparationMs | 50 | 0.224 | 0.202 | 0.296 | 0.168 | 0.465 | 0.053 |
| notarize | zama | preparationMs | 50 | 10.583 | 10.527 | 12.175 | 9.120 | 12.330 | 0.945 |
| notarize | zama | barrierWaitMs | 50 | 0.373 | 0.377 | 0.446 | 0.270 | 0.519 | 0.054 |
| notarize | zama | broadcastAckMs | 50 | 0.130 | 0.126 | 0.155 | 0.112 | 0.178 | 0.013 |
| notarize | zama | broadcastToReceiptMs | 50 | 6.326 | 5.819 | 10.987 | 1.305 | 28.790 | 3.980 |
| notarize | zama | confirmationMs | 50 | 6.326 | 5.819 | 10.987 | 1.305 | 28.790 | 3.980 |
| notarize | zama | postReceiptToValidatedPlaintextMs | 50 | 4.592 | 4.707 | 4.978 | 2.595 | 7.069 | 0.789 |
| notarize | zama | transactionToValidatedPlaintextMs | 50 | 10.919 | 10.061 | 16.805 | 5.804 | 33.492 | 4.092 |
| notarize | zama | clientWorkMs | 50 | 21.502 | 20.746 | 28.550 | 16.898 | 44.941 | 4.333 |
| notarize | zama | alreadyReadyDecryptMs | 50 | 2.350 | 2.338 | 2.458 | 2.290 | 2.635 | 0.064 |
| notarize | zama | workerStartToPlaintextMs | 50 | 21.874 | 21.121 | 28.841 | 17.220 | 45.229 | 4.328 |
| notarize | zama | workerWallIncludingReadyRepeatMs | 50 | 24.225 | 23.426 | 31.243 | 19.559 | 47.556 | 4.333 |
| notarize | fhenix | inputPreparationMs | 50 | 9.127 | 9.130 | 10.783 | 7.582 | 10.860 | 0.978 |
| notarize | fhenix | transactionPreparationMs | 50 | 0.269 | 0.259 | 0.343 | 0.232 | 0.532 | 0.047 |
| notarize | fhenix | preparationMs | 50 | 9.396 | 9.374 | 11.025 | 7.840 | 11.392 | 0.993 |
| notarize | fhenix | barrierWaitMs | 50 | 1.559 | 1.574 | 1.760 | 1.267 | 1.808 | 0.123 |
| notarize | fhenix | broadcastAckMs | 50 | 0.136 | 0.126 | 0.163 | 0.112 | 0.424 | 0.044 |
| notarize | fhenix | broadcastToReceiptMs | 50 | 6.313 | 5.816 | 10.676 | 1.357 | 28.790 | 3.959 |
| notarize | fhenix | confirmationMs | 50 | 6.313 | 5.816 | 10.676 | 1.358 | 28.791 | 3.959 |
| notarize | fhenix | postReceiptToValidatedPlaintextMs | 50 | 0.290 | 0.284 | 0.326 | 0.199 | 0.456 | 0.039 |
| notarize | fhenix | transactionToValidatedPlaintextMs | 50 | 6.603 | 6.109 | 10.981 | 1.557 | 29.048 | 3.957 |
| notarize | fhenix | clientWorkMs | 50 | 15.998 | 15.305 | 21.530 | 11.862 | 39.459 | 4.221 |
| notarize | fhenix | alreadyReadyDecryptMs | 50 | 0.158 | 0.144 | 0.252 | 0.133 | 0.289 | 0.037 |
| notarize | fhenix | workerStartToPlaintextMs | 50 | 17.558 | 16.801 | 23.017 | 13.490 | 40.785 | 4.184 |
| notarize | fhenix | workerWallIncludingReadyRepeatMs | 50 | 17.716 | 16.961 | 23.195 | 13.627 | 40.926 | 4.183 |
| add | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| add | baseline | transactionPreparationMs | 50 | 0.269 | 0.260 | 0.293 | 0.234 | 0.592 | 0.049 |
| add | baseline | preparationMs | 50 | 0.269 | 0.260 | 0.293 | 0.234 | 0.592 | 0.049 |
| add | baseline | barrierWaitMs | 50 | 0.423 | 0.423 | 0.551 | 0.262 | 0.567 | 0.081 |
| add | baseline | broadcastAckMs | 50 | 0.127 | 0.121 | 0.154 | 0.110 | 0.230 | 0.019 |
| add | baseline | broadcastToReceiptMs | 50 | 4.905 | 3.690 | 10.901 | 1.917 | 27.677 | 4.675 |
| add | baseline | confirmationMs | 50 | 4.905 | 3.690 | 10.902 | 1.917 | 27.678 | 4.675 |
| add | baseline | postReceiptToValidatedPlaintextMs | 50 | 0.081 | 0.063 | 0.146 | 0.050 | 0.153 | 0.034 |
| add | baseline | transactionToValidatedPlaintextMs | 50 | 4.987 | 3.747 | 11.041 | 1.975 | 27.825 | 4.694 |
| add | baseline | clientWorkMs | 50 | 5.255 | 3.990 | 11.455 | 2.290 | 28.081 | 4.699 |
| add | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| add | baseline | workerStartToPlaintextMs | 50 | 5.678 | 4.516 | 11.841 | 2.843 | 28.394 | 4.670 |
| add | baseline | workerWallIncludingReadyRepeatMs | 50 | 5.678 | 4.516 | 11.841 | 2.843 | 28.394 | 4.670 |
| add | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| add | zama | transactionPreparationMs | 49 | 0.198 | 0.188 | 0.218 | 0.171 | 0.538 | 0.051 |
| add | zama | preparationMs | 49 | 0.198 | 0.188 | 0.218 | 0.171 | 0.538 | 0.051 |
| add | zama | barrierWaitMs | 49 | 0.495 | 0.492 | 0.600 | 0.340 | 0.640 | 0.078 |
| add | zama | broadcastAckMs | 49 | 0.130 | 0.126 | 0.154 | 0.110 | 0.171 | 0.014 |
| add | zama | broadcastToReceiptMs | 49 | 4.536 | 3.789 | 5.875 | 1.929 | 27.704 | 3.841 |
| add | zama | confirmationMs | 49 | 4.537 | 3.789 | 5.875 | 1.929 | 27.704 | 3.841 |
| add | zama | postReceiptToValidatedPlaintextMs | 49 | 5.004 | 4.676 | 6.841 | 3.621 | 13.167 | 1.368 |
| add | zama | transactionToValidatedPlaintextMs | 49 | 9.540 | 8.600 | 15.007 | 6.160 | 32.389 | 4.062 |
| add | zama | clientWorkMs | 49 | 9.738 | 8.782 | 15.194 | 6.379 | 32.572 | 4.063 |
| add | zama | alreadyReadyDecryptMs | 49 | 2.346 | 2.335 | 2.406 | 2.291 | 2.517 | 0.041 |
| add | zama | workerStartToPlaintextMs | 49 | 10.233 | 9.326 | 15.581 | 6.852 | 32.958 | 4.032 |
| add | zama | workerWallIncludingReadyRepeatMs | 49 | 12.579 | 11.695 | 17.994 | 9.188 | 35.297 | 4.036 |
| add | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| add | fhenix | transactionPreparationMs | 50 | 0.278 | 0.264 | 0.317 | 0.239 | 0.583 | 0.061 |
| add | fhenix | preparationMs | 50 | 0.278 | 0.264 | 0.317 | 0.239 | 0.583 | 0.061 |
| add | fhenix | barrierWaitMs | 50 | 0.413 | 0.421 | 0.535 | 0.268 | 0.580 | 0.079 |
| add | fhenix | broadcastAckMs | 50 | 0.126 | 0.123 | 0.149 | 0.112 | 0.152 | 0.011 |
| add | fhenix | broadcastToReceiptMs | 50 | 4.915 | 3.705 | 10.855 | 1.951 | 27.714 | 4.664 |
| add | fhenix | confirmationMs | 50 | 4.916 | 3.706 | 10.856 | 1.951 | 27.714 | 4.664 |
| add | fhenix | postReceiptToValidatedPlaintextMs | 50 | 0.387 | 0.312 | 0.787 | 0.198 | 1.298 | 0.222 |
| add | fhenix | transactionToValidatedPlaintextMs | 50 | 5.303 | 4.305 | 11.313 | 2.270 | 28.057 | 4.668 |
| add | fhenix | clientWorkMs | 50 | 5.581 | 4.548 | 11.692 | 2.853 | 28.312 | 4.669 |
| add | fhenix | alreadyReadyDecryptMs | 50 | 0.153 | 0.145 | 0.181 | 0.134 | 0.291 | 0.027 |
| add | fhenix | workerStartToPlaintextMs | 50 | 5.994 | 4.888 | 12.114 | 3.138 | 28.626 | 4.644 |
| add | fhenix | workerWallIncludingReadyRepeatMs | 50 | 6.147 | 5.036 | 12.256 | 3.292 | 28.776 | 4.645 |
| mul_scalar | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| mul_scalar | baseline | transactionPreparationMs | 50 | 0.256 | 0.254 | 0.299 | 0.130 | 0.327 | 0.026 |
| mul_scalar | baseline | preparationMs | 50 | 0.256 | 0.254 | 0.299 | 0.130 | 0.327 | 0.026 |
| mul_scalar | baseline | barrierWaitMs | 50 | 0.426 | 0.436 | 0.535 | 0.276 | 0.551 | 0.078 |
| mul_scalar | baseline | broadcastAckMs | 50 | 0.130 | 0.124 | 0.158 | 0.109 | 0.267 | 0.024 |
| mul_scalar | baseline | broadcastToReceiptMs | 50 | 6.170 | 3.710 | 16.877 | 1.887 | 28.766 | 5.579 |
| mul_scalar | baseline | confirmationMs | 50 | 6.170 | 3.711 | 16.878 | 1.887 | 28.766 | 5.579 |
| mul_scalar | baseline | postReceiptToValidatedPlaintextMs | 50 | 0.083 | 0.062 | 0.136 | 0.047 | 0.140 | 0.034 |
| mul_scalar | baseline | transactionToValidatedPlaintextMs | 50 | 6.253 | 3.768 | 17.012 | 1.940 | 28.899 | 5.603 |
| mul_scalar | baseline | clientWorkMs | 50 | 6.509 | 4.021 | 17.274 | 2.179 | 29.163 | 5.601 |
| mul_scalar | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| mul_scalar | baseline | workerStartToPlaintextMs | 50 | 6.935 | 4.505 | 17.595 | 2.550 | 29.442 | 5.581 |
| mul_scalar | baseline | workerWallIncludingReadyRepeatMs | 50 | 6.935 | 4.505 | 17.595 | 2.550 | 29.442 | 5.581 |
| mul_scalar | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| mul_scalar | zama | transactionPreparationMs | 50 | 0.193 | 0.189 | 0.227 | 0.115 | 0.399 | 0.035 |
| mul_scalar | zama | preparationMs | 50 | 0.193 | 0.189 | 0.227 | 0.115 | 0.399 | 0.035 |
| mul_scalar | zama | barrierWaitMs | 50 | 0.489 | 0.494 | 0.601 | 0.341 | 0.623 | 0.076 |
| mul_scalar | zama | broadcastAckMs | 50 | 0.132 | 0.122 | 0.154 | 0.111 | 0.413 | 0.042 |
| mul_scalar | zama | broadcastToReceiptMs | 50 | 6.175 | 3.712 | 16.899 | 1.840 | 28.760 | 5.562 |
| mul_scalar | zama | confirmationMs | 50 | 6.175 | 3.713 | 16.900 | 1.840 | 28.761 | 5.562 |
| mul_scalar | zama | postReceiptToValidatedPlaintextMs | 50 | 4.921 | 4.717 | 6.751 | 3.667 | 6.975 | 0.801 |
| mul_scalar | zama | transactionToValidatedPlaintextMs | 50 | 11.096 | 8.846 | 21.971 | 5.507 | 33.631 | 5.756 |
| mul_scalar | zama | clientWorkMs | 50 | 11.289 | 9.024 | 22.176 | 5.679 | 33.812 | 5.761 |
| mul_scalar | zama | alreadyReadyDecryptMs | 50 | 2.363 | 2.345 | 2.480 | 2.294 | 2.702 | 0.069 |
| mul_scalar | zama | workerStartToPlaintextMs | 50 | 11.778 | 9.460 | 22.604 | 6.117 | 34.174 | 5.729 |
| mul_scalar | zama | workerWallIncludingReadyRepeatMs | 50 | 14.141 | 11.793 | 24.967 | 8.421 | 36.550 | 5.731 |
| mul_scalar | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| mul_scalar | fhenix | transactionPreparationMs | 50 | 0.261 | 0.260 | 0.296 | 0.122 | 0.315 | 0.027 |
| mul_scalar | fhenix | preparationMs | 50 | 0.261 | 0.260 | 0.296 | 0.122 | 0.315 | 0.027 |
| mul_scalar | fhenix | barrierWaitMs | 50 | 0.421 | 0.437 | 0.526 | 0.274 | 0.554 | 0.077 |
| mul_scalar | fhenix | broadcastAckMs | 50 | 0.134 | 0.125 | 0.165 | 0.114 | 0.307 | 0.029 |
| mul_scalar | fhenix | broadcastToReceiptMs | 50 | 6.165 | 3.979 | 16.777 | 1.860 | 28.746 | 5.555 |
| mul_scalar | fhenix | confirmationMs | 50 | 6.166 | 3.979 | 16.778 | 1.860 | 28.746 | 5.555 |
| mul_scalar | fhenix | postReceiptToValidatedPlaintextMs | 50 | 0.620 | 0.586 | 1.027 | 0.190 | 2.196 | 0.329 |
| mul_scalar | fhenix | transactionToValidatedPlaintextMs | 50 | 6.785 | 4.406 | 17.568 | 2.110 | 29.263 | 5.664 |
| mul_scalar | fhenix | clientWorkMs | 50 | 7.046 | 4.697 | 17.833 | 2.370 | 29.514 | 5.661 |
| mul_scalar | fhenix | alreadyReadyDecryptMs | 50 | 0.148 | 0.143 | 0.189 | 0.133 | 0.224 | 0.017 |
| mul_scalar | fhenix | workerStartToPlaintextMs | 50 | 7.468 | 5.106 | 18.226 | 2.721 | 29.807 | 5.643 |
| mul_scalar | fhenix | workerWallIncludingReadyRepeatMs | 50 | 7.616 | 5.250 | 18.361 | 2.865 | 29.945 | 5.639 |
| mean | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| mean | baseline | transactionPreparationMs | 50 | 0.261 | 0.257 | 0.295 | 0.230 | 0.310 | 0.018 |
| mean | baseline | preparationMs | 50 | 0.261 | 0.257 | 0.295 | 0.230 | 0.310 | 0.018 |
| mean | baseline | barrierWaitMs | 50 | 0.423 | 0.424 | 0.547 | 0.268 | 0.561 | 0.083 |
| mean | baseline | broadcastAckMs | 50 | 0.134 | 0.125 | 0.161 | 0.113 | 0.427 | 0.044 |
| mean | baseline | broadcastToReceiptMs | 50 | 4.853 | 3.653 | 15.056 | 1.357 | 16.765 | 3.884 |
| mean | baseline | confirmationMs | 50 | 4.853 | 3.654 | 15.056 | 1.357 | 16.765 | 3.884 |
| mean | baseline | postReceiptToValidatedPlaintextMs | 50 | 0.071 | 0.058 | 0.136 | 0.047 | 0.151 | 0.029 |
| mean | baseline | transactionToValidatedPlaintextMs | 50 | 4.924 | 3.706 | 15.182 | 1.410 | 16.917 | 3.908 |
| mean | baseline | clientWorkMs | 50 | 5.185 | 3.962 | 15.440 | 1.688 | 17.218 | 3.908 |
| mean | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| mean | baseline | workerStartToPlaintextMs | 50 | 5.609 | 4.418 | 15.779 | 2.043 | 17.506 | 3.889 |
| mean | baseline | workerWallIncludingReadyRepeatMs | 50 | 5.609 | 4.418 | 15.779 | 2.043 | 17.506 | 3.889 |
| mean | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| mean | zama | transactionPreparationMs | 50 | 0.192 | 0.188 | 0.223 | 0.167 | 0.227 | 0.016 |
| mean | zama | preparationMs | 50 | 0.192 | 0.188 | 0.223 | 0.167 | 0.227 | 0.016 |
| mean | zama | barrierWaitMs | 50 | 0.492 | 0.498 | 0.597 | 0.328 | 0.608 | 0.073 |
| mean | zama | broadcastAckMs | 50 | 0.132 | 0.128 | 0.157 | 0.113 | 0.176 | 0.015 |
| mean | zama | broadcastToReceiptMs | 50 | 4.850 | 3.642 | 15.096 | 1.365 | 16.759 | 3.885 |
| mean | zama | confirmationMs | 50 | 4.850 | 3.642 | 15.096 | 1.365 | 16.759 | 3.885 |
| mean | zama | postReceiptToValidatedPlaintextMs | 50 | 4.776 | 4.684 | 6.221 | 2.902 | 7.917 | 0.720 |
| mean | zama | transactionToValidatedPlaintextMs | 50 | 9.626 | 8.437 | 19.436 | 7.004 | 21.037 | 3.753 |
| mean | zama | clientWorkMs | 50 | 9.818 | 8.615 | 19.627 | 7.206 | 21.219 | 3.749 |
| mean | zama | alreadyReadyDecryptMs | 50 | 2.354 | 2.345 | 2.452 | 2.302 | 2.594 | 0.053 |
| mean | zama | workerStartToPlaintextMs | 50 | 10.310 | 9.084 | 20.056 | 7.635 | 21.746 | 3.731 |
| mean | zama | workerWallIncludingReadyRepeatMs | 50 | 12.664 | 11.422 | 22.390 | 9.985 | 24.048 | 3.725 |
| mean | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| mean | fhenix | transactionPreparationMs | 50 | 0.265 | 0.257 | 0.305 | 0.234 | 0.340 | 0.022 |
| mean | fhenix | preparationMs | 50 | 0.265 | 0.257 | 0.305 | 0.234 | 0.341 | 0.022 |
| mean | fhenix | barrierWaitMs | 50 | 0.420 | 0.414 | 0.554 | 0.287 | 0.564 | 0.080 |
| mean | fhenix | broadcastAckMs | 50 | 0.139 | 0.127 | 0.158 | 0.114 | 0.361 | 0.044 |
| mean | fhenix | broadcastToReceiptMs | 50 | 4.855 | 3.657 | 14.874 | 1.339 | 16.757 | 3.869 |
| mean | fhenix | confirmationMs | 50 | 4.855 | 3.658 | 14.874 | 1.340 | 16.757 | 3.869 |
| mean | fhenix | postReceiptToValidatedPlaintextMs | 50 | 4.594 | 4.566 | 5.347 | 3.250 | 5.657 | 0.420 |
| mean | fhenix | transactionToValidatedPlaintextMs | 50 | 9.449 | 8.256 | 19.698 | 5.981 | 20.448 | 3.840 |
| mean | fhenix | clientWorkMs | 50 | 9.714 | 8.499 | 19.974 | 6.255 | 20.693 | 3.836 |
| mean | fhenix | alreadyReadyDecryptMs | 50 | 0.155 | 0.145 | 0.239 | 0.129 | 0.334 | 0.035 |
| mean | fhenix | workerStartToPlaintextMs | 50 | 10.134 | 8.999 | 20.319 | 6.614 | 21.158 | 3.821 |
| mean | fhenix | workerWallIncludingReadyRepeatMs | 50 | 10.289 | 9.152 | 20.470 | 6.759 | 21.297 | 3.818 |
| max | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| max | baseline | transactionPreparationMs | 50 | 0.275 | 0.262 | 0.317 | 0.230 | 0.558 | 0.056 |
| max | baseline | preparationMs | 50 | 0.275 | 0.262 | 0.317 | 0.230 | 0.558 | 0.056 |
| max | baseline | barrierWaitMs | 50 | 0.415 | 0.413 | 0.551 | 0.274 | 0.571 | 0.084 |
| max | baseline | broadcastAckMs | 50 | 0.138 | 0.131 | 0.164 | 0.111 | 0.332 | 0.032 |
| max | baseline | broadcastToReceiptMs | 50 | 4.721 | 3.658 | 11.877 | 2.403 | 28.822 | 4.125 |
| max | baseline | confirmationMs | 50 | 4.722 | 3.659 | 11.877 | 2.404 | 28.822 | 4.125 |
| max | baseline | postReceiptToValidatedPlaintextMs | 50 | 0.101 | 0.063 | 0.149 | 0.049 | 1.148 | 0.155 |
| max | baseline | transactionToValidatedPlaintextMs | 50 | 4.822 | 3.727 | 12.018 | 2.458 | 28.969 | 4.141 |
| max | baseline | clientWorkMs | 50 | 5.097 | 4.002 | 12.265 | 2.708 | 29.229 | 4.134 |
| max | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| max | baseline | workerStartToPlaintextMs | 50 | 5.513 | 4.431 | 12.591 | 3.070 | 29.503 | 4.103 |
| max | baseline | workerWallIncludingReadyRepeatMs | 50 | 5.513 | 4.431 | 12.591 | 3.070 | 29.503 | 4.103 |
| max | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| max | zama | transactionPreparationMs | 50 | 0.207 | 0.190 | 0.275 | 0.163 | 0.648 | 0.072 |
| max | zama | preparationMs | 50 | 0.207 | 0.190 | 0.275 | 0.163 | 0.648 | 0.072 |
| max | zama | barrierWaitMs | 50 | 0.483 | 0.484 | 0.612 | 0.299 | 0.632 | 0.085 |
| max | zama | broadcastAckMs | 50 | 0.132 | 0.124 | 0.150 | 0.112 | 0.332 | 0.031 |
| max | zama | broadcastToReceiptMs | 50 | 4.719 | 3.664 | 11.936 | 2.407 | 29.054 | 4.160 |
| max | zama | confirmationMs | 50 | 4.719 | 3.664 | 11.936 | 2.407 | 29.054 | 4.160 |
| max | zama | postReceiptToValidatedPlaintextMs | 50 | 4.956 | 4.691 | 6.925 | 3.088 | 10.942 | 1.242 |
| max | zama | transactionToValidatedPlaintextMs | 50 | 9.675 | 8.408 | 16.749 | 6.834 | 33.752 | 4.547 |
| max | zama | clientWorkMs | 50 | 9.882 | 8.633 | 16.985 | 7.013 | 33.942 | 4.542 |
| max | zama | alreadyReadyDecryptMs | 50 | 2.347 | 2.332 | 2.421 | 2.298 | 2.454 | 0.039 |
| max | zama | workerStartToPlaintextMs | 50 | 10.366 | 9.124 | 17.321 | 7.582 | 34.287 | 4.503 |
| max | zama | workerWallIncludingReadyRepeatMs | 50 | 12.713 | 11.459 | 19.646 | 9.928 | 36.632 | 4.510 |
| max | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| max | fhenix | transactionPreparationMs | 50 | 0.217 | 0.195 | 0.320 | 0.166 | 0.638 | 0.075 |
| max | fhenix | preparationMs | 50 | 0.217 | 0.195 | 0.320 | 0.166 | 0.638 | 0.075 |
| max | fhenix | barrierWaitMs | 50 | 0.474 | 0.486 | 0.599 | 0.282 | 0.645 | 0.087 |
| max | fhenix | broadcastAckMs | 50 | 0.139 | 0.129 | 0.196 | 0.114 | 0.332 | 0.035 |
| max | fhenix | broadcastToReceiptMs | 50 | 4.729 | 3.685 | 11.837 | 2.396 | 29.048 | 4.142 |
| max | fhenix | confirmationMs | 50 | 4.729 | 3.685 | 11.838 | 2.396 | 29.048 | 4.142 |
| max | fhenix | postReceiptToValidatedPlaintextMs | 50 | 0.350 | 0.287 | 0.655 | 0.205 | 1.338 | 0.220 |
| max | fhenix | transactionToValidatedPlaintextMs | 50 | 5.080 | 4.119 | 12.622 | 2.647 | 29.333 | 4.175 |
| max | fhenix | clientWorkMs | 50 | 5.296 | 4.328 | 12.904 | 2.844 | 29.524 | 4.176 |
| max | fhenix | alreadyReadyDecryptMs | 50 | 0.153 | 0.144 | 0.166 | 0.134 | 0.465 | 0.049 |
| max | fhenix | workerStartToPlaintextMs | 50 | 5.770 | 4.840 | 13.195 | 3.233 | 29.868 | 4.138 |
| max | fhenix | workerWallIncludingReadyRepeatMs | 50 | 5.924 | 4.981 | 13.354 | 3.376 | 30.014 | 4.138 |

## Lettura e limiti

- Provisional descriptive snapshot of an interrupted campaign; no inferential tests.
- Main comparison restricts every platform to identical successful triples; excludes whole historical failed triple.
- All-attempt and per-segment tables retain failures/pending and metric-specific denominators.
- Means aggregate original segment and continuation descriptively; separate segment statistics supplied.
- Receipt means client-observed inclusion, not finality or block production time.
- Postreceipt includes pinned getter, authorization, SDK/service/polling and plaintext validation; not pure FHE compute.
- Preparation includes encryption/input approval and transaction estimate/signing; clientWork excludes barrier wait.
- Already-ready statistics are successful repeated decryptions only and exclude primary completion.
- Worker start-to-plaintext includes barrier; completedAt also includes ready repeat when run.
- Stage durations overlap/nest; do not add them to obtain a total.
- Late receipt/plaintext recovery is excluded from latency statistics.

SHA256 della copia grezza: `1d2461641eb45460379ee8e7aeea1ce58c8f5700419b7659ded945e42b59b63d`.
Il JSON include singole osservazioni, differenze appaiate e stadi per piattaforma/operazione/segmento.
