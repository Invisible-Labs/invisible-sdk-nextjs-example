import {
  type CoordinatorPoolConfig,
  NotImplementedError,
  normalizeError,
  type PayoutPolicy,
} from "@invisible-labs/sdk";
import {
  createCoordinatorSession,
  type CoordinatorSessionHandle,
  type CoordinatorSessionOptions,
  type PayoutSpec,
  type SwapResult,
} from "@invisible-labs/sdk/user";

import { solToLamports } from "@/lib/format";

export const MIN_PRIVATE_TRANSFER_LAMPORTS = 400_000_000;
export const MIN_LP_INITIAL_FUNDING_LAMPORTS = 101_000_000;
export const LP_DEFAULT_TARGET_SHARDS = 200;

export type TransferEvent =
  | { kind: "state"; message: string }
  | { kind: "deposit"; swapId: string; depositPublicKeyHex: string; amountLamports: number }
  | { kind: "policy"; message: string }
  | { kind: "recovery"; message: string };

export type TransferOutcome =
  | { kind: "completed"; swapId: string; result: SwapResult }
  | { kind: "preview-only"; message: string }
  | { kind: "failed"; message: string };

export type StartPrivateTransferInput = {
  amountSol: string;
  destinationAddress: string;
  coordinator: CoordinatorPoolConfig;
  createSession?: CoordinatorSessionOptions["createSession"];
  createUserSession?: (options: CoordinatorSessionOptions) => CoordinatorSessionHandle;
  onEvent?: (event: TransferEvent) => void;
};

export function buildSingleDestinationPayoutPolicy(destinationAddress: string): PayoutPolicy {
  return {
    destinations: [
      {
        address: destinationAddress.trim(),
        sharePercent: 100,
      },
    ],
  };
}

export function buildInstantPayoutSpec(destinationAddress: string): PayoutSpec {
  return {
    mode: "instant",
    destination_address: destinationAddress.trim(),
  };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function toPreviewOrFailure(error: unknown): TransferOutcome {
  if (error instanceof NotImplementedError) {
    return {
      kind: "preview-only",
      message:
        "This SDK surface is installed and typed, but the current package reports that command execution is not implemented yet.",
    };
  }

  return {
    kind: "failed",
    message: normalizeError(error, "The private transfer could not be started."),
  };
}

export async function startPrivateTransfer(input: StartPrivateTransferInput): Promise<TransferOutcome> {
  let user: CoordinatorSessionHandle | undefined;

  try {
    const amountLamports = solToLamports(input.amountSol);

    if (amountLamports < MIN_PRIVATE_TRANSFER_LAMPORTS) {
      throw new Error("Minimum private transfer amount is 0.4 SOL.");
    }

    const payoutSpec = buildInstantPayoutSpec(input.destinationAddress);
    const makeUserSession = input.createUserSession ?? createCoordinatorSession;
    user = makeUserSession({
      coordinator: input.coordinator,
      createSession: input.createSession,
    });

    user.onStateChange((swapState, sessionStatus) => {
      input.onEvent?.({
        kind: "state",
        message: `Coordinator session ${sessionStatus}; swap state ${swapState}.`,
      });
    });

    user.onCoordinatorError((error) => {
      input.onEvent?.({
        kind: "state",
        message: normalizeError(error, "Coordinator returned an error."),
      });
    });

    const result = await user.runSwap({
      amountLamports,
      payoutSpec,
      onPolicySnapshot: (policy) => {
        input.onEvent?.({
          kind: "policy",
          message: `Policy accepted ${policy.entry_amount_lamports} lamports for one instant destination.`,
        });
      },
      onRecoveryCodeReady: () => {
        input.onEvent?.({
          kind: "recovery",
          message: "Recovery code generated locally. This sample does not log or render it.",
        });
      },
      onDepositAddressReady: ({ swapId, jointPublicKey, amountLamports: depositLamports }) => {
        input.onEvent?.({
          kind: "deposit",
          swapId,
          depositPublicKeyHex: toHex(jointPublicKey),
          amountLamports: depositLamports,
        });
      },
    });

    return {
      kind: "completed",
      swapId: result.swapId,
      result,
    };
  } catch (error) {
    return toPreviewOrFailure(error);
  } finally {
    user?.close();
  }
}
