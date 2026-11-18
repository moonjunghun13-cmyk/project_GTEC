
import asyncio

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import SessionLocal
from app.services.review_service import ReviewService

from app.controllers.review_controller import (
    router as review_router
)


# 새 리뷰와 수정된 리뷰를 자동 분석
def run_pending_analysis():

    with SessionLocal() as db:

        service = ReviewService(db)

        return service.analyze_batch(force=False)


# 5분마다 실행
async def periodic_analysis():

    while True:

        await asyncio.sleep(300)

        try:
            result = await asyncio.to_thread(
                run_pending_analysis
            )

            print("자동 감정 분석 결과:", result)

        except Exception as e:
            print("자동 감정 분석 오류:", e)


# FastAPI 서버 시작과 종료 시 관리
@asynccontextmanager
async def lifespan(app: FastAPI):

    task = asyncio.create_task(periodic_analysis())

    try:
        yield

    finally:
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="GTEC 쇼핑몰 AI 서비스",
    lifespan=lifespan
)

app.include_router(review_router)
