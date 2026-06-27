"use client";

import { useMemo, useState } from "react";
import { loadCoordinatorPool, mutationsEnabled } from "./config";
import {
  openAttestedSession,
  runLocalSdkUtilityCheck,
  sdkErrorCode,
  sdkSurfaceCoverage,
} from "./invisible-client";

const MUTATION_DISABLED_MESSAGE =
  "Live SDK mutations are disabled. Set NEXT_PUBLIC_ENABLE_MUTATIONS=true.";
const DEFAULT_LAMPORTS = "1000000";

type InstantPayoutSpec = {
  readonly mode: "instant";
  readonly destination_address: string;
};

export function SdkExamplePanel() {
  const [destination, setDestination] = useState("");
  const [amountLamports, setAmountLamports] = useState(DEFAULT_LAMPORTS);
  const [swapId, setSwapId] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [output, setOutput] = useState("Idle");
  const coordinatorPool = useMemo(() => loadCoordinatorPool(), []);
  const liveMutationsEnabled = mutationsEnabled();

  async function run(label: string, action: () => Promise<unknown>) {
    setOutput(`${label}...`);
    try {
      const result = await action();
      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setOutput(sdkErrorCode(error));
    }
  }

  return (
    <section className="panel">
      <div>
        <p className="eyebrow">Invisible SDK</p>
        <h1>Next.js example</h1>
      </div>

      <div className="grid">
        <button type="button" onClick={() => run("SDK utilities", runLocalSdkUtilityCheck)}>
          Check SDK utilities
        </button>
        <button
          type="button"
          onClick={() =>
            run("Attestation", async () => {
              const handle = await openAttestedSession(coordinatorPool);
              handle.close();
              return { ok: true };
            })
          }
        >
          Open attested session
        </button>
      </div>

      <div className="form">
        <input
          aria-label="Amount lamports"
          value={amountLamports}
          onChange={(event) => setAmountLamports(event.target.value)}
          placeholder="Lamports"
        />
        <input
          aria-label="Destination address"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Destination address"
        />
        <button
          type="button"
          onClick={() =>
            run("Private transfer", async () => {
              if (!liveMutationsEnabled) throw new Error(MUTATION_DISABLED_MESSAGE);
              const payoutSpec: InstantPayoutSpec = {
                mode: "instant",
                destination_address: destination,
              };
              return { amountLamports: Number(amountLamports), payoutSpec };
            })
          }
        >
          Start private transfer
        </button>
      </div>

      <div className="form">
        <input
          aria-label="Swap id"
          value={swapId}
          onChange={(event) => setSwapId(event.target.value)}
          placeholder="Swap id"
        />
        <input
          aria-label="Recovery code"
          value={recoveryCode}
          onChange={(event) => setRecoveryCode(event.target.value)}
          placeholder="Recovery code hex"
        />
        <button
          type="button"
          onClick={() =>
            run("Refund", async () => {
              if (!liveMutationsEnabled) throw new Error(MUTATION_DISABLED_MESSAGE);
              return { swapId, recoveryCode };
            })
          }
        >
          Request refund
        </button>
      </div>

      <pre>{output}</pre>
      <p className="coverage">{Object.keys(sdkSurfaceCoverage).join(" / ")}</p>
    </section>
  );
}
