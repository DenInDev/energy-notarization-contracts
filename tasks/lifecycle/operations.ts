import type { Contract, ContractTransactionResponse } from "ethers";
import type { Operation, PlatformContext } from "./types";
export function expectedPlaintext(
  operation: Operation,
  state: PlatformContext,
  value: bigint,
): bigint {
  switch (operation) {
    case "notarize":
      return value;
    case "add":
      return state.total + state.last;
    case "mul_scalar":
      return state.last * value;
    case "mean":
      return (state.last + state.total) / 2n;
    case "max":
      return state.last > state.total ? state.last : state.total;
  }
}
export function resultGetter(operation: Operation): string {
  switch (operation) {
    case "notarize":
      return "getLastEntryValue";
    case "add":
      return "getEncryptedTotalHandle";
    default:
      return "getLastResult";
  }
}
export function submitOperation(
  contract: Contract,
  operation: Operation,
  input: unknown[],
  value: bigint,
  nonce?: number,
): Promise<ContractTransactionResponse> {
  const overrides = nonce === undefined ? {} : { nonce };
  switch (operation) {
    case "notarize":
      return contract.addEnergyEntry(...input, overrides);
    case "add":
      return contract.addLastEntryToEncryptedTotal(overrides);
    case "mul_scalar":
      return contract.multiplyLastEntryByConstant(value, overrides);
    case "mean":
      return contract.meanLastEntryAndEncryptedTotal(overrides);
    case "max":
      return contract.maxLastEntryAndEncryptedTotal(overrides);
  }
}
