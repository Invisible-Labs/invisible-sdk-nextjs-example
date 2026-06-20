# Invisible SDK Next.js Example

Open-source consumer example for integrating the Invisible SDK in a browser app:
Next.js, React, TypeScript, Tailwind CSS, and `@invisible-labs/sdk`.

Status: preview. Do not use with production funds.

## What This Shows

- A minimal client-side private-transfer flow.
- A minimal LP onboarding view.
- Public Invisible coordinator configuration for the Azure TEE endpoint.
- Normal-user private transfer through the installed SDK package.
- Honest handling for SDK surfaces that still report preview or not-implemented behavior.

The UI intentionally hides DKG progress, coordinator state timelines, and internal recovery events.
Invisible also uses this SDK in its own frontend. Visit [app.invisible.exchange](https://app.invisible.exchange) for the complete, more advanced product UI.
The private-transfer action resolves when the SDK returns a fundable deposit address; it does not wait for on-chain deposit confirmation.
If the configured coordinator is still on an older wire contract, this preview can fail before the deposit address is created. Once the matching coordinator and wire-contract rollout is live, the SDK package and coordinator will speak the same message names and payload shapes.

Minimums shown by the example:

```txt
Private transfer: 0.4 SOL
LP initial funding: 0.101 SOL to LP_DKG_0
LP default shards: 200
```

## Current SDK Package

This repo uses the private GitHub Packages build:

```txt
@invisible-labs/sdk@0.0.1
```

Some Invisible docs refer to the target public package name `@invisible/sdk`. This example uses the package that is actually published today.

## Requirements

- Node.js 24 or newer.
- npm.
- A GitHub Packages token with access to `@invisible-labs/sdk` while the SDK is private.

## Setup

```bash
cp .env.example .env.local
export NPM_TOKEN=github_packages_token_with_read_access
npm ci
npm run dev
```

Open `http://localhost:3000`.

Default public browser config:

```txt
NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL=wss://tee-azure.invisible.exchange/ws-noise
NEXT_PUBLIC_INVISIBLE_REQUIRED_MODE=prod
```

`NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL` is public by design. The app also ships the current public Azure MRTD and MAA pins from the SDK release context; override the matching `NEXT_PUBLIC_INVISIBLE_*` pin values when the release pin rotates.

## Deployment

Cloudflare Pages settings:

```txt
Framework preset: Next.js (Static HTML Export)
Build command: npm run build
Build output directory: out
Node version: 24
```

Environment variables:

```txt
NPM_TOKEN=github_packages_token_with_read_access
```

`NPM_TOKEN` is needed only while `@invisible-labs/sdk` is private. The `NEXT_PUBLIC_*` variables are embedded at build time because this app is statically exported.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:static
npm run audit:high
```

`npm run audit:high` is the CI security gate.

## Privacy And Safety Boundaries

- This sample does not log, persist, or render Recovery Codes.
- It does not log private keys, FROST shares, nonces, raw transaction bytes, signatures, or decrypted payloads.
- The visible entry point is the user deposit into an SDK-created joint wallet. The unlinkable exit is the fresh destination payout path enforced by the coordinator policy. This repo does not claim stronger guarantees than the SDK and protocol provide.
- Production use requires a coordinator that emits the collateral and attestation evidence required by the SDK.

## Useful References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/guides/nextjs)
- [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Pages Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare Pages preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
