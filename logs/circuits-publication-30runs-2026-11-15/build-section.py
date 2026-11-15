"""Build publication text from the completed fresh campaign; raw data are immutable."""
from pathlib import Path
import hashlib
import importlib.util
import json
import statistics

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent.parent
CAMPAIGN = WORKSPACE / "logs/circuits16-fresh30-2026-11-14"
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
manifest = json.loads((CAMPAIGN / "campaign.json").read_text())
stage = manifest["stages"][0]
raw = Path(stage["report"])
assert stage["status"] == "finished" and sha(raw) == stage["rawSha256"]
report = json.loads(raw.read_text())
assert report["executionComplete"] and not report["mock"] and report["chainId"] == 11155111
measured = [t for t in report["trials"] if not t["warmup"]]
assert len(measured) == 900 and len({(t["caseId"], t["platform"], t["repetition"]) for t in measured}) == 900
assert sum(t["status"] == "ok" for t in measured) == 840
assert sum(t["status"] == "capacity_rejected" for t in measured) == 60
metadata = json.loads((CAMPAIGN / "network/block-metadata.json").read_text())
assert metadata["status"] == "finished" and not metadata["reconciliations"]
analysis = json.loads((CAMPAIGN / "network/analysis-and-network-values.json").read_text())
assert any(Path(s["file"]) == raw and s["sha256"] == sha(raw) for s in analysis["rawSources"])


def describe(values):
    if not values:
        return {"n": 0}
    mean = statistics.mean(values)
    return {"n": len(values), "mean": mean, "cvPct": statistics.stdev(values) / mean * 100 if mean else None}


rows, body, detailed = [], [], []
end = " " + chr(92) * 2
names = {"sum_linear": "Linear sum", "sum_tree": "Tree sum", "affine_chain": "Affine chain"}
for case in report["cases"]:
    values = []
    for platform in ("baseline", "zama", "fhenix"):
        trials = [t for t in measured if t["caseId"] == case["id"] and t["platform"] == platform]
        assert len(trials) == 30
        ok = [t for t in trials if t["status"] == "ok"]
        for trial in ok:
            operands = list(map(int, trial["inputValues"]))
            expected = sum(operands) % 65536
            if case["circuit"] == "affine_chain":
                expected = operands[0]
                for _ in range(case["size"]):
                    expected = (expected * operands[1] + operands[0]) % 65536
            request = trial["requests"][0]
            assert request["plaintext"] == str(expected) and request["transaction"]["receiptStatus"] == 1
            assert abs(request["transactionToValidatedMs"] - request["postReceiptMs"] - request["transaction"]["receiptMs"]) < 0.01
        rejected = [t for t in trials if t["status"] == "capacity_rejected"]
        for trial in rejected:
            tx = trial["requests"][0]["transaction"]
            assert platform == "zama" and case["circuit"] == "affine_chain" and case["size"] in (16, 32)
            assert trial["rejection"]["limit"] == "HCUTransactionDepthLimitExceeded" and trial["rejection"]["broadcast"] is False
            assert not tx.get("transactionHash") and tx.get("gasUsed") is None
        entry = {"platform": platform, "valid": len(ok), "rejected": len(rejected),
                 "gas": describe([t["requests"][0]["transaction"]["gasUsed"] for t in ok]),
                 "preparationMs": describe([t["preparationMs"] for t in trials]),
                 "receiptMs": describe([t["requests"][0]["transaction"]["receiptMs"] for t in ok]),
                 "postReceiptMs": describe([t["requests"][0]["postReceiptMs"] for t in ok]),
                 "completionMs": describe([t["requests"][0]["transactionToValidatedMs"] for t in ok]),
                 "clientWorkMs": describe([t["preparationMs"] + t["requests"][0]["transactionToValidatedMs"] for t in ok])}
        existing = next(r for r in analysis["caseMetrics"] if r["case"]["id"] == case["id"] and r["platform"] == platform)
        assert existing["completionMs"]["n"] == len(ok)
        if ok:
            assert abs(existing["completionMs"]["mean"] - entry["completionMs"]["mean"]) < 1e-6
        values.append(entry)
        fmt = lambda d: f"{d['mean']:.0f} ({d['cvPct']:.2f}\\%)" if d["n"] else "--"
        detailed.append(names[case["circuit"]] + f" & {case['size']} & {platform} & {len(ok)}/30 & " +
                        " & ".join(fmt(entry[k]) for k in ("gas", "preparationMs", "receiptMs", "postReceiptMs", "completionMs", "clientWorkMs")) + end)
    row = {"case": case, "values": values}
    rows.append(row)
    gas = [f"{v['gas']['mean']:.0f}" if v["valid"] else "HCU" for v in values]
    delay = [f"{v['postReceiptMs']['mean']:.0f}" if v["valid"] else "--" for v in values]
    body.append(names[case["circuit"]] + f" & {case['size']} & {case['dependencyDepth']} & " + " & ".join(gas + delay) + end)

table = "\n".join([r"\begin{table*}[!t]", r"\caption{Circuit growth on Sepolia with 16-bit arithmetic}",
    r"\label{tab:circuit-growth}", r"\centering\scriptsize", r"\setlength{\tabcolsep}{4pt}",
    r"\begin{tabular}{|l|r|r|rrr|rrr|}\hline",
    r"\textbf{Circuit} & \textbf{Size} & \textbf{Depth} & \multicolumn{3}{c|}{\textbf{Mean gas}} & \multicolumn{3}{c|}{\textbf{Mean post-receipt delay (ms)}}" + end,
    r"\cline{4-9}", r" & & & \textbf{Baseline} & \textbf{Zama} & \textbf{Fhenix} & \textbf{Baseline} & \textbf{Zama} & \textbf{Fhenix}" + end,
    r"\hline", *body, r"\hline\end{tabular}", r"\par\smallskip",
    r"\begin{minipage}{\textwidth}\scriptsize Each numeric result summarizes 30 successful measured observations. Size denotes input count $N$ for reductions and iteration count $k$ for affine chains; depth is the theoretical arithmetic dependency depth. HCU denotes 30/30 rejections during gas estimation with \texttt{HCUTransactionDepthLimitExceeded}; no compute transaction was sent and no compute gas or latency exists. Gas covers the compute transaction only, including contract bookkeeping, while input loading and readiness are separate setup/preparation work. Post-receipt delay includes RPC retrieval, service waiting, decryption and plaintext validation; it is not isolated FHE compute time.\end{minipage}",
    r"\end{table*}", ""])

section = r'''\subsection{Circuit complexity and dependency depth}
\label{sec:circuit-complexity}

Separate experiments examined how increasing arithmetic work and dependency depth affect on-chain gas and client-observed completion. Three circuit families were evaluated on the plaintext baseline, Zama fhEVM and Fhenix CoFHE, using unsigned 16-bit arithmetic throughout. Linear and balanced-tree reductions summed $N\in\{2,8,32\}$ values, requiring $N-1$ additions with theoretical dependency depths of $N-1$ and $\log_2N$, respectively. Affine chains used two encrypted operands $a$ and $b$, with
\[
x_0=a,\qquad x_{i+1}=x_i b+a\pmod{2^{16}},
\]
for $k\in\{1,8,16,32\}$ iterations. Each chain therefore requires $k$ multiplications and $k$ additions, with theoretical arithmetic depth $2k$. The plaintext baseline applies the same modular arithmetic.

Thirty measured repetitions were planned per configuration and platform, following one warmup attempt per configuration. Fresh operands were loaded and decrypted to verify their readiness before submitting a single compute transaction. The compute timer runs from prepared transaction submission to plaintext retrieval and validation. Input encryption, loading, readiness checks, gas estimation and signing are recorded separately as preparation. The evaluated circuits thus comprise 900 planned measured trials: 840 completed successfully and 60 were rejected by Zama's configured HCU depth limit. No unexpected failure or plaintext mismatch was observed. Platforms were evaluated sequentially with rotated order on public Sepolia.

'''+table+r'''
Table~\ref{tab:circuit-growth} shows that circuit structure affects the observed trade-off between gas and result availability. At $N=32$, replacing the linear reduction with a balanced tree reduces theoretical dependency depth from 31 to 5 while retaining 31 additions. Mean post-receipt delay decreases from 8,343 to 5,253~ms for Zama and from 2,460 to 718~ms for Fhenix. The tree requires slightly more gas: approximately 1.378 rather than 1.364 million gas for Zama, and 1.721 rather than 1.707 million for Fhenix. These are descriptive observations; the measured delay also includes RPC and off-chain service interactions, so the experiment does not isolate the causal effect of dependency depth.

Increasing linear reductions from two to 32 inputs raises mean gas from approximately 0.761 to 1.364 million for Zama and from 0.752 to 1.707 million for Fhenix. Neither platform consistently minimizes gas across the tested sizes. Affine chains expose a further deployment-level boundary: Zama rejects all 30 measured attempts at both $k=16$ and $k=32$ during gas estimation, returning \texttt{HCUTransactionDepthLimitExceeded}. No compute transaction is broadcast for these rejected cases, although their input setup still incurs gas. Fhenix completes both configurations; at $k=32$, mean compute-transaction gas reaches approximately 2.526 million and mean post-receipt delay reaches 6,367~ms.

The affine-chain results increase arithmetic work and dependency depth together and therefore do not separate their individual effects. Moreover, the observed HCU boundary characterizes the tested Zama deployment and workload, rather than a universal cryptographic limit. Receipt inclusion and service variability remain part of the client-observed lifecycle. Full client work is obtained by adding preparation to transaction-to-validated-plaintext time; compute-transaction latency alone does not represent the complete application cost. No statistical significance or causal platform ranking is inferred from these circuit summaries.
'''
(ROOT / "circuit-section.tex").write_text(section)
(ROOT / "circuit-table.tex").write_text(table)
(ROOT / "circuit-values.json").write_text(json.dumps({"rawReport": str(raw), "rawSha256": sha(raw), "rows": rows,
    "scope": "Fresh 30-round16-bit circuit campaign only; older circuit reports excluded."}, indent=2))
(ROOT / "all-metrics-rows.tex").write_text("\n".join(detailed)+"\n")
assert sha(raw) == stage["rawSha256"]
print(json.dumps({"section": str(ROOT / "circuit-section.tex"), "valid": 840, "rejected": 60, "rawUnchanged": True}))
