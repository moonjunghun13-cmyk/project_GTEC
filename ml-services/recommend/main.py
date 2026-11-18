from app.services.recommendation_weekly_scheduler import weekly_retrain_router
from app.controllers.recommendation_controller import (
    router as recommendation_router
)
from app.controllers.recommendation_admin_controller import (
    router as recommendation_admin_router
)

from fastapi import FastAPI

app = FastAPI(
    title="GTEC 쇼핑몰 AI 서비스"
)

app.include_router(recommendation_router)
app.include_router(recommendation_admin_router)
app.include_router(weekly_retrain_router)