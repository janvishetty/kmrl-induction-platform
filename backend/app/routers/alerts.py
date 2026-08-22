from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.supabase_client import supabase

router = APIRouter()

@router.get("/alerts")
async def list_alerts():
    result = supabase.table("alerts").select("*").order("raised_at", desc=True).execute()
    return result.data

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    result = supabase.table("alerts").update({"acknowledged": True}).eq("id", alert_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    supabase.table("audit_trail").insert({
        "id": f"AUD-{int(datetime.utcnow().timestamp())}",
        "at": datetime.utcnow().isoformat(),
        "actor": "Duty Controller (You)",
        "action": "APPROVE",
        "target": f"{alert_id} escalation",
        "detail": "Acknowledged via Alerts screen.",
    }).execute()

    return result.data[0]