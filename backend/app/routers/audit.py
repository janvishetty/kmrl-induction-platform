import uuid
from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(
    prefix="/audit",
    tags=["Audit Trail"]
)

@router.get("/logs")
def get_audit_logs():
    """Fetches the complete audit trail history from Supabase."""
    try:
        response = supabase.table("audit_trail").select("*").order("at", desc=True).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log")
def create_audit_log(action: str, actor: str, target: str, audit_hash: str):
    """Inserts a new blockchain hash into the audit trail."""
    try:
        # Generate a unique ID like AUD-A1B2C
        unique_id = f"AUD-{uuid.uuid4().hex[:5].upper()}"
        
        new_log = {
            "id": unique_id,    # <-- Now we are passing the required ID!
            "action": action,
            "actor": actor,
            "target": target,
            "hash": audit_hash
        }
        response = supabase.table("audit_trail").insert(new_log).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))