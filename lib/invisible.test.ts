import type {
  CoordinatorProtocolError,
  CoordinatorSessionHandle,
  SwapResult,
} from "@invisible-labs/sdk/user";
import { describe, expect, it, vi } from "vitest";

import {
  buildInstantPayoutSpec,
  buildSingleDestinationPayoutPolicy,
  type LpModuleForActions,
  MIN_LP_INITIAL_FUNDING_LAMPORTS,
  MIN_PRIVATE_TRANSFER_LAMPORTS,
  runLpAction,
  startPrivateTransfer,
  toFailure,
} from "@/lib/invisible";

const coordinator = {
  endpoints: [
    {
      wsUrl: "wss://tee-dev.example/ws-noise",
      expectedHostname: "tee-dev.example",
      requiredMode: "dev" as const,
      releasePin: { mrtd: "0".repeat(96) },
    },
  ],
};

function fakeHandle(
  runSwap: CoordinatorSessionHandle["runSwap"],
  options: {
    onCoordinatorError?: (listener: (error: CoordinatorProtocolError) => void) => void;
  } = {},
): CoordinatorSessionHandle {
  return {
    onStateChange: () => () => undefined,
    onLog: () => () => undefined,
    onPayoutExecuted: () => () => undefined,
    onRefundExecuted: () => () => undefined,
    onNormalUserActorSync: () => () => undefined,
    onCoordinatorError: (listener) => {
      options.onCoordinatorError?.(listener);
      return () => undefined;
    },
    currentSwapState: "new",
    currentSessionStatus: "idle",
    runSwap,
    close: vi.fn(),
    restoreSwapContext: vi.fn(),
    requestSwapStatus: vi.fn(),
    startSwapStatusReconciliation: vi.fn(),
    requestRefund: vi.fn(),
    requestRefundIntent: vi.fn(),
  };
}

describe("payout helpers", () => {
  it("builds the single-destination policy used by the UI preview", () => {
    expect(buildSingleDestinationPayoutPolicy(" 11111111111111111111111111111111 ")).toEqual({
      destinations: [{ address: "11111111111111111111111111111111", sharePercent: 100 }],
    });
  });

  it("builds the SDK runSwap instant payout spec", () => {
    expect(buildInstantPayoutSpec("dest")).toEqual({
      mode: "instant",
      destination_address: "dest",
    });
  });
});

describe("startPrivateTransfer", () => {
  it("keeps the documented minimums in code", () => {
    expect(MIN_PRIVATE_TRANSFER_LAMPORTS).toBe(400_000_000);
    expect(MIN_LP_INITIAL_FUNDING_LAMPORTS).toBe(101_000_000);
  });

  it("resolves when the installed SDK exposes the deposit address", async () => {
    const events: string[] = [];
    const createUserSession = vi.fn(() =>
      fakeHandle(async (params) => {
        await params.onDepositAddressReady?.({
          swapId: "swap_1",
          jointPublicKey: new Uint8Array(32).fill(1),
          amountLamports: params.amountLamports,
        });

        return new Promise<SwapResult>(() => undefined);
      }),
    );

    await expect(
      startPrivateTransfer({
        amountSol: "0.4",
        destinationAddress: "dest",
        coordinator,
        createUserSession,
        onEvent: (event) => events.push(event.kind),
      }),
    ).resolves.toMatchObject({
      kind: "deposit-ready",
      swapId: "swap_1",
      amountLamports: MIN_PRIVATE_TRANSFER_LAMPORTS,
    });

    expect(createUserSession).toHaveBeenCalledWith({ coordinator, createSession: undefined });
    expect(events).toContain("deposit");
  });

  it("returns a completed result if the SDK completes before exposing a deposit address", async () => {
    const result: SwapResult = {
      swapId: "swap_1",
      jointPublicKey: new Uint8Array(32).fill(1),
      depositTxSignature: "sig",
      depositObservedAtMs: 1,
      delegatedAtMs: 2,
      policySnapshot: {} as SwapResult["policySnapshot"],
      delegatePolicySnapshot: {} as SwapResult["delegatePolicySnapshot"],
    };
    const createUserSession = vi.fn(() => fakeHandle(async () => result));

    await expect(
      startPrivateTransfer({
        amountSol: "0.4",
        destinationAddress: "dest",
        coordinator,
        createUserSession,
      }),
    ).resolves.toMatchObject({ kind: "completed", swapId: "swap_1" });
  });

  it("returns a failure if the SDK fails before exposing a deposit address", async () => {
    const createUserSession = vi.fn(() =>
      fakeHandle(async () => {
        throw new Error("boom");
      }),
    );

    await expect(
      startPrivateTransfer({
        amountSol: "0.4",
        destinationAddress: "dest",
        coordinator,
        createUserSession,
      }),
    ).resolves.toMatchObject({ kind: "failed", message: "boom" });
  });

  it("fails fast when the coordinator rejects the SDK protocol before deposit", async () => {
    let emitCoordinatorError: ((error: CoordinatorProtocolError) => void) | undefined;
    const createUserSession = vi.fn(() =>
      fakeHandle(
        async () => {
          setTimeout(() => {
            emitCoordinatorError?.(
              Object.assign(
                new Error(
                  'decode error: json schema validation failed: /type: "ContractRequest" is not one of "SwapRequest"',
                ),
                {
                  code: "ERR_INTERNAL",
                },
              ),
            );
          }, 0);
          return new Promise<SwapResult>(() => undefined);
        },
        {
          onCoordinatorError: (listener) => {
            emitCoordinatorError = listener;
          },
        },
      ),
    );

    await expect(
      startPrivateTransfer({
        amountSol: "0.4",
        destinationAddress: "dest",
        coordinator,
        createUserSession,
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      message: expect.stringContaining("not compatible with this SDK build"),
    });
  });

  it("rejects private transfer amounts below the protocol minimum", async () => {
    const createUserSession = vi.fn(() => fakeHandle(async () => {
      throw new Error("should not run");
    }));

    await expect(
      startPrivateTransfer({
        amountSol: "0.399999999",
        destinationAddress: "dest",
        coordinator,
        createUserSession,
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      message: "Minimum private transfer amount is 0.4 SOL.",
    });

    expect(createUserSession).not.toHaveBeenCalled();
  });

  it("normalizes unknown SDK errors to failures", async () => {
    expect(toFailure(new Error("user.contractRequest failed"))).toEqual({
      kind: "failed",
      message: "user.contractRequest failed",
    });
  });
});

describe("runLpAction", () => {
  it("creates an LP position through the SDK lifecycle module", async () => {
    const lpModule = fakeLpModule();

    await expect(
      runLpAction({
        action: "create",
        coordinator,
        createSdkSession: fakeSdkSession,
        closeSdkSession: vi.fn(),
        lpModule,
      }),
    ).resolves.toMatchObject({
      kind: "lp-position",
      action: "create",
      lpPositionCode: "lp-code",
      position: {
        id: "lp_1",
        targetShardCount: 200,
        pregeneratedShardCount: 1,
      },
    });

    expect(lpModule.createPosition).toHaveBeenCalledWith(expect.anything(), {
      committedLamports: MIN_LP_INITIAL_FUNDING_LAMPORTS,
      shardCount: 200,
    });
  });

  it("recovers before asking the SDK for LP_DKG_0 funding", async () => {
    const lpModule = fakeLpModule();

    await expect(
      runLpAction({
        action: "prepare-funding",
        coordinator,
        positionCode: "lp-code",
        createSdkSession: fakeSdkSession,
        closeSdkSession: vi.fn(),
        lpModule,
      }),
    ).resolves.toMatchObject({
      kind: "lp-funding",
      address: "funding-address",
      requiredLamports: MIN_LP_INITIAL_FUNDING_LAMPORTS,
    });

    expect(lpModule.recoverPosition).toHaveBeenCalledWith(expect.anything(), { code: "lp-code" });
    expect(lpModule.prepareInitialFunding).toHaveBeenCalledWith(expect.anything(), "lp_1");
  });

  it("requires a destination for LP withdrawals", async () => {
    await expect(
      runLpAction({
        action: "withdraw",
        coordinator,
        positionCode: "lp-code",
        createSdkSession: fakeSdkSession,
        closeSdkSession: vi.fn(),
        lpModule: fakeLpModule(),
      }),
    ).resolves.toMatchObject({
      kind: "lp-failed",
      message: "Enter a withdrawal destination address.",
    });
  });
});

async function fakeSdkSession() {
  return { attested: true } as never;
}

function fakeLpModule(): LpModuleForActions {
  const position = {
    id: "lp_1",
    status: "active",
    targetShardCount: 200,
    committedLamports: MIN_LP_INITIAL_FUNDING_LAMPORTS,
    earnedLamports: 0,
    shards: [{ status: "PREGENERATED" }],
  };

  return {
    createPosition: vi.fn(async () => ({
      positionId: "lp_1",
      lpPositionCode: "lp-code",
      position,
    })),
    recoverPosition: vi.fn(async () => position),
    completeDkgBatch: vi.fn(async () => position),
    prepareInitialFunding: vi.fn(async () => ({
      address: "funding-address",
      requiredLamports: MIN_LP_INITIAL_FUNDING_LAMPORTS,
      qrPayload: "solana:funding-address",
      position,
    })),
    reconcileFunding: vi.fn(async () => position),
    refill: vi.fn(async () => position),
    withdrawPosition: vi.fn(async () => ({
      execution: {
        withdrawalId: "withdrawal_1",
        txSignatures: ["sig"],
      },
      position,
    })),
  };
}
