import type { Interface } from "ethers";
import { retryLifecycleRead } from "./lifecycleReadRetry";
import { deadline, type TimingTrace } from "./lifecycleTiming";

export function readDeploymentBytecode(
  send: (method: string, params: any[]) => Promise<any>,
  address: string,
  receiptBlockHash: string,
  trace: TimingTrace,
  timeoutMs: number,
): Promise<string> {
  return deadline(() => retryLifecycleRead(trace, "setup.bytecode", timeoutMs, async () => {
    const code: string = await send("eth_getCode", [address, { blockHash: receiptBlockHash, requireCanonical: true }]);
    if (code === "0x") throw new Error("Deployment bytecode missing at receipt block");
    return code;
  }, 1000, false, false, true), timeoutMs, "receipt-pinned deployment bytecode read");
}

export async function readLifecycleResult(
  send: (method: string, params: any[]) => Promise<any>,
  abi: Interface,
  address: string,
  caller: string,
  getter: string,
  receiptBlockHash: string,
  getterArgs: unknown[] = [],
): Promise<bigint | string> {
  // A load-balanced RPC's latest state can lag a receipt observed on another backend.
  const result = await send("eth_call", [
    { to: address, from: caller, data: abi.encodeFunctionData(getter, getterArgs) },
    { blockHash: receiptBlockHash, requireCanonical: true },
  ]);
  return abi.decodeFunctionResult(getter, result)[0];
}
