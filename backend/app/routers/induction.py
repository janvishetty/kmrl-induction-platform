from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.optimizer import generate_induction_plan

router = APIRouter(prefix="/induction", tags=["Induction Engine"])

# Basic schema to accept incoming train data
class TrainData(BaseModel):
    train_id: str
    certificate_valid: bool = True
    mileage: int = 0

@router.post("/generate-plan")
def create_plan(trainsets: List[TrainData]):
    # Convert incoming data to dictionaries for your PuLP solver
    train_dicts = [train.dict() for train in trainsets]
    
    # Run the math!
    result = generate_induction_plan(train_dicts)
    return {"status": "success", "data": result}