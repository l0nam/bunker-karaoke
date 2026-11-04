import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isHostAuthenticated } from "@/lib/auth";
import { QueuePanel } from "@/components/host/QueuePanel";
import { Spinner } from "@/components/ui/spinner";

async function ProtectedPanel() {
  await connection();

  if (!(await isHostAuthenticated())) {
    redirect("/host");
  }

  return <QueuePanel />;
}

export default function HostPanelPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center">
          <Spinner className="size-6" />
        </main>
      }
    >
      <ProtectedPanel />
    </Suspense>
  );
}
