import { describe, expect, it } from "vitest";

import { endpointFromWsUrl, isReady, readPublicEnv } from "@/lib/env";

describe("readPublicEnv", () => {
  it("uses public Azure coordinator defaults without app-specific setup", () => {
    const env = readPublicEnv({});

    expect(isReady(env)).toBe(true);
    expect(env.missing).toEqual([]);
    expect(env.coordinatorWsUrl).toBe("wss://tee-azure.invisible.exchange/ws-noise");
    expect(env.invisibleRequiredMode).toBe("prod");
    expect(env.coordinator.endpoints[0]?.releasePin).toMatchObject({
      mrtd:
        "ff450b138c5ee6734a43dc35afb437abfa24ef743bc9e9484ef4af365fcd89a6c50913248ed7fcb92a7d42b1ba7da984",
      azureMaa: {
        issuer: "https://sharedweu.weu.attest.azure.net",
        jwksUrl: "https://sharedweu.weu.attest.azure.net/certs",
        policyHash: "9NY0VnTQ-IiBriBplVUpFbczcDaEBUwsiFYAzHu_gco",
      },
    });
  });

  it("builds an explicit coordinator endpoint from public env", () => {
    const env = readPublicEnv({
      NEXT_PUBLIC_SOLANA_CLUSTER: "mainnet-beta",
      NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL: "wss://tee-dev.example/ws-noise",
      NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE: "auto",
    });

    expect(isReady(env)).toBe(true);
    expect(env.solanaCluster).toBe("mainnet-beta");
    expect(env.coordinator.endpoints[0]).toMatchObject({
      wsUrl: "wss://tee-dev.example/ws-noise",
      expectedHostname: "tee-dev.example",
      requiredMode: "auto",
    });
  });

  it("allows public release pin overrides for coordinator rotation", () => {
    const env = readPublicEnv({
      NEXT_PUBLIC_INVISIBLE_RELEASE_MRTD: "a".repeat(96),
      NEXT_PUBLIC_INVISIBLE_INTEL_ROOT_FINGERPRINT: "b".repeat(64),
      NEXT_PUBLIC_INVISIBLE_AZURE_MAA_ISSUER: "https://issuer.example",
      NEXT_PUBLIC_INVISIBLE_AZURE_MAA_JWKS_URL: "https://issuer.example/certs",
      NEXT_PUBLIC_INVISIBLE_AZURE_MAA_POLICY_HASH: "policy_hash",
    });

    expect(env.coordinator.endpoints[0]?.releasePin).toEqual({
      mrtd: "a".repeat(96),
      intelRootFingerprint: "b".repeat(64),
      azureMaa: {
        issuer: "https://issuer.example",
        jwksUrl: "https://issuer.example/certs",
        policyHash: "policy_hash",
      },
    });
  });
});

describe("endpointFromWsUrl", () => {
  it("rejects non-WebSocket coordinator URLs", () => {
    expect(() => endpointFromWsUrl("https://tee-dev.example/ws-noise", "dev")).toThrow(
      "Coordinator URL must use ws:// or wss://.",
    );
  });
});
