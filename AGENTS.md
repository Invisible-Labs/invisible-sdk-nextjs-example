Always verify package and framework behavior against local installed docs or official docs before changing this repo.

Rules:

- Do not commit secrets, `.env.local`, private keys, Recovery Codes, FROST shares, nonces, raw transaction bytes, signatures, or decrypted payloads.
- Use `@invisible-labs/sdk` as the currently published SDK package. Do not fake successful coordinator execution.
- Keep this example free of app-id gated auth providers unless a feature requires them.
- Keep the first screen as the usable transfer console, not a marketing page.
- Keep the UI sparse: show only the minimum private-transfer and LP inputs, amounts, and actions. Do not add DKG progress, coordinator state timelines, or recovery event feeds unless the SDK surface requires them.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run audit:high` before opening a PR.

Next.js note: this project uses the installed Next docs in `node_modules/next/dist/docs/`. Read the relevant local guide before changing routing, env, CSS, or build behavior.
