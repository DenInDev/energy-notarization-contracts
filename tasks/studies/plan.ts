import { createHash } from "node:crypto";
import type { Platform } from "../lifecycle/types";
import type { Circuit, Mode, StudyArgs, StudyCase, Width } from "./types";

export const defaults: StudyArgs = {
  suite: "all", platform: "all", widths: "16,128", users: "1,2,4,8",
  modes: "independent,shared_sum,shared_ordered",
  sizes: "2,4,8,16,32", depths: "1,2,4,8,16,32", repetitions: 50,
  requests: 32, timeout: 180, seed: "ordering-circuits-v1",
  accountsFile: ".benchmark-accounts/studies/accounts.secret.json", outputDir: "", live: false,
};

function choices(raw: string, allowed: readonly number[], label: string): number[] {
  const values = raw.split(",").map(s => Number(s.trim()));
  if (!values.length || values.some(v => !allowed.includes(v)) || new Set(values).size !== values.length)
    throw new Error(`${label}: distinct values from ${allowed.join(",")} required`);
  return values;
}

export function selectedPlatforms(raw: string): Platform[] {
  const values = raw === "all" ? ["baseline", "zama", "fhenix"] : raw.split(",");
  if (!values.length || values.some(p => !["baseline", "zama", "fhenix"].includes(p)) || new Set(values).size !== values.length)
    throw new Error("Invalid platform selection");
  return values as Platform[];
}

// The installed Zama input/decrypt API caps one request at 2,048 encrypted bits.
// Use the same setup batching for every platform at a given integer width.
export const inputBatchSize = (width: Width) => Math.min(32,Math.floor(2048/width));

// Keep transaction count fixed when changing concurrent writers.
// Circuit nodes and theoretical dependency depth are recorded independently.
export function buildPlan(args: StudyArgs): StudyCase[] {
  const suites = args.suite === "all" ? ["concurrency", "circuits"] : args.suite.split(",");
  if (suites.some(s => !["concurrency", "circuits"].includes(s)) || new Set(suites).size !== suites.length)
    throw new Error("Only concurrency and circuits are supported");
  if (!Number.isInteger(args.repetitions) || args.repetitions < 1 || args.repetitions > 1000) throw new Error("Repetitions must be 1..1000");
  if (!Number.isInteger(args.requests) || args.requests < 1 || args.requests > 256) throw new Error("Requests must be 1..256");
  if (suites.includes("concurrency") && args.requests < 2) throw new Error("Concurrency order controls require at least two requests");
  if (!Number.isInteger(args.timeout) || args.timeout < 10 || args.timeout > 600) throw new Error("Timeout must be 10..600 seconds");
  selectedPlatforms(args.platform);
  const widths = choices(args.widths, [16,128], "Widths") as Width[];
  const users = choices(args.users, [1,2,4,8], "Users");
  const modes = args.modes.split(",") as Mode[];
  if (!modes.length || modes.some(m => !["independent","shared_sum","shared_ordered"].includes(m)) || new Set(modes).size !== modes.length)
    throw new Error("Invalid concurrency modes");
  const sizes = choices(args.sizes, [2,4,8,16,32], "Sizes");
  const depths = choices(args.depths, [1,2,4,8,16,32], "Depths");
  if (suites.includes("concurrency") && users.some(c => args.requests % c)) throw new Error("Fixed requests must be divisible by every writer count");
  const cases: StudyCase[] = [];
  for (const width of widths) {
    if (suites.includes("concurrency")) for (const count of users) for (const mode of modes)
      cases.push({ id:`concurrency-w${width}-c${count}-${mode}`, suite:"concurrency", width, users:count,
        mode, size:args.requests, inputCount:1, additions:1,
        multiplications:mode === "shared_ordered" ? 1 : 0, dependencyDepth:mode === "shared_ordered" ? 2 : 1 });
    if (suites.includes("circuits")) {
      for (const size of sizes) for (const circuit of ["sum_linear","sum_tree"] as Circuit[])
        cases.push({ id:`circuits-w${width}-${circuit}-n${size}`, suite:"circuits", width, users:1,
          circuit, size, inputCount:size, additions:size-1, multiplications:0,
          dependencyDepth:circuit === "sum_linear" ? size-1 : Math.ceil(Math.log2(size)) });
      for (const depth of depths) cases.push({ id:`circuits-w${width}-affine_chain-k${depth}`, suite:"circuits", width,
        users:1, circuit:"affine_chain", size:depth, inputCount:2, additions:depth, multiplications:depth, dependencyDepth:2*depth });
    }
  }
  return cases;
}

export function valuesFor(seed: string, key: string, count: number, width: Width): bigint[] {
  return Array.from({length:count}, (_, i) => BigInt.asUintN(width,
    BigInt("0x"+createHash("sha256").update(`${seed}/${key}/${i}`).digest("hex"))));
}

export function ordered<T>(values: T[], seed: string): T[] {
  return [...values].sort((a,b) => createHash("sha256").update(`${seed}/${String(a)}`).digest("hex")
    .localeCompare(createHash("sha256").update(`${seed}/${String(b)}`).digest("hex")));
}

export function expectedCircuit(s: StudyCase, values: bigint[]): bigint {
  const wrap = (x: bigint) => BigInt.asUintN(s.width, x);
  if (values.length !== s.inputCount) throw new Error("Wrong circuit input count");
  if (s.circuit === "sum_linear" || s.circuit === "sum_tree") return wrap(values.reduce((a,b) => a+b, 0n));
  let result = values[0];
  for (let i=0; i<s.size; i++) result = wrap(wrap(result*values[1])+values[0]);
  return result;
}

export function planSummary(args: StudyArgs) {
  const cases = buildPlan(args), platforms = selectedPlatforms(args.platform);
  const concurrency = cases.filter(s => s.suite === "concurrency"), circuits = cases.filter(s => s.suite === "circuits");
  const warmWindows = concurrency.reduce((n,s) => n+(s.users === 1 ? 2 : 1),0);
  const deployments = new Set(cases.flatMap(s => platforms.map(p => `${p}/${s.width}`))).size;
  return { cases, platforms, repetitions:args.repetitions,
    measuredTransactions:platforms.length*(concurrency.length*args.repetitions*args.requests+circuits.length*args.repetitions),
    warmupTransactions:platforms.length*(warmWindows*args.requests+circuits.length),
    setupTransactions:platforms.length*(concurrency.length*args.repetitions+warmWindows+
      circuits.reduce((n,c) => n+Math.ceil(c.inputCount/inputBatchSize(c.width))*(args.repetitions+1),0))+deployments*2,
    deployments, requiredAccounts:1+Math.max(0,...concurrency.map(s => s.users)),
    networkAccess:false, note:"Plan only; counts are upper budgets. --live enables transactions. Exact HCU estimate rejections send no compute transaction; other failures stop the run. No funding automation." };
}
