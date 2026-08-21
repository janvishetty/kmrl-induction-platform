from fastapi import FastAPI
from app.routers import induction

app = FastAPI(title="RAIL DHARA API")

# Register your induction endpoint
app.include_router(induction.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the KMRL Induction API"}