# Upload trainset_dossier.csv to Supabase.
import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

CSV_PATH = "data/processed/trainset_dossier.csv"
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

df = pd.read_csv(CSV_PATH)
rows = df.to_dict(orient="records")

# Convert NaN to None for Supabase
for row in rows:
    for k, v in row.items():
        if pd.isna(v):
            row[k] = None

print(f"Uploading {len(rows)} rows to Supabase...")
# Explicitly tell Supabase to update on trainset_id conflict
response = sb.table("trainset_dossier").upsert(rows, on_conflict="trainset_id").execute()

print(f" Successfully synced {len(response.data)} trainsets to Supabase!")
