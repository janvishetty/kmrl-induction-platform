import sys
import os
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Cleaned up routers (Removed staff, compliance, audit, alerts to match frontend)
from app.routers import (
    induction,
    documents,
    metrics,
    operations,
    stations,
    trainsets,
)

# Import the blockchain service you just added
from app import blockchain_service as bs

# --- ai-ml integration ---
AI_ML_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai-ml"))
if AI_ML_PATH not in sys.path:
    sys.path.insert(0, AI_ML_PATH)

from src.ml_router import router as ml_router

app = FastAPI(
    title="KMRL Ops Intelligence API",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# ROUTERS
# -----------------------------

app.include_router(induction.router)
app.include_router(documents.router)
app.include_router(metrics.router)
app.include_router(operations.router)
app.include_router(stations.router)
app.include_router(trainsets.router)
app.include_router(ml_router, prefix="/ml", tags=["ML"])


# -----------------------------
# BLOCKCHAIN ENDPOINTS
# -----------------------------

@app.post("/register")
async def register(doc_id: str = Form(...), file: UploadFile = File(...)):
    # Takes the uploaded file, reads its bytes, and registers it on Polygon Amoy
    file_bytes = await file.read()
    return bs.register_document(doc_id, file_bytes)

@app.post("/verify")
async def verify(doc_id: str = Form(...), file: UploadFile = File(...)):
    # Checks the blockchain to see if the file is AUTHENTIC or TAMPERED
    file_bytes = await file.read()
    return bs.check_document(doc_id, file_bytes)


# -----------------------------
# ROOT
# -----------------------------

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the KMRL Ops Intelligence API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }