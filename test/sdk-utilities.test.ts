import { describe, expect, it } from "vitest";
import { runLocalSdkUtilityCheck } from "../src/invisible-client";
import { sdkSurfaceCoverage as runtimeCoverage } from "../src/sdk-runtime";

describe("SDK utility coverage", () => {
  it("runs local storage, recovery code, and refundable derivation helpers", async () => {
    await expect(runLocalSdkUtilityCheck()).resolves.toMatchObject({
      storageKind: "memory",
      storedByteLength: 3,
      refundableLamports: 1_995_000,
    });
  });

  it("keeps user and LP SDK runtime coverage typechecked", () => {
    expect(Object.keys(runtimeCoverage.user)).toContain("createCoordinatorSession");
    expect(Object.keys(runtimeCoverage.lp)).toContain("createLpLifecycleClient");
  });
});
