# Latenze: snapshot descrittivo provvisorio

Acquisito: 2026-10-24T11:48:47.386321+02:00 (Europe/Rome, UTC+02:00).
Misure primarie: 140 valide, 1 fallite, 3 pendenti; 750 previste.
Warmup esclusi: 15. Triple interamente valide: 46.

Tutte le durate nelle tabelle sono **secondi**. Le tabelle principali riportano medie; n e statistiche complete sono nel JSON.

Ricevuta = avvio invio → osservazione ricevuta; post-ricevuta = ricevuta osservata → plaintext validato; plaintext = somma delle due. Client totale = preparazione + plaintext, esclusa barriera intenzionale. ACK è già incluso nella latenza di inclusione. Già pronto è una seconda decryption success-only, separata. — significa non misurato.

## Confronto bilanciato: solo triple con successo primario per tutte le piattaforme

| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 10/10 | 0 | 0 | 0.270 | 0.128 | 9.393 | 0.139 | 9.531 | 9.801 | 11.593 | — (0) |
| notarize | zama | 10/10 | 0 | 0 | 11.543 | 0.135 | 9.374 | 4.986 | 14.360 | 25.903 | 0.319 | 2.392 (10) |
| notarize | fhenix | 10/10 | 0 | 0 | 10.426 | 0.159 | 9.329 | 0.270 | 9.599 | 20.025 | 1.436 | 0.166 (10) |
| add | baseline | 9/9 | 0 | 0 | 0.269 | 0.129 | 7.665 | 0.092 | 7.758 | 8.027 | 0.333 | — (0) |
| add | zama | 9/9 | 0 | 0 | 0.195 | 0.129 | 7.621 | 6.061 | 13.683 | 13.878 | 0.407 | 2.371 (9) |
| add | fhenix | 9/9 | 0 | 0 | 0.292 | 0.124 | 7.659 | 0.339 | 7.998 | 8.289 | 0.311 | 0.145 (9) |
| mul_scalar | baseline | 9/9 | 0 | 0 | 0.244 | 0.123 | 8.448 | 0.092 | 8.541 | 8.785 | 0.324 | — (0) |
| mul_scalar | zama | 9/9 | 0 | 0 | 0.184 | 0.128 | 8.473 | 5.437 | 13.910 | 14.094 | 0.385 | 2.417 (9) |
| mul_scalar | fhenix | 9/9 | 0 | 0 | 0.249 | 0.122 | 8.441 | 0.577 | 9.018 | 9.267 | 0.323 | 0.152 (9) |
| mean | baseline | 9/9 | 0 | 0 | 0.277 | 0.133 | 5.730 | 0.077 | 5.806 | 6.083 | 0.312 | — (0) |
| mean | zama | 9/9 | 0 | 0 | 0.191 | 0.133 | 5.729 | 5.319 | 11.047 | 11.238 | 0.397 | 2.385 (9) |
| mean | fhenix | 9/9 | 0 | 0 | 0.267 | 0.131 | 5.676 | 4.560 | 10.236 | 10.504 | 0.321 | 0.151 (9) |
| max | baseline | 9/9 | 0 | 0 | 0.268 | 0.137 | 9.277 | 0.099 | 9.376 | 9.645 | 0.323 | — (0) |
| max | zama | 9/9 | 0 | 0 | 0.204 | 0.123 | 9.374 | 5.480 | 14.854 | 15.058 | 0.387 | 2.366 (9) |
| max | fhenix | 9/9 | 0 | 0 | 0.235 | 0.138 | 9.290 | 0.453 | 9.743 | 9.978 | 0.356 | 0.166 (9) |

## Tutte le osservazioni: medie dei successi, fallimenti e pendenti conservati nei conteggi

| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | 10/10 | 0 | 0 | 0.270 | 0.128 | 9.393 | 0.139 | 9.531 | 9.801 | 11.593 | — (0) |
| notarize | zama | 10/10 | 0 | 0 | 11.543 | 0.135 | 9.374 | 4.986 | 14.360 | 25.903 | 0.319 | 2.392 (10) |
| notarize | fhenix | 10/10 | 0 | 0 | 10.426 | 0.159 | 9.329 | 0.270 | 9.599 | 20.025 | 1.436 | 0.166 (10) |
| add | baseline | 10/10 | 0 | 0 | 0.272 | 0.130 | 9.271 | 0.098 | 9.368 | 9.641 | 0.331 | — (0) |
| add | zama | 9/10 | 1 | 0 | 0.195 | 0.129 | 7.621 | 6.061 | 13.683 | 13.878 | 0.407 | 2.371 (9) |
| add | fhenix | 10/10 | 0 | 0 | 0.295 | 0.126 | 9.260 | 0.340 | 9.600 | 9.895 | 0.309 | 0.148 (10) |
| mul_scalar | baseline | 9/10 | 0 | 1 | 0.244 | 0.123 | 8.448 | 0.092 | 8.541 | 8.785 | 0.324 | — (0) |
| mul_scalar | zama | 9/10 | 0 | 1 | 0.184 | 0.128 | 8.473 | 5.437 | 13.910 | 14.094 | 0.385 | 2.417 (9) |
| mul_scalar | fhenix | 9/10 | 0 | 1 | 0.249 | 0.122 | 8.441 | 0.577 | 9.018 | 9.267 | 0.323 | 0.152 (9) |
| mean | baseline | 9/9 | 0 | 0 | 0.277 | 0.133 | 5.730 | 0.077 | 5.806 | 6.083 | 0.312 | — (0) |
| mean | zama | 9/9 | 0 | 0 | 0.191 | 0.133 | 5.729 | 5.319 | 11.047 | 11.238 | 0.397 | 2.385 (9) |
| mean | fhenix | 9/9 | 0 | 0 | 0.267 | 0.131 | 5.676 | 4.560 | 10.236 | 10.504 | 0.321 | 0.151 (9) |
| max | baseline | 9/9 | 0 | 0 | 0.268 | 0.137 | 9.277 | 0.099 | 9.376 | 9.645 | 0.323 | — (0) |
| max | zama | 9/9 | 0 | 0 | 0.204 | 0.123 | 9.374 | 5.480 | 14.854 | 15.058 | 0.387 | 2.366 (9) |
| max | fhenix | 9/9 | 0 | 0 | 0.235 | 0.138 | 9.290 | 0.453 | 9.743 | 9.978 | 0.356 | 0.166 (9) |

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
| notarize | baseline | 3/3 | 0 | 0 | 0.260 | 0.128 | 3.457 | 0.136 | 3.593 | 3.853 | 11.475 | — (0) |
| notarize | zama | 3/3 | 0 | 0 | 11.414 | 0.120 | 3.359 | 4.616 | 7.975 | 19.389 | 0.321 | 2.343 (3) |
| notarize | fhenix | 3/3 | 0 | 0 | 10.255 | 0.137 | 3.412 | 0.257 | 3.669 | 13.924 | 1.480 | 0.144 (3) |
| add | baseline | 3/3 | 0 | 0 | 0.267 | 0.131 | 3.981 | 0.082 | 4.063 | 4.331 | 0.338 | — (0) |
| add | zama | 3/3 | 0 | 0 | 0.195 | 0.134 | 3.863 | 5.837 | 9.700 | 9.896 | 0.410 | 2.348 (3) |
| add | fhenix | 3/3 | 0 | 0 | 0.252 | 0.125 | 4.011 | 0.411 | 4.422 | 4.674 | 0.353 | 0.144 (3) |
| mul_scalar | baseline | 3/4 | 0 | 1 | 0.216 | 0.124 | 4.575 | 0.083 | 4.658 | 4.874 | 0.377 | — (0) |
| mul_scalar | zama | 3/4 | 0 | 1 | 0.170 | 0.126 | 4.592 | 6.092 | 10.684 | 10.855 | 0.423 | 2.401 (3) |
| mul_scalar | fhenix | 3/4 | 0 | 1 | 0.225 | 0.117 | 4.691 | 0.440 | 5.130 | 5.356 | 0.378 | 0.148 (3) |
| mean | baseline | 3/3 | 0 | 0 | 0.263 | 0.125 | 2.511 | 0.055 | 2.566 | 2.830 | 0.357 | — (0) |
| mean | zama | 3/3 | 0 | 0 | 0.181 | 0.130 | 2.506 | 5.996 | 8.503 | 8.684 | 0.439 | 2.413 (3) |
| mean | fhenix | 3/3 | 0 | 0 | 0.266 | 0.127 | 2.452 | 4.543 | 6.996 | 7.262 | 0.354 | 0.142 (3) |
| max | baseline | 3/3 | 0 | 0 | 0.259 | 0.135 | 3.013 | 0.058 | 3.071 | 3.330 | 0.361 | — (0) |
| max | zama | 3/3 | 0 | 0 | 0.204 | 0.122 | 3.184 | 5.421 | 8.605 | 8.810 | 0.416 | 2.388 (3) |
| max | fhenix | 3/3 | 0 | 0 | 0.239 | 0.133 | 3.213 | 0.254 | 3.467 | 3.707 | 0.381 | 0.153 (3) |

## Distribuzione completa per metrica — tutte le osservazioni valide

| Operazione | Piattaforma | Metrica | n | Media | Mediana | P95 | Min | Max | DS campionaria |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| notarize | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| notarize | baseline | transactionPreparationMs | 10 | 0.270 | 0.264 | 0.303 | 0.243 | 0.310 | 0.021 |
| notarize | baseline | preparationMs | 10 | 0.270 | 0.264 | 0.303 | 0.243 | 0.310 | 0.021 |
| notarize | baseline | barrierWaitMs | 10 | 11.593 | 11.489 | 12.138 | 11.322 | 12.348 | 0.315 |
| notarize | baseline | broadcastAckMs | 10 | 0.128 | 0.123 | 0.152 | 0.115 | 0.167 | 0.015 |
| notarize | baseline | broadcastToReceiptMs | 10 | 9.392 | 5.625 | 23.585 | 1.377 | 28.758 | 8.214 |
| notarize | baseline | confirmationMs | 10 | 9.393 | 5.625 | 23.586 | 1.377 | 28.758 | 8.214 |
| notarize | baseline | postReceiptToValidatedPlaintextMs | 10 | 0.139 | 0.130 | 0.162 | 0.121 | 0.164 | 0.017 |
| notarize | baseline | transactionToValidatedPlaintextMs | 10 | 9.531 | 5.752 | 23.728 | 1.530 | 28.917 | 8.220 |
| notarize | baseline | clientWorkMs | 10 | 9.801 | 6.010 | 24.017 | 1.798 | 29.190 | 8.231 |
| notarize | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| notarize | baseline | workerStartToPlaintextMs | 10 | 21.394 | 17.407 | 35.878 | 13.464 | 40.653 | 8.344 |
| notarize | baseline | workerWallIncludingReadyRepeatMs | 10 | 21.394 | 17.407 | 35.879 | 13.464 | 40.654 | 8.345 |
| notarize | zama | inputPreparationMs | 10 | 11.305 | 11.234 | 11.758 | 11.086 | 11.881 | 0.259 |
| notarize | zama | transactionPreparationMs | 10 | 0.238 | 0.244 | 0.299 | 0.182 | 0.309 | 0.047 |
| notarize | zama | preparationMs | 10 | 11.543 | 11.464 | 12.028 | 11.268 | 12.138 | 0.276 |
| notarize | zama | barrierWaitMs | 10 | 0.319 | 0.298 | 0.434 | 0.270 | 0.519 | 0.073 |
| notarize | zama | broadcastAckMs | 10 | 0.135 | 0.126 | 0.168 | 0.115 | 0.178 | 0.020 |
| notarize | zama | broadcastToReceiptMs | 10 | 9.373 | 5.570 | 23.608 | 1.305 | 28.790 | 8.260 |
| notarize | zama | confirmationMs | 10 | 9.374 | 5.570 | 23.609 | 1.305 | 28.790 | 8.260 |
| notarize | zama | postReceiptToValidatedPlaintextMs | 10 | 4.986 | 4.794 | 6.123 | 4.498 | 7.069 | 0.744 |
| notarize | zama | transactionToValidatedPlaintextMs | 10 | 14.360 | 10.450 | 28.394 | 5.804 | 33.492 | 8.327 |
| notarize | zama | clientWorkMs | 10 | 25.903 | 21.853 | 40.153 | 17.406 | 44.941 | 8.434 |
| notarize | zama | alreadyReadyDecryptMs | 10 | 2.392 | 2.354 | 2.566 | 2.300 | 2.635 | 0.099 |
| notarize | zama | workerStartToPlaintextMs | 10 | 26.223 | 22.127 | 40.545 | 17.737 | 45.229 | 8.453 |
| notarize | zama | workerWallIncludingReadyRepeatMs | 10 | 28.615 | 24.503 | 42.886 | 20.038 | 47.556 | 8.434 |
| notarize | fhenix | inputPreparationMs | 10 | 10.157 | 10.096 | 10.597 | 9.821 | 10.847 | 0.290 |
| notarize | fhenix | transactionPreparationMs | 10 | 0.270 | 0.269 | 0.284 | 0.252 | 0.287 | 0.010 |
| notarize | fhenix | preparationMs | 10 | 10.426 | 10.358 | 10.861 | 10.108 | 11.114 | 0.286 |
| notarize | fhenix | barrierWaitMs | 10 | 1.436 | 1.406 | 1.624 | 1.267 | 1.628 | 0.132 |
| notarize | fhenix | broadcastAckMs | 10 | 0.159 | 0.127 | 0.302 | 0.121 | 0.424 | 0.093 |
| notarize | fhenix | broadcastToReceiptMs | 10 | 9.328 | 5.588 | 23.615 | 1.357 | 28.790 | 8.236 |
| notarize | fhenix | confirmationMs | 10 | 9.329 | 5.589 | 23.615 | 1.358 | 28.791 | 8.236 |
| notarize | fhenix | postReceiptToValidatedPlaintextMs | 10 | 0.270 | 0.267 | 0.314 | 0.199 | 0.318 | 0.033 |
| notarize | fhenix | transactionToValidatedPlaintextMs | 10 | 9.599 | 5.858 | 23.873 | 1.557 | 29.048 | 8.238 |
| notarize | fhenix | clientWorkMs | 10 | 20.025 | 16.229 | 34.599 | 11.862 | 39.459 | 8.379 |
| notarize | fhenix | alreadyReadyDecryptMs | 10 | 0.166 | 0.147 | 0.246 | 0.137 | 0.282 | 0.045 |
| notarize | fhenix | workerStartToPlaintextMs | 10 | 21.462 | 17.522 | 36.024 | 13.490 | 40.785 | 8.362 |
| notarize | fhenix | workerWallIncludingReadyRepeatMs | 10 | 21.627 | 17.741 | 36.166 | 13.627 | 40.926 | 8.354 |
| add | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| add | baseline | transactionPreparationMs | 10 | 0.272 | 0.270 | 0.307 | 0.247 | 0.315 | 0.021 |
| add | baseline | preparationMs | 10 | 0.272 | 0.270 | 0.308 | 0.247 | 0.315 | 0.021 |
| add | baseline | barrierWaitMs | 10 | 0.331 | 0.314 | 0.457 | 0.262 | 0.553 | 0.083 |
| add | baseline | broadcastAckMs | 10 | 0.130 | 0.125 | 0.151 | 0.117 | 0.155 | 0.013 |
| add | baseline | broadcastToReceiptMs | 10 | 9.270 | 4.438 | 25.896 | 1.917 | 27.677 | 9.428 |
| add | baseline | confirmationMs | 10 | 9.271 | 4.438 | 25.896 | 1.917 | 27.678 | 9.428 |
| add | baseline | postReceiptToValidatedPlaintextMs | 10 | 0.098 | 0.095 | 0.147 | 0.054 | 0.147 | 0.040 |
| add | baseline | transactionToValidatedPlaintextMs | 10 | 9.368 | 4.533 | 26.043 | 1.975 | 27.825 | 9.459 |
| add | baseline | clientWorkMs | 10 | 9.641 | 4.802 | 26.318 | 2.290 | 28.081 | 9.459 |
| add | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| add | baseline | workerStartToPlaintextMs | 10 | 9.972 | 5.099 | 26.632 | 2.843 | 28.394 | 9.437 |
| add | baseline | workerWallIncludingReadyRepeatMs | 10 | 9.972 | 5.099 | 26.632 | 2.843 | 28.394 | 9.437 |
| add | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| add | zama | transactionPreparationMs | 9 | 0.195 | 0.191 | 0.219 | 0.178 | 0.228 | 0.015 |
| add | zama | preparationMs | 9 | 0.195 | 0.191 | 0.219 | 0.178 | 0.228 | 0.015 |
| add | zama | barrierWaitMs | 9 | 0.407 | 0.382 | 0.554 | 0.340 | 0.640 | 0.092 |
| add | zama | broadcastAckMs | 9 | 0.129 | 0.125 | 0.150 | 0.113 | 0.152 | 0.014 |
| add | zama | broadcastToReceiptMs | 9 | 7.621 | 4.171 | 22.583 | 1.929 | 27.704 | 8.432 |
| add | zama | confirmationMs | 9 | 7.621 | 4.171 | 22.583 | 1.929 | 27.704 | 8.432 |
| add | zama | postReceiptToValidatedPlaintextMs | 9 | 6.061 | 4.803 | 10.657 | 4.686 | 13.167 | 2.765 |
| add | zama | transactionToValidatedPlaintextMs | 9 | 13.683 | 10.289 | 27.316 | 6.867 | 32.389 | 8.263 |
| add | zama | clientWorkMs | 9 | 13.878 | 10.496 | 27.506 | 7.095 | 32.572 | 8.258 |
| add | zama | alreadyReadyDecryptMs | 9 | 2.371 | 2.339 | 2.481 | 2.314 | 2.517 | 0.067 |
| add | zama | workerStartToPlaintextMs | 9 | 14.285 | 10.879 | 27.873 | 7.735 | 32.958 | 8.227 |
| add | zama | workerWallIncludingReadyRepeatMs | 9 | 16.657 | 13.213 | 30.205 | 10.252 | 35.297 | 8.211 |
| add | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| add | fhenix | transactionPreparationMs | 10 | 0.295 | 0.256 | 0.465 | 0.239 | 0.583 | 0.104 |
| add | fhenix | preparationMs | 10 | 0.295 | 0.256 | 0.465 | 0.239 | 0.583 | 0.104 |
| add | fhenix | barrierWaitMs | 10 | 0.309 | 0.301 | 0.369 | 0.268 | 0.369 | 0.036 |
| add | fhenix | broadcastAckMs | 10 | 0.126 | 0.121 | 0.148 | 0.114 | 0.148 | 0.013 |
| add | fhenix | broadcastToReceiptMs | 10 | 9.260 | 4.408 | 25.894 | 1.951 | 27.714 | 9.418 |
| add | fhenix | confirmationMs | 10 | 9.260 | 4.409 | 25.894 | 1.951 | 27.714 | 9.418 |
| add | fhenix | postReceiptToValidatedPlaintextMs | 10 | 0.340 | 0.297 | 0.654 | 0.198 | 0.811 | 0.186 |
| add | fhenix | transactionToValidatedPlaintextMs | 10 | 9.600 | 4.648 | 26.241 | 2.270 | 28.057 | 9.446 |
| add | fhenix | clientWorkMs | 10 | 9.895 | 4.896 | 26.527 | 2.853 | 28.312 | 9.429 |
| add | fhenix | alreadyReadyDecryptMs | 10 | 0.148 | 0.146 | 0.164 | 0.137 | 0.172 | 0.011 |
| add | fhenix | workerStartToPlaintextMs | 10 | 10.204 | 5.214 | 26.830 | 3.138 | 28.626 | 9.424 |
| add | fhenix | workerWallIncludingReadyRepeatMs | 10 | 10.351 | 5.358 | 26.990 | 3.292 | 28.776 | 9.429 |
| mul_scalar | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| mul_scalar | baseline | transactionPreparationMs | 9 | 0.244 | 0.257 | 0.273 | 0.130 | 0.276 | 0.044 |
| mul_scalar | baseline | preparationMs | 9 | 0.244 | 0.257 | 0.273 | 0.130 | 0.276 | 0.044 |
| mul_scalar | baseline | barrierWaitMs | 9 | 0.324 | 0.308 | 0.402 | 0.276 | 0.437 | 0.049 |
| mul_scalar | baseline | broadcastAckMs | 9 | 0.123 | 0.121 | 0.135 | 0.113 | 0.136 | 0.008 |
| mul_scalar | baseline | broadcastToReceiptMs | 9 | 8.448 | 4.093 | 24.054 | 2.439 | 28.766 | 8.864 |
| mul_scalar | baseline | confirmationMs | 9 | 8.448 | 4.093 | 24.055 | 2.439 | 28.766 | 8.864 |
| mul_scalar | baseline | postReceiptToValidatedPlaintextMs | 9 | 0.092 | 0.068 | 0.136 | 0.057 | 0.138 | 0.036 |
| mul_scalar | baseline | transactionToValidatedPlaintextMs | 9 | 8.541 | 4.153 | 24.186 | 2.499 | 28.899 | 8.889 |
| mul_scalar | baseline | clientWorkMs | 9 | 8.785 | 4.391 | 24.443 | 2.756 | 29.163 | 8.890 |
| mul_scalar | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| mul_scalar | baseline | workerStartToPlaintextMs | 9 | 9.109 | 4.708 | 24.732 | 3.101 | 29.442 | 8.877 |
| mul_scalar | baseline | workerWallIncludingReadyRepeatMs | 9 | 9.109 | 4.708 | 24.732 | 3.101 | 29.442 | 8.877 |
| mul_scalar | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| mul_scalar | zama | transactionPreparationMs | 9 | 0.184 | 0.182 | 0.221 | 0.115 | 0.233 | 0.032 |
| mul_scalar | zama | preparationMs | 9 | 0.184 | 0.182 | 0.221 | 0.115 | 0.233 | 0.032 |
| mul_scalar | zama | barrierWaitMs | 9 | 0.385 | 0.383 | 0.436 | 0.341 | 0.452 | 0.035 |
| mul_scalar | zama | broadcastAckMs | 9 | 0.128 | 0.128 | 0.142 | 0.117 | 0.144 | 0.009 |
| mul_scalar | zama | broadcastToReceiptMs | 9 | 8.473 | 4.173 | 24.060 | 2.506 | 28.760 | 8.875 |
| mul_scalar | zama | confirmationMs | 9 | 8.473 | 4.173 | 24.060 | 2.506 | 28.761 | 8.875 |
| mul_scalar | zama | postReceiptToValidatedPlaintextMs | 9 | 5.437 | 4.901 | 6.773 | 4.596 | 6.806 | 0.974 |
| mul_scalar | zama | transactionToValidatedPlaintextMs | 9 | 13.910 | 9.882 | 28.955 | 7.102 | 33.631 | 8.628 |
| mul_scalar | zama | clientWorkMs | 9 | 14.094 | 10.081 | 29.134 | 7.305 | 33.812 | 8.620 |
| mul_scalar | zama | alreadyReadyDecryptMs | 9 | 2.417 | 2.376 | 2.594 | 2.339 | 2.702 | 0.112 |
| mul_scalar | zama | workerStartToPlaintextMs | 9 | 14.479 | 10.491 | 29.501 | 7.646 | 34.174 | 8.616 |
| mul_scalar | zama | workerWallIncludingReadyRepeatMs | 9 | 16.897 | 12.924 | 31.873 | 9.992 | 36.550 | 8.589 |
| mul_scalar | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| mul_scalar | fhenix | transactionPreparationMs | 9 | 0.249 | 0.251 | 0.295 | 0.122 | 0.302 | 0.052 |
| mul_scalar | fhenix | preparationMs | 9 | 0.249 | 0.251 | 0.296 | 0.122 | 0.302 | 0.052 |
| mul_scalar | fhenix | barrierWaitMs | 9 | 0.323 | 0.306 | 0.407 | 0.274 | 0.445 | 0.052 |
| mul_scalar | fhenix | broadcastAckMs | 9 | 0.122 | 0.123 | 0.131 | 0.114 | 0.135 | 0.007 |
| mul_scalar | fhenix | broadcastToReceiptMs | 9 | 8.441 | 4.166 | 23.991 | 2.423 | 28.746 | 8.845 |
| mul_scalar | fhenix | confirmationMs | 9 | 8.441 | 4.167 | 23.991 | 2.423 | 28.746 | 8.846 |
| mul_scalar | fhenix | postReceiptToValidatedPlaintextMs | 9 | 0.577 | 0.517 | 0.867 | 0.386 | 0.872 | 0.204 |
| mul_scalar | fhenix | transactionToValidatedPlaintextMs | 9 | 9.018 | 4.553 | 24.481 | 2.831 | 29.263 | 8.807 |
| mul_scalar | fhenix | clientWorkMs | 9 | 9.267 | 4.829 | 24.730 | 3.099 | 29.514 | 8.800 |
| mul_scalar | fhenix | alreadyReadyDecryptMs | 9 | 0.152 | 0.143 | 0.182 | 0.138 | 0.195 | 0.018 |
| mul_scalar | fhenix | workerStartToPlaintextMs | 9 | 9.590 | 5.108 | 25.028 | 3.449 | 29.807 | 8.792 |
| mul_scalar | fhenix | workerWallIncludingReadyRepeatMs | 9 | 9.741 | 5.250 | 25.175 | 3.599 | 29.945 | 8.789 |
| mean | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| mean | baseline | transactionPreparationMs | 9 | 0.277 | 0.274 | 0.306 | 0.240 | 0.310 | 0.021 |
| mean | baseline | preparationMs | 9 | 0.277 | 0.274 | 0.306 | 0.240 | 0.310 | 0.021 |
| mean | baseline | barrierWaitMs | 9 | 0.312 | 0.305 | 0.360 | 0.268 | 0.363 | 0.036 |
| mean | baseline | broadcastAckMs | 9 | 0.133 | 0.134 | 0.150 | 0.119 | 0.154 | 0.012 |
| mean | baseline | broadcastToReceiptMs | 9 | 5.729 | 3.067 | 16.308 | 1.357 | 16.765 | 6.005 |
| mean | baseline | confirmationMs | 9 | 5.730 | 3.068 | 16.308 | 1.357 | 16.765 | 6.005 |
| mean | baseline | postReceiptToValidatedPlaintextMs | 9 | 0.077 | 0.061 | 0.141 | 0.052 | 0.151 | 0.036 |
| mean | baseline | transactionToValidatedPlaintextMs | 9 | 5.806 | 3.122 | 16.449 | 1.410 | 16.917 | 6.040 |
| mean | baseline | clientWorkMs | 9 | 6.083 | 3.409 | 16.736 | 1.688 | 17.218 | 6.042 |
| mean | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| mean | baseline | workerStartToPlaintextMs | 9 | 6.395 | 3.689 | 17.021 | 2.043 | 17.506 | 6.025 |
| mean | baseline | workerWallIncludingReadyRepeatMs | 9 | 6.395 | 3.689 | 17.021 | 2.043 | 17.506 | 6.025 |
| mean | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| mean | zama | transactionPreparationMs | 9 | 0.191 | 0.188 | 0.216 | 0.167 | 0.224 | 0.018 |
| mean | zama | preparationMs | 9 | 0.191 | 0.188 | 0.216 | 0.167 | 0.224 | 0.018 |
| mean | zama | barrierWaitMs | 9 | 0.397 | 0.391 | 0.452 | 0.328 | 0.458 | 0.040 |
| mean | zama | broadcastAckMs | 9 | 0.133 | 0.127 | 0.163 | 0.114 | 0.172 | 0.019 |
| mean | zama | broadcastToReceiptMs | 9 | 5.728 | 2.970 | 16.359 | 1.365 | 16.759 | 6.038 |
| mean | zama | confirmationMs | 9 | 5.729 | 2.970 | 16.359 | 1.365 | 16.759 | 6.038 |
| mean | zama | postReceiptToValidatedPlaintextMs | 9 | 5.319 | 4.800 | 7.411 | 2.902 | 7.917 | 1.484 |
| mean | zama | transactionToValidatedPlaintextMs | 9 | 11.047 | 9.079 | 20.199 | 7.050 | 20.558 | 5.215 |
| mean | zama | clientWorkMs | 9 | 11.238 | 9.259 | 20.381 | 7.230 | 20.725 | 5.213 |
| mean | zama | alreadyReadyDecryptMs | 9 | 2.385 | 2.360 | 2.453 | 2.339 | 2.458 | 0.046 |
| mean | zama | workerStartToPlaintextMs | 9 | 11.636 | 9.703 | 20.763 | 7.637 | 21.104 | 5.203 |
| mean | zama | workerWallIncludingReadyRepeatMs | 9 | 14.020 | 12.124 | 23.106 | 9.996 | 23.444 | 5.183 |
| mean | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| mean | fhenix | transactionPreparationMs | 9 | 0.267 | 0.263 | 0.303 | 0.234 | 0.304 | 0.024 |
| mean | fhenix | preparationMs | 9 | 0.267 | 0.263 | 0.303 | 0.234 | 0.304 | 0.024 |
| mean | fhenix | barrierWaitMs | 9 | 0.321 | 0.312 | 0.361 | 0.287 | 0.362 | 0.028 |
| mean | fhenix | broadcastAckMs | 9 | 0.131 | 0.124 | 0.153 | 0.114 | 0.156 | 0.015 |
| mean | fhenix | broadcastToReceiptMs | 9 | 5.676 | 2.988 | 16.213 | 1.339 | 16.757 | 5.966 |
| mean | fhenix | confirmationMs | 9 | 5.676 | 2.988 | 16.213 | 1.340 | 16.757 | 5.966 |
| mean | fhenix | postReceiptToValidatedPlaintextMs | 9 | 4.560 | 4.641 | 5.250 | 3.250 | 5.378 | 0.623 |
| mean | fhenix | transactionToValidatedPlaintextMs | 9 | 10.236 | 7.794 | 20.265 | 5.981 | 20.436 | 5.739 |
| mean | fhenix | clientWorkMs | 9 | 10.504 | 8.057 | 20.525 | 6.255 | 20.670 | 5.737 |
| mean | fhenix | alreadyReadyDecryptMs | 9 | 0.151 | 0.146 | 0.173 | 0.139 | 0.180 | 0.013 |
| mean | fhenix | workerStartToPlaintextMs | 9 | 10.825 | 8.391 | 20.828 | 6.614 | 20.982 | 5.724 |
| mean | fhenix | workerWallIncludingReadyRepeatMs | 9 | 10.976 | 8.534 | 20.979 | 6.759 | 21.128 | 5.724 |
| max | baseline | inputPreparationMs | 0 | — | — | — | — | — | — |
| max | baseline | transactionPreparationMs | 9 | 0.268 | 0.267 | 0.306 | 0.230 | 0.314 | 0.028 |
| max | baseline | preparationMs | 9 | 0.268 | 0.267 | 0.306 | 0.230 | 0.314 | 0.028 |
| max | baseline | barrierWaitMs | 9 | 0.323 | 0.327 | 0.381 | 0.274 | 0.393 | 0.039 |
| max | baseline | broadcastAckMs | 9 | 0.137 | 0.140 | 0.156 | 0.122 | 0.158 | 0.013 |
| max | baseline | broadcastToReceiptMs | 9 | 9.277 | 4.473 | 22.706 | 2.407 | 28.822 | 8.551 |
| max | baseline | confirmationMs | 9 | 9.277 | 4.473 | 22.706 | 2.407 | 28.822 | 8.551 |
| max | baseline | postReceiptToValidatedPlaintextMs | 9 | 0.099 | 0.094 | 0.153 | 0.058 | 0.157 | 0.040 |
| max | baseline | transactionToValidatedPlaintextMs | 9 | 9.376 | 4.567 | 22.845 | 2.465 | 28.969 | 8.584 |
| max | baseline | clientWorkMs | 9 | 9.645 | 4.855 | 23.114 | 2.708 | 29.229 | 8.579 |
| max | baseline | alreadyReadyDecryptMs | 0 | — | — | — | — | — | — |
| max | baseline | workerStartToPlaintextMs | 9 | 9.968 | 5.131 | 23.395 | 3.070 | 29.503 | 8.555 |
| max | baseline | workerWallIncludingReadyRepeatMs | 9 | 9.968 | 5.131 | 23.395 | 3.070 | 29.503 | 8.555 |
| max | zama | inputPreparationMs | 0 | — | — | — | — | — | — |
| max | zama | transactionPreparationMs | 9 | 0.204 | 0.192 | 0.260 | 0.170 | 0.291 | 0.035 |
| max | zama | preparationMs | 9 | 0.204 | 0.192 | 0.260 | 0.170 | 0.291 | 0.035 |
| max | zama | barrierWaitMs | 9 | 0.387 | 0.394 | 0.431 | 0.299 | 0.438 | 0.043 |
| max | zama | broadcastAckMs | 9 | 0.123 | 0.122 | 0.135 | 0.116 | 0.141 | 0.007 |
| max | zama | broadcastToReceiptMs | 9 | 9.374 | 4.673 | 22.846 | 2.407 | 29.054 | 8.586 |
| max | zama | confirmationMs | 9 | 9.374 | 4.674 | 22.846 | 2.407 | 29.054 | 8.586 |
| max | zama | postReceiptToValidatedPlaintextMs | 9 | 5.480 | 4.802 | 9.245 | 3.088 | 10.942 | 2.242 |
| max | zama | transactionToValidatedPlaintextMs | 9 | 14.854 | 9.669 | 30.042 | 6.977 | 33.752 | 9.153 |
| max | zama | clientWorkMs | 9 | 15.058 | 9.877 | 30.227 | 7.168 | 33.942 | 9.149 |
| max | zama | alreadyReadyDecryptMs | 9 | 2.366 | 2.346 | 2.421 | 2.318 | 2.422 | 0.039 |
| max | zama | workerStartToPlaintextMs | 9 | 15.445 | 10.292 | 30.591 | 7.582 | 34.287 | 9.126 |
| max | zama | workerWallIncludingReadyRepeatMs | 9 | 17.811 | 12.688 | 32.966 | 9.928 | 36.632 | 9.123 |
| max | fhenix | inputPreparationMs | 0 | — | — | — | — | — | — |
| max | fhenix | transactionPreparationMs | 9 | 0.235 | 0.243 | 0.284 | 0.187 | 0.290 | 0.038 |
| max | fhenix | preparationMs | 9 | 0.235 | 0.243 | 0.284 | 0.187 | 0.290 | 0.038 |
| max | fhenix | barrierWaitMs | 9 | 0.356 | 0.350 | 0.428 | 0.282 | 0.445 | 0.052 |
| max | fhenix | broadcastAckMs | 9 | 0.138 | 0.125 | 0.191 | 0.114 | 0.210 | 0.031 |
| max | fhenix | broadcastToReceiptMs | 9 | 9.289 | 4.671 | 22.795 | 2.481 | 29.048 | 8.597 |
| max | fhenix | confirmationMs | 9 | 9.290 | 4.671 | 22.796 | 2.481 | 29.048 | 8.597 |
| max | fhenix | postReceiptToValidatedPlaintextMs | 9 | 0.453 | 0.328 | 1.068 | 0.223 | 1.338 | 0.356 |
| max | fhenix | transactionToValidatedPlaintextMs | 9 | 9.743 | 4.948 | 23.098 | 2.709 | 29.333 | 8.603 |
| max | fhenix | clientWorkMs | 9 | 9.978 | 5.168 | 23.315 | 2.965 | 29.524 | 8.600 |
| max | fhenix | alreadyReadyDecryptMs | 9 | 0.166 | 0.147 | 0.236 | 0.144 | 0.278 | 0.043 |
| max | fhenix | workerStartToPlaintextMs | 9 | 10.334 | 5.570 | 23.648 | 3.314 | 29.868 | 8.575 |
| max | fhenix | workerWallIncludingReadyRepeatMs | 9 | 10.500 | 5.727 | 23.793 | 3.470 | 30.014 | 8.564 |

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

SHA256 della copia grezza: `651d5898a452bf999e5e61c6c6dd0b36a9f4ab09042800b2ad74c04998761dad`.
Il JSON include singole osservazioni, differenze appaiate e stadi per piattaforma/operazione/segmento.
