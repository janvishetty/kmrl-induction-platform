// KORA — KMRL Operations & Rail Assistant. Rule-based operational copilot over mock data.

import {
  MAINTENANCE_SITES,
  MAP_ALERTS,
  NETWORK_STATUS,
  STATIONS,
  TRAINS,
  nearestStation,
  nextStation,
  type OpsState,
} from "./network";
import { staff } from "./data";

export interface KoraAction {
  label: string;
  focus: MapFocus;
}

export interface MapFocus {
  kind: "station" | "train" | "maintenance" | "alert" | "set" | "network";
  ids: string[];
  ts?: number;
}

export interface KoraRow {
  label: string;
  value: string;
  state?: OpsState;
}

export interface KoraReply {
  answer: string;
  rows: KoraRow[];
  actions: KoraAction[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");

function matchStation(q: string) {
  const n = norm(q);
  return STATIONS.find(
    (s) => n.includes(norm(s.name)) || n.includes(s.code.toLowerCase()),
  );
}

function matchTrain(q: string) {
  const n = norm(q).replace(/\s+/g, "");
  return TRAINS.find((t) => n.includes(t.id.toLowerCase().replace(/[^a-z0-9]/g, "")) || n.includes(t.id.split("-")[1]!));
}

export const KORA_SUGGESTIONS = [
  "Which stations currently have critical alerts?",
  "Which trains are under maintenance?",
  "What is the status of Vyttila?",
  "Show me the trains currently in service.",
  "Which maintenance locations are active?",
  "Where are the current operational issues?",
];

export function askKora(question: string): KoraReply {
  const q = norm(question);

  // Specific station
  const st = matchStation(question);
  if (st && !/all stations|every station/.test(q)) {
    return {
      answer: `${st.name} (${st.code}) is currently ${st.state === "normal" ? "operating normally" : st.state === "warning" ? "in a degraded but operational state" : "in a critical operational state"}. ${st.platformStatus}.`,
      rows: [
        { label: "Operational status", value: st.state.toUpperCase(), state: st.state },
        { label: "Passenger load", value: st.footfall },
        { label: "Active trains", value: st.activeTrains.length ? st.activeTrains.join(", ") : "None at platform" },
        { label: "Maintenance", value: st.maintenance },
        { label: "Alerts", value: st.alerts.length ? st.alerts.join(" · ") : "No open alerts" },
      ],
      actions: [{ label: `Focus ${st.name} on SmartMap`, focus: { kind: "station", ids: [st.id] } }],
    };
  }

  // Specific train
  const tr = matchTrain(question);
  if (tr) {
    const near = nearestStation(tr.progress);
    const nxt = nextStation(tr.progress, tr.direction);
    return {
      answer: `${tr.id} is ${tr.status === "IBL" ? "stabled in the inspection bay" : tr.status === "STANDBY" ? "on standby" : "in revenue service"} near ${near.name}.`,
      rows: [
        { label: "Status", value: tr.status, state: tr.status === "IBL" ? "critical" : tr.status === "STANDBY" ? "warning" : "normal" },
        { label: "Current location", value: `Near ${near.name}` },
        { label: "Next station", value: tr.speedKph > 0 ? nxt.name : "Stationary" },
        { label: "Speed", value: `${tr.speedKph} km/h` },
        { label: "Condition", value: tr.conditionNote, state: tr.condition },
        { label: "Assignment", value: tr.assignment },
      ],
      actions: [{ label: `Track ${tr.id} on SmartMap`, focus: { kind: "train", ids: [tr.id] } }],
    };
  }

  // Critical alerts / issues
  if (/critical|issue|problem|alert|wrong|happening/.test(q)) {
    const criticalStations = STATIONS.filter((s) => s.state === "critical");
    const crit = MAP_ALERTS.filter((a) => a.severity === "critical");
    const warn = MAP_ALERTS.filter((a) => a.severity === "warning");
    if (/critical/.test(q)) {
      return {
        answer: `${criticalStations.length} stations currently have critical alerts: ${criticalStations.map((s) => s.name).join(" and ")}.`,
        rows: crit.map((a) => ({ label: a.location, value: a.description, state: a.severity })),
        actions: [
          { label: "View on SmartMap", focus: { kind: "alert", ids: crit.map((a) => a.id) } },
        ],
      };
    }
    return {
      answer: `There are ${MAP_ALERTS.length} active operational alerts across the corridor — ${crit.length} critical and ${warn.length} warnings.`,
      rows: MAP_ALERTS.map((a) => ({ label: `${a.location} · ${a.affects}`, value: a.description, state: a.severity })),
      actions: [
        { label: "View all alerts on SmartMap", focus: { kind: "alert", ids: MAP_ALERTS.map((a) => a.id) } },
        { label: "Focus critical only", focus: { kind: "alert", ids: crit.map((a) => a.id) } },
      ],
    };
  }

  // Maintenance
  if (/maintenance|ibl|work order|repair|depot/.test(q)) {
    const ibl = TRAINS.filter((t) => t.status === "IBL");
    const active = MAINTENANCE_SITES.filter((m) => m.status === "In Progress");
    if (/train/.test(q)) {
      return {
        answer: `${ibl.length} trainsets are currently under maintenance (IBL): ${ibl.map((t) => t.id).join(", ")}.`,
        rows: ibl.map((t) => ({ label: t.id, value: `${t.assignment} — ${t.conditionNote}`, state: t.condition })),
        actions: [{ label: "Show IBL trains on SmartMap", focus: { kind: "train", ids: ibl.map((t) => t.id) } }],
      };
    }
    return {
      answer: `${active.length} maintenance locations are active right now, out of ${MAINTENANCE_SITES.length} open work orders.`,
      rows: MAINTENANCE_SITES.map((m) => ({
        label: `${m.workOrder} · ${m.name}`,
        value: `${m.maintenanceType} — ${m.team} · ${m.status} · ETA ${m.expectedCompletion}`,
        state: m.state,
      })),
      actions: [{ label: "View maintenance on SmartMap", focus: { kind: "maintenance", ids: MAINTENANCE_SITES.map((m) => m.id) } }],
    };
  }

  // Trains in service
  if (/service|running|in service|trains/.test(q)) {
    const inSvc = TRAINS.filter((t) => t.status === "SERVICE");
    return {
      answer: `${inSvc.length} trainsets are in revenue service on the Aluva–Petta corridor right now (${NETWORK_STATUS.inService} across the full day roster).`,
      rows: inSvc.map((t) => ({
        label: t.id,
        value: `${t.assignment} · ${t.speedKph} km/h · near ${nearestStation(t.progress).name}`,
        state: t.condition,
      })),
      actions: [{ label: "Show service trains on SmartMap", focus: { kind: "train", ids: inSvc.map((t) => t.id) } }],
    };
  }

  // Staff / induction
  if (/staff|crew|driver|induction|roster|certif/.test(q)) {
    const available = staff.filter((s) => s.availability === "Available");
    return {
      answer: `${available.length} of ${staff.length} staff profiles are currently available for induction duty. Use the Induction Planner for the full explainable recommendation.`,
      rows: staff.slice(0, 5).map((s) => ({
        label: `${s.name} · ${s.role}`,
        value: `${s.availability} · competency ${s.competencyScore}/100 · ${s.certifications.length} certifications`,
        state: s.availability === "Available" ? "normal" : "warning",
      })),
      actions: [],
    };
  }

  // Stations overview
  if (/station/.test(q)) {
    return {
      answer: `The corridor has ${STATIONS.length} stations from Aluva to Petta. ${STATIONS.filter((s) => s.state !== "normal").length} are currently in a non-normal state.`,
      rows: STATIONS.filter((s) => s.state !== "normal").map((s) => ({
        label: s.name,
        value: s.platformStatus,
        state: s.state,
      })),
      actions: [{ label: "Focus affected stations", focus: { kind: "station", ids: STATIONS.filter((s) => s.state !== "normal").map((s) => s.id) } }],
    };
  }

  // Network status / default
  return {
    answer: `Network snapshot: ${NETWORK_STATUS.stations} stations, ${NETWORK_STATUS.inService} trains in service, ${NETWORK_STATUS.underMaintenance} under maintenance and ${NETWORK_STATUS.activeAlerts} active alerts. Ask me about a station, a train, maintenance or alerts.`,
    rows: [
      { label: "Stations", value: `${NETWORK_STATUS.stations} Aluva → Petta` },
      { label: "In service", value: `${NETWORK_STATUS.inService} trainsets`, state: "normal" },
      { label: "Under maintenance", value: `${NETWORK_STATUS.underMaintenance} trainsets`, state: "warning" },
      { label: "Active alerts", value: `${NETWORK_STATUS.activeAlerts} open`, state: "critical" },
    ],
    actions: [{ label: "Open SmartMap", focus: { kind: "network", ids: [] } }],
  };
}
