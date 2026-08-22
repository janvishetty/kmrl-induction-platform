from fastapi import APIRouter, HTTPException

from app.supabase_client import supabase

router = APIRouter()


@router.get("/stations")
async def list_stations():
    try:
        result = (
            supabase
            .table("stations")
            .select("*")
            .order("order")
            .execute()
        )

        return result.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch stations: {str(e)}"
        )
