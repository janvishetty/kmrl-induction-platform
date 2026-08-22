from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts Module"]
)

@router.get("/")
def get_alerts():
    """Fetches all system alerts from Supabase for the frontend notification centre."""
    try:
        response = supabase.table("alerts").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))