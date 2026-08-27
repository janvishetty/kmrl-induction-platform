import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase  # Import your live Supabase connection

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
        # 1. FETCH DATA STRICTLY FROM SUPABASE DATABASE
        db_context = "No specific database records found."
        
        # If the user asks about a specific trainset (e.g., "ts-01" or "ts1")
        if "ts-" in query_text or "ts" in query_text:
            # Extract trainset ID pattern if possible, or fetch all trainsets to match
            response = supabase.table("trainsets").select("*").execute()
            if response.data:
                # Filter matching trainsets
                matching = [t for t in response.data if t.get("trainset_id", "").lower() in query_text or t.get("id", "").lower() in query_text]
                if matching:
                    db_context = f"Trainset Database Records: {matching}"
                else:
                    db_context = f"All Trainset Records in Database: {response.data}"
        else:
            # Fetch general documents or inventory data
            doc_response = supabase.table("documents").select("*").limit(5).execute()
            if doc_response.data:
                db_context = f"KMRL Document Database Records: {doc_response.data}"

        # 2. CONSTRUCT STRICT PROMPT FOR GEMINI
        model = genai.GenerativeModel('gemini-3.6-flash')
        
        system_prompt = (
            "You are Kora, the official AI Document Assistant for Kochi Metro Rail Limited (KMRL). "
            "You must answer the user's query STRICTLY based on the provided database records below. "
            "Do NOT use outside knowledge. Do NOT mention Telangana or cars. "
            "If the information is not present in the database records, state clearly: 'I cannot find that information in the KMRL database.'\n\n"
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