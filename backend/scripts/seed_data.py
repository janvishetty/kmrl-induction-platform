import json
import hashlib
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is required to seed tables protected by RLS"
    )

supabase = create_client(os.environ["SUPABASE_URL"], SUPABASE_SERVICE_ROLE_KEY)


data = json.loads(Path(__file__).parent.joinpath("seed-data.json").read_text())


def snake(camel_dict, mapping):
    return {mapping.get(k, k): v for k, v in camel_dict.items()}


doc_map = {
    "titleMl": "title_ml",
    "fileName": "file_name",
    "type": "doc_type",
    "uploadedBy": "uploaded_by",
    "uploadedAt": "uploaded_at",
    "effectiveFrom": "effective_from",
    "expiresOn": "expires_on",
    "employeeIds": "employee_ids",
}
staff_map = {
    "nameMl": "name_ml",
    "experienceYears": "experience_years",
    "trainingHours12m": "training_hours_12m",
    "restHoursSinceLastShift": "rest_hours_since_last_shift",
    "shiftsLast7Days": "shifts_last_7_days",
    "competencyScore": "competency_score",
    "photoInitials": "photo_initials",
}
alert_map = {
    "titleMl": "title_ml",
    "linkedDocId": "linked_doc_id",
    "linkedStaffId": "linked_staff_id",
    "raisedAt": "raised_at",
}
trainset_map = {"jobCards": "job_cards"}

for row in data["documents"]:
    document = snake(row, doc_map)
    document["hash"] = hashlib.sha256(
        json.dumps(row, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()
    supabase.table("documents").upsert(document).execute()

for row in data["staff"]:
    supabase.table("staff").upsert(snake(row, staff_map)).execute()

for row in data["trainsets"]:
    supabase.table("trainsets").upsert(snake(row, trainset_map)).execute()

for row in data["alerts"]:
    supabase.table("alerts").upsert(snake(row, alert_map)).execute()

for row in data["seedAudit"]:
    supabase.table("audit_trail").upsert(row).execute()


print("Seeded documents, staff, trainsets, alerts, audit_trail")
full = json.loads(Path(__file__).parent.joinpath("kmrl_seed_full.json").read_text())

for row in full["stations"]:
    supabase.table("stations").upsert({
        "id": row["id"],
        "order": row["order"],
        "name": row["name"],
        "lat": row["lat"],
        "lng": row["lng"],
        "is_terminal": row["isTerminal"],
        "is_transfer": row["isTransfer"],
        "coord_source": row["coordSource"],
    }).execute()

full_trainset_map = {
    "jobCards": "job_cards",
    "fitnessCertExpiresOn": "fitness_cert_expires_on",
    "fitnessCertStatus": "fitness_cert_status",
    "stablingDepot": "stabling_depot",
    "stablingBay": "stabling_bay",
}
for row in full["trainsets"]:
    supabase.table("trainsets").upsert(snake(row, full_trainset_map)).execute()

for row in full["extraStaff"]:
    supabase.table("staff").upsert(snake(row, staff_map)).execute()

print(f"Seeded {len(full['stations'])} stations, {len(full['trainsets'])} full trainsets, {len(full['extraStaff'])} extra staff")