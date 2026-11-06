# Octra encrypted workload: single-trial experimental record

**All five equivalent state-changing operations did not complete.** Failures, targeted retries, late correctness recovery and compiler limits are retained separately.

Program: `oct8iWgBRKidrcDK28ARYPxLm4fCcar9PFrCVwPBFjE76ye` on **Octra devnet**.

| Operation | Outcome | Plaintext | Primary latency availability |
|---|---|---:|---|
| notarize | state_changing: validated | 43 | n=1 |
| add | state_changing_late_validation: confirmed | 85 | unavailable / not applicable |
| mul_scalar | state_changing_late_validation: confirmed | 129 | unavailable / not applicable |
| mean | read_only_field_candidate: validated | 64 | unavailable / not applicable |
| max | compiler_probe: unsupported_by_live_compiler | -- | unavailable / not applicable |

## Primary timing observations

| Operation | Tx to observed receipt ms | Receipt to validation ms | Tx to validated plaintext ms | Native fee OCT | VM effort |
|---|---:|---:|---:|---:|---:|
| notarize | 23978.097 | 235.990 | 24214.087 | 0.001 | 11606 |

These are individual observations, not means. No CV, confidence interval or p-value is estimated. The successful values are not statistically paired with the Sepolia campaign. Input encryption and serialization, signing, broadcast acknowledgment, retrieval and decryption are retained in the CSV. Key setup and registration checks are separate. Post-receipt time includes RPC and client validation, not isolated FHE computation. Small report-write gaps between stages are excluded from summed components.

## Failures and reconciliation

Addition at 1,500,000 OU and 2,560,000 OU was rejected with `program_exec_failed / execution reverted`. A final 2,570,000-OU attempt is recorded separately. It confirmed with receipt effort 2,560,073, 73 above the preceding allowance. This is consistent with the preceding allowance being insufficient. Its observer stopped on a malformed JSON RPC response; late ciphertext validation confirmed 85, and no primary latency was reconstructed. All earlier failures and observation interruptions remain in the raw data.

Scalar submission was acknowledged, then a Windows EPERM atomic-file-rename error interrupted the local observer. Its existing hash was later confirmed and the persisted result decrypted to 129. It was never automatically replayed. Late validation is correctness evidence; no original primary latency was reconstructed. Raw report snapshots are retained under the continuation logging-recovery folder.

The confirmed scalar receipt used 2,542,977 VM effort. The confirmed addition used 2,560,073, explaining why a 2,560,000-OU bound was too tight for that observed execution.

## Mean and maximum limits

PVAC field arithmetic is not euint16/euint64 wrapping arithmetic. Synthetic reading 43 is client-range-checked to 16 bits; initial total is encrypted 42 and scalar is 3. This prototype implements no on-chain input range proof or equivalent-security claim. The raw sample flag `equivalentGeneralIntegerSemantics` is a prototype tag, not a validated claim of general unsigned-64 wrapping equivalence; the analysis restricts correctness to the observed small-value fixtures.

`fhe_div_const` multiplies by a modular inverse in F_(2^127-1). The local even case (43+85)/2 gives 64, but (42+17)/2 gives 85070591730234615865843651857942052893 rather than floor integer 29. The even case was also validated online in a read-only call. It is not counted as a state-changing general integer mean. Online odd-case failures are retained; the integer counterexample is local.

The live compiler rejects `fhe_max` as unknown and ordinary `max` on ciphertexts. No fake no-op maximum, plaintext computation or re-encryption is substituted. This is a limit of the exposed compiler surface, not an impossibility theorem for Octra.

## Native fees

Confirmed fees including deployment: **5.338 OCT**.
Native balance: **5.339492 -> 0.001492 OCT**.
Confirmed fees exactly reconcile with observed balance delta: **True**.

Native fees are OU (1 OCT = 1,000,000 OU); receipt VM effort is a distinct metric. Neither is Ethereum gas. Rejected declared allowances are not counted as fees paid merely because submitted.

## Read-only diagnostics

- `persisted_last`: validated; plaintext=43; RPC=173.96540000000095 ms; 
- `persisted_total`: validated; plaintext=42; RPC=171.59730000000127 ms; 
- `add_view`: validated; plaintext=85; RPC=7214.932999999997 ms; 
- `mul_scalar_view`: failed; plaintext=unavailable; RPC=unavailable ms; contract_call: Program view resources unavailable
- `mean_even_field_view`: failed; plaintext=unavailable; RPC=unavailable ms; contract_call: Program view resources unavailable
- `mean_odd_field_view`: failed; plaintext=unavailable; RPC=unavailable ms; contract_call: Program view resources unavailable
- `persisted_last`: validated; plaintext=43; RPC=6910.834600000002 ms; 
- `persisted_total`: validated; plaintext=42; RPC=207.88720000000467 ms; 
- `late_scalar_result`: validated; plaintext=129; RPC=206.15709999999672 ms; 
- `add_view`: validated; plaintext=85; RPC=8267.781500000005 ms; 
- `mul_scalar_view`: failed; plaintext=unavailable; RPC=unavailable ms; contract_call: SyntaxError
- `mean_even_field_view`: validated; plaintext=64; RPC=9922.6976 ms; 
- `mean_odd_field_view`: failed; plaintext=unavailable; RPC=unavailable ms; contract_call: SyntaxError

RPC resource errors, HTTP rate-limit responses, malformed-response failures and retries are retained in the raw traces. Read-only computations do not replace confirmed state-changing observations.

## Artifacts

- `operation-summary.csv`: scope-labeled results for all five requested operations.
- `state-changing-attempts.csv`: every measured attempt, including failed additions and logging interruption.
- `read-only-diagnostics.csv`: all view attempts, including failures.
- `analysis.json` and `completion-audit.json`: complete descriptive results, hashes and fee reconciliation.
- Original raw report: `C:\Users\danie\Desktop\Dottorato\energy-notarization-contracts\logs\octra-lifecycle-once-2026-11-02\report.json`.
- Raw continuation: `C:\Users\danie\Desktop\Dottorato\energy-notarization-contracts\logs\octra-lifecycle-once-2026-11-02-continuation1\report.json`.
- Final read-only reconciliation: `C:\Users\danie\Desktop\Dottorato\energy-notarization-contracts\logs\octra-lifecycle-once-2026-11-02-final-recheck\observations.json`.
- Final addition attempt: `C:\Users\danie\Desktop\Dottorato\energy-notarization-contracts\logs\octra-lifecycle-once-2026-11-02-add-final\report.json`.

- Final addition late reconciliation: `C:\Users\danie\Desktop\Dottorato\energy-notarization-contracts\logs\octra-lifecycle-once-2026-11-02-add-final\reconciliation.json`.

Original reports and sample prefixes are unchanged; no timings or outcomes were repaired. Private keys are held only in ignored account files and absent from public artifacts.

Sources: https://docs.octra.org/developer-docs/applied-cheatsheet and https://github.com/octra-labs/lite_node/tree/c49de45cf49ebbc2e5c0697eb956cbcada5845e7
