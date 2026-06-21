Always verify package and framework behavior against local installed docs or official docs before changing this repo.

Rules:

- Do not commit secrets, `.env.local`, private keys, Recovery Codes, FROST shares, nonces, raw transaction bytes, signatures, or decrypted payloads.
- Use `@invisible-labs/sdk` as the currently published SDK package. Do not fake successful coordinator execution.
- Keep this example free of app-id gated auth providers unless a feature requires them.
- Keep the first screen as the usable transfer console, not a marketing page.
- Keep the UI sparse: show only the minimum private-transfer and LP inputs, amounts, and actions. Do not add DKG progress, coordinator state timelines, or recovery event feeds unless the SDK surface requires them.
- Do not vertically center tabbed content whose height changes between modes. Anchor the console near the top or reserve a stable minimum height so switching tabs does not move the whole UI.
- In the private-transfer example, stop the primary loading state as soon as the SDK emits the fundable deposit address. Do not keep the button loading while `runSwap()` waits for `DepositConfirmed`; that is a separate user funding step.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run audit:high` before opening a PR.

Next.js note: this project uses the installed Next docs in `node_modules/next/dist/docs/`. Read the relevant local guide before changing routing, env, CSS, or build behavior.
