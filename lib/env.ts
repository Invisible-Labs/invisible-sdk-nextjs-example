import type { CoordinatorEndpoint, CoordinatorPoolConfig } from "@invisible-labs/sdk";

export type SolanaCluster = "devnet" | "mainnet-beta" | "testnet" | "localnet";
export type RequiredMode = "dev" | "prod" | "auto";

export type PublicEnv = {
  privyAppId: string | null;
  solanaCluster: SolanaCluster;
  solanaRpcUrl: string | null;
  invisibleRequiredMode: RequiredMode;
  coordinator: CoordinatorPoolConfig | null;
  missing: string[];
};

type EnvSource = Partial<Record<string, string | undefined>>;

const DEFAULT_CLUSTER: SolanaCluster = "devnet";
const DEFAULT_MODE: RequiredMode = "dev";
const DEV_RELEASE_PIN = "0".repeat(96);

function nullable(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseCluster(value: string | undefined): SolanaCluster {
  if (value === "mainnet-beta" || value === "testnet" || value === "localnet") {
    return value;
  }

  return DEFAULT_CLUSTER;
}

function parseRequiredMode(value: string | undefined): RequiredMode {
  if (value === "prod" || value === "auto") {
    return value;
  }

  return DEFAULT_MODE;
}

export function endpointFromWsUrl(wsUrl: string, requiredMode: RequiredMode): CoordinatorEndpoint {
  const url = new URL(wsUrl);

  if (url.protocol !== "wss:" && url.protocol !== "ws:") {
    throw new Error("Coordinator URL must use ws:// or wss://.");
  }

  return {
    wsUrl,
    expectedHostname: url.hostname,
    requiredMode,
    allowLocalAttestation: requiredMode === "dev",
    releasePin: {
      mrtd: DEV_RELEASE_PIN,
    },
  };
}

export function readPublicEnv(source: EnvSource = process.env): PublicEnv {
  const privyAppId = nullable(source.NEXT_PUBLIC_PRIVY_APP_ID);
  const solanaRpcUrl = nullable(source.NEXT_PUBLIC_SOLANA_RPC_URL);
  const coordinatorWsUrl = nullable(source.NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL);
  const invisibleRequiredMode = parseRequiredMode(source.NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE);
  const missing: string[] = [];

  if (!privyAppId) {
    missing.push("NEXT_PUBLIC_PRIVY_APP_ID");
  }

  if (!coordinatorWsUrl) {
    missing.push("NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL");
  }

  let coordinator: CoordinatorPoolConfig | null = null;

  if (coordinatorWsUrl) {
    coordinator = {
      endpoints: [endpointFromWsUrl(coordinatorWsUrl, invisibleRequiredMode)],
      allowedRoles: ["leader"],
      preferLeader: true,
    };
  }

  return {
    privyAppId,
    solanaCluster: parseCluster(source.NEXT_PUBLIC_SOLANA_CLUSTER),
    solanaRpcUrl,
    invisibleRequiredMode,
    coordinator,
    missing,
  };
}

export function isReady(env: PublicEnv): boolean {
  return env.missing.length === 0 && env.coordinator !== null;
}
