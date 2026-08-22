# src/extract_dossier.py
import os
import glob
import json
import time
import pymupdf
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

TRAINSET_IDS = [f"TS-{str(i).zfill(2)}" for i in range(1, 26)]
RAW_DIR = "data/raw"
OUT_DIR = "data/processed/dossiers"
os.makedirs(OUT_DIR, exist_ok=True)

DOC_FOLDERS = {
    "fitnesscerts": "fitness",
    "job_cards": "job_card",
    "branding_contracts": "branding",
    "mileage_records": "mileage",
    "cleaning_slots": "cleaning",
    "stabling_geometry": "stabling"
}

def get_doc_part(file_path):
    is_ml = "_ml.pdf" in file_path.lower()
    if is_ml:
        doc = pymupdf.open(file_path)
        img_bytes = doc[0].get_pixmap(matrix=pymupdf.Matrix(2, 2)).tobytes("png")
        doc.close()
        return types.Part.from_bytes(data=img_bytes, mime_type="image/png")
    else:
        doc = pymupdf.open(file_path)
        text = "\n".join([page.get_text() for page in doc])
        doc.close()
        return text 

JSON_SCHEMA = """
{
  "trainset_id": "TS-XX",
  "fitness": { "validity_status": "valid or expired", "expiry_date": "YYYY-MM-DD", "issuing_authority": "string" },
  "job_card": { "status": "open or closed", "severity": "critical, major, minor, or none", "description": "string" },
  "branding": { "advertiser_name": "string or null", "min_daily_exposure_km": "integer or null", "priority_level": "high, medium, low, or none" },
  "mileage": { "current_odometer": "integer", "target_band": "string", "deviation_status": "normal or deviated" },
  "cleaning": { "slot_status": "scheduled, completed, or cancelled", "bay_assignment": "string" },
  "stabling": { "current_bay": "string", "shunting_cost_to_service": "integer or string" }
}
"""

def extract_trainset_dossier(ts_id):
    contents = []
    contents.append("You are an expert document parser for Kochi Metro Rail Limited (KMRL).")
    contents.append(f"Below are the 6 operational documents for Trainset {ts_id}.")
    contents.append("Extract the data into the provided JSON schema. If a document is missing or a field is not found, use null.")
    contents.append(f"Target JSON Schema:\n{JSON_SCHEMA}")
    contents.append("Output ONLY the raw JSON. No markdown, no explanation.")
    
    for folder, json_key in DOC_FOLDERS.items():
        pattern = os.path.join(RAW_DIR, folder, f"{ts_id}*.pdf")
        matches = glob.glob(pattern)
        
        if matches:
            file_path = matches[0]
            filename = os.path.basename(file_path)
            contents.append(f"\n--- Document: {json_key} (File: {filename}) ---")
            contents.append(get_doc_part(file_path))
        else:
            contents.append(f"\n--- Document: {json_key} ---\n[Document Missing]")

    response = genai_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=contents,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)

if __name__ == "__main__":
    print(" Starting Batch Dossier Extraction ")
    success_count = 0
    
    for ts_id in TRAINSET_IDS:
        out_path = os.path.join(OUT_DIR, f"{ts_id}_dossier.json")
        
        if os.path.exists(out_path):
            print(f"⏭ Skipping {ts_id} (already extracted)")
            success_count += 1
            continue
            
        print(f"Extracting full dossier for {ts_id} (6 docs in 1 prompt)")
        
        retries = 0
        success = False
        
        #  FIXED RETRY LOGIC
        while retries < 4 and not success:
            try:
                dossier = extract_trainset_dossier(ts_id)
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(dossier, f, indent=2, ensure_ascii=False)
                print(f"   Saved {ts_id}_dossier.json")
                success_count += 1
                success = True
            except Exception as e:
                if "429" in str(e):
                    print(f"   Rate limit hit! Waiting 65 seconds to retry {ts_id}...")
                    time.sleep(65) # Wait for the RPM window to reset
                    retries += 1
                else:
                    print(f"   Error extracting {ts_id}: {e}")
                    break
                    
        # 3.5s sleep to respect the 20 RPM rate limit AFTER a successful call
        time.sleep(3.5)
        
    print(f"\n Done! Extracted {success_count}/25 dossiers in {OUT_DIR}")
