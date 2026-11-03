import type { ContractTransactionResponse, TransactionReceipt } from "ethers";
import { toBeHex } from "ethers";
import { TimingTrace, deadline, ObservationDeadlineError, validatePlaintext } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import { safeError } from "../lifecycle/errors";
import { operationCodes } from "./plan";
import type { Context, Observation, Scenario, TxObservation } from "./types";

function receiptFields(record: TxObservation, receipt: TransactionReceipt, trace: TimingTrace) {
  Object.assign(record,{receiptMs:trace.now(),blockHash:receipt.blockHash,blockNumber:receipt.blockNumber,
    status:receipt.status,gasUsed:String(receipt.gasUsed),gasPriceWei:String(receipt.gasPrice),
    costWei:String(receipt.gasUsed*receipt.gasPrice)});
}

export async function sendTransaction(ctx: Context, method: string, args: unknown[], trace: TimingTrace,
  transactions: TxObservation[]): Promise<TransactionReceipt> {
  if (ctx.halted) throw new Error("Account halted after an ambiguous transaction; reconcile its nonce before restarting");
  const record: TxObservation = {nonce:ctx.reserveNonce(),startedMs:trace.now()};
  transactions.push(record);
  try {
    const tx: ContractTransactionResponse = await deadline(() => trace.span(`transaction.${method}.submit`, () =>
      ctx.contract.getFunction(method)(...args,{nonce:record.nonce})),ctx.timeoutMs,"transaction submission");
    record.hash = tx.hash;
    const remaining = Math.max(1,Math.floor(ctx.timeoutMs-(trace.now()-record.startedMs)));
    const receipt = await deadline(() => trace.span(`transaction.${method}.receipt`, () => tx.wait(1,remaining)),remaining,"transaction receipt");
    if (!receipt) throw new Error("Receipt missing");
    receiptFields(record,receipt,trace);
    if (receipt.status !== 1) throw new Error("Transaction reverted");
    return receipt;
  } catch (error) {
    const receipt = (error as {receipt?: TransactionReceipt})?.receipt;
    if (receipt) receiptFields(record,receipt,trace);
    // No automatic resubmission: even a submission error may have reached the network.
    // Definitive mined reverts consume a known nonce and allow a fresh independent request.
    if (record.receiptMs === undefined) ctx.halted = true;
    if ((error as {code?:string})?.code === "TIMEOUT") throw new ObservationDeadlineError("transaction receipt",ctx.timeoutMs);
    throw error;
  }
}

export async function readAt(ctx: Context, getter: string, blockHash: string, trace: TimingTrace, budget: number, args: unknown[] = []): Promise<any> {
  const provider = ctx.signer.provider as unknown as {send(method: string, args: unknown[]): Promise<string>};
  return deadline(() => retryLifecycleRead(trace,"result.read",budget,async () => {
    const encoded = await provider.send("eth_call",[{to:await ctx.contract.getAddress(),from:ctx.user,
      data:ctx.contract.interface.encodeFunctionData(getter,args)}, {blockHash,requireCanonical:true}]);
    return ctx.contract.interface.decodeFunctionResult(getter,encoded)[0];
  },1000,false,false,true),budget,"receipt-pinned result read");
}

export async function validateInputs(ctx: Context, values: bigint[], receipt: TransactionReceipt, trace: TimingTrace) {
  return deadline(async () => {
    const start = trace.now();
    const handles = Array.from(await readAt(ctx,"getInputs",receipt.blockHash,trace,ctx.timeoutMs)) as (bigint|string)[];
    const result = await ctx.adapter.decrypt(handles,trace,Math.max(1,Math.floor(ctx.timeoutMs-(trace.now()-start))));
    if (result.length !== values.length) throw new Error("Input validation length mismatch");
    result.forEach((value,i) => validatePlaintext(value,values[i]));
  },ctx.timeoutMs,"setup input readiness and validation");
}

export async function prepareInputs(ctx: Context, values: bigint[], trace: TimingTrace, transactions: TxObservation[]) {
  const encrypted = await deadline(() => ctx.adapter.encrypt(values,trace,ctx.timeoutMs),ctx.timeoutMs,"setup encryption");
  const receipt = await sendTransaction(ctx,"load",encrypted,trace,transactions);
  await validateInputs(ctx,values,receipt,trace);
}

export async function measure(ctx: Context, scenario: Scenario, values: bigint[], expected: bigint,
  run: number, request: number, warmup = false): Promise<Observation> {
  const trace = new TimingTrace();
  const sample: Observation = {id:`${scenario.id}/${ctx.platform}/${run}/${request}/${ctx.user}/${warmup ? "warmup" : "measured"}`,
    caseId:scenario.id,platform:ctx.platform,user:ctx.user,run,request,warmup,status:"pending",phase:"input",
    startedAt:new Date().toISOString(),expected:String(expected),completionBudgetMs:ctx.timeoutMs,
    transactions:[],stages:trace.stages};
  let txStart: number | undefined, finalReceipt: number | undefined;
  try {
    let input: unknown[] = [];
    if (scenario.operation === "import" || scenario.operation === "load_add") {
      const started = trace.now();
      input = await deadline(() => ctx.adapter.encrypt(values,trace,ctx.timeoutMs),ctx.timeoutMs,"input preparation");
      sample.inputPreparationMs = trace.now()-started;
    }
    sample.phase = "transaction";
    txStart = trace.now();
    let receipt: TransactionReceipt;
    if (scenario.operation === "import" || scenario.operation === "load_add") {
      receipt = await sendTransaction(ctx,"load",input,trace,sample.transactions);
      if (scenario.operation === "load_add") receipt = await sendTransaction(ctx,"execute",[0,0,0],trace,sample.transactions);
    } else {
      for (let step=0;step<scenario.chainLength;step++)
        receipt = await sendTransaction(ctx,"execute",[operationCodes[scenario.operation],
          scenario.suite === "state" ? scenario.touched : scenario.inputCount,step],trace,sample.transactions);
    }
    finalReceipt = trace.now();
    sample.transactionToReceiptMs = finalReceipt-txStart;
    sample.phase = "completion";
    await deadline(async () => {
      const remaining = () => Math.max(1,Math.floor(ctx.timeoutMs-(trace.now()-finalReceipt!)));
      if (scenario.operation === "import") {
        const handles = Array.from(await readAt(ctx,"getInputs",receipt!.blockHash,trace,remaining())) as (bigint|string)[];
        const plaintexts = await ctx.adapter.decrypt(handles,trace,remaining());
        if (plaintexts.length !== values.length) throw new Error("Input validation length mismatch");
        plaintexts.forEach((value,i) => validatePlaintext(value,values[i]));
        sample.actual = String(plaintexts[0]);
      } else {
        const handle = await readAt(ctx,"getResult",receipt!.blockHash,trace,remaining());
        if (ctx.platform !== "baseline") sample.outputHandle = toBeHex(handle,32);
        const [plaintext] = await ctx.adapter.decrypt([handle],trace,remaining());
        sample.actual = validatePlaintext(plaintext,expected);
      }
    },ctx.timeoutMs,"post-receipt completion");
    const validated = trace.now();
    sample.postReceiptMs = validated-finalReceipt;
    sample.transactionToValidatedMs = validated-txStart;
    sample.endToEndMs = validated;
    sample.status = "ok";
    sample.phase = "validated";
  } catch (error) {
    sample.status = error instanceof ObservationDeadlineError ? "timeout" : "error";
    sample.error = safeError(error);
    sample.fatal = ctx.halted;
    // Only a known administrative deadline after a successful receipt is a censored completion.
    sample.completionCensored = sample.phase === "completion" && error instanceof ObservationDeadlineError;
  }
  sample.observedMs = trace.now();
  if (finalReceipt !== undefined) sample.completionObservedMs = sample.observedMs-finalReceipt;
  sample.endedAt = new Date().toISOString();
  return sample;
}

export async function runLoadWindow(contexts: Context[], count: number,
  execute: (ctx: Context, request: number) => Promise<Observation>): Promise<Observation[]> {
  if (count % contexts.length !== 0) throw new Error("Load requests must divide evenly across users");
  const settled = await Promise.allSettled(contexts.map(async (ctx,index) => {
    const observations: Observation[] = [];
    for (let request=index;request<count && !ctx.halted;request+=contexts.length)
      observations.push(await execute(ctx,request));
    return observations;
  }));
  const failed = settled.find(result => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  return settled.flatMap(result => result.status === "fulfilled" ? result.value : []);
}
