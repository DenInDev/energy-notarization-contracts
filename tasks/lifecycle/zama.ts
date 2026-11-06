import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { TimingTrace } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import type { Adapter, UniformWidth } from "./types";


// Creates a callback for Zama SDK progress updates.
// Records each update under the supplied timing phase.
function progress(trace: TimingTrace, phase: string) {
  return (event: any) =>
    trace.event(`${phase}.sdk_progress`, {
      type: event.type,
      operation: event.operation,
      step: event.step,
      retryCount: event.retryCount,
      retryAfterMs: event.retryAfterMs,
      elapsed: event.elapsed,
      jobId: event.jobId,
      requestId: event.requestId,
    });
}

// Initializes the Zama Relayer SDK for the signer and benchmark contract.
// Returns the input preparation and authorized decryption methods.
export async function createZamaAdapter(
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  address: string,
  timeoutMs: number,
  trace: TimingTrace,
  width: UniformWidth = 16,
): Promise<Adapter> {
  const instance = await trace.span("setup.sdk_initialization", () =>
    createInstance({
      ...SepoliaConfig,
      network: (hre.network.config as any).url,
    }),
  );

  return {
    // Encrypts a reading at the selected width and generates its proof locally.
    // Requests remote approval and returns the input handle and proof for submission.
    async encrypt(value, timing, observationTimeout = timeoutMs, kind = "integer") {
      const zkProof = await timing.span(
        "encrypt.local_ciphertext_and_zkproof",
        () => {
          const builder = instance.createEncryptedInput(address, signer.address);
          const input = kind === "address" ? builder.addAddress(hre.ethers.getAddress(hre.ethers.toBeHex(value, 20)))
            : width === 128 ? builder.add128(value) : builder.add16(value);
          return input.generateZKProof();
        },
      );
      const encrypted = await timing.span("encrypt.remote_input_approval", () =>
        instance.requestZKProofVerification(zkProof, {
          timeout: observationTimeout,
          signal: AbortSignal.timeout(observationTimeout),
          onProgress: progress(timing, "encrypt"),
        }),
      );

      return [encrypted.handles[0], encrypted.inputProof];
    },

    // Signs an authorization request and calls the SDK to decrypt the handle.
    // Records progress and returns the authorized plaintext.
    async decrypt(handle, timing, phase, observationTimeout = timeoutMs) {
      const handleHex = hre.ethers.toBeHex(handle, 32) as `0x${string}`;
      const auth = await timing.span(
        `${phase}.local_keypair_and_authorization`,
        async () => {
          const keys = instance.generateKeypair();
          // Small backward offset prevents server clock skew from rejecting a future validity start.
          const start = Math.floor(Date.now() / 1000) - 60;
          const eip712 = instance.createEIP712(
            keys.publicKey,
            [address],
            start,
            1,
          );
          const signature = await signer.signTypedData(
            eip712.domain,
            {
              UserDecryptRequestVerification: [
                ...eip712.types.UserDecryptRequestVerification,
              ],
            },
            eip712.message,
          );

          return { ...keys, start, signature };
        },
      );
      
      const result = await timing.span(`${phase}.sdk_user_decrypt`, () =>
        retryLifecycleRead(
          timing,
          phase,
          observationTimeout,
          (remainingMs) =>
            instance.userDecrypt(
              [{ handle: handleHex, contractAddress: address }],
              auth.privateKey,
              auth.publicKey,
              auth.signature,
              [address],
              signer.address,
              auth.start,
              1,
              {
                timeout: remainingMs,
                signal: AbortSignal.timeout(remainingMs),
                onProgress: progress(timing, phase),
              },
            ),
          1000,
          true,
          true,
        ),
      );

      return result[handleHex];
    },
  };
}
