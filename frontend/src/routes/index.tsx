import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, TrainFront } from "lucide-react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { daysUntil } from "@/lib/kmrl/data";
import { useApiData } from "@/lib/kmrl/hooks";
import { fetchAlerts, fetchStaff, fetchTrainsets } from "@/lib/kmrl/api";
import { buildPlan } from "@/lib/kmrl/planner";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KMRL Operations Dashboard — Induction Intelligence" },
      {
        name: "description",
        content:
          "Kochi Metro night operations at a glance: document status, compliance health, staff availability, alerts and trainset induction readiness.",
      },
      { property: "og:title", content: "KMRL Operations Dashboard — Induction Intelligence" },
      {
        property: "og:description",
        content: "Document, compliance, staff and induction readiness for Kochi Metro Rail Limited.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { docs, lang, t } = useApp();
  const { data: alertsData } = useApiData(fetchAlerts);
  const { data: staffData } = useApiData(fetchStaff);
  const { data: trainsetsData } = useApiData(fetchTrainsets);
  const alerts = alertsData ?? [];
  const staff = staffData ?? [];
  const trainsets = trainsetsData ?? [];
  const plan = buildPlan("night-induction", "rolling-stock-fitness", staff);
  const criticals = alerts.filter((a) => a.severity === "critical");
  const available = staff.filter((s) => s.availability === "Available").length;
  const expiringCerts = staff.flatMap((s) =>
    (s.certifications ?? []).filter((c: any) => daysUntil(c.expiresOn) <= 14),
  ).length;

  return (
    <AppShell>
      <PageHeader
        tag="Muttom OCC · Night plan 16 Aug 2026"
        title={t("nav_dashboard")}
        subtitle="Fleet induction readiness, document intelligence status, compliance health and staff availability — reconciled from every indexed KMRL source."
        action={
          <Link
            to="/planner"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Open Induction Planner <ArrowRight className="size-4" />
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Documents indexed" value={String(docs.length)} sub={`${docs.filter((d) => d.status !== "Indexed").length} pending review`} />
        <Kpi label="Critical alerts" value={String(criticals.length)} sub={`${alerts.length} total open`} tone="bad" />
        <Kpi label="Staff available" value={`${available}/${staff.length}`} sub={`${expiringCerts} certs expiring ≤14d`} tone="warn" />
        <Kpi label="Induction ready" value={`${trainsets.filter((x) => x.jobCards === 0).length}/${trainsets.length}`} sub="trainsets clear of blockers" tone="ok" />
      </div>
      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="panel p-5 xl:col-span-2">
          <p className="mono-label mb-3 flex items-center gap-2">
            <TrainFront className="size-3.5 text-primary" /> Trainset induction board
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {trainsets.map((ts) => (
              <div key={ts.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <span className="font-mono text-sm font-bold">{ts.id}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    ts.status === "SERVICE"
                      ? "bg-success/20 text-success"
                      : ts.status === "STANDBY"
                        ? "bg-accent/20 text-accent"
                        : "bg-destructive/20 text-destructive",
                  )}
                >
                  {ts.status}
                </span>
                <span className="mono-label ml-auto text-right">
                  {ts.km.toLocaleString("en-IN")} km · clean {ts.cleaning}
                  {ts.jobCards > 0 && <span className="block text-destructive">{ts.jobCards} open job card</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel border-accent/40 p-5">
          <p className="mono-label mb-3 text-accent">Tonight's recommendation</p>
          {plan.recommended && (
            <>
              <p className="text-sm font-semibold">
                {lang === "ml" ? plan.recommended.staff.nameMl : plan.recommended.staff.name}
              </p>
              <p className="mono-label">{plan.requirement.label}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {plan.eligible.length} eligible · {plan.rejected.length} rejected ·{" "}
                {plan.conflicts.length} conflicts detected.
              </p>
              <div className="mt-3">
                <Citation docId={plan.requirement.policyDoc} refLabel={plan.requirement.policySection} />
              </div>
              <Link to="/planner" className="mt-4 block text-xs font-medium text-primary hover:underline">
                View full explanation →
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="panel mt-6 p-5">
        <p className="mono-label mb-3 flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-3.5" /> Critical queue
        </p>
        <ul className="space-y-2">
          {criticals.map((a) => (
            <li key={a.id} className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{lang === "ml" ? a.titleMl : a.title}</span>
                {a.linkedDocId && <Citation docId={a.linkedDocId} refLabel="source" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
            </li>
          ))}
        </ul>
        <Link to="/alerts" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
          Go to alert centre →
        </Link>
      </section>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="panel p-4">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-3xl font-bold",
          tone === "ok" ? "text-success" : tone === "warn" ? "text-accent" : tone === "bad" ? "text-destructive" : "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
