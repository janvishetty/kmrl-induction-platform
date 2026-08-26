import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StateBlock } from "@/components/common/StateBlock";
import { InductionList } from "@/components/trainsets/InductionList";
import { useApp } from "@/context/AppContext";
import { usePlan } from "@/lib/hooks";
import { todayIST } from "@/lib/datetime";
import { Radio } from "lucide-react";

export default function TrainPlan() {
  const { lang } = useApp();
  const isMalayalam = lang === "ml" || lang?.toLowerCase()?.includes("malayalam");

  // Inventory uses live baseline status (today's active registry)
  const planQ = usePlan(todayIST());
  const plan = useMemo(() => planQ.data || [], [planQ.data]);

  return (
    <AppShell>
      <PageHeader
        title={isMalayalam ? "ഫ്ലീറ്റ് മാസ്റ്റർ ഇൻവെന്ററി" : "Fleet Master Inventory"}
        subtitle={isMalayalam ? "എല്ലാ കെ.എം.ആർ.എൽ ട്രെയിൻസെറ്റുകളുടെയും തത്സമയ കംപ്ലയൻസ് രജിസ്ട്രി" : "Complete baseline health registry and real-time compliance status across all trainsets"}
        action={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-sm">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-foreground">
              {isMalayalam ? "ലൈവ് ടെലിമെട്രി സിങ്ക്" : "Live Telemetry Sync"}
            </span>
          </div>
        }
      />

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground md:text-lg">
          {isMalayalam ? " മാസ്റ്റർ അസറ്റ് രജിസ്ട്രി (25 യൂണിറ്റുകൾ)" : "Master Asset Registry (25 Units)"}
        </h2>
        {!planQ.isLoading && !planQ.isError && plan.length ? (
          <span className="font-mono text-xs text-muted-foreground">
            {plan.length} {isMalayalam ? "ട്രെയിൻസെറ്റുകൾ" : "trainsets"}
          </span>
        ) : null}
      </div>

      {planQ.isLoading ? (
        <StateBlock label={isMalayalam ? "ഫ്ലീറ്റ് ഇൻവെന്ററി ലോഡ് ചെയ്യുന്നു..." : "Loading fleet master inventory..."} />
      ) : planQ.isError ? (
        <StateBlock label={isMalayalam ? "ഫ്ലീറ്റ് ഡാറ്റ ലോഡ് ചെയ്യുന്നതിൽ പിശക്" : "Error loading fleet data"} tone="error" />
      ) : !plan.length ? (
        <StateBlock label={isMalayalam ? "ട്രെയിനുകൾ ലഭ്യമല്ല." : "No trainsets found."} />
      ) : (
        <InductionList plan={plan} />
      )}
    </AppShell>
  );
}