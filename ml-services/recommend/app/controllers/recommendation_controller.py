from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.recommendation_schema import (
    RecommendationResponse
)
from app.services.recommendation_service import (
    RecommendationService
)


router = APIRouter(
    prefix="/api/ai/recommendations",
    tags=["AI 상품 추천"]
)


@router.get("/{member_id}", response_model=RecommendationResponse)
def get_recommendations(
    member_id: int = Path(ge=1),
    top_n: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    service = RecommendationService(db)

    return service.recommend(
        member_id=member_id,
        top_n=top_n
    )
