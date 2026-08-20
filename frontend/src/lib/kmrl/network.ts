// Kochi Metro network mock data for the SmartMap + KORA assistant.

export type OpsState = "normal" | "warning" | "critical";

export interface Station {
  id: string;
  name: string;
  nameMl: string;
  lat: number;
  lng: number;
  code: string;
  state: OpsState;
  platformStatus: string;
  footfall: string;
  activeTrains: string[];
  maintenance: string;
  alerts: string[];
  interchange?: boolean;
}

export interface TrainUnit {
  id: string;
  status: "SERVICE" | "STANDBY" | "IBL";
  /** progress along the corridor 0..1 */
  progress: number;
  /** +1 towards Petta, -1 towards Aluva */
  direction: 1 | -1;
  speedKph: number;
  condition: OpsState;
  conditionNote: string;
  assignment: string;
  driver: string;
  occupancy: string;
}

export interface MaintenanceSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  workOrder: string;
  maintenanceType: string;
  team: string;
  priority: "High" | "Medium" | "Low";
  status: "In Progress" | "Scheduled" | "Awaiting Parts";
  expectedCompletion: string;
  state: OpsState;
}

export interface MapAlert {
  id: string;
  severity: OpsState;
  lat: number;
  lng: number;
  location: string;
  description: string;
  affects: string;
  response: string;
  raisedAt: string;
}

export const STATIONS: Station[] = [
  {
    id: "ST-01", code: "ALV", name: "Aluva", nameMl: "ആലുവ", lat: 10.1099, lng: 76.351,
    state: "warning", platformStatus: "Platform 2 PSD 4B under observation", footfall: "High — 6.4k/hr",
    activeTrains: ["KMRL-201"], maintenance: "PSD sensor recalibration pending",
    alerts: ["Incident report PSD 4B awaiting human verification"],
  },
  {
    id: "ST-02", code: "PNC", name: "Pulinchodu", nameMl: "പുളിഞ്ചോട്", lat: 10.0946, lng: 76.347,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Low — 0.9k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-03", code: "CPY", name: "Companypady", nameMl: "കമ്പനിപ്പടി", lat: 10.0872, lng: 76.3437,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Low — 1.1k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-04", code: "AMB", name: "Ambattukavu", nameMl: "അമ്പാട്ടുകാവ്", lat: 10.0797, lng: 76.3406,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Low — 1.0k/hr",
    activeTrains: ["KMRL-207"], maintenance: "None", alerts: [],
  },
  {
    id: "ST-05", code: "MUT", name: "Muttom", nameMl: "മുട്ടം", lat: 10.0729, lng: 76.3363,
    state: "critical", platformStatus: "Depot access line restricted", footfall: "Medium — 2.2k/hr",
    activeTrains: ["KMRL-204", "KMRL-211"], maintenance: "IBL bay 3 occupied — ATP transponder swap",
    alerts: ["Safety-critical job card JC-4471 open beyond SLA (TS-11)"],
  },
  {
    id: "ST-06", code: "KLM", name: "Kalamassery", nameMl: "കളമശ്ശേരി", lat: 10.063, lng: 76.3277,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Medium — 2.8k/hr",
    activeTrains: [], maintenance: "Yard stabling line 2 cleaning cycle", alerts: [],
  },
  {
    id: "ST-07", code: "CUS", name: "Cochin University", nameMl: "കൊച്ചിൻ യൂണിവേഴ്സിറ്റി", lat: 10.047, lng: 76.3183,
    state: "normal", platformStatus: "Both platforms clear", footfall: "High — 5.1k/hr",
    activeTrains: ["KMRL-209"], maintenance: "None", alerts: [],
  },
  {
    id: "ST-08", code: "PDP", name: "Pathadipalam", nameMl: "പാതാടിപ്പാലം", lat: 10.0369, lng: 76.3117,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Low — 1.4k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-09", code: "EDP", name: "Edappally", nameMl: "ഇടപ്പള്ളി", lat: 10.0257, lng: 76.3086,
    state: "warning", platformStatus: "Lift 2 out of service", footfall: "High — 5.8k/hr",
    activeTrains: ["KMRL-202"], maintenance: "Lift OEM visit scheduled 18 Aug",
    alerts: ["Accessibility lift unavailable — staff escort deployed"],
  },
  {
    id: "ST-10", code: "CGP", name: "Changampuzha Park", nameMl: "ചങ്ങമ്പുഴ പാർക്ക്", lat: 10.0184, lng: 76.3021,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Medium — 2.0k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-11", code: "PLV", name: "Palarivattom", nameMl: "പാലാരിവട്ടം", lat: 10.0067, lng: 76.305,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Medium — 3.2k/hr",
    activeTrains: ["KMRL-205"], maintenance: "None", alerts: [],
  },
  {
    id: "ST-12", code: "JLN", name: "Jawaharlal Nehru Stadium", nameMl: "ജവഹർലാൽ നെഹ്‌റു സ്റ്റേഡിയം", lat: 9.9979, lng: 76.2996,
    state: "warning", platformStatus: "Event surge control active", footfall: "Very high — 7.9k/hr",
    activeTrains: [], maintenance: "None", alerts: ["Crowd surge expected 20:30 — additional standby requested"],
  },
  {
    id: "ST-13", code: "KLR", name: "Kaloor", nameMl: "കലൂർ", lat: 9.9926, lng: 76.2952,
    state: "normal", platformStatus: "Both platforms clear", footfall: "High — 4.6k/hr",
    activeTrains: ["KMRL-203"], maintenance: "None", alerts: [],
  },
  {
    id: "ST-14", code: "MGR", name: "MG Road", nameMl: "എം.ജി റോഡ്", lat: 9.982, lng: 76.2836,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Very high — 7.2k/hr",
    activeTrains: ["KMRL-206"], maintenance: "None", alerts: [],
  },
  {
    id: "ST-15", code: "MHC", name: "Maharaja's College", nameMl: "മഹാരാജാസ് കോളേജ്", lat: 9.9755, lng: 76.2846,
    state: "normal", platformStatus: "Both platforms clear", footfall: "High — 4.9k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-16", code: "ERS", name: "Ernakulam South", nameMl: "എറണാകുളം സൗത്ത്", lat: 9.97, lng: 76.287,
    state: "normal", platformStatus: "Both platforms clear", footfall: "High — 5.4k/hr",
    activeTrains: ["KMRL-208"], maintenance: "None", alerts: [], interchange: true,
  },
  {
    id: "ST-17", code: "KDV", name: "Kadavanthra", nameMl: "കടവന്ത്ര", lat: 9.966, lng: 76.2985,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Medium — 2.6k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-18", code: "ELM", name: "Elamkulam", nameMl: "ഇളംകുളം", lat: 9.9647, lng: 76.306,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Low — 1.6k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-19", code: "VYT", name: "Vyttila", nameMl: "വൈറ്റില", lat: 9.9673, lng: 76.3186,
    state: "critical", platformStatus: "Platform 1 signalling degraded — manual authority",
    footfall: "Very high — 8.3k/hr", activeTrains: ["KMRL-210"],
    maintenance: "S&T team on site — CBTC radio fault",
    alerts: ["CBTC radio dropout — headway extended to 9 min"], interchange: true,
  },
  {
    id: "ST-20", code: "THK", name: "Thaikoodam", nameMl: "തൈക്കൂടം", lat: 9.9598, lng: 76.323,
    state: "normal", platformStatus: "Both platforms clear", footfall: "Low — 1.2k/hr",
    activeTrains: [], maintenance: "None", alerts: [],
  },
  {
    id: "ST-21", code: "PET", name: "Petta", nameMl: "പേട്ട", lat: 9.954, lng: 76.3268,
    state: "normal", platformStatus: "Terminal reversal normal", footfall: "Medium — 2.4k/hr",
    activeTrains: ["KMRL-212"], maintenance: "None", alerts: [],
  },
];

export const ROUTE: [number, number][] = STATIONS.map((s) => [s.lat, s.lng]);

export const TRAINS: TrainUnit[] = [
  { id: "KMRL-201", status: "SERVICE", progress: 0.02, direction: 1, speedKph: 34, condition: "normal", conditionNote: "All systems nominal", assignment: "Run 41 · Aluva → Petta", driver: "Anand Menon", occupancy: "62%" },
  { id: "KMRL-202", status: "SERVICE", progress: 0.4, direction: -1, speedKph: 41, condition: "normal", conditionNote: "All systems nominal", assignment: "Run 38 · Petta → Aluva", driver: "Reshma Pillai", occupancy: "71%" },
  { id: "KMRL-203", status: "SERVICE", progress: 0.6, direction: 1, speedKph: 28, condition: "warning", conditionNote: "HVAC coach 2 running warm", assignment: "Run 44 · Aluva → Petta", driver: "Vinod Thomas", occupancy: "80%" },
  { id: "KMRL-204", status: "IBL", progress: 0.2, direction: 1, speedKph: 0, condition: "critical", conditionNote: "ATP transponder replacement JC-4471 open", assignment: "Muttom IBL bay 3", driver: "—", occupancy: "0%" },
  { id: "KMRL-205", status: "SERVICE", progress: 0.5, direction: 1, speedKph: 45, condition: "normal", conditionNote: "All systems nominal", assignment: "Run 46 · Aluva → Petta", driver: "Sneha Raj", occupancy: "55%" },
  { id: "KMRL-206", status: "SERVICE", progress: 0.66, direction: -1, speedKph: 37, condition: "normal", conditionNote: "All systems nominal", assignment: "Run 39 · Petta → Aluva", driver: "Jithin Das", occupancy: "68%" },
  { id: "KMRL-207", status: "STANDBY", progress: 0.15, direction: 1, speedKph: 0, condition: "normal", conditionNote: "Held at Ambattukavu siding", assignment: "Standby pool A", driver: "Fathima Noushad", occupancy: "0%" },
  { id: "KMRL-208", status: "SERVICE", progress: 0.75, direction: 1, speedKph: 39, condition: "normal", conditionNote: "All systems nominal", assignment: "Run 48 · Aluva → Petta", driver: "Rahul Nair", occupancy: "74%" },
  { id: "KMRL-209", status: "SERVICE", progress: 0.3, direction: -1, speedKph: 43, condition: "normal", conditionNote: "All systems nominal", assignment: "Run 37 · Petta → Aluva", driver: "Meera Suresh", occupancy: "49%" },
  { id: "KMRL-210", status: "SERVICE", progress: 0.9, direction: 1, speedKph: 18, condition: "warning", conditionNote: "Reduced speed through Vyttila radio gap", assignment: "Run 50 · Aluva → Petta", driver: "Arun Kumar", occupancy: "86%" },
  { id: "KMRL-211", status: "IBL", progress: 0.21, direction: 1, speedKph: 0, condition: "warning", conditionNote: "Scheduled B-check, brake pad renewal", assignment: "Muttom IBL bay 1", driver: "—", occupancy: "0%" },
  { id: "KMRL-212", status: "STANDBY", progress: 0.99, direction: -1, speedKph: 0, condition: "normal", conditionNote: "Terminal standby at Petta", assignment: "Standby pool B", driver: "Joseph Kurian", occupancy: "0%" },
];

export const MAINTENANCE_SITES: MaintenanceSite[] = [
  {
    id: "MW-01", name: "Muttom Depot — IBL Bay 3", lat: 10.0715, lng: 76.3338,
    workOrder: "JC-4471", maintenanceType: "ATP transponder replacement", team: "Rolling Stock Team A",
    priority: "High", status: "In Progress", expectedCompletion: "17 Aug 2026, 04:30 IST", state: "critical",
  },
  {
    id: "MW-02", name: "Vyttila — Trackside S&T Cabinet", lat: 9.9682, lng: 76.3198,
    workOrder: "WO-8812", maintenanceType: "CBTC radio antenna alignment", team: "Signalling & Telecom Team C",
    priority: "High", status: "In Progress", expectedCompletion: "16 Aug 2026, 23:45 IST", state: "warning",
  },
  {
    id: "MW-03", name: "Kalamassery Yard — Stabling Line 2", lat: 10.0641, lng: 76.3262,
    workOrder: "WO-8790", maintenanceType: "Deep cleaning & branding wrap check", team: "Housekeeping Unit 2",
    priority: "Medium", status: "Scheduled", expectedCompletion: "17 Aug 2026, 06:00 IST", state: "normal",
  },
  {
    id: "MW-04", name: "Aluva — Platform 2 PSD 4B", lat: 10.1092, lng: 76.3521,
    workOrder: "WO-8801", maintenanceType: "Platform screen door sensor recalibration", team: "Station Systems Team B",
    priority: "Medium", status: "Awaiting Parts", expectedCompletion: "19 Aug 2026, 14:00 IST", state: "warning",
  },
];

export const MAP_ALERTS: MapAlert[] = [
  {
    id: "MA-01", severity: "critical", lat: 10.0736, lng: 76.3375, location: "Muttom",
    description: "Safety-critical job card JC-4471 open beyond the 24-hour SLA, blocking TS-11 induction into SERVICE.",
    affects: "KMRL-204 / TS-11", response: "Rolling Stock Team A on site — escalated to Duty Controller",
    raisedAt: "15 Aug 2026, 19:10 IST",
  },
  {
    id: "MA-02", severity: "critical", lat: 9.9666, lng: 76.3176, location: "Vyttila",
    description: "CBTC radio dropout on Platform 1; trains operating on manual authority with 9-minute headway.",
    affects: "Vyttila station / KMRL-210", response: "S&T Team C executing antenna alignment",
    raisedAt: "16 Aug 2026, 20:05 IST",
  },
  {
    id: "MA-03", severity: "warning", lat: 10.0263, lng: 76.3095, location: "Edappally",
    description: "Accessibility lift 2 out of service; staff escort deployed for assisted passengers.",
    affects: "Edappally station", response: "OEM visit scheduled 18 Aug", raisedAt: "16 Aug 2026, 11:20 IST",
  },
  {
    id: "MA-04", severity: "warning", lat: 9.9986, lng: 76.3006, location: "Jawaharlal Nehru Stadium",
    description: "Crowd surge expected at 20:30 after stadium event; queue management activated.",
    affects: "JLN Stadium station", response: "Standby train KMRL-207 earmarked for extra trip",
    raisedAt: "16 Aug 2026, 18:40 IST",
  },
  {
    id: "MA-05", severity: "warning", lat: 10.1104, lng: 76.3502, location: "Aluva",
    description: "Handwritten Malayalam incident log for PSD 4B indexed at 72% OCR confidence; awaiting verification.",
    affects: "Aluva station", response: "Queued for Safety & Compliance review",
    raisedAt: "13 Aug 2026, 08:00 IST",
  },
];

export const NETWORK_STATUS = {
  stations: STATIONS.length,
  inService: 24,
  underMaintenance: 3,
  activeAlerts: 5,
};

/** Interpolate a lat/lng along the corridor for progress 0..1 */
export function pointOnRoute(progress: number): [number, number] {
  const p = Math.min(0.9999, Math.max(0, progress));
  const seg = p * (ROUTE.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = ROUTE[i]!;
  const b = ROUTE[Math.min(ROUTE.length - 1, i + 1)]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export function nearestStation(progress: number): Station {
  const idx = Math.round(progress * (STATIONS.length - 1));
  return STATIONS[Math.min(STATIONS.length - 1, Math.max(0, idx))]!;
}

export function nextStation(progress: number, direction: 1 | -1): Station {
  const seg = progress * (STATIONS.length - 1);
  const idx = direction === 1 ? Math.ceil(seg + 0.001) : Math.floor(seg - 0.001);
  return STATIONS[Math.min(STATIONS.length - 1, Math.max(0, idx))]!;
}

export const stateColor: Record<OpsState, string> = {
  normal: "#5a9e80",
  warning: "#c09340",
  critical: "#c2604f",
};
