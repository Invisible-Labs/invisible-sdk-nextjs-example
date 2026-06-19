# Invisible SDK Next.js + Privy Example

Open-source consumer example for integrating the Invisible SDK in a common Solana web app stack:
Next.js, React, TypeScript, Tailwind CSS, Privy, Solana Standard Wallets, and `@invisible-labs/sdk`.

Status: devnet preview. Do not use with production funds.

## What This Shows

- Privy login and external Solana wallet connection.
- Solana Standard Wallet connector setup through Privy.
- Env-driven Invisible coordinator configuration.
- A normal-user private-transfer console using the installed SDK package.
- Honest handling for SDK surfaces that still report preview or not-implemented behavior.

## Current SDK Package

This repo uses the private GitHub Packages build:

```txt
@invisible-labs/sdk@0.0.1
```

Some Invisible docs refer to the target public package name `@invisible/sdk`. This example uses the package that is actually published today.

## Requirements

- Node.js 24 or newer.
- npm.
- A Privy app ID with Solana wallet login enabled.
- A GitHub Packages token with access to `@invisible-labs/sdk` while the SDK is private.

## Setup

Create `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```txt
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL=wss://your-dev-coordinator/ws-noise
NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE=dev
```

Install dependencies:

```bash
export NPM_TOKEN=github_packages_token_with_read_access
npm ci
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run audit:high
```

`npm run audit:high` is the CI security gate. A full `npm audit` currently reports moderate upstream advisories from current Privy and Next transitive dependencies. The lockfile overrides `ws`, `viem`, and WalletConnect packages to remove the high severity findings without downgrading Privy to an older major.

## Privacy And Safety Boundaries

- This sample does not log, persist, or render Recovery Codes.
- It does not log private keys, FROST shares, nonces, raw transaction bytes, signatures, or decrypted payloads.
- Coordinator endpoints are explicit env config. No production Invisible endpoint is hard-coded.
- Devnet is the default.
- The visible entry point is the user deposit into an SDK-created joint wallet. The unlinkable exit is the fresh destination payout path enforced by the coordinator policy. This repo does not claim stronger guarantees than the SDK and protocol provide.

## Useful References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/guides/nextjs)
- [Privy React installation](https://docs.privy.io/basics/react/installation)
- [Privy Solana Standard Wallets](https://docs.privy.io/recipes/solana/standard-wallets)
- [Solana Wallet Adapter guide](https://github.com/anza-xyz/wallet-adapter/blob/master/APP.md)
