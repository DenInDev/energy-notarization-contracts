import { id } from "ethers";

const limits = ["HCUTransactionLimitExceeded","HCUTransactionDepthLimitExceeded"];

// Only exact known HCU errors from pre-broadcast gas estimation are capacity
// observations. Network failures and arbitrary reverts remain terminal errors.
export function capacityRejection(error: unknown): string | undefined {
  const queue: unknown[] = [error], seen = new Set<unknown>();
  for (let depth=0; queue.length && depth<24; depth++) {
    const item = queue.shift();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    if (typeof item === "string") {
      for (const name of limits) if (item === id(`${name}()`).slice(0,10) ||
        new RegExp(`\\b${name}\\(\\)`).test(item)) return name;
    } else if (typeof item === "object") {
      const e = item as Record<string,unknown>;
      queue.push(e.data,e.message,e.shortMessage,e.error,e.info,e.cause);
    }
  }
}
