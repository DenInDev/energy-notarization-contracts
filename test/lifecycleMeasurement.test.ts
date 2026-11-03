import type {} from "@nomicfoundation/hardhat-ethers";
import { strict as assert } from "node:assert";
import { Interface, toBeHex, type Contract } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { createMeasurementRunner } from "../tasks/lifecycle/measurement";
import type {
  Adapter,
  Platform,
  PlatformContext,
  Sample,
} from "../tasks/lifecycle/types";

function fixture(platform: Platform, decrypt: Adapter["decrypt"], notarize = false, missingReads = 0) {
  const samples: Sample[] = [];
  const abi = new Interface([
    "function getEncryptedTotalHandle() view returns (uint256)",
    "function getLastEntryValue() view returns (uint256)",
  ]);
  let submittedNonce: number | undefined;
  let submissions=0, reads=0;
  const contract = {
    interface: abi,
    target: "contract",
    addLastEntryToEncryptedTotal: async (overrides: { nonce?: number }) => {
      submittedNonce = overrides.nonce;
      submissions++;
      return {
        hash: "tx",
        nonce: overrides.nonce,
        wait: async () => ({
          status: 1,
          blockNumber: 10,
          blockHash: "block",
          gasUsed: 100n,
          gasPrice: 2n,
        }),
      };
    },
  } as unknown as Contract;
  if (notarize) (contract as any).addEnergyEntry = (contract as any).addLastEntryToEncryptedTotal;
  const context: PlatformContext = {
    contract,
    adapter: { encrypt: async () => [], decrypt },
    last: 42n,
    total: 100n,
  };
  const hre = {
    ethers: {
      toBeHex,
      provider: {
        send: async (_method: string, params: unknown[]) => {
          assert.deepEqual(params[1], {
            blockHash: "block",
            requireCanonical: true,
          });
          if (++reads<=missingReads) throw new Error("block not found: canonical hash block");
          return abi.encodeFunctionResult(notarize ? "getLastEntryValue" : "getEncryptedTotalHandle", [
            platform === "baseline" ? 142n : 7n,
          ]);
        },
      },
    },
  } as unknown as HardhatRuntimeEnvironment;
  const signer = { address: "owner" } as HardhatEthersSigner;
  return {
    context,
    samples,
    nonce: () => submittedNonce,
    submissions: () => submissions,
    reads: () => reads,
    measure: createMeasurementRunner({
      hre,
      signer,
      timeoutMs: missingReads ? 10000 : 1000,
      setupTimeoutMs: 50,
      samples,
      contexts: new Map([[platform, context]]),
    }),
  };
}

describe("lifecycle measurement", () => {
  it("retries the receipt-pinned getter after RPC propagation failure without resubmitting", async () => {
    const f=fixture("baseline",async()=>{throw new Error("must not decrypt");},false,2);
    const sample=await f.measure({platform:"baseline",operation:"add",run:1,value:3n,warmup:false,nonce:91});
    assert.equal(sample.status,"ok",sample.error);
    assert.equal(f.submissions(),1);assert.equal(f.reads(),3);
    assert.equal(sample.plaintext,"142");
    assert.equal(sample.stages.filter(s=>s.stage==="completion.handle.receipt_block_retry").length,2);
    assert.ok(sample.postReceiptToValidatedPlaintextMs!>=3000);
  });
  it("uses the reading width for notarization and 64 bits for computed result decryption", async () => {
    for (const notarize of [true,false]) {
      const widths: (number | undefined)[]=[];
      const f=fixture("fhenix",async (_h,_t,_p,_timeout,width)=>{widths.push(width);return 142n;},notarize);
      const sample=await f.measure({platform:"fhenix",operation:notarize ? "notarize" : "add",
        run:1,value:142n,warmup:false,nonce:90});
      assert.equal(sample.status,"ok",sample.error);
      assert.deepEqual(widths,notarize ? [16,16] : [64,64]);
    }
  });
  it("passes the shorter setup budget to warmup decryption without a ready-repeat", async () => {
    const budgets: (number | undefined)[] = [];
    const f = fixture("zama", async (_handle, _trace, _phase, timeout) => {
      budgets.push(timeout);
      return 142n;
    });
    const sample = await f.measure({ platform: "zama", operation: "add", run: 0,
      value: 3n, warmup: true, nonce: 90 });
    assert.equal(sample.status, "ok");
    assert.deepEqual(budgets, [50]);
  });
  it("preserves timing identity, receipt-pinned reads, and explicit nonce submission", async () => {
    const f = fixture("baseline", async () => {
      throw new Error("Baseline must not decrypt");
    });
    const sample = await f.measure({
      platform: "baseline",
      operation: "add",
      run: 1,
      value: 3n,
      warmup: false,
      orderPosition: 2,
      nonce: 91,
    });
    assert.equal(sample.status, "ok");
    assert.equal(sample.plaintext, "142");
    assert.equal(sample.transactionNonce, 91);
    assert.equal(f.nonce(), 91);
    assert.equal(f.context.total, 142n);
    assert.equal(f.samples[0], sample);
    assert.ok(
      Math.abs(
        sample.transactionToValidatedPlaintextMs! -
          sample.confirmationMs! -
          sample.postReceiptToValidatedPlaintextMs!,
      ) < 0.001,
    );
    assert.equal(sample.alreadyReadyDecryptMs, undefined);
  });

  it("retains confirmed transaction data and model updates when primary decryption fails", async () => {
    const f = fixture("zama", async () => {
      throw new Error("SDK failed");
    });
    const sample = await f.measure({
      platform: "zama",
      operation: "add",
      run: 1,
      value: 3n,
      warmup: false,
      orderPosition: 1,
      nonce: 90,
    });
    assert.equal(sample.status, "error");
    assert.equal(sample.error, "SDK failed");
    assert.equal(sample.gasUsed, 100);
    assert.notEqual(sample.confirmationMs, undefined);
    assert.equal(sample.transactionToValidatedPlaintextMs, undefined);
    assert.equal(f.context.total, 142n);
  });

  it("keeps a primary success when its separate ready-repeat fails", async () => {
    const phases: string[] = [];
    const f = fixture("fhenix", async (_handle, _trace, phase) => {
      phases.push(phase);
      if (phase === "already_ready") throw new Error("Repeat failed");
      return 142n;
    });
    const sample = await f.measure({
      platform: "fhenix",
      operation: "add",
      run: 1,
      value: 3n,
      warmup: false,
      orderPosition: 3,
      nonce: 92,
    });
    assert.equal(sample.status, "ok");
    assert.equal(sample.readyDecryptError, "Repeat failed");
    assert.equal(sample.alreadyReadyDecryptMs, undefined);
    assert.deepEqual(phases, ["completion", "already_ready"]);
  });
});
