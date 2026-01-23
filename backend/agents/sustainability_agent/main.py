from fastapi import FastAPI, HTTPException
from typing import List
from sustainability_engine import compute_sustainability
from fastapi import Query
from typing import Union

app = FastAPI(
    title="Vasudha Sustainability Scoring Agent",
    description="Evaluates intrinsic crop sustainability based on water, soil, and cultivation intensity",
    version="1.0"
)


@app.get("/sustainability/evaluate")
def evaluate_sustainability(
    crops: Union[List[str], str] = Query(..., description="Crop name(s)")
):
    if isinstance(crops, str):
        crops = [crops]

    results = []

    for crop in crops:
        result = compute_sustainability(crop)
        if result:
            results.append(result)

    if not results:
        raise HTTPException(status_code=404, detail="No sustainability data found for given crops")

    return {
        "agent": "sustainability_scoring",
        "scope": "crop_level",
        "note": "Sustainability score is advisory and does not affect final crop ranking.",
        "results": results
    }


@app.get("/")
def root():
    return {"status": "Sustainability Scoring Agent is running"}
