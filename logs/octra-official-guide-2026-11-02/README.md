# Octra official first-program tutorial — completed

Completed on 2026-11-02 using the official guide:

https://docs.octra.org/developer-docs/building-your-first-program

The guide was reproduced through the same node RPC methods used by the official web client; no wallet UI installation was required. The upstream OCS-01 template and interface are unchanged, pinned to webcli commit `52fca461dd2e81652dec588f0ab861662bf38cf6`. The downloaded source files and hashes are in `upstream-provenance.json`.

## Outcome

- Network: **devnet**, `https://devnet.octrascan.io/rpc`.
- Program: `oct45VdbGMVGgqV2L5W7ny6yn81y2N1XZrGyo5yFJU2gniY`.
- Constructor: `["MyToken", "MTK", 1000000000000, 6]`.
- Compiler: 2.0 AML-preview; 1123 instructions, 8255 compiled bytes.
- Source-bound program deployment confirmed, constructor succeeded.
- Owner, deployed code hash, metadata, supply and balances checked.
- One MTK token transferred to a separate locally saved test account; sender and recipient balances and unchanged supply checked.
- Source verification returned committed=true, verified=true, published=true.
- Native fees: **0.219 OCT**, exactly matching the native balance change from 2.558492 to 2.339492 OCT.

Token supply created by the constructor is MTK application-token supply. It does not create native OCT for fees. The existing account was already funded; newly generated accounts must not be assumed to have native balance.

## Open the project in the official client

Import `MyToken.aml-project.json` in Dev Tools. Its two source files are also available under `project/`. Use the existing deployed address for view calls; deploying again would create a separate program and spend another fee.

## Reproduction and evidence

`node scripts/octra/official-guide.cjs` prepares and checks the saved project without submitting transactions. The explicit `--send` mode performs the journaled tutorial; existing transaction labels are reconciled and never automatically broadcast again. All RPC submissions target the dedicated devnet endpoint. The prepared and acknowledged transaction hashes are recorded before confirmation.

- `summary.json`: compact public result.
- `deployment.json`: raw transaction receipts, read results and all 12 correctness checks.
- `completion-audit.json`: receipt counts, nonce checks, exact native fee reconciliation and raw report SHA256.
- `compilation.json`: compiler output, ABI, assembly, program package and verifier output.
- `upstream-provenance.json`: pinned official source hashes.
- `initial-preflight.json`: original network identity, balance, nonce and fee probes.

No mining, validator enrollment, native-token funding transfers or faucet claims were performed. Historical energy benchmark reports and October 21 Octra pilot artifacts were not modified. This ordinary token tutorial does not establish encrypted arithmetic correctness or benchmark performance.
