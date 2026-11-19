
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.review_service import ReviewService


router = APIRouter(
    prefix="/api/ai/reviews",
    tags=["리뷰 감정 분석"]
)


# 1. 리뷰 감정 분석
@router.post("/{review_id}/analyze")
def analyze_review(
    review_id: int,
    db: Session = Depends(get_db)
):

    service = ReviewService(db)

    try:
        return service.analyze_review(review_id)

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )


# 2. 리뷰 감정 분석 통계
@router.get("/statistics")
def get_statistics(
    db: Session = Depends(get_db)
):

    service = ReviewService(db)

    return service.get_statistics()

# 3. 전체 분석
@router.post("/analyze-all")
def analyze_all(
    db: Session = Depends(get_db)
):

    service = ReviewService(db)

    return service.analyze_batch(force=True)
