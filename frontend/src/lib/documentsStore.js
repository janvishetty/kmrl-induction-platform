// Browser-only preview store for document status + admin uploads.
// PROTOTYPE fallback used ONLY while the real backend/Supabase service is not
// reachable. No fabricated KMRL operational data; no blockchain/hashing.

const DOCS_KEY = "raildhara-uploads";
const STATUS_KEY = "raildhara-doc-status";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`documentsStore: failed to read "${key}" from localStorage:`, error);
    return fallback;
  }
}
function writeJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (error) {
    console.error(`documentsStore: failed to write "${key}" to localStorage:`, error);
  }
}

function genId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `KMRL-UP-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const documentsStore = {
  getUploaded() {
    return readJSON(DOCS_KEY, []);
  },
  add(fileName) {
    const list = readJSON(DOCS_KEY, []);
    const doc = {
      document_id: genId(),
      trainset: "\u2014",
      category: "Uploaded",
      file_name: fileName || "document",
      uploaded_at: new Date().toISOString(),
      status: "UNVERIFIED",
    };
    list.unshift(doc);
    writeJSON(DOCS_KEY, list);
    return doc;
  },
  setStatus(id, status) {
    const map = readJSON(STATUS_KEY, {});
    map[id] = status;
    writeJSON(STATUS_KEY, map);
  },
  overlay(list) {
    const map = readJSON(STATUS_KEY, {});
    return list.map((d) => (map[d.document_id] ? { ...d, status: map[d.document_id] } : d));
  },
};
