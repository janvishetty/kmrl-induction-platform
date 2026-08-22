from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    induction,
    documents,
    alerts,
    audit,
    compliance,
    metrics,
    operations,
    staff,
    stations,
    trainsets,
)

app = FastAPI(
    title="RAIL DHARA API",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(induction.router)
app.include_router(documents.router)
app.include_router(alerts.router)
app.include_router(audit.router)
app.include_router(compliance.router)
app.include_router(metrics.router)
app.include_router(operations.router)
app.include_router(staff.router)
app.include_router(stations.router)
app.include_router(trainsets.router)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the KMRL Induction API",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }