import { SetupPanel } from "@/components/setup-panel";
import { TransferConsole } from "@/components/transfer-console";
import { readPublicEnv } from "@/lib/env";

import { AppProviders } from "./providers";

export default function Home() {
  const env = readPublicEnv();

  if (!env.privyAppId) {
    return <SetupPanel env={env} />;
  }

  return (
    <AppProviders privyAppId={env.privyAppId}>
      <TransferConsole env={env} />
    </AppProviders>
  );
}
