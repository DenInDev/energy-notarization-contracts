import { createHash } from "node:crypto";

export type LifecyclePlatform = "baseline" | "zama" | "fhenix";
export type LifecycleOperation = "notarize" | "add" | "mul_scalar" | "mean" | "max";
export type ScheduledComparison = {
  run: number;
  operation: LifecycleOperation;
  order: LifecyclePlatform[];
};

export function buildLifecycleSchedule(
  runs: number,
  platforms: LifecyclePlatform[],
  operations: LifecycleOperation[],
  seed: string,
): ScheduledComparison[] {
  if (!Number.isInteger(runs) || runs < 1) throw new Error("Invalid schedule run count");
  if (!platforms.length || new Set(platforms).size !== platforms.length) throw new Error("Invalid platforms");
  if (!operations.length || new Set(operations).size !== operations.length) throw new Error("Invalid operations");
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle<T>(values: T[]): T[] {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  const orders = new Map<LifecycleOperation, LifecyclePlatform[][]>();
  for (const operation of operations) {
    const rounds: LifecyclePlatform[][] = [];
    // Each randomized Latin block gives every platform every submission position once.
    while (rounds.length < runs) {
      const base = shuffle(platforms);
      for (const offset of shuffle(platforms.map((_, index) => index))) {
        rounds.push([...base.slice(offset), ...base.slice(0, offset)]);
      }
    }
    orders.set(operation, rounds);
  }
  return Array.from({ length: runs }, (_, index) =>
    operations.map((operation) => ({ run: index + 1, operation, order: orders.get(operation)![index] })),
  ).flat();
}
