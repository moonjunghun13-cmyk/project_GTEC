"""컴퓨터 부품 쇼핑몰 추천 시스템 실습용 가상 구매 기록 CSV 생성기.

사용법:
    python generate_dummy_orders.py

입력(선택):
    actual_products.csv  - product_id,category 열 필요; 카테고리별 정확히 10개

출력:
    dummy_products.csv
    dummy_purchase_history.csv

주의: 이 스크립트는 PostgreSQL에 접근하거나 데이터를 삽입하지 않습니다.
      회원 ID는 테스트용 가상 ID입니다.
"""

import csv
import random
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path


# 여기 숫자만 바꾸면 생성량을 조절할 수 있습니다.
ORDER_COUNT = 6000       # 주문 6,000건 (주문당 여러 상품이 들어갈 수 있음)
MEMBER_COUNT = 2000      # 가상 회원 2,000명
SEED = 42               # 같은 설정이면 동일한 데이터가 생성됨

BASE_DIR = Path(__file__).resolve().parent
ACTUAL_CATALOG = BASE_DIR / "actual_products.csv"  # 선택 입력 파일

CATEGORIES = [
    "GPU", "CASE", "CPU", "KEYBOARD", "MOUSE", "SSD",
    "SPEAKER", "HDD", "POWER", "RAM", "MONITOR", "MAINBOARD",
]

# 서로 함께 구매할 법한 상품 '카테고리' 조합 예시.
# 특정 제품 간 호환성을 검증하는 것은 아닙니다.
BUNDLES = [
    ["CPU", "MAINBOARD", "RAM"],
    ["GPU", "POWER", "CASE"],
    ["KEYBOARD", "MOUSE"],
    ["MONITOR", "SPEAKER"],
    ["SSD", "HDD"],
    ["CPU", "GPU", "RAM", "SSD"],
    ["CASE", "POWER", "MAINBOARD"],
    ["MONITOR", "KEYBOARD", "MOUSE"],
]

# 가상 고객군: 특정 용도에 따라 구매 카테고리의 확률이 다르게 구성됩니다.
PERSONAS = {
    "gaming": {
        "GPU": 6, "CPU": 4, "RAM": 4, "SSD": 4, "MONITOR": 4,
        "KEYBOARD": 3, "MOUSE": 3, "POWER": 3, "MAINBOARD": 3,
        "CASE": 2, "HDD": 1, "SPEAKER": 1,
    },
    "office": {
        "MONITOR": 6, "KEYBOARD": 6, "MOUSE": 6, "SSD": 4,
        "CPU": 3, "RAM": 3, "SPEAKER": 2, "HDD": 2,
        "MAINBOARD": 1, "GPU": 1, "POWER": 1, "CASE": 1,
    },
    "pc_build": {
        "CPU": 5, "MAINBOARD": 5, "RAM": 5, "CASE": 5,
        "POWER": 5, "GPU": 4, "SSD": 4, "HDD": 2,
        "MONITOR": 2, "KEYBOARD": 1, "MOUSE": 1, "SPEAKER": 1,
    },
    "storage": {
        "SSD": 7, "HDD": 6, "RAM": 3, "CPU": 2,
        "MAINBOARD": 2, "MONITOR": 2, "KEYBOARD": 2,
        "MOUSE": 2, "GPU": 1, "CASE": 1, "POWER": 1, "SPEAKER": 1,
    },
    "peripheral": {
        "KEYBOARD": 7, "MOUSE": 7, "MONITOR": 6, "SPEAKER": 5,
        "SSD": 2, "RAM": 2, "GPU": 2, "CPU": 1,
        "MAINBOARD": 1, "POWER": 1, "CASE": 1, "HDD": 1,
    },
}


def make_catalog():
    """실제 상품 목록이 있으면 그 ID 사용, 없으면 1~120 임시 상품 ID 생성."""
    if ACTUAL_CATALOG.exists():
        with ACTUAL_CATALOG.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            if not {"product_id", "category"}.issubset(reader.fieldnames or []):
                raise ValueError("actual_products.csv에는 product_id,category 컬럼이 필요합니다.")
            rows = [
                {"product_id": (r["product_id"] or "").strip(),
                 "category": (r["category"] or "").strip().upper()}
                for r in reader
            ]
    else:
        rows = [
            {"product_id": str(i * 10 + j), "category": cat}
            for i, cat in enumerate(CATEGORIES)
            for j in range(1, 11)
        ]

    counts = Counter(r["category"] for r in rows)
    errors = {cat: counts[cat] for cat in CATEGORIES if counts[cat] != 10}
    if errors or len(rows) != 120 or len({r["product_id"] for r in rows}) != 120:
        raise ValueError(
            "상품은 12개 카테고리에 각각 10개씩, 중복되지 않는 ID로 총 120개여야 합니다. "
            f"카테고리 개수 오류: {errors}"
        )
    if any(not r["product_id"] or r["category"] not in CATEGORIES for r in rows):
        raise ValueError("상품 ID가 비어 있거나 알 수 없는 카테고리가 포함되어 있습니다.")

    products = {cat: [] for cat in CATEGORIES}
    for row in rows:
        products[row["category"]].append(row["product_id"])
    return rows, products


def pick_weighted_category(rng, weights, except_these):
    candidates = [cat for cat in CATEGORIES if cat not in except_these]
    return rng.choices(candidates, weights=[weights[cat] for cat in candidates], k=1)[0]


def choose_categories(rng, persona, item_count):
    """같이 구매하는 패턴 + 개인 관심 분야를 섞어 주문의 상품 카테고리 선택."""
    chosen = []
    if rng.random() < 0.65:
        bundle = rng.choice(BUNDLES)
        # 카테고리 하나씩 중복 없이 담습니다.
        chosen.extend(bundle[:item_count])
    while len(chosen) < item_count:
        chosen.append(pick_weighted_category(rng, PERSONAS[persona], set(chosen)))
    return chosen


def choose_product(rng, cat, products, taste_group):
    """회원마다 선호하는 상품군이 약간씩 다르게 나오도록 가중치 선택."""
    items = products[cat]
    weights = []
    for i in range(10):
        popularity = 1.0 / (1 + i * 0.25)  # 인기 상품 편향
        group = 0 if i < 3 else (1 if i < 7 else 2)
        preference = 3.0 if group == taste_group else 1.0
        weights.append(popularity * preference)
    return rng.choices(items, weights=weights, k=1)[0]


def main():
    rng = random.Random(SEED)
    catalog_rows, products = make_catalog()

    # 회원별 선호 유형을 한 번 정한 뒤 구매 기록마다 재사용합니다.
    members = {
        member_id: {
            "persona": rng.choice(list(PERSONAS)),
            "taste_group": rng.randrange(3),
            "activity": rng.choices([1, 2, 4, 8], weights=[25, 35, 30, 10])[0],
        }
        for member_id in range(1, MEMBER_COUNT + 1)
    }
    member_ids = list(members)
    activity_weights = [members[i]["activity"] for i in member_ids]

    start = datetime(2026, 1, 1)
    end = datetime(2026, 11, 14, 23, 59, 59)
    duration_seconds = int((end - start).total_seconds())

    # 주문 날짜를 먼저 만들고 정렬하므로 order_id는 시간순입니다.
    orders = []
    for _ in range(ORDER_COUNT):
        when = start + timedelta(seconds=rng.randint(0, duration_seconds))
        member_id = rng.choices(member_ids, weights=activity_weights, k=1)[0]
        orders.append((when, member_id))
    orders.sort()

    purchase_rows = []
    for order_id, (when, member_id) in enumerate(orders, start=1):
        member = members[member_id]
        item_count = rng.choices([1, 2, 3, 4], weights=[25, 40, 25, 10], k=1)[0]
        cats = choose_categories(rng, member["persona"], item_count)
        for cat in cats:
            product_id = choose_product(rng, cat, products, member["taste_group"])
            purchase_rows.append({
                "order_id": order_id,
                "member_id": member_id,
                "product_id": product_id,
                "category": cat,
                "quantity": rng.choices([1, 2, 3], weights=[90, 9, 1], k=1)[0],
                "ordered_at": when.strftime("%Y-%m-%d %H:%M:%S"),
            })

    product_path = BASE_DIR / "dummy_products.csv"
    with product_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["product_id", "category"])
        writer.writeheader()
        writer.writerows(catalog_rows)

    purchase_path = BASE_DIR / "dummy_purchase_history.csv"
    with purchase_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["order_id", "member_id", "product_id", "category", "quantity", "ordered_at"],
        )
        writer.writeheader()
        writer.writerows(purchase_rows)

    used = Counter(row["category"] for row in purchase_rows)
    used_product_ids = {row["product_id"] for row in purchase_rows}
    print("가상 구매 이력 생성 완료")
    print(f"주문: {len(orders):,}건 / 주문 상품 기록: {len(purchase_rows):,}행")
    print(f"상품: 총 120개 중 {len(used_product_ids)}개가 구매 기록에 등장")
    print(f"구매 카테고리: {', '.join(f'{cat}={used[cat]:,}' for cat in CATEGORIES)}")
    print(f"상품 목록: {product_path}")
    print(f"구매 이력: {purchase_path}")
    if not ACTUAL_CATALOG.exists():
        print("주의: 상품 ID 1~120은 임시 ID입니다. 실제 DB 상품 ID가 확정되면 actual_products.csv를 지정해 재생성하세요.")


if __name__ == "__main__":
    main()
