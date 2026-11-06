import { performance } from "node:perf_hooks";
import { deadline } from "./lifecycleTiming";

// Allow RPC backends to converge after the preceding campaign's confirmed send.
// Return a nonce only while latest and pending agree within a bounded read window.
export async function readSettledNonce(
  rpc: (method: string, params: unknown[]) => Promise<unknown>,
  address: string,
  timeoutMs = 15000,
  pollMs = 500,
): Promise<number> {
  const end = performance.now() + timeoutMs;
  while (performance.now() < end) {
    const [latest, pending] = await deadline(() => Promise.all([
      rpc("eth_getTransactionCount", [address, "latest"]),
      rpc("eth_getTransactionCount", [address, "pending"]),
    ]), Math.max(1, Math.floor(end - performance.now())), "settled nonce read");
    const value = BigInt(latest as string);
    if (value === BigInt(pending as string)) {
      if (!Number.isSafeInteger(Number(value)) || value < 0n) throw new Error("Invalid account nonce");
      return Number(value);
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(pollMs, Math.max(0, end - performance.now()))));
  }
  throw new Error("Account latest/pending nonce did not converge within the preflight deadline");
}

// One synchronous allocator for deployments, warmup, and measured workers.
// The account must be dedicated to this campaign while it is running.
export function createNonceAllocator(initialNonce: number) {
  if (!Number.isSafeInteger(initialNonce) || initialNonce < 0) throw new Error("Invalid initial nonce");
  let next = initialNonce;
  return {
    reserve(count = 1): number {
      if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(next + count))
        throw new Error("Invalid nonce reservation");
      const first = next;
      next += count;
      return first;
    },
  };
}
