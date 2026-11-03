import fs from "node:fs";
import path from "node:path";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { TimingTrace, deadline, validatePlaintext, ObservationDeadlineError, type TimingStage } from "../lib/lifecycleTiming";
import { createZamaAdapter } from "./zama";
import { safeError } from "./errors";

type DiagnosticArgs = { report: string; timeout: number };

// Summarizes a failed diagnostic from its error and timing stages.
// Includes the most recent progress observation when available.
export function diagnosticFailure(error: unknown, stages: TimingStage[]) {
  const lastProgress = [...stages].reverse().find(stage =>
    stage.stage === "completion.sdk_progress" &&
    stage.detail?.operation === "USER_DECRYPT" &&
    stage.detail?.type !== "abort",
  )?.detail;
  return {
    status: error instanceof ObservationDeadlineError ? "timed_out" : "error",
    error: safeError(error),
    lastObservedJobState: lastProgress?.type,
    jobId: lastProgress?.jobId,
  };
}

// Recheck a persisted ciphertext without changing contracts or campaign results.
// Reads a saved Zama ciphertext handle and attempts authorized decryption.
// Records diagnostic timing and plaintext validation separately from the campaign.
export async function diagnoseZamaCiphertext(args: DiagnosticArgs, hre: HardhatRuntimeEnvironment) {
  if (!Number.isInteger(args.timeout) || args.timeout < 1) throw new Error("Invalid timeout");
  if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n)
    throw new Error("This diagnostic requires Sepolia");
  const reportPath = path.resolve(args.report);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (report.chainId !== "11155111") throw new Error("Report is not from Sepolia");
  const [signer] = await hre.ethers.getSigners();
  if (!signer || signer.address.toLowerCase() !== String(report.owner).toLowerCase())
    throw new Error("Configured signer must match the campaign owner");
  const sample = [...report.samples].reverse().find((sample) =>
    sample.platform === "zama" && typeof sample.outputHandle === "string",
  );
  const setup = report.setup.find((entry: { platform: string }) => entry.platform === "zama");
  if (!sample || !setup?.address) throw new Error("Report has no persisted Zama ciphertext");
  const trace = new TimingTrace();
  const timeoutMs = args.timeout * 1000;
  const result = {
    kind: "zama_ciphertext_diagnostic",
    sourceReport: reportPath,
    startedAt: new Date().toISOString(),
    contract: setup.address,
    handle: sample.outputHandle,
    transactionHash: sample.transactionHash,
    timeoutMs,
    status: "pending",
    error: undefined as string | undefined,
    plaintext: undefined as string | undefined,
    lastObservedJobState: undefined as unknown,
    jobId: undefined as unknown,
    completedAt: undefined as string | undefined,
    stages: trace.stages,
  };
  try {
    const adapter = await deadline(() =>
      createZamaAdapter(hre, signer, setup.address, timeoutMs, trace), timeoutMs, "diagnostic SDK initialization",
    );
    const plaintext = await deadline(() =>
      adapter.decrypt(sample.outputHandle, trace, "completion"), timeoutMs, "diagnostic decryption",
    );
    result.plaintext = validatePlaintext(plaintext, BigInt(sample.expectedPlaintext));
    result.status = "ok";
  } catch (error) {
    Object.assign(result, diagnosticFailure(error, trace.stages));
  }
  result.completedAt = new Date().toISOString();
  const output = path.join(path.dirname(reportPath),
    `diagnostic-zama-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(`Zama diagnostic: ${result.status}\nTrace: ${output}`);
  if (result.status === "timed_out") {
    console.error(result.error);
    if (result.lastObservedJobState)
      console.error(`Last observed USER_DECRYPT state: ${result.lastObservedJobState}; jobId: ${result.jobId ?? "unknown"}`);
    console.error("No validated plaintext was obtained within the observation window. The timeout does not identify the cause of the delay. Keep the existing report and contract for further investigation.");
    process.exitCode = 1;
    return;
  }
  if (result.error) throw new Error(result.error);
}
