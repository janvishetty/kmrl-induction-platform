import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  MAINTENANCE_SITES,
  MAP_ALERTS,
  NETWORK_STATUS,
  ROUTE,
  STATIONS,
  TRAINS,
  nearestStation,
  nextStation,
  pointOnRoute,
  stateColor,
  type OpsState,
  type TrainUnit,
} from "@/lib/kmrl/network";
import { useApp } from "@/lib/kmrl/store";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  LocateFixed,
  Frame,
  Layers,
  Play,
  Pause,
  MessageSquare,
} from "lucide-react";

const KOCHI_CENTER: [number, number] = [10.03, 76.315];

type LayerKey = "stations" | "trains" | "maintenance" | "alerts";

const RAIL = "#3f8fa3";

function trainIcon(t: TrainUnit, highlighted: boolean, dark: boolean) {
  const chrome = dark ? "rgba(12,20,28,.92)" : "rgba(255,255,255,.95)";
  const color = t.status === "IBL" ? stateColor.critical : t.condition === "warning" ? stateColor.warning : RAIL;
  return L.divIcon({
    className: "",
    iconSize: [58, 22],
    iconAnchor: [29, 11],
    html: `<div style="display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:6px;
      background:${chrome};border:1px solid ${color};color:${color};
      font:600 10px/1 'IBM Plex Mono',monospace;white-space:nowrap;
      box-shadow:${highlighted ? `0 0 0 3px ${color}55, 0 0 14px ${color}` : "0 1px 4px rgba(0,0,0,.5)"};">
      <span style="width:6px;height:6px;border-radius:9px;background:${color}"></span>${t.id.replace("KMRL-", "")}
    </div>`,
  });
}

function shapeIcon(kind: "maintenance" | "alert", state: OpsState, highlighted: boolean, dark: boolean) {
  const chrome = dark ? "rgba(12,20,28,.92)" : "rgba(255,255,255,.95)";
  const color = stateColor[state];
  const glyph = kind === "maintenance" ? "&#9881;" : "!";
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;display:grid;place-items:center;color:${color};
      background:${chrome};border:1px solid ${color};
      border-radius:${kind === "maintenance" ? "5px" : "11px"};font:700 12px/1 'IBM Plex Mono',monospace;
      box-shadow:${highlighted ? `0 0 0 4px ${color}44, 0 0 16px ${color}` : "0 1px 4px rgba(0,0,0,.5)"};">${glyph}</div>`,
  });
}

function StatePill({ state, label }: { state: OpsState; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ color: stateColor[state], background: `${stateColor[state]}1f`, border: `1px solid ${stateColor[state]}55` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: stateColor[state] }} />
      {label}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 py-0.5 text-[11px]">
      <span className="w-24 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="flex-1 text-foreground">{v}</span>
    </div>
  );
}

function MapBridge({
  onReady,
}: {
  onReady: (m: L.Map) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    setTimeout(() => map.invalidateSize(), 200);
  }, [map, onReady]);
  return null;
}

export default function SmartMapView() {
  const { mapFocus, setMapFocus, askKoraAbout, theme } = useApp();
  const dark = theme === "dark";
  const [trains, setTrains] = useState<TrainUnit[]>(() => TRAINS.map((t) => ({ ...t })));
  const [running, setRunning] = useState(true);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    stations: true,
    trains: true,
    maintenance: true,
    alerts: true,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Train movement simulation
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTrains((prev) =>
        prev.map((t) => {
          if (t.speedKph === 0) return t;
          let p = t.progress + (t.direction * t.speedKph) / 42000;
          let dir = t.direction;
          if (p >= 1) { p = 1; dir = -1; }
          if (p <= 0) { p = 0; dir = 1; }
          return { ...t, progress: p, direction: dir as 1 | -1 };
        }),
      );
    }, 700);
    return () => clearInterval(id);
  }, [running]);

  const highlighted = useMemo(() => new Set(mapFocus?.ids ?? []), [mapFocus]);

  const fitRoute = useCallback(() => {
    mapRef.current?.fitBounds(L.latLngBounds(ROUTE.map((p) => L.latLng(p[0], p[1]))), { padding: [50, 50] });
  }, []);

  // React to KORA focus requests
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapFocus) return;
    const pts: [number, number][] = [];
    if (mapFocus.kind === "station") STATIONS.filter((s) => highlighted.has(s.id)).forEach((s) => pts.push([s.lat, s.lng]));
    if (mapFocus.kind === "maintenance") MAINTENANCE_SITES.filter((m) => highlighted.has(m.id)).forEach((m) => pts.push([m.lat, m.lng]));
    if (mapFocus.kind === "alert") MAP_ALERTS.filter((a) => highlighted.has(a.id)).forEach((a) => pts.push([a.lat, a.lng]));
    if (mapFocus.kind === "train")
      trains.filter((t) => highlighted.has(t.id)).forEach((t) => pts.push(pointOnRoute(t.progress)));
    if (mapFocus.kind === "network" || pts.length === 0) {
      fitRoute();
      return;
    }
    if (pts.length === 1) map.flyTo(pts[0]!, 15, { duration: 0.9 });
    else map.flyToBounds(L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1]))), { padding: [70, 70], duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFocus?.ts]);

  const toggleFullscreen = () => {
    setFullscreen((f) => !f);
    setTimeout(() => mapRef.current?.invalidateSize(), 250);
  };

  const ctrlBtn =
    "grid size-9 place-items-center rounded-md border border-border bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:border-primary/60 hover:text-primary";

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card",
        fullscreen ? "fixed inset-0 z-50 rounded-none" : "h-[68vh] min-h-[520px] w-full",
      )}
    >
      <MapContainer
        center={KOCHI_CENTER}
        zoom={12}
        zoomControl={false}
        scrollWheelZoom
        className="size-full"
        style={{ background: "var(--map-surface)" }}
      >
        <MapBridge onReady={(m) => (mapRef.current = m)} />
        <TileLayer
          key={dark ? "dark" : "light"}
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url={`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`}
        />

        <Polyline positions={ROUTE} pathOptions={{ color: dark ? "#0e3b45" : "#cfdde1", weight: 11, opacity: 0.9, lineCap: "round" }} />
        <Polyline positions={ROUTE} pathOptions={{ color: RAIL, weight: 4, opacity: 0.95, lineCap: "round" }} />

        {layers.stations &&
          STATIONS.map((s) => {
            const hl = highlighted.has(s.id);
            return (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={hl ? 11 : s.interchange ? 8 : 6}
                pathOptions={{
                  color: stateColor[s.state],
                  weight: hl ? 4 : 2,
                  fillColor: "#0b1218",
                  fillOpacity: 1,
                }}
              >
                <Popup minWidth={280}>
                  <div className="space-y-2 font-sans">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {s.code} · Station {s.id}
                        </p>
                      </div>
                      <StatePill state={s.state} label={s.state} />
                    </div>
                    <div className="border-t border-border pt-1">
                      <Row k="Platforms" v={s.platformStatus} />
                      <Row k="Active trains" v={s.activeTrains.length ? s.activeTrains.join(", ") : "None at platform"} />
                      <Row k="Passengers" v={s.footfall} />
                      <Row k="Maintenance" v={s.maintenance} />
                      <Row k="Alerts" v={s.alerts.length ? s.alerts.join(" · ") : "No open alerts"} />
                    </div>
                    <button
                      onClick={() => askKoraAbout(`What is the status of ${s.name}?`)}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      <MessageSquare className="size-3" /> Ask KORA about this
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {layers.trains &&
          trains.map((t) => {
            const pos = pointOnRoute(t.progress);
            const near = nearestStation(t.progress);
            const nxt = nextStation(t.progress, t.direction);
            return (
              <Marker key={t.id} position={pos} icon={trainIcon(t, highlighted.has(t.id), dark)} zIndexOffset={500}>
                <Popup minWidth={280}>
                  <div className="space-y-2 font-sans">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{t.id}</p>
                      <StatePill
                        state={t.status === "IBL" ? "critical" : t.status === "STANDBY" ? "warning" : "normal"}
                        label={t.status}
                      />
                    </div>
                    <div className="border-t border-border pt-1">
                      <Row k="Location" v={`Near ${near.name}`} />
                      <Row k="Next stop" v={t.speedKph > 0 ? nxt.name : "Stationary"} />
                      <Row k="Speed" v={`${t.speedKph} km/h`} />
                      <Row k="Condition" v={t.conditionNote} />
                      <Row k="Assignment" v={t.assignment} />
                      <Row k="Operator" v={t.driver} />
                      <Row k="Occupancy" v={t.occupancy} />
                    </div>
                    <button
                      onClick={() => askKoraAbout(`Where is train ${t.id}?`)}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      <MessageSquare className="size-3" /> Ask KORA about this
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {layers.maintenance &&
          MAINTENANCE_SITES.map((m) => (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={shapeIcon("maintenance", m.state, highlighted.has(m.id), dark)}
              zIndexOffset={300}
            >
              <Popup minWidth={280}>
                <div className="space-y-2 font-sans">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <StatePill state={m.state} label={m.priority} />
                  </div>
                  <div className="border-t border-border pt-1">
                    <Row k="Work order" v={m.workOrder} />
                    <Row k="Type" v={m.maintenanceType} />
                    <Row k="Team" v={m.team} />
                    <Row k="Status" v={m.status} />
                    <Row k="ETA" v={m.expectedCompletion} />
                  </div>
                  <button
                    onClick={() => askKoraAbout(`Which maintenance locations are active?`)}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                  >
                    <MessageSquare className="size-3" /> Ask KORA about this
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {layers.alerts &&
          MAP_ALERTS.map((a) => (
            <Marker
              key={a.id}
              position={[a.lat, a.lng]}
              icon={shapeIcon("alert", a.severity, highlighted.has(a.id), dark)}
              zIndexOffset={700}
            >
              <Popup minWidth={280}>
                <div className="space-y-2 font-sans">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{a.location}</p>
                    <StatePill state={a.severity} label={a.severity} />
                  </div>
                  <div className="border-t border-border pt-1">
                    <Row k="Description" v={a.description} />
                    <Row k="Affects" v={a.affects} />
                    <Row k="Response" v={a.response} />
                    <Row k="Raised" v={a.raisedAt} />
                  </div>
                  <button
                    onClick={() => askKoraAbout(`What's happening at ${a.location}?`)}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                  >
                    <MessageSquare className="size-3" /> Ask KORA about this
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Network status overlay */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] w-56 rounded-md border border-border bg-card/90 p-3 backdrop-blur">
        <p className="mono-label mb-2">Network status</p>
        <div className="space-y-1.5 text-xs">
          {[
            { l: "Stations", v: NETWORK_STATUS.stations, c: RAIL },
            { l: "Trains in service", v: NETWORK_STATUS.inService, c: stateColor.normal },
            { l: "Under maintenance", v: NETWORK_STATUS.underMaintenance, c: stateColor.warning },
            { l: "Active alerts", v: NETWORK_STATUS.activeAlerts, c: stateColor.critical },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between">
              <span className="text-muted-foreground">{r.l}</span>
              <span className="font-mono font-semibold" style={{ color: r.c }}>
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Layers + legend */}
      <div className="absolute bottom-3 left-3 z-[1000] w-56 rounded-md border border-border bg-card/90 p-3 backdrop-blur">
        <p className="mono-label mb-2 flex items-center gap-1.5">
          <Layers className="size-3" /> Layers
        </p>
        <div className="space-y-1">
          {(
            [
              ["stations", "Metro stations"],
              ["trains", "Active trainsets"],
              ["maintenance", "Maintenance / IBL"],
              ["alerts", "Operational alerts"],
            ] as [LayerKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setLayers((p) => ({ ...p, [k]: !p[k] }))}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-secondary/60"
            >
              <span
                className={cn(
                  "grid size-3.5 place-items-center rounded-[3px] border text-[9px]",
                  layers[k] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                )}
              >
                ✓
              </span>
              <span className={layers[k] ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-2">
          <p className="mono-label mb-1.5">Legend</p>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            {(
              [
                ["normal", "Normal"],
                ["warning", "Warning"],
                ["critical", "Critical"],
              ] as [OpsState, string][]
            ).map(([s, l]) => (
              <div key={s} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: stateColor[s] }} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
        <button className={ctrlBtn} title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus className="size-4" />
        </button>
        <button className={ctrlBtn} title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus className="size-4" />
        </button>
        <button
          className={ctrlBtn}
          title="Reset to Kochi"
          onClick={() => {
            setMapFocus(null);
            mapRef.current?.flyTo(KOCHI_CENTER, 12, { duration: 0.8 });
          }}
        >
          <LocateFixed className="size-4" />
        </button>
        <button className={ctrlBtn} title="Fit entire route" onClick={fitRoute}>
          <Frame className="size-4" />
        </button>
        <button className={ctrlBtn} title="Fullscreen" onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button
          className={ctrlBtn}
          title={running ? "Pause simulation" : "Resume simulation"}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      {mapFocus && mapFocus.ids.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary backdrop-blur">
          Highlighting {mapFocus.ids.length} {mapFocus.kind}
          {mapFocus.ids.length > 1 ? "s" : ""} from KORA
          <button className="rounded border border-primary/40 px-1.5 py-0.5" onClick={() => setMapFocus(null)}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
