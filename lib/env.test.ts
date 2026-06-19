import { describe, expect, it } from "vitest";

import { endpointFromWsUrl, isReady, readPublicEnv } from "@/lib/env";

describe("readPublicEnv", () => {
  it("fails closed when Privy or coordinator config is missing", () => {
    const env = readPublicEnv({});

    expect(isReady(env)).toBe(false);
    expect(env.missing).toEqual([
      "NEXT_PUBLIC_PRIVY_APP_ID",
      "NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL",
    ]);
    expect(env.coordinator).toBeNull();
  });

  it("builds an explicit coordinator endpoint from public env", () => {
    const env = readPublicEnv({
      NEXT_PUBLIC_PRIVY_APP_ID: "privy-app",
      NEXT_PUBLIC_SOLANA_CLUSTER: "mainnet-beta",
      NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL: "wss://tee-dev.example/ws-noise",
      NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE: "auto",
    });

    expect(isReady(env)).toBe(true);
    expect(env.solanaCluster).toBe("mainnet-beta");
    expect(env.coordinator?.endpoints[0]).toMatchObject({
      wsUrl: "wss://tee-dev.example/ws-noise",
      expectedHostname: "tee-dev.example",
      requiredMode: "auto",
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
