import type { Interface } from "ethers";

export async function readLifecycleResult(
  send: (method: string, params: any[]) => Promise<any>,
  abi: Interface,
  address: string,
  caller: string,
  getter: string,
  receiptBlockHash: string,
): Promise<bigint | string> {
  // A load-balanced RPC's latest state can lag a receipt observed on another backend.
  const result = await send("eth_call", [
    { to: address, from: caller, data: abi.encodeFunctionData(getter) },
    { blockHash: receiptBlockHash, requireCanonical: true },
  ]);
  return abi.decodeFunctionResult(getter, result)[0];
}
