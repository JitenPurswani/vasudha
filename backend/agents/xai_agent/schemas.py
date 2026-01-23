from typing import List, Optional, Dict
from pydantic import BaseModel, Field


# ==================================================
# INPUT SCHEMAS
# ==================================================

class SHAPSummary(BaseModel):
    top_positive_features: List[str]
    top_negative_features: List[str]
    neutral_features: List[str]


class RecommendationItem(BaseModel):
    crop: str
    final_score: float
    agronomic_score: float
    market_score: Optional[float]
    raw_probability: float
    shap_summary: Optional[SHAPSummary]


class SustainabilityItem(BaseModel):
    crop: str
    sustainability_score: float
    explanation: Dict


class XAIRequest(BaseModel):
    """
    Input received from Orchestrator
    """
    location: Dict
    recommendations: List[RecommendationItem]
    sustainability: Optional[List[SustainabilityItem]] = None


# ==================================================
# OUTPUT SCHEMAS
# ==================================================

class FeatureExplanation(BaseModel):
    feature: str
    effect: str   # positive | negative | neutral
    reason: str


class CropXAIExplanation(BaseModel):
    crop: str

    model_explanation: List[FeatureExplanation]
    market_explanation: Optional[str] = None
    sustainability_explanation: Optional[str] = None

    summary: str


class XAIResponse(BaseModel):
    agent: str = Field(default="xai_agent")
    scope: str = Field(default="crop_level")
    explanations: List[CropXAIExplanation]
