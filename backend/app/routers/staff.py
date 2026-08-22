from fastapi import APIRouter
from app.supabase_client import supabase

router = APIRouter()

@router.get("/staff")
async def list_staff():
    result = supabase.table("staff").select("*").order("competency_score", desc=True).execute()
    return result.data

@router.get("/staff/{staff_id}")
async def get_staff(staff_id: str):
    result = supabase.table("staff").select("*").eq("id", staff_id).single().execute()
    return result.data