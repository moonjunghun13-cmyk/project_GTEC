"""개발 DB의 주문/챗봇 연결을 검증하기 위한 '임시 상품' 등록기.

- 고정 목록 real_products_120.csv에 나온 제품명만 사용
- 기본 12개(카테고리마다 MID 상품 하나), 옵션으로 120개 전체
- 제품명은 실제 모델명이지만 가격/재고는 사용자가 선택한 테스트용 임시 값
- 확인되지 않은 하드웨어 규격을 가짜로 만들어 넣지 않음
- 기존 상품/주문/회원 수정·삭제하지 않음
- 기본값은 미리보기. DB 등록하려면 --apply --confirm-test-data

실행 위치: D:\\kim\\deep\\recommend
    python -m scripts.register_dev_products
    python -m scripts.register_dev_products --apply --confirm-test-data
    python -m scripts.register_dev_products --count 120  # 120개 미리보기
"""

import argparse
import csv
import logging
from collections import Counter
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import MetaData, Table, insert, select, text
from app.core.database import engine

CATALOG = Path(__file__).resolve().parents[1] / "data" / "real_products_120.csv"
CATEGORIES = (
    "CPU", "MAINBOARD", "GPU", "POWER", "CASE", "HDD", "SSD",
    "MONITOR", "KEYBOARD", "MOUSE", "RAM", "SPEAKER",
)
REQUIRED_COLUMNS = {"name", "category", "price", "stock", "status"}
TEST_MARK = "DATA_STATUS: TEST_ONLY"


def load_selected(count):
    with CATALOG.open(encoding="utf-8-sig", newline="") as f:
        all_rows = list(csv.DictReader(f))
    items = [
        {
            "name": (r.get("name") or "").strip(),
            "category": (r.get("category") or "").strip().upper(),
            "tier": (r.get("tier") or "").strip().upper(),
        }
        for r in all_rows
    ]
    unique = {(r["category"], r["name"].casefold()) for r in items}
    counts = Counter(r["category"] for r in items)
    if len(items) != 120 or len(unique) != 120 or set(counts) != set(CATEGORIES) or any(v != 10 for v in counts.values()):
        raise ValueError("CSV에는 12개 카테고리 × 10개 = 고유한 120개 상품이 필요합니다.")
    if any(not r["name"] or r["tier"] not in {"LOW", "MID", "HIGH"} for r in items):
        raise ValueError("CSV의 이름/등급이 잘못되었습니다.")
    if count == 120:
        return items
    selected = []
    for category in CATEGORIES:
        # 시연용 12개는 MID 제품 하나씩 선택.
        chosen = next((x for x in items if x["category"] == category and x["tier"] == "MID"), None)
        if chosen is None:
            raise ValueError(f"{category}에 MID 상품이 없습니다.")
        selected.append(chosen)
    return selected


def register(db_engine, *, count=12, price=100000, stock=100, apply=False, confirm=False, expected_db="gtec"):
    if count not in {12, 120}:
        raise ValueError("--count는 12 또는 120이어야 합니다.")
    if price <= 0 or stock <= 0:
        raise ValueError("테스트 가격과 재고는 1 이상이어야 합니다.")
    if apply and not confirm:
        raise ValueError("테스트 상품을 DB에 등록하려면 --confirm-test-data도 함께 필요합니다.")
    selected = load_selected(count)

    with db_engine.connect() as con:
        database = con.execute(text("SELECT current_database()")).scalar_one() if db_engine.dialect.name == "postgresql" else "TEST_LOCAL_DB"
    if db_engine.dialect.name == "postgresql" and database != expected_db:
        raise ValueError(f"연결 DB가 {database!r}입니다. 개발 DB {expected_db!r}에서만 실행하도록 제한했습니다.")
    products = Table("products", MetaData(), autoload_with=db_engine)
    cols = set(products.c.keys())
    missing_cols = REQUIRED_COLUMNS - cols
    if missing_cols:
        raise ValueError(f"products 필수 컬럼이 없습니다: {', '.join(sorted(missing_cols))}")

    with db_engine.connect() as con:
        existing = con.execute(select(products.c.id, products.c.name, products.c.category, products.c.status, products.c.stock)).mappings().all()
    current = {(str(x["category"]).upper(), str(x["name"]).strip().casefold()): x for x in existing}
    names_to_cat = {str(x["name"]).strip().casefold(): str(x["category"]).upper() for x in existing}
    new_rows, existing_ok, existing_unusable = [], [], []
    for row in selected:
        key = (row["category"], row["name"].casefold())
        if row["name"].casefold() in names_to_cat and names_to_cat[row["name"].casefold()] != row["category"]:
            raise ValueError(f"같은 상품명이 다른 카테고리에 이미 등록되어 있습니다: {row['name']}")
        old = current.get(key)
        if old:
            if str(old["status"]) == "ACTIVE" and int(old["stock"] or 0) > 0:
                existing_ok.append(row)
            else:
                existing_unusable.append(row)
            continue
        now = datetime.now()
        payload = {
            "name": row["name"],
            "category": row["category"],
            "price": Decimal(price),
            "stock": stock,
            "status": "ACTIVE",
            "description": "[개발용 임시 상품] 가격·재고는 시연용 가상 값입니다. 실제 판매 전 수정 필요. 제품 세부 사양 미검증.",
            "specification": f"GRADE: {row['tier']}\n{TEST_MARK}\nCOMPATIBILITY_VERIFIED: NO",
            "created_at": now,
            "updated_at": now,
        }
        new_rows.append({k: v for k, v in payload.items() if k in cols})

    print(f"[연결 DB] {database}")
    print(f"[선택] {len(selected)}개 / 신규 {len(new_rows)}개 / 이미 판매 가능 {len(existing_ok)}개 / 기존 판매 불가 {len(existing_unusable)}개")
    print(f"[임시 값] 모든 신규 상품 가격 {price:,}원 / 재고 {stock}개 (실제 가격 아님)")
    print("[규격] 상세 호환성 규격 입력 안 함. 테스트 데이터 표시만 저장")
    if existing_unusable:
        print("[주의] 기존 판매 불가 상품은 덮어쓰지 않습니다. 관리자 기능에서 상태/재고를 확인하세요.")
        for r in existing_unusable[:5]:
            print(f"  {r['category']}: {r['name']}")
    print("[신규 등록 예정 예시]")
    for r in new_rows[:12]:
        print(f"  {r['category']}: {r['name']}")
    if not apply:
        print("[미리보기] DB 데이터는 변경하지 않았습니다.")
        return len(new_rows)
    # 명시적인 개발용 등록에 한해서 트랜잭션으로 INSERT. 기존 상품은 수정하지 않음.
    with db_engine.begin() as con:
        for r in new_rows:
            con.execute(insert(products).values(**r))
    print(f"[등록 완료] 신규 상품 {len(new_rows)}개. 기존 상품·회원·주문 수정 0건")
    print("[중요] 실제 판매 전 price/stock/specification/description을 검증한 값으로 수정하세요.")
    return len(new_rows)


def main():
    parser = argparse.ArgumentParser(description="개발 DB 테스트 상품 12개 또는 120개 임시 등록")
    parser.add_argument("--count", type=int, choices=[12, 120], default=12)
    parser.add_argument("--test-price", type=int, default=100000, help="검증되지 않은 개발용 가격 (원), 기본 100000")
    parser.add_argument("--test-stock", type=int, default=100, help="가상 재고, 기본 100")
    parser.add_argument("--apply", action="store_true", help="DB에 INSERT")
    parser.add_argument("--confirm-test-data", action="store_true", help="임시 가격/규격임을 인정하고 등록")
    args = parser.parse_args()
    engine.echo = False
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    try:
        register(engine, count=args.count, price=args.test_price, stock=args.test_stock,
                 apply=args.apply, confirm=args.confirm_test_data)
    except Exception as exc:
        print(f"[오류] {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
