import { strict as assert } from "node:assert";
import hre from "hardhat";
import { Interface } from "ethers";
import { measureViewDecrypt } from "../tasks/lifecycle/measurement";
import { expectedPlaintext } from "../tasks/lifecycle/operations";
import type { Sample, PlatformContext } from "../tasks/lifecycle/types";
import { smartMeterId, smartMeterOwner } from "../tasks/lifecycle/types";

describe("uniform-width lifecycle workload", () => {
  for (const width of [16, 128] as const) {
    for (const platform of ["Plain", "Zama"] as const) {
      it(`${platform} uses ${width}-bit input, state, and arithmetic for all five operations`, async () => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await (await hre.ethers.getContractFactory(`EnergyUniform${platform}${width}`)).deploy();
        const address = await contract.getAddress();
        const mask = (1n << BigInt(width)) - 1n;
        const value = (1n << BigInt(width - 1)) + 7n;
        assert.equal(await contract.SMART_METER_ID(), smartMeterId);
        // Energy state belongs to this public meter, whose owner is confidential on FHE.
        if (platform === "Plain") {
          await assert.rejects(contract.addEnergyEntry(value), /Meter owner not registered/);
          await assert.rejects(contract.setSmartMeterOwner(hre.ethers.ZeroHash, smartMeterOwner), /Unknown smart meter/);
          await (await contract.setSmartMeterOwner(smartMeterId, smartMeterOwner)).wait();
          assert.equal((await contract.getSmartMeterOwner(smartMeterId)).toLowerCase(), smartMeterOwner);
        } else {
          const encryptedOwner = await hre.fhevm.createEncryptedInput(address, owner.address).addAddress(smartMeterOwner).encrypt();
          await (await contract.setSmartMeterOwner(smartMeterId, encryptedOwner.handles[0], encryptedOwner.inputProof)).wait();
          const ownerHandle = hre.ethers.toBeHex(await contract.getSmartMeterOwner(smartMeterId), 32);
          assert.equal((await hre.fhevm.userDecryptEaddress(ownerHandle, address, owner)).toLowerCase(), smartMeterOwner);
          const [, outsider] = await hre.ethers.getSigners();
          await assert.rejects((contract.connect(outsider) as any).getSmartMeterOwner(smartMeterId), /Not authorized/);
          await assert.rejects(hre.fhevm.userDecryptEaddress(ownerHandle, address, outsider));
        }
        await assert.rejects(contract.getSmartMeterOwner(hre.ethers.ZeroHash), /Unknown smart meter/);
        const read = async (getter: string) => {
          const handle = await contract.getFunction(getter)();
          return platform === "Plain" ? handle : hre.fhevm.userDecryptEuint(width === 16 ? 3 : 6,
            hre.ethers.toBeHex(handle, 32), address, owner);
        };
        if (platform === "Plain") await (await contract.addEnergyEntry(value)).wait();
        else {
          const input = hre.fhevm.createEncryptedInput(address, owner.address);
          const encrypted = await (width === 16 ? input.add16(value) : input.add128(value)).encrypt();
          await (await contract.addEnergyEntry(encrypted.handles[0], encrypted.inputProof)).wait();
        }
        assert.equal(await read("getLastEntryValue"), value);
        await (await contract.addLastEntryToEncryptedTotal()).wait();
        assert.equal(await read("getEncryptedTotalHandle"), value);
        await (await contract.multiplyLastEntryByConstant(3)).wait();
        assert.equal(await read("getLastResult"), value * 3n & mask);
        await (await contract.meanLastEntryAndEncryptedTotal()).wait();
        assert.equal(await read("getLastResult"), ((value + value) & mask) / 2n);
        await (await contract.maxLastEntryAndEncryptedTotal()).wait();
        assert.equal(await read("getLastResult"), value);
        const model = { last: value, total: value, width } as PlatformContext;
        assert.equal(expectedPlaintext("mean", model, 0n), ((value + value) & mask) / 2n);
      });
    }
  }

  it("times a fresh getter and decryption with the selected output width", async () => {
    const abi = new Interface(["function getLastResult() view returns (uint256)"]);
    const context: any = { contract: { interface: abi, target: "contract" }, adapter: {
      decrypt: async (handle: unknown, trace: unknown, phase: string, budget: number, width: number) => {
        assert.equal(handle, 123n); assert.equal(phase, "already_ready"); assert.equal(width, 128);
        assert(budget > 0 && budget <= 1000);
        return 77n;
      },
    } };
    const reference = { platform: "fhenix", operation: "max", run: 1, warmup: false,
      transactionHash: "tx", blockHash: "canonical", expectedPlaintext: "77" } as Sample;
    let calls = 0;
    const result = await measureViewDecrypt(context, "owner", async (method, params) => {
      calls++; assert.equal(method, "eth_call");
      assert.deepEqual(params[1], { blockHash: "canonical", requireCanonical: true });
      return abi.encodeFunctionResult("getLastResult", [123n]);
    }, reference, 128, 1000);
    assert.equal(calls, 1); assert.equal(result.status, "ok"); assert.equal(result.plaintext, "77");
    assert.equal(result.viewMs! + result.decryptAndValidationMs!, result.viewToValidatedPlaintextMs);
    context.adapter.decrypt = async () => 78n;
    const failed = await measureViewDecrypt(context, "owner", async () =>
      abi.encodeFunctionResult("getLastResult", [123n]), reference, 128, 1000);
    assert.equal(failed.status, "error");
  });
});
