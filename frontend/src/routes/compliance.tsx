import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck, FileWarning } from "lucide-react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { alerts, daysUntil, staff } from "@/lib/kmrl/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance Intelligence — KMRL Ops Intelligence" },
      {
        name: "description",
        content:
          "Expired and expiring certifications, missing documents and safety violations detected across KMRL staff and rolling stock.",
      },
      { property: "og:title", content: "Compliance Intelligence — KMRL" },
      {
        property: "og:description",
        content: "Certification expiry radar and safety violation detection for Kochi Metro operations.",
      },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
  const { docs, lang, t } = useApp();

  const certRows = staff
    .flatMap((s) => s.certifications.map((c) => ({ s, c, left: daysUntil(c.expiresOn) })))
    .sort((a, b) => a.left - b.left);

  const expired = certRows.filter((r) => r.left < 0);
  const expiring = certRows.filter((r) => r.left >= 0 && r.left <= 14);
  const docExpiring = docs
    .filter((d) => d.expiresOn)
    .map((d) => ({ d, left: daysUntil(d.expiresOn!) }))
    .filter((x) => x.left <= 30)
    .sort((a, b) => a.left - b.left);
  const missing = staff.filter((s) => !s.certifications.some((c) => c.code === "MSC"));
  const needsReview = docs.filter((d) => d.status !== "Indexed");

  const health = Math.round(
    100 - (expired.length * 14 + expiring.length * 5 + needsReview.length * 4 + missing.length * 8),
  );

  return (
    <AppShell>
      <PageHeader
        tag="Continuous rule evaluation"
        title={t("nav_compliance")}
        subtitle="The engine re-evaluates certification validity, document expiry, missing mandatory records and safety violations against every indexed source, and traces each finding back to its document."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Compliance health" value={`${health}%`} tone={health > 75 ? "ok" : health > 55 ? "warn" : "bad"} />
        <Stat label="Expired certifications" value={String(expired.length)} tone={expired.length ? "bad" : "ok"} />
        <Stat label="Expiring ≤14 days" value={String(expiring.length)} tone="warn" />
        <Stat label="Documents needing review" value={String(needsReview.length)} tone="warn" />
      </div>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <p className="mono-label mb-3 flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-3.5" /> Certification expiry radar
          </p>
          <ul className="space-y-2">
            {certRows.slice(0, 8).map(({ s, c, left }) => (
              <li
                key={`${s.id}-${c.code}`}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs",
                  left < 0
                    ? "border-destructive/40 bg-destructive/10"
                    : left <= 14
                      ? "border-accent/40 bg-accent/10"
                      : "border-border",
                )}
              >
                <span className="font-medium">{lang === "ml" ? s.nameMl : s.name}</span>
                <span className="mono-label">{s.id}</span>
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                  {c.code}
                </span>
                <span className="text-muted-foreground">{lang === "ml" ? c.nameMl : c.name}</span>
                <Citation docId={c.docId} refLabel="certification source" />
                <span
                  className={cn(
                    "ml-auto font-mono",
                    left < 0 ? "text-destructive" : left <= 14 ? "text-accent" : "text-success",
                  )}
                >
                  {left < 0 ? `${t("expired")} ${-left}d` : `${left}d left`}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <p className="mono-label mb-3 flex items-center gap-2 text-accent">
            <FileWarning className="size-3.5" /> Document validity & gaps
          </p>
          <ul className="space-y-2">
            {docExpiring.map(({ d, left }) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                <span className="font-medium">{lang === "ml" ? d.titleMl : d.title}</span>
                <Citation docId={d.id} refLabel={d.type} />
                <span className={cn("ml-auto font-mono", left <= 7 ? "text-destructive" : "text-accent")}>
                  {left}d
                </span>
              </li>
            ))}
            {needsReview.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
                <span className="font-medium">{lang === "ml" ? d.titleMl : d.title}</span>
                <span className="text-muted-foreground">
                  {d.status} — classifier confidence {(d.confidence * 100).toFixed(0)}%
                </span>
                <Citation docId={d.id} refLabel="review" />
              </li>
            ))}
            {missing.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                <span className="font-medium">{lang === "ml" ? s.nameMl : s.name}</span>
                <span className="text-destructive">Missing mandatory MSC certification record</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <p className="mono-label mb-3 flex items-center gap-2 text-success">
          <ShieldCheck className="size-3.5" /> Safety & operational violations
        </p>
        <ul className="space-y-2">
          {alerts
            .filter((a) => a.category !== "Document")
            .map((a) => (
              <li key={a.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      a.severity === "critical"
                        ? "bg-destructive/20 text-destructive"
                        : a.severity === "warning"
                          ? "bg-accent/20 text-accent"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {a.severity}
                  </span>
                  <span className="font-medium">{lang === "ml" ? a.titleMl : a.title}</span>
                  {a.linkedDocId && <Citation docId={a.linkedDocId} refLabel="evidence" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
              </li>
            ))}
        </ul>
      </section>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" }) {
  return (
    <div className="panel p-4">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-3xl font-bold",
          tone === "ok" ? "text-success" : tone === "warn" ? "text-accent" : "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
