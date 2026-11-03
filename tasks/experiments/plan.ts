import { createHash } from "node:crypto";
import type { ExperimentArgs, Scenario, Suite, Width, Operation } from "./types";
import type { Platform } from "../lifecycle/types";

export const operationCodes: Partial<Record<Operation, number>> = {
  add: 0, mul: 1, compare_select: 2, tariff: 3, sum_linear: 4, sum_tree: 5, chain: 6, state_read: 7, state_sum: 8,
};
export function integers(raw: string, label: string, allowed: readonly number[]): number[] {
  const values = raw.split(",").map(v => Number(v.trim()));
  if (!values.length || values.some(v => !allowed.includes(v)) || new Set(values).size !== values.length)
    throw new Error(`${label}: choose distinct values from ${allowed.join(",")}`);
  return values;
}
export function platforms(raw: string): Platform[] {
  const values = raw === "all" ? ["baseline", "zama", "fhenix"] : raw.split(",");
  if (values.some(v => !["baseline", "zama", "fhenix"].includes(v)) || new Set(values).size !== values.length)
    throw new Error("Platform must be all or a comma-separated subset of baseline,zama,fhenix");
  return values as Platform[];
}
export function buildPlan(args: ExperimentArgs): Scenario[] {
  const suites: Suite[] = ["width", "inputs", "depth", "chain", "state", "concurrency"];
  const selected = args.suite === "all" ? suites : args.suite.split(",") as Suite[];
  if (selected.some(v => !suites.includes(v)) || new Set(selected).size !== selected.length) throw new Error("Unknown/duplicate suite");
  if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 1000) throw new Error("Runs must be 1..1000");
  if (!Number.isInteger(args.requests) || args.requests < 1 || args.requests > 10000) throw new Error("Requests must be 1..10000");
  if (!Number.isInteger(args.timeout) || args.timeout < 1 || args.timeout > 86400) throw new Error("Timeout must be 1..86400 seconds");
  platforms(args.platform);
  const widths = integers(args.widths, "Widths", [8,16,32,64,128]) as Width[];
  const counts = integers(args.counts, "Counts", [1,2,4,8,16,32]);
  const chains = integers(args.chains, "Chains", [1,2,4,8,16]);
  const users = integers(args.users, "Users", [1,2,4,8]);
  const states = integers(args.states, "States", [16,64,256,1024]).sort((a,b) => a-b);
  const touched = integers(args.touched, "Touched", [1,4,16,32]);
  if (selected.includes("concurrency") && users.some(u => args.requests % u !== 0))
    throw new Error("Requests is the fixed TOTAL per load window and must be divisible by every selected user count");
  const cases: Scenario[] = [];
  const add = (suite: Suite, operation: Operation, overrides: Partial<Scenario> = {}) => {
    const scenario: Scenario = { id: "", suite, operation, width: 64, inputCount: 2, depth: 1,
      operationCount: 1, chainLength: 1, users: 1, stateSize: 0, touched: 0, ...overrides };
    scenario.id = [suite, operation, `w${scenario.width}`, `n${scenario.inputCount}`, `d${scenario.depth}`,
      `l${scenario.chainLength}`, `u${scenario.users}`, `s${scenario.stateSize}`, `t${scenario.touched}`].join("-");
    cases.push(scenario);
  };
  if (selected.includes("width")) for (const width of widths)
    for (const operation of ["add", "mul", "compare_select", "tariff"] as Operation[])
      add("width", operation, { width, depth: operation === "compare_select" || operation === "tariff" ? 2 : 1,
        operationCount: operation === "compare_select" || operation === "tariff" ? 2 : 1 });
  if (selected.includes("inputs")) for (const n of counts) add("inputs", "import", { inputCount:n, depth:0, operationCount:0 });
  if (selected.includes("depth")) for (const n of counts.filter(v => v > 1)) {
    add("depth", "sum_linear", { inputCount:n, depth:n-1, operationCount:n-1 });
    add("depth", "sum_tree", { inputCount:n, depth:Math.ceil(Math.log2(n)), operationCount:n-1 });
  }
  if (selected.includes("chain")) for (const length of chains)
    add("chain", "chain", { chainLength:length, depth:2*length, operationCount:2*length });
  if (selected.includes("state")) for (const size of states) for (const n of touched.filter(v => v <= size))
    add("state", n === 1 ? "state_read" : "state_sum", { stateSize:size, touched:n, inputCount:0, depth:n-1, operationCount:n-1 });
  if (selected.includes("concurrency")) for (const count of users) add("concurrency", "load_add", { users:count });
  if (!cases.length) throw new Error("The selected filters produce no scenarios");
  return cases;
}

// Full-width, deterministic values exercise wraparound, with identical data on each platform.
export function valuesFor(seed: string, key: string, count: number, width: Width): bigint[] {
  return Array.from({length:count}, (_, i) => BigInt.asUintN(width,
    BigInt(`0x${createHash("sha256").update(`${seed}/${key}/${i}`).digest("hex")}`)));
}
export function scenarioValues(seed: string, scenario: Scenario, run: number): bigint[] {
  // Hold operands fixed when changing reduction shape, chain length or batch size.
  // Encryption still produces fresh ciphertexts for every platform/replicate.
  const group=scenario.suite==="width" ? `width/${scenario.operation}` : scenario.suite;
  return valuesFor(seed,`${group}/${run}`,scenario.inputCount,scenario.width);
}
export function expectedResult(s: Scenario, values: bigint[], state: bigint[] = []): bigint {
  const wrap = (v: bigint) => BigInt.asUintN(s.width, v);
  const [a,b] = values;
  switch(s.operation) {
    case "import": return a;
    case "add": case "load_add": return wrap(a+b);
    case "mul": return wrap(a*b);
    case "compare_select": return a > b ? a : b;
    case "tariff": return a > b ? 7n : 3n;
    case "sum_linear": case "sum_tree": return wrap(values.reduce((sum,v) => sum+v,0n));
    case "chain": { let result = a; for (let i=0;i<s.chainLength;i++) result = wrap(result*b+a); return result; }
    case "state_read": return state[0];
    case "state_sum": return wrap(state.slice(0,s.touched).reduce((sum,v) => sum+v,0n));
  }
}

export function orderedPlatforms(seed: string, id: string, choices: Platform[]): Platform[] {
  return [...choices].sort((a,b) => createHash("sha256").update(`${seed}/${id}/${a}`).digest("hex")
    .localeCompare(createHash("sha256").update(`${seed}/${id}/${b}`).digest("hex")));
}
