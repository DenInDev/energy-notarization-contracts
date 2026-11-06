import { task, types } from "hardhat/config";
import { defaultAccountsFile, generateAccounts, loadAccounts } from "./experiments/accounts";
import { defaults } from "./studies/plan";

// Account utilities remain shared with classic lifecycle benchmarks.
task("benchmark:accounts", "Create saved accounts once or show existing public addresses")
  .addOptionalParam("file", "Secret file kept outside Git", defaultAccountsFile)
  .addOptionalParam("count", "Number to create on first use", 8, types.int)
  .setAction(async args => console.log(JSON.stringify(generateAccounts(args.file, args.count), null, 2)));

task("benchmark:accounts:balances", "Read saved Sepolia balances without sending")
  .addOptionalParam("file", "Saved account file", defaultAccountsFile)
  .setAction(async (args, hre) => {
    if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Sepolia only");
    for (const signer of loadAccounts(args.file)) console.log(`${signer.address}: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address))} ETH`);
  });

task("benchmark:study", "Concurrency correctness and growing single-transaction circuits; defaults to plan-only")
  .addOptionalParam("suite", "all, concurrency or circuits", defaults.suite)
  .addOptionalParam("platform", "all or baseline,zama,fhenix subset", defaults.platform)
  .addOptionalParam("widths", "16,128 or one width", defaults.widths)
  .addOptionalParam("users", "Concurrent writers: 1,2,4,8", defaults.users)
  .addOptionalParam("modes", "independent,shared_sum,shared_ordered or subset", defaults.modes)
  .addOptionalParam("sizes", "Reduction input counts", defaults.sizes)
  .addOptionalParam("depths", "Affine chain lengths in one transaction", defaults.depths)
  .addOptionalParam("repetitions", "Measured windows or circuit repetitions per case/platform", defaults.repetitions, types.int)
  .addOptionalParam("requests", "Fixed transactions per concurrency window", defaults.requests, types.int)
  .addOptionalParam("timeout", "Per-stage deadline seconds", defaults.timeout, types.int)
  .addOptionalParam("seed", "Deterministic data and scheduling seed", defaults.seed)
  .addOptionalParam("accountsFile", "Dedicated saved study accounts; index0 operator, indices1..8 writers", defaults.accountsFile)
  .addOptionalParam("outputDir", "Fresh output directory", "")
  .addFlag("live", "Actually execute on Sepolia or local Hardhat; omitted sends nothing and reads no accounts")
  .setAction(async (args, hre) => {
    const { runStudy } = await import("./studies/runner");
    return runStudy(args, hre);
  });
