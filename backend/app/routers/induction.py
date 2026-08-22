from fastapi import APIRouter
from typing import List
from app.schemas import TrainFeatureData, InductionPlanResult
from app.services.optimizer import generate_induction_plan

router = APIRouter(prefix="/induction", tags=["Induction Engine"])

# Notice we deleted the local 'TrainData' class. 
# We are now importing your master schemas directly from schemas.py!

@router.post("/generate-plan", response_model=InductionPlanResult)
def create_plan(trainsets: List[TrainFeatureData]):
    """
    Receives JSON from the frontend (or RAG), validates it against the 6 constraints, 
    and runs the PuLP optimization engine.
    """
    # Because we updated optimizer.py to accept the Pydantic models directly, 
    # we don't even need to convert them to dictionaries anymore!
    
    # Run the math!
    result = generate_induction_plan(trainsets)
    
    # Return the fully formatted explainable plan, alerts, and hash
    return result