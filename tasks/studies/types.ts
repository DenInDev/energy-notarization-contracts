import type { TimingStage, TimingTrace } from "../lib/lifecycleTiming";
import type { Platform } from "../lifecycle/types";

export type Width = 16 | 128;
export type Suite = "concurrency" | "circuits";
export type Mode = "independent" | "shared_sum" | "shared_ordered";
export type Circuit = "sum_linear" | "sum_tree" | "affine_chain";

export type StudyCase = {
  id: string;
  suite: Suite;
  width: Width;
  users: number;
  mode?: Mode;
  circuit?: Circuit;
  size: number;
  inputCount: number;
  additions: number;
  multiplications: number;
  dependencyDepth: number;
};

export type StudyArgs = {
  suite: string;
  platform: string;
  widths: string;
  users: string;
  modes: string;
  sizes: string;
  depths: string;
  repetitions: number;
  requests: number;
  timeout: number;
  seed: string;
  accountsFile: string;
  outputDir: string;
  live: boolean;
};

export type ExperimentAdapter = {
  encrypt(values: bigint[], trace: TimingTrace, budget: number): Promise<[unknown[], string | Uint8Array]>;
  decrypt(handles: (bigint | string)[], trace: TimingTrace, budget: number): Promise<unknown[]>;
};

export type StudyTransaction = {
  id: string;
  method: string;
  user: string;
  status: "prepared" | "pending" | "confirmed" | "reverted" | "error";
  startedAt?: string;
  preparedTransactionHash: string;
  transactionHash?: string;
  transactionNonce: number;
  gasLimit?: string;
  maxFeePerGasWei?: string;
  maxPriorityFeePerGasWei?: string;
  broadcastState: "prepared" | "started" | "acknowledged" | "uncertain";
  broadcastStartedAt?: string;
  broadcastStartedOffsetMs?: number;
  broadcastAcknowledgedAt?: string;
  broadcastAckMs?: number;
  rpcSendStartedAt?: string;
  rpcSendMonotonicMs?: number;
  receiptObservedMonotonicMs?: number;
  transactionIndex?: number;
  blockNumber?: number;
  blockHash?: string;
  receiptStatus?: number;
  gasUsed?: number;
  effectiveGasPriceWei?: string;
  gasCostWei?: string;
  receiptMs?: number;
  receiptOffsetMs?: number;
  error?: string;
  stages: TimingStage[];
};

export type RequestResult = {
  requestId: string;
  ordinal: number;
  user: string;
  input: string;
  transaction: StudyTransaction;
  sequence?: number;
  expected?: string;
  plaintext?: string;
  outputHandle?: string;
  status: "pending" | "ok" | "error";
  error?: string;
  auditCallMs?: number;
  postReceiptMs?: number;
  transactionToValidatedMs?: number;
  stages: TimingStage[];
};

export type Trial = {
  caseId: string;
  platform: Platform;
  repetition: number;
  warmup: boolean;
  scopeId: string;
  controlDirection?: "forward" | "reverse";
  status: "pending" | "ok" | "incomplete" | "inconsistent" | "capacity_rejected";
  rejection?: { source: "estimateGas"; limit: string; broadcast: false };
  requests: RequestResult[];
  inputValues?: string[];
  resumedPreparation?: { sourceTrialIndex: number; reusedInputTransactions?: string[]; reusedWindowTransactions?: string[]; discardedPreparedHashes?: string[]; durationScope: string };
  setup: StudyTransaction[];
  plannedOrder: string[];
  canonicalOrder?: string[];
  orderChanged?: boolean;
  finalMatchesPlannedOrder?: boolean;
  finalPlaintexts?: Record<string, string>;
  expectedFinal?: Record<string, string>;
  receiptWindowMs?: number;
  receiptTransactionsPerSecond?: number;
  fullWindowMs?: number;
  preparationMs?: number;
  broadcastSpreadsMs: number[];
  logReadStages?: TimingStage[];
  error?: string;
};

export type LateWindowAudit = {
  sourceTrialIndex: number; key: string; scopeId: string; warmup: boolean;
  status: "pending" | "ok" | "error"; startedAt: string; completedAt?: string;
  historicalError?: string; error?: string;
  canonicalOrder?: string[]; expectedFinal?: Record<string,string>; finalPlaintexts?: Record<string,string>;
  snapshots: {requestId:string;expected:string;plaintext:string;lateAuditCallMs:number}[];
  stages: TimingStage[];
  timingUse: string;
};

export type ReceiptAnchor = {
  blockHash: string; blockNumber: number; transactionIndex: number;
  receiptStatus: number; gasUsed: number; effectiveGasPriceWei: string; gasCostWei: string;
};

export type CanonicalReceiptRecovery = {
  transactionHash: string; observedAt: string; previous: ReceiptAnchor; canonical: ReceiptAnchor;
  sameHashSenderNonceTargetVerified: true; previousBlockNoLongerCanonical: true;
  canonicalReceiptRepeated: true; timingUse: string;
};
