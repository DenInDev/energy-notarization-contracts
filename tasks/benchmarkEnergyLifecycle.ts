import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import "@nomicfoundation/hardhat-ethers";
import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Contract, ContractTransactionResponse } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk-current";
import { getChainById } from "@cofhe/sdk-current/chains";
import { TimingTrace, deadline, observeHttp, summarize, validatePlaintext } from "./lib/lifecycleTiming";
import { buildLifecycleSchedule, type LifecyclePlatform, type LifecycleOperation } from "./lib/lifecycleSchedule";
import { readLifecycleResult } from "./lib/lifecycleResult";
import { retryLifecycleRead } from "./lib/lifecycleReadRetry";

type Platform = LifecyclePlatform;
type Operation = LifecycleOperation;
const operations: Operation[] = ["notarize", "add", "mul_scalar", "mean", "max"];
const contracts = {
  baseline: "EnergyNotarizationPlainTest",
  zama: "EnergyNotarizationFHETest",
  fhenix: "EnergyLifecycleCoFHE",
};

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
];

function sha256File(file: string): string {
  return createHash("sha256").update(fs.readFileSync(path.resolve(file))).digest("hex");
}

type Sample = {
  platform: Platform;
  operation: Operation;
  run: number;
  warmup: boolean;
  startedAt: string;
  status: "pending" | "ok" | "error";
  stages: TimingTrace["stages"];
  transactionHash?: string;
  blockNumber?: number;
  blockHash?: string;
  blockTimestamp?: number;
  blockGasUsed?: string;
  blockGasLimit?: string;
  blockTargetUtilization?: number;
  gasUsed?: number;
  effectiveGasPriceWei?: string;
  gasCostWei?: string;
  inputPreparationMs?: number;
  confirmationMs?: number;
  postReceiptToValidatedPlaintextMs?: number;
  transactionToValidatedPlaintextMs?: number;
  alreadyReadyDecryptMs?: number;
  plaintext?: string;
  expectedPlaintext: string;
  outputHandle?: string;
  error?: string;
  readyDecryptError?: string;
  metadataError?: string;
  completedAt?: string;
  transactionStartedAt?: string;
  receiptObservedAt?: string;
  plaintextValidatedAt?: string;
  orderPosition?: number;
  resultRepresentation?: "plaintext" | "ciphertext_handle";
};

type Adapter = {
  encrypt(value: bigint, trace: TimingTrace): Promise<unknown[]>;
  decrypt(handle: bigint | string, trace: TimingTrace, phase: "completion" | "already_ready"): Promise<unknown>;
};

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https?:\/\/[^\s)]+/g, "[endpoint]").slice(0, 1800);
}

function progress(trace: TimingTrace, phase: string) {
  return (event: any) =>
    trace.event(`${phase}.sdk_progress`, {
      type: event.type,
      operation: event.operation,
      step: event.step,
      retryCount: event.retryCount,
      elapsed: event.elapsed,
      jobId: event.jobId,
      requestId: event.requestId,
    });
}

async function makeAdapter(
  platform: Platform,
  hre: HardhatRuntimeEnvironment,
  signer: any,
  address: string,
  timeoutMs: number,
  trace: TimingTrace,
): Promise<Adapter> {
  if (platform === "baseline") return { encrypt: async (value) => [value], decrypt: async (value) => value };
  if (platform === "zama") {
    const instance = await trace.span("setup.sdk_initialization", () =>
      createInstance({
        ...SepoliaConfig,
        network: (hre.network.config as any).url,
      }),
    );
    return {
      async encrypt(value, timing) {
        const zkProof = await timing.span("encrypt.local_ciphertext_and_zkproof", () => {
          return instance.createEncryptedInput(address, signer.address).add64(value).generateZKProof();
        });
        const encrypted = await timing.span("encrypt.remote_input_approval", () =>
          instance.requestZKProofVerification(zkProof, {
            timeout: timeoutMs,
            signal: AbortSignal.timeout(timeoutMs),
            onProgress: progress(timing, "encrypt"),
          }),
        );
        return [encrypted.handles[0], encrypted.inputProof];
      },
      async decrypt(handle, timing, phase) {
        const handleHex = hre.ethers.toBeHex(handle, 32) as `0x${string}`;
        const auth = await timing.span(`${phase}.local_keypair_and_authorization`, async () => {
          const keys = instance.generateKeypair();
          // Small backward offset prevents server clock skew from rejecting a future validity start.
          const start = Math.floor(Date.now() / 1000) - 60;
          const eip712 = instance.createEIP712(keys.publicKey, [address], start, 1);
          const signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message,
          );
          return { ...keys, start, signature };
        });
        const result = await timing.span(`${phase}.sdk_user_decrypt`, () =>
          retryLifecycleRead(timing, phase, timeoutMs, () =>
            instance.userDecrypt(
              [{ handle: handleHex, contractAddress: address }],
              auth.privateKey,
              auth.publicKey,
              auth.signature,
              [address],
              signer.address,
              auth.start,
              1,
              { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs), onProgress: progress(timing, phase) },
            ),
          ),
        );
        return result[handleHex];
      },
    };
  }
  const { createCofheClient, createCofheConfig } = require("@cofhe/sdk-current/node");
  const { HardhatSignerAdapter } = require("@cofhe/sdk-current/adapters");
  const client: CofheClient = createCofheClient(createCofheConfig({ supportedChains: [getChainById(11155111)] }));
  await trace.span("setup.sdk_connection", async () => {
    const { publicClient, walletClient } = await HardhatSignerAdapter(signer);
    await client.connect(publicClient, walletClient);
  });
  await trace.span("setup.authenticated_acp", () => client.acp.getOrCreateSelfACP());
  return {
    async encrypt(value, timing) {
      const stepStarts = new Map<string, number>();
      const encrypted = await timing.span("encrypt.sdk_total", () =>
        observeHttp(timing, "encrypt", () =>
          client
            .encryptInputs([Encryptable.uint64(value)])
            .setConsumingContract(address)
            .onStep((step, context) => {
              const at = timing.now();
              if (context?.isStart) stepStarts.set(step, at);
              const start = stepStarts.get(step);
              if (context?.isEnd && start !== undefined) {
                timing.stages.push({
                  stage: `encrypt.sdk_observed.${step}`,
                  startMs: start,
                  durationMs: at - start,
                  status: "ok",
                  detail: { sdkDurationMs: context.duration },
                });
              }
              timing.event(`encrypt.sdk_stage.${step}`, {
                isStart: context?.isStart,
                isEnd: context?.isEnd,
                sdkDurationMs: context?.duration,
                usedWorker: context?.usedWorker,
                fheKeyFetchedFromCoFHE: context?.fheKeyFetchedFromCoFHE,
                crsFetchedFromCoFHE: context?.crsFetchedFromCoFHE,
              });
            })
            .execute(),
        ),
      );
      return [...encrypted];
    },
    async decrypt(handle, timing, phase) {
      return timing.span(`${phase}.sdk_sealoutput_and_unseal`, () =>
        retryLifecycleRead(timing, phase, timeoutMs, () =>
          observeHttp(timing, phase, () =>
            client
              .decryptForView(handle, FheTypes.Uint64)
              .onPoll((context) => timing.event(`${phase}.sdk_poll`, { ...context }))
              .set404RetryTimeout(timeoutMs)
              .execute(),
          ),
        ),
      );
    },
  };
}

task("benchmark:energy:lifecycle", "Sepolia SDK stages and transaction-to-validated-plaintext latency")
  .addOptionalParam("runs", "Measured rounds per platform", 50, types.int)
  .addOptionalParam("platform", "all, both, baseline, zama or fhenix", "all")
  .addOptionalParam("seed", "Recorded seed for randomized position-balanced interleaving", "20260917")
  .addOptionalParam("timeout", "SDK/receipt observation deadline in seconds", 180, types.int)
  .addOptionalParam("outputDir", "Output folder", "")
  .setAction(async (args, hre) => {
    if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 1000) throw new Error("Invalid runs");
    if (!Number.isInteger(args.timeout) || args.timeout < 10) throw new Error("Invalid timeout");
    if (!["all", "both", "baseline", "zama", "fhenix"].includes(args.platform)) throw new Error("Invalid platform");
    const network = await hre.ethers.provider.getNetwork();
    if (network.chainId !== 11155111n) throw new Error("This benchmark is restricted to real Sepolia (11155111)");
    const [signer] = await hre.ethers.getSigners();
    if (!signer) throw new Error("Missing configured Sepolia signer");
    const output = path.resolve(
      args.outputDir || `logs/energy-lifecycle-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    );
    fs.mkdirSync(output, { recursive: true });
    if (fs.existsSync(path.join(output, "report.json")))
      throw new Error("Output already contains a report; use a new folder");
    const samples: Sample[] = [];
    const setup: Record<string, unknown>[] = [];
    const selected: Platform[] =
      args.platform === "all"
        ? ["baseline", "zama", "fhenix"]
        : args.platform === "both"
          ? ["zama", "fhenix"]
          : [args.platform];
    const schedule = buildLifecycleSchedule(args.runs, selected, operations, String(args.seed));
    fs.writeFileSync(path.join(output, "schedule.json"), JSON.stringify({ seed: args.seed, schedule }, null, 2));
    const timeoutMs = args.timeout * 1000;
    const report: any = {
      schemaVersion: 6,
      studyScope: "observable operational performance of public Sepolia deployments; not isolated TFHE computation",
      startedAt: new Date().toISOString(),
      chainId: "11155111",
      owner: signer.address,
      rpcHost: new URL((hre.network.config as any).url).hostname,
      runs: args.runs,
      selectedPlatforms: selected,
      scheduleSeed: args.seed,
      schedule,
      sdkVersions: { zama: require("@zama-fhe/relayer-sdk/package.json").version, fhenix: "0.7.1" },
      contractLibraries: { zama: "@fhevm/solidity 0.11.1", fhenix: "@fhenixprotocol/cofhe-contracts 0.2.0" },
      contractNames: contracts,
      compiler: { version: "0.8.27", optimizer: { enabled: true, runs: 800 }, evmVersion: "cancun", viaIR: false },
      sourceSha256: Object.fromEntries(reproducibilityFiles.map((file) => [file, sha256File(file)])),
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
        clock: "performance.now (monotonic client clock); ISO wall time is metadata only",
        confirmation: "before contract invocation to observation of successful receipt (1 confirmation; not finality)",
        completion:
          "before contract invocation to equality-validated authenticated plaintext; excludes input preparation",
        postReceipt: "receipt observation to validated plaintext, including handle read, authorization and SDK decrypt",
        alreadyReady: "second authenticated SDK decrypt of the same known-ready handle, measured separately",
        caching:
          "fresh encrypted input each round; ready-repeat service caches cannot be excluded; Zama uses fresh keypairs, CoFHE reuses a setup ACP",
        warmup:
          "all operation paths initialized before measurement; EIP-2929 cold accesses still apply per transaction",
        sequencing:
          "sequential individual transactions; seeded randomized Latin-block platform order for each operation; all selected configurations interleaved; no batch submission",
        baseline:
          "same transaction/getter/equality endpoint, with plaintext returned directly; encryption and authenticated decryption are not applicable",
        temporalControl:
          "nearby operation-matched comparisons and balanced order reduce, but cannot eliminate, public-network load and slot-phase confounding",
        receiptPolling: "installed hardhat-ethers provider polls every 500 ms plus RPC round-trip time",
        resultRead:
          "EIP-1898 eth_call pinned to the receipt block hash with requireCanonical=true; no latest-state fallback",
        retrievalRetry:
          "up to five read/retrieval attempts on transport errors only; exponential 1/2/4/8-second backoff within the original observation deadline; every attempt and wait included in timing and traces; never retry application mutations, authorization errors or plaintext mismatches",
        ancillaryFailure:
          "a failed already-ready repeat is retained without replacing it or aborting successful primary completions; report actual successful ready-repeat n and failure counts separately",
        unobservable: {
          coprocessorQueueMs: null,
          pureFheEvaluationMs: null,
          kmsOrMpcComputeMs: null,
          interServiceTransportMs: null,
          serverProofVerificationComputeMs: null,
        },
        sdkStages: "client-observed API boundaries, NOT pure internal service compute durations",
        previews: "eth_call symbolic simulations only; no persisted coprocessor request and no completion claim",
        fhenixWorkload:
          "mul_scalar encrypts the constant; mean encrypts divisor 2, unlike Zama plaintext scalar operations",
      },
      setup,
      samples,
    };
    function save() {
      report.summary = selected.flatMap((platform) =>
        operations.map((operation) => {
          const measured = samples.filter((s) => s.platform === platform && s.operation === operation && !s.warmup);
          const stats: any = {
            platform,
            operation,
            attempted: measured.length,
            validated: measured.filter((s) => s.status === "ok").length,
            failed: measured.filter((s) => s.status === "error").length,
            readyDecryptFailed: measured.filter((s) => s.readyDecryptError).length,
          };
          for (const metric of [
            "inputPreparationMs",
            "gasUsed",
            "confirmationMs",
            "postReceiptToValidatedPlaintextMs",
            "transactionToValidatedPlaintextMs",
            "alreadyReadyDecryptMs",
          ] as const) {
            // Confirmed gas/inclusion samples remain usable even if decrypt times out.
            stats[metric] = summarize(measured.flatMap((s) => (s[metric] === undefined ? [] : [s[metric]!])));
          }
          return stats;
        }),
      );
      fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
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
      const fmt = (stats: any) =>
        stats.mean === null
          ? "n/a"
          : `${stats.mean.toFixed(1)} +/- ${stats.stddev === null ? "n/a" : stats.stddev.toFixed(1)}`;
      const lines = [
        "# Sepolia observable operational performance benchmark",
        "",
        "Times in milliseconds; mean +/- sample standard deviation.",
        "One observed inclusion confirmation is not consensus finality. See report.json for boundaries and unavailable internal timings.",
        `Measured rounds requested: ${args.runs}; schedule seed: ${args.seed}; platforms: ${selected.join(", ")}.`,
        "Pure backend FHE evaluation, queueing and KMS compute are unobservable, not inferred from completion tails.",
        "Baseline completion means equality-validated plaintext from its getter; encryption/decryption stages are not applicable.",
        "",
        "| Platform | Operation | Validated / attempted | Gas | Input preparation | Receipt | Tx to validated plaintext | Post-receipt | Already-ready decrypt |",
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
        "",
        "| Platform | Operation | SDK stage | n | Mean +/- sample std (ms) |",
        "|---|---|---|---:|---:|",
      );
      report.stageSummary = [];
      for (const platform of selected) {
        for (const operation of operations) {
          const spans = samples
            .filter((s) => s.platform === platform && s.operation === operation && !s.warmup)
            .flatMap((s) => s.stages)
            .filter((s) => s.status === "ok" && !s.stage.endsWith("http_headers"));
          for (const stage of [...new Set(spans.map((s) => s.stage))]) {
            const stats = summarize(spans.filter((s) => s.stage === stage).map((s) => s.durationMs));
            report.stageSummary.push({ platform, operation, stage, ...stats });
            lines.push(`| ${platform} | ${operation} | ${stage} | ${stats.n} | ${fmt(stats)} |`);
          }
        }
      }
      lines.push(
        "",
        "Already-ready decrypt is a separate second request and may benefit from service caching. Null/unavailable durations are not zero.",
        "Timeout/failure observations are retained, not silently converted to successful latency samples.",
      );
      fs.writeFileSync(path.join(output, "summary.md"), lines.join("\n") + "\n");
      fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    }
    save();
    console.log(`Lifecycle benchmark: ${output}\nOwner: ${signer.address}`);
    const fee = await hre.ethers.provider.getFeeData();
    report.initialBalanceWei = String(await hre.ethers.provider.getBalance(signer.address));
    report.initialGasPriceWei = String(fee.gasPrice);
    console.log(`Balance: ${hre.ethers.formatEther(BigInt(report.initialBalanceWei))} ETH`);
    await hre.run("compile");
    const contexts = new Map<Platform, { contract: Contract; adapter: Adapter; last: bigint; total: bigint }>();

    async function measure(
      platform: Platform,
      operation: Operation,
      run: number,
      value: bigint,
      warmup: boolean,
      orderPosition?: number,
    ) {
      const context = contexts.get(platform)!;
      const timing = new TimingTrace();
      const expected =
        operation === "notarize"
          ? value
          : operation === "add"
            ? context.total + context.last
            : operation === "mul_scalar"
              ? context.last * value
              : operation === "mean"
                ? (context.last + context.total) / 2n
                : context.last > context.total
                  ? context.last
                  : context.total;
      const sample: Sample = {
        platform,
        operation,
        run,
        warmup,
        startedAt: new Date().toISOString(),
        status: "pending",
        stages: timing.stages,
        expectedPlaintext: expected.toString(),
        orderPosition,
        resultRepresentation: platform === "baseline" ? "plaintext" : "ciphertext_handle",
      };
      samples.push(sample);
      let receipt: any;
      try {
        const inputStart = timing.now();
        const input =
          operation === "notarize"
            ? await deadline(() => context.adapter.encrypt(value, timing), timeoutMs, "input preparation")
            : [];
        if (operation === "notarize" && platform !== "baseline") sample.inputPreparationMs = timing.now() - inputStart;
        sample.transactionStartedAt = new Date().toISOString();
        const txStart = timing.now();
        const tx: ContractTransactionResponse = await timing.span("transaction.invoke_sign_and_submit", () => {
          if (operation === "notarize") return context.contract.addEnergyEntry(...input);
          if (operation === "add") return context.contract.addLastEntryToEncryptedTotal();
          if (operation === "mul_scalar") return context.contract.multiplyLastEntryByConstant(value);
          if (operation === "mean") return context.contract.meanLastEntryAndEncryptedTotal();
          return context.contract.maxLastEntryAndEncryptedTotal();
        });
        sample.transactionHash = tx.hash;
        receipt = await timing.span("transaction.wait_receipt", () => tx.wait(1, timeoutMs));
        const observedReceipt = timing.now();
        sample.receiptObservedAt = new Date().toISOString();
        if (!receipt || receipt.status !== 1) throw new Error("Transaction did not succeed");
        sample.confirmationMs = observedReceipt - txStart;
        sample.blockNumber = receipt.blockNumber;
        sample.blockHash = receipt.blockHash;
        sample.gasUsed = Number(receipt.gasUsed);
        sample.effectiveGasPriceWei = String(receipt.gasPrice);
        sample.gasCostWei = String(receipt.gasUsed * receipt.gasPrice);
        // Apply the plaintext model on successful receipt, even if remote decryption later fails.
        if (operation === "notarize") context.last = value;
        if (operation === "add") context.total = expected;
        const handle = await timing.span("completion.read_persisted_handle", () => {
          const getter =
            operation === "notarize"
              ? "getLastEntryValue"
              : operation === "add"
                ? "getEncryptedTotalHandle"
                : "getLastResult";
          return deadline(
            () =>
              retryLifecycleRead(timing, "completion.handle", timeoutMs, () =>
                readLifecycleResult(
                  (method, params) => hre.ethers.provider.send(method, params),
                  context.contract.interface,
                  String(context.contract.target),
                  signer.address,
                  getter,
                  receipt.blockHash,
                ),
              ),
            timeoutMs,
            "receipt-pinned result read",
          );
        });
        if (platform !== "baseline") sample.outputHandle = hre.ethers.toBeHex(handle, 32);
        const plaintext =
          platform === "baseline"
            ? handle
            : await deadline(
                () => context.adapter.decrypt(handle, timing, "completion"),
                timeoutMs,
                "completion decrypt",
              );
        sample.plaintext = await timing.span("completion.validate_plaintext", () =>
          validatePlaintext(plaintext, expected),
        );
        const validated = timing.now();
        sample.plaintextValidatedAt = new Date().toISOString();
        sample.transactionToValidatedPlaintextMs = validated - txStart;
        sample.postReceiptToValidatedPlaintextMs = validated - observedReceipt;
        sample.status = "ok";
        if (!warmup && platform !== "baseline") {
          const readyStart = timing.now();
          try {
            const again = await deadline(
              () => context.adapter.decrypt(handle, timing, "already_ready"),
              timeoutMs,
              "ready decrypt",
            );
            await timing.span("already_ready.validate_plaintext", () => validatePlaintext(again, expected));
            sample.alreadyReadyDecryptMs = timing.now() - readyStart;
          } catch (error) {
            sample.readyDecryptError = safeError(error);
          }
        }
      } catch (error) {
        sample.status = "error";
        sample.error = safeError(error);
      }
      sample.completedAt = new Date().toISOString();
      // No filesystem writes or block metadata RPCs are included in lifecycle durations.
      save();
      if (receipt) {
        try {
          const block = await hre.ethers.provider.getBlock(receipt.blockHash);
          if (!block) throw new Error("Included block unavailable");
          sample.blockTimestamp = block.timestamp;
          sample.blockGasUsed = String(block.gasUsed);
          sample.blockGasLimit = String(block.gasLimit);
          sample.blockTargetUtilization = Number(block.gasUsed) / (Number(block.gasLimit) / 2);
        } catch (error) {
          sample.metadataError = safeError(error);
        }
      }
      save();
      console.log(
        `${warmup ? "warmup" : `run ${run}`} ${platform} ${operation}: ${sample.status}; receipt=${sample.confirmationMs?.toFixed(0) ?? "n/a"} ms; completion=${sample.transactionToValidatedPlaintextMs?.toFixed(0) ?? "n/a"} ms; ready=${sample.alreadyReadyDecryptMs?.toFixed(0) ?? "n/a"} ms${sample.error ? `; ${sample.error}` : ""}`,
      );
      return sample;
    }

    for (const platform of selected) {
      const timing = new TimingTrace();
      const entry: any = { platform, stages: timing.stages };
      setup.push(entry);
      try {
        console.log(`${platform}: deploying ${contracts[platform]}...`);
        const factory = await hre.ethers.getContractFactory(contracts[platform], signer);
        const contract = await factory.deploy();
        const deploymentTx = contract.deploymentTransaction()!;
        entry.transactionHash = deploymentTx.hash;
        save();
        const deploymentReceipt = await deploymentTx.wait(1, timeoutMs);
        if (!deploymentReceipt || deploymentReceipt.status !== 1) throw new Error("Deployment failed");
        entry.address = await contract.getAddress();
        entry.blockNumber = deploymentReceipt.blockNumber;
        entry.gasUsed = String(deploymentReceipt.gasUsed);
        entry.gasCostWei = String(deploymentReceipt.gasUsed * deploymentReceipt.gasPrice);
        entry.deployedBytecodeKeccak256 = hre.ethers.keccak256(
          await hre.ethers.provider.getCode(entry.address, deploymentReceipt.blockNumber),
        );
        save();
        console.log(`${platform}: deployed ${entry.address}; initializing SDK...`);
        const adapter = await deadline(
          () => makeAdapter(platform, hre, signer, entry.address, timeoutMs, timing),
          timeoutMs,
          "SDK initialization",
        );
        contexts.set(platform, { contract: contract as unknown as Contract, adapter, last: 0n, total: 0n });
        for (const operation of operations) {
          const sample = await measure(platform, operation, 0, operation === "notarize" ? 42n : 3n, true);
          if (sample.status !== "ok") throw new Error(`Warmup ${operation} failed: ${sample.error}`);
        }
        entry.status = "ok";
      } catch (error) {
        entry.status = "error";
        entry.error = safeError(error);
        contexts.delete(platform);
        console.error(`${platform} setup: ${entry.error}`);
      }
      save();
    }
    if (contexts.size !== selected.length) {
      report.abortedAt = new Date().toISOString();
      report.complete = false;
      save();
      throw new Error("Campaign setup failed; no measured rounds started. See retained setup/warmup errors");
    }
    for (const { run, operation, order } of schedule) {
      for (const [position, platform] of order.entries()) {
        if (!contexts.has(platform)) continue;
        const sample = await measure(
          platform,
          operation,
          run,
          operation === "notarize" ? BigInt(42 + run) : BigInt(3 + run),
          false,
          position + 1,
        );
        if (sample.status !== "ok") {
          // Preserve the failed attempt and stop the whole interleaved campaign.
          report.abortedAt = new Date().toISOString();
          report.complete = false;
          save();
          throw new Error(
            "Interleaved campaign stopped on failure; do not silently replace or discard this observation",
          );
        }
      }
    }
    report.completedAt = new Date().toISOString();
    report.complete = selected.every((p) =>
      operations.every(
        (op) =>
          samples.filter((s) => !s.warmup && s.platform === p && s.operation === op && s.status === "ok").length ===
          args.runs,
      ),
    );
    save();
    console.log(`Reports: ${output}\nComplete: ${report.complete}`);
    if (!report.complete) throw new Error("Incomplete lifecycle benchmark; retained errors are in report.json");
  });
