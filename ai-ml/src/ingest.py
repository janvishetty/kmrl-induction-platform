import os
import re
import glob
from pathlib import Path

from dotenv import load_dotenv

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from google import genai
from google.genai import types


# ============================================================
# PATHS / ENVIRONMENT
# ============================================================

# ai-ml/
BASE_DIR = Path(__file__).resolve().parent.parent

# ai-ml/.env
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)

# Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError(
        "GOOGLE_API_KEY was not found. "
        f"Make sure it exists in {ENV_FILE}"
    )

gemini_client = genai.Client(api_key=GOOGLE_API_KEY)


# ============================================================
# CONFIGURATION
# ============================================================

# ai-ml/data/raw
RAW_DATA_DIR = BASE_DIR / "data" / "raw"

# ai-ml/data/chroma_db
CHROMA_PERSIST_DIR = BASE_DIR / "data" / "chroma_db"

COLLECTION_NAME = "kmrl_documents"

EMBEDDING_MODEL = (
    "sentence-transformers/"
    "paraphrase-multilingual-mpnet-base-v2"
)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100

# GTFS is used separately by the optimizer.
# It should NOT be included in RAG ingestion.
EXCLUDE_FOLDERS = {"gtfs"}

SUPPORTED_EXT = {".pdf", ".txt", ".html"}


# ============================================================
# METADATA
# ============================================================

def get_metadata(file_path):
    """
    Derive trainset_id, document type and language
    from the document filename/folder.
    """

    filename = os.path.basename(file_path)

    parent_folder = os.path.basename(
        os.path.dirname(file_path)
    )

    # Example:
    # TS-02_jobcard.pdf -> TS-02
    match = re.search(
        r"TS-?\d+",
        filename,
        re.IGNORECASE
    )

    if match:
        digits = re.search(
            r"\d+",
            match.group(0)
        ).group(0)

        trainset_id = f"TS-{digits}"
    else:
        trainset_id = None

    # Example:
    # TS-03_fitness_cert_ml.pdf -> ml
    # TS-25_fitness_cert_en.pdf -> en
    lang_match = re.search(
        r"_(en|ml)\.",
        filename,
        re.IGNORECASE
    )

    language = (
        lang_match.group(1).lower()
        if lang_match
        else "en"
    )

    return {
        "trainset_id": trainset_id or "UNKNOWN",
        "doc_type": parent_folder,
        "language": language,
        "source_file": filename,
    }


# ============================================================
# GEMINI OCR FOR MALAYALAM PDFs
# ============================================================

def extract_via_gemini_vision(file_path):
    """
    Extract text from Malayalam PDFs using Gemini.
    """

    with open(file_path, "rb") as f:
        pdf_bytes = f.read()

    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[
            types.Part.from_bytes(
                data=pdf_bytes,
                mime_type="application/pdf"
            ),
            (
                "Transcribe ALL text visible in this document "
                "exactly as it appears, preserving the original "
                "language (Malayalam and/or English). "
                "Do not translate. Do not summarize. "
                "Return only the transcribed text, "
                "in reading order, with no extra commentary."
            ),
        ],
    )

    return response.text.strip()


# ============================================================
# LOAD DOCUMENTS
# ============================================================

def load_documents():
    """
    Load supported documents from ai-ml/data/raw.
    """

    documents = []

    search_pattern = str(
        RAW_DATA_DIR / "**" / "*"
    )

    all_files = glob.glob(
        search_pattern,
        recursive=True
    )

    filtered_files = []

    for file_path in all_files:

        # Ignore directories
        if not os.path.isfile(file_path):
            continue

        # Only supported file types
        extension = os.path.splitext(
            file_path
        )[1].lower()

        if extension not in SUPPORTED_EXT:
            continue

        # Ignore GTFS folder
        parent_folder = os.path.basename(
            os.path.dirname(file_path)
        )

        if parent_folder in EXCLUDE_FOLDERS:
            continue

        filtered_files.append(file_path)

    print(
        f"Found {len(filtered_files)} files to process "
        f"(excluded folders: {EXCLUDE_FOLDERS})."
    )

    for file_path in filtered_files:

        metadata = get_metadata(file_path)

        try:

            # ------------------------------------------------
            # Malayalam PDF → Gemini OCR
            # ------------------------------------------------

            if (
                file_path.lower().endswith(".pdf")
                and metadata["language"] == "ml"
            ):

                print(
                    "  -> Using Gemini vision OCR for "
                    f"Malayalam file: {metadata['source_file']}"
                )

                text = extract_via_gemini_vision(
                    file_path
                )

                docs = [
                    Document(
                        page_content=text,
                        metadata={}
                    )
                ]

            # ------------------------------------------------
            # Normal PDF
            # ------------------------------------------------

            elif file_path.lower().endswith(".pdf"):

                loader = PyPDFLoader(file_path)
                docs = loader.load()

            # ------------------------------------------------
            # TXT / HTML
            # ------------------------------------------------

            else:

                loader = TextLoader(
                    file_path,
                    encoding="utf-8"
                )

                docs = loader.load()

            # ------------------------------------------------
            # Clean and attach metadata
            # ------------------------------------------------

            for doc in docs:

                # Remove hidden/control characters
                doc.page_content = re.sub(
                    r"[\x00-\x1F\x7F-\x9F]",
                    " ",
                    doc.page_content
                )

                # Normalize whitespace
                doc.page_content = re.sub(
                    r"\s+",
                    " ",
                    doc.page_content
                ).strip()

                # Add our metadata
                doc.metadata.update(metadata)

                # Keep page number
                doc.metadata["page"] = doc.metadata.get(
                    "page",
                    0
                )

            documents.extend(docs)

        except Exception as e:

            print(
                f"Error loading {file_path}: {e}"
            )

    return documents


# ============================================================
# CHUNK DOCUMENTS
# ============================================================

def chunk_documents(documents):

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ],
    )

    return text_splitter.split_documents(
        documents
    )


# ============================================================
# STORE IN CHROMADB
# ============================================================

def store_in_chromadb(chunks):

    print(
        "Loading embedding model "
        "(this may take a minute on first run)..."
    )

    embedding_function = (
        SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
    )

    # Make sure the directory exists
    CHROMA_PERSIST_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    client = chromadb.PersistentClient(
        path=str(CHROMA_PERSIST_DIR)
    )

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_function,
        metadata={
            "hnsw:space": "cosine"
        },
    )

    ids = []
    texts = []
    metadatas = []

    for i, chunk in enumerate(chunks):

        chunk_id = (
            f"{chunk.metadata['source_file']}"
            f"_chunk_{i}"
        )

        ids.append(chunk_id)
        texts.append(chunk.page_content)
        metadatas.append(chunk.metadata)

    print(
        f"Embedding and storing "
        f"{len(ids)} chunks into ChromaDB..."
    )

    batch_size = 100

    for i in range(
        0,
        len(ids),
        batch_size
    ):

        collection.upsert(
            ids=ids[i:i + batch_size],
            documents=texts[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
        )

    print(
        f"Successfully stored {len(ids)} chunks "
        f"in ChromaDB collection "
        f"'{COLLECTION_NAME}'."
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print(
        "--- Starting RAG Ingestion Pipeline ---"
    )

    print(
        f"Raw documents directory: {RAW_DATA_DIR}"
    )

    print(
        f"ChromaDB directory: {CHROMA_PERSIST_DIR}"
    )

    # --------------------------------------------------------
    # Load
    # --------------------------------------------------------

    docs = load_documents()

    print(
        f"Loaded {len(docs)} raw document pages."
    )

    if not docs:

        print(
            "No documents found! "
            "Check your ai-ml/data/raw folder."
        )

        raise SystemExit(1)

    # --------------------------------------------------------
    # Malayalam sanity check
    # --------------------------------------------------------

    ml_docs = [
        d
        for d in docs
        if d.metadata.get("language") == "ml"
    ]

    if ml_docs:

        print(
            "\n--- Malayalam extraction sample check ---"
        )

        print(
            f"Source: "
            f"{ml_docs[0].metadata.get('source_file')}"
        )

        print(
            ml_docs[0].page_content[:300]
        )

        print(
            "--- end sample ---\n"
        )

    else:

        print(
            "\n[INFO] No Malayalam-tagged "
            "documents found among loaded files.\n"
        )

    # --------------------------------------------------------
    # Chunk
    # --------------------------------------------------------

    chunks = chunk_documents(docs)

    print(
        f"Split into {len(chunks)} chunks."
    )

    # --------------------------------------------------------
    # Store
    # --------------------------------------------------------

    store_in_chromadb(chunks)

    print(
        "-- Ingestion complete! --"
    )
    