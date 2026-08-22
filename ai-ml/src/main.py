# src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Use absolute import since we run from the root directory
from src.ml_router import router as ml_router

app = FastAPI(title="KMRL Induction Platform API")

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount our ML endpoints
app.include_router(ml_router, prefix="/ml", tags=["ML Pipeline"])

@app.get("/")
def root():
    return {"message": "KMRL API is live! Go to /docs to test endpoints."}