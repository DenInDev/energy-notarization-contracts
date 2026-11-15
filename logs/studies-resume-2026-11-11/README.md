# 16-bit study continuations — 11 November 2026

The user authorized correcting and completing both missing study categories. Order: reduced concurrency first (20 repetitions, 1/2/4 writers, 8 requests, independent/shared_sum/shared_ordered), then the paused circuit matrix (50 repetitions, linear/tree sums of 2/4/8/16/32 operands and affine chains of 1/2/4/8/16/32 steps). Baseline, Zama and Fhenix in both categories; arithmetic and oracle wrap at 16 bits.

This queue retains the prior successful observations and sends only the missing scheduled transactions. It reuses deployments and completed warmups. Original reports remain immutable; continuation report prefixes are checked on each save. Current source and SDK snapshots are frozen while either stage runs. Different segments and interruptions remain explicit in analysis.

The concurrency setup-gas estimate now uses confirmed canonical contract state, avoiding dependence on a temporarily stale pending RPC backend. The historical Writer-not-authorized preparation error remains in the source; no window transaction existed for that attempt. No mutation is automatically replayed.

The circuit input load at nonce 1799 was confirmed while the process was suspended. A bounded read-only verification checks its hash/sender/nonce/target/canonical block and attaches a separate receipt in settledSetupReceipts. The pending historical trial/setup fields and missing timing remain untouched. Continuation verifies the existing inputs and absent compute snapshot before sending its never-submitted compute transaction.

Read-only launch preflight: 22 historical concurrency transactions and 1,186 historical circuit transactions accounted for. Settled next nonces: concurrency operator 6, writers 16/0/0/0; circuit operator 1800. Dedicated signer subsets reuse existing saved funded accounts, with a shared parent lease. No funding or interaction with the unrelated quarantined root lock.

Validation: TypeScript check; 22 local study/contract/launch tests; two Python analysis tests; five invalid continuation-manifest variants rejected. Contract, timed transport, adapter and SDK bundle hashes match the original runs. Check launcher and test artifacts here for evidence.

Both stages must attain full planned-slot coverage (concurrency: 540 measured + 36 warmup/control windows; circuits: 2,400 measured + 48 warmup slots). Known unsent HCU depth rejections are explicit capacity observations, without compute gas or latency. Complete execution is not a claim that every original attempt succeeded. Any unexpected failure stops the queue with raw evidence retained.

After both stages finish, the launcher runs canonical read-only block metadata collection and descriptive analysis. network/deployment-intervals.tex and network/case-deployment-intervals.tex match the paper's Configuration / Observed interval UTC / Contract / Containing block range / Mean gas/target columns. Network utilization is transaction-weighted containing-block gasUsed divided by half the block gas limit; operation gas is separate. Concurrency audits are deferred retrieval, while circuit completion is broadcast to validated plaintext. Neither is isolated FHE compute or a causal platform ranking.
