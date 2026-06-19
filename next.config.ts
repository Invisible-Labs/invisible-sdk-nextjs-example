import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // @invisible-labs/sdk@0.0.1 inlines FROST WASM but still exposes wasm-bindgen's
      // default URL branch. The runtime path uses the inlined bytes.
      "frost_bg.wasm": false,
      // This example does not enable Privy fiat onramp or Farcaster mini-app flows.
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
    };

    return config;
  },
};

export default nextConfig;
