"""Repository: 실제 PostgreSQL 구매 기록 조회만 담당합니다(DB 쓰기 없음)."""

import pandas as pd
from sqlalchemy import create_engine, text
import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

# 모델·설정의 기준 경로: customer_analyze 프로젝트 루트
ROOT = Path(__file__).resolve().parents[2]
BACKEND_ENV_FILE = ROOT.parents[1] / ".env"
LOCAL_ENV_FILE = ROOT / ".env"


def get_db_url():
    """프로세스 환경변수와 앱별/BE 공통 .env에서 DB 연결 설정을 읽습니다."""
    settings = {}

    # backend/.env를 기본값으로 읽고, 앱별 .env가 있으면 덮어씁니다.
    for path in (BACKEND_ENV_FILE, LOCAL_ENV_FILE):
        if path.is_file():
            settings.update(dotenv_values(path))

    # 컨테이너나 셸에서 전달한 환경변수가 최우선입니다.
    settings.update(os.environ)

    raw_url = settings.get("DATABASE_URL")
    if not raw_url:
        raise RuntimeError(
            "DATABASE_URL이 설정되지 않았습니다. "
            "프로세스 환경변수 또는 backend/.env를 확인해 주세요."
        )

    url = make_url(str(raw_url))

    username = (
        settings.get("USER_NAME")
        or settings.get("DB_USERNAME")
        or settings.get("DB_USER")
    )
    password = settings.get("PASSWORD") or settings.get("DB_PASSWORD")

    if username:
        url = url.set(username=str(username))
    if password:
        url = url.set(password=str(password))

    source = "process environment" if os.getenv("DATABASE_URL") else str(
        LOCAL_ENV_FILE if LOCAL_ENV_FILE.is_file() else BACKEND_ENV_FILE
    )
    return url, source

def find_paid_orders_before(cutoff):
    """cutoff 이전 결제된 USER 주문을 1주문=1행으로 조회합니다.

    기존 Service·점검 스크립트의 import를 유지하려고 함수 이름은 그대로 둡니다.
    결제 이후 배송 단계의 주문도 구매 이력으로 인정합니다.
    """
    db_url, _ = get_db_url()
    engine = create_engine(
        db_url, pool_pre_ping=True, connect_args={"connect_timeout": 5}
    )
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SET TRANSACTION READ ONLY")
            orders = pd.read_sql_query(text("""
                SELECT o.id AS order_id,
                       o.member_id,
                       COALESCE(o.paid_at, o.created_at) AS ordered_at,
                       SUM(oi.total_price) AS item_amount,
                       o.total_amount,
                       o.paid_at
                FROM public.orders o
                JOIN public.members m ON m.id = o.member_id
                JOIN public.order_items oi ON oi.order_id = o.id
                WHERE m.role = 'USER'
                  AND o.status IN ('PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED')
                  AND COALESCE(o.paid_at, o.created_at) < :cutoff
                GROUP BY o.id, o.member_id, o.paid_at, o.created_at, o.total_amount
                ORDER BY o.id
            """), conn, params={"cutoff": cutoff})
            conn.rollback()
        return orders
    finally:
        engine.dispose()


def count_customer_members():
    """역할이 USER인 현재 회원 계정 수를 조회합니다(관리자 제외)."""
    db_url, _ = get_db_url()
    engine = create_engine(
        db_url, pool_pre_ping=True, connect_args={"connect_timeout": 5}
    )
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SET TRANSACTION READ ONLY")
            count = conn.execute(text("""
                SELECT COUNT(*)
                FROM public.members
                WHERE role = 'USER'
            """)).scalar_one()
            conn.rollback()
        return int(count)
    finally:
        engine.dispose()
