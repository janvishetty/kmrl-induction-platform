import os, hashlib, json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = "https://polygon-amoy-bor-rpc.publicnode.com"
w3 = Web3(Web3.HTTPProvider(RPC_URL))

private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

# Fix: Dynamically get the path to DocumentRegistry.json
current_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(current_dir, "DocumentRegistry.json")

with open(json_path, encoding="utf-8") as f:
    abi = json.load(f)["abi"]

contract = w3.eth.contract(address=os.getenv("CONTRACT_ADDRESS"), abi=abi)

def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def register_document(doc_id: str, data: bytes) -> dict:
    doc_hash = hash_bytes(data)
    stored = contract.functions.documents(doc_id).call()
    if stored[3]:  # exists flag
        return {"doc_id": doc_id, "error": "Document already registered"}
    
    tx = contract.functions.registerDocument(doc_id, bytes.fromhex(doc_hash)).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": 80002,
        "gas": 500000,
        "maxFeePerGas": w3.to_wei("35", "gwei"),
        "maxPriorityFeePerGas": w3.to_wei("30", "gwei"),
    })
    signed = w3.eth.account.sign_transaction(tx, private_key)
    raw = getattr(signed, "raw_transaction", getattr(signed, "rawTransaction", None))
    h = w3.eth.send_raw_transaction(raw)
    receipt = w3.eth.wait_for_transaction_receipt(h)
    if receipt.status != 1:
        return {"doc_id": doc_id, "error": "Transaction failed"}
    return {"doc_id": doc_id, "hash": doc_hash, "tx": h.hex()}

def check_document(doc_id: str, data: bytes) -> dict:
    doc_hash = hash_bytes(data)
    stored = contract.functions.documents(doc_id).call()
    
    if not stored[3]:  # not exists
        return {"doc_id": doc_id, "hash": doc_hash, "status": "NOT_REGISTERED"}
    
    ok = contract.functions.verifyDocument(doc_id, bytes.fromhex(doc_hash)).call()
    return {"doc_id": doc_id, "hash": doc_hash, "status": "AUTHENTIC" if ok else "TAMPERED"}

def list_documents() -> list:
    count = contract.functions.getDocumentCount().call()
    docs = []
    for i in range(count):
        doc_id = contract.functions.documentIds(i).call()
        doc = contract.functions.documents(doc_id).call()
        docs.append({
            "doc_id": doc_id,
            "hash": doc[0].hex(),
            "uploader": doc[1],
            "timestamp": doc[2],
        })
    return docs