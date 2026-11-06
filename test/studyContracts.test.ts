import { strict as assert } from "node:assert";
import hre from "hardhat";
import { capacityRejection } from "../tasks/studies/capacity";

// Local FHE simulation checks arithmetic and access control, not Sepolia capacity.
describe("study contract arithmetic and immutable snapshots", function () {
  this.timeout(180000);

  for (const width of [16,128] as const) for (const platform of ["Plain","Zama"] as const) {
    it(`${platform}${width}: validates snapshots/arithmetic and preserves exact HCU boundaries`, async () => {
      const [owner,alice,bob,outsider] = await hre.ethers.getSigners();
      const contract = await (await hre.ethers.getContractFactory(`Study${platform}${width}`)).deploy();
      const address = await contract.getAddress(), wrap = (n: bigint) => BigInt.asUintN(width,n);
      const id = (s: string) => hre.ethers.id(`${platform}/${width}/${s}`);

      const encrypt = async (values: bigint[], signer = owner): Promise<[any[],any]> => {
        if (platform === "Plain") return [values,"0x"];
        const builder = hre.fhevm.createEncryptedInput(address,signer.address);
        for (const value of values) builder[`add${width}`](value);
        const encrypted = await builder.encrypt();
        return [Array.from(encrypted.handles),encrypted.inputProof];
      };

      const plaintext = async (handle: bigint) => platform === "Plain" ? handle :
        hre.fhevm.userDecryptEuint(width === 16 ? 3 : 6,hre.ethers.toBeHex(handle,32),address,owner);

      await (await contract.authorize([alice.address,bob.address])).wait();
      await assert.rejects((contract.connect(alice) as any).authorize([outsider.address]),/Owner only/);
      const window = id("ordered");
      await (await contract.openWindow(window,2,[alice.address])).wait();
      const maximum = (1n<<BigInt(width))-1n;
      await (await (contract.connect(alice) as any).submit(window,id("first"),...await encrypt([maximum],alice))).wait();
      await (await (contract.connect(alice) as any).submit(window,id("second"),...await encrypt([7n],alice))).wait();
      assert.equal(await plaintext(await contract.getSnapshot(id("first"))),maximum);
      assert.equal(await plaintext(await contract.getSnapshot(id("second"))),wrap(3n*maximum+7n));
      assert.equal(await plaintext(await contract.getWindowState(window,owner.address)),4n);
      await assert.rejects((contract.connect(bob) as any).getSnapshot(id("first")),/Not your request/);
      await assert.rejects((contract.connect(bob) as any).submit(window,id("outsider"),...await encrypt([1n],bob)),/Bad request/);
      await assert.rejects((contract.connect(alice) as any).submit(window,id("first"),...await encrypt([1n],alice)),/Bad request/);
      await assert.rejects(contract.openWindow(window,1,[alice.address]),/Bad window/);

      for (const size of [2,32]) for (const kind of [0,1]) {
        const operands = Array.from({length:size},(_,i) => wrap(maximum-BigInt(i)));
        const sum = wrap(operands.reduce((a,b) => a+b,0n));
        const job = id(`sum${kind}/${size}`), request = id(`sum-result${kind}/${size}`);
        // Two setup chunks also exercise the installed SDK's 2,048-bit boundary.
        for (let offset=0; offset<size; offset+=16)
          await (await contract.loadCircuit(job,...await encrypt(operands.slice(offset,offset+16)))).wait();
        if (platform === "Zama" && width === 128 && kind === 0 && size === 32) {
          await assert.rejects(contract.executeCircuit.estimateGas(job,request,kind,size),
            error => capacityRejection(error) === "HCUTransactionDepthLimitExceeded");
          continue;
        }
        await (await contract.executeCircuit(job,request,kind,size)).wait();
        assert.equal(await plaintext(await contract.getSnapshot(request)),sum);
        await assert.rejects(contract.executeCircuit(job,request,kind,size),/Bad circuit/);
        await assert.rejects(contract.loadCircuit(job,...await encrypt([1n,2n])),/Bad inputs/);
      }

      for (const size of [2,32]) {
        const job = id(`affine/${size}`), result = id(`affine-result/${size}`);
        await (await contract.loadCircuit(job,...await encrypt([maximum,3n]))).wait();
        if (platform === "Zama" && size === 32) {
          await assert.rejects(contract.executeCircuit.estimateGas(job,result,2,size),
            error => capacityRejection(error) === "HCUTransactionDepthLimitExceeded");
          continue;
        }
        await (await contract.executeCircuit(job,result,2,size)).wait();
        let expected = maximum;
        for (let i=0;i<size;i++) expected = wrap(3n*expected+maximum);
        assert.equal(await plaintext(await contract.getSnapshot(result)),expected);
      }
    });
  }
});
