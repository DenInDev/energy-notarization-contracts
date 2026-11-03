// One synchronous allocator for deployments, warmup, and measured workers.
// The account must be dedicated to this campaign while it is running.
export function createNonceAllocator(initialNonce: number) {
  if (!Number.isSafeInteger(initialNonce) || initialNonce < 0) throw new Error("Invalid initial nonce");
  let next = initialNonce;
  return {
    reserve(count = 1): number {
      if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(next + count))
        throw new Error("Invalid nonce reservation");
      const first = next;
      next += count;
      return first;
    },
  };
}
