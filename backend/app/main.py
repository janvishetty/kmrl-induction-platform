import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth,
    induction,
    audit,
    alerts,
    compliance,
    documents,
    metrics,
    operations,
    staff,
    stations,
    trainsets,
)

# --- ai-ml integration ---
AI_ML_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai-ml"))
if AI_ML_PATH not in sys.path:
    sys.path.insert(0, AI_ML_PATH)

from src.ml_router import router as ml_router

app = FastAPI(
    title="RAIL DHARA API",
    version="0.1.0",
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

app.include_router(auth.router)
app.include_router(induction.router)
app.include_router(audit.router)
app.include_router(alerts.router)
app.include_router(compliance.router)
app.include_router(documents.router)
app.include_router(metrics.router)
app.include_router(operations.router)
app.include_router(staff.router)
app.include_router(stations.router)
app.include_router(trainsets.router)
app.include_router(ml_router, prefix="/ml", tags=["ML"])

# -----------------------------
# ROOT
# -----------------------------

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the KMRL Induction API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }