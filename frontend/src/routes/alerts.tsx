import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BellRing } from "lucide-react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
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

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  category: string;
  raisedAt: string;
  linkedDocId?: string;
  linkedStaffId?: string;
}

function AlertsPage() {
  const { lang, t, log } = useApp();
  const [ack, setAck] = useState<string[]>([]);
  const [sev, setSev] = useState<"all" | "critical" | "warning" | "info">("all");
  
  // NEW: State to hold live alerts fetched from your FastAPI backend!
  const [liveAlerts, setLiveAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live alerts from FastAPI when the page loads
  useEffect(() => {
    fetch("http://127.0.0.1:8000/alerts")
      .then((res) => res.json())
      .then((result) => {
        if (result.status === "success" && Array.isArray(result.data)) {
          // Map backend format if necessary, or use directly if keys match
          setLiveAlerts(result.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch live alerts:", err);
        setLoading(false);
      });
  }, []);

  const list = liveAlerts.filter((a) => sev === "all" || a.severity === sev);

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
            {s} ({s === "all" ? liveAlerts.length : liveAlerts.filter((a) => a.severity === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading live alerts from backend...</p>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li
              key={a.id || Math.random()}
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
                <span className="text-sm font-medium">{a.title}</span>
                <span className="mono-label">{a.category || "INDUCTION"}</span>
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
                raised {a.raisedAt ? new Date(a.raisedAt).toLocaleString("en-IN") : "Just now"}
                {a.linkedStaffId ? ` · staff ${a.linkedStaffId}` : ""}
              </p>
            </li>
          ))}
          {list.length === 0 && (
            <li className="text-sm text-muted-foreground">No alerts found in the database.</li>
          )}
        </ul>
      )}
    </AppShell>
  );
}