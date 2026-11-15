import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaults, planSummary } from "../tasks/studies/plan";

const { validateFreshManifest } = require("../scripts/lib/study-campaign.cjs");
const { launchPolicy } = require("../scripts/run-study-campaign.cjs");

function manifest(folder: string, reduced: boolean, fresh = false) {
  const accountsFile = path.join(folder, "missing-secret.json");
  return {
    kind: fresh ? "fresh-16bit-concurrency-and-circuits" : reduced ? "reduced-16bit-concurrency" : "full-16bit-concurrency-and-circuits",
    status: "funded_ready", chainId: 11155111, accountsFile,
    stages: (fresh ? ["concurrency","circuits"] : reduced ? ["concurrency"] : ["circuits", "concurrency"]).map(suite => {
      const args = { ...defaults, suite, accountsFile, outputDir: path.join(folder, suite),
        ...((reduced || (fresh && suite === "concurrency")) ? { users: "1,2,4", requests: 8, repetitions: 20 } : {}) };
      return { status: "planned", args, plan: planSummary(args), report: path.join(args.outputDir, "report.json") };
    }),
  };
}

describe("reviewed study launch policies", () => {
  it("routes reviewed manifest kinds and refuses ambiguous history", () => {
    const policies: Record<string, string> = {
      "full-16bit-concurrency-and-circuits": "full",
      "reduced-16bit-concurrency": "reduced",
      "fresh-16bit-concurrency-and-circuits": "fresh",
      "fresh-16bit-circuits-30": "circuits-fresh30",
      "fresh-16bit-two-writer-session": "two-writer-fresh10",
      "compact-16bit-sample-extension": "sessions",
      "two-writer-16bit-study": "sessions",
    };
    for (const [kind, policy] of Object.entries(policies)) {
      assert.equal(launchPolicy({ kind }), policy);
    }
    assert.throws(() => launchPolicy({ kind: "unknown" }), /Unsupported/);
    const compact = { kind: "compact-16bit-selected-studies" };
    assert.throws(() => launchPolicy(compact), /ambiguous/);
    assert.equal(launchPolicy(compact, "compact-resume"), "compact-resume");
    // Routing never bypasses the manifest validator, even with an explicit policy.
    assert.throws(() => validateFreshManifest({}, ".", "unknown"), /Unknown study launch policy/);
    assert.throws(() => validateFreshManifest({}, ".", "circuits-fresh30"), /unstarted study manifest/);
  });

  let folder: string;
  beforeEach(() => { folder = fs.mkdtempSync(path.join(os.tmpdir(), "study-launch-policy-")); });
  afterEach(() => {
    assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(folder).startsWith("study-launch-policy-"));
    fs.rmSync(folder, { recursive: true, force: true });
  });

  it("accepts the 5190-transaction reduced plan without accessing accounts or RPC", () => {
    const value = manifest(folder, true);
    validateFreshManifest(value, folder, "reduced");
    const plan = value.stages[0].plan;
    assert.equal(plan.measuredTransactions + plan.warmupTransactions + plan.setupTransactions, 5190);
    assert.equal(plan.requiredAccounts, 5);
    assert(!fs.existsSync(value.accountsFile));
  });

  it("accepts only the separately authorized fresh 30-round circuit matrix", () => {
    const accountsFile=path.join(folder,"operator.secret.json");
    const args={...defaults,suite:"circuits",sizes:"2,8,32",depths:"1,8,16,32",repetitions:30,
      accountsFile,outputDir:path.join(folder,"circuits-euint16")};
    const value:any={kind:"fresh-16bit-circuits-30",status:"funded_ready",chainId:11155111,accountsFile,
      stages:[{suite:"circuits",width:16,status:"planned",args,plan:planSummary(args),report:path.join(args.outputDir,"report.json")}]};
    validateFreshManifest(value,folder,"circuits-fresh30");
    assert.equal(value.stages[0].plan.measuredTransactions,900);
    assert.equal(value.stages[0].plan.warmupTransactions,30);
    assert.equal(value.stages[0].plan.requiredAccounts,1);
    for(const drift of [{widths:"128"},{repetitions:10},{sizes:"2,4,8,16,32"},{platform:"fhenix"}]){
      const changed=structuredClone(value);Object.assign(changed.stages[0].args,drift);
      assert.throws(()=>validateFreshManifest(changed,folder,"circuits-fresh30"),/authorized matrix/);
    }
    const replay=structuredClone(value);replay.stages[0].sourceReport="previous-report.json";
    assert.throws(()=>validateFreshManifest(replay,folder,"circuits-fresh30"),/Unexpected source/);
  });

  it("limits each new two-writer session to the existing modes and eight requests", () => {
    const accountsFile=path.join(folder,"three-saved-accounts.json"),args={...defaults,suite:"concurrency",users:"2",
      modes:"shared_sum,shared_ordered",requests:8,repetitions:10,accountsFile,outputDir:path.join(folder,"concurrency-euint16")};
    const value:any={kind:"fresh-16bit-two-writer-session",status:"funded_ready",chainId:11155111,accountsFile,
      stages:[{status:"planned",args,plan:planSummary(args),report:path.join(args.outputDir,"report.json")}]};
    validateFreshManifest(value,folder,"two-writer-fresh10");
    assert.equal(value.stages[0].plan.measuredTransactions,480);
    assert.equal(value.stages[0].plan.requiredAccounts,3);
    assert.equal(value.stages[0].plan.warmupTransactions,48);
    for(const drift of [{users:"1,2,4"},{requests:32},{modes:"independent,shared_sum,shared_ordered"},{repetitions:20}]){
      const changed=structuredClone(value);Object.assign(changed.stages[0].args,drift);
      assert.throws(()=>validateFreshManifest(changed,folder,"two-writer-fresh10"),/authorized matrix/);
    }
  });

  it("starts both fresh categories with their distinct authorized matrices", () => {
    const value=manifest(folder,false,true);
    validateFreshManifest(value,folder,"fresh");
    assert.equal(value.stages[0].args.repetitions,20);
    assert.equal(value.stages[1].args.repetitions,50);
    assert.equal(value.stages[0].args.requests,8);
    assert.deepEqual(value.stages.map(s=>s.args.suite),["concurrency","circuits"]);
    const wrong=structuredClone(value);wrong.stages.reverse();
    assert.throws(()=>validateFreshManifest(wrong,folder,"fresh"),/authorized matrix/);
    const drift=structuredClone(value);drift.stages[1].args.repetitions=20;
    assert.throws(()=>validateFreshManifest(drift,folder,"fresh"),/authorized matrix/);
    assert.throws(()=>validateFreshManifest(value,folder,"unreviewed"),/Unknown/);
    assert(value.stages.every(s=>!fs.existsSync(s.args.outputDir)));
  });

  it("preserves the full launch policy and rejects matrix drift", () => {
    validateFreshManifest(manifest(folder, false), folder, "full");
    for (const change of [{ repetitions: 50 }, { requests: 32 }, { users: "1,2,4,8" }, { widths: "128" }, { live: true }]) {
      const value = manifest(folder, true);
      Object.assign(value.stages[0].args, change);
      assert.throws(() => validateFreshManifest(value, folder, "reduced"), /authorized matrix/);
    }
  });

  it("accepts exactly one fresh compact ten-repetition session without a historical replay", () => {
    const value=manifest(folder,false,true);
    value.kind="compact-16bit-selected-studies";
    for(const [index,stage] of value.stages.entries()){
      Object.assign(stage.args,index===0?{users:"1,4",modes:"shared_sum,shared_ordered",requests:8,repetitions:10}:
        {sizes:"2,8,32",depths:"1,8,16,32",repetitions:10});
      stage.plan=planSummary(stage.args);
    }
    validateFreshManifest(value,folder,"compact-fresh");
    assert.equal(value.stages[0].plan.measuredTransactions,960);
    assert.equal(value.stages[1].plan.measuredTransactions,300);
    const changed=structuredClone(value);changed.stages[0].args.repetitions=30;
    assert.throws(()=>validateFreshManifest(changed,folder,"compact-fresh"),/authorized matrix/);
    const replay:any=structuredClone(value);replay.stages[0].sourceReport="old-report.json";
    assert.throws(()=>validateFreshManifest(replay,folder,"compact-fresh"),/Unexpected source/);
    const source=path.join(folder,"source.json");
    fs.writeFileSync(source,JSON.stringify({kind:"concurrency-circuit-studies",executionComplete:false,chainId:11155111,mock:false,
      config:value.stages[0].args,cases:value.stages[0].plan.cases,platforms:value.stages[0].plan.platforms,setups:[],trials:[]}));
    replay.stages[0].sourceReport=source;
    replay.stages[0].sourceSha256=require("node:crypto").createHash("sha256").update(fs.readFileSync(source)).digest("hex");
    validateFreshManifest(replay,folder,"compact-continue");
    replay.stages[0].sourceSha256="tampered";
    assert.throws(()=>validateFreshManifest(replay,folder,"compact-continue"),/SHA mismatch/);
  });

  it("rejects existing outputs, started manifests and altered budgets", () => {
    const value = manifest(folder, true);
    value.status = "running";
    assert.throws(() => validateFreshManifest(value, folder, "reduced"), /unstarted/);
    value.status = "funded_ready";
    value.stages[0].plan.measuredTransactions--;
    assert.throws(() => validateFreshManifest(value, folder, "reduced"), /authorized matrix/);
    const fresh = manifest(folder, true);
    fs.mkdirSync(fresh.stages[0].args.outputDir);
    assert.throws(() => validateFreshManifest(fresh, folder, "reduced"), /output already exists/);
  });
});
