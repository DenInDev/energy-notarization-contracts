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
  read: (remainingMs: number) => Promise<T>,
  backoffMs = 1000,
  retryZamaAclCheck = false,
  retryZamaGatewayReadiness = false,
  retryMissingReceiptBlock = false,
  retryRpcServiceErrors = false,
): Promise<T> {
  const end = performance.now() + timeoutMs;
  for (let attempt = 1; ; attempt++) {
    try {
      return await trace.span(`${phase}.read_attempt`, () => read(Math.max(1, Math.floor(end - performance.now()))));
    } catch (error) {
      let delay = backoffMs * 2 ** Math.min(attempt - 1, 3);
      const rpcService = retryRpcServiceErrors && isRpcServiceReadFailure(error);
      if(rpcService)delay=Math.max(delay,rpcRetryAfterMs(error));
      
      // Zama's SDK checks ACL permissions against latest RPC state, which can
      // lag the mined receipt. Retry only its specific user-decrypt ACL denial.
      const aclFailure = retryZamaAclCheck && isZamaAclCheckFailure(error);
      const readinessFailure = retryZamaGatewayReadiness && isZamaGatewayNotReady(error);
      const serviceUnavailable = retryZamaGatewayReadiness && isZamaUserDecryptUnavailable(error);
      const missingBlock = retryMissingReceiptBlock && isMissingReceiptBlock(error);

      // The service can finish a polling job with "not ready" before the
      // caller's deadline. Allow a fresh read job to use the remaining budget.
      // Receipt propagation can lag on an RPC backend after another backend
      // returned the receipt. Keep retrying the exact canonical hash within
      // the original deadline, just as for gateway readiness. A backend may
      // temporarily reject requireCanonical while another already sees the block.
      const attemptsExhausted = attempt >= 5 && !readinessFailure && !missingBlock;
      if (attemptsExhausted || (!isTransportFailure(error) && !aclFailure && !readinessFailure && !serviceUnavailable && !missingBlock && !rpcService) || performance.now() + delay >= end)
        throw error;

      const reason = rpcService ? "rpc_service_retry" : missingBlock ? "receipt_block_retry" : readinessFailure ? "gateway_readiness_retry" : serviceUnavailable ? "service_unavailable_retry" : aclFailure ? "acl_check_retry" : "transport_retry";
      trace.event(`${phase}.${reason}`, {
        failedAttempt: attempt,
        backoffMs: delay,
      });

      await trace.span(`${phase}.retry_backoff`, () => new Promise((resolve) => setTimeout(resolve, delay)));
      if (performance.now() >= end) throw error;
    }
  }
}

// An HTTP 503 can contain an HTML/proxy body that the SDK rejects before it
// exposes a structured relayer error. Retry this read only, at most five times.
export function isZamaUserDecryptUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const response = error as Error & { status?: number; operation?: string };

  return (response.status === 503 || /(?:^|\n)status: 503(?:\n|$)/.test(error.message)) &&
    (response.operation === "USER_DECRYPT" || /(?:^|\n)operation: USER_DECRYPT(?:\n|$)/.test(error.message));
}

export function isMissingReceiptBlock(error: unknown): boolean {
  const candidate = error as { message?: string; info?: { error?: { message?: string } }; error?: { message?: string } } | null;
  if (!candidate) return false;

  return [candidate.message, candidate.info?.error?.message, candidate.error?.message].some(
    (message) => typeof message === "string" &&
      (/^block not found(?::|$)/i.test(message) || /^hash is not currently canonical$/i.test(message)),
  );
}

export function isZamaGatewayNotReady(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const response = error as Error & { status?: number; operation?: string };

  return error.message.startsWith("Ciphertext not ready for decryption on the gateway chain") &&
    (response.status === 503 || /(?:^|\n)status: 503(?:\n|$)/.test(error.message)) &&
    (response.operation === "USER_DECRYPT" || /(?:^|\n)operation: USER_DECRYPT(?:\n|$)/.test(error.message));
}

export function isZamaAclCheckFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /^\s*(?:dapp contract|User address|User) 0x[0-9a-f]{40} is not authorized to user decrypt handle 0x[0-9a-f]{64}!\s*$/i.test(
    error.message,
  );
}

// Opt-in for explicitly whitelisted read-only RPCs. Contract reverts and
// malformed requests are not evidence that the HTTP service will recover.
export function isRpcServiceReadFailure(error: unknown): boolean {
  const queue:unknown[]=[error],seen=new Set<unknown>();let transient=false;
  while(queue.length&&seen.size<24){
    const item=queue.shift();if(!item||seen.has(item))continue;seen.add(item);
    if(typeof item!=="object")continue;
    const e=item as Record<string,any>,message=String(e.message??"");
    if(e.code==="CALL_EXCEPTION"||/execution reverted|invalid (?:argument|params)|insufficient funds/i.test(message))return false;
    if([429,500,502,503,504].includes(Number(e.status??e.statusCode??e.response?.status)))transient=true;
    if(/(?:HH110:|Invalid JSON-RPC response received:)[\s\S]*(?:Service Unavailable|Bad Gateway|Gateway (?:Timeout|Time-out)|Too Many Requests)/i.test(message))transient=true;
    queue.push(e.cause,e.error,e.info,e.response);
  }
  return transient;
}

export function rpcRetryAfterMs(error: unknown): number {
  const queue:any[]=[error],seen=new Set<any>();let hint=0;
  while(queue.length&&seen.size<24){
    const e=queue.shift();if(!e||typeof e!=="object"||seen.has(e))continue;seen.add(e);
    if(Number.isFinite(e.retryAfterMs)&&e.retryAfterMs>=0)hint=Math.max(hint,e.retryAfterMs);
    const raw=typeof e.headers?.get==="function"?e.headers.get("retry-after"):e.headers?.["retry-after"]??e.headers?.["Retry-After"];
    if(raw!==null&&raw!==undefined){
      const seconds=Number(raw),duration=Number.isFinite(seconds)?seconds*1000:Date.parse(String(raw))-Date.now();
      if(Number.isFinite(duration)&&duration>=0)hint=Math.max(hint,duration);
    }
    queue.push(e.cause,e.error,e.info,e.response);
  }
  return hint;
}
