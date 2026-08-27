import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase

router = APIRouter()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class AskRequest(BaseModel):
    query: str

@router.post("/ask")
async def ask_kora(request: AskRequest):
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key missing")
    
    query_text = request.query.strip().lower()
    
    try:
        # 1. FETCH DATA FROM SUPABASE
        db_context = "No specific database records found."
        
        if "ts-" in query_text or "ts" in query_text:
            response = supabase.table("trainsets").select("*").execute()
            if response.data:
                matching = [t for t in response.data if t.get("trainset_id", "").lower() in query_text or t.get("id", "").lower() in query_text]
                if matching:
                    db_context = f"Trainset Database Records: {matching}"
                else:
                    db_context = f"All Trainset Records in Database: {response.data}"
        else:
            doc_response = supabase.table("documents").select("*").limit(5).execute()
            if doc_response.data:
                db_context = f"KMRL Document Database Records: {doc_response.data}"

        # 2. CONSTRUCT MULTILINGUAL RAG PROMPT
        model = genai.GenerativeModel('gemini-3.6-flash')
        
        system_prompt = (
            "You are Kora, the official AI Document Assistant for Kochi Metro Rail Limited (KMRL). "
            "You must answer the user's query STRICTLY based on the provided database records below. "
            "Do NOT use outside knowledge. Do NOT mention Telangana or cars. "
            "LANGUAGE RULE: Detect the language of the user's query (English or Malayalam) and respond in that exact same language (English or Malayalam). "
            "If information is missing, reply in the user's language stating it cannot be found in the database.\n\n"
            f"--- DATABASE RECORDS ---\n{db_context}\n------------------------\n\n"
            f"User Query: {request.query}"
        )
        
        gemini_response = model.generate_content(system_prompt)
        
        return {
            "answer": gemini_response.text,
            "sources": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))