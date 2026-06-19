"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { type ReactNode, useMemo } from "react";

type AppProvidersProps = {
  privyAppId: string;
  children: ReactNode;
};

export function AppProviders({ privyAppId, children }: AppProvidersProps) {
  const solanaConnectors = useMemo(() => toSolanaWalletConnectors({ shouldAutoConnect: false }), []);

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#38bdf8",
          walletChainType: "solana-only",
          showWalletLoginFirst: true,
          walletList: ["detected_solana_wallets", "phantom", "solflare"],
        },
        loginMethods: ["wallet", "email"],
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
