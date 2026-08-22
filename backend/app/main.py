from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import induction, audit, alerts  # <-- Imported alerts router here!

app = FastAPI(title="RAIL DHARA API")

# --- CORS FIX FOR FRONTEND ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ----------------------------------

# Register your endpoints
app.include_router(induction.router)
app.include_router(audit.router)
app.include_router(alerts.router)  # <-- Registered alerts router here!

@app.get("/")
def read_root():
    return {"message": "Welcome to the KMRL Induction API"}