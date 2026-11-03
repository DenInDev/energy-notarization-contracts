import type { Contract } from "ethers";
import type { TimingTrace } from "../lib/lifecycleTiming";
import type {
  LifecyclePlatform,
  LifecycleOperation,
} from "../lib/lifecycleSchedule";


export type Platform = LifecyclePlatform;

export type Operation = LifecycleOperation;

export const operations: Operation[] = [
  "notarize",
  "add",
  "mul_scalar",
  "mean",
  "max",
];

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
  encrypt(value: bigint, trace: TimingTrace, timeoutMs?: number): Promise<unknown[]>;
  decrypt(
    handle: bigint | string,
    trace: TimingTrace,
    phase: "completion" | "already_ready",
    timeoutMs?: number,
    width?: 16 | 64,
  ): Promise<unknown>;
};

export type PlatformContext = {
  contract: Contract;
  adapter: Adapter;
  last: bigint;
  total: bigint;
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
};
