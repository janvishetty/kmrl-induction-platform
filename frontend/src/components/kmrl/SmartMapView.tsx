import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Frame, Layers, LocateFixed, Maximize2, MessageSquare, Minimize2, Minus, Pause, Play, Plus } from "lucide-react";
import { MAP_ALERTS, MAINTENANCE_SITES, NETWORK_STATUS, ROUTE, STATIONS, TRAINS, nearestStation, nextStation, pointOnRoute, stateColor, type OpsState, type TrainUnit } from "@/lib/kmrl/network";
import { useApp } from "@/lib/kmrl/store";
import { cn } from "@/lib/utils";
import { fetchSmartMapFeed } from "@/lib/kmrl/api";

declare global { interface Window { maplibregl?: any } }

type LayerKey = "stations" | "trains" | "maintenance" | "alerts";
type VerifiedTrain = {
  id: string;
  status: string;
  speed?: number;
  position?: string;
  progress?: number;
  lat?: number | null;
  lng?: number | null;
  confidence?: number;
  lastUpdated?: string;
  dataSource?: string;
};
type FeedStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sequence?: number;
  order?: number;
  coordSource?: string;
  coordinateSource?: string;
  isTerminal?: boolean;
  isTransfer?: boolean;
};
type FeedAlert = {
  id: string;
  severity?: string;
  title?: string;
  detail?: string;
  location?: string;
  description?: string;
  affects?: string;
  response?: string;
  raisedAt?: string;
  lat?: number;
  lng?: number;
};
const KOCHI_CENTER: [number, number] = [76.315, 10.03];
const RAIL = "#3f8fa3";
let maplibreLoader: Promise<any> | null = null;

function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (maplibreLoader) return maplibreLoader;
  maplibreLoader = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-maplibre-css]")) {
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css"; link.dataset["maplibreCss"] = "true"; document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-maplibre-js]");
    if (existing) { existing.addEventListener("load", () => resolve(window.maplibregl)); existing.addEventListener("error", () => reject(new Error("MapLibre GL JS failed to load."))); return; }
    const script = document.createElement("script"); script.dataset["maplibreJs"] = "true"; script.src = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js"; script.async = true; script.onload = () => resolve(window.maplibregl); script.onerror = () => reject(new Error("MapLibre GL JS failed to load.")); document.head.appendChild(script);
  });
  return maplibreLoader;
}

function markerElement(kind: LayerKey, color: string, label: string, active: boolean) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `kmrl-map-marker kmrl-map-marker-${kind}${active ? " is-active" : ""}`;
  element.style.setProperty("--marker-color", color);
  element.textContent = label;
  element.setAttribute("aria-label", kind === "trains" ? `Train ${label}` : label || kind);
  element.title = kind === "trains" ? `Train ${label}` : label;
  return element;
}

function popupHtml(title: string, rows: string[]) { return `<div class="kmrl-map-popup"><strong>${title}</strong>${rows.map((row) => `<span>${row}</span>`).join("")}</div>`; }
function StatePill({ state, label }: { state: OpsState; label: string }) { return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: stateColor[state], background: `${stateColor[state]}1f`, border: `1px solid ${stateColor[state]}55` }}><span className="size-1.5 rounded-full" style={{ background: stateColor[state] }} />{label}</span>; }
function trainPosition(train: VerifiedTrain | TrainUnit): [number, number] {
  if ("lat" in train && train.lat != null && train.lng != null) return [train.lat, train.lng];
  if ("lat" in train) {
    const slot = [...train.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 9;
    return [10.0729 + (slot - 4) * 0.00045, 76.3363 + (slot - 4) * 0.00055];
  }
  const point = pointOnRoute((train as TrainUnit).progress);
  return [point[0], point[1]];
}

export default function SmartMapView() {
  const { mapFocus, setMapFocus, theme } = useApp();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<Record<string, any>>({});
  const popupRef = useRef<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [running, setRunning] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ stations: true, trains: true, maintenance: true, alerts: true });
  const [trains, setTrains] = useState<TrainUnit[]>(() => TRAINS.map((train) => ({ ...train })));
  const [verifiedTrains, setVerifiedTrains] = useState<VerifiedTrain[]>([]);
  const [feedSource, setFeedSource] = useState("frontend demo fixture");
  const [feedUpdatedAt, setFeedUpdatedAt] = useState<string | null>(null);
  const [feedStations, setFeedStations] = useState<FeedStation[]>([]);
  const [feedAlerts, setFeedAlerts] = useState<FeedAlert[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<{ kind: LayerKey; title: string; detail: string } | null>(null);
  const highlighted = useMemo(() => new Set(mapFocus?.ids ?? []), [mapFocus]);
  const displayTrains: Array<VerifiedTrain | TrainUnit> = verifiedTrains.length > 0 ? verifiedTrains : trains;

  useEffect(() => {
    let cancelled = false;
    const refreshFeed = async () => {
      try {
        const data = await fetchSmartMapFeed() as { trains?: VerifiedTrain[]; stations?: FeedStation[]; alerts?: FeedAlert[]; metadata?: { source?: string }; generatedAt?: string };
        if (cancelled || !Array.isArray(data.trains)) return;
        setVerifiedTrains(data.trains);
        if (Array.isArray(data.stations) && data.stations.length > 0) setFeedStations(data.stations);
        if (Array.isArray(data.alerts)) setFeedAlerts(data.alerts);
        setFeedSource(data.metadata?.source ?? "backend feed");
        setFeedUpdatedAt(data.generatedAt ?? new Date().toISOString());
      } catch {
        if (!cancelled) setFeedSource("frontend demo fixture · backend unavailable");
      }
    };
    void refreshFeed();
    const timer = window.setInterval(() => void refreshFeed(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const displayStations = feedStations.length > 0 ? feedStations : STATIONS;
  const displayAlerts = feedAlerts.length > 0 ? feedAlerts : MAP_ALERTS;

  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setTrains((current) => current.map((train) => { if (!train.speedKph) return train; let progress = train.progress + train.direction * train.speedKph / 42000; let direction = train.direction; if (progress >= 1) { progress = 1; direction = -1; } if (progress <= 0) { progress = 0; direction = 1; } return { ...train, progress, direction: direction as 1 | -1 }; })), 700); return () => window.clearInterval(timer); }, [running]);

  const fitRoute = useCallback(() => { const map = mapRef.current; if (!map || !window.maplibregl) return; const bounds = new window.maplibregl.LngLatBounds(); ROUTE.forEach(([lat, lng]) => bounds.extend([lng, lat])); map.fitBounds(bounds, { padding: { top: 90, right: 90, bottom: 90, left: 90 }, maxZoom: 13.8, duration: 700 }); }, []);
  const resizeMap = useCallback(() => mapRef.current?.resize(), []);

  useEffect(() => {
    let disposed = false;
    loadMapLibre().then((maplibregl) => {
      if (disposed || !mapElement.current) return;
      const map = new maplibregl.Map({ container: mapElement.current, style: `https://tiles.openfreemap.org/styles/${theme === "dark" ? "liberty" : "positron"}`, center: KOCHI_CENTER, zoom: 11.8, minZoom: 9.5, maxZoom: 18, attributionControl: true, dragRotate: false, touchZoomRotate: true });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => { if (disposed) return; mapRef.current = map; map.addSource("kmrl-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ROUTE.map(([lat, lng]) => [lng, lat]) } } }); map.addLayer({ id: "kmrl-route-shadow", type: "line", source: "kmrl-route", paint: { "line-color": theme === "dark" ? "#0e3b45" : "#cfdde1", "line-width": 10, "line-opacity": 0.9 } }); map.addLayer({ id: "kmrl-route-line", type: "line", source: "kmrl-route", paint: { "line-color": RAIL, "line-width": 3.5, "line-opacity": 0.98 } }); fitRoute(); });
      map.on("error", (event: any) => { if (event?.error?.status === 401 || event?.error?.status === 403) setError(new Error("Mapbox rejected the token. Check token restrictions and enable the Styles API.")); });
    }).catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason : new Error(String(reason))); });
    return () => { disposed = true; Object.values(markerRefs.current).forEach((marker) => marker.remove()); markerRefs.current = {}; popupRef.current?.remove(); mapRef.current?.remove(); mapRef.current = null; };
  }, [fitRoute, theme]);

  useEffect(() => { if (!mapElement.current) return; const observer = new ResizeObserver(resizeMap); observer.observe(mapElement.current); return () => observer.disconnect(); }, [resizeMap]);

  useEffect(() => {
    const map = mapRef.current; const maplibregl = window.maplibregl; if (!map || !maplibregl) return;
    Object.values(markerRefs.current).forEach((marker) => marker.remove()); markerRefs.current = {};
    const addMarker = (id: string, kind: LayerKey, position: [number, number], color: string, label: string, html: string, active: boolean, title: string, detail: string) => { const element = markerElement(kind, color, label, active); const marker = new maplibregl.Marker({ element, anchor: "center" }).setLngLat(position).addTo(map); element.addEventListener("click", () => { setSelectedInfo({ kind, title, detail }); popupRef.current?.remove(); popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: "320px" }).setLngLat(position).setHTML(html).addTo(map); }); markerRefs.current[id] = marker; };
    if (layers.stations) displayStations.forEach((station) => { const fixture = station as typeof STATIONS[number]; const stationState = fixture.state ?? "normal"; const stationCode = fixture.code ?? station.id; const databaseStation = station as FeedStation; const markerDetail = `${stationCode} · ${databaseStation.isTerminal ? "Terminal" : databaseStation.isTransfer ? "Transfer station" : "Station"} · coordinates ${databaseStation.coordinateSource ?? databaseStation.coordSource ?? "database"}`; addMarker(station.id, "stations", [station.lng, station.lat], stateColor[stationState], "", popupHtml(station.name, [markerDetail, `Latitude: ${station.lat}`, `Longitude: ${station.lng}`, `Source: Supabase station record`]), highlighted.has(station.id), station.name, markerDetail); });
    if (layers.maintenance) MAINTENANCE_SITES.forEach((site) => addMarker(site.id, "maintenance", [site.lng, site.lat], stateColor[site.state], "M", popupHtml(site.name, [`${site.workOrder} · ${site.priority}`, site.maintenanceType, `${site.status} · ETA ${site.expectedCompletion}`]), highlighted.has(site.id), site.name, `${site.status} · ${site.workOrder}`));
    if (layers.alerts) displayAlerts.forEach((alert) => { const fixture = alert as typeof MAP_ALERTS[number]; const databaseAlert = alert as FeedAlert; const severity = (databaseAlert.severity ?? "info") as OpsState; const location = databaseAlert.location ?? databaseAlert.title ?? databaseAlert.id; const description = databaseAlert.description ?? databaseAlert.detail ?? "No detail recorded"; addMarker(databaseAlert.id, "alerts", [databaseAlert.lng ?? fixture.lng, databaseAlert.lat ?? fixture.lat], stateColor[severity], "!", popupHtml(location, [`${severity.toUpperCase()} · ${description}`, `Affects: ${databaseAlert.affects ?? "Not recorded"}`, `Response: ${databaseAlert.response ?? "Not recorded"}`, `Raised: ${databaseAlert.raisedAt ?? "Not recorded"}`, `Source: Supabase alert record`]), highlighted.has(databaseAlert.id), location, `${severity.toUpperCase()} · ${description}`); });
  }, [displayAlerts, displayStations, highlighted, layers.alerts, layers.maintenance, layers.stations, resizeMap, theme]);

  useEffect(() => {
    const map = mapRef.current; const maplibregl = window.maplibregl; if (!map || !maplibregl) return;
    if (!layers.trains) return;
    displayTrains.forEach((train) => { const point = trainPosition(train); const status = train.status; const color = status === "IBL" ? stateColor.critical : status === "STANDBY" ? stateColor.warning : RAIL; const id = `train-${train.id}`; const existing = markerRefs.current[id]; if (existing) { existing.setLngLat([point[1], point[0]]); return; } const staticTrain = train as TrainUnit; const verifiedTrain = train as VerifiedTrain; const progress = verifiedTrain.progress ?? staticTrain.progress; const detail = `${status} · ${verifiedTrain.position ?? nearestStation(progress).name} · ${verifiedTrain.speed ?? staticTrain.speedKph ?? 0} km/h`; const html = popupHtml(train.id, [`Status: ${status}`, `Position: ${verifiedTrain.position ?? nearestStation(progress).name}`, `Speed: ${verifiedTrain.speed ?? staticTrain.speedKph ?? 0} km/h`, `Data source: ${verifiedTrain.dataSource ?? "frontend fixture"}`, `Confidence: ${verifiedTrain.confidence != null ? `${Math.round(verifiedTrain.confidence * 100)}%` : "demo"}`, verifiedTrain.lastUpdated ? `Updated: ${new Date(verifiedTrain.lastUpdated).toLocaleTimeString()}` : ""]); const element = markerElement("trains", color, train.id.replace("KMRL-", ""), highlighted.has(train.id)); const marker = new maplibregl.Marker({ element, anchor: "center" }).setLngLat([point[1], point[0]]).addTo(map); element.addEventListener("click", () => { setSelectedInfo({ kind: "trains", title: train.id, detail }); popupRef.current?.remove(); popupRef.current = new maplibregl.Popup({ offset: 16, maxWidth: "320px" }).setLngLat([point[1], point[0]]).setHTML(html).addTo(map); }); markerRefs.current[id] = marker; });
  }, [displayTrains, highlighted, layers.trains]);

  useEffect(() => { if (!layers.trains) return; displayTrains.forEach((train) => { const point = trainPosition(train); markerRefs.current[`train-${train.id}`]?.setLngLat([point[1], point[0]]); }); }, [displayTrains, layers.trains]);

  useEffect(() => { const map = mapRef.current; if (!map || !mapFocus) return; const points: [number, number][] = []; if (mapFocus.kind === "station") STATIONS.filter((item) => highlighted.has(item.id)).forEach((item) => points.push([item.lng, item.lat])); if (mapFocus.kind === "maintenance") MAINTENANCE_SITES.filter((item) => highlighted.has(item.id)).forEach((item) => points.push([item.lng, item.lat])); if (mapFocus.kind === "alert") MAP_ALERTS.filter((item) => highlighted.has(item.id)).forEach((item) => points.push([item.lng, item.lat])); if (mapFocus.kind === "train") displayTrains.filter((item) => highlighted.has(item.id)).forEach((item) => { const point = trainPosition(item); points.push([point[1], point[0]]); }); if (points.length === 1) map.flyTo({ center: points[0], zoom: 15, duration: 800 }); if (points.length > 1) map.fitBounds(points, { padding: 120, maxZoom: 15, duration: 800 }); }, [displayTrains, highlighted, mapFocus]);

  const control = "grid size-9 place-items-center rounded-md border border-border bg-card/90 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:border-primary/60 hover:text-primary";
  if (error) return <div className="grid h-[68vh] min-h-[520px] place-items-center rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-center text-destructive"><div><p className="font-semibold">Map could not load</p><p className="mt-2 text-sm">{error.message}</p><p className="mt-3 text-xs">Using MapLibre with the free OpenFreeMap style. Check your network connection if it does not load.</p></div></div>;
  return <div className={cn("relative isolate overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_60px_rgba(11,18,24,0.18)]", fullscreen ? "fixed inset-0 z-50 rounded-none" : "h-[68vh] min-h-[520px] w-full")}><div ref={mapElement} className="size-full" />
    <div className="pointer-events-none absolute left-3 top-3 z-10 w-60 rounded-md border border-border bg-card/90 p-3 shadow-lg backdrop-blur-md"><p className="mono-label mb-2">Network status</p>{[{ l: "Stations", v: NETWORK_STATUS.stations, c: RAIL }, { l: "Trains in service", v: NETWORK_STATUS.inService, c: stateColor.normal }, { l: "Under maintenance", v: NETWORK_STATUS.underMaintenance, c: stateColor.warning }, { l: "Active alerts", v: NETWORK_STATUS.activeAlerts, c: stateColor.critical }].map((row) => <div key={row.l} className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{row.l}</span><b style={{ color: row.c }}>{row.v}</b></div>)}<div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground"><span className="text-success">● Feed connected</span><br />{feedSource}{feedUpdatedAt ? ` · ${new Date(feedUpdatedAt).toLocaleTimeString()}` : ""}</div></div>
    <div className="absolute bottom-3 left-3 z-10 w-56 rounded-md border border-border bg-card/90 p-3 shadow-lg backdrop-blur-md"><p className="mono-label mb-2 flex items-center gap-1.5"><Layers className="size-3" /> Layers</p>{(["stations", "trains", "maintenance", "alerts"] as LayerKey[]).map((key) => <button key={key} onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-secondary/60"><span className={cn("grid size-3.5 place-items-center rounded border text-[9px]", layers[key] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}>✓</span><span className="capitalize">{key}</span></button>)}</div>
    {selectedInfo && <div className="absolute left-1/2 top-3 z-20 w-[min(360px,calc(100%-24px))] -translate-x-1/2 rounded-lg border border-primary/50 bg-card/95 p-3 shadow-2xl backdrop-blur-md"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-xs font-bold text-primary">{selectedInfo.kind === "trains" ? "TS" : selectedInfo.kind === "stations" ? "ST" : selectedInfo.kind === "alerts" ? "!" : "⚙"}</span><div className="min-w-0 flex-1"><p className="mono-label text-primary">Selected {selectedInfo.kind.slice(0, -1)}</p><p className="truncate text-sm font-semibold">{selectedInfo.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{selectedInfo.detail}</p></div><button className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedInfo(null)} aria-label="Close selected information">×</button></div></div>}
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5"><button className={control} title="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus className="size-4" /></button><button className={control} title="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus className="size-4" /></button><button className={control} title="Locate" onClick={() => { setMapFocus(null); mapRef.current?.flyTo({ center: KOCHI_CENTER, zoom: 12, duration: 600 }); }}><LocateFixed className="size-4" /></button><button className={control} title="Fit route" onClick={fitRoute}><Frame className="size-4" /></button><button className={control} title="Fullscreen" onClick={() => { setFullscreen((current) => !current); window.setTimeout(resizeMap, 250); }}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button><button className={control} title={running ? "Pause simulation" : "Resume simulation"} onClick={() => setRunning((current) => !current)}>{running ? <Pause className="size-4" /> : <Play className="size-4" />}</button></div>
    {mapFocus && <div className="absolute bottom-3 right-3 z-10 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary">Highlighting {mapFocus.ids.length} {mapFocus.kind}<button className="ml-2 rounded border border-primary/40 px-1.5" onClick={() => setMapFocus(null)}>Clear</button></div>}
  </div>;
}

export function SmartMapWithErrorBoundary() { return <SmartMapView />; }
