import { performance } from "node:perf_hooks";
import { keccak256, Transaction, type ContractTransactionResponse } from "ethers";
import { deadline, ObservationDeadlineError, type TimingTrace } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import type { Sample, Operation } from "./types";

export type FeeQuote = { maxFeePerGas: string; maxPriorityFeePerGas: string; quotedAt: string };

type Rpc = (method: string, params: any[]) => Promise<any>;

// Bypass Hardhat's generic HTTP-429 retry wrapper for this mutation RPC.
// Submits a signed transaction through the RPC endpoint once.
// Returns the transaction hash acknowledged by the endpoint.
export async function sendRawTransactionOnce(url: string, raw: string, timeoutMs: number,
  extraHeaders: Record<string, string> = {}): Promise<string> {
  const endpoint = new URL(url);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };

  if (endpoint.username || endpoint.password) {
    headers.Authorization ??= `Basic ${Buffer.from(`${decodeURIComponent(endpoint.username)}:${decodeURIComponent(endpoint.password)}`).toString("base64")}`;
    endpoint.username = ""; endpoint.password = "";
  }

  const response = await fetch(endpoint, { method: "POST", headers, redirect: "error",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: [raw] }),
    signal: AbortSignal.timeout(timeoutMs) });

  if (!response.ok) {
    await response.arrayBuffer(); throw new Error(`Broadcast HTTP ${response.status}; no retransmission`);
  }

  const result: any = await response.json();

  if (result.id !== 1 || result.error || typeof result.result !== "string")
    throw new Error(`Broadcast RPC rejected or malformed response (code ${result.error?.code ?? "unknown"}); no retransmission`);

  return result.result;
}

// Builds and estimates the transaction for the requested operation.
// Signs it with the assigned nonce and shared fee quote before the barrier.
export async function prepareSignedOperation(contract: any, signer: any, operation: Operation,
  input: unknown[], value: bigint, nonce: number, fees: FeeQuote) {
  const names = { notarize: "addEnergyEntry", add: "addLastEntryToEncryptedTotal",
    mul_scalar: "multiplyLastEntryByConstant", mean: "meanLastEntryAndEncryptedTotal",
    max: "maxLastEntryAndEncryptedTotal" };

  const args = operation === "notarize" ? input : operation === "mul_scalar" ? [value] : [];

  const request = await contract.getFunction(names[operation]).populateTransaction(...args);

  const tx = await signer.populateTransaction({ ...request, nonce, chainId: 11155111n, type: 2,
    maxFeePerGas: BigInt(fees.maxFeePerGas), maxPriorityFeePerGas: BigInt(fees.maxPriorityFeePerGas) });
  const raw = await signer.signTransaction(tx);
  const decoded = Transaction.from(raw);

  if (decoded.chainId !== 11155111n || decoded.nonce !== nonce ||
      decoded.from?.toLowerCase() !== signer.address.toLowerCase()) throw new Error("Signed transaction identity mismatch");

  return { raw, hash: keccak256(raw), nonce, gasLimit: String(decoded.gasLimit),
    maxFeePerGas: String(decoded.maxFeePerGas), maxPriorityFeePerGas: String(decoded.maxPriorityFeePerGas) };
}

// Exactly one mutation RPC. A lost response is ambiguous, not permission to retry.
// Broadcasts a prepared transaction and waits for its receipt.
// Records acknowledgment and receipt timings in the sample.
export async function broadcastSignedOperation(raw: string, rpc: Rpc, sample: Sample,
  trace: TimingTrace, timeoutMs: number, update: () => void): Promise<ContractTransactionResponse> {
  const decoded = Transaction.from(raw), hash = keccak256(raw);

  if (decoded.chainId !== 11155111n || hash !== sample.preparedTransactionHash)
    throw new Error("Broadcast does not match the prepared Sepolia transaction");

  sample.transactionHash = hash; sample.transactionNonce = decoded.nonce;
  sample.broadcastStartedAt = new Date().toISOString(); sample.broadcastState = "started";
  sample.broadcastStartedOffsetMs = trace.now();
  update();

  const start = performance.now();

  try {
    const returned = await trace.span("transaction.raw_broadcast", () =>
      deadline(() => rpc("eth_sendRawTransaction", [raw]), Math.min(timeoutMs, 30000), "broadcast acknowledgement"));

    if (returned !== hash) throw new Error("RPC returned a different transaction hash");

    sample.broadcastAcknowledgedAt = new Date().toISOString();
    sample.broadcastAckMs = performance.now() - start; sample.broadcastState = "acknowledged";
    update();
  } catch (error) {
    sample.broadcastState = "uncertain"; update(); throw error;
  }
  
  return { hash, nonce: decoded.nonce, wait: async () => {
    const end = performance.now() + timeoutMs;

    while (performance.now() < end) {
      const remaining = Math.max(1, Math.floor(end - performance.now()));
      const receipt = await deadline(() => retryLifecycleRead(trace, "transaction.receipt", remaining,
        () => rpc("eth_getTransactionReceipt", [hash])), remaining, "receipt retrieval");

      if (receipt) {
        if (receipt.transactionHash !== hash || !receipt.blockHash) throw new Error("Receipt transaction mismatch");

        return { status: Number(BigInt(receipt.status)), blockNumber: Number(BigInt(receipt.blockNumber)),
          blockHash: receipt.blockHash, gasUsed: BigInt(receipt.gasUsed), gasPrice: BigInt(receipt.effectiveGasPrice) };
      }

      trace.event("transaction.receipt_poll", { intervalMs: 500 });
      await new Promise(resolve => setTimeout(resolve, Math.min(500, Math.max(0, end - performance.now()))));
    }

    throw new ObservationDeadlineError("transaction receipt", timeoutMs);
  } } as unknown as ContractTransactionResponse;
}
