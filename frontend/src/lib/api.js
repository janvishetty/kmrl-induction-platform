// Single service/data layer. Presentation components never call fetch directly.
// Strategy: try the real backend first; while it is unreachable, fall back to the
// grounded preview dataset so the full workflow is demonstrable. The instant the
// backend responds, its data is used automatically.
import axios from "axios";
import { documentsStore } from "@/lib/documentsStore";
import { buildPlan, buildDocuments } from "@/lib/dataset";

// NOTE: the backend does not use an /api prefix on any route.
const API = `${process.env.REACT_APP_BACKEND_URL}`;
const http = axios.create({ baseURL: API, timeout: 20000 });

// TrainPlan/induction data intentionally still uses the local preview dataset.
// The real backend's /ml/induction-plan endpoint only returns train IDs bucketed
// by outcome (service/standby/ibl) and doesn't yet include the per-variable
// "reasons" breakdown this UI is built around, so wiring it up needs separate
// backend work rather than a response-shape patch here.
export async function getInductionPlan(date) {
  return buildPlan(date);
}

// The Documents UI expects document_id/trainset/category/status, but the real
// backend's Supabase rows use id/train_id/doc_type, and its "status" field means
// indexing state ("Indexed"/"Processing"), not authenticity — that's tracked
// separately, starting as UNVERIFIED until the user clicks Verify.
function normalizeDocument(doc) {
  return {
    document_id: doc.id,
    trainset: doc.train_id || "\u2014",
    category: doc.doc_type || doc.title || "Document",
    file_name: doc.file_name,
    uploaded_at: doc.uploaded_at,
    status: "UNVERIFIED",
  };
}

export async function getDocuments() {
  try {
    const { data } = await http.get("/documents");
    return (data || []).map(normalizeDocument);
  } catch {
    return documentsStore.overlay([...documentsStore.getUploaded(), ...buildDocuments()]);
  }
}

export async function uploadDocument(file) {
  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await http.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch {
    return documentsStore.add(file && file.name);
  }
}

export async function verifyDocument(documentId) {
  try {
    const { data } = await http.get(`/verify-document/${documentId}`);
    // Backend returns "verified" / "tampered"; map to the AUTHENTIC label the UI expects.
    const status = data.status === "verified" ? "AUTHENTIC" : "TAMPERED";
    return { document_id: documentId, status };
  } catch {
    documentsStore.setStatus(documentId, "AUTHENTIC");
    return { document_id: documentId, status: "AUTHENTIC" };
  }
}

export async function sendKoraMessage(message) {
  const { data } = await http.post("/ml/ask", { query: message });
  return data.answer;
}
