// Drain every worker before reporting failure so no in-flight observation is lost.
export async function runConcurrentWorkers<T, R>(
  workers: T[],
  run: (worker: T, position: number) => Promise<R>,
): Promise<R[]> {
  const results = await Promise.allSettled(workers.map((worker, position) =>
    Promise.resolve().then(() => run(worker, position)),
  ));
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  return results.map((result) => (result as PromiseFulfilledResult<R>).value);
}
