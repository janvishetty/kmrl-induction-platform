# src/ml_router.py
import os
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

# Import our ML pipeline functions
from src.ask import ask_kmrl
from src.optimize import generate_induction_plan, TrainFeatureData, _fitness_valid, _num, _shunt
from src.explain import build_explanation

router = APIRouter()

# Initialize Supabase
_sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# --- Request/Response Models ---
class AskRequest(BaseModel):
    query: str
    trainset_id: Optional[str] = None

class AskResponse(BaseModel):
    answer: str
    sources: list[dict]

class ExplainResponse(BaseModel):
    trainset_id: str
    assignment: str
    explanation: str
    sources: list[str]

class PlanResponse(BaseModel):
    plan_date: str
    day_type: str
    service_demand: int
    service_list: list[dict]
    standby_list: list[str]
    ibl_list: list[str]
    system_alerts: list[dict]
    audit_hash: str

# --- Endpoints ---

@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """Cited Q&A in English or Malayalam (uses local ChromaDB)."""
    try:
        answer, sources = ask_kmrl(req.query, trainset_id=req.trainset_id)
        return {"answer": answer, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/induction-plan", response_model=PlanResponse)
def induction_plan(plan_date: Optional[str] = None):
    """Generate tonight's induction plan (reads dossier from Supabase)."""
    try:
        pd_date = date.fromisoformat(plan_date) if plan_date else date.today() + timedelta(days=1)
        
        # Load dossier from Supabase
        res = _sb.table("trainset_dossier").select("*").execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="No dossier data in Supabase.")
        
        df = pd.DataFrame(res.data)
        
        # Convert to TrainFeatureData objects
        trains = []
        for _, r in df.iterrows():
            expiry = str(r.get("fitness_expiry", "")).strip()
            status_ok = str(r.get("fitness_status", "")).strip().lower() == "valid"
            bk = str(r.get("branding_min_km", "")).strip()
            trains.append(TrainFeatureData(
                trainset_id=str(r.get("trainset_id")),
                fitness_valid=_fitness_valid(status_ok, expiry, pd_date),
                fitness_expiry=expiry or None,
                issuing_authority=str(r.get("issuing_authority")) or None,
                job_card_status=str(r.get("job_card_status", "closed")).strip().lower() or "closed",
                job_card_severity=str(r.get("job_card_severity", "none")).strip().lower() or "none",
                job_card_desc=str(r.get("job_card_desc")) or None,
                branding_active=bool(str(r.get("branding_advertiser", "")).strip()),
                branding_priority=str(r.get("branding_priority", "none")).strip().lower() or "none",
                branding_min_km=_num(bk) if bk else None,
                odometer=_num(r.get("odometer")),
                target_band=str(r.get("target_band")) or None,
                mileage_deviation=str(r.get("deviation", "normal")).strip().lower() or "normal",
                cleaning_status=str(r.get("cleaning_status", "completed")).strip().lower() or "completed",
                cleaning_bay=str(r.get("cleaning_bay")) or None,
                current_bay=str(r.get("current_bay")) or None,
                shunting_cost=_shunt(r.get("shunting_cost")),
            ))
        
        plan = generate_induction_plan(trains, plan_date=pd_date)
        
        # Save to Supabase
        _sb.table("induction_plans").upsert({
            "plan_date": plan["plan_date"],
            "day_type": plan["day_type"],
            "service_demand": plan["service_demand"],
            "service_list": plan["service_list"],
            "standby_list": plan["standby_list"],
            "ibl_list": plan["ibl_list"],
            "system_alerts": plan["system_alerts"],
            "audit_hash": plan["audit_hash"],
        }, on_conflict="plan_date").execute()
        
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/induction-plan", response_model=PlanResponse)
def get_latest_plan():
    """Return the most recent plan from Supabase."""
    res = _sb.table("induction_plans").select("*").order("plan_date", desc=True).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No plan computed yet.")
    return res.data[0]

@router.get("/explain/{trainset_id}", response_model=ExplainResponse)
def explain_train(trainset_id: str):
    """Why is this train in SERVICE/STANDBY/IBL? (from Supabase)"""
    res = _sb.table("explanations").select("*").eq("trainset_id", trainset_id.upper()).order("plan_date", desc=True).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail=f"Train {trainset_id} not found.")
    row = res.data[0]
    return {
        "trainset_id": row["trainset_id"],
        "assignment": row["assignment"],
        "explanation": row["explanation"],
        "sources": row["sources"],
    }

@router.get("/explanations")
def all_explanations():
    """Full explanation dump for all trains (from Supabase)."""
    res = _sb.table("explanations").select("*").order("plan_date", desc=True).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No explanations found.")
    
    explanations = {}
    for row in res.data:
        explanations[row["trainset_id"]] = {
            "assignment": row["assignment"],
            "explanation": row["explanation"],
            "sources": row["sources"],
        }
    return explanations