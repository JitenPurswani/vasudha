from fastapi import FastAPI, HTTPException
from schemas import XAIRequest, XAIResponse
from reasoning_engine import generate_xai_response
import traceback

app = FastAPI(
    title="Vasudha XAI Agent",
    description="Explainable AI layer for crop recommendations",
    version="1.0"
)


@app.post("/xai/explain", response_model=XAIResponse)
def explain_recommendations(payload: XAIRequest):
    """
    Generate explanations for recommended crops.
    """

    try:
        print(f"\n[XAI_ENDPOINT] Request received")
        print(f"[XAI_ENDPOINT] Payload type: {type(payload)}")
        print(f"[XAI_ENDPOINT] Location: {payload.location}")
        print(f"[XAI_ENDPOINT] Number of recommendations: {len(payload.recommendations)}")
        
        if payload.recommendations:
            print(f"[XAI_ENDPOINT] First recommendation: {payload.recommendations[0]}")
            print(f"[XAI_ENDPOINT] First rec SHAP: {payload.recommendations[0].shap_summary}")
        
        print(f"[XAI_ENDPOINT] Sustainability items: {len(payload.sustainability) if payload.sustainability else 0}")
        
        print(f"[XAI_ENDPOINT] Converting recommendations to dicts...")
        rec_dicts = [rec.model_dump() for rec in payload.recommendations]
        print(f"[XAI_ENDPOINT] Converted {len(rec_dicts)} recommendations")
        
        print(f"[XAI_ENDPOINT] Converting sustainability items...")
        sustain_dicts = None
        if payload.sustainability:
            sustain_dicts = [item.model_dump() for item in payload.sustainability]
            print(f"[XAI_ENDPOINT] Converted {len(sustain_dicts)} sustainability items")
        
        print(f"[XAI_ENDPOINT] Calling generate_xai_response...")
        explanations = generate_xai_response(
            recommendations=rec_dicts,
            sustainability_results=sustain_dicts
        )
        
        print(f"[XAI_ENDPOINT] Generated {len(explanations)} explanations")
        print(f"[XAI_ENDPOINT] First explanation: {explanations[0] if explanations else 'N/A'}")

        response = {
            "agent": "xai_agent",
            "scope": "crop_level",
            "explanations": explanations
        }
        print(f"[XAI_ENDPOINT] Returning response: {type(response)}")
        return response

    except Exception as e:
        print(f"❌ [XAI_ENDPOINT] Exception: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"XAI explanation failed: {type(e).__name__}: {str(e)}"
        )


@app.get("/")
def root():
    return {"status": "XAI Agent is running"}
