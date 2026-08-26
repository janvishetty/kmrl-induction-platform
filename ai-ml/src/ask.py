# src/ask.py
"""
KORA CHATBOT
KMRL Cited Q&A

"""
import os
from dotenv import load_dotenv
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from google import genai

load_dotenv()

CHROMA_PERSIST_DIR = "data/chroma_db"
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
GEMINI_MODEL = "gemini-3.6-flash"

#connect to chromadb
_embedding_fn = SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL)
_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
collection = _client.get_collection(name="kmrl_documents", embedding_function=_embedding_fn)

# Gemini client 
genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def retrieve(query: str, trainset_id: str = None, k: int = 6):
    """Semantic search with smart fallbacks for the hackathon."""
    if trainset_id:
        # If asking about a specific train, fetch up to 15 chunks.
        # A train only has ~10-15 chunks total. This feeds the whole "dossier" to Gemini,
        # preventing the "split chunk" problem where the title and data are in different chunks.
        where = {"trainset_id": trainset_id}
        res = collection.query(query_texts=[query], n_results=15, where=where)
    else:
        # General query: search top 6 chunks across all documents
        res = collection.query(query_texts=[query], n_results=k)
        
    return res["documents"][0], res["metadatas"][0]


def ask_kmrl(query: str, trainset_id: str = None, k: int = 6):
    """Retrieve relevant chunks, generate a cited answer with Gemini."""
    docs, metas = retrieve(query, trainset_id, k)

    # Deduplicate sources so we don't list the same file 5 times
    unique_sources = []
    seen = set()
    for m in metas:
        if m.get("source_file") not in seen:
            unique_sources.append(m)
            seen.add(m.get("source_file"))

    context = ""
    for i, (d, m) in enumerate(zip(docs, metas), 1):
        context += (
            f"\n[Doc {i} | trainset: {m.get('trainset_id')} | "
            f"doc_type: {m.get('doc_type')} | file: {m.get('source_file')}]\n{d}\n"
        )

    prompt = f"""You are KORA, the KMRL Document Intelligence assistant for Kochi Metro Rail Limited.
Answer the question using ONLY the context below.
- If the answer is not in the context, say: "I don't know based on the available documents."
- If the question is in Malayalam, answer in Malayalam.
- Cite every fact with its source file like [Source: TS-03_fitness_cert_ml.pdf].
- Read carefully! The data you need might be spread across multiple chunks from the same file.

Context:{context}

Question: {query}
Answer:"""

    resp = genai_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)

    sources = [
        {"source_file": m.get("source_file"),
         "trainset_id": m.get("trainset_id"),
         "doc_type": m.get("doc_type")}
        for m in unique_sources
    ]
    return resp.text, sources


if __name__ == "__main__":
    tests = [
        ("When does the fitness certificate for TS-03 expire?", "TS-03"),
        ("What subsystems were inspected on TS-02?", "TS-02"), # Added filter!
        ("ട്രെയിൻസെറ്റ് TS-03 ന്റെ ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ് നമ്പർ എന്താണ്?", "TS-03"),
    ]
    for q, ts in tests:
        print("\n" + "=" * 60)
        print(f"Q: {q}" + (f"   [filter: {ts}]" if ts else ""))
        answer, sources = ask_kmrl(q, trainset_id=ts)
        print("-" * 60)
        print(answer)
        print("Retrieved sources:", [s["source_file"] for s in sources])
