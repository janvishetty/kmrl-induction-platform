import pulp
import json
import hashlib

def generate_induction_plan(trainsets: list):
    """
    Evaluates trainsets and categorizes them into SERVICE, STANDBY, or IBL.
    Generates a SHA-256 hash of the final plan for blockchain audit trailing.
    """
    prob = pulp.LpProblem("KMRL_Induction_Optimization", pulp.LpMaximize)
    categories = ["SERVICE", "STANDBY", "IBL"]
    
    # Create Decision Variables
    train_vars = {}
    for train in trainsets:
        train_id = train["train_id"]
        for cat in categories:
            train_vars[(train_id, cat)] = pulp.LpVariable(f"Train_{train_id}_{cat}", cat="Binary")
            
    # Add Hard Safety Constraints
    for train in trainsets:
        train_id = train["train_id"]
        
        # Each train must be assigned to exactly ONE category
        prob += pulp.lpSum([train_vars[(train_id, cat)] for cat in categories]) == 1
        
        # Hard Constraint: If fitness certificate is invalid, force into IBL
        if not train.get("certificate_valid", True):
            prob += train_vars[(train_id, "IBL")] == 1

    prob.solve()
    
    # Format the Explainable Output
    results = {"SERVICE": [], "STANDBY": [], "IBL": []}
    for train in trainsets:
        train_id = train["train_id"]
        for cat in categories:
            if pulp.value(train_vars[(train_id, cat)]) == 1.0:
                results[cat].append({"train_id": train_id, "reason": f"Met constraints for {cat}"})
                
    # --- NEW: Blockchain Audit Trail Hashing ---
    # Convert the results to a string (sorting keys ensures the hash is always identical for identical data)
    results_string = json.dumps(results, sort_keys=True)
    # Generate the SHA-256 fingerprint
    audit_hash = hashlib.sha256(results_string.encode('utf-8')).hexdigest()
    # Attach it to the final output for the API
    results["audit_hash"] = audit_hash
            
    return results

# Dummy data to test the function locally
if __name__ == "__main__":
    mock_trainsets = [
        {"train_id": "T01", "certificate_valid": True, "mileage": 15000},
        {"train_id": "T02", "certificate_valid": False, "mileage": 12000}, 
    ]
    print(json.dumps(generate_induction_plan(mock_trainsets), indent=2))