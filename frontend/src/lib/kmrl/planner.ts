import { daysUntil, type Staff } from "./data";

export type ShiftId = "night-induction" | "early-service" | "ibl-maintenance";
export type RequirementId =
  | "rolling-stock-fitness"
  | "atp-signalling"
  | "ibl-inspection"
  | "deep-clean-supervision";

export const SHIFTS: { id: ShiftId; label: string; labelMl: string; window: string; minRestHours: number }[] = [
  { id: "night-induction", label: "Night Induction (22:30 – 05:30)", labelMl: "രാത്രി ഇൻഡക്ഷൻ (22:30 – 05:30)", window: "22:30–05:30", minRestHours: 11 },
  { id: "early-service", label: "Early Service Readiness (04:00 – 12:00)", labelMl: "ഏർളി സർവീസ് (04:00 – 12:00)", window: "04:00–12:00", minRestHours: 10 },
  { id: "ibl-maintenance", label: "IBL Maintenance Block (23:00 – 04:00)", labelMl: "IBL മെയിന്റനൻസ് ബ്ലോക്ക് (23:00 – 04:00)", window: "23:00–04:00", minRestHours: 11 },
];

export const REQUIREMENTS: {
  id: RequirementId;
  label: string;
  labelMl: string;
  requiredCerts: string[];
  preferredDept: string;
  minExperience: number;
  policyDoc: string;
  policySection: string;
}[] = [
  {
    id: "rolling-stock-fitness",
    label: "Rolling stock fitness renewal — TS-07",
    labelMl: "റോളിംഗ് സ്റ്റോക്ക് ഫിറ്റ്നസ് പുതുക്കൽ — TS-07",
    requiredCerts: ["MSC", "RS-B"],
    preferredDept: "Rolling Stock",
    minExperience: 5,
    policyDoc: "DOC-1042",
    policySection: "p.2 §3 Validity & Renewal",
  },
  {
    id: "atp-signalling",
    label: "ATP transponder replacement — TS-11 (JC-4471)",
    labelMl: "ATP ട്രാൻസ്‌പോണ്ടർ മാറ്റം — TS-11 (JC-4471)",
    requiredCerts: ["ATP"],
    preferredDept: "Signalling & Telecom",
    minExperience: 3,
    policyDoc: "DOC-1088",
    policySection: "p.1 Sheet: OpenJobs",
  },
  {
    id: "ibl-inspection",
    label: "IBL inspection bay supervision",
    labelMl: "IBL ഇൻസ്പെക്ഷൻ ബേ മേൽനോട്ടം",
    requiredCerts: ["MSC", "IBL"],
    preferredDept: "Safety & Compliance",
    minExperience: 4,
    policyDoc: "DOC-1121",
    policySection: "p.4 §6.2 Staff Eligibility",
  },
  {
    id: "deep-clean-supervision",
    label: "Deep-clean bay supervision — TS-07 / TS-21",
    labelMl: "ഡീപ്-ക്ലീൻ ബേ മേൽനോട്ടം — TS-07 / TS-21",
    requiredCerts: ["MSC"],
    preferredDept: "Housekeeping",
    minExperience: 2,
    policyDoc: "DOC-1156",
    policySection: "p.1 Deep Clean Slots",
  },
];

export interface Reason {
  label: string;
  detail: string;
  weight?: number;
  citation?: { docId: string; ref: string };
  kind: "pro" | "con" | "block";
}

export interface Candidate {
  staff: Staff;
  score: number;
  eligible: boolean;
  reasons: Reason[];
  blockers: Reason[];
}

export interface PlanResult {
  shift: (typeof SHIFTS)[number];
  requirement: (typeof REQUIREMENTS)[number];
  candidates: Candidate[];
  eligible: Candidate[];
  rejected: Candidate[];
  recommended?: Candidate | undefined;
  conflicts: { severity: "critical" | "warning"; title: string; detail: string; citation?: { docId: string; ref: string } }[];
  generatedAt: string;
}

export function buildPlan(shiftId: ShiftId, reqId: RequirementId, pool: Staff[]): PlanResult {
  const shift = SHIFTS.find((s) => s.id === shiftId)!;
  const requirement = REQUIREMENTS.find((r) => r.id === reqId)!;

  const candidates: Candidate[] = pool.map((person) => {
    const reasons: Reason[] = [];
    const blockers: Reason[] = [];
    let score = 0;

    // 1. Certifications
    for (const code of requirement.requiredCerts) {
      const cert = person.certifications.find((c) => c.code === code);
      if (!cert) {
        blockers.push({
          kind: "block",
          label: `Missing ${code} certification`,
          detail: `Requirement "${requirement.label}" mandates a valid ${code} certificate; none is recorded for ${person.id}.`,
          citation: { docId: requirement.policyDoc, ref: requirement.policySection },
        });
        continue;
      }
      const left = daysUntil(cert.expiresOn);
      if (left < 0) {
        blockers.push({
          kind: "block",
          label: `${code} expired ${Math.abs(left)} days ago`,
          detail: `${cert.name} lapsed on ${cert.expiresOn}. Safety-critical duty is barred until re-certification is indexed.`,
          citation: { docId: cert.docId, ref: "Annexure A — Certified Candidates" },
        });
      } else if (left <= 7) {
        score += 12;
        reasons.push({
          kind: "con",
          label: `${code} expires in ${left} days`,
          detail: `${cert.name} valid to ${cert.expiresOn} — usable for this shift but renewal must be raised now.`,
          citation: { docId: cert.docId, ref: "Certificate validity" },
          weight: -8,
        });
      } else {
        score += 25;
        reasons.push({
          kind: "pro",
          label: `${code} valid for ${left} more days`,
          detail: `${cert.name} issued ${cert.issuedOn}, valid to ${cert.expiresOn}.`,
          citation: { docId: cert.docId, ref: "Certificate validity" },
          weight: 25,
        });
      }
    }

    // 2. Rest / fatigue rule
    if (person.restHoursSinceLastShift < shift.minRestHours) {
      blockers.push({
        kind: "block",
        label: `Rest rule violation (${person.restHoursSinceLastShift}h < ${shift.minRestHours}h)`,
        detail: `Induction guidelines require ${shift.minRestHours} hours continuous rest before the ${shift.label} shift.`,
        citation: { docId: "DOC-1121", ref: "p.4 §6.2 Staff Eligibility" },
      });
    } else {
      score += 15;
      reasons.push({
        kind: "pro",
        label: `${person.restHoursSinceLastShift}h rest since last shift`,
        detail: `Meets the ${shift.minRestHours}-hour minimum continuous-rest rule for this shift.`,
        citation: { docId: "DOC-1121", ref: "p.4 §6.2 Staff Eligibility" },
        weight: 15,
      });
    }

    // 3. Rolling 7-day shift cap
    if (person.shiftsLast7Days > 6) {
      blockers.push({
        kind: "block",
        label: `Roster cap exceeded (${person.shiftsLast7Days}/6 shifts)`,
        detail: "More than 6 rostered shifts in a rolling 7-day window.",
        citation: { docId: "DOC-1121", ref: "p.4 §6.2 Staff Eligibility" },
      });
    } else if (person.shiftsLast7Days >= 5) {
      score -= 6;
      reasons.push({
        kind: "con",
        label: `${person.shiftsLast7Days} of 6 shifts already worked`,
        detail: "Close to the rolling 7-day roster cap; fatigue risk elevated.",
        weight: -6,
      });
    }

    // 4. Availability
    if (person.availability === "On Leave" || person.availability === "Rest Period") {
      blockers.push({
        kind: "block",
        label: `Unavailable — ${person.availability}`,
        detail: `${person.name} is marked ${person.availability} in the depot roster for this window.`,
      });
    } else {
      score += 8;
      reasons.push({
        kind: "pro",
        label: `Available for ${shift.window}`,
        detail: `Roster status: ${person.availability} at ${person.depot}.`,
        weight: 8,
      });
    }

    // 5. Department fit
    if (person.department === requirement.preferredDept) {
      score += 14;
      reasons.push({
        kind: "pro",
        label: `Department match — ${person.department}`,
        detail: `Task owner department for "${requirement.label}".`,
        weight: 14,
      });
    } else {
      score -= 4;
      reasons.push({
        kind: "con",
        label: `Cross-department (${person.department})`,
        detail: `Preferred department for this task is ${requirement.preferredDept}.`,
        weight: -4,
      });
    }

    // 6. Experience
    if (person.experienceYears >= requirement.minExperience) {
      score += Math.min(15, person.experienceYears);
      reasons.push({
        kind: "pro",
        label: `${person.experienceYears} years experience`,
        detail: `Above the ${requirement.minExperience}-year minimum for this requirement.`,
        weight: Math.min(15, person.experienceYears),
      });
    } else {
      blockers.push({
        kind: "block",
        label: `Experience below threshold (${person.experienceYears} < ${requirement.minExperience} yrs)`,
        detail: "Requirement demands more field experience for unsupervised execution.",
      });
    }

    // 7. Competency & training
    score += Math.round(person.competencyScore / 5);
    reasons.push({
      kind: person.competencyScore >= 85 ? "pro" : "con",
      label: `Competency score ${person.competencyScore}/100`,
      detail: `${person.trainingHours12m} training hours logged in the last 12 months.`,
      weight: Math.round(person.competencyScore / 5),
    });

    return {
      staff: person,
      score: Math.max(0, score),
      eligible: blockers.length === 0,
      reasons,
      blockers,
    };
  });

  const eligible = candidates.filter((c) => c.eligible).sort((a, b) => b.score - a.score);
  const rejected = candidates.filter((c) => !c.eligible).sort((a, b) => b.score - a.score);

  const conflicts: PlanResult["conflicts"] = [];
  if (requirement.id === "atp-signalling") {
    conflicts.push({
      severity: "critical",
      title: "TS-11 blocked from SERVICE while JC-4471 is open",
      detail:
        "Safety-critical job card has crossed the 24-hour closure SLA; escalation to the Chief Signalling Engineer is due beyond 36 hours.",
      citation: { docId: "DOC-1088", ref: "p.2 Sheet: Closure SLA" },
    });
  }
  if (requirement.id === "rolling-stock-fitness") {
    conflicts.push({
      severity: "critical",
      title: "TS-07 fitness certificate lapses in 4 days",
      detail:
        "Renewal inspection must commence by 17 Aug 2026 to satisfy the 72-hour pre-expiry rule, otherwise TS-07 cannot be inducted.",
      citation: { docId: "DOC-1042", ref: "p.2 §3 Validity & Renewal" },
    });
  }
  if (requirement.id === "deep-clean-supervision") {
    conflicts.push({
      severity: "warning",
      title: "Only two deep-clean bays available tonight",
      detail: "Bays allocated to TS-07 and TS-21; a third trainset must be deferred.",
      citation: { docId: "DOC-1156", ref: "p.1 Deep Clean Slots" },
    });
  }
  const expiredStaff = candidates.filter((c) =>
    c.blockers.some((b) => b.label.includes("expired")),
  );
  for (const c of expiredStaff) {
    conflicts.push({
      severity: "critical",
      title: `Compliance violation — ${c.staff.name} (${c.staff.id})`,
      detail: c.blockers.find((b) => b.label.includes("expired"))!.detail,
      citation: { docId: "DOC-1170", ref: "p.2 Annexure A" },
    });
  }
  if (eligible.length <= 1) {
    conflicts.push({
      severity: "warning",
      title: "Thin eligibility pool",
      detail: `Only ${eligible.length} staff member(s) clear every hard constraint for this shift — no backup cover if the nominee reports sick.`,
    });
  }

  return {
    shift,
    requirement,
    candidates,
    eligible,
    rejected,
    recommended: eligible[0],
    conflicts,
    generatedAt: new Date().toISOString(),
  };
}
