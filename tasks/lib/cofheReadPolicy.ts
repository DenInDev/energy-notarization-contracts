import { performance } from "node:perf_hooks";
import type { TimingTrace } from "./lifecycleTiming";

export type CofheReadPolicy = {
  minimumPollingMs: number;
  maxRateLimitAttempts: number;
  rateLimitBackoffMs: number;
};

// Throttle only off-chain seal-output reads, preserving larger server hints.
// A fresh SDK read can retry HTTP 429 within the same original deadline.
export async function withCofheReadPolicy<T>(trace: TimingTrace, phase: string, timeoutMs: number,
  policy: CofheReadPolicy, read: (remainingMs: number) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const end = performance.now() + timeoutMs;
  let rateLimited = false, serverDelayMs = 0;
  const wrapped: typeof fetch = async (input, init) => {
    const response = await original(input, init);
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (!url.hostname.endsWith(".fhenix.zone") || !url.pathname.startsWith("/v2/sealoutput")) return response;
    const serverHint = require("./decryptionPolling.cjs").decryptionPollDelay(response);
    if (response.status === 429) { rateLimited = true; serverDelayMs = serverHint; }
    if (![200, 202, 204, 404].includes(response.status) || serverHint >= policy.minimumPollingMs) return response;
    const headers = new Headers(response.headers);
    headers.set("Retry-After", String(policy.minimumPollingMs / 1000));
    trace.event(`${phase}.client_poll_floor`, { httpStatus: response.status,
      originalServerHintMs: serverHint, clientMinimumMs: policy.minimumPollingMs,
      appliedHintMs: policy.minimumPollingMs, note: "Hint only; a completed response does not cause a wait" });
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
  globalThis.fetch = wrapped;
  try {
    for (let attempt = 1; ; attempt++) {
      rateLimited = false; serverDelayMs = 0;
      try { return await read(Math.max(1, Math.floor(end - performance.now()))); }
      catch (error) {
        const delay = Math.max(serverDelayMs, policy.rateLimitBackoffMs * 2 ** (attempt - 1));
        if (!rateLimited || attempt >= policy.maxRateLimitAttempts || performance.now() + delay >= end) throw error;
        trace.event(`${phase}.http429_read_retry`, { failedAttempt: attempt, backoffMs: delay, serverHintMs: serverDelayMs });
        await trace.span(`${phase}.http429_backoff`, () => new Promise(resolve => setTimeout(resolve, delay)));
      }
    }
  } finally { globalThis.fetch = original; }
}
