import subprocess
import sys
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks

router = APIRouter(prefix="/admin", tags=["admin"])

# Path to the ai-ml folder (adjust if your structure is different)
AI_ML_DIR = Path(__file__).resolve().parents[2] / "ai-ml"

def run_nightly_task():
    """Runs the ai-ml nightly script using the current venv's Python."""
    print("🌙 Starting nightly job...")
    result = subprocess.run(
        [sys.executable, "-m", "src.run_nightly"],
        cwd=AI_ML_DIR,
        capture_output=True,
        text=True
    )
    print(" Nightly job finished.")
    if result.stdout:
        print(result.stdout)
    if result.returncode != 0 and result.stderr:
        print(f" Error: {result.stderr}")

@router.post("/run-nightly")
def trigger_nightly(background_tasks: BackgroundTasks):
    """Triggers the nightly induction plan computation in the background."""
    background_tasks.add_task(run_nightly_task)
    return {"message": "Nightly job started successfully. Check backend logs for progress."}