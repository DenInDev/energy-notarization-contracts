import type { Mode, Width } from "./types";

export type OrderedInput = { requestId: string; user: string; value: bigint; blockNumber: number; transactionIndex: number; sequence?: number };

// Replay confirmed transactions in canonical host-chain order.
// Completion/decryption order is deliberately irrelevant to state correctness.
export function replay(inputs: OrderedInput[], mode: Mode, width: Width) {
  if (inputs.some(x => !Number.isSafeInteger(x.blockNumber) || x.blockNumber < 0 ||
      !Number.isSafeInteger(x.transactionIndex) || x.transactionIndex < 0)) throw new Error("Missing canonical position");
  if (new Set(inputs.map(x => x.requestId)).size !== inputs.length) throw new Error("Duplicate request ID");
  const canonical = [...inputs].sort((a,b) => a.blockNumber-b.blockNumber || a.transactionIndex-b.transactionIndex);
  const positions = canonical.map(x => `${x.blockNumber}/${x.transactionIndex}`);
  if (new Set(positions).size !== positions.length) throw new Error("Duplicate canonical position");
  const state: Record<string,bigint> = {}, snapshots: Record<string,bigint> = {};
  canonical.forEach((request,index) => {
    if (request.sequence !== undefined && request.sequence !== index+1) throw new Error("Contract sequence disagrees with canonical order");
    const key = mode === "independent" ? request.user.toLowerCase() : "shared";
    const previous = state[key] ?? 0n;
    const next = BigInt.asUintN(width, (mode === "shared_ordered" ? 3n*previous : previous)+request.value);
    state[key] = next; snapshots[request.requestId] = next;
  });
  return { canonical, snapshots, state };
}

// Conditional one-sided exact binomial bound for zero observed bad windows.
// Windows must be independent; requests in a window are never treated as IID.
export function zeroFailureUpper95(independentWindows: number): number {
  if (!Number.isInteger(independentWindows) || independentWindows < 1) throw new Error("Positive independent-window count required");
  return -Math.expm1(Math.log(0.05)/independentWindows);
}
