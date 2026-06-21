import {
  closeSession,
  type CoordinatorPoolConfig,
  createSession,
  normalizeError,
  type PayoutPolicy,
} from "@invisible-labs/sdk";
import { inMemoryStorage } from "@invisible-labs/sdk/storage";
import {
  createCoordinatorSession,
  type CoordinatorSessionHandle,
  type CoordinatorSessionOptions,
  isBenignTransportDrop,
  type PayoutSpec,
  type SwapResult,
} from "@invisible-labs/sdk/user";

import { solToLamports } from "@/lib/format";
import { jointPubkeyToSolanaAddress } from "@/lib/joint-wallet-address";

export const MIN_PRIVATE_TRANSFER_LAMPORTS = 400_000_000;
export const MIN_LP_INITIAL_FUNDING_LAMPORTS = 101_000_000;
export const LP_DEFAULT_TARGET_SHARDS = 200;
const LP_WITHDRAWAL_ALLOW_MANY_TO_ONE = true;
const COORDINATOR_PROTOCOL_MISMATCH_MESSAGE =
  "The configured coordinator is not compatible with this SDK build. Use a coordinator release that matches the installed SDK.";

export type TransferEvent =
  | { kind: "state"; message: string }
  | { kind: "deposit"; swapId: string; depositPublicKeyHex: string; amountLamports: number }
  | { kind: "policy"; message: string }
  | { kind: "recovery"; message: string };

export type TransferOutcome =
  | {
      kind: "deposit-ready";
      swapId: string;
      depositAddress: string;
      depositPublicKeyHex: string;
      amountLamports: number;
    }
  | { kind: "completed"; swapId: string; result: SwapResult }
  | { kind: "failed"; message: string };

export type LpAction =
  | "create"
  | "recover"
  | "complete-dkg"
  | "prepare-funding"
  | "reconcile-funding"
  | "refill"
  | "withdraw";

export type LpPositionSnapshot = {
  id: string;
  status: string;
  targetShardCount: number;
  shardCount: number;
  availableShardCount: number;
  fundingQueuedShardCount: number;
  pregeneratedShardCount: number;
  committedLamports: number;
  earnedLamports: number;
};

export type LpOutcome =
  | {
      kind: "lp-position";
      action: LpAction;
      message: string;
      position: LpPositionSnapshot;
      lpPositionCode?: string;
    }
  | {
      kind: "lp-funding";
      action: "prepare-funding";
      message: string;
      position: LpPositionSnapshot;
      address: string;
      requiredLamports: number;
      qrPayload: string;
    }
  | {
      kind: "lp-withdrawal";
      action: "withdraw";
      message: string;
      position: LpPositionSnapshot;
      withdrawalId: string;
      txSignatures: string[];
    }
  | { kind: "lp-failed"; message: string };

export type ConsoleOutcome = TransferOutcome | LpOutcome;

export type StartPrivateTransferInput = {
  amountSol: string;
  destinationAddress: string;
  coordinator: CoordinatorPoolConfig;
  createSession?: CoordinatorSessionOptions["createSession"];
  createUserSession?: (options: CoordinatorSessionOptions) => CoordinatorSessionHandle;
  onEvent?: (event: TransferEvent) => void;
};

type SdkSession = Awaited<ReturnType<typeof createSession>>;

type LpShardLike = {
  status: string;
};

type LpPositionLike = {
  id: string;
  status: string;
  targetShardCount: number;
  shards: readonly LpShardLike[];
  committedLamports: number;
  earnedLamports: number;
};

type LpCreateResultLike = {
  positionId: string;
  lpPositionCode: string;
  position?: LpPositionLike;
};

type LpFundingPlanLike = {
  address: string;
  requiredLamports: number;
  qrPayload: string;
  position?: LpPositionLike;
};

type LpWithdrawResultLike = {
  execution: {
    withdrawalId: string;
    txSignatures: string[];
  };
  position: LpPositionLike;
};

export type LpModuleForActions = {
  createPosition(session: SdkSession, args?: { committedLamports?: number; shardCount?: number }): Promise<LpCreateResultLike>;
  recoverPosition(session: SdkSession, args: { code: string }): Promise<LpPositionLike>;
  completeDkgBatch(session: SdkSession, positionId: string): Promise<LpPositionLike>;
  prepareInitialFunding(session: SdkSession, positionId: string): Promise<LpFundingPlanLike | null>;
  reconcileFunding(session: SdkSession, positionId: string): Promise<LpPositionLike>;
  refill(session: SdkSession, positionId: string): Promise<LpPositionLike>;
  withdrawPosition(
    session: SdkSession,
    positionId: string,
    args: { destinationAddresses: string[]; allowManyToOne: boolean },
  ): Promise<LpWithdrawResultLike>;
};

export type RunLpActionInput = {
  action: LpAction;
  coordinator: CoordinatorPoolConfig;
  positionCode?: string;
  destinationAddress?: string;
  createSdkSession?: typeof createSession;
  closeSdkSession?: typeof closeSession;
  lpModule?: LpModuleForActions;
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

export function toFailure(error: unknown): TransferOutcome {
  return {
    kind: "failed",
    message: normalizeError(error, "The private transfer could not be started."),
  };
}

function coordinatorErrorToFailure(error: unknown): TransferOutcome {
  const message = normalizeError(error, "Coordinator returned an error.");

  if (message.includes("json schema validation failed") || message.includes("is not one of")) {
    return {
      kind: "failed",
      message: COORDINATOR_PROTOCOL_MISMATCH_MESSAGE,
    };
  }

  return { kind: "failed", message };
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

    let depositReady = false;
    let resolveCoordinatorError!: (outcome: TransferOutcome) => void;
    const coordinatorErrorPromise = new Promise<TransferOutcome>((resolve) => {
      resolveCoordinatorError = resolve;
    });

    user.onCoordinatorError((error) => {
      input.onEvent?.({
        kind: "state",
        message: normalizeError(error, "Coordinator returned an error."),
      });

      if (!depositReady) {
        resolveCoordinatorError(coordinatorErrorToFailure(error));
      }
    });

    let resolveDepositReady: (outcome: TransferOutcome) => void;
    const depositReadyPromise = new Promise<TransferOutcome>((resolve) => {
      resolveDepositReady = resolve;
    });

    const protocolPromise = user
      .runSwap({
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
        onDepositAddressReady: async ({ swapId, jointPublicKey, amountLamports: depositLamports }) => {
          const depositPublicKeyHex = toHex(jointPublicKey);
          const depositAddress = await jointPubkeyToSolanaAddress(jointPublicKey);
          const outcome: TransferOutcome = {
            kind: "deposit-ready",
            swapId,
            depositAddress,
            depositPublicKeyHex,
            amountLamports: depositLamports,
          };
          depositReady = true;
          input.onEvent?.({
            kind: "deposit",
            swapId,
            depositPublicKeyHex,
            amountLamports: depositLamports,
          });
          resolveDepositReady(outcome);
        },
      })
      .then(
        (result): TransferOutcome => ({
          kind: "completed",
          swapId: result.swapId,
          result,
        }),
      )
      .catch((error): TransferOutcome | undefined => {
        if (depositReady && isBenignTransportDrop(error)) {
          return undefined;
        }
        return toFailure(error);
      })
      .finally(() => {
        user?.close();
      });

    const outcome = await Promise.race([depositReadyPromise, protocolPromise, coordinatorErrorPromise]);
    if (outcome?.kind === "failed" && !depositReady) {
      user.close();
    }

    return outcome ?? {
      kind: "failed",
      message: "The coordinator session ended before the deposit address was ready.",
    };
  } catch (error) {
    return toFailure(error);
  }
}

export async function runLpAction(input: RunLpActionInput): Promise<LpOutcome> {
  let session: SdkSession | undefined;

  try {
    const makeSession = input.createSdkSession ?? createSession;
    session = await makeSession({
      coordinator: input.coordinator,
      storage: inMemoryStorage(),
    });
    const lp = input.lpModule ?? (await loadLpModule());

    if (input.action === "create") {
      const result = await lp.createPosition(session, {
        committedLamports: MIN_LP_INITIAL_FUNDING_LAMPORTS,
        shardCount: LP_DEFAULT_TARGET_SHARDS,
      });
      const position = result.position ?? (await lp.recoverPosition(session, { code: result.lpPositionCode }));
      return {
        kind: "lp-position",
        action: input.action,
        message: "LP position created. Save the LP Position Code before continuing.",
        position: summarizeLpPosition(position),
        lpPositionCode: result.lpPositionCode,
      };
    }

    const recovered = await recoverLpPositionForAction(lp, session, input.positionCode);
    if (input.action === "recover") {
      return {
        kind: "lp-position",
        action: input.action,
        message: "LP position recovered.",
        position: summarizeLpPosition(recovered),
      };
    }

    if (input.action === "complete-dkg") {
      const position = await lp.completeDkgBatch(session, recovered.id);
      return {
        kind: "lp-position",
        action: input.action,
        message: "LP DKG batch completed or reconciled.",
        position: summarizeLpPosition(position),
      };
    }

    if (input.action === "prepare-funding") {
      const plan = await lp.prepareInitialFunding(session, recovered.id);
      if (plan === null) {
        return {
          kind: "lp-position",
          action: input.action,
          message: "No LP_DKG_0 funding action is currently available.",
          position: summarizeLpPosition(recovered),
        };
      }
      return {
        kind: "lp-funding",
        action: input.action,
        message: "Fund only LP_DKG_0 with the exact required amount.",
        position: summarizeLpPosition(plan.position ?? recovered),
        address: plan.address,
        requiredLamports: plan.requiredLamports,
        qrPayload: plan.qrPayload,
      };
    }

    if (input.action === "reconcile-funding") {
      const position = await lp.reconcileFunding(session, recovered.id);
      return {
        kind: "lp-position",
        action: input.action,
        message: "LP funding reconciled from coordinator state.",
        position: summarizeLpPosition(position),
      };
    }

    if (input.action === "refill") {
      const position = await lp.refill(session, recovered.id);
      return {
        kind: "lp-position",
        action: input.action,
        message: "LP refill requested through the SDK lifecycle.",
        position: summarizeLpPosition(position),
      };
    }

    const destination = input.destinationAddress?.trim();
    if (!destination) throw new Error("Enter a withdrawal destination address.");
    const result = await lp.withdrawPosition(session, recovered.id, {
      destinationAddresses: [destination],
      allowManyToOne: LP_WITHDRAWAL_ALLOW_MANY_TO_ONE,
    });
    return {
      kind: "lp-withdrawal",
      action: input.action,
      message: "LP withdrawal requested. Reconciliation stays SDK-owned.",
      position: summarizeLpPosition(result.position),
      withdrawalId: result.execution.withdrawalId,
      txSignatures: result.execution.txSignatures,
    };
  } catch (error) {
    return {
      kind: "lp-failed",
      message: normalizeError(error, "LP action failed."),
    };
  } finally {
    if (session !== undefined) {
      const close = input.closeSdkSession ?? closeSession;
      close(session);
    }
  }
}

async function loadLpModule(): Promise<LpModuleForActions> {
  return (await import("@invisible-labs/sdk/lp")) as unknown as LpModuleForActions;
}

async function recoverLpPositionForAction(
  lp: LpModuleForActions,
  session: SdkSession,
  positionCode: string | undefined,
): Promise<LpPositionLike> {
  const code = positionCode?.trim();
  if (!code) throw new Error("Enter the LP Position Code.");
  return lp.recoverPosition(session, { code });
}

function summarizeLpPosition(position: LpPositionLike): LpPositionSnapshot {
  return {
    id: position.id,
    status: position.status,
    targetShardCount: position.targetShardCount,
    shardCount: position.shards.length,
    availableShardCount: countLpShards(position, "AVAILABLE"),
    fundingQueuedShardCount: countLpShards(position, "FUNDING_QUEUED"),
    pregeneratedShardCount: countLpShards(position, "PREGENERATED"),
    committedLamports: position.committedLamports,
    earnedLamports: position.earnedLamports,
  };
}

function countLpShards(position: LpPositionLike, status: string): number {
  return position.shards.filter((shard) => shard.status === status).length;
}
