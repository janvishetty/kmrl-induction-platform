// Single service/data layer. Presentation components never call fetch directly.
// Strategy: try the real backend first; while it is unreachable, fall back to the
// grounded preview dataset so the full workflow is demonstrable. The instant the
// backend responds, its data is used automatically.
import axios from "axios";
import { documentsStore } from "@/lib/documentsStore";
import { buildPlan, buildDocuments } from "@/lib/dataset";

// Check for the env variable, but provide a strict fallback if it's missing or undefined
const envUrl = process.env.REACT_APP_BACKEND_URL;
const API = (envUrl && envUrl !== "undefined") ? envUrl : "http://localhost:8000"; 
// ^ NOTE: If your Python backend runs on port 5000 instead of 8000, change the number above!

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
    return documentsStore.overlay((data || []).map(normalizeDocument));   // <-- wrap with overlay
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
    const status = data.status === "verified" ? "AUTHENTIC" : "TAMPERED";
    documentsStore.setStatus(documentId, status);   // <-- add this line
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

export async function loginAdmin(username, password) {
  try {
    const { data } = await http.post("/admin/login", { username, password });
    return data.success === true;
  } catch {
    return false;
  }
}

// src/lib/api.js
export async function getExplanation(trainsetId, date) {
  try {
    // Pass BOTH the ID and the exact date from the UI
    const { data } = await http.get("/explanations", {
      params: { trainset_id: trainsetId, plan_date: date }
    });
    
    if (!data) return null;
    if (typeof data === "string") return data;
    if (data.explanation) return data.explanation;
    if (data.data?.explanation) return data.data.explanation;
    if (Array.isArray(data) && data[0]?.explanation) return data[0].explanation;
    
    return null;
  } catch (error) {
    console.error(`Error fetching explanation for ${trainsetId}:`, error);
    return null;
  }
}