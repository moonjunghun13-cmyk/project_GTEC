import secrets
from collections import Counter
from threading import Lock

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, get_db
from app.repositories.recommendation_repository import RecommendationRepository
from app.services.recommendation_service import load_recommendation_model
from app.services.recommendation_training_service import RecommendationTrainingService

CATEGORIES = {
    "GPU", "CASE", "CPU", "KEYBOARD", "MOUSE", "SSD",
    "SPEAKER", "HDD", "POWER", "RAM", "MONITOR", "MAINBOARD",
}

_model_write_lock = Lock()


def require_internal_key(
    x_ai_internal_key: str | None = Header(default=None, alias="X-AI-Internal-Key"),
):
    expected = settings.AI_INTERNAL_KEY
    if not expected or len(expected) < 32:
        raise HTTPException(status_code=503, detail="AI_INTERNAL_KEY 설정이 필요합니다.")
    if not x_ai_internal_key or not secrets.compare_digest(x_ai_internal_key, expected):
        raise HTTPException(status_code=403, detail="내부 API 인증 실패")


router = APIRouter(
    prefix="/api/internal/recommendations",
    tags=["추천 모델 관리자 내부 API"],
    dependencies=[Depends(require_internal_key)],
)


class RetrainRequest(BaseModel):
    days: int = Field(default=365, ge=30, le=1095)


@router.get("/status")
def get_training_status(db: Session = Depends(get_db)):
    """Recent trainable DB data, current model metadata, and readiness."""
    rows = RecommendationRepository(db).find_training_purchases(days=365)
    members = {r["member_id"] for r in rows}
    categories = {str(r["category"]).strip().upper() for r in rows}
    missing = sorted(CATEGORIES - categories)
    unknown = sorted(categories - CATEGORIES)
    ready = len(rows) >= 100 and len(members) >= 30 and not missing and not unknown

    model = load_recommendation_model()
    return {
        "model": {
            "model_type": model.get("model_type"),
            "trained_at": model.get("trained_at"),
            "training_days": model.get("training_days"),
            "purchase_rows": model.get("purchase_rows"),
            "member_count": model.get("member_count"),
        },
        "training_data": {
            "purchase_rows": len(rows),
            "member_count": len(members),
            "category_count": len(categories),
            "missing_categories": missing,
            "unknown_categories": unknown,
            "ready": ready,
        },
        "demo_seed_enabled": settings.AI_DEMO_SEED_ENABLED,
    }


@router.post("/retrain")
def retrain_model(req: RetrainRequest, db: Session = Depends(get_db)):
    if not _model_write_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="다른 모델 작업이 진행 중입니다.")
    try:
        try:
            return RecommendationTrainingService(db).retrain(days=req.days)
        except ValueError as e:
            # Expected refusal: too little data, invalid categories, etc.
            raise HTTPException(status_code=422, detail=str(e)) from e
    finally:
        _model_write_lock.release()


@router.post("/demo/seed")
def seed_demo_data():
    # The external admin endpoint is additionally disabled in Spring Boot by default.
    if not settings.AI_DEMO_SEED_ENABLED:
        raise HTTPException(status_code=403, detail="개발용 더미 데이터 생성 기능이 비활성화되어 있습니다.")
    if not _model_write_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="다른 모델 작업이 진행 중입니다.")
    try:
        # Script must be in the same directory as main.py.
        from seed_recommendation_demo import seed
        return seed(engine, apply=True)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    finally:
        _model_write_lock.release()
