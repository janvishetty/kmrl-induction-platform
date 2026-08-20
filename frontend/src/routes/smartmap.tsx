import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";

const SmartMapView = lazy(() => import("@/components/kmrl/SmartMapView"));

export const Route = createFileRoute("/smartmap")({
  head: () => ({
    meta: [
      { title: "Kochi Metro SmartMap · KMRL Operations" },
      {
        name: "description",
        content:
          "Live interactive map of the Aluva–Petta Kochi Metro corridor with trainsets, maintenance sites and operational alerts.",
      },
      { property: "og:title", content: "Kochi Metro SmartMap · KMRL Operations" },
      {
        property: "og:description",
        content: "Track stations, trainsets, IBL maintenance and alerts across the Kochi Metro corridor.",
      },
    ],
  }),
  component: SmartMapPage,
});

function SmartMapPage() {
  const [mounted, setMounted] = useState(false);
  const { askKoraAbout } = useApp();
  useEffect(() => setMounted(true), []);

  return (
    <AppShell>
      <PageHeader
        tag="Live network"
        title="Kochi Metro SmartMap"
        subtitle="Aluva → Petta corridor with live trainset positions, IBL maintenance works and operational alerts. Click any object for its operational record, or ask KORA to highlight it."
        action={
          <button
            onClick={() => askKoraAbout("Where are the current operational issues?")}
            className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            Ask KORA about the network
          </button>
        }
      />
      {mounted ? (
        <Suspense
          fallback={
            <div className="grid h-[68vh] min-h-[520px] place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
              Loading corridor map…
            </div>
          }
        >
          <SmartMapView />
        </Suspense>
      ) : (
        <div className="grid h-[68vh] min-h-[520px] place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
          Initialising map…
        </div>
      )}
    </AppShell>
  );
}
