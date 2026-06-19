import { NotImplementedError } from "@invisible-labs/sdk";
import type { CoordinatorSessionHandle, SwapResult } from "@invisible-labs/sdk/user";
import { describe, expect, it, vi } from "vitest";

import {
  buildInstantPayoutSpec,
  buildSingleDestinationPayoutPolicy,
  startPrivateTransfer,
  toPreviewOrFailure,
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

function fakeHandle(runSwap: CoordinatorSessionHandle["runSwap"]): CoordinatorSessionHandle {
  return {
    onStateChange: () => () => undefined,
    onLog: () => () => undefined,
    onPayoutExecuted: () => () => undefined,
    onRefundExecuted: () => () => undefined,
    onNormalUserActorSync: () => () => undefined,
    onCoordinatorError: () => () => undefined,
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
  it("calls the installed SDK coordinator session with observable callbacks", async () => {
    const events: string[] = [];
    const result: SwapResult = {
      swapId: "swap_1",
      jointPublicKey: new Uint8Array([1, 2, 3]),
      depositTxSignature: "sig",
      depositObservedAtMs: 1,
      delegatedAtMs: 2,
      policySnapshot: {} as SwapResult["policySnapshot"],
      delegatePolicySnapshot: {} as SwapResult["delegatePolicySnapshot"],
    };
    const createUserSession = vi.fn(() =>
      fakeHandle(async (params) => {
        params.onDepositAddressReady?.({
          swapId: "swap_1",
          jointPublicKey: new Uint8Array([1, 2, 3]),
          amountLamports: params.amountLamports,
        });

        return result;
      }),
    );

    await expect(
      startPrivateTransfer({
        amountSol: "0.1",
        destinationAddress: "dest",
        coordinator,
        createUserSession,
        onEvent: (event) => events.push(event.kind),
      }),
    ).resolves.toMatchObject({ kind: "completed", swapId: "swap_1" });

    expect(createUserSession).toHaveBeenCalledWith({ coordinator, createSession: undefined });
    expect(events).toContain("deposit");
  });

  it("maps SDK NotImplementedError to a preview-only outcome", async () => {
    expect(toPreviewOrFailure(new NotImplementedError("user.contractRequest"))).toMatchObject({
      kind: "preview-only",
    });
  });
});
