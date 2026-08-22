const API_BASE = import.meta.env["VITE_API_URL"] || "http://localhost:8000";

function toCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function camelize<T = any>(obj: any): T {
  if (Array.isArray(obj)) return obj.map(camelize) as any;
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), camelize(v)])
    ) as any;
  }
  return obj;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return camelize<T>(await res.json());
}

export const fetchStaff = () => apiGet<any[]>("/staff");
export const fetchTrainsets = () => apiGet<any[]>("/trainsets");
export const fetchStations = () => apiGet<any[]>("/stations");
export const fetchAlerts = () => apiGet<any[]>("/alerts");
export const fetchAudit = () => apiGet<any[]>("/audit");
export const fetchCompliance = () => apiGet<any>("/compliance");
export const fetchDocuments = () => apiGet<any[]>("/documents");
export const fetchSmartMapFeed = () => apiGet<any>("/smartmap/feed");
