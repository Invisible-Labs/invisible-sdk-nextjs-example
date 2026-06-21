import { TransferConsole } from "@/components/transfer-console";
import { readPublicEnv } from "@/lib/env";

export default function Home() {
  const env = readPublicEnv();

  return <TransferConsole env={env} />;
}
