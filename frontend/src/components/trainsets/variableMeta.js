import { ShieldCheck, Wrench, Megaphone, Gauge, Sparkles, SquareParking } from "lucide-react";

export const VARIABLE_META = {
  fitness: { icon: ShieldCheck, labelKey: "var_fitness" },
  jobcards: { icon: Wrench, labelKey: "var_jobcards" },
  branding: { icon: Megaphone, labelKey: "var_branding" },
  mileage: { icon: Gauge, labelKey: "var_mileage" },
  cleaning: { icon: Sparkles, labelKey: "var_cleaning" },
  stabling: { icon: SquareParking, labelKey: "var_stabling" },
};

export const VAR_ORDER = ["fitness", "jobcards", "branding", "mileage", "cleaning", "stabling"];

export function stateTone(state) {
  if (state === "block") return "destructive";
  if (state === "warn") return "warning";
  return "success";
}

// Renders the extracted value for a variable as short label/value pairs.
export function variableRows(key, v, t) {
  switch (key) {
    case "fitness":
      return [
        [t("d_depot"), v.depot],
        [t("d_valid_until"), v.validUntil],
        [v.expired ? t("d_expired") : t("d_days_left"), v.expired ? t("d_yes") : String(v.daysLeft)],
      ];
    case "jobcards":
      return [
        [t("d_open_cards"), String(v.open)],
        [t("d_closed_cards"), String(v.closed)],
        [t("d_critical"), v.critical ? `${t("d_yes")} · ${v.system}` : t("d_no")],
      ];
    case "branding":
      return [
        [t("d_advertiser"), v.advertiser],
        [t("d_committed"), `${v.committedHours} ${t("d_hours")}`],
        [t("d_delivered"), `${v.deliveredHours} ${t("d_hours")}`],
      ];
    case "mileage":
      return [
        [t("d_total_km"), `${v.totalKm.toLocaleString()} km`],
        [t("d_since_poh"), `${v.sincePOH.toLocaleString()} km`],
        [t("d_target"), `${v.targetPOH.toLocaleString()} km`],
      ];
    case "cleaning":
      return [
        [t("d_last_clean"), v.lastDeepClean],
        ["Bay", v.bay],
      ];
    case "stabling":
      return [
        [t("d_depot"), v.depot],
        [t("d_line"), v.line],
        [t("d_position"), String(v.position)],
      ];
    default:
      return [];
  }
}
