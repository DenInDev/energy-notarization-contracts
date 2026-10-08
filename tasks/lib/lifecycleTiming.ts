import { performance } from "node:perf_hooks";

export type TimingStage = {
  stage: string;
  startMs: number;
  durationMs: number;
  status: "ok" | "error" | "event";
  detail?: Record<string, unknown>;
};

export class TimingTrace {
  readonly stages: TimingStage[] = [];
  private readonly epoch = performance.now();

  now(): number {
    return performance.now() - this.epoch;
  }

  event(stage: string, detail: Record<string, unknown> = {}): void {
    this.stages.push({ stage, startMs: this.now(), durationMs: 0, status: "event", detail });
  }

  async span<T>(stage: string, fn: () => T | Promise<T>): Promise<T> {
    const startMs = this.now();
    try {
      const result = await fn();
      this.stages.push({ stage, startMs, durationMs: this.now() - startMs, status: "ok" });
      return result;
    } catch (error) {
      this.stages.push({ stage, startMs, durationMs: this.now() - startMs, status: "error" });
      throw error;
    }
  }
}

export function validatePlaintext(value: unknown, expected: bigint): string {
  if (typeof value !== "bigint" && typeof value !== "string" && typeof value !== "number") {
    throw new Error("Missing or invalid decrypted plaintext");
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("Unsafe plaintext number");
  const actual = BigInt(value);
  if (actual !== expected) throw new Error(`Plaintext mismatch: expected ${expected}, received ${actual}`);
  return actual.toString();
}

export function summarize(values: number[]) {
  if (values.length === 0) return { n: 0, mean: null, stddev: null, min: null, max: null, median: null };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    n: values.length,
    mean,
    stddev:
      values.length < 2 ? null : Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2,
  };
}

// A deadline observes SDK failure; it cannot cancel APIs that expose no AbortSignal.
export async function deadline<T>(fn: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} deadline exceeded (${timeoutMs} ms)`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function observeHttp<T>(trace: TimingTrace, phase: string, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const startMs = trace.now();
    try {
      const response = await original(input, init);
      trace.stages.push({
        stage: `${phase}.http_headers`,
        startMs,
        durationMs: trace.now() - startMs,
        status: response.ok ? "ok" : "error",
        detail: {
          host: url.hostname,
          path: url.pathname,
          method: init?.method ?? "GET",
          httpStatus: response.status,
          serverDate: response.headers.get("date"),
        },
      });
      return response;
    } catch (error) {
      trace.stages.push({
        stage: `${phase}.http_headers`,
        startMs,
        durationMs: trace.now() - startMs,
        status: "error",
        detail: { host: url.hostname, path: url.pathname },
      });
      throw error;
    }
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}
