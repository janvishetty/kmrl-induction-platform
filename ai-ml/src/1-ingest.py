import os
import re
import glob
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from google import genai
from google.genai import types

load_dotenv()
gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# config
RAW_DATA_DIR = "data/raw"                 # folder to look at
CHROMA_PERSIST_DIR = "data/chroma_db"     # folder to save the vector DB in
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
CHUNK_SIZE = 800      # ~150-200 tokens: large enough for a paragraph, tight enough for vector search
CHUNK_OVERLAP = 100   # keeps context from being lost at chunk boundaries

# GTFS folder holds schedule data for the optimizer (parsed separately with
# pandas), not documents for RAG/Q&A — excluded from ingestion entirely.
EXCLUDE_FOLDERS = {"gtfs"}

SUPPORTED_EXT = {".pdf", ".txt", ".html"}


def get_metadata(file_path):
    """Derive trainset_id, doc_type (from parent folder), and language from the file."""
    filename = os.path.basename(file_path)
    parent_folder = os.path.basename(os.path.dirname(file_path))

    # trainset_id: first "TS-##" token anywhere in the filename, if present
    match = re.search(r"TS-?\d+", filename, re.IGNORECASE)
    if match:
        digits = re.search(r"\d+", match.group(0)).group(0)
        trainset_id = f"TS-{digits}"
    else:
        trainset_id = None

    # language: look for _en / _ml right before the extension
    lang_match = re.search(r"_(en|ml)\.", filename, re.IGNORECASE)
    language = lang_match.group(1).lower() if lang_match else "en"

    return {
        "trainset_id": trainset_id or "UNKNOWN",
        "doc_type": parent_folder,      # e.g. "job_cards", "branding_contracts", "circulars"
        "language": language,
        "source_file": filename,
    }


def extract_via_gemini_vision(file_path):
    """
    For PDFs where the internal text layer is broken (common with Malayalam/
    Indic scripts via pypdf's glyph-to-Unicode mapping), send the raw PDF
    bytes to Gemini's vision path and have it transcribe the rendered text
    directly — the same way a human eye would read it — instead of trusting
    the PDF's internal (often broken) character encoding.
    """
    with open(file_path, "rb") as f:
        pdf_bytes = f.read()

    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[
            types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            "Transcribe ALL text visible in this document exactly as it appears, "
            "preserving the original language (Malayalam and/or English). "
            "Do not translate. Do not summarize. Return only the transcribed text, "
            "in reading order, with no extra commentary."
        ],
    )
    return response.text.strip()


def load_documents():
    """Load all supported documents from data/raw, recursing into any depth of subfolders."""
    documents = []

    search_pattern = os.path.join(RAW_DATA_DIR, "**", "*")
    all_files = glob.glob(search_pattern, recursive=True)

    # Keep only files (not dirs), supported extensions, and not inside excluded folders
    filtered_files = []
    for f in all_files:
        if not os.path.isfile(f):
            continue
        if os.path.splitext(f)[1].lower() not in SUPPORTED_EXT:
            continue
        parent_folder = os.path.basename(os.path.dirname(f))
        if parent_folder in EXCLUDE_FOLDERS:
            continue
        filtered_files.append(f)

    print(f"Found {len(filtered_files)} files to process (excluded folders: {EXCLUDE_FOLDERS}).")

    for file_path in filtered_files:
        metadata = get_metadata(file_path)
        try:
            if file_path.lower().endswith(".pdf") and metadata["language"] == "ml":
                # for Malayalam PDF: route through Gemini vision OCR instead of
                # PyPDFLoader used since pypdf's text-layer extraction is unreliable for Indic scripts even when the PDF renders correctly visually.
                print(f"  -> Using Gemini vision OCR for Malayalam file: {metadata['source_file']}")
                text = extract_via_gemini_vision(file_path)
                docs = [Document(page_content=text, metadata={})]
            elif file_path.lower().endswith(".pdf"):
                loader = PyPDFLoader(file_path)
                docs = loader.load()
            else:
                loader = TextLoader(file_path, encoding="utf-8")
                docs = loader.load()

            for doc in docs:
                doc.metadata.update(metadata)
                doc.metadata["page"] = doc.metadata.get("page", 0)

            documents.extend(docs)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")

    return documents


def chunk_documents(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return text_splitter.split_documents(documents)


def store_in_chromadb(chunks):
    print("Loading embedding model (this may take a minute on first run)...")
    embedding_function = SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL)

    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    collection_name = "kmrl_documents"
    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=embedding_function,
        metadata={"hnsw:space": "cosine"}
    )

    ids, texts, metadatas = [], [], []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{chunk.metadata['source_file']}_chunk_{i}"
        ids.append(chunk_id)
        texts.append(chunk.page_content)
        metadatas.append(chunk.metadata)

    print(f"Embedding and storing {len(ids)} chunks into ChromaDB...")

    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.upsert(
            ids=ids[i:i+batch_size],
            documents=texts[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size]
        )

    print(f"Successfully stored {len(ids)} chunks in ChromaDB collection '{collection_name}'.")


if __name__ == "__main__":
    print("--- Starting RAG Ingestion Pipeline ---")

    docs = load_documents()
    print(f"Loaded {len(docs)} raw document pages.")

    if not docs:
        print("No documents found! Check your data/raw folder path and EXCLUDE_FOLDERS.")
        exit()

    #  now doing Malayalam extraction sanity check:
    # Confirms the Gemini OCR path produced readable text before embedding/chunking. If this still prints garbage, the issue is upstream (bad scan quality) rather than the extraction method.
    ml_docs = [d for d in docs if d.metadata.get("language") == "ml"]
    if ml_docs:
        print("\n--- Malayalam extraction sample check ---")
        print(f"Source: {ml_docs[0].metadata.get('source_file')}")
        print(ml_docs[0].page_content[:300])
        print("--- end sample ---\n")
    else:
        print("\n[INFO] No Malayalam-tagged documents found among loaded files.\n")

    chunks = chunk_documents(docs)
    print(f"Split into {len(chunks)} chunks.")

    store_in_chromadb(chunks)
    print("--- Ingestion complete! ---")
