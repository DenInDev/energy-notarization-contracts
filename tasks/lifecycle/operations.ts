import type { Contract, ContractTransactionResponse } from "ethers";
import type { Operation, PlatformContext } from "./types";

// Computes the expected result using the plaintext workload model.
// Uses the platform's tracked reading and total for the requested operation.
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

// Selects the contract getter that exposes the operation's output.
// Distinguishes the latest reading, accumulated total and stored arithmetic result.
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

// Dispatches the requested workload operation to the benchmark contract.
// Passes the operation arguments and an explicit nonce when supplied.
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
