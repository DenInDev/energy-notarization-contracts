import { strict as assert } from "node:assert";
import { TimingTrace, deadline, observeHttp, summarize, validatePlaintext } from "../tasks/lib/lifecycleTiming";
import { buildLifecycleSchedule, type LifecyclePlatform } from "../tasks/lib/lifecycleSchedule";
import { Interface } from "ethers";
import { readLifecycleResult, readDeploymentBytecode } from "../tasks/lib/lifecycleResult";
import { retryLifecycleRead, isTransportFailure, isZamaGatewayNotReady, isZamaUserDecryptUnavailable, isMissingReceiptBlock } from "../tasks/lib/lifecycleReadRetry";
import { runConcurrentWorkers } from "../tasks/lib/lifecycleConcurrent";
import { readSettledNonce } from "../tasks/lib/lifecycleNonce";

describe("lifecycle timing", () => {
  it("retries a temporary canonical-hash RPC rejection while preserving the exact pinned state", async () => {
    const error = Object.assign(new Error("could not coalesce error"), {
      info: { error: { message: "hash is not currently canonical" } },
    });
    assert.equal(isMissingReceiptBlock(error), true);
    const abi = new Interface(["function getLastResult() view returns (uint16)"]);
    const trace = new TimingTrace();
    let attempts = 0;
    assert.equal(await retryLifecycleRead(trace, "completion.handle", 1000, () =>
      readLifecycleResult(async (method, params) => {
        assert.equal(method, "eth_call");
        assert.deepEqual(params[1], { blockHash: "same-receipt-hash", requireCanonical: true });
        if (++attempts < 3) throw error;
        return abi.encodeFunctionResult("getLastResult", [42n]);
      }, abi, "contract", "caller", "getLastResult", "same-receipt-hash"),
      1, false, false, true), 42n);
    assert.equal(attempts, 3);
    assert.equal(trace.stages.filter(stage => stage.stage === "completion.handle.receipt_block_retry").length, 2);
    await assert.rejects(retryLifecycleRead(trace, "persistent", 20, async () => { throw error; },
      1, false, false, true), candidate => candidate === error);
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "disabled", 1000, async () => {
      attempts++; throw error;
    }, 1), candidate => candidate === error);
    assert.equal(attempts, 1);
  });

  it("waits for preflight nonce agreement and bounds a persistent mismatch", async () => {
    let calls = 0;
    const nonce = await readSettledNonce(async (_method, params) => {
      const round = Math.floor(calls++ / 2);
      return params[1] === "latest" && round === 0 ? "0x1" : "0x2";
    }, "account", 1000, 1);
    assert.equal(nonce, 2);
    assert.equal(calls, 4);
    await assert.rejects(readSettledNonce(async (_method, params) =>
      params[1] === "latest" ? "0x1" : "0x2", "account", 20, 1), /did not converge/);
  });
  it("bounds malformed 503 USER_DECRYPT retries without retrying other operations or statuses", async () => {
    const error = new Error("Response body does not match the expected schema\n\nstatus: 503\noperation: USER_DECRYPT");
    assert.equal(isZamaUserDecryptUnavailable(error), true);
    const budgets: number[] = [], trace = new TimingTrace();
    assert.equal(await retryLifecycleRead(trace, "completion", 1000, async remaining => {
      budgets.push(remaining);
      if (budgets.length === 1) throw error;
      return 42n;
    }, 10, true, true), 42n);
    assert.ok(budgets[1] < budgets[0]);
    assert.ok(trace.stages.some(s => s.stage === "completion.service_unavailable_retry"));
    let calls = 0;
    await assert.rejects(retryLifecycleRead(trace, "persistent", 1000, async () => {
      calls++; throw error;
    }, 1, true, true), e => e === error);
    assert.equal(calls, 5);
    for (const denied of [error.message.replace("503", "429"), error.message.replace("503", "400"),
      error.message.replace("USER_DECRYPT", "INPUT_PROOF"), "Plaintext mismatch"]) {
      calls = 0;
      await assert.rejects(retryLifecycleRead(trace, "denied", 1000, async () => {
        calls++; throw new Error(denied);
      }, 1, true, true));
      assert.equal(calls, 1);
    }
    calls = 0;
    await assert.rejects(retryLifecycleRead(trace, "disabled", 1000, async () => {
      calls++; throw error;
    }, 1), e => e === error);
    assert.equal(calls, 1);
    calls = 0;
    await assert.rejects(retryLifecycleRead(trace, "expired", 1, async () => {
      calls++; throw error;
    }, 100, true, true), e => e === error);
    assert.equal(calls, 1);
  });
  it("retries missing receipt blocks only when enabled and pins deployment bytecode to its receipt", async () => {
    const missing = Object.assign(new Error("could not coalesce error"), { info: { error: { message: "block not found: 0xb52523" } } });
    assert.equal(isMissingReceiptBlock(missing), true);
    assert.equal(isMissingReceiptBlock(new Error("Non-canonical block")), false);
    const trace = new TimingTrace();
    let attempts = 0;
    const read = async () => { if (++attempts === 1) throw missing; return "0x1234"; };
    assert.equal(await retryLifecycleRead(trace, "setup.bytecode", 1000, read, 1, false, false, true), "0x1234");
    assert.ok(trace.stages.some((s) => s.stage === "setup.bytecode.receipt_block_retry"));
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "default", 1000, read, 1), (e) => e === missing);
    assert.equal(attempts, 1);
    assert.equal(await readDeploymentBytecode(async (method, params) => {
      assert.equal(method, "eth_getCode");
      assert.deepEqual(params, ["contract", { blockHash: "receipt-hash", requireCanonical: true }]);
      return "0x1234";
    }, "contract", "receipt-hash", trace, 1000), "0x1234");
    await assert.rejects(readDeploymentBytecode(async () => "0x", "contract", "receipt-hash", trace, 1000), /bytecode missing/);
  });
  it("allows receipt propagation beyond five reads without changing the canonical block or deadline", async () => {
    const trace=new TimingTrace(),budgets:number[]=[];
    const missing=new Error("block not found: canonical hash receipt-hash");
    let attempts=0;
    const abi=new Interface(["function getLastResult() view returns (uint64)"]);
    const result=await retryLifecycleRead(trace,"completion.handle",1000,async remaining=>{
      budgets.push(remaining);
      return readLifecycleResult(async (_method,params)=>{
        assert.deepEqual(params[1],{blockHash:"receipt-hash",requireCanonical:true});
        if(++attempts<=6)throw missing;
        return abi.encodeFunctionResult("getLastResult",[42n]);
      },abi,"contract","caller","getLastResult","receipt-hash");
    },1,false,false,true);
    assert.equal(result,42n);assert.equal(attempts,7);
    assert.ok(budgets.every((b,i)=>i===0 || b<=budgets[i-1]));
    await assert.rejects(retryLifecycleRead(trace,"persistent",20,async()=>{throw missing;},1,false,false,true),e=>e===missing);
    let canonicalAttempts=0;
    await assert.rejects(retryLifecycleRead(trace,"noncanonical",1000,async()=>{
      canonicalAttempts++;throw new Error("Non-canonical block");
    },1,false,false,true),/Non-canonical/);
    assert.equal(canonicalAttempts,1);
  });
  it("retries only the specific Zama gateway readiness response within a shrinking budget", async () => {
    const error = new Error("Ciphertext not ready for decryption on the gateway chain\n\nstatus: 503\noperation: USER_DECRYPT\nretryCount: 44");
    assert.equal(isZamaGatewayNotReady(error), true);
    assert.equal(isZamaGatewayNotReady(new Error("Service unavailable\nstatus: 503\noperation: USER_DECRYPT")), false);
    assert.equal(isZamaGatewayNotReady(new Error(error.message.replace("USER_DECRYPT", "INPUT_PROOF"))), false);
    const trace = new TimingTrace();
    const budgets: number[] = [];
    const read = async (remaining: number) => {
      budgets.push(remaining);
      if (budgets.length === 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw error;
      }
      return 42n;
    };
    assert.equal(await retryLifecycleRead(trace, "completion", 1000, read, 1, true, true), 42n);
    assert.ok(budgets[1] < budgets[0]);
    assert.ok(trace.stages.some((s) => s.stage === "completion.gateway_readiness_retry"));
    let attempts = 0;
    const fail = async () => { attempts++; throw error; };
    await assert.rejects(retryLifecycleRead(trace, "disabled", 1000, fail, 1, true), (e) => e === error);
    assert.equal(attempts, 1);
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "persistent", 20, fail, 1, true, true), (e) => e === error);
    assert.ok(attempts >= 1);
    attempts = 0;
    assert.equal(await retryLifecycleRead(trace, "long_budget", 1000, async () => {
      if (++attempts < 7) throw error;
      return 42n;
    }, 1, true, true), 42n);
    assert.equal(attempts, 7);
    assert.equal(trace.stages.find((s) => s.stage === "long_budget.gateway_readiness_retry" && s.detail?.failedAttempt === 6)?.detail?.backoffMs, 8);
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "expired", 1, fail, 100, true, true), (e) => e === error);
    assert.equal(attempts, 1);
  });
  it("starts every worker before waiting, preserves positions, and drains failures", async () => {
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const pending = runConcurrentWorkers(["baseline", "zama", "fhenix"], async (platform, position) => {
      started.push(platform);
      if (started.length === 3) release();
      await gate;
      return 100 + position;
    });
    assert.deepEqual(await pending, [100, 101, 102]);
    assert.equal(started.length, 3);
    let drained = false;
    await assert.rejects(runConcurrentWorkers([0, 1], async (worker) => {
      if (worker === 0) throw new Error("worker failed");
      await new Promise((resolve) => setTimeout(resolve, 5));
      drained = true;
    }), /worker failed/);
    assert.equal(drained, true);
  });

  it("isolates concurrent HTTP traces and restores fetch after all observers finish", async () => {
    const original = globalThis.fetch;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fake: typeof fetch = async () => new Response("ok");
    globalThis.fetch = fake;
    try {
      const a = new TimingTrace();
      const b = new TimingTrace();
      const first = observeHttp(a, "first", async () => {
        await gate;
        await fetch("https://first.example/a");
      });
      await observeHttp(b, "second", () => fetch("https://second.example/b"));
      assert.notEqual(globalThis.fetch, fake);
      release();
      await first;
      assert.equal(globalThis.fetch, fake);
      assert.equal(a.stages.length, 1);
      assert.equal(b.stages.length, 1);
      assert.equal(a.stages[0].detail?.host, "first.example");
      assert.equal(b.stages[0].detail?.host, "second.example");
    } finally {
      release();
      globalThis.fetch = original;
    }
  });
  it("retries Zama ACL checks only when enabled, records delays, and retains persistent denials", async () => {
    const denial = new Error(`dapp contract 0x${"ab".repeat(20)} is not authorized to user decrypt handle 0x${"cd".repeat(32)}!`);
    const trace = new TimingTrace();
    let attempts = 0;
    const read = async () => {
      if (++attempts === 1) throw denial;
      return 174n;
    };
    assert.equal(await retryLifecycleRead(trace, "completion", 1000, read, 1, true), 174n);
    assert.equal(attempts, 2);
    const retry = trace.stages.find((s) => s.stage === "completion.acl_check_retry");
    assert.equal(retry?.detail?.failedAttempt, 1);
    assert.equal(retry?.detail?.backoffMs, 1);
    assert.ok(trace.stages.some((s) => s.stage === "completion.retry_backoff"));
    assert.equal(trace.stages[0].status, "error");
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "default", 1000, read, 1), (e) => e === denial);
    assert.equal(attempts, 1);
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "persistent", 1000, async () => {
      attempts++;
      throw denial;
    }, 1, true), (e) => e === denial);
    assert.equal(attempts, 5);
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "bounded", 1, async () => {
      attempts++;
      throw denial;
    }, 100, true), (e) => e === denial);
    assert.equal(attempts, 1);
    attempts = 0;
    await assert.rejects(retryLifecycleRead(trace, "other", 1000, async () => {
      attempts++;
      throw new Error("Unauthorized signature");
    }, 1, true), /Unauthorized signature/);
    assert.equal(attempts, 1);
  });
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
