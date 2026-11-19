from typing import Literal
from pydantic import BaseModel


class RecommendationProduct(BaseModel):
    product_id: int
    name: str
    category: str
    recommend_score: float
    sales_count: int


class RecommendationResponse(BaseModel):
    member_id: int
    recommend_type: Literal["PERSONALIZED", "POPULAR"]
    purchased_categories: list[str]
    recommendations: list[RecommendationProduct]
