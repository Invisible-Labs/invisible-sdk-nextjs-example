# Invisible SDK Next.js Example

Next.js browser example for `@invisible-labs/sdk`.

It demonstrates the current SDK basics:

- attested session open, re-attestation, close
- normal-user private transfer, status restore, refund intent
- LP lifecycle entrypoints: create, recover, DKG, funding, refill, withdraw
- browser storage, recovery-code helpers, derived refundable amount
- coordinator-pending surfaces are imported and kept explicit

## Install

The SDK is currently private on GitHub Packages.

```bash
export NODE_AUTH_TOKEN=<github-token-with-read:packages>
npm ci
```

If npm is not already configured for GitHub Packages:

```bash
npm config set //npm.pkg.github.com/:_authToken "$NODE_AUTH_TOKEN"
```

## Run

```bash
cp .env.example .env
npm run dev
```

The UI starts with local SDK utility checks. Live mutations are blocked unless
`NEXT_PUBLIC_ENABLE_MUTATIONS=true`.

`src/sdk-runtime.ts` imports the full user and LP SDK surface and is covered by
typecheck/tests. It is intentionally kept out of the browser bundle because
`@invisible-labs/sdk@0.1.0-dev.24.1` still exposes a `frost_bg.wasm` URL that
Next/Turbopack tries to resolve even though the WASM bytes are inlined.

## Validate

```bash
npm run typecheck
npm run build
npm test
```
