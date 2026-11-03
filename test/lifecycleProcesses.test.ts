import { strict as assert } from "node:assert";
import path from "node:path";
import { LifecycleWorkerClient } from "../tasks/lifecycle/workerClient";

describe("real process isolation and readiness barrier", () => {
  it("boots the actual isolated Hardhat entry point and shuts down without deploying", async () => {
    const worker = new LifecycleWorkerClient(() => {});
    await worker.close(30000);
  });
  it("separates CPU-bound proofs, keeps baseline responsive and releases only after all are ready", async () => {
    const script = path.resolve("scripts/test-fixtures/lifecycle-process.cjs");
    const workers = [0, 1, 2].map(() => new LifecycleWorkerClient(() => {}, script));
    try {
      assert.equal(new Set(workers.map(w => w.child.pid)).size, 3);
      assert(workers.every(w => w.child.pid !== process.pid));
      // Startup handshake removes OS process-launch variability from the check.
      await Promise.all(workers.map(w => w.request("prepare", { cpuMs: 0 }, 10000)));
      const fast = workers[0].request("prepare", { cpuMs: 0 }, 10000);
      const slow = workers.slice(1).map(w => w.request("prepare", { cpuMs: 600 }, 10000));
      const baseline = await fast;
      const readiness = [baseline, ...await Promise.all(slow)];
      assert(readiness.slice(1).every(s => s.readyAt - baseline.readyAt > 300), "Other proofs must not stall baseline's event loop");
      const releaseAt = Date.now() + 200;
      const results = await Promise.all(workers.map(w => w.request("execute", { releaseAt }, 10000)));
      const latestReady = Math.max(...readiness.map(s => s.readyAt));
      assert(results.every(r => r.broadcastAt >= latestReady && r.broadcastAt >= releaseAt - 2));
      assert(Math.max(...results.map(r => r.broadcastAt)) - Math.min(...results.map(r => r.broadcastAt)) < 250);
    } finally { await Promise.all(workers.map(w => w.close(10000))); }
  });
  it("reports worker exit instead of silently replacing it or replaying commands", async () => {
    const worker = new LifecycleWorkerClient(() => {}, path.resolve("scripts/test-fixtures/lifecycle-process.cjs"));
    await assert.rejects(worker.request("crash", {}, 10000), /exited \(7\)/);
    await assert.rejects(worker.request("execute", {}, 10000), /unavailable/);
  });
});
