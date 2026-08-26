#KMRL Explainable Induction Planner (using PuLP).

import os
import re
import glob
import json
import hashlib
from datetime import date, timedelta

import pandas as pd
import pulp

from src.schemas import TrainFeatureData, AlertTrigger
#configure
DOSSIER_CSV   = "data/processed/trainset_dossier.csv"
GTFS_CALENDAR = "data/raw/gtfs/calendar.txt"
RAW_DIR       = "data/raw"
OUT_JSON      = "data/processed/induction_plan.json"

SERVICE_DEMAND  = {"WK": 20, "WE": 16}   # tune freely
STANDBY_RESERVE = 2

W_BRAND, W_MILE, W_SHUNT = 2.0, 1.0, 1.5
PRIORITY_W  = {"high": 3.0, "medium": 2.0, "low": 1.0}
SHUNT_W_MAP = {"low": 1.0, "medium": 2.0, "high": 3.0}

#helpers
def _num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default

def _shunt(v):
    s = str(v).strip().lower()
    try:
        return float(s)
    except ValueError:
        return SHUNT_W_MAP.get(s, 1.0)

def _fitness_valid(status_ok, expiry, plan_date):
    if not status_ok or not expiry:
        return False
    try:
        return pd.to_datetime(expiry).date() >= plan_date
    except Exception:
        return status_ok

def load_trainsets(csv_path=DOSSIER_CSV, plan_date=None):
    plan_date = plan_date or (date.today() + timedelta(days=1))
    df = pd.read_csv(csv_path).fillna("")
    trains = []
    for _, r in df.iterrows():
        expiry = str(r.get("fitness_expiry", "")).strip()
        status_ok = str(r.get("fitness_status", "")).strip().lower() == "valid"
        bk = str(r.get("branding_min_km", "")).strip()
        trains.append(TrainFeatureData(
            trainset_id=str(r.get("trainset_id")),
            fitness_valid=_fitness_valid(status_ok, expiry, plan_date),
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
    return trains

def service_day_type(plan_date):
    col = plan_date.strftime("%A").lower()
    try:
        cal = pd.read_csv(GTFS_CALENDAR)
        if col in cal.columns:
            active = cal.loc[cal[col] == 1, "service_id"].tolist()
            if active:
                return "WK" if "WK" in active else active[0]
    except FileNotFoundError:
        pass
    return "WE" if col == "sunday" else "WK"

def build_source_map():
    m = {}
    for p in glob.glob(os.path.join(RAW_DIR, "**", "*.pdf"), recursive=True):
        f = os.path.basename(p)
        t = re.search(r"TS-?\d+", f, re.IGNORECASE)
        if t:
            tid = t.group(0).upper().replace("TS", "TS-")
            m.setdefault(tid, []).append(f)
    return m

#optimizer
def generate_induction_plan(trainsets, plan_date=None):
    plan_date = plan_date or (date.today() + timedelta(days=1))
    day_type = service_day_type(plan_date)
    demand = SERVICE_DEMAND.get(day_type, SERVICE_DEMAND["WK"])

    alerts = []
    categories = ["SERVICE", "STANDBY", "IBL"]
    prob = pulp.LpProblem("KMRL_Induction_Optimization", pulp.LpMaximize)
    x = {(t.trainset_id, c): pulp.LpVariable(f"X_{t.trainset_id}_{c}", cat="Binary")
         for t in trainsets for c in categories}

    #hard safety
    hard_rules = {}
    for t in trainsets:
        rules = []
        if not t.fitness_valid:
            rules.append(f"Fitness certificate not valid on {plan_date} (expiry {t.fitness_expiry or 'unknown'}) -> forced IBL")
        if t.job_card_status == "open" and t.job_card_severity == "critical":
            rules.append(f"CRITICAL open job card: {t.job_card_desc or 'see job card'} -> forced IBL")
        hard_rules[t.trainset_id] = rules
        if rules:
            alerts.append(AlertTrigger(trainset_id=t.trainset_id, issue_type="SAFETY_VIOLATION",
                                       message=" | ".join(rules)))
        if t.cleaning_status == "scheduled" and not rules:
            alerts.append(AlertTrigger(trainset_id=t.trainset_id, issue_type="OPERATIONAL",
                message=f"Cleaning scheduled (bay {t.cleaning_bay or 'TBA'}) tonight -> blocked from SERVICE"))

    #assignment + hard constraints
    for t in trainsets:
        prob += pulp.lpSum(x[t.trainset_id, c] for c in categories) == 1
        if hard_rules[t.trainset_id]:
            prob += x[t.trainset_id, "IBL"] == 1
        if t.cleaning_status == "scheduled":
            prob += x[t.trainset_id, "SERVICE"] == 0

    #GTFS service demand
    eligible = [t for t in trainsets
                if not hard_rules[t.trainset_id] and t.cleaning_status != "scheduled"]
    demand_capped = min(demand, len(eligible))
    if demand_capped < demand:
        alerts.append(AlertTrigger(trainset_id="SYSTEM", issue_type="SERVICE_SHORTFALL",
            message=f"Only {demand_capped} safe trainsets available vs {demand} required by {day_type} schedule"))
    prob += pulp.lpSum(x[t.trainset_id, "SERVICE"] for t in trainsets) == demand_capped

    non_forced = [t for t in trainsets if not hard_rules[t.trainset_id]]
    reserve = max(0, min(STANDBY_RESERVE, len(non_forced) - demand_capped))
    if reserve:
        prob += pulp.lpSum(x[t.trainset_id, "STANDBY"] for t in trainsets) >= reserve

    #multi-objective scores
    odos = [t.odometer for t in trainsets]
    odo_max, odo_min = max(odos), min(odos)
    span = (odo_max - odo_min) or 1.0
    shunt_max = max(t.shunting_cost for t in trainsets) or 1.0

    scores = {}
    for t in trainsets:
        brand = PRIORITY_W.get(t.branding_priority, 0.0) if t.branding_active else 0.0
        mile = (odo_max - t.odometer) / span * 3.0
        shunt = t.shunting_cost / shunt_max
        maint = 1.0 if ((t.job_card_status == "open" and t.job_card_severity in ("major", "minor"))
                        or t.mileage_deviation == "deviated") else 0.0
        health = 0.5 if (t.fitness_valid and t.job_card_status == "closed") else 0.1
        scores[t.trainset_id] = {"branding": brand, "mileage_balance": round(mile, 3),
                              "shunting": round(shunt, 3), "maintenance_need": maint,
                              "standby_health": health}

    svc_coef = {t.trainset_id: (W_BRAND * scores[t.trainset_id]["branding"]
                             + W_MILE * scores[t.trainset_id]["mileage_balance"]
                             - W_SHUNT * scores[t.trainset_id]["shunting"])
                for t in trainsets}

    prob += pulp.lpSum(
        x[t.trainset_id, "SERVICE"] * svc_coef[t.trainset_id]
        + x[t.trainset_id, "STANDBY"] * scores[t.trainset_id]["standby_health"]
        + x[t.trainset_id, "IBL"] * scores[t.trainset_id]["maintenance_need"]
        for t in trainsets)

    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    if pulp.LpStatus[prob.status] != "Optimal":
        alerts.append(AlertTrigger(trainset_id="SYSTEM", issue_type="SOLVER",
                                   message=f"Solver status: {pulp.LpStatus[prob.status]}"))

    #ranked, explainable output
    sources = build_source_map()
    assign = {}
    for t in trainsets:
        vals = {c: (x[t.trainset_id, c].value() or 0.0) for c in categories}
        assign[t.trainset_id] = max(vals, key=vals.get)

    rank_key = {"SERVICE": lambda t: svc_coef[t.trainset_id],
                "STANDBY": lambda t: scores[t.trainset_id]["standby_health"],
                "IBL":     lambda t: scores[t.trainset_id]["maintenance_need"]}
    ranked = {c: sorted([t for t in trainsets if assign[t.trainset_id] == c],
                        key=rank_key[c], reverse=True) for c in categories}

    results = {
        "plan_date": plan_date.isoformat(),
        "day_type": day_type,
        "service_demand": demand,
        "service_list": [{"rank": i + 1, "trainset_id": t.trainset_id,
                          "score": round(svc_coef[t.trainset_id], 3)}
                         for i, t in enumerate(ranked["SERVICE"])],
        "standby_list": [t.trainset_id for t in ranked["STANDBY"]],
        "ibl_list": [t.trainset_id for t in ranked["IBL"]],
        "system_alerts": [a.model_dump() for a in alerts],
        "explainability": {
            t.trainset_id: {
                "assignment": assign[t.trainset_id],
                "hard_rules": hard_rules[t.trainset_id] or ["none - passed all safety gates"],
                "scores": scores[t.trainset_id],
                "sources": sorted(sources.get(t.trainset_id, [])),
            } for t in trainsets
        },
    }

    audit = {"service": [e["trainset_id"] for e in results["service_list"]],
             "standby": results["standby_list"], "ibl": results["ibl_list"],
             "alerts": results["system_alerts"]}
    results["audit_hash"] = hashlib.sha256(
        json.dumps(audit, sort_keys=True).encode("utf-8")).hexdigest()
    return results

if __name__ == "__main__":
    plan_date = date.today() + timedelta(days=1)
    trains = load_trainsets(plan_date=plan_date)
    print(f"Loaded {len(trains)} trainsets. Planning for {plan_date} ({service_day_type(plan_date)} schedule).")
    plan = generate_induction_plan(trains, plan_date)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)
    print(f"SERVICE ({len(plan['service_list'])}): {[e['trainset_id'] for e in plan['service_list']]}")
    print(f"STANDBY ({len(plan['standby_list'])}): {plan['standby_list']}")
    print(f"IBL     ({len(plan['ibl_list'])}): {plan['ibl_list']}")
    print(f"Alerts: {len(plan['system_alerts'])} | audit_hash: {plan['audit_hash'][:16]}...")
    print(f"Full explainable plan saved to {OUT_JSON}")
