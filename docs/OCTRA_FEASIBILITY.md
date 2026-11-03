# Octra feasibility pilot

Tested on 2026-10-21 against `https://devnet.octrascan.io/rpc`.

**Status: deployment and encrypted storage passed; read-only encrypted addition and scaling passed. State-changing addition reverted at the default call budget. The user chose to complete read-only checks and defer higher-budget write retries.**

The consolidated evidence is `logs/octra-pilot/summary.json`. The verified plaintext results are **42** (stored input), **59** (42 + 17) and **126** (42 × 3). These are live devnet results decrypted locally with the dedicated account's key.

## Verified results

| Check | Observed result | Evidence |
|---|---|---|
| Live network | Node 3.0.0, network `v3.0.0-irmin`; node status and version returned successfully | `logs/octra-pilot/online-preflight.json` |
| Live compilation | `EnergyPilot.aml` compiled with compiler `1.0 Rehovot`, 571 bytes, 116 instructions | Same report, including bytecode, disassembly and ABI |
| Compiler output | `store`, `add`, `scale`, `get_result` present; FHE deserialize, serialize, addition and scaling instructions present | Same report |
| Existing program read | Public `get_name` call returned `QUASAR` | `logs/octra-pilot/public-view.json` |
| Local wallet cryptography | 15/15 correctness checks: public ciphertext serialization/deserialization, addition, scalar multiplication | `logs/octra-pilot/local-probe.json` |
| Own contract deployment | Two contracts deployed; successful constructor receipts, expected owner, bytecode hashes checked | `logs/octra-pilot/summary.json` |
| Devnet faucet | `faucet-devnet.octra.com` returned DNS name-not-found in both browser navigation and system DNS lookup | Observed during this pilot |
| Own encrypted storage | Store transaction confirmed; public ciphertext retrieved and decrypted to 42; remained 42 after the rejected addition | Summary and `live-pilot.json` |
| Own read-only encrypted addition | Returned ciphertext decrypted to 59 | `view-diagnostics.json` |
| Own read-only encrypted scaling | Returned ciphertext decrypted to 126 | `view-diagnostics.json` |
| State-changing addition | Transaction rejected with `program_exec_failed / execution reverted`; not retried with a larger effort budget | `live-pilot.json`, `add-diagnostic.json` |

The existing-program read was an initial RPC smoke check. The subsequent own-contract storage and read-only arithmetic checks establish correctness for the synthetic pilot cases. They do not establish successful persistence of an arithmetic result or statistically representative performance.

## Pilot workload

`contracts/octra/EnergyPilot.aml` stores two ciphertexts owned by the deploying caller. It provides encrypted addition and multiplication of the left input by a public scalar, and returns the serialized result for client-side decryption. Synthetic inputs are used. The pilot does not verify input range proofs and is not a production notarization contract.

`contracts/octra/EnergyPilotViews.aml` isolates arithmetic from persistence. Its view methods receive the same synthetic ciphertexts, load the caller's registered public key, and return encrypted addition/scaling results. This diagnostic contract passed both read-only arithmetic checks.

Deployed addresses:

- Stateful storage pilot: `octH9pvrFX8Gg5R3dWUM1b834HTXtPEWfSGQwEqmjaBi1ao`.
- Read-only arithmetic pilot: `oct4vJkHFXiAjBmgANC7cKDLh2vnu9wNqTbC28MuNWEf4pm`.

The local probe checks `(a, b, scalar)` values `(42,17,3)`, `(0,1,0)`, `(1,0,1)`, `(255,1024,7)` and `(4294967295,17,2)`. These are correctness checks within a limited range; they do not establish equivalence to unsigned 64-bit wrapping arithmetic. They do not validate encrypted comparisons, maximum, division, multiuser key sharing or threshold decryption.

## Account and funding

Dedicated **devnet** address:

`oct1CKqP7MG8cVnRixBrH1CvPmfFZHKi71JaMNeCaLC3hnt`

The seed is stored only in ignored `.benchmark-accounts/octra-devnet.secret.json`, with the same restricted directory ACL as the other benchmark keys. No Ethereum key is reused. `node scripts/octra/account.cjs` preserves the account and prints only its public address and network.

The account received 3 devnet OCT. The verified remaining balance after the pilot was **2.558492 OCT**. Confirmed declared fees totaled 0.441508 OCT: key registration 40,508 OU, two deployments at 200,000 OU each, and storage at 1,000 OU. The rejected arithmetic transaction did not consume its nonce. The read-only checks do not submit transactions.

The initial 1 OCT estimate covered the default quoted transaction fees but did not account for the larger effort allowance needed by arithmetic. Inspection of current node source shows that low-fee calls get a 1,000,000-unit VM effort floor. The registered key is 3,093,397 serialized bytes and declares a 17,110,507-byte expanded image; the source charges about 1,262,744 units just to load it, before arithmetic. This provides a source-derived explanation consistent with the rejected write. A higher-budget write retry was explicitly deferred, so this explanation has not been experimentally isolated by changing the budget alone.

The RPC documentation's direct `octra_registerPvacPubkey` method was rejected by the live node, requiring a canonical `key_switch` transaction. The pilot used the canonical wallet-source transaction format, confirmed it, and read the registered key back to verify an exact match. Registered public material is cached locally for resumes, avoiding repeated multi-megabyte reads.

## Reproduction

Run from the repository root:

```powershell
node scripts/octra/account.cjs
node scripts/octra/preflight.cjs
```

The preflight submits only unsigned RPC reads and source compilation. It does not submit transactions or register keys. Its report records the account's current funding state.

For a funded fresh run, `node scripts/octra/live-pilot.cjs --send` registers the key, deploys, and attempts the stateful pipeline. It records submissions before waiting, reconciles existing transactions on resume, and stops on rejections. Its default arithmetic fee budget reproduced the limitation above; it is not a command that currently completes the full stateful suite.

`node scripts/octra/live-pilot.cjs --send --views` deploys/reuses the read-only diagnostic contract. `node scripts/octra/view-diagnostic.cjs` checks both view methods with bounded backoff for capacity/busy errors and retains failed attempts. `node scripts/octra/summarize.cjs` consolidates the evidence, checks the original stored result again, and refreshes the balance. These commands operate only on the dedicated devnet endpoint; the final two submit no transactions.

The actual wallet library was built using the existing Ubuntu-22.04 WSL installation and GCC:

```bash
# From the repository root in WSL; vendor clones are kept under ignored logs/.
git clone https://github.com/octra-labs/webcli.git logs/octra-pilot/vendor/webcli
git -C logs/octra-pilot/vendor/webcli checkout 549536d
make -C logs/octra-pilot/vendor/webcli pvac/build/libpvac.so
python3 scripts/octra/local-probe.py
```

The generated fixture file contains public-key material and synthetic ciphertexts. The decryption seed stays in the private account file. `local-probe.py --decrypt <json-file>` can decode a result object containing a base64 `ciphertext` field using that account's key.

## Tooling observations

Pinned wallet source: `549536d` (`octra-labs/webcli`). Full source identifiers are retained in the preflight report. The wallet's bundled PVAC library passed this pilot's local checks.

The standalone `octra-labs/amlc` snapshot inspected in this investigation exposes FHE operations as host placeholders in `lib/vm/machine/pvac_ffi.ml`, raising `FHE host operation is unavailable`. Its local executor therefore cannot replace a funded network test. The separate older `pvac_hfhe_cpp` example previously aborted with `std::bad_alloc`; the successful local results reported here use the current wallet's bundled library instead.

The public RPC produced a timeout, HTTP 429 capacity responses and `Program view busy` during arithmetic checks. Successful read-only scaling took approximately 31.1 seconds for its RPC response, and addition approximately 11.0 seconds. These individual observations include public-service delays, exclude client decryption, and follow retries; they are not benchmark means or measurements of cryptographic execution alone. Failed attempts are retained in `view-diagnostics.json`.

For the paper, this evidence supports reporting deployment, encrypted storage and read-only arithmetic feasibility. State-changing arithmetic, broader correctness cases, input proofs, parameter/security equivalence and repeated performance measurements remain to be evaluated before adding Octra to comparative performance figures.

Sources: [RPC documentation](https://docs.octra.org/developer-docs/rpc-scheme), [wallet source](https://github.com/octra-labs/webcli), [standalone compiler source](https://github.com/octra-labs/amlc).

## Follow-up trial: 2026-11-02

The October 21 evidence above remains unchanged. A new, separately recorded trial
deployed `EnergyLifecycleOnce.aml` on devnet at
`oct8iWgBRKidrcDK28ARYPxLm4fCcar9PFrCVwPBFjE76ye`.
Encrypted notarization, state-changing addition and scalar multiplication were
confirmed and their persisted ciphertexts decrypted to **43**, **85** and **129**.

Only notarization retained an uninterrupted primary latency observation:
**24,214.0873 ms** from broadcast start to plaintext validation. A Windows EPERM
report-write interruption affected scalar observation; a malformed RPC response
affected the final addition observer. Their late correctness checks do not repair
or replace the missing primary latencies.

Addition attempts at 1,500,000 and 2,560,000 OU were rejected and retained. The
final 2,570,000-OU attempt confirmed with **2,560,073 VM effort**, 73 over the
preceding allowance. Scalar multiplication confirmed at 2,560,000 OU with
**2,542,977 VM effort**. Confirmed native fees, including deployment and
notarization, totaled **5.338 devnet OCT**, reconciled exactly against the wallet
balance change from **5.339492** to **0.001492 OCT**.

The full five-operation workload remains incomplete: the compiler rejects
`fhe_max` and numeric `max` on ciphertexts. `fhe_div_const` implements finite-field
division, not general floor integer division. A read-only even-sum candidate
returned **64** for `(43 + 85)/2`; the local odd-sum counterexample differs from
the integer mean. Read-only RPC resource and malformed-response failures are
also retained. No equivalent unsigned-64 wrapping or security-parameter claim
is established by this limited trial.

Consolidated results:
`logs/octra-lifecycle-once-2026-11-02-results/analysis.md`, `analysis.json`,
`operation-summary.csv`, `state-changing-attempts.csv`,
`read-only-diagnostics.csv` and `completion-audit.json`.
Raw reports and late reconciliation are linked from that analysis. Reproduce
the descriptive export without submitting transactions using
`.venv/Scripts/python.exe scripts/octra/analyze-lifecycle-record.py`.
