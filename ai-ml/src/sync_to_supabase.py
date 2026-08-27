"""Sync induction plan + explanations to Supabase."""
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

import glob

def sync_plan_file(plan_path):
    """Upsert a single plan JSON file into the 'induction_plans' table."""
    if not os.path.exists(plan_path):
        print(f"❌ {plan_path} not found.")
        return

    with open(plan_path, encoding="utf-8") as f:
        plan = json.load(f)

    # Upsert the plan (uses plan_date as the unique constraint)
    sb.table("induction_plans").upsert(
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


def sync_plan():
    """Sync today's induction plan (data/processed/induction_plan.json)."""
    sync_plan_file("data/processed/induction_plan.json")


def sync_future_plans():
    """Sync every generated future plan under data/processed/future_plans/."""
    future_dir = "data/processed/future_plans"
    if not os.path.isdir(future_dir):
        print("No future_plans directory found, skipping.")
        return

    files = sorted(glob.glob(os.path.join(future_dir, "plan_*.json")))
    if not files:
        print("No future plan files found, skipping.")
        return

    for path in files:
        sync_plan_file(path)

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
    sync_future_plans()
    sync_explanations()
    print("--- Sync Complete! ---")
