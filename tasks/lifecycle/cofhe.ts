import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Encryptable, FheTypes, type CofheClient } from "@cofhe/sdk-current";
import { getChainById } from "@cofhe/sdk-current/chains";
import { TimingTrace, observeHttp } from "../lib/lifecycleTiming";
import { retryLifecycleRead } from "../lib/lifecycleReadRetry";
import type { Adapter, UniformWidth } from "./types";
import { withCofheReadPolicy, type CofheReadPolicy } from "../lib/cofheReadPolicy";


// Initializes the CoFHE SDK for the signer and target contract.
// Returns the encryption and decryption methods used by the runner.
export async function createCofheAdapter(
  signer: HardhatEthersSigner,
  address: string,
  timeoutMs: number,
  trace: TimingTrace,
  inputWidth: UniformWidth = 16,
  readPolicy?: CofheReadPolicy,
): Promise<Adapter> {
  const {
    createCofheClient,
    createCofheConfig,
  } = require("@cofhe/sdk-current/node");
  const { HardhatSignerAdapter, Ethers6Adapter } = require("@cofhe/sdk-current/adapters");
  const client: CofheClient = createCofheClient(
    createCofheConfig({ supportedChains: [getChainById(11155111)] }),
  );

  await trace.span("setup.sdk_connection", async () => {
    const { publicClient, walletClient } = "privateKey" in signer
      ? await Ethers6Adapter(signer.provider, signer) : await HardhatSignerAdapter(signer);

    await client.connect(publicClient, walletClient);
  });
  await trace.span("setup.authenticated_acp", () =>
    client.acp.getOrCreateSelfACP(),
  );

  return {
    // Prepares an encrypted input at the campaign's selected width.
    // Records SDK stages and returns the handle and proof for submission.
    async encrypt(value, timing, _observationTimeout, kind = "integer") {
      const stepStarts = new Map<string, number>();
      const encrypted = await timing.span("encrypt.sdk_total", () =>
        observeHttp(timing, "encrypt", () =>
          client
            .encryptInputs([kind === "address" ? Encryptable.address(value)
              : inputWidth === 128 ? Encryptable.uint128(value) : Encryptable.uint16(value)])
            .setConsumingContract(address)
            .onStep((step, context) => {
              const at = timing.now();

              if (context?.isStart) stepStarts.set(step, at);

              const start = stepStarts.get(step);

              if (context?.isEnd && start !== undefined) {
                timing.stages.push({
                  stage: `encrypt.sdk_observed.${step}`,
                  startMs: start,
                  durationMs: at - start,
                  status: "ok",
                  detail: { sdkDurationMs: context.duration },
                });
              }

              timing.event(`encrypt.sdk_stage.${step}`, {
                isStart: context?.isStart,
                isEnd: context?.isEnd,
                sdkDurationMs: context?.duration,
                usedWorker: context?.usedWorker,
                fheKeyFetchedFromCoFHE: context?.fheKeyFetchedFromCoFHE,
                crsFetchedFromCoFHE: context?.crsFetchedFromCoFHE,
              });
            })
            .execute(),
        ),
      );

      return [...encrypted];
    },
    // Retrieves an authorized plaintext from a CoFHE ciphertext handle.
    // Uses the requested encrypted width and records SDK polling activity.
    async decrypt(handle, timing, phase, observationTimeout = timeoutMs, width = 64) {
      const execute = (budget: number) => client
        .decryptForView(handle, width === "address" ? FheTypes.Uint160
          : width === 128 ? FheTypes.Uint128 : width === 16 ? FheTypes.Uint16 : FheTypes.Uint64)
        .onPoll(context => timing.event(`${phase}.sdk_poll`, { ...context }))
        .set404RetryTimeout(budget).execute();
      if (readPolicy) return timing.span(`${phase}.sdk_sealoutput_and_unseal`, () =>
        observeHttp(timing, phase, () => withCofheReadPolicy(timing, phase, observationTimeout, readPolicy,
          remaining => retryLifecycleRead(timing, phase, remaining, execute))));
      return timing.span(`${phase}.sdk_sealoutput_and_unseal`, () =>
        retryLifecycleRead(timing, phase, observationTimeout, () =>
          observeHttp(timing, phase, () =>
            client
              .decryptForView(handle, width === "address" ? FheTypes.Uint160
                : width === 128 ? FheTypes.Uint128 : width === 16 ? FheTypes.Uint16 : FheTypes.Uint64)
              .onPoll((context) =>
                timing.event(`${phase}.sdk_poll`, { ...context }),
              )
              .set404RetryTimeout(observationTimeout)
              .execute(),
          ),
        ),
      );
    },
  };
}
