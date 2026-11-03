# Zama ciphertext availability investigation, 8 October 2026

The nonce fix and concurrent warmup do not resolve the recurring Zama ciphertext availability failure. The runs described below used a separate 60-second setup deadline; reaching it did not establish that a ciphertext was invalid or would never become available. Following the 21:02 campaign, setup now inherits `--timeout` unless `--setup-timeout` is explicitly supplied. Gateway-readiness retries can also continue beyond five attempts within that observation budget.

## Latest campaign

Report: `logs/energy-lifecycle-2026-10-08T20-49-28-680Z/report.json`.

- Contract: `0x4AdDa6D776455134E277301536643551990A07b9`.
- Transaction: `0xab62cfaf2cf9eb2a5499f52d353739e3b928ddf9ef803ce4d4144fe3e21e5e00`.
- Persisted handle: `0x1eea884aa3245215133b38abd8171b6a1615a66f87000000000000aa36a70500`.
- Input proof verification succeeded. The transaction succeeded. The receipt-pinned getter returned the handle.
- USER_DECRYPT stayed queued, reporting 2-second retry hints, until the 60-second observation deadline. A subsequent 15-second diagnostic also timed out.
- Read-only host checks at 20:53:40 UTC confirmed that both the owner and contract are allowed by the configured ACL, and the current getter matches the recorded handle.
- The initial gateway explorer query in this investigation returned zero individual ciphertext-material commit events and zero consensus events for this handle.

## Standalone control eventually became available

This control was previously submitted using the standard SDK encryption flow directly, without the benchmark runner, concurrent workers, HTTP tracer, or application retry wrapper.

- Host transaction: `0xe574d26e7823210c072b31b6177a59fde5fbbf9a24d433ad4a797a907faaedc7`.
- Contract: `0xB78B0fCae69c21D310343024c60De15968FA170A`.
- Handle: `0xd2cac1cf439b7ac9256ecb608d7b6815760b5f3d18000000000000aa36a70500`.
- Sepolia inclusion timestamp: **17:41:48 UTC**.
- Gateway ciphertext-material consensus timestamp: **19:59:27 UTC**, a **2-hour 17-minute 39-second** difference between the two chain timestamps.
- Gateway consensus transaction: [0x2acab3bc…](https://explorer.testnet.zama.org/tx/0x2acab3bc410e00af1c739d31b93299c7cc3e6a40aa86fcd13cf7cd9405fb3269).
- The previously stalled control decrypted successfully to **42** during this investigation, using the current adapter and SDK 0.4.1. No new host transaction was sent.

This is evidence of delayed gateway material availability for the standalone control. It does not identify the cause of that delay, prove a general outage, or guarantee that the latest handle will follow the same timeline. The cross-chain timestamp difference is diagnostic evidence, not a replacement benchmark latency sample.

## Interpretation and next checks

Successful host-chain execution and valid ACL permissions alone do not establish ciphertext availability. The [official protocol overview](https://docs.zama.org/protocol/zama-protocol-litepaper) describes coprocessors committing their results to the gateway. The [official registry interface](https://github.com/zama-ai/fhevm/blob/main/gateway-contracts/contracts/interfaces/ICiphertextCommits.sol) separately exposes ciphertext-material availability and consensus events.

Use the diagnostic on the existing campaign to check availability without paying for another deployment:

```powershell
npx hardhat benchmark:energy:diagnose --network sepolia --report logs/energy-lifecycle-2026-10-08T20-49-28-680Z/report.json --timeout 30
```

A later successful diagnostic does not repair the original failed latency observation. Start a fresh measured campaign only when readiness has recovered, recognizing that one recovered handle cannot guarantee future service behavior.

Gateway observations used explorer-indexed events, not a direct storage query. Some follow-up explorer requests were rate-limited; those responses are unknown results and must not be counted as absent events. Raw local host checks and the successful control decryption trace are retained under `logs/zama-host-check-2026-10-08T-current.json` and `logs/zama-control-decrypt-current.json`.

## Analysis of the failure path

The best-supported explanation is delayed preparation/publication/registration of decryptable ciphertext material after successful host-chain execution. This is narrower than claiming that the whole testnet is down. The precise internal bottleneck has not been identified.

The relevant path is:

```text
local encryption and proof
    -> remote INPUT_PROOF verification       [succeeded]
    -> Sepolia VerifyCiphertext + Allowed    [successful receipt, expected events]
    -> coprocessor ingestion and ciphertext preparation
    -> switch-and-squash and storage publication
    -> gateway AddCiphertextMaterial and consensus
    -> USER_DECRYPT and validated plaintext
```

The observed delay lies after host-chain execution and before gateway material consensus for the standalone control. For the latest handle, the lack of explorer-indexed material events at the initial check and the continuously queued request are consistent with the same failure path. They do not reveal whether an internal queue, input retrieval, conversion, publication, or gateway transaction submission is responsible.

### Checks against alternative explanations

| Candidate explanation | Evidence and assessment |
|---|---|
| Wrong getter or handle | The receipt-pinned result read succeeded; the current getter independently returned the same handle. |
| Missing contract/user permission | The receipt contains both expected `Allowed` events; subsequent ACL reads return true for both addresses. This establishes host ACL state, not the time at which gateway ACL propagation completed. |
| Wrong Sepolia contract addresses | Installed SDK/Solidity addresses match Zama's published `charts/coprocessor/configs/ethereum-testnet.yaml` for the ACL, executor, input verifier, and KMS verifier. |
| Permanent invalid control ciphertext, signature, or key incompatibility | The unchanged control later decrypted to 42 using SDK 0.4.1. This strongly argues against those explanations for the control. It does not independently validate every later ciphertext. |
| Sequential benchmark awaits or concurrent workers | The standard SDK control excluded the runner and concurrent workers, yet material consensus arrived over two hours later. Client awaits cannot explain that cross-chain event interval. |
| Expensive arithmetic in notarize | The contract imports the input and grants access; it does not perform mean/max/multiplication. Backend preparation for decryption can still require cryptographic work. |
| Host-chain finality requirement | At 20:58:44 UTC, the latest receipt block 11872667 exceeded Sepolia's finalized block 11872630. However, Zama's reorg guide says ACL propagation starts after inclusion. We have not established a full-finality gate in the deployed material path, and current finality cannot explain the earlier control's historical delay by itself. |
| Too-short observation budget | The 60-second warmup budget and the 30-second diagnostic budget explain when our observations stop. They do not explain the control's late gateway commit. The earlier 600-second campaign also encountered the readiness failure. |

### What the public backend code establishes

Sources were examined from Zama's public `fhevm` repository; the observed main-tree SHA was `e2eadbe904e59d942228dcea96c1c4af13acf0be`. The deployed backend build and its configuration have not been verified against this tree.

- [Published Sepolia configuration](https://github.com/zama-ai/fhevm/blob/e2eadbe904e59d942228dcea96c1c4af13acf0be/charts/coprocessor/configs/ethereum-testnet.yaml): the host addresses match the installed libraries.
- [Switch-and-squash worker](https://github.com/zama-ai/fhevm/blob/e2eadbe904e59d942228dcea96c1c4af13acf0be/coprocessor/fhevm-engine/sns-worker/README.md): a separate worker prepares the representation used downstream; notarization does not skip this pipeline simply because no application arithmetic is performed.
- [Material transaction sender](https://github.com/zama-ai/fhevm/blob/e2eadbe904e59d942228dcea96c1c4af13acf0be/coprocessor/fhevm-engine/transaction-sender/src/ops/add_ciphertext.rs): eligible rows require both ciphertext digests and a matching verified storage-publication witness. The sender records and retries gateway submission failures. Thus a host receipt or a verified input proof is not evidence that this stage completed.
- [Sender configuration](https://github.com/zama-ai/fhevm/blob/e2eadbe904e59d942228dcea96c1c4af13acf0be/coprocessor/fhevm-engine/transaction-sender/src/config.rs): public code documents migration gating and a gas-estimation race at quorum completion. These are possible mechanisms, not established causes of these transactions.
- [Reorg guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling): ACL events propagate after inclusion, so assuming that every decrypt waits for Ethereum finality would be unsupported.

The [status page](https://status.zama.org/) reported operational services when checked. That does not establish per-handle progress or rule out queueing/retry delays.

### Evidence needed to identify the internal cause

An operator with access to the relevant coprocessor telemetry can distinguish the remaining possibilities using the transaction hashes and handles above:

1. Host-listener ingestion timestamp and `Allowed` processing for the handle.
2. Input ciphertext retrieval/verification outcome and its database availability timestamp.
3. Switch-and-squash queue, start, completion, and key-loading errors.
4. Storage-publication timestamps and the publication-verification witness.
5. Material sender retry counts, last error, and submitted gateway transaction hashes.
6. Gateway material consensus and ACL propagation timestamps, followed by the relayer/KMS job outcome.

For the latest diagnostic, USER_DECRYPT job `0c6baeac-b72d-4ea0-a057-86e294f7cc21` remained queued through retry count 14 until the 30-second observation deadline. Its separate diagnostic trace is `logs/energy-lifecycle-2026-10-08T20-49-28-680Z/diagnostic-zama-2026-10-08T20-56-14-260Z.json`.

The new finality snapshot is retained at `logs/zama-finality-investigation.json`. Subsequent material-timeline API requests were rate-limited and provided no additional availability evidence. No new transactions were sent for this analysis.
