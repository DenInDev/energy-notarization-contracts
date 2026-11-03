import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ScheduledComparison } from "../lib/lifecycleSchedule";
import { summarize } from "../lib/lifecycleTiming";
import { writeLifecycleJson } from "../lib/lifecycleReportWrite";
import {
  operations,
  contracts,
  type BenchmarkArgs,
  type Platform,
  type Sample,
} from "./types";
const metrics = [
  "inputPreparationMs",
  "gasUsed",
  "confirmationMs",
  "postReceiptToValidatedPlaintextMs",
  "transactionToValidatedPlaintextMs",
  "alreadyReadyDecryptMs",
  "preparationMs",
  "transactionPreparationMs",
  "barrierWaitMs",
  "broadcastAckMs",
  "broadcastToReceiptMs",
] as const;


type Statistics = ReturnType<typeof summarize>;

type Summary = Record<(typeof metrics)[number], Statistics> & {
  platform: Platform;
  operation: Sample["operation"];
  attempted: number;
  validated: number;
  failed: number;
  readyDecryptFailed: number;
};

type ReportResults = {
  initialBalanceWei?: string;
  initialGasPriceWei?: string;
  abortedAt?: string;
  completedAt?: string;
  complete?: boolean;
  summary?: Summary[];
  stageSummary?: (Statistics & {
    platform: Platform;
    operation: Sample["operation"];
    stage: string;
  })[];
};

export type LifecycleReport = ReturnType<typeof createLifecycleReport>;
const reproducibilityFiles = [
  "hardhat.config.ts",
  "package-lock.json",
  "contracts/EnergyNotarizationPlainTest.sol",
  "contracts/EnergyNotarizationFHETest.sol",
  "contracts/EnergyLifecycleCoFHE.sol",
  "tasks/benchmarkEnergyLifecycle.ts",
  "tasks/lib/lifecycleTiming.ts",
  "tasks/lib/lifecycleSchedule.ts",
  "tasks/lib/lifecycleResult.ts",
  "tasks/lib/lifecycleReadRetry.ts",
  "tasks/lib/lifecycleConcurrent.ts",
  "tasks/lib/lifecycleNonce.ts",
  "tasks/lib/lifecycleReportWrite.ts",
  "tasks/lifecycle/types.ts",
  "tasks/lifecycle/operations.ts",
  "tasks/lifecycle/errors.ts",
  "tasks/lifecycle/adapters.ts",
  "tasks/lifecycle/zama.ts",
  "tasks/lifecycle/cofhe.ts",
  "tasks/lifecycle/report.ts",
  "tasks/lifecycle/measurement.ts",
  "tasks/lifecycle/campaign.ts",
  "tasks/lifecycle/processCampaign.ts",
  "tasks/lifecycle/processWorker.ts",
  "tasks/lifecycle/processContinuation.ts",
  "tasks/lifecycle/continuation.ts",
  "tasks/lifecycle/continuationPlan.ts",
  "tasks/lifecycle/workerClient.ts",
  "tasks/lifecycle/broadcast.ts",
  "scripts/energy-platform-worker.cjs",
  "scripts/run-energy-campaign.cjs",
  "scripts/continue-energy-campaign.cjs",
  "tasks/lib/decryptionPolling.cjs",
  "scripts/patch-decryption-polling.cjs",
  "tasks/experiments/accounts.ts",
];

function sha256File(file: string): string {
  return createHash("sha256")
    .update(fs.readFileSync(path.resolve(file)))
    .digest("hex");
}

export function createLifecycleReport(
  args: BenchmarkArgs,
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  selected: Platform[],
  schedule: ScheduledComparison[],
  setup: Record<string, unknown>[],
  samples: Sample[],
) {
  const report = {
    schemaVersion: 11,
    platformOwners: {} as Partial<Record<Platform,string>>,
    signerMode: "shared_account" as "shared_account" | "independent_platform_accounts",
    decryptionPolling: require("../lib/decryptionPolling.cjs").pollingProvenance(),
    energyRepresentation: {
      unit: "Wh", readingBits: 16, accumulatorBits: 64, resultBits: 64,
      timestampBits: 64, timestampEncrypted: false,
      readingRange: "0..65535 Wh per measurement interval",
      computation: "Widen reading to 64 bits before arithmetic; conversion is included in transaction cost.",
      dataset: "Synthetic readings; acquisition interval and physical meter validation are outside this benchmark.",
    },
    observationTimeoutMs: args.timeout * 1000,
    setupObservationTimeoutMs: (args.setupTimeout ?? args.timeout) * 1000,
    executionMode: "concurrent_operation_workers",
    studyScope:
      "observable operational performance of public Sepolia deployments; not isolated TFHE computation",
    startedAt: new Date().toISOString(),
    chainId: "11155111",
    owner: signer.address,
    rpcHost: new URL((hre.network.config as any).url).hostname,
    runs: args.runs,
    selectedPlatforms: selected,
    scheduleSeed: args.seed,
    schedule,
    sdkVersions: {
      zama: require("@zama-fhe/relayer-sdk/package.json").version,
      fhenix: JSON.parse(fs.readFileSync("package-lock.json", "utf8")).packages["node_modules/@cofhe/sdk-current"].version,
    },
    contractLibraries: {
      zama: "@fhevm/solidity 0.11.1",
      fhenix: "@fhenixprotocol/cofhe-contracts 0.2.0",
    },
    contractNames: contracts,
    compiler: {
      version: "0.8.27",
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
      viaIR: false,
    },
    sourceSha256: Object.fromEntries(
      reproducibilityFiles.map((file) => [file, sha256File(file)]),
    ),
    machine: {
      os: os.type(),
      release: os.release(),
      architecture: os.arch(),
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.cpus().length,
      ramBytes: os.totalmem(),
      node: process.version,
    },
    methodology: {
      clock:
        "performance.now (monotonic client clock); ISO wall time is metadata only",
      confirmation:
        "before contract invocation to observation of successful receipt (1 confirmation; not finality)",
      completion:
        "before contract invocation to equality-validated authenticated plaintext; excludes input preparation",
      postReceipt:
        "receipt observation to validated plaintext, including handle read, authorization and SDK decrypt",
      sdkPolling:
        "SDK retrieval includes service-directed polling and retry waits; Zama progress records retryAfterMs and CoFHE poll events record intervalMs. These are polling hints, not measured sleep durations, and must not be subtracted to infer backend computation time",
      alreadyReady:
        "second authenticated SDK decrypt of the same known-ready handle, measured separately",
      caching:
        "fresh encrypted input each round; ready-repeat service caches cannot be excluded; Zama uses fresh keypairs, CoFHE reuses a setup ACP",
      warmup:
        "all operation paths initialized before measurement; EIP-2929 cold accesses still apply per transaction",
      sequencing:
        "sequential deployments, concurrent async platform workers per warmup/measured operation; all workers settle before the next operation; seeded balanced launch/nonce assignment order; one nonce allocator from the first deployment through the final round, so on-chain execution remains nonce-ordered; stop at the first failed comparison",
      baseline:
        "same transaction/getter/equality endpoint, with plaintext returned directly; encryption and authenticated decryption are not applicable",
      temporalControl:
        "nearby operation-matched comparisons and balanced order reduce, but cannot eliminate, public-network load and slot-phase confounding",
      receiptPolling:
        "installed hardhat-ethers provider polls every 500 ms plus RPC round-trip time",
      resultRead:
        "EIP-1898 eth_call pinned to the receipt block hash with requireCanonical=true; no latest-state fallback",
      deploymentBytecodeRead:
        "EIP-1898 eth_getCode pinned to deployment receipt block hash; transport errors retried up to five attempts and block-not-found propagation errors retried within the original setup deadline; every attempt retained; empty code and non-canonical blocks fail",
      retrievalRetry:
        "up to five read/retrieval attempts on transport errors, Zama SDK user-decrypt ACL check denials or HTTP 503 USER_DECRYPT responses (including SDK schema errors); receipt-block-not-found and the specific 503 gateway ciphertext-not-ready USER_DECRYPT response can retry beyond five attempts within the original observation deadline; receipt reads always use the same canonical block hash, without latest fallback; exponential backoff capped at 8 seconds; Zama attempts receive only the remaining time budget; every attempt and wait included in timing and traces; persistent failures still abort; never retry application mutations, other authorization errors or plaintext mismatches",
      ancillaryFailure:
        "a failed already-ready repeat is retained without replacing it or aborting successful primary completions; report actual successful ready-repeat n and failure counts separately",
      unobservable: {
        coprocessorQueueMs: null,
        pureFheEvaluationMs: null,
        kmsOrMpcComputeMs: null,
        interServiceTransportMs: null,
        serverProofVerificationComputeMs: null,
      },
      sdkStages:
        "client-observed API boundaries, NOT pure internal service compute durations",
      previews:
        "eth_call symbolic simulations only; no persisted coprocessor request and no completion claim",
      fhenixWorkload:
        "mul_scalar encrypts the constant; mean encrypts divisor 2, unlike Zama plaintext scalar operations",
    },
    setup,
    samples,
  };
  return report as typeof report & ReportResults;
}

export function saveLifecycleReport(report: LifecycleReport, output: string) {
  const writeReport = () => writeLifecycleJson(path.join(output, "report.json"), report);
  const {
    selectedPlatforms: selected,
    samples,
    runs,
    scheduleSeed,
  } = report as {
    selectedPlatforms: Platform[];
    samples: Sample[];
    runs: number;
    scheduleSeed: string;
  };
  report.summary = selected.flatMap((platform) =>
    operations.map((operation) => {
      const measured = samples.filter(
        (s) =>
          s.platform === platform && s.operation === operation && !s.warmup,
      );
      const stats = {
        platform,
        operation,
        attempted: measured.length,
        validated: measured.filter((s) => s.status === "ok").length,
        failed: measured.filter((s) => s.status === "error").length,
        readyDecryptFailed: measured.filter((s) => s.readyDecryptError).length,
      } as Summary;
      for (const metric of metrics) {
        // Confirmed gas/inclusion samples remain usable even if decrypt times out.
        stats[metric] = summarize(
          measured.flatMap((s) =>
            s[metric] === undefined ? [] : [s[metric]!],
          ),
        );
      }
      return stats;
    }),
  );
  writeReport();
  fs.writeFileSync(
    path.join(output, "stages.jsonl"),
    samples
      .flatMap((sample) =>
        sample.stages.map((stage) =>
          JSON.stringify({
            platform: sample.platform,
            operation: sample.operation,
            run: sample.run,
            warmup: sample.warmup,
            ...stage,
          }),
        ),
      )
      .join("\n") + "\n",
  );
  const fmt = (stats: Statistics) =>
    stats.mean === null
      ? "n/a"
      : `${stats.mean.toFixed(1)} +/- ${stats.stddev === null ? "n/a" : stats.stddev.toFixed(1)}`;
  const lines = [
    "# Sepolia observable operational performance benchmark",
    "",
    "Times in milliseconds; mean +/- sample standard deviation.",
    "One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.",
    `Measured rounds requested: ${runs}; schedule seed: ${scheduleSeed}; platforms: ${selected.join(", ")}.`,
    "Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.",
    "Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.",
    "",
    "| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Receipt to validated plaintext | Already-ready decrypt |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const row of report.summary)
    lines.push(
      `| ${row.platform} | ${row.operation} | ${row.validated}/${row.attempted} | ${fmt(row.gasUsed)} | ${fmt(row.inputPreparationMs)} | ${fmt(row.confirmationMs)} | ${fmt(row.transactionToValidatedPlaintextMs)} | ${fmt(row.postReceiptToValidatedPlaintextMs)} | ${fmt(row.alreadyReadyDecryptMs)} |`,
    );
  lines.push(
    "",
    "## SDK stages",
    "",
    "Successful stage durations only, excluding warmup. Rows overlap and must not be added to total latency.",
    "SDK retrieval includes polling and retry backoff. Failed attempts remain in raw traces and total completion time; successful-stage rows alone omit their durations.",
    "",
    "| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |",
    "|---|---|---|---:|---:|",
  );
  report.stageSummary = [];
  for (const platform of selected) {
    for (const operation of operations) {
      const spans = samples
        .filter(
          (s) =>
            s.platform === platform && s.operation === operation && !s.warmup,
        )
        .flatMap((s) => s.stages)
        .filter((s) => s.status === "ok" && !s.stage.endsWith("http_headers"));
      for (const stage of [...new Set(spans.map((s) => s.stage))]) {
        const stats = summarize(
          spans.filter((s) => s.stage === stage).map((s) => s.durationMs),
        );
        report.stageSummary.push({ platform, operation, stage, ...stats });
        lines.push(
          `| ${platform} | ${operation} | ${stage} | ${stats.n} | ${fmt(stats)} |`,
        );
      }
    }
  }
  lines.push(
    "",
    "Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.",
    "Receipt to validated plaintext includes getter RPCs, authorization, SDK retrieval/polling, retries and validation; it is not isolated FHE computation or backend decryption time.",
    "Timeout/failure observations are retained, not silently converted to successful latency samples.",
  );
  fs.writeFileSync(path.join(output, "summary.md"), lines.join("\n") + "\n");
  writeReport();
}
