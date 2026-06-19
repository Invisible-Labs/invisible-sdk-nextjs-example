# Contributing

Keep changes small and verifiable.

Before opening a PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run audit:high
```

Rules:

- Do not commit `.env*` files except `.env.example`.
- Do not log secrets or recovery material.
- Do not add production endpoints as defaults.
- Prefer Solana Standard Wallet compatibility before legacy wallet adapters.
- Keep SDK behavior honest. Do not fake successful coordinator execution.
