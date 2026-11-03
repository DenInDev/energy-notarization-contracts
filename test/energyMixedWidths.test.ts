import { strict as assert } from "node:assert";
import type {} from "@nomicfoundation/hardhat-ethers";
import type {} from "@fhevm/hardhat-plugin";
import hre from "hardhat";
import { toBeHex } from "ethers";

describe("energy lifecycle: 16-bit readings and 64-bit computation", function () {
  this.timeout(120000);
  before(async () => { await hre.fhevm.initializeCLIApi(); });
  for (const encrypted of [false,true]) {
    it(`${encrypted ? "Zama mock" : "plaintext"}: widens before sums, products, means and maxima`, async () => {
      const [owner]=await hre.ethers.getSigners();
      const factory=await hre.ethers.getContractFactory(encrypted ? "EnergyNotarizationFHETest" : "EnergyNotarizationPlainTest");
      const contract=await factory.deploy(); await contract.waitForDeployment();
      const address=await contract.getAddress();
      const read=async (getter:string,width:16|64=64) => {
        const value=await contract.getFunction(getter)();
        return encrypted ? hre.fhevm.userDecryptEuint(width===16 ? 3 : 5,toBeHex(value,32),address,owner) : value;
      };
      const load=async (value:bigint) => {
        const args=encrypted ? await (async()=>{
          const input=await hre.fhevm.createEncryptedInput(address,owner.address).add16(value).encrypt();
          return [input.handles[0],input.inputProof];
        })() : [value];
        await (await contract.getFunction("addEnergyEntry")(...args)).wait();
      };
      await load(65535n);
      assert.equal(await read("getLastEntryValue",16),65535n);
      for(let i=0;i<2;i++) await (await contract.getFunction("addLastEntryToEncryptedTotal")()).wait();
      assert.equal(await read("getEncryptedTotalHandle"),131070n);
      await (await contract.getFunction("multiplyLastEntryByConstant")(131071n)).wait();
      assert.equal(await read("getLastResult"),65535n*131071n);
      await (await contract.getFunction("meanLastEntryAndEncryptedTotal")()).wait();
      assert.equal(await read("getLastResult"),98302n);
      await (await contract.getFunction("maxLastEntryAndEncryptedTotal")()).wait();
      assert.equal(await read("getLastResult"),131070n);
      await load(1n);
      assert.equal(await read("getLastEntryValue",16),1n);
      assert.equal(await read("getEncryptedTotalHandle"),131070n);
      await (await contract.getFunction("addLastEntryToEncryptedTotal")()).wait();
      assert.equal(await read("getEncryptedTotalHandle"),131071n);
      if(!encrypted) await assert.rejects(load(65536n),/out-of-bounds|value out-of-bounds/);
    });
  }
});
