import type {} from "@nomicfoundation/hardhat-ethers";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface, keccak256, formatEther } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { runLifecycleCampaign } from "../tasks/lifecycle/campaign";
import { createNonceAllocator } from "../tasks/lib/lifecycleNonce";
import { generateAccounts } from "../tasks/experiments/accounts";

describe("lifecycle campaign nonce ownership", () => {
  it("reserves consecutive deployment and concurrent worker nonces", () => {
    const cursor = createNonceAllocator(113);
    assert.deepEqual([cursor.reserve(), cursor.reserve(), cursor.reserve()], [113, 114, 115]);
    assert.equal(cursor.reserve(3), 116);
    assert.equal(cursor.reserve(3), 119);
    assert.throws(() => cursor.reserve(0));
    assert.equal(cursor.reserve(), 122);
    assert.throws(() => createNonceAllocator(NaN));
  });

  for (const { failWarmup, setupTimeout, localAccounts } of [
    { failWarmup: false, setupTimeout: 10, localAccounts: false },
    { failWarmup: true, setupTimeout: 10, localAccounts: false },
    { failWarmup: false, setupTimeout: undefined, localAccounts: false },
    { failWarmup: false, setupTimeout: 10, localAccounts: true },
  ]) {
    it(localAccounts ? "uses the saved platform wallet without consulting the legacy signer" : failWarmup ? "retains failed warmup and never starts measured transactions" :
      setupTimeout === undefined ? "inherits --timeout for deployment and warmup when no setup override is given" :
      "never reuses a stale RPC nonce after deployment or warmup", async () => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), "lifecycle-campaign-test-"));
      const accountsFile = localAccounts ? path.join(folder,"keys.json") : undefined;
      const savedAccounts = accountsFile ? generateAccounts(accountsFile,3).accounts : undefined;
      const abi = new Interface([
        "function getLastEntryValue() view returns (uint256)",
        "function getEncryptedTotalHandle() view returns (uint256)",
        "function getLastResult() view returns (uint256)",
      ]);
      const sent: number[] = [];
      const waits: number[] = [];
      let next = 113, last = 0n, total = 0n, result = 0n, reads = 0;
      const transaction = (nonce: number) => {
        assert.equal(nonce, next, "Explicit nonce must advance past every previous transaction");
        next++;
        sent.push(nonce);
        return { hash: `tx-${nonce}`, nonce, wait: async (_confirmations: number, timeout: number) => {
          waits.push(timeout);
          return { status: failWarmup && nonce === 114 ? 0 : 1,
            blockNumber: nonce, blockHash: `block-${nonce}`, gasUsed: 100n, gasPrice: 2n };
        } };
      };
      const contract = {
        target: "contract", interface: abi, getAddress: async () => "contract",
        deploymentTransaction: () => deployment,
        addEnergyEntry: async (value: bigint, { nonce }: { nonce: number }) => {
          last = value; return transaction(nonce);
        },
        addLastEntryToEncryptedTotal: async ({ nonce }: { nonce: number }) => {
          total += last; return transaction(nonce);
        },
        multiplyLastEntryByConstant: async (value: bigint, { nonce }: { nonce: number }) => {
          result = last * value; return transaction(nonce);
        },
        meanLastEntryAndEncryptedTotal: async ({ nonce }: { nonce: number }) => {
          result = (last + total) / 2n; return transaction(nonce);
        },
        maxLastEntryAndEncryptedTotal: async ({ nonce }: { nonce: number }) => {
          result = last > total ? last : total; return transaction(nonce);
        },
      };
      let deployment: ReturnType<typeof transaction>;
      const hre = {
        network: { config: { url: "https://example.org/rpc" } }, run: async () => {},
        ethers: { keccak256, formatEther,
          getSigners: async () => { assert.equal(localAccounts,false); return [{ address: "owner" }]; },
          getContractFactory: async (_name:string,signer:{address:string}) => ({ deploy: async ({ nonce }: { nonce: number }) => {
            if (savedAccounts) assert.equal(signer.address,savedAccounts[0].address);
            deployment = transaction(nonce); return contract;
          } }),
          provider: {
            getNetwork: async () => ({ chainId: 11155111n }),
            getFeeData: async () => ({ gasPrice: 2n }), getBalance: async () => 1n,
            getTransactionCount: async () => 113, // Deliberately stale throughout.
            getBlock: async () => ({ timestamp: 1, gasUsed: 100n, gasLimit: 1000n }),
            send: async (method: string, params: any[]) => {
              if (method === "eth_getTransactionCount") { reads++; return "0x71"; }
              if (method === "eth_getCode") return "0x6000";
              assert.equal(method, "eth_call");
              const fn = abi.parseTransaction({ data: params[0].data })!.name;
              return abi.encodeFunctionResult(fn, [fn === "getLastEntryValue" ? last :
                fn === "getEncryptedTotalHandle" ? total : result]);
            },
          },
        },
      } as unknown as HardhatRuntimeEnvironment;
      try {
        const run = runLifecycleCampaign({ runs: 1, platform: "baseline", seed: "test",
          timeout: 6000, setupTimeout, outputDir: folder, accountsFile, execution: "async" }, hre);
        if (failWarmup) await assert.rejects(run, /Warmup campaign stopped/);
        else await run;
        assert.equal(reads, localAccounts ? 2 : 1);
        assert.deepEqual(sent, Array.from({ length: failWarmup ? 2 : 11 }, (_, i) => 113 + i));
        const expectedSetupMs = (setupTimeout ?? 6000) * 1000;
        assert.deepEqual(waits, failWarmup ? [expectedSetupMs, expectedSetupMs] :
          [...Array(6).fill(expectedSetupMs), ...Array(5).fill(6000000)]);
        const report = JSON.parse(fs.readFileSync(path.join(folder, "report.json"), "utf8"));
        assert.equal(report.complete, !failWarmup);
        assert.equal(report.setupObservationTimeoutMs, expectedSetupMs);
        assert.equal(report.observationTimeoutMs, 6000000);
        if (savedAccounts) {
          assert.equal(report.signerMode,"independent_platform_accounts");
          assert.equal(report.platformOwners.baseline,savedAccounts[0].address);
        }
        if (failWarmup) {
          assert.equal(report.samples.length, 1);
          assert.equal(report.setup[0].status, "error");
        }
      } finally {
        for (const file of ["report.json", "summary.md", "stages.jsonl", "schedule.json","keys.json","addresses.json"])
          fs.rmSync(path.join(folder, file), { force: true });
        fs.rmdirSync(folder);
      }
    });
  }
});
