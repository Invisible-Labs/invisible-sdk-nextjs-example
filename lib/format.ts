const LAMPORTS_PER_SOL = 1_000_000_000;

export function solToLamports(value: string): number {
  const normalized = value.trim();

  if (!/^\d+(\.\d{0,9})?$/.test(normalized)) {
    throw new Error("Enter a SOL amount with at most 9 decimal places.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const lamports = Number(whole) * LAMPORTS_PER_SOL + Number(fraction.padEnd(9, "0"));

  if (!Number.isSafeInteger(lamports) || lamports <= 0) {
    throw new Error("Amount must be greater than 0 SOL and fit in a safe integer.");
  }

  return lamports;
}

export function lamportsToSol(lamports: number): string {
  if (!Number.isSafeInteger(lamports) || lamports < 0) {
    return "0";
  }

  const whole = Math.floor(lamports / LAMPORTS_PER_SOL);
  const fraction = String(lamports % LAMPORTS_PER_SOL)
    .padStart(9, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function shortAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
