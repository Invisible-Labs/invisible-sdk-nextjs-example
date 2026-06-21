"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  WalletCards,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

import type { PublicEnv } from "@/lib/env";
import { isReady } from "@/lib/env";
import { lamportsToSol, solToLamports } from "@/lib/format";
import {
  buildSingleDestinationPayoutPolicy,
  LP_DEFAULT_TARGET_SHARDS,
  type LpAction,
  type LpPositionSnapshot,
  MIN_LP_INITIAL_FUNDING_LAMPORTS,
  MIN_PRIVATE_TRANSFER_LAMPORTS,
  runLpAction,
  startPrivateTransfer,
  type ConsoleOutcome,
} from "@/lib/invisible";

type TransferConsoleProps = {
  env: PublicEnv;
};

type Mode = "transfer" | "lp";

const sampleDestination = "11111111111111111111111111111111";
const LP_ACTIONS: ReadonlyArray<{
  action: LpAction;
  label: string;
  icon: typeof Plus;
  needsCode: boolean;
  needsDestination?: boolean;
}> = [
  { action: "create", label: "Create", icon: Plus, needsCode: false },
  { action: "recover", label: "Recover", icon: RefreshCw, needsCode: true },
  { action: "complete-dkg", label: "DKG", icon: ShieldCheck, needsCode: true },
  { action: "prepare-funding", label: "Funding", icon: WalletCards, needsCode: true },
  { action: "reconcile-funding", label: "Reconcile", icon: RefreshCw, needsCode: true },
  { action: "refill", label: "Refill", icon: Download, needsCode: true },
  { action: "withdraw", label: "Withdraw", icon: Upload, needsCode: true, needsDestination: true },
];

export function TransferConsole({ env }: TransferConsoleProps) {
  const [mode, setMode] = useState<Mode>("transfer");
  const [amountSol, setAmountSol] = useState(lamportsToSol(MIN_PRIVATE_TRANSFER_LAMPORTS));
  const [destinationAddress, setDestinationAddress] = useState(sampleDestination);
  const [lpPositionCode, setLpPositionCode] = useState("");
  const [lpDestinationAddress, setLpDestinationAddress] = useState(sampleDestination);
  const [lpPosition, setLpPosition] = useState<LpPositionSnapshot | null>(null);
  const [outcome, setOutcome] = useState<ConsoleOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lpSubmittingAction, setLpSubmittingAction] = useState<LpAction | null>(null);

  const configured = isReady(env);
  const coordinatorHost = useMemo(() => {
    try {
      return new URL(env.coordinatorWsUrl).hostname;
    } catch {
      return "unconfigured";
    }
  }, [env.coordinatorWsUrl]);
  const minTransferSol = lamportsToSol(MIN_PRIVATE_TRANSFER_LAMPORTS);
  const minLpFundingSol = lamportsToSol(MIN_LP_INITIAL_FUNDING_LAMPORTS);
  const policyPreview = useMemo(
    () => buildSingleDestinationPayoutPolicy(destinationAddress),
    [destinationAddress],
  );
  const amountMeetsMinimum = useMemo(() => {
    try {
      return solToLamports(amountSol) >= MIN_PRIVATE_TRANSFER_LAMPORTS;
    } catch {
      return false;
    }
  }, [amountSol]);
  const canSubmit =
    configured && amountMeetsMinimum && destinationAddress.trim().length > 0 && !submitting;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured || submitting) {
      return;
    }

    setSubmitting(true);
    setOutcome(null);

    const result = await startPrivateTransfer({
      amountSol,
      destinationAddress,
      coordinator: env.coordinator,
    });

    setOutcome(result);
    setSubmitting(false);
  }

  async function onLpAction(action: LpAction) {
    if (!configured || submitting) {
      return;
    }

    setSubmitting(true);
    setLpSubmittingAction(action);
    setOutcome(null);

    const result = await runLpAction({
      action,
      coordinator: env.coordinator,
      positionCode: lpPositionCode,
      destinationAddress: lpDestinationAddress,
    });

    if (result.kind === "lp-position" || result.kind === "lp-funding" || result.kind === "lp-withdrawal") {
      setLpPosition(result.position);
    }
    if (result.kind === "lp-position" && result.lpPositionCode) {
      setLpPositionCode(result.lpPositionCode);
    }

    setOutcome(result);
    setLpSubmittingAction(null);
    setSubmitting(false);
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setOutcome(null);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-16 sm:py-24">
        <header className="mb-10 flex items-center justify-between gap-4 text-xs font-medium uppercase text-muted">
          <span>Invisible SDK</span>
          <span className={configured ? "text-success" : "text-warning"}>
            {configured ? `${env.invisibleRequiredMode} / ${coordinatorHost}` : "missing config"}
          </span>
        </header>

        <div className="space-y-8">
          <div className="inline-flex border border-border p-1" data-tabs>
            <ModeButton active={mode === "transfer"} onClick={() => selectMode("transfer")}>
              Private transfer
            </ModeButton>
            <ModeButton active={mode === "lp"} onClick={() => selectMode("lp")}>
              LP
            </ModeButton>
          </div>

          {mode === "transfer" ? (
            <form className="border-t border-border pt-6" onSubmit={onSubmit}>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Private transfer</h1>
                  <p className="mt-2 text-sm text-muted">Minimum {minTransferSol} SOL.</p>
                </div>
                <ShieldCheck className="mt-1 text-accent" aria-hidden="true" size={20} />
              </div>

              <div className="mt-8 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Amount</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={amountSol}
                    onChange={(event) => setAmountSol(event.target.value)}
                    placeholder={minTransferSol}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Fresh destination</span>
                  <input
                    className="input font-mono text-sm"
                    value={destinationAddress}
                    onChange={(event) => setDestinationAddress(event.target.value)}
                    placeholder={sampleDestination}
                  />
                </label>

                <div className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
                  <Fact label="Mode" value="instant" />
                  <Fact
                    label="Share"
                    value={`${policyPreview.destinations[0]?.sharePercent ?? 0}%`}
                  />
                </div>

                {!configured ? (
                  <Notice tone="warn">Missing config: {env.missing.join(", ")}.</Notice>
                ) : null}

                {configured && !amountMeetsMinimum ? (
                  <Notice tone="warn">Minimum transfer amount is {minTransferSol} SOL.</Notice>
                ) : null}

                <button className="button-primary h-12 w-full" type="submit" disabled={!canSubmit}>
                  {submitting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" size={17} />
                  ) : (
                    <Send aria-hidden="true" size={17} />
                  )}
                  Create deposit address
                </button>
              </div>
            </form>
          ) : (
            <section className="border-t border-border pt-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-semibold text-white">LP</h1>
                  <p className="mt-2 text-sm text-muted">Minimum {minLpFundingSol} SOL to LP_DKG_0.</p>
                </div>
                <WalletCards className="mt-1 text-accent" aria-hidden="true" size={20} />
              </div>

              <div className="mt-8 grid gap-4 border-y border-border py-5 sm:grid-cols-3">
                <Fact label="Initial funding" value={`${minLpFundingSol} SOL`} />
                <Fact label="Fund" value="LP_DKG_0" />
                <Fact label="Default shards" value={String(LP_DEFAULT_TARGET_SHARDS)} />
              </div>

              <div className="mt-8 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">LP Position Code</span>
                  <textarea
                    className="input min-h-24 resize-y font-mono text-xs leading-5"
                    value={lpPositionCode}
                    onChange={(event) => setLpPositionCode(event.target.value)}
                    placeholder="Create or paste an LP Position Code"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Withdrawal destination</span>
                  <input
                    className="input font-mono text-sm"
                    value={lpDestinationAddress}
                    onChange={(event) => setLpDestinationAddress(event.target.value)}
                    placeholder={sampleDestination}
                  />
                </label>

                {lpPosition ? <LpPositionFacts position={lpPosition} /> : null}

                {!configured ? (
                  <Notice tone="warn">Missing config: {env.missing.join(", ")}.</Notice>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {LP_ACTIONS.map(({ action, label, icon: Icon, needsCode, needsDestination }) => {
                    const disabled =
                      !configured ||
                      submitting ||
                      (needsCode && lpPositionCode.trim().length === 0) ||
                      (needsDestination === true && lpDestinationAddress.trim().length === 0);

                    return (
                      <button
                        className="button-secondary h-11 justify-center"
                        disabled={disabled}
                        key={action}
                        type="button"
                        onClick={() => void onLpAction(action)}
                      >
                        {lpSubmittingAction === action ? (
                          <Loader2 className="animate-spin" aria-hidden="true" size={16} />
                        ) : (
                          <Icon aria-hidden="true" size={16} />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {outcome ? <OutcomePanel outcome={outcome} /> : null}

          <p className="border-t border-border pt-5 text-sm leading-6 text-muted">
            Invisible uses this SDK in its own frontend too. For the complete product UI, visit{" "}
            <a
              className="text-foreground underline underline-offset-4 hover:text-accent-strong"
              href="https://app.invisible.exchange"
              rel="noreferrer"
              target="_blank"
            >
              app.invisible.exchange
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "bg-foreground px-3 py-2 text-sm font-medium text-background"
          : "px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
      }
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "ok" }) {
  return (
    <div
      className={
        tone === "warn"
          ? "mt-5 flex items-start gap-2 border border-warning/40 bg-warning/10 p-3 text-sm leading-6 text-warning"
          : "mt-5 flex items-start gap-2 border border-success/35 bg-success/10 p-3 text-sm leading-6 text-success"
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

function LpPositionFacts({ position }: { position: LpPositionSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm sm:grid-cols-4">
      <Fact label="Status" value={position.status} />
      <Fact label="Shards" value={`${position.shardCount}/${position.targetShardCount}`} />
      <Fact label="Available" value={String(position.availableShardCount)} />
      <Fact label="Queued" value={String(position.fundingQueuedShardCount)} />
    </div>
  );
}

function OutcomePanel({ outcome }: { outcome: ConsoleOutcome }) {
  if (outcome.kind === "deposit-ready") {
    return (
      <div className="border border-success/35 bg-success/10 p-4 text-sm text-success">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 aria-hidden="true" size={17} />
          Deposit address ready
        </div>
        <p className="mt-3 text-success/80">
          Send exactly {lamportsToSol(outcome.amountLamports)} SOL to:
        </p>
        <p className="mt-2 break-all font-mono text-foreground">{outcome.depositAddress}</p>
      </div>
    );
  }

  if (outcome.kind === "completed") {
    return (
      <div className="border border-success/35 bg-success/10 p-4 text-sm text-success">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 aria-hidden="true" size={17} />
          Transfer started
        </div>
        <p className="mt-2 break-all">Swap id: {outcome.swapId}</p>
      </div>
    );
  }

  if (outcome.kind === "lp-position") {
    return (
      <div className="border border-success/35 bg-success/10 p-4 text-sm text-success">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 aria-hidden="true" size={17} />
          LP position updated
        </div>
        <p className="mt-2 leading-6">{outcome.message}</p>
        <p className="mt-2 break-all font-mono text-foreground">{outcome.position.id}</p>
        {outcome.lpPositionCode ? (
          <p className="mt-3 break-all font-mono text-xs leading-5 text-foreground">
            {outcome.lpPositionCode}
          </p>
        ) : null}
      </div>
    );
  }

  if (outcome.kind === "lp-funding") {
    return (
      <div className="border border-success/35 bg-success/10 p-4 text-sm text-success">
        <div className="flex items-center gap-2 font-medium">
          <WalletCards aria-hidden="true" size={17} />
          LP_DKG_0 funding ready
        </div>
        <p className="mt-3 text-success/80">
          Send exactly {lamportsToSol(outcome.requiredLamports)} SOL to:
        </p>
        <p className="mt-2 break-all font-mono text-foreground">{outcome.address}</p>
      </div>
    );
  }

  if (outcome.kind === "lp-withdrawal") {
    return (
      <div className="border border-success/35 bg-success/10 p-4 text-sm text-success">
        <div className="flex items-center gap-2 font-medium">
          <Upload aria-hidden="true" size={17} />
          LP withdrawal requested
        </div>
        <p className="mt-2 break-all">Withdrawal id: {outcome.withdrawalId}</p>
        {outcome.txSignatures.length > 0 ? (
          <p className="mt-2 break-all font-mono text-xs text-foreground">
            {outcome.txSignatures.join(", ")}
          </p>
        ) : null}
      </div>
    );
  }

  if (outcome.kind === "lp-failed") {
    return (
      <div className="border border-danger/35 bg-danger/10 p-4 text-sm text-danger">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle aria-hidden="true" size={17} />
          LP action failed
        </div>
        <p className="mt-2 leading-6">{outcome.message}</p>
      </div>
    );
  }

  return (
    <div className="border border-danger/35 bg-danger/10 p-4 text-sm text-danger">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle aria-hidden="true" size={17} />
        Transfer did not start
      </div>
      <p className="mt-2 leading-6">{outcome.message}</p>
    </div>
  );
}
