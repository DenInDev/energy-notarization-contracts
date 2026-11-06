import type { Contract, ContractTransactionResponse } from "ethers";
import { smartMeterId, type Operation, type PlatformContext } from "./types";

// Computes the expected result using the plaintext workload model.
// Uses the platform's tracked reading and total for the requested operation.
export function expectedPlaintext(
  operation: Operation,
  state: PlatformContext,
  value: bigint,
): bigint {
  const mask = state.width === undefined ? undefined : (1n << BigInt(state.width)) - 1n;
  const wrap = (result: bigint) => mask === undefined ? result : result & mask;
  switch (operation) {
    case "set_meter_owner":
      return value;
    case "notarize":
      return value;
    case "add":
      return wrap(state.total + state.last);
    case "mul_scalar":
      return wrap(state.last * value);
    case "mean":
      return wrap(state.last + state.total) / 2n;
    case "max":
      return state.last > state.total ? state.last : state.total;
  }
}

// Selects the contract getter that exposes the operation's output.
// Distinguishes the latest reading, accumulated total and stored arithmetic result.
export function resultGetter(operation: Operation): string {
  switch (operation) {
    case "set_meter_owner":
      return "getSmartMeterOwner";
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
    case "set_meter_owner":
      return contract.setSmartMeterOwner(smartMeterId, ...input, overrides);
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
