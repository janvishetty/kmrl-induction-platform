# src/schemas.py
# Data contracts shared by the ML pipeline and the FastAPI backend.
from typing import Optional
from pydantic import BaseModel

class TrainFeatureData(BaseModel):
    train_id: str
    fitness_valid: bool
    fitness_expiry: Optional[str] = None
    issuing_authority: Optional[str] = None
    job_card_status: str = "closed"          # open / closed
    job_card_severity: str = "none"          # critical / major / minor / none
    job_card_desc: Optional[str] = None
    branding_active: bool = False
    branding_priority: str = "none"          # high / medium / low / none
    branding_min_km: Optional[float] = None
    odometer: float = 0.0
    target_band: Optional[str] = None
    mileage_deviation: str = "normal"        # normal / deviated
    cleaning_status: str = "completed"       # scheduled / completed / cancelled
    cleaning_bay: Optional[str] = None
    current_bay: Optional[str] = None
    shunting_cost: float = 1.0

class AlertTrigger(BaseModel):
    train_id: str
    issue_type: str
    message: str
