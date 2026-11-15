# Approved compact study campaign

Concurrency: 1/4 writers, shared_sum/shared_ordered, 10 repetitions, 8 requests/window, baseline/Zama/Fhenix: 120 measured windows. Reuse 42 valid windows and all18 required warmup/control windows. Continue only78 missing windows.

Circuits: linear/tree sums2/8/32; affine chains1/8/16/32; 10 repetitions, three platforms: 300 measured slots and30 warmups. All arithmetic16bit. Known exact unsent HCU rejections are explicit capacity outcomes, never zero-latency successes.

The original raw report is unchanged. concurrency-selection-checkpoint.json is an explicitly documented derived projection: selected cases/rounds are retained unchanged; all67 excluded trials are preserved under supplementaryTrials. Selection never depends on success or performance. Original observations are checked against their source indices and SHA256. Full supplementary receipt/nonces remain part of account safety and actual gas cost, and are excluded from primary network table rows. One late supplementary window-setup receipt supplies canonical gas/state only, with no latency reconstruction.

Validation: TypeScript passed;27 local study/contract/launch/read-resilience tests passed, including lossless selection, nonce continuity and no duplicate sends;2 Python analysis tests passed;6 unsafe compact launcher variants rejected. The original process was stopped only after1141 canonical successful transactions and settled nonces were verified. No funds transferred. RPC read resilience and SDK policy unchanged; new sessions and interleaving are explicitly segmented.

The launcher resumes concurrency without repeated deployments/warmups, then automatically runs compact circuits and canonical network/receipt metadata analysis. Output: network/network-report.md, deployment-intervals.tex, case-deployment-intervals.tex, supplementary-scope-audit.json and rpc-read-events.json. Prior full-matrix RPC retry journal is retained separately. No source/SDK/dependency edits while live. Unexpected nonrecoverable failure retains raw evidence and stops mutations.
