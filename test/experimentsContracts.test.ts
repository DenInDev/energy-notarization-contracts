import {strict as assert} from "node:assert";
import type {} from "@nomicfoundation/hardhat-ethers";
import type {} from "@fhevm/hardhat-plugin";
import hre from "hardhat";
import {toBeHex} from "ethers";
import {buildPlan,expectedResult,operationCodes} from "../tasks/experiments/plan";
import {makeExperimentAdapter} from "../tasks/experiments/adapters";
import {TimingTrace} from "../tasks/lib/lifecycleTiming";
import type {Width} from "../tasks/experiments/types";
import type {Platform} from "../tasks/lifecycle/types";
import {experimentDefaults} from "./experiments.test";

describe("expanded Solidity contracts (local correctness, not performance)", function () {
  this.timeout(120000);
  before(async () => { await hre.fhevm.initializeCLIApi(); });
  for (const platform of ["baseline","zama"] as Platform[]) for (const width of [8,16,32,64,128] as Width[])
    it(`${platform} ${width}-bit: overflow, equal-work reductions, chain and independent state`, async () => {
      const [owner,alice,bob]=await hre.ethers.getSigners();
      const factory=await hre.ethers.getContractFactory(`Experiment${platform==="baseline" ? "Plain" : "Zama"}${width}`,owner);
      const contract=await factory.deploy();await contract.waitForDeployment();
      const address=await contract.getAddress(),trace=new TimingTrace();
      await (await contract.authorize([alice.address])).wait();
      const adapter=await makeExperimentAdapter(platform,width,hre,owner,address,trace,true);
      const values=[(1n<<BigInt(width))-1n,3n,7n,11n];
      await (await contract.load(...await adapter.encrypt(values,trace,10000))).wait();
      const decrypted=await adapter.decrypt(Array.from(await contract.getInputs()),trace,10000);
      assert.deepEqual(decrypted.map(v=>BigInt(v as bigint)),values);
      const scenarios=buildPlan({...experimentDefaults,suite:"width,depth,chain",widths:String(width),counts:"4",chains:"4"})
        .map(s=>({...s,width}));
      for (const s of scenarios) {
        const expected=expectedResult(s,s.suite==="depth" ? values : values.slice(0,2));
        for (let i=0;i<s.chainLength;i++) await (await contract.execute(operationCodes[s.operation],4,i)).wait();
        const handle=await contract.getResult();
        const [actual]=await adapter.decrypt([handle],trace,10000);
        assert.equal(BigInt(actual as any),expected,s.operation);
      }
      await (await contract.append(...await adapter.encrypt(values,trace,10000))).wait();
      assert.equal(await contract.getStateCount(),4n);
      const stored=Array.from(await contract.getStateRange(0,4));
      assert.deepEqual((await adapter.decrypt(stored as bigint[],trace,10000)).map(v=>BigInt(v as bigint)),values);
      await (await contract.execute(8,4,0)).wait();
      assert.equal(BigInt((await adapter.decrypt([await contract.getResult()],trace,10000))[0] as any),
        BigInt.asUintN(width,values.reduce((a,b)=>a+b,0n)));
      assert.equal(await (contract.connect(alice) as any).getStateCount(),0n);
      await assert.rejects((contract.connect(bob) as any).getResult(),/Not authorized/);
      await assert.rejects((contract.connect(alice) as any).authorize([bob.address]),/Owner only/);
      if (platform==="zama") {
        const type=({8:2,16:3,32:4,64:5,128:6} as const)[width];
        await assert.rejects(hre.fhevm.userDecryptEuint(type,toBeHex(await contract.getResult(),32),address,alice));
      }
    });
});
