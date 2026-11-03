import "@nomicfoundation/hardhat-ethers";
import { task, types } from "hardhat/config";
import { runLifecycleCampaign } from "./lifecycle/campaign";
import { diagnoseZamaCiphertext } from "./lifecycle/diagnostic";
import { continueLifecycleCampaign } from "./lifecycle/continuation";

task(
  "benchmark:energy:lifecycle",
  "Sepolia SDK stages and transaction-to-validated-plaintext latency",
)
  .addOptionalParam("runs", "Measured rounds per platform", 50, types.int)
  .addOptionalParam("platform", "all, both, baseline, zama or fhenix", "all")
  .addOptionalParam(
    "seed",
    "Recorded seed for randomized position-balanced interleaving",
    "20260917",
  )
  .addOptionalParam(
    "timeout",
    "SDK/receipt observation deadline in seconds",
    180,
    types.int,
  )
  .addOptionalParam("setupTimeout", "Setup/warmup observation deadline in seconds (defaults to --timeout)", undefined, types.int)
  .addOptionalParam("outputDir", "Output folder", "")
  .addOptionalParam("accountsFile", "Local accounts: baseline=1, Zama=2, Fhenix=3", ".benchmark-accounts/accounts.secret.json")
  .addOptionalParam("execution", "processes (isolated, prepared barrier) or async (legacy)", "processes")
  .setAction(runLifecycleCampaign);

task("benchmark:energy:diagnose", "Recheck a saved Zama ciphertext without sending transactions")
  .addParam("report", "Path to the campaign report.json")
  .addOptionalParam("timeout", "Diagnostic SDK observation deadline in seconds", 30, types.int)
  .setAction(diagnoseZamaCiphertext);

task("benchmark:energy:continue", "Continue only the unattempted schedule; retain failed observations")
  .addParam("report", "Source incomplete report.json")
  .addParam("outputDir", "New continuation output folder")
  .addOptionalParam("accountsFile", "Saved platform accounts", ".benchmark-accounts/accounts.secret.json")
  .setAction(continueLifecycleCampaign);
