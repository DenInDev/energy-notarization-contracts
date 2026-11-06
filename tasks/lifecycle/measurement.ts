import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ContractTransactionResponse } from "ethers";
import {
  TimingTrace,
  deadline,
  validatePlaintext,
} from "../lib/lifecycleTiming";
import { readLifecycleResult } from "../lib/lifecycleResult";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import { expectedPlaintext, resultGetter, submitOperation } from "./operations";
import { safeError } from "./errors";
import type { Platform, Operation, Sample, PlatformContext, UniformWidth, ViewDecryptSample } from "./types";
import { smartMeterId } from "./types";

export type MeasurementRequest = {
  platform: Platform;
  operation: Operation;
  run: number;
  value: bigint;
  warmup: boolean;
  orderPosition?: number;
  nonce?: number;
};

export type SubmissionHook = (details: {
  sample: Sample; context: PlatformContext; input: unknown[]; value: bigint;
  signer: HardhatEthersSigner; timing: TimingTrace; timeoutMs: number;
}) => Promise<() => Promise<ContractTransactionResponse>>;

type MeasurementEnvironment = {
  hre: HardhatRuntimeEnvironment;
  signer: HardhatEthersSigner;
  timeoutMs: number;
  setupTimeoutMs?: number;
  samples: Sample[];
  contexts: Map<Platform, PlatformContext>;
  platformSigners?: Map<Platform, HardhatEthersSigner>;
  beforeSubmit?: SubmissionHook;
  onUpdate?: (sample: Sample) => void;
};

// Binds a measurement function to the campaign's platform contexts.
// Supplies the shared timing, submission and sample update behavior.
export function createMeasurementRunner({
  hre,
  signer,
  timeoutMs,
  setupTimeoutMs = timeoutMs,
  samples,
  contexts,
  platformSigners,
  beforeSubmit,
  onUpdate,
}: MeasurementEnvironment) {
  // Executes one operation and validates its observed plaintext result.
  // Records preparation, receipt and completion stages in the sample.
  async function measure({
    platform,
    operation,
    run,
    value,
    warmup,
    orderPosition,
    nonce,
  }: MeasurementRequest) {
    const observationTimeout = warmup ? setupTimeoutMs : timeoutMs;
    const context = contexts.get(platform)!;
    const activeSigner = platformSigners?.get(platform) ?? signer;
    const timing = new TimingTrace();
    const expected = expectedPlaintext(operation, context, value);
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
      resultRepresentation:
        platform === "baseline" ? "plaintext" : "ciphertext_handle",
    };

    samples.push(sample);

    if (context.width !== undefined) sample.smartMeterId = smartMeterId;
    if (operation === "set_meter_owner") {
      sample.expectedOwnerAddress = hre.ethers.getAddress(hre.ethers.toBeHex(value, 20));
    }

    try {
      // Notarization supplies a new reading.
      const inputStart = timing.now();
      const input =
        operation === "notarize" || operation === "set_meter_owner"
          ? await deadline(
              () => context.adapter.encrypt(value, timing, observationTimeout,
                operation === "set_meter_owner" ? "address" : "integer"),
              observationTimeout,
              "input preparation",
            )
          : [];

      if ((operation === "notarize" || operation === "set_meter_owner") && platform !== "baseline") {
        sample.inputPreparationMs = timing.now() - inputStart;
      }

      // In isolated mode, the hook signs the transaction and waits for the barrier.
      const submit = beforeSubmit
        ? await beforeSubmit({
            sample,
            context,
            input,
            value,
            signer: activeSigner,
            timing,
            timeoutMs: observationTimeout,
          })
        : () => submitOperation(context.contract, operation, input, value, nonce);

      // Start measuring transaction latency after the preparation hook returns.
      sample.transactionStartedAt = new Date().toISOString();

      const txStart = timing.now();
      const tx: ContractTransactionResponse = await timing.span(
        "transaction.invoke_sign_and_submit",
        submit,
      );

      sample.transactionHash = tx.hash;
      sample.transactionNonce = tx.nonce;
      onUpdate?.(sample);

      const receipt = await timing.span("transaction.wait_receipt", () =>
        tx.wait(1, observationTimeout),
      );

      const observedReceipt = timing.now();

      sample.receiptObservedAt = new Date().toISOString();

      if (!receipt) throw new Error("Transaction receipt missing");

      sample.receiptStatus = receipt.status ?? undefined;
      sample.confirmationMs = observedReceipt - txStart;
      sample.blockNumber = receipt.blockNumber;
      sample.blockHash = receipt.blockHash;
      sample.gasUsed = Number(receipt.gasUsed);
      sample.effectiveGasPriceWei = String(receipt.gasPrice);
      sample.gasCostWei = String(receipt.gasUsed * receipt.gasPrice);

      if (sample.broadcastStartedOffsetMs !== undefined) {
        sample.broadcastToReceiptMs =
          observedReceipt - sample.broadcastStartedOffsetMs;
      }

      onUpdate?.(sample);

      // A successful transaction changes contract state even if retrieval later fails.
      if (receipt.status !== 1) throw new Error("Transaction did not succeed");
      if (operation === "notarize") context.last = value;
      if (operation === "add") context.total = expected;

      // Pin the getter to the receipt block so retries read the same state.
      const handle = await timing.span(
        "completion.read_persisted_handle",
        () => {
          const getter = resultGetter(operation);

          return deadline(
            () =>
              retryLifecycleRead(
                timing,
                "completion.handle",
                observationTimeout,
                () =>
                  readLifecycleResult(
                    (method, params) => hre.ethers.provider.send(method, params),
                    context.contract.interface,
                    String(context.contract.target),
                    activeSigner.address,
                    getter,
                    receipt.blockHash,
                    operation === "set_meter_owner" ? [smartMeterId] : [],
                  ),
                100, // Initial backoff in milliseconds.
                false, // Zama ACL retries are handled by the decryption adapter.
                false, // Zama Gateway readiness retries are handled there too.
                true, // Retry when the RPC cannot yet find the receipt block.
              ),
            observationTimeout,
            "receipt-pinned result read",
          );
        },
      );

      if (platform !== "baseline") {
        sample.outputHandle = hre.ethers.toBeHex(handle, 32);
      }

      // The baseline getter returns plaintext. FHE getters return handles.
      const plaintext =
        platform === "baseline"
          ? handle
          : await deadline(
              () =>
                context.adapter.decrypt(
                  handle,
                  timing,
                  "completion",
                  observationTimeout,
                  operation === "set_meter_owner" ? "address" : context.width ?? (operation === "notarize" ? 16 : 64),
                ),
              observationTimeout,
              "completion decrypt",
            );

      sample.plaintext = await timing.span(
        "completion.validate_plaintext",
        () => validatePlaintext(plaintext, expected),
      );

      if (operation === "set_meter_owner") {
        sample.plaintextAddress = hre.ethers.getAddress(hre.ethers.toBeHex(BigInt(sample.plaintext), 20));
      }

      // Stop the primary timer once the recovered value matches the model.
      const validated = timing.now();

      sample.plaintextValidatedAt = new Date().toISOString();
      sample.transactionToValidatedPlaintextMs = validated - txStart;
      sample.postReceiptToValidatedPlaintextMs = validated - observedReceipt;
      sample.status = "ok";
      onUpdate?.(sample);

      // Measure a second decrypt separately, after the primary sample succeeds. This measures the time to get a decrypt value without accounting for polling/waiting.
      if (!warmup && platform !== "baseline" && context.width === undefined) {
        const readyStart = timing.now();

        try {
          const again = await deadline(
            () =>
              context.adapter.decrypt(
                handle,
                timing,
                "already_ready",
                timeoutMs,
                operation === "notarize" ? 16 : 64,
              ),
            timeoutMs,
            "ready decrypt",
          );

          await timing.span("already_ready.validate_plaintext", () =>
            validatePlaintext(again, expected),
          );

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
    onUpdate?.(sample);

    return sample;
  }

  return measure;
}

// Measure a persisted getter plus fresh plaintext retrieval under one deadline.
// The parent transaction identifies the canonical state for the read.
export async function measureViewDecrypt(
  context: PlatformContext,
  caller: string,
  rpc: (method: string, params: any[]) => Promise<any>,
  reference: Sample,
  width: UniformWidth,
  timeoutMs: number,
): Promise<ViewDecryptSample> {
  const timing = new TimingTrace();
  const sample: ViewDecryptSample = {
    platform: reference.platform, operation: "view_decrypt", run: reference.run,
    warmup: reference.warmup, width, status: "pending", startedAt: new Date().toISOString(),
    workerPid: process.pid, referenceTransactionHash: reference.transactionHash!,
    referenceBlockHash: reference.blockHash!, expectedPlaintext: reference.expectedPlaintext,
    stages: timing.stages,
  };
  const remaining = () => Math.max(1, Math.floor(timeoutMs - timing.now()));
  try {
    const handle = await deadline(() => retryLifecycleRead(timing, "view_decrypt.handle", remaining(),
      () => readLifecycleResult(rpc, context.contract.interface, String(context.contract.target),
        caller, "getLastResult", reference.blockHash!), 1000, false, false, true), remaining(), "view_decrypt getter");
    sample.viewMs = timing.now();
    if (reference.platform !== "baseline") sample.outputHandle = String(handle);

    const plaintext = reference.platform === "baseline" ? handle : await deadline(
      () => context.adapter.decrypt(handle, timing, "already_ready", remaining(), width),
      remaining(), "view_decrypt decryption");
    sample.plaintext = await timing.span("view_decrypt.validate_plaintext", () =>
      validatePlaintext(plaintext, BigInt(reference.expectedPlaintext)));
    sample.viewToValidatedPlaintextMs = timing.now();
    sample.decryptAndValidationMs = sample.viewToValidatedPlaintextMs - sample.viewMs;
    sample.status = "ok";
  } catch (error) {
    sample.status = "error";
    sample.error = safeError(error);
  }
  sample.completedAt = new Date().toISOString();
  return sample;
}

// Looks up block information for a recorded receipt.
// Adds inclusion metadata to the sample for later comparisons.
export async function collectBlockMetadata(
  hre: HardhatRuntimeEnvironment,
  sample: Sample,
) {
  if (!sample.blockHash) return;

  try {
    const block = await hre.ethers.provider.getBlock(sample.blockHash);

    if (!block) throw new Error("Included block unavailable");

    sample.blockTimestamp = block.timestamp;
    sample.blockGasUsed = String(block.gasUsed);
    sample.blockGasLimit = String(block.gasLimit);
    sample.blockTargetUtilization =
      Number(block.gasUsed) / (Number(block.gasLimit) / 2);
  } catch (error) {
    sample.metadataError = safeError(error);
  }
}
