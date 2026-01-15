from fastapi import FastAPI, HTTPException
from market_logic import evaluate_market_logic

app = FastAPI(
    title="Vasudha Market Agent",
    description="Economic intelligence based on historical mandi prices",
    version="1.0"
)


@app.get("/market/evaluate")
def evaluate_market(crop: str, state: str):
    result = evaluate_market_logic(crop, state)

    if result is None:
        raise HTTPException(status_code=404, detail="No market data found")

    return result
