# Energy Notarization Contracts

Sepolia experiments comparing plaintext EVM, Zama fhEVM and Fhenix CoFHE.

The classic lifecycle suite is retained in `tasks/lifecycle/` and the original contracts. Its default `processes` protocol uses three persistent OS workers, independent saved signers, prepared signed transactions and submission barriers. Input preparation, transaction inclusion, validated plaintext and already-ready retrieval are distinct measurements. The legacy `async` protocol remains for interpreting historical reports; do not pool it with the isolated-process protocol.

Uniform 16/128-bit lifecycle contracts, smart-meter owner registration and the separate persisted-result `view_decrypt` experiment are also retained. See [uniform lifecycle](docs/UNIFORM_LIFECYCLE.md). Existing reports and account files are not reset by the new studies.

## Local checks

```powershell
npm ci
npm run verify
npm run analysis:test
```

`npm ci` runs the existing SDK polling patch. Do not install, patch or edit dependencies while a campaign is running. Local Hardhat/mock timings are correctness tests, not public-network measurements.

## Classic lifecycle

Use saved accounts dedicated to the intended campaign. The default root account directory may contain a quarantine lock from historical broadcasts: leave it untouched. To prepare a fresh classic account file explicitly:

```powershell
npx hardhat benchmark:accounts --file .benchmark-accounts/classic/accounts.secret.json --count 3
npx hardhat benchmark:accounts:balances --network sepolia --file .benchmark-accounts/classic/accounts.secret.json
```

Account creation does not fund accounts. Configure `SEPOLIA_RPC_URL` through Hardhat variables or the environment. After funding and reviewing the intended workload, these commands **send Sepolia transactions**:

```powershell
npm run benchmark:pilot -- --accounts-file .benchmark-accounts/classic/accounts.secret.json --output-dir logs/classic-pilot-new
npm run benchmark:sepolia -- --accounts-file .benchmark-accounts/classic/accounts.secret.json --output-dir logs/classic-50-new
```

`--timeout` is the per-stage observation deadline in seconds; `--setup-timeout` optionally overrides setup/warmup. Failed observations remain in reports. No uncertain broadcast should be replayed automatically. Diagnose an existing Zama handle with a read-only recovery trace:

```powershell
npx hardhat benchmark:energy:diagnose --network sepolia --report logs/<campaign>/report.json --timeout 30
```

Late recovery does not reconstruct the original failed latency. Analyze an eligible classic report with `npm run analyze -- logs/<campaign>/report.json`; the strict analyzer intentionally rejects reports that fail its completeness requirements.

## Two additional studies

1. **Concurrency and ordering:** independent writers, shared sum and an order-sensitive shared update. Replay canonical chain order and validate immutable per-request snapshots plus final state.
2. **Circuit growth:** linear versus balanced sums with equal addition counts, and increasingly long multiply/add chains executed within one transaction.

Both use 16-bit arithmetic for all three platforms. The historical 128-bit study results are retained, while those runnable study variants have been removed. Commands default to **planning only**, including when a network is selected; `--live` explicitly enables execution.

```powershell
npm run study:plan
npm run study:concurrency -- --widths 16 --users 1,2 --requests 8 --repetitions 3
npm run study:circuits -- --widths 16 --sizes 2,4,8 --depths 1,2,4 --repetitions 3
npm run study:test
```

The paper uses 20 windows per concurrency configuration (1, 2 and 4 writers; eight requests; shared sum and order-sensitive update) and 30 repetitions per circuit configuration (sum sizes 2/8/32; chain depths 1/8/16/32). These are selected matrices, not the larger task defaults. An exact known Zama HCU rejection during gas estimation is recorded without sending the compute transaction; it has no receipt latency or gas measurement. Studies use separate saved accounts. Nothing is funded automatically.

Use `scripts/run-study-campaign.cjs <new-reviewed-manifest.json>` as the single study launcher. It selects the existing guarded policy from the manifest kind; ambiguous compact histories require `--policy`. It validates the reviewed matrix, account identity, source hashes and existing outputs before execution. It does not automatically resume failed campaigns. See [design, robustness and interpretation](docs/CONCURRENCY_AND_CIRCUITS.md) and [starting commands](START-NEW-EXPERIMENTS.txt).

## Paper results and repository maintenance

- Energy 16/128-bit results and publication scripts: `logs/energy-uniform16-128-owner-50-2026-11-10/`.
- Concurrency 1/2/4-writer tables: `logs/concurrency2-20-2026-11-15/analysis/`.
- Circuit section and tables: `logs/circuits-publication-30runs-2026-11-15/`.

Raw reports, transaction journals, JSON audits and publication regeneration scripts are retained. Keep new operational code under `scripts/`, update the main guides instead of adding temporary Markdown notes, and follow [maintenance conventions](AGENTS.md). Removed one-off helpers and secondary Markdown are backed up outside the repository under `C:/Users/danie/.codex/backups/energy-notarization-contracts/`.

Earlier retired expanded/Octra source is preserved in `archive/retired-experiments-2026-11-06.zip` (SHA256 `6b31c28253d33441277538120b59905a3c64b764e7fc3ab7137cd6e09756cec9`). Third-party source snapshots used for code references remain available.

## Repository layout

- `contracts/`: classic contracts; `contracts/uniform/`: uniform-width lifecycle; `contracts/studies/`: the two new studies.
- `tasks/lifecycle/`: classic/uniform orchestration and platform adapters.
- `tasks/studies/`: planning, canonical replay, adapters, single-send execution and reporting.
- `tasks/experiments/accounts.ts`: shared saved-account utilities retained for classic compatibility.
- `scripts/analysis/`: classic/uniform analysis; new studies write their own descriptive summaries.
- `test/`: deterministic tests and local contract integration.

Never commit `.benchmark-accounts/`, `.env` or generated logs. Never publish private keys, signed raw transactions or credentialed RPC URLs.
