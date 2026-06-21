import { getAddressFromPublicKey, type Address } from "@solana/kit";

export async function jointPubkeyToSolanaAddress(
  jointPublicKeyBytes: Uint8Array,
): Promise<Address> {
  if (jointPublicKeyBytes.byteLength !== 32) {
    throw new Error(`joint public key must be 32 bytes, got ${jointPublicKeyBytes.byteLength}`);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(jointPublicKeyBytes),
    "Ed25519",
    true,
    ["verify"],
  );

  return getAddressFromPublicKey(cryptoKey);
}
