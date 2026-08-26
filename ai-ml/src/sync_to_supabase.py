"""Sync induction plan + explanations to Supabase."""
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def sync_plan():
    """Sync the main induction plan to the 'induction_plans' table."""
    plan_path = "data/processed/induction_plan.json"
    if not os.path.exists(plan_path):
        print("❌ induction_plan.json not found. Run `python src/optimize.py` first.")
        return

    with open(plan_path, encoding="utf-8") as f:
        plan = json.load(f)
    
    # Upsert the plan (uses plan_date as the unique constraint)
    response = sb.table("induction_plans").upsert(
        {
            "plan_date": plan["plan_date"],
            "day_type": plan["day_type"],
            "service_demand": plan["service_demand"],
            "service_list": plan["service_list"],
            "standby_list": plan["standby_list"],
            "ibl_list": plan["ibl_list"],
            "system_alerts": plan["system_alerts"],
            "audit_hash": plan["audit_hash"],
        },
        on_conflict="plan_date"
    ).execute()
    
    print(f"Synced induction plan for {plan['plan_date']} to Supabase")

def sync_explanations():
    """Sync the 25 train explanations to the 'explanations' table."""
    expl_path = "data/processed/explanations.json"
    plan_path = "data/processed/induction_plan.json"
    
    if not os.path.exists(expl_path):
        print("Explanations.json not found. Run `python src/explain.py` first.")
        return

    with open(expl_path, encoding="utf-8") as f:
        explanations = json.load(f)
        
    with open(plan_path, encoding="utf-8") as f:
        plan = json.load(f)
    plan_date = plan["plan_date"]

    # Format for Supabase bulk upsert
    rows = [
        {
            "plan_date": plan_date,
            "trainset_id": trainset_id,
            "assignment": info["assignment"],
            "explanation": info["explanation"],
            "sources": info["sources"],
        }
        for trainset_id, info in explanations.items()
    ]
    
    # Upsert (uses plan_date + trainset_id as unique constraint)
    response = sb.table("explanations").upsert(
        rows, 
        on_conflict="plan_date,trainset_id"
    ).execute()
    
    print(f"Synced {len(rows)} explanations to Supabase")

if __name__ == "__main__":
    print("--- Starting Supabase Sync ---")
    sync_plan()
    sync_explanations()
    print("--- Sync Complete! ---")
