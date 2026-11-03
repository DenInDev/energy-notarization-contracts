import { strict as assert } from "node:assert";
import { Wallet, Transaction, keccak256 } from "ethers";
import { prepareSignedOperation, broadcastSignedOperation, sendRawTransactionOnce } from "../tasks/lifecycle/broadcast";
import { TimingTrace } from "../tasks/lib/lifecycleTiming";
import type { Sample } from "../tasks/lifecycle/types";

describe("prepared raw transaction broadcast", () => {
  it("does not inherit hidden HTTP retries or redirects for rate-limited mutation requests", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++; assert.equal(init?.redirect, "error");
      return new Response("rate limited", { status: 429, headers: { "Retry-After": "1" } });
    };
    try {
      await assert.rejects(sendRawTransactionOnce("https://example.org/rpc", "signed", 1000), /HTTP 429/);
      assert.equal(calls, 1);
    } finally { globalThis.fetch = original; }
  });
  const wallet = Wallet.createRandom();
  const tx = { to: "0x0000000000000000000000000000000000000001", nonce: 91,
    chainId: 11155111n, type: 2, gasLimit: 21000n, maxFeePerGas: 100n, maxPriorityFeePerGas: 2n };
  const makeSample = (hash: string): Sample => ({ platform: "baseline", operation: "add", run: 1,
    warmup: false, startedAt: new Date().toISOString(), status: "pending", stages: [],
    expectedPlaintext: "42", preparedTransactionHash: hash, broadcastState: "prepared" });

  it("estimates and signs before broadcasting, keeping exact owner, chain, nonce and shared fee quote", async () => {
    let populated = 0;
    const signer = { address: wallet.address, populateTransaction: async (request: any) => {
      populated++; assert.equal(request.nonce, 91); assert.equal(request.maxFeePerGas, 100n);
      return { ...request, gasLimit: 21000n };
    }, signTransaction: (request: any) => wallet.signTransaction(request) };
    const contract = { getFunction: (name: string) => ({ populateTransaction: async (...args: any[]) => {
      assert.equal(name, "multiplyLastEntryByConstant"); assert.deepEqual(args, [3n]); return { to: tx.to };
    } }) };
    const signed = await prepareSignedOperation(contract, signer, "mul_scalar", [], 3n, 91,
      { maxFeePerGas: "100", maxPriorityFeePerGas: "2", quotedAt: "test" });
    assert.equal(populated, 1); assert.equal(signed.hash, keccak256(signed.raw));
    assert.equal(Transaction.from(signed.raw).from, wallet.address);
  });
  it("marks start/ack/receipt independently, polls only reads and never resubmits", async () => {
    const raw = await wallet.signTransaction(tx), hash = keccak256(raw), sample = makeSample(hash), trace = new TimingTrace();
    let sends = 0, reads = 0, updates = 0;
    const result = await broadcastSignedOperation(raw, async (method, params) => {
      if (method === "eth_sendRawTransaction") {
        assert.deepEqual(params, [raw]); assert.equal(sample.broadcastState, "started"); sends++; return hash;
      }
      assert.equal(method, "eth_getTransactionReceipt"); assert.deepEqual(params, [hash]);
      if (++reads === 1) return null;
      return { transactionHash: hash, status: "0x1", blockNumber: "0xa", blockHash: "canonical",
        gasUsed: "0x5208", effectiveGasPrice: "0x14" };
    }, sample, trace, 2000, () => { updates++; });
    const receipt = await result.wait();
    assert.equal(sends, 1); assert.equal(reads, 2); assert.equal(updates, 2);
    assert.equal(receipt!.gasUsed, 21000n); assert.equal(receipt!.gasPrice, 20n);
    assert.equal(sample.broadcastState, "acknowledged"); assert(sample.broadcastStartedAt);
    assert(sample.broadcastAcknowledgedAt); assert(Number.isFinite(sample.broadcastAckMs));
  });
  it("retains a deterministic hash after an ambiguous send failure without retry", async () => {
    const raw = await wallet.signTransaction(tx), hash = keccak256(raw), sample = makeSample(hash);
    let sends = 0;
    await assert.rejects(broadcastSignedOperation(raw, async () => { sends++; throw new Error("fetch failed"); },
      sample, new TimingTrace(), 1000, () => {}), /fetch failed/);
    assert.equal(sends, 1); assert.equal(sample.transactionHash, hash);
    assert.equal(sample.broadcastState, "uncertain");
    assert.equal(sample.broadcastAcknowledgedAt, undefined);
  });
  it("rejects another chain or mismatched hash before any mutation RPC", async () => {
    let sends = 0;
    const rpc = async () => { sends++; return "unused"; };
    const wrongChain = await wallet.signTransaction({ ...tx, chainId: 1n });
    await assert.rejects(broadcastSignedOperation(wrongChain, rpc, makeSample(keccak256(wrongChain)),
      new TimingTrace(), 1000, () => {}), /Sepolia/);
    const raw = await wallet.signTransaction(tx);
    await assert.rejects(broadcastSignedOperation(raw, rpc, makeSample("wrong"), new TimingTrace(), 1000, () => {}), /Sepolia/);
    assert.equal(sends, 0);
  });
});
