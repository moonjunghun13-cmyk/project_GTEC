"""CSV에 가격·재고·검증된 규격까지 채워진 '실제 상품'만 신규 INSERT.

미리보기: python scripts/import_real_catalog.py
실제 등록: python scripts/import_real_catalog.py --apply
기존 상품은 변경하지 않음. 미완성 CSV는 전체 등록을 거절함.
"""
import argparse
import csv
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from collections import Counter

from sqlalchemy import MetaData, Table, select, insert
from app.core.database import engine

CATALOG = Path(__file__).resolve().parents[1] / 'data' / 'real_products_120.csv'
CATEGORIES = {'GPU','CASE','CPU','KEYBOARD','MOUSE','SSD','SPEAKER','HDD','POWER','RAM','MONITOR','MAINBOARD'}
TIERS = {'LOW','MID','HIGH'}
# 프로젝트에서 합의한 기본 호환 검사 양식입니다. 제조사 규격 검증은 사용자가 해야 합니다.
REQUIRED_SPECS = {
    'CPU': ('CPU_SOCKET','CPU_POWER_W'),
    'MAINBOARD': ('CPU_SOCKET','RAM_TYPE','RAM_SLOTS','MAX_RAM_GB','FORM_FACTOR',
                  'PCIE_X16_SLOTS','M2_NVME_2280_SLOTS','SATA_PORTS','CPU_EPS_8PIN_REQUIRED'),
    'RAM': ('RAM_TYPE','RAM_MODULE_GB','RAM_MODULE_COUNT'),
    'GPU': ('GPU_LENGTH_MM','GPU_POWER_W','GPU_POWER_CONNECTOR'),
    'CASE': ('MAINBOARD_SUPPORT','MAX_GPU_LENGTH_MM','PSU_SUPPORT','MAX_PSU_LENGTH_MM',
             'HDD_3_5_BAYS','SSD_2_5_BAYS'),
    'POWER': ('PSU_WATT','PSU_FORM_FACTOR','PSU_LENGTH_MM','MAINBOARD_24PIN_COUNT',
              'CPU_EPS_8PIN_COUNT','PCIE_8PIN_COUNT','PCIE_16PIN_COUNT','SATA_POWER_COUNT'),
    'SSD': ('STORAGE_INTERFACE','STORAGE_FORM_FACTOR'),
    'HDD': ('STORAGE_INTERFACE','STORAGE_FORM_FACTOR'),
}


def check_row(row, n):
    issues=[]
    cat=(row.get('category') or '').strip().upper()
    tier=(row.get('tier') or '').strip().upper()
    name=(row.get('name') or '').strip()
    if cat not in CATEGORIES: issues.append('category 미확인')
    if tier not in TIERS: issues.append('tier는 LOW/MID/HIGH 중 하나')
    if not name: issues.append('상품명 누락')
    if name.startswith(('AI-DEMO-RETRAIN-', 'AI 테스트')): issues.append('시연용 이름 사용 불가')
    try:
        price=Decimal((row.get('price') or '').replace(',','').strip())
        if not price.is_finite() or price <= 0 or price != price.to_integral_value():
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        price=None;issues.append('price: 유효한 양의 원화 정수 필요')
    try:
        stock=int((row.get('stock') or '').strip())
        if stock <= 0: raise ValueError
    except ValueError:
        stock=None;issues.append('stock: 1 이상의 정수 필요')
    spec=(row.get('specification') or '').strip()
    spec_map={k.strip().upper():v.strip() for k,v in re.findall(r'^([A-Z][A-Z0-9_]*):\s*([^\n\r]*)$',spec,flags=re.M)}
    for key in REQUIRED_SPECS.get(cat,()):
        if not spec_map.get(key): issues.append(f'specification 필수 규격 누락: {key}')
    return issues, {'name':name,'category':cat,'price':price,'stock':stock,
                    'description':(row.get('description') or '').strip(),
                    'specification':f'GRADE: {tier}\n{spec}' if spec else f'GRADE: {tier}',
                    'thumbnail_url':(row.get('thumbnail_url') or '').strip() or None}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true',help='검증 성공 시 DB 신규 상품만 INSERT')
    args=parser.parse_args()
    with CATALOG.open(encoding='utf-8-sig',newline='') as file:
        rows=list(csv.DictReader(file))
    issues=[]; prepared=[]; keys=set(); counts=Counter()
    for n,row in enumerate(rows,start=2):
        errs, item=check_row(row,n)
        key=(item['category'],item['name'].casefold())
        if key in keys: errs.append('CSV 내 상품명/카테고리 중복')
        keys.add(key)
        if errs: issues.append((n,item['name'],errs))
        prepared.append(item); counts[item['category']]+=1
    if len(rows)!=120 or set(counts.values())!={10}:
        issues.append((0,'목록 전체', ['12개 카테고리 × 10개씩 총 120개인지 확인']))
    print(f'CSV {len(rows)}건 읽음. 미완성/오류 {len(issues)}건')
    if issues:
        for n,name,errs in issues[:12]:
            print(f'  행 {n} [{name}]: {" / ".join(errs[:5])}')
        if len(issues)>12: print(f'  ... 이외 {len(issues)-12}건')
        print('등록하지 않았습니다. 가격·재고·실제 제품 규격을 확인한 뒤 다시 실행하세요.')
        return 1
    products=Table('products',MetaData(),autoload_with=engine)
    with engine.connect() as con:
        existing=list(con.execute(select(products.c.name, products.c.category)).mappings())
    by_key={(str(x['category']).upper(),str(x['name']).strip().casefold()) for x in existing}
    conflicts={x['name'].strip().casefold():str(x['category']).upper() for x in existing}
    new=[]
    for item in prepared:
        key=(item['category'],item['name'].casefold())
        if item['name'].casefold() in conflicts and conflicts[item['name'].casefold()]!=item['category']:
            print('DB에 같은 상품명으로 다른 카테고리 기록:',item['name']);return 1
        if key not in by_key: new.append(item)
    print(f'기존에 이미 등록된 상품 {len(prepared)-len(new)}개 / 신규 등록 대상 {len(new)}개')
    if not args.apply:
        print('[미리보기] DB 변경 없음. --apply 실행 시 신규 상품만 등록합니다.')
        return 0
    now=datetime.now()
    # 트랜잭션: 실패 시 전체 롤백. 없는 DB 컬럼은 사용하지 않음.
    columns=set(products.c.keys())
    with engine.begin() as con:
        for item in new:
            obj={k:v for k,v in item.items() if k in columns}
            obj.update({k: v for k,v in {'status':'ACTIVE','created_at':now,'updated_at':now}.items() if k in columns})
            con.execute(insert(products).values(**obj))
    print(f'등록 완료: {len(new)}개. 기존 상품은 변경하지 않았습니다.')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
