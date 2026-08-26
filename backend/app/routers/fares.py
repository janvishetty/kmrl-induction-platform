from fastapi import APIRouter
import csv
from pathlib import Path

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
GTFS_DIR = BASE_DIR / "scripts" / "gtfs"

@router.get("/fares")
async def get_fare(origin: str, destination: str):
    """Calculate fare between two stations"""
    # Read fare rules
    with open(GTFS_DIR / "fare_rules.txt") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["origin_id"] == origin and row["destination_id"] == destination:
                fare_id = row["fare_id"]
                break
    
    # Read fare amount
    with open(GTFS_DIR / "fare_attributes.txt") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["fare_id"] == fare_id:
                return {"fare": float(row["price"]), "currency": "INR"}
    
    return {"error": "Route not found"}
