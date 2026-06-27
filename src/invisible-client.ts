"use client";

import {
  attestation,
  closeSession,
  coordinator,
  createSession,
  normalizeError,
  NotImplementedError,
  type CoordinatorPoolConfig,
  type Session,
} from "@invisible-labs/sdk";
import { derivedRefundableLamports } from "@invisible-labs/sdk/stats";
import { browserStorage, inMemoryStorage } from "@invisible-labs/sdk/storage";

const STORAGE_NAMESPACE = "nextjs";
const STORAGE_KEY = "sdk-check";
const SAMPLE_REFUNDABLE_LAMPORTS = 2_000_000;
const SAMPLE_NETWORK_FEE_LOSS_LAMPORTS = 5_000;

export type AttestedSessionHandle = {
  readonly session: Session;
  readonly close: () => void;
};

export async function runLocalSdkUtilityCheck(): Promise<{
  readonly storageKind: string;
  readonly storedByteLength: number;
  readonly refundableLamports: number;
}> {
  const storage = typeof window === "undefined" ? inMemoryStorage() : browserStorage();
  const value = new Uint8Array([1, 2, 3]);
  await storage.put(STORAGE_NAMESPACE, STORAGE_KEY, value);
  const keys = await storage.list(STORAGE_NAMESPACE);
  if (!keys.includes(STORAGE_KEY)) throw new Error("storage list missed the saved key");
  const saved = await storage.get(STORAGE_NAMESPACE, STORAGE_KEY);
  if (saved?.length !== value.length) throw new Error("storage get returned an unexpected value");
  await storage.remove(STORAGE_NAMESPACE, STORAGE_KEY);

  return {
    storageKind: storage.kind,
    storedByteLength: saved.length,
    refundableLamports: derivedRefundableLamports({
      receivedLamports: SAMPLE_REFUNDABLE_LAMPORTS,
      networkFeeLossLamports: SAMPLE_NETWORK_FEE_LOSS_LAMPORTS,
      refundable: true,
    }),
  };
}

export async function openAttestedSession(
  coordinatorPool: CoordinatorPoolConfig,
): Promise<AttestedSessionHandle> {
  const session = await createSession({
    coordinator: coordinatorPool,
    storage: typeof window === "undefined" ? inMemoryStorage() : browserStorage(),
  });
  const stopPolicyWatch = attestation.onPolicyViolation(session, (error) => {
    throw error;
  });
  await attestation.assertValid(session);
  coordinator.endpoints(session);
  attestation.current(session);
  attestation.policy(session);

  return {
    session,
    close() {
      stopPolicyWatch();
      closeSession(session);
    },
  };
}

export const sdkSurfaceCoverage = {
  session: ["createSession", "closeSession", "attestation", "coordinator"],
  user: ["createCoordinatorSession", "generateRecoveryCode", "requestRefundIntent"],
  lp: ["createLpLifecycleClient", "createPosition", "completeDkgBatch", "refill", "withdraw"],
  stats: ["derivedRefundableLamports"],
  events: ["subscribe", "unsubscribe", "onReconnect"],
} as const;

export function sdkErrorCode(error: unknown): string {
  if (error instanceof NotImplementedError) return error.code;
  return normalizeError(error);
}
