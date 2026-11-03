import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { TimingTrace } from "../lib/lifecycleTiming";
import type { Adapter, Platform } from "./types";
import { createZamaAdapter } from "./zama";
import { createCofheAdapter } from "./cofhe";
export function makeAdapter(
  platform: Platform,
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  address: string,
  timeoutMs: number,
  trace: TimingTrace,
): Promise<Adapter> {
  switch (platform) {
    case "baseline":
      return Promise.resolve({
        encrypt: async (value) => [value],
        decrypt: async (value) => value,
      });
    case "zama":
      return createZamaAdapter(hre, signer, address, timeoutMs, trace);
    case "fhenix":
      return createCofheAdapter(signer, address, timeoutMs, trace);
  }
}
