from fastapi import APIRouter
from datetime import datetime
from app.supabase_client import supabase

router = APIRouter()

TODAY = datetime(2026, 8, 16, 17, 0)  # matches frontend's fixed demo "today"

def days_until(date_str: str) -> int:
    d = datetime.fromisoformat(date_str[:10])
    return (d - TODAY).days

@router.get("/compliance")
async def compliance_summary():
    staff_rows = supabase.table("staff").select("*").execute().data
    doc_rows = supabase.table("documents").select("*").execute().data

    cert_radar, expired, expiring_soon = [], 0, 0
    for s in staff_rows:
        for cert in (s.get("certifications") or []):
            d = days_until(cert["expiresOn"])
            cert_radar.append({
                "staffId": s["id"], "staffName": s["name"],
                "code": cert["code"], "name": cert["name"],
                "docId": cert.get("docId"), "daysLeft": d,
            })
            if d < 0:
                expired += 1
            elif d <= 14:
                expiring_soon += 1

    doc_gaps = [
        {"docId": d["id"], "title": d.get("title"), "status": d["status"], "confidence": d.get("confidence")}
        for d in doc_rows if d["status"] != "Indexed"
    ]

    total_checks = len(cert_radar) + len(doc_rows)
    problems = expired + len(doc_gaps)
    health = round(100 * (1 - problems / max(total_checks, 1)))
    cert_radar.sort(key=lambda c: c["daysLeft"])

    return {
        "complianceHealth": health,
        "expiredCertifications": expired,
        "expiringWithin14Days": expiring_soon,
        "documentsNeedingReview": len(doc_gaps),
        "certificationRadar": cert_radar,
        "documentGaps": doc_gaps,
    }