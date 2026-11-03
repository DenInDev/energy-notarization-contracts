import type { Signer, Contract } from "ethers";
import type { TimingStage, TimingTrace } from "../lib/lifecycleTiming";
import type { Platform } from "../lifecycle/types";

export type Width = 8 | 16 | 32 | 64 | 128;
export type Suite = "width" | "inputs" | "depth" | "chain" | "state" | "concurrency";
export type Operation = "import" | "add" | "mul" | "compare_select" | "tariff" | "sum_linear" | "sum_tree" | "chain" | "state_read" | "state_sum" | "load_add";
export type Scenario = {
  id: string; suite: Suite; operation: Operation; width: Width; inputCount: number;
  depth: number; operationCount: number; chainLength: number; users: number; stateSize: number; touched: number;
};
export type ExperimentArgs = {
  suite: string; platform: string; runs: number; requests: number; timeout: number; seed: string;
  widths: string; counts: string; chains: string; users: string; states: string; touched: string;
  accountsFile: string; outputDir: string; dryRun: boolean;
};
export interface ExperimentAdapter {
  encrypt(values: bigint[], trace: TimingTrace, budget: number): Promise<[unknown[], string | Uint8Array]>;
  decrypt(handles: (bigint | string)[], trace: TimingTrace, budget: number): Promise<unknown[]>;
}
export type TxObservation = { hash?: string; nonce: number; startedMs: number; receiptMs?: number;
  blockHash?: string; blockNumber?: number; status?: number; gasUsed?: string; gasPriceWei?: string; costWei?: string };
export type Observation = {
  id: string; caseId: string; platform: Platform; user: string; run: number; request: number; warmup: boolean;
  status: "pending" | "ok" | "timeout" | "error"; phase: string; startedAt: string; endedAt?: string;
  expected: string; actual?: string; error?: string; fatal?: boolean; outputHandle?: string;
  inputPreparationMs?: number; transactionToReceiptMs?: number; postReceiptMs?: number;
  transactionToValidatedMs?: number; endToEndMs?: number; observedMs?: number; completionBudgetMs: number;
  completionObservedMs?: number; completionCensored?: boolean; transactions: TxObservation[]; stages: TimingStage[];
};
export type Context = { platform: Platform; signer: Signer; user: string; contract: Contract;
  adapter: ExperimentAdapter; reserveNonce: () => number; timeoutMs: number; halted: boolean };
export type LoadWindow = { caseId: string; platform: Platform; run: number; users: number; planned: number;
  attempted: number; completed: number; receiptTransactions: number; receiptRequests: number; durationMs: number;
  start: string; end: string; validatedRequestsPerSecond: number; receiptTransactionsPerSecond: number;
  receiptRequestsPerSecond: number };
export type ExperimentReport = {
  schemaVersion: 1; kind: "expanded-experiments"; complete: boolean; startedAt: string; finishedAt?: string;
  chainId: number; mock: boolean; config: Omit<ExperimentArgs, "accountsFile">; scenarios: Scenario[];
  schedule: { caseId: string; platforms: Platform[] }[]; accounts: string[]; provenance: Record<string, unknown>;
  methodology: Record<string, unknown>; setups: Record<string, unknown>[]; samples: Observation[];
  windows: LoadWindow[]; errors: { caseId?: string; platform?: Platform; message: string }[];
};
