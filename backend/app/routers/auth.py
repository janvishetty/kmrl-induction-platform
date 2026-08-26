from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/admin/login")
async def admin_login(payload: LoginRequest):
    if (
        payload.username == os.getenv("ADMIN_USERNAME")
        and payload.password == os.getenv("ADMIN_PASSWORD")
    ):
        return {"success": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")
