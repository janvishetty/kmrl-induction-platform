import subprocess
import sys
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])

# FIX: parents[3] goes up to the root project folder, then into ai-ml
AI_ML_DIR = Path(__file__).resolve().parents[3] / "ai-ml"

def run_nightly_task():
    """Runs the ai-ml nightly script using the current venv's Python."""
    print("🌙 Starting nightly job...")
    print(f"Running from: {AI_ML_DIR}")
    
    result = subprocess.run(
        [sys.executable, "-m", "src.run_nightly"],
        cwd=AI_ML_DIR,
        capture_output=True,
        text=True
    )
    
    if result.stdout:
        print("Output:", result.stdout)
        
    if result.returncode != 0:
        print(f"CRASHED! Error code: {result.returncode}")
        print("Error details:", result.stderr)
    else:
        print("Nightly job finished successfully.")

@router.post("/run-nightly")
def trigger_nightly():
    """Triggers the nightly induction plan computation."""
    run_nightly_task()
    return {"message": "Nightly plan recomputed and synced to Supabase."}
