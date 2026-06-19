# Security

Report vulnerabilities privately to the Invisible Labs maintainers.

Do not open public issues containing:

- private keys
- API tokens
- Recovery Codes
- FROST shares
- nonces
- raw transaction bytes
- pre-broadcast signatures
- decrypted coordinator payloads

This example is preview software. Do not use it with production funds.

## Dependency Posture

CI runs `npm run audit:high`. Moderate advisories from upstream dependencies are tracked in the README and should be revisited when those packages publish fixes.
