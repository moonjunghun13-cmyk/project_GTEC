import asyncio
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timedelta, timezone
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from fastapi import APIRouter, FastAPI


KST = timezone(timedelta(hours=9))  # 한국은 현재 일광절약시간제를 사용하지 않음
TRAINING_DAYS = 365


def next_weekly_run(now: datetime | None = None) -> datetime:
    """가장 가까운 '미래의 월요일 03:00 KST'를 반환."""
    if now is None:
        now = datetime.now(KST)
    elif now.tzinfo is None:
        raise ValueError("now에는 시간대 정보가 필요합니다.")
    else:
        now = now.astimezone(KST)

    days_to_monday = (0 - now.weekday()) % 7
    target = (now + timedelta(days=days_to_monday)).replace(
        hour=3, minute=0, second=0, microsecond=0
    )
    if target <= now:
        target += timedelta(days=7)
    return target


def get_weekly_logger() -> logging.Logger:
    """콘솔 + 파일(logs/recommendation_weekly.log)에 실행 결과를 기록."""
    logger = logging.getLogger("gtec.recommendation.weekly")
    logger.setLevel(logging.INFO)
    if logger.handlers:
        return logger

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    log_path = Path(__file__).resolve().parents[2] / "logs" / "recommendation_weekly.log"
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_path, maxBytes=1_000_000, backupCount=2, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except OSError as exc:
        logger.warning("파일 로그를 열지 못해 콘솔에만 기록합니다: %s", exc)

    logger.propagate = False
    return logger


def run_weekly_retrain_once() -> None:
    """동일 프로세스의 수동 갱신/데이터 생성과 동시 실행하지 않음."""
    # 기존 관리자 API에서 사용 중인 동일 Lock을 재사용합니다.
    # 이 경로는 현재 프로젝트의 recommendation_admin_controller.py를 기준으로 합니다.
    from app.controllers.recommendation_admin_controller import _model_write_lock
    from app.core.database import SessionLocal
    from app.services.recommendation_training_service import RecommendationTrainingService

    logger = get_weekly_logger()
    if not _model_write_lock.acquire(blocking=False):
        logger.warning("SKIPPED: 수동 갱신 또는 시연 데이터 생성이 진행 중입니다. 기존 모델 유지")
        return

    try:
        db = None
        try:
            db = SessionLocal()
            result = RecommendationTrainingService(db).retrain(days=TRAINING_DAYS)
            logger.info(
                "UPDATED: trained_at=%s, purchase_rows=%s, member_count=%s, categories=%s",
                result.get("trained_at"), result.get("purchase_rows"),
                result.get("member_count"), result.get("categories"),
            )
        except ValueError as exc:
            # 기존 TrainingService가 데이터 부족/규격 오류 시 기존 모델을 보존합니다.
            logger.warning("SKIPPED: %s", exc)
        except Exception:
            # 예기치 않은 DB/파일 오류가 나도 서버의 다른 API를 중단시키지 않음.
            logger.exception("FAILED: 주간 자동 재학습에 실패했습니다. 상태를 확인하세요")
        finally:
            if db is not None:
                db.close()
    finally:
        _model_write_lock.release()


async def weekly_retrain_loop() -> None:
    logger = get_weekly_logger()
    while True:
        target = next_weekly_run()
        logger.info("다음 자동 재학습 예정: %s (KST)", target.isoformat())
        seconds = max(0.0, (target - datetime.now(KST)).total_seconds())
        await asyncio.sleep(seconds)
        # SQLAlchemy 동기 조회/모델 계산으로 FastAPI 이벤트 루프가 멈추지 않도록 함.
        try:
            await asyncio.to_thread(run_weekly_retrain_once)
        except Exception:
            # import/세션 정리 등의 예상 밖 오류도 다음 주 스케줄을 중단시키지 않음.
            logger.exception("FAILED: 스케줄러 작업 실행 오류. 다음 주에 다시 시도합니다")


@asynccontextmanager
async def weekly_retrain_lifespan(app: FastAPI):
    """기존 main.py의 lifespan과 독립적으로 함께 동작하는 Router lifespan."""
    from app.core.config import settings

    task = None
    if settings.AI_WEEKLY_RETRAIN_ENABLED:
        task = asyncio.create_task(weekly_retrain_loop(), name="weekly-recommendation-retrain")
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


# 추가 API 엔드포인트는 만들지 않습니다. 기존 관리자 수동 갱신 API는 그대로 사용합니다.
weekly_retrain_router = APIRouter(lifespan=weekly_retrain_lifespan)
