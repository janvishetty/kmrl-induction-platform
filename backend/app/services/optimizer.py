import pulp
import json
import hashlib
from app.schemas import TrainFeatureData, AlertTrigger

def generate_induction_plan(trainsets: list[TrainFeatureData]) -> dict:
    """
    Evaluates trainsets using 6 inter-dependent factors to categorize them into SERVICE, STANDBY, or IBL[cite: 1].
    Mechanically blocks unsafe trains, generates explainable alerts, and creates a SHA-256 blockchain hash[cite: 1].
    """
    prob = pulp.LpProblem("KMRL_Induction_Optimization", pulp.LpMaximize)
    categories = ["SERVICE", "STANDBY", "IBL"]
    
    train_vars = {}
    alerts = []
    
    # 1. Create Decision Variables
    for train in trainsets:
        train_id = train.train_id
        for cat in categories:
            train_vars[(train_id, cat)] = pulp.LpVariable(f"Train_{train_id}_{cat}", cat="Binary")
            
    # 2. Add Hard Safety Constraints & Generate Alerts
    for train in trainsets:
        train_id = train.train_id
        
        # Constraint: Each train must be assigned to exactly ONE category
        prob += pulp.lpSum([train_vars[(train_id, cat)] for cat in categories]) == 1
        
        # Hard Constraint: Fitness & Job Cards
        is_safe = train.fitness_certificate and train.job_card_cleared
        
        if not is_safe:
            # Force into IBL
            prob += train_vars[(train_id, "IBL")] == 1
            reason = "Missing Fitness Cert" if not train.fitness_certificate else "Pending Job Card"
            alerts.append(
                AlertTrigger(train_id=train_id, issue_type="SAFETY_VIOLATION", message=f"Blocked from SERVICE: {reason}")
            )
            
        # Hard Constraint: Cleaning
        elif not train.cleaning_completed:
            # Prevent entering SERVICE (forces it into STANDBY or IBL)
            prob += train_vars[(train_id, "SERVICE")] == 0
            alerts.append(
                AlertTrigger(train_id=train_id, issue_type="OPERATIONAL_DELAY", message="Cleaning pending. Assigned to STANDBY.")
            )

    prob.solve()
    
    # 3. Format the Explainable Output
    # Convert alerts to dicts so they serialize to JSON properly for the hash
    results = {
        "service_list": [], 
        "standby_list": [], 
        "ibl_list": [], 
        "system_alerts": [alert.model_dump() for alert in alerts]
    }
    
    for train in trainsets:
        train_id = train.train_id
        if pulp.value(train_vars[(train_id, "SERVICE")]) == 1.0:
            results["service_list"].append(train_id)
        elif pulp.value(train_vars[(train_id, "STANDBY")]) == 1.0:
            results["standby_list"].append(train_id)
        elif pulp.value(train_vars[(train_id, "IBL")]) == 1.0:
            results["ibl_list"].append(train_id)
                
    # 4. Blockchain Audit Trail Hashing
    results_string = json.dumps(results, sort_keys=True)
    audit_hash = hashlib.sha256(results_string.encode('utf-8')).hexdigest()
    
    results["audit_hash"] = audit_hash
            
    return results

# Dummy data using the new Schema to test locally
if __name__ == "__main__":
    mock_trainsets = [
        TrainFeatureData(train_id="T01", fitness_certificate=True, job_card_cleared=True, branding_active=True, mileage=15000, cleaning_completed=True, stabling_location="Muttom"),
        TrainFeatureData(train_id="T02", fitness_certificate=False, job_card_cleared=True, branding_active=False, mileage=12000, cleaning_completed=True, stabling_location="Muttom"), 
    ]
    print(json.dumps(generate_induction_plan(mock_trainsets), indent=2))