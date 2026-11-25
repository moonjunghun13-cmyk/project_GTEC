"""Controller: HTTP 요청을 받아 Service의 분석 결과를 반환합니다."""

from fastapi import APIRouter, Request, HTTPException
from app.services.customer_service import (
    predict_repurchase,
    get_customer_summary,
    get_repurchase_summary,
    get_monthly_retention,
    get_model_training_status,
    refresh_model_candidate,
)

router = APIRouter(prefix="/api/ai/customers", tags=["고객 분석"])


@router.get("/repurchase-predictions")
def get_repurchase_predictions():
    return predict_repurchase()


@router.get("/summary")
def get_summary():
    return get_customer_summary()


@router.get("/repurchase-summary")
def get_repurchase():
    return get_repurchase_summary()


@router.get("/monthly-retention")
def get_retention():
    return get_monthly_retention()


@router.get("/model-training-status")
def get_training_status():
    return get_model_training_status()


@router.post("/model-refresh")
def post_model_refresh(request: Request):
    # 관리자 로그인 연동 전까지는 로컬 PC에서만 모델 학습을 허용합니다.
    from ipaddress import ip_address
    client_host = request.client.host if request.client else ""
    try:
        is_local = ip_address(client_host).is_loopback
    except ValueError:
        is_local = False
    if not is_local:
        raise HTTPException(status_code=403, detail="로컬 PC에서만 수동 재학습할 수 있습니다.")
    return refresh_model_candidate()
