from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    induction,
    audit,
    alerts,
    documents,
    compliance,
    metrics,
    operations,
    staff,
    trainsets,
    stations,
    smartmap,
)

app = FastAPI(
    title="RAIL DHARA API",
    version="0.1.0",
)

# CORS — allows your frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Routers
# --------------------------------------------------

app.include_router(induction.router)
app.include_router(audit.router)
app.include_router(alerts.router)
app.include_router(documents.router)
app.include_router(compliance.router)
app.include_router(metrics.router)
app.include_router(operations.router)
app.include_router(staff.router)
app.include_router(trainsets.router)
app.include_router(stations.router)
app.include_router(smartmap.router)


# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the KMRL Induction API",
        "status": "online",
    }


# --------------------------------------------------
# Health
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "RAIL DHARA API",
    }

