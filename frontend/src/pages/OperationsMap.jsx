import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Minus, LocateFixed } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useApp } from "@/context/AppContext";
import { usePlan } from "@/lib/hooks";
import { STATIONS, DEPOTS, CORRIDOR, KOCHI_CENTER } from "@/lib/stations";
import { todayIST } from "@/lib/datetime";
import { cn } from "@/lib/utils";

function statusClass(s) {
  return s === "IBL" ? "rd-c-ibl" : s === "STANDBY" ? "rd-c-standby" : "rd-c-service";
}
const ROUTE_STYLE = { color: "hsl(var(--primary))", weight: 4, opacity: 0.85 };
function statusText(s) {
  return s === "IBL" ? "text-destructive" : s === "STANDBY" ? "text-warning" : "text-success";
}
function stationIcon() {
  return L.divIcon({ className: "", html: `<span class="rd-marker rd-marker-station rd-c-station"></span>`, iconSize: [13, 13], iconAnchor: [6, 6] });
}
function depotIcon(letter) {
  return L.divIcon({ className: "", html: `<span class="rd-marker rd-marker-maint rd-c-station" style="width:26px;height:26px;font-size:11px">${letter}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
}
function trainIcon(status, num) {
  return L.divIcon({ className: "", html: `<span class="rd-marker rd-marker-train ${statusClass(status)}">${num}</span>`, iconSize: [40, 22], iconAnchor: [20, 11] });
}

// lay trainsets out in a small grid around their depot so markers don't overlap
function placeTrainsets(plan) {
  const byDepot = {};
  plan.forEach((ts) => {
    const id = ts.variables?.stabling?.depotId || "MUTTOM";
    (byDepot[id] = byDepot[id] || []).push(ts);
  });
  const placed = [];
  DEPOTS.forEach((d) => {
    const list = byDepot[d.id] || [];
    list.forEach((ts, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      placed.push({ ...ts, lat: d.lat + 0.004 + row * 0.0016, lng: d.lng - 0.006 + col * 0.0032 });
    });
  });
  return placed;
}

function MapReady({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    const id = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(id);
  }, [map, onReady]);
  return null;
}

function LayerToggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-input accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <span className="truncate">{label}</span>
    </label>
  );
}

export default function OperationsMap() {
  const { t, theme, lang } = useApp();
  const planQ = usePlan(todayIST());
  const mapRef = useRef(null);
  const wrapRef = useRef(null);
  const [layers, setLayers] = useState({ stations: true, depots: true, trains: true });

  const bounds = useMemo(() => L.latLngBounds(CORRIDOR).pad(0.12), []);
  const trainsets = useMemo(() => placeTrainsets(planQ.data || []), [planQ.data]);
  const depotCounts = useMemo(() => {
    const m = {};
    (planQ.data || []).forEach((ts) => {
      const id = ts.variables?.stabling?.depotId || "MUTTOM";
      m[id] = m[id] || { SERVICE: 0, STANDBY: 0, IBL: 0 };
      m[id][ts.status] += 1;
    });
    return m;
  }, [planQ.data]);

  const onReady = useCallback((map) => { mapRef.current = map; map.fitBounds(bounds); }, [bounds]);

  useEffect(() => {
    const handle = () => mapRef.current && mapRef.current.invalidateSize();
    window.addEventListener("resize", handle);
    let ro;
    if (wrapRef.current && "ResizeObserver" in window) { ro = new ResizeObserver(() => handle()); ro.observe(wrapRef.current); }
    return () => { window.removeEventListener("resize", handle); if (ro) ro.disconnect(); };
  }, []);

  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const ctrlBtn = "grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground shadow-card transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const setLayer = (k) => (v) => setLayers((p) => ({ ...p, [k]: v }));

  return (
    <AppShell>
      <PageHeader title={t("map_title")} subtitle={t("map_sub")} />
      <div ref={wrapRef} className="relative h-[72vh] min-h-[460px] w-full overflow-hidden rounded-xl border border-border shadow-card">
        <MapContainer center={KOCHI_CENTER} zoom={12} zoomControl={false} scrollWheelZoom className="h-full w-full">
          <MapReady onReady={onReady} />
          <TileLayer key={theme} url={tileUrl} attribution="&copy; OpenStreetMap &copy; CARTO" maxZoom={19} />
          <Polyline positions={CORRIDOR} pathOptions={ROUTE_STYLE} />

          {layers.stations && STATIONS.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={stationIcon()}>
              <Popup>
                <div className="min-w-[140px]">
                  <div className="mono-label">{t("map_station")}</div>
                  <div className="text-sm font-semibold text-foreground">{lang === "ml" ? s.nameMl : s.name}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {layers.depots && DEPOTS.map((d) => {
            const c = depotCounts[d.id] || { SERVICE: 0, STANDBY: 0, IBL: 0 };
            return (
              <Marker key={d.id} position={[d.lat, d.lng]} icon={depotIcon(d.id === "MUTTOM" ? "M" : "K")}>
                <Popup>
                  <div className="min-w-[180px] space-y-1">
                    <div className="mono-label">{t("map_depot")}</div>
                    <div className="text-sm font-semibold text-foreground">{lang === "ml" ? d.nameMl : d.name}</div>
                    <div className="flex gap-3 pt-1 text-xs">
                      <span className="text-success">{t("status_service")} {c.SERVICE}</span>
                      <span className="text-warning">{t("status_standby")} {c.STANDBY}</span>
                      <span className="text-destructive">{t("status_ibl")} {c.IBL}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {layers.trains && trainsets.map((ts) => (
            <Marker key={ts.train_id} position={[ts.lat, ts.lng]} icon={trainIcon(ts.status, ts.train_id.replace("TS-", ""))}>
              <Popup>
                <div className="min-w-[190px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{ts.train_id}</span>
                    <span className={cn("font-mono text-[11px] font-semibold", statusText(ts.status))}>{ts.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t("stabled_here")}: <span className="text-foreground">{ts.variables.stabling.depot} · {ts.variables.stabling.line}</span></div>
                  <div className="text-xs text-muted-foreground">{ts.summary}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
          <button className={ctrlBtn} onClick={() => mapRef.current && mapRef.current.zoomIn()} aria-label={t("zoom_in")}><Plus className="h-[18px] w-[18px]" /></button>
          <button className={ctrlBtn} onClick={() => mapRef.current && mapRef.current.zoomOut()} aria-label={t("zoom_out")}><Minus className="h-[18px] w-[18px]" /></button>
          <button className={ctrlBtn} onClick={() => mapRef.current && mapRef.current.fitBounds(bounds)} aria-label={t("reset_kochi")} title={t("reset_kochi")}><LocateFixed className="h-[18px] w-[18px]" /></button>
        </div>

        <div className="absolute left-3 top-3 z-[500] w-[176px] rounded-xl border border-border bg-card/95 p-3 shadow-card backdrop-blur">
          <div className="mono-label mb-1.5">{t("layers")}</div>
          <LayerToggle checked={layers.stations} onChange={setLayer("stations")} label={t("layer_stations")} />
          <LayerToggle checked={layers.depots} onChange={setLayer("depots")} label={t("layer_depots")} />
          <LayerToggle checked={layers.trains} onChange={setLayer("trains")} label={t("layer_trains")} />
        </div>

        <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-3 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-card backdrop-blur">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" /><span className="text-foreground">{t("legend_normal")}</span></span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" aria-hidden="true" /><span className="text-foreground">{t("legend_warning")}</span></span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" /><span className="text-foreground">{t("legend_critical")}</span></span>
        </div>
      </div>
    </AppShell>
  );
}
