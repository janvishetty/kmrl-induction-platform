from pydantic import BaseModel
from typing import List, Optional

# --- 1. THE INPUT: What Janvi's RAG sends to your engine ---
class TrainFeatureData(BaseModel):
    train_id: str
    fitness_certificate: bool
    job_card_cleared: bool
    branding_active: bool
    mileage: int
    cleaning_completed: bool
    stabling_location: str

# --- 2. THE ALERTS: What PuLP generates when rules are broken ---
class AlertTrigger(BaseModel):
    train_id: str
    issue_type: str  # e.g., "SAFETY_VIOLATION", "MILEAGE_LIMIT"
    message: str

# --- 3. THE OUTPUT: What you send back to Anushka's frontend ---
class InductionPlanResult(BaseModel):
    service_list: List[str]
    standby_list: List[str]
    ibl_list: List[str]
    system_alerts: List[AlertTrigger] = []
    execution_time_ms: int = 0  # <-- Added this so FastAPI lets the timer pass through!
    audit_hash: str