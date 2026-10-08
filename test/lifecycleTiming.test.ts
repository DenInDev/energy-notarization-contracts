import { strict as assert } from "node:assert";
import { TimingTrace, deadline, observeHttp, summarize, validatePlaintext } from "../tasks/lib/lifecycleTiming";
import { buildLifecycleSchedule, type LifecyclePlatform } from "../tasks/lib/lifecycleSchedule";
import { Interface } from "ethers";
import { readLifecycleResult } from "../tasks/lib/lifecycleResult";
import { retryLifecycleRead, isTransportFailure } from "../tasks/lib/lifecycleReadRetry";

describe("lifecycle timing", () => {
  it("includes transport attempts and backoff in retrieval timing, without retrying semantic failures", async () => {
    const trace = new TimingTrace();
    let attempts = 0;
    assert.equal(
      await retryLifecycleRead(
        trace,
        "completion",
        1000,
        async () => {
          if (++attempts === 1) throw new TypeError("fetch failed");
          return 810n;
        },
        1,
      ),
      810n,
    );
    assert.equal(attempts, 2);
    assert.equal(trace.stages.filter((stage) => stage.stage === "completion.transport_retry").length, 1);
    assert.equal(trace.stages[0].status, "error");
    assert.ok(trace.stages.some((stage) => stage.stage === "completion.retry_backoff"));
    let rejected = 0;
    await assert.rejects(
      retryLifecycleRead(
        trace,
        "bad",
        1000,
        async () => {
          rejected++;
          throw new Error("Plaintext mismatch");
        },
        1,
      ),
      /mismatch/,
    );
    assert.equal(rejected, 1);
    assert.equal(isTransportFailure(new Error("Unauthorized")), false);
    const tlsReset = Object.assign(
      new Error("Client network socket disconnected before secure TLS connection was established"),
      { code: "ECONNRESET" },
    );
    assert.equal(isTransportFailure(tlsReset), true);
    assert.equal(
      isTransportFailure(Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" })),
      false,
    );
    attempts = 0;
    await assert.rejects(
      retryLifecycleRead(
        trace,
        "failed",
        1000,
        async () => {
          attempts++;
          throw new Error("ECONNRESET");
        },
        1,
      ),
      /ECONNRESET/,
    );
    assert.equal(attempts, 5);
    attempts = 0;
    await assert.rejects(
      retryLifecycleRead(
        trace,
        "deadline",
        1,
        async () => {
          attempts++;
          throw new Error("fetch failed");
        },
        100,
      ),
      /fetch failed/,
    );
    assert.equal(attempts, 1);
  });
  it("reads the receipt's canonical state rather than a possibly stale latest RPC state", async () => {
    const abi = new Interface(["function getLastResult() view returns (uint256)"]);
    const blockHash = "0x" + "ab".repeat(32);
    const send = async (method: string, params: any[]) => {
      assert.equal(method, "eth_call");
      assert.deepEqual(params, [
        { to: "contract", from: "owner", data: abi.encodeFunctionData("getLastResult") },
        { blockHash, requireCanonical: true },
      ]);
      return abi.encodeFunctionResult("getLastResult", [810n]);
    };
    assert.equal(await readLifecycleResult(send, abi, "contract", "owner", "getLastResult", blockHash), 810n);
    await assert.rejects(
      readLifecycleResult(
        async () => {
          throw new Error("Non-canonical block");
        },
        abi,
        "contract",
        "owner",
        "getLastResult",
        blockHash,
      ),
      /Non-canonical/,
    );
  });
  it("interleaves all three platforms for each operation with reproducible balanced positions over 50 rounds", () => {
    const platforms: LifecyclePlatform[] = ["baseline", "zama", "fhenix"];
    const operations = ["notarize", "add", "mul_scalar", "mean", "max"] as const;
    const schedule = buildLifecycleSchedule(50, platforms, [...operations], "test-seed");
    assert.equal(schedule.length, 250);
    assert.deepEqual(schedule, buildLifecycleSchedule(50, platforms, [...operations], "test-seed"));
    assert.notDeepEqual(schedule, buildLifecycleSchedule(50, platforms, [...operations], "other-seed"));
    for (const operation of operations) {
      const comparisons = schedule.filter((row) => row.operation === operation);
      assert.equal(comparisons.length, 50);
      for (const row of comparisons) assert.deepEqual([...row.order].sort(), [...platforms].sort());
      for (const platform of platforms) {
        const counts = platforms.map(
          (_, position) => comparisons.filter((row) => row.order[position] === platform).length,
        );
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
      }
    }
    assert.deepEqual(
      schedule.slice(0, 5).map((row) => row.operation),
      operations,
    );
    assert.equal(buildLifecycleSchedule(2, ["baseline"], ["add"], "single")[1].order[0], "baseline");
    assert.throws(() => buildLifecycleSchedule(0, platforms, ["add"], "bad"), /run count/);
    assert.throws(() => buildLifecycleSchedule(2, ["baseline", "baseline"], ["add"], "bad"), /platforms/);
  });
  it("validates plaintext, including zero, and rejects mismatches/missing/unsafe results", () => {
    assert.equal(validatePlaintext(0n, 0n), "0");
    assert.equal(validatePlaintext("123", 123n), "123");
    assert.throws(() => validatePlaintext(124n, 123n), /mismatch/);
    assert.throws(() => validatePlaintext(undefined, 123n), /Missing/);
    assert.throws(() => validatePlaintext(Number.MAX_SAFE_INTEGER + 1, 123n), /Unsafe/);
  });

  it("uses sample standard deviation and does not manufacture empty/singleton uncertainty", () => {
    const result = summarize([10, 20, 30]);
    assert.equal(result.mean, 20);
    assert.equal(result.stddev, 10);
    assert.equal(result.median, 20);
    assert.equal(summarize([]).mean, null);
    assert.equal(summarize([10]).stddev, null);
  });

  it("records failed spans and keeps completion distinct from ready-repeat timing", async () => {
    const trace = new TimingTrace();
    await trace.span("completion", () => 1);
    await assert.rejects(trace.span("already_ready", () => Promise.reject(new Error("remote failed"))));
    assert.equal(trace.stages[0].stage, "completion");
    assert.equal(trace.stages[0].status, "ok");
    assert.equal(trace.stages[1].stage, "already_ready");
    assert.equal(trace.stages[1].status, "error");
    assert.ok(trace.stages[1].startMs >= trace.stages[0].startMs);
  });

  it("bounds observation and propagates SDK failures", async () => {
    await assert.rejects(
      deadline(() => new Promise(() => {}), 5, "test"),
      /deadline/,
    );
    await assert.rejects(
      deadline(() => Promise.reject(new Error("SDK error")), 50, "test"),
      /SDK error/,
    );
    assert.equal(await deadline(() => Promise.resolve(42), 50, "test"), 42);
  });

  it("records HTTP status without recording payloads or URL query credentials and restores fetch", async () => {
    const original = globalThis.fetch;
    const fake: typeof fetch = async () => new Response("private response", { status: 404 });
    globalThis.fetch = fake;
    try {
      const trace = new TimingTrace();
      await observeHttp(trace, "encrypt", () =>
        fetch("https://example.org/verify?token=secret", {
          method: "POST",
          body: "private witness",
        }),
      );
      assert.equal(globalThis.fetch, fake);
      assert.equal(trace.stages[0].detail?.httpStatus, 404);
      assert.equal(trace.stages[0].status, "error");
      assert.equal(trace.stages[0].detail?.path, "/verify");
      assert.ok(!JSON.stringify(trace.stages).includes("secret"));
      assert.ok(!JSON.stringify(trace.stages).includes("private"));
    } finally {
      globalThis.fetch = original;
    }
  });
});
