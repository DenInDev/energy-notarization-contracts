# Fresh 16-bit concurrency and circuit experiments — 11 November 2026

The user explicitly requested both categories **from scratch**, superseding checkpoint continuation. All measurements below use fresh deployments, warmups, case IDs/state and raw reports. Previous results remain unchanged and are not pooled or reused.

## Matrices

- Concurrency: 20 repetitions per condition and platform; 1/2/4 writers, eight requests per window, independent/shared_sum/shared_ordered. 540 measured windows, 4,320 measured requests, 36 warmup/control windows. Serial forward/reverse controls are included for the one-writer cases. Budget: 5,190 transactions including deployment, authorization and setup.
- Circuits: 50 repetitions per condition and platform; linear and tree sums over 2/4/8/16/32 operands; affine chains of 1/2/4/8/16/32 steps. 2,400 measured slots and 48 warmup slots. Budget: 4,902 transactions including deployment, authorization and fresh input loading. Exact unsent Zama HCU depth/transaction-limit rejections remain capacity observations, not zero-cost or zero-latency successful computations.
- Baseline, Zama and Fhenix throughout; unsigned 16-bit wrapping in contracts and reference oracle. Shared coordinator rotates sequential platform windows. Writers within a concurrency window submit one request each per receipt-synchronized wave.

Total upper budget 10,092 transactions. Order: concurrency first, circuits automatically afterward. Existing saved funded signers are used with settled initial nonces 11,39,0,0,0; circuits use the operator after the concurrency stage releases its account lock. No transfers or mining. The shared parent lease prevents overlapping use of these accounts. The unrelated quarantined root account lock is untouched.

## Corrections and safe retirement of prior run

Window setup gas is estimated at confirmed canonical contract state, then explicitly supplied for transaction signing. This avoids depending on a stale pending backend after writer authorization. The workload, contracts, timed transport and SDK policies were not changed for this correction. TypeScript passed; the previous complete 22-test study/contract/launch suite passed, and four launcher tests now also validate the separate fresh matrices and reject unsafe drift.

Previous continuation PID33868 was identified by command and handle creation time, suspended, and stopped only after a bounded read-only audit reconciled all 50 broadcasts. There were no pending transactions. One prepared-but-unsent hash at the writer's next nonce was verified absent from the network, retained as historical evidence and never replayed. See ../studies-resume-2026-11-11/stop-for-fresh-audit.json and stop-for-fresh-result.json. All previous raw reports remain unchanged.

## Outputs and interpretation

campaign.json records live identity, source/SDK hashes, exact plans and stage status. concurrency-euint16/report.json and circuits-euint16/report.json are the new independent raw datasets. No source/dependency/SDK modifications while live. Unexpected failures stop the campaign and retain reports and uncertain-broadcast locks; no blind mutation retry or replacement campaign.

After both stages finish, canonical read-only receipt/block audit and descriptive analysis generate network/network-report.md, network/deployment-intervals.tex, network/case-deployment-intervals.tex and network/analysis-and-network-values.json. Table columns match the paper: Configuration, Observed interval UTC, Contract, Containing block range, Mean gas/target. Intervals use canonical containing-block timestamps. Block utilization is transaction-weighted gasUsed/(gasLimit/2); operation gas and actual ETH receipt cost are separate.

Concurrency correctness replays immutable snapshots in canonical block/transaction-index order. Different valid ordering/results are not inconsistencies. Snapshot decrypt audits occur after all receipts and are already-ready retrieval. Circuit completion runs from prepared compute broadcast to validated plaintext, with input loading/readiness/signing separate. No pure-FHE-compute, causal platform ranking or independent-request robustness claim is inferred.
