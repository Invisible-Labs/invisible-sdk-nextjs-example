import { describe, expect, it } from "vitest";

import { lamportsToSol, shortAddress, solToLamports } from "@/lib/format";

describe("SOL amount formatting", () => {
  it("converts decimal SOL to lamports without floating point drift", () => {
    expect(solToLamports("0.000000001")).toBe(1);
    expect(solToLamports("1.25")).toBe(1_250_000_000);
  });

  it("rejects invalid or over-precise amounts", () => {
    expect(() => solToLamports("0")).toThrow("greater than 0");
    expect(() => solToLamports("1.0000000001")).toThrow("at most 9 decimal");
    expect(() => solToLamports("abc")).toThrow("at most 9 decimal");
  });

  it("formats lamports back to SOL text", () => {
    expect(lamportsToSol(1_250_000_000)).toBe("1.25");
  });
});

describe("shortAddress", () => {
  it("keeps short values readable", () => {
    expect(shortAddress("abc")).toBe("abc");
    expect(shortAddress("11111111111111111111111111111111")).toBe("1111...1111");
  });
});
