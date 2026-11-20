from fastapi import APIRouter, Depends, Path, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.recommendation_schema import (
    RecommendationResponse
)
from app.repositories.recommendation_repository import RecommendationRepository
from app.services.compatibility_service import evaluate
from app.services.recommendation_service import (
    RecommendationService
)


router = APIRouter(
    prefix="/api/ai/recommendations",
    tags=["AI 상품 추천"]
)


@router.get("/compatibility")
def check_compatibility(
    product_ids: list[int] = Query(..., min_length=2, max_length=8, description="같은 상품 ID를 중복 전달할 수 없습니다."),
    db: Session = Depends(get_db),
):
    if len(set(product_ids)) != len(product_ids) or any(i < 1 for i in product_ids):
        raise HTTPException(status_code=422, detail="서로 다른 양의 상품 ID를 전달하세요.")
    products = RecommendationRepository(db).find_products_for_compatibility(product_ids)
    if len(products) != len(product_ids):
        raise HTTPException(status_code=404, detail="찾을 수 없는 상품 ID가 포함되어 있습니다.")
    categories = [str(p['category']).upper() for p in products]
    if len(set(categories)) != len(categories):
        raise HTTPException(status_code=422, detail="카테고리별 상품 하나만 선택할 수 있습니다.")
    return {"products": [{k:p[k] for k in ("id", "name", "category")} for p in products],
            **evaluate(products)}


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
