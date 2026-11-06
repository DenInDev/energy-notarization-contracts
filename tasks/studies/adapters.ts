import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Signer } from "ethers";
import { toBeHex } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk-current";
import { getChainById } from "@cofhe/sdk-current/chains";
import { TimingTrace, observeHttp } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import type { Platform } from "../lifecycle/types";
import type { ExperimentAdapter, Width } from "./types";
import { withCofheReadPolicy } from "../lib/cofheReadPolicy";
import { inputBatchSize } from "./plan";

// The local simulator uses a single event cursor. This lock is never used on Sepolia.
let mockDecryptQueue: Promise<unknown> = Promise.resolve();

export async function makeStudyAdapter(platform: Platform, width: Width, hre: HardhatRuntimeEnvironment,
  signer: Signer, address: string, trace: TimingTrace, mock: boolean): Promise<ExperimentAdapter> {
  if (platform === "baseline") return { encrypt: async values => [values,"0x"], decrypt: async handles => handles };
  const user = await signer.getAddress();
  if (mock) {
    if (platform !== "zama") throw new Error("Local CoFHE execution is not supported; use Sepolia for that platform");
    return {
      async encrypt(values) {
        const builder = hre.fhevm.createEncryptedInput(address, user);
        for (const value of values) builder[`add${width}`](value);
        const encrypted = await builder.encrypt();
        return [Array.from(encrypted.handles), encrypted.inputProof];
      },
      async decrypt(handles) {
        const type = ({ 8: 2, 16: 3, 32: 4, 64: 5, 128: 6 } as const)[width];
        const operation=mockDecryptQueue.then(async () => {
          const results: bigint[]=[];
          for (const h of handles) results.push(await hre.fhevm.userDecryptEuint(type,toBeHex(h,32),address,signer));
          return results;
        });
        mockDecryptQueue=operation.catch(()=>{});
        return operation;
      },
    };
  }
  if (platform === "zama") {
    const sdk = await trace.span("setup.sdk", () => createInstance({ ...SepoliaConfig, network: (hre.network.config as any).url }));
    const progress = (timing: TimingTrace, phase: string) => (event: any) => timing.event(`${phase}.sdk_progress`, {
      type:event.type, operation:event.operation, step:event.step, retryCount:event.retryCount,
      retryAfterMs:event.retryAfterMs,
      elapsed:event.elapsed, jobId:event.jobId, requestId:event.requestId,
    });
    return {
      async encrypt(values, timing, budget) {
        if (values.length > inputBatchSize(width)) throw new Error("Input proof exceeds the configured encrypted-bit batch limit");
        const proof = await timing.span("encrypt.local_ciphertext_and_proof", () => {
          const builder = sdk.createEncryptedInput(address,user);
          for (const value of values) builder[`add${width}`](value);
          return builder.generateZKProof();
        });
        const encrypted = await timing.span("encrypt.remote_approval", () => sdk.requestZKProofVerification(proof, {
          timeout:budget, signal:AbortSignal.timeout(budget), onProgress:progress(timing,"encrypt"),
        }));
        return [Array.from(encrypted.handles),encrypted.inputProof];
      },
      async decrypt(handles, timing, budget) {
        const started = timing.now();
        const values: unknown[] = [];
        for (let offset=0; offset<handles.length; offset+=inputBatchSize(width)) {
          const hexes = handles.slice(offset,offset+inputBatchSize(width)).map(h => toBeHex(h,32) as `0x${string}`);
          const auth = await timing.span("decrypt.local_authorization", async () => {
            const keys = sdk.generateKeypair(), start = Math.floor(Date.now()/1000)-60;
            const typed = sdk.createEIP712(keys.publicKey,[address],start,1);
            const signature = await signer.signTypedData(typed.domain,
              {UserDecryptRequestVerification:[...typed.types.UserDecryptRequestVerification]},typed.message);
            return {...keys,start,signature};
          });
          const result = await retryLifecycleRead(timing,"decrypt",Math.max(1,Math.floor(budget-(timing.now()-started))),
            remaining => sdk.userDecrypt(hexes.map(handle => ({handle,contractAddress:address})),
              auth.privateKey,auth.publicKey,auth.signature,[address],user,auth.start,1,
              {timeout:remaining,signal:AbortSignal.timeout(remaining),onProgress:progress(timing,"decrypt")}),1000,true,true);
          values.push(...hexes.map(h => result[h]));
        }
        return values;
      },
    };
  }
  const {createCofheClient,createCofheConfig} = require("@cofhe/sdk-current/node");
  const {Ethers6Adapter,HardhatSignerAdapter} = require("@cofhe/sdk-current/adapters");
  const client: CofheClient = createCofheClient(createCofheConfig({ supportedChains:[getChainById(11155111)] }));
  await trace.span("setup.sdk_connection",async () => {
    // Generated accounts sign locally; the legacy owner is an unlocked Hardhat signer.
    const adapted = "privateKey" in signer ? await Ethers6Adapter(signer.provider,signer) : await HardhatSignerAdapter(signer);
    await client.connect(adapted.publicClient,adapted.walletClient);
    await client.acp.getOrCreateSelfACP();
  });
  return {
    async encrypt(values,timing) {
      const encrypted = await timing.span("encrypt.sdk", () => observeHttp(timing,"encrypt", () => client
        .encryptInputs(values.map(value => Encryptable[`uint${width}`](value)))
        .setConsumingContract(address).onStep((step, context) => timing.event(`encrypt.${step}`,{
          isStart:context?.isStart,isEnd:context?.isEnd,sdkDurationMs:context?.duration,
        })).execute()));
      return [encrypted.slice(0,-1),encrypted[encrypted.length-1] as string];
    },
    async decrypt(handles,timing,budget) {
      const started = timing.now();
      const values: unknown[] = [];
      // Sequential only for setup batch validation; measured requests decrypt one result.
      for (const handle of handles) {
        const remaining = Math.max(1,Math.floor(budget-(timing.now()-started)));
        values.push(await observeHttp(timing,"decrypt", () => withCofheReadPolicy(timing,"decrypt",remaining,
          {minimumPollingMs:1000,maxRateLimitAttempts:3,rateLimitBackoffMs:5000}, left =>
            retryLifecycleRead(timing,"decrypt",left,budget => client.decryptForView(handle,FheTypes[`Uint${width}`])
              .set404RetryTimeout(budget).onPoll(event => timing.event("decrypt.sdk_poll",{...event})).execute()))));
      }
      return values;
    },
  };
}
