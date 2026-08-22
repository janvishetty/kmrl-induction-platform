from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    alerts,
    audit,
    compliance,
    documents,
    induction,
    metrics,
    operations,
    staff,
    stations,
    trainsets,
)

app = FastAPI(title="RAIL DHARA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"message": "Welcome to the KMRL Induction API"}