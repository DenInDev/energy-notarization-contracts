# Read-only warmup recovery and remaining authorized pilots

Original 40 confirmed concurrency receipts and source SHA256 927fc5d73594635ae5635841f31d9c268eb92793602d5d70cb4c3ab4938f6127 are preserved. Exact settled nonces: operator230, writer1 32, writer2 0. No original transaction is replayed.
Eight confirmed baseline reverse warmup requests were interrupted only during log retrieval because the log backend head lagged the receipt by one block. A supplementary late correctness audit verifies canonical event order, all immutable snapshots and final state; original statuses and timing gaps remain unchanged. Late reads are excluded from primary and already-ready timing statistics.
Future exact-range log reads retry only the explicit backend-head lag error, within their original deadline. No changed range, hidden receipt or mutation retry.
Remaining concurrency16:616writer+79setup transactions (includes one previously unstarted Fhenix deployment). Circuit16 is finished and skipped by raw SHA256. Then authorized reduced circuit128 and concurrency128 pilots:957transactions upper bound. No full50-run matrix is launched.
Validation:16localstudytests; typecheck; generated-contract consistency check passed.
