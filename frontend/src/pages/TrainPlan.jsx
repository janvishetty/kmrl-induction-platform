import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { DateSwitch } from "@/components/common/DateSwitch";
import { StateBlock } from "@/components/common/StateBlock";
import { InductionList } from "@/components/trainsets/InductionList";
import { useApp } from "@/context/AppContext";
import { usePlan } from "@/lib/hooks";
import { todayIST, tomorrowIST, formatDate } from "@/lib/datetime";

export default function TrainPlan() {
  const { t } = useApp();
  const [mode, setMode] = useState("today");
  const [customDate, setCustomDate] = useState("");

  const selectedDate = mode === "tomorrow" ? tomorrowIST() : mode === "custom" ? customDate : todayIST();
  const planQ = usePlan(selectedDate);
  const plan = useMemo(() => planQ.data || [], [planQ.data]);

  return (
    <AppShell>
      <PageHeader
        title={t("trainplan_title")}
        subtitle={t("trainplan_sub")}
        action={<DateSwitch mode={mode} onMode={setMode} customDate={customDate} onCustomDate={setCustomDate} allowCustom />}
      />

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground md:text-lg">{formatDate(selectedDate) || t("select_date")}</h2>
        {!planQ.isLoading && !planQ.isError && plan.length ? (
          <span className="font-mono text-xs text-muted-foreground">
            {plan.length} {t("trainsets")}
          </span>
        ) : null}
      </div>

      {planQ.isLoading ? (
        <StateBlock label={t("loading")} />
      ) : planQ.isError ? (
        <StateBlock label={t("error_trains")} tone="error" />
      ) : !plan.length ? (
        <StateBlock label={t("empty_trains")} />
      ) : (
        <InductionList plan={plan} />
      )}
    </AppShell>
  );
}
