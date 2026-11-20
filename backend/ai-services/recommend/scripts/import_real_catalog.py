"""실제 엑셀에서 변환한 120개 상품과 이미지 등록기.

실행 (프로젝트 ROOT에서):
  python -m scripts.import_real_catalog                   # 미리보기, 읽기 전용
  python -m scripts.import_real_catalog --apply --confirm-db gtec
  python -m scripts.import_real_catalog --apply --confirm-db gtec --update-existing

호환성 데이터 중 제조사 확인되지 않은 항목을 생성하지 않습니다.
기존 상품 수정은 --update-existing를 명시할 때만 수행합니다.
반드시 개발 DB 백업 후 실행하세요.
"""
from __future__ import annotations
import argparse
import csv
from collections import Counter
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import MetaData, Table, and_, insert, select, update, text
from app.core.database import engine

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'data' / 'real_products_120.csv'
CATEGORIES = {'GPU','CASE','CPU','KEYBOARD','MOUSE','SSD','SPEAKER','HDD','POWER','RAM','MONITOR','MAINBOARD'}
TIERS = {'LOW','MID','HIGH'}
REQUIRED = {'name','category','stock','price','description','specification','thumbnail_url','status','created_at'}


def load_catalog():
    with CATALOG.open(encoding='utf-8-sig',newline='') as file:
        rows=list(csv.DictReader(file))
    errors=[]; prepared=[];count=Counter();seen=set()
    for n,row in enumerate(rows,2):
        cat=(row.get('category') or '').strip().upper()
        name=(row.get('name') or '').strip()
        tier=(row.get('tier') or '').strip().upper()
        code=(row.get('product_code') or '').strip()
        if cat not in CATEGORIES or tier not in TIERS or not name or not code:
            errors.append(f'행 {n}: 카테고리·등급·이름·코드 확인');continue
        key=(cat,name.casefold())
        if key in seen:errors.append(f'행 {n}: 중복 이름 {name}')
        seen.add(key)
        try:
            price=Decimal(str(row.get('price','')).replace(',',''))
            stock=int(row.get('stock','0'))
            assert price>0 and price==int(price) and stock>0
        except (AssertionError,InvalidOperation,ValueError):
            errors.append(f'행 {n}: 가격/재고 이상');continue
        spec=(row.get('specification') or '').strip()
        if not spec or f'GRADE: {tier}' not in spec or 'COMPATIBILITY_VERIFIED:' not in spec:
            errors.append(f'행 {n}: 규격/검증 상태 누락')
        urls=(row.get('image_urls') or '').split('|')
        thumb=(row.get('thumbnail_url') or '').strip()
        if not thumb or thumb not in urls or len(urls)!=len(set(urls)):
            errors.append(f'행 {n}: 썸네일/상세이미지 매핑 오류')
        prepared.append({'name':name,'category':cat,'price':int(price),'stock':stock,
                         'description':(row.get('description') or '').strip(),
                         'specification':spec,'thumbnail_url':thumb,'image_urls':urls})
        count[cat]+=1
    if len(rows)!=120 or set(count)!=(CATEGORIES) or any(count[x]!=10 for x in CATEGORIES):
        errors.append('목록이 12카테고리 x 10개 = 120개가 아닙니다')
    if errors:raise ValueError('\n'.join(errors[:25]))
    return prepared


def run(*,apply=False,confirm_db=None,update_existing=False):
    catalog=load_catalog()
    if apply and not confirm_db:
        raise ValueError('DB 수정 시 반드시 --confirm-db gtec 같은 실제 DB명 확인이 필요합니다.')
    metadata=MetaData()
    products=Table('products',metadata,autoload_with=engine)
    images=Table('images',metadata,autoload_with=engine)
    missing=REQUIRED-set(products.c.keys())
    if missing:raise ValueError('products 테이블 필수 컬럼 누락: '+str(sorted(missing)))
    image_req={'product_id','image_url','is_primary','sort_order'}
    if image_req-set(images.c.keys()):
        raise ValueError('images 컬럼 확인 필요: '+str(sorted(image_req-set(images.c.keys()))))
    with engine.connect() as c:
        db=c.execute(text('SELECT current_database()')).scalar_one() if engine.dialect.name=='postgresql' else 'TEST_DB'
        existing=c.execute(select(products.c.id,products.c.name,products.c.category)).mappings().all()
    if apply and db!=confirm_db:
        raise ValueError(f'연결된 DB는 {db!r}이고 확인된 이름은 {confirm_db!r}입니다. 수정 중단.')
    by_key={(str(x['category']).upper(),x['name'].strip().casefold()):x['id'] for x in existing}
    by_name={x['name'].strip().casefold():str(x['category']).upper() for x in existing}
    new=[x for x in catalog if (x['category'],x['name'].casefold()) not in by_key]
    old=[x for x in catalog if (x['category'],x['name'].casefold()) in by_key]
    for x in catalog:
        if x['name'].casefold() in by_name and by_name[x['name'].casefold()]!=x['category']:
            raise ValueError(f'동일한 이름이 다른 카테고리에 존재: {x["name"]}')
    print(f'현재 DB={db}, CSV={len(catalog)}건, 신규={len(new)}건, 기존={len(old)}건')
    print(f'기존 상품 정보 갱신: {"예" if update_existing else "아니요"}')
    print('주의: 미확인 규격은 만들어 넣지 않으며, 기존 추천 모델 자체는 변경하지 않습니다.')
    if not apply:
        print('[DRY RUN] DB 수정 없음');return
    # Transaction commits only if all rows + images succeed.
    with engine.begin() as conn:
        now=datetime.now()
        for x in catalog:
            key=(x['category'],x['name'].casefold())
            common={k:x[k] for k in ('name','category','price','description','specification','thumbnail_url')}
            if key not in by_key:
                row={**common,'stock':x['stock'],'status':'ACTIVE','created_at':now}
                if 'updated_at' in products.c:row['updated_at']=now
                result=conn.execute(insert(products).values(**row).returning(products.c.id))
                product_id=result.scalar_one()
            elif update_existing:
                product_id=by_key[key]
                fields={k:v for k,v in common.items() if k not in ('name','category')}
                if 'updated_at' in products.c:fields['updated_at']=now
                conn.execute(update(products).where(products.c.id==product_id).values(**fields))
            else:
                continue
            existing_urls=set(conn.execute(select(images.c.image_url).where(images.c.product_id==product_id)).scalars())
            for idx,url in enumerate(x['image_urls']):
                if url in existing_urls:continue
                conn.execute(insert(images).values(product_id=product_id,image_url=url,
                                  is_primary=(idx==0),sort_order=idx))
    print('[SUCCESS] 하나의 트랜잭션으로 반영 완료. 기존 상품 재고는 덮어쓰지 않았습니다.')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apply',action='store_true')
    p.add_argument('--confirm-db',help='실제 PostgreSQL DB명 (예: gtec)')
    p.add_argument('--update-existing',action='store_true',help='일치하는 기존 상품 가격/설명/규격/이미지 추가')
    args=p.parse_args()
    run(apply=args.apply,confirm_db=args.confirm_db,update_existing=args.update_existing)
