import { Transaction, keccak256, type Contract, type Signer, type TransactionRequest } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { broadcastSignedOperation, sendRawTransactionOnce } from "../lifecycle/broadcast";
import type { Sample } from "../lifecycle/types";
import { deadline, TimingTrace } from "../lib/lifecycleTiming";
import { safeError } from "../lifecycle/errors";
import type { StudyTransaction } from "./types";
import { performance } from "node:perf_hooks";

export type Prepared = { record: StudyTransaction; raw: string; trace: TimingTrace; localRequest?: TransactionRequest };
export type Fees = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };

// Estimate and sign outside the measured submission window.
// Raw signed bytes stay in memory; only their deterministic hash is journaled.
export async function prepareCall(contract: Contract, signer: Signer, method: string, args: unknown[],
  nonce: number, fees: Fees, chainId: number, timeoutMs: number, id: string): Promise<Prepared> {
  const call = await deadline(() => contract.getFunction(method).populateTransaction(...args), timeoutMs, "populate transaction");
  return prepareRequest(call,signer,method,nonce,fees,chainId,timeoutMs,id);
}

export async function prepareRequest(call: TransactionRequest, signer: Signer, method: string,
  nonce: number, fees: Fees, chainId: number, timeoutMs: number, id: string): Promise<Prepared> {
  const trace = new TimingTrace(), user = await signer.getAddress();
  const tx = await deadline(() => signer.populateTransaction({ ...call, nonce, chainId, type:2, ...fees }), timeoutMs, "prepare transaction");
  if (chainId === 31337) return { raw:"",trace,localRequest:tx,record:{id,method,user,transactionNonce:nonce,
    preparedTransactionHash:"",broadcastState:"prepared",status:"prepared",stages:trace.stages} };
  const raw = await signer.signTransaction(tx), decoded = Transaction.from(raw);
  if (decoded.chainId !== BigInt(chainId) || decoded.from?.toLowerCase() !== user.toLowerCase() || decoded.nonce !== nonce)
    throw new Error("Prepared transaction identity mismatch");
  return { raw, trace, record:{ id, method, user, transactionNonce:nonce, preparedTransactionHash:keccak256(raw),
    gasLimit:String(decoded.gasLimit),maxFeePerGasWei:String(decoded.maxFeePerGas),maxPriorityFeePerGasWei:String(decoded.maxPriorityFeePerGas),
    broadcastState:"prepared", status:"prepared", stages:trace.stages } };
}

// Submit exactly once through the lifecycle mutation transport.
// Receipt polling retries reads, and records the canonical transaction index.
export async function executePrepared(prepared: Prepared, hre: HardhatRuntimeEnvironment, timeoutMs: number,
  chainId: number, save: () => void) {
  const {record,trace,raw} = prepared;
  record.status = "pending"; record.startedAt = new Date().toISOString();
  const start = trace.now();
  const rpc = async (method: string, params: any[]) => {
    let result;
    if (method === "eth_sendRawTransaction") {
      record.rpcSendStartedAt = new Date().toISOString();
      record.rpcSendMonotonicMs = performance.now();
      result = await sendRawTransactionOnce((hre.network.config as any).url,
        params[0], Math.min(timeoutMs,30000), (hre.network.config as any).httpHeaders);
    }
    else result = await hre.ethers.provider.send(method,params);
    if (method === "eth_getTransactionReceipt" && result) record.transactionIndex = Number(BigInt(result.transactionIndex));
    return result;
  };
  try {
    // The Sepolia helper validates chain 11155111. Local tests use unlocked RPC
    // with the same single-send semantics and no live transport.
    const tx = chainId === 11155111 ? await broadcastSignedOperation(raw,rpc,record as unknown as Sample,trace,timeoutMs,save) :
      await localBroadcast(prepared,hre,save);
    const receipt = await deadline<{blockHash:string;blockNumber:number;status:number|null;gasUsed:bigint;gasPrice:bigint}|null>(
      () => tx.wait(1,timeoutMs),timeoutMs,"study receipt");
    if (!receipt) throw new Error("Receipt missing");
    record.receiptObservedMonotonicMs = performance.now();
    record.receiptMs = record.rpcSendMonotonicMs === undefined ? trace.now()-start :
      record.receiptObservedMonotonicMs-record.rpcSendMonotonicMs;
    record.receiptOffsetMs = trace.now();
    Object.assign(record,{blockHash:receipt.blockHash,blockNumber:receipt.blockNumber,receiptStatus:receipt.status,
      gasUsed:Number(receipt.gasUsed),effectiveGasPriceWei:String(receipt.gasPrice),gasCostWei:String(receipt.gasUsed*receipt.gasPrice)});
    record.status = receipt.status === 1 ? "confirmed" : "reverted";
    save();
    if (receipt.status !== 1) throw new Error("Study transaction reverted");
    return receipt;
  } catch (error) {
    record.error = safeError(error);
    if (record.status !== "reverted") record.status = "error";
    save(); throw error;
  }
}

async function localBroadcast(prepared: Prepared, hre: HardhatRuntimeEnvironment, save: () => void) {
  const {record,trace} = prepared;
  record.broadcastStartedAt = new Date().toISOString(); record.broadcastStartedOffsetMs = trace.now();
  record.broadcastState = "started"; save();
  try {
    const signer = await hre.ethers.getSigner(record.user);
    record.rpcSendStartedAt = new Date().toISOString();
    record.rpcSendMonotonicMs = performance.now();
    const tx = await signer.sendTransaction(prepared.localRequest!);
    const hash = tx.hash;
    record.preparedTransactionHash = hash; record.transactionHash = hash;
    record.broadcastState = "acknowledged"; record.broadcastAckMs = trace.now()-record.broadcastStartedOffsetMs;
    save();
    return {wait: async (_confirmations: number, budget: number) => {
      const end = trace.now()+budget;
      const receipt = await deadline(async () => {
        while (trace.now()<end) {
          const value = await hre.ethers.provider.send("eth_getTransactionReceipt",[hash]);
          if (value) return value;
          await new Promise(resolve => setTimeout(resolve,20));
        }
        throw new Error("Local receipt deadline");
      },budget,"local receipt");
      record.transactionIndex = Number(BigInt(receipt.transactionIndex));
      return {blockHash:receipt.blockHash,blockNumber:Number(BigInt(receipt.blockNumber)),status:Number(BigInt(receipt.status)),
        gasUsed:BigInt(receipt.gasUsed),gasPrice:BigInt(receipt.effectiveGasPrice)};
    }};
  } catch (error) { record.broadcastState = "uncertain"; save(); throw error; }
}
