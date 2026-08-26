import { useMemo, useState } from "react";
import { FileText, TrainFront, CirclePause, Wrench } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { DateSwitch } from "@/components/common/DateSwitch";
import { StateBlock } from "@/components/common/StateBlock";
import { InductionList } from "@/components/trainsets/InductionList";
import { useApp } from "@/context/AppContext";
import { usePlan, useDocuments } from "@/lib/hooks";
import { todayIST, tomorrowIST, formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const DASH = "\u2014";

function KpiCard({ icon: Icon, label, value, tone }) {
  const toneText = { primary: "text-primary", service: "text-success", standby: "text-warning", ibl: "text-destructive" }[tone];
  const toneChip = {
    primary: "bg-primary/10 text-primary",
    service: "bg-success/10 text-success",
    standby: "bg-warning/10 text-warning",
    ibl: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="card-elevated flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="mono-label">{label}</span>
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", toneChip)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <span className={cn("mt-3 font-display text-3xl font-bold tabular-nums sm:text-4xl", toneText)}>{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useApp();
  const [mode, setMode] = useState("today");
  const selectedDate = mode === "tomorrow" ? tomorrowIST() : todayIST();

  const planQ = usePlan(selectedDate);
  const docsQ = useDocuments();

  const plan = useMemo(() => planQ.data || [], [planQ.data]);
  const counts = useMemo(() => {
    if (!plan.length) return null;
    return {
      SERVICE: plan.filter((p) => p.status === "SERVICE").length,
      STANDBY: plan.filter((p) => p.status === "STANDBY").length,
      IBL: plan.filter((p) => p.status === "IBL").length,
    };
  }, [plan]);

  const loading = planQ.isLoading;
  const errored = planQ.isError;
  const kpi = (k) => (loading || errored || !counts ? DASH : counts[k]);
  const docCount = docsQ.isLoading || docsQ.isError ? DASH : docsQ.data ? docsQ.data.length : DASH;
  const planTitle = mode === "tomorrow" ? t("tomorrows_plan") : t("todays_plan");

  return (
    <AppShell>
      <PageHeader title={t("nav_dashboard")} subtitle={t("appSub")} action={<DateSwitch mode={mode} onMode={setMode} />} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={FileText} label={t("kpi_documents")} value={docCount} tone="primary" />
        <KpiCard icon={TrainFront} label={t("kpi_service")} value={kpi("SERVICE")} tone="service" />
        <KpiCard icon={CirclePause} label={t("kpi_standby")} value={kpi("STANDBY")} tone="standby" />
        <KpiCard icon={Wrench} label={t("kpi_ibl")} value={kpi("IBL")} tone="ibl" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground md:text-lg">{planTitle}</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(selectedDate)}
            {!loading && !errored && plan.length ? ` \u00b7 ${plan.length} ${t("trainsets")}` : ""}
          </span>
        </div>

        {loading ? (
          <StateBlock label={t("loading")} />
        ) : errored ? (
          <StateBlock label={t("error_trains")} tone="error" />
        ) : !plan.length ? (
          <StateBlock label={t("empty_trains")} />
        ) : (
          <InductionList plan={plan} />
        )}
      </section>
    </AppShell>
  );
}
