# src/build_dossier.py
# Merge each trainset dossier JSON into one flat CSV for the optimizer.
import os
import glob
import json
import pandas as pd

DOSSIER_DIR = "data/processed/dossiers"
OUT_CSV = "data/processed/trainset_dossier.csv"

rows = []
for path in sorted(glob.glob(os.path.join(DOSSIER_DIR, "TS-*_dossier.json"))):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)

    fit = d.get("fitness") or {}
    jc  = d.get("job_card") or {}
    br  = d.get("branding") or {}
    mi  = d.get("mileage") or {}
    cl  = d.get("cleaning") or {}
    st  = d.get("stabling") or {}

    rows.append({
        "trainset_id":         d.get("trainset_id"),
        "fitness_status":      fit.get("validity_status"),
        "fitness_expiry":      fit.get("expiry_date"),
        "issuing_authority":   fit.get("issuing_authority"),
        "job_card_status":     jc.get("status"),
        "job_card_severity":   jc.get("severity"),
        "job_card_desc":       jc.get("description"),
        "branding_advertiser": br.get("advertiser_name"),
        "branding_min_km":     br.get("min_daily_exposure_km"),
        "branding_priority":   br.get("priority_level"),
        "odometer":            mi.get("current_odometer"),
        "target_band":         mi.get("target_band"),
        "deviation":           mi.get("deviation_status"),
        "cleaning_status":     cl.get("slot_status"),
        "cleaning_bay":        cl.get("bay_assignment"),
        "current_bay":         st.get("current_bay"),
        "shunting_cost":       st.get("shunting_cost_to_service"),
    })

df = pd.DataFrame(rows)
df.to_csv(OUT_CSV, index=False)
print(f"Saved {len(df)} trainset rows to {OUT_CSV}\n")
print(df.to_string())