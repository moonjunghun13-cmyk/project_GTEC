"""
기본: python seed_recommendation_demo.py
실행: python seed_recommendation_demo.py --apply
회원 부족 시: python seed_recommendation_demo.py --apply --create-demo-members

※ products 테이블에는 절대로 INSERT/UPDATE/DELETE하지 않습니다.
※ 개발/시연 DB 전용. 가짜 PAID 주문이 매출/추천 통계에 반영됩니다.
"""
import argparse
import csv
import random
import secrets
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy import MetaData, Table, insert, select
from app.core.database import engine

ROOT = Path(__file__).resolve().parent
if not (ROOT / 'data').is_dir():
    ROOT = ROOT.parent
CATALOG = ROOT / 'data' / 'real_products_120.csv'
MEMBER_MARK = 'ai_demo_retrain_'
ORDER_MARK = 'AI-DEMO-RETRAIN-'
CATEGORIES = ('GPU','CASE','CPU','KEYBOARD','MOUSE','SSD','SPEAKER','HDD','POWER','RAM','MONITOR','MAINBOARD')


def tables(db_engine):
    md=MetaData()
    return {name:Table(name,md,autoload_with=db_engine) for name in ('members','products','orders','order_items')}


def add_one(con, table, payload):
    """필수 컬럼을 임의로 채우거나 DB에 없는 컬럼을 쓰지 않습니다."""
    keys=set(table.c.keys())
    payload={k:v for k,v in payload.items() if k in keys}
    missing=[]
    for col in table.columns:
        if col.primary_key or col.nullable or col.name in payload: continue
        if col.default is not None or col.server_default is not None: continue
        if col.identity is not None or col.computed is not None: continue
        missing.append(col.name)
    if missing:
        raise ValueError(f'{table.name} 필수 컬럼 누락: {missing}. DB 스키마를 확인하세요.')
    return int(con.execute(insert(table).values(**payload).returning(table.c.id)).scalar_one())


def load_catalog_names():
    with CATALOG.open(encoding='utf-8-sig',newline='') as f:
        rows=list(csv.DictReader(f))
    names={(r['category'].strip().upper(),r['name'].strip().casefold()) for r in rows}
    if len(rows)!=120 or len(names)!=120:
        raise ValueError('상품목록 CSV는 고유한 120개 제품이어야 합니다.')
    return names


def get_products(con, table, allowlist):
    records=con.execute(select(table.c.id,table.c.name,table.c.category,
                               table.c.price,table.c.status,table.c.stock)).mappings().all()
    category_to_products=defaultdict(list)
    for p in records:
        cat=str(p['category']).strip().upper()
        name=str(p['name']).strip()
        if (cat,name.casefold()) not in allowlist: continue
        if str(p['status'])!='ACTIVE' or int(p['stock'] or 0)<=0: continue
        if p['price'] is None or Decimal(str(p['price']))<=0: continue
        category_to_products[cat].append(dict(p))
    return category_to_products


def get_demo_members(con, table):
    return list(con.execute(select(table.c.id).where(table.c.login_id.like(f'{MEMBER_MARK}%'))).scalars())


def seed(db_engine=None, *, apply=False, orders_count=100, customers_count=35, create_demo_members=False):
    """각 실행마다 구매 회원·카테고리·상품·수량·날짜를 새로 섞음."""
    if orders_count<customers_count or customers_count<30 or orders_count<50:
        raise ValueError('주문 수 >= 회원 수, 회원 30명 이상, 주문 50건 이상이어야 합니다.')
    db_engine = db_engine if db_engine is not None else engine
    rng=random.Random()  # 고정된 seed 42 사용 X
    batch=uuid.uuid4().hex[:10]
    now=datetime.now()
    t=tables(db_engine)
    names=load_catalog_names()

    with db_engine.begin() as con:
        by_category=get_products(con,t['products'],names)
        # 상품이 하나도 없는 카테고리에서 더미 상품을 만들지 않고 중단.
        missing=[c for c in CATEGORIES if not by_category[c]]
        count=sum(len(x) for x in by_category.values())
        print(f'[등록 실제 상품 후보] 총 {count}개 / 12개 카테고리 중 {12-len(missing)}개 준비')
        for c in CATEGORIES:
            print(f'  {c}: {len(by_category[c])}개')
        if missing:
            raise ValueError('아직 실제 상품이 등록되지 않은 카테고리: '+', '.join(missing)+'. products 생성 없이 중단합니다.')

        member_ids=get_demo_members(con,t['members'])
        create_count=max(0,customers_count-len(member_ids))
        if create_count and not create_demo_members:
            raise ValueError(
                f'기존 시연 회원 {len(member_ids)}명, 필요 {customers_count}명. '
                '실제 회원에게 가짜 주문을 만들지 않습니다. '
                '시연 회원을 추가할 때만 --create-demo-members를 사용하세요.'
            )
        print(f'[회원 준비] 기존 시연 회원 {len(member_ids)}명 / 추가 필요 {create_count}명')
        print(f'[주문 계획] 주문 {orders_count}건 / 주문상품 약 {orders_count*3}건')
        print('[규칙] products INSERT 0건. 등록된 실제 상품의 ID·가격만 사용합니다.')
        if not apply:
            print('[미리보기] 데이터베이스에 아무것도 쓰지 않았습니다. --apply를 넣어 실행하세요.')
            return {'dry_run':True,'eligible_products':count,'missing_categories':missing,
                    'existing_demo_members':len(member_ids),'new_demo_members':create_count,
                    'planned_orders':orders_count}

        for i in range(create_count):
            suffix=f'{batch}_{i:03d}'
            member_ids.append(add_one(con,t['members'],{
                'login_id':MEMBER_MARK+suffix,
                'name':f'AI 시연회원 {suffix}',
                'password':'!NO_LOGIN_'+secrets.token_urlsafe(30),
                'email':f'ai-demo-{suffix}@example.invalid',
                'tel':None,'oauth_provider':None,'oauth_id':None,
                'terms_agreed':False,'privacy_agreed':False,
                'role':'USER','status':'INACTIVE',
                'created_at':now,'updated_at':now,
            }))

        rng.shuffle(member_ids)
        selected=member_ids[:customers_count]
        forced_member_ids=list(selected)+[rng.choice(selected) for _ in range(orders_count-customers_count)]
        rng.shuffle(forced_member_ids)
        forced_categories={order_idx:cat for order_idx,cat in zip(
            rng.sample(range(orders_count),k=len(CATEGORIES)),rng.sample(list(CATEGORIES),k=len(CATEGORIES))
        )}
        profiles={uid:rng.sample(list(CATEGORIES),k=rng.randint(3,5)) for uid in selected}
        order_indices=list(range(orders_count));rng.shuffle(order_indices)
        seen=set();category_counts=Counter();lines=0;examples=[]
        for idx in order_indices:
            uid=forced_member_ids[idx]
            when=now-timedelta(seconds=rng.randint(0,90*24*3600))
            qty_lines=rng.randint(2,4)
            used=set();purchased=[]
            for j in range(qty_lines):
                if j==0 and idx in forced_categories:
                    cat=forced_categories[idx]
                elif rng.random()<0.75:
                    cat=rng.choice(profiles[uid])
                else:
                    cat=rng.choice(CATEGORIES)
                available=[p for p in by_category[cat] if p['id'] not in used]
                if not available:
                    cat=rng.choice([x for x in CATEGORIES if any(
                        p['id'] not in used for p in by_category[x])])
                    available=[p for p in by_category[cat] if p['id'] not in used]
                p=rng.choice(available)
                used.add(p['id'])
                quantity=rng.randint(1,min(4,int(p['stock'])))
                purchased.append((p,quantity,cat))
            subtotal=sum(Decimal(str(p['price']))*qty for p,qty,_ in purchased)
            oid=add_one(con,t['orders'],{
                'order_number':f'{ORDER_MARK}{batch}-{idx:04d}',
                'member_id':uid,'status':'PAID',
                'sub_total':subtotal,'shipping_fee':0,'discount_amount':0,'total_amount':subtotal,
                'shipping_name':'AI 시연 테스트','shipping_phone':'010-0000-0000',
                'shipping_zipcode':'00000','shipping_address1':'시연용 가상 배송지',
                'shipping_address2':None,'payment_method':'CREDIT_CARD','payment_key':None,
                'paid_at':when,'created_at':when,'updated_at':when,
            })
            seen.add(uid)
            rng.shuffle(purchased)
            for p,quantity,cat in purchased:
                amount=Decimal(str(p['price']))*quantity
                add_one(con,t['order_items'],{
                    'order_id':oid,'product_id':p['id'],'product_name':p['name'],
                    'unit_price':p['price'],'total_price':amount,'quantity':quantity,
                    'created_at':when,
                })
                category_counts[cat]+=1;lines+=1
                if len(examples)<8:examples.append((uid,p['id'],p['name'],cat,quantity))
        if lines<100 or len(seen)<30 or set(category_counts)!=set(CATEGORIES):
            raise RuntimeError('재학습 최소 요건 불충족. 이번 배치 전체가 롤백됩니다.')

    print(f'[COMMIT] batch={batch} / 상품 생성·변경 0건 / 주문 {orders_count}건 / 주문상품 {lines}건')
    print(f'시연 회원 {len(seen)}명 / 카테고리 {len(category_counts)}개 / 추가 시연 회원 {create_count}명')
    print('무작위 구매 예시:')
    for row in examples:print(' ',row)
    print('주의: 가짜 PAID 주문이므로 실제 매출·AI 학습에 섞입니다. 개발 DB에서만 사용하세요.')
    return {'dry_run':False,'batch':batch,'orders':orders_count,'purchase_rows':lines,
            'members':len(seen),'categories':len(category_counts),'new_products':0,
            'new_demo_members':create_count}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true',help='실제 주문/주문상품 INSERT')
    parser.add_argument('--orders',type=int,default=100)
    parser.add_argument('--customers',type=int,default=35)
    parser.add_argument('--create-demo-members',action='store_true',help='기존 시연 회원이 부족하면 INACTIVE 회원 생성')
    args=parser.parse_args()
    engine.echo=False
    try:
        seed(engine,apply=args.apply,orders_count=args.orders,customers_count=args.customers,
             create_demo_members=args.create_demo_members)
    except Exception as err:
        print(f'[오류] {err}\n이 실행에서 새로 INSERT한 행이 있다면 전부 롤백됩니다.')
        raise SystemExit(1)

if __name__=='__main__':
    main()
