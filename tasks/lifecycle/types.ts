import type { Contract } from "ethers";
import type { TimingTrace } from "../lib/lifecycleTiming";
import type {
  LifecyclePlatform,
  LifecycleOperation,
} from "../lib/lifecycleSchedule";


export type Platform = LifecyclePlatform;
export type UniformWidth = 16 | 128;

export function lifecycleContracts(width?: UniformWidth) {
  if (width === undefined) return contracts;
  return {
    baseline: `EnergyUniformPlain${width}`,
    zama: `EnergyUniformZama${width}`,
    fhenix: `EnergyUniformCoFHE${width}`,
  };
}

export type Operation = LifecycleOperation;

export const operations: Operation[] = [
  "notarize",
  "add",
  "mul_scalar",
  "mean",
  "max",
];

// The ownership import precedes energy operations only in the uniform workload.
// Classic mixed-width campaigns keep their original five-operation schedule.
export function lifecycleOperations(width?: UniformWidth): Operation[] {
  return width === undefined ? [...operations] : ["set_meter_owner", ...operations];
}

export const smartMeterId = "0x" + Buffer.from("energy-benchmark-smart-meter-001").toString("hex").padEnd(64, "0");
export const smartMeterOwner = "0x1234567890abcdef1234567890abcdef12345678";

export const contracts = {
  baseline: "EnergyNotarizationPlainTest",
  zama: "EnergyNotarizationFHETest",
  fhenix: "EnergyLifecycleCoFHE",
};

export type Sample = {
  platform: Platform;
  operation: Operation;
  run: number;
  warmup: boolean;
  startedAt: string;
  status: "pending" | "ok" | "error";
  stages: TimingTrace["stages"];
  transactionHash?: string;
  transactionNonce?: number;
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
  smartMeterId?: string;
  expectedOwnerAddress?: string;
  plaintextAddress?: string;
  outputHandle?: string;
  error?: string;
  readyDecryptError?: string;
  metadataError?: string;
  completedAt?: string;
  transactionStartedAt?: string;
  receiptObservedAt?: string;
  receiptStatus?: number;
  plaintextValidatedAt?: string;
  orderPosition?: number;
  resultRepresentation?: "plaintext" | "ciphertext_handle";
  workerPid?: number;
  preparationMs?: number;
  transactionPreparationMs?: number;
  preparationCompletedAt?: string;
  barrierReleasedAt?: string;
  barrierWaitMs?: number;
  broadcastStartedAt?: string;
  broadcastStartedOffsetMs?: number;
  broadcastAcknowledgedAt?: string;
  broadcastAckMs?: number;
  broadcastToReceiptMs?: number;
  broadcastState?: "prepared" | "started" | "acknowledged" | "uncertain";
  preparedTransactionHash?: string;
  preparedGasLimit?: string;
  preparedMaxFeePerGasWei?: string;
  preparedMaxPriorityFeePerGasWei?: string;
};

export type Adapter = {
  encrypt(value: bigint, trace: TimingTrace, timeoutMs?: number, kind?: "integer" | "address"): Promise<unknown[]>;
  decrypt(
    handle: bigint | string,
    trace: TimingTrace,
    phase: "completion" | "already_ready",
    timeoutMs?: number,
    width?: 16 | 64 | 128 | "address",
  ): Promise<unknown>;
};

export type PlatformContext = {
  contract: Contract;
  adapter: Adapter;
  last: bigint;
  total: bigint;
  width?: UniformWidth;
};

export type BenchmarkArgs = {
  runs: number;
  platform: string;
  seed: string;
  timeout: number;
  setupTimeout?: number;
  outputDir: string;
  accountsFile?: string;
  execution?: "processes" | "async";
  width?: UniformWidth;
};

export type ViewDecryptSample = {
  platform: Platform;
  operation: "view_decrypt";
  run: number;
  warmup: boolean;
  width: UniformWidth;
  status: "pending" | "ok" | "error";
  startedAt: string;
  completedAt?: string;
  workerPid: number;
  referenceTransactionHash: string;
  referenceBlockHash: string;
  expectedPlaintext: string;
  plaintext?: string;
  outputHandle?: string;
  viewMs?: number;
  decryptAndValidationMs?: number;
  viewToValidatedPlaintextMs?: number;
  stages: TimingTrace["stages"];
  error?: string;
};
