import { strict as assert } from "node:assert";
import { TimingTrace } from "../tasks/lib/lifecycleTiming";
import { withCofheReadPolicy } from "../tasks/lib/cofheReadPolicy";

describe("bounded CoFHE read throttling", () => {
  const url = "https://testnet-cofhe-tn.fhenix.zone/v2/sealoutput";
  const policy = { minimumPollingMs: 1000, maxRateLimitAttempts: 3, rateLimitBackoffMs: 5 };

  it("raises only seal-output polling hints and preserves larger server waits and bodies", async () => {
    const original = globalThis.fetch;
    let hint = "0.1";
    globalThis.fetch = async () => new Response(JSON.stringify({ status: "PROCESSING" }),
      { headers: { "Retry-After": hint } });
    const trace = new TimingTrace();
    try {
      await withCofheReadPolicy(trace, "completion", 1000, policy, async () => {
        const short = await fetch(url);
        assert.equal(short.headers.get("Retry-After"), "1");
        assert.deepEqual(await short.json(), { status: "PROCESSING" });
        hint = "5";
        assert.equal((await fetch(url)).headers.get("Retry-After"), "5");
        hint = "0.1";
        assert.equal((await fetch("https://example.org/rpc")).headers.get("Retry-After"), "0.1");
      });
      assert.equal(trace.stages.filter(s => s.stage === "completion.client_poll_floor").length, 1);
    } finally { globalThis.fetch = original; }
  });

  it("retries actual HTTP 429 reads with a shrinking deadline and records the waits", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => new Response("", { status: ++calls < 3 ? 429 : 200 });
    const trace = new TimingTrace(), budgets: number[] = [];
    try {
      const value = await withCofheReadPolicy(trace, "completion", 500, policy, async remaining => {
        budgets.push(remaining);
        if ((await fetch(url)).status === 429) throw new Error("SDK rate limit");
        return 42n;
      });
      assert.equal(value, 42n); assert.equal(calls, 3);
      assert(budgets[0] > budgets[1] && budgets[1] > budgets[2]);
      assert.equal(trace.stages.filter(s => s.stage === "completion.http429_backoff").length, 2);
    } finally { globalThis.fetch = original; }
  });

  it("bounds persistent limits and never retries an unrelated RPC or semantic error", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response("", { status: 429 }); };
    try {
      await assert.rejects(withCofheReadPolicy(new TimingTrace(), "completion", 500, policy, async () => {
        await fetch(url); throw new Error("SDK rate limit");
      }), /rate limit/);
      assert.equal(calls, 3); calls = 0;
      await assert.rejects(withCofheReadPolicy(new TimingTrace(), "completion", 500, policy, async () => {
        await fetch("https://example.org/rpc"); throw new Error("RPC rejected");
      }), /RPC rejected/);
      assert.equal(calls, 1);
      await assert.rejects(withCofheReadPolicy(new TimingTrace(), "completion", 500, policy,
        async () => { throw new Error("Semantic error"); }), /Semantic/);
    } finally { globalThis.fetch = original; }
  });

  it("does not start a retry when the server wait exceeds the original deadline", async () => {
    const original = globalThis.fetch; let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response("", { status: 429, headers: { "Retry-After": "5" } }); };
    try {
      await assert.rejects(withCofheReadPolicy(new TimingTrace(), "completion", 50, policy, async () => {
        await fetch(url); throw new Error("Rate limit deadline");
      }), /deadline/);
      assert.equal(calls, 1);
    } finally { globalThis.fetch = original; }
  });
});
