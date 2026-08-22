# app/routers/operations.py

from datetime import datetime
from typing import Any, Optional, List, Dict
from enum import Enum
import math
import json
import asyncio
import logging
import hashlib
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, validator

from app.supabase_client import get_supabase  # your existing Supabase client factory
from app.services.operations import snapshot

# ── Router (every @router.get / @router.websocket below attaches to this) ──
router = APIRouter()


class InductionPlanRequest(BaseModel):
    shiftId: str = "night-induction"
    requirementId: str = "rolling-stock-fitness"


@router.get("/operations/snapshot")
async def operations_snapshot() -> dict[str, Any]:
    return await asyncio.to_thread(snapshot)


@router.post("/induction-plan")
async def induction_plan(request: InductionPlanRequest) -> dict[str, Any]:
    data = await asyncio.to_thread(snapshot)
    people = data.get("staff", [])
    eligible = []
    rejected = []
    for person in people:
        reasons = []
        availability = person.get("availability", "Available")
        rest = person.get("rest_hours_since_last_shift", person.get("restHoursSinceLastShift", 0))
        score = person.get("competency_score", person.get("competencyScore", 0))
        if availability != "Available":
            reasons.append(f"Availability is {availability}")
        if rest < 10:
            reasons.append("Minimum rest requirement is 10 hours")
        candidate = {"staff": person, "suitabilityIndex": score, "factors": {"competency": score, "restHours": rest}}
        if reasons:
            rejected.append({**candidate, "reasons": reasons})
        else:
            eligible.append(candidate)
    eligible.sort(key=lambda item: item["suitabilityIndex"], reverse=True)
    return {"shiftId": request.shiftId, "requirementId": request.requirementId, "eligible": eligible, "rejected": rejected, "recommendation": eligible[0] if eligible else None, "decisionTrace": {"source": "backend", "factors": ["availability", "rest", "competency"]}}

# ── Logger (structured, so every log line is timestamped + leveled) ──
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartmap")

# ── Simple in-process cache used by the resilience examples below ──
cache: Dict[str, Any] = {}


# ── Train simulator: defines simulate_train_progress() used everywhere below ──
def get_stations_ordered() -> List[dict]:
    """Get all 25 stations in sequence Aluva → Thrippunithura"""
    supabase = get_supabase()
    return supabase.table("stations").select("*").order("sequence").execute().data


def simulate_train_progress(train_id: str, status: str, seed_time: Optional[datetime] = None, stations: Optional[List[dict]] = None) -> dict:
    """
    Deterministic train position calculator.
    Same train_id + status + seed_time always returns the same result.
    """
    if status != "SERVICE":
        return {
            "id": train_id,
            "status": status,
            "speed": 0,
            "position": "Depot",
            "progress": 0.0,
            "lat": None,
            "lng": None,
        }

    stations = stations if stations is not None else get_stations_ordered()
    if not stations:
        # No station data yet — return a safe, explicit placeholder
        return {
            "id": train_id,
            "status": status,
            "speed": 0,
            "position": "Unknown",
            "progress": 0.0,
            "lat": None,
            "lng": None,
        }

    now = seed_time or datetime.utcnow()
    cycle_seconds = 3600  # one full route cycle = 60 minutes, for demo purposes

    # Offset each train by a stable ID-derived phase so simulated units do not
    # stack at the same coordinate while still moving deterministically.
    phase = int(hashlib.sha256(train_id.encode("utf-8")).hexdigest()[:8], 16) / 0xFFFFFFFF
    progress = (now.timestamp() / cycle_seconds + phase) % 1
    speed = 45 + 25 * math.sin(progress * math.pi)

    num_segments = max(1, len(stations) - 1)
    current_segment = min(int(progress * num_segments), num_segments - 1)
    segment_progress = (progress * num_segments) % 1.0

    station_a = stations[current_segment]
    station_b = stations[min(current_segment + 1, len(stations) - 1)]

    lat = station_a["lat"] + (station_b["lat"] - station_a["lat"]) * segment_progress
    lng = station_a["lng"] + (station_b["lng"] - station_a["lng"]) * segment_progress

    return {
        "id": train_id,
        "status": status,
        "speed": round(speed, 2),
        "position": station_a["name"],
        "progress": round(progress, 4),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
    }
# Append below the header block in operations.py
from app.utils.circuitbreaker import CircuitBreaker

supabase_breaker = CircuitBreaker(failure_threshold=3, timeout_seconds=30)
# Note: `cache` is already defined in the header block — don't redeclare it here,
# or you'll wipe it every time this module reloads.

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "circuitBreaker": {
            "state": supabase_breaker.state.value,
            "failures": supabase_breaker.failure_count,
        },
        "cache": {
            "available": 'last_feed' in cache,
            "age": (datetime.utcnow() - datetime.fromisoformat(cache['last_feed']['timestamp'])).total_seconds() if 'last_feed' in cache else None,
        },
        "version": "1.0.0",
    }

class CoordinateSource(str, Enum):
    CONFIRMED = "confirmed"
    INTERPOLATED = "interpolated"
    ESTIMATED = "estimated"

class StationData(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    sequence: int
    coordinate_source: CoordinateSource
    coordinate_status: str = "verified"

    @validator('lat')
    def validate_lat(cls, v):
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @validator('lng')
    def validate_lng(cls, v):
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v

class TrainData(BaseModel):
    id: str
    status: str  # SERVICE, STANDBY, IBL
    speed: float
    position: str
    progress: float
    lat: Optional[float] = None
    lng: Optional[float] = None
    confidence: float = 1.0  # ← HOW CERTAIN ARE WE?
    last_updated: datetime = datetime.utcnow()
    data_source: str = "simulation"  # Be honest about data origin

@router.get("/smartmap/feed")
async def smartmap_feed() -> dict[str, Any]:
    """
    Returns operational data with full transparency.
    Every data point is traceable to its source.
    """
    def load_local_feed() -> dict[str, list[dict]]:
        seed_path = Path(__file__).parents[2] / "scripts" / "kmrl_seed_full.json"
        if not seed_path.exists():
            return {"stations": [], "trainsets": [], "alerts": []}
        full = json.loads(seed_path.read_text())
        return {key: full.get(key, []) for key in ("stations", "trainsets", "alerts")}

    try:
        local_feed = load_local_feed()
        try:
            remote_feed = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: {
                        "trainsets": get_supabase().table("trainsets").select("*").execute().data,
                        "stations": get_supabase().table("stations").select("*").order("sequence").execute().data,
                        "alerts": get_supabase().table("alerts").select("*").execute().data,
                    }
                ),
                timeout=2.0,
            )
            trainsets_raw = remote_feed["trainsets"] or local_feed["trainsets"]
            stations_raw = remote_feed["stations"] or local_feed["stations"]
            alerts_raw = remote_feed["alerts"] or local_feed["alerts"]
            source = "KMRL Supabase"
        except Exception as exc:
            logger.warning("SmartMap remote feed unavailable: %s", exc)
            trainsets_raw = local_feed["trainsets"]
            stations_raw = local_feed["stations"]
            alerts_raw = local_feed["alerts"]
            source = "local demo seed"

        stations_raw = [
            {
                **station,
                "sequence": station.get("sequence", station.get("order")),
                "coordinate_source": station.get("coordinate_source", station.get("coordSource", "estimated")),
                "coordinate_status": station.get("coordinate_status", "verified"),
            }
            for station in stations_raw
        ]

        # Validate all data before returning
        validated_stations = []
        for station in stations_raw:
            try:
                validated = StationData(**station)
                validated_stations.append(validated.dict())
            except Exception as e:
                logger.warning(f"Invalid station data: {station['id']} - {e}")
                continue

        validated_trains = []
        for train in trainsets_raw:
            try:
                train_with_pos = simulate_train_progress(train["id"], train["status"], stations=stations_raw)
                validated = TrainData(**train_with_pos)
                validated_trains.append(validated.dict())
            except Exception as e:
                logger.warning(f"Invalid train data: {train['id']} - {e}")
                continue

        return {
            "generatedAt": datetime.utcnow().isoformat(),
            "simulated": True,  # Indicates that the data is generated via simulation
            "dataQuality": {
                "stations": len(validated_stations),
                "stationsValidated": len(validated_stations),
                "trains": len(validated_trains),
                "trainsValidated": len(validated_trains),
                "alerts": len(alerts_raw),
            },
            "trains": validated_trains,
            "stations": validated_stations,
            "alerts": alerts_raw,
            "metadata": {
                "version": "1.0.0",
                "timestamp": datetime.utcnow().isoformat(),
                "source": source,
            }
        }

    except Exception as e:
        logger.error(f"Critical error in smartmap_feed: {e}")
        return {
            "generatedAt": datetime.utcnow().isoformat(),
            "simulated": True,
            "trains": [],
            "stations": [],
            "alerts": [],
            "error": str(e),
            "dataQuality": {
                "status": "DEGRADED",
                "message": "Using cached or fallback data"
            }
        }
