import { performance } from "node:perf_hooks";
import type { TimingTrace } from "./lifecycleTiming";

export function isTransportFailure(error: unknown): boolean {
  let current: any = error;
  for (let depth = 0; current && depth < 8; depth++, current = current.cause) {
    if (
      /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|UND_ERR_|socket.*(?:closed|disconnected)/i.test(
        `${current.message || ""} ${current.code || ""} ${String(current)}`,
      )
    )
      return true;
  }
  return false;
}

export async function retryLifecycleRead<T>(
  trace: TimingTrace,
  phase: string,
  timeoutMs: number,
  read: () => Promise<T>,
  backoffMs = 1000,
): Promise<T> {
  const end = performance.now() + timeoutMs;
  for (let attempt = 1; ; attempt++) {
    try {
      return await trace.span(`${phase}.read_attempt`, read);
    } catch (error) {
      const delay = backoffMs * 2 ** (attempt - 1);
      if (attempt >= 5 || !isTransportFailure(error) || performance.now() + delay >= end) throw error;
      trace.event(`${phase}.transport_retry`, { failedAttempt: attempt, backoffMs: delay });
      await trace.span(`${phase}.retry_backoff`, () => new Promise((resolve) => setTimeout(resolve, delay)));
      if (performance.now() >= end) throw error;
    }
  }
}
