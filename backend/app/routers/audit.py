from fastapi import APIRouter
from app.supabase_client import supabase

router = APIRouter()

@router.get("/audit")
async def list_audit():
    result = supabase.table("audit_trail").select("*").order("at", desc=True).execute()
    return result.data