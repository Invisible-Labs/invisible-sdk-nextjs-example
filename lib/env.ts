import type { CoordinatorEndpoint, CoordinatorPoolConfig } from "@invisible-labs/sdk";

export type SolanaCluster = "devnet" | "mainnet-beta" | "testnet" | "localnet";
export type RequiredMode = "dev" | "prod" | "auto";

export type PublicEnv = {
  solanaCluster: SolanaCluster;
  solanaRpcUrl: string | null;
  coordinatorWsUrl: string;
  invisibleRequiredMode: RequiredMode;
  coordinator: CoordinatorPoolConfig;
  missing: string[];
};

type EnvSource = Partial<Record<string, string | undefined>>;

const DEFAULT_CLUSTER: SolanaCluster = "mainnet-beta";
const DEFAULT_MODE: RequiredMode = "prod";
const DEFAULT_COORDINATOR_WS_URL = "wss://tee-azure.invisible.exchange/ws-noise";
const DEFAULT_AZURE_PROD_RELEASE_MRTD =
  "ff450b138c5ee6734a43dc35afb437abfa24ef743bc9e9484ef4af365fcd89a6c50913248ed7fcb92a7d42b1ba7da984";
const DEFAULT_INTEL_ROOT_FINGERPRINT =
  "44a0196b2b99f889b8e149e95b807a350e7424964399e885a7cbb8ccfab674d3";
const DEFAULT_AZURE_MAA = {
  issuer: "https://sharedweu.weu.attest.azure.net",
  jwksUrl: "https://sharedweu.weu.attest.azure.net/certs",
  policyHash: "9NY0VnTQ-IiBriBplVUpFbczcDaEBUwsiFYAzHu_gco",
} as const;
const DEFAULT_RELEASE_PIN = {
  mrtd: DEFAULT_AZURE_PROD_RELEASE_MRTD,
  intelRootFingerprint: DEFAULT_INTEL_ROOT_FINGERPRINT,
  azureMaa: DEFAULT_AZURE_MAA,
} satisfies CoordinatorEndpoint["releasePin"];

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

export function endpointFromWsUrl(
  wsUrl: string,
  requiredMode: RequiredMode,
  releasePin: CoordinatorEndpoint["releasePin"] = DEFAULT_RELEASE_PIN,
): CoordinatorEndpoint {
  const url = new URL(wsUrl);

  if (url.protocol !== "wss:" && url.protocol !== "ws:") {
    throw new Error("Coordinator URL must use ws:// or wss://.");
  }

  return {
    wsUrl,
    expectedHostname: url.hostname,
    requiredMode,
    allowLocalAttestation: requiredMode === "dev",
    releasePin,
  };
}

export function readPublicEnv(source: EnvSource = process.env): PublicEnv {
  const solanaRpcUrl = nullable(source.NEXT_PUBLIC_SOLANA_RPC_URL);
  const coordinatorWsUrl =
    nullable(source.NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL) ?? DEFAULT_COORDINATOR_WS_URL;
  const invisibleRequiredMode = parseRequiredMode(source.NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE);
  const missing: string[] = [];
  const coordinator: CoordinatorPoolConfig = {
    endpoints: [endpointFromWsUrl(coordinatorWsUrl, invisibleRequiredMode, readReleasePin(source))],
    allowedRoles: ["leader"],
    preferLeader: true,
  };

  return {
    solanaCluster: parseCluster(source.NEXT_PUBLIC_SOLANA_CLUSTER),
    solanaRpcUrl,
    coordinatorWsUrl,
    invisibleRequiredMode,
    coordinator,
    missing,
  };
}

export function isReady(env: PublicEnv): boolean {
  return env.missing.length === 0;
}

function readReleasePin(source: EnvSource): CoordinatorEndpoint["releasePin"] {
  return {
    mrtd: nullable(source.NEXT_PUBLIC_INVISIBLE_RELEASE_MRTD) ?? DEFAULT_AZURE_PROD_RELEASE_MRTD,
    intelRootFingerprint:
      nullable(source.NEXT_PUBLIC_INVISIBLE_INTEL_ROOT_FINGERPRINT) ??
      DEFAULT_INTEL_ROOT_FINGERPRINT,
    azureMaa: {
      issuer: nullable(source.NEXT_PUBLIC_INVISIBLE_AZURE_MAA_ISSUER) ?? DEFAULT_AZURE_MAA.issuer,
      jwksUrl:
        nullable(source.NEXT_PUBLIC_INVISIBLE_AZURE_MAA_JWKS_URL) ?? DEFAULT_AZURE_MAA.jwksUrl,
      policyHash:
        nullable(source.NEXT_PUBLIC_INVISIBLE_AZURE_MAA_POLICY_HASH) ??
        DEFAULT_AZURE_MAA.policyHash,
    },
  };
}
