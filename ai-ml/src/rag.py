"""KORA — Bilingual (EN/ML) RAG chatbot over local ChromaDB.

Hybrid retrieval:
- If the question mentions a trainset ID such as TS-02,
  retrieval is scoped to that trainset.
- Otherwise, normal global vector search is performed.
- Answers are generated using Gemini from retrieved context only.
"""

import os
import re
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.utils.embedding_functions import (
    SentenceTransformerEmbeddingFunction,
)
from google import genai
from dotenv import load_dotenv


# ============================================================
# PATHS / ENVIRONMENT
# ============================================================

# __file__ = ai-ml/src/rag.py
# parent      = ai-ml/src
# parent.parent = ai-ml
BASE_DIR = Path(__file__).resolve().parent.parent

# Explicitly load ai-ml/.env
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)


# ============================================================
# CONFIGURATION
# ============================================================

# ai-ml/data/chroma_db
CHROMA_PATH = BASE_DIR / "data" / "chroma_db"

COLLECTION = "kmrl_documents"

EMBEDDING_MODEL = (
    "sentence-transformers/"
    "paraphrase-multilingual-mpnet-base-v2"
)

LLM_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash"
)


# ============================================================
# API KEY
# ============================================================

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError(
        f"GOOGLE_API_KEY was not found. "
        f"Make sure it exists in {ENV_FILE}"
    )


# ============================================================
# CHROMADB
# ============================================================

_client = chromadb.PersistentClient(
    path=str(CHROMA_PATH)
)

# The collection should already have been created by ingest.py.
_collection = _client.get_collection(
    COLLECTION,
    embedding_function=SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    ),
)


# ============================================================
# GEMINI
# ============================================================

gemini = genai.Client(
    api_key=GOOGLE_API_KEY
)


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """You are KORA, the Document Assistant for
Kochi Metro Rail Limited.

Answer using ONLY the provided context chunks.

Rules:
1. Mention the source document name when answering.
2. Reply in the SAME language as the user's question:
   - English question → English answer
   - Malayalam question → Malayalam answer
3. If the context does not contain the answer,
   say so plainly.
4. Never invent or assume facts.
5. Do not use information outside the provided context.
"""


# ============================================================
# TRAINSET ID HELPERS
# ============================================================

def _norm(tid: str) -> str:
    """
    Normalize trainset IDs.

    Examples:
        ts-2  -> TS-2
        TS-02 -> TS-02
        TS-25 -> TS-25
    """

    d = re.search(
        r"\d+",
        tid
    )

    return (
        f"TS-{d.group(0)}"
        if d
        else tid.upper()
    )


def _detect_trainset(
    query: str
) -> Optional[str]:
    """
    Automatically detect a trainset ID
    from the user's question.

    Examples:
        "What is the status of TS-02?"
        -> TS-02

        "Tell me about ts-15"
        -> TS-15
    """

    match = re.search(
        r"TS-?\d+",
        query,
        re.IGNORECASE
    )

    return (
        _norm(match.group(0))
        if match
        else None
    )


# ============================================================
# RETRIEVAL
# ============================================================

def _retrieve(
    query: str,
    trainset_id: Optional[str],
    n_results: int
):
    """
    Retrieve relevant documents from ChromaDB.

    If trainset_id is provided, search only documents
    belonging to that trainset.
    """

    kwargs = {
        "query_texts": [query],
        "n_results": n_results,
    }

    if trainset_id:

        kwargs["where"] = {
            "trainset_id": trainset_id
        }

    result = _collection.query(
        **kwargs
    )

    documents = result.get(
        "documents",
        [[]]
    )[0]

    metadatas = result.get(
        "metadatas",
        [[]]
    )[0]

    return documents, metadatas


# ============================================================
# ASK KORA
# ============================================================

def ask(
    query: str,
    trainset_id: Optional[str] = None,
    n_results: int = 4
) -> dict:
    """
    Main RAG chatbot function.

    Returns:

    {
        "answer": "...",
        "sources": [...]
    }
    """

    # --------------------------------------------------------
    # Detect trainset
    # --------------------------------------------------------

    tid = (
        _norm(trainset_id)
        if trainset_id
        else _detect_trainset(query)
    )

    # --------------------------------------------------------
    # Retrieval size
    # --------------------------------------------------------

    # When a trainset is specified, retrieve more documents
    # because the train may have multiple certificates,
    # job cards, cleaning records, branding documents, etc.
    k = (
        max(n_results, 8)
        if tid
        else n_results
    )

    # --------------------------------------------------------
    # Retrieve
    # --------------------------------------------------------

    docs, metas = _retrieve(
        query,
        tid,
        k
    )

    # --------------------------------------------------------
    # Fallback
    # --------------------------------------------------------

    # If TS-XX was mentioned but no documents were found
    # for that train, perform a global search.
    if not docs and tid:

        docs, metas = _retrieve(
            query,
            None,
            n_results
        )

    # --------------------------------------------------------
    # No documents
    # --------------------------------------------------------

    if not docs:

        return {
            "answer": "No relevant documents found.",
            "sources": [],
        }

    # --------------------------------------------------------
    # Build context
    # --------------------------------------------------------

    context_parts = []

    for doc, metadata in zip(
        docs,
        metas
    ):

        source_file = metadata.get(
            "source_file",
            "unknown"
        )

        language = metadata.get(
            "language",
            "en"
        )

        context_parts.append(
            f"[source: {source_file} | lang: {language}]\n"
            f"{doc}"
        )

    context = "\n\n".join(
        context_parts
    )

    # --------------------------------------------------------
    # Prompt
    # --------------------------------------------------------

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"CONTEXT:\n"
        f"{context}\n\n"
        f"QUESTION:\n"
        f"{query}\n\n"
        f"ANSWER:"
    )

    # --------------------------------------------------------
    # Gemini
    # --------------------------------------------------------

    response = gemini.models.generate_content(
        model=LLM_MODEL,
        contents=[prompt]
    )

    answer = (
        response.text.strip()
        if response.text
        else "No answer was generated."
    )

    # --------------------------------------------------------
    # Sources
    # --------------------------------------------------------

    sources = sorted(
        {
            metadata.get(
                "source_file",
                "unknown"
            )
            for metadata in metas
        }
    )

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return {
        "answer": answer,
        "sources": sources,
    }