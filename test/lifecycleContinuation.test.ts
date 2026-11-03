import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface, keccak256, toBeHex, formatEther } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { generateAccounts } from "../tasks/experiments/accounts";
import { createLifecycleReport } from "../tasks/lifecycle/report";
import { continueLifecycleCampaign } from "../tasks/lifecycle/continuation";
import { planLifecycleContinuation } from "../tasks/lifecycle/continuationPlan";
import { buildLifecycleSchedule } from "../tasks/lib/lifecycleSchedule";
import { operations, type Platform, type Sample } from "../tasks/lifecycle/types";
import { expectedPlaintext } from "../tasks/lifecycle/operations";

describe("receipt-confirmed lifecycle continuation", () => {
  const platforms: Platform[] = ["baseline", "zama", "fhenix"];
  const abi = new Interface(["function getLastEntryValue() view returns (uint256)",
    "function getEncryptedTotalHandle() view returns (uint256)", "function getLastResult() view returns (uint256)"]);
  const blockHash = toBeHex(999, 32), code = "0x6000";
  const adapters = require("../tasks/lifecycle/adapters");

  function fixture(folder: string) {
    const accountsFile = path.join(folder, "keys.json");
    const accounts = generateAccounts(accountsFile, 3).accounts;
    const addresses = platforms.map((_, i) => toBeHex(i + 1, 20));
    const states = platforms.map(() => ({ last: 0n, total: 0n, result: 0n }));
    const nonces = platforms.map(() => 101), sent: number[] = [];
    let invalid: "nonce" | "code" | "state" | undefined;
    const hre: any = { network: { config: { url: "https://example.org/rpc" } }, run: async () => {},
      ethers: { keccak256, toBeHex, formatEther,
        provider: { getNetwork: async () => ({ chainId: 11155111n }),
          getBlock: async () => ({ timestamp: 1, gasUsed: 100n, gasLimit: 1000n }),
          send: async (method: string, params: any[]) => {
            const index = accounts.findIndex(a => a.address.toLowerCase() === String(params[0]).toLowerCase());
            if (method === "eth_getTransactionCount") return toBeHex(nonces[index] + (invalid === "nonce" ? 1 : 0));
            if (method === "eth_getBalance") return "0x1";
            if (method === "eth_getBlockByNumber") return { hash: blockHash, number: "0x3e8" };
            if (method === "eth_getCode") return invalid === "code" ? "0x6001" : code;
            if (method === "eth_getTransactionReceipt") return { status: "0x1", blockHash, blockNumber: "0x3e8" };
            if (method === "eth_getTransactionByHash") {
              const i = platforms.findIndex((_, i) => params[0] === toBeHex(i * 1000 + 108, 32));
              return { nonce: toBeHex(108), from: accounts[i].address, to: addresses[i] };
            }
            assert.equal(method, "eth_call");
            assert.deepEqual(params[1], { blockHash, requireCanonical: true });
            const i = addresses.indexOf(params[0].to);
            const getter = abi.parseTransaction({ data: params[0].data })!.name;
            const state = states[i];
            const value = getter === "getLastEntryValue" ? state.last : getter === "getEncryptedTotalHandle" ?
              state.total + (invalid === "state" ? 1n : 0n) : state.result;
            return abi.encodeFunctionResult(getter, [value]);
          } },
        getContractAt: async (_name: string, address: string) => {
          const i = addresses.indexOf(address), state = states[i];
          const tx = ({ nonce }: { nonce: number }) => {
            assert.equal(nonce, nonces[i]++); sent.push(nonce);
            return { hash: toBeHex(i * 1000 + nonce, 32), nonce, wait: async () =>
              ({ status: 1, blockHash, blockNumber: 1000, gasUsed: 100n, gasPrice: 2n }) };
          };
          return { target: address, interface: abi,
            meanLastEntryAndEncryptedTotal: async (opts: any) => { state.result = (state.last + state.total) / 2n; return tx(opts); },
            maxLastEntryAndEncryptedTotal: async (opts: any) => { state.result = state.total; return tx(opts); } };
        } } };
    const schedule = buildLifecycleSchedule(1, platforms, operations, "continue-test");
    const setup = platforms.map((platform, i) => ({ platform, status: "ok", transactionNonce: 100,
      address: addresses[i], deployedBytecodeKeccak256: keccak256(code) }));
    const samples: Sample[] = [];
    const report = createLifecycleReport({ runs: 1, platform: "all", seed: "continue-test", timeout: 10,
      outputDir: folder }, hre, { address: accounts[0].address } as any, platforms, schedule, setup, samples);
    report.platformOwners = Object.fromEntries(platforms.map((p, i) => [p, accounts[i].address]));
    report.signerMode = "independent_platform_accounts"; report.complete = false;
    const rows = [...schedule.map(c => ({ ...c, run: 0, warmup: true })),
      ...schedule.slice(0, 3).map(c => ({ ...c, warmup: false }))];
    for (const row of rows) for (const platform of row.order) {
      const i = platforms.indexOf(platform), state = states[i];
      const expected = expectedPlaintext(row.operation, state as any, BigInt(row.operation === "notarize" ? 42 + row.run : 3 + row.run));
      if (row.operation === "notarize") state.last = expected;
      else if (row.operation === "add") state.total = expected;
      else state.result = expected;
      const failed = platform === "zama" && !row.warmup && row.operation === "mul_scalar";
      const nonce = nonces[i]++;
      samples.push({ platform, run: row.run, operation: row.operation, warmup: row.warmup,
        status: failed ? "error" : "ok", stages: [], startedAt: new Date().toISOString(),
        expectedPlaintext: String(expected), plaintext: failed ? undefined : String(expected),
        outputHandle: platform === "baseline" ? undefined : toBeHex(expected, 32),
        transactionHash: toBeHex(i * 1000 + nonce, 32), transactionNonce: nonce,
        blockHash, receiptObservedAt: new Date().toISOString(), gasUsed: 100,
        error: failed ? "Retained original failure" : undefined,
        readyDecryptError: platform === "zama" && !row.warmup && row.operation === "add" ? "Retained repeat failure" : undefined });
    }
    return { hre: hre as HardhatRuntimeEnvironment, accountsFile, report, sent, setInvalid: (value: typeof invalid) => { invalid = value; } };
  }

  it("refuses gaps, duplicates, nonce ambiguity and changed plaintext models", () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "continuation-plan-"));
    try {
      const { report } = fixture(folder);
      assert.deepEqual(planLifecycleContinuation(report).remaining.map(c => c.operation), ["mean", "max"]);
      for (const mutate of [
        (r: any) => { r.executionMode = "isolated_processes_prepared_submission_barrier"; },
        (r: any) => r.samples.pop(),
        (r: any) => { r.samples[1].platform = r.samples[0].platform; },
        (r: any) => { delete r.samples.at(-1).transactionHash; },
        (r: any) => { r.samples.at(-1).transactionNonce++; },
        (r: any) => { r.samples.at(-1).expectedPlaintext = "123"; },
      ]) {
        const modified = JSON.parse(JSON.stringify(report)); mutate(modified);
        assert.throws(() => planLifecycleContinuation(modified));
      }
    } finally { fs.rmSync(folder, { recursive: true, force: true }); }
  });

  for (const invalid of [undefined, "nonce", "code", "state"] as const) {
    it(invalid ? `sends nothing on ${invalid} preflight mismatch` : "sends only missing comparisons and never repairs historical failure timings", async () => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), "continuation-run-"));
      const original = adapters.makeAdapter;
      adapters.makeAdapter = async () => ({ encrypt: async () => [], decrypt: async (handle: any) => BigInt(handle) });
      try {
        const f = fixture(folder); f.setInvalid(invalid);
        const sourcePath = path.join(folder, "source.json"), outputDir = path.join(folder, "continued");
        const sourceBytes = JSON.stringify(f.report); fs.writeFileSync(sourcePath, sourceBytes);
        const run = continueLifecycleCampaign({ report: sourcePath, outputDir, accountsFile: f.accountsFile }, f.hre);
        if (invalid) { await assert.rejects(run); assert.equal(f.sent.length, 0); }
        else {
          await run;
          assert.deepEqual(f.sent, [109, 109, 109, 110, 110, 110]);
          const result = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
          assert.equal(result.samples.length, 30);
          assert.deepEqual(result.samples.slice(0, 24), JSON.parse(sourceBytes).samples);
          assert.equal(result.executionComplete, true); assert.equal(result.complete, false);
          assert.equal(result.continuations[0].recoveries.length, 1);
          assert.equal(result.continuations[0].recoveries[0].plaintext, "172");
          assert.equal(result.samples.filter((s: any) => s.status === "error").length, 1);
          assert.equal(result.samples.filter((s: any) => s.readyDecryptError).length, 1);
        }
        assert.equal(fs.readFileSync(sourcePath, "utf8"), sourceBytes);
        assert.equal(fs.existsSync(path.join(folder, "campaign.lock")), false);
      } finally { adapters.makeAdapter = original; fs.rmSync(folder, { recursive: true, force: true }); }
    });
  }
});
