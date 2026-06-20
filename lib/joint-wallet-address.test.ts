import { describe, expect, it } from "vitest";

import { jointPubkeyToSolanaAddress } from "@/lib/joint-wallet-address";

describe("jointPubkeyToSolanaAddress", () => {
  it("returns a deterministic Solana address for a 32-byte Ed25519 public key", async () => {
    const publicKey = new Uint8Array(32).fill(1);

    await expect(jointPubkeyToSolanaAddress(publicKey)).resolves.toMatch(
      /^[1-9A-HJ-NP-Za-km-z]+$/,
    );
    await expect(jointPubkeyToSolanaAddress(publicKey)).resolves.toBe(
      await jointPubkeyToSolanaAddress(publicKey),
    );
  });

  it("rejects invalid public key byte lengths", async () => {
    await expect(jointPubkeyToSolanaAddress(new Uint8Array(16))).rejects.toThrow("32 bytes");
  });
});
