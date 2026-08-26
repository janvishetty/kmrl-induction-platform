"""KORA — Bilingual (EN/ML) RAG chatbot over local ChromaDB.

Hybrid retrieval: if the question mentions a trainset ID (like TS-02, etc.)
the vector search is scoped to that train's documents via metadata filtering.
This fixes the "25 near-identical certificates" confusion of pure vector search.
Scoped searches fetch the train's full mini-dossier so the right doc is always in context.
"""
import os
import re
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from google import genai
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

CHROMA_PATH = "data/chroma_db"
COLLECTION = "kmrl_documents"   # matches ingest.py
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"  # matches ingest.py

_client = chromadb.PersistentClient(path=CHROMA_PATH)
_collection = _client.get_collection(
    COLLECTION,
    embedding_function=SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL),
)

gemini = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
LLM_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

SYSTEM_PROMPT = """You are KORA, the Document Assistant for Kochi Metro Rail Limited.
Answer using ONLY the provided context chunks and mention the source document name.
IMPORTANT: Reply in the SAME language as the user's question (English or Malayalam).
If the context does not contain the answer, say so plainly. Never invent facts."""

def _norm(tid: str) -> str:
    """Normalize any ID form ('ts-2', 'TS-02') to metadata format 'TS-02'."""
    d = re.search(r"\d+", tid)
    return f"TS-{d.group(0)}" if d else tid.upper()

def _detect_trainset(query: str) -> Optional[str]:
    """Auto-extract 'TS-XX' from the question text."""
    m = re.search(r"TS-?\d+", query, re.IGNORECASE)
    return _norm(m.group(0)) if m else None

def _retrieve(query: str, trainset_id: Optional[str], n_results: int):
    kwargs = {"query_texts": [query], "n_results": n_results}
    if trainset_id:
        kwargs["where"] = {"trainset_id": trainset_id}   # metadata-scoped vector search
    res = _collection.query(**kwargs)
    return res.get("documents", [[]])[0], res.get("metadatas", [[]])[0]

def ask(query: str, trainset_id: Optional[str] = None, n_results: int = 4) -> dict:
    tid = _norm(trainset_id) if trainset_id else _detect_trainset(query)

    # Scoped search = tiny corpus : the train's whole mini-dossier (cert included)
    k = max(n_results, 8) if tid else n_results
    docs, metas = _retrieve(query, tid, k)
    if not docs and tid:   # unknown train mentioned -> fall back to global search
        docs, metas = _retrieve(query, None, n_results)

    if not docs:
        return {"answer": "No relevant documents found.", "sources": []}

    context = "\n\n".join(
        f"[source: {m.get('source_file', 'unknown')} | lang: {m.get('language', 'en')}]\n{d}"
        for d, m in zip(docs, metas)
    )
    prompt = f"{SYSTEM_PROMPT}\n\nCONTEXT:\n{context}\n\nQUESTION: {query}\nANSWER:"
    answer = gemini.models.generate_content(model=LLM_MODEL, contents=[prompt]).text
    sources = sorted({m.get("source_file", "unknown") for m in metas})
    return {"answer": answer, "sources": sources}
