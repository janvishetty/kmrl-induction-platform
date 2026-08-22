import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, GitBranch, ShieldAlert, XCircle, Terminal } from "lucide-react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import {
  REQUIREMENTS,
  SHIFTS,
  buildPlan,
  type RequirementId,
  type ShiftId,
  type Candidate,
} from "@/lib/kmrl/planner";
import { cn } from "@/lib/utils";


import { staff } from "@/lib/kmrl/data";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Explainable Induction Planner — KMRL Ops Intelligence" },
      {
        name: "description",
        content:
          "Select a shift and operational requirement to see eligible KMRL staff, the recommended nominee, and the exact reasons other candidates were rejected.",
      },
      { property: "og:title", content: "Explainable Induction Planner — KMRL" },
      {
        property: "og:description",
        content: "Shift-wise staff induction recommendations with full reasoning and document citations.",
      },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const { t, lang, log } = useApp();
  const [shift, setShift] = useState<ShiftId>("night-induction");
  const [req, setReq] = useState<RequirementId>("rolling-stock-fitness");
  const [runId, setRunId] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  // NEW: State to hold your live PuLP backend response!
  const [backendPlan, setBackendPlan] = useState<any | null>(null);
  const [isLive, setIsLive] = useState(false);

  // 👇 FIX: Added STAFF as the 3rd argument to buildPlan
  const plan = useMemo(() => buildPlan(shift, req, staff), [shift, req, runId]);
  
  const focus: Candidate | undefined =
    plan.candidates.find((c) => c.staff.id === selected) ?? plan.recommended;

  return (
    <AppShell>
      <PageHeader
        tag={`${t("hero")} · Explainable AI`}
        title={t("nav_planner")}
        subtitle="Pick a shift and an operational requirement. The planner evaluates every staff member against certification, fatigue, roster-cap, availability, department and experience rules — and shows the reasoning behind every accept and reject."
        action={
          <button
            onClick={async () => {
              setRunId((n) => n + 1);
              setSelected(null);
              log({
                actor: "Duty Controller (You)",
                action: "PLAN_GENERATED",
                target: `${plan.shift.label} — ${plan.requirement.label}`,
                detail: "Sent request to FastAPI backend solver.",
              });

              try {
                // The exact 6 inter-dependent variables required by your Pydantic schema and PuLP solver
                const dummyData = [
                  {
                    train_id: "T01",
                    fitness_certificate: true,
                    job_card_cleared: true,
                    branding_active: true,
                    mileage: 15000,
                    cleaning_completed: true,
                    stabling_location: "Muttom"
                  },
                  {
                    train_id: "T02",
                    fitness_certificate: false,
                    job_card_cleared: true,
                    branding_active: false,
                    mileage: 12000,
                    cleaning_completed: false,
                    stabling_location: "Muttom"
                  }
                ];
                
                const response = await fetch("http://127.0.0.1:8000/induction/generate-plan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(dummyData)
                });
                
                const data = await response.json();
                console.log(" LIVE PuLP BACKEND OUTPUT:", data);
                
                // Save to live state so the UI instantly swaps to real backend data!
                setBackendPlan(data);
                setIsLive(true);
                
               alert(`Backend PuLP Optimization Success!\nBlockchain Audit Hash: ${data.audit_hash}`);
                
              } catch (error) {
                console.error("API Error:", error);
                alert("Backend connection failed! Is your Uvicorn server running?");
              }
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("generate")}
          </button>
        }
      />

      {/* LIVE BACKEND RESULTS BANNER */}
      {isLive && backendPlan && (
        <section className="mb-6 rounded-lg border border-primary/50 bg-primary/10 p-5">
          <div className="flex items-center justify-between border-b border-primary/20 pb-3">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <Terminal className="size-4" /> Live PuLP Optimization Engine Results
            </p>
            <span className="font-mono text-xs text-muted-foreground">
              Audit Hash: {backendPlan.audit_hash?.substring(0, 16)}...
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded bg-background/80 p-3 border border-border">
              <p className="mono-label text-success">Service Trains ({backendPlan.service_list?.length || 0})</p>
              <p className="mt-1 font-mono text-sm">{backendPlan.service_list?.join(", ") || "None"}</p>
            </div>
            <div className="rounded bg-background/80 p-3 border border-border">
              <p className="mono-label text-accent">Standby Trains ({backendPlan.standby_list?.length || 0})</p>
              <p className="mt-1 font-mono text-sm">{backendPlan.standby_list?.join(", ") || "None"}</p>
            </div>
            <div className="rounded bg-background/80 p-3 border border-border">
              <p className="mono-label text-destructive">IBL Maintenance ({backendPlan.ibl_list?.length || 0})</p>
              <p className="mt-1 font-mono text-sm">{backendPlan.ibl_list?.join(", ") || "None"}</p>
            </div>
          </div>
          {backendPlan.system_alerts?.length > 0 && (
            <div className="mt-4 rounded bg-destructive/10 p-3 border border-destructive/30">
              <p className="mono-label text-destructive">Safety Violations Triggered by Math Engine:</p>
              <ul className="mt-1 space-y-1 text-xs">
                {backendPlan.system_alerts.map((alert: any, idx: number) => (
                  <li key={idx} className="font-medium text-foreground">
                    <span className="font-mono font-bold text-destructive">[{alert.train_id}]</span> {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <p className="mono-label mb-2">{t("shift")}</p>
          <div className="space-y-2">
            {SHIFTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setShift(s.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  shift === s.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <span className="block font-medium">{lang === "ml" ? s.labelMl : s.label}</span>
                <span className="mono-label">min rest {s.minRestHours}h</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <p className="mono-label mb-2">{t("requirement")}</p>
          <div className="space-y-2">
            {REQUIREMENTS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReq(r.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  req === r.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-accent/40",
                )}
              >
                <span className="block font-medium">{lang === "ml" ? r.labelMl : r.label}</span>
                <span className="mono-label">
                  requires {r.requiredCerts.join(" + ")} · {r.minExperience}+ yrs
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="panel border-primary/40 bg-primary/5 p-5 xl:col-span-1">
          <p className="mono-label text-primary">{t("recommended")}</p>
          {plan.recommended ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-md bg-primary/20 font-semibold text-primary">
                  {plan.recommended.staff.photoInitials}
                </div>
                <div>
                  <p className="font-semibold">
                    {lang === "ml" ? plan.recommended.staff.nameMl : plan.recommended.staff.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {plan.recommended.staff.id} · {plan.recommended.staff.role}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-primary">
                  {plan.recommended.score}
                </span>
                <span className="mono-label">suitability index</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Ranked #1 of {plan.eligible.length} eligible staff for {plan.shift.window} at{" "}
                {plan.recommended.staff.depot}.
              </p>
              <button
                onClick={() =>
                  log({
                    actor: "Duty Controller (You)",
                    action: "APPROVE",
                    target: `${plan.recommended!.staff.id} → ${plan.requirement.label}`,
                    detail: `Approved recommendation with score ${plan.recommended!.score}.`,
                  })
                }
                className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Approve nomination
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-destructive">
              No staff member clears every hard constraint for this combination. Review blockers
              below and escalate to the Chief Safety Officer.
            </p>
          )}
        </div>

        {/* Conflicts */}
        <div className="panel p-5 xl:col-span-2">
          <p className="mono-label mb-3 flex items-center gap-2">
            <ShieldAlert className="size-3.5 text-destructive" /> {t("conflicts")}
          </p>
          <ul className="space-y-2">
            {plan.conflicts.map((c, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  c.severity === "critical"
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-accent/40 bg-accent/10",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "size-4",
                      c.severity === "critical" ? "text-destructive" : "text-accent",
                    )}
                  />
                  <span className="font-medium">{c.title}</span>
                  {c.citation && <Citation docId={c.citation.docId} refLabel={c.citation.ref} />}
                </div>
                <p className="mt-1 pl-6 text-xs text-muted-foreground">{c.detail}</p>
              </li>
            ))}
            {plan.conflicts.length === 0 && (
              <li className="text-sm text-muted-foreground">No conflicts detected.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Candidates */}
      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <CandidateList
            title={`${t("eligible")} (${plan.eligible.length})`}
            tone="ok"
            items={plan.eligible}
            selected={focus?.staff.id}
            onSelect={setSelected}
            lang={lang}
          />
          <CandidateList
            title={`${t("rejected")} (${plan.rejected.length})`}
            tone="bad"
            items={plan.rejected}
            selected={focus?.staff.id}
            onSelect={setSelected}
            lang={lang}
          />
        </div>

        <div className="panel h-fit p-5">
          <p className="mono-label mb-3 flex items-center gap-2">
            <GitBranch className="size-3.5 text-primary" /> Decision trace
          </p>
          {focus ? (
            <>
              <p className="text-sm font-semibold">
                {lang === "ml" ? focus.staff.nameMl : focus.staff.name}{" "}
                <span className="font-mono text-xs text-muted-foreground">({focus.staff.id})</span>
              </p>
              {focus.blockers.length > 0 && (
                <div className="mt-4">
                  <p className="mono-label text-destructive">{t("whyNot")}</p>
                  <ul className="mt-2 space-y-2">
                    {focus.blockers.map((b, i) => (
                      <li key={i} className="rounded border border-destructive/30 bg-destructive/10 p-2">
                        <p className="flex items-center gap-2 text-xs font-medium">
                          <XCircle className="size-3.5 text-destructive" /> {b.label}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{b.detail}</p>
                        {b.citation && (
                          <div className="mt-1">
                            <Citation docId={b.citation.docId} refLabel={b.citation.ref} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <p className="mono-label text-success">{t("why")}</p>
                <ul className="mt-2 space-y-2">
                  {focus.reasons.map((r, i) => (
                    <li key={i} className="rounded border border-border p-2">
                      <p className="flex items-center justify-between gap-2 text-xs font-medium">
                        <span className="flex items-center gap-2">
                          {r.kind === "pro" ? (
                            <CheckCircle2 className="size-3.5 text-success" />
                          ) : (
                            <AlertTriangle className="size-3.5 text-accent" />
                          )}
                          {r.label}
                        </span>
                        {typeof r.weight === "number" && (
                          <span
                            className={cn(
                              "font-mono",
                              r.weight >= 0 ? "text-success" : "text-destructive",
                            )}
                          >
                            {r.weight > 0 ? "+" : ""}
                            {r.weight}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{r.detail}</p>
                      {r.citation && (
                        <div className="mt-1">
                          <Citation docId={r.citation.docId} refLabel={r.citation.ref} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a candidate to inspect reasoning.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function CandidateList({
  title,
  items,
  tone,
  selected,
  onSelect,
  lang,
}: {
  title: string;
  items: Candidate[];
  tone: "ok" | "bad";
  selected?: string | undefined;
  onSelect: (id: string) => void;
  lang: "en" | "ml";
}) {
  return (
    <div className="panel p-4">
      <p className={cn("mono-label mb-3", tone === "ok" ? "text-success" : "text-destructive")}>
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.staff.id}>
            <button
              onClick={() => onSelect(c.staff.id)}
              className={cn(
                "flex w-full flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                selected === c.staff.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className="grid size-9 place-items-center rounded bg-secondary text-xs font-semibold">
                {c.staff.photoInitials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {lang === "ml" ? c.staff.nameMl : c.staff.name}
                </span>
                <span className="mono-label">
                  {c.staff.id} · {c.staff.role} · {c.staff.depot}
                </span>
              </span>
              <span className="text-right">
                <span
                  className={cn(
                    "block font-mono text-lg font-bold",
                    tone === "ok" ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {c.score}
                </span>
                <span className="mono-label">
                  {tone === "ok" ? `${c.reasons.length} factors` : c.blockers[0]?.label}
                </span>
              </span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">None.</li>}
      </ul>
    </div>
  );
}