"""Repository: 실제 PostgreSQL 구매 기록 조회만 담당합니다(DB 쓰기 없음)."""

import pandas as pd
from sqlalchemy import create_engine, text
import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

# 모델, .env 및 예약 작업의 기준 위치: customer_analyze 프로젝트 루트
ROOT = Path(__file__).resolve().parents[2]
ENV_PATHS = [
    ROOT / ".env",
    ROOT.parent / "ai_chat_bot" / ".env",
    ROOT.parent / "recommand" / ".env",
]


def get_db_url():
    """기존 DB 환경설정 우선순위를 그대로 유지합니다."""
    if os.getenv("DATABASE_URL"):
        return make_url(os.environ["DATABASE_URL"]), "환경변수"

    for path in ENV_PATHS:
        if not path.is_file():
            continue
        settings = dotenv_values(path)
        raw_url = settings.get("DATABASE_URL")
        if not raw_url:
            continue

        url = make_url(str(raw_url))
        username = settings.get("DB_USERNAME") or settings.get("DB_USER") or settings.get("USER_NAME")
        password = settings.get("DB_PASSWORD") or settings.get("PASSWORD")
        if not url.username and username:
            url = url.set(username=str(username))
        if not url.password and password:
            url = url.set(password=str(password))
        return url, str(path)

    raise FileNotFoundError(
        "DB 설정을 찾지 못했습니다. customer_analyze 또는 기존 ai_chat_bot 프로젝트의 .env를 확인해 주세요."
    )


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
