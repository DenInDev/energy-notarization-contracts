import { strict as assert } from "node:assert";
import { diagnosticFailure } from "../tasks/lifecycle/diagnostic";
import { ObservationDeadlineError, deadline, type TimingStage } from "../tasks/lib/lifecycleTiming";

describe("lifecycle diagnostic outcomes", () => {
  const queued: TimingStage = { stage: "completion.sdk_progress", startMs: 1,
    durationMs: 0, status: "event", detail: { operation: "USER_DECRYPT", type: "queued", jobId: "job" } };
  it("reports a real observation timeout and preserves the last queued job through cancellation", async () => {
    let timeout: unknown;
    try { await deadline(() => new Promise<never>(() => {}), 5, "diagnostic decryption"); }
    catch (error) { timeout = error; }
    assert.ok(timeout instanceof ObservationDeadlineError);
    const outcome = diagnosticFailure(timeout, [queued, { ...queued,
      detail: { operation: "USER_DECRYPT", type: "abort", jobId: "job" } }]);
    assert.equal(outcome.status, "timed_out");
    assert.equal(outcome.lastObservedJobState, "queued");
    assert.equal(outcome.jobId, "job");
  });
  it("does not turn a later SDK failure into a timeout because the job was previously queued", () => {
    const outcome = diagnosticFailure(new Error("Authorization rejected"), [queued,
      { ...queued, detail: { operation: "USER_DECRYPT", type: "failed", jobId: "job" } }]);
    assert.equal(outcome.status, "error");
    assert.equal(outcome.error, "Authorization rejected");
    assert.equal(outcome.lastObservedJobState, "failed");
  });
});
