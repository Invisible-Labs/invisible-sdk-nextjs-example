"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Send,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

import type { PublicEnv } from "@/lib/env";
import { isReady } from "@/lib/env";
import { lamportsToSol } from "@/lib/format";
import {
  buildSingleDestinationPayoutPolicy,
  startPrivateTransfer,
  type TransferEvent,
  type TransferOutcome,
} from "@/lib/invisible";

type TransferConsoleProps = {
  env: PublicEnv;
};

const sampleDestination = "11111111111111111111111111111111";

export function TransferConsole({ env }: TransferConsoleProps) {
  const [amountSol, setAmountSol] = useState("0.1");
  const [destinationAddress, setDestinationAddress] = useState(sampleDestination);
  const [events, setEvents] = useState<TransferEvent[]>([]);
  const [outcome, setOutcome] = useState<TransferOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configured = isReady(env);
  const coordinatorHost = new URL(env.coordinatorWsUrl).hostname;
  const policyPreview = useMemo(
    () => buildSingleDestinationPayoutPolicy(destinationAddress),
    [destinationAddress],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured || submitting) {
      return;
    }

    setSubmitting(true);
    setOutcome(null);
    setEvents([]);

    const result = await startPrivateTransfer({
      amountSol,
      destinationAddress,
      coordinator: env.coordinator,
      onEvent: (nextEvent) => setEvents((current) => [...current.slice(-7), nextEvent]),
    });

    setOutcome(result);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-5 py-5 lg:grid-cols-[360px_1fr]">
        <aside className="border border-zinc-800 bg-zinc-950 p-5">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center border border-sky-300/40 bg-sky-300/10 text-sky-200">
                <ShieldCheck aria-hidden="true" size={22} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase text-sky-200">Invisible SDK</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-white">
                  Private transfer console
                </h1>
              </div>
              <p className="text-sm leading-6 text-zinc-400">
                Next.js frontend example that starts a user transfer through the installed SDK
                package. No app-specific auth provider is required.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <StatusRow
                icon={<Activity aria-hidden="true" size={16} />}
                label="Network"
                value={env.solanaCluster}
                ok
              />
              <StatusRow
                icon={<LockKeyhole aria-hidden="true" size={16} />}
                label="Coordinator"
                value={configured ? env.invisibleRequiredMode : env.missing.join(", ")}
                ok={configured}
              />
              <StatusRow
                icon={<ShieldCheck aria-hidden="true" size={16} />}
                label="TEE"
                value={coordinatorHost}
                ok={configured}
              />
            </div>
          </div>
        </aside>

        <section className="grid gap-6 lg:grid-rows-[auto_1fr]">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Cluster" value={env.solanaCluster} />
            <Metric label="Coordinator" value={coordinatorHost} />
            <Metric label="Amount" value={`${amountSol || "0"} SOL`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <form className="border border-zinc-800 bg-zinc-950 p-5" onSubmit={onSubmit}>
              <div className="border-b border-zinc-800 pb-5">
                <h2 className="text-xl font-semibold text-white">Start transfer</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  One fresh destination, 100% payout share, instant mode.
                </p>
              </div>

              <div className="mt-5 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-200">Amount</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={amountSol}
                    onChange={(event) => setAmountSol(event.target.value)}
                    placeholder="0.1"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-200">Fresh destination address</span>
                  <input
                    className="input"
                    value={destinationAddress}
                    onChange={(event) => setDestinationAddress(event.target.value)}
                    placeholder={sampleDestination}
                  />
                </label>

                <div className="grid gap-3 border border-zinc-800 bg-black/25 p-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between gap-3">
                    <span>Destination share</span>
                    <span className="font-medium text-white">
                      {policyPreview.destinations[0]?.sharePercent ?? 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>SDK package</span>
                    <code className="text-sky-200">@invisible-labs/sdk</code>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Run mode</span>
                    <span className="font-medium text-white">{env.invisibleRequiredMode}</span>
                  </div>
                </div>

                {!configured ? (
                  <Notice tone="warn">
                    Missing coordinator config: {env.missing.join(", ")}. The form stays disabled.
                  </Notice>
                ) : null}

                <button className="button-primary h-12" type="submit" disabled={!configured || submitting}>
                  {submitting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" size={17} />
                  ) : (
                    <Send aria-hidden="true" size={17} />
                  )}
                  Start with SDK
                </button>
              </div>
            </form>

            <div className="grid gap-6">
              <div className="border border-zinc-800 bg-zinc-950 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound className="text-emerald-300" aria-hidden="true" size={18} />
                  <h2 className="text-base font-semibold text-white">Recovery posture</h2>
                </div>
                <p className="text-sm leading-6 text-zinc-400">
                  The SDK may generate a Recovery Code locally. This sample records only that a
                  code was generated; it does not log, persist, or render the secret.
                </p>
              </div>

              <div className="border border-zinc-800 bg-zinc-950 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="text-sky-200" aria-hidden="true" size={18} />
                  <h2 className="text-base font-semibold text-white">Session events</h2>
                </div>
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-zinc-500">No SDK events yet.</p>
                  ) : (
                    events.map((event, index) => <EventLine event={event} key={`${event.kind}-${index}`} />)
                  )}
                </div>
              </div>

              {outcome ? <OutcomePanel outcome={outcome} /> : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-zinc-800 bg-black/25 px-3 py-2">
      <span className="inline-flex min-w-0 items-center gap-2 text-zinc-400">
        {icon}
        {label}
      </span>
      <span className={ok ? "truncate text-emerald-300" : "truncate text-amber-300"}>{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "ok" }) {
  return (
    <div
      className={
        tone === "warn"
          ? "flex items-start gap-2 border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100"
          : "flex items-start gap-2 border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-100"
      }
    >
      {tone === "warn" ? (
        <AlertTriangle className="mt-1 shrink-0" aria-hidden="true" size={16} />
      ) : (
        <CheckCircle2 className="mt-1 shrink-0" aria-hidden="true" size={16} />
      )}
      <span>{children}</span>
    </div>
  );
}

function EventLine({ event }: { event: TransferEvent }) {
  if (event.kind === "deposit") {
    return (
      <div className="border border-zinc-800 bg-black/25 p-3 text-sm">
        <p className="font-medium text-white">Deposit public key received</p>
        <p className="mt-1 break-all text-zinc-400">{event.depositPublicKeyHex}</p>
        <p className="mt-1 text-zinc-500">{lamportsToSol(event.amountLamports)} SOL expected</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 bg-black/25 p-3 text-sm text-zinc-300">{event.message}</div>
  );
}

function OutcomePanel({ outcome }: { outcome: TransferOutcome }) {
  if (outcome.kind === "completed") {
    return (
      <div className="border border-emerald-300/30 bg-emerald-300/10 p-5">
        <div className="flex items-center gap-2 text-emerald-100">
          <CheckCircle2 aria-hidden="true" size={18} />
          <h2 className="text-base font-semibold">SDK flow completed</h2>
        </div>
        <p className="mt-2 break-all text-sm text-emerald-100/80">Swap id: {outcome.swapId}</p>
      </div>
    );
  }

  if (outcome.kind === "preview-only") {
    return (
      <div className="border border-sky-300/30 bg-sky-300/10 p-5">
        <div className="flex items-center gap-2 text-sky-100">
          <ShieldCheck aria-hidden="true" size={18} />
          <h2 className="text-base font-semibold">Preview-only SDK state</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-sky-100/80">{outcome.message}</p>
      </div>
    );
  }

  return (
    <div className="border border-red-300/30 bg-red-300/10 p-5">
      <div className="flex items-center gap-2 text-red-100">
        <AlertTriangle aria-hidden="true" size={18} />
        <h2 className="text-base font-semibold">Transfer did not start</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-red-100/80">{outcome.message}</p>
    </div>
  );
}
