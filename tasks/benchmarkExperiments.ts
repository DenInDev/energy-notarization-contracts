import { task, types } from "hardhat/config";
import fs from "node:fs";
import path from "node:path";
import { defaultAccountsFile, generateAccounts, loadAccounts } from "./experiments/accounts";
import { runExperiments } from "./experiments/runner";
import { analyzeReport } from "./experiments/report";

task("benchmark:accounts", "Create dedicated Sepolia accounts once, or show their existing public addresses")
  .addOptionalParam("file", "Local secret file (never commit)", defaultAccountsFile)
  .addOptionalParam("count", "Number to generate on first use", 8, types.int)
  .setAction(async args => { console.log(JSON.stringify(generateAccounts(args.file,args.count),null,2)); });

task("benchmark:accounts:balances", "Read Sepolia funding balances; sends no transactions")
  .addOptionalParam("file", "Local secret file", defaultAccountsFile)
  .setAction(async (args,hre) => {
    if ((await hre.ethers.provider.getNetwork()).chainId!==11155111n) throw new Error("Use --network sepolia");
    for (const wallet of loadAccounts(args.file))
      console.log(`${wallet.address}: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(wallet.address))} ETH`);
  });

task("benchmark:experiments", "Width, input-count, circuit-depth, chained, state and independent-account load experiments")
  .addOptionalParam("suite", "all or comma-separated width,inputs,depth,chain,state,concurrency", "all")
  .addOptionalParam("platform", "all or comma-separated baseline,zama,fhenix", "all")
  .addOptionalParam("runs", "Measured repetitions (load: repeated windows)", 3, types.int)
  .addOptionalParam("requests", "Fixed TOTAL requests per load window; divisible by every user count", 16, types.int)
  .addOptionalParam("timeout", "Per-input, per-transaction and final-completion deadline, seconds", 180, types.int)
  .addOptionalParam("seed", "Recorded deterministic dataset and platform-order seed", "reviewer-expansion-v1")
  .addOptionalParam("widths", "Width suite values (8,16,32,64,128)", "16,32,64,128")
  .addOptionalParam("counts", "Input/depth suite sizes", "1,4,8,16,32")
  .addOptionalParam("chains", "Dependent transaction counts", "1,2,4,8")
  .addOptionalParam("users", "Concurrent distinct account counts", "1,2,4,8")
  .addOptionalParam("states", "Prepopulated state sizes", "16,64,256")
  .addOptionalParam("touched", "State entries accessed per measured request", "1,4,16")
  .addOptionalParam("accountsFile", "Ignored local secret accounts file", defaultAccountsFile)
  .addOptionalParam("outputDir", "Fresh output directory", "")
  .addFlag("dryRun", "Print the matrix without connecting or spending funds")
  .setAction(runExperiments);

task("benchmark:experiments:analyze", "Analyze complete or partial expanded experiment reports")
  .addParam("report", "Path to report.json")
  .setAction(async args => {
    const file=path.resolve(args.report),report=JSON.parse(fs.readFileSync(file,"utf8"));
    if (report.kind!=="expanded-experiments" || report.schemaVersion!==1) throw new Error("Expected expanded experiment schema 1");
    analyzeReport(path.dirname(file),report);
    console.log(`Analysis: ${path.join(path.dirname(file),"summary.md")}`);
  });
