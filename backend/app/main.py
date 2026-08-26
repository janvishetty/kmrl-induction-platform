import sys
import os
from app.routers import admin
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase


# Cleaned up routers (Removed staff, compliance, audit, alerts to match frontend)
from app.routers import (
    auth,
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

app.include_router(auth.router)
app.include_router(induction.router)
app.include_router(documents.router)
app.include_router(metrics.router)
app.include_router(operations.router)
app.include_router(stations.router)
app.include_router(trainsets.router)
app.include_router(admin.router)

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

@app.get("/explanations")
def get_explanation(trainset_id: str, plan_date: str):
    try:
        # Strictly fetch the exact date requested by the UI
        response = supabase.table("explanations") \
            .select("explanation") \
            .eq("trainset_id", trainset_id) \
            .eq("plan_date", plan_date) \
            .execute()
            
        if response.data:
            return response.data[0]
            
        return {"explanation": None}
    except Exception as e:
        print(f"Supabase Error: {e}")
        return {"error": str(e)}