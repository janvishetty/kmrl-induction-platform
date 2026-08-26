// RAIL DHARA induction dataset (frontend preview layer).
//
// Grounded in the project's REAL provided dataset:
//  - Fitness certificate ground-truth (depot, language, validity) is embedded verbatim.
//  - The nightly induction decision applies the documented hard/soft constraints
//    across the 6 operational variables and produces an EXPLAINABLE result.
//
// This preview layer lets the full workflow be demonstrated end-to-end. When the
// team's backend/Supabase induction service is connected, the API layer uses it
// instead (see lib/api.js) and this layer is bypassed.

import { DEPOTS } from "@/lib/stations";

// Real fitness-certificate ground truth (from _ground_truth_fitness_certs.csv)
const FITNESS = {
  "TS-01": { depot: "Muttom Depot", lang: "en", validUntil: "2026-07-22" },
  "TS-02": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-06-05" },
  "TS-03": { depot: "Muttom Depot", lang: "ml", validUntil: "2027-04-02" },
  "TS-04": { depot: "Kalamassery Depot", lang: "ml", validUntil: "2025-11-21" },
  "TS-05": { depot: "Muttom Depot", lang: "ml", validUntil: "2027-07-09" },
  "TS-06": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-04-12" },
  "TS-07": { depot: "Muttom Depot", lang: "en", validUntil: "2026-12-20" },
  "TS-08": { depot: "Kalamassery Depot", lang: "ml", validUntil: "2027-04-01" },
  "TS-09": { depot: "Muttom Depot", lang: "ml", validUntil: "2026-12-05" },
  "TS-10": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-03-02" },
  "TS-11": { depot: "Muttom Depot", lang: "en", validUntil: "2027-07-19" },
  "TS-12": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-05-02" },
  "TS-13": { depot: "Muttom Depot", lang: "en", validUntil: "2026-12-18" },
  "TS-14": { depot: "Kalamassery Depot", lang: "ml", validUntil: "2027-01-29" },
  "TS-15": { depot: "Muttom Depot", lang: "en", validUntil: "2027-03-02" },
  "TS-16": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-05-04" },
  "TS-17": { depot: "Muttom Depot", lang: "en", validUntil: "2027-04-03" },
  "TS-18": { depot: "Kalamassery Depot", lang: "ml", validUntil: "2027-01-31" },
  "TS-19": { depot: "Muttom Depot", lang: "en", validUntil: "2027-05-31" },
  "TS-20": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-06-05" },
  "TS-21": { depot: "Muttom Depot", lang: "en", validUntil: "2026-06-18" },
  "TS-22": { depot: "Kalamassery Depot", lang: "en", validUntil: "2027-01-20" },
  "TS-23": { depot: "Muttom Depot", lang: "en", validUntil: "2027-01-27" },
  "TS-24": { depot: "Kalamassery Depot", lang: "ml", validUntil: "2026-07-15" },
  "TS-25": { depot: "Muttom Depot", lang: "en", validUntil: "2026-11-29" },
};

export const TRAINSETS = Object.keys(FITNESS);
export const VARIABLE_KEYS = ["fitness", "jobcards", "branding", "mileage", "cleaning", "stabling"];

const ADVERTISERS = ["Federal Bank", "Lulu Group", "BPCL Kochi", "Muthoot Finance", "SBI", "Kalyan Jewellers", "Airtel", "Jio"];
const JOB_SYSTEMS = ["Bogie", "Braking", "HVAC", "Passenger Doors", "Signalling / CBTC", "Traction"];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}
function daysBetween(a, b) {
  return Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);
}
function pick(arr, r) {
  return arr[Math.floor(r() * arr.length) % arr.length];
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildTrainset(ts, dateStr) {
  const r = makeRng(hashStr(ts + "|" + dateStr));
  const f = FITNESS[ts];
  const depotObj = DEPOTS.find((d) => d.name === f.depot) || DEPOTS[0];

  // Fitness
  const daysLeft = daysBetween(f.validUntil, dateStr);
  const fitness = { depot: f.depot, lang: f.lang, validUntil: f.validUntil, daysLeft, expired: daysLeft < 0 };

  // Job cards (Maximo) — some trainsets carry an open safety-critical card
  const openCount = Math.floor(r() * 3);
  const critical = openCount > 0 && r() < 0.1;
  const jobcards = {
    open: openCount,
    closed: 6 + Math.floor(r() * 10),
    critical,
    system: openCount ? pick(JOB_SYSTEMS, r) : null,
  };

  // Branding
  const committed = 120 + Math.floor(r() * 90);
  const delivered = Math.round(committed * (0.72 + r() * 0.34));
  const branding = {
    advertiser: pick(ADVERTISERS, r),
    committedHours: committed,
    deliveredHours: delivered,
    shortfall: delivered < committed * 0.9,
  };

  // Mileage
  const target = 65000;
  const sincePOH = 22000 + Math.floor(r() * 92000);
  const mileage = {
    totalKm: 180000 + Math.floor(r() * 145000),
    sincePOH,
    targetPOH: target,
    deviation: sincePOH - target,
    high: sincePOH > 96000,
  };

  // Cleaning
  const lastCleanDaysAgo = Math.floor(r() * 13);
  const cleaning = {
    lastDeepClean: addDays(dateStr, -lastCleanDaysAgo),
    daysAgo: lastCleanDaysAgo,
    due: lastCleanDaysAgo > 7,
    bay: `Wash Bay ${1 + Math.floor(r() * 3)}`,
  };

  // Stabling
  const stabling = {
    depot: f.depot,
    depotId: depotObj.id,
    line: `Line ${1 + Math.floor(r() * 6)}`,
    position: 1 + Math.floor(r() * 8),
    conflict: r() < 0.1,
  };

  // ---- Decision logic (explainable) ----
  const reasons = [];
  let status;

  const push = (key, state, detail) => reasons.push({ key, state, detail });

  if (fitness.expired) push("fitness", "block", `Fitness certificate expired ${Math.abs(daysLeft)} day(s) ago`);
  else push("fitness", daysLeft <= 14 ? "warn" : "ok", `Valid until ${fitness.validUntil} (${daysLeft} days left)`);

  if (jobcards.critical) push("jobcards", "block", `Open safety-critical job card — ${jobcards.system}`);
  else push("jobcards", jobcards.open ? "warn" : "ok", jobcards.open ? `${jobcards.open} open job card(s)` : "No open job cards");

  push("branding", branding.shortfall ? "warn" : "ok",
    `${branding.advertiser}: ${branding.deliveredHours}/${branding.committedHours} h delivered`);
  push("mileage", mileage.high ? "warn" : "ok",
    `${mileage.sincePOH.toLocaleString()} km since POH (target ${target.toLocaleString()})`);
  push("cleaning", cleaning.due ? "warn" : "ok",
    cleaning.due ? `Deep-clean overdue (${cleaning.daysAgo} days)` : `Cleaned ${cleaning.daysAgo} day(s) ago`);
  push("stabling", stabling.conflict ? "warn" : "ok",
    `${stabling.depot} · ${stabling.line} · Pos ${stabling.position}`);

  const blockers = reasons.filter((x) => x.state === "block");

  // STANDBY only for genuine hold reasons (overdue deep-clean, mileage well over
  // target, or a stabling conflict). Soft flags like branding shortfall or a
  // minor open job card stay SERVICE (advisory only).
  const standbyHold =
    !blockers.length &&
    ((cleaning.due && cleaning.daysAgo > 10) || mileage.sincePOH > 104000 || stabling.conflict);

  if (blockers.length) status = "IBL";
  else if (standbyHold) status = "STANDBY";
  else status = "SERVICE";

  const warnings = reasons.filter((x) => x.state === "warn");

  const summary =
    status === "IBL"
      ? blockers[0].detail
      : status === "STANDBY"
      ? warnings.map((w) => w.detail).slice(0, 2).join("; ")
      : "All fitness, maintenance and cleaning checks cleared";

  return { train_id: ts, date: dateStr, status, summary, reasons, variables: { fitness, jobcards, branding, mileage, cleaning, stabling } };
}

export function buildPlan(dateStr) {
  return TRAINSETS.map((ts) => buildTrainset(ts, dateStr));
}

// Source documents referenced by the induction plan (real dataset file names).
const DOC_CATS = [
  { key: "fitness", code: "FIT", cat: "Fitness Certificate" },
  { key: "jobcards", code: "JOB", cat: "Job Card" },
  { key: "branding", code: "BRD", cat: "Branding Contract" },
  { key: "mileage", code: "MIL", cat: "Mileage Record" },
  { key: "cleaning", code: "CLN", cat: "Cleaning Slot" },
  { key: "stabling", code: "STB", cat: "Stabling Geometry" },
];

export function buildDocuments() {
  const docs = [];
  const base = new Date();
  TRAINSETS.forEach((ts, i) => {
    const f = FITNESS[ts];
    DOC_CATS.forEach((c, j) => {
      const fileName =
        c.key === "fitness"
          ? `${ts}_fitness_cert_${f.lang}.pdf`
          : `${ts}_${c.key === "jobcards" ? "job_card" : c.key === "branding" ? "branding" : c.key === "mileage" ? "mileage" : c.key === "cleaning" ? "cleaning" : "stabling"}.pdf`;
      const ts2 = new Date(base.getTime() - (i * 6 + j) * 3600000);
      docs.push({
        document_id: `KMRL-${ts}-${c.code}`,
        trainset: ts,
        category: c.cat,
        file_name: fileName,
        uploaded_at: ts2.toISOString(),
        status: "UNVERIFIED",
      });
    });
  });
  return docs;
}
