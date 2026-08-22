# src/explain.py
"""
Explainability factor - Turns the optimizer's explainability data into human-readable rationale. Supports full dump OR single-train demo query.
"""

import os
import sys
import json
import pandas as pd

PLAN_JSON   = "data/processed/induction_plan.json"
DOSSIER_CSV = "data/processed/trainset_dossier.csv"
OUT_JSON    = "data/processed/explanations.json"

ARGS = [a for a in sys.argv[1:]]
USE_GEMINI = "--gemini" in ARGS
QUERY_TRAIN = next((a.upper() for a in ARGS if not a.startswith("--")), None)

if USE_GEMINI:
    from google import genai
    from dotenv import load_dotenv
    load_dotenv()
    genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

#Load dossier to mention cleaning status in explanation
dossier = {}
if os.path.exists(DOSSIER_CSV):
    _df = pd.read_csv(DOSSIER_CSV).fillna("")
    for _, r in _df.iterrows():
        dossier[str(r["trainset_id"])] = r

#rule based core
def build_explanation(train_id, info, plan):
    assignment = info.get("assignment", "?")
    hard_rules = info.get("hard_rules", [])
    scores = info.get("scores", {})
    sources = info.get("sources", [])

    d = dossier.get(train_id)
    cleaning = str(d.get("cleaning_status", "")).strip().lower() if d is not None else ""

    lines = []
    #Header
    if assignment == "SERVICE":
        lines.append(f"[SERVICE] {train_id} is CLEARED FOR SERVICE on {plan.get('plan_date')}.")
    elif assignment == "STANDBY":
        lines.append(f"[STANDBY] {train_id} is held in STANDBY (healthy reserve) on {plan.get('plan_date')}.")
    else:
        lines.append(f"[IBL] {train_id} is sent to IBL (maintenance) on {plan.get('plan_date')}.")

    #Hard safety rules
    has_hard = bool(hard_rules) and hard_rules != ["none - passed all safety gates"]
    if has_hard:
        lines.append("  Blocked by hard safety rule(s):")
        for r in hard_rules:
            lines.append(f"     - {r}")
    else:
        lines.append("  Passed all hard safety gates (valid fitness cert, no critical open job card).")

    #Cleaning note (why a healthy train also couldn't enter service)
    if cleaning == "scheduled":
        lines.append("     - Cleaning was still scheduled tonight, so it could not enter service.")

    #Assignment-specific rationale (no contradictory factors)
    s = scores
    if assignment == "SERVICE":
        why = []
        if s.get("branding", 0) > 0:
            why.append(f"active branding contract (+{s['branding']})")
        if s.get("mileage_balance", 0) > 1.5:
            why.append("low odometer helps balance fleet wear")
        if s.get("shunting", 0) < 0.4:
            why.append("low shunting cost from current bay")
        if why:
            lines.append("  Selected for service because: " + "; ".join(why) + ".")
    elif assignment == "STANDBY":
        lines.append("  Healthy and available, but not required in tonight's service roster.")
    else:  # IBL
        why = []
        if s.get("maintenance_need", 0) > 0:
            why.append("open job card / deviated mileage needs attention")
        if not has_hard and not why:
            why.append("maintenance workload balancing")
        if why:
            lines.append("  Maintenance rationale: " + "; ".join(why) + ".")

    if sources:
        lines.append("  Based on: " + ", ".join(sources))

    return "\n".join(lines)

# gemini polish
def gemini_polish(train_id, raw):
    prompt = (
        "You are a KMRL depot operations assistant. Rewrite this train induction "
        "explanation into 1-2 clear, professional sentences for a supervisor. "
        "Stay factual; do not invent details.\n\n" + raw
    )
    resp = genai_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return resp.text.strip()

# main
def main():
    if not os.path.exists(PLAN_JSON):
        print(f"❌ {PLAN_JSON} not found. Run optimize.py first.")
        return
    with open(PLAN_JSON, encoding="utf-8") as f:
        plan = json.load(f)
    explainability = plan.get("explainability", {})

    # single train demo
    if QUERY_TRAIN:
        if QUERY_TRAIN not in explainability:
            print(f"❌ Train {QUERY_TRAIN} not found. Available: {sorted(explainability)}")
            return
        info = explainability[QUERY_TRAIN]
        raw = build_explanation(QUERY_TRAIN, info, plan)
        final = gemini_polish(QUERY_TRAIN, raw) if USE_GEMINI else raw
        print(f"\n{'='*70}\nWHY IS {QUERY_TRAIN} IN {info.get('assignment')}?\n{'='*70}")
        print(final)
        print(f"{'='*70}\n")
        return

    # full dump
    explanations = {}
    for train_id, info in explainability.items():
        raw = build_explanation(train_id, info, plan)
        if USE_GEMINI:
            try:
                final = gemini_polish(train_id, raw)
            except Exception as e:
                print(f"  Gemini failed for {train_id} ({e}); using rule-based.")
                final = raw
        else:
            final = raw
        explanations[train_id] = {
            "assignment": info.get("assignment"),
            "explanation": final,
            "sources": info.get("sources", []),
        }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(explanations, f, indent=2, ensure_ascii=False)

    order = {"IBL": 0, "SERVICE": 1, "STANDBY": 2}
    print(f"\n{'='*70}\nINDUCTION EXPLANATIONS - {plan.get('plan_date')} "
          f"({plan.get('day_type')} schedule)\n{'='*70}")
    for train_id in sorted(explanations, key=lambda t: order[explanations[t]["assignment"]]):
        print("\n" + explanations[train_id]["explanation"])

    print(f"\nSaved {len(explanations)} explanations to {OUT_JSON}")
    if not USE_GEMINI:
        print("   (rule-based; add --gemini for polished prose)")

if __name__ == "__main__":
    main()
