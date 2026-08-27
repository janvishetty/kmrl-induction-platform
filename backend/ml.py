import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# It will grab the key you just saved in Render!
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class AskRequest(BaseModel):
    query: str

@router.post("/ask")
async def ask_kora(request: AskRequest):
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key missing")
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(request.query)
        return {"answer": response.text, "sources": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))