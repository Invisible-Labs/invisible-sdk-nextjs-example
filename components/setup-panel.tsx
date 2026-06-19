import { AlertTriangle, CheckCircle2, Terminal } from "lucide-react";

import type { PublicEnv } from "@/lib/env";

type SetupPanelProps = {
  env: PublicEnv;
};

export function SetupPanel({ env }: SetupPanelProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex h-11 w-11 items-center justify-center border border-sky-300/40 bg-sky-300/10 text-sky-200">
              <Terminal aria-hidden="true" size={20} />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase text-sky-200">Invisible SDK Example</p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white">
                Configure Privy before running the transfer console.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-300">
                This repo is a devnet preview for a Next.js, Privy, Solana, and Invisible SDK
                integration. It fails closed until the required public env vars are present.
              </p>
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/30">
            <div className="flex items-start gap-3 border-b border-zinc-800 pb-4">
              <AlertTriangle className="mt-0.5 text-amber-300" aria-hidden="true" size={20} />
              <div>
                <h2 className="text-base font-semibold text-white">Missing configuration</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Add these values to `.env.local`. Do not commit real environment files.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {["NEXT_PUBLIC_PRIVY_APP_ID", "NEXT_PUBLIC_INVISIBLE_COORDINATOR_WS_URL"].map(
                (name) => {
                  const missing = env.missing.includes(name);

                  return (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-3 border border-zinc-800 bg-black/30 px-3 py-2 text-sm"
                    >
                      <code className="break-all text-zinc-200">{name}</code>
                      <span
                        className={
                          missing
                            ? "shrink-0 text-amber-300"
                            : "inline-flex shrink-0 items-center gap-1 text-emerald-300"
                        }
                      >
                        {missing ? (
                          "missing"
                        ) : (
                          <>
                            <CheckCircle2 aria-hidden="true" size={14} />
                            set
                          </>
                        )}
                      </span>
                    </li>
                  );
                },
              )}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
