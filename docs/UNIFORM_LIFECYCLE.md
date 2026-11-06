# Uniform-width lifecycle with smart-meter ownership

The suite compares a plaintext baseline, Zama fhEVM, and Fhenix CoFHE on Sepolia.
It runs separate 16-bit and 128-bit energy workloads. The classic mixed-width
contracts and their five-operation schedule remain available.

Each contract represents the same public smart-meter identifier,
`bytes32("energy-benchmark-smart-meter-001")`. Energy state is keyed by that ID.
`setSmartMeterOwner(meterId, encryptedAddress, proof)` imports an `eaddress` and
associates it with this meter. The baseline accepts an ordinary `address`.
`getSmartMeterOwner(meterId)` returns the stored address or its ciphertext handle.
Unknown meter IDs and unauthorized callers are rejected.

The synthetic owner is `0x1234567890abcdef1234567890abcdef12345678` on all
platforms and at both integer widths. Each repetition prepares a fresh encrypted
input. The address exercises the full 160-bit address representation; it is not
truncated to the energy integer width. This public benchmark fixture is not a
real person's confidential identity.

The deployment operator remains authorized to submit readings and decrypt
results. Registering a confidential meter owner does not authenticate a caller
against that encrypted address or transfer the operator's administrative role.

## Per-round order

1. `set_meter_owner`: import/store the owner, read at its canonical receipt block,
   decrypt as an address, and validate the complete recovered address.
2. `notarize`: import/store a new energy reading.
3. `add`: update the accumulated total.
4. `mul_scalar`: multiply the latest reading by the public scalar.
5. `mean`: compute the width-wrapped sum divided by two.
6. `max`: compute and store the maximum.
7. `view_decrypt`: read the persisted maximum and make a fresh authorized
   decryption request, without submitting a transaction.

For each width, 50 measured rounds produce **900 primary observations**
(300 per platform, including 50 owner registrations per platform), **150 separate
view-plus-decrypt observations**, and **300 matched transaction triples**.
Warmup adds 18 primary observations and three view observations. Three
deployments are recorded separately. Pilot rounds use the same paths and are
kept separate from the 50-round data.

The owner operation measures encrypted input registration and retrieval, rather
than an arithmetic FHE primitive. All energy integers use the selected width;
the additional `eaddress` has its own address type. CoFHE trivially encrypts the
scalar and divisor, whereas Zama uses their public scalar forms.

## Timing and execution

Three persistent OS workers use independent saved signers. Input preparation,
gas estimation, and signing precede the shared submission barrier. The primary
timer starts at broadcast invocation and ends at validated plaintext. Receipt
latency and post-receipt retrieval are recorded separately. Full client work is
`preparationMs + transactionToValidatedPlaintextMs`; intentional barrier waiting
is reported separately.

Reads remain pinned to the same receipt block hash with `requireCanonical=true`.
Bounded read retries and polling waits are included in timings and traces;
transaction mutations are never automatically retransmitted. Polling base is
10 ms, subject to larger service-provided hints. Stage observation deadlines are
180 seconds. These measurements include public network and service effects and
do not isolate backend FHE computation.

## Commands

Use a fresh output directory and the saved, funded accounts file. The launcher
runs one pilot at each width before either measured stage:

```powershell
node scripts/run-uniform-energy.cjs logs/<fresh-suite> .benchmark-accounts/isolated-validation/accounts.secret.json 50
```

After each stage finishes, analyze its immutable raw report:

```powershell
.venv/Scripts/python.exe scripts/analysis/analyze-uniform-lifecycle.py logs/<fresh-suite>/measured-euint16/report.json
node scripts/analysis/energy-block-inclusion.cjs logs/<fresh-suite>/measured-euint16/report.json
```

Repeat the analysis commands for `measured-euint128`. Schema 14 records the meter
association and six measured transaction operations; earlier schema-13 reports
remain unchanged and have only the five energy operations.

## Fhenix-only continuation

An explicitly authorized repeat of a confirmed failed `mean` uses a fresh nonce
and is stored in `retrySamples`, preserving the historical primary failure:

```powershell
node scripts/continue-uniform-fhenix.cjs <source-report> <fresh-output> .benchmark-accounts/isolated-validation/accounts.secret.json --repeat-failed-mean
```

To resume only unattempted operations after a failed Fhenix-only segment:

```powershell
node scripts/continue-uniform-fhenix.cjs <source-report> <fresh-output> .benchmark-accounts/isolated-validation/accounts.secret.json --resume-missing
```

This second mode never repeats a transaction. It uses a 1000 ms client floor for
off-chain seal-output polling, honors larger server hints, and allows at most
three HTTP-429 read attempts with backoff within the original deadline. The SDK
bundles remain unchanged. The changed read policy defines a separate segment.
If the last confirmed `max` failed during retrieval, its value and a view can be
recovered read-only and are kept outside the original primary timing statistics.

Both modes verify canonical receipts, exact nonces, deployed bytecode and
decrypted last/total/result/meter-owner state before sending. They preserve the
source report and its sample, deployment, view, retry and barrier prefixes.
Baseline and Zama remain inactive; these segments are not new matched
three-platform observations. A platform-complete flag does not mark the global
campaign complete or make historical failures valid.
