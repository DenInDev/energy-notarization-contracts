import type {} from "@nomicfoundation/hardhat-ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadAccounts } from "../experiments/accounts";
import { createNonceAllocator } from "../lib/lifecycleNonce";
import { readDeploymentBytecode, readLifecycleResult } from "../lib/lifecycleResult";
import { TimingTrace, deadline, validatePlaintext } from "../lib/lifecycleTiming";
import { makeAdapter } from "./adapters";
import { createMeasurementRunner, collectBlockMetadata, type MeasurementRequest } from "./measurement";
import { prepareSignedOperation, broadcastSignedOperation, sendRawTransactionOnce, type FeeQuote } from "./broadcast";
import { safeError } from "./errors";
import { contracts, type Platform, type PlatformContext, type Sample } from "./types";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export function startLifecycleWorker(hre: HardhatRuntimeEnvironment,
  broadcastRpc?: (method: string, params: any[]) => Promise<any>) {
  let platform: Platform, signer: HardhatEthersSigner, context: PlatformContext;
  let cursor: ReturnType<typeof createNonceAllocator>, timeoutMs: number, setupTimeoutMs: number;
  let resumeArgs: any;
  let pending: { key: string; release: ReturnType<typeof deferred<number>>; result: Promise<Sample> } | undefined;
  const emit = (type: string, data: object) => {
    // Losing the coordinator must not crash a worker before its active read/
    // receipt observation settles. In particular, handle async IPC EPIPE.
    if (process.connected) {
      try { process.send?.({ type, ...data }, () => {}); } catch { /* disconnected */ }
    }
  };
  const update = (sample: Sample) => emit("sample", { sample });
  const rpc = (method: string, params: any[]) => deadline(() => hre.ethers.provider.send(method, params),
    30000, "continuation verification RPC");
  async function verifyResume() {
    if (!resumeArgs) throw new Error("Worker has no continuation state");
    const args = resumeArgs, last = args.lastSample;
    const latest = BigInt(await rpc("eth_getTransactionCount", [signer.address, "latest"]));
    const waiting = BigInt(await rpc("eth_getTransactionCount", [signer.address, "pending"]));
    if (latest !== waiting || latest !== BigInt(args.nextNonce)) throw new Error("Continuation nonce changed");
    const receipt = await rpc("eth_getTransactionReceipt", [last.transactionHash]);
    const tx = await rpc("eth_getTransactionByHash", [last.transactionHash]);
    const canonical = receipt && await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
    if (!receipt || BigInt(receipt.status) !== 1n || canonical?.hash !== receipt.blockHash ||
        receipt.blockHash !== args.receipt.blockHash || receipt.transactionHash?.toLowerCase() !== last.transactionHash.toLowerCase() ||
        !tx || tx.hash?.toLowerCase() !== last.transactionHash.toLowerCase() ||
        Number(BigInt(tx.nonce)) !== last.transactionNonce || tx.from.toLowerCase() !== signer.address.toLowerCase() ||
        tx.to?.toLowerCase() !== args.setup.address.toLowerCase()) throw new Error("Continuation canonical receipt mismatch");
    return { verifiedAt: new Date().toISOString(), latestNonce: Number(latest), blockHash: receipt.blockHash };
  }
  async function initialize(args: any) {
    if (context) throw new Error("Worker already initialized");
    platform = args.platform; timeoutMs = args.timeoutMs; setupTimeoutMs = args.setupTimeoutMs;
    if (!Object.hasOwn(contracts, platform)) throw new Error("Unknown platform");
    if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Sepolia only");
    const index = { baseline: 0, zama: 1, fhenix: 2 }[platform];
    signer = loadAccounts(args.accountsFile, hre.ethers.provider)[index] as unknown as HardhatEthersSigner;
    if (!signer || signer.address !== args.ownerAddress) throw new Error("Saved platform signer mismatch");
    const readNonce = (tag: string) => hre.ethers.provider.send("eth_getTransactionCount", [signer.address, tag]);
    const latest = BigInt(await readNonce("latest")), waiting = BigInt(await readNonce("pending"));
    if (latest !== waiting || await hre.ethers.provider.getBalance(signer.address) === 0n)
      throw new Error("Funded signer with no pending transactions required");
    cursor = createNonceAllocator(Number(latest));
    if (args.resume) {
      resumeArgs = args.resume;
      const verified = await verifyResume();
      const trace = new TimingTrace(), head = await rpc("eth_getBlockByNumber", ["latest", false]);
      if (!head?.hash) throw new Error("Missing canonical verification head");
      const code = await readDeploymentBytecode(rpc, resumeArgs.setup.address, head.hash, trace, timeoutMs);
      if (hre.ethers.keccak256(code) !== resumeArgs.setup.deployedBytecodeKeccak256)
        throw new Error("Continuation contract bytecode changed");
      const contract = await hre.ethers.getContractAt(contracts[platform], resumeArgs.setup.address, signer);
      const adapter = await deadline(() => makeAdapter(platform, hre, signer, resumeArgs.setup.address, timeoutMs, trace),
        setupTimeoutMs, "continuation SDK initialization");
      const model = resumeArgs.model, recoveries: any[] = [];
      const last = resumeArgs.lastSample;
      const recoveredGetter = last.operation === "notarize" ? "getLastEntryValue" :
        last.operation === "add" ? "getEncryptedTotalHandle" : "getLastResult";
      for (const [getter, expected, width] of [
        ["getLastEntryValue", model.last, 16], ["getEncryptedTotalHandle", model.total, 64],
        ["getLastResult", model.result, 64],
      ] as const) {
        const handle = await readLifecycleResult(rpc, contract.interface, resumeArgs.setup.address,
          signer.address, getter, head.hash);
        const value = platform === "baseline" ? handle : await deadline(() => adapter.decrypt(handle, trace,
          "completion", timeoutMs, width), timeoutMs, "continuation state decryption");
        validatePlaintext(value, BigInt(expected));
        if (getter === recoveredGetter && last.status === "error") {
          if (last.outputHandle && hre.ethers.toBeHex(handle, 32) !== last.outputHandle)
            throw new Error("Historical result handle changed");
          recoveries.push({ platform, run: last.run, operation: last.operation,
            originalTransactionHash: last.transactionHash, plaintext: String(value), getter,
            verifiedAt: new Date().toISOString(), note: "Late recovery only; original primary failure and timing unchanged" });
        }
      }
      context = { contract, adapter, last: BigInt(model.last), total: BigInt(model.total) };
      return { platform, workerPid: process.pid, status: "ok", ...verified,
        verificationBlockHash: head.hash, stages: trace.stages, recoveries };
    }
    const trace = new TimingTrace(), entry: any = { platform, workerPid: process.pid, stages: trace.stages };
    try {
      const factory = await hre.ethers.getContractFactory(contracts[platform], signer);
      entry.transactionNonce = cursor.reserve();
      const contract = await factory.deploy({ nonce: entry.transactionNonce });
      const tx = contract.deploymentTransaction()!; entry.transactionHash = tx.hash;
      emit("setup", { entry });
      const receipt = await tx.wait(1, setupTimeoutMs);
      if (!receipt || receipt.status !== 1) throw new Error("Deployment failed");
      Object.assign(entry, { address: await contract.getAddress(), blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash, gasUsed: String(receipt.gasUsed),
        gasCostWei: String(receipt.gasUsed * receipt.gasPrice) });
      entry.deployedBytecodeKeccak256 = hre.ethers.keccak256(await readDeploymentBytecode(
        (method, params) => hre.ethers.provider.send(method, params), entry.address,
        receipt.blockHash, trace, setupTimeoutMs));
      const adapter = await deadline(() => makeAdapter(platform, hre, signer, entry.address, timeoutMs, trace),
        setupTimeoutMs, "worker SDK initialization");
      context = { contract, adapter, last: 0n, total: 0n };
      entry.status = "initialized"; emit("setup", { entry }); return entry;
    } catch (error) {
      entry.status = "error"; entry.error = safeError(error); emit("setup", { entry }); throw error;
    }
  }
  async function prepare(args: { request: Omit<MeasurementRequest, "value" | "nonce"> & { value: string }; fees: FeeQuote }) {
    if (!context || pending) throw new Error("Worker is not idle and initialized");
    const request: MeasurementRequest = { ...args.request, value: BigInt(args.request.value), nonce: cursor.reserve() };
    if (request.platform !== platform) throw new Error("Wrong worker platform");
    const ready = deferred<Sample>(), release = deferred<number>();
    // The cancellation can arrive before preparation completes; mark rejection
    // handled now, while the preparation hook still awaits it later.
    release.promise.catch(() => {});
    const measure = createMeasurementRunner({ hre, signer, timeoutMs, setupTimeoutMs, samples: [],
      contexts: new Map([[platform, context]]), onUpdate: update,
      beforeSubmit: async ({ sample, input, value, timing, timeoutMs: budget }) => {
        sample.workerPid = process.pid;
        const started = timing.now();
        const signed = await timing.span("transaction.prepare_and_sign", () => deadline(() =>
          prepareSignedOperation(context.contract, signer, request.operation, input, value, request.nonce!, args.fees),
          budget, "transaction preparation"));
        sample.transactionPreparationMs = timing.now() - started;
        Object.assign(sample, { preparationMs: timing.now(), preparationCompletedAt: new Date().toISOString(),
          preparedTransactionHash: signed.hash, transactionNonce: signed.nonce, broadcastState: "prepared",
          preparedGasLimit: signed.gasLimit, preparedMaxFeePerGasWei: signed.maxFeePerGas,
          preparedMaxPriorityFeePerGasWei: signed.maxPriorityFeePerGas });
        update(sample); ready.resolve(sample);
        const waitStarted = timing.now();
        await timing.span("barrier.wait", async () => {
          const releaseAt = await release.promise;
          await new Promise(resolve => setTimeout(resolve, Math.max(0, releaseAt - Date.now())));
        });
        sample.barrierWaitMs = timing.now() - waitStarted;
        sample.barrierReleasedAt = new Date().toISOString();
        return () => broadcastSignedOperation(signed.raw,
          (method, params) => method === "eth_sendRawTransaction" ?
            (broadcastRpc ? broadcastRpc(method, params) : sendRawTransactionOnce((hre.network.config as any).url,
              params[0], Math.min(budget, 30000), (hre.network.config as any).httpHeaders)) :
            hre.ethers.provider.send(method, params), sample, timing, budget, () => update(sample));
      } });
    const result = measure(request);
    pending = { key: `${request.warmup}/${request.run}/${request.operation}`, release, result };
    result.then(sample => { if (sample.status === "error") ready.reject(new Error(sample.error)); },
      error => ready.reject(new Error(safeError(error))));
    return ready.promise;
  }
  async function execute(args: { key: string; releaseAt: number }) {
    const active = pending;
    if (!active || active.key !== args.key || !Number.isFinite(args.releaseAt)) throw new Error("Barrier command mismatch");
    active.release.resolve(args.releaseAt);
    const result = await active.result;
    await collectBlockMetadata(hre, result); update(result); pending = undefined; return result;
  }
  async function cancel() {
    if (pending) {
      pending.release.reject(new Error("Submission barrier cancelled before broadcast"));
      await pending.result; pending = undefined;
    }
  }
  process.on("message", async (message: any) => {
    if (!message || !Number.isInteger(message.id)) return;
    try {
      const result = message.command === "initialize" ? await initialize(message.args) :
        message.command === "verify_resume" ? await verifyResume() :
        message.command === "prepare" ? await prepare(message.args) :
        message.command === "execute" ? await execute(message.args) :
        message.command === "shutdown" ? await cancel() : (() => { throw new Error("Unknown worker command"); })();
      emit("response", { id: message.id, result });
      if (message.command === "shutdown") { process.disconnect?.(); process.exitCode = 0; }
    } catch (error) { emit("response", { id: message.id, error: safeError(error) }); }
  });
  process.on("disconnect", () => { void cancel().finally(() => process.exit(0)); });
}
