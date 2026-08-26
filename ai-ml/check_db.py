import sys
sys.path.insert(0, 'src')
from rag import _collection

# Get all documents and their source files
result = _collection.get(include=["metadatas"])
sources = [m['source_file'] for m in result['metadatas']]

from collections import Counter
print("--- Document Chunks in ChromaDB ---")
for src, count in sorted(Counter(sources).items()):
    print(f"{count:3} chunks | {src}")
print(f"\nTotal: {len(sources)} chunks")