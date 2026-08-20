import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — KMRL Ops Intelligence" },
      {
        name: "description",
        content:
          "Immutable log of who uploaded, searched, approved, overrode or generated induction recommendations across KMRL operations.",
      },
      { property: "og:title", content: "Audit Trail — KMRL" },
      { property: "og:description", content: "Full traceability of every action in the KMRL induction platform." },
    ],
  }),
  component: AuditPage,
});

const TONE: Record<string, string> = {
  UPLOAD: "text-primary",
  SEARCH: "text-muted-foreground",
  QA: "text-primary",
  APPROVE: "text-success",
  OVERRIDE: "text-accent",
  PLAN_GENERATED: "text-accent",
  CLASSIFY: "text-muted-foreground",
  EXPORT: "text-muted-foreground",
};

function AuditPage() {
  const { audit, t } = useApp();

  return (
    <AppShell>
      <PageHeader
        tag="Traceability"
        title={t("nav_audit")}
        subtitle="Every upload, search, AI answer, approval, manual override and generated induction plan is recorded with actor, timestamp and target for post-incident review."
      />

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Timestamp", "Actor", "Action", "Target", "Detail"].map((h) => (
                <th key={h} className="mono-label px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.map((e) => (
              <tr key={e.id} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-xs">{e.actor}</td>
                <td className={cn("px-4 py-3 font-mono text-xs font-semibold", TONE[e.action])}>
                  {e.action}
                </td>
                <td className="px-4 py-3 text-xs">{e.target}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
