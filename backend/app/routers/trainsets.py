from fastapi import APIRouter
from app.supabase_client import supabase

router = APIRouter()

@router.get("/trainsets")
async def list_trainsets():
    result = supabase.table("trainsets").select("*").order("id").execute()
    return result.data

@router.get("/trainsets/{trainset_id}")
async def get_trainset(trainset_id: str):
    result = supabase.table("trainsets").select("*").eq("id", trainset_id).single().execute()
    return result.data
