from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime
import hashlib
import os
import uuid

from app.supabase_client import supabase

router = APIRouter()

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx", ".txt", ".pptx", ".xlsx"}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    contents = await file.read()
    file_hash = hashlib.sha256(contents).hexdigest()

    doc_id = str(uuid.uuid4())
    saved_filename = f"{doc_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(save_path, "wb") as f:
        f.write(contents)

    uploaded_at = datetime.utcnow().isoformat()

    supabase.table("documents").insert({
        "id": doc_id,
        "file_name": file.filename,
        "hash": file_hash,
        "uploaded_at": uploaded_at,
        "status": "uploaded"
    }).execute()

    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "hash": file_hash,
        "upload_time": uploaded_at,
        "status": "uploaded"
    }


@router.get("/documents")
async def list_documents():
    result = supabase.table("documents").select("*").order("uploaded_at", desc=True).execute()
    return result.data


@router.get("/verify-document/{doc_id}")
async def verify_document(doc_id: str):
    result = supabase.table("documents").select("*").eq("id", doc_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_record = result.data[0]
    stored_hash = doc_record["hash"]
    filename = doc_record["file_name"]

    ext = os.path.splitext(filename)[1].lower()
    saved_filename = f"{doc_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing from storage")

    with open(file_path, "rb") as f:
        contents = f.read()
    current_hash = hashlib.sha256(contents).hexdigest()

    hash_match = current_hash == stored_hash
    on_chain_verified = None

    return {
        "doc_id": doc_id,
        "filename": filename,
        "stored_hash": stored_hash,
        "current_hash": current_hash,
        "hash_match": hash_match,
        "on_chain_verified": on_chain_verified,
        "status": "verified" if hash_match else "tampered"
    }
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import induction

app = FastAPI(title="RAIL DHARA API")

# --- NEW: CORS FIX FOR FRONTEND ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all local ports (Anushka's frontend) to talk to your API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ----------------------------------

# Register your induction endpoint
app.include_router(induction.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the KMRL Induction API"}
