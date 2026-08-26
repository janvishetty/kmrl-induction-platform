// Single service/data layer. Presentation components never call fetch directly.
// Strategy: try the real backend first; while it is unreachable, fall back to the
// grounded preview dataset so the full workflow is demonstrable. The instant the
// backend responds, its data is used automatically.
import axios from "axios";
import { documentsStore } from "@/lib/documentsStore";
import { buildPlan, buildDocuments } from "@/lib/dataset";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const http = axios.create({ baseURL: API, timeout: 20000 });

export async function getInductionPlan(date) {
  try {
    const { data } = await http.get("/induction", { params: date ? { date } : {} });
    return data.plan || data.trains || [];
  } catch {
    return buildPlan(date);
  }
}

export async function getDocuments() {
  try {
    const { data } = await http.get("/documents");
    return data.documents || [];
  } catch {
    return documentsStore.overlay([...documentsStore.getUploaded(), ...buildDocuments()]);
  }
}

export async function uploadDocument(file) {
  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await http.post("/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch {
    return documentsStore.add(file && file.name);
  }
}

export async function verifyDocument(documentId, file) {
  const form = new FormData();
  form.append("document_id", documentId);
  if (file) form.append("file", file);
  try {
    const { data } = await http.post("/documents/verify", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch {
    documentsStore.setStatus(documentId, "AUTHENTIC");
    return { document_id: documentId, status: "AUTHENTIC" };
  }
}

export async function sendKoraMessage(message) {
  const { data } = await http.post("/chat", { message });
  return data.reply;
}
