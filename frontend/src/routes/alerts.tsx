import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BellRing } from "lucide-react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { alerts } from "@/lib/kmrl/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Critical Alerts — KMRL Ops Intelligence" },
      {
        name: "description",
        content:
          "Critical compliance, document and induction alerts for Kochi Metro night operations, each traceable to its source document.",
      },
      { property: "og:title", content: "Critical Alerts — KMRL" },
      { property: "og:description", content: "Live compliance and induction alert queue for KMRL operations." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { lang, t, log } = useApp();
  const [ack, setAck] = useState<string[]>([]);
  const [sev, setSev] = useState<"all" | "critical" | "warning" | "info">("all");
  const list = alerts.filter((a) => sev === "all" || a.severity === sev);

  return (
    <AppShell>
      <PageHeader
        tag="Notification centre"
        title={t("nav_alerts")}
        subtitle="Rule violations raised by the compliance, document and induction engines. Acknowledging an alert writes an entry into the audit trail."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "critical", "warning", "info"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSev(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs capitalize",
              sev === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
            )}
          >
            {s} ({s === "all" ? alerts.length : alerts.filter((a) => a.severity === s).length})
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {list.map((a) => (
          <li
            key={a.id}
            className={cn(
              "panel p-4",
              a.severity === "critical" && "border-destructive/50",
              a.severity === "warning" && "border-accent/40",
              ack.includes(a.id) && "opacity-60",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <BellRing
                className={cn(
                  "size-4",
                  a.severity === "critical"
                    ? "text-destructive"
                    : a.severity === "warning"
                      ? "text-accent"
                      : "text-muted-foreground",
                )}
              />
              <span className="text-sm font-medium">{lang === "ml" ? a.titleMl : a.title}</span>
              <span className="mono-label">{a.category}</span>
              {a.linkedDocId && <Citation docId={a.linkedDocId} refLabel="source" />}
              <button
                onClick={() => {
                  setAck((p) => [...p, a.id]);
                  log({
                    actor: "Duty Controller (You)",
                    action: "APPROVE",
                    target: `${a.id} acknowledged`,
                    detail: a.title,
                  });
                }}
                disabled={ack.includes(a.id)}
                className="ml-auto rounded border border-border px-2.5 py-1 text-xs hover:border-primary/50 disabled:opacity-50"
              >
                {ack.includes(a.id) ? "Acknowledged" : "Acknowledge"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{a.detail}</p>
            <p className="mono-label mt-2">
              raised {new Date(a.raisedAt).toLocaleString("en-IN")}
              {a.linkedStaffId ? ` · staff ${a.linkedStaffId}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
