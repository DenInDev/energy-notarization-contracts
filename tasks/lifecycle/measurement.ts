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
import type { Platform, Operation, Sample, PlatformContext } from "./types";
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
    try {
      const inputStart = timing.now();
      const input =
        operation === "notarize"
          ? await deadline(
              () => context.adapter.encrypt(value, timing, observationTimeout),
              observationTimeout,
              "input preparation",
            )
          : [];
      if (operation === "notarize" && platform !== "baseline")
        sample.inputPreparationMs = timing.now() - inputStart;
      const submit = beforeSubmit ? await beforeSubmit({ sample, context, input, value,
        signer: activeSigner, timing, timeoutMs: observationTimeout }) :
        () => submitOperation(context.contract, operation, input, value, nonce);
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
      if (sample.broadcastStartedOffsetMs !== undefined)
        sample.broadcastToReceiptMs = observedReceipt - sample.broadcastStartedOffsetMs;
      onUpdate?.(sample);
      // Apply the plaintext model on successful receipt, even if remote decryption later fails.
      if (receipt.status !== 1) throw new Error("Transaction did not succeed");
      if (operation === "notarize") context.last = value;
      if (operation === "add") context.total = expected;
      const handle = await timing.span(
        "completion.read_persisted_handle",
        () => {
          const getter = resultGetter(operation);
          return deadline(
            () =>
              retryLifecycleRead(timing, "completion.handle", observationTimeout, () =>
                readLifecycleResult(
                  (method, params) => hre.ethers.provider.send(method, params),
                  context.contract.interface,
                  String(context.contract.target),
                  activeSigner.address,
                  getter,
                  receipt.blockHash,
                ),
                1000, false, false, true,
              ),
            observationTimeout,
            "receipt-pinned result read",
          );
        },
      );
      if (platform !== "baseline")
        sample.outputHandle = hre.ethers.toBeHex(handle, 32);
      const plaintext =
        platform === "baseline"
          ? handle
          : await deadline(
              () => context.adapter.decrypt(handle, timing, "completion", observationTimeout, operation === "notarize" ? 16 : 64),
              observationTimeout,
              "completion decrypt",
            );
      sample.plaintext = await timing.span(
        "completion.validate_plaintext",
        () => validatePlaintext(plaintext, expected),
      );
      const validated = timing.now();
      sample.plaintextValidatedAt = new Date().toISOString();
      sample.transactionToValidatedPlaintextMs = validated - txStart;
      sample.postReceiptToValidatedPlaintextMs = validated - observedReceipt;
      sample.status = "ok";
      onUpdate?.(sample);
      if (!warmup && platform !== "baseline") {
        const readyStart = timing.now();
        try {
          const again = await deadline(
            () => context.adapter.decrypt(handle, timing, "already_ready", timeoutMs, operation === "notarize" ? 16 : 64),
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
