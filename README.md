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

`NEXT_PUBLIC_PRIVY_APP_ID` is required by `PrivyProvider`. It is public browser config, not a secret. Do not add a Privy app secret to this client-only example.

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

Build and preview the static output:

```bash
npm run build
npm start
```

`npm run build` writes the deployable site to `out/`.

## Free Deployment

Use Cloudflare Pages for a zero-cost public preview.

Suggested settings:

```txt
Framework preset: Next.js (Static HTML Export)
Build command: npm run build
Build output directory: out
Node version: 24
```

If the Pages project was created with the generic Next.js preset, the preview may 404 because Cloudflare can look for `.vercel/output/static`. The build mirrors `out/` there as a compatibility fallback, but the preferred fix is still to use the `Next.js (Static HTML Export)` preset or set the output directory to `out`.

Environment variables:

```txt
NPM_TOKEN=github_packages_token_with_read_access
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL=wss://your-dev-coordinator/ws-noise
NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE=dev
```

`NPM_TOKEN` is needed only while `@invisible-labs/sdk` is private. The `NEXT_PUBLIC_*` variables are embedded at build time because this app is statically exported.

In the Privy Dashboard, enable Solana wallet login for the app ID. For a production Privy app ID, add the deployed Cloudflare Pages domain under Allowed Origins. Development app IDs can be used for preview domains while testing.

GitHub Pages is also viable because this repository is public, but Cloudflare Pages gives better pull request previews with less project-specific path handling.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:static
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
- [Privy allowed domains](https://docs.privy.io/recipes/dashboard/allowed-domains)
- [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Pages Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare Pages preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Solana Wallet Adapter guide](https://github.com/anza-xyz/wallet-adapter/blob/master/APP.md)
