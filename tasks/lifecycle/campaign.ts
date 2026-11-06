import fs from "node:fs";
import path from "node:path";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Contract } from "ethers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadAccounts, acquireAccountLock } from "../experiments/accounts";
import { TimingTrace, deadline } from "../lib/lifecycleTiming";
import { buildLifecycleSchedule } from "../lib/lifecycleSchedule";
import { runConcurrentWorkers } from "../lib/lifecycleConcurrent";
import { createNonceAllocator } from "../lib/lifecycleNonce";
import { readDeploymentBytecode } from "../lib/lifecycleResult";
import { makeAdapter } from "./adapters";
import { runProcessLifecycleCampaign } from "./processCampaign";
import { safeError } from "./errors";
import { createLifecycleReport, saveLifecycleReport } from "./report";
import {
  createMeasurementRunner,
  collectBlockMetadata,
  type MeasurementRequest,
} from "./measurement";
import {
  operations,
  contracts,
  type BenchmarkArgs,
  type Platform,
  type Sample,
  type PlatformContext,
} from "./types";

// Starts the selected lifecycle campaign mode.
// Locks the account file for the duration of the run when one is supplied.
export async function runLifecycleCampaign(
  args: BenchmarkArgs,
  hre: HardhatRuntimeEnvironment,
) {
  const release = args.accountsFile ? acquireAccountLock(args.accountsFile) : () => {};

  try {
    if (args.width !== undefined && (args.execution === "async" || ![16, 128].includes(args.width))) {
      throw new Error("Uniform width must be 16 or 128 and requires process isolation");
    }
    if (args.execution && !["processes", "async"].includes(args.execution)) throw new Error("Invalid execution mode");

    return args.execution !== "async" ? await runProcessLifecycleCampaign(args, hre) : await runCampaign(args, hre);
  } finally { release(); }
}


// Sets up the platforms and runs the legacy asynchronous workload.
// Records warmup and measured comparisons in the campaign report.
async function runCampaign(
  args: BenchmarkArgs,
  hre: HardhatRuntimeEnvironment,
) {
  if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 1000)
    throw new Error("Invalid runs");
  if (!Number.isInteger(args.timeout) || args.timeout < 10)
    throw new Error("Invalid timeout");

  const setupTimeout = args.setupTimeout ?? args.timeout;

  if (!Number.isInteger(setupTimeout) || setupTimeout < 10)
    throw new Error("Invalid setup timeout");
  if (!["all", "both", "baseline", "zama", "fhenix"].includes(args.platform))
    throw new Error("Invalid platform");

  const network = await hre.ethers.provider.getNetwork();

  if (network.chainId !== 11155111n)
    throw new Error("This benchmark is restricted to real Sepolia (11155111)");

  const localSigners = args.accountsFile ? loadAccounts(args.accountsFile, hre.ethers.provider) : undefined;

  if (localSigners && localSigners.length < 3) throw new Error("Need three saved platform accounts");

  const signer = (localSigners?.[0] ?? (await hre.ethers.getSigners())[0]) as HardhatEthersSigner;

  if (!signer) throw new Error("Missing configured Sepolia signer");

  const output = path.resolve(
    args.outputDir ||
      `logs/energy-lifecycle-${new Date().toISOString().replace(/[:.]/g, "-")}`,
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
        : [args.platform as Platform];
  const platformSigners = new Map(selected.map(platform => [platform, localSigners
    ? localSigners[({baseline:0,zama:1,fhenix:2})[platform]] as unknown as HardhatEthersSigner : signer]));
  const schedule = buildLifecycleSchedule(
    args.runs,
    selected,
    operations,
    String(args.seed),
  );

  fs.writeFileSync(
    path.join(output, "schedule.json"),
    JSON.stringify({ seed: args.seed, schedule }, null, 2),
  );

  const timeoutMs = args.timeout * 1000;
  const setupTimeoutMs = setupTimeout * 1000;
  const report = createLifecycleReport(
    args,
    hre,
    signer,
    selected,
    schedule,
    setup,
    samples,
  );
  // Persists the current campaign report.
  // Writes it to the configured output directory.
  const save = () => saveLifecycleReport(report, output);

  report.platformOwners = Object.fromEntries([...platformSigners].map(([p,s])=>[p,s.address]));
  report.signerMode = localSigners ? "independent_platform_accounts" : "shared_account";

  if (localSigners) report.methodology.sequencing =
    "Sequential deployments; one distinct funded signer and nonce allocator per platform; concurrent operation workers with seeded balanced launch order; all workers settle before the next operation; stop at first failed comparison. Input preparation precedes each worker submission and is not synchronized across platforms.";

  save();
  console.log(`Lifecycle benchmark: ${output}\nOwner: ${signer.address}`);
  console.log(`Observation timeouts: setup/warmup=${setupTimeout}s; measured=${args.timeout}s (per stage)`);

  const fee = await hre.ethers.provider.getFeeData();

  report.initialBalanceWei = String(
    await hre.ethers.provider.getBalance(signer.address),
  );
  report.initialGasPriceWei = String(fee.gasPrice);
  console.log(
    `Balance: ${hre.ethers.formatEther(BigInt(report.initialBalanceWei))} ETH`,
  );
  await hre.run("compile");

  // Raw RPC avoids ethers' short-lived request cache. Keep this cursor across
  // deployments, warmups and measured rounds rather than rereading stale nodes.
  const cursors = new Map<string, ReturnType<typeof createNonceAllocator>>();

  for (const active of new Set(platformSigners.values())) {
    const pending = await hre.ethers.provider.send("eth_getTransactionCount", [active.address,"pending"]);

    if (localSigners) {
      const latest = await hre.ethers.provider.send("eth_getTransactionCount", [active.address,"latest"]);

      if (BigInt(pending)!==BigInt(latest)) throw new Error(`Pending transactions for ${active.address}`);
      if (await hre.ethers.provider.getBalance(active.address)===0n) throw new Error(`Fund ${active.address}`);
    }

    cursors.set(active.address,createNonceAllocator(Number(BigInt(pending))));
  }

  const contexts = new Map<Platform, PlatformContext>();
  const measureOperation = createMeasurementRunner({
    hre,
    signer,
    timeoutMs,
    setupTimeoutMs,
    samples,
    contexts,
    platformSigners,
  });

  // Runs one platform operation through the measurement runner.
  // Returns the sample for the current comparison.
  async function measure(request: MeasurementRequest) {
    const sample = await measureOperation(request);

    console.log(
      `${sample.warmup ? "warmup" : `run ${sample.run}`} ${sample.platform} ${sample.operation}: ${sample.status}; receipt=${sample.confirmationMs?.toFixed(0) ?? "n/a"} ms; completion=${sample.transactionToValidatedPlaintextMs?.toFixed(0) ?? "n/a"} ms; ready=${sample.alreadyReadyDecryptMs?.toFixed(0) ?? "n/a"} ms${sample.error ? `; ${sample.error}` : ""}`,
    );

    return sample;
  }

  for (const platform of selected) {
    const signer = platformSigners.get(platform)!;
    const nonces = cursors.get(signer.address)!;
    const timing = new TimingTrace();
    const entry: any = { platform, stages: timing.stages };

    setup.push(entry);

    try {
      console.log(`${platform}: deploying ${contracts[platform]}...`);

      const factory = await hre.ethers.getContractFactory(
        contracts[platform],
        signer,
      );

      entry.transactionNonce = nonces.reserve();

      const contract = await factory.deploy({ nonce: entry.transactionNonce });
      const deploymentTx = contract.deploymentTransaction()!;

      entry.transactionHash = deploymentTx.hash;
      save();

      const deploymentReceipt = await deploymentTx.wait(1, setupTimeoutMs);

      if (!deploymentReceipt || deploymentReceipt.status !== 1)
        throw new Error("Deployment failed");

      entry.address = await contract.getAddress();
      entry.blockNumber = deploymentReceipt.blockNumber;
      entry.gasUsed = String(deploymentReceipt.gasUsed);
      entry.gasCostWei = String(
        deploymentReceipt.gasUsed * deploymentReceipt.gasPrice,
      );
      entry.deployedBytecodeKeccak256 = hre.ethers.keccak256(
        await readDeploymentBytecode(
          (method, params) => hre.ethers.provider.send(method, params),
          entry.address,
          deploymentReceipt.blockHash,
          timing,
          setupTimeoutMs,
        ),
      );
      save();
      console.log(
        `${platform}: deployed ${entry.address}; initializing SDK...`,
      );

      const adapter = await deadline(
        () =>
          makeAdapter(platform, hre, signer, entry.address, timeoutMs, timing),
        setupTimeoutMs,
        "SDK initialization",
      );

      contexts.set(platform, {
        contract: contract as unknown as Contract,
        adapter,
        last: 0n,
        total: 0n,
      });
      entry.status = "initialized";
    } catch (error) {
      entry.status = "error";
      entry.error = safeError(error);
      contexts.delete(platform);
      console.error(`${platform} setup: ${entry.error}`);
      report.abortedAt = new Date().toISOString();
      report.complete = false;
      save();

      throw new Error(`Campaign deployment/setup failed: ${entry.error}`);
    }

    save();
  }

  const warmupSchedule = buildLifecycleSchedule(1, selected, operations, String(args.seed));
  const comparisons = [
    ...warmupSchedule.map((comparison) => ({ ...comparison, run: 0, warmup: true })),
    ...schedule.map((comparison) => ({ ...comparison, warmup: false })),
  ];

  for (const { run, operation, order, warmup } of comparisons) {
    try {
      const results = await runConcurrentWorkers(order, (platform, position) =>
        measure({
          platform,
          operation,
          run,
          value: operation === "notarize" ? BigInt(42 + run) : BigInt(3 + run),
          warmup,
          orderPosition: position + 1,
          nonce: cursors.get(platformSigners.get(platform)!.address)!.reserve(),
        }),
      );

      if (warmup) {
        for (const sample of results) {
          const entry = setup.find((entry) => entry.platform === sample.platform)!;

          if (sample.status !== "ok") {
            entry.status = "error";
            entry.error = `Warmup ${operation} failed: ${sample.error}`;
          } else if (operation === operations[operations.length - 1]) {
            entry.status = "ok";
          }
        }
      }

      await Promise.all(
        results.map((sample) => collectBlockMetadata(hre, sample)),
      );
      save();

      if (results.some((sample) => sample.status !== "ok")) {
        throw new Error(
          `${warmup ? "Warmup" : "Measured"} campaign stopped on failure after all current workers settled; all observations retained`,
        );
      }
    } catch (error) {
      report.abortedAt = new Date().toISOString();
      report.complete = false;
      save();

      throw error;
    }
  }

  report.completedAt = new Date().toISOString();
  report.complete = selected.every((p) =>
    operations.every(
      (op) =>
        samples.filter(
          (s) =>
            !s.warmup &&
            s.platform === p &&
            s.operation === op &&
            s.status === "ok",
        ).length === args.runs,
    ),
  );
  save();
  console.log(`Reports: ${output}\nComplete: ${report.complete}`);

  if (!report.complete)
    throw new Error(
      "Incomplete lifecycle benchmark; retained errors are in report.json",
    );
}
