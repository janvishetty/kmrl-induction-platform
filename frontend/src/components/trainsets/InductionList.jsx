import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VARIABLE_META, VAR_ORDER, stateTone, variableRows } from "./variableMeta";
import * as api from "@/lib/api";

const DOC_CODE = { fitness: "FIT", jobcards: "JOB", branding: "BRD", mileage: "MIL", cleaning: "CLN", stabling: "STB" };
const toneDot = { success: "bg-success", warning: "bg-warning", destructive: "bg-destructive" };
const toneText = { success: "text-success", warning: "text-warning", destructive: "text-destructive" };
const toneChip = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  destructive: "bg-destructive/12 text-destructive border-destructive/25",
};

function VariableDots({ reasons }) {
  return (
    <span className="hidden items-center gap-1.5 md:flex">
      {VAR_ORDER.map((key) => {
        const r = reasons.find((x) => x.key === key);
        const tone = stateTone(r ? r.state : "ok");
        return <span key={key} className={cn("h-2 w-2 rounded-full", toneDot[tone])} aria-hidden="true" />;
      })}
    </span>
  );
}

function DecisionDrawer({ ts, onClose }) {
  const { t } = useApp();
  const [docStatus, setDocStatus] = useState({});
  const [verifying, setVerifying] = useState(null);

  const verify = async (key) => {
    const id = `KMRL-${ts.train_id}-${DOC_CODE[key]}`;
    setVerifying(id);
    try {
      const res = await api.verifyDocument(id);
      setDocStatus((m) => ({ ...m, [id]: res.status }));
    } finally {
      setVerifying(null);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-mono text-xl font-bold text-foreground">{ts.train_id}</SheetTitle>
            <StatusBadge status={ts.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{ts.summary}</p>
        </SheetHeader>

        <div className="space-y-6 px-5 py-5">
          {/* Why this decision */}
          <section>
            <h3 className="mono-label mb-3">{t("why_decision")}</h3>
            <ul className="space-y-2">
              {VAR_ORDER.map((key) => {
                const r = ts.reasons.find((x) => x.key === key);
                const tone = stateTone(r.state);
                const { icon: Icon, labelKey } = VARIABLE_META[key];
                return (
                  <li key={key} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                    <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border", toneChip[tone])}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{t(labelKey)}</span>
                        <span className={cn("shrink-0 font-mono text-[10px] font-semibold uppercase", toneText[tone])}>
                          {t(r.state === "block" ? "state_block" : r.state === "warn" ? "state_warn" : "state_ok")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Operational variables */}
          <section>
            <h3 className="mono-label mb-3">{t("operational_vars")}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {VAR_ORDER.map((key) => {
                const { icon: Icon, labelKey } = VARIABLE_META[key];
                const rows = variableRows(key, ts.variables[key], t);
                return (
                  <div key={key} className="rounded-lg border border-border bg-card p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-xs font-semibold text-foreground">{t(labelKey)}</span>
                    </div>
                    <dl className="space-y-1">
                      {rows.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2 text-xs">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="truncate font-medium text-foreground">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Source documents */}
          <section>
            <h3 className="mono-label mb-3">{t("source_documents")}</h3>
            <ul className="space-y-2">
              {VAR_ORDER.map((key) => {
                const id = `KMRL-${ts.train_id}-${DOC_CODE[key]}`;
                const st = docStatus[id];
                return (
                  <li key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs font-semibold text-foreground">{id}</span>
                    </span>
                    {st ? (
                      <StatusBadge status={st} />
                    ) : (
                      <Button variant="outline" size="sm" disabled={verifying === id} onClick={() => verify(key)}>
                        {verifying === id ? t("verifying") : t("verify")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function InductionList({ plan }) {
  const { t } = useApp();
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border bg-secondary/50 px-4 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto_28px]">
          <span className="mono-label">{t("train")}</span>
          <span className="mono-label hidden text-right md:block">{t("reason")}</span>
          <span className="mono-label w-[104px] text-right">{t("status")}</span>
          <span className="hidden md:block" />
        </div>
        <ul className="divide-y divide-border">
          {plan.map((ts) => (
            <li key={ts.train_id}>
              <button
                onClick={() => setSelected(ts)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_auto_auto_28px]"
                aria-label={`${ts.train_id} ${ts.status} — ${t("view_details")}`}
              >
                <span className="min-w-0">
                  <span className="font-mono text-sm font-semibold text-foreground">{ts.train_id}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{ts.summary}</span>
                </span>
                <span className="hidden justify-self-end md:block">
                  <VariableDots reasons={ts.reasons} />
                </span>
                <span className="flex w-[104px] justify-end">
                  <StatusBadge status={ts.status} />
                </span>
                <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected && <DecisionDrawer ts={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
