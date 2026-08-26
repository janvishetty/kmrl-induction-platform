# src/generate_future_plans.py
"""
Multi-day explainable induction forecast.

100% grounded in uploaded documents:
  - Baseline state comes from data/processed/trainset_dossier.csv
    (built by build_dossier.py from the extracted PDFs).
  - Day-over-day variation comes ONLY from calendar logic already
    inside optimize.py:
      * fitness expiry vs plan_date : hard safety rule flips to IBL
      * GTFS day type (WK/WE) : service demand 20 vs 16
No hallucinated data.
"""
import json
import os
from datetime import date, timedelta

from dotenv import load_dotenv
from supabase import create_client

from src.optimize import load_trainsets, generate_induction_plan

load_dotenv()

DAYS_TO_FORECAST = 4   # offsets 1..4 -> captures the weekend demand flip
OUT_DIR = "data/processed/future_plans"

supabase = None
if os.getenv("SUPABASE_URL"):
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY"),  # or SUPABASE_SERVICE_ROLE_KEY, whichever is in your .env
    )


def save_plan(plan):
    row = {
        "plan_date": plan["plan_date"],
        "day_type": plan["day_type"],
        "service_demand": plan["service_demand"],
        "service_list": plan["service_list"],      # jsonb columns
        "standby_list": plan["standby_list"],
        "ibl_list": plan["ibl_list"],
        "system_alerts": plan["system_alerts"],
        "audit_hash": plan["audit_hash"],
    }
    supabase.table("induction_plans").upsert(row, on_conflict="plan_date").execute()


def save_explanations(plan):
    rows = []
    for tid, exp in plan["explainability"].items():
        if exp["hard_rules"] != ["none - passed all safety gates"]:
            explanation = "Forced assignment: " + "; ".join(exp["hard_rules"])
        else:
            s = exp["scores"]
            explanation = (
                f"Assigned to {exp['assignment']} by score ranking "
                f"(branding={s['branding']}, mileage_balance={s['mileage_balance']}, "
                f"shunting={s['shunting']}, maintenance_need={s['maintenance_need']})."
            )
        rows.append({
            "plan_date": plan["plan_date"],
            "trainset_id": tid,
            "assignment": exp["assignment"],
            "explanation": explanation,
            "sources": exp["sources"],
        })
    supabase.table("explanations").upsert(
        rows, on_conflict="plan_date,trainset_id"
    ).execute()


def print_diffs(plans):
    """Shows exactly which trains move between days, and WHY."""
    print("\nDay-over-day changes:")
    for prev, nxt in zip(plans, plans[1:]):
        p_map = {t: e["assignment"] for t, e in prev["explainability"].items()}
        n_map = {t: e["assignment"] for t, e in nxt["explainability"].items()}
        for tid in sorted(p_map):
            if p_map[tid] != n_map[tid]:
                rules = nxt["explainability"][tid]["hard_rules"]
                why = ("; ".join(rules) if rules != ["none - passed all safety gates"]
                       else "score re-ranking (day type / demand change)")
                print(f"   {tid}: {p_map[tid]} -> {n_map[tid]} on {nxt['plan_date']} | {why}")


def forecast(days=DAYS_TO_FORECAST):
    os.makedirs(OUT_DIR, exist_ok=True)
    plans = []

    for offset in range(1, days + 1):   # 1 = tomorrow (tonight's induction)
        plan_date = date.today() + timedelta(days=offset)

        # Fitness validity is computed against THIS plan_date inside load_trainsets
        trains = load_trainsets(plan_date=plan_date)

        plan = generate_induction_plan(trains, plan_date)
        plans.append(plan)

        # Local JSON copy = demo safety net (works even if Supabase is down)
        path = os.path.join(OUT_DIR, f"plan_{plan_date.isoformat()}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(plan, f, indent=2, ensure_ascii=False)

        print(f"\n {plan_date} ({plan['day_type']}, demand {plan['service_demand']})")
        print(f"   SERVICE ({len(plan['service_list'])}): {[e['trainset_id'] for e in plan['service_list']]}")
        print(f"   STANDBY: {plan['standby_list']}")
        print(f"   IBL:     {plan['ibl_list']}")
        print(f"   Alerts: {len(plan['system_alerts'])} | hash {plan['audit_hash'][:12]}…")

        if supabase:
            save_plan(plan)
            save_explanations(plan)
            print("     Synced to Supabase.")

    print_diffs(plans)
    return plans


if __name__ == "__main__":
    forecast()