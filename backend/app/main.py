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