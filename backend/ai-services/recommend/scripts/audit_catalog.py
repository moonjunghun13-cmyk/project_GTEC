"""조회 전용: CSV 120개 상품과 PostgreSQL products의 등록/판매 상태 비교.

실행: python scripts/audit_catalog.py
"""
import csv
from collections import Counter
from pathlib import Path

from sqlalchemy import MetaData, Table, select
from app.core.database import engine

CATALOG = Path(__file__).resolve().parents[1] / 'data' / 'real_products_120.csv'
EXCLUDED_PREFIXES = ('AI-DEMO-RETRAIN-', 'AI 테스트')


def main():
    with CATALOG.open(encoding='utf-8-sig', newline='') as file:
        expected = list(csv.DictReader(file))
    md = MetaData()
    products = Table('products', md, autoload_with=engine)
    with engine.connect() as con:
        found = con.execute(select(products.c.id, products.c.name, products.c.category,
                                   products.c.status, products.c.stock)).mappings().all()

    catalog_keys = {(x['category'].strip().upper(), x['name'].strip().casefold()) for x in expected}
    existing = {}
    for item in found:
        key = (str(item['category']).upper(), str(item['name']).strip().casefold())
        existing.setdefault(key, []).append(item)

    missing, unavailable, duplicate = [], [], []
    for row in expected:
        key = (row['category'].strip().upper(), row['name'].strip().casefold())
        matches = existing.get(key, [])
        if not matches:
            missing.append(row)
        elif len(matches) > 1:
            duplicate.append(row)
        elif str(matches[0]['status']) != 'ACTIVE' or int(matches[0]['stock'] or 0) <= 0:
            unavailable.append((row, matches[0]))

    demos = [x for x in found if str(x['name']).startswith(EXCLUDED_PREFIXES)]
    unrelated = [x for x in found if (str(x['category']).upper(),str(x['name']).strip().casefold()) not in catalog_keys
                 and not str(x['name']).startswith(EXCLUDED_PREFIXES)]
    print(f'목표 상품 {len(expected)}개 / DB 상품 {len(found)}개')
    print(f'등록된 목표 상품 {len(expected)-len(missing)}개 / 미등록 {len(missing)}개')
    print(f'등록됐지만 판매 불가 {len(unavailable)}개 / 동일 이름 중복 {len(duplicate)}개')
    print(f'시연/테스트 상품 {len(demos)}개 / 목록 외 상품 {len(unrelated)}개')
    if missing:
        print('\n[미등록 상품 예시 - 최대 15개]')
        for row in missing[:15]: print(f"  {row['category']}: {row['name']}")
    print('\n[카테고리별 미등록 수]')
    for cat, qty in sorted(Counter(r['category'] for r in missing).items()):
        print(' ', cat, qty)
    print('\n※ 조회 전용입니다. 상품을 생성·변경·삭제하지 않았습니다.')


if __name__ == '__main__':
    main()
