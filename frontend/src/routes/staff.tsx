import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { daysUntil, staff } from "@/lib/kmrl/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Competency Profiles — KMRL Ops Intelligence" },
      {
        name: "description",
        content:
          "Qualifications, certifications with expiry dates, training hours, experience and shift availability for KMRL depot and station staff.",
      },
      { property: "og:title", content: "Staff Competency Profiles — KMRL" },
      {
        property: "og:description",
        content: "Competency, fatigue and availability profile for every KMRL staff member.",
      },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { lang, t } = useApp();
  const [openId, setOpenId] = useState(staff[0]!.id);
  const person = staff.find((s) => s.id === openId)!;

  return (
    <AppShell>
      <PageHeader
        tag="People readiness"
        title={t("nav_staff")}
        subtitle="Each profile aggregates qualifications, certification validity, training hours, field experience, fatigue exposure and roster availability — the same signals the induction planner consumes."
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <ul className="space-y-2 xl:col-span-2">
          {staff.map((s) => {
            const soonest = Math.min(...s.certifications.map((c) => daysUntil(c.expiresOn)));
            return (
              <li key={s.id}>
                <button
                  onClick={() => setOpenId(s.id)}
                  className={cn(
                    "panel flex w-full items-center gap-3 p-3 text-left",
                    openId === s.id ? "border-primary" : "hover:border-primary/40",
                  )}
                >
                  <span className="grid size-10 place-items-center rounded bg-secondary text-sm font-semibold">
                    {s.photoInitials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {lang === "ml" ? s.nameMl : s.name}
                    </span>
                    <span className="mono-label block truncate">
                      {s.id} · {s.role}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm font-bold text-primary">
                      {s.competencyScore}
                    </span>
                    <span
                      className={cn(
                        "mono-label",
                        soonest < 0 ? "text-destructive" : soonest <= 14 ? "text-accent" : "text-success",
                      )}
                    >
                      {soonest < 0 ? "expired cert" : `${soonest}d cert`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="panel h-fit p-5 xl:col-span-3">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-md bg-primary/15 text-lg font-semibold text-primary">
              {person.photoInitials}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{lang === "ml" ? person.nameMl : person.name}</h2>
              <p className="text-xs text-muted-foreground">
                {person.id} · {person.role} · {person.department} · {person.depot}
              </p>
            </div>
            <span
              className={cn(
                "ml-auto rounded-full border px-2.5 py-1 text-xs",
                person.availability === "Available"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-accent/40 bg-accent/10 text-accent",
              )}
            >
              {person.availability}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Experience" value={`${person.experienceYears} yrs`} />
            <Metric label="Training (12m)" value={`${person.trainingHours12m} h`} />
            <Metric label="Rest since shift" value={`${person.restHoursSinceLastShift} h`} />
            <Metric label="Shifts / 7 days" value={`${person.shiftsLast7Days} of 6`} />
          </div>

          <p className="mono-label mt-6">Languages</p>
          <p className="mt-1 text-sm">{person.languages.join(", ")}</p>

          <p className="mono-label mt-6">Certifications & expiry</p>
          <ul className="mt-2 space-y-2">
            {person.certifications.map((c) => {
              const left = daysUntil(c.expiresOn);
              return (
                <li
                  key={c.code}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs",
                    left < 0
                      ? "border-destructive/40 bg-destructive/10"
                      : left <= 14
                        ? "border-accent/40 bg-accent/10"
                        : "border-border",
                  )}
                >
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                    {c.code}
                  </span>
                  <span className="font-medium">{lang === "ml" ? c.nameMl : c.name}</span>
                  <span className="text-muted-foreground">
                    {c.issuedOn} → {c.expiresOn}
                  </span>
                  <Citation docId={c.docId} refLabel="source record" />
                  <span
                    className={cn(
                      "ml-auto font-mono",
                      left < 0 ? "text-destructive" : left <= 14 ? "text-accent" : "text-success",
                    )}
                  >
                    {left < 0 ? `${t("expired")} ${-left}d` : `${left}d`}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mono-label mt-6">Competency index</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${person.competencyScore}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {person.competencyScore}/100 — weighted from certification validity, training hours,
            experience and incident-free duty history.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="mono-label">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
