import sys
sys.path.insert(0, 'src')
from rag import _retrieve, _detect_trainset

query = "What is the validity period of TS-03's fitness certificate?"
tid = _detect_trainset(query)
print(f"🔍 Detected Trainset: {tid}")

docs, metas = _retrieve(query, tid, 4)
print(f"📄 Retrieved {len(docs)} chunks with trainset filter.")

if not docs:
    print("❌ RETRIEVAL FAILED: ChromaDB returned 0 documents for TS-03.")
    print("Trying global search (no trainset filter)...")
    docs2, metas2 = _retrieve(query, None, 4)
    print(f"🌍 Global search retrieved {len(docs2)} chunks.")
    if docs2:
        print(f"First global doc source: {metas2[0].get('source_file')}")
else:
    print("✅ Retrieval worked! Here is what Kora sees:")
    for i, (doc, meta) in enumerate(zip(docs, metas)):
        print(f"\n--- CHUNK {i} ({meta.get('source_file')}) ---")
        print(doc[:300])