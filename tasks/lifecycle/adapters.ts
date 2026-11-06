import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { TimingTrace } from "../lib/lifecycleTiming";
import type { Adapter, Platform, UniformWidth } from "./types";
import { createZamaAdapter } from "./zama";
import { createCofheAdapter } from "./cofhe";
import type { CofheReadPolicy } from "../lib/cofheReadPolicy";

// Selects the encryption and decryption adapter for the requested platform.
// The plaintext baseline passes values through the same interface.
export function makeAdapter(
  platform: Platform,
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  address: string,
  timeoutMs: number,
  trace: TimingTrace,
  width: UniformWidth = 16,
  readPolicy?: CofheReadPolicy,
): Promise<Adapter> {
  switch (platform) {
    case "baseline":
      return Promise.resolve({
        encrypt: async (value, _trace, _timeout, kind) =>
          [kind === "address" ? hre.ethers.toBeHex(value, 20) : value],
        decrypt: async (value) => value,
      });
    case "zama":
      return createZamaAdapter(hre, signer, address, timeoutMs, trace, width);
    case "fhenix":
      return createCofheAdapter(signer, address, timeoutMs, trace, width, readPolicy);
  }
}
